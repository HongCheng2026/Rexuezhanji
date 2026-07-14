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
    var modeClasses = options.modeClasses || [];
    var profile;
    var featurePanels;
    var persistProfileMetadata = options.persistProfileMetadata;
    var saveProfile = options.saveProfile;
    var gatewayActionLock = options.gatewayActionLock || { busy: false };
    var ensureGameGateway = options.ensureGameGateway;
    var getGameGateway = options.getGameGateway;
    var applyGatewayProfile = options.applyGatewayProfile;
    var renderLobby = options.renderLobby;
    var renderChapterSelect = options.renderChapterSelect;
    var updateHud = options.updateHud;
    var renderProfilePanel = options.renderProfilePanel;
    var renderFighterUpgradePanel = options.renderFighterUpgradePanel;
    var calculateTotalPower = options.calculateTotalPower;

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

    function refreshRosterViews(type) {
      renderLobby();
      renderChapterSelect();
      updateHud();
      if (type === "pilot") reRenderPilotGallery();
      else reRenderShipGallery();
    }

    function buyRosterItem(type, itemId) {
      if (gatewayActionLock.busy) return;
      gatewayActionLock.busy = true;
      var method = type === "pilot" ? "buyPilot" : "buyShip";
      var label = type === "pilot" ? "战姬" : "战机";
      Promise.resolve().then(function ensureGatewayReady() {
        return ensureGameGateway();
      }).then(function performPurchase() {
        var gateway = getGameGateway();
        if (!gateway || typeof gateway[method] !== "function") throw new Error("购买服务尚未就绪。");
        return gateway[method](itemId);
      }).then(function applyPurchaseResult(result) {
        if (!result || !result.profile) throw new Error("购买结果无效。");
        applyGatewayProfile(result.profile);
        saveProfile();
        dom.featurePanelBody.textContent = label + "购买成功，已加入你的收藏。";
        refreshRosterViews(type);
      }).catch(function showPurchaseError(error) {
        dom.featurePanelBody.textContent = error && error.message ? error.message : "购买失败，请稍后重试。";
        refreshRosterViews(type);
      }).finally(function releasePurchaseLock() {
        gatewayActionLock.busy = false;
      });
    }

    function redeemCode(rawCode) {
      if (gatewayActionLock.busy) return Promise.reject(new Error("操作正在处理中，请稍候。"));
      gatewayActionLock.busy = true;
      return ensureGameGateway().then(function redeemWithGateway() {
        var gateway = getGameGateway();
        if (!gateway || typeof gateway.redeem !== "function") throw new Error("兑换服务尚未就绪。");
        return gateway.redeem(rawCode);
      }).then(function applyRedeemResult(result) {
        if (!result || !result.profile) throw new Error("兑换结果无效。");
        applyGatewayProfile(result.profile);
        saveProfile();
        renderLobby();
        renderChapterSelect();
        updateHud();
        return result;
      }).finally(function releaseRedeemLock() {
        gatewayActionLock.busy = false;
      });
    }

  function renderPilotGalleryPanel() {
    syncProfile();
    dom.featurePanelKicker.textContent = "PILOT DOSSIER";
    dom.featurePanelTitle.textContent = "战姬档案";
    dom.featurePanelBody.textContent = "查看战姬档案与核心战斗属性，选择当前出战成员。";
    setFeaturePanelMode("pilot-dossier-panel");
    reRenderPilotGallery();
    openFeaturePanelShell("pilot-dossier-panel");
  }

  function reRenderPilotGallery() {
    syncProfile();
    dom.featurePanelSlots.innerHTML = "";
    dom.featurePanelSlots.className = "";
    if (shared.pilotGalleryView && shared.pilotGalleryView.renderPilotGallery) {
      shared.profile.recoverEnergy(profile);
      shared.pilotGalleryView.renderPilotGallery(dom.featurePanelSlots, profile, {
        onSelectPilot: function onSelectPilot(pilotId) {
          profile.scene = profile.scene || {};
          profile.owned = profile.owned || {};
          profile.owned.pilots = Array.isArray(profile.owned.pilots) ? profile.owned.pilots : [];
          if (profile.owned.pilots.indexOf(pilotId) < 0) return;
          profile.scene.pilotId = pilotId;
          persistProfileMetadata().catch(function keepPreviousPilot() {});
          renderLobby();
          renderChapterSelect();
          updateHud();
          reRenderPilotGallery();
        },
        onBuyPilot: function onBuyPilot(pilotId) {
          buyRosterItem("pilot", pilotId);
        }
      });
    }
  }

  function renderShipGalleryPanel() {
    syncProfile();
    dom.featurePanelKicker.textContent = "FIGHTER HANGAR";
    dom.featurePanelTitle.textContent = "战机机库";
    dom.featurePanelBody.textContent = "查看战机档案与核心战斗属性，选择当前出战机体。";
    setFeaturePanelMode("ship-hangar-panel");
    reRenderShipGallery();
    openFeaturePanelShell("ship-hangar-panel");
  }

  function reRenderShipGallery() {
    syncProfile();
    dom.featurePanelSlots.innerHTML = "";
    dom.featurePanelSlots.className = "";
    if (shared.shipGalleryView && shared.shipGalleryView.renderShipGallery) {
      shared.profile.recoverEnergy(profile);
      shared.shipGalleryView.renderShipGallery(dom.featurePanelSlots, profile, {
        onSelectShip: function onSelectShip(shipId) {
          profile.scene = profile.scene || {};
          profile.owned = profile.owned || {};
          profile.owned.ships = Array.isArray(profile.owned.ships) ? profile.owned.ships : [];
          if (profile.owned.ships.indexOf(shipId) < 0) return;
          profile.scene.shipId = shipId;
          persistProfileMetadata().catch(function keepPreviousShip() {});
          renderLobby();
          renderChapterSelect();
          updateHud();
          reRenderShipGallery();
        },
        onBuyShip: function onBuyShip(shipId) {
          buyRosterItem("ship", shipId);
        }
      });
    }
  }

  function openFeaturePanel(key) {
    syncProfile();
    if (key === "profile") {
      renderProfilePanel();
      return;
    }
    if (key === "pilotGallery" && shared.pilotGalleryView) {
      renderPilotGalleryPanel();
      return;
    }
    if (key === "shipGallery" && shared.shipGalleryView) {
      renderShipGalleryPanel();
      return;
    }
    if (key === "upgrade") {
      renderFighterUpgradePanel();
      return;
    }
    if (key === "enemyCodex") {
      renderEnemyCodexPanel();
      return;
    }
    if (shared.starWingsGachaView && shared.starWingsGachaView.renderPanel) {
      if (shared.starWingsGachaView.renderPanel(key, dom, {
        profile: profile,
        assets: assetsConfig.UI_A_HUD_ASSETS || {}
      })) {
        openFeaturePanelShell(key === "starWingsGacha" ? "star-wings-gacha-panel" : "contact-panel");
        return;
      }
    }
    if (shared.mainFeaturePanelsView && shared.mainFeaturePanelsView.renderPanel) {
      if (shared.mainFeaturePanelsView.renderPanel(key, dom, {
        profile: profile,
        levels: levels,
        combatPower: calculateTotalPower(),
        audioSettings: audioSystem && audioSystem.getSettings ? audioSystem.getSettings() : null
      })) {
        var isFeatureV3Panel = dom.featurePanelSlots && dom.featurePanelSlots.classList.contains("feature-v3-content");
        openFeaturePanelShell(isFeatureV3Panel ? "main-feature-panel feature-v3-panel" : "main-feature-panel");
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

  function renderEnemyCodexPanel() {
    syncProfile();
    var combatCodexConfig = scope.combatCodexConfig || {};
    var bullets = assetsConfig.ENEMY_BULLET_CODEX || {};
    dom.featurePanelKicker.textContent = "COMBAT CODEX";
    dom.featurePanelTitle.textContent = "敌机与敌弹图鉴";
    dom.featurePanelBody.textContent = "查看当前战役中的敌军单位、进攻方式和对应敌弹。";
    dom.featurePanelSlots.className = "enemy-codex-grid";
    var html = '<section class="enemy-codex-section"><h3>敌军单位</h3>';

    // Chapter tabs
    var chapterNames = ["序章","第一章","第二章","第三章","第四章","第五章","第六章","第七章","第八章","第九章"];
    html += '<div class="codex-chapter-tabs">';
    for (var ch = 0; ch <= 9; ch++) {
      html += '<button class="codex-chapter-tab" data-codex-chapter="' + ch + '">' + chapterNames[ch] + '</button>';
    }
    html += '</div>';

    // Enemy cards by chapter (default to chapter 1)
    if (combatCodexConfig.getAllEnemyUnits) {
      var allUnits = combatCodexConfig.getAllEnemyUnits();
      for (var ch = 0; ch <= 9; ch++) {
        var chUnits = [];
        for (var ui = 0; ui < allUnits.length; ui++) {
          if (allUnits[ui].chapterIndex === ch) chUnits.push(allUnits[ui]);
        }
        var activeClass = ch === 1 ? '' : ' codex-chapter-hidden';
        html += '<div class="codex-chapter-units' + activeClass + '" data-codex-chapter-units="' + ch + '">';
        for (var eu = 0; eu < chUnits.length; eu++) {
          var unit = chUnits[eu];
          var artResult = combatCodexConfig.resolveEnemyArt(unit, assetsConfig);
          var imgSrc = artResult && artResult.src ? artResult.src : (assetsConfig.ASSET_PATHS && assetsConfig.ASSET_PATHS.smallEnemies ? assetsConfig.ASSET_PATHS.smallEnemies[0] : "");
          var catLabel = unit.category === "mob" ? "小怪" : unit.category === "fighter" ? "普通敌机" : "精英";
          html += '<article class="enemy-codex-card">' +
            '<img src="' + escapeAttr(imgSrc) + '" alt=""' + (artResult && artResult.isPlaceholder ? ' class="placeholder-art"' : '') + '>' +
            '<div><strong>' + escapeHtml(unit.name) + '</strong>' +
            '<span>' + catLabel + ' / 首次出现：' + formatCodexChapter(unit.chapterIndex) + '</span>' +
            '<p>' + escapeHtml(unit.codex && unit.codex.attack ? unit.codex.attack : "") + '</p>' +
            '<em>' + escapeHtml(unit.codex && unit.codex.danger ? unit.codex.danger : "") + '</em></div>' +
          '</article>';
        }
        html += '</div>';
      }
    } else {
      // Fallback to legacy ENEMY_CODEX
      var enemies = assetsConfig.ENEMY_CODEX || [];
      html += '<div class="codex-chapter-units">';
      for (var i = 0; i < enemies.length; i++) {
        var enemy = enemies[i];
        html += '<article class="enemy-codex-card">' +
          '<img src="' + escapeAttr(enemy.src || "") + '" alt="">' +
          '<div><strong>' + escapeHtml(enemy.name || enemy.id) + '</strong>' +
          '<span>首次出现：' + formatCodexChapter(enemy.firstChapter) + '</span>' +
          '<p>' + escapeHtml(enemy.attack || "") + '</p>' +
          '<em>' + escapeHtml(enemy.danger || "") + '</em></div>' +
        '</article>';
      }
      html += '</div>';
    }

    html += '</div></section><section class="enemy-codex-section"><h3>敌弹</h3><div class="enemy-bullet-codex">';
    Object.keys(bullets).forEach(function renderBullet(key) {
      var bullet = bullets[key];
      html += '<article class="enemy-bullet-card">' +
        '<img src="' + escapeAttr(bullet.src || "") + '" alt="">' +
        '<strong>' + escapeHtml(bullet.name || bullet.id) + '</strong>' +
        '<span>' + formatCodexChapter(bullet.firstChapter) + '</span>' +
        '<p>' + escapeHtml(bullet.danger || "") + '</p>' +
      '</article>';
    });
    html += '</div></section>';
    dom.featurePanelSlots.innerHTML = html;

    // Attach chapter tab click handlers
    setTimeout(function() {
      var tabs = dom.featurePanelSlots.querySelectorAll('.codex-chapter-tab');
      for (var ti = 0; ti < tabs.length; ti++) {
        tabs[ti].addEventListener('click', function(e) {
          var sel = parseInt(e.target.getAttribute('data-codex-chapter'), 10);
          var allPanels = dom.featurePanelSlots.querySelectorAll('[data-codex-chapter-units]');
          var allTabs = dom.featurePanelSlots.querySelectorAll('.codex-chapter-tab');
          for (var pi = 0; pi < allPanels.length; pi++) {
            var panelCh = parseInt(allPanels[pi].getAttribute('data-codex-chapter-units'), 10);
            if (panelCh === sel) {
              allPanels[pi].classList.remove('codex-chapter-hidden');
            } else {
              allPanels[pi].classList.add('codex-chapter-hidden');
            }
          }
          for (var tj = 0; tj < allTabs.length; tj++) {
            allTabs[tj].classList.remove('codex-chapter-active');
          }
          e.target.classList.add('codex-chapter-active');
        });
      }
      // Activate default tab
      var defTab = dom.featurePanelSlots.querySelector('.codex-chapter-tab[data-codex-chapter="1"]');
      if (defTab) defTab.classList.add('codex-chapter-active');
      // Show chapter 1 by default
      var defPanels = dom.featurePanelSlots.querySelectorAll('[data-codex-chapter-units]');
      for (var di = 0; di < defPanels.length; di++) {
        var dch = parseInt(defPanels[di].getAttribute('data-codex-chapter-units'), 10);
        if (dch === 1) defPanels[di].classList.remove('codex-chapter-hidden');
      }
    }, 0);

    openFeaturePanelShell("");
  }

  function formatCodexChapter(value) {
    var chapter = Math.max(0, Math.floor(Number(value) || 0));
    return chapter <= 0 ? "序章" : "第 " + chapter + " 章";
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
    if (dom.lobbyScreen) dom.lobbyScreen.classList.add("panel-open");
    if (dom.featurePanel) dom.featurePanel.classList.remove("hidden");
  }

  function closeFeaturePanel() {
    if (dom.featurePanel) dom.featurePanel.classList.add("hidden");
    if (dom.lobbyScreen) dom.lobbyScreen.classList.remove("panel-open");
  }


    return {
      open: openFeaturePanel,
      close: closeFeaturePanel,
      setMode: setFeaturePanelMode,
      openShell: openFeaturePanelShell,
      redeemCode: redeemCode,
      renderPilotGallery: renderPilotGalleryPanel,
      renderShipGallery: renderShipGalleryPanel,
      renderEnemyCodex: renderEnemyCodexPanel
    };
  }

  var api = { create: create };
  scope.featurePanelController = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
