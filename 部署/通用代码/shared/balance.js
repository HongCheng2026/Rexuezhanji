(function registerBalance(root) {
  const scope = root.RXGame || (root.RXGame = {});

  const MAX_WEAPON_LEVEL = 10;

  const ENEMY_BASE_STATS = {
    small: { name: "敌军小飞机", baseHp: 100 },
    elite: { name: "精英战机", baseHp: 1000 },
    boss: { name: "BOSS战机", baseHp: 10000 }
  };

  const ENEMY_BALANCE_RULES = {
    chapterGrowthPerLevel: 0.1,
    stageExtraGrowth: { 5: 0.05, 10: 0.1 }
  };

  const PILOT_RARITY_STATS = {
    S: { armorPenetration: 0.2 },
    A: { armorPenetration: 0.1 },
    B: { armorPenetration: 0 }
  };

  const FIGHTER_RARITY_STATS = {
    S: { armorPenetration: 0.1 },
    A: { armorPenetration: 0.05 },
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
        return 1 + (clampLevel(level) - 1) * (1 / 9);
      },
      fireIntervalAt(level) {
        return 1 - (clampLevel(level) - 1) * 0.1;
      }
    },
    spread: {
      id: "spread",
      name: "裂风波",
      type: "area",
      maxLevel: MAX_WEAPON_LEVEL,
      damageMultiplierAt(level) {
        return 1 + (clampLevel(level) - 1) * (0.5 / 9);
      },
      coneAngleAt(level) {
        return clampLevel(level) * 15;
      }
    },
    missile: {
      id: "missile",
      name: "灵蜂弹",
      type: "tracking",
      maxLevel: MAX_WEAPON_LEVEL,
      damageMultiplierAt(level) {
        return 1 + (clampLevel(level) - 1) * (0.5 / 9);
      },
      targetCountAt(level) {
        return clampLevel(level);
      }
    }
  };

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, Number(value) || 0));
  }

  function clampLevel(level) {
    return Math.round(clamp(level, 1, MAX_WEAPON_LEVEL));
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
    ENEMY_BASE_STATS,
    ENEMY_BALANCE_RULES,
    PILOT_RARITY_STATS,
    FIGHTER_RARITY_STATS,
    enemyBaseHp,
    pickupWeapons,
    getStageBonus,
    getChapterBonus,
    getTotalArmorPenetration,
    getEnemyScaling,
    getEnemyScalingForLevel,
    getEnemyHp,
    getEnemyStats,
    getPickupDamageMultiplier,
    getFinalDamage,
    getPlayerWeaponDamage
  };

  scope.balance = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
