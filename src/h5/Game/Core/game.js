(function startH5Game(root) {
  "use strict";

  // Skip auto-boot when running tests or diagnostic pages.
  var pagePath = typeof location !== "undefined" ? (location.pathname || "") : "";
  if (/[\\/]test\.html$/i.test(pagePath) || (location && location.search && location.search.indexOf("noboot=1") >= 0)) {
    root.__RX_SKIP_BOOT__ = true;
    return;
  }

  var app = root.RXGame && root.RXGame.gameApp;
  if (!app || typeof app.boot !== "function") {
    throw new Error("H5 game bootstrap failed: missing game application.");
  }
  app.boot();
})(typeof globalThis !== "undefined" ? globalThis : window);
