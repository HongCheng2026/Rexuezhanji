(function registerContactView(root) {
  "use strict";
  var scope = root.RXGame || (root.RXGame = {});

  function escapeAttribute(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function render(dom) {
    var assets = scope.assets && scope.assets.FEATURE_PANEL_ASSETS || {};
    var qrSrc = assets.contactQr || "";
    dom.featurePanelKicker.textContent = "CONTACT";
    dom.featurePanelTitle.textContent = "联系我们";
    dom.featurePanelBody.textContent = "扫码添加 QQ，获取钻石充值与客服支持。";
    dom.featurePanelSlots.className = "contact-panel-content";
    dom.featurePanelSlots.innerHTML = qrSrc
      ? '<figure class="contact-qr-card"><img src="' + escapeAttribute(qrSrc) + '" alt="联系我们 QQ 二维码" data-contact-qr></figure>'
      : '<p class="contact-qr-missing" role="status">二维码暂未加载，请稍后重试。</p>';
    return true;
  }

  var api = { render: render };
  scope.contactView = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
