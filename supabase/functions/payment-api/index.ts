import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Json = Record<string, any>;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, wechatpay-timestamp, wechatpay-nonce, wechatpay-signature, wechatpay-serial",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
};
const enc = new TextEncoder();
const dec = new TextDecoder();
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function env(name: string) { return (Deno.env.get(name) || "").trim(); }
function enabled(name: string) { return /^(1|true|yes)$/i.test(env(name)); }
function reply(body: Json, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json; charset=utf-8" } });
}
function clean(value: unknown, max = 200) { return String(value || "").replace(/[\u0000-\u001f]/g, "").slice(0, max); }
function bytesToBase64(bytes: Uint8Array) {
  let raw = "";
  for (let i = 0; i < bytes.length; i += 1) raw += String.fromCharCode(bytes[i]);
  return btoa(raw);
}
function base64ToBytes(value: string) {
  const raw = atob(value); const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}
function pemBytes(value: string) { return base64ToBytes(value.replace(/-----[^-]+-----/g, "").replace(/\s/g, "")); }
async function sha256(value: string) {
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(value)))).map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function hmacHex(secret: string, value: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return Array.from(new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(value)))).map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function rsaSign(value: string) {
  const key = await crypto.subtle.importKey("pkcs8", pemBytes(env("WECHAT_PAY_PRIVATE_KEY")), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  return bytesToBase64(new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, enc.encode(value))));
}
async function verifyWechat(timestamp: string, nonce: string, raw: string, signature: string, serial: string) {
  if (!timestamp || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300 || serial !== env("WECHAT_PAY_PLATFORM_SERIAL")) return false;
  const key = await crypto.subtle.importKey("spki", pemBytes(env("WECHAT_PAY_PLATFORM_PUBLIC_KEY")), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  return crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, base64ToBytes(signature), enc.encode(`${timestamp}\n${nonce}\n${raw}\n`));
}
async function decryptResource(resource: Json) {
  const key = enc.encode(env("WECHAT_PAY_API_V3_KEY"));
  if (key.length !== 32) throw new Error("WECHAT_API_V3_KEY_INVALID");
  const encrypted = base64ToBytes(clean(resource.ciphertext, 100000));
  const tag = encrypted.slice(encrypted.length - 16);
  const ciphertext = encrypted.slice(0, encrypted.length - 16);
  const cryptoKey = await crypto.subtle.importKey("raw", key, "AES-GCM", false, ["decrypt"]);
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: enc.encode(clean(resource.nonce, 32)), additionalData: enc.encode(clean(resource.associated_data, 256)), tagLength: 128 }, cryptoKey, new Uint8Array([...ciphertext, ...tag]));
  return JSON.parse(dec.decode(plaintext));
}
async function wechatRequest(method: string, path: string, body?: Json) {
  const nonce = crypto.randomUUID().replace(/-/g, "");
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const raw = body ? JSON.stringify(body) : "";
  const signature = await rsaSign(`${method}\n${path}\n${timestamp}\n${nonce}\n${raw}\n`);
  const authorization = `WECHATPAY2-SHA256-RSA2048 mchid="${env("WECHAT_PAY_MCH_ID")}",nonce_str="${nonce}",timestamp="${timestamp}",serial_no="${env("WECHAT_PAY_MERCHANT_SERIAL")}",signature="${signature}"`;
  const response = await fetch(`https://api.mch.weixin.qq.com${path}`, { method, headers: { Authorization: authorization, Accept: "application/json", "Content-Type": "application/json" }, body: raw || undefined });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`WECHAT_API_${response.status}_${clean(result.code || "FAILED", 60)}`);
  return result;
}
function adminClient() {
  return createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false, autoRefreshToken: false } });
}
async function accountId(request: Request) {
  const authorization = request.headers.get("Authorization") || "";
  const token = authorization.replace(/^Bearer\s+/i, "");
  if (!token) return "";
  const client = createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY") || env("SUPABASE_PUBLISHABLE_KEY"), { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.getUser(token);
  return error ? "" : clean(data.user?.id, 40);
}
async function orderById(admin: any, orderId: string, account = "") {
  let query = admin.from("paycore_orders").select("*").eq("id", orderId);
  if (account) query = query.eq("account_id", account);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data;
}
async function markPaid(admin: any, order: Json, transaction: Json, eventId: string, eventType: string) {
  if (transaction.trade_state !== "SUCCESS" || transaction.out_trade_no !== order.provider_order_no || transaction.mchid !== env("WECHAT_PAY_MCH_ID") || transaction.appid !== env("WECHAT_PAY_APP_ID")) throw new Error("WECHAT_TRANSACTION_MISMATCH");
  const { data, error } = await admin.rpc("paycore_mark_paid", {
    p_provider_order_no: order.provider_order_no,
    p_provider_transaction_id: clean(transaction.transaction_id, 80),
    p_amount_minor: Number(transaction.amount?.total),
    p_currency: clean(transaction.amount?.currency, 8),
    p_event_id: clean(eventId, 180), p_event_type: clean(eventType, 100),
    p_payload_hash: await sha256(JSON.stringify(transaction))
  });
  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
}
async function deliver(admin: any, orderId: string) {
  const { data: outbox, error } = await admin.from("paycore_delivery_outbox").select("*").eq("order_id", orderId).maybeSingle();
  if (error) throw error;
  if (!outbox || outbox.status === "delivered") return outbox;
  const url = env("PAYCORE_DELIVERY_URL"); const secret = env("PAYCORE_DELIVERY_SECRET");
  if (!url || !secret) return outbox;
  const payload = { eventId: outbox.event_id, orderId: outbox.order_id, accountId: outbox.account_id, rewards: outbox.reward_snapshot };
  const raw = JSON.stringify(payload); const timestamp = Math.floor(Date.now() / 1000).toString(); const nonce = crypto.randomUUID();
  await admin.from("paycore_delivery_outbox").update({ status: "delivering" }).eq("event_id", outbox.event_id).neq("status", "delivered");
  try {
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", "x-paycore-timestamp": timestamp, "x-paycore-nonce": nonce, "x-paycore-signature": await hmacHex(secret, `${timestamp}\n${nonce}\n${raw}`) }, body: raw, signal: AbortSignal.timeout(8000) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.ok !== true) throw new Error(clean(result.code || `DELIVERY_HTTP_${response.status}`, 120));
    const { error: markError } = await admin.rpc("paycore_mark_delivery", { p_event_id: outbox.event_id, p_success: true, p_response: result, p_error: null });
    if (markError) throw markError;
    return { ...outbox, status: "delivered", response_snapshot: result };
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "DELIVERY_FAILED";
    await admin.rpc("paycore_mark_delivery", { p_event_id: outbox.event_id, p_success: false, p_response: {}, p_error: message });
    return { ...outbox, status: "failed", last_error: message };
  }
}
async function catalog(admin: any, account: string) {
  const [{ data: offers, error }, { data: entitlements }] = await Promise.all([
    admin.from("paycore_offers").select("offer_id,title,description,amount_minor,currency,rewards,first_bonus_rewards,sort_order").eq("enabled", true).order("sort_order"),
    admin.from("paycore_entitlements").select("benefit_key,state,expires_at").eq("account_id", account)
  ]);
  if (error) throw error;
  const now = Date.now();
  const owned = new Set((entitlements || []).filter((e: Json) => e.state === "claimed" || new Date(e.expires_at || 0).getTime() > now).map((e: Json) => e.benefit_key));
  return reply({ ok: true, enabled: enabled("PAYCORE_WECHAT_ENABLED"), mode: "wechat_native", offers: (offers || []).map((o: Json) => ({ offerId: o.offer_id, title: o.title, description: o.description, amountMinor: o.amount_minor, currency: o.currency, rewards: o.rewards, firstBonusRewards: o.first_bonus_rewards, firstPurchaseAvailable: !owned.has(`first:${o.offer_id}`) })) });
}
async function createOrder(admin: any, account: string, body: Json) {
  if (!enabled("PAYCORE_WECHAT_ENABLED")) return reply({ error: "微信支付实验通道尚未开启。", code: "PAYCORE_DISABLED" }, 403);
  const offerId = clean(body.offerId, 80); const key = clean(body.idempotencyKey, 40);
  if (!offerId || !uuidPattern.test(key)) return reply({ error: "下单参数无效。", code: "PAYCORE_ORDER_INVALID" }, 400);
  const { data, error } = await admin.rpc("paycore_create_order", { p_account_id: account, p_offer_id: offerId, p_idempotency_key: key });
  if (error) return reply({ error: "无法创建支付订单。", code: clean(error.message, 100) }, 409);
  const created = Array.isArray(data) ? data[0] : data;
  const order = await orderById(admin, created.order_id, account);
  if (order.provider_payload?.codeUrl) return reply({ ok: true, orderId: order.id, flow: "wechat_native", payPayload: order.provider_payload });
  const payload = await wechatRequest("POST", "/v3/pay/transactions/native", {
    appid: env("WECHAT_PAY_APP_ID"), mchid: env("WECHAT_PAY_MCH_ID"), description: order.title_snapshot,
    out_trade_no: order.provider_order_no, time_expire: order.expires_at,
    notify_url: env("PAYCORE_WECHAT_NOTIFY_URL"), amount: { total: order.amount_minor, currency: order.currency }, attach: order.id
  });
  const payPayload = { codeUrl: clean(payload.code_url, 2048), expiresAt: order.expires_at };
  await admin.from("paycore_orders").update({ provider_payload: payPayload, updated_at: new Date().toISOString() }).eq("id", order.id);
  return reply({ ok: true, orderId: order.id, flow: "wechat_native", payPayload });
}
async function status(admin: any, account: string, body: Json) {
  const orderId = clean(body.orderId, 40);
  if (!uuidPattern.test(orderId)) return reply({ error: "订单号无效。", code: "PAYCORE_ORDER_INVALID" }, 400);
  let order = await orderById(admin, orderId, account);
  if (!order) return reply({ error: "订单不存在。", code: "PAYCORE_ORDER_NOT_FOUND" }, 404);
  if (order.payment_status === "pending" && enabled("PAYCORE_WECHAT_ENABLED") && Date.now() - new Date(order.last_provider_sync_at || 0).getTime() > 5000) {
    await admin.from("paycore_orders").update({ last_provider_sync_at: new Date().toISOString() }).eq("id", order.id);
    try {
      const path = `/v3/pay/transactions/out-trade-no/${encodeURIComponent(order.provider_order_no)}?mchid=${encodeURIComponent(env("WECHAT_PAY_MCH_ID"))}`;
      const remote = await wechatRequest("GET", path);
      if (remote.trade_state === "SUCCESS") await markPaid(admin, order, remote, `query:${remote.transaction_id}`, "WECHAT.TRANSACTION.QUERY");
    } catch (caught) { console.warn(JSON.stringify({ orderId, status: "query_failed", code: clean(caught instanceof Error ? caught.message : caught, 100) })); }
    order = await orderById(admin, orderId, account);
  }
  if (order.payment_status === "succeeded" && order.delivery_status !== "delivered") await deliver(admin, order.id);
  order = await orderById(admin, orderId, account);
  return reply({ ok: true, order: { id: order.id, offerId: order.offer_id, paymentStatus: order.payment_status, deliveryStatus: order.delivery_status, amountMinor: order.amount_minor, currency: order.currency, rewards: order.reward_snapshot, expiresAt: order.expires_at, paidAt: order.paid_at, deliveredAt: order.delivered_at }, payPayload: order.payment_status === "pending" ? order.provider_payload : undefined });
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  const url = new URL(request.url); const action = clean(url.searchParams.get("action"), 60); const admin = adminClient();
  try {
    if (action === "wechat-notify") {
      const raw = await request.text();
      const timestamp = request.headers.get("Wechatpay-Timestamp") || ""; const nonce = request.headers.get("Wechatpay-Nonce") || "";
      if (!await verifyWechat(timestamp, nonce, raw, request.headers.get("Wechatpay-Signature") || "", request.headers.get("Wechatpay-Serial") || "")) return reply({ code: "FAIL", message: "SIGNATURE_INVALID" }, 401);
      const envelope = JSON.parse(raw || "{}"); const transaction = await decryptResource(envelope.resource || {});
      const { data: order, error } = await admin.from("paycore_orders").select("*").eq("provider_order_no", clean(transaction.out_trade_no, 40)).maybeSingle();
      if (error || !order) return reply({ code: "FAIL", message: "ORDER_NOT_FOUND" }, 404);
      await markPaid(admin, order, transaction, clean(envelope.id || `${timestamp}:${nonce}`, 180), clean(envelope.event_type, 100));
      await deliver(admin, order.id);
      console.info(JSON.stringify({ orderId: order.id, eventId: clean(envelope.id, 80), status: "paid" }));
      return reply({ code: "SUCCESS", message: "成功" });
    }
    const account = await accountId(request);
    if (!account) return reply({ error: "需要有效云端账号。", code: "AUTH_REQUIRED" }, 401);
    const body = request.method === "POST" ? await request.json().catch(() => ({})) : {};
    if (action === "catalog") return await catalog(admin, account);
    if (action === "order-create") return await createOrder(admin, account, body);
    if (action === "order-status") return await status(admin, account, body);
    return reply({ error: "未知支付操作。", code: "PAYCORE_ACTION_UNKNOWN" }, 404);
  } catch (caught) {
    const code = clean(caught instanceof Error ? caught.message : caught, 120) || "PAYCORE_FAILED";
    console.error(JSON.stringify({ action, status: "failed", code }));
    return reply({ error: "支付服务暂时不可用。", code }, 500);
  }
});
