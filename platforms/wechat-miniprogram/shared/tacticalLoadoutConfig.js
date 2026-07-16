(function registerTacticalLoadoutConfig(root) {
  "use strict";

  var scope = root.RXGame || (root.RXGame = {});

  var ACTIVE_SLOT_COUNT = 4;
  var AUTO_WEAPON_SLOT_COUNT = 3;
  var LEGACY_WEAPON_MODULE_IDS = Object.freeze([
    "spread-focus",
    "spread-storm",
    "laser-prism",
    "laser-capacitor",
    "missile-guidance",
    "missile-warhead"
  ]);

  var FIXED_AUTO_WEAPONS = Object.freeze([
    Object.freeze({ id: "weapon_fixed_01", weaponType: "laser", name: "脉冲光束" }),
    Object.freeze({ id: "weapon_fixed_02", weaponType: "spread", name: "星芒散射" }),
    Object.freeze({ id: "weapon_fixed_03", weaponType: "missile", name: "猎杀追踪" })
  ]);

  var SIDEWING_LEVEL_STATS = Object.freeze([
    null,
    Object.freeze({ level: 1, damageMultiplier: 1, coverageAngle: 0, trajectoryCount: 1, normalBulletCancelRate: 0.06, eliteBulletCancelRate: 0.03, cost: 50000 }),
    Object.freeze({ level: 2, damageMultiplier: 1.2, coverageAngle: 12, trajectoryCount: 2, normalBulletCancelRate: 0.12, eliteBulletCancelRate: 0.06, cost: 80000 }),
    Object.freeze({ level: 3, damageMultiplier: 1.45, coverageAngle: 24, trajectoryCount: 3, normalBulletCancelRate: 0.18, eliteBulletCancelRate: 0.09, cost: 120000 }),
    Object.freeze({ level: 4, damageMultiplier: 1.75, coverageAngle: 36, trajectoryCount: 4, normalBulletCancelRate: 0.24, eliteBulletCancelRate: 0.12, cost: 180000 }),
    Object.freeze({ level: 5, damageMultiplier: 2.1, coverageAngle: 48, trajectoryCount: 5, normalBulletCancelRate: 0.3, eliteBulletCancelRate: 0.15, cost: 270000 }),
    Object.freeze({ level: 6, damageMultiplier: 2.5, coverageAngle: 60, trajectoryCount: 6, normalBulletCancelRate: 0.36, eliteBulletCancelRate: 0.18, cost: 400000 }),
    Object.freeze({ level: 7, damageMultiplier: 2.95, coverageAngle: 70, trajectoryCount: 7, normalBulletCancelRate: 0.42, eliteBulletCancelRate: 0.21, cost: 600000 }),
    Object.freeze({ level: 8, damageMultiplier: 3.45, coverageAngle: 80, trajectoryCount: 8, normalBulletCancelRate: 0.48, eliteBulletCancelRate: 0.24, cost: 900000 }),
    Object.freeze({ level: 9, damageMultiplier: 4, coverageAngle: 90, trajectoryCount: 10, normalBulletCancelRate: 0.6, eliteBulletCancelRate: 0.3, cost: 1350000 })
  ]);

  var AUTO_WEAPONS = Object.freeze({
    weapon_module_04: Object.freeze({
      id: "weapon_module_04",
      name: "侧翼火幕",
      category: "sidewing",
      description: "侧翼张开多轨火幕，同步扩展覆盖角度与子弹拦截能力。",
      defaultLevel: 0,
      maxLevel: 9,
      levelStats: SIDEWING_LEVEL_STATS
    }),
    weapon_module_05: Object.freeze({
      id: "weapon_module_05",
      name: "轨道浮游炮",
      category: "orbital",
      description: "每 3.5 秒发射 180% 攻击的贯穿弹，最多贯穿 4 个目标。",
      defaultLevel: 1,
      maxLevel: 1,
      cooldown: 3.5,
      damageMultiplier: 1.8,
      pierceTargets: 4,
      requiresTarget: true
    }),
    weapon_module_06: Object.freeze({
      id: "weapon_module_06",
      name: "蜂群导弹舱",
      category: "missile",
      description: "每 5 秒发射 3 枚追踪弹，每枚造成 70% 攻击伤害。",
      defaultLevel: 1,
      maxLevel: 1,
      cooldown: 5,
      projectileCount: 3,
      damageMultiplier: 0.7,
      requiresTarget: true
    })
  });

  function createDefaultAutoWeaponLevels() {
    var levels = {};
    Object.keys(AUTO_WEAPONS).forEach(function assignDefaultLevel(id) {
      levels[id] = AUTO_WEAPONS[id].defaultLevel;
    });
    return levels;
  }

  function normalizeAutoWeaponLevels(value) {
    var input = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    var levels = createDefaultAutoWeaponLevels();
    Object.keys(AUTO_WEAPONS).forEach(function normalizeLevel(id) {
      var definition = AUTO_WEAPONS[id];
      var supplied = Math.floor(Number(input[id]));
      if (Number.isFinite(supplied)) {
        levels[id] = Math.max(definition.defaultLevel, Math.min(definition.maxLevel, supplied));
      }
    });
    return levels;
  }

  function getAutoWeaponLevelStats(moduleId, level) {
    var definition = AUTO_WEAPONS[String(moduleId || "")];
    if (!definition) return null;
    var normalizedLevel = Math.max(0, Math.min(definition.maxLevel, Math.floor(Number(level) || 0)));
    if (Array.isArray(definition.levelStats)) return definition.levelStats[normalizedLevel] || null;
    if (!normalizedLevel) return null;
    return definition;
  }

  function getAutoWeaponUpgrade(moduleId, currentLevel) {
    var definition = AUTO_WEAPONS[String(moduleId || "")];
    if (!definition) return { ok: false, code: "UNKNOWN_MODULE" };
    var level = Math.max(0, Math.min(definition.maxLevel, Math.floor(Number(currentLevel) || 0)));
    if (level >= definition.maxLevel) return { ok: false, code: "MAX_LEVEL", level: level };
    var targetLevel = level + 1;
    var stats = getAutoWeaponLevelStats(definition.id, targetLevel);
    return {
      ok: true,
      moduleId: definition.id,
      level: level,
      targetLevel: targetLevel,
      cost: Math.max(0, Math.floor(Number(stats && stats.cost) || 0)),
      stats: stats
    };
  }

  var api = {
    ACTIVE_SLOT_COUNT: ACTIVE_SLOT_COUNT,
    AUTO_WEAPON_SLOT_COUNT: AUTO_WEAPON_SLOT_COUNT,
    LEGACY_WEAPON_MODULE_IDS: LEGACY_WEAPON_MODULE_IDS,
    FIXED_AUTO_WEAPONS: FIXED_AUTO_WEAPONS,
    AUTO_WEAPONS: AUTO_WEAPONS,
    SIDEWING_LEVEL_STATS: SIDEWING_LEVEL_STATS,
    createDefaultAutoWeaponLevels: createDefaultAutoWeaponLevels,
    normalizeAutoWeaponLevels: normalizeAutoWeaponLevels,
    getAutoWeaponLevelStats: getAutoWeaponLevelStats,
    getAutoWeaponUpgrade: getAutoWeaponUpgrade
  };

  scope.tacticalLoadoutConfig = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
