(function registerFighterUpgradeAssets(root) {
  "use strict";

  var scope = root.RXGame || (root.RXGame = {});
  var IDS = Object.freeze({
    attack: "attributeAttack",
    armorPenetration: "attributeArmor",
    hp: "attributeLife",
    empty: "slotEmpty",
    "sky-lock-beam": "activeLockBeam",
    "obsidian-gravity-well": "activeGravityWell",
    "gold-judgement": "activeJudgement",
    "gold-judgement-buff": "activeJudgement",
    "phase-shield": "activePhaseShield",
    laser: "weaponFixedLaser",
    weapon_fixed_01: "weaponFixedLaser",
    spread: "weaponFixedSpread",
    weapon_fixed_02: "weaponFixedSpread",
    missile: "weaponFixedMissile",
    weapon_fixed_03: "weaponFixedMissile",
    weapon_module_04: "weaponSidewing",
    weapon_module_05: "weaponOrbital",
    weapon_module_06: "weaponSwarm",
    "active-summon-wingman": "activeWingman",
    "active-decoy": "activeDecoy",
    "active-chain-lightning": "activeChainLightning",
    "active-black-hole": "activeBlackHole",
    "passive-front-spread": "passiveFrontSpread",
    "passive-railgun": "passiveRailgun",
    "passive-shockwave": "passiveShockwave",
    "passive-chain-lightning": "passiveChainLightning"
  });

  function escapeAttribute(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;");
  }

  function get(id) {
    var assets = scope.assets && scope.assets.TACTICAL_DOCK_ASSETS || {};
    return assets[IDS[String(id || "")]] || assets.slotEmpty || "";
  }

  function image(id) {
    var url = get(id);
    return url ? '<img class="fu-art" src="' + escapeAttribute(url) + '" alt="" aria-hidden="true">' : "";
  }

  scope.fighterUpgradeAssets = { IDS: IDS, get: get, image: image };
  if (typeof module !== "undefined" && module.exports) module.exports = scope.fighterUpgradeAssets;
})(typeof globalThis !== "undefined" ? globalThis : this);
