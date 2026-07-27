(function definePilotRoom(root) {
  "use strict";

  var shared = root.RXGame || (root.RXGame = {});
  var registry = shared.roomRegistry;
  if (!registry) return;

  registry.defineRoom("pilot", function createPilotRoom(context) {
    var capabilities = context.pilot || {};
    var dom = context.dom || {};
    var view = shared.pilotView;
    var busy = false;

    function getProfile() {
      return capabilities.getProfile ? capabilities.getProfile() : {};
    }

    function setMessage(message) {
      if (dom.featurePanelBody) dom.featurePanelBody.textContent = message;
    }

    function refreshScreens() {
      if (capabilities.renderLobby) capabilities.renderLobby();
      if (capabilities.renderChapterSelect) capabilities.renderChapterSelect();
      if (capabilities.updateHud) capabilities.updateHud();
    }

    function render() {
      if (!view || !view.renderPilotGallery || !dom.featurePanelSlots) return false;
      var profile = getProfile();
      dom.featurePanelSlots.innerHTML = "";
      dom.featurePanelSlots.className = "";
      view.renderPilotGallery(dom.featurePanelSlots, profile, {
        onSelectPilot: function onSelectPilot(pilotId) { return registry.dispatch("pilot.select", pilotId); },
        onBuyPilot: function onBuyPilot(pilotId) { return registry.dispatch("pilot.buy", pilotId); },
        onPromotePilot: function onPromotePilot(pilotId, tokenId) { return registry.dispatch("pilot.promote", { pilotId: pilotId, tokenId: tokenId }); },
        onStarUpPilot: function onStarUpPilot(pilotId) { return registry.dispatch("pilot.starUp", pilotId); }
      });
      return true;
    }

    function open() {
      if (!view || !capabilities.openShell) return false;
      if (dom.featurePanelKicker) dom.featurePanelKicker.textContent = "PILOT DOSSIER";
      if (dom.featurePanelTitle) dom.featurePanelTitle.textContent = "战姬档案";
      setMessage("查看战姬档案、成长属性与当前出战状态。");
      render();
      capabilities.openShell("pilot-dossier-panel");
      if (capabilities.syncGatewayProfile) {
        Promise.resolve(capabilities.syncGatewayProfile(30000)).then(function renderSyncedPilot() {
          render();
        }).catch(function keepPilotSnapshot() {});
      }
      return true;
    }

    function selectPilot(pilotId) {
      var profile = getProfile();
      var owned = profile.owned && Array.isArray(profile.owned.pilots) ? profile.owned.pilots : [];
      if (owned.indexOf(pilotId) < 0) return false;
      profile.scene = profile.scene || {};
      profile.scene.pilotId = pilotId;
      if (capabilities.saveProfile) capabilities.saveProfile();
      refreshScreens();
      render();
      if (capabilities.persistProfileMetadata) {
        Promise.resolve().then(function persistSelection() {
          return capabilities.persistProfileMetadata();
        }).catch(function keepLocalSelection() {});
      }
      return true;
    }

    function runGatewayAction(pendingMessage, task, successMessage, fallbackMessage) {
      if (busy) return Promise.resolve(null);
      busy = true;
      setMessage(pendingMessage);
      return Promise.resolve().then(function ensureReady() {
        return capabilities.ensureGameGateway ? capabilities.ensureGameGateway() : null;
      }).then(task).then(function applyResult(result) {
        if (!result || !result.profile) throw new Error("战姬操作结果无效。");
        if (capabilities.applyGatewayProfile) capabilities.applyGatewayProfile(result.profile);
        refreshScreens();
        setMessage(successMessage(result));
        return result;
      }).catch(function showFailure(error) {
        setMessage(toUserMessage(error, fallbackMessage));
        return null;
      }).finally(function releaseAction() {
        busy = false;
        render();
      });
    }

    function buyPilot(pilotId) {
      return runGatewayAction("正在购买并同步出战战姬…", function buyWithGateway() {
        var gateway = capabilities.getGameGateway && capabilities.getGameGateway();
        if (!gateway || !gateway.buyPilot) throw new Error("购买服务尚未就绪。");
        return gateway.buyPilot(pilotId);
      }, function purchaseSuccess() {
        return "购买成功，已自动设为当前出战战姬。";
      }, "战姬购买失败。");
    }

    function promotePilot(payload) {
      var pilotId = payload && payload.pilotId;
      var tokenId = payload && payload.tokenId;
      return runGatewayAction("正在消耗晋升材料…", function promoteWithGateway() {
        var gateway = capabilities.getGameGateway && capabilities.getGameGateway();
        if (!gateway || !gateway.promoteUnit) throw new Error("升阶服务尚未就绪。");
        return gateway.promoteUnit("pilot", pilotId, tokenId);
      }, function promotionSuccess(result) {
        return "升阶成功，战姬已晋升至 " + result.toRank + " 级。";
      }, "战姬升阶失败。");
    }

    function starUpPilot(pilotId) {
      return runGatewayAction("正在消耗黑月本体与 SSS级战姬奖章升星…", function starUpWithGateway() {
        var gateway = capabilities.getGameGateway && capabilities.getGameGateway();
        if (!gateway || !gateway.starUpPilot) throw new Error("升星服务尚未就绪。");
        return gateway.starUpPilot(pilotId);
      }, function starUpSuccess(result) {
        return "升星成功，当前为 " + result.toStars + " 星，破甲提升 5 个百分点。";
      }, "战姬升星失败。");
    }

    function toUserMessage(error, fallback) {
      var code = error && (error.code || error.message);
      var messages = {
        TOKEN_NOT_OWNED: "晋升材料不足。",
        RANK_NOT_ELIGIBLE: "当前品级不可升阶。",
        NOT_OWNED: "尚未拥有该战姬。",
        COPY_NOT_OWNED: "黑月本体不足。",
        MEDAL_NOT_OWNED: "SSS级战姬奖章不足。",
        MAX_STARS: "该战姬已达到 6 星。",
        STAR_NOT_SUPPORTED: "该战姬暂不支持升星。"
      };
      return messages[code] || (error && error.message) || fallback;
    }

    return {
      actions: {
        "pilot.open": open,
        "pilot.select": selectPilot,
        "pilot.buy": buyPilot,
        "pilot.promote": promotePilot,
        "pilot.starUp": starUpPilot
      },
      dispose: function dispose() {
        busy = false;
        if (dom.featurePanelSlots && dom.featurePanelSlots.classList.contains("pilot-dossier")) {
          dom.featurePanelSlots.innerHTML = "";
          dom.featurePanelSlots.className = "";
        }
      }
    };
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
