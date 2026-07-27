(function registerH5GameApp(root) {
  "use strict";

  var scope = root.RXGame || (root.RXGame = {});

  function boot() {
    if (!scope.applicationRuntime || typeof scope.applicationRuntime.boot !== "function") {
      throw new Error("H5 game bootstrap failed: application runtime missing.");
    }
    return scope.applicationRuntime.boot();
  }

  scope.gameApp = { boot: boot };
})(typeof globalThis !== "undefined" ? globalThis : window);
