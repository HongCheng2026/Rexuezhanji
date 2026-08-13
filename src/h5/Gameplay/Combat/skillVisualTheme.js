(function registerSkillVisualTheme(root) {
  "use strict";

  var scope = root.RXGame || (root.RXGame = {});
  var AUTO_CLASS_COLOR = "#63ffb4";

  function freezeVisual(primary, secondary, trail, shape) {
    return Object.freeze({
      tier: "automatic",
      classColor: AUTO_CLASS_COLOR,
      primary: primary,
      secondary: secondary,
      trail: trail,
      shape: shape
    });
  }

  var AUTO_SKILL_VISUALS = Object.freeze({
    "auto-sidewing": freezeVisual("#63ffb4", "#d8ffe9", "rgba(73,255,172,0.50)", "split-chevron"),
    "extension-sidewing": freezeVisual("#63ffb4", "#d8ffe9", "rgba(73,255,172,0.50)", "split-chevron"),
    "auto-orbital": freezeVisual("#a8ffe0", "#42ffc2", "rgba(66,255,194,0.48)", "long-spear"),
    "extension-orbital": freezeVisual("#a8ffe0", "#42ffc2", "rgba(66,255,194,0.48)", "long-spear"),
    "auto-swarm": freezeVisual("#9effc4", "#8b7dff", "rgba(86,255,181,0.46)", "guided-comet"),
    "extension-swarm": freezeVisual("#9effc4", "#8b7dff", "rgba(86,255,181,0.46)", "guided-comet"),
    "auto-front-spread": freezeVisual("#b9ff70", "#54ffb1", "rgba(105,255,163,0.44)", "wide-fan"),
    "auto-railgun": freezeVisual("#e7fff4", "#54ffb7", "rgba(84,255,183,0.52)", "heavy-rail"),
    "auto-shockwave": freezeVisual("#63ffb4", "#c8ffe4", "rgba(99,255,180,0.42)", "concentric-ring"),
    "auto-chain-lightning": freezeVisual("#76ffc2", "#d8fff0", "rgba(86,255,181,0.42)", "segmented-arc"),
    "auto-sky-lock": freezeVisual("#9dffe0", "#ffffff", "rgba(99,255,180,0.46)", "precision-beam"),
    "auto-gravity-well": freezeVisual("#45e89d", "#ab72ff", "rgba(69,232,157,0.38)", "gravity-spiral"),
    "auto-judgement": freezeVisual("#aaff83", "#ffe27a", "rgba(113,255,158,0.40)", "orbit-rune"),
    "auto-phase-shield": freezeVisual("#63ffb4", "#a9fff0", "rgba(99,255,180,0.36)", "hex-shield")
  });

  var ACTIVE_SKILL_VISUALS = Object.freeze({
    "active-summon-wingman": Object.freeze({ tier: "premium", primary: "#54eaff", secondary: "#ffffff", accent: "#6687ff" }),
    "active-decoy": Object.freeze({ tier: "premium", primary: "#ffd36b", secondary: "#fff5c7", accent: "#ff8a35" }),
    "active-chain-lightning": Object.freeze({ tier: "premium", primary: "#54c8ff", secondary: "#ffffff", accent: "#7b5cff" }),
    "active-black-hole": Object.freeze({ tier: "premium", primary: "#b96dff", secondary: "#e9f8ff", accent: "#39c8ff" })
  });

  function getAutoVisual(visualId) {
    return AUTO_SKILL_VISUALS[String(visualId || "")] || null;
  }

  function getActiveVisual(skillId) {
    return ACTIVE_SKILL_VISUALS[String(skillId || "")] || null;
  }

  function isAutoVisualId(visualId) {
    return Boolean(getAutoVisual(visualId));
  }

  var api = Object.freeze({
    AUTO_CLASS_COLOR: AUTO_CLASS_COLOR,
    AUTO_SKILL_VISUALS: AUTO_SKILL_VISUALS,
    ACTIVE_SKILL_VISUALS: ACTIVE_SKILL_VISUALS,
    getAutoVisual: getAutoVisual,
    getActiveVisual: getActiveVisual,
    isAutoVisualId: isAutoVisualId
  });

  scope.skillVisualTheme = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
