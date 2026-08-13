(function registerGachaStateStore(root) {
  "use strict";
  var scope = root.RXGame || (root.RXGame = {});

  function create(options) {
    options = options || {};
    var storage = options.storage || root.localStorage;
    var config = options.config || scope.gachaConfig;
    var profileKey = options.profileKey || (scope.profileRuntime && scope.profileRuntime.STORAGE_KEY) || "rxgame_save_v5";
    var key = config.STATE_KEY_PREFIX + profileKey;

    function normalize(value) {
      return scope.gachaModel && scope.gachaModel.normalizeState
        ? scope.gachaModel.normalizeState(value)
        : { version: 1, target: null, pity: 0, totalDraws: 0, history: [] };
    }
    function snapshot() { return storage.getItem(key); }
    function load() {
      try {
        var raw = snapshot();
        return raw ? normalize(JSON.parse(raw)) : normalize({});
      } catch (error) {
        return normalize({});
      }
    }
    function save(value) {
      var next = normalize(value);
      storage.setItem(key, JSON.stringify(next));
      return next;
    }
    function restore(raw) {
      if (raw == null) storage.removeItem(key);
      else storage.setItem(key, raw);
    }
    return { key: key, load: load, save: save, snapshot: snapshot, restore: restore };
  }

  var api = { create: create };
  scope.gachaStateStore = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
