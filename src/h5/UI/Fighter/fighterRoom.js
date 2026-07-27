(function defineFighterRoom(root) {
  "use strict";

  var shared = root.RXGame || (root.RXGame = {});
  var registry = shared.roomRegistry;
  if (!registry) return;

  registry.defineRoom("fighter", function createFighterRoom(context) {
    var capabilities = context.fighter || {};
    var dom = context.dom || {};
    var gatewayLock = capabilities.gatewayActionLock || { busy: false };
    var message = "";
    var isOpen = false;

    function getProfile() {
      return capabilities.getProfile ? capabilities.getProfile() : {};
    }

    function render() {
      if (!dom.featurePanelSlots || !shared.fighterView || !shared.fighterView.renderShipGallery) return false;
      var profile = getProfile();
      if (shared.profile && shared.profile.recoverEnergy) shared.profile.recoverEnergy(profile);
      shared.fighterView.renderShipGallery(dom.featurePanelSlots, profile, {
        busy: gatewayLock.busy,
        notice: message,
        onSelectShip: function onSelectShip(shipId) { return registry.dispatch("fighter.select", shipId); },
        onBuyShip: function onBuyShip(shipId) { return registry.dispatch("fighter.buy", shipId); },
        onPromoteShip: function onPromoteShip(shipId, tokenId) {
          return registry.dispatch("fighter.promote", { shipId: shipId, tokenId: tokenId });
        },
        onStarUpShip: function onStarUpShip(shipId) { return registry.dispatch("fighter.starUp", shipId); }
      });
      return true;
    }

    function open() {
      if (!shared.fighterView || !dom.featurePanelSlots) return false;
      if (dom.featurePanelKicker) dom.featurePanelKicker.textContent = "FIGHTER HANGAR";
      if (dom.featurePanelTitle) dom.featurePanelTitle.textContent = "战机机库";
      if (dom.featurePanelBody) dom.featurePanelBody.textContent = "查看战机档案与核心战斗属性，选择当前出战机体。";
      message = "";
      isOpen = true;
      render();
      if (capabilities.openShell) capabilities.openShell("ship-hangar-panel");
      return true;
    }

    function close() {
      if (!isOpen) return false;
      isOpen = false;
      if (capabilities.closeShell) capabilities.closeShell();
      return true;
    }

    function select(payload) {
      var shipId = typeof payload === "string" ? payload : payload && payload.shipId;
      var profile = getProfile();
      var ships = profile.owned && Array.isArray(profile.owned.ships) ? profile.owned.ships : [];
      if (!shipId || ships.indexOf(shipId) < 0) return false;
      profile.scene = profile.scene || {};
      profile.scene.shipId = shipId;
      message = "已设为当前出战战机。";
      refreshViews();
      render();
      if (capabilities.persistProfileMetadata) {
        capabilities.persistProfileMetadata().catch(function showPersistFailure(error) {
          message = error && error.message ? error.message : "出战战机保存失败，请重试。";
          render();
        });
      }
      return true;
    }

    function buy(payload) {
      var shipId = typeof payload === "string" ? payload : payload && payload.shipId;
      if (!shipId) return Promise.resolve(null);
      return runGatewayAction(
        "购买请求处理中……",
        function submitPurchase(gateway) { return gateway.buyShip(shipId); },
        function purchaseSuccess(result) {
          result.profile.scene = result.profile.scene || {};
          result.profile.scene.shipId = shipId;
          return "购买成功，已默认设为出战战机。";
        },
        "购买失败，请稍后重试。"
      );
    }

    function promote(payload) {
      var shipId = payload && payload.shipId;
      var tokenId = payload && payload.tokenId;
      if (!shipId || !tokenId) return Promise.resolve(null);
      return runGatewayAction(
        "正在消耗改装令升阶……",
        function submitPromotion(gateway) { return gateway.promoteUnit("ship", shipId, tokenId); },
        function promotionSuccess(result) { return "升阶完成，当前评级为 " + String(result.toRank || "").toUpperCase() + "级。"; },
        "升阶失败，请确认改装令数量。"
      );
    }

    function starUp(shipId) {
      if (!shipId) return Promise.resolve(null);
      return runGatewayAction(
        "正在消耗凌光本体与 SSS战机模组升星……",
        function submitStarUp(gateway) {
          if (!gateway.starUpFighter) throw new Error("战机升星服务尚未就绪。");
          return gateway.starUpFighter(shipId);
        },
        function starUpSuccess(result) { return "升星完成，当前为 " + result.toStars + " 星，攻击提升 " + (result.attackGained || 10) + " 点。"; },
        "战机升星失败，请确认凌光本体与 SSS战机模组数量。"
      );
    }

    function runGatewayAction(pendingMessage, task, successMessage, fallbackError) {
      if (gatewayLock.busy) return Promise.resolve(null);
      gatewayLock.busy = true;
      message = pendingMessage;
      render();
      return Promise.resolve().then(function ensureReady() {
        if (!capabilities.ensureGameGateway) throw new Error("游戏数据入口尚未就绪。");
        return capabilities.ensureGameGateway();
      }).then(function submit() {
        var gateway = capabilities.getGameGateway && capabilities.getGameGateway();
        if (!gateway) throw new Error("游戏数据入口尚未就绪。");
        return task(gateway);
      }).then(function applyResult(result) {
        if (!result || !result.profile) throw new Error("操作结果无效。");
        if (capabilities.applyGatewayProfile) capabilities.applyGatewayProfile(result.profile);
        if (capabilities.saveProfile) capabilities.saveProfile();
        message = successMessage(result);
        refreshViews();
        return result;
      }).catch(function showFailure(error) {
        message = error && error.message ? error.message : fallbackError;
        return null;
      }).finally(function releaseLock() {
        gatewayLock.busy = false;
        render();
      });
    }

    function refreshViews() {
      if (capabilities.renderLobby) capabilities.renderLobby();
      if (capabilities.renderChapterSelect) capabilities.renderChapterSelect();
      if (capabilities.updateHud) capabilities.updateHud();
    }

    return {
      actions: {
        "fighter.open": open,
        "fighter.close": close,
        "fighter.select": select,
        "fighter.buy": buy,
        "fighter.promote": promote,
        "fighter.starUp": starUp
      },
      dispose: function dispose() {
        if (isOpen) close();
        if (dom.featurePanelSlots) dom.featurePanelSlots.innerHTML = "";
      }
    };
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
