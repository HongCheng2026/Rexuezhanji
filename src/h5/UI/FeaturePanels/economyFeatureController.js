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

    function run(button, method, value, panel, quantity) {
      if (lock.busy || !options.ensureGameGateway || !options.getGameGateway) return false;
      quantity = method === "buyShopItem" ? Math.max(1, Math.min(99, Math.floor(Number(quantity) || 1))) : 1;
      var shopView = options.shared && options.shared.shopView;
      var purchaseItem = method === "buyShopItem" && options.shared.shopConfig && options.shared.shopConfig.getShopItem
        ? options.shared.shopConfig.getShopItem(value) : null;
      var purchaseQuote = purchaseItem && shopView && shopView.getPurchaseQuote
        ? shopView.getPurchaseQuote(options.getProfile(), purchaseItem, quantity) : null;
      lock.busy = true;
      var previousText = button.textContent;
      button.disabled = true;
      if (method === "buyShopItem" && shopView && shopView.setPurchaseDialogPending) {
        shopView.setPurchaseDialogPending(options.dom.featurePanelSlots, true);
      } else {
        button.textContent = "领取中…";
        options.dom.featurePanelBody.textContent = "正在等待云端确认，请勿重复操作。";
      }
      options.ensureGameGateway().then(function performCloudAction() {
        var gateway = options.getGameGateway();
        if (!gateway || typeof gateway[method] !== "function") throw new Error("云端接口尚未就绪。");
        return method === "buyShopItem" ? gateway[method](value, quantity) : gateway[method](value);
      }).then(function applyCloudResult(result) {
        if (!result || !result.profile) throw new Error("云端返回的存档无效。");
        options.applyGatewayProfile(result.profile);
        options.renderLobby();
        if (options.updateHud) options.updateHud(true);
        renderPanel(panel);
        if (method === "buyShopItem" && shopView && shopView.showPurchaseResult) {
          shopView.showPurchaseResult(options.dom.featurePanelSlots, {
            itemId: value,
            quantity: Math.max(1, Math.floor(Number(result.quantity) || quantity)),
            price: purchaseQuote ? purchaseQuote.totalPrice : 0
          }, options.shared.assets);
        } else {
          options.dom.featurePanelBody.textContent = "领取成功，奖励已写入云存档。";
        }
        if (options.playSfx) options.playSfx("button");
      }).catch(function showCloudError(error) {
        var message = error && error.message ? error.message : "云端操作失败，请重试。";
        if (method === "buyShopItem" && shopView && shopView.setPurchaseDialogError) {
          shopView.setPurchaseDialogError(options.dom.featurePanelSlots, message);
        } else {
          button.disabled = false;
          button.textContent = previousText;
          options.dom.featurePanelBody.textContent = message;
        }
      }).finally(function releaseLock() {
        lock.busy = false;
      });
      return true;
    }

    function claim(element, method, panel, datasetKey, isDailyFree) {
      if (!element) return false;
      var value = element.dataset && element.dataset[datasetKey];
      if (!value) return false;
      var quantity = Math.max(1, Math.min(99, Math.floor(Number(element.dataset && element.dataset.shopQuantity) || 1)));
      var shopView = options.shared && options.shared.shopView;
      var shopItem = method === "buyShopItem" && options.shared.shopConfig && options.shared.shopConfig.getShopItem
        ? options.shared.shopConfig.getShopItem(value) : null;
      if (shopItem && shopItem.priceCurrency === "item" && options.isCloudMode && options.isCloudMode()) {
        if (shopView && shopView.setPurchaseDialogError) {
          shopView.setPurchaseDialogError(options.dom.featurePanelSlots, "正式云端物资兑换尚未开放，本次没有消耗物资。");
        } else options.dom.featurePanelBody.textContent = "正式云端物资兑换尚未开放，本次没有消耗物资。";
        return true;
      }
      if (options.isCloudMode && options.isCloudMode()) return run(element, method, value, panel, quantity);
      var view = options.shared.mainFeaturePanelsView;
      if (isDailyFree) {
        var daily = view.claimDailyShopItem && view.claimDailyShopItem(options.getProfile(), value);
        if (!daily || !daily.ok) return false;
        if (options.playSfx) options.playSfx("button");
        options.saveProfile();
        options.renderLobby();
        renderPanel("shop");
        return true;
      }
      if (method === "buyShopItem") {
        if (!shopView || typeof shopView.buyShopItem !== "function") {
          options.dom.featurePanelBody.textContent = "商店购买功能暂不可用。";
          return false;
        }
        if (shopView.setPurchaseDialogPending) shopView.setPurchaseDialogPending(options.dom.featurePanelSlots, true);
        var buyResult = shopView.buyShopItem(options.getProfile(), value, { quantity: quantity, confirmed: true });
        if (!buyResult || !buyResult.ok) {
          var buyMessages = {
            LIMIT_REACHED: "今日 / 本周购买已达上限。",
            GOLD_NOT_ENOUGH: "金币不足。",
            DIAMONDS_NOT_ENOUGH: "钻石不足。",
            PRICE_ITEM_NOT_ENOUGH: "用于支付的兑换物资不足。",
            USER_CANCELLED: "已取消购买。",
            CONFIRM_REQUIRED: "请先确认购买信息。",
            SHOP_ITEM_NOT_FOUND: "商品不存在。"
          };
          var buyMessage = buyMessages[buyResult && buyResult.reason] || "购买失败。";
          if (!shopView.setPurchaseDialogError || !shopView.setPurchaseDialogError(options.dom.featurePanelSlots, buyMessage)) {
            options.dom.featurePanelBody.textContent = buyMessage;
          }
          return false;
        }
        if (options.playSfx) options.playSfx("button");
        options.saveProfile();
        options.renderLobby();
        renderPanel(panel);
        if (shopView.showPurchaseResult) shopView.showPurchaseResult(options.dom.featurePanelSlots, buyResult, options.shared.assets);
        return true;
      }
      var actionApi = (method === "claimTask" || method === "claimActivityReward")
        ? options.shared.taskSystem
        : view;
      var result = actionApi && actionApi[method] && actionApi[method](options.getProfile(), value, { levels: options.levels || [] });
      if (!result || !result.ok) return false;
      if (options.playSfx) options.playSfx("button");
      options.saveProfile();
      options.renderLobby();
      renderPanel(panel);
      return true;
    }

    return { run: run, claim: claim, renderPanel: renderPanel };
  }

  scope.economyFeatureController = { create: create };
  if (typeof module !== "undefined" && module.exports) module.exports = { create: create };
})(typeof globalThis !== "undefined" ? globalThis : this);
