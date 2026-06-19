(function registerBalance(root) {
  const scope = root.RXGame || (root.RXGame = {});

  const MAX_WEAPON_LEVEL = 10;

  const enemyBaseHp = {
    small: 100,
    elite: 1000,
    boss: 10000
  };

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

  function getStageBonus(stageInChapter) {
    return stageInChapter === 5 || stageInChapter === 10 ? 0.1 : 0;
  }

  function getChapterBonus(chapterIndex) {
    return Math.max(0, Number(chapterIndex) || 0) * 0.1;
  }

  function getEnemyScaling(chapterIndex, stageInChapter) {
    const totalBonus = getChapterBonus(chapterIndex) + getStageBonus(stageInChapter);
    return {
      hpMultiplier: 1 + totalBonus,
      damageReductionRate: totalBonus,
      damageTakenMultiplier: Math.max(0, 1 - totalBonus)
    };
  }

  function getEnemyScalingForLevel(level) {
    return getEnemyScaling(level.chapterIndex ?? 1, level.stageInChapter ?? level.id ?? 1);
  }

function getEnemyHp(type, level) {
  const baseHp = enemyBaseHp[type] || enemyBaseHp.small;
  return Math.ceil(baseHp * getEnemyScalingForLevel(level).hpMultiplier - 1e-9);
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
    enemyBaseHp,
    pickupWeapons,
    getStageBonus,
    getChapterBonus,
    getEnemyScaling,
    getEnemyScalingForLevel,
    getEnemyHp,
    getPickupDamageMultiplier,
    getFinalDamage,
    getPlayerWeaponDamage
  };

  scope.balance = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
