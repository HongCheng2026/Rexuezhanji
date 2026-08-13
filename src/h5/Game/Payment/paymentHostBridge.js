(function registerPaymentHostBridge(root) {
  "use strict";

  var frame = null;
  var allowedExactHosts = new Set([
    "open.weixin.qq.com",
    "wx.tenpay.com",
    "www.paypal.com",
    "www.sandbox.paypal.com"
  ]);

  function gameFrame() {
    frame = frame || root.document && root.document.getElementById("gameFrame");
    return frame;
  }

  function trustedDestination(rawUrl) {
    try {
      var url = new URL(String(rawUrl || ""), root.location.href);
      if (url.origin === root.location.origin) return url;
      if (url.protocol !== "https:") return null;
      if (allowedExactHosts.has(url.hostname)) return url;
      if (/\.paypal\.com$/i.test(url.hostname)) return url;
      return null;
    } catch (error) {
      return null;
    }
  }

  function postToGame(message) {
    var target = gameFrame();
    if (!target || !target.contentWindow) return;
    target.contentWindow.postMessage(message, root.location.origin === "null" ? "*" : root.location.origin);
  }

  function invokeWechat(orderId, payload) {
    function invoke() {
      if (!root.WeixinJSBridge || typeof root.WeixinJSBridge.invoke !== "function") {
        postToGame({ type: "rx-payment-wechat-result", orderId: orderId, result: "get_brand_wcpay_request:fail" });
        return;
      }
      root.WeixinJSBridge.invoke("getBrandWCPayRequest", payload || {}, function onWechatResult(result) {
        postToGame({
          type: "rx-payment-wechat-result",
          orderId: orderId,
          result: String(result && result.err_msg || "get_brand_wcpay_request:fail")
        });
      });
    }
    if (root.WeixinJSBridge) invoke();
    else if (root.document) root.document.addEventListener("WeixinJSBridgeReady", invoke, { once: true });
  }

  function clearReturnParameters() {
    try {
      var url = new URL(root.location.href);
      ["payment_order", "payment_provider", "payment_action", "payment_cancelled", "token", "PayerID"].forEach(function remove(key) {
        url.searchParams.delete(key);
      });
      root.history.replaceState({}, root.document.title, url.pathname + (url.search ? url.search : "") + url.hash);
    } catch (error) { /* history may be unavailable in a file preview */ }
  }

  function onMessage(event) {
    var target = gameFrame();
    if (!target || event.source !== target.contentWindow) return;
    if (root.location.origin !== "null" && event.origin !== root.location.origin) return;
    var data = event.data || {};
    if (data.type === "rx-payment-navigate") {
      var destination = trustedDestination(data.url);
      if (destination) root.location.assign(destination.toString());
      else postToGame({ type: "rx-payment-navigation-rejected", orderId: data.orderId || "" });
    } else if (data.type === "rx-payment-wechat-jsapi") {
      invokeWechat(String(data.orderId || ""), data.invoke || {});
    } else if (data.type === "rx-payment-clear-return") {
      clearReturnParameters();
    }
  }

  if (root.addEventListener) root.addEventListener("message", onMessage);
  root.RXPaymentHostBridge = { trustedDestination: trustedDestination, clearReturnParameters: clearReturnParameters };
  if (typeof module !== "undefined" && module.exports) module.exports = root.RXPaymentHostBridge;
})(typeof globalThis !== "undefined" ? globalThis : window);
