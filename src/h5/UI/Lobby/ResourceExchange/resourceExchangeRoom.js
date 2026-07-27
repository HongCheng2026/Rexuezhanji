(function defineResourceExchangeRoom(root) {
  "use strict";
  var shared = root.RXGame || (root.RXGame = {});
  var registry = shared.roomRegistry;
  if (!registry) return;

  registry.defineRoom("resourceExchange", function createResourceExchangeRoom(context) {
    var capabilities = context.resourceExchange || {};
    var screen = context.dom && context.dom.resourceExchangeScreen;
    var mount = context.dom && context.dom.resourceExchangeMount;
    var model = shared.resourceExchangeModel;
    var view = shared.resourceExchangeView && shared.resourceExchangeView.create({
      mount: mount,
      assets: shared.assets && shared.assets.UI_A_HUD_ASSETS || {}
    });
    var amount = 1;
    var message = "";
    var isError = false;

    function getProfile() { return capabilities.getProfile ? capabilities.getProfile() : {}; }
    function isAvailable() { return Boolean(model && view && screen && mount); }
    function render() {
      if (!isAvailable()) return false;
      view.render({ quote: model.quote(getProfile(), amount), message: message, isError: isError });
      return true;
    }
    function open() {
      if (!isAvailable()) return false;
      amount = 1;
      message = "";
      isError = false;
      render();
      screen.classList.remove("hidden");
      return true;
    }
    function close() {
      if (!screen) return false;
      screen.classList.add("hidden");
      return true;
    }
    function setAmount(value) {
      if (!model) return amount;
      amount = model.normalizeAmount(value, model.getBalance(getProfile()).diamonds);
      message = "";
      isError = false;
      render();
      return amount;
    }
    function adjust(delta) { return setAmount(amount + (Number(delta) || 0)); }
    function confirm() {
      if (!model) return { ok: false, reason: "RESOURCE_EXCHANGE_UNAVAILABLE" };
      var result = model.exchange(getProfile(), amount);
      if (!result.ok) {
        message = result.reason === "DIAMONDS_NOT_ENOUGH" ? "钻石不足，无法完成兑换。" : "兑换失败，请稍后重试。";
        isError = true;
        render();
        return result;
      }
      if (capabilities.saveProfile) capabilities.saveProfile();
      if (capabilities.renderLobby) capabilities.renderLobby();
      if (capabilities.emitGoldChanged) capabilities.emitGoldChanged();
      amount = 1;
      message = "兑换成功：获得 " + result.goldGain.toLocaleString("zh-CN") + " 金币，已写入当前存档。";
      isError = false;
      render();
      return result;
    }

    return {
      actions: {
        "resourceExchange.open": open,
        "resourceExchange.close": close,
        "resourceExchange.setAmount": setAmount,
        "resourceExchange.adjust": adjust,
        "resourceExchange.confirm": confirm
      },
      dispose: function dispose() { close(); if (view) view.clear(); }
    };
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
