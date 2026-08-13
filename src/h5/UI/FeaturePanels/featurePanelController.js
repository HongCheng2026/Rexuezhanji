(function registerFeaturePanelController(root) {
  "use strict";

  var scope = root.RXGame || (root.RXGame = {});

  function create(options) {
    options = options || {};
    var shared = options.shared || scope;
    var dom = options.dom || {};
    var assetsConfig = options.assetsConfig || {};
    var levels = options.levels || [];
    var audioSystem = options.audioSystem || null;
    var visualQualitySystem = options.visualQualitySystem || null;
    var framePacingMonitor = options.framePacingMonitor || null;
    var modeClasses = options.modeClasses || [];
    var profile;
    var featurePanels;
    var saveProfile = options.saveProfile;
    var gatewayActionLock = options.gatewayActionLock || { busy: false };
    var ensureGameGateway = options.ensureGameGateway;
    var getGameGateway = options.getGameGateway;
    var applyGatewayProfile = options.applyGatewayProfile;
    var renderLobby = options.renderLobby;
    var renderChapterSelect = options.renderChapterSelect;
    var updateHud = options.updateHud;
    var renderProfilePanel = options.renderProfilePanel;
    var calculateTotalPower = options.calculateTotalPower;
    var activePanelKey = "";
    var resourcePanels = { profile: true, shop: true, task: true, achievement: true, redeem: true, signin: true };
    var modalPanelClasses = {
      ranking: " modal-feature-panel ranking-feature-panel",
      task: " modal-feature-panel task-feature-panel",
      achievement: " modal-feature-panel achievement-feature-panel"
    };

    // Social click delegation
    var socialClickState = { options: null };
    if (dom.featurePanelSlots && !dom.featurePanelSlots._socialDelegate) {
      dom.featurePanelSlots._socialDelegate = true;
      dom.featurePanelSlots.addEventListener("click", function (e) {
        if (!socialClickState.options) return;
        if (shared.mainFeaturePanelsView && shared.mainFeaturePanelsView.handleSocialClick) {
          shared.mainFeaturePanelsView.handleSocialClick(e, dom, socialClickState.options);
        }
      });
    }

    function syncProfile() {
      profile = options.getProfile();
      featurePanels = options.getFeaturePanels();
    }

    function escapeHtml(value) {
      return String(value == null ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    }

    function escapeAttr(value) {
      return escapeHtml(value);
    }

    function redeemCode(rawCode) {
      if (gatewayActionLock.busy) return Promise.reject(new Error("操作正在处理中，请稍候。"));
      gatewayActionLock.busy = true;
      var prevDiamonds = 0;
      return ensureGameGateway().then(function redeemWithGateway() {
        var gateway = getGameGateway();
        if (!gateway || typeof gateway.redeem !== "function") throw new Error("兑换服务尚未就绪。");
        var currentProfile = options.getProfile();
        prevDiamonds = Number(currentProfile && currentProfile.resources && currentProfile.resources.diamonds) || 0;
        return gateway.redeem(rawCode);
      }).then(function applyRedeemResult(result) {
        if (!result || !result.profile) throw new Error("兑换结果无效。");
        // 应用层条件补发钻石：底层已处理则跳过，未处理则兜底（防止双重计算）
        var resultDiamonds = Number(result.profile.resources && result.profile.resources.diamonds) || 0;
        (result.rewards || []).forEach(function topUpDiamonds(reward) {
          if (reward && reward.type === "diamonds" && resultDiamonds === prevDiamonds) {
            result.profile.resources = result.profile.resources || {};
            result.profile.resources.diamonds = Math.max(0, (Number(result.profile.resources.diamonds) || 0) + (Number(reward.amount) || 0));
          }
        });
        applyGatewayProfile(result.profile);
        renderLobby();
        renderChapterSelect();
        updateHud();
        return result;
      }).finally(function releaseRedeemLock() {
        gatewayActionLock.busy = false;
      });
    }

  function openFeaturePanel(key, skipModuleSync) {
    activePanelKey = key;
    syncProfile();
    if (!skipModuleSync && resourcePanels[key] && options.syncGatewayProfile) {
      Promise.resolve(options.syncGatewayProfile(30000)).then(function renderSyncedPanel() {
        if (activePanelKey === key) openFeaturePanel(key, true);
      }).catch(function keepCurrentSnapshot() {});
    }
    if (dom.featurePanelTitle) dom.featurePanelTitle.classList.remove("event-mode-title");
    if (key === "profile") {
      renderProfilePanel();
      return;
    }
    if (key === "redeem") {
      syncProfile();
      dom.featurePanelKicker.textContent = "REDEEM CODE";
      dom.featurePanelTitle.textContent = "兑换码";
      dom.featurePanelBody.textContent = "输入兑换码获取奖励，每个兑换码只能使用一次。";
      dom.featurePanelSlots.innerHTML =
        '<div class="feature-panel-room-content">' +
          '<form class="settings-redeem-form" data-redeem-form>' +
            '<input type="text" maxlength="24" autocomplete="off" autocapitalize="characters" placeholder="请输入兑换码" aria-label="兑换码" data-redeem-code />' +
            '<button type="submit">兑换</button>' +
            '<output data-redeem-status aria-live="polite"></output>' +
          '</form>' +
        '</div>';
      dom.featurePanelSlots.className = "feature-panel-room-content";
      openFeaturePanelShell("main-feature-panel feature-panel-standard");
      return;
    }
    if (shared.mainFeaturePanelsView && shared.mainFeaturePanelsView.renderPanel) {
      var socialPanelOptions = {
        profile: profile,
        levels: levels,
        combatPower: calculateTotalPower(),
        audioSettings: audioSystem && audioSystem.getSettings ? audioSystem.getSettings() : null,
        visualSettings: visualQualitySystem && visualQualitySystem.getSettings ? visualQualitySystem.getSettings() : null,
        framePacing: framePacingMonitor && framePacingMonitor.getSnapshot ? framePacingMonitor.getSnapshot() : null,
        getGameGateway: getGameGateway,
        startEndlessMode: options.startEndlessMode,
        dom: dom
      };
      if (shared.mainFeaturePanelsView.renderPanel(key, dom, socialPanelOptions)) {
        socialClickState.options = socialPanelOptions;
        var usesFeaturePanelLayout = dom.featurePanelSlots && dom.featurePanelSlots.classList.contains("feature-panel-room-content");
        var isEndlessPanel = dom.featurePanelSlots && dom.featurePanelSlots.querySelector("[data-endless-entry]");
        openFeaturePanelShell(isEndlessPanel
          ? "main-feature-panel feature-panel-standard endless-feature-panel"
          : usesFeaturePanelLayout
            ? "main-feature-panel feature-panel-standard" +
              (key === "shop" ? " shop-feature-panel" : "") +
              (modalPanelClasses[key] || "")
            : "main-feature-panel");
        return;
      }
    }
    setFeaturePanelMode("");
    var panel = featurePanels[key] || ["SYSTEM", "功能界面", "该入口为本地预览或展示态。"];
    dom.featurePanelKicker.textContent = panel[0];
    dom.featurePanelTitle.textContent = panel[1];
    dom.featurePanelBody.textContent = panel[2];
    dom.featurePanelSlots.innerHTML = "";
    dom.featurePanelSlots.className = "feature-slots";
    ["素材", "规则", "奖励"].forEach(function slot(label) {
      var item = document.createElement("div");
      item.className = "feature-slot";
      item.textContent = label;
      dom.featurePanelSlots.appendChild(item);
    });
    openFeaturePanelShell("");
  }

  function setFeaturePanelMode(modeClass) {
    if (!dom.featurePanel) return;
    for (var i = 0; i < modeClasses.length; i++) {
      dom.featurePanel.classList.remove(modeClasses[i]);
    }
    if (modeClass) {
      modeClass.split(/\s+/).filter(Boolean).forEach(function (className) {
        dom.featurePanel.classList.add(className);
      });
    }
  }

  function openFeaturePanelShell(modeClass) {
    setFeaturePanelMode(modeClass);
    if (dom.lobbyScreen) {
      dom.lobbyScreen.classList.add("panel-open");
      dom.lobbyScreen.classList.toggle("shop-panel-open", String(modeClass || "").indexOf("shop-feature-panel") >= 0);
    }
    if (dom.featurePanel) dom.featurePanel.classList.remove("hidden");
  }

  function closeFeaturePanel() {
    if (shared.mainFeaturePanelsView && shared.mainFeaturePanelsView.stopChatPolling) {
      shared.mainFeaturePanelsView.stopChatPolling(dom);
    }
    socialClickState.options = null;
    activePanelKey = "";
    setFeaturePanelMode("");
    if (dom.featurePanel) dom.featurePanel.classList.add("hidden");
    if (dom.lobbyScreen) dom.lobbyScreen.classList.remove("panel-open", "shop-panel-open");
  }


    return {
      open: openFeaturePanel,
      close: closeFeaturePanel,
      setMode: setFeaturePanelMode,
      openShell: openFeaturePanelShell,
      redeemCode: redeemCode
    };
  }

  var api = { create: create };
  scope.featurePanelController = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
