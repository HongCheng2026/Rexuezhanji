(function registerLevels(root) {
  const scope = root.RXGame || (root.RXGame = {});

  const LEVEL_DURATION = 90;
  const BOSS_SPAWN_TIME = 60;
  const ENERGY_MAX = 120;
  const ENERGY_COST = 5;
  const ENERGY_RECOVER_MS = 5 * 60 * 1000;

  const levels = [
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
    spread: { name: "散射", color: "#ffd166", mark: "S" },
    laser: { name: "激光", color: "#5ee7ff", mark: "L" },
    missile: { name: "导弹", color: "#ff9f43", mark: "M" },
    shield: { name: "护盾", color: "#9bffcb", mark: "D" },
    life: { name: "生命", color: "#7bed9f", mark: "+" }
  };

  const api = {
    LEVEL_DURATION,
    BOSS_SPAWN_TIME,
    ENERGY_MAX,
    ENERGY_COST,
    ENERGY_RECOVER_MS,
    levels,
    upgrades,
    POWERUPS
  };

  scope.levels = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
