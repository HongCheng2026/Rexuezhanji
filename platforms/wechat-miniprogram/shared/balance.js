(function registerBalance(root) {
  const scope = root.RXGame || (root.RXGame = {});

  const MAX_WEAPON_LEVEL = 10;

  const FIGHTER_BATTLE_RULES = {
    B: { initialWeaponLevel: 1, moduleSlots: 0 },
    A: { initialWeaponLevel: 2, moduleSlots: 0 },
    S: { initialWeaponLevel: 3, moduleSlots: 1 },
    SS: { reserved: true }
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

  const WEAPON_MODULES = {
    "spread-focus": {
      id: "spread-focus", name: "聚束校准器", weaponType: "spread", price: 50000,
      description: "散射角缩小30%，单弹伤害增加18%。",
      effects: { angleMultiplier: 0.7, damageMultiplier: 1.18 }
    },
    "spread-storm": {
      id: "spread-storm", name: "风暴弹仓", weaponType: "spread", price: 50000,
      description: "额外发射2颗子弹，单弹伤害降低8%。",
      effects: { projectileBonus: 2, projectileCap: 19, damageMultiplier: 0.92 }
    },
    "laser-prism": {
      id: "laser-prism", name: "穿透棱镜", weaponType: "laser", price: 50000,
      description: "每条激光多穿透1个目标，伤害增加8%。",
      effects: { pierceBonus: 1, damageMultiplier: 1.08 }
    },
    "laser-capacitor": {
      id: "laser-capacitor", name: "蓄能电容", weaponType: "laser", price: 50000,
      description: "每第5轮追加一条200%伤害宽光束，其余激光伤害降低5%。",
      effects: { triggerEvery: 5, bonusBeamDamageMultiplier: 2, damageMultiplier: 0.95 }
    },
    "missile-guidance": {
      id: "missile-guidance", name: "蜂群制导", weaponType: "missile", price: 50000,
      description: "额外发射1枚导弹，转向提高35%，单弹伤害降低8%。",
      effects: { projectileBonus: 1, projectileCap: 11, turnMultiplier: 1.35, damageMultiplier: 0.92 }
    },
    "missile-warhead": {
      id: "missile-warhead", name: "重爆弹头", weaponType: "missile", price: 50000,
      description: "获得64px爆炸范围和20%伤害，飞行速度降低12%。",
      effects: { splashRadius: 64, damageMultiplier: 1.2, speedMultiplier: 0.88 }
    }
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

  function getInitialWeaponsForRank(rank) {
    const rule = FIGHTER_BATTLE_RULES[String(rank || "").toUpperCase()];
    const level = rule && Number.isFinite(Number(rule.initialWeaponLevel))
      ? Math.max(0, Math.floor(Number(rule.initialWeaponLevel)))
      : 0;
    return { spread: level, laser: level, missile: level };
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
    PLAYER_WEAPON_LEVELS,
    WEAPON_MODULES,
    ENEMY_BASE_STATS,
    ENEMY_BALANCE_RULES,
    PILOT_RARITY_STATS,
    FIGHTER_RARITY_STATS,
    enemyBaseHp,
    pickupWeapons,
    getWeaponLevelStats,
    getInitialWeaponsForRank,
    getWeaponVolleyMultiplier,
    getReferenceVolleyMultiplier,
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
