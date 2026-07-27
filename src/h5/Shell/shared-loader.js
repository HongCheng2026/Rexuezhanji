(function loadSharedCore() {
  const pagePath = decodeURIComponent(location.pathname).replace(/\\/g, "/");
  const isLocalServer = /^(127\.0\.0\.1|localhost|\[::1\])$/i.test(location.hostname);
  const isReleasePackage = /(?:^|\/)release\/netlify-h5(?:\/|$)/i.test(pagePath);
  const isSourceH5 = !isReleasePackage && (isLocalServer || /(?:^|\/)src\/h5(?:\/|$)/i.test(pagePath) || /(?:^|\/)H5(?:\/|$)/.test(pagePath) || /(?:^|\/)h5\//i.test(pagePath));
  const cacheVersion = "v=" + Date.now();
  // Source and release both keep shared-loader in Shell/, so domain modules are
  // always one directory above it.
  const base = "../";

  // ── Domain architecture: single source of truth for load order ──
  // Foundation/Data live under src/h5/{Game,Gameplay,World,UI,Data,Presentation}/.
  const sharedFiles = [
    "Game/Core/runtimeCore.js","Presentation/Assets/assets.js","Game/EventBus/eventBus.js","Game/EventBus/events.js",
    "Game/SceneManager/roomRegistry.js",
    "Data/Balance/balance.js","World/Level/levels.js","Gameplay/Fighter/tacticalLoadoutConfig.js",
    "World/Level/stageHonorSystem.js","Gameplay/Player/commanderLevel.js","Gameplay/Player/profile.js",
    "Gameplay/Enemy/battleRules.js","Data/Balance/combatCodexConfig.js",
    "Gameplay/Progression/progressionSystem.js",
    "Gameplay/Enemy/enemyStageBalance.js","Gameplay/Combat/Endless/endlessModeConfig.js",
    "World/Story/campaignStoryScript.js","World/Story/campaignStoryFramework.js",
    "World/Story/stageStoryConfig.js","World/Story/battleStorySystem.js",
    "World/Level/chapterMapSystem.js","World/Story/battleSettlementSystem.js",
    "World/Difficulty/failGuideSystem.js",
    "Data/Config/taskCatalog.js","World/Mission/achievementSystem.js","World/Mission/taskSystem.js","Data/Balance/sRankPriceConfig.js",
    "Data/Config/redeemCodeSystem.js","UI/Shop/ShopConfig.js","UI/Shop/ShopView.js",
    "Data/Config/featurePanelContent.js","Data/Config/mainUiConfig.js","Data/Config/testUnlockFlags.js",
    "Data/Config/skillGradeConfig.js",
    "Gameplay/Ability/shipSkills.js","Data/Balance/rosterEconomy.js",
    "Gameplay/Collection/codexBalance.js","Gameplay/Collection/codexConfig.js"
  ];

  for (const file of sharedFiles) {
    document.write(`<script src="${base}${file}?v=${cacheVersion}"><\/script>`);
  }

  // Load H5-only modules from both source preview and release packages.
  const h5Files = [
    "Gameplay/Fighter/combatStats.js","Gameplay/Combat/powerCalculator.js","Gameplay/Combat/derivedStatsCache.js","Game/Gateway/gameGateway.js","Game/Gateway/gatewayCoordinator.js","Game/Storage/profileRuntime.js","Game/Storage/profileSession.js",
    "Presentation/Audio/audioSystem.js",
    "UI/Lobby/ResourceExchange/resourceExchangeModel.js","UI/Lobby/ResourceExchange/resourceExchangeView.js",
    "UI/Gacha/gachaConfig.js","UI/Gacha/gachaModel.js","UI/Gacha/gachaStateStore.js","UI/Gacha/gachaView.js",
    "UI/Inventory/inventoryCatalog.js","UI/Inventory/inventoryModel.js","UI/Inventory/inventoryView.js",
    "UI/Lobby/lobbyController.js","Gameplay/Player/profileController.js","UI/Pilot/pilotView.js","UI/Fighter/fighterView.js","Gameplay/Fighter/fighterUpgradeApi.js","Gameplay/Player/profileStore.js",
    "UI/AutoSkill/autoSkillModule.js","UI/Fighter/Upgrade/fighterUpgradeAssets.js","UI/Fighter/Upgrade/fighterUpgradeModel.js","UI/Fighter/Upgrade/fighterUpgradeView.js",
    "UI/FeaturePanels/contactView.js","UI/FeaturePanels/featurePanelController.js",
    "UI/Codex/codexBossMechanics.js","UI/Codex/codexView.js",
    "UI/FeaturePanels/economyFeatureController.js","UI/HUD/battleUiController.js",
    "Game/Core/battleFlowController.js","Gameplay/Combat/Endless/endlessModeRoomController.js",
    "Gameplay/Collection/codexSystem.js",
    "World/Story/storyRoom.js","Gameplay/Combat/battleRoom.js","UI/Lobby/lobbyRoom.js","UI/Lobby/ResourceExchange/resourceExchangeRoom.js","UI/Gacha/gachaRoom.js","UI/Inventory/inventoryRoom.js",
    "World/Result/settlementRoom.js","UI/Pilot/pilotRoom.js","UI/Fighter/fighterRoom.js","UI/FeaturePanels/featurePanelRoom.js",
    "UI/Fighter/Upgrade/fighterUpgradeRoom.js","Gameplay/Player/profileRoom.js",
    "UI/FeaturePanels/contactRoom.js","UI/FeaturePanels/redeemRoom.js","UI/Settings/settingsRoom.js",
    "Gameplay/Combat/Endless/endlessRoom.js",
    "World/Mission/taskView.js","World/Mission/achievementRoom.js","World/Mission/taskRoom.js","World/Mission/activityRoom.js","UI/Codex/codexRoom.js","UI/Shop/ShopRoom.js",
    "UI/FeaturePanels/mailRoom.js","UI/FeaturePanels/signinRoom.js",
    "Game/SceneManager/gameEventRouter.js","Game/Core/demoMode.js","Presentation/Assets/runtimeTheme.js","Game/Core/applicationRuntime.js","Game/Core/gameApp.js","Game/Gateway/localGateway.js",
    "Gameplay/Fighter/tacticalLoadoutSystem.js","Gameplay/Combat/battleGeometry.js","Gameplay/Combat/skillVisualTheme.js",
    "Gameplay/Combat/battleState.js","Gameplay/Combat/battleInput.js",
    "Gameplay/Combat/weaponSystem.js","Gameplay/Combat/extensionWeaponSystem.js",
    "Gameplay/Ability/abilitySystem.js","UI/Settings/activeSkillPreferences.js",
    "Gameplay/Ability/activeSkillSystem.js","Gameplay/Ability/skyLockBeam.js",
    "Gameplay/Ability/obsidianGravityWell.js","Gameplay/Ability/goldJudgementBuff.js",
    "Gameplay/Ability/phaseShield.js","Gameplay/Ability/activeSummonWingman.js","Gameplay/Ability/activeDecoy.js","Gameplay/Ability/activeChainLightning.js","Gameplay/Ability/activeBlackHole.js","Gameplay/Ability/passiveSkillSystem.js","Presentation/Endless/endlessModeAssets.js","Gameplay/Combat/Endless/endlessModeDirector.js",
    "Gameplay/Combat/fxSystem.js","Gameplay/Enemy/enemyAI.js",
    "Gameplay/Enemy/enemySystem.js","Gameplay/Enemy/bossSystem.js",
    "Gameplay/Combat/collisionSystem.js","Gameplay/Combat/dropSystem.js",
    "Gameplay/Combat/settlementSystem.js","Gameplay/Combat/battleRuntime.js",
    "Gameplay/Combat/canvasRenderer.js",
    "World/Result/settlementController.js",
    "UI/ChapterSelect/chapterSelectView.js","UI/Sweep/sweepDialogView.js",
    "World/Story/campaignStoryPlayerView.js","UI/PauseMenu/battlePauseView.js",
    "UI/HUD/battleUiView.js",
    "UI/FeaturePanels/mainFeaturePanelsView.js",
    "UI/FeaturePanels/socialFeaturePanelsView.js","UI/FeaturePanels/eventModeHubView.js",
    "Presentation/Endless/endlessModeEntryView.js",
    "Presentation/Endless/endlessModeSettlementView.js"
  ];

  for (var i = 0; i < h5Files.length; i++) {
    document.write('<script src="' + base + h5Files[i] + '?v=' + cacheVersion + '"><\/script>');
  }

  // ── Startup self-check: verify every expected module mounted on RXGame ──
  // document.write() queues parser-inserted scripts, but they are not guaranteed
  // to have executed before this external loader returns. Run the check after the
  // document has finished parsing so the result cannot report a false negative.
  function architectureSelfCheck() {
    var root = typeof globalThis !== "undefined" ? globalThis : this;
    var RX = root.RXGame;
    if (!RX) {
      console.error("[arch-check] RXGame global missing — loader order broken.");
      root.__RX_ARCH_CHECK__ = { ok: false, missing: ["RXGame"] };
      return;
    }
    // critical modules that MUST be present for the game to boot
    var critical = [
      "runtimeCore", "assets", "bus", "profile", "battleRules",
      "balance", "levels", "combatCodexConfig", "enemyStageBalance",
      "gameApp", "localGateway", "roomRegistry", "gameEventRouter", "gameGateway", "profileRuntime", "audioSystem",
      "battleState", "weaponSystem", "skillVisualTheme", "enemySystem", "enemyAI", "bossSystem", "fxSystem", "collisionSystem",
      "canvasRenderer", "fighterUpgradeAssets", "fighterUpgradeModel", "fighterUpgradeView",
      "resourceExchangeModel", "resourceExchangeView"
    ];
    var missing = [];
    for (var k = 0; k < critical.length; k++) {
      if (typeof RX[critical[k]] === "undefined") missing.push(critical[k]);
    }
    if (missing.length) {
      console.error("[arch-check] MISSING MODULES: " + missing.join(", ") +
        " — a file may have failed to load or its registration name changed.");
    } else {
      console.log("[arch-check] OK — " + critical.length + " critical modules mounted.");
    }
    root.__RX_ARCH_CHECK__ = { ok: missing.length === 0, missing: missing };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", architectureSelfCheck, { once: true });
  } else {
    setTimeout(architectureSelfCheck, 0);
  }
})();
