(function loadSharedCore() {
  const isSourceH5 = /(?:^|[\\/])H5(?:[\\/]|$)/.test(decodeURIComponent(location.pathname));
  // Netlify manual ZIP uploads may omit nested folders. Production therefore loads
  // the mirrored root copies, while source-H5 keeps using the canonical shared folder.
  const base = isSourceH5 ? "../shared/" : "";
  const files = ["balance.js", "levels.js", "enemyStageBalance.js", "stageStoryConfig.js", "battleStorySystem.js", "chapterMapSystem.js", "battleSettlementSystem.js", "failGuideSystem.js", "taskSystem.js", "achievementSystem.js", "sRankPriceConfig.js", "redeemCodeSystem.js", "shopConfig.js", "mainUiConfig.js", "runtimeCore.js", "assets.js", "profile.js", "battleRules.js"];
  for (const file of files) {
    document.write(`<script src="${base}${file}"><\/script>`);
  }
})();
