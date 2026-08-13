(function registerDemoMode(root) {
  "use strict";

  var scope = root.RXGame || (root.RXGame = {});

  function parseQueryParams(search) {
    var params = {};
    String(search || "").replace(/^\?/, "").split("&").forEach(function parse(part) {
      if (!part) return;
      var pair = part.split("=");
      var key = decodeURIComponent(pair[0] || "");
      if (!key) return;
      params[key] = decodeURIComponent((pair.slice(1).join("=") || "").replace(/\+/g, " "));
    });
    return params;
  }

  function create(options) {
    options = options || {};
    var shared = options.shared || scope;
    var levels = options.levels || [];
    var levelsConfig = options.levelsConfig || {};
    var clamp = options.clamp || function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); };
    var params = parseQueryParams(root.location && root.location.search);
    var requestedLevel = Math.floor(Number(params.level) || 1);
    var config = {
      enabled: params.demo === "influencer",
      levelId: clamp(requestedLevel, 1, levels.length || 1)
    };

    function createProfile() {
      var demoLevel = 30;
      var totalExp = (levelsConfig.COMMANDER_TOTAL_EXP_BY_LEVEL || [])[demoLevel] || 2946;
      var profile = shared.profile.createProfile({
        unlockedLevel: levels.length || 1,
        completed: [1, 2, 3],
        upgrades: { fire: 0, armor: 3, engine: 1, bounty: 0 },
        fighterUpgrades: { attack: 30, armorPenetration: 8, hp: 18 },
        player: { name: "Demo Pilot", level: demoLevel, totalExp: totalExp, exp: 0, honorLevel: 3, equippedHonorLevel: 3, badge: "III" },
        resources: { energy: 999, maxEnergy: 999, gold: 1800, diamonds: 0, lastEnergyAt: Date.now() }
      });
      profile.__demoInfluencer = true;
      profile.unlockedLevel = levels.length || profile.unlockedLevel || 1;
      profile.resources = profile.resources || {};
      profile.resources.energy = Math.max(profile.resources.energy || 0, options.energyCost || 5);
      return profile;
    }

    return { config: config, createProfile: createProfile };
  }

  scope.demoMode = { create: create, parseQueryParams: parseQueryParams };
  if (typeof module !== "undefined" && module.exports) module.exports = { create: create, parseQueryParams: parseQueryParams };
})(typeof globalThis !== "undefined" ? globalThis : this);
