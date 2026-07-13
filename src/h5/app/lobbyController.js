(function registerLobbyController(root) {
  "use strict";

  var scope = root.RXGame || (root.RXGame = {});

  function create(options) {
    options = options || {};
    var shared = options.shared || scope;
    var dom = options.dom || {};
    var assetsConfig = options.assetsConfig || {};
    var levels = options.levels || [];
    var upgrades = options.upgrades || {};
    var demoConfig = options.demoConfig || {};
    var audioSystem = options.audioSystem || null;
    var profile;
    var state;
    var battleContext;
    var battleSession;
    var selectedLevel;
    var selectedChapter;
    var gatewayActionLock = options.gatewayActionLock || { busy: false };
    var createMenuState = options.createMenuState;
    var getLevelById = options.getLevelById;
    var updateHud = options.updateHud;
    var drawScene = options.drawScene;
    var playCampaignStoryReplay = options.playCampaignStoryReplay;
    var closeFeaturePanel = options.closeFeaturePanel || function noopClose() {};
    var ensureGameGateway = options.ensureGameGateway;
    var applyGatewayProfile = options.applyGatewayProfile;
    var saveProfile = options.saveProfile;
    var setImageSource = options.setImageSource;
    var applyLobbyPose = options.applyLobbyPose;
    var getPilotAsset = options.getPilotAsset;
    var getShipAsset = options.getShipAsset;
    var getBackgroundAsset = options.getBackgroundAsset;
    var createLevelProgressSnapshot = options.createLevelProgressSnapshot;
    var getHonorText = options.getHonorText;
    var formatResource = options.formatResource;
    var getGold = options.getGold;
    var clamp = options.clamp;

    function syncContext() {
      profile = options.getProfile();
      state = options.getState();
      battleContext = options.getBattleContext();
      battleSession = options.getBattleSession();
      selectedLevel = options.getSelectedLevel();
      selectedChapter = options.getSelectedChapter();
    }

    function assignState(value) {
      options.setState(value);
      return value;
    }

    function assignBattleContext(value) {
      options.setBattleContext(value);
      return value;
    }

    function assignBattleSession(value) {
      options.setBattleSession(value);
      return value;
    }

    function assignSelectedLevel(value) {
      options.setSelectedLevel(value);
      return value;
    }

    function assignSelectedChapter(value) {
      options.setSelectedChapter(value);
      return value;
    }

  function openBattleSelect() {
    syncContext();
    if (battleContext) cancelAnimationFrame(battleContext.animationId);
    battleContext = assignBattleContext(null);
    state = assignState(createMenuState(selectedLevel));
    state.mode = "menu";
    hideShop();
    showBattleScreen();
    dom.battleScreen.classList.add("select-mode");
    showOverlay("选择关卡", "左上角为当前出战属性。选择关卡后点击开始战斗。", "开始 " + getLevelById(selectedLevel).code);
    renderChapterSelect();
    if (demoConfig.enabled) {
      showOverlay("Influencer Demo", "三武器开局，先清屏变强，再挑战 BOSS。", "开始试玩");
    }
    updateHud();
    drawScene();
  }

  function showBattleScreen() {
    syncContext();
    dom.lobbyScreen.classList.add("hidden");
    dom.battleScreen.classList.remove("hidden");
  }

  function showLobby() {
    syncContext();
    if (battleContext) cancelAnimationFrame(battleContext.animationId);
    battleContext = assignBattleContext(null);
    battleSession = assignBattleSession(null);
    state = assignState(createMenuState(selectedLevel));
    hideShop();
    dom.overlay.classList.remove("hidden");
    dom.lobbyScreen.classList.remove("hidden");
    dom.battleScreen.classList.add("hidden");
    dom.battleScreen.classList.remove("select-mode", "overlay-active", "settlement-active");
    closeFeaturePanel();
    dom.pauseButton.textContent = "暂停";
    renderLobby();
    renderChapterSelect();
    updateHud();
    drawScene();
    if (audioSystem && audioSystem.playBgm) audioSystem.playBgm("lobby");
  }

  function pauseGame() {
    syncContext();
    if (!state || state.mode !== "fight" || !battleContext) return;
    state.mode = "paused";
    cancelAnimationFrame(battleContext.animationId);
    dom.battleScreen.classList.remove("select-mode");
    dom.pauseButton.textContent = "继续";
    showPauseOverlay();
  }

  function resumeGame() {
    syncContext();
    if (!state || state.mode !== "paused" || !battleContext) return;
    dom.overlay.classList.add("hidden");
    dom.battleScreen.classList.remove("overlay-active");
    state.mode = "fight";
    dom.pauseButton.textContent = "暂停";
    battleContext.lastTime = performance.now();
    shared.battleRuntime.resumeBattle(battleContext);
  }

  function showPauseOverlay() {
    syncContext();
    showOverlay("作战暂停", "继续战斗，或主动撤离并返还本次消耗体力。", "继续战斗");
    dom.overlay.classList.add("pause-overlay");
    dom.chapterSelect.innerHTML = '<section class="pause-actions" aria-label="暂停操作">' +
      '<button type="button" data-pause-action="resume">继续战斗</button>' +
      '<button type="button" data-pause-action="chapter">返回关卡</button>' +
      '<button type="button" data-pause-action="lobby">返回大厅</button>' +
    '</section>';
  }

  function showOverlay(title, message, buttonText) {
    syncContext();
    dom.overlay.classList.remove("pause-overlay", "busy-overlay");
    dom.overlay.querySelector("h1").textContent = title;
    dom.messageEl.textContent = message;
    dom.startButton.textContent = buttonText;
    dom.startButton.disabled = false;
    dom.overlay.classList.remove("hidden");
    dom.battleScreen.classList.add("overlay-active");
  }

  function showBusyOverlay(title, message) {
    showOverlay(title, message, "");
    dom.overlay.classList.add("busy-overlay");
    dom.startButton.disabled = true;
  }

  function showShop() {
    syncContext();
    dom.overlay.classList.remove("busy-overlay");
    dom.overlay.classList.add("hidden");
    dom.battleScreen.classList.remove("select-mode", "overlay-active");
    dom.battleScreen.classList.add("settlement-active");
    dom.shopScreen.classList.remove("hidden");
  }

  function hideShop() {
    syncContext();
    dom.battleScreen.classList.remove("settlement-active");
    dom.shopScreen.classList.remove("settlement-victory-intro-mode", "settlement-chest-mode", "settlement-ceremony-mode", "settlement-opened-mode", "settlement-win-mode", "settlement-fail-mode");
    dom.shopScreen.classList.add("hidden");
  }

  function renderChapterSelect() {
    syncContext();
    var level = getLevelById(selectedLevel);
    selectedChapter = assignSelectedChapter(level.chapterIndex || 0);

    if (shared.chapterSelectView && shared.chapterSelectView.renderChapterSelect) {
      shared.chapterSelectView.renderChapterSelect(dom.chapterSelect, profile, selectedChapter, selectedLevel, {
        actionButton: dom.startButton,
        onSelectLevel: function onSelectLevel(levelId, chapterIndex) {
          syncContext();
          selectedLevel = assignSelectedLevel(clamp(levelId, 1, levels.length));
          selectedChapter = assignSelectedChapter(chapterIndex || getLevelById(selectedLevel).chapterIndex || 0);
          if (state) state.level = getLevelById(selectedLevel);
          renderChapterSelect();
          updateHud();
          drawScene();
        },
        onSelectChapter: function onSelectChapter(chapterIndex) {
          syncContext();
          selectedChapter = assignSelectedChapter(chapterIndex);
          var next = levels.find(function findLevel(item) {
            return item.chapterIndex === chapterIndex && item.id <= (profile.unlockedLevel || 0);
          });
          if (next) selectedLevel = assignSelectedLevel(next.id);
          if (state) state.level = getLevelById(selectedLevel);
          renderChapterSelect();
          updateHud();
          drawScene();
        },
        onBackLobby: showLobby,
        onSweepLevel: sweepLevel,
        onReplayStory: function onReplayStory(levelRef) {
          playCampaignStoryReplay(typeof levelRef === "object" && levelRef ? levelRef : getLevelById(levelRef));
        }
      });
    }

    dom.startButton.textContent = state.mode === "paused"
      ? "继续游戏"
      : "开始 " + getLevelById(selectedLevel).code;
  }

  function sweepLevel(levelId) {
    syncContext();
    if (gatewayActionLock.busy) return;
    var level = getLevelById(levelId);
    if (!level) return;
    gatewayActionLock.busy = true;
    ensureGameGateway().then(function sweepThroughGateway() {
      return options.getGameGateway().sweep(level.id);
    }).then(function onSweepComplete(response) {
      if (response && response.profile) applyGatewayProfile(response.profile);
      var settlement = response && response.settlement || {};
      saveProfile();
      renderLobby();
      renderChapterSelect();
      showOverlay("扫荡完成", "金币 +" + Math.max(0, Math.floor(settlement.gold || 0)) + "，经验 +" + Math.max(0, Math.floor(settlement.experience || 0)) + "。", "开始 " + level.code);
    }).catch(function onSweepError(error) {
      showOverlay("无法扫荡", error && error.message ? error.message : "扫荡失败，请稍后重试。", "返回关卡");
    }).finally(function releaseSweep() {
      gatewayActionLock.busy = false;
    });
  }

  function renderLobby() {
    syncContext();
    shared.profile.recoverEnergy(profile);
    var player = profile.player || {};
    var resources = profile.resources || {};
    var pilot = getPilotAsset();
    var ship = getShipAsset();
    var background = getBackgroundAsset();

    var avatarSource = player.avatar === assetsConfig.DEFAULT_AVATAR ? (pilot && pilot.src) : player.avatar;
    setImageSource(dom.pilotAvatar, avatarSource || assetsConfig.DEFAULT_AVATAR);
    setImageSource(dom.lobbyPilotLayer, pilot && pilot.src);
    setImageSource(dom.lobbyShipLayer, ship && (ship.lobbySrc || ship.src));
    applyLobbyPose(dom.lobbyPilotLayer, pilot && pilot.lobbyPose, "pilot");
    applyLobbyPose(dom.lobbyShipLayer, ship && ship.lobbyPose, "ship");
    if (background && background.src) {
      setImageSource(dom.lobbyBackgroundLayer, background.src);
      dom.lobbyBackgroundLayer.classList.add("has-image");
    }

    dom.pilotName.textContent = player.name || "王牌飞行员";
    var progress = createLevelProgressSnapshot(player);
    dom.pilotLevel.textContent = "Lv." + progress.level;
    dom.pilotExpText.textContent = progress.isMaxLevel ? "MAX" : progress.exp + "/" + progress.expMax;
    dom.pilotExpBar.style.width = progress.percent + "%";
    dom.pilotBadge.textContent = getHonorText(player);
    dom.energyValue.textContent = formatResource(resources.energy || 0) + "/" + formatResource(resources.maxEnergy || 0);
    dom.goldValue.textContent = formatResource(getGold());
    dom.diamondValue.textContent = formatResource(resources.diamonds || 0);
  }

  function renderShop(message) {
    syncContext();
    var text = message || "把战斗金币换成实打实的性能。";
    dom.shopMessageEl.textContent = text;
    dom.shopCoinsEl.textContent = getGold() + " 金币";
    dom.upgradeList.innerHTML = "";
    dom.upgradeList.className = "upgrade-list";
    dom.replayButton.style.display = "";

    Object.keys(upgrades).forEach(function renderUpgrade(key) {
      var upgrade = upgrades[key];
      var level = profile.upgrades && profile.upgrades[key] ? profile.upgrades[key] : 0;
      var cost = getUpgradeCost(key);
      var card = document.createElement("article");
      var button = document.createElement("button");
      card.className = "upgrade-card";
      card.innerHTML = "<h3>" + upgrade.name + " Lv." + level + "/" + upgrade.max + "</h3><p>" + upgrade.desc + "</p>";
      button.type = "button";
      button.textContent = level >= upgrade.max ? "已满级" : "升级 " + cost + " 金币";
      button.disabled = level >= upgrade.max || getGold() < cost;
      button.addEventListener("click", function buy() {
        buyUpgrade(key);
      });
      card.appendChild(button);
      dom.upgradeList.appendChild(card);
    });

    var next = levels[Math.min(selectedLevel, levels.length - 1)];
    dom.nextLevelButton.textContent = next ? "进入 " + next.code : "返回关卡";
  }

  function buyUpgrade(key) {
    syncContext();
    if (gatewayActionLock.busy || !upgrades[key]) return;
    gatewayActionLock.busy = true;
    ensureGameGateway().then(function upgradeThroughGateway() {
      return options.getGameGateway().upgrade(key);
    }).then(function onUpgradeComplete(response) {
      if (response && response.profile) applyGatewayProfile(response.profile);
      saveProfile();
      renderShop(upgrades[key].name + " 已升级。");
      renderLobby();
      renderChapterSelect();
      updateHud();
    }).catch(function onUpgradeError(error) {
      renderShop(error && error.message ? error.message : "升级失败，请稍后重试。");
    }).finally(function releaseUpgrade() {
      gatewayActionLock.busy = false;
    });
  }

  function getUpgradeCost(key) {
    syncContext();
    var upgrade = upgrades[key];
    var level = profile.upgrades && profile.upgrades[key] ? profile.upgrades[key] : 0;
    return shared.battleRules && shared.battleRules.getUpgradeCost
      ? shared.battleRules.getUpgradeCost(upgrade, level)
      : Math.round((upgrade.baseCost || 100) * (1 + level * 0.65));
  }


    return {
      openBattleSelect: openBattleSelect,
      showBattleScreen: showBattleScreen,
      showLobby: showLobby,
      pauseGame: pauseGame,
      resumeGame: resumeGame,
      showOverlay: showOverlay,
      showBusyOverlay: showBusyOverlay,
      showShop: showShop,
      hideShop: hideShop,
      renderChapterSelect: renderChapterSelect,
      renderLobby: renderLobby,
      renderShop: renderShop,
      sweepLevel: sweepLevel,
      buyUpgrade: buyUpgrade,
      getUpgradeCost: getUpgradeCost,
      isBusy: function isBusy() { return gatewayActionLock.busy; }
    };
  }

  var api = { create: create };
  scope.lobbyController = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
