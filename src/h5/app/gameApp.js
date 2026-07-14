(function registerH5GameApp(root) {
  "use strict";
  function boot() {
  var shared = root.RXGame || {};
  var battleUiHandle = shared.battleUiView && shared.battleUiView.mount
    ? shared.battleUiView.mount(document.querySelector("#battleUiRoot"))
    : null;
  var canvas = battleUiHandle && battleUiHandle.canvas;
  var ctx = canvas ? canvas.getContext("2d") : null;
  if (!canvas || !ctx || !battleUiHandle || !shared.levels || !shared.assets || !shared.profile) {
    throw new Error("H5 game bootstrap failed: missing canvas or shared modules.");
  }

  var WIDTH = canvas.width;
  var HEIGHT = canvas.height;
  var battleField = shared.battleGeometry.getField();
  var BATTLE_SAFE_LEFT = battleField.playerLeft;
  var keys = new Set();
  var pointer = { active: false, x: BATTLE_SAFE_LEFT, y: HEIGHT / 2 };
  root.rxKeys = keys;
  root.rxPointer = pointer;

  var dom = {
    battleUiRoot: document.querySelector("#battleUiRoot"),
    overlay: document.querySelector("#overlay"),
    messageEl: document.querySelector("#message"),
    startButton: document.querySelector("#startButton"),
    pauseButton: battleUiHandle.elements.pauseButton,
    decisiveCommandButton: battleUiHandle.elements.decisiveCommandButton,
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
  var finished = false;
  var gameGateway = null;
  var gatewayReadyPromise = null;
  var gatewayError = null;
  var gatewayActionLock = { busy: false };
  var pendingSettlement = null;
  var battleUiController = shared.battleUiController && shared.battleUiController.create({
    view: battleUiHandle,
    getState: function getStateForUi() { return state; },
    getLoadout: function getLoadoutForUi() {
      return currentLoadout || (shared.combatStats && shared.combatStats.generateBattleLoadout
        ? shared.combatStats.generateBattleLoadout(profile)
        : null);
    },
    renderInterval: 100
  });
  if (!battleUiController) throw new Error("H5 game bootstrap failed: missing battle UI controller.");
  var settlementController = shared.settlementController && shared.settlementController.create({
    dom: dom,
    assetsConfig: assetsConfig,
    getPilotAsset: getPilotAsset,
    getSettlementStoryMessage: function getSettlementStoryMessage(result, fallback) { return battleFlowController.getSettlementStoryMessage(result, fallback); },
    onResult: function rememberSettlementResult(result) {
      lastBattleResult = result;
    }
  });
  if (!settlementController) throw new Error("H5 game bootstrap failed: missing settlement controller.");

  var lobbyController = shared.lobbyController && shared.lobbyController.create({
    shared: shared,
    dom: dom,
    assetsConfig: assetsConfig,
    levels: levels,
    upgrades: upgrades,
    demoConfig: demoConfig,
    audioSystem: audioSystem,
    gatewayActionLock: gatewayActionLock,
    getProfile: function getProfile() { return profile; },
    getState: function getState() { return state; },
    setState: function setState(value) { state = value; },
    getBattleContext: function getBattleContext() { return battleContext; },
    setBattleContext: function setBattleContext(value) { battleContext = value; },
    getBattleSession: function getBattleSession() { return battleSession; },
    setBattleSession: function setBattleSession(value) { battleSession = value; },
    getSelectedLevel: function getSelectedLevel() { return selectedLevel; },
    setSelectedLevel: function setSelectedLevel(value) { selectedLevel = value; },
    getSelectedChapter: function getSelectedChapter() { return selectedChapter; },
    setSelectedChapter: function setSelectedChapter(value) { selectedChapter = value; },
    getGameGateway: function getGameGateway() { return gameGateway; },
    createMenuState: createMenuState,
    getLevelById: getLevelById,
    updateHud: renderBattleUi,
    drawScene: drawScene,
    playCampaignStoryReplay: function playCampaignStoryReplay(level) { return battleFlowController.playCampaignStoryReplay(level); },
    closeFeaturePanel: function closeFeaturePanel() { return featurePanelController && featurePanelController.close(); },
    ensureGameGateway: ensureGameGateway,
    applyGatewayProfile: applyGatewayProfile,
    saveProfile: saveProfile,
    setImageSource: setImageSource,
    applyLobbyPose: applyLobbyPose,
    getPilotAsset: getPilotAsset,
    getShipAsset: getShipAsset,
    getBackgroundAsset: getBackgroundAsset,
    createLevelProgressSnapshot: createLevelProgressSnapshot,
    getHonorText: getHonorText,
    formatResource: formatResource,
    getGold: getGold,
    clamp: clamp
  });
  if (!lobbyController) throw new Error("H5 game bootstrap failed: missing lobby controller.");

  var profileController = shared.profileController && shared.profileController.create({
    shared: shared,
    dom: dom,
    assetsConfig: assetsConfig,
    getProfile: function getProfile() { return profile; },
    createLevelProgressSnapshot: createLevelProgressSnapshot,
    getHonorText: getHonorText,
    getPilotAsset: getPilotAsset,
    getShipAsset: getShipAsset,
    getLevelById: getLevelById,
    setFeaturePanelMode: function setFeaturePanelMode(mode) { return featurePanelController && featurePanelController.setMode(mode); },
    openFeaturePanelShell: function openFeaturePanelShell(mode) { return featurePanelController && featurePanelController.openShell(mode); },
    closeFeaturePanel: function closeFeaturePanel() { return featurePanelController && featurePanelController.close(); },
    persistProfileMetadata: function persistProfileMetadata() { return battleFlowController.persistProfileMetadata(); },
    renderLobby: lobbyController.renderLobby
  });
  if (!profileController) throw new Error("H5 game bootstrap failed: missing profile controller.");

  var fighterUpgradeController = shared.fighterUpgradeController && shared.fighterUpgradeController.create({
    shared: shared,
    dom: dom,
    levelsConfig: levelsConfig,
    gatewayActionLock: gatewayActionLock,
    getProfile: function getProfile() { return profile; },
    getGameGateway: function getGameGateway() { return gameGateway; },
    getPilotAsset: getPilotAsset,
    getShipAsset: getShipAsset,
    setFeaturePanelMode: function setFeaturePanelMode(mode) { return featurePanelController && featurePanelController.setMode(mode); },
    openFeaturePanelShell: function openFeaturePanelShell(mode) { return featurePanelController && featurePanelController.openShell(mode); },
    ensureGameGateway: ensureGameGateway,
    applyGatewayProfile: applyGatewayProfile,
    saveProfile: saveProfile,
    renderLobby: lobbyController.renderLobby,
    renderChapterSelect: lobbyController.renderChapterSelect,
    updateHud: renderBattleUi
  });
  if (!fighterUpgradeController) throw new Error("H5 game bootstrap failed: missing fighter upgrade controller.");

  var featurePanelController = shared.featurePanelController && shared.featurePanelController.create({
    shared: shared,
    dom: dom,
    assetsConfig: assetsConfig,
    levels: levels,
    audioSystem: audioSystem,
    modeClasses: FEATURE_PANEL_MODE_CLASSES,
    getProfile: function getProfile() { return profile; },
    getFeaturePanels: function getFeaturePanels() { return featurePanels || {}; },
    isCloudMode: function isCloudMode() { return battleFlowController.isCloudMode(); },
    persistProfileMetadata: function persistProfileMetadata() { return battleFlowController.persistProfileMetadata(); },
    gatewayActionLock: gatewayActionLock,
    ensureGameGateway: ensureGameGateway,
    getGameGateway: function getGameGateway() { return gameGateway; },
    applyGatewayProfile: applyGatewayProfile,
    saveProfile: saveProfile,
    renderLobby: lobbyController.renderLobby,
    renderChapterSelect: lobbyController.renderChapterSelect,
    updateHud: renderBattleUi,
    renderProfilePanel: profileController.render,
    renderFighterUpgradePanel: fighterUpgradeController.render,
    calculateTotalPower: profileController.calculateTotalPower
  });
  if (!featurePanelController) throw new Error("H5 game bootstrap failed: missing feature panel controller.");

  var battleFlowController = shared.battleFlowController && shared.battleFlowController.create({
    shared: shared,
    dom: dom,
    lobbyController: lobbyController,
    settlementController: settlementController,
    audioSystem: audioSystem,
    demoConfig: demoConfig,
    width: WIDTH,
    height: HEIGHT,
    safeLeft: BATTLE_SAFE_LEFT,
    energyCost: ENERGY_COST,
    gatewayActionLock: gatewayActionLock,
    getProfile: function getProfile() { return profile; },
    setProfile: function setProfile(value) { profile = value; },
    getState: function getState() { return state; },
    setState: function setState(value) { state = value; },
    getBattleContext: function getBattleContext() { return battleContext; },
    setBattleContext: function setBattleContext(value) { battleContext = value; },
    getBattleSession: function getBattleSession() { return battleSession; },
    setBattleSession: function setBattleSession(value) { battleSession = value; },
    getCurrentLoadout: function getCurrentLoadout() { return currentLoadout; },
    setCurrentLoadout: function setCurrentLoadout(value) { currentLoadout = value; },
    getSelectedLevel: function getSelectedLevel() { return selectedLevel; },
    getPendingSettlement: function getPendingSettlement() { return pendingSettlement; },
    setPendingSettlement: function setPendingSettlement(value) { pendingSettlement = value; },
    getFinished: function getFinished() { return finished; },
    setFinished: function setFinished(value) { finished = value; },
    getGameGateway: function getGameGateway() { return gameGateway; },
    getGatewayError: function getGatewayError() { return gatewayError; },
    ensureGameGateway: ensureGameGateway,
    applyGatewayProfile: applyGatewayProfile,
    saveProfile: saveProfile,
    getLevelById: getLevelById,
    createMenuState: createMenuState,
    createLevelProgressSnapshot: createLevelProgressSnapshot,
    updateHud: renderBattleUi,
    drawScene: drawScene,
    playSfx: playSfx
  });
  if (!battleFlowController) throw new Error("H5 game bootstrap failed: missing battle flow controller.");

  var gameEventRouter = shared.gameEventRouter && shared.gameEventRouter.create({
    root: root,
    shared: shared,
    dom: dom,
    canvas: canvas,
    keys: keys,
    pointer: pointer,
    levels: levels,
    audioSystem: audioSystem,
    clamp: clamp,
    getState: function getState() { return state; },
    getProfile: function getProfile() { return profile; },
    getBattleContext: function getBattleContext() { return battleContext; },
    getCurrentLoadout: function getCurrentLoadout() { return currentLoadout; },
    getLastBattleResult: function getLastBattleResult() { return lastBattleResult; },
    getSelectedLevel: function getSelectedLevel() { return selectedLevel; },
    setSelectedLevel: function setSelectedLevel(value) { selectedLevel = value; },
    playSfx: playSfx,
    handleStoryReplayClick: function handleStoryReplayClick(event) { return battleFlowController.handleStoryReplayClick(event); },
    settlePendingBattle: function settlePendingBattle() { return battleFlowController.settlePendingBattle(); },
    resumeGame: lobbyController.resumeGame,
    startSelectedLevel: function startSelectedLevel() { return battleFlowController.startSelectedLevel(); },
    openBattleSelect: lobbyController.openBattleSelect,
    pauseGame: lobbyController.pauseGame,
    tryUseDecisiveCommand: tryUseDecisiveCommand,
    tryCastActiveSlot: tryCastActiveSlot,
    toggleActiveSlotAuto: toggleActiveSlotAuto,
    renderShop: lobbyController.renderShop,
    showShop: lobbyController.showShop,
    renderSettlementChest: renderSettlementChest,
    renderSettlement: renderSettlement,
    abortBattle: function abortBattle(target) { return battleFlowController.abortBattle(target); },
    closeFeaturePanel: function closeFeaturePanel() { return featurePanelController && featurePanelController.close(); },
    calculateTotalPower: function calculateTotalPower() { return profileController.calculateTotalPower(); },
    isCloudMode: function isCloudMode() { return battleFlowController.isCloudMode(); },
    saveProfile: saveProfile,
    renderLobby: lobbyController.renderLobby,
    upgradeFighterStat: function upgradeFighterStat(statType) { return fighterUpgradeController.upgrade(statType); },
    buyWeaponModule: function buyWeaponModule(moduleId) { return fighterUpgradeController.buyWeaponModule(moduleId); },
    equipWeaponModule: function equipWeaponModule(moduleId) { return fighterUpgradeController.equipWeaponModule(moduleId); },
    redeemCode: function redeemCode(rawCode) { return featurePanelController.redeemCode(rawCode); },
    handleProfilePanelClick: profileController.handleClick,
    handleAvatarUpload: profileController.handleAvatarUpload,
    openFeaturePanel: function openFeaturePanel(key) { return featurePanelController.open(key); },
    updatePointer: updatePointer
  });
  if (!gameEventRouter) throw new Error("H5 game bootstrap failed: missing event router.");

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
  saveProfile();
  lobbyController.renderLobby();
  lobbyController.renderChapterSelect();
  lobbyController.renderShop();
  renderBattleUi(true);
  drawScene();
  gameEventRouter.bind();
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
        var cost = lobbyController.getUpgradeCost(key);
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
      buyPilot: function buyPilotLocal(pilotId) { var result = shared.rosterEconomy.purchase(profile, "pilot", pilotId); saveProfile(); return result; },
      buyShip: function buyShipLocal(shipId) { var result = shared.rosterEconomy.purchase(profile, "ship", shipId); saveProfile(); return result; },
      redeem: function redeemLocal(rawCode) {
        var result = shared.redeemCodeSystem.redeemCode({ rawCode: rawCode, profile: profile });
        var messages = { EMPTY_CODE: "请输入兑换码。", CODE_NOT_FOUND: "兑换码不存在。", CODE_ALREADY_USED: "该兑换码已经使用。", PLAYER_LEVEL_NOT_ENOUGH: "指挥官等级不足。" };
        if (!result || !result.success) { var error = new Error(messages[result && result.status] || "兑换失败。"); error.code = result && result.status || "REDEEM_FAILED"; throw error; }
        profile = result.profile; saveProfile();
        return { profile: profile, code: result.code, rewards: result.rewards };
      },
      buyWeaponModule: function buyWeaponModuleLocal(moduleId) { var result = shared.weaponModuleSystem.buy(profile, moduleId); saveProfile(); return result; },
      equipWeaponModule: function equipWeaponModuleLocal(moduleId) { var result = shared.weaponModuleSystem.equip(profile, moduleId, getShipAsset()); saveProfile(); return result; },
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
    lobbyController.renderLobby();
    lobbyController.renderChapterSelect();
    lobbyController.renderShop();
    renderBattleUi(true);
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
    lobbyController.renderLobby();
    lobbyController.renderChapterSelect();
    lobbyController.openBattleSelect();
    lobbyController.showOverlay("Influencer Demo", "三武器开局，先清屏变强，再挑战 BOSS。", "开始试玩");
  }

  function createMenuState(levelId) {
    if (!shared.battleState || !shared.battleState.createMenuState) {
      throw new Error("H5 game bootstrap failed: missing battle state.");
    }
    return shared.battleState.createMenuState(levelId);
  }

  function renderBattleUi(force) {
    return battleUiController.render(Boolean(force));
  }

  function drawScene() {
    battleRenderer.drawScene(state);
  }

  function setImageSource(image, source) {
    if (!image || !source) return;
    image.src = String(source);
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
    if (shared.battleRules && shared.battleRules.applyProfileExperience) {
      return shared.battleRules.applyProfileExperience(targetProfile, amount);
    }
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
      lobbyController.renderLobby();
      return ok;
    }
    if (shared.profile.spendEnergy && shared.profile.spendEnergy(profile, amount)) {
      saveProfile();
      lobbyController.renderLobby();
      return true;
    }
    return false;
  }

  function renderSettlementChest(result) {
    settlementController.renderSettlementChest(result);
  }

  function renderSettlement(result) {
    settlementController.renderSettlement(result);
  }

  function tryUseDecisiveCommand() {
    if (!state || state.mode !== "fight" || !shared.abilitySystem || !shared.abilitySystem.tryUseDecisiveCommand) return false;
    var casted = shared.abilitySystem.tryUseDecisiveCommand(state, currentLoadout);
    if (casted) {
      playSfx("skill");
      renderBattleUi(true);
      drawScene();
    }
    return casted;
  }

  function tryCastActiveSlot(slotIndex) {
    if (!state || state.mode !== "fight" || !shared.abilitySystem || !shared.abilitySystem.tryCastActiveSlot) return false;
    var casted = shared.abilitySystem.tryCastActiveSlot(state, currentLoadout, slotIndex);
    if (casted) {
      renderBattleUi(true);
      drawScene();
    }
    return casted;
  }

  function toggleActiveSlotAuto(slotIndex) {
    if (!state || state.mode !== "fight" || !shared.abilitySystem || !shared.abilitySystem.toggleActiveSlotAuto) return null;
    var enabled = shared.abilitySystem.toggleActiveSlotAuto(state, currentLoadout, slotIndex);
    if (enabled !== null) renderBattleUi(true);
    return enabled;
  }

  function playSfx(id) {
    if (audioSystem && audioSystem.playSfx) audioSystem.playSfx(id);
  }

  function updatePointer(event) {
    var rect = canvas.getBoundingClientRect();
    var field = shared.battleGeometry.getField(state);
    pointer.x = clamp(((event.clientX - rect.left) / rect.width) * WIDTH, field.playerLeft, WIDTH - field.playerRight);
    pointer.y = clamp(((event.clientY - rect.top) / rect.height) * HEIGHT, field.playerTop, HEIGHT - field.playerBottom);
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
