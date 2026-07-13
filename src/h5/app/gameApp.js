(function registerH5GameApp(root) {
  "use strict";

  function boot() {

  var shared = root.RXGame || {};
  var canvas = document.querySelector("#game");
  var ctx = canvas ? canvas.getContext("2d") : null;

  if (!canvas || !ctx || !shared.levels || !shared.assets || !shared.profile) {
    throw new Error("H5 game bootstrap failed: missing canvas or shared modules.");
  }

  var WIDTH = canvas.width;
  var HEIGHT = canvas.height;
  var BATTLE_SAFE_LEFT = 176;
  var keys = new Set();
  var pointer = { active: false, x: BATTLE_SAFE_LEFT, y: HEIGHT / 2 };
  root.rxKeys = keys;
  root.rxPointer = pointer;

  var dom = {
    levelLabelEl: document.querySelector("#levelLabel"),
    timeLabelEl: document.querySelector("#timeLabel"),
    livesEl: document.querySelector("#lives"),
    weaponEl: document.querySelector("#weapon"),
    coinsEl: document.querySelector("#coins"),
    overlay: document.querySelector("#overlay"),
    messageEl: document.querySelector("#message"),
    startButton: document.querySelector("#startButton"),
    pauseButton: document.querySelector("#pauseButton"),
    activeSkillButton: document.querySelector("#activeSkillButton"),
    shopButton: document.querySelector("#shopButton"),
    chapterSelect: document.querySelector("#chapterSelect"),
    shopScreen: document.querySelector("#shopScreen"),
    shopCoinsEl: document.querySelector("#shopCoins"),
    shopMessageEl: document.querySelector("#shopMessage"),
    upgradeList: document.querySelector("#upgradeList"),
    nextLevelButton: document.querySelector("#nextLevelButton"),
    replayButton: document.querySelector("#replayButton"),
    backToChapterButton: document.querySelector("#backToChapterButton"),
    lobbyScreen: document.querySelector("#lobbyScreen"),
    battleScreen: document.querySelector("#battleScreen"),
    battleEntryButton: document.querySelector("#battleEntryButton"),
    featurePanel: document.querySelector("#featurePanel"),
    closeFeaturePanel: document.querySelector("#closeFeaturePanel"),
    featurePanelKicker: document.querySelector("#featurePanelKicker"),
    featurePanelTitle: document.querySelector("#featurePanelTitle"),
    featurePanelBody: document.querySelector("#featurePanelBody"),
    featurePanelSlots: document.querySelector("#featurePanelSlots"),
    pilotAvatar: document.querySelector("#pilotAvatar"),
    pilotName: document.querySelector("#pilotName"),
    pilotLevel: document.querySelector("#pilotLevel"),
    pilotExpText: document.querySelector("#pilotExpText"),
    pilotExpBar: document.querySelector("#pilotExpBar"),
    pilotBadge: document.querySelector("#pilotBadge"),
    energyValue: document.querySelector("#energyValue"),
    goldValue: document.querySelector("#goldValue"),
    diamondValue: document.querySelector("#diamondValue"),
    avatarUpload: document.querySelector("#avatarUpload"),
    lobbyBackgroundLayer: document.querySelector("#lobbyBackgroundLayer"),
    lobbyPilotLayer: document.querySelector("#lobbyPilotLayer"),
    lobbyShipLayer: document.querySelector("#lobbyShipLayer")
  };

  var levelsConfig = shared.levels;
  var levels = levelsConfig.levels || [];
  var upgrades = levelsConfig.upgrades || {};
  var ENERGY_COST = levelsConfig.ENERGY_COST || 5;
  var LEVEL_DURATION = levelsConfig.LEVEL_DURATION || 90;
  var BOSS_SPAWN_TIME = levelsConfig.BOSS_SPAWN_TIME || 60;
  var assetsConfig = shared.assets;
  var audioSystem = shared.audioSystem || null;
  var battleRenderer = shared.canvasRenderer && shared.canvasRenderer.create({
    ctx: ctx,
    width: WIDTH,
    height: HEIGHT,
    assetsConfig: assetsConfig,
    levelsConfig: levelsConfig,
    getShipAsset: getShipAsset,
    clamp: clamp
  });
  if (!battleRenderer) throw new Error("H5 game bootstrap failed: missing canvas renderer.");
  var LOBBY_POSE_FIELDS = [
    "left", "top", "width", "height", "maxHeight",
    "opacity", "translateX", "translateY", "rotate", "scale"
  ];
  var FEATURE_PANEL_MODE_CLASSES = [
    "pilot-dossier-panel",
    "ship-hangar-panel",
    "fighter-upgrade-panel",
    "profile-dossier-panel",
    "main-feature-panel",
    "feature-v3-panel",
    "star-wings-gacha-panel",
    "contact-panel"
  ];
  var demoConfig = createDemoConfig();
  var profile = loadProfile();
  var selectedLevel = demoConfig.enabled ? demoConfig.levelId : clamp(profile.unlockedLevel || 1, 1, levels.length || 1);
  var selectedChapter = getLevelById(selectedLevel).chapterIndex || 0;
  var state = createMenuState(selectedLevel);
  var battleContext = null;
  var battleSession = null;
  var currentLoadout = null;
  var lastBattleResult = null;
  var profilePanelTab = "overview";
  var finished = false;
  var gameGateway = null;
  var gatewayReadyPromise = null;
  var gatewayError = null;
  var gatewayActionBusy = false;
  var pendingSettlement = null;
  var settlementController = shared.settlementController && shared.settlementController.create({
    dom: dom,
    assetsConfig: assetsConfig,
    getPilotAsset: getPilotAsset,
    getSettlementStoryMessage: getSettlementStoryMessage,
    onResult: function rememberSettlementResult(result) {
      lastBattleResult = result;
    }
  });
  if (!settlementController) throw new Error("H5 game bootstrap failed: missing settlement controller.");

  var featurePanels = {
    profile: ["PILOT", "飞行员资料", "头像、等级、经验、体力、金币和钻石都会写入本地存档。"],
    energy: ["RESOURCE", "体力", "每次进入战斗会消耗体力，本地测试仍保留资源规则。"],
    gold: ["RESOURCE", "金币", "战斗、扫荡和结算奖励会累计到金币。"],
    diamond: ["RESOURCE", "钻石", "当前预留给充值、活动奖励和高级抽取。"],
    pilotGallery: ["PILOT", "战姬", "战姬出战属性会通过 BattleLoadout 快照进入战斗。"],
    shipGallery: ["HANGAR", "战机", "战机与战机强化会影响攻击、生命和破甲。"],
    upgrade: ["UPGRADE", "战机强化", "强化后的数值会重新生成出战属性快照。"],
    task: ["TASK", "任务", "任务会读取本地通关、强化和收集进度。"],
    event: ["EVENT", "活动", "活动排程以本地展示态呈现。"],
    achievement: ["ACHIEVEMENT", "成就", "成就根据本地存档计算进度。"],
    shop: ["SHOP", "商店", "补给商品为展示态，不执行本地扣费。"],
    friend: ["FRIEND", "好友", "好友与助战为本地预览，真实社交服务未开放。"],
    ranking: ["RANKING", "排行榜", "榜单会插入本地玩家记录，不上传云端。"],
    mail: ["MAIL", "邮件", "邮件展示公告、补给、活动和维护信息。"],
    signin: ["SIGN IN", "签到", "七日航线奖励为本地展示态。"],
    setting: ["SETTING", "设置", "音乐和音效设置可即时生效并保存到本地。"],
    starWingsGacha: ["STAR WINGS", "星穹之翼", "限时抽取入口已独立接通。"],
    contact: ["CONTACT", "联系我们", "二维码联系入口为本地展示态。"],
    chat: ["CHAT", "世界频道", "频道消息为本地预览，发送功能未开放。"]  };

  applyRuntimeAssetCssVars();
  syncLobbyViewportScale();
  saveProfile();
  renderLobby();
  renderChapterSelect();
  renderShop();
  updateHud();
  drawScene();
  bindEvents();
  initializeGameGateway();
  if (demoConfig.enabled) setupInfluencerDemoEntry();

  function initializeGameGateway() {
    var localSnapshot = cloneProfile(profile);
    var gatewayModule = shared.gameGateway;
    if (!gatewayModule || !gatewayModule.create) {
      gatewayError = new Error("游戏数据入口加载失败。");
      return Promise.reject(gatewayError);
    }
    gameGateway = gatewayModule.create({
      mode: demoConfig.enabled ? "local" : undefined,
      local: createLocalGatewayAdapter()
    });
    gatewayReadyPromise = gameGateway.bootstrap().then(function onGatewayBootstrap(result) {
      var nextProfile = result && result.profile ? result.profile : profile;
      var shouldMigrateCosmetics = gameGateway.isCloud && localStorage.getItem("rxgame_cloud_cosmetics_migrated_v1") !== "1";
      if (shouldMigrateCosmetics) nextProfile = mergeLocalCosmetics(nextProfile, localSnapshot);
      applyGatewayProfile(nextProfile);
      gatewayError = null;
      if (shouldMigrateCosmetics && hasCosmeticDifference(result && result.profile, nextProfile)) {
        return gameGateway.saveCosmetics(nextProfile).then(function onCosmeticsSaved(saved) {
          applyGatewayProfile(saved && saved.profile ? saved.profile : nextProfile);
          localStorage.setItem("rxgame_cloud_cosmetics_migrated_v1", "1");
        });
      }
      if (shouldMigrateCosmetics) localStorage.setItem("rxgame_cloud_cosmetics_migrated_v1", "1");
      return null;
    }).then(function onGatewayReady() {
      setGatewayUiState(true);
      refreshAllViews();
      return gameGateway;
    }).catch(function onGatewayError(error) {
      gatewayError = error;
      setGatewayUiState(false);
      if (gameGateway && gameGateway.isCloud) console.error("Cloud game bootstrap failed", error);
      throw error;
    });
    gatewayReadyPromise.catch(function ignoreInitialGatewayError() {});
    return gatewayReadyPromise;
  }

  function ensureGameGateway() {
    if (!gatewayReadyPromise) return initializeGameGateway();
    return gatewayReadyPromise;
  }

  function createLocalGatewayAdapter() {
    return {
      bootstrap: function bootstrapLocal() { return { profile: profile }; },
      identity: function identityLocal() { return { uid: profile.player && profile.player.uid || "" }; },
      startBattle: function startLocalBattle() {
        if (!spendEnergy(ENERGY_COST)) {
          var error = new Error("当前体力不足，进入战斗需要 " + ENERGY_COST + " 点体力。");
          error.code = "NO_ENERGY";
          throw error;
        }
        return { profile: profile, ticket: "" };
      },
      finishBattle: function finishLocalBattle(ticket, levelId, rating, details) {
        details = details || {};
        var result = details.result || {};
        var level = getLevelById(levelId);
        if (details.isWin && shared.progressionSystem && shared.progressionSystem.completeLevel) {
          profile = shared.progressionSystem.completeLevel(profile, level, rating || { stars: 1 });
        }
        addGold(Math.max(0, Math.floor(result.coinsEarned || 0)));
        result.levelProgress = applyBattleExperience(profile, Math.max(0, Math.floor(result.expEarned || 0)));
        saveProfile();
        return {
          profile: profile,
          settlement: {
            gold: Math.max(0, Math.floor(result.coinsEarned || 0)),
            experience: Math.max(0, Math.floor(result.expEarned || 0)),
            rating: rating
          }
        };
      },
      abandonBattle: function abandonLocalBattle() {
        return { profile: profile, refundedEnergy: refundBattleEnergy() };
      },
      sweep: function sweepLocal(levelId) {
        var level = getLevelById(levelId);
        var result = shared.progressionSystem && shared.progressionSystem.sweepLevel
          ? shared.progressionSystem.sweepLevel(profile, level)
          : { success: false, reason: "UNAVAILABLE" };
        if (!result.success) {
          var error = new Error(result.reason === "NO_ENERGY" ? "体力不足。" : "该关卡尚未通关。");
          error.code = result.reason;
          throw error;
        }
        profile = result.profile;
        saveProfile();
        return { profile: profile, settlement: { gold: result.goldEarned, experience: result.expEarned } };
      },
      upgrade: function upgradeLocal(key) {
        var upgrade = upgrades[key];
        var cost = getUpgradeCost(key);
        profile.upgrades = profile.upgrades || {};
        if (!upgrade || profile.upgrades[key] >= upgrade.max || getGold() < cost) throw new Error("当前无法升级。");
        setGold(getGold() - cost);
        profile.upgrades[key] = (profile.upgrades[key] || 0) + 1;
        saveProfile();
        return { profile: profile, cost: cost, key: key, level: profile.upgrades[key] };
      },
      upgradeFighter: function upgradeFighterLocal(statType) {
        var check = shared.battleRules && shared.battleRules.getFighterUpgradeResult
          ? shared.battleRules.getFighterUpgradeResult(profile, statType)
          : getFallbackFighterUpgradeResult(statType);
        if (!check || !check.canUpgrade) throw new Error("当前无法强化战机。");
        profile.fighterUpgrades = profile.fighterUpgrades || {};
        setGold(getGold() - check.cost);
        profile.fighterUpgrades[statType] = check.targetLevel;
        saveProfile();
        return { profile: profile, cost: check.cost, statType: statType, level: check.targetLevel };
      },
      saveCosmetics: function saveLocalCosmetics(nextProfile) {
        profile = shared.profile.normalizeProfile(nextProfile || profile);
        saveProfile();
        return { profile: profile };
      }
    };
  }

  function cloneProfile(source) {
    try { return JSON.parse(JSON.stringify(source || {})); }
    catch (error) { return source || {}; }
  }

  function mergeLocalCosmetics(cloudProfile, localProfile) {
    var merged = cloneProfile(cloudProfile || {});
    var localPlayer = localProfile && localProfile.player || {};
    var localScene = localProfile && localProfile.scene || {};
    var cloudOwned = merged.owned || {};
    merged.player = merged.player || {};
    merged.scene = merged.scene || {};
    ["name", "signature", "avatar"].forEach(function copyPlayerField(field) {
      if (typeof localPlayer[field] === "string" && localPlayer[field]) merged.player[field] = localPlayer[field];
    });
    var ownershipFields = { pilotId: "pilots", shipId: "ships", backgroundId: "backgrounds" };
    ["pilotId", "shipId", "backgroundId"].forEach(function copyOwnedSceneField(field) {
      var ownedIds = Array.isArray(cloudOwned[ownershipFields[field]]) ? cloudOwned[ownershipFields[field]] : [];
      if (typeof localScene[field] === "string" && ownedIds.indexOf(localScene[field]) >= 0) merged.scene[field] = localScene[field];
    });
    return merged;
  }

  function hasCosmeticDifference(before, after) {
    if (!before || !after) return false;
    return JSON.stringify({ player: before.player, scene: before.scene }) !== JSON.stringify({ player: after.player, scene: after.scene });
  }

  function applyGatewayProfile(nextProfile) {
    profile = shared.profile.normalizeProfile(nextProfile || profile);
    selectedLevel = clamp(Math.min(selectedLevel || 1, profile.unlockedLevel || 1), 1, levels.length || 1);
    localStorage.setItem("rxgame_save_v5", JSON.stringify(profile));
  }

  function setGatewayUiState(ready) {
    if (!dom.battleEntryButton || !gameGateway || !gameGateway.isCloud) return;
    dom.battleEntryButton.disabled = !ready;
    dom.battleEntryButton.title = ready ? "" : "云存档连接失败，请刷新后重试";
  }

  function refreshAllViews() {
    renderLobby();
    renderChapterSelect();
    renderShop();
    updateHud();
    drawScene();
  }

  function applyRuntimeAssetCssVars() {
    var background = assetsConfig.BACKGROUND_ASSETS && assetsConfig.BACKGROUND_ASSETS[0];
    if (!background || !background.src || !root.document || !root.document.documentElement) return;
    var docStyle = root.document.documentElement.style;
    docStyle.setProperty("--rx-hangar-bg", "url(" + JSON.stringify(background.src) + ")");
    var hudAssets = assetsConfig.UI_A_HUD_ASSETS || {};
    Object.keys(hudAssets).forEach(function exposeHudAsset(key) {
      var cssName = "--rx-a-" + key.replace(/[A-Z]/g, function (match) { return "-" + match.toLowerCase(); });
      docStyle.setProperty(cssName, "url(" + JSON.stringify(hudAssets[key]) + ")");
    });
  }

  function loadProfile() {
    if (demoConfig.enabled) return createInfluencerDemoProfile();
    var runtime = shared.profileRuntime;
    var nextProfile = runtime && runtime.loadProfile
      ? runtime.loadProfile()
      : shared.profile.createProfile(JSON.parse(localStorage.getItem("rxgame_save_v5") || "{}"));
    return shared.profile.normalizeProfile(unlockForLocalTest(nextProfile));
  }

  function unlockForLocalTest(nextProfile) {
    nextProfile = nextProfile || {};
    if (shared.combatStats && shared.combatStats.LOCAL_TEST_UNLOCK_ALL_LEVELS) {
      nextProfile.unlockedLevel = levels.length || nextProfile.unlockedLevel || 1;
    }
    var unlockAllPilots = (shared.combatStats && shared.combatStats.LOCAL_TEST_UNLOCK_ALL_PILOTS) ||
      (shared.pilotGalleryView && shared.pilotGalleryView.LOCAL_TEST_UNLOCK_ALL_PILOTS);
    if (unlockAllPilots) {
      nextProfile.owned = nextProfile.owned || {};
      var ownedPilots = Array.isArray(nextProfile.owned.pilots) ? nextProfile.owned.pilots.slice() : [];
      (assetsConfig.PILOT_ASSETS || []).forEach(function unlockPilot(pilot) {
        if (pilot && pilot.id && ownedPilots.indexOf(pilot.id) < 0) {
          ownedPilots.push(pilot.id);
        }
      });
      nextProfile.owned.pilots = ownedPilots;
    }
    var unlockAllShips = (shared.combatStats && shared.combatStats.LOCAL_TEST_UNLOCK_ALL_SHIPS) ||
      (shared.shipGalleryView && shared.shipGalleryView.LOCAL_TEST_UNLOCK_ALL_SHIPS);
    if (unlockAllShips) {
      nextProfile.owned = nextProfile.owned || {};
      var ownedShips = Array.isArray(nextProfile.owned.ships) ? nextProfile.owned.ships.slice() : [];
      (assetsConfig.SHIP_ASSETS || []).forEach(function unlockShip(ship) {
        if (ship && ship.id && ownedShips.indexOf(ship.id) < 0) {
          ownedShips.push(ship.id);
        }
      });
      nextProfile.owned.ships = ownedShips;
    }
    return nextProfile;
  }

  function saveProfile() {
    if (demoConfig.enabled) return;
    profile = shared.profile.normalizeProfile(unlockForLocalTest(profile));
    if (shared.profileRuntime && shared.profileRuntime.saveProfile) {
      shared.profileRuntime.saveProfile(profile);
    } else {
      localStorage.setItem("rxgame_save_v5", JSON.stringify(profile));
    }
  }

  function createDemoConfig() {
    var params = parseQueryParams(root.location && root.location.search);
    var requestedLevel = Math.floor(Number(params.level) || 1);
    return {
      enabled: params.demo === "influencer",
      levelId: clamp(requestedLevel, 1, levels.length || 1)
    };
  }

  function parseQueryParams(search) {
    var params = {};
    String(search || "").replace(/^\?/, "").split("&").forEach(function parse(part) {
      if (!part) return;
      var pair = part.split("=");
      var key = decodeURIComponent(pair[0] || "");
      if (!key) return;
      params[key] = decodeURIComponent((pair.slice(1).join("=") || "").replace(/\+/g, " "));
    });
    return params;
  }

  function createInfluencerDemoProfile() {
    var demoLevel = 30;
    var totalExp = (levelsConfig.COMMANDER_TOTAL_EXP_BY_LEVEL || [])[demoLevel] || 2946;
    var demoProfile = shared.profile.createProfile({
      unlockedLevel: levels.length || 1,
      completed: [1, 2, 3],
      upgrades: { fire: 0, armor: 3, engine: 1, bounty: 0 },
      fighterUpgrades: { attack: 30, armorPenetration: 8, hp: 18 },
      player: {
        name: "Demo Pilot",
        level: demoLevel,
        totalExp: totalExp,
        exp: 0,
        honorLevel: 3,
        badge: "III"
      },
      resources: {
        energy: 999,
        maxEnergy: 999,
        gold: 1800,
        diamonds: 0,
        lastEnergyAt: Date.now()
      }
    });
    demoProfile.__demoInfluencer = true;
    demoProfile.unlockedLevel = levels.length || demoProfile.unlockedLevel || 1;
    demoProfile.resources = demoProfile.resources || {};
    demoProfile.resources.energy = Math.max(demoProfile.resources.energy || 0, ENERGY_COST);
    return shared.profile.normalizeProfile(unlockForLocalTest(demoProfile));
  }

  function setupInfluencerDemoEntry() {
    if (root.document && root.document.body) root.document.body.classList.add("influencer-demo-mode");
    selectedLevel = clamp(demoConfig.levelId || 1, 1, levels.length || 1);
    selectedChapter = getLevelById(selectedLevel).chapterIndex || 0;
    state = createMenuState(selectedLevel);
    renderLobby();
    renderChapterSelect();
    openBattleSelect();
    showOverlay("Influencer Demo", "三武器开局，先清屏变强，再挑战 BOSS。", "开始试玩");
  }

  function createMenuState(levelId) {
    if (shared.battleState && shared.battleState.createMenuState) {
      return shared.battleState.createMenuState(levelId);
    }
    return {
      mode: "menu",
      level: getLevelById(levelId),
      elapsed: 0,
      levelCoins: 0,
      enemyTimer: 0,
      powerTimer: 10,
      bossWarning: 0,
      bossSpawned: false,
      shake: 0,
      player: { x: BATTLE_SAFE_LEFT, y: HEIGHT / 2, radius: 23, hp: 100, maxHp: 100, lives: 1, cooldown: 0, invincible: 1, shield: 0, weapons: {} },
      stars: createStars(),
      bullets: [],
      enemyBullets: [],
      enemies: [],
      boss: null,
      coins: [],
      powerups: [],
      particles: [],
      shockwaves: [],
      notices: []
    };
  }

  function startSelectedLevel() {
    if (gatewayActionBusy) return;
    var level = getLevelById(selectedLevel);
    if (!level || level.id > (profile.unlockedLevel || 0)) return;
    var preStory = getNextCampaignStoryScene(level, "pre_stage");
    if (preStory && playCampaignStoryScene(preStory, {
      finishLabel: "开始作战",
      markSeen: true,
      onDone: startSelectedLevel
    })) {
      return;
    }
    gatewayActionBusy = true;
    if (dom.startButton) dom.startButton.disabled = true;
    ensureGameGateway().then(function startThroughGateway() {
      return gameGateway.startBattle(level.id);
    }).then(function onBattleAuthorized(result) {
      if (result && result.profile) applyGatewayProfile(result.profile);
      beginAuthorizedBattle(level, result && result.ticket || "");
    }).catch(function onBattleStartError(error) {
      showBattleScreen();
      var message = error && error.message ? error.message : "暂时无法开始战斗，请稍后重试。";
      showOverlay(error && error.code === "NO_ENERGY" ? "体力不足" : "无法开始战斗", message, "返回关卡");
      renderChapterSelect();
    }).finally(function releaseBattleStart() {
      gatewayActionBusy = false;
      if (dom.startButton) dom.startButton.disabled = Boolean(gatewayError && gameGateway && gameGateway.isCloud);
    });
  }

  function beginAuthorizedBattle(level, ticket) {
    if (battleContext) cancelAnimationFrame(battleContext.animationId);
    battleContext = null;
    battleSession = null;
    finished = false;
    battleSession = createBattleSession(level, ticket);
    hideShop();
    showBattleScreen();
    playSfx("start");
    if (audioSystem && audioSystem.playBgm) audioSystem.playBgm("battle");
    dom.battleScreen.classList.remove("select-mode", "overlay-active", "settlement-active");
    dom.overlay.classList.add("hidden");
    currentLoadout = shared.combatStats && shared.combatStats.generateBattleLoadout
      ? shared.combatStats.generateBattleLoadout(profile)
      : null;

    battleContext = shared.battleRuntime.startLevelBattle(level, profile, gameGateway, {
      onBattleStart: function onBattleStart(nextState) {
        state = nextState;
        state.player.x = BATTLE_SAFE_LEFT;
        state.player.y = HEIGHT / 2;
      },
      onFrame: function onFrame(nextState) {
        state = nextState;
        drawScene();
      },
      onUpdateHud: function onUpdateHud(nextState) {
        state = nextState;
        updateHud();
        checkBattleEnd();
      }
    });

    if (!battleContext) return;
    state = battleContext.state;
    if (demoConfig.enabled) {
      state.powerTimer = 2;
      state.demoMode = "influencer";
      state.notices = state.notices || [];
      state.notices.push({ text: "三武器启动", color: "#5ee7ff", x: 960 / 2, y: 86, life: 2.2 });
    }
    currentLoadout = battleContext.loadout || currentLoadout;
    if (battleSession) battleSession.loadout = currentLoadout;
    updateHud();
    dom.pauseButton.textContent = "暂停";
    battleContext.lastTime = performance.now();
    battleContext.animationId = requestAnimationFrame(function run(t) {
      shared.battleRuntime.loop(battleContext, t);
    });
  }

  function checkBattleEnd() {
    if (finished || !state || state.mode !== "fight") return;
    if (state.player && (state.player.hp != null ? state.player.hp <= 0 : state.player.lives <= 0)) {
      completeBattle(false);
      return;
    }
    if (state.boss && state.boss.hp <= 0) {
      completeBattle(true);
    }
  }

  function completeBattle(isWin) {
    if (gatewayActionBusy) return;
    finished = true;
    if (battleContext) cancelAnimationFrame(battleContext.animationId);
    state.mode = "settling";
    dom.battleScreen.classList.remove("select-mode", "overlay-active");
    if (battleSession) battleSession.endReason = isWin ? "win" : "fail";

    var level = state.level || getLevelById(selectedLevel);
    var result = shared.settlementSystem && shared.settlementSystem.generateBattleResult
      ? shared.settlementSystem.generateBattleResult(state, level, isWin, isWin ? "win" : "fail")
      : { isWin: isWin, levelId: level.id, coinsEarned: 0, expEarned: 0, rating: { stars: isWin ? 1 : 0 } };

    if (isWin) updateStageHonorRecord(level, result);
    pendingSettlement = {
      isWin: isWin,
      level: level,
      result: result,
      ticket: battleSession && battleSession.ticket || "",
      progressBefore: createLevelProgressSnapshot(profile.player)
    };
    settlePendingBattle();
  }

  function settlePendingBattle() {
    if (!pendingSettlement || gatewayActionBusy) return;
    var settlement = pendingSettlement;
    gatewayActionBusy = true;
    ensureGameGateway().then(function settleThroughGateway() {
      if (gameGateway.isCloud && !settlement.isWin) return gameGateway.abandonBattle(settlement.ticket);
      return gameGateway.finishBattle(
        settlement.ticket,
        settlement.level.id,
        settlement.result.rating || { stars: settlement.isWin ? 1 : 0 },
        { isWin: settlement.isWin, result: settlement.result }
      );
    }).then(function onBattleSettled(response) {
      if (response && response.profile) applyGatewayProfile(response.profile);
      applyGatewaySettlement(settlement, response);
      pendingSettlement = null;
      battleContext = null;
      battleSession = null;
      state.mode = "shop";
      presentSettlement(settlement.isWin, settlement.level, settlement.result);
    }).catch(function onSettlementError(error) {
      state.mode = "settlement-error";
      showBattleScreen();
      showOverlay("结算未完成", error && error.message ? error.message : "云端结算失败，请重试。", "重试结算");
    }).finally(function releaseSettlement() {
      gatewayActionBusy = false;
    });
  }

  function applyGatewaySettlement(pending, response) {
    var server = response && response.settlement || {};
    if (gameGateway && gameGateway.isCloud) {
      pending.result.coinsEarned = Math.max(0, Math.floor(server.gold || 0));
      pending.result.expEarned = Math.max(0, Math.floor(server.experience || 0));
      if (server.rating) pending.result.rating = server.rating;
      pending.result.levelProgress = {
        before: pending.progressBefore,
        after: createLevelProgressSnapshot(profile.player)
      };
      saveProfile();
    }
  }

  function isCloudMode() {
    return Boolean(gameGateway && gameGateway.isCloud);
  }

  function persistProfileMetadata() {
    saveProfile();
    if (!isCloudMode()) return Promise.resolve({ profile: profile });
    return ensureGameGateway().then(function saveMetadataThroughGateway() {
      return gameGateway.saveCosmetics(profile);
    }).then(function onMetadataSaved(response) {
      if (response && response.profile) applyGatewayProfile(response.profile);
      return response;
    }).catch(function onMetadataSaveError(error) {
      console.error("Cloud profile metadata save failed", error);
      throw error;
    });
  }

  function presentSettlement(isWin, level, result) {
    var finishSettlement = function finishSettlement() {
      renderLobby();
      renderChapterSelect();
      if (isWin) renderVictoryIntro(result);
      else renderSettlement(result);
      if (audioSystem && audioSystem.stopBgm) audioSystem.stopBgm();
      playSfx(isWin ? "victory" : "defeat");
      showShop();
      updateHud();
      drawScene();
    };

    var postStory = isWin ? getNextCampaignStoryScene(level, "post_win") : null;
    if (postStory && playCampaignStoryScene(postStory, {
      finishLabel: "领取奖励",
      markSeen: true,
      onDone: finishSettlement
    })) {
      return;
    }
    finishSettlement();
  }

  function syncLobbyViewportScale() {
    if (!dom.lobbyScreen) return;
    var reference = assetsConfig.LOBBY_REFERENCE || { width: 1600, height: 900 };
    var viewportWidth = root.innerWidth || root.document.documentElement.clientWidth || reference.width;
    var viewportHeight = root.innerHeight || root.document.documentElement.clientHeight || reference.height;
    var scale = Math.min(viewportWidth / reference.width, viewportHeight / reference.height);
    dom.lobbyScreen.style.setProperty("--lobby-scale", String(Math.max(0.1, scale)));
  }

  function updateStageHonorRecord(level, result) {
    if (!level || !result || !result.rating) return;
    var stageId = getStageKey(level);
    profile.progress = profile.progress || {};
    profile.progress.stageHonors = profile.progress.stageHonors || {};
    var nextTier = Math.max(0, Math.floor(Number(result.rating.honorTier) || Number(result.rating.stars) || 0));
    var previousTier = Math.max(0, Math.floor(Number(profile.progress.stageHonors[stageId]) || 0));
    result.rating.bestHonorTier = Math.max(previousTier, nextTier);
    result.rating.isNewRecord = nextTier > previousTier;
    if (nextTier > previousTier) profile.progress.stageHonors[stageId] = nextTier;
  }

  function getStageKey(level) {
    if (!level) return "";
    return level.chapterIndex === 0
      ? "prologue_" + level.stageInChapter
      : level.chapterIndex + "_" + level.stageInChapter;
  }

  function getSettlementStoryMessage(result, fallback) {
    result = result || {};
    var chapterIndex = result.chapterIndex;
    var stageInChapter = result.stageInChapter;
    if (chapterIndex == null || stageInChapter == null) {
      var level = getLevelById(result.levelId || selectedLevel);
      chapterIndex = level && level.chapterIndex;
      stageInChapter = level && level.stageInChapter;
    }
    var story = shared.campaignStoryFramework && shared.campaignStoryFramework.getBattleResultViewModel
      ? shared.campaignStoryFramework.getBattleResultViewModel({
        chapterIndex: chapterIndex,
        stageInChapter: stageInChapter,
        isWin: result.isWin
      })
      : null;
    return story && (story.message || story.text) || fallback || "";
  }

  function getNextCampaignStoryScene(level, trigger) {
    if (!level || !shared.campaignStoryFramework || !shared.campaignStoryFramework.getNextUnseenStoryScene) return null;
    return shared.campaignStoryFramework.getNextUnseenStoryScene({
      profile: profile,
      chapterIndex: level.chapterIndex,
      stageInChapter: level.stageInChapter,
      trigger: trigger
    });
  }

  function playCampaignStoryScene(scene, options) {
    options = options || {};
    if (!scene || !shared.campaignStoryPlayerView || !shared.campaignStoryPlayerView.openStoryScene) return false;
    shared.campaignStoryPlayerView.openStoryScene(scene, {
      finishLabel: options.finishLabel || "继续",
      onFinish: function onStoryFinish() {
        if (options.markSeen && shared.campaignStoryFramework && shared.campaignStoryFramework.markStorySceneSeen) {
          profile = shared.campaignStoryFramework.markStorySceneSeen(profile, scene.onceKey || scene.sceneId) || profile;
          persistProfileMetadata().catch(function keepLocalStoryProgress() {});
        }
        if (options.onDone) options.onDone();
      }
    });
    return true;
  }

  function playCampaignStoryReplay(level) {
    if (!level || !shared.campaignStoryFramework || !shared.campaignStoryFramework.getStoryReplayScenes) return;
    var scenes = shared.campaignStoryFramework.getStoryReplayScenes({
      chapterIndex: level.chapterIndex,
      stageInChapter: level.stageInChapter
    }) || [];
    var index = 0;
    function playNextScene() {
      var scene = scenes[index];
      index += 1;
      if (!scene) return;
      playCampaignStoryScene(scene, {
        finishLabel: index >= scenes.length ? "关闭" : "下一段",
        markSeen: false,
        onDone: playNextScene
      });
    }
    playNextScene();
  }

  function handleStoryReplayClick(event) {
    var replay = event.target && event.target.closest ? event.target.closest("[data-story-replay]") : null;
    if (!replay) return;
    event.preventDefault();
    event.stopPropagation();
    var levelId = Number(replay.dataset && replay.dataset.storyReplayLevel) || selectedLevel;
    playCampaignStoryReplay(getLevelById(levelId));
  }

  function createBattleSession(level, ticket) {
    return {
      levelId: level && level.id,
      ticket: ticket || "",
      energyCost: ENERGY_COST,
      loadout: currentLoadout,
      startedAt: Date.now(),
      energyRefunded: false,
      endReason: "active"
    };
  }

  function refundBattleEnergy() {
    if (demoConfig.enabled) return 0;
    if (!battleSession || battleSession.energyRefunded) return 0;
    var amount = Math.max(0, Math.floor(battleSession.energyCost || 0));
    profile.resources = profile.resources || {};
    profile.resources.energy = Math.min(
      Math.max(amount, Math.floor(profile.resources.maxEnergy || amount)),
      Math.max(0, Math.floor(profile.resources.energy || 0)) + amount
    );
    battleSession.energyRefunded = true;
    saveProfile();
    renderLobby();
    return amount;
  }

  function abortBattle(target) {
    if (!battleContext && !battleSession) {
      if (target === "chapter") openBattleSelect();
      else showLobby();
      return;
    }
    if (gatewayActionBusy) return;
    if (battleContext) cancelAnimationFrame(battleContext.animationId);
    gatewayActionBusy = true;
    var ticket = battleSession && battleSession.ticket || "";
    ensureGameGateway().then(function abandonThroughGateway() {
      return gameGateway.abandonBattle(ticket);
    }).then(function onBattleAbandoned(response) {
      if (response && response.profile) applyGatewayProfile(response.profile);
      var refunded = Math.max(0, Math.floor(response && response.refundedEnergy || 0));
      battleContext = null;
      battleSession = null;
      finished = true;
      state = createMenuState(selectedLevel);
      state.mode = "menu";
      dom.pauseButton.textContent = "暂停";
      dom.overlay.classList.add("hidden");
      dom.battleScreen.classList.remove("overlay-active", "settlement-active");
      hideShop();
      if (target === "chapter") {
        openBattleSelect();
        showOverlay("已撤离战场", refunded > 0 ? "本次主动撤离已返还体力 +" + refunded + "。" : "本次战斗已安全结束。", "开始 " + getLevelById(selectedLevel).code);
      } else {
        showLobby();
      }
    }).catch(function onAbandonError(error) {
      state.mode = "paused";
      showOverlay("撤离未完成", error && error.message ? error.message : "云端暂时无法确认撤离，请重试。", "继续战斗");
    }).finally(function releaseAbandon() {
      gatewayActionBusy = false;
    });
  }

  function openBattleSelect() {
    if (battleContext) cancelAnimationFrame(battleContext.animationId);
    battleContext = null;
    state = createMenuState(selectedLevel);
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
    dom.lobbyScreen.classList.add("hidden");
    dom.battleScreen.classList.remove("hidden");
  }

  function showLobby() {
    if (battleContext) cancelAnimationFrame(battleContext.animationId);
    battleContext = null;
    battleSession = null;
    state = createMenuState(selectedLevel);
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
    if (!state || state.mode !== "fight" || !battleContext) return;
    state.mode = "paused";
    cancelAnimationFrame(battleContext.animationId);
    dom.battleScreen.classList.remove("select-mode");
    dom.pauseButton.textContent = "继续";
    showPauseOverlay();
  }

  function resumeGame() {
    if (!state || state.mode !== "paused" || !battleContext) return;
    dom.overlay.classList.add("hidden");
    dom.battleScreen.classList.remove("overlay-active");
    state.mode = "fight";
    dom.pauseButton.textContent = "暂停";
    battleContext.lastTime = performance.now();
    shared.battleRuntime.resumeBattle(battleContext);
  }

  function showPauseOverlay() {
    showOverlay("作战暂停", "继续战斗，或主动撤离并返还本次消耗体力。", "继续战斗");
    dom.overlay.classList.add("pause-overlay");
    dom.chapterSelect.innerHTML = '<section class="pause-actions" aria-label="暂停操作">' +
      '<button type="button" data-pause-action="resume">继续战斗</button>' +
      '<button type="button" data-pause-action="chapter">返回关卡</button>' +
      '<button type="button" data-pause-action="lobby">返回大厅</button>' +
    '</section>';
  }

  function showOverlay(title, message, buttonText) {
    dom.overlay.classList.remove("pause-overlay");
    dom.overlay.querySelector("h1").textContent = title;
    dom.messageEl.textContent = message;
    dom.startButton.textContent = buttonText;
    dom.overlay.classList.remove("hidden");
    dom.battleScreen.classList.add("overlay-active");
  }

  function showShop() {
    dom.overlay.classList.add("hidden");
    dom.battleScreen.classList.remove("select-mode", "overlay-active");
    dom.battleScreen.classList.add("settlement-active");
    dom.shopScreen.classList.remove("hidden");
  }

  function hideShop() {
    dom.battleScreen.classList.remove("settlement-active");
    dom.shopScreen.classList.remove("settlement-victory-intro-mode", "settlement-chest-mode", "settlement-ceremony-mode", "settlement-opened-mode", "settlement-win-mode", "settlement-fail-mode");
    dom.shopScreen.classList.add("hidden");
  }

  function renderChapterSelect() {
    var level = getLevelById(selectedLevel);
    selectedChapter = level.chapterIndex || 0;

    if (shared.chapterSelectView && shared.chapterSelectView.renderChapterSelect) {
      shared.chapterSelectView.renderChapterSelect(dom.chapterSelect, profile, selectedChapter, selectedLevel, {
        actionButton: dom.startButton,
        onSelectLevel: function onSelectLevel(levelId, chapterIndex) {
          selectedLevel = clamp(levelId, 1, levels.length);
          selectedChapter = chapterIndex || getLevelById(selectedLevel).chapterIndex || 0;
          if (state) state.level = getLevelById(selectedLevel);
          renderChapterSelect();
          updateHud();
          drawScene();
        },
        onSelectChapter: function onSelectChapter(chapterIndex) {
          selectedChapter = chapterIndex;
          var next = levels.find(function findLevel(item) {
            return item.chapterIndex === chapterIndex && item.id <= (profile.unlockedLevel || 0);
          });
          if (next) selectedLevel = next.id;
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
    if (gatewayActionBusy) return;
    var level = getLevelById(levelId);
    if (!level) return;
    gatewayActionBusy = true;
    ensureGameGateway().then(function sweepThroughGateway() {
      return gameGateway.sweep(level.id);
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
      gatewayActionBusy = false;
    });
  }

  function renderLobby() {
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
    if (gatewayActionBusy || !upgrades[key]) return;
    gatewayActionBusy = true;
    ensureGameGateway().then(function upgradeThroughGateway() {
      return gameGateway.upgrade(key);
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
      gatewayActionBusy = false;
    });
  }

  function getUpgradeCost(key) {
    var upgrade = upgrades[key];
    var level = profile.upgrades && profile.upgrades[key] ? profile.upgrades[key] : 0;
    return shared.battleRules && shared.battleRules.getUpgradeCost
      ? shared.battleRules.getUpgradeCost(upgrade, level)
      : Math.round((upgrade.baseCost || 100) * (1 + level * 0.65));
  }

  function updateHud() {
    if (dom.battleScreen && dom.battleScreen.classList.contains("select-mode")) {
      updateSelectHud();
      return;
    }
    setHudLabels(["\u5173\u5361", "\u65f6\u95f4", "\u751f\u547d", "BOSS", "\u51fb\u843d"]);
    if (shared.battleHudView && shared.battleHudView.updateHud) {
      shared.battleHudView.updateHud(state, profile, dom);
    }
  }

  function updateSelectHud() {
    var loadout = shared.combatStats && shared.combatStats.generateBattleLoadout
      ? shared.combatStats.generateBattleLoadout(profile)
      : null;
    var stats = loadout ? loadout.finalStats || {} : {};
    var maxHp = Math.round(stats.maxHp || 100);
    var attack = Math.round(stats.attack || 0);
    var armor = Math.max(0, Math.round(((profile.upgrades && profile.upgrades.armor) || 0) * 20));
    var armorPen = Math.round((stats.armorPenetration || 0) * 100);
    var power = calculateActivePower();

    setHudLabels(["出战战力", "生命", "攻击", "护甲", "破甲"]);
    if (dom.levelLabelEl) dom.levelLabelEl.textContent = power;
    if (dom.timeLabelEl) dom.timeLabelEl.textContent = maxHp;
    if (dom.livesEl) dom.livesEl.textContent = attack;
    if (dom.weaponEl) dom.weaponEl.textContent = armor;
    if (dom.coinsEl) dom.coinsEl.textContent = armorPen + "%";
  }

  function setHudLabels(labels) {
    var nodes = document.querySelectorAll(".hud .label");
    for (var i = 0; i < nodes.length && i < labels.length; i += 1) {
      nodes[i].textContent = labels[i];
    }
  }

  function drawScene() {
    battleRenderer.drawScene(state);
  }

  function getImage(src) {
    return battleRenderer.getImage(src);
  }

  function setImageSource(image, source) {
    if (!image || !source) return;
    image.src = source.indexOf("data:") === 0 ? source : encodeURI(source);
  }

  function applyLobbyPose(image, pose, role) {
    if (!image || !role) return;
    for (var i = 0; i < LOBBY_POSE_FIELDS.length; i++) {
      image.style.removeProperty("--lobby-" + role + "-" + toKebabCase(LOBBY_POSE_FIELDS[i]));
    }

    var defaults = assetsConfig.DEFAULT_LOBBY_POSES && assetsConfig.DEFAULT_LOBBY_POSES[role];
    var nextPose = pose || defaults || {};
    for (var j = 0; j < LOBBY_POSE_FIELDS.length; j++) {
      var field = LOBBY_POSE_FIELDS[j];
      if (nextPose[field] == null) continue;
      image.style.setProperty("--lobby-" + role + "-" + toKebabCase(field), String(nextPose[field]));
    }
  }

  function toKebabCase(value) {
    return String(value).replace(/[A-Z]/g, function replaceUpper(letter) {
      return "-" + letter.toLowerCase();
    });
  }

  function getPilotAsset(id) {
    var pilotId = id || (profile.scene && profile.scene.pilotId) || assetsConfig.DEFAULT_PILOT_ID;
    return (assetsConfig.PILOT_ASSETS || []).find(function find(asset) { return asset.id === pilotId; }) ||
      (assetsConfig.PILOT_ASSETS || [])[0];
  }

  function getShipAsset(id) {
    var shipId = id || (profile.scene && profile.scene.shipId) || assetsConfig.DEFAULT_SHIP_ID;
    return (assetsConfig.SHIP_ASSETS || []).find(function find(asset) { return asset.id === shipId; }) ||
      (assetsConfig.SHIP_ASSETS || [])[0];
  }

  function getBackgroundAsset(id) {
    var backgroundId = id || (profile.scene && profile.scene.backgroundId) || assetsConfig.DEFAULT_BACKGROUND_ID;
    return (assetsConfig.BACKGROUND_ASSETS || []).find(function find(asset) { return asset.id === backgroundId; }) ||
      (assetsConfig.BACKGROUND_ASSETS || [])[0];
  }

  function getPageForLevel(levelId, pageSize) {
    var level = getLevelById(levelId);
    var chapterLevels = levels.filter(function filterLevel(item) {
      return item.chapterIndex === level.chapterIndex;
    });
    var index = chapterLevels.findIndex(function findLevel(item) {
      return item.id === level.id;
    });
    return Math.max(0, Math.floor(Math.max(0, index) / Math.max(1, pageSize || 3)));
  }

  function getMaxPageForChapter(chapterIndex, pageSize) {
    var count = levels.filter(function filterLevel(item) {
      return item.chapterIndex === chapterIndex;
    }).length;
    return Math.max(0, Math.ceil(count / Math.max(1, pageSize || 3)) - 1);
  }

  function getLevelById(levelId) {
    return levels.find(function find(level) { return level.id === levelId; }) || levels[0] || { id: 1, code: "1-1", chapterIndex: 0 };
  }

  function getGold() {
    return shared.profile.getGold ? shared.profile.getGold(profile) : Math.max(0, Number(profile.resources && profile.resources.gold) || 0);
  }

  function setGold(value) {
    if (shared.profile.setGold) shared.profile.setGold(profile, value);
    else {
      profile.resources = profile.resources || {};
      profile.resources.gold = Math.max(0, Math.floor(value || 0));
      profile.coins = profile.resources.gold;
    }
  }

  function addGold(value) {
    setGold(getGold() + Math.max(0, Math.floor(value || 0)));
  }

  function applyBattleExperience(targetProfile, value) {
    var amount = Math.max(0, Math.floor(value || 0));
    targetProfile.player = targetProfile.player || {};
    if (shared.battleRules && shared.battleRules.applyExperience) {
      return shared.battleRules.applyExperience(targetProfile.player, amount);
    }
    var before = createLevelProgressSnapshot(targetProfile.player);
    targetProfile.player.totalExp = Math.max(0, Math.floor(targetProfile.player.totalExp || 0) + amount);
    return { gained: amount, leveled: 0, before: before, after: createLevelProgressSnapshot(targetProfile.player) };
  }

  function createLevelProgressSnapshot(player) {
    if (shared.battleRules && shared.battleRules.createLevelProgressSnapshot) {
      return shared.battleRules.createLevelProgressSnapshot(player);
    }
    player = player || {};
    var level = Math.max(1, Math.floor(Number(player.level) || 1));
    var expMax = Math.max(1, Math.floor(Number(player.expMax) || 1));
    var exp = Math.max(0, Math.min(expMax, Math.floor(Number(player.exp) || 0)));
    return {
      level: level,
      exp: exp,
      expMax: expMax,
      totalExp: Math.max(0, Math.floor(Number(player.totalExp) || 0)),
      percent: Math.round((exp / expMax) * 100),
      isMaxLevel: false
    };
  }

  function getHonorText(player) {
    player = player || {};
    if (player.honorLevel == null && player.badge) return String(player.badge);
    if (shared.profile && shared.profile.honorLevelToText) {
      return shared.profile.honorLevelToText(player.honorLevel);
    }
    if (shared.battleRules && shared.battleRules.honorLevelToText) {
      return shared.battleRules.honorLevelToText(player.honorLevel);
    }
    return String(player.badge || "I");
  }

  function spendEnergy(amount) {
    if (demoConfig.enabled) return true;
    if (shared.profileRuntime && shared.profileRuntime.spendEnergy) {
      var ok = shared.profileRuntime.spendEnergy(profile, amount);
      if (ok) saveProfile();
      renderLobby();
      return ok;
    }
    if (shared.profile.spendEnergy && shared.profile.spendEnergy(profile, amount)) {
      saveProfile();
      renderLobby();
      return true;
    }
    return false;
  }

  function renderVictoryIntro(result) {
    settlementController.renderVictoryIntro(result);
  }

  function renderSettlementChest(result) {
    settlementController.renderSettlementChest(result);
  }

  function renderSettlement(result) {
    settlementController.renderSettlement(result);
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

  function renderFighterUpgradePanel() {
    var loadout = shared.combatStats && shared.combatStats.generateBattleLoadout
      ? shared.combatStats.generateBattleLoadout(profile)
      : null;
    var pilot = loadout && loadout.pilot ? loadout.pilot : (getPilotAsset() || {});
    var ship = loadout && loadout.ship ? loadout.ship : (getShipAsset() || {});
    var commanderLevel = Math.max(1, Math.floor(Number(profile.player && profile.player.level) || 1));
    var maxLevel = levelsConfig.FIGHTER_MAX_UPGRADE_LEVEL || 60;
    var levelCap = Math.min(commanderLevel, maxLevel);
    var breakdown = buildFighterLoadoutBreakdown(loadout);
    var combatPower = calculateFighterPower({
      attack: breakdown.attack.total,
      maxHp: breakdown.hp.total,
      armorPenetration: breakdown.armorPenetration.total
    });

    dom.featurePanelKicker.textContent = "UPGRADE";
    dom.featurePanelTitle.textContent = "战机升级";
    dom.featurePanelBody.textContent = "强化攻击、破甲和生命，升级结果会写入存档并进入下一次出战快照。";
    setFeaturePanelMode("fighter-upgrade-panel");
    dom.featurePanelSlots.className = "fighter-upgrade-ui";
    dom.featurePanelSlots.innerHTML =
      '<div class="fighter-upgrade-toolbar">' +
        '<button type="button" class="fighter-upgrade-back" data-feature-back="lobby"><span aria-hidden="true">‹</span>返回</button>' +
      '</div>' +
      '<section class="fighter-upgrade-showcase">' +
        '<div class="fighter-loadout-score">' +
          '<span>出战战力评分</span>' +
          '<strong>' + formatResource(combatPower) + '</strong>' +
          '<em>当前战姬 + 战机 + 已生效养成</em>' +
        '</div>' +
        '<div class="fighter-loadout-combo">' +
          '<div class="fighter-loadout-unit">' +
            '<span class="asset-rank rank-' + escapeAttr(pilot && pilot.rank || "A") + '">' + escapeHtml(pilot && pilot.rank || "A") + '</span>' +
            '<div><em>战姬</em><strong>' + escapeHtml(pilot && pilot.name || "出战战姬") + '</strong></div>' +
          '</div>' +
          '<div class="fighter-loadout-unit">' +
            '<span class="asset-rank rank-' + escapeAttr(ship && ship.rank || "A") + '">' + escapeHtml(ship && ship.rank || "A") + '</span>' +
            '<div><em>战机</em><strong>' + escapeHtml(ship && ship.name || "出战战机") + '</strong></div>' +
          '</div>' +
        '</div>' +
        '<div class="fighter-loadout-stats">' +
          renderFighterLoadoutStats(breakdown) +
        '</div>' +
        '<div class="fighter-initial-skills">' +
          renderInitialSkillSummary(loadout) +
        '</div>' +
      '</section>' +
      '<section class="fighter-upgrade-rows">' +
        '<div class="fighter-upgrade-section-head">' +
          '<div><span>强化项目</span><strong>选择优先提升项</strong></div>' +
          '<em>收益与消耗按当前等级实时计算</em>' +
        '</div>' +
        buildFighterUpgradeRows(loadout, levelCap, maxLevel) +
      '</section>';
    openFeaturePanelShell("fighter-upgrade-panel");
  }

  function renderInitialSkillSummary(loadout) {
    var initial = loadout && loadout.initialWeapons ? loadout.initialWeapons : {};
    var powerups = levelsConfig.POWERUPS || {};
    var fallbackNames = { spread: "散射", laser: "激光", missile: "导弹" };
    var html = '<div class="fighter-initial-skills-head"><span>开局初始技能</span><em>只读展示，不参与战机强化</em></div>';
    html += '<div class="fighter-initial-skill-list">';
    ["spread", "laser", "missile"].forEach(function renderSkill(key) {
      var level = Math.max(0, Math.floor(Number(initial[key]) || 0));
      var config = powerups[key] || {};
      var name = config.name || fallbackNames[key] || key;
      var mark = config.mark || name.slice(0, 1);
      html += '<div class="fighter-initial-skill">' +
        '<span>' + escapeHtml(mark) + '</span>' +
        '<strong>' + escapeHtml(name) + '</strong>' +
        '<em>' + (level > 0 ? "Lv." + level : "未解锁") + '</em>' +
      '</div>';
    });
    html += '</div>';
    return html;
  }

  function buildFighterLoadoutBreakdown(loadout) {
    loadout = loadout || {};
    var pilot = loadout.pilot || {};
    var ship = loadout.ship || {};
    var fighter = loadout.fighterUpgrades || {};
    var attackLevel = Math.max(1, Math.floor(Number(fighter.attack) || getFighterStatLevel("attack")));
    var hpLevel = Math.max(1, Math.floor(Number(fighter.hp) || getFighterStatLevel("hp")));
    var penLevel = Math.max(1, Math.floor(Number(fighter.armorPenetration) || getFighterStatLevel("armorPenetration")));
    var pilotAttack = Math.max(0, Math.round(Number(pilot.damage) || 0));
    var shipAttack = Math.max(0, Math.round(Number(ship.damage) || 0));
    var upgradeAttack = Math.max(0, Math.round(getFighterAttackBonus(attackLevel)));
    var baseHp = 100;
    var pilotHp = Math.max(0, Math.round(Number(pilot.hp) || 0));
    var shipHp = Math.max(0, Math.round(Number(ship.hp) || 0));
    var upgradeHp = Math.max(0, Math.round(getFighterHpBonus(hpLevel)));
    var pilotPen = Math.max(0, Number(pilot.armorPenetration) || 0);
    var shipPen = Math.max(0, Number(ship.armorPenetration) || 0);
    var upgradePen = Math.max(0, Number(getFighterArmorPenetrationBonus(penLevel)) || 0);
    return {
      attack: { key: "attack", label: "攻击", total: pilotAttack + shipAttack + upgradeAttack, parts: [
        { label: "战姬", value: pilotAttack, type: "number" },
        { label: "战机", value: shipAttack, type: "number" },
        { label: "强化", value: upgradeAttack, type: "number" }
      ] },
      hp: { key: "hp", label: "生命", total: baseHp + pilotHp + shipHp + upgradeHp, parts: [
        { label: "基础", value: baseHp, type: "number" },
        { label: "战姬", value: pilotHp, type: "number" },
        { label: "战机", value: shipHp, type: "number" },
        { label: "强化", value: upgradeHp, type: "number" }
      ] },
      armorPenetration: { key: "armorPenetration", label: "破甲", total: pilotPen + shipPen + upgradePen, parts: [
        { label: "战姬", value: pilotPen, type: "percent" },
        { label: "战机", value: shipPen, type: "percent" },
        { label: "强化", value: upgradePen, type: "percent" }
      ] }
    };
  }

  function renderFighterLoadoutStats(breakdown) {
    var rows = [breakdown.attack, breakdown.hp, breakdown.armorPenetration];
    return rows.map(function renderStat(item) {
      return '<div class="fighter-loadout-stat">' +
        '<span>' + item.label + '</span>' +
        '<strong>' + formatFighterBreakdownTotal(item) + '</strong>' +
        '<em>' + renderFighterBreakdownParts(item.parts) + '</em>' +
      '</div>';
    }).join("");
  }

  function formatFighterBreakdownTotal(item) {
    if (!item) return "0";
    if (item.key === "armorPenetration") return formatPercent(item.total) + "%";
    return formatResource(Math.round(Number(item.total) || 0));
  }

  function renderFighterBreakdownParts(parts) {
    return (parts || []).map(function renderPart(part) {
      if (part.type === "percent") return part.label + " " + formatPercent(part.value) + "%";
      return part.label + " " + formatResource(Math.round(Number(part.value) || 0));
    }).join(" + ");
  }

  function buildFighterUpgradeRows(loadout, levelCap, maxLevel) {
    return [
      { key: "attack", icon: "◎", title: "攻击", level: getFighterStatLevel("attack") },
      { key: "armorPenetration", icon: "◇", title: "破甲", level: getFighterStatLevel("armorPenetration") },
      { key: "hp", icon: "♡", title: "生命", level: getFighterStatLevel("hp") }
    ].map(function renderRow(item) {
      var check = shared.battleRules && shared.battleRules.getFighterUpgradeResult
        ? shared.battleRules.getFighterUpgradeResult(profile, item.key)
        : getFallbackFighterUpgradeResult(item.key);
      var targetLevel = item.level + 1;
      var currentText = formatFighterStatValue(item.key, item.level);
      var nextText = targetLevel <= maxLevel
        ? formatFighterStatValue(item.key, targetLevel)
        : currentText;
      var deltaText = targetLevel <= maxLevel
        ? formatFighterStatDelta(item.key, item.level, targetLevel)
        : "0";
      var status = getFighterUpgradeStatus(item.level, levelCap, maxLevel, check);
      var costText = check && check.cost ? formatResource(check.cost) + " 金币" : "-";
      return '<article class="fighter-upgrade-row ' + (status.disabled ? "disabled" : "ready") + '">' +
        '<div class="fighter-upgrade-icon" aria-hidden="true">' + item.icon + '</div>' +
        '<div class="fighter-upgrade-stat-name"><strong>' + item.title + '</strong><span>Lv.' + item.level + '/' + levelCap + '</span></div>' +
        '<div class="fighter-upgrade-values"><span>当前加成</span><strong>+' + currentText + '</strong></div>' +
        '<div class="fighter-upgrade-values next"><span>下一加成</span><strong>+' + nextText + '</strong></div>' +
        '<div class="fighter-upgrade-values delta"><span>本次提升</span><strong>+' + deltaText + '</strong></div>' +
        '<div class="fighter-upgrade-cost"><span>升级消耗</span><strong>' + costText + '</strong></div>' +
        '<button type="button" data-fighter-upgrade="' + item.key + '"' + (status.disabled ? " disabled" : "") + '>' + status.label + '</button>' +
      '</article>';
    }).join("");
  }

  function upgradeFighterStat(statType) {
    if (gatewayActionBusy) return;
    gatewayActionBusy = true;
    ensureGameGateway().then(function upgradeFighterThroughGateway() {
      return gameGateway.upgradeFighter(statType);
    }).then(function onFighterUpgradeComplete(response) {
      if (response && response.profile) applyGatewayProfile(response.profile);
      saveProfile();
      renderLobby();
      renderChapterSelect();
      updateHud();
      renderFighterUpgradePanel();
    }).catch(function onFighterUpgradeError(error) {
      dom.featurePanelBody.textContent = error && error.message ? error.message : "强化失败，请稍后重试。";
      renderFighterUpgradePanel();
    }).finally(function releaseFighterUpgrade() {
      gatewayActionBusy = false;
    });
  }

  function getFighterStatLevel(statType) {
    profile.fighterUpgrades = profile.fighterUpgrades || {};
    return Math.max(1, Math.floor(Number(profile.fighterUpgrades[statType]) || 1));
  }

  function getFallbackFighterUpgradeResult(statType) {
    var targetLevel = getFighterStatLevel(statType) + 1;
    var commanderLevel = Math.max(1, Math.floor(Number(profile.player && profile.player.level) || 1));
    var maxLevel = levelsConfig.FIGHTER_MAX_UPGRADE_LEVEL || 60;
    var cost = levelsConfig.getFighterUpgradeCost ? levelsConfig.getFighterUpgradeCost(statType, targetLevel) : null;
    if (targetLevel > maxLevel || cost == null) return { canUpgrade: false, reason: "MAX_LEVEL", targetLevel: targetLevel };
    if (targetLevel > commanderLevel) return { canUpgrade: false, reason: "COMMANDER_LEVEL_NOT_ENOUGH", targetLevel: targetLevel, cost: cost };
    if (getGold() < cost) return { canUpgrade: false, reason: "GOLD_NOT_ENOUGH", targetLevel: targetLevel, cost: cost };
    return { canUpgrade: true, targetLevel: targetLevel, cost: cost };
  }

  function getFighterUpgradeStatus(level, levelCap, maxLevel, check) {
    if (level >= maxLevel || (check && check.reason === "MAX_LEVEL")) return { disabled: true, label: "已满级" };
    if (level >= levelCap || (check && check.reason === "COMMANDER_LEVEL_NOT_ENOUGH")) return { disabled: true, label: "等级不足" };
    if (check && check.reason === "GOLD_NOT_ENOUGH") return { disabled: true, label: "金币不足" };
    if (check && check.canUpgrade) return { disabled: false, label: "升级" };
    return { disabled: true, label: "不可升级" };
  }

  function formatFighterStatValue(statType, level) {
    if (statType === "attack") return String(Math.round(getFighterAttackBonus(level)));
    if (statType === "armorPenetration") return formatPercent(getFighterArmorPenetrationBonus(level)) + "%";
    return String(Math.round(getFighterHpBonus(level)));
  }

  function formatFighterStatDelta(statType, currentLevel, targetLevel) {
    var current = getFighterStatNumericValue(statType, currentLevel);
    var next = getFighterStatNumericValue(statType, targetLevel);
    var delta = Math.max(0, next - current);
    if (statType === "armorPenetration") return formatPercent(delta) + "%";
    return formatResource(Math.round(delta));
  }

  function getFighterStatNumericValue(statType, level) {
    if (statType === "attack") return getFighterAttackBonus(level);
    if (statType === "armorPenetration") return getFighterArmorPenetrationBonus(level);
    return getFighterHpBonus(level);
  }

  function getFighterAttackBonus(level) {
    var gain = levelsConfig.FIGHTER_UPGRADE_STAT_GAIN || {};
    var perLevel = Number(gain.attackPerLevel) || 1;
    return Math.max(0, level - 1) * perLevel;
  }

  function getFighterArmorPenetrationBonus(level) {
    var gain = levelsConfig.FIGHTER_UPGRADE_STAT_GAIN || {};
    var perLevel = Number(gain.armorPenetrationPerLevel) || 0.001;
    return Math.max(1, level) * perLevel;
  }

  function getFighterHpBonus(level) {
    var gain = levelsConfig.FIGHTER_UPGRADE_STAT_GAIN || {};
    var perLevel = Number(gain.hpPerLevel) || 10;
    return Math.max(0, level - 1) * perLevel;
  }

  function formatPercent(value) {
    var percent = Math.round((Number(value) || 0) * 1000) / 10;
    return percent % 1 === 0 ? String(percent) : percent.toFixed(1);
  }

  function calculateFighterPower(stats) {
    stats = stats || {};
    return Math.round(
      Math.max(0, Number(stats.attack) || 0) * 10 +
      Math.max(0, Number(stats.maxHp) || 100) * 2 +
      Math.max(0, Number(stats.armorPenetration) || 0) * 100 * 18
    );
  }

  function renderPilotGalleryPanel() {
    dom.featurePanelKicker.textContent = "PILOT DOSSIER";
    dom.featurePanelTitle.textContent = "战姬档案";
    dom.featurePanelBody.textContent = "查看战姬档案与核心战斗属性，选择当前出战成员。";
    setFeaturePanelMode("pilot-dossier-panel");
    reRenderPilotGallery();
    openFeaturePanelShell("pilot-dossier-panel");
  }

  function reRenderPilotGallery() {
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
    dom.featurePanelKicker.textContent = "FIGHTER HANGAR";
    dom.featurePanelTitle.textContent = "战机机库";
    dom.featurePanelBody.textContent = "查看战机档案与核心战斗属性，选择当前出战机体。";
    setFeaturePanelMode("ship-hangar-panel");
    reRenderShipGallery();
    openFeaturePanelShell("ship-hangar-panel");
  }

  function reRenderShipGallery() {
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

  function renderProfilePanel() {
    shared.profile.recoverEnergy(profile);
    var player = profile.player || {};
    var progress = createLevelProgressSnapshot(player);
    var pilot = getPilotAsset() || {};
    var ship = getShipAsset() || {};
    var power = getTotalPowerBreakdown();
    var record = getProfileRecordSnapshot();
    var uid = String(player.uid || "").replace(/\D/g, "");

    setFeaturePanelMode("profile-dossier-panel");
    dom.featurePanelKicker.textContent = "";
    dom.featurePanelTitle.textContent = "玩家资料";
    dom.featurePanelBody.textContent = "公开名片与作战档案";
    dom.featurePanelSlots.className = "player-profile-page";
    dom.featurePanelSlots.innerHTML =
      '<section class="player-profile-identity-card">' +
        '<div class="player-profile-avatar-column">' +
          '<img class="player-profile-avatar" src="' + escapeAttr(player.avatar || assetsConfig.DEFAULT_AVATAR || "") + '" alt="玩家头像">' +
          '<div class="player-profile-avatar-actions"><button type="button" data-profile-action="upload-avatar">更换头像</button><button type="button" class="is-secondary" data-profile-action="reset-avatar">恢复默认</button></div>' +
        '</div>' +
        '<div class="player-profile-identity">' +
          '<div class="player-profile-name-row"><input id="profileNameInput" class="player-profile-name-input" aria-label="玩家昵称" maxlength="12" value="' + escapeAttr(player.name || "王牌飞行员") + '"><span class="player-profile-title">星港先锋</span></div>' +
          '<div class="player-profile-meta-row"><span>UID</span><strong>' + escapeHtml(uid ? formatUid(uid) : "离线未分配") + '</strong><button type="button" data-profile-action="copy-uid"' + (uid ? '' : ' disabled') + '>复制</button><span class="player-profile-sync-state ' + (uid ? 'is-synced' : 'is-offline') + '">' + (uid ? '身份已同步' : '离线') + '</span></div>' +
          '<label class="player-profile-signature-label" for="profileSignatureInput">个性签名</label>' +
          '<input id="profileSignatureInput" class="player-profile-signature-input" maxlength="36" value="' + escapeAttr(player.signature || "保持航线，火力覆盖。") + '">' +
          '<div class="player-profile-progress-row">' +
            '<span>Lv.' + progress.level + '</span><span>荣誉 ' + escapeHtml(getHonorText(player)) + '</span>' +
            '<div class="player-profile-exp"><i style="width:' + progress.percent + '%"></i></div>' +
            '<strong>' + escapeHtml(progress.isMaxLevel ? "MAX" : progress.exp + "/" + progress.expMax) + '</strong>' +
          '</div>' +
        '</div>' +
        '<div class="player-profile-power-card"><span>总战力</span><strong>' + formatResource(power.total) + '</strong>' +
          '<div><em>战姬</em><b>' + formatResource(power.pilotTotal) + '</b></div><div><em>战机</em><b>' + formatResource(power.shipTotal) + '</b></div><div><em>强化</em><b>' + formatResource(power.sharedUpgradePower) + '</b></div>' +
        '</div>' +
      '</section>' +
      '<section class="player-profile-public-metrics">' + renderProfileMetric("最高章节", record.highestChapterLabel) + renderProfileMetric("成就进度", record.achievementProgress) + renderProfileMetric("总出击", formatResource(record.sorties)) + renderProfileMetric("最高荣誉", record.bestHonorLabel) + '</section>' +
      '<nav class="player-profile-tabs" aria-label="玩家资料分页">' +
        renderProfileTab("overview", "总览") +
        renderProfileTab("record", "战绩") +
        renderProfileTab("lineup", "展示阵容") +
      '</nav>' +
      '<section class="player-profile-tab-body">' + renderProfileTabBody(profilePanelTab, progress, pilot, ship, power, record) + '</section>' +
      '<footer class="player-profile-actions">' +
        '<button type="button" data-profile-action="save-profile">保存资料</button>' +
        '<button type="button" class="is-secondary" data-profile-action="close">关闭</button>' +
      '</footer>';
    openFeaturePanelShell("profile-dossier-panel");
  }

  function renderProfileMetric(label, value) {
    return '<article class="player-profile-metric"><span>' + escapeHtml(label) + '</span><strong>' + escapeHtml(value) + '</strong></article>';
  }

  function renderProfileTab(id, label) {
    return '<button type="button" class="' + (profilePanelTab === id ? "is-active" : "") + '" data-profile-tab="' + id + '">' + escapeHtml(label) + '</button>';
  }

  function renderProfileTabBody(tab, progress, pilot, ship, power, record) {
    if (tab === "record") return renderProfileRecord(record);
    if (tab === "lineup") return renderProfileLineup(pilot, ship);
    return renderProfileOverview(progress, pilot, ship, power);
  }

  function renderProfileOverview(progress, pilot, ship, power) {
    return '<div class="player-profile-overview">' +
      '<article class="player-profile-lineup-summary"><span>当前展示阵容</span><div>' + renderProfileUnit(pilot, "战姬", "pilot") + renderProfileUnit(ship, "战机", "ship") + '</div></article>' +
      '<article class="player-profile-career-summary"><span>指挥官档案</span><div class="player-profile-detail-grid">' +
        renderProfileDetail("指挥官等级", "Lv." + progress.level) + renderProfileDetail("累计经验", formatResource(progress.totalExp)) + renderProfileDetail("收藏总战力", formatResource(power.total)) + renderProfileDetail("出战战力", formatResource(calculateActivePower())) +
      '</div></article></div>';
  }

  function renderProfileUnit(asset, typeLabel, type) {
    var unitPower = shared.combatStats && shared.combatStats.calculateUnitPower ? shared.combatStats.calculateUnitPower(asset, type) : 0;
    return '<div class="player-profile-unit"><img src="' + escapeAttr(asset && asset.src || "") + '" alt=""><span>' + escapeHtml(typeLabel) + '</span><strong>' + escapeHtml(asset && asset.name || "未配置") + '</strong><em>战力 ' + formatResource(unitPower) + '</em></div>';
  }

  function getProfileRecordSnapshot() {
    var profileProgress = profile.progress || {};
    var completed = Array.isArray(profile.completed) ? profile.completed : [];
    var stageHonors = profileProgress.stageHonors || {};
    var bestHonor = Object.keys(stageHonors).reduce(function maxHonor(max, key) {
      return Math.max(max, Math.floor(Number(stageHonors[key]) || 0));
    }, 0);
    var highestChapter = completed.reduce(function maxChapter(max, levelId) {
      var level = getLevelById(levelId);
      return Math.max(max, Math.floor(Number(level && level.chapterIndex) || 0));
    }, 0);
    var achievements = shared.featurePanelContent && shared.featurePanelContent.ACHIEVEMENT_CONTENT || [];
    var completedAchievements = achievements.filter(function (item) {
      return getProfileAchievementMetric(item, profileProgress, bestHonor) >= Math.max(1, Number(item.target) || 1);
    }).length;
    return {
      completedCount: completed.length,
      highestChapterLabel: highestChapter > 0 ? "第 " + highestChapter + " 章" : "序章",
      bestHonorLabel: bestHonor ? "Tier " + bestHonor : "未记录",
      perfectClearCount: Math.max(0, Math.floor(Number(profileProgress.perfectClearCount) || 0)),
      noDamageBossClearCount: Math.max(0, Math.floor(Number(profileProgress.noDamageBossClearCount) || 0)),
      sorties: Math.max(completed.length, Math.floor(Number(profileProgress.clearCount) || 0)),
      achievementProgress: completedAchievements + "/" + achievements.length
    };
  }

  function getProfileAchievementMetric(item, progress, bestHonor) {
    var metric = String(item && item.metric || "");
    var fighter = profile.fighterUpgrades || {};
    var owned = profile.owned || {};
    if (metric === "clearCount") return Math.max((profile.completed || []).length, Number(progress.clearCount) || 0);
    if (metric === "perfectClearCount") return Number(progress.perfectClearCount) || 0;
    if (metric === "noDamageBossClearCount") return Number(progress.noDamageBossClearCount) || 0;
    if (metric === "upgradeTotal") return (Number(fighter.attack) || 0) + (Number(fighter.hp) || 0) + (Number(fighter.armorPenetration) || 0);
    if (metric === "ownedPilots") return Array.from(new Set(owned.pilots || [])).length;
    if (metric === "ownedShips") return Array.from(new Set(owned.ships || [])).length;
    if (metric === "ownedSRank") {
      var pilotIds = new Set(owned.pilots || []);
      var shipIds = new Set(owned.ships || []);
      return (assetsConfig.PILOT_ASSETS || []).some(function (asset) { return asset.rank === "S" && pilotIds.has(asset.id); }) || (assetsConfig.SHIP_ASSETS || []).some(function (asset) { return asset.rank === "S" && shipIds.has(asset.id); }) ? 1 : 0;
    }
    if (metric === "bestHonor") return bestHonor;
    if (metric.indexOf("stage:") === 0) return (progress.clearedStageIds || []).indexOf(metric.slice(6)) >= 0 ? 1 : 0;
    if (metric.indexOf("upgrade:") === 0) return Number(fighter[metric.slice(8)]) || 0;
    return 0;
  }

  function renderProfileRecord(record) {
    return '<div class="player-profile-detail-grid is-record">' + renderProfileDetail("已通关关卡", String(record.completedCount)) + renderProfileDetail("最高章节", record.highestChapterLabel) + renderProfileDetail("最高荣誉", record.bestHonorLabel) + renderProfileDetail("完美通关", String(record.perfectClearCount)) + renderProfileDetail("无伤 Boss", String(record.noDamageBossClearCount)) + renderProfileDetail("总出击", String(record.sorties)) + '</div>';
  }

  function renderProfileLineup(pilot, ship) {
    return '<div class="player-profile-lineup-detail">' + renderProfileUnit(pilot, "展示战姬", "pilot") + renderProfileUnit(ship, "展示战机", "ship") + '<article class="player-profile-active-power"><span>出战战力</span><strong>' + formatResource(calculateActivePower()) + '</strong><p>切换展示阵容会改变出战战力，不会改变收藏总战力。</p></article></div>';
  }

  function renderProfileDetail(label, value) {
    return '<article class="player-profile-detail"><span>' + escapeHtml(label) + '</span><strong>' + escapeHtml(value) + '</strong></article>';
  }

  function formatUid(uid) {
    return String(uid || "").replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  }

  function getTotalPowerBreakdown() {
    return shared.combatStats && shared.combatStats.calculateTotalPower ? shared.combatStats.calculateTotalPower(profile) : { total: 0, pilotTotal: 0, shipTotal: 0, sharedUpgradePower: 0, pilots: [], ships: [] };
  }

  function calculateTotalPower() {
    return getTotalPowerBreakdown().total;
  }

  function calculateActivePower() {
    return shared.combatStats && shared.combatStats.calculateActivePower ? shared.combatStats.calculateActivePower(profile) : 0;
  }

  function openFeaturePanel(key) {
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

  function handleAvatarUpload(event) {
    var file = event.target.files && event.target.files[0];
    if (!file || !file.type || file.type.indexOf("image/") !== 0) return;
    var reader = new FileReader();
    reader.addEventListener("load", function loaded() {
      resizeAvatarDataUrl(String(reader.result || ""), function resized(dataUrl) {
        profile.player = profile.player || {};
        profile.player.avatar = dataUrl || assetsConfig.DEFAULT_AVATAR;
        persistProfileMetadata().catch(function keepLocalAvatar() {});
        renderLobby();
        renderProfilePanel();
      });
    });
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  function resizeAvatarDataUrl(source, done) {
    if (!source) {
      done("");
      return;
    }
    var image = new Image();
    image.addEventListener("load", function onLoad() {
      var size = 512;
      var canvasEl = document.createElement("canvas");
      var context = canvasEl.getContext("2d");
      var side = Math.min(image.naturalWidth || image.width, image.naturalHeight || image.height);
      var sx = Math.max(0, ((image.naturalWidth || image.width) - side) / 2);
      var sy = Math.max(0, ((image.naturalHeight || image.height) - side) / 2);
      canvasEl.width = size;
      canvasEl.height = size;
      context.drawImage(image, sx, sy, side, side, 0, 0, size, size);
      done(canvasEl.toDataURL("image/jpeg", 0.86));
    });
    image.addEventListener("error", function onError() {
      done(source);
    });
    image.src = source;
  }

  function handleProfilePanelClick(event) {
    var tab = event.target && event.target.closest ? event.target.closest("[data-profile-tab]") : null;
    if (tab) {
      profilePanelTab = tab.dataset.profileTab || "overview";
      renderProfilePanel();
      return;
    }
    var action = event.target && event.target.closest ? event.target.closest("[data-profile-action]") : null;
    if (!action) return;
    var type = action.dataset.profileAction;
    if (type === "copy-uid") {
      copyProfileUid(action);
      return;
    }
    if (type === "upload-avatar" && dom.avatarUpload) {
      dom.avatarUpload.click();
    }
    if (type === "reset-avatar") {
      profile.player = profile.player || {};
      profile.player.avatar = assetsConfig.DEFAULT_AVATAR || "";
      persistProfileMetadata().catch(function keepLocalAvatarReset() {});
      renderLobby();
      renderProfilePanel();
    }
    if (type === "save-profile") {
      var nameInput = document.querySelector("#profileNameInput");
      var signatureInput = document.querySelector("#profileSignatureInput");
      var nextName = String(nameInput && nameInput.value ? nameInput.value : "").trim().slice(0, 12);
      var nextSignature = String(signatureInput && signatureInput.value ? signatureInput.value : "").trim().slice(0, 36);
      profile.player = profile.player || {};
      profile.player.name = nextName || "王牌飞行员";
      profile.player.signature = nextSignature || "保持航线，火力覆盖。";
      persistProfileMetadata().catch(function keepLocalProfileEdit() {});
      renderLobby();
      renderProfilePanel();
    }
    if (type === "close") {
      closeFeaturePanel();
    }
  }

  function copyProfileUid(button) {
    var uid = String(profile.player && profile.player.uid || "").replace(/\D/g, "");
    if (!uid) return;
    var copied = root.navigator && root.navigator.clipboard && root.navigator.clipboard.writeText
      ? root.navigator.clipboard.writeText(uid)
      : Promise.resolve(copyTextFallback(uid));
    copied.then(function onCopied() {
      button.textContent = "已复制";
      root.setTimeout(function restoreCopyLabel() { if (button && button.isConnected) button.textContent = "复制"; }, 1200);
    }).catch(function fallbackCopy() {
      if (copyTextFallback(uid)) button.textContent = "已复制";
    });
  }

  function copyTextFallback(value) {
    var field = document.createElement("textarea");
    field.value = value;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.appendChild(field);
    field.select();
    var copied = false;
    try { copied = document.execCommand("copy"); } catch (error) { copied = false; }
    document.body.removeChild(field);
    return copied;
  }

  function syncPlayerIdentity() {
    if (!root.RXCloud || !root.RXCloud.configured || !root.RXCloud.configured() || !root.RXCloud.identity) return;
    root.RXCloud.identity().then(function applyIdentity(result) {
      var uid = String(result && result.uid || "").replace(/\D/g, "");
      if (!uid || uid === String(profile.player && profile.player.uid || "")) return;
      profile.player = profile.player || {};
      profile.player.uid = uid;
      saveProfile();
      renderLobby();
      if (dom.featurePanel && !dom.featurePanel.classList.contains("hidden") && dom.featurePanel.classList.contains("profile-dossier-panel")) renderProfilePanel();
    }).catch(function keepCachedIdentity() {});
  }

  function setFeaturePanelMode(modeClass) {
    if (!dom.featurePanel) return;
    for (var i = 0; i < FEATURE_PANEL_MODE_CLASSES.length; i++) {
      dom.featurePanel.classList.remove(FEATURE_PANEL_MODE_CLASSES[i]);
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

  function bindEvents() {
    root.addEventListener("pointerdown", unlockAudio, { once: true });
    root.addEventListener("click", unlockAudio, { once: true });
    root.addEventListener("touchstart", unlockAudio, { once: true, passive: true });
    root.addEventListener("keydown", unlockAudio, { once: true });
    document.addEventListener("click", handleStoryReplayClick, true);
    document.addEventListener("click", function onAnyUiClick(event) {
      if (event.target && event.target.closest && event.target.closest("button")) playSfx("button");
    });
    dom.startButton.addEventListener("click", function onStart() {
      if (state.mode === "settlement-error") settlePendingBattle();
      else if (state.mode === "paused") resumeGame();
      else startSelectedLevel();
    });
    dom.battleEntryButton.addEventListener("click", openBattleSelect);
    if (dom.pauseButton) {
      dom.pauseButton.addEventListener("click", function onPause() {
        if (state.mode === "paused") resumeGame();
        else pauseGame();
      });
    }
    if (dom.activeSkillButton) {
      dom.activeSkillButton.addEventListener("click", function onActiveSkillClick() {
        tryCastActiveSkill();
      });
    }
    if (dom.shopButton) {
      dom.shopButton.addEventListener("click", function onShop() {
        if (battleContext) cancelAnimationFrame(battleContext.animationId);
        state.mode = "shop";
        renderShop();
        showShop();
      });
    }
    dom.replayButton.addEventListener("click", startSelectedLevel);
    dom.backToChapterButton.addEventListener("click", openBattleSelect);
    dom.nextLevelButton.addEventListener("click", function onNext() {
      if (lastBattleResult && !lastBattleResult.isWin) {
        startSelectedLevel();
        return;
      }
      selectedLevel = clamp(selectedLevel + 1, 1, levels.length);
      openBattleSelect();
    });
    dom.upgradeList.addEventListener("click", function onSettlementChest(event) {
      var reportAction = event.target && event.target.closest ? event.target.closest("[data-settlement-action]") : null;
      if (reportAction) {
        var action = reportAction.dataset ? reportAction.dataset.settlementAction : "";
        if (action === "next") dom.nextLevelButton.click();
        if (action === "replay") dom.replayButton.click();
        if (action === "chapter") dom.backToChapterButton.click();
        return;
      }
      var victoryChest = event.target && event.target.closest ? event.target.closest("[data-open-victory-chest]") : null;
      if (victoryChest && lastBattleResult) {
        renderSettlementChest(lastBattleResult);
        return;
      }
      var target = event.target && event.target.closest ? event.target.closest("[data-open-settlement]") : null;
      if (target && lastBattleResult) {
        playSfx("chest");
        renderSettlement(lastBattleResult);
      }
    });
    dom.chapterSelect.addEventListener("click", function onPauseAction(event) {
      var action = event.target && event.target.dataset ? event.target.dataset.pauseAction : "";
      if (!action) return;
      if (action === "resume") resumeGame();
      if (action === "chapter") abortBattle("chapter");
      if (action === "lobby") abortBattle("lobby");
    });
    dom.closeFeaturePanel.addEventListener("click", function close() {
      closeFeaturePanel();
    });
    dom.featurePanel.addEventListener("click", function onFighterUpgradeClick(event) {
      if (handleSettingPanelClick(event)) return;
      if (shared.starWingsGachaView && shared.starWingsGachaView.handleEvent && shared.starWingsGachaView.handleEvent(event, dom)) {
        playSfx("button");
        return;
      }
      if (shared.mainFeaturePanelsView && shared.mainFeaturePanelsView.handleEvent && shared.mainFeaturePanelsView.handleEvent(event, dom, {
        profile: profile,
        levels: levels,
        combatPower: calculateTotalPower(),
        audioSettings: audioSystem && audioSystem.getSettings ? audioSystem.getSettings() : null
      })) {
        playSfx("button");
        return;
      }
      var activityClaim = event.target && event.target.closest ? event.target.closest("[data-activity-claim]") : null;
      if (activityClaim && !activityClaim.disabled && shared.mainFeaturePanelsView && shared.mainFeaturePanelsView.claimActivityReward) {
        if (isCloudMode()) {
          dom.featurePanelBody.textContent = "正式服活动奖励将在服务端活动接口开放后领取。";
          return;
        }
        var activityResult = shared.mainFeaturePanelsView.claimActivityReward(profile, activityClaim.dataset.activityClaim, { levels: levels });
        if (activityResult && activityResult.ok) {
          playSfx("button");
          saveProfile();
          renderLobby();
          shared.mainFeaturePanelsView.renderPanel("task", dom, {
            profile: profile,
            levels: levels,
            combatPower: calculateTotalPower(),
            audioSettings: audioSystem && audioSystem.getSettings ? audioSystem.getSettings() : null
          });
        }
        return;
      }
      var achievementClaim = event.target && event.target.closest ? event.target.closest("[data-achievement-claim]") : null;
      if (achievementClaim && !achievementClaim.disabled && shared.mainFeaturePanelsView && shared.mainFeaturePanelsView.claimAchievement) {
        if (isCloudMode()) {
          dom.featurePanelBody.textContent = "正式服成就奖励将在服务端成就接口开放后领取。";
          return;
        }
        var achievementResult = shared.mainFeaturePanelsView.claimAchievement(profile, achievementClaim.dataset.achievementClaim, { levels: levels });
        if (achievementResult && achievementResult.ok) {
          playSfx("button");
          saveProfile();
          renderLobby();
          shared.mainFeaturePanelsView.renderPanel("achievement", dom, {
            profile: profile,
            levels: levels,
            combatPower: calculateTotalPower(),
            audioSettings: audioSystem && audioSystem.getSettings ? audioSystem.getSettings() : null
          });
        }
        return;
      }
      var taskClaim = event.target && event.target.closest ? event.target.closest("[data-task-claim]") : null;
      if (taskClaim && !taskClaim.disabled && shared.mainFeaturePanelsView && shared.mainFeaturePanelsView.claimTask) {
        if (isCloudMode()) {
          dom.featurePanelBody.textContent = "正式服任务奖励将在服务端任务接口开放后领取。";
          return;
        }
        var claimResult = shared.mainFeaturePanelsView.claimTask(profile, taskClaim.dataset.taskClaim, { levels: levels });
        if (claimResult && claimResult.ok) {
          playSfx("button");
          saveProfile();
          renderLobby();
          shared.mainFeaturePanelsView.renderPanel("task", dom, {
            profile: profile,
            levels: levels,
            combatPower: calculateTotalPower(),
            audioSettings: audioSystem && audioSystem.getSettings ? audioSystem.getSettings() : null
          });
        }
        return;
      }
      var back = event.target && event.target.closest ? event.target.closest("[data-feature-back]") : null;
      if (back) {
        closeFeaturePanel();
        return;
      }
      var target = event.target && event.target.closest ? event.target.closest("[data-fighter-upgrade]") : null;
      if (!target || target.disabled) return;
      upgradeFighterStat(target.dataset.fighterUpgrade);
    });
    dom.featurePanel.addEventListener("click", function closeBackdrop(event) {
      handleProfilePanelClick(event);
      if (event.target === dom.featurePanel) closeFeaturePanel();
    });
    dom.featurePanel.addEventListener("input", handleSettingPanelInput);
    dom.featurePanel.addEventListener("change", handleSettingPanelInput);
    if (dom.avatarUpload) dom.avatarUpload.addEventListener("change", handleAvatarUpload);
    Array.prototype.forEach.call(document.querySelectorAll(".lobby-action"), function bind(button) {
      button.addEventListener("click", function openPanel() {
        openFeaturePanel(button.dataset.panel);
      });
    });

    root.addEventListener("keydown", function onKeyDown(event) {
      var gameKey = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "KeyA", "KeyD", "KeyW", "KeyS", "Space"].indexOf(event.code) >= 0;
      if (gameKey) event.preventDefault();
      keys.add(event.code);
      if (event.code === "Space" && event.repeat) return;
      if (event.code === "Space" && state.mode === "fight" && shared.weaponSystem) {
        if (!tryCastActiveSkill()) shared.weaponSystem.shoot(state, currentLoadout, state.bullets);
      }
      if (event.code === "KeyP") {
        if (state.mode === "paused") resumeGame();
        else pauseGame();
      }
    });

    root.addEventListener("keyup", function onKeyUp(event) {
      keys.delete(event.code);
    });
    root.addEventListener("resize", syncLobbyViewportScale);

    canvas.addEventListener("pointerdown", function onPointerDown(event) {
      pointer.active = true;
      updatePointer(event);
      canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener("pointermove", function onPointerMove(event) {
      if (pointer.active) updatePointer(event);
    });
    canvas.addEventListener("pointerup", function onPointerUp(event) {
      pointer.active = false;
      canvas.releasePointerCapture(event.pointerId);
    });
    canvas.addEventListener("pointercancel", function onPointerCancel() {
      pointer.active = false;
    });
  }

  function tryCastActiveSkill() {
    if (!state || state.mode !== "fight" || !shared.weaponSystem || !shared.weaponSystem.tryCastActiveSkill) return false;
    var casted = shared.weaponSystem.tryCastActiveSkill(state, currentLoadout);
    if (casted) {
      playSfx("skill");
      updateHud();
      drawScene();
    }
    return casted;
  }

  function unlockAudio() {
    if (!audioSystem || !audioSystem.unlock) return;
    audioSystem.unlock();
    if (state && state.mode === "fight") audioSystem.playBgm("battle");
    else audioSystem.playBgm("lobby");
  }

  function playSfx(id) {
    if (audioSystem && audioSystem.playSfx) audioSystem.playSfx(id);
  }

  function refreshSettingPanel() {
    if (!dom.featurePanel || dom.featurePanel.classList.contains("hidden")) return;
    if (!dom.featurePanelTitle || dom.featurePanelTitle.textContent !== "设置") return;
    if (!shared.mainFeaturePanelsView || !shared.mainFeaturePanelsView.renderPanel) return;
    shared.mainFeaturePanelsView.renderPanel("setting", dom, {
      profile: profile,
      levels: levels,
      combatPower: calculateTotalPower(),
      audioSettings: audioSystem && audioSystem.getSettings ? audioSystem.getSettings() : null
    });
  }

  function handleSettingPanelClick(event) {
    if (!audioSystem) return false;
    var toggle = event.target && event.target.closest ? event.target.closest("[data-audio-toggle]") : null;
    if (toggle) {
      unlockAudio();
      if (toggle.dataset.audioToggle === "music" && audioSystem.setMusicMuted) {
        var musicMuted = audioSystem.getSettings && audioSystem.getSettings().musicMuted;
        audioSystem.setMusicMuted(!musicMuted);
      }
      if (toggle.dataset.audioToggle === "sfx" && audioSystem.setSfxMuted) {
        var sfxMuted = audioSystem.getSettings && audioSystem.getSettings().sfxMuted;
        audioSystem.setSfxMuted(!sfxMuted);
      }
      refreshSettingPanel();
      return true;
    }
    var action = event.target && event.target.closest ? event.target.closest("[data-setting-action]") : null;
    if (action && action.dataset.settingAction === "restart-bgm" && audioSystem.restartBgm) {
      unlockAudio();
      audioSystem.restartBgm();
      refreshSettingPanel();
      return true;
    }
    return false;
  }

  function handleSettingPanelInput(event) {
    if (!audioSystem) return;
    var input = event.target && event.target.closest ? event.target.closest("[data-audio-volume]") : null;
    if (!input) return;
    var value = Math.max(0, Math.min(1, Number(input.value || 0) / 100));
    unlockAudio();
    if (input.dataset.audioVolume === "music" && audioSystem.setMusicVolume) {
      audioSystem.setMusicVolume(value);
    }
    if (input.dataset.audioVolume === "sfx" && audioSystem.setSfxVolume) {
      audioSystem.setSfxVolume(value);
    }
    var row = input.closest(".settings-control-row");
    if (row) {
      var text = row.querySelector("p");
      if (text) text.textContent = "当前 " + Math.round(value * 100) + "%，拖动后即时生效。";
    }
  }

  function updatePointer(event) {
    var rect = canvas.getBoundingClientRect();
    pointer.x = clamp(((event.clientX - rect.left) / rect.width) * WIDTH, BATTLE_SAFE_LEFT, WIDTH - 38);
    pointer.y = clamp(((event.clientY - rect.top) / rect.height) * HEIGHT, 42, HEIGHT - 42);
  }

  function createStars() {
    var stars = [];
    for (var i = 0; i < 110; i += 1) {
      stars.push({
        x: Math.random() * WIDTH,
        y: Math.random() * HEIGHT,
        size: Math.random() * 1.8 + 0.5,
        speed: Math.random() * 120 + 70
      });
    }
    return stars;
  }

  function formatResource(value) {
    var number = Number(value) || 0;
    if (number >= 1000000) return (number / 1000000).toFixed(1) + "M";
    if (number >= 10000) return (number / 1000).toFixed(1) + "K";
    return String(Math.floor(number));
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, Number(value) || min));
  }
  }

  var scope = root.RXGame || (root.RXGame = {});
  scope.gameApp = { boot: boot };
})(typeof globalThis !== "undefined" ? globalThis : window);
