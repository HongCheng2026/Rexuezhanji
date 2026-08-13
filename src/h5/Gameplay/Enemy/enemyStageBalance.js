(function registerEnemyStageBalance(root) {
  const scope = root.RXGame || (root.RXGame = {});
  const codex = scope.combatCodexConfig || null;
  const balance = scope.balance || null;

  const STAGE_STRUCTURE_CONFIG = {
    prologueChapterIndex: 0,
    prologueStageCount: 3,
    minChapterIndex: 1,
    maxChapterIndex: 9,
    normalStageCount: 10,
    battleEndSeconds: 90,
    bossAppearSeconds: 60
  };

  const CHAPTER_ENEMY_FIRE_INTERVAL_BASE = {
    1: 1,
    2: 0.9,
    3: 0.8,
    4: 0.7,
    5: 0.65,
    6: 0.6,
    7: 0.55,
    8: 0.5,
    9: 0.45
  };

  const ENEMY_FIRE_INTERVAL_LIMIT = {
    minNormalFireInterval: 0.35,
    minBurstFireInterval: 0.1
  };

  const ENEMY_TYPE_CONFIG = {
    small: {
      id: "small",
      name: "小型敌机",
      baseHp: 100,
      baseDamage: 10,
      moveSpeed: 140,
      canFire: true,
      firstFireDelay: 0,
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
      firstFireDelay: 0,
      fireIntervalMultiplier: 1,
      bulletSpeed: 300,
      bulletPattern: "triple"
    },
    charger: {
      id: "charger",
      name: "高速突击敌机",
      baseHp: 140,
      baseDamage: 10,
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
      firstFireDelay: 0,
      fireIntervalMultiplier: 1.1,
      bulletSpeed: 260,
      bulletPattern: "single",
      extraDamageReductionRate: 0.15
    },
    bomber: {
      id: "bomber",
      name: "轰炸机",
      baseHp: 260,
      baseDamage: 16,
      moveSpeed: 95,
      canFire: true,
      firstFireDelay: 0,
      fireIntervalMultiplier: 1.15,
      bulletSpeed: 230,
      bulletPattern: "bomb_mine"
    },
    sniper: {
      id: "sniper",
      name: "狙击机",
      baseHp: 210,
      baseDamage: 18,
      moveSpeed: 105,
      canFire: true,
      firstFireDelay: 0,
      fireIntervalMultiplier: 1.35,
      bulletSpeed: 360,
      bulletPattern: "sniper_warning"
    },
    guard: {
      id: "guard",
      name: "母舰护卫",
      baseHp: 320,
      baseDamage: 18,
      moveSpeed: 88,
      canFire: true,
      firstFireDelay: 0,
      fireIntervalMultiplier: 0.95,
      bulletSpeed: 310,
      bulletPattern: "escort_volley",
      extraDamageReductionRate: 0.08
    },
    rotor: {
      id: "rotor",
      name: "旋翼封锁机",
      baseHp: 300,
      baseDamage: 18,
      moveSpeed: 82,
      canFire: true,
      firstFireDelay: 0,
      fireIntervalMultiplier: 0.9,
      bulletSpeed: 300,
      bulletPattern: "elite_rotating"
    },
    core: {
      id: "core",
      name: "精英核心",
      baseHp: 520,
      baseDamage: 22,
      moveSpeed: 72,
      canFire: true,
      firstFireDelay: 0,
      fireIntervalMultiplier: 0.82,
      bulletSpeed: 330,
      bulletPattern: "elite_mothership",
      extraDamageReductionRate: 0.12
    },
    elite: {
      id: "elite",
      name: "精英战机",
      baseHp: 1000,
      baseDamage: 40,
      moveSpeed: 80,
      canFire: true,
      firstFireDelay: 0,
      fireIntervalMultiplier: 0.8,
      bulletSpeed: 330,
      bulletPattern: "elite_spread"
    },
    boss: {
      id: "boss",
      name: "BOSS战机",
      baseHp: 100000,
      baseDamage: 80,
      moveSpeed: 55,
      canFire: true,
      firstFireDelay: 0,
      fireIntervalMultiplier: 0.7,
      bulletSpeed: 360,
      bulletPattern: "boss_cycle"
    }
  };

  const BOSS_BURST_ATTACK_CONFIG = {
    fireInterval: 0.1,
    duration: 2,
    cooldown: 8,
    triggerHpRates: [0.7, 0.4, 0.15],
    bulletPattern: "boss_burst_spread",
    bulletCount: 13,
    arcDegrees: 84
  };

  const CHAPTER_CONTENT_UNLOCKS = {
    0: {
      entryPatterns: ["lane"],
      bulletPatterns: { small: "single", shooter: "single", shield: "single", elite: "elite_tutorial" },
      eliteVariant: "tutorial",
      bossTheme: "tutorial"
    },
    1: {
      entryPatterns: ["lane", "diagonal"],
      bulletPatterns: { small: "single", shooter: "triple", shield: "single", elite: "elite_fan" },
      eliteVariant: "fan",
      bossTheme: "fan"
    },
    2: {
      entryPatterns: ["lane", "diagonal", "fishScale"],
      bulletPatterns: { small: "single", shooter: "cross_fire", shield: "slow_wall", elite: "elite_guard" },
      eliteVariant: "guard",
      bossTheme: "shield"
    },
    3: {
      entryPatterns: ["lane", "fishScale", "crossLayer"],
      bulletPatterns: { small: "single", shooter: "cross_fire", shield: "slow_wall", elite: "elite_cross" },
      eliteVariant: "cross",
      bossTheme: "crossfire"
    },
    4: {
      entryPatterns: ["lane", "crossLayer", "shieldLine"],
      bulletPatterns: { small: "single", shooter: "cross_fire", shield: "escort_volley", elite: "elite_shield_column" },
      eliteVariant: "shieldColumn",
      bossTheme: "charge"
    },
    5: {
      entryPatterns: ["lane", "charger", "chargeThrough", "shieldLine"],
      bulletPatterns: { small: "single", shooter: "cross_fire", charger: "none", shield: "slow_wall", bomber: "bomb_mine", elite: "elite_summon" },
      eliteVariant: "summon",
      bossTheme: "summon"
    },
    6: {
      entryPatterns: ["lane", "diagonal", "delayedPincer", "formation"],
      bulletPatterns: { small: "single", shooter: "sniper_warning", shield: "slow_wall", bomber: "bomb_mine", sniper: "sniper_warning", elite: "elite_sniper" },
      eliteVariant: "sniper",
      bossTheme: "sniper"
    },
    7: {
      entryPatterns: ["lane", "eliteEscort", "shieldLine", "formation"],
      bulletPatterns: { small: "single", shooter: "cross_fire", shield: "escort_volley", bomber: "bomb_mine", sniper: "sniper_warning", guard: "escort_volley", elite: "elite_guard_volley" },
      eliteVariant: "guardVolley",
      bossTheme: "armorCore"
    },
    8: {
      entryPatterns: ["lane", "topDive", "bottomRise", "crossLayer"],
      bulletPatterns: { small: "single", shooter: "delayed_burst", shield: "slow_wall", sniper: "sniper_warning", guard: "escort_volley", rotor: "elite_rotating", elite: "elite_rotating" },
      eliteVariant: "rotating",
      bossTheme: "rotating"
    },
    9: {
      entryPatterns: ["lane", "mothershipGuard", "eliteEscort", "topDive", "bottomRise", "delayedPincer"],
      bulletPatterns: { small: "single", shooter: "delayed_burst", shield: "escort_volley", bomber: "bomb_mine", sniper: "sniper_warning", guard: "escort_volley", rotor: "elite_rotating", core: "elite_mothership", elite: "elite_mothership" },
      eliteVariant: "mothership",
      bossTheme: "mothership"
    }
  };

  const BOSS_THEME_CONFIG = {
    tutorial: {
      theme: "tutorial",
      title: "序章 BOSS · 苍穹训练靶舰",
      cyclePatterns: ["boss_tutorial_line", "boss_spread"],
      spreadCount: 3,
      spreadArcDegrees: 26,
      laneCount: 2,
      aimInterval: null,
      minFireInterval: 1.05,
      burst: { disabled: true }
    },
    fan: {
      theme: "fan",
      title: "第一章 BOSS · 外围压制舰",
      cyclePatterns: ["boss_spread", "boss_lanes"],
      spreadCount: 5,
      spreadArcDegrees: 42,
      laneCount: 3,
      aimInterval: null,
      minFireInterval: 0.86,
      burst: { disabled: true },
      chapterMechanic: "densityModulation",
      signatureSkills: [
        { id: "greyEyeGaze", patternOnBoss: "boss_homing_orb", cd: 8, notice: "灰眼凝视" },
        { id: "stormWall", patternOnBoss: "boss_wall", cd: 7, notice: "暴风墙" },
        { id: "watchtowerMark", patternOnBoss: "boss_spread", cd: 6, notice: "哨塔标记" }
      ]
    },
    shield: {
      theme: "shield",
      title: "第二章 BOSS · 重甲护盾舰",
      cyclePatterns: ["boss_shield_pulse", "boss_lanes", "boss_spread"],
      spreadCount: 5,
      spreadArcDegrees: 44,
      laneCount: 3,
      shieldPhaseSeconds: 4.5,
      exposedPhaseSeconds: 2.3,
      aimInterval: null,
      minFireInterval: 0.8,
      burst: { disabled: true },
      chapterMechanic: "layeredPlating",
      signatureSkills: [
        { id: "rivetStormExpand", patternOnBoss: "boss_ring_expand", cd: 10, notice: "铆钉风暴·扩散" },
        { id: "rivetStormRecall", patternOnBoss: "boss_ring_recall", cd: 0, notice: "", autoFollow: true, followDelay: 2 },
        { id: "fortressRampart", patternOnBoss: "boss_wall", cd: 12, notice: "要塞壁垒" },
        { id: "armorOverload", patternOnBoss: "boss_burst_spread", cd: 20, notice: "装甲过载" }
      ]
    },
    crossfire: {
      theme: "crossfire",
      title: "第三章 BOSS · 交叉火力舰",
      cyclePatterns: ["boss_cross", "boss_spread", "boss_lanes"],
      spreadCount: 7,
      spreadArcDegrees: 54,
      laneCount: 4,
      aimInterval: 1.8,
      minFireInterval: 0.68,
      burst: { disabled: true },
      chapterMechanic: "crossLockGrid",
      signatureSkills: [
        { id: "deadlockCross", patternOnBoss: "boss_laser_sweep", cd: 8, notice: "死锁十字" },
        { id: "orbitalHunter", patternOnBoss: "boss_homing_orb", cd: 14, notice: "轨道猎杀者" },
        { id: "forkStrangle", patternOnBoss: "boss_cross", cd: 6, notice: "岔路绞杀" }
      ]
    },
    charge: {
      theme: "charge",
      title: "第四章 BOSS · 冲锋航道舰",
      cyclePatterns: ["boss_charge_lane", "boss_spread", "boss_lanes"],
      spreadCount: 7,
      spreadArcDegrees: 58,
      laneCount: 4,
      aimInterval: 1.6,
      minFireInterval: 0.62,
      burst: BOSS_BURST_ATTACK_CONFIG,
      chapterMechanic: "rageSystem",
      signatureSkills: [
        { id: "tripleRush", patternOnBoss: "boss_charge_lane", cd: 12, notice: "裂空三段突" },
        { id: "shockwaveCascade", patternOnBoss: "boss_shockwave_ring", cd: 9, notice: "冲击波连震" },
        { id: "assaultFormation", patternOnBoss: "boss_charge_lane", cd: 16, notice: "突击阵列" }
      ]
    },
    summon: {
      theme: "summon",
      title: "第五章 BOSS · 蜂群召唤舰",
      cyclePatterns: ["boss_summon", "boss_lanes", "boss_spread", "boss_summon"],
      summonGuardBurst: 6,
      spreadCount: 7,
      spreadArcDegrees: 60,
      laneCount: 5,
      aimInterval: 1.5,
      minFireInterval: 0.58,
      burst: BOSS_BURST_ATTACK_CONFIG,
      chapterMechanic: "tacticalOrders",
      signatureSkills: [
        { id: "resonanceLink", patternOnBoss: "boss_summon", cd: 18, notice: "共鸣链接" },
        { id: "ironBeatPhalanx", patternOnBoss: "boss_wall", cd: 14, notice: "铁拍列阵" },
        { id: "mirrorTactics", patternOnBoss: "boss_sniper", cd: 10, notice: "镜像战术" }
      ]
    },
    sniper: {
      theme: "sniper",
      title: "第六章 BOSS · 狙击锁定舰",
      cyclePatterns: ["boss_sniper", "boss_spread", "boss_lanes"],
      spreadCount: 9,
      spreadArcDegrees: 66,
      laneCount: 5,
      aimInterval: 1.25,
      minFireInterval: 0.54,
      burst: BOSS_BURST_ATTACK_CONFIG,
      chapterMechanic: "lockStack",
      signatureSkills: [
        { id: "thousandEyeLock", patternOnBoss: "boss_sniper", cd: 10, notice: "千眼锁定" },
        { id: "interdictionBarrage", patternOnBoss: "boss_lanes", cd: 7, notice: "阻断炮击" },
        { id: "armorPiercingJudgment", patternOnBoss: "boss_laser_sweep", cd: 20, notice: "穿甲裁决" }
      ]
    },
    armorCore: {
      theme: "armorCore",
      title: "第七章 BOSS · 重甲核心舰",
      cyclePatterns: ["boss_armor_pulse", "boss_lanes", "boss_spread"],
      spreadCount: 11,
      spreadArcDegrees: 72,
      laneCount: 5,
      shieldPhaseSeconds: 3.8,
      exposedPhaseSeconds: 2.0,
      aimInterval: 1.2,
      minFireInterval: 0.5,
      burst: BOSS_BURST_ATTACK_CONFIG,
      chapterMechanic: "heatCycle",
      signatureSkills: [
        { id: "hullBreaker", patternOnBoss: "boss_fragment_volley", cd: 6, notice: "外壳碎甲" },
        { id: "corePulse", patternOnBoss: "boss_shockwave_ring", cd: 14, notice: "核心脉冲" },
        { id: "deepDefenseMatrix", patternOnBoss: "boss_grid_explosion", cd: 22, notice: "深度防御矩阵" }
      ]
    },
    rotating: {
      theme: "rotating",
      title: "第八章 BOSS · 旋翼封锁舰",
      cyclePatterns: ["boss_rotating_fan", "boss_lanes", "boss_spread"],
      spreadCount: 13,
      spreadArcDegrees: 82,
      laneCount: 6,
      aimInterval: 1.05,
      minFireInterval: 0.46,
      burst: BOSS_BURST_ATTACK_CONFIG,
      chapterMechanic: "rotorPhase",
      signatureSkills: [
        { id: "rotorGuillotine", patternOnBoss: "boss_rotor_overdrive", cd: 11, notice: "旋翼绞杀" },
        { id: "splitNest", patternOnBoss: "boss_split_nest", cd: 7, notice: "分裂弹巢" },
        { id: "migrationCharge", patternOnBoss: "boss_charge_lane", cd: 15, notice: "迁徙冲锋" }
      ]
    },
    mothership: {
      theme: "mothership",
      title: "第九章 BOSS · 黑潮母舰核心",
      cyclePatterns: ["boss_summon", "boss_sniper", "boss_rotating_fan", "boss_lanes", "boss_burst_spread"],
      summonGuardBurst: 8,
      spreadCount: 15,
      spreadArcDegrees: 92,
      laneCount: 7,
      aimInterval: 0.95,
      minFireInterval: 0.42,
      burst: BOSS_BURST_ATTACK_CONFIG,
      chapterMechanic: "mothershipForms",
      signatureSkills: [
        { id: "messiahJudgment", patternOnBoss: "boss_grid_explosion", cd: 18, notice: "弥赛亚裁决" },
        { id: "gravitySingularity", patternOnBoss: "boss_homing_orb", cd: 14, notice: "重力奇点" },
        { id: "swarmLaunch", patternOnBoss: "boss_summon", cd: 12, notice: "虫群出击" },
        { id: "fullArsenal", patternOnBoss: "boss_rotor_overdrive", cd: 16, notice: "全弹发射" }
      ]
    }
  };

  const PROLOGUE_STAGE_CONFIG = {
    1: { difficultyBonus: 0, composition: { small: 0.92, shooter: 0.08, charger: 0, shield: 0, elite: 0 } },
    2: { difficultyBonus: 0, composition: { small: 0.9, shooter: 0.1, charger: 0, shield: 0, elite: 0 } },
    3: { difficultyBonus: 0, composition: { small: 0.85, shooter: 0.15, charger: 0, shield: 0, elite: 0 } }
  };

  const STAGE_DIFFICULTY_TEMPLATE = { 1: 0, 2: 0.02, 3: 0.04, 4: 0.06, 5: 0.12, 6: 0.14, 7: 0.16, 8: 0.18, 9: 0.2, 10: 0.32 };
  const STAGE_COMPOSITION_TEMPLATE = {
    grass: { small: 0.8, shooter: 0.2, charger: 0, shield: 0, elite: 0 },
    gate: { small: 0.6, shooter: 0.25, charger: 0.1, shield: 0, elite: 0.05 },
    pressure: { small: 0.5, shooter: 0.25, charger: 0.1, shield: 0.1, elite: 0.05 },
    boss: { small: 0.4, shooter: 0.25, charger: 0.1, shield: 0.1, elite: 0.15 }
  };
  const CHAPTER_ACTIVE_CAP = {
    0: 14,
    1: 18,
    2: 22,
    3: 26,
    4: 30,
    5: 34,
    6: 38,
    7: 42,
    8: 46,
    9: 44
  };
  const CHAPTER_FIRE_PRESSURE_BASE = {
    0: 0.4,
    1: 0.9,
    2: 1.35,
    3: 2.25,
    4: 2.35,
    5: 2.65,
    6: 2.85,
    7: 3.1,
    8: 3.35,
    9: 3.75
  };
  const PHASE_FIRE_PRESSURE_MULTIPLIER = {
    opening: 0.45,
    grass: 0.75,
    pressure: 1,
    bossPrep: 0.25,
    relief: 0.25,
    bossPressure: 0.85
  };
  const CHAPTER_BULLET_SPEED_MULTIPLIER = {
    0: 0.85,
    1: 0.9,
    2: 0.95,
    3: 1,
    4: 1.06,
    5: 1.12,
    6: 1.18,
    7: 1.24,
    8: 1.3,
    9: 1.38
  };
  const STANDARD_SPAWN_DIRECTOR_PHASES = [
    { id: "opening", name: "opening", start: 0, end: 20, waveInterval: 0.68, intervalJitter: 0.12, minWaveInterval: 0.38, eliteChance: 0.06, waveSize: 5, minAliveTargets: 5, antiDrySpawn: 4, entryPatterns: ["lane", "diagonal"] },
    { id: "grass", name: "grass", start: 20, end: 50, waveInterval: 0.58, intervalJitter: 0.12, minWaveInterval: 0.34, eliteChance: 0.12, waveSize: 6, minAliveTargets: 6, antiDrySpawn: 5, entryPatterns: ["lane", "formation", "diagonal"] },
    { id: "bossPrep", name: "bossPrep", start: 50, end: 60, waveInterval: 0.88, intervalJitter: 0.14, minWaveInterval: 0.48, eliteChance: 0.1, waveSize: 3, minAliveTargets: 3, antiDrySpawn: 2, entryPatterns: ["lane"] },
    { id: "bossPressure", name: "bossPressure", start: 60, end: 90, waveInterval: 0.74, intervalJitter: 0.14, minWaveInterval: 0.36, eliteChance: 0.28, waveSize: 4, minAliveTargets: 4, antiDrySpawn: 3, entryPatterns: ["lane", "shieldLine"], guard: true }
  ];
  const EARLY_SPAWN_DIRECTOR_PHASES = [
    { id: "opening", name: "opening", start: 0, end: 20, waveInterval: 0.54, intervalJitter: 0.08, minWaveInterval: 0.32, eliteChance: 0.015, waveSize: 6, minAliveTargets: 6, antiDrySpawn: 5, entryPatterns: ["lane", "diagonal"] },
    { id: "grass", name: "grass", start: 20, end: 50, waveInterval: 0.46, intervalJitter: 0.08, minWaveInterval: 0.28, eliteChance: 0.03, waveSize: 7, minAliveTargets: 7, antiDrySpawn: 6, entryPatterns: ["lane", "formation", "diagonal"] },
    { id: "bossPrep", name: "bossPrep", start: 50, end: 60, waveInterval: 0.78, intervalJitter: 0.1, minWaveInterval: 0.44, eliteChance: 0.03, waveSize: 3, minAliveTargets: 3, antiDrySpawn: 2, entryPatterns: ["lane"] },
    { id: "bossPressure", name: "bossPressure", start: 60, end: 90, waveInterval: 0.68, intervalJitter: 0.1, minWaveInterval: 0.36, eliteChance: 0.04, waveSize: 4, minAliveTargets: 4, antiDrySpawn: 3, entryPatterns: ["lane", "shieldLine"], guard: true }
  ];
  const PROLOGUE_SPAWN_DIRECTOR_PHASES = [
    { id: "opening", name: "opening", start: 0, end: 20, waveInterval: 0.66, intervalJitter: 0.1, minWaveInterval: 0.44, eliteChance: 0, waveSize: 5, minAliveTargets: 5, antiDrySpawn: 4, entryPatterns: ["lane"] },
    { id: "grass", name: "grass", start: 20, end: 50, waveInterval: 0.58, intervalJitter: 0.1, minWaveInterval: 0.4, eliteChance: 0.005, waveSize: 6, minAliveTargets: 6, antiDrySpawn: 5, entryPatterns: ["lane"] },
    { id: "bossPrep", name: "bossPrep", start: 50, end: 60, waveInterval: 0.86, intervalJitter: 0.12, minWaveInterval: 0.54, eliteChance: 0.005, waveSize: 3, minAliveTargets: 3, antiDrySpawn: 2, entryPatterns: ["lane"] },
    { id: "bossPressure", name: "bossPressure", start: 60, end: 90, waveInterval: 0.94, intervalJitter: 0.12, minWaveInterval: 0.62, eliteChance: 0.01, waveSize: 3, minAliveTargets: 2, antiDrySpawn: 2, entryPatterns: ["lane"], guard: true }
  ];
  const TRANSITION_SPAWN_DIRECTOR_PHASES = [
    { id: "opening", name: "opening", start: 0, end: 20, waveInterval: 0.56, intervalJitter: 0.1, minWaveInterval: 0.32, eliteChance: 0.08, waveSize: 6, minAliveTargets: 6, antiDrySpawn: 5, entryPatterns: ["lane", "diagonal"] },
    { id: "grass", name: "grass", start: 20, end: 50, waveInterval: 0.48, intervalJitter: 0.1, minWaveInterval: 0.3, eliteChance: 0.14, waveSize: 7, minAliveTargets: 7, antiDrySpawn: 6, entryPatterns: ["lane", "formation", "diagonal"] },
    { id: "bossPrep", name: "bossPrep", start: 50, end: 60, waveInterval: 0.78, intervalJitter: 0.12, minWaveInterval: 0.42, eliteChance: 0.12, waveSize: 3, minAliveTargets: 3, antiDrySpawn: 2, entryPatterns: ["lane"] },
    { id: "bossPressure", name: "bossPressure", start: 60, end: 90, waveInterval: 0.64, intervalJitter: 0.12, minWaveInterval: 0.34, eliteChance: 0.2, waveSize: 5, minAliveTargets: 5, antiDrySpawn: 4, entryPatterns: ["lane", "shieldLine"], guard: true }
  ];
  const CHAPTER_7_STAGE_DAMAGE_REDUCTION = { 1: 0.45, 2: 0.48, 3: 0.5, 4: 0.52, 5: 0.58, 6: 0.6, 7: 0.62, 8: 0.65, 9: 0.68, 10: 0.7 };
  const CHAPTER_7_COMPOSITION_OVERRIDE = {
    1: { small: 0.45, shooter: 0.25, charger: 0.1, shield: 0.1, elite: 0.1 },
    2: { small: 0.45, shooter: 0.25, charger: 0.1, shield: 0.1, elite: 0.1 },
    3: { small: 0.42, shooter: 0.25, charger: 0.1, shield: 0.13, elite: 0.1 },
    4: { small: 0.4, shooter: 0.25, charger: 0.1, shield: 0.15, elite: 0.1 },
    5: { small: 0.35, shooter: 0.25, charger: 0.1, shield: 0.2, elite: 0.1 },
    6: { small: 0.32, shooter: 0.25, charger: 0.1, shield: 0.23, elite: 0.1 },
    7: { small: 0.3, shooter: 0.25, charger: 0.1, shield: 0.25, elite: 0.1 },
    8: { small: 0.28, shooter: 0.25, charger: 0.1, shield: 0.27, elite: 0.1 },
    9: { small: 0.25, shooter: 0.25, charger: 0.1, shield: 0.3, elite: 0.1 },
    10: { small: 0.2, shooter: 0.25, charger: 0.05, shield: 0.3, elite: 0.2 }
  };
  const CHAPTER_2_COMPOSITION_OVERRIDE = {
    1: { small: 0.58, shooter: 0.24, charger: 0.04, shield: 0.12, elite: 0.02 },
    2: { small: 0.55, shooter: 0.25, charger: 0.04, shield: 0.14, elite: 0.02 },
    3: { small: 0.52, shooter: 0.25, charger: 0.05, shield: 0.16, elite: 0.02 },
    4: { small: 0.48, shooter: 0.26, charger: 0.05, shield: 0.18, elite: 0.03 },
    5: { small: 0.45, shooter: 0.26, charger: 0.06, shield: 0.2, elite: 0.03 },
    6: { small: 0.42, shooter: 0.26, charger: 0.06, shield: 0.22, elite: 0.04 },
    7: { small: 0.39, shooter: 0.27, charger: 0.06, shield: 0.23, elite: 0.05 },
    8: { small: 0.36, shooter: 0.27, charger: 0.06, shield: 0.25, elite: 0.06 },
    9: { small: 0.33, shooter: 0.27, charger: 0.06, shield: 0.27, elite: 0.07 },
    10: { small: 0.28, shooter: 0.28, charger: 0.05, shield: 0.29, elite: 0.1 }
  };

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const getStageId = (chapterIndex, stageInChapter) => chapterIndex === 0 ? `prologue_${stageInChapter}` : `${chapterIndex}_${stageInChapter}`;

  function getPreviousStageId(chapterIndex, stageInChapter) {
    if (chapterIndex === 0 && stageInChapter === 1) return null;
    if (chapterIndex === 0) return getStageId(0, stageInChapter - 1);
    if (chapterIndex === 1 && stageInChapter === 1) return getStageId(0, 3);
    return stageInChapter === 1 ? getStageId(chapterIndex - 1, 10) : getStageId(chapterIndex, stageInChapter - 1);
  }

  const isStageUnlocked = ({ chapterIndex, stageInChapter, clearedStageIds }) => {
    const previous = getPreviousStageId(chapterIndex, stageInChapter);
    return previous === null || (clearedStageIds || []).includes(previous);
  };

  const getChapterDifficultyBase = (chapterIndex) => chapterIndex <= 1 ? 0 : (chapterIndex - 1) * 0.12;
  const getStageTemplateType = (stageInChapter) => stageInChapter <= 4 ? "grass" : stageInChapter === 5 ? "gate" : stageInChapter <= 9 ? "pressure" : "boss";
  const getStageDifficulty = (chapterIndex, stageInChapter) => chapterIndex === 0 ? (PROLOGUE_STAGE_CONFIG[stageInChapter]?.difficultyBonus || 0) : getChapterDifficultyBase(chapterIndex) + (STAGE_DIFFICULTY_TEMPLATE[stageInChapter] || 0);
  const getStageDamageReductionRate = (chapterIndex, stageInChapter) => chapterIndex === 0 ? 0 : chapterIndex === 7 ? (CHAPTER_7_STAGE_DAMAGE_REDUCTION[stageInChapter] || 0.45) : clamp(getStageDifficulty(chapterIndex, stageInChapter) * 0.5, 0, 0.65);
  const getStageEnemyHpMultiplier = (chapterIndex, stageInChapter) => 1 + getStageDifficulty(chapterIndex, stageInChapter);
  const getChapterFireIntervalBase = (chapterIndex) => chapterIndex === 0 ? 1.2 : (CHAPTER_ENEMY_FIRE_INTERVAL_BASE[chapterIndex] || 1);

  function getChapterContentConfig(chapterIndex) {
    return CHAPTER_CONTENT_UNLOCKS[chapterIndex] || CHAPTER_CONTENT_UNLOCKS[9];
  }

  function getBossThemeConfig(chapterIndex) {
    const content = getChapterContentConfig(chapterIndex);
    const theme = content.bossTheme || "fan";
    return BOSS_THEME_CONFIG[theme] || BOSS_THEME_CONFIG.fan;
  }

  function getEnemyBulletPattern(chapterIndex, enemyType) {
    const content = getChapterContentConfig(chapterIndex);
    const patterns = content.bulletPatterns || {};
    return patterns[enemyType] || ENEMY_TYPE_CONFIG[enemyType]?.bulletPattern || "single";
  }

  function getEnemyFireInterval(chapterIndex, enemyType) {
    const config = ENEMY_TYPE_CONFIG[enemyType];
    if (enemyType === "elite") {
      if (chapterIndex <= 1) return 2.2;
      if (chapterIndex === 2) return 1.9;
      if (chapterIndex === 3) return 1.5;
    }
    if (enemyType === "boss") {
      if (chapterIndex <= 2) return 1.35;
      if (chapterIndex === 3) return 0.95;
    }
    return !config?.canFire ? null : Math.max(ENEMY_FIRE_INTERVAL_LIMIT.minNormalFireInterval, Number((getChapterFireIntervalBase(chapterIndex) * config.fireIntervalMultiplier).toFixed(2)));
  }

  const getEnemyFirstFireDelay = (enemyType) => ENEMY_TYPE_CONFIG[enemyType]?.canFire ? ENEMY_TYPE_CONFIG[enemyType].firstFireDelay : null;

  function getEnemyWaveConfig(chapterIndex, enemyType) {
    if (enemyType === "elite") {
      const content = getChapterContentConfig(chapterIndex);
      if (chapterIndex <= 1) return { bulletCount: 3, arcDegrees: 24, aimShot: false, variant: content.eliteVariant };
      if (chapterIndex === 2) return { bulletCount: 4, arcDegrees: 30, aimShot: false, variant: content.eliteVariant };
      if (chapterIndex === 3) return { bulletCount: 5, arcDegrees: 40, aimShot: true, variant: content.eliteVariant };
      return {
        bulletCount: chapterIndex >= 8 ? 9 : chapterIndex >= 5 ? 7 : 5,
        arcDegrees: 48,
        aimShot: true,
        variant: content.eliteVariant
      };
    }
    if (enemyType === "boss") {
      return { ...getBossThemeConfig(chapterIndex) };
    }
    return {
      bulletCount: enemyType === "shooter" ? 3 : 1,
      arcDegrees: enemyType === "shooter" ? 18 : 0,
      aimShot: true,
      bulletPattern: getEnemyBulletPattern(chapterIndex, enemyType)
    };
  }

  function getSpawnDirectorPhases(chapterIndex) {
    if (chapterIndex === 0) return PROLOGUE_SPAWN_DIRECTOR_PHASES;
    if (chapterIndex <= 2) return EARLY_SPAWN_DIRECTOR_PHASES;
    if (chapterIndex === 3) return TRANSITION_SPAWN_DIRECTOR_PHASES;
    return STANDARD_SPAWN_DIRECTOR_PHASES;
  }

  function normalizeComposition(composition) {
    const total = Object.values(composition).reduce((sum, value) => sum + value, 0);
    if (total <= 0) return { small: 1, shooter: 0, charger: 0, shield: 0, elite: 0 };
    return Object.fromEntries(Object.entries(composition).map(([key, value]) => [key, Number((value / total).toFixed(4))]));
  }

  function getStageEnemyComposition(chapterIndex, stageInChapter) {
    if (chapterIndex === 0) return normalizeComposition(PROLOGUE_STAGE_CONFIG[stageInChapter]?.composition || { small: 1 });
    if (chapterIndex === 2 && CHAPTER_2_COMPOSITION_OVERRIDE[stageInChapter]) return normalizeComposition(CHAPTER_2_COMPOSITION_OVERRIDE[stageInChapter]);
    if (chapterIndex === 7 && CHAPTER_7_COMPOSITION_OVERRIDE[stageInChapter]) return normalizeComposition(CHAPTER_7_COMPOSITION_OVERRIDE[stageInChapter]);

    var base = normalizeComposition(STAGE_COMPOSITION_TEMPLATE[getStageTemplateType(stageInChapter)]);

    // Merge roster-based weights when available
    if (codex) {
      var roster = codex.getStageEnemyRoster(chapterIndex, stageInChapter);
      if (roster && roster.weights) {
        // Roster weights are keyed by unitId, but we also want to inform type composition.
        // Existing type-based composition takes priority; roster weights are additive hints.
        // We store roster weight info for downstream consumers.
        base._rosterWeights = roster.weights;
      }
    }

    return base;
  }

  function getStageRosterUnitIds(chapterIndex, stageInChapter) {
    if (!codex) return null;
    var roster = codex.getStageEnemyRoster(chapterIndex, stageInChapter);
    if (!roster) return null;
    var unitIds = [];
    if (roster.mobs) unitIds = unitIds.concat(roster.mobs);
    if (roster.fighters) unitIds = unitIds.concat(roster.fighters);
    if (roster.elites) unitIds = unitIds.concat(roster.elites);
    return unitIds;
  }

  function getChapterActiveCap(chapterIndex) {
    return CHAPTER_ACTIVE_CAP[chapterIndex] || CHAPTER_ACTIVE_CAP[9];
  }

  function getChapterBossGuardCap(chapterIndex) {
    if (chapterIndex <= 0) return 6;
    if (chapterIndex <= 2) return 6 + chapterIndex * 2;
    if (chapterIndex <= 6) return 10 + (chapterIndex - 3);
    return Math.min(16, 12 + (chapterIndex - 7) * 2);
  }

  function getExpectedKills(chapterIndex) {
    if (chapterIndex <= 0) return 120;
    if (chapterIndex === 1) return 180;
    if (chapterIndex === 2) return 220;
    if (chapterIndex === 3) return 260;
    return 260 + (chapterIndex - 3) * 40;
  }

  function getTypeWeights(chapterIndex, stageInChapter) {
    const composition = getStageEnemyComposition(chapterIndex, stageInChapter);
    const weights = {
      small: Math.max(0.05, composition.small || 0),
      shooter: Math.max(0, composition.shooter || 0),
      charger: Math.max(0, composition.charger || 0),
      shield: Math.max(0, composition.shield || 0),
      bomber: 0,
      sniper: 0,
      guard: 0,
      rotor: 0,
      core: 0
    };
    if (chapterIndex >= 4) weights.shooter += 0.04;
    if (chapterIndex >= 5) weights.shield += 0.04;
    if (chapterIndex >= 7) weights.charger += 0.04;
    if (chapterIndex >= 5) weights.bomber += chapterIndex >= 7 ? 0.08 : 0.05;
    if (chapterIndex >= 6) weights.sniper += chapterIndex >= 8 ? 0.07 : 0.04;
    if (chapterIndex >= 7) weights.guard += chapterIndex >= 9 ? 0.08 : 0.05;
    if (chapterIndex >= 8) weights.rotor += chapterIndex >= 9 ? 0.08 : 0.05;
    if (chapterIndex >= 9) weights.core += 0.06;
    return normalizeComposition(weights);
  }

  function getPhaseTypeWeights(chapterIndex, stageInChapter, phaseId) {
    if (chapterIndex === 0 && stageInChapter === 1 && (phaseId === "opening" || phaseId === "bossPrep")) {
      return normalizeComposition({ small: 1, shooter: 0, charger: 0, shield: 0 });
    }
    return getTypeWeights(chapterIndex, stageInChapter);
  }

  function getEnemyFireProfile(chapterIndex, stageInChapter, phaseId, enemyType) {
    const config = ENEMY_TYPE_CONFIG[enemyType];
    const phaseScale = PHASE_FIRE_PRESSURE_MULTIPLIER[phaseId] || 1;
    let pressure = clamp((CHAPTER_FIRE_PRESSURE_BASE[chapterIndex] || CHAPTER_FIRE_PRESSURE_BASE[9]) * phaseScale, 0, 4);
    if (stageInChapter >= 8) pressure = clamp(pressure + 0.25, 0, 4);
    if (enemyType === "small" && chapterIndex === 0) pressure = 0;
    if (enemyType === "small" && chapterIndex === 1) pressure = Math.max(0, pressure - 0.55);
    if (enemyType === "small" && phaseId === "opening" && chapterIndex <= 3) pressure = 0;
    if (enemyType === "charger") pressure = 0;
    if ((enemyType === "bomber" || enemyType === "sniper" || enemyType === "guard" || enemyType === "rotor" || enemyType === "core") && chapterIndex < 5) pressure = 0;
    if (enemyType === "shield" && chapterIndex <= 2) pressure = Math.max(0, pressure - 0.45);

    const basePattern = getEnemyBulletPattern(chapterIndex, enemyType);
    const canFire = !!(config && config.canFire && pressure > 0 && basePattern !== "none");
    const baseInterval = getEnemyFireInterval(chapterIndex, enemyType);
    const intervalScale = pressure <= 1 ? 1.65 : pressure <= 2 ? 1.25 : pressure <= 3 ? 1 : 0.86;
    const firstFireDelay = pressure <= 1 ? 1.4 : pressure <= 2 ? 0.95 : pressure <= 3 ? 0.65 : 0.45;

    return {
      pressure: Number(pressure.toFixed(2)),
      canFire,
      bulletPattern: canFire ? basePattern : "none",
      fireInterval: baseInterval == null ? null : Number((baseInterval * intervalScale).toFixed(2)),
      firstFireDelay: canFire ? firstFireDelay : null,
      bulletSpeedMultiplier: CHAPTER_BULLET_SPEED_MULTIPLIER[chapterIndex] || CHAPTER_BULLET_SPEED_MULTIPLIER[9]
    };
  }

  function getPhaseFireProfile(chapterIndex, stageInChapter, phaseId) {
    return {
      small: getEnemyFireProfile(chapterIndex, stageInChapter, phaseId, "small"),
      shooter: getEnemyFireProfile(chapterIndex, stageInChapter, phaseId, "shooter"),
      charger: getEnemyFireProfile(chapterIndex, stageInChapter, phaseId, "charger"),
      shield: getEnemyFireProfile(chapterIndex, stageInChapter, phaseId, "shield"),
      bomber: getEnemyFireProfile(chapterIndex, stageInChapter, phaseId, "bomber"),
      sniper: getEnemyFireProfile(chapterIndex, stageInChapter, phaseId, "sniper"),
      guard: getEnemyFireProfile(chapterIndex, stageInChapter, phaseId, "guard"),
      rotor: getEnemyFireProfile(chapterIndex, stageInChapter, phaseId, "rotor"),
      core: getEnemyFireProfile(chapterIndex, stageInChapter, phaseId, "core"),
      elite: getEnemyFireProfile(chapterIndex, stageInChapter, phaseId, "elite")
    };
  }

  function createPressurePhase(phase, chapterIndex, stageInChapter, activeCap) {
    const waveSize = Math.max(2, Math.floor(phase.waveSize || 4));
    const pressureScale = chapterIndex >= 7 ? 0.84 : chapterIndex >= 5 ? 0.9 : chapterIndex === 3 ? 0.96 : 1;
    const chapterEntries = getChapterContentConfig(chapterIndex).entryPatterns || ["lane"];
    const entryPatterns = Array.from(new Set([...(phase.entryPatterns || ["lane"]), ...chapterEntries]));
    const refillInterval = Math.max(
      phase.minWaveInterval || 0.24,
      Number(((phase.waveInterval || 0.7) * pressureScale).toFixed(2))
    );
    return {
      id: phase.id,
      start: phase.start,
      end: phase.end,
      activeCap,
      enteringCap: activeCap + waveSize,
      waveSize,
      refillInterval,
      intervalJitter: phase.intervalJitter || 0.12,
      minAliveTargets: phase.minAliveTargets || Math.max(3, Math.floor(activeCap * 0.35)),
      antiDrySpawn: phase.antiDrySpawn || Math.max(2, Math.floor(waveSize * 0.8)),
      eliteChance: phase.eliteChance || 0,
      typeWeights: getPhaseTypeWeights(chapterIndex, stageInChapter, phase.id),
      fireProfile: getPhaseFireProfile(chapterIndex, stageInChapter, phase.id),
      entryPatterns
    };
  }

  function getStageSpawnPressure(chapterIndex, stageInChapter) {
    const activeCap = getChapterActiveCap(chapterIndex);
    const phases = getSpawnDirectorPhases(chapterIndex).map((phase) => createPressurePhase(phase, chapterIndex, stageInChapter, activeCap));
    return {
      activeCap,
      enteringCap: activeCap + Math.max(...phases.map((phase) => phase.waveSize)),
      bossGuardCap: getChapterBossGuardCap(chapterIndex),
      typeWeights: getTypeWeights(chapterIndex, stageInChapter),
      phases
    };
  }

  function getStageEnemySpawnPlan(chapterIndex, stageInChapter) {
    const composition = getStageEnemyComposition(chapterIndex, stageInChapter);
    var roster = null;
    if (codex) {
      roster = codex.getStageEnemyRoster(chapterIndex, stageInChapter);
    }
    return {
      composition,
      phases: getSpawnDirectorPhases(chapterIndex),
      spawnPressure: getStageSpawnPressure(chapterIndex, stageInChapter),
      entryMode: "rightOnly",
      simultaneousCap: getChapterActiveCap(chapterIndex),
      bossGuardCap: getChapterBossGuardCap(chapterIndex),
      threatBudget: chapterIndex <= 2 ? 0.58 : chapterIndex === 3 ? 0.86 : chapterIndex >= 7 ? 1.18 : chapterIndex >= 5 ? 1.08 : 1,
      roster: roster
    };
  }

  function getEnemyFinalStats({ chapterIndex, stageInChapter, enemyType, unitId }) {
    const config = ENEMY_TYPE_CONFIG[enemyType];
    if (!config) throw new Error(`Unknown enemy type: ${enemyType}`);
    const baseDamageReductionRate = clamp(
      getStageDamageReductionRate(chapterIndex, stageInChapter) + (config.extraDamageReductionRate || 0),
      0,
      0.9
    );
    const bossScaling = enemyType === "boss" && balance && balance.getBossScaling
      ? balance.getBossScaling(chapterIndex, stageInChapter, baseDamageReductionRate)
      : null;
    const hpMultiplier = bossScaling ? bossScaling.hpMultiplier : getStageEnemyHpMultiplier(chapterIndex, stageInChapter);
    const damageReductionRate = bossScaling
      ? bossScaling.damageReductionRate
      : baseDamageReductionRate;

    var result = {
      ...config,
      hp: bossScaling ? bossScaling.hp : Math.ceil(config.baseHp * hpMultiplier),
      attackDamage: config.baseDamage,
      bulletSpeedMultiplier: CHAPTER_BULLET_SPEED_MULTIPLIER[chapterIndex] || CHAPTER_BULLET_SPEED_MULTIPLIER[9],
      firstFireDelay: getEnemyFirstFireDelay(enemyType),
      fireInterval: getEnemyFireInterval(chapterIndex, enemyType),
      bulletPattern: getEnemyBulletPattern(chapterIndex, enemyType),
      variant: enemyType === "elite" ? getChapterContentConfig(chapterIndex).eliteVariant : null,
      bossTheme: enemyType === "boss" ? getBossThemeConfig(chapterIndex).theme : null,
      title: enemyType === "boss" ? getBossThemeConfig(chapterIndex).title : config.name,
      damageReductionRate,
      damageTakenMultiplier: 1 - damageReductionRate,
      armorPierceRatio: bossScaling ? bossScaling.armorPierceRatio : 0,
      waveConfig: getEnemyWaveConfig(chapterIndex, enemyType)
    };

    if (unitId && codex) {
      var unit = codex.getEnemyUnit(unitId);
      if (unit && unit.statScale) {
        var ss = unit.statScale;
        if (typeof ss.hp === "number") result.hp = Math.ceil(result.hp * ss.hp);
        if (typeof ss.damage === "number") result.attackDamage = Math.ceil(result.attackDamage * ss.damage);
        if (typeof ss.speed === "number") result.bulletSpeedMultiplier = Number((result.bulletSpeedMultiplier * ss.speed).toFixed(2));
        // fireInterval gets faster with higher speed
        if (typeof ss.speed === "number" && result.fireInterval != null) result.fireInterval = Number((result.fireInterval / ss.speed).toFixed(2));
        // extra damageReduction from statScale if present
        if (typeof ss.damageReduction === "number" && ss.damageReduction > 0) {
          var dr = clamp(damageReductionRate + ss.damageReduction, 0, 0.9);
          result.damageReductionRate = dr;
          result.damageTakenMultiplier = 1 - dr;
        }
      }
    }

    return result;
  }

  function getStageConfig(chapterIndex, stageInChapter) {
    const hasBoss = true;
    return {
      stageId: getStageId(chapterIndex, stageInChapter),
      chapterIndex,
      stageInChapter,
      previousStageId: getPreviousStageId(chapterIndex, stageInChapter),
      battleEndSeconds: 90,
      bossAppearSeconds: hasBoss ? 60 : null,
      difficulty: getStageDifficulty(chapterIndex, stageInChapter),
      damageReductionRate: getStageDamageReductionRate(chapterIndex, stageInChapter),
      enemyHpMultiplier: getStageEnemyHpMultiplier(chapterIndex, stageInChapter),
      hasBoss,
      boss: hasBoss ? { stats: getEnemyFinalStats({ chapterIndex, stageInChapter, enemyType: "boss" }), appearSeconds: 60, burstAttack: BOSS_BURST_ATTACK_CONFIG } : null,
      spawnPlan: getStageEnemySpawnPlan(chapterIndex, stageInChapter)
    };
  }

  function generateAllStageConfigs() {
    const stages = [];
    for (let stage = 1; stage <= 3; stage += 1) stages.push(getStageConfig(0, stage));
    for (let chapter = 1; chapter <= 9; chapter += 1) {
      for (let stage = 1; stage <= 10; stage += 1) stages.push(getStageConfig(chapter, stage));
    }
    return stages;
  }

  function getStageUnitWeights(chapterIndex, stageInChapter) {
    if (!codex) return null;
    var roster = codex.getStageEnemyRoster(chapterIndex, stageInChapter);
    if (!roster || !roster.weights) return null;
    return Object.assign({}, roster.weights);
  }

  const api = {
    STAGE_STRUCTURE_CONFIG,
    CHAPTER_ENEMY_FIRE_INTERVAL_BASE,
    ENEMY_FIRE_INTERVAL_LIMIT,
    ENEMY_TYPE_CONFIG,
    BOSS_BURST_ATTACK_CONFIG,
    PROLOGUE_STAGE_CONFIG,
    STAGE_DIFFICULTY_TEMPLATE,
    STAGE_COMPOSITION_TEMPLATE,
    CHAPTER_FIRE_PRESSURE_BASE,
    PHASE_FIRE_PRESSURE_MULTIPLIER,
    CHAPTER_BULLET_SPEED_MULTIPLIER,
    STANDARD_SPAWN_DIRECTOR_PHASES,
    EARLY_SPAWN_DIRECTOR_PHASES,
    PROLOGUE_SPAWN_DIRECTOR_PHASES,
    TRANSITION_SPAWN_DIRECTOR_PHASES,
    CHAPTER_7_STAGE_DAMAGE_REDUCTION,
    CHAPTER_7_COMPOSITION_OVERRIDE,
    CHAPTER_2_COMPOSITION_OVERRIDE,
    clamp,
    getStageId,
    getPreviousStageId,
    isStageUnlocked,
    getChapterDifficultyBase,
    getStageTemplateType,
    getStageDifficulty,
    getStageDamageReductionRate,
    getStageEnemyHpMultiplier,
    getChapterFireIntervalBase,
    getChapterContentConfig,
    getBossThemeConfig,
    getEnemyBulletPattern,
    getEnemyFireInterval,
    getEnemyFireProfile,
    getEnemyFirstFireDelay,
    getEnemyWaveConfig,
    getSpawnDirectorPhases,
    getChapterActiveCap,
    getChapterBossGuardCap,
    getExpectedKills,
    getStageSpawnPressure,
    normalizeComposition,
    getStageEnemyComposition,
    getStageEnemySpawnPlan,
    getEnemyFinalStats,
    getStageConfig,
    generateAllStageConfigs,
    getStageRosterUnitIds,
    getStageUnitWeights
  };

  scope.enemyStageBalance = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
