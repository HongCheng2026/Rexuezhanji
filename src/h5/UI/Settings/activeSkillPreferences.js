(function registerActiveSkillPreferences(root) {
  "use strict";

  var scope = root.RXGame || (root.RXGame = {});
  var STORAGE_KEY = "rx_active_skill_auto_v1";
  var memory = Object.create(null);
  var loaded = false;

  function load() {
    if (loaded) return memory;
    loaded = true;
    if (!root.localStorage) return memory;
    try {
      var parsed = JSON.parse(root.localStorage.getItem(STORAGE_KEY) || "{}");
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return memory;
      Object.keys(parsed).forEach(function copyPreference(id) {
        if (typeof parsed[id] === "boolean") memory[id] = parsed[id];
      });
    } catch (error) {
      memory = Object.create(null);
    }
    return memory;
  }

  function isEnabled(skillId) {
    var id = String(skillId || "");
    return Boolean(id && load()[id]);
  }

  function setEnabled(skillId, enabled) {
    var id = String(skillId || "");
    if (!id) return false;
    load()[id] = Boolean(enabled);
    save();
    return memory[id];
  }

  function save() {
    if (!root.localStorage) return;
    try {
      root.localStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
    } catch (error) {
      // Private browsing or a full storage quota must not break combat.
    }
  }

  function resetForTests() {
    memory = Object.create(null);
    loaded = true;
  }

  var api = {
    STORAGE_KEY: STORAGE_KEY,
    isEnabled: isEnabled,
    setEnabled: setEnabled,
    resetForTests: resetForTests
  };

  scope.activeSkillPreferences = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
