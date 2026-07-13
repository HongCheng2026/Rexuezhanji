(function loadSharedCore() {
  const pagePath = decodeURIComponent(location.pathname).replace(/\\/g, "/");
  const isLocalServer = /^(127\.0\.0\.1|localhost|\[::1\])$/i.test(location.hostname);
  const isReleasePackage = /(?:^|\/)release\/netlify-h5(?:\/|$)/i.test(pagePath);
  const isSourceH5 = !isReleasePackage && (isLocalServer || /(?:^|\/)src\/h5(?:\/|$)/i.test(pagePath) || /(?:^|\/)H5(?:\/|$)/.test(pagePath) || /(?:^|\/)h5\//i.test(pagePath));
  const cacheVersion = "20260713-story-bosses-v2";
  // Netlify manual ZIP uploads may omit nested folders. Production therefore loads
  // the mirrored root copies, while source-H5 keeps using the canonical shared folder.
  const base = isSourceH5 ? "../shared/" : "";
  const files = ["balance.js", "levels.js", "enemyStageBalance.js", "campaignStoryFramework.js", "stageStoryConfig.js", "battleStorySystem.js", "chapterMapSystem.js", "battleSettlementSystem.js", "failGuideSystem.js", "taskSystem.js", "achievementSystem.js", "sRankPriceConfig.js", "redeemCodeSystem.js", "shopConfig.js", "featurePanelContent.js", "mainUiConfig.js", "runtimeCore.js", "assets.js", "profile.js", "battleRules.js"];
  for (const file of files) {
    document.write(`<script src="${base}${file}?v=${cacheVersion}"><\/script>`);
  }

  // Load H5-only modules from both source preview and release packages.
  var h5Files = [
    "app/gameGateway.js",
    "meta/combatStats.js",
    "meta/profileRuntime.js",
    "meta/progressionSystem.js",
    "battle/fxSystem.js",
    "battle/canvasRenderer.js",
    "battle/battleState.js",
    "battle/weaponSystem.js",
    "battle/enemySystem.js",
    "battle/bossSystem.js",
    "battle/collisionSystem.js",
    "battle/dropSystem.js",
    "battle/settlementSystem.js",
    "battle/battleRuntime.js",
    "audioSystem.js",
    "ui/settlementController.js",
    "ui/lobbyView.js",
    "ui/chapterSelectView.js",
    "ui/campaignStoryPlayerView.js",
    "ui/battleHudView.js",
    "ui/pilotGalleryView.js",
    "ui/shipGalleryView.js",
    "ui/mainFeaturePanelsView.js",
    "ui/starWingsGachaView.js",
    "app/lobbyController.js",
    "app/profileController.js",
    "app/fighterUpgradeController.js",
    "app/featurePanelController.js",
    "app/battleFlowController.js",
    "app/gameEventRouter.js",
    "app/gameApp.js"
  ];
  for (var i = 0; i < h5Files.length; i++) {
    document.write('<script src="' + h5Files[i] + '?v=' + cacheVersion + '"><\/script>');
  }
})();
