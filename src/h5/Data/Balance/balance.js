(function registerBalance(root) {
  const scope = root.RXGame || (root.RXGame = {});

  const MAX_WEAPON_LEVEL = 10;

  const FIGHTER_BATTLE_RULES = {
    B: { initialWeaponLevel: 1, moduleSlots: 0, activeSkillSlots: 0 },
    A: { initialWeaponLevel: 1, moduleSlots: 0, activeSkillSlots: 0 },
    S: { initialWeaponLevel: 1, moduleSlots: 1, activeSkillSlots: 2 },
    SS: { initialWeaponLevel: 2, moduleSlots: 1, activeSkillSlots: 4 }
  };

  const FIGHTER_STARTING_WEAPONS = {
    "ship-b-01": ["laser"],
    "ship-b-03": ["spread"],
    "ship-b-05": ["missile"],
    "ship-a-06": ["spread", "laser"],
    "ship-a-07": ["laser", "missile"],
    "ship-b-02": ["missile", "spread"]
  };

  const PLAYER_WEAPON_LEVELS = {
    spread: [
      null,
      { damageMultiplier: 1, projectileCount: 3, angleStep: 0.055 },
      { damageMultiplier: 1.1, projectileCount: 5, angleStep: 0.06 },
      { damageMultiplier: 1.2, projectileCount: 6, angleStep: 0.064 },
      { damageMultiplier: 1.32, projectileCount: 7, angleStep: 0.067 },
      { damageMultiplier: 1.45, projectileCount: 9, angleStep: 0.07 },
      { damageMultiplier: 1.58, projectileCount: 10, angleStep: 0.072 },
      { damageMultiplier: 1.72, projectileCount: 11, angleStep: 0.074 },
      { damageMultiplier: 1.86, projectileCount: 13, angleStep: 0.076 },
      { damageMultiplier: 2.02, projectileCount: 15, angleStep: 0.078 },
      { damageMultiplier: 2.2, projectileCount: 17, angleStep: 0.08 }
    ],
    laser: [
      null,
      { damageMultiplier: 1, offsets: [0], fireIntervalMultiplier: 1 },
      { damageMultiplier: 1.14, offsets: [-10, 10], fireIntervalMultiplier: 0.945 },
      { damageMultiplier: 1.3, offsets: [-14, 0, 14], fireIntervalMultiplier: 0.89 },
      { damageMultiplier: 1.48, offsets: [-18, -6, 6, 18], fireIntervalMultiplier: 0.835 },
      { damageMultiplier: 1.68, offsets: [-22, -11, 0, 11, 22], fireIntervalMultiplier: 0.78 },
      { damageMultiplier: 1.9, offsets: [-26, -13, 0, 13, 26], fireIntervalMultiplier: 0.725 },
      { damageMultiplier: 2.12, offsets: [-30, -18, -6, 6, 18, 30], fireIntervalMultiplier: 0.67 },
      { damageMultiplier: 2.35, offsets: [-32, -19, -6, 6, 19, 32], fireIntervalMultiplier: 0.615 },
      { damageMultiplier: 2.6, offsets: [-36, -24, -12, 0, 12, 24, 36], fireIntervalMultiplier: 0.56 },
      { damageMultiplier: 2.88, offsets: [-42, -31, -20, -10, 0, 10, 20, 31, 42], fireIntervalMultiplier: 0.505 }
    ],
    missile: [
      null,
      { damageMultiplier: 1, projectileCount: 1, targetCount: 1 },
      { damageMultiplier: 1.12, projectileCount: 2, targetCount: 2 },
      { damageMultiplier: 1.25, projectileCount: 3, targetCount: 3 },
      { damageMultiplier: 1.4, projectileCount: 4, targetCount: 4 },
      { damageMultiplier: 1.56, projectileCount: 5, targetCount: 4 },
      { damageMultiplier: 1.74, projectileCount: 6, targetCount: 5 },
      { damageMultiplier: 1.93, projectileCount: 7, targetCount: 6 },
      { damageMultiplier: 2.14, projectileCount: 8, targetCount: 7 },
      { damageMultiplier: 2.36, projectileCount: 9, targetCount: 8 },
      { damageMultiplier: 2.6, projectileCount: 10, targetCount: 8 }
    ]
  };

  const ENEMY_BASE_STATS = {
    small: { name: "敌军小飞机", baseHp: 100 },
    elite: { name: "精英战机", baseHp: 1000 },
    boss: { name: "BOSS战机", baseHp: 100000 }
  };

  const ENEMY_BALANCE_RULES = {
    chapterGrowthPerLevel: 0.1,
    stageExtraGrowth: { 5: 0.05, 10: 0.1 }
  };

  const CAMPAIGN_BOSS_BALANCE_RULES = Object.freeze({
    baseHp: ENEMY_BASE_STATS.boss.baseHp,
    chapterHpMultiplier: 1,
    chapterArmorPierce: 0.1,
    stageHpMultiplierBonus: Object.freeze({ 5: 0.5, 10: 1 }),
    stageDamageReductionBonus: Object.freeze({ 5: 0.05, 10: 0.1 })
  });

  const PILOT_RARITY_STATS = {
    SSS: { armorPenetration: 0.35 },
    SS: { armorPenetration: 0.25 },
    S: { armorPenetration: 0.15 },
    A: { armorPenetration: 0 },
    B: { armorPenetration: 0 }
  };

  const FIGHTER_RARITY_STATS = {
    SSS: { armorPenetration: 0.2 },
    SS: { armorPenetration: 0.15 },
    S: { armorPenetration: 0.05 },
    A: { armorPenetration: 0 },
    B: { armorPenetration: 0 }
  };

  const enemyBaseHp = Object.fromEntries(Object.entries(ENEMY_BASE_STATS).map(([key, value]) => [key, value.baseHp]));

  const pickupWeapons = {
    laser: {
      id: "laser",
      name: "穿云针",
      type: "single",
      maxLevel: MAX_WEAPON_LEVEL,
      damageMultiplierAt(level) {
        return getWeaponLevelStats("laser", level).damageMultiplier;
      },
      fireIntervalAt(level) {
        return getWeaponLevelStats("laser", level).fireIntervalMultiplier;
      }
    },
    spread: {
      id: "spread",
      name: "裂风波",
      type: "area",
      maxLevel: MAX_WEAPON_LEVEL,
      damageMultiplierAt(level) {
        return getWeaponLevelStats("spread", level).damageMultiplier;
      },
      coneAngleAt(level) {
        const stats = getWeaponLevelStats("spread", level);
        return stats.angleStep * Math.max(0, stats.projectileCount - 1) * 180 / Math.PI;
      }
    },
    missile: {
      id: "missile",
      name: "灵蜂弹",
      type: "tracking",
      maxLevel: MAX_WEAPON_LEVEL,
      damageMultiplierAt(level) {
        return getWeaponLevelStats("missile", level).damageMultiplier;
      },
      targetCountAt(level) {
        return getWeaponLevelStats("missile", level).targetCount;
      }
    }
  };

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, Number(value) || 0));
  }

  function clampLevel(level) {
    return Math.round(clamp(level, 1, MAX_WEAPON_LEVEL));
  }

  function pickLevelValue(table, level) {
    return table[Math.max(0, Math.min(table.length - 1, clampLevel(level) - 1))];
  }

  function getWeaponLevelStats(type, level) {
    const table = PLAYER_WEAPON_LEVELS[type];
    if (!table) return { damageMultiplier: 1, projectileCount: 1, offsets: [0] };
    return table[clampLevel(level)] || table[1];
  }

  function getInitialWeaponsForRank(rank, shipId) {
    var rule = FIGHTER_BATTLE_RULES[String(rank || "").toUpperCase()];
    var level = rule && Number.isFinite(Number(rule.initialWeaponLevel))
      ? Math.max(0, Math.floor(Number(rule.initialWeaponLevel)))
      : 0;
    var perShip = shipId && FIGHTER_STARTING_WEAPONS[String(shipId)];
    if (perShip && Array.isArray(perShip)) {
      var weapons = { spread: 0, laser: 0, missile: 0 };
      perShip.forEach(function setWeaponType(type) { weapons[String(type)] = level; });
      return weapons;
    }
    return { spread: level, laser: level, missile: level };
  }

  var EXTENSION_SLOT_UNLOCK_RANK = ["A", "S", "SS"];

  function getExtensionSlotUnlockRank(index) {
    return EXTENSION_SLOT_UNLOCK_RANK[Math.max(0, Math.min(2, Math.floor(Number(index) || 0)))] || "SS";
  }

  var ACTIVE_SKILL_SLOT_UNLOCK_RANK = ["S", "S", "SS", "SS"];

  function getActiveSkillSlotUnlockRank(index) {
    return ACTIVE_SKILL_SLOT_UNLOCK_RANK[Math.max(0, Math.min(3, Math.floor(Number(index) || 0)))] || "SS";
  }

  function getWeaponVolleyMultiplier(type, level) {
    const stats = getWeaponLevelStats(type, level);
    const count = Array.isArray(stats.offsets)
      ? stats.offsets.length
      : Math.max(1, Math.floor(Number(stats.projectileCount) || 1));
    return count * Math.max(0, Number(stats.damageMultiplier) || 1);
  }

  function getReferenceVolleyMultiplier(level) {
    return ["spread", "laser", "missile"].reduce(function sumWeapon(total, type) {
      return total + getWeaponVolleyMultiplier(type, level);
    }, 0);
  }

  function normalizeRate(value) {
    return Math.round((Number(value) || 0) * 1_000_000) / 1_000_000;
  }

  function getStageBonus(stageInChapter) {
    return ENEMY_BALANCE_RULES.stageExtraGrowth[Math.floor(Number(stageInChapter) || 0)] || 0;
  }

  function getChapterBonus(chapterIndex) {
    return Math.max(0, Number(chapterIndex) || 0) * ENEMY_BALANCE_RULES.chapterGrowthPerLevel;
  }

  function getTotalArmorPenetration(pilotRarity, fighterRarity) {
    const pilotPenetration = PILOT_RARITY_STATS[pilotRarity]?.armorPenetration || 0;
    const fighterPenetration = FIGHTER_RARITY_STATS[fighterRarity]?.armorPenetration || 0;
    return normalizeRate(pilotPenetration + fighterPenetration);
  }

  function getEnemyScaling(chapterIndex, stageInChapter, pilotRarity, fighterRarity) {
    const totalBonus = normalizeRate(getChapterBonus(chapterIndex) + getStageBonus(stageInChapter));
    const rawDamageReductionRate = totalBonus;
    const armorPenetration = getTotalArmorPenetration(pilotRarity, fighterRarity);
    const finalDamageReductionRate = normalizeRate(Math.max(0, rawDamageReductionRate - armorPenetration));
    return {
      chapterBonus: getChapterBonus(chapterIndex),
      stageBonus: getStageBonus(stageInChapter),
      totalBonus,
      hpMultiplier: normalizeRate(1 + totalBonus),
      rawDamageReductionRate,
      armorPenetration,
      finalDamageReductionRate,
      damageReductionRate: finalDamageReductionRate,
      damageTakenMultiplier: normalizeRate(1 - finalDamageReductionRate)
    };
  }

  function getEnemyScalingForLevel(level, { pilotRarity = "B", fighterRarity = "B" } = {}) {
    return getEnemyScaling(
      level.chapterIndex ?? 1,
      level.stageInChapter ?? level.id ?? 1,
      pilotRarity,
      fighterRarity
    );
  }

  function getBossScaling(chapterIndex, stageInChapter, baseDamageReductionRate) {
    const chapter = Math.max(0, Math.min(9, Math.floor(Number(chapterIndex) || 0)));
    const stage = Math.max(1, Math.min(10, Math.floor(Number(stageInChapter) || 1)));
    if (chapter === 0) {
      return {
        chapterIndex: 0,
        stageInChapter: stage,
        hpMultiplier: 1,
        hp: CAMPAIGN_BOSS_BALANCE_RULES.baseHp,
        damageReductionRate: 0,
        damageTakenMultiplier: 1,
        armorPierceRatio: 0
      };
    }
    const hpMultiplier = normalizeRate(
      1 + chapter * CAMPAIGN_BOSS_BALANCE_RULES.chapterHpMultiplier +
      (CAMPAIGN_BOSS_BALANCE_RULES.stageHpMultiplierBonus[stage] || 0)
    );
    const damageReductionRate = Math.min(0.9, normalizeRate(
      normalizeRate(baseDamageReductionRate) +
      (CAMPAIGN_BOSS_BALANCE_RULES.stageDamageReductionBonus[stage] || 0)
    ));
    const armorPierceRatio = normalizeRate(chapter * CAMPAIGN_BOSS_BALANCE_RULES.chapterArmorPierce);
    return {
      chapterIndex: chapter,
      stageInChapter: stage,
      hpMultiplier,
      hp: Math.ceil(CAMPAIGN_BOSS_BALANCE_RULES.baseHp * hpMultiplier),
      damageReductionRate,
      damageTakenMultiplier: normalizeRate(Math.max(0, 1 - damageReductionRate)),
      armorPierceRatio
    };
  }

  function getEnemyHp(type, level) {
    const baseHp = ENEMY_BASE_STATS[type]?.baseHp || ENEMY_BASE_STATS.small.baseHp;
    return Math.ceil(baseHp * getEnemyScalingForLevel(level).hpMultiplier - 1e-9);
  }

  function getEnemyStats({ enemyType, chapterIndex, stageInChapter, pilotRarity, fighterRarity }) {
    const baseStats = ENEMY_BASE_STATS[enemyType];
    if (!baseStats) throw new Error(`Unknown enemy type: ${enemyType}`);
    const scaling = getEnemyScaling(chapterIndex, stageInChapter, pilotRarity, fighterRarity);
    return {
      enemyType,
      name: baseStats.name,
      baseHp: baseStats.baseHp,
      finalHp: Math.ceil(baseStats.baseHp * scaling.hpMultiplier),
      ...scaling
    };
  }

  function getPickupDamageMultiplier(type, level) {
    const weapon = pickupWeapons[type];
    return weapon ? weapon.damageMultiplierAt(level) : 1;
  }

  function getFinalDamage({
    pilotDamage,
    fighterDamage,
    fighterUpgradeMultiplier,
    pickupWeaponDamageMultiplier,
    enemyDamageTakenMultiplier = 1
  }) {
    return (
      (Number(pilotDamage) || 0) +
      (Number(fighterDamage) || 0)
    ) * (Number(fighterUpgradeMultiplier) || 1) *
      (Number(pickupWeaponDamageMultiplier) || 1) *
      (Number(enemyDamageTakenMultiplier) || 1);
  }

  function getPlayerWeaponDamage({
    pilotDamage,
    fighterDamage,
    fighterUpgradeMultiplier,
    weaponType,
    weaponLevel
  }) {
    return Math.round(getFinalDamage({
      pilotDamage,
      fighterDamage,
      fighterUpgradeMultiplier,
      pickupWeaponDamageMultiplier: getPickupDamageMultiplier(weaponType, weaponLevel),
      enemyDamageTakenMultiplier: 1
    }));
  }

  const api = {
    MAX_WEAPON_LEVEL,
    FIGHTER_BATTLE_RULES,
    FIGHTER_STARTING_WEAPONS,
    PLAYER_WEAPON_LEVELS,
    ENEMY_BASE_STATS,
    ENEMY_BALANCE_RULES,
    CAMPAIGN_BOSS_BALANCE_RULES,
    PILOT_RARITY_STATS,
    FIGHTER_RARITY_STATS,
    enemyBaseHp,
    pickupWeapons,
    getWeaponLevelStats,
    getInitialWeaponsForRank,
    getExtensionSlotUnlockRank,
    getActiveSkillSlotUnlockRank,
    getWeaponVolleyMultiplier,
    getReferenceVolleyMultiplier,
    getStageBonus,
    getChapterBonus,
    getTotalArmorPenetration,
    getEnemyScaling,
    getEnemyScalingForLevel,
    getBossScaling,
    getEnemyHp,
    getEnemyStats,
    getPickupDamageMultiplier,
    getFinalDamage,
    getPlayerWeaponDamage
  };

  scope.balance = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
