type Json = Record<string, any>;
type Context = { userId: string; userEmail?: string; emailVerified?: boolean; clientIp?: string; admin: any };

type Dependencies = {
  reply: (body: Json, status?: number) => Response;
  sha256: (value: string) => Promise<string>;
  publicProfile: (profile: any) => any;
  loadProfile: (ctx: Context) => Promise<{ profile: any; revision: number }>;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_SCENES = new Set(["wechat_jsapi", "wechat_h5", "wechat_native", "paypal"]);
const encoder = new TextEncoder();
const decoder = new TextDecoder();
let paypalTokenCache: { token: string; expiresAt: number } | null = null;

function setting(name: string) { return (Deno.env.get(name) || "").trim(); }
function enabled(name: string) { return /^(1|true|yes)$/i.test(setting(name)); }
function paymentMode() {
  const value = setting("PAYMENTS_MODE").toLowerCase();
  return value === "sandbox" || value === "live" ? value : "off";
}
function providerEnabled(provider: "wechat" | "paypal") {
  if (paymentMode() === "off") return false;
  return provider === "wechat" ? enabled("WECHAT_PAY_ENABLED") : enabled("PAYPAL_PAY_ENABLED");
}
function clean(value: unknown, max = 160) { return String(value || "").trim().slice(0, max); }
function jsonResponse(body: Json, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8" } });
}
function paymentError(deps: Dependencies, message: string, code: string, status = 400) {
  return deps.reply({ error: message, code }, status);
}
function toBase64(bytes: Uint8Array) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}
function fromBase64(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
function pemBytes(pem: string) {
  return fromBase64(pem.replace(/-----BEGIN [^-]+-----|-----END [^-]+-----|\s+/g, ""));
}
function formatMoney(amountMinor: number, currency: string) {
  return (Math.max(0, Math.floor(amountMinor)) / 100).toFixed(2);
}
function isoDate(value: unknown) {
  const time = new Date(String(value || "")).getTime();
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}
function appendQuery(url: string, values: Record<string, string>) {
  const result = new URL(url);
  Object.keys(values).forEach((key) => result.searchParams.set(key, values[key]));
  return result.toString();
}
function safeReturnUrl(orderId: string, extra: Record<string, string> = {}) {
  const configured = setting("PAYMENT_RETURN_URL");
  if (!configured) throw new Error("PAYMENT_RETURN_URL_MISSING");
  return appendQuery(configured, { payment_order: orderId, ...extra });
}
function logPayment(orderId: string, eventId: string, status: string, code = "") {
  console.log(JSON.stringify({ scope: "payment", orderId, eventId, status, code }));
}

async function importWechatPrivateKey() {
  const pem = setting("WECHAT_PAY_PRIVATE_KEY");
  if (!pem) throw new Error("WECHAT_PRIVATE_KEY_MISSING");
  return crypto.subtle.importKey("pkcs8", pemBytes(pem), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
}
async function importWechatPlatformKey() {
  const pem = setting("WECHAT_PAY_PLATFORM_PUBLIC_KEY");
  if (!pem) throw new Error("WECHAT_PLATFORM_KEY_MISSING");
  return crypto.subtle.importKey("spki", pemBytes(pem), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
}
async function rsaSign(message: string) {
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", await importWechatPrivateKey(), encoder.encode(message));
  return toBase64(new Uint8Array(signature));
}
async function verifyWechatSignature(timestamp: string, nonce: string, rawBody: string, signature: string, serial: string) {
  const expectedSerial = setting("WECHAT_PAY_PLATFORM_SERIAL");
  if (!timestamp || !nonce || !signature || !serial || (expectedSerial && serial !== expectedSerial)) return false;
  if (Math.abs(Date.now() - Number(timestamp) * 1000) > 5 * 60 * 1000) return false;
  return crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    await importWechatPlatformKey(),
    fromBase64(signature),
    encoder.encode(`${timestamp}\n${nonce}\n${rawBody}\n`)
  );
}
async function decryptWechatResource(resource: Json) {
  const key = encoder.encode(setting("WECHAT_PAY_API_V3_KEY"));
  if (key.length !== 32) throw new Error("WECHAT_API_V3_KEY_INVALID");
  const cryptoKey = await crypto.subtle.importKey("raw", key, "AES-GCM", false, ["decrypt"]);
  const clear = await crypto.subtle.decrypt({
    name: "AES-GCM",
    iv: encoder.encode(clean(resource.nonce, 32)),
    additionalData: encoder.encode(clean(resource.associated_data, 256)),
    tagLength: 128
  }, cryptoKey, fromBase64(clean(resource.ciphertext, 20000)));
  return JSON.parse(decoder.decode(clear));
}
async function wechatRequest(method: string, path: string, body?: Json) {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const nonce = crypto.randomUUID().replace(/-/g, "");
  const payload = body ? JSON.stringify(body) : "";
  const signature = await rsaSign(`${method}\n${path}\n${timestamp}\n${nonce}\n${payload}\n`);
  const authorization = `WECHATPAY2-SHA256-RSA2048 mchid="${setting("WECHAT_PAY_MCH_ID")}",nonce_str="${nonce}",timestamp="${timestamp}",serial_no="${setting("WECHAT_PAY_MERCHANT_SERIAL")}",signature="${signature}"`;
  const response = await fetch(`https://api.mch.weixin.qq.com${path}`, {
    method,
    headers: { Authorization: authorization, Accept: "application/json", "Content-Type": "application/json" },
    body: payload || undefined
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`WECHAT_API_${response.status}_${clean(result.code || "FAILED", 60)}`);
  return result as Json;
}
async function wechatTransaction(scene: string, order: Json, openid = "", clientIp = "") {
  const endpoint = scene === "wechat_jsapi" ? "/v3/pay/transactions/jsapi" : scene === "wechat_native" ? "/v3/pay/transactions/native" : "/v3/pay/transactions/h5";
  const payload: Json = {
    appid: setting("WECHAT_PAY_APP_ID"),
    mchid: setting("WECHAT_PAY_MCH_ID"),
    description: clean(order.title || "热血战姬战备补给", 120),
    out_trade_no: order.id,
    notify_url: setting("WECHAT_PAY_NOTIFY_URL"),
    attach: order.id,
    amount: { total: Number(order.price_minor), currency: "CNY" }
  };
  if (scene === "wechat_jsapi") payload.payer = { openid };
  if (scene === "wechat_h5") payload.scene_info = { payer_client_ip: clientIp || "127.0.0.1", h5_info: { type: "Wap" } };
  const result = await wechatRequest("POST", endpoint, payload);
  if (scene === "wechat_native") return { flow: scene, codeUrl: clean(result.code_url, 2048) };
  if (scene === "wechat_h5") return { flow: scene, redirectUrl: appendQuery(clean(result.h5_url, 2048), { redirect_url: safeReturnUrl(order.id) }) };
  const timeStamp = String(Math.floor(Date.now() / 1000));
  const nonceStr = crypto.randomUUID().replace(/-/g, "");
  const packageValue = `prepay_id=${clean(result.prepay_id, 160)}`;
  return {
    flow: scene,
    invoke: {
      appId: setting("WECHAT_PAY_APP_ID"), timeStamp, nonceStr,
      package: packageValue, signType: "RSA",
      paySign: await rsaSign(`${setting("WECHAT_PAY_APP_ID")}\n${timeStamp}\n${nonceStr}\n${packageValue}\n`)
    }
  };
}

function paypalBaseUrl() {
  return paymentMode() === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}
async function paypalToken() {
  if (paypalTokenCache && paypalTokenCache.expiresAt > Date.now() + 30000) return paypalTokenCache.token;
  const credentials = btoa(`${setting("PAYPAL_CLIENT_ID")}:${setting("PAYPAL_CLIENT_SECRET")}`);
  const response = await fetch(`${paypalBaseUrl()}/v1/oauth2/token`, {
    method: "POST", headers: { Authorization: `Basic ${credentials}`, "Content-Type": "application/x-www-form-urlencoded" }, body: "grant_type=client_credentials"
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.access_token) throw new Error(`PAYPAL_AUTH_${response.status}`);
  paypalTokenCache = { token: result.access_token, expiresAt: Date.now() + Math.max(60, Number(result.expires_in) || 300) * 1000 };
  return paypalTokenCache.token;
}
async function paypalRequest(method: string, path: string, body?: Json, requestId = "") {
  const response = await fetch(`${paypalBaseUrl()}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${await paypalToken()}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(requestId ? { "PayPal-Request-Id": requestId } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`PAYPAL_API_${response.status}_${clean(result.name || "FAILED", 60)}`);
  return result as Json;
}
async function createPaypalOrder(order: Json) {
  const result = await paypalRequest("POST", "/v2/checkout/orders", {
    intent: "CAPTURE",
    purchase_units: [{
      reference_id: order.id,
      custom_id: order.id,
      invoice_id: order.id,
      description: clean(order.title || "Rexue Zhanji Supply", 120),
      amount: { currency_code: "USD", value: formatMoney(Number(order.price_minor), "USD") }
    }],
    payment_source: { paypal: { experience_context: {
      user_action: "PAY_NOW",
      return_url: safeReturnUrl(order.id, { payment_provider: "paypal" }),
      cancel_url: safeReturnUrl(order.id, { payment_cancelled: "1" })
    } } }
  }, order.id);
  const approve = Array.isArray(result.links) ? result.links.find((link: Json) => link.rel === "payer-action" || link.rel === "approve") : null;
  if (!result.id || !approve?.href) throw new Error("PAYPAL_APPROVAL_LINK_MISSING");
  return { providerOrderId: clean(result.id, 160), flow: "paypal", redirectUrl: clean(approve.href, 2048) };
}

function rowOf(data: any) { return Array.isArray(data) ? data[0] : data; }
async function markProviderOrder(ctx: Context, orderId: string, providerOrderId: string, payload: Json) {
  const update: Json = { provider_payload: payload, updated_at: new Date().toISOString() };
  if (providerOrderId) update.provider_order_id = providerOrderId;
  const { error } = await ctx.admin.from("payment_orders").update(update).eq("id", orderId);
  if (error) throw error;
}
async function failOrder(ctx: Context, orderId: string, code: string) {
  await ctx.admin.from("payment_orders").update({ state: "failed", payment_status: "failed", updated_at: new Date().toISOString(), provider_payload: { errorCode: clean(code, 80) } }).eq("id", orderId);
  await ctx.admin.from("payment_entitlements").delete().eq("order_id", orderId).eq("state", "reserved");
}
async function claimProviderCreate(ctx: Context, order: Json) {
  if (order.provider_payload && Object.keys(order.provider_payload).length && !order.provider_payload.creating) return { claimed: false, ready: true };
  const marker = { creating: true, startedAt: new Date().toISOString() };
  const { data, error } = await ctx.admin.from("payment_orders").update({ provider_payload: marker, updated_at: marker.startedAt })
    .eq("id", order.id).eq("provider_payload", {}).select("id").maybeSingle();
  if (error) throw error;
  return { claimed: Boolean(data), ready: false };
}
async function orderById(admin: any, orderId: string, playerId = "") {
  let query = admin.from("payment_orders").select("id, player_id, product_id, provider, market, payment_scene, price_minor, currency, state, payment_status, fulfillment_status, refund_status, provider_order_id, provider_capture_id, provider_transaction_id, provider_payload, reward_snapshot, benefit_keys, created_at, expires_at, paid_at, fulfilled_at, refunded_at, last_provider_sync_at").eq("id", orderId);
  if (playerId) query = query.eq("player_id", playerId);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data;
}
async function fulfill(admin: any, deps: Dependencies, order: Json, transactionId: string, providerOrderId: string, amountMinor: number, currency: string, eventId: string, eventType: string, payload: Json) {
  const { data, error } = await admin.rpc("fulfill_payment_order_v2", {
    p_order_id: order.id, p_provider: order.provider, p_provider_transaction_id: transactionId,
    p_provider_order_id: providerOrderId, p_amount_minor: amountMinor, p_currency: currency,
    p_event_id: eventId, p_event_type: eventType, p_payload_hash: await deps.sha256(JSON.stringify(payload))
  });
  if (error) throw error;
  logPayment(order.id, eventId, "fulfilled");
  return rowOf(data);
}
async function reverse(admin: any, deps: Dependencies, order: Json, eventId: string, eventType: string, payload: Json, chargeback = false) {
  const { data, error } = await admin.rpc("reverse_payment_order_v2", {
    p_order_id: order.id, p_provider: order.provider, p_event_id: eventId, p_event_type: eventType,
    p_payload_hash: await deps.sha256(JSON.stringify(payload)), p_chargeback: chargeback
  });
  if (error) throw error;
  logPayment(order.id, eventId, chargeback ? "chargeback" : "refunded");
  return rowOf(data);
}

export function createPaymentService(deps: Dependencies) {
  async function eligibility(ctx: Context, market: string) {
    const provider = market === "CN" ? "wechat" : "paypal";
    const result: Json = { eligible: true, code: "OK", reason: "", emailVerified: Boolean(ctx.emailVerified), compliance: null };
    const { data: debts, error: debtError } = await ctx.admin.from("payment_resource_debts").select("id").eq("player_id", ctx.userId).is("cleared_at", null).limit(1);
    if (debtError) throw debtError;
    if (market === "CN") {
      const { data, error } = await ctx.admin.from("player_payment_compliance").select("cn_real_name_verified, age_band, payment_allowed, verified_at").eq("player_id", ctx.userId).maybeSingle();
      if (error) throw error;
      result.compliance = data || { cn_real_name_verified: false, age_band: "unknown", payment_allowed: false, verified_at: null };
    }
    if (market === "CN" && (!result.compliance?.cn_real_name_verified || !result.compliance?.payment_allowed)) {
      Object.assign(result, { eligible: false, code: "CN_COMPLIANCE_REQUIRED", reason: "国内付费需要完成实名与防沉迷校验。" });
    }
    if (!providerEnabled(provider)) Object.assign(result, { eligible: false, code: "PAYMENT_CHANNEL_DISABLED", reason: market === "CN" ? "国内微信支付尚未开放。" : "海外支付尚未开放。" });
    if (!ctx.emailVerified) Object.assign(result, { eligible: false, code: "EMAIL_VERIFICATION_REQUIRED", reason: "正式付款前需先绑定并验证邮箱。" });
    if (debts?.length) Object.assign(result, { eligible: false, code: "PAYMENT_DEBT_LOCKED", reason: "账户存在退款资源欠账，暂停充值与相关消费。" });
    return result;
  }

  async function catalog(ctx: Context, body: Json) {
    const market = clean(body.market, 16).toUpperCase() === "CN" ? "CN" : "GLOBAL";
    const provider = market === "CN" ? "wechat" : "paypal";
    const [{ data: products, error: productError }, { data: prices, error: priceError }, { data: benefits, error: benefitError }] = await Promise.all([
      ctx.admin.from("payment_products").select("product_id, product_type, title, description, base_rewards, first_bonus_rewards, lifetime_limit, sort_order").eq("enabled", true).order("sort_order"),
      ctx.admin.from("payment_product_prices").select("offer_id, amount_minor, currency").eq("market", market).eq("provider", provider).eq("enabled", true),
      ctx.admin.from("payment_entitlements").select("benefit_key, state, expires_at").eq("player_id", ctx.userId)
    ]);
    if (productError) throw productError;
    if (priceError) throw priceError;
    if (benefitError) throw benefitError;
    const priceMap = new Map((prices || []).map((price: Json) => [price.offer_id, price]));
    const now = Date.now();
    const owned = new Set((benefits || []).filter((item: Json) => item.state === "claimed" || new Date(item.expires_at || 0).getTime() > now).map((item: Json) => item.benefit_key));
    const offers = (products || []).filter((product: Json) => priceMap.has(product.product_id)).map((product: Json) => {
      const price = priceMap.get(product.product_id) as Json;
      const benefitKey = product.product_type === "bundle" ? `bundle:${product.product_id}` : `first:${product.product_id}`;
      return {
        offerId: product.product_id, type: product.product_type, title: product.title, description: product.description,
        rewards: product.base_rewards, firstBonusRewards: product.first_bonus_rewards,
        amountMinor: price.amount_minor, currency: price.currency,
        firstPurchaseAvailable: product.product_type === "diamonds" && !owned.has(benefitKey),
        soldOut: product.product_type === "bundle" && owned.has(benefitKey),
        lifetimeLimit: product.lifetime_limit
      };
    });
    return deps.reply({
      market, provider, mode: paymentMode(), enabled: providerEnabled(provider), eligibility: await eligibility(ctx, market), offers,
      capabilities: market === "CN" ? { jsapi: true, h5: true, native: true } : { paypal: true, cards: "merchant_eligible" }
    });
  }

  async function createOrder(ctx: Context, body: Json) {
    const offerId = clean(body.offerId, 80);
    const market = clean(body.market, 16).toUpperCase() === "CN" ? "CN" : "GLOBAL";
    const provider = market === "CN" ? "wechat" : "paypal";
    const scene = clean(body.paymentScene, 40) || (provider === "paypal" ? "paypal" : "wechat_h5");
    const idempotencyKey = clean(body.idempotencyKey, 40);
    if (!offerId || !UUID_PATTERN.test(idempotencyKey) || !ALLOWED_SCENES.has(scene) || (provider === "paypal") !== (scene === "paypal")) {
      return paymentError(deps, "充值请求无效。", "PAYMENT_ORDER_INVALID");
    }
    const account = await eligibility(ctx, market);
    if (!account.eligible) return paymentError(deps, account.reason, account.code, 403);
    const { data, error } = await ctx.admin.rpc("create_payment_order_v2", {
      p_player_id: ctx.userId, p_offer_id: offerId, p_market: market, p_provider: provider,
      p_payment_scene: scene, p_idempotency_key: idempotencyKey
    });
    if (error) return paymentError(deps, "无法创建充值订单。", clean(error.message, 80), 409);
    const created = rowOf(data);
    const order = await orderById(ctx.admin, created.order_id, ctx.userId);
    const { data: product } = await ctx.admin.from("payment_products").select("title").eq("product_id", order.product_id).single();
    order.title = product?.title;
    const providerClaim = await claimProviderCreate(ctx, order);
    if (providerClaim.ready) {
      return deps.reply({ ok: true, orderId: order.id, status: "pending", flow: order.payment_scene, payPayload: order.provider_payload });
    }
    if (!providerClaim.claimed) {
      return deps.reply({ ok: true, orderId: order.id, status: "pending", flow: order.payment_scene, payPayload: {} });
    }
    try {
      if (provider === "paypal") {
        const payload = await createPaypalOrder(order);
        await markProviderOrder(ctx, order.id, payload.providerOrderId, payload);
        return deps.reply({ ok: true, orderId: order.id, status: "pending", flow: payload.flow, payPayload: payload });
      }
      if (scene === "wechat_jsapi") {
        const state = crypto.randomUUID() + crypto.randomUUID();
        const { error: stateError } = await ctx.admin.from("payment_oauth_states").insert({
          state_hash: await deps.sha256(state), player_id: ctx.userId, order_id: order.id, provider: "wechat",
          expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString()
        });
        if (stateError) throw stateError;
        const callback = setting("WECHAT_PAY_OAUTH_CALLBACK_URL");
        const oauthUrl = `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${encodeURIComponent(setting("WECHAT_PAY_APP_ID"))}&redirect_uri=${encodeURIComponent(callback)}&response_type=code&scope=snsapi_base&state=${encodeURIComponent(state)}#wechat_redirect`;
        const payload = { flow: scene, redirectUrl: oauthUrl };
        await markProviderOrder(ctx, order.id, "", payload);
        return deps.reply({ ok: true, orderId: order.id, status: "pending", flow: scene, payPayload: payload });
      }
      const payload = await wechatTransaction(scene, order, "", clean(ctx.clientIp, 64));
      await markProviderOrder(ctx, order.id, "", payload);
      return deps.reply({ ok: true, orderId: order.id, status: "pending", flow: scene, payPayload: payload });
    } catch (caught) {
      await failOrder(ctx, order.id, caught instanceof Error ? caught.message : "PROVIDER_CREATE_FAILED");
      throw caught;
    }
  }

  async function capturePaypal(ctx: Context, body: Json) {
    const orderId = clean(body.orderId, 40);
    if (!UUID_PATTERN.test(orderId)) return paymentError(deps, "充值订单号无效。", "PAYMENT_ORDER_INVALID");
    const order = await orderById(ctx.admin, orderId, ctx.userId);
    if (!order || order.provider !== "paypal") return paymentError(deps, "充值订单不存在。", "PAYMENT_ORDER_NOT_FOUND", 404);
    if (order.fulfillment_status === "fulfilled") return status(ctx, { orderId });
    const providerOrderId = clean(body.providerOrderId || order.provider_order_id, 160);
    if (!providerOrderId || providerOrderId !== order.provider_order_id) return paymentError(deps, "PayPal 订单校验失败。", "PAYPAL_ORDER_MISMATCH", 409);
    const capture = await paypalRequest("POST", `/v2/checkout/orders/${encodeURIComponent(providerOrderId)}/capture`, undefined, `${order.id}-capture`);
    const unit = capture.purchase_units?.[0];
    const transaction = unit?.payments?.captures?.find((item: Json) => item.status === "COMPLETED");
    if (capture.status !== "COMPLETED" || !transaction || unit?.custom_id !== order.id) return paymentError(deps, "PayPal 付款尚未完成。", "PAYPAL_CAPTURE_INCOMPLETE", 409);
    const amountMinor = Math.round(Number(transaction.amount?.value) * 100);
    const result = await fulfill(ctx.admin, deps, order, clean(transaction.id, 160), providerOrderId, amountMinor, clean(transaction.amount?.currency_code, 8), `capture:${transaction.id}`, "PAYMENT.CAPTURE.COMPLETED", capture);
    return deps.reply({ ok: true, orderId, status: "fulfilled", profile: deps.publicProfile(result.profile), revision: Number(result.revision) || 0 });
  }

  async function syncPendingOrder(ctx: Context, order: Json) {
    if (order.payment_status !== "pending" || !providerEnabled(order.provider)) return order;
    const last = new Date(order.last_provider_sync_at || 0).getTime();
    if (Date.now() - last < 5000) return order;
    await ctx.admin.from("payment_orders").update({ last_provider_sync_at: new Date().toISOString() }).eq("id", order.id);
    if (order.provider === "paypal" && order.provider_order_id) {
      const remote = await paypalRequest("GET", `/v2/checkout/orders/${encodeURIComponent(order.provider_order_id)}`);
      if (remote.status === "COMPLETED") {
        const unit = remote.purchase_units?.[0];
        const transaction = unit?.payments?.captures?.find((item: Json) => item.status === "COMPLETED");
        if (transaction && unit?.custom_id === order.id) {
          await fulfill(ctx.admin, deps, order, clean(transaction.id, 160), order.provider_order_id, Math.round(Number(transaction.amount?.value) * 100), clean(transaction.amount?.currency_code, 8), `query:${transaction.id}`, "PAYPAL.ORDER.QUERY", remote);
        }
      }
    } else if (order.provider === "wechat") {
      const remote = await wechatRequest("GET", `/v3/pay/transactions/out-trade-no/${encodeURIComponent(order.id)}?mchid=${encodeURIComponent(setting("WECHAT_PAY_MCH_ID"))}`);
      if (remote.trade_state === "SUCCESS") await verifyAndFulfillWechat(ctx.admin, order, remote, `query:${remote.transaction_id}`, "WECHAT.TRANSACTION.QUERY");
    }
    return await orderById(ctx.admin, order.id, ctx.userId);
  }

  async function status(ctx: Context, body: Json) {
    const orderId = clean(body.orderId, 40);
    if (!UUID_PATTERN.test(orderId)) return paymentError(deps, "充值订单号无效。", "PAYMENT_ORDER_INVALID");
    let order = await orderById(ctx.admin, orderId, ctx.userId);
    if (!order) return paymentError(deps, "充值订单不存在。", "PAYMENT_ORDER_NOT_FOUND", 404);
    try { order = await syncPendingOrder(ctx, order); } catch (caught) { logPayment(order.id, "query", "pending", caught instanceof Error ? caught.message : "QUERY_FAILED"); }
    const response: Json = { ok: true, order: {
      id: order.id, offerId: order.product_id, provider: order.provider, market: order.market, flow: order.payment_scene,
      paymentStatus: order.payment_status, fulfillmentStatus: order.fulfillment_status, refundStatus: order.refund_status,
      amountMinor: order.price_minor, currency: order.currency, rewards: order.reward_snapshot,
      createdAt: isoDate(order.created_at), expiresAt: isoDate(order.expires_at), fulfilledAt: isoDate(order.fulfilled_at)
    } };
    if (order.payment_scene === "wechat_jsapi" && order.payment_status === "pending" && order.provider_payload?.invoke) response.payPayload = order.provider_payload;
    if (order.fulfillment_status === "fulfilled" || order.fulfillment_status === "reversed" || order.fulfillment_status === "debt") {
      const current = await deps.loadProfile(ctx);
      response.profile = deps.publicProfile(current.profile);
      response.revision = current.revision;
    }
    return deps.reply(response);
  }

  async function verifyAndFulfillWechat(admin: any, order: Json, transaction: Json, eventId: string, eventType: string) {
    if (transaction.trade_state !== "SUCCESS" || transaction.out_trade_no !== order.id || transaction.mchid !== setting("WECHAT_PAY_MCH_ID") || transaction.appid !== setting("WECHAT_PAY_APP_ID")) throw new Error("WECHAT_TRANSACTION_MISMATCH");
    return fulfill(admin, deps, order, clean(transaction.transaction_id, 160), clean(transaction.transaction_id, 160), Number(transaction.amount?.total), clean(transaction.amount?.currency, 8), eventId, eventType, transaction);
  }

  async function wechatNotify(admin: any, request: Request, rawBody: string, refund = false) {
    const timestamp = request.headers.get("Wechatpay-Timestamp") || "";
    const nonce = request.headers.get("Wechatpay-Nonce") || "";
    const signature = request.headers.get("Wechatpay-Signature") || "";
    const serial = request.headers.get("Wechatpay-Serial") || "";
    if (!await verifyWechatSignature(timestamp, nonce, rawBody, signature, serial)) return jsonResponse({ code: "FAIL", message: "SIGNATURE_INVALID" }, 401);
    const envelope = JSON.parse(rawBody || "{}");
    const payload = await decryptWechatResource(envelope.resource || {});
    const orderId = clean(refund ? payload.out_trade_no : payload.out_trade_no, 40);
    const order = await orderById(admin, orderId);
    if (!order || order.provider !== "wechat") return jsonResponse({ code: "FAIL", message: "ORDER_NOT_FOUND" }, 404);
    const eventId = clean(envelope.id || `${timestamp}:${nonce}`, 180);
    if (refund) {
      if (payload.refund_status !== "SUCCESS" || Number(payload.amount?.refund) !== Number(order.price_minor) || payload.amount?.refund_currency !== order.currency) throw new Error("WECHAT_REFUND_MISMATCH");
      await reverse(admin, deps, order, eventId, clean(envelope.event_type, 100), payload, false);
    } else {
      await verifyAndFulfillWechat(admin, order, payload, eventId, clean(envelope.event_type, 100));
    }
    return jsonResponse({ code: "SUCCESS", message: "成功" });
  }

  async function wechatOauth(admin: any, url: URL) {
    const state = clean(url.searchParams.get("state"), 160);
    const code = clean(url.searchParams.get("code"), 160);
    if (!state || !code) return new Response("微信授权参数无效。", { status: 400 });
    const hash = await deps.sha256(state);
    const { data: record, error } = await admin.from("payment_oauth_states").select("state_hash, player_id, order_id, expires_at, consumed_at").eq("state_hash", hash).maybeSingle();
    if (error) throw error;
    if (!record || record.consumed_at || new Date(record.expires_at).getTime() <= Date.now()) return new Response("微信授权已过期，请返回游戏重试。", { status: 410 });
    const { data: consumed, error: consumeError } = await admin.from("payment_oauth_states").update({ consumed_at: new Date().toISOString() }).eq("state_hash", hash).is("consumed_at", null).select("order_id").maybeSingle();
    if (consumeError) throw consumeError;
    if (!consumed) return new Response("微信授权已使用。", { status: 409 });
    const tokenResponse = await fetch(`https://api.weixin.qq.com/sns/oauth2/access_token?appid=${encodeURIComponent(setting("WECHAT_PAY_APP_ID"))}&secret=${encodeURIComponent(setting("WECHAT_PAY_APP_SECRET"))}&code=${encodeURIComponent(code)}&grant_type=authorization_code`);
    const token = await tokenResponse.json().catch(() => ({}));
    if (!tokenResponse.ok || !token.openid) throw new Error(`WECHAT_OAUTH_${clean(token.errcode || "FAILED", 40)}`);
    const order = await orderById(admin, record.order_id, record.player_id);
    if (!order || order.payment_scene !== "wechat_jsapi") throw new Error("WECHAT_OAUTH_ORDER_MISMATCH");
    const payload = await wechatTransaction("wechat_jsapi", order, clean(token.openid, 160));
    await admin.from("payment_orders").update({ provider_payload: payload, updated_at: new Date().toISOString() }).eq("id", order.id);
    return Response.redirect(safeReturnUrl(order.id, { payment_provider: "wechat", payment_action: "jsapi" }), 302);
  }

  async function paypalWebhook(admin: any, request: Request, rawBody: string) {
    const event = JSON.parse(rawBody || "{}");
    const verification = await paypalRequest("POST", "/v1/notifications/verify-webhook-signature", {
      auth_algo: request.headers.get("paypal-auth-algo"), cert_url: request.headers.get("paypal-cert-url"),
      transmission_id: request.headers.get("paypal-transmission-id"), transmission_sig: request.headers.get("paypal-transmission-sig"),
      transmission_time: request.headers.get("paypal-transmission-time"), webhook_id: setting("PAYPAL_WEBHOOK_ID"), webhook_event: event
    });
    if (verification.verification_status !== "SUCCESS") return jsonResponse({ error: "PAYPAL_SIGNATURE_INVALID" }, 401);
    const eventId = clean(event.id, 180);
    const eventType = clean(event.event_type, 100);
    const resource = event.resource || {};
    const providerOrderId = clean(resource.supplementary_data?.related_ids?.order_id, 160);
    const captureId = clean(resource.supplementary_data?.related_ids?.capture_id || resource.disputed_transactions?.[0]?.seller_transaction_id || resource.id, 160);
    let orderQuery = admin.from("payment_orders").select("*").eq("provider", "paypal");
    orderQuery = providerOrderId ? orderQuery.eq("provider_order_id", providerOrderId) : orderQuery.eq("provider_transaction_id", captureId);
    const { data: order, error } = await orderQuery.maybeSingle();
    if (error) throw error;
    if (!order) return jsonResponse({ ok: true, ignored: true });
    if (eventType === "PAYMENT.CAPTURE.COMPLETED") {
      const capture = await paypalRequest("GET", `/v2/payments/captures/${encodeURIComponent(resource.id)}`);
      const amountMinor = Math.round(Number(capture.amount?.value) * 100);
      if (capture.status !== "COMPLETED" || capture.custom_id !== order.id) throw new Error("PAYPAL_CAPTURE_MISMATCH");
      await fulfill(admin, deps, order, clean(capture.id, 160), providerOrderId || order.provider_order_id, amountMinor, clean(capture.amount?.currency_code, 8), eventId, eventType, capture);
    } else if (eventType === "PAYMENT.CAPTURE.REFUNDED") {
      if (Math.round(Number(resource.amount?.value) * 100) !== Number(order.price_minor) || resource.amount?.currency_code !== order.currency) throw new Error("PAYPAL_REFUND_MISMATCH");
      await reverse(admin, deps, order, eventId, eventType, resource, false);
    } else if (eventType === "CUSTOMER.DISPUTE.CREATED") {
      await reverse(admin, deps, order, eventId, eventType, resource, true);
    } else {
      await admin.from("payment_events").upsert({ provider: "paypal", event_id: eventId, event_type: eventType, order_id: order.id, payload_hash: await deps.sha256(rawBody), verified: true, processing_status: "ignored", processed_at: new Date().toISOString() }, { onConflict: "provider,event_id" });
    }
    return jsonResponse({ ok: true });
  }

  async function adminRefund(admin: any, request: Request, body: Json) {
    const orderId = clean(body.orderId, 40);
    const timestamp = clean(request.headers.get("x-rx-timestamp"), 20);
    const nonce = clean(request.headers.get("x-rx-nonce"), 100);
    const signature = clean(request.headers.get("x-rx-signature"), 128).toLowerCase();
    const secret = setting("PAYMENT_ADMIN_HMAC_SECRET");
    if (!UUID_PATTERN.test(orderId) || !secret || Math.abs(Date.now() - Number(timestamp) * 1000) > 5 * 60 * 1000 || !nonce) return jsonResponse({ error: "REFUND_UNAUTHORIZED" }, 401);
    const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const expectedBytes = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(`${timestamp}\n${nonce}\n${orderId}\n`)));
    const expected = Array.from(expectedBytes).map((item) => item.toString(16).padStart(2, "0")).join("");
    let mismatch = expected.length !== signature.length ? 1 : 0;
    for (let i = 0; i < Math.min(expected.length, signature.length); i += 1) mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
    if (mismatch) return jsonResponse({ error: "REFUND_UNAUTHORIZED" }, 401);
    const { error: nonceError } = await admin.from("payment_admin_nonces").insert({ nonce, expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() });
    if (nonceError) return jsonResponse({ error: "REFUND_NONCE_REUSED" }, 409);
    const order = await orderById(admin, orderId);
    if (!order || order.fulfillment_status !== "fulfilled" || order.refund_status !== "none") return jsonResponse({ error: "REFUND_ORDER_NOT_ELIGIBLE" }, 409);
    if (order.provider === "paypal") {
      await paypalRequest("POST", `/v2/payments/captures/${encodeURIComponent(order.provider_transaction_id)}/refund`, { amount: { value: formatMoney(order.price_minor, order.currency), currency_code: order.currency }, invoice_id: order.id }, `${order.id}-refund`);
    } else {
      await wechatRequest("POST", "/v3/refund/domestic/refunds", { out_trade_no: order.id, out_refund_no: `R${order.id.replace(/-/g, "")}`.slice(0, 32), reason: "operator_full_refund", notify_url: setting("WECHAT_PAY_REFUND_NOTIFY_URL"), amount: { refund: order.price_minor, total: order.price_minor, currency: order.currency } });
    }
    await admin.from("payment_orders").update({ state: "refunding", payment_status: "refunding", refund_status: "pending", updated_at: new Date().toISOString() }).eq("id", order.id);
    logPayment(order.id, nonce, "refunding");
    return jsonResponse({ ok: true, orderId: order.id, refundStatus: "pending" });
  }

  return { catalog, createOrder, capturePaypal, status, wechatNotify, wechatOauth, paypalWebhook, adminRefund };
}

export const paymentTestKit = {
  formatMoney,
  paymentMode,
  providerEnabled,
  verifyWechatSignature,
  decryptWechatResource
};
