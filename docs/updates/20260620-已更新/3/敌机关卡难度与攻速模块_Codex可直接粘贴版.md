# 敌机关卡难度与攻速模块_Codex可直接粘贴版

```js
// enemyStageBalance.js

export const STAGE_STRUCTURE_CONFIG = {
  prologueChapterIndex: 0,
  prologueStageCount: 3,
  minChapterIndex: 1,
  maxChapterIndex: 9,
  normalStageCount: 10,
  battleEndSeconds: 90,
  bossAppearSeconds: 60
};

export const CHAPTER_ENEMY_FIRE_INTERVAL_BASE = {
  1: 1.0,
  2: 0.9,
  3: 0.8,
  4: 0.7,
  5: 0.65,
  6: 0.6,
  7: 0.55,
  8: 0.5,
  9: 0.45
};

export const ENEMY_FIRE_INTERVAL_LIMIT = {
  minNormalFireInterval: 0.35,
  minBurstFireInterval: 0.1
};

export const ENEMY_TYPE_CONFIG = {
  small: {
    id: "small",
    name: "小型敌机",
    baseHp: 100,
    baseDamage: 8,
    moveSpeed: 140,
    canFire: true,
    firstFireDelay: 0.4,
    fireIntervalMultiplier: 1.2,
    bulletSpeed: 260,
    bulletPattern: "single"
  },

  shooter: {
    id: "shooter",
    name: "射击敌机",
    baseHp: 160,
    baseDamage: 10,
    moveSpeed: 115,
    canFire: true,
    firstFireDelay: 0.3,
    fireIntervalMultiplier: 1.0,
    bulletSpeed: 300,
    bulletPattern: "triple"
  },

  charger: {
    id: "charger",
    name: "高速突击敌机",
    baseHp: 140,
    baseDamage: 18,
    moveSpeed: 220,
    canFire: false,
    firstFireDelay: null,
    fireIntervalMultiplier: null,
    bulletSpeed: null,
    bulletPattern: "none"
  },

  shield: {
    id: "shield",
    name: "护盾敌机",
    baseHp: 220,
    baseDamage: 10,
    moveSpeed: 90,
    canFire: true,
    firstFireDelay: 0.8,
    fireIntervalMultiplier: 1.1,
    bulletSpeed: 260,
    bulletPattern: "single",
    extraDamageReductionRate: 0.15
  },

  elite: {
    id: "elite",
    name: "精英战机",
    baseHp: 1000,
    baseDamage: 18,
    moveSpeed: 80,
    canFire: true,
    firstFireDelay: 0.6,
    fireIntervalMultiplier: 0.8,
    bulletSpeed: 330,
    bulletPattern: "spread"
  },

  boss: {
    id: "boss",
    name: "BOSS战机",
    baseHp: 10000,
    baseDamage: 25,
    moveSpeed: 55,
    canFire: true,
    firstFireDelay: 1.0,
    fireIntervalMultiplier: 0.7,
    bulletSpeed: 360,
    bulletPattern: "boss_spread"
  }
};

export const BOSS_BURST_ATTACK_CONFIG = {
  fireInterval: 0.1,
  duration: 2.0,
  cooldown: 8.0,
  triggerHpRates: [0.7, 0.4, 0.15],
  bulletPattern: "boss_burst_spread"
};

export const PROLOGUE_STAGE_CONFIG = {
  1: {
    difficultyBonus: 0,
    enemyCount: 18,
    composition: {
      small: 1.0,
      shooter: 0,
      charger: 0,
      shield: 0,
      elite: 0
    }
  },
  2: {
    difficultyBonus: 0,
    enemyCount: 24,
    composition: {
      small: 0.9,
      shooter: 0.1,
      charger: 0,
      shield: 0,
      elite: 0
    }
  },
  3: {
    difficultyBonus: 0,
    enemyCount: 30,
    composition: {
      small: 0.85,
      shooter: 0.15,
      charger: 0,
      shield: 0,
      elite: 0
    }
  }
};

export const STAGE_DIFFICULTY_TEMPLATE = {
  1: 0.0,
  2: 0.02,
  3: 0.04,
  4: 0.06,
  5: 0.12,
  6: 0.14,
  7: 0.16,
  8: 0.18,
  9: 0.2,
  10: 0.32
};

export const BASE_STAGE_ENEMY_COUNT_TEMPLATE = {
  1: 30,
  2: 34,
  3: 38,
  4: 42,
  5: 48,
  6: 50,
  7: 54,
  8: 58,
  9: 62,
  10: 55
};

export const STAGE_COMPOSITION_TEMPLATE = {
  grass: {
    small: 0.8,
    shooter: 0.2,
    charger: 0,
    shield: 0,
    elite: 0
  },

  gate: {
    small: 0.6,
    shooter: 0.25,
    charger: 0.1,
    shield: 0,
    elite: 0.05
  },

  pressure: {
    small: 0.5,
    shooter: 0.25,
    charger: 0.1,
    shield: 0.1,
    elite: 0.05
  },

  boss: {
    small: 0.4,
    shooter: 0.25,
    charger: 0.1,
    shield: 0.1,
    elite: 0.15
  }
};

export const CHAPTER_7_STAGE_DAMAGE_REDUCTION = {
  1: 0.45,
  2: 0.48,
  3: 0.5,
  4: 0.52,
  5: 0.58,
  6: 0.6,
  7: 0.62,
  8: 0.65,
  9: 0.68,
  10: 0.7
};

export const CHAPTER_7_COMPOSITION_OVERRIDE = {
  1: {
    small: 0.45,
    shooter: 0.25,
    charger: 0.1,
    shield: 0.1,
    elite: 0.1
  },
  2: {
    small: 0.45,
    shooter: 0.25,
    charger: 0.1,
    shield: 0.1,
    elite: 0.1
  },
  3: {
    small: 0.42,
    shooter: 0.25,
    charger: 0.1,
    shield: 0.13,
    elite: 0.1
  },
  4: {
    small: 0.4,
    shooter: 0.25,
    charger: 0.1,
    shield: 0.15,
    elite: 0.1
  },
  5: {
    small: 0.35,
    shooter: 0.25,
    charger: 0.1,
    shield: 0.2,
    elite: 0.1
  },
  6: {
    small: 0.32,
    shooter: 0.25,
    charger: 0.1,
    shield: 0.23,
    elite: 0.1
  },
  7: {
    small: 0.3,
    shooter: 0.25,
    charger: 0.1,
    shield: 0.25,
    elite: 0.1
  },
  8: {
    small: 0.28,
    shooter: 0.25,
    charger: 0.1,
    shield: 0.27,
    elite: 0.1
  },
  9: {
    small: 0.25,
    shooter: 0.25,
    charger: 0.1,
    shield: 0.3,
    elite: 0.1
  },
  10: {
    small: 0.2,
    shooter: 0.25,
    charger: 0.05,
    shield: 0.3,
    elite: 0.2
  }
};

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function getStageId(chapterIndex, stageInChapter) {
  if (chapterIndex === 0) {
    return `prologue_${stageInChapter}`;
  }

  return `${chapterIndex}_${stageInChapter}`;
}

export function getPreviousStageId(chapterIndex, stageInChapter) {
  if (chapterIndex === 0 && stageInChapter === 1) {
    return null;
  }

  if (chapterIndex === 0) {
    return getStageId(0, stageInChapter - 1);
  }

  if (chapterIndex === 1 && stageInChapter === 1) {
    return getStageId(0, STAGE_STRUCTURE_CONFIG.prologueStageCount);
  }

  if (stageInChapter === 1) {
    return getStageId(chapterIndex - 1, STAGE_STRUCTURE_CONFIG.normalStageCount);
  }

  return getStageId(chapterIndex, stageInChapter - 1);
}

export function isStageUnlocked({ chapterIndex, stageInChapter, clearedStageIds }) {
  const previousStageId = getPreviousStageId(chapterIndex, stageInChapter);

  if (previousStageId === null) {
    return true;
  }

  return clearedStageIds.includes(previousStageId);
}

export function getChapterDifficultyBase(chapterIndex) {
  if (chapterIndex <= 1) {
    return 0;
  }

  return (chapterIndex - 1) * 0.12;
}

export function getStageTemplateType(stageInChapter) {
  if (stageInChapter >= 1 && stageInChapter <= 4) {
    return "grass";
  }

  if (stageInChapter === 5) {
    return "gate";
  }

  if (stageInChapter >= 6 && stageInChapter <= 9) {
    return "pressure";
  }

  if (stageInChapter === 10) {
    return "boss";
  }

  return "grass";
}

export function getStageDifficulty(chapterIndex, stageInChapter) {
  if (chapterIndex === 0) {
    return PROLOGUE_STAGE_CONFIG[stageInChapter]?.difficultyBonus || 0;
  }

  const chapterBase = getChapterDifficultyBase(chapterIndex);
  const stageBonus = STAGE_DIFFICULTY_TEMPLATE[stageInChapter] || 0;

  return chapterBase + stageBonus;
}

export function getStageDamageReductionRate(chapterIndex, stageInChapter) {
  if (chapterIndex === 0) {
    return 0;
  }

  if (chapterIndex === 7) {
    return CHAPTER_7_STAGE_DAMAGE_REDUCTION[stageInChapter] || 0.45;
  }

  const difficulty = getStageDifficulty(chapterIndex, stageInChapter);

  return clamp(difficulty * 0.5, 0, 0.65);
}

export function getStageEnemyHpMultiplier(chapterIndex, stageInChapter) {
  const difficulty = getStageDifficulty(chapterIndex, stageInChapter);

  return 1 + difficulty;
}

export function getBossHpMultiplier(chapterIndex, stageInChapter) {
  const difficulty = getStageDifficulty(chapterIndex, stageInChapter);

  if (stageInChapter !== 10) {
    return 1;
  }

  return 1 + difficulty + 0.3;
}

export function getChapterFireIntervalBase(chapterIndex) {
  if (chapterIndex === 0) {
    return 1.2;
  }

  return CHAPTER_ENEMY_FIRE_INTERVAL_BASE[chapterIndex] || 1.0;
}

export function getEnemyFireInterval(chapterIndex, enemyType) {
  const enemyConfig = ENEMY_TYPE_CONFIG[enemyType];

  if (!enemyConfig || !enemyConfig.canFire) {
    return null;
  }

  const chapterBaseInterval = getChapterFireIntervalBase(chapterIndex);
  const interval = chapterBaseInterval * enemyConfig.fireIntervalMultiplier;

  return Math.max(
    ENEMY_FIRE_INTERVAL_LIMIT.minNormalFireInterval,
    Number(interval.toFixed(2))
  );
}

export function getEnemyFirstFireDelay(enemyType) {
  const enemyConfig = ENEMY_TYPE_CONFIG[enemyType];

  if (!enemyConfig || !enemyConfig.canFire) {
    return null;
  }

  return enemyConfig.firstFireDelay;
}

export function getStageEnemyCount(chapterIndex, stageInChapter) {
  if (chapterIndex === 0) {
    return PROLOGUE_STAGE_CONFIG[stageInChapter]?.enemyCount || 0;
  }

  const baseCount = BASE_STAGE_ENEMY_COUNT_TEMPLATE[stageInChapter] || 30;
  const difficulty = getStageDifficulty(chapterIndex, stageInChapter);

  return Math.ceil(baseCount * (1 + difficulty * 0.25));
}

export function normalizeComposition(composition) {
  const total = Object.values(composition).reduce((sum, value) => sum + value, 0);

  if (total <= 0) {
    return {
      small: 1,
      shooter: 0,
      charger: 0,
      shield: 0,
      elite: 0
    };
  }

  return Object.fromEntries(
    Object.entries(composition).map(([key, value]) => [
      key,
      Number((value / total).toFixed(4))
    ])
  );
}

export function getStageEnemyComposition(chapterIndex, stageInChapter) {
  if (chapterIndex === 0) {
    return normalizeComposition(
      PROLOGUE_STAGE_CONFIG[stageInChapter]?.composition || {
        small: 1,
        shooter: 0,
        charger: 0,
        shield: 0,
        elite: 0
      }
    );
  }

  if (chapterIndex === 7 && CHAPTER_7_COMPOSITION_OVERRIDE[stageInChapter]) {
    return normalizeComposition(CHAPTER_7_COMPOSITION_OVERRIDE[stageInChapter]);
  }

  const templateType = getStageTemplateType(stageInChapter);

  return normalizeComposition(STAGE_COMPOSITION_TEMPLATE[templateType]);
}

export function getEnemyFinalStats({ chapterIndex, stageInChapter, enemyType }) {
  const enemyConfig = ENEMY_TYPE_CONFIG[enemyType];

  if (!enemyConfig) {
    throw new Error(`Unknown enemy type: ${enemyType}`);
  }

  const hpMultiplier =
    enemyType === "boss"
      ? getBossHpMultiplier(chapterIndex, stageInChapter)
      : getStageEnemyHpMultiplier(chapterIndex, stageInChapter);

  const stageDamageReductionRate = getStageDamageReductionRate(
    chapterIndex,
    stageInChapter
  );

  const enemyExtraDamageReductionRate =
    enemyConfig.extraDamageReductionRate || 0;

  const damageReductionRate = clamp(
    stageDamageReductionRate + enemyExtraDamageReductionRate,
    0,
    0.9
  );

  return {
    id: enemyConfig.id,
    name: enemyConfig.name,
    hp: Math.ceil(enemyConfig.baseHp * hpMultiplier),
    damage: enemyConfig.baseDamage,
    moveSpeed: enemyConfig.moveSpeed,
    canFire: enemyConfig.canFire,
    firstFireDelay: getEnemyFirstFireDelay(enemyType),
    fireInterval: getEnemyFireInterval(chapterIndex, enemyType),
    bulletSpeed: enemyConfig.bulletSpeed,
    bulletPattern: enemyConfig.bulletPattern,
    damageReductionRate,
    damageTakenMultiplier: 1 - damageReductionRate
  };
}

export function getStageEnemySpawnPlan(chapterIndex, stageInChapter) {
  const totalEnemyCount = getStageEnemyCount(chapterIndex, stageInChapter);
  const composition = getStageEnemyComposition(chapterIndex, stageInChapter);

  const enemyCounts = {};
  let assignedCount = 0;

  const enemyTypes = ["small", "shooter", "charger", "shield", "elite"];

  for (let i = 0; i < enemyTypes.length; i++) {
    const enemyType = enemyTypes[i];

    if (i === enemyTypes.length - 1) {
      enemyCounts[enemyType] = Math.max(0, totalEnemyCount - assignedCount);
      break;
    }

    const count = Math.floor(totalEnemyCount * (composition[enemyType] || 0));
    enemyCounts[enemyType] = count;
    assignedCount += count;
  }

  return {
    totalEnemyCount,
    enemyCounts,
    composition
  };
}

export function getStageConfig(chapterIndex, stageInChapter) {
  const stageId = getStageId(chapterIndex, stageInChapter);
  const previousStageId = getPreviousStageId(chapterIndex, stageInChapter);
  const hasBoss = chapterIndex !== 0 && stageInChapter === 10;
  const difficulty = getStageDifficulty(chapterIndex, stageInChapter);
  const damageReductionRate = getStageDamageReductionRate(
    chapterIndex,
    stageInChapter
  );
  const spawnPlan = getStageEnemySpawnPlan(chapterIndex, stageInChapter);

  return {
    stageId,
    chapterIndex,
    stageInChapter,
    previousStageId,

    battleEndSeconds: STAGE_STRUCTURE_CONFIG.battleEndSeconds,
    bossAppearSeconds: hasBoss ? STAGE_STRUCTURE_CONFIG.bossAppearSeconds : null,

    difficulty,
    damageReductionRate,
    enemyHpMultiplier: getStageEnemyHpMultiplier(chapterIndex, stageInChapter),

    hasBoss,
    boss:
      hasBoss
        ? {
            stats: getEnemyFinalStats({
              chapterIndex,
              stageInChapter,
              enemyType: "boss"
            }),
            appearSeconds: STAGE_STRUCTURE_CONFIG.bossAppearSeconds,
            burstAttack: BOSS_BURST_ATTACK_CONFIG
          }
        : null,

    spawnPlan
  };
}

export function generateAllStageConfigs() {
  const stages = [];

  for (
    let stageInChapter = 1;
    stageInChapter <= STAGE_STRUCTURE_CONFIG.prologueStageCount;
    stageInChapter++
  ) {
    stages.push(getStageConfig(0, stageInChapter));
  }

  for (
    let chapterIndex = STAGE_STRUCTURE_CONFIG.minChapterIndex;
    chapterIndex <= STAGE_STRUCTURE_CONFIG.maxChapterIndex;
    chapterIndex++
  ) {
    for (
      let stageInChapter = 1;
      stageInChapter <= STAGE_STRUCTURE_CONFIG.normalStageCount;
      stageInChapter++
    ) {
      stages.push(getStageConfig(chapterIndex, stageInChapter));
    }
  }

  return stages;
}
```
