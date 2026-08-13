(function startPaymentLab(root) {
  "use strict";
  var mount = root.document.getElementById("paylab-root");
  var config = root.RXSupabaseConfig || {};
  var sessionKey = "rexuezhanjiSupabaseSession";
  var state = { offers: [], enabled: false, loading: true, status: "", error: false, activeOrder: null, qr: "", poll: 0 };

  function esc(value) { return String(value == null ? "" : value).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;"); }
  function session() { try { return JSON.parse(root.localStorage.getItem(sessionKey) || "null"); } catch (_) { return null; } }
  function errorMessage(error) { var message = String(error && error.message || ""); return message === "Failed to fetch" ? "独立支付服务尚未部署或网络不可达。" : (message || "支付服务暂时不可用。"); }
  function money(value) { return "¥" + (Math.max(0, Number(value) || 0) / 100).toFixed(2).replace(/\.00$/, ""); }
  function operationId() { return root.crypto && root.crypto.randomUUID ? root.crypto.randomUUID() : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) { var r=Math.random()*16|0; return (c==="x"?r:(r&3|8)).toString(16); }); }
  function pendingCreate(offerId) {
    var saved = null;
    try { saved = JSON.parse(root.localStorage.getItem("paycorePendingCreate") || "null"); } catch (_) {}
    if (saved && saved.offerId === offerId && saved.key && Date.now() - Number(saved.createdAt || 0) < 5 * 60 * 1000) return saved;
    saved = { offerId: offerId, key: operationId(), createdAt: Date.now() };
    root.localStorage.setItem("paycorePendingCreate", JSON.stringify(saved));
    return saved;
  }
  function qrSvg(value) { var code = root.qrcode(0, "M"); code.addData(value); code.make(); return code.createSvgTag({ cellSize: 7, margin: 20, scalable: true, alt: "本次微信支付二维码" }); }
  async function api(action, body) {
    var current = session();
    if (!config.url || !config.publishableKey || !current || !current.access_token) throw new Error("请先使用云端账号进入游戏，再打开充值中心。");
    var response = await fetch(config.url + "/functions/v1/payment-api?action=" + encodeURIComponent(action), { method: "POST", headers: { apikey: config.publishableKey, Authorization: "Bearer " + current.access_token, "Content-Type": "application/json" }, body: JSON.stringify(body || {}) });
    var result = await response.json().catch(function () { return {}; });
    if (!response.ok) { var error = new Error(result.error || "支付服务请求失败。"); error.code = result.code; throw error; }
    return result;
  }
  function setStatus(message, error) { state.status = String(message || ""); state.error = Boolean(error); render(); }
  function card(offer) {
    return '<article class="paylab-app__offer">' + (offer.firstPurchaseAvailable ? '<span class="paylab-app__bonus">首充双倍</span>' : '') + '<h2>' + esc(offer.title) + '</h2><p>' + esc(offer.description) + '</p><button type="button" data-buy="' + esc(offer.offerId) + '"' + (!state.enabled || state.loading ? ' disabled' : '') + '>' + money(offer.amountMinor) + ' 微信支付</button></article>';
  }
  function render() {
    if (!mount) return;
    var modal = state.qr && state.activeOrder ? '<section class="paylab-app__modal" role="dialog" aria-modal="true" aria-label="微信扫码支付"><article class="paylab-app__dialog"><small>WECHAT PAY · DYNAMIC ORDER</small><h2>' + esc(state.activeOrder.title || "微信支付") + '</h2><p>应付 ' + money(state.activeOrder.amountMinor) + '。二维码仅对应本次订单，付款后本页会自动确认到账。</p><div class="paylab-app__qr">' + qrSvg(state.qr) + '</div><p>不要重复付款。关闭页面后再次进入仍可继续查单。</p><button type="button" data-close-qr>隐藏二维码</button></article></section>' : '';
    mount.innerHTML = '<section class="paylab-app__shell"><header class="paylab-app__head"><div><span class="paylab-app__eyebrow">INDEPENDENT PAYMENT CORE</span><h1>微信充值实验室</h1><p>订单、微信回调和发货事件由独立支付服务管理。</p></div><span class="paylab-app__badge">微信 Native 动态订单</span></header><section class="paylab-app__offers">' + (state.offers.length ? state.offers.map(card).join("") : '<p>当前没有可用商品。</p>') + '</section><footer class="paylab-app__safe"><p>支付成功只以微信签名回调或服务端主动查单为准；前端不会直接增加钻石。</p></footer><p class="paylab-app__status' + (state.error ? ' is-error' : state.status.indexOf("到账") >= 0 ? ' is-success' : '') + '" role="status">' + esc(state.status) + '</p></section>' + modal;
  }
  async function load() {
    try { var result = await api("catalog"); state.offers = result.offers || []; state.enabled = Boolean(result.enabled); state.loading = false; setStatus(state.enabled ? "支付通道已就绪。" : "微信支付实验通道尚未开启。", !state.enabled); resume(); }
    catch (error) { state.loading = false; setStatus(errorMessage(error), true); }
  }
  async function buy(offerId) {
    if (state.loading || !state.enabled) return;
    state.loading = true; setStatus("正在创建微信支付订单……", false);
    try {
      var create = pendingCreate(offerId);
      var result = await api("order-create", { offerId: offerId, idempotencyKey: create.key });
      var offer = state.offers.find(function (item) { return item.offerId === offerId; }) || {};
      state.activeOrder = { id: result.orderId, title: offer.title, amountMinor: offer.amountMinor };
      state.qr = result.payPayload && result.payPayload.codeUrl || "";
      root.localStorage.removeItem("paycorePendingCreate");
      root.localStorage.setItem("paycoreActiveOrder", JSON.stringify(state.activeOrder));
      state.loading = false; setStatus("等待微信支付确认……", false); poll();
    } catch (error) { state.loading = false; setStatus(errorMessage(error), true); }
  }
  function resume() { try { var saved = JSON.parse(root.localStorage.getItem("paycoreActiveOrder") || "null"); if (saved && saved.id) { state.activeOrder = saved; poll(); } } catch (_) {} }
  function poll() {
    if (!state.activeOrder || !state.activeOrder.id) return;
    root.clearTimeout(state.poll);
    api("order-status", { orderId: state.activeOrder.id }).then(function (result) {
      var order = result.order || {};
      if (result.payPayload && result.payPayload.codeUrl) state.qr = result.payPayload.codeUrl;
      if (order.deliveryStatus === "delivered") {
        state.qr = ""; state.activeOrder = null; root.localStorage.removeItem("paycoreActiveOrder"); setStatus("支付已确认，钻石已到账。", false);
        if (root.parent && root.parent !== root) root.parent.postMessage({ type: "rx-paycore-delivered", orderId: order.id }, root.location.origin);
        return;
      }
      if (["failed","expired","refunded"].indexOf(order.paymentStatus) >= 0) { state.qr = ""; setStatus("订单已结束，未发放钻石。", true); return; }
      setStatus(order.paymentStatus === "succeeded" ? "微信已确认，正在发送钻石……" : "等待微信支付确认……", false);
      state.poll = root.setTimeout(poll, 3000);
    }).catch(function () { state.poll = root.setTimeout(poll, 5000); });
  }
  if (mount) mount.addEventListener("click", function (event) { var buyButton = event.target.closest("[data-buy]"); if (buyButton) buy(buyButton.dataset.buy); if (event.target.closest("[data-close-qr]")) { state.qr = ""; render(); } });
  load();
})(typeof globalThis !== "undefined" ? globalThis : window);
