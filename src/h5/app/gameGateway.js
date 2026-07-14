(function registerGameGateway(root) {
  "use strict";

  var scope = root.RXGame || (root.RXGame = {});
  var CLOUD_HOSTS = ["rexuezhanji.top", "www.rexuezhanji.top"];

  function getStorageOverride(locationRef) {
    var search = String(locationRef && locationRef.search || "");
    var match = search.match(/(?:^|[?&])storage=(local|cloud)(?:&|$)/i);
    return match ? match[1].toLowerCase() : "";
  }

  function shouldUseCloud(locationRef, requestedMode) {
    var hostname = String(locationRef && locationRef.hostname || "").toLowerCase();
    if (CLOUD_HOSTS.indexOf(hostname) >= 0) return true;
    if (requestedMode === "local") return false;
    if (requestedMode === "cloud") return true;
    var override = getStorageOverride(locationRef);
    if (override) return override === "cloud";
    return false;
  }

  function unavailableCloud() {
    var error = new Error("云存档尚未连接，请稍后重试。");
    error.code = "CLOUD_UNAVAILABLE";
    return Promise.reject(error);
  }

  function callAdapter(adapter, method, args, mode) {
    if (!adapter || typeof adapter[method] !== "function") {
      if (mode === "cloud") return unavailableCloud();
      var missing = new Error("本地游戏服务缺少 " + method + " 接口。");
      missing.code = "LOCAL_GATEWAY_MISSING";
      return Promise.reject(missing);
    }
    return Promise.resolve().then(function invokeAdapter() {
      return adapter[method].apply(adapter, args || []);
    });
  }

  function create(options) {
    options = options || {};
    var useCloud = shouldUseCloud(options.location || root.location, options.mode);
    var cloud = options.cloud || root.RXCloud || null;
    var local = options.local || null;
    var cloudReady = cloud && (!cloud.configured || cloud.configured());
    var mode = useCloud ? "cloud" : "local";
    var adapter = useCloud && cloudReady ? cloud : useCloud ? null : local;

    return {
      mode: mode,
      isCloud: mode === "cloud",
      bootstrap: function bootstrap() {
        return callAdapter(adapter, "bootstrap", [], mode);
      },
      identity: function identity() {
        return callAdapter(adapter, "identity", [], mode);
      },
      startBattle: function startBattle(levelId) {
        return callAdapter(adapter, "startBattle", [levelId], mode);
      },
      finishBattle: function finishBattle(ticket, levelId, rating, details) {
        return callAdapter(adapter, "finishBattle", [ticket, levelId, rating, details], mode);
      },
      abandonBattle: function abandonBattle(ticket) {
        return callAdapter(adapter, "abandonBattle", [ticket], mode);
      },
      sweep: function sweep(levelId) {
        return callAdapter(adapter, "sweep", [levelId], mode);
      },
      upgrade: function upgrade(key) {
        return callAdapter(adapter, "upgrade", [key], mode);
      },
      upgradeFighter: function upgradeFighter(statType) {
        return callAdapter(adapter, "upgradeFighter", [statType], mode);
      },
      buyPilot: function buyPilot(pilotId) {
        return callAdapter(adapter, "buyPilot", [pilotId], mode);
      },
      buyShip: function buyShip(shipId) {
        return callAdapter(adapter, "buyShip", [shipId], mode);
      },
      buyWeaponModule: function buyWeaponModule(moduleId) {
        return callAdapter(adapter, "buyWeaponModule", [moduleId], mode);
      },
      equipWeaponModule: function equipWeaponModule(moduleId) {
        return callAdapter(adapter, "equipWeaponModule", [moduleId], mode);
      },
      redeem: function redeem(code) {
        return callAdapter(adapter, "redeem", [code], mode);
      },
      saveCosmetics: function saveCosmetics(profile) {
        return callAdapter(adapter, "saveCosmetics", [profile], mode);
      }
    };
  }

  var api = {
    CLOUD_HOSTS: CLOUD_HOSTS.slice(),
    shouldUseCloud: shouldUseCloud,
    create: create
  };

  scope.gameGateway = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
