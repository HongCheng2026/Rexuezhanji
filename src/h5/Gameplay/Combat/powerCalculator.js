(function registerPowerCalculator(root) {
  "use strict";
  var scope = root.RXGame || (root.RXGame = {});

  function scoreStats(stats) {
    stats = stats || {};
    return Math.max(0, Math.round(
      (Number(stats.attack) || 0) * 10 +
      (Number(stats.maxHp) || 0) * 2 +
      (Number(stats.armorPenetration) || 0) * 1800
    ));
  }

  function calculateUnitPower(asset, type, profile) {
    if (!asset || (type !== "pilot" && type !== "ship")) return 0;
    var balance = scope.balance || {};
    if (type === "pilot" && profile && scope.rosterEconomy && scope.rosterEconomy.getPilotStats) {
      var promoted = scope.rosterEconomy.getPilotStats(profile, asset.id);
      if (promoted) return scoreStats({ attack: promoted.attack, maxHp: promoted.hp, armorPenetration: promoted.armorPenetration });
    }
    if (type === "ship" && profile && scope.rosterEconomy && scope.rosterEconomy.getShipStats) {
      var promotedShip = scope.rosterEconomy.getShipStats(profile, asset.id);
      if (promotedShip) return scoreStats({ attack: promotedShip.attack, maxHp: promotedShip.hp, armorPenetration: promotedShip.armorPenetration });
    }
    var rarityStats = type === "pilot" ? balance.PILOT_RARITY_STATS : balance.FIGHTER_RARITY_STATS;
    var rarity = rarityStats && rarityStats[asset.rank] ? rarityStats[asset.rank] : {};
    return scoreStats({
      attack: Number(asset.damage) || 0,
      maxHp: Number(asset.hp) || 0,
      armorPenetration: Number(rarity.armorPenetration) || Number(asset.armorPenetration) || 0
    });
  }

  // Lightweight active-power estimate used by the HUD. Computes only the three
  // core stats (attack / maxHp / armorPenetration) via combatStats.computeCoreStats
  // — no tactical assembly, weapon or skill snapshot resolution — so refreshing the
  // power number never triggers a full battle-loadout aggregation.
  function estimateActivePower(profile) {
    var combatStats = scope.combatStats || {};
    if (combatStats.computeCoreStats) {
      return scoreStats(combatStats.computeCoreStats(profile));
    }
    var loadoutProvider = scope.fighterUpgradeApi || scope.combatStats || {};
    var loadout = loadoutProvider.generateBattleLoadout ? loadoutProvider.generateBattleLoadout(profile) : null;
    return scoreStats(loadout && loadout.finalStats);
  }

  function calculateActivePower(profile) {
    return estimateActivePower(profile);
  }

  function calculateTotalPower(profile) {
    var assets = scope.assets || {};
    var pilotAssets = Array.isArray(assets.PILOT_ASSETS) ? assets.PILOT_ASSETS : [];
    var shipAssets = Array.isArray(assets.SHIP_ASSETS) ? assets.SHIP_ASSETS : [];
    var owned = profile && profile.owned ? profile.owned : {};
    var pilotIds = Array.from(new Set(Array.isArray(owned.pilots) ? owned.pilots : []));
    var shipIds = Array.from(new Set(Array.isArray(owned.ships) ? owned.ships : []));
    var pilots = pilotIds.map(function (id) {
      var asset = pilotAssets.find(function (candidate) { return candidate.id === id; });
      return asset ? { id: asset.id, name: asset.name, power: calculateUnitPower(asset, "pilot", profile) } : null;
    }).filter(Boolean);
    var ships = shipIds.map(function (id) {
      var asset = shipAssets.find(function (candidate) { return candidate.id === id; });
      return asset ? { id: asset.id, name: asset.name, power: calculateUnitPower(asset, "ship", profile) } : null;
    }).filter(Boolean);
    var pilotTotal = pilots.reduce(function (sum, item) { return sum + item.power; }, 0);
    var shipTotal = ships.reduce(function (sum, item) { return sum + item.power; }, 0);

    var defaultPilot = pilotAssets.find(function (asset) { return asset.id === assets.DEFAULT_PILOT_ID; }) || pilotAssets[0];
    var defaultShip = shipAssets.find(function (asset) { return asset.id === assets.DEFAULT_SHIP_ID; }) || shipAssets[0];
    var sharedUpgradePower = 0;
    if (defaultPilot && defaultShip && profile) {
      var baselineProfile = Object.assign({}, profile, {
        scene: Object.assign({}, profile.scene || {}, { pilotId: defaultPilot.id, shipId: defaultShip.id })
      });
      var unupgradedProfile = Object.assign({}, baselineProfile, {
        upgrades: { fire: 0, armor: 0, engine: 0, bounty: 0 },
        fighterUpgrades: { attack: 1, armorPenetration: 1, hp: 1 }
      });
      sharedUpgradePower = Math.max(0, calculateActivePower(baselineProfile) - calculateActivePower(unupgradedProfile));
    }

    return {
      total: pilotTotal + shipTotal + sharedUpgradePower,
      pilotTotal: pilotTotal,
      shipTotal: shipTotal,
      sharedUpgradePower: sharedUpgradePower,
      pilots: pilots,
      ships: ships
    };
  }

  var api = {
    scoreStats: scoreStats,
    calculateUnitPower: calculateUnitPower,
    estimateActivePower: estimateActivePower,
    calculateActivePower: calculateActivePower,
    calculateTotalPower: calculateTotalPower
  };

  scope.powerCalculator = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
