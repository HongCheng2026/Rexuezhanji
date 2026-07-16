(function registerEndlessModeAssets(root) {
  "use strict";

  var scope = root.RXGame || (root.RXGame = {});

  function getFrames() {
    var assets = scope.assets && scope.assets.FEATURE_PANEL_ASSETS || {};
    return {
      entry: assets.endlessDarkTideEntryFrame || "",
      settlement: assets.endlessDarkTideSettlementFrame || ""
    };
  }

  var api = { getFrames: getFrames };
  scope.endlessModeAssets = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
