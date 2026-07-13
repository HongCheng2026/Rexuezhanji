(function startH5Game(root) {
  "use strict";

  var app = root.RXGame && root.RXGame.gameApp;
  if (!app || typeof app.boot !== "function") {
    throw new Error("H5 game bootstrap failed: missing game application.");
  }
  app.boot();
})(typeof globalThis !== "undefined" ? globalThis : window);
