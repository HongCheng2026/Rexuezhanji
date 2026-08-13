(function registerTacticalLoadoutConfig(root) {
  "use strict";

  var scope = root.RXGame || (root.RXGame = {});
  var ACTIVE_SLOT_COUNT = 4;
  var FIXED_WEAPON_SLOT_COUNT = 3;
  var AUTO_WEAPON_SLOT_COUNT = 3;
  var AUTO_SKILL_SLOT_COUNT = 6;
  var AUTO_SKILL_MAX_LEVEL = 10;
  var LEGACY_ACTIVE_AUTO_IDS = Object.freeze([
    "sky-lock-beam", "obsidian-gravity-well", "gold-judgement-buff", "phase-shield"
  ]);
  var LEGACY_WEAPON_MODULE_IDS = Object.freeze([
    "spread-focus", "spread-storm", "laser-prism", "laser-capacitor",
    "missile-guidance", "missile-warhead"
  ]);

  function levelTable(rows) {
    return Object.freeze([null].concat(rows.map(function freezeRow(row, index) {
      return Object.freeze(Object.assign({ level: index + 1 }, row));
    })));
  }

  var FIXED_AUTO_WEAPONS = Object.freeze([
    Object.freeze({ id: "weapon_fixed_01", weaponType: "laser", name: "脉冲光束", category: "fixed", visualId: "weapon-fixed-laser" }),
    Object.freeze({ id: "weapon_fixed_02", weaponType: "spread", name: "星芒散射", category: "fixed", visualId: "weapon-fixed-spread" }),
    Object.freeze({ id: "weapon_fixed_03", weaponType: "missile", name: "猎杀追踪", category: "fixed", visualId: "weapon-fixed-missile" })
  ]);

  var SIDEWING_LEVEL_STATS = levelTable([
    { damageMultiplier: 1, fireInterval: 0.16, projectileSpeed: 615, coverageAngle: 0, trajectoryCount: 1, normalBulletCancelRate: 0.06, eliteBulletCancelRate: 0.03, cost: 50000 },
    { damageMultiplier: 1.2, fireInterval: 0.16, projectileSpeed: 620, coverageAngle: 12, trajectoryCount: 2, normalBulletCancelRate: 0.12, eliteBulletCancelRate: 0.06, cost: 80000 },
    { damageMultiplier: 1.45, fireInterval: 0.16, projectileSpeed: 625, coverageAngle: 24, trajectoryCount: 3, normalBulletCancelRate: 0.18, eliteBulletCancelRate: 0.09, cost: 120000 },
    { damageMultiplier: 1.75, fireInterval: 0.16, projectileSpeed: 630, coverageAngle: 36, trajectoryCount: 4, normalBulletCancelRate: 0.24, eliteBulletCancelRate: 0.12, cost: 180000 },
    { damageMultiplier: 2.1, fireInterval: 0.16, projectileSpeed: 635, coverageAngle: 48, trajectoryCount: 5, normalBulletCancelRate: 0.3, eliteBulletCancelRate: 0.15, cost: 270000 },
    { damageMultiplier: 2.5, fireInterval: 0.16, projectileSpeed: 640, coverageAngle: 60, trajectoryCount: 6, normalBulletCancelRate: 0.36, eliteBulletCancelRate: 0.18, cost: 400000 },
    { damageMultiplier: 2.95, fireInterval: 0.16, projectileSpeed: 645, coverageAngle: 70, trajectoryCount: 7, normalBulletCancelRate: 0.42, eliteBulletCancelRate: 0.21, cost: 600000 },
    { damageMultiplier: 3.45, fireInterval: 0.16, projectileSpeed: 650, coverageAngle: 80, trajectoryCount: 8, normalBulletCancelRate: 0.48, eliteBulletCancelRate: 0.24, cost: 900000 },
    { damageMultiplier: 4, fireInterval: 0.16, projectileSpeed: 655, coverageAngle: 90, trajectoryCount: 10, normalBulletCancelRate: 0.6, eliteBulletCancelRate: 0.3, cost: 1350000 },
    { damageMultiplier: 4.8, fireInterval: 0.14, projectileSpeed: 680, coverageAngle: 105, trajectoryCount: 12, normalBulletCancelRate: 0.72, eliteBulletCancelRate: 0.36, cost: 2000000 }
  ]);

  var ORBITAL_LEVEL_STATS = levelTable([
    { damageMultiplier: 1.8, fireInterval: 3.5, projectileCount: 1, pierceTargets: 4, projectileSpeed: 926, cost: 50000 },
    { damageMultiplier: 2.052, fireInterval: 3.3075, projectileCount: 1, pierceTargets: 4, projectileSpeed: 932, cost: 80000 },
    { damageMultiplier: 2.34, fireInterval: 3.115, projectileCount: 1, pierceTargets: 4, projectileSpeed: 938, cost: 120000 },
    { damageMultiplier: 2.664, fireInterval: 2.9225, projectileCount: 1, pierceTargets: 4, projectileSpeed: 944, cost: 180000 },
    { damageMultiplier: 3.024, fireInterval: 2.73, projectileCount: 1, pierceTargets: 4, projectileSpeed: 950, cost: 270000 },
    { damageMultiplier: 3.42, fireInterval: 2.5375, projectileCount: 1, pierceTargets: 4, projectileSpeed: 956, cost: 400000 },
    { damageMultiplier: 3.816, fireInterval: 2.345, projectileCount: 1, pierceTargets: 4, projectileSpeed: 962, cost: 600000 },
    { damageMultiplier: 4.23, fireInterval: 2.1525, projectileCount: 1, pierceTargets: 4, projectileSpeed: 968, cost: 900000 },
    { damageMultiplier: 4.68, fireInterval: 1.96, projectileCount: 1, pierceTargets: 4, projectileSpeed: 974, cost: 1350000 },
    { damageMultiplier: 5.6, fireInterval: 1.7, projectileCount: 2, pierceTargets: 6, projectileSpeed: 1000, cost: 2000000 }
  ]);

  var SWARM_LEVEL_STATS = levelTable([
    { damageMultiplier: 0.7, fireInterval: 5, projectileCount: 3, targetCount: 1, projectileSpeed: 472, turnRate: 6, accelerationDuration: 0.35, maxSpeedMultiplier: 1.3, cost: 50000 },
    { damageMultiplier: 0.784, fireInterval: 5, projectileCount: 4, targetCount: 2, projectileSpeed: 484, turnRate: 6, accelerationDuration: 0.35, maxSpeedMultiplier: 1.3, cost: 80000 },
    { damageMultiplier: 0.875, fireInterval: 5, projectileCount: 5, targetCount: 3, projectileSpeed: 496, turnRate: 6, accelerationDuration: 0.35, maxSpeedMultiplier: 1.3, cost: 120000 },
    { damageMultiplier: 0.98, fireInterval: 5, projectileCount: 6, targetCount: 4, projectileSpeed: 508, turnRate: 6, accelerationDuration: 0.35, maxSpeedMultiplier: 1.3, cost: 180000 },
    { damageMultiplier: 1.092, fireInterval: 5, projectileCount: 7, targetCount: 4, projectileSpeed: 520, turnRate: 6, accelerationDuration: 0.35, maxSpeedMultiplier: 1.3, cost: 270000 },
    { damageMultiplier: 1.218, fireInterval: 5, projectileCount: 8, targetCount: 5, projectileSpeed: 532, turnRate: 6, accelerationDuration: 0.35, maxSpeedMultiplier: 1.3, cost: 400000 },
    { damageMultiplier: 1.351, fireInterval: 5, projectileCount: 9, targetCount: 6, projectileSpeed: 544, turnRate: 6, accelerationDuration: 0.35, maxSpeedMultiplier: 1.3, cost: 600000 },
    { damageMultiplier: 1.498, fireInterval: 5, projectileCount: 10, targetCount: 7, projectileSpeed: 556, turnRate: 6, accelerationDuration: 0.35, maxSpeedMultiplier: 1.3, cost: 900000 },
    { damageMultiplier: 1.652, fireInterval: 5, projectileCount: 11, targetCount: 8, projectileSpeed: 568, turnRate: 6, accelerationDuration: 0.35, maxSpeedMultiplier: 1.3, cost: 1350000 },
    { damageMultiplier: 1.9, fireInterval: 4.2, projectileCount: 14, targetCount: 10, projectileSpeed: 600, turnRate: 7.5, accelerationDuration: 0.28, maxSpeedMultiplier: 1.5, cost: 2000000 }
  ]);

  var AUTO_WEAPONS = Object.freeze({
    weapon_module_04: Object.freeze({ id: "weapon_module_04", name: "侧翼火幕", category: "sidewing", description: "从战机上下侧翼分别发射独立弹幕；每侧均使用完整弹道数。", defaultLevel: 0, maxLevel: AUTO_SKILL_MAX_LEVEL, levelStats: SIDEWING_LEVEL_STATS, visualId: "auto-sidewing" }),
    weapon_module_05: Object.freeze({ id: "weapon_module_05", name: "轨道浮游炮", category: "orbital", description: "浮游炮独立发射翡翠白贯穿光矛，最多贯穿四个目标。", defaultLevel: 1, maxLevel: AUTO_SKILL_MAX_LEVEL, levelStats: ORBITAL_LEVEL_STATS, visualId: "auto-orbital" }),
    weapon_module_06: Object.freeze({ id: "weapon_module_06", name: "蜂群导弹舱", category: "missile", description: "分层发射翡翠紫追踪弹，无目标时向前巡航并可在途中重新锁定。", defaultLevel: 1, maxLevel: AUTO_SKILL_MAX_LEVEL, levelStats: SWARM_LEVEL_STATS, visualId: "auto-swarm" })
  });

  // ── 扩展自动技能（材料升级型，双材料消耗模型）──
  // 除固定凹槽（FIXED_AUTO_WEAPONS = 脉冲光束/星芒散射/猎杀追踪）外，
  // 所有自动技能均通过 蓝色自动武器模块 ×目标等级 + 金币 从 Lv1 升到 Lv10。
  // L7-10 额外需要 紫色自动武器核心 ×(目标等级 - 6)。
  // 内部分两组：扩展武器模块（EXTENDED_WEAPON_MODULES，原"自动武装"）
  //              + 战术技能（TACTICAL_SKILLS，原"被动技能"）。
  // 对外统一名称：「自动技能」。
  var EXTENDED_WEAPON_MODULES = Object.freeze({
    weapon_module_04: Object.freeze({ id: "weapon_module_04", name: "侧翼火幕", category: "sidewing", description: "从战机上下侧翼分别发射独立弹幕；每侧均使用完整弹道数。", defaultLevel: 0, maxLevel: AUTO_SKILL_MAX_LEVEL, levelStats: SIDEWING_LEVEL_STATS, visualId: "auto-sidewing" }),
    weapon_module_05: Object.freeze({ id: "weapon_module_05", name: "轨道浮游炮", category: "orbital", description: "浮游炮独立发射翡翠白贯穿光矛，最多贯穿四个目标。", defaultLevel: 1, maxLevel: AUTO_SKILL_MAX_LEVEL, levelStats: ORBITAL_LEVEL_STATS, visualId: "auto-orbital" }),
    weapon_module_06: Object.freeze({ id: "weapon_module_06", name: "蜂群导弹舱", category: "missile", description: "分层发射翡翠紫追踪弹，无目标时向前巡航并可在途中重新锁定。", defaultLevel: 1, maxLevel: AUTO_SKILL_MAX_LEVEL, levelStats: SWARM_LEVEL_STATS, visualId: "auto-swarm" })
  });

  // TACTICAL_SKILLS（战术技能 / 原“被动技能”）在本文件末尾、其等级参数表定义之后声明，
  // 否则 var 提升会让 levelStats 捕获到 undefined，导致 getAutoSkillLevelStats 回退到
  // gradeConfig 分支并对这四个技能返回 null —— 强化房只剩图标、战斗快照里槽位为空。

  var SKY_LOCK_LEVEL_STATS = levelTable([
    { damageBudget: 12.5, shotCount: 5, fireInterval: 10 }, { damageBudget: 14, shotCount: 5, fireInterval: 9.5 },
    { damageBudget: 15.5, shotCount: 6, fireInterval: 9 }, { damageBudget: 17, shotCount: 6, fireInterval: 8.5 },
    { damageBudget: 19, shotCount: 7, fireInterval: 8 }, { damageBudget: 21, shotCount: 7, fireInterval: 7.5 },
    { damageBudget: 23.5, shotCount: 8, fireInterval: 7 }, { damageBudget: 26, shotCount: 9, fireInterval: 6.5 },
    { damageBudget: 29, shotCount: 10, fireInterval: 6 },
    { damageBudget: 36, shotCount: 12, fireInterval: 5 }
  ]);
  var GRAVITY_LEVEL_STATS = levelTable([
    { damageBudget: 18.75, radius: 140, duration: 5, fireInterval: 15 }, { damageBudget: 21, radius: 150, duration: 5, fireInterval: 14.5 },
    { damageBudget: 23.5, radius: 160, duration: 5.25, fireInterval: 14 }, { damageBudget: 26, radius: 170, duration: 5.25, fireInterval: 13.5 },
    { damageBudget: 29, radius: 180, duration: 5.5, fireInterval: 13 }, { damageBudget: 32, radius: 190, duration: 5.5, fireInterval: 12.5 },
    { damageBudget: 35, radius: 200, duration: 5.75, fireInterval: 12 }, { damageBudget: 38.5, radius: 210, duration: 5.75, fireInterval: 11.5 },
    { damageBudget: 42, radius: 220, duration: 6, fireInterval: 11 },
    { damageBudget: 52, radius: 250, duration: 7, fireInterval: 10 }
  ]);
  var JUDGEMENT_LEVEL_STATS = levelTable([
    { damageMultiplier: 1.3, armorPierceBonus: 0.25, duration: 4, fireInterval: 13 }, { damageMultiplier: 1.34, armorPierceBonus: 0.275, duration: 4, fireInterval: 12.5 },
    { damageMultiplier: 1.38, armorPierceBonus: 0.3, duration: 4.25, fireInterval: 12 }, { damageMultiplier: 1.42, armorPierceBonus: 0.325, duration: 4.25, fireInterval: 11.5 },
    { damageMultiplier: 1.47, armorPierceBonus: 0.35, duration: 4.5, fireInterval: 11 }, { damageMultiplier: 1.52, armorPierceBonus: 0.375, duration: 4.5, fireInterval: 10.5 },
    { damageMultiplier: 1.57, armorPierceBonus: 0.4, duration: 5, fireInterval: 10 }, { damageMultiplier: 1.63, armorPierceBonus: 0.425, duration: 5, fireInterval: 9.5 },
    { damageMultiplier: 1.7, armorPierceBonus: 0.45, duration: 5.5, fireInterval: 9 },
    { damageMultiplier: 1.85, armorPierceBonus: 0.5, duration: 6, fireInterval: 8 }
  ]);
var PHASE_LEVEL_STATS = levelTable([
  { duration: 3, fireInterval: 18 }, { duration: 3.2, fireInterval: 17.5 }, { duration: 3.4, fireInterval: 17 },
  { duration: 3.6, fireInterval: 16.5 }, { duration: 3.8, fireInterval: 16 }, { duration: 4, fireInterval: 15.5 },
  { duration: 4.25, fireInterval: 15 }, { duration: 4.5, fireInterval: 14 }, { duration: 5, fireInterval: 13 },
  { duration: 6, fireInterval: 11 }
]);

// ── 战术技能（TACTICAL_SKILLS）等级参数占位表 ──
// 数值为设计占位，后续由策划按实际战斗节奏调优；
// 结构用于让战机强化右区「自动技能详情」显示具体参数。
var FRONT_SPREAD_LEVEL_STATS = levelTable([
  { damageMultiplier: 0.80, fireInterval: 0.20, projectileCount: 3, coverageAngle: 45, normalBulletCancelRate: 0.10, eliteBulletCancelRate: 0.10, projectileSpeed: 700, cost: 50000 },
  { damageMultiplier: 0.96, fireInterval: 0.19, projectileCount: 4, coverageAngle: 55, normalBulletCancelRate: 0.15, eliteBulletCancelRate: 0.15, projectileSpeed: 700, cost: 80000 },
  { damageMultiplier: 1.15, fireInterval: 0.18, projectileCount: 5, coverageAngle: 65, normalBulletCancelRate: 0.20, eliteBulletCancelRate: 0.20, projectileSpeed: 700, cost: 120000 },
  { damageMultiplier: 1.38, fireInterval: 0.17, projectileCount: 6, coverageAngle: 75, normalBulletCancelRate: 0.25, eliteBulletCancelRate: 0.25, projectileSpeed: 700, cost: 180000 },
  { damageMultiplier: 1.65, fireInterval: 0.16, projectileCount: 7, coverageAngle: 85, normalBulletCancelRate: 0.30, eliteBulletCancelRate: 0.30, projectileSpeed: 700, cost: 270000 },
  { damageMultiplier: 1.95, fireInterval: 0.15, projectileCount: 8, coverageAngle: 95, normalBulletCancelRate: 0.35, eliteBulletCancelRate: 0.35, projectileSpeed: 700, cost: 400000 },
  { damageMultiplier: 2.30, fireInterval: 0.14, projectileCount: 9, coverageAngle: 105, normalBulletCancelRate: 0.40, eliteBulletCancelRate: 0.40, projectileSpeed: 700, cost: 600000 },
  { damageMultiplier: 2.70, fireInterval: 0.13, projectileCount: 10, coverageAngle: 115, normalBulletCancelRate: 0.45, eliteBulletCancelRate: 0.45, projectileSpeed: 700, cost: 900000 },
  { damageMultiplier: 3.15, fireInterval: 0.12, projectileCount: 12, coverageAngle: 130, normalBulletCancelRate: 0.50, eliteBulletCancelRate: 0.50, projectileSpeed: 700, cost: 1350000 },
  { damageMultiplier: 3.80, fireInterval: 0.10, projectileCount: 15, coverageAngle: 150, normalBulletCancelRate: 0.60, eliteBulletCancelRate: 0.60, projectileSpeed: 700, cost: 2000000 }
]);
var RAILGUN_LEVEL_STATS = levelTable([
  { damageMultiplier: 2.00, fireInterval: 3.00, projectileCount: 1, pierceTargets: 5, cost: 50000 },
  { damageMultiplier: 2.28, fireInterval: 2.80, projectileCount: 1, pierceTargets: 5, cost: 80000 },
  { damageMultiplier: 2.60, fireInterval: 2.60, projectileCount: 1, pierceTargets: 5, cost: 120000 },
  { damageMultiplier: 2.96, fireInterval: 2.40, projectileCount: 1, pierceTargets: 6, cost: 180000 },
  { damageMultiplier: 3.36, fireInterval: 2.20, projectileCount: 1, pierceTargets: 6, cost: 270000 },
  { damageMultiplier: 3.80, fireInterval: 2.00, projectileCount: 1, pierceTargets: 7, cost: 400000 },
  { damageMultiplier: 4.28, fireInterval: 1.80, projectileCount: 2, pierceTargets: 7, cost: 600000 },
  { damageMultiplier: 4.80, fireInterval: 1.60, projectileCount: 2, pierceTargets: 8, cost: 900000 },
  { damageMultiplier: 5.36, fireInterval: 1.40, projectileCount: 2, pierceTargets: 8, cost: 1350000 },
  { damageMultiplier: 6.25, fireInterval: 1.10, projectileCount: 3, pierceTargets: 10, cost: 2000000 }
]);
var SHOCKWAVE_LEVEL_STATS = levelTable([
  { damageMultiplier: 1.50, radius: 120, duration: 1.50, fireInterval: 8.0, rings: 1, clearRate: 0.33, cost: 50000 },
  { damageMultiplier: 1.72, radius: 132, duration: 1.60, fireInterval: 7.6, rings: 1, clearRate: 0.33, cost: 80000 },
  { damageMultiplier: 1.96, radius: 144, duration: 1.70, fireInterval: 7.2, rings: 1, clearRate: 0.33, cost: 120000 },
  { damageMultiplier: 2.24, radius: 156, duration: 1.80, fireInterval: 6.8, rings: 1, clearRate: 0.33, cost: 180000 },
  { damageMultiplier: 2.56, radius: 170, duration: 1.90, fireInterval: 6.4, rings: 2, clearRate: 0.33, cost: 270000 },
  { damageMultiplier: 2.92, radius: 186, duration: 2.00, fireInterval: 6.0, rings: 2, clearRate: 0.33, cost: 400000 },
  { damageMultiplier: 3.32, radius: 204, duration: 2.15, fireInterval: 5.6, rings: 2, clearRate: 0.33, cost: 600000 },
  { damageMultiplier: 3.76, radius: 224, duration: 2.30, fireInterval: 5.2, rings: 2, clearRate: 0.33, cost: 900000 },
  { damageMultiplier: 4.24, radius: 246, duration: 2.50, fireInterval: 4.8, rings: 3, clearRate: 0.33, cost: 1350000 },
  { damageMultiplier: 5.10, radius: 280, duration: 2.80, fireInterval: 4.0, rings: 3, clearRate: 0.33, cost: 2000000 }
]);
var CHAIN_LIGHTNING_LEVEL_STATS = levelTable([
  { damageMultiplier: 0.60, fireInterval: 4.0, targetCount: 3, chainCount: 2, cost: 50000 },
  { damageMultiplier: 0.70, fireInterval: 3.8, targetCount: 3, chainCount: 2, cost: 80000 },
  { damageMultiplier: 0.82, fireInterval: 3.6, targetCount: 4, chainCount: 3, cost: 120000 },
  { damageMultiplier: 0.96, fireInterval: 3.4, targetCount: 4, chainCount: 3, cost: 180000 },
  { damageMultiplier: 1.12, fireInterval: 3.2, targetCount: 5, chainCount: 3, cost: 270000 },
  { damageMultiplier: 1.30, fireInterval: 3.0, targetCount: 5, chainCount: 4, cost: 400000 },
  { damageMultiplier: 1.50, fireInterval: 2.8, targetCount: 6, chainCount: 4, cost: 600000 },
  { damageMultiplier: 1.72, fireInterval: 2.6, targetCount: 6, chainCount: 5, cost: 900000 },
  { damageMultiplier: 1.96, fireInterval: 2.4, targetCount: 7, chainCount: 5, cost: 1350000 },
  { damageMultiplier: 2.35, fireInterval: 2.0, targetCount: 9, chainCount: 7, cost: 2000000 }
]);

  var TACTICAL_SKILLS = Object.freeze({
    "passive-front-spread": Object.freeze({ id: "passive-front-spread", name: "正面散射", category: "passive", description: "独立发射黄绿宽扇弹幕，并有概率抵消非 BOSS 敌弹。", defaultLevel: 0, maxLevel: AUTO_SKILL_MAX_LEVEL, levelStats: FRONT_SPREAD_LEVEL_STATS, visualId: "auto-front-spread" }),
    "passive-railgun": Object.freeze({ id: "passive-railgun", name: "轨道炮", category: "passive", description: "周期发射翡翠白重型贯穿弹，等级决定弹数与射击节奏。", defaultLevel: 0, maxLevel: AUTO_SKILL_MAX_LEVEL, levelStats: RAILGUN_LEVEL_STATS, visualId: "auto-railgun" }),
    "passive-shockwave": Object.freeze({ id: "passive-shockwave", name: "冲击波", category: "passive", description: "以战机为中心释放多层冲击环，伤害并清除范围内普通敌弹。", defaultLevel: 0, maxLevel: AUTO_SKILL_MAX_LEVEL, levelStats: SHOCKWAVE_LEVEL_STATS, visualId: "auto-shockwave" }),
    "passive-chain-lightning": Object.freeze({ id: "passive-chain-lightning", name: "自动连锁闪电", category: "passive", description: "周期释放低强度翡翠电弧，在多个目标间连续跳跃。", defaultLevel: 0, maxLevel: AUTO_SKILL_MAX_LEVEL, levelStats: CHAIN_LIGHTNING_LEVEL_STATS, visualId: "auto-chain-lightning" })
  });

var AUTO_PROTOCOL_SKILLS = Object.freeze({
    "sky-lock-beam": Object.freeze({ id: "sky-lock-beam", name: "锁敌贯星炮", category: "protocol", description: "锁定高威胁目标并连续发射贯穿光束。", defaultLevel: 0, maxLevel: AUTO_SKILL_MAX_LEVEL, levelStats: SKY_LOCK_LEVEL_STATS, sourceActiveSkillId: "sky-lock-beam", visualId: "auto-sky-lock" }),
    "obsidian-gravity-well": Object.freeze({ id: "obsidian-gravity-well", name: "暗域引力井", category: "protocol", description: "召唤暗域核心，持续吸附并灼烧范围内目标。", defaultLevel: 0, maxLevel: AUTO_SKILL_MAX_LEVEL, levelStats: GRAVITY_LEVEL_STATS, sourceActiveSkillId: "obsidian-gravity-well", visualId: "auto-gravity-well" }),
    "gold-judgement-buff": Object.freeze({ id: "gold-judgement-buff", name: "裁决强化", category: "protocol", description: "周期强化当前基础武器的伤害与破甲。", defaultLevel: 0, maxLevel: AUTO_SKILL_MAX_LEVEL, levelStats: JUDGEMENT_LEVEL_STATS, sourceActiveSkillId: "gold-judgement-buff", visualId: "auto-judgement" }),
    "phase-shield": Object.freeze({ id: "phase-shield", name: "相位护盾", category: "protocol", description: "生命不高于 50% 时自动展开相位防护层。", defaultLevel: 1, maxLevel: AUTO_SKILL_MAX_LEVEL, levelStats: PHASE_LEVEL_STATS, autoCondition: Object.freeze({ type: "hpRatioAtMost", value: 0.5 }), visualId: "auto-phase-shield" })
  });

  // 扩展武器模块升级消耗（双材料模型：蓝模块 L1-10 + 紫核心 L7-10）。
  var EXTENDED_WEAPON_MODULE_COSTS = Object.freeze({
    "weapon_module_04": Object.freeze({ itemId: "auto_weapon_module_purple", secondaryItemId: "auto_weapon_module_gold", baseGold: 5000, goldPerLevel: 6000 }),
    "weapon_module_05": Object.freeze({ itemId: "auto_weapon_module_purple", secondaryItemId: "auto_weapon_module_gold", baseGold: 6000, goldPerLevel: 7000 }),
    "weapon_module_06": Object.freeze({ itemId: "auto_weapon_module_purple", secondaryItemId: "auto_weapon_module_gold", baseGold: 5000, goldPerLevel: 6000 })
  });

  function mergeDefinitions() {
    var merged = Object.create(null);
    [EXTENDED_WEAPON_MODULES, TACTICAL_SKILLS, AUTO_PROTOCOL_SKILLS].forEach(function mergeGroup(group) {
      Object.keys(group).forEach(function add(id) { merged[id] = group[id]; });
    });
    return Object.freeze(merged);
  }
  var ALL_AUTO_SKILLS = mergeDefinitions();

  function normalizeRank(rank) { return String(rank || "").toUpperCase(); }
  function getAutoWeaponSlotCount(rank) {
    var r = normalizeRank(rank);
    if (!r) return AUTO_WEAPON_SLOT_COUNT;
    if (r === "B") return 0;
    if (r === "A") return 1;
    if (r === "S") return 2;
    return 3;
  }
  function getFixedWeaponOverrideCount(rank) {
    var r = normalizeRank(rank);
    if (r === "S") return 1;
    if (r === "SS") return 2;
    if (r === "SSS") return 3;
    return 0;
  }

  function createDefaultAutoWeaponLevels() {
    var levels = {};
    Object.keys(ALL_AUTO_SKILLS).forEach(function setDefault(id) { levels[id] = ALL_AUTO_SKILLS[id].defaultLevel || 0; });
    return levels;
  }
  function getDefaultAutoWeaponLevels() { return createDefaultAutoWeaponLevels(); }
  function normalizeAutoWeaponLevels(value) {
    var input = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    var levels = createDefaultAutoWeaponLevels();
    Object.keys(ALL_AUTO_SKILLS).forEach(function normalize(id) {
      var supplied = Math.floor(Number(input[id]));
      if (Number.isFinite(supplied)) levels[id] = Math.max(0, Math.min(AUTO_SKILL_MAX_LEVEL, supplied));
    });
    return levels;
  }

  function getAutoSkillLevelStats(skillId, level) {
    var id = String(skillId || "");
    var definition = ALL_AUTO_SKILLS[id];
    var normalizedLevel = Math.max(0, Math.min(AUTO_SKILL_MAX_LEVEL, Math.floor(Number(level) || 0)));
    if (!definition || !normalizedLevel) return null;
    if (Array.isArray(definition.levelStats)) return definition.levelStats[normalizedLevel] || null;
    var gradeConfig = scope.skillGradeConfig || {};
    return gradeConfig.getSkillGradeStats ? gradeConfig.getSkillGradeStats(id, normalizedLevel) : null;
  }
  function getAutoWeaponLevelStats(id, level) { return getAutoSkillLevelStats(id, level); }

  // ── 统一升级消耗：双材料模型（蓝模块 L1-10 + 紫核心 L7-10）──
  // 旧 AUTO_WEAPON_UNLOCK_PURPOSE / AUTO_WEAPON_PURPLE_BY_LEVEL / AUTO_WEAPON_GOLD_BY_CURRENT 已废弃，
  // 扩展武器模块（EXTENDED_WEAPON_MODULES）现与战术技能（TACTICAL_SKILLS）共用同一套双材料消耗公式。
  function getExtendedAutoSkillCost(skillId, currentLevel) {
    var extCost = EXTENDED_WEAPON_MODULE_COSTS[String(skillId || "")];
    if (extCost) {
      // 扩展武器模块：使用专属消耗表（与 getPassiveUpgradeCost 同公式，level 0 → 目标 1）
      var level = Math.max(0, Math.floor(Number(currentLevel) || 0));
      var targetLevel = level + 1;
      if (targetLevel > AUTO_SKILL_MAX_LEVEL) return null;
      var secondaryCount = targetLevel >= 7 ? targetLevel - 6 : 0;
      return {
        itemId: extCost.itemId,
        itemCount: targetLevel,
        secondaryItemId: extCost.secondaryItemId,
        secondaryItemCount: secondaryCount,
        gold: Math.max(0, Math.floor(extCost.baseGold + extCost.goldPerLevel * (targetLevel - 1))),
        targetLevel: targetLevel
      };
    }
    // 战术技能（TACTICAL_SKILLS / AUTO_PROTOCOL_SKILLS）：复用 skillGradeConfig
    var gradeConfig = scope.skillGradeConfig || {};
    return gradeConfig.getPassiveUpgradeCost ? gradeConfig.getPassiveUpgradeCost(skillId, currentLevel) : null;
  }

  function getAutoWeaponUpgrade(moduleId, currentLevel) {
    var definition = EXTENDED_WEAPON_MODULES[String(moduleId || "")];
    if (!definition) return { ok: false, code: "UNKNOWN_MODULE" };
    var level = Math.max(0, Math.min(definition.maxLevel, Math.floor(Number(currentLevel) || 0)));
    if (level >= definition.maxLevel) return { ok: false, code: "MAX_LEVEL", level: level };
    var targetLevel = level + 1;
    var stats = getAutoSkillLevelStats(definition.id, targetLevel);
    var cost = getExtendedAutoSkillCost(definition.id, level);
    return {
      ok: true, moduleId: definition.id, skillId: definition.id, level: level, targetLevel: targetLevel,
      itemId: cost && cost.itemId,
      itemCount: cost && cost.itemCount,
      secondaryItemId: cost && cost.secondaryItemId,
      secondaryItemCount: cost && cost.secondaryItemCount,
      coreCount: cost && cost.itemCount, goldCost: cost && cost.gold,
      cost: Math.max(0, Math.floor(Number(stats && stats.cost) || 0)), stats: stats
    };
  }
  function getAutoSkillUpgrade(skillId, currentLevel) {
    var id = String(skillId || "");
    if (EXTENDED_WEAPON_MODULES[id]) return getAutoWeaponUpgrade(id, currentLevel);
    var definition = ALL_AUTO_SKILLS[id];
    if (!definition) return { ok: false, code: "UNKNOWN_SKILL" };
    var level = Math.max(0, Math.min(AUTO_SKILL_MAX_LEVEL, Math.floor(Number(currentLevel) || 0)));
    if (level >= AUTO_SKILL_MAX_LEVEL) return { ok: false, code: "MAX_LEVEL", level: level };
    var targetLevel = level + 1;
    var cost = getExtendedAutoSkillCost(id, level);
    return { ok: Boolean(cost), code: cost ? "" : "NO_COST", skillId: id, level: level, targetLevel: targetLevel,
      itemId: cost && cost.itemId, itemCount: cost && cost.itemCount,
      secondaryItemId: cost && cost.secondaryItemId, secondaryItemCount: cost && cost.secondaryItemCount,
      goldCost: cost && cost.gold,
      stats: getAutoSkillLevelStats(id, targetLevel) };
  }

  var api = {
    ACTIVE_SLOT_COUNT: ACTIVE_SLOT_COUNT,
    AUTO_SKILL_MAX_LEVEL: AUTO_SKILL_MAX_LEVEL,
    FIXED_WEAPON_SLOT_COUNT: FIXED_WEAPON_SLOT_COUNT,
    AUTO_WEAPON_SLOT_COUNT: AUTO_WEAPON_SLOT_COUNT,
    AUTO_SKILL_SLOT_COUNT: AUTO_SKILL_SLOT_COUNT,
    LEGACY_ACTIVE_AUTO_IDS: LEGACY_ACTIVE_AUTO_IDS,
    LEGACY_WEAPON_MODULE_IDS: LEGACY_WEAPON_MODULE_IDS,
    FIXED_AUTO_WEAPONS: FIXED_AUTO_WEAPONS,
    EXTENDED_WEAPON_MODULES: EXTENDED_WEAPON_MODULES,   // 原 AUTO_WEAPONS（扩展武器模块）
    TACTICAL_SKILLS: TACTICAL_SKILLS,                 // 原 PASSIVE_SKILLS（战术技能）
    AUTO_WEAPONS: EXTENDED_WEAPON_MODULES,            // ← 旧名兼容
    PASSIVE_SKILLS: TACTICAL_SKILLS,                  // ← 旧名兼容
    EXTENDED_WEAPON_MODULE_COSTS: EXTENDED_WEAPON_MODULE_COSTS,
    AUTO_PROTOCOL_SKILLS: AUTO_PROTOCOL_SKILLS,
    ALL_AUTO_SKILLS: ALL_AUTO_SKILLS,
    SIDEWING_LEVEL_STATS: SIDEWING_LEVEL_STATS,
    ORBITAL_LEVEL_STATS: ORBITAL_LEVEL_STATS,
    SWARM_LEVEL_STATS: SWARM_LEVEL_STATS,
    SKY_LOCK_LEVEL_STATS: SKY_LOCK_LEVEL_STATS,
    GRAVITY_LEVEL_STATS: GRAVITY_LEVEL_STATS,
    JUDGEMENT_LEVEL_STATS: JUDGEMENT_LEVEL_STATS,
    PHASE_LEVEL_STATS: PHASE_LEVEL_STATS,
    createDefaultAutoWeaponLevels: createDefaultAutoWeaponLevels,
    normalizeAutoWeaponLevels: normalizeAutoWeaponLevels,
    getAutoWeaponLevelStats: getAutoWeaponLevelStats,
    getAutoSkillLevelStats: getAutoSkillLevelStats,
    getAutoWeaponUpgrade: getAutoWeaponUpgrade,
    getAutoSkillUpgrade: getAutoSkillUpgrade,
    getAutoWeaponSlotCount: getAutoWeaponSlotCount,
    getFixedWeaponOverrideCount: getFixedWeaponOverrideCount,
    getDefaultAutoWeaponLevels: getDefaultAutoWeaponLevels
  };

  scope.tacticalLoadoutConfig = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
