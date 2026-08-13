(function defineRechargeRoom(root) {
  "use strict";
  var shared = root.RXGame || (root.RXGame = {});
  var registry = shared.roomRegistry;
  if (!registry) return;

  registry.defineRoom("recharge", function createPaycoreHost(context) {
    var capabilities = context.payment || {};
    var dom = context.dom || {};
    var mounted = false;

    function shell() {
      if (dom.featurePanelKicker) dom.featurePanelKicker.textContent = "PAYMENT LAB";
      if (dom.featurePanelTitle) dom.featurePanelTitle.textContent = "微信充值";
      if (dom.featurePanelBody) dom.featurePanelBody.textContent = "独立支付核心 · 微信 Native 动态订单";
      if (capabilities.openShell) capabilities.openShell("main-feature-panel feature-panel-standard recharge-feature-panel paycore-host-panel");
    }
    function renderUnavailable(message) {
      if (!dom.featurePanelSlots) return false;
      dom.featurePanelSlots.className = "feature-panel-room-content paycore-host__content";
      dom.featurePanelSlots.innerHTML = '<section class="paycore-host__unavailable"><strong>充值服务不可用</strong><p>' + String(message || "请使用云端账号后重试。") + '</p></section>';
      return true;
    }
    function mountFrame() {
      if (!dom.featurePanelSlots) return false;
      dom.featurePanelSlots.className = "feature-panel-room-content paycore-host__content";
      dom.featurePanelSlots.innerHTML = '<iframe class="paycore-host__frame" title="独立微信支付系统" src="../PaymentLab/index.html?embed=1" allow="payment"></iframe>';
      mounted = true;
      return true;
    }
    function open() {
      shell();
      if (!capabilities.isCloudMode || !capabilities.isCloudMode()) return renderUnavailable("充值只绑定云端账号，本地存档不会创建支付订单或发放钻石。");
      return mountFrame();
    }
    function refreshGameProfile() {
      var gateway = capabilities.getGameGateway ? capabilities.getGameGateway() : null;
      if (!gateway || typeof gateway.syncProfile !== "function") return false;
      return Promise.resolve(gateway.syncProfile(0)).then(function (result) {
        if (result && result.profile && capabilities.applyGatewayProfile) capabilities.applyGatewayProfile(result.profile);
        if (capabilities.renderLobby) capabilities.renderLobby();
        return true;
      });
    }
    function onMessage(event) {
      if (!mounted || event.origin !== root.location.origin || !event.data || event.data.type !== "rx-paycore-delivered") return;
      refreshGameProfile();
    }
    if (root.addEventListener) root.addEventListener("message", onMessage);
    return {
      actions: { "recharge.open": open, "recharge.refresh": refreshGameProfile },
      dispose: function dispose() { mounted = false; if (root.removeEventListener) root.removeEventListener("message", onMessage); }
    };
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
