(function registerApplicationRuntime(root) {
  "use strict";
  function boot() {
  var shared = root.RXGame || {};
  var events = shared.events;
  var battleUiHandle = shared.battleUiView && shared.battleUiView.mount
    ? shared.battleUiView.mount(document.querySelector("#battleUiRoot"))
    : null;
  var canvas = battleUiHandle && battleUiHandle.canvas;
  var ctx = canvas ? canvas.getContext("2d") : null;
  if (!canvas || !ctx || !battleUiHandle || !shared.levels || !shared.assets || !shared.profile) {
    throw new Error("H5 game bootstrap failed: missing canvas or shared modules.");
  }

  var battleField = shared.battleGeometry.getField();
  var WIDTH = Math.max(1, Number(canvas.dataset.logicalWidth) || battleField.width);
  var HEIGHT = Math.max(1, Number(canvas.dataset.logicalHeight) || battleField.height);
  ctx.setTransform(canvas.width / WIDTH, 0, 0, canvas.height / HEIGHT, 0, 0);
  ctx.imageSmoothingEnabled = true;
  if ("imageSmoothingQuality" in ctx) ctx.imageSmoothingQuality = "medium";
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
    endlessBattleScreen: document.querySelector("#endlessBattleScreen"),
    endlessBattleUiRoot: document.querySelector("#endlessBattleUiRoot"),
    endlessSettlementRoot: document.querySelector("#endlessSettlementRoot"),
    battleEntryButton: document.querySelector("#battleEntryButton"),
    featurePanel: document.querySelector("#featurePanel"),
    closeFeaturePanel: document.querySelector("#closeFeaturePanel"),
    featurePanelKicker: document.querySelector("#featurePanelKicker"),
    featurePanelTitle: document.querySelector("#featurePanelTitle"),
    featurePanelBody: document.querySelector("#featurePanelBody"),
    featurePanelSlots: document.querySelector("#featurePanelSlots"),
    fighterUpgradeScreen: document.querySelector("#fighterUpgradeScreen"),
    fighterUpgradeMount: document.querySelector("#fighterUpgradeMount"),
    pilotAvatar: document.querySelector("#pilotAvatar"),
    pilotName: document.querySelector("#pilotName"),
    pilotLevel: document.querySelector("#pilotLevel"),
    pilotExpText: document.querySelector("#pilotExpText"),
    pilotExpBar: document.querySelector("#pilotExpBar"),
    pilotHonor: document.querySelector("#pilotHonor"),
    energyValue: document.querySelector("#energyValue"),
    goldValue: document.querySelector("#goldValue"),
    diamondValue: document.querySelector("#diamondValue"),
    worldClockTime: document.querySelector("#worldClockTime"),
    worldClockDate: document.querySelector("#worldClockDate"),
    worldClockSource: document.querySelector("#worldClockSource"),
    energyResourceIcon: document.querySelector("#energyResourceIcon"),
    goldResourceIcon: document.querySelector("#goldResourceIcon"),
    diamondResourceIcon: document.querySelector("#diamondResourceIcon"),
    openResourceExchange: document.querySelector("#openResourceExchange"),
    resourceExchangeScreen: document.querySelector("#resourceExchangeScreen"),
    resourceExchangeMount: document.querySelector("#resourceExchangeMount"),
    gachaScreen: document.querySelector("#gachaScreen"),
    gachaMount: document.querySelector("#gachaMount"),
    inventoryScreen: document.querySelector("#inventoryScreen"),
    inventoryMount: document.querySelector("#inventoryMount"),
    menuTiles: document.querySelectorAll("#lobbyScreen .menu-tile[data-panel]"),
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
  var visualQualitySystem = shared.visualQualitySystem || null;
  var framePacingMonitor = shared.framePacingMonitor || null;
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
  if (battleRenderer.setQualityProfile && visualQualitySystem && visualQualitySystem.getEffectiveProfile) {
    battleRenderer.setQualityProfile(visualQualitySystem.getEffectiveProfile());
  }
  if (battleRenderer.preloadSkillAssets) {
    battleRenderer.preloadSkillAssets().catch(function ignoreWingmanPreloadFailure() {});
  }
  var FEATURE_PANEL_MODE_CLASSES = [
    "pilot-dossier-panel",
    "ship-hangar-panel",
    "codex-panel",
    "profile-dossier-panel",
    "main-feature-panel",
    "feature-panel-standard",
    "shop-feature-panel",
    "modal-feature-panel",
    "ranking-feature-panel",
    "task-feature-panel",
    "achievement-feature-panel",
    "endless-feature-panel",
    "star-wings-gacha-panel",
    "recharge-feature-panel",
    "paycore-host-panel",
    "contact-panel"
  ];
  var demoMode = shared.demoMode && shared.demoMode.create({
    shared: shared,
    levels: levels,
    levelsConfig: levelsConfig,
    energyCost: ENERGY_COST,
    clamp: clamp
  });
  if (!demoMode) throw new Error("H5 game bootstrap failed: missing demo mode.");
  var demoConfig = demoMode.config;
  var profileSession = shared.profileSession && shared.profileSession.create({
    shared: shared,
    levels: levels,
    assets: assetsConfig,
    demoConfig: demoConfig,
    createDemoProfile: demoMode.createProfile
  });
  if (!profileSession) throw new Error("H5 game bootstrap failed: missing profile session.");
  var profile = profileSession.loadProfile();
  var runtimeTheme = shared.runtimeTheme && shared.runtimeTheme.create({
    assets: assetsConfig,
    getProfile: function getProfile() { return profile; }
  });
  if (!runtimeTheme) throw new Error("H5 game bootstrap failed: missing runtime theme.");
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
  var endlessRoomController = null;
  var battleUiController = shared.battleUiController && shared.battleUiController.create({
    view: battleUiHandle,
    getState: function getStateForUi() { return state; },
    getLoadout: function getLoadoutForUi() {
      return currentLoadout || ((shared.fighterUpgradeApi || shared.combatStats) && (shared.fighterUpgradeApi || shared.combatStats).generateBattleLoadout
        ? (shared.fighterUpgradeApi || shared.combatStats).generateBattleLoadout(profile)
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
    visualQualitySystem: visualQualitySystem,
    framePacingMonitor: framePacingMonitor,
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
    renderLobby: lobbyController.renderLobby,
    ensureGameGateway: ensureGameGateway,
    getGameGateway: function getGameGateway() { return gameGateway; },
    getGatewayError: function getGatewayError() { return gatewayError; },
    applyGatewayProfile: applyGatewayProfile
  });
  if (!profileController) throw new Error("H5 game bootstrap failed: missing profile controller.");

  var featurePanelController = shared.featurePanelController && shared.featurePanelController.create({
    shared: shared,
    dom: dom,
    assetsConfig: assetsConfig,
    levels: levels,
    audioSystem: audioSystem,
    visualQualitySystem: visualQualitySystem,
    framePacingMonitor: framePacingMonitor,
    modeClasses: FEATURE_PANEL_MODE_CLASSES,
    getProfile: function getProfile() { return profile; },
    getFeaturePanels: function getFeaturePanels() { return featurePanels || {}; },
    isCloudMode: function isCloudMode() { return battleFlowController.isCloudMode(); },
    gatewayActionLock: gatewayActionLock,
    ensureGameGateway: ensureGameGateway,
    syncGatewayProfile: syncGatewayProfile,
    getGameGateway: function getGameGateway() { return gameGateway; },
    applyGatewayProfile: applyGatewayProfile,
    saveProfile: saveProfile,
    renderLobby: lobbyController.renderLobby,
    renderChapterSelect: lobbyController.renderChapterSelect,
    updateHud: renderBattleUi,
    renderProfilePanel: profileController.render,
    calculateTotalPower: profileController.calculateTotalPower,
    startEndlessMode: function startEndlessMode() {
      return endlessRoomController ? endlessRoomController.start() : Promise.reject(new Error("无尽战斗房间尚未就绪。"));
    }
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
    playSfx: playSfx,
    showBattleControlHint: function showBattleControlHint(uid) {
      return battleUiHandle && battleUiHandle.showFirstControlHint ? battleUiHandle.showFirstControlHint(uid) : false;
    },
    applyBattleVisualQuality: function applyBattleVisualQuality() { return applyVisualQuality(null, true); }
  });
  if (!battleFlowController) throw new Error("H5 game bootstrap failed: missing battle flow controller.");

  endlessRoomController = shared.endlessModeRoomController && shared.endlessModeRoomController.create({
    shared: shared,
    dom: dom,
    assetsConfig: assetsConfig,
    levelsConfig: levelsConfig,
    audioSystem: audioSystem,
    visualQualitySystem: visualQualitySystem,
    getProfile: function getProfileForEndless() { return profile; },
    getGameGateway: function getGatewayForEndless() { return gameGateway; },
    ensureGameGateway: ensureGameGateway,
    saveProfile: saveProfile,
    getShipAsset: getShipAsset,
    playSfx: playSfx,
    clamp: clamp,
    clearCampaignInput: function clearCampaignInput() {
      keys.clear();
      pointer.active = false;
    },
    openActivityPanel: function openActivityPanel() {
      if (featurePanelController) featurePanelController.open("event");
    }
  });
  if (!endlessRoomController) throw new Error("H5 game bootstrap failed: missing endless battle room controller.");

  // ── Economy controller: moved out of the input adapter (it is a feature room,
  // not an input concern). The 总导演 owns wiring it into the registry doors. ──
  var economyController = shared.economyFeatureController && shared.economyFeatureController.create({
    shared: shared,
    dom: dom,
    levels: levels,
    audioSystem: audioSystem,
    visualQualitySystem: visualQualitySystem,
    framePacingMonitor: framePacingMonitor,
    applyVisualQuality: applyVisualQuality,
    gatewayActionLock: gatewayActionLock,
    calculateTotalPower: profileController.calculateTotalPower,
    getProfile: function getProfile() { return profile; },
    isCloudMode: function isCloudMode() { return battleFlowController.isCloudMode(); },
    ensureGameGateway: ensureGameGateway,
    getGameGateway: function getGameGateway() { return gameGateway; },
    applyGatewayProfile: applyGatewayProfile,
    saveProfile: saveProfile,
    renderLobby: lobbyController.renderLobby,
    updateHud: renderBattleUi,
    playSfx: playSfx
  });
  var gatewayCoordinator = shared.gatewayCoordinator && shared.gatewayCoordinator.create({
    gatewayModule: shared.gameGateway,
    localOnly: demoConfig.enabled,
    createLocalAdapter: createLocalGatewayAdapter,
    createCloudAdapter: function createCloudAdapter(remote, localAdapter) {
      if (!shared.economySession || typeof shared.economySession.create !== "function") {
        throw new Error("H5 game bootstrap failed: missing economy session.");
      }
      return shared.economySession.create({
        remote: remote,
        local: localAdapter,
        shared: shared,
        storage: root.localStorage,
        getProfile: function getEconomyProfile() { return profile; },
        applyProfile: applyGatewayProfile,
        refreshViews: refreshAllViews
      });
    },
    getProfile: function getProfile() { return profile; },
    cloneProfile: cloneProfile,
    mergeLocalCosmetics: mergeLocalCosmetics,
    hasCosmeticDifference: hasCosmeticDifference,
    applyGatewayProfile: applyGatewayProfile,
    cosmeticsMigrationKey: "rxgame_cloud_cosmetics_migrated_v1",
    onGatewayChange: function onGatewayChange(value) { gameGateway = value; },
    onErrorChange: function onErrorChange(error) { gatewayError = error; },
    setUiState: setGatewayUiState,
    refreshViews: refreshAllViews
  });
  if (!gatewayCoordinator) throw new Error("H5 game bootstrap failed: missing gateway coordinator.");

  // Rooms own their action names and lifecycle. The application only provides
  // capability references and mounts the definitions collected by the loader.
  var roomContext = {
    root: root,
    shared: shared,
    dom: dom,
    levels: levels,
    battleFlowController: battleFlowController,
    lobbyController: lobbyController,
    settlementController: settlementController,
    featurePanelController: featurePanelController,
    fighterUpgrade: {
      levelsConfig: levelsConfig,
      gatewayActionLock: gatewayActionLock,
      getProfile: function getFighterUpgradeProfile() { return profile; },
      getGameGateway: function getFighterUpgradeGateway() { return gameGateway; },
      getPilotAsset: getPilotAsset,
      getShipAsset: getShipAsset,
      ensureGameGateway: ensureGameGateway,
      syncGatewayProfile: syncGatewayProfile,
      applyGatewayProfile: applyGatewayProfile,
      calculateTotalPower: profileController.calculateTotalPower,
      saveProfile: saveProfile,
      renderLobby: lobbyController.renderLobby,
      renderChapterSelect: lobbyController.renderChapterSelect,
      updateHud: renderBattleUi
    },
    codex: {
      getProfile: function getCodexProfile() { return profile; },
      ensureGameGateway: ensureGameGateway,
      getGameGateway: function getCodexGateway() { return gameGateway; },
      applyGatewayProfile: applyGatewayProfile,
      saveProfile: saveProfile,
      renderLobby: lobbyController.renderLobby,
      updateHud: renderBattleUi,
      openShell: function openCodexShell(mode) { return featurePanelController && featurePanelController.openShell(mode); }
    },
    resourceExchange: {
      getProfile: function getResourceExchangeProfile() { return profile; },
      isCloudMode: function isResourceExchangeCloudMode() { return battleFlowController.isCloudMode(); },
      getGameGateway: function getResourceExchangeGateway() { return gameGateway; },
      ensureGameGateway: ensureGameGateway,
      syncGatewayProfile: syncGatewayProfile,
      applyGatewayProfile: applyGatewayProfile,
      saveProfile: saveProfile,
      renderLobby: lobbyController.renderLobby,
      emitGoldChanged: function emitResourceExchangeGoldChanged() {
        if (shared.bus && typeof shared.bus.emit === "function") {
          shared.bus.emit(events.GOLD_CHANGED, { gold: getGold(), total: getGold() });
        }
      }
    },
    payment: {
      getProfile: function getPaymentProfile() { return profile; },
      isCloudMode: function isPaymentCloudMode() { return battleFlowController.isCloudMode(); },
      getGameGateway: function getPaymentGateway() { return gameGateway; },
      ensureGameGateway: ensureGameGateway,
      applyGatewayProfile: applyGatewayProfile,
      renderLobby: lobbyController.renderLobby,
      openShell: function openPaymentShell(mode) { return featurePanelController && featurePanelController.openShell(mode); },
      closeShell: function closePaymentShell() { return featurePanelController && featurePanelController.close(); }
    },
    pilot: {
      getProfile: function getPilotProfile() { return profile; },
      ensureGameGateway: ensureGameGateway,
      syncGatewayProfile: syncGatewayProfile,
      getGameGateway: function getPilotGateway() { return gameGateway; },
      applyGatewayProfile: applyGatewayProfile,
      calculateTotalPower: profileController.calculateTotalPower,
      saveProfile: saveProfile,
      persistProfileMetadata: function persistPilotMetadata() { return battleFlowController.persistProfileMetadata(); },
      renderLobby: lobbyController.renderLobby,
      renderChapterSelect: lobbyController.renderChapterSelect,
      updateHud: renderBattleUi,
      openShell: function openPilotShell(mode) { return featurePanelController && featurePanelController.openShell(mode); }
    },
    fighter: {
      gatewayActionLock: gatewayActionLock,
      getProfile: function getFighterProfile() { return profile; },
      ensureGameGateway: ensureGameGateway,
      syncGatewayProfile: syncGatewayProfile,
      getGameGateway: function getFighterGateway() { return gameGateway; },
      applyGatewayProfile: applyGatewayProfile,
      calculateTotalPower: profileController.calculateTotalPower,
      saveProfile: saveProfile,
      persistProfileMetadata: function persistFighterMetadata() { return battleFlowController.persistProfileMetadata(); },
      renderLobby: lobbyController.renderLobby,
      renderChapterSelect: lobbyController.renderChapterSelect,
      updateHud: renderBattleUi,
      openShell: function openFighterShell(mode) { return featurePanelController && featurePanelController.openShell(mode); },
      closeShell: function closeFighterShell() { return featurePanelController && featurePanelController.close(); }
    },
    gacha: {
      getProfile: function getGachaProfile() { return profile; },
      commitProfile: commitLocalFeatureProfile,
      isCloudMode: function isGachaCloudMode() { return battleFlowController.isCloudMode(); },
      renderLobby: lobbyController.renderLobby,
      closeFeaturePanel: function closeGachaFeaturePanel() { return featurePanelController && featurePanelController.close(); },
      storage: root.localStorage,
      profileKey: shared.profileRuntime && shared.profileRuntime.STORAGE_KEY,
      getGameGateway: function getGachaGateway() { return gameGateway; },
      ensureGameGateway: ensureGameGateway,
      syncGatewayProfile: syncGatewayProfile,
      applyGatewayProfile: applyGatewayProfile
    },
    inventory: {
      getProfile: function getInventoryProfile() { return profile; },
      commitProfile: commitLocalFeatureProfile,
      isCloudMode: function isInventoryCloudMode() { return battleFlowController.isCloudMode(); },
      getGameGateway: function getInventoryGateway() { return gameGateway; },
      ensureGameGateway: ensureGameGateway,
      syncGatewayProfile: syncGatewayProfile,
      applyGatewayProfile: applyGatewayProfile,
      renderLobby: lobbyController.renderLobby,
      closeFeaturePanel: function closeInventoryFeaturePanel() { return featurePanelController && featurePanelController.close(); }
    },
    signin: {
      getProfile: function getSigninProfile() { return profile; },
      isCloudMode: function isSigninCloudMode() { return battleFlowController.isCloudMode(); },
      getGameGateway: function getSigninGateway() { return gameGateway; },
      ensureGameGateway: ensureGameGateway,
      applyGatewayProfile: applyGatewayProfile,
      saveProfile: saveProfile,
      renderLobby: lobbyController.renderLobby,
      renderPanel: function renderSigninPanel() { return featurePanelController && featurePanelController.open("signin", true); }
    },
    profileController: profileController,
    endlessRoomController: endlessRoomController,
    audioSystem: audioSystem,
    visualQualitySystem: visualQualitySystem,
    framePacingMonitor: framePacingMonitor,
    applyVisualQuality: applyVisualQuality,
    claimEconomy: economyController && economyController.claim,
    renderFeaturePanel: function renderFeaturePanel(key) {
      return featurePanelController && featurePanelController.open(key);
    },
    getState: function getRoomState() { return state; },
    getProfile: function getRoomProfile() { return profile; },
    getGameGateway: function getRoomGateway() { return gameGateway; },
    calculateTotalPower: profileController.calculateTotalPower,
    getBattleContext: function getRoomBattleContext() { return battleContext; },
    getLastBattleResult: function getRoomLastBattleResult() { return lastBattleResult; },
    getSelectedLevel: function getRoomSelectedLevel() { return selectedLevel; },
    setSelectedLevel: function setRoomSelectedLevel(value) { selectedLevel = value; },
    tryUseDecisiveCommand: tryUseDecisiveCommand,
    tryCastActiveSlot: tryCastActiveSlot,
    toggleActiveSlotAuto: toggleActiveSlotAuto,
    clamp: clamp
  };
  var roomMountReport = scope.roomRegistry.mountAll(roomContext);
  if (roomMountReport.failed.length && console && console.warn) {
    console.warn("[room-registry] optional rooms failed to mount: " + roomMountReport.failed.join(", "));
  }

  // ── Input adapter: receives ONLY input concerns + the door registry ──
  var gameEventRouter = shared.gameEventRouter && shared.gameEventRouter.create({
    dom: dom,
    canvas: canvas,
    keys: keys,
    pointer: pointer,
    battleInput: shared.battleInput,
    updatePointer: updatePointer,
    dismissBattleControlHint: function dismissBattleControlHint() {
      return battleUiHandle && battleUiHandle.dismissControlHint ? battleUiHandle.dismissControlHint() : false;
    },
    getState: function getState() { return { mode: state && state.mode, lastBattleResult: lastBattleResult }; },
    isExternalBattleActive: function () { return endlessRoomController && endlessRoomController.isActive(); },
    registry: scope.roomRegistry
  });
  if (!gameEventRouter) throw new Error("H5 game bootstrap failed: missing event router.");

  var featurePanels = {
    profile: ["PILOT", "飞行员资料", "头像、等级、经验、体力、金币和钻石都会写入本地存档。"],
    pilotGallery: ["PILOT", "战姬", "战姬出战属性会通过 BattleLoadout 快照进入战斗。"],
    shipGallery: ["HANGAR", "战机", "战机与战机强化会影响攻击、生命和破甲。"],
    upgrade: ["UPGRADE", "战机强化", "强化后的数值会重新生成出战属性快照。"],
    task: ["TASK", "任务", "任务奖励通过云端验证发放，请保持网络连接。"],
    event: ["EVENT", "活动", "活动排程展示当前可参与的事件和奖励。"],
    achievement: ["ACHIEVEMENT", "成就", "成就奖励通过云端验证发放，请保持网络连接。"],
    shop: ["SHOP", "商店", "补给商品通过云端完成购买，请保持网络连接。"],
    friend: ["FRIEND", "好友", "云好友系统已开放，搜索玩家 ID 添加好友。"],
    ranking: ["RANKING", "全服排行榜", "总战力与无尽挑战由云端权威数据统计。"],
    mail: ["MAIL", "邮件", "邮件展示公告、补给、活动和维护信息。"],
    signin: ["SIGN IN", "签到", "七日航线奖励由云端原子发放，同一天不能重复领取。"],
    setting: ["SETTING", "设置", "音乐和音效设置可即时生效并保存到本地。"],
    starWingsGacha: ["STAR WINGS", "星穹之翼", "限时抽取入口已独立接通。"],
    contact: ["CONTACT", "联系我们", "二维码联系入口为本地展示态。"],
    chat: ["CHAT", "世界频道", "世界频道已上线，与其他指挥官实时交流。"]  };
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
    if (gatewayCoordinator) return gatewayCoordinator.initialize();
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
      if (shared.worldTimeSystem && typeof shared.worldTimeSystem.sync === "function" && result && result.worldTime) {
        shared.worldTimeSystem.sync(result.worldTime, {
          source: result.worldTime.source || (gameGateway.isCloud ? "server" : "device")
        });
      }
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
    if (gatewayCoordinator) return gatewayCoordinator.ensure();
    if (!gatewayReadyPromise) return initializeGameGateway();
    return gatewayReadyPromise;
  }

  function syncGatewayProfile(maxAgeMs) {
    return ensureGameGateway().then(function syncReadyGateway(gateway) {
      if (!gateway || typeof gateway.syncProfile !== "function") return { profile: profile };
      return gateway.syncProfile(maxAgeMs == null ? 30000 : maxAgeMs);
    }).then(function applySyncedProfile(result) {
      if (result && result.profile) applyGatewayProfile(result.profile);
      return result;
    });
  }

  function createLocalGatewayAdapter() {
    // 薄包装：原方法体已抽到 core/localGateway.js，经依赖注入保持对 profile 的读写与原版逐字节一致。
    return shared.localGateway.create({
      shared: shared,
      levelsConfig: levelsConfig,
      upgrades: upgrades,
      lobbyController: lobbyController,
      ENERGY_COST: ENERGY_COST,
      getProfile: function getProfileValue() { return profile; },
      setProfile: function setProfileValue(value) { profile = value; return profile; },
      spendEnergy: spendEnergy,
      addGold: addGold,
      getGold: getGold,
      setGold: setGold,
      refundBattleEnergy: battleFlowController.refundBattleEnergy,
      getLevelById: getLevelById,
      saveProfile: saveProfile,
      applyBattleExperience: applyBattleExperience
    });
  }

  function cloneProfile(source) {
    return profileSession.cloneProfile(source);
  }

  function mergeLocalCosmetics(cloudProfile, localProfile) {
    return profileSession.mergeLocalCosmetics(cloudProfile, localProfile);
  }

  function hasCosmeticDifference(before, after) {
    return profileSession.hasCosmeticDifference(before, after);
  }

  function applyGatewayProfile(nextProfile) {
    profile = profileSession.applyGatewayProfile(nextProfile || profile);
    selectedLevel = clamp(Math.min(selectedLevel || 1, profile.unlockedLevel || 1), 1, levels.length || 1);
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
    return runtimeTheme.applyCssVars();
  }

  function loadProfile() {
    return profileSession.loadProfile();
  }

  function unlockForLocalTest(nextProfile) {
    return profileSession.unlockForLocalTest(nextProfile);
  }

  function saveProfile() {
    profile = profileSession.saveProfile(profile);
    return profile;
  }

  function commitLocalFeatureProfile(nextProfile) {
    if (battleFlowController && battleFlowController.isCloudMode()) {
      throw new Error("LOCAL_FEATURE_COMMIT_DISABLED_IN_CLOUD_MODE");
    }
    var unlocked = profileSession.unlockForLocalTest(nextProfile || {});
    var normalized = shared.profile.normalizeProfile(unlocked);
    root.localStorage.setItem(shared.profileRuntime.STORAGE_KEY, JSON.stringify(normalized));
    profile = normalized;
    return profile;
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

  function applyVisualQuality(nextMode, force) {
    if (!visualQualitySystem || !visualQualitySystem.getEffectiveProfile) return null;
    if (nextMode && visualQualitySystem.setMode) visualQualitySystem.setMode(nextMode);
    var profile = visualQualitySystem.getEffectiveProfile();
    var inBattle = state && (state.mode === "fight" || state.mode === "paused" || state.mode === "settling");
    if (inBattle && !force) return Object.assign({ pending: true }, profile);
    if (battleUiHandle && battleUiHandle.applyRenderProfile) battleUiHandle.applyRenderProfile(profile);
    if (battleRenderer && battleRenderer.setQualityProfile) battleRenderer.setQualityProfile(profile);
    return Object.assign({ pending: false }, profile);
  }

  function setImageSource(image, source) {
    return runtimeTheme.setImageSource(image, source);
  }

  function applyLobbyPose(image, pose, role) {
    return runtimeTheme.applyLobbyPose(image, pose, role);
  }

  function getPilotAsset(id) {
    return runtimeTheme.getPilotAsset(id);
  }

  function getShipAsset(id) {
    return runtimeTheme.getShipAsset(id);
  }

  function getBackgroundAsset(id) {
    return runtimeTheme.getBackgroundAsset(id);
  }

  function getLevelById(levelId) {
    return levels.find(function find(level) { return level.id === levelId; }) || levels[0] || { id: 1, code: "1-1", chapterIndex: 0 };
  }

  function getGold() {
    return shared.profile.getGold ? shared.profile.getGold(profile) : Math.max(0, Number(profile.resources && profile.resources.gold) || 0);
  }

  function setGold(value) {
    var amount = Math.max(0, Math.floor(value || 0));
    if (shared.profile.setGold) shared.profile.setGold(profile, amount);
    else {
      profile.resources = profile.resources || {};
      profile.resources.gold = amount;
      profile.coins = amount;
    }
    if (shared.bus && typeof shared.bus.emit === "function") {
      shared.bus.emit(events.GOLD_CHANGED, { gold: amount, total: (profile.resources && profile.resources.gold) || amount });
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
      if (shared.bus && shared.events) {
        shared.bus.emit(shared.events.SKILL_ACTIVATED, { skillId: "decisive-command", source: "command" });
      }
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
  scope.applicationRuntime = { boot: boot };
})(typeof globalThis !== "undefined" ? globalThis : window);
