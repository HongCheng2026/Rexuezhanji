(function registerCombatStats(root) {
  "use strict";
  var scope = root.RXGame || (root.RXGame = {});

  function freezeStats(stats) {
    return Object.freeze(Object.assign({}, stats || {}));
  }

  // Generic additive stat aggregator. Each progression system registers a
  // contributor (name + fn(ctx) -> { stat: { add: number } }) and the aggregator
  // sums every "add" contribution per core stat in registration order. This is
  // the flat-addition bucket from the design doc; the god-function no longer
  // hard-codes the per-system math. Non-numeric assembly is kept out of it.
  var StatAggregator = (function () {
    function create() {
      var contributors = [];
      function register(name, fn) { contributors.push({ name: name, fn: fn }); }
      function reduce(ctx) {
        var acc = { attack: 0, maxHp: 0, armorPenetration: 0 };
        for (var i = 0; i < contributors.length; i++) {
          var delta = contributors[i].fn(ctx) || {};
          if (delta.attack && typeof delta.attack.add === "number") acc.attack += delta.attack.add;
          if (delta.maxHp && typeof delta.maxHp.add === "number") acc.maxHp += delta.maxHp.add;
          if (delta.armorPenetration && typeof delta.armorPenetration.add === "number") acc.armorPenetration += delta.armorPenetration.add;
        }
        return acc;
      }
      return { register: register, reduce: reduce };
    }
    return { create: create };
  })();

  function createMetaSkillSnapshot(definition, level, levelStats, finalAttack, armorPierceRatio) {
    if (!definition || !levelStats || !(level > 0)) return null;
    var stats = Object.assign({}, levelStats);
    var multiplier = Math.max(0, Number(stats.damageMultiplier) || 0);
    if (multiplier) stats.damagePerProjectile = Math.max(1, Math.round(finalAttack * multiplier));
    if (definition.id === "passive-shockwave" && multiplier) stats.damagePerRing = Math.max(1, Math.round(finalAttack * multiplier));
    if (definition.id === "passive-chain-lightning" && multiplier) stats.damagePerHit = Math.max(1, Math.round(finalAttack * multiplier));
    if (Number(stats.damageBudget) > 0) stats.totalDamage = Math.max(1, Math.round(finalAttack * Number(stats.damageBudget)));
    if (Number(stats.hitMultiplier) > 0) stats.damagePerHit = Math.max(1, Math.round(finalAttack * Number(stats.hitMultiplier)));
    if (Number(stats.ringMultiplier) > 0) stats.damagePerRing = Math.max(1, Math.round(finalAttack * Number(stats.ringMultiplier)));
    if (Number(stats.shotMultiplier) > 0) stats.damagePerProjectile = Math.max(1, Math.round(finalAttack * Number(stats.shotMultiplier)));
    stats.fireInterval = Math.max(0.01, Number(stats.fireInterval || stats.interval) || defaultFireInterval(definition.id));
    stats.projectileCount = Math.max(1, Math.floor(Number(stats.projectileCount || stats.trajectoryCount || stats.shots) || 1));
    stats.trajectoryCount = Math.max(1, Math.floor(Number(stats.trajectoryCount || stats.projectileCount || stats.shots) || 1));
    stats.targetCount = Math.max(1, Math.floor(Number(stats.targetCount || stats.jumps) || 1));
    stats.projectileSpeed = Math.max(1, Number(stats.projectileSpeed) || 600);
    stats.pierceTargets = Math.max(1, Math.floor(Number(stats.pierceTargets) || 1));
    stats.armorPierceRatio = Math.max(0, Number(armorPierceRatio) || 0);
    return Object.freeze({
      id: String(definition.id || ""),
      name: String(definition.name || ""),
      category: String(definition.category || ""),
      source: "meta",
      level: Math.max(1, Math.floor(Number(level) || 1)),
      visualId: String(definition.visualId || definition.id || ""),
      autoCondition: definition.autoCondition || null,
      resolvedStats: freezeStats(stats)
    });
  }

  function defaultFireInterval(id) {
    if (id === "passive-front-spread") return 0.8;
    if (id === "passive-shockwave") return 8;
    if (id === "passive-chain-lightning") return 6;
    return 5;
  }

  function createFixedSnapshot(definition, level, balance, finalAttack, armorPierceRatio) {
    var raw = balance && balance.getWeaponLevelStats ? balance.getWeaponLevelStats(definition.weaponType, level) : {};
    return Object.freeze({
      id: definition.id,
      name: definition.name,
      category: "fixed",
      weaponType: definition.weaponType,
      source: "battle",
      level: Math.max(0, Math.floor(Number(level) || 0)),
      visualId: definition.visualId || definition.id,
      resolvedStats: freezeStats(Object.assign({}, raw, {
        finalAttack: finalAttack,
        armorPierceRatio: armorPierceRatio
      }))
    });
  }

  function getEffectiveRank(profile, ship) {
    return profile.shipRanks && profile.shipRanks[ship.id]
      ? String(profile.shipRanks[ship.id]).toUpperCase()
      : String(ship.rank || "B").toUpperCase();
  }

  function capActiveGrade(globalGrade, fighterRank) {
    var gradeConfig = scope.skillGradeConfig || {};
    var max = gradeConfig.getMaxActiveGradeForTier ? gradeConfig.getMaxActiveGradeForTier(fighterRank) : fighterRank;
    var order = gradeConfig.ACTIVE_GRADES || ["D", "C", "B", "A", "S", "SS", "SSS"];
    var desiredIndex = Math.max(0, order.indexOf(String(globalGrade || "D").toUpperCase()));
    var maxIndex = Math.max(0, order.indexOf(String(max || "D").toUpperCase()));
    return order[Math.min(desiredIndex, maxIndex)] || "D";
  }

  // Lightweight pure helper: returns ONLY the three core combat numbers
  // (attack / maxHp / armorPenetration) that power the HUD active-power figure.
  // Mirrors the exact math used inside generateBattleLoadout so the two can
  // never drift. Does NOT resolve tactical assembly / auto skills / weapons,
  // keeping it cheap enough to run on every HUD refresh.
  function computeCoreStats(profile) {
    profile = profile || {};
    var assets = scope.assets || {};
    var balance = scope.balance || {};
    var levelsConfig = scope.levels || {};
    var pilot = (assets.PILOT_ASSETS || []).find(function (a) { return a.id === profile.scene.pilotId; }) || (assets.PILOT_ASSETS || [])[0];
    var ship = (assets.SHIP_ASSETS || []).find(function (a) { return a.id === profile.scene.shipId; }) || (assets.SHIP_ASSETS || [])[0];
    if (!pilot || !ship) return { attack: 0, maxHp: 0, armorPenetration: 0 };
    var pilotStats = scope.rosterEconomy && scope.rosterEconomy.getPilotStats
      ? scope.rosterEconomy.getPilotStats(profile, pilot.id)
      : null;
    var shipStats = scope.rosterEconomy && scope.rosterEconomy.getShipStats
      ? scope.rosterEconomy.getShipStats(profile, ship.id)
      : null;
    var pilotRank = pilotStats && pilotStats.rank ? pilotStats.rank : pilot.rank;
    var shipRank = shipStats && shipStats.rank ? shipStats.rank : getEffectiveRank(profile, ship);
    var ups = profile.upgrades || {};
    var fighterUps = (scope.fighterUpgradeApi && scope.fighterUpgradeApi.getLevels)
      ? scope.fighterUpgradeApi.getLevels(profile)
      : (profile.fighterUpgrades || {});
    var pilotPen = pilotStats ? pilotStats.armorPenetration : (balance.PILOT_RARITY_STATS && balance.PILOT_RARITY_STATS[pilotRank] ? balance.PILOT_RARITY_STATS[pilotRank].armorPenetration : 0);
    var shipPen = shipStats ? shipStats.armorPenetration : (balance.FIGHTER_RARITY_STATS && balance.FIGHTER_RARITY_STATS[shipRank] ? balance.FIGHTER_RARITY_STATS[shipRank].armorPenetration : (Number(ship.armorPenetration) || 0));
    var upgradePen = (fighterUps.armorPenetration || 1) * (levelsConfig.FIGHTER_UPGRADE_STAT_GAIN && levelsConfig.FIGHTER_UPGRADE_STAT_GAIN.armorPenetrationPerLevel || 0.001);
    var totalArmorPenetration = pilotPen + shipPen + upgradePen;
    var fighterAttackBonus = Math.max(0, (fighterUps.attack || 1) - 1) * (levelsConfig.FIGHTER_UPGRADE_STAT_GAIN && levelsConfig.FIGHTER_UPGRADE_STAT_GAIN.attackPerLevel || 1);
    var pilotAttack = pilotStats ? pilotStats.attack : (pilot.damage || 0);
    var shipAttack = shipStats ? shipStats.attack : Math.max(0, Number(ship.damage) || 0);
    var attack = Math.round(pilotAttack + shipAttack + fighterAttackBonus);
    var hpPerLevel = levelsConfig.FIGHTER_UPGRADE_STAT_GAIN && levelsConfig.FIGHTER_UPGRADE_STAT_GAIN.hpPerLevel || 10;
    var pilotHpBonus = pilotStats ? Math.max(0, Number(pilotStats.hp) || 0) : Math.max(0, Number(pilot.hp) || 0);
    var shipHpBonus = shipStats ? shipStats.hp : Math.max(0, Number(ship.hp) || 0);
    var maxHp = pilotHpBonus + shipHpBonus + (ups.armor || 0) * 20 + Math.max(0, (fighterUps.hp || 1) - 1) * hpPerLevel;
    if (scope.codexSystem && scope.codexSystem.calculateBonus) {
      var codexBonus = scope.codexSystem.calculateBonus(profile) || {};
      attack += codexBonus.attackFlat || 0;
      totalArmorPenetration += codexBonus.armorPenetrationFlat || 0;
    }
    return { attack: attack, maxHp: maxHp, armorPenetration: totalArmorPenetration };
  }

  // Public entry point. Delegates the expensive aggregation to
  // computeBattleLoadoutInternal, but only when the inputs (hashed) or the
  // profile version (profile.__loadoutVersion, bumped by profileStore) changed.
  // Repeated calls with unchanged inputs return the same cached, immutable
  // loadout object. When DerivedStatsCache is not loaded the aggregation always
  // runs (used by isolated unit tests that don't register the cache module).
  function generateBattleLoadout(profile) {
    var cache = scope.DerivedStatsCache;
    var version = (profile && profile.__loadoutVersion) || 0;
    if (cache && typeof cache.get === "function") {
      return cache.get(profile, version, function () { return computeBattleLoadoutInternal(profile); });
    }
    return computeBattleLoadoutInternal(profile);
  }

  function computeBattleLoadoutInternal(profile) {
    var assets = scope.assets || {};
    var balance = scope.balance || {};
    var levelsConfig = scope.levels || {};
    var pilot = (assets.PILOT_ASSETS || []).find(function (a) { return a.id === profile.scene.pilotId; }) || (assets.PILOT_ASSETS || [])[0];
    var ship = (assets.SHIP_ASSETS || []).find(function (a) { return a.id === profile.scene.shipId; }) || (assets.SHIP_ASSETS || [])[0];
    var pilotStats = scope.rosterEconomy && scope.rosterEconomy.getPilotStats
      ? scope.rosterEconomy.getPilotStats(profile, pilot.id)
      : null;
    var shipStats = scope.rosterEconomy && scope.rosterEconomy.getShipStats
      ? scope.rosterEconomy.getShipStats(profile, ship.id)
      : null;
    var pilotRank = pilotStats && pilotStats.rank ? pilotStats.rank : pilot.rank;
    var shipRank = shipStats && shipStats.rank ? shipStats.rank : getEffectiveRank(profile, ship);
    var ups = profile.upgrades || {};
    var fighterUps = (scope.fighterUpgradeApi && scope.fighterUpgradeApi.getLevels)
      ? scope.fighterUpgradeApi.getLevels(profile)
      : (profile.fighterUpgrades || {});
    // ── Numeric aggregation via registered StatAggregator contributors ──
    // Each progression system (pilot / ship / fighterUpgrade / codex) registers a
    // contributor returning additive deltas for the three core combat stats. The
    // aggregator sums them. Non-numeric assembly (active slots, auto skills,
    // decisive command, passive skills) is resolved separately below and is NOT
    // part of this numeric bucket.
    var pilotPen = pilotStats ? pilotStats.armorPenetration : (balance.PILOT_RARITY_STATS && balance.PILOT_RARITY_STATS[pilotRank] ? balance.PILOT_RARITY_STATS[pilotRank].armorPenetration : 0);
    var shipPen = shipStats ? shipStats.armorPenetration : (balance.FIGHTER_RARITY_STATS && balance.FIGHTER_RARITY_STATS[shipRank] ? balance.FIGHTER_RARITY_STATS[shipRank].armorPenetration : (Number(ship.armorPenetration) || 0));
    var upgradePen = (fighterUps.armorPenetration || 1) * (levelsConfig.FIGHTER_UPGRADE_STAT_GAIN && levelsConfig.FIGHTER_UPGRADE_STAT_GAIN.armorPenetrationPerLevel || 0.001);
    var fighterAttackBonus = Math.max(0, (fighterUps.attack || 1) - 1) * (levelsConfig.FIGHTER_UPGRADE_STAT_GAIN && levelsConfig.FIGHTER_UPGRADE_STAT_GAIN.attackPerLevel || 1);
    var pilotAttack = pilotStats ? pilotStats.attack : (pilot.damage || 0);
    var shipAttack = shipStats ? shipStats.attack : Math.max(0, Number(ship.damage) || 0);
    var hpPerLevel = levelsConfig.FIGHTER_UPGRADE_STAT_GAIN && levelsConfig.FIGHTER_UPGRADE_STAT_GAIN.hpPerLevel || 10;
    var pilotHpBonus = pilotStats ? Math.max(0, Number(pilotStats.hp) || 0) : Math.max(0, Number(pilot.hp) || 0);
    var shipHpBonus = shipStats ? shipStats.hp : Math.max(0, Number(ship.hp) || 0);
    var codexBonus = (scope.codexSystem && scope.codexSystem.calculateBonus)
      ? (scope.codexSystem.calculateBonus(profile) || {})
      : {};
    var codexState = (scope.codexSystem && scope.codexSystem.getActivationState)
      ? scope.codexSystem.getActivationState(profile)
      : { activatedUnits: [], activatedBonds: [] };
    var coinBonus = 1 + (ups.bounty || 0) * 0.12 + (codexBonus.coinBonusMultiplier || 0);

    var agg = StatAggregator.create();
    agg.register("pilot", function (ctx) {
      return { attack: { add: ctx.pilotAttack }, maxHp: { add: ctx.pilotHpBonus }, armorPenetration: { add: ctx.pilotPen } };
    });
    agg.register("ship", function (ctx) {
      return { attack: { add: ctx.shipAttack }, maxHp: { add: ctx.shipHpBonus }, armorPenetration: { add: ctx.shipPen } };
    });
    agg.register("fighterUpgrade", function (ctx) {
      return {
        attack: { add: ctx.fighterAttackBonus },
        maxHp: { add: ctx.fighterHpBonus + (ctx.ups.armor || 0) * 20 },
        armorPenetration: { add: ctx.upgradePen }
      };
    });
    agg.register("codex", function (ctx) {
      return { attack: { add: ctx.codexAttackFlat }, maxHp: { add: 0 }, armorPenetration: { add: ctx.codexArmorPen } };
    });
    var aggregated = agg.reduce({
      pilotAttack: pilotAttack,
      pilotHpBonus: pilotHpBonus,
      pilotPen: pilotPen,
      shipAttack: shipAttack,
      shipHpBonus: shipHpBonus,
      shipPen: shipPen,
      fighterAttackBonus: fighterAttackBonus,
      fighterHpBonus: Math.max(0, (fighterUps.hp || 1) - 1) * hpPerLevel,
      upgradePen: upgradePen,
      ups: ups,
      codexAttackFlat: codexBonus.attackFlat || 0,
      codexArmorPen: codexBonus.armorPenetrationFlat || 0
    });
    // attack is rounded BEFORE the (possibly fractional) codex flat bonus is
    // added, preserving the original ordering.
    var baseAttack = aggregated.attack - (codexBonus.attackFlat || 0);
    var attack = Math.round(baseAttack) + (codexBonus.attackFlat || 0);
    var maxHp = aggregated.maxHp;
    var totalArmorPenetration = aggregated.armorPenetration;

    var tacticalConfig = scope.tacticalLoadoutConfig || {};
    var loadoutSystem = scope.tacticalLoadoutSystem || {};
    var configured = loadoutSystem.getLoadout ? loadoutSystem.getLoadout(profile, ship.id) : (profile.shipSkillLoadouts && profile.shipSkillLoadouts[ship.id]) || {};
    var activeGradeMap = profile.activeSkillGrades || {};
    var activeSlots = [0, 1, 2, 3].map(function resolveActive(index) {
      var slot = Array.isArray(configured.activeSlots) ? configured.activeSlots[index] : null;
      var definition = slot && scope.shipSkills && scope.shipSkills.getActiveSkill ? scope.shipSkills.getActiveSkill(slot.skillId) : null;
      if (!definition) return null;
      if (loadoutSystem.canUseActiveSkill && !loadoutSystem.canUseActiveSkill(shipRank, definition.id)) return null;
      var grade = capActiveGrade(activeGradeMap[definition.id], shipRank);
      var stats = scope.skillGradeConfig && scope.skillGradeConfig.getSkillGradeStats ? scope.skillGradeConfig.getSkillGradeStats(definition.id, grade) : null;
      var resolved = Object.assign({}, definition, { grade: grade, globalGrade: String(activeGradeMap[definition.id] || "D"), autoEnabled: Boolean(slot.autoEnabled), resolvedStats: stats ? freezeStats(stats) : null });
      if (stats) {
        if (stats.shieldDuration != null) resolved.duration = stats.shieldDuration;
        if (stats.duration != null) resolved.duration = stats.duration;
        if (stats.cooldown != null) resolved.cooldown = stats.cooldown;
        if (stats.maxCharges != null) {
          resolved.initialCharges = 1;
          resolved.maxCharges = Math.max(1, Math.floor(Number(stats.maxCharges) || 1));
          resolved.rechargeSeconds = Math.max(1, Number(stats.rechargeSeconds) || Number(resolved.cooldown) || 20);
        }
      }
      return Object.freeze(resolved);
    });

    var primaryWeapon = ship.primaryWeapon || "spread";
    var initialWeapons = balance.getInitialWeaponsForRank ? balance.getInitialWeaponsForRank(shipRank, ship.id) : { spread: 1, laser: 1, missile: 1 };
    var autoLevels = tacticalConfig.normalizeAutoWeaponLevels ? tacticalConfig.normalizeAutoWeaponLevels(profile.autoWeaponLevels) : (profile.autoWeaponLevels || {});
    var fixedDefinitions = Array.isArray(tacticalConfig.FIXED_AUTO_WEAPONS) ? tacticalConfig.FIXED_AUTO_WEAPONS : [];
    var overrides = Array.isArray(configured.fixedWeaponOverrides) ? configured.fixedWeaponOverrides.slice(0, 3) : [null, null, null];
    var extensionIds = Array.isArray(configured.autoWeaponIds) ? configured.autoWeaponIds.slice(0, 3) : [null, null, null];

    function resolveMeta(id) {
      var definition = id && tacticalConfig.ALL_AUTO_SKILLS && tacticalConfig.ALL_AUTO_SKILLS[id];
      var level = definition ? Number(autoLevels[id]) || 0 : 0;
      var stats = definition && tacticalConfig.getAutoSkillLevelStats ? tacticalConfig.getAutoSkillLevelStats(id, level) : null;
      return createMetaSkillSnapshot(definition, level, stats, attack, totalArmorPenetration);
    }

    var disabledWeaponTypes = [];
    var fixedSlots = fixedDefinitions.map(function resolveFixed(definition, index) {
      var replacement = resolveMeta(overrides[index]);
      if (replacement) {
        disabledWeaponTypes.push(definition.weaponType);
        return replacement;
      }
      return createFixedSnapshot(definition, initialWeapons[definition.weaponType], balance, attack, totalArmorPenetration);
    });
    while (fixedSlots.length < 3) fixedSlots.push(null);
    var extensionSlots = [0, 1, 2].map(function resolveExtension(index) { return resolveMeta(extensionIds[index]); });
    var autoSkillSlots = Object.freeze(fixedSlots.concat(extensionSlots));

    var decisiveRule = scope.battleRules && scope.battleRules.getDecisiveCommandRule ? scope.battleRules.getDecisiveCommandRule(shipRank) : { maxCharges: 2, initialCharges: 1, rechargeSeconds: 18 };
    var decisiveCommand = Object.assign({ id: "decisive-command", name: "决胜指令", iconText: "令", description: "清除敌方子弹和普通敌机。", effect: ship.decisiveCommandEffect || null }, decisiveRule);
    var passiveSkills = autoSkillSlots.filter(function keep(slot) { return slot && slot.source === "meta" && slot.category === "passive"; }).map(function compat(slot) { return { id: slot.id, grade: String(slot.level) }; });

    return {
      pilot: { id: pilot.id, name: pilot.name, rank: pilotRank, nativeRank: pilot.rank, stars: pilotStats ? pilotStats.stars : 0, damage: pilotAttack, hp: pilotHpBonus, armorPenetration: pilotPen, avatarSrc: pilot.src },
      ship: { id: ship.id, name: ship.name, rank: shipRank, nativeRank: ship.rank, damage: shipAttack, hp: shipHpBonus, armorPenetration: shipPen, src: ship.src, primaryWeapon: primaryWeapon, decisiveCommandEffect: ship.decisiveCommandEffect || null },
      upgrades: { fire: 0, armor: ups.armor || 0, engine: ups.engine || 0, bounty: ups.bounty || 0 },
      fighterUpgrades: { attack: fighterUps.attack || 1, armorPenetration: fighterUps.armorPenetration || 1, hp: fighterUps.hp || 1 },
      codexActivation: Object.freeze({
        activatedUnits: Object.freeze(codexState.activatedUnits.slice()),
        activatedBonds: Object.freeze(codexState.activatedBonds.slice()),
        bonus: Object.freeze({
          attackFlat: Number(codexBonus.attackFlat) || 0,
          armorPenetrationFlat: Number(codexBonus.armorPenetrationFlat) || 0,
          coinBonusMultiplier: Number(codexBonus.coinBonusMultiplier) || 0
        })
      }),
      finalStats: { maxHp: maxHp, maxLives: Math.max(1, Math.ceil(maxHp / 100)), attack: attack, armorPenetration: totalArmorPenetration, moveSpeed: 300 + (ups.engine || 0) * 15, coinBonus: coinBonus, weaponDamageMultiplier: 1 },
      initialWeapons: initialWeapons,
      disabledWeaponTypes: Object.freeze(disabledWeaponTypes.slice()),
      weaponPierceSlots: { spread: 0, laser: 0, missile: 0 },
      abilities: { activeSlots: activeSlots, decisiveCommand: decisiveCommand },
      autoSkills: { slots: autoSkillSlots },
      autoWeapons: { fixed: fixedSlots.slice(0, 3), extensionSlots: extensionSlots },
      passiveSkills: passiveSkills
    };
  }

  var api = { generateBattleLoadout: generateBattleLoadout, computeCoreStats: computeCoreStats };
  scope.combatStats = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
