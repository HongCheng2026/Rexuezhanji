(function defineVisualQualitySystem(root) {
  "use strict";

  var scope = root.RXGame || (root.RXGame = {});
  var STORAGE_KEY = "rx_visual_quality_mode_v1";
  var VALID_MODES = { smooth: true, auto: true, quality: true };

  function create(options) {
    options = options || {};
    var storage = options.storage || root.localStorage;
    var navigatorInfo = options.navigator || root.navigator || {};
    var mode = readMode(storage);

    function isLowSpecDevice() {
      var memory = Number(navigatorInfo.deviceMemory);
      var cores = Number(navigatorInfo.hardwareConcurrency);
      return (memory > 0 && memory <= 4) || (cores > 0 && cores <= 4);
    }

    function getSettings() {
      var profile = getEffectiveProfile();
      return {
        mode: mode,
        effectiveMode: profile.effectiveMode,
        deviceTier: profile.deviceTier,
        renderScale: profile.renderScale,
        glowBulletBudget: profile.glowBulletBudget,
        highDensityBulletBudget: profile.highDensityBulletBudget,
        hardBulletBudget: profile.hardBulletBudget,
        hardFxStride: profile.hardFxStride,
        particleStride: profile.particleStride
      };
    }

    function setMode(nextMode) {
      nextMode = String(nextMode || "").toLowerCase();
      if (!VALID_MODES[nextMode]) return getSettings();
      mode = nextMode;
      try {
        if (storage && storage.setItem) storage.setItem(STORAGE_KEY, mode);
      } catch (error) {}
      return getSettings();
    }

    function getEffectiveProfile() {
      var lowSpec = isLowSpecDevice();
      var effectiveMode = mode === "auto" ? (lowSpec ? "smooth" : "auto") : mode;
      var profile = effectiveMode === "smooth"
        ? { renderScale: 1, glowBulletBudget: 80, highDensityBulletBudget: 220, particleStride: 2 }
        : effectiveMode === "quality"
          ? { renderScale: 1.25, glowBulletBudget: 180, highDensityBulletBudget: 400, particleStride: 1 }
          : { renderScale: 1.25, glowBulletBudget: 140, highDensityBulletBudget: 320, particleStride: 1 };
      return {
        mode: mode,
        effectiveMode: effectiveMode,
        deviceTier: lowSpec ? "low" : "normal",
        renderScale: profile.renderScale,
        glowBulletBudget: profile.glowBulletBudget,
        highDensityBulletBudget: profile.highDensityBulletBudget,
        hardBulletBudget: 700,
        hardFxStride: 3,
        particleStride: profile.particleStride
      };
    }

    return {
      getSettings: getSettings,
      setMode: setMode,
      getEffectiveProfile: getEffectiveProfile
    };
  }

  function readMode(storage) {
    try {
      var value = storage && storage.getItem ? String(storage.getItem(STORAGE_KEY) || "") : "";
      return VALID_MODES[value] ? value : "auto";
    } catch (error) {
      return "auto";
    }
  }

  var singleton = create();
  singleton.create = create;
  singleton.STORAGE_KEY = STORAGE_KEY;
  scope.visualQualitySystem = singleton;
  if (typeof module !== "undefined" && module.exports) module.exports = singleton;
})(typeof globalThis !== "undefined" ? globalThis : this);
