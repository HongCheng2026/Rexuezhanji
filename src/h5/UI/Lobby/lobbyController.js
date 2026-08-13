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
    var lastWorldDateKey = "";

    function renderWorldTime(snapshot) {
      if (!snapshot) return;
      if (dom.worldClockTime) {
        var minuteText = snapshot.timeText.slice(0, 5);
        var dateTooltip = snapshot.dateText + " · " + snapshot.weekdayText;
        dom.worldClockTime.textContent = minuteText;
        dom.worldClockTime.setAttribute("datetime", snapshot.iso);
        dom.worldClockTime.setAttribute("title", dateTooltip);
        dom.worldClockTime.setAttribute("aria-label", "世界时间 " + minuteText + "，" + dateTooltip);
        if (dom.worldClockTime.parentNode) dom.worldClockTime.parentNode.setAttribute("data-date", dateTooltip);
      }
      if (dom.worldClockDate) {
        dom.worldClockDate.textContent = snapshot.dateText + " · " + snapshot.weekdayText;
        dom.worldClockDate.setAttribute("datetime", snapshot.dateKey);
      }
      if (dom.worldClockSource) {
        var isServer = snapshot.source === "server";
        dom.worldClockSource.textContent = isServer ? "云端校时" : "设备时间";
        dom.worldClockSource.classList.toggle("is-server", isServer);
      }
      if (lastWorldDateKey && lastWorldDateKey !== snapshot.dateKey && profile) renderMenuAlerts();
      lastWorldDateKey = snapshot.dateKey;
    }

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
    updateHud(true);
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
    renderLobby();
    renderChapterSelect();
    updateHud(true);
    drawScene();
    if (audioSystem && audioSystem.playBgm) audioSystem.playBgm("lobby");
  }

  function pauseGame() {
    syncContext();
    if (!state || state.mode !== "fight" || !battleContext) return;
    state.mode = "paused";
    cancelAnimationFrame(battleContext.animationId);
    battleContext.animationId = 0;
    dom.battleScreen.classList.remove("select-mode");
    updateHud(true);
    drawScene();
  }

  function resumeGame() {
    syncContext();
    if (!state || state.mode !== "paused" || !battleContext) return;
    state.mode = "fight";
    battleContext.lastTime = performance.now();
    updateHud(true);
    shared.battleRuntime.resumeBattle(battleContext);
  }

  function showOverlay(title, message, buttonText) {
    syncContext();
    dom.overlay.classList.remove("busy-overlay");
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
          updateHud(true);
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
          updateHud(true);
          drawScene();
        },
        onBackLobby: showLobby,
        onOpenSweep: openSweepSelection,
        onSweepUnavailable: function onSweepUnavailable(levelRef, reason) {
          var unavailableLevel = levelRef || getLevelById(selectedLevel);
          showSweepUnavailable(unavailableLevel, reason);
        },
        onReplayStory: function onReplayStory(levelRef) {
          playCampaignStoryReplay(typeof levelRef === "object" && levelRef ? levelRef : getLevelById(levelRef));
        }
      });
    }

    dom.startButton.textContent = state.mode === "paused"
      ? "继续游戏"
      : "开始 " + getLevelById(selectedLevel).code;
  }

  function getSweepAssets() {
    return {
      chapter: assetsConfig.CHAPTER_SELECT_ASSETS || {},
      settlement: assetsConfig.SETTLEMENT_ICON_ASSETS || {}
    };
  }

  function showSweepUnavailable(level, reason) {
    if (!shared.sweepDialogView || !shared.sweepDialogView.showUnavailable) return;
    var needsStars = reason === "NOT_THREE_STAR";
    shared.sweepDialogView.showUnavailable(dom.chapterSelect, {
      levelCode: level && level.code || "",
      title: needsStars ? "需要三星通关" : "需要先完成关卡",
      message: needsStars
        ? "将本关荣誉评价提升到三星后，即可使用扫荡功能。"
        : "完成本关后，再将荣誉评价提升到三星即可扫荡。",
      assets: getSweepAssets()
    });
  }

  function openSweepSelection(levelRef) {
    syncContext();
    var level = typeof levelRef === "object" && levelRef ? levelRef : getLevelById(levelRef || selectedLevel);
    if (!level || !shared.sweepDialogView || !shared.sweepDialogView.openSelection) return;
    var eligibility = shared.battleRules && shared.battleRules.getSweepEligibility
      ? shared.battleRules.getSweepEligibility(profile, level)
      : { canSweep: false, reason: "NOT_COMPLETED" };
    if (!eligibility.canSweep) {
      showSweepUnavailable(level, eligibility.reason);
      return;
    }
    var resources = profile.resources || {};
    var costPerRun = shared.levels && shared.levels.ENERGY_COST || 5;
    var singleGold = shared.battleRules && shared.battleRules.getSweepReward
      ? shared.battleRules.getSweepReward(level)
      : Math.round((level.reward || 0) * 0.72);
    var singleExperience = shared.battleRules && shared.battleRules.getSweepExperience
      ? shared.battleRules.getSweepExperience(singleGold, level.id)
      : Math.round(singleGold * 0.55);
    var maxCount = shared.battleRules && shared.battleRules.getSweepMaxCount
      ? shared.battleRules.getSweepMaxCount(profile)
      : Math.floor(Math.max(0, Number(resources.energy) || 0) / costPerRun);
    shared.sweepDialogView.openSelection(dom.chapterSelect, {
      levelCode: level.code,
      levelName: level.name,
      currentEnergy: resources.energy,
      maxEnergy: resources.maxEnergy,
      costPerRun: costPerRun,
      maxCount: maxCount,
      singleGold: singleGold,
      singleExperience: singleExperience,
      assets: getSweepAssets()
    }, {
      onConfirm: function onConfirm(count, dialog) {
        sweepLevel(level, count, dialog);
      }
    });
  }

  function sweepLevel(levelRef, count, dialog) {
    syncContext();
    var level = typeof levelRef === "object" && levelRef ? levelRef : getLevelById(levelRef);
    if (!level) return;
    if (gatewayActionLock.busy) {
      if (dialog && dialog.setError) dialog.setError("上一项操作仍在处理中，请稍候。");
      return;
    }
    gatewayActionLock.busy = true;
    ensureGameGateway().then(function sweepThroughGateway() {
      return options.getGameGateway().sweep(level.id, count);
    }).then(function onSweepComplete(response) {
      if (response && response.profile) applyGatewayProfile(response.profile);
      var settlement = response && response.settlement || {};
      renderLobby();
      renderChapterSelect();
      syncContext();
      shared.sweepDialogView.showSettlement(dom.chapterSelect, {
        levelCode: level.code,
        count: settlement.count || count,
        energySpent: settlement.energySpent || count * (shared.levels && shared.levels.ENERGY_COST || 5),
        gold: settlement.gold,
        experience: settlement.experience,
        energyGained: settlement.energyGained,
        remainingEnergy: profile.resources && profile.resources.energy,
        maxEnergy: profile.resources && profile.resources.maxEnergy,
        assets: getSweepAssets()
      }, {
        onAgain: function onAgain() { openSweepSelection(level); }
      });
    }).catch(function onSweepError(error) {
      if (dialog && dialog.setError) dialog.setError(error && error.message ? error.message : "扫荡失败，请稍后重试。");
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
    setImageSource(dom.energyResourceIcon, assetsConfig.UI_A_HUD_ASSETS && assetsConfig.UI_A_HUD_ASSETS.resourceEnergyIcon);
    setImageSource(dom.goldResourceIcon, assetsConfig.UI_A_HUD_ASSETS && assetsConfig.UI_A_HUD_ASSETS.resourceGoldIcon);
    setImageSource(dom.diamondResourceIcon, assetsConfig.UI_A_HUD_ASSETS && assetsConfig.UI_A_HUD_ASSETS.resourceDiamondIcon);
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
    if (shared.playerHonorView && shared.playerHonorView.render) {
      shared.playerHonorView.render(dom.pilotHonor, player);
    } else if (dom.pilotHonor) {
      dom.pilotHonor.textContent = getHonorText(player);
    }
    dom.energyValue.textContent = formatResource(resources.energy || 0) + "/" + formatResource(resources.maxEnergy || 0);
    dom.goldValue.textContent = formatResource(getGold());
    dom.diamondValue.textContent = formatResource(resources.diamonds || 0);
    renderMenuAlerts();
  }

  if (shared.worldTimeSystem && typeof shared.worldTimeSystem.subscribe === "function") {
    shared.worldTimeSystem.subscribe(renderWorldTime);
  }

  function renderMenuAlerts() {
    var tiles = dom.menuTiles || [];
    var alerts = shared.mainFeaturePanelsView && shared.mainFeaturePanelsView.getLobbyClaimableState
      ? shared.mainFeaturePanelsView.getLobbyClaimableState(profile, levels)
      : {};
    for (var i = 0; i < tiles.length; i++) {
      var panel = tiles[i].dataset ? tiles[i].dataset.panel : "";
      tiles[i].classList.toggle("has-alert", alerts[panel] === true);
    }
    // 图鉴 tile（feature-tile）单独处理小黄点
    var codexTile = dom.lobbyScreen && dom.lobbyScreen.querySelector
      ? dom.lobbyScreen.querySelector('[data-panel="codex"]')
      : null;
    if (codexTile) {
      codexTile.classList.toggle("has-alert", alerts.codex === true);
    }
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
      renderShop(upgrades[key].name + " 已升级。");
      renderLobby();
      renderChapterSelect();
      updateHud(true);
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
