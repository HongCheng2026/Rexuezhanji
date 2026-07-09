(function registerLevels(root) {
  const scope = root.RXGame || (root.RXGame = {});

  const LEVEL_DURATION = 90;
  const BOSS_SPAWN_TIME = 60;
  const COMMANDER_MAX_LEVEL = 60;
  // Index by current commander level. Index 0 is intentionally unused.
  const COMMANDER_EXP_TO_NEXT_LEVEL = [
    0, 130, 190, 224, 246, 266, 282, 298, 310, 322, 334, 344, 354, 362, 370, 378, 386, 394, 400, 410,
    1000, 1100, 1200, 1300, 1400, 1000, 1100, 1200, 1300, 1400, 2736, 3548, 3938, 4214, 4432, 4614,
    4772, 4910, 5034, 5148, 5252, 5348, 5438, 5524, 5602, 5678, 5750, 5818, 5882, 5944, 6004, 6062,
    6118, 6172, 6222, 6272, 6322, 6370, 6416, 6460, 0
  ];
  const COMMANDER_TOTAL_EXP_BY_LEVEL = [
    0, 0, 130, 320, 544, 790, 1056, 1338, 1636, 1946, 2268, 2602, 2946, 3300, 3662, 4032, 4410, 4796,
    5190, 5590, 6000, 7000, 8100, 9300, 10600, 12000, 13000, 14100, 15300, 16600, 18000, 20736, 24284,
    28222, 32436, 36868, 41482, 46254, 51164, 56198, 61346, 66598, 71946, 77384, 82908, 88510, 94188,
    99938, 105756, 111638, 117582, 123586, 129648, 135766, 141938, 148160, 154432, 160754, 167124, 173540,
    180000
  ];
  const STAMINA_BASE_MAX = 300;
  const STAMINA_PER_LEVEL = 5;
  const ENERGY_MAX = STAMINA_BASE_MAX + STAMINA_PER_LEVEL;
  const ENERGY_COST = 5;
  const ENERGY_RECOVER_MS = 5 * 60 * 1000;

  const FIGHTER_MAX_UPGRADE_LEVEL = 60;
  const FIGHTER_UPGRADE_STAT_GAIN = { attackPerLevel: 1, armorPenetrationPerLevel: 0.001, hpPerLevel: 10 };
  const FIGHTER_UPGRADE_COST_BY_TARGET_LEVEL = {
    attack: [0, 0, 390, 570, 672, 738, 798, 846, 894, 930, 966, 1002, 1032, 1062, 1086, 1110, 1134, 1158, 1182, 1200, 1230, 3000, 3300, 3600, 3900, 4200, 3000, 3300, 3600, 3900, 4200, 8208, 10644, 11814, 12642, 13296, 13842, 14316, 14730, 15102, 15444, 15756, 16044, 16314, 16572, 16806, 17034, 17250, 17454, 17646, 17832, 18012, 18186, 18354, 18516, 18666, 18816, 18966, 19110, 19248, 19380],
    armorPenetration: [0, 0, 585, 855, 1008, 1107, 1197, 1269, 1341, 1395, 1449, 1503, 1548, 1593, 1629, 1665, 1701, 1737, 1773, 1800, 1845, 4500, 4950, 5400, 5850, 6300, 4500, 4950, 5400, 5850, 6300, 12312, 15966, 17721, 18963, 19944, 20763, 21474, 22095, 22653, 23166, 23634, 24066, 24471, 24858, 25209, 25551, 25875, 26181, 26469, 26748, 27018, 27279, 27531, 27774, 27999, 28224, 28449, 28665, 28872, 29070],
    hp: [0, 0, 325, 475, 560, 615, 665, 705, 745, 775, 805, 835, 860, 885, 905, 925, 945, 965, 985, 1000, 1025, 2500, 2750, 3000, 3250, 3500, 2500, 2750, 3000, 3250, 3500, 6840, 8870, 9845, 10535, 11080, 11535, 11930, 12275, 12585, 12870, 13130, 13370, 13595, 13810, 14005, 14195, 14375, 14545, 14705, 14860, 15010, 15155, 15295, 15430, 15555, 15680, 15805, 15925, 16040, 16150]
  };

  function getCommanderExpToNextLevel(level) {
    const safeLevel = Math.max(1, Math.min(COMMANDER_MAX_LEVEL, Math.floor(Number(level) || 1)));
    return COMMANDER_EXP_TO_NEXT_LEVEL[safeLevel];
  }

  function getMaxEnergyByLevel(level) {
    const safeLevel = Math.max(1, Math.min(COMMANDER_MAX_LEVEL, Math.floor(Number(level) || 1)));
    return STAMINA_BASE_MAX + safeLevel * STAMINA_PER_LEVEL;
  }

  function getFighterUpgradeCost(statType, targetLevel) {
    const safeLevel = Math.floor(Number(targetLevel) || 0);
    const costs = FIGHTER_UPGRADE_COST_BY_TARGET_LEVEL[statType];
    return costs && safeLevel >= 1 && safeLevel <= FIGHTER_MAX_UPGRADE_LEVEL ? costs[safeLevel] : null;
  }

  const legacyLevels = [
    {
      id: 1,
      chapterIndex: 1,
      stageInChapter: 1,
      code: "1-1",
      name: "星港外围",
      desc: "敌机数量较少，适合熟悉横版节奏。",
      spawn: 1.05,
      eliteRate: 0.12,
      reward: 260
    },
    {
      id: 2,
      chapterIndex: 1,
      stageInChapter: 2,
      code: "1-2",
      name: "碎星航道",
      desc: "精英敌机增多，敌方弹幕更密。",
      spawn: 0.82,
      eliteRate: 0.22,
      reward: 390
    },
    {
      id: 3,
      chapterIndex: 1,
      stageInChapter: 3,
      code: "1-3",
      name: "核心闸门",
      desc: "第一章最终小关，Boss 护甲更厚。",
      spawn: 0.64,
      eliteRate: 0.32,
      reward: 560
    }
  ];

  function createLevels() {
    const result = [];
    for (let stage = 1; stage <= 3; stage += 1) {
      result.push({ id: result.length + 1, chapterIndex: 0, stageInChapter: stage, code: `序章-${stage}`, name: `序章 ${stage}`, desc: "基础战斗训练。每关均有 BOSS。", spawn: 1.06 - stage * 0.06, eliteRate: 0.04 * stage, reward: 180 + stage * 60, hasBoss: true, isDifficultyStage: false });
    }
    for (let chapter = 1; chapter <= 9; chapter += 1) {
      for (let stage = 1; stage <= 10; stage += 1) {
        const isDifficultyStage = stage === 10;
        result.push({ id: result.length + 1, chapterIndex: chapter, stageInChapter: stage, code: `${chapter}-${stage}`, name: `第 ${chapter} 章 ${stage} 关`, desc: isDifficultyStage ? "章节难度关卡：每关 BOSS 中最强的一战。" : "常规作战关卡：每关均有 BOSS。", spawn: Math.max(.34, 1.08 - chapter * .06 - stage * .02), eliteRate: Math.min(.72, .08 + chapter * .045 + stage * .018), reward: Math.round(280 + chapter * 210 + stage * 55 + (isDifficultyStage ? 320 : 0)), hasBoss: true, isDifficultyStage });
      }
    }
    return result;
  }
  const levels = createLevels();

  const upgrades = {
    fire: {
      name: "火力核心",
      desc: "提升所有子弹伤害，并让基础弹幕更密。",
      max: 10,
      baseCost: 90
    },
    armor: {
      name: "装甲舱",
      desc: "每级增加 1 点初始生命。",
      max: 6,
      baseCost: 130
    },
    engine: {
      name: "推进器",
      desc: "提升战机移动速度。",
      max: 6,
      baseCost: 110
    },
    bounty: {
      name: "金币回收器",
      desc: "击落敌机时获得更多金币。",
      max: 8,
      baseCost: 100
    }
  };

  const POWERUPS = {
    spread: { name: "裂星霰翼", color: "#ffd166", mark: "散" },
    laser: { name: "苍蓝贯星炮", color: "#5ee7ff", mark: "贯" },
    missile: { name: "灵蜂追猎弹", color: "#ff9f43", mark: "猎" },
    shield: { name: "护盾", color: "#9bffcb", mark: "D" },
    life: { name: "生命", color: "#7bed9f", mark: "+" }
  };

  const api = {
    LEVEL_DURATION,
    BOSS_SPAWN_TIME,
    COMMANDER_MAX_LEVEL,
    COMMANDER_EXP_TO_NEXT_LEVEL,
    COMMANDER_TOTAL_EXP_BY_LEVEL,
    STAMINA_BASE_MAX,
    STAMINA_PER_LEVEL,
    ENERGY_MAX,
    ENERGY_COST,
    ENERGY_RECOVER_MS,
    getCommanderExpToNextLevel,
    getMaxEnergyByLevel,
    FIGHTER_MAX_UPGRADE_LEVEL,
    FIGHTER_UPGRADE_STAT_GAIN,
    FIGHTER_UPGRADE_COST_BY_TARGET_LEVEL,
    getFighterUpgradeCost,
    levels,
    createLevels,
    upgrades,
    POWERUPS
  };

  scope.levels = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
