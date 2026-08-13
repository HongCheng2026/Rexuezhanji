(function registerSkillGradeConfig(root) {
  "use strict";

  var scope = root.RXGame || (root.RXGame = {});

  // 主动技能品级（7 级），升序：D < C < B < A < S < SS < SSS
  var ACTIVE_GRADES = Object.freeze(["D", "C", "B", "A", "S", "SS", "SSS"]);
  var ACTIVE_GRADE_ORDER = Object.freeze({ D: 0, C: 1, B: 2, A: 3, S: 4, SS: 5, SSS: 6 });

  // 被动（局外）技能升级消耗表。
  // 双材料模型：蓝色自动武器模块(auto_weapon_module_purple)为 L1-10 基础材料；
  //             紫色自动武器核心(auto_weapon_module_gold)为 L7-10 进阶附加材料。
  // 每级消耗：蓝模块 × targetLevel + (L7+ 时紫核心 × (targetLevel - 6)) + 金币。
  var PASSIVE_UPGRADE_COSTS = Object.freeze({
    "passive-front-spread": Object.freeze({ itemId: "auto_weapon_module_purple", secondaryItemId: "auto_weapon_module_gold", baseGold: 3000, goldPerLevel: 4000 }),
    "passive-railgun": Object.freeze({ itemId: "auto_weapon_module_purple", secondaryItemId: "auto_weapon_module_gold", baseGold: 5000, goldPerLevel: 6000 }),
    "passive-shockwave": Object.freeze({ itemId: "auto_weapon_module_purple", secondaryItemId: "auto_weapon_module_gold", baseGold: 4000, goldPerLevel: 5000 }),
    "passive-chain-lightning": Object.freeze({ itemId: "auto_weapon_module_purple", secondaryItemId: "auto_weapon_module_gold", baseGold: 4500, goldPerLevel: 5500 }),
    "sky-lock-beam": Object.freeze({ itemId: "auto_weapon_module_purple", secondaryItemId: "auto_weapon_module_gold", baseGold: 6000, goldPerLevel: 7000 }),
    "obsidian-gravity-well": Object.freeze({ itemId: "auto_weapon_module_purple", secondaryItemId: "auto_weapon_module_gold", baseGold: 7000, goldPerLevel: 8000 }),
    "gold-judgement-buff": Object.freeze({ itemId: "auto_weapon_module_purple", secondaryItemId: "auto_weapon_module_gold", baseGold: 5000, goldPerLevel: 6000 }),
    "phase-shield": Object.freeze({ itemId: "auto_weapon_module_purple", secondaryItemId: "auto_weapon_module_gold", baseGold: 6000, goldPerLevel: 7000 })
  });

  // 主动技能品级升级额外金币消耗（在档案令之外）。
  // 注意：本表仅用于「升级按钮下方」的展示参考（金币维度），
  // 主动技能品级升级实际只消耗对应品级的「主动技能模组」道具（商店以金币/钻石购入）。
  // 网关 upgradeActiveSkillGrade 当前只扣 1 个目标品级模组，不二次扣本表金币，避免与模组售价重复收费。
  var ACTIVE_GRADE_GOLD_COST = Object.freeze({ C: 2000, B: 5000, A: 12000, S: 25000, SS: 50000, SSS: 100000 });
  var PASSIVE_GRADES = Object.freeze([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

  // 战机品级 → 可装备「主动技能」最高品级。
  // F1：战机后续可升级品质，故这里预留 SSS（当前战机最高为 SS，SSS 战机出现后即可装备 SSS 主动）。
  var FIGHTER_TIER_TO_MAX_ACTIVE_GRADE = Object.freeze({
    B: "B",
    A: "A",
    S: "S",
    SS: "SS",
    SSS: "SSS"
  });

  // 各技能品级缩放表（数值来自 skill-grade-scaling-设计.md v1，均为待实测校准的建议值）。
  // active 按品级字母索引；passive 按 1-10 数值索引。
  var SKILL_GRADE_TABLES = Object.freeze({
    "active-summon-wingman": Object.freeze({
      type: "active",
      name: "召唤僚机",
      byGrade: Object.freeze({
        D: Object.freeze({ maxAllies: 1, maxCharges: 1, blockChance: 0.10, attackAngle: 30, attackRange: 620, attackMultiplier: 0.80, maxHits: 1 }),
        C: Object.freeze({ maxAllies: 1, maxCharges: 2, blockChance: 0.15, attackAngle: 45, attackRange: 680, attackMultiplier: 0.90, maxHits: 1 }),
        B: Object.freeze({ maxAllies: 2, maxCharges: 2, blockChance: 0.20, attackAngle: 60, attackRange: 740, attackMultiplier: 1.00, maxHits: 2 }),
        A: Object.freeze({ maxAllies: 2, maxCharges: 3, blockChance: 0.25, attackAngle: 75, attackRange: 800, attackMultiplier: 1.10, maxHits: 2 }),
        S: Object.freeze({ maxAllies: 3, maxCharges: 3, blockChance: 0.30, attackAngle: 90, attackRange: 860, attackMultiplier: 1.20, maxHits: 3 }),
        SS: Object.freeze({ maxAllies: 3, maxCharges: 4, blockChance: 0.35, attackAngle: 105, attackRange: 920, attackMultiplier: 1.30, maxHits: 3 }),
        SSS: Object.freeze({ maxAllies: 4, maxCharges: 4, blockChance: 0.40, attackAngle: 120, attackRange: 1000, attackMultiplier: 1.40, maxHits: 4 })
      })
    }),
    "active-decoy": Object.freeze({
      type: "active",
      name: "幻影装甲",
      byGrade: Object.freeze({
        D: Object.freeze({ shieldDuration: 1.0, maxCharges: 1 }),
        C: Object.freeze({ shieldDuration: 1.2, maxCharges: 1 }),
        B: Object.freeze({ shieldDuration: 1.4, maxCharges: 1 }),
        A: Object.freeze({ shieldDuration: 1.6, maxCharges: 1 }),
        S: Object.freeze({ shieldDuration: 1.8, maxCharges: 1 }),
        SS: Object.freeze({ shieldDuration: 2.0, maxCharges: 1 }),
        SSS: Object.freeze({ shieldDuration: 2.5, maxCharges: 2 })
      })
    }),
    "active-chain-lightning": Object.freeze({
      type: "active",
      name: "连锁闪电",
      byGrade: Object.freeze({
        D: Object.freeze({ jumps: 2, hitMultiplier: 0.40, cooldown: 20 }),
        C: Object.freeze({ jumps: 3, hitMultiplier: 0.50, cooldown: 18 }),
        B: Object.freeze({ jumps: 4, hitMultiplier: 0.60, cooldown: 16 }),
        A: Object.freeze({ jumps: 5, hitMultiplier: 0.70, cooldown: 14 }),
        S: Object.freeze({ jumps: 6, hitMultiplier: 0.85, cooldown: 12 }),
        SS: Object.freeze({ jumps: 7, hitMultiplier: 1.00, cooldown: 10 }),
        SSS: Object.freeze({ jumps: 8, hitMultiplier: 1.20, cooldown: 8 })
      })
    }),
    "active-black-hole": Object.freeze({
      type: "active",
      name: "黑洞",
      byGrade: Object.freeze({
        D: Object.freeze({ dpsMultiplier: 0.50, radiusRatio: 0.15, duration: 2.0 }),
        C: Object.freeze({ dpsMultiplier: 0.70, radiusRatio: 0.18, duration: 2.5 }),
        B: Object.freeze({ dpsMultiplier: 0.90, radiusRatio: 0.22, duration: 3.0 }),
        A: Object.freeze({ dpsMultiplier: 1.10, radiusRatio: 0.26, duration: 3.5 }),
        S: Object.freeze({ dpsMultiplier: 1.40, radiusRatio: 0.30, duration: 4.0 }),
        SS: Object.freeze({ dpsMultiplier: 1.70, radiusRatio: 0.34, duration: 4.5 }),
        SSS: Object.freeze({ dpsMultiplier: 2.00, radiusRatio: 0.38, duration: 5.0 })
      })
    }),
    "passive-front-spread": Object.freeze({
      type: "passive",
      name: "正面散射",
      byGrade: Object.freeze({
        1: Object.freeze({ damageMultiplier: 0.50, attackAngle: 30, bulletCancelRate: 0.10 }),
        2: Object.freeze({ damageMultiplier: 0.60, attackAngle: 40, bulletCancelRate: 0.15 }),
        3: Object.freeze({ damageMultiplier: 0.70, attackAngle: 50, bulletCancelRate: 0.20 }),
        4: Object.freeze({ damageMultiplier: 0.80, attackAngle: 60, bulletCancelRate: 0.25 }),
        5: Object.freeze({ damageMultiplier: 0.90, attackAngle: 70, bulletCancelRate: 0.30 }),
        6: Object.freeze({ damageMultiplier: 1.00, attackAngle: 80, bulletCancelRate: 0.35 }),
        7: Object.freeze({ damageMultiplier: 1.10, attackAngle: 90, bulletCancelRate: 0.40 }),
        8: Object.freeze({ damageMultiplier: 1.20, attackAngle: 100, bulletCancelRate: 0.45 }),
        9: Object.freeze({ damageMultiplier: 1.30, attackAngle: 110, bulletCancelRate: 0.50 }),
        10: Object.freeze({ damageMultiplier: 1.55, attackAngle: 130, bulletCancelRate: 0.60 })
      })
    }),
    "passive-railgun": Object.freeze({
      type: "passive",
      name: "轨道炮",
      byGrade: Object.freeze({
        1: Object.freeze({ shots: 1, shotMultiplier: 0.80, interval: 9.0 }),
        2: Object.freeze({ shots: 2, shotMultiplier: 0.95, interval: 8.5 }),
        3: Object.freeze({ shots: 3, shotMultiplier: 1.10, interval: 8.0 }),
        4: Object.freeze({ shots: 4, shotMultiplier: 1.25, interval: 7.5 }),
        5: Object.freeze({ shots: 5, shotMultiplier: 1.40, interval: 7.0 }),
        6: Object.freeze({ shots: 6, shotMultiplier: 1.55, interval: 6.5 }),
        7: Object.freeze({ shots: 7, shotMultiplier: 1.70, interval: 6.0 }),
        8: Object.freeze({ shots: 8, shotMultiplier: 1.85, interval: 5.5 }),
        9: Object.freeze({ shots: 9, shotMultiplier: 2.00, interval: 5.0 }),
        10: Object.freeze({ shots: 12, shotMultiplier: 2.50, interval: 4.0 })
      })
    }),
    "passive-shockwave": Object.freeze({
      type: "passive",
      name: "冲击波",
      byGrade: Object.freeze({
        1: Object.freeze({ rings: 1, ringMultiplier: 0.60, clearRate: 0.33 }),
        2: Object.freeze({ rings: 1, ringMultiplier: 0.70, clearRate: 0.33 }),
        3: Object.freeze({ rings: 1, ringMultiplier: 0.80, clearRate: 0.33 }),
        4: Object.freeze({ rings: 1, ringMultiplier: 0.90, clearRate: 0.33 }),
        5: Object.freeze({ rings: 2, ringMultiplier: 1.00, clearRate: 0.33 }),
        6: Object.freeze({ rings: 2, ringMultiplier: 1.10, clearRate: 0.33 }),
        7: Object.freeze({ rings: 2, ringMultiplier: 1.20, clearRate: 0.33 }),
        8: Object.freeze({ rings: 2, ringMultiplier: 1.30, clearRate: 0.33 }),
        9: Object.freeze({ rings: 3, ringMultiplier: 1.50, clearRate: 0.33 }),
        10: Object.freeze({ rings: 4, ringMultiplier: 1.90, clearRate: 0.40 })
      })
    }),
    "passive-chain-lightning": Object.freeze({
      type: "passive",
      name: "连锁闪电（被动）",
      byGrade: Object.freeze({
        1: Object.freeze({ jumps: 2, hitMultiplier: 0.30 }),
        2: Object.freeze({ jumps: 3, hitMultiplier: 0.40 }),
        3: Object.freeze({ jumps: 4, hitMultiplier: 0.50 }),
        4: Object.freeze({ jumps: 5, hitMultiplier: 0.60 }),
        5: Object.freeze({ jumps: 6, hitMultiplier: 0.70 }),
        6: Object.freeze({ jumps: 7, hitMultiplier: 0.80 }),
        7: Object.freeze({ jumps: 8, hitMultiplier: 0.90 }),
        8: Object.freeze({ jumps: 9, hitMultiplier: 1.00 }),
        9: Object.freeze({ jumps: 10, hitMultiplier: 1.10 }),
        10: Object.freeze({ jumps: 13, hitMultiplier: 1.40 })
      })
    })
  });

  function normalizeGrade(grade) {
    if (grade == null) return null;
    if (typeof grade === "string") return grade.toUpperCase();
    var n = Math.floor(Number(grade));
    return Number.isFinite(n) ? n : null;
  }

  function activeGradeIndex(grade) {
    var g = normalizeGrade(grade);
    if (g == null) return -1;
    return Object.prototype.hasOwnProperty.call(ACTIVE_GRADE_ORDER, g) ? ACTIVE_GRADE_ORDER[g] : -1;
  }

  function getMaxActiveGradeForTier(fighterTier) {
    var t = String(fighterTier || "").toUpperCase();
    return Object.prototype.hasOwnProperty.call(FIGHTER_TIER_TO_MAX_ACTIVE_GRADE, t)
      ? FIGHTER_TIER_TO_MAX_ACTIVE_GRADE[t]
      : null;
  }

  // 装备门禁：
  // - 主动：技能品级不得高于战机品级（战机可后续升级品质，故 SSS 战机可装 SSS 主动）。
  // - 被动（F2）：不限制战机品级，始终可装备。
  function canEquipSkill(opts) {
    if (!opts || !opts.type) return false;
    var type = String(opts.type).toLowerCase();
    if (type === "passive") return true;
    if (type !== "active") return false;
    var maxGrade = getMaxActiveGradeForTier(opts.fighterTier);
    if (!maxGrade) return false;
    var skillIndex = activeGradeIndex(opts.grade);
    var maxIndex = activeGradeIndex(maxGrade);
    if (skillIndex < 0 || maxIndex < 0) return false;
    return skillIndex <= maxIndex;
  }

  function getSkillGradeStats(skillId, grade) {
    var def = SKILL_GRADE_TABLES[String(skillId || "")];
    if (!def) return null;
    var g = normalizeGrade(grade);
    if (g == null) return null;
    var table = def.byGrade;
    if (table == null) return null;
    return table[g] || null;
  }

  function getSkillGradeTable(skillId) {
    var def = SKILL_GRADE_TABLES[String(skillId || "")];
    if (!def) return null;
    return { type: def.type, name: def.name, byGrade: def.byGrade };
  }

  function getPassiveUpgradeCost(skillId, currentLevel) {
    var costDef = PASSIVE_UPGRADE_COSTS[String(skillId || "")];
    if (!costDef) return null;
    var level = Math.max(0, Math.floor(Number(currentLevel) || 0));
    var targetLevel = level + 1;
    if (targetLevel > 10) return null;
    // 双材料：蓝模块每级都需要，紫核心仅 L7+ 需要
    var secondaryCount = targetLevel >= 7 ? targetLevel - 6 : 0;
    return {
      itemId: costDef.itemId,
      itemCount: targetLevel,
      secondaryItemId: costDef.secondaryItemId,
      secondaryItemCount: secondaryCount,
      gold: Math.max(0, Math.floor(costDef.baseGold + costDef.goldPerLevel * (targetLevel - 1))),
      targetLevel: targetLevel
    };
  }

  function getActiveGradeGoldCost(targetGrade) {
    return Number(ACTIVE_GRADE_GOLD_COST[String(targetGrade).toUpperCase()] || 0);
  }

  var api = {
    ACTIVE_GRADES: ACTIVE_GRADES,
    PASSIVE_GRADES: PASSIVE_GRADES,
    FIGHTER_TIER_TO_MAX_ACTIVE_GRADE: FIGHTER_TIER_TO_MAX_ACTIVE_GRADE,
    SKILL_GRADE_TABLES: SKILL_GRADE_TABLES,
    PASSIVE_UPGRADE_COSTS: PASSIVE_UPGRADE_COSTS,
    ACTIVE_GRADE_GOLD_COST: ACTIVE_GRADE_GOLD_COST,
    activeGradeIndex: activeGradeIndex,
    getMaxActiveGradeForTier: getMaxActiveGradeForTier,
    canEquipSkill: canEquipSkill,
    getSkillGradeStats: getSkillGradeStats,
    getSkillGradeTable: getSkillGradeTable,
    getPassiveUpgradeCost: getPassiveUpgradeCost,
    getActiveGradeGoldCost: getActiveGradeGoldCost
  };

  scope.skillGradeConfig = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
