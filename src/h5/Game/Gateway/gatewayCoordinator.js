(function registerGatewayCoordinator(root) {
  "use strict";

  var scope = root.RXGame || (root.RXGame = {});

  function create(options) {
    options = options || {};
    var gateway = null;
    var readyPromise = null;
    var lastError = null;

    function initialize() {
      var localSnapshot = options.cloneProfile(options.getProfile());
      var gatewayModule = options.gatewayModule;
      if (!gatewayModule || !gatewayModule.create) {
        lastError = new Error("游戏数据入口加载失败。");
        if (options.onErrorChange) options.onErrorChange(lastError);
        return Promise.reject(lastError);
      }
      var localAdapter = options.createLocalAdapter();
      var cloudAdapter = root.RXCloud || null;
      if (!options.localOnly && options.createCloudAdapter) {
        cloudAdapter = options.createCloudAdapter(cloudAdapter, localAdapter);
      }
      gateway = gatewayModule.create({
        mode: options.localOnly ? "local" : undefined,
        local: localAdapter,
        cloud: cloudAdapter
      });
      if (options.onGatewayChange) options.onGatewayChange(gateway);
      readyPromise = gateway.bootstrap().then(function onBootstrap(result) {
        var nextProfile = result && result.profile ? result.profile : options.getProfile();
        var shouldMigrate = gateway.isCloud && root.localStorage.getItem(options.cosmeticsMigrationKey) !== "1";
        if (shouldMigrate) nextProfile = options.mergeLocalCosmetics(nextProfile, localSnapshot);
        options.applyGatewayProfile(nextProfile);
        lastError = null;
        if (options.onErrorChange) options.onErrorChange(null);
        if (shouldMigrate && options.hasCosmeticDifference(result && result.profile, nextProfile)) {
          return gateway.saveCosmetics(nextProfile).then(function onCosmeticsSaved(saved) {
            options.applyGatewayProfile(saved && saved.profile ? saved.profile : nextProfile);
            root.localStorage.setItem(options.cosmeticsMigrationKey, "1");
          });
        }
        if (shouldMigrate) root.localStorage.setItem(options.cosmeticsMigrationKey, "1");
        return null;
      }).then(function onReady() {
        if (options.setUiState) options.setUiState(true, gateway);
        if (options.refreshViews) options.refreshViews();
        return gateway;
      }).catch(function onError(error) {
        lastError = error;
        if (options.onErrorChange) options.onErrorChange(error);
        if (options.setUiState) options.setUiState(false, gateway);
        if (gateway && gateway.isCloud && root.console && root.console.error) root.console.error("Cloud game bootstrap failed", error);
        throw error;
      });
      readyPromise.catch(function ignoreInitialGatewayError() {});
      return readyPromise;
    }

    function ensure() {
      return readyPromise || initialize();
    }

    return {
      initialize: initialize,
      ensure: ensure,
      getGateway: function getGateway() { return gateway; },
      getError: function getError() { return lastError; }
    };
  }

  scope.gatewayCoordinator = { create: create };
  if (typeof module !== "undefined" && module.exports) module.exports = { create: create };
})(typeof globalThis !== "undefined" ? globalThis : this);
