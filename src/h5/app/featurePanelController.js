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
    var isCloudMode = options.isCloudMode;
    var persistProfileMetadata = options.persistProfileMetadata;
    var saveProfile = options.saveProfile;
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
          if (isCloudMode() && profile.owned.pilots.indexOf(pilotId) < 0) return;
          if (profile.owned.pilots.indexOf(pilotId) < 0) {
            profile.owned.pilots.push(pilotId);
          }
          profile.scene.pilotId = pilotId;
          persistProfileMetadata().catch(function keepPreviousPilot() {});
          renderLobby();
          renderChapterSelect();
          updateHud();
          reRenderPilotGallery();
        },
        onBuyPilot: function onBuyPilot(pilotId, price) {
          if (isCloudMode()) return;
          profile.resources.diamonds = Math.max(0, (profile.resources.diamonds || 0) - price);
          profile.owned.pilots = profile.owned.pilots || [];
          if (profile.owned.pilots.indexOf(pilotId) < 0) {
            profile.owned.pilots.push(pilotId);
          }
          saveProfile();
          renderLobby();
          renderChapterSelect();
          updateHud();
          reRenderPilotGallery();
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
          if (isCloudMode() && profile.owned.ships.indexOf(shipId) < 0) return;
          if (profile.owned.ships.indexOf(shipId) < 0) {
            profile.owned.ships.push(shipId);
          }
          profile.scene.shipId = shipId;
          persistProfileMetadata().catch(function keepPreviousShip() {});
          renderLobby();
          renderChapterSelect();
          updateHud();
          reRenderShipGallery();
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
    var enemies = assetsConfig.ENEMY_CODEX || [];
    var bullets = assetsConfig.ENEMY_BULLET_CODEX || {};
    dom.featurePanelKicker.textContent = "COMBAT CODEX";
    dom.featurePanelTitle.textContent = "敌机与敌弹图鉴";
    dom.featurePanelBody.textContent = "查看当前战斗会出现的敌机、进攻方式和对应敌弹。";
    dom.featurePanelSlots.className = "enemy-codex-grid";
    var html = '<section class="enemy-codex-section"><h3>敌机</h3><div class="enemy-codex-list">';
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
      renderPilotGallery: renderPilotGalleryPanel,
      renderShipGallery: renderShipGalleryPanel,
      renderEnemyCodex: renderEnemyCodexPanel
    };
  }

  var api = { create: create };
  scope.featurePanelController = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
