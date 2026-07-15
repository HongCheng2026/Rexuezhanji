(function registerEconomyFeatureController(root) {
  "use strict";

  var scope = root.RXGame || (root.RXGame = {});

  function create(options) {
    options = options || {};
    var lock = options.gatewayActionLock || { busy: false };

    function renderPanel(panel) {
      return options.shared.mainFeaturePanelsView.renderPanel(panel, options.dom, {
        profile: options.getProfile(),
        levels: options.levels || [],
        combatPower: options.calculateTotalPower(),
        audioSettings: options.audioSystem && options.audioSystem.getSettings ? options.audioSystem.getSettings() : null
      });
    }

    function run(button, method, value, panel) {
      if (lock.busy || !options.ensureGameGateway || !options.getGameGateway) return false;
      lock.busy = true;
      var previousText = button.textContent;
      button.disabled = true;
      button.textContent = method === "buyShopItem" ? "购买中…" : "领取中…";
      options.dom.featurePanelBody.textContent = "正在等待云端确认，请勿重复操作。";
      options.ensureGameGateway().then(function performCloudAction() {
        var gateway = options.getGameGateway();
        if (!gateway || typeof gateway[method] !== "function") throw new Error("云端接口尚未就绪。");
        return gateway[method](value);
      }).then(function applyCloudResult(result) {
        if (!result || !result.profile) throw new Error("云端返回的存档无效。");
        options.applyGatewayProfile(result.profile);
        options.saveProfile();
        options.renderLobby();
        if (options.updateHud) options.updateHud(true);
        renderPanel(panel);
        options.dom.featurePanelBody.textContent = method === "buyShopItem" ? "购买成功，物品已写入云存档。" : "领取成功，奖励已写入云存档。";
        if (options.playSfx) options.playSfx("button");
      }).catch(function showCloudError(error) {
        button.disabled = false;
        button.textContent = previousText;
        options.dom.featurePanelBody.textContent = error && error.message ? error.message : "云端操作失败，请重试。";
      }).finally(function releaseLock() {
        lock.busy = false;
      });
      return true;
    }

    return { run: run, renderPanel: renderPanel };
  }

  scope.economyFeatureController = { create: create };
  if (typeof module !== "undefined" && module.exports) module.exports = { create: create };
})(typeof globalThis !== "undefined" ? globalThis : this);
