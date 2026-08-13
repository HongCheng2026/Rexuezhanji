"use strict";

const test = require("node:test");
const assert = require("node:assert");

const cfg = require("../src/h5/Data/Config/skillGradeConfig.js");

test("主动品级为 7 级且升序", () => {
  assert.deepStrictEqual(cfg.ACTIVE_GRADES, ["D", "C", "B", "A", "S", "SS", "SSS"]);
  assert.strictEqual(cfg.ACTIVE_GRADES.length, 7);
});

test("被动品级为 1-10", () => {
  assert.deepStrictEqual(cfg.PASSIVE_GRADES, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});

test("战机→主动最高品级映射含 SSS 预留", () => {
  assert.strictEqual(cfg.getMaxActiveGradeForTier("B"), "B");
  assert.strictEqual(cfg.getMaxActiveGradeForTier("A"), "A");
  assert.strictEqual(cfg.getMaxActiveGradeForTier("S"), "S");
  assert.strictEqual(cfg.getMaxActiveGradeForTier("SS"), "SS");
  assert.strictEqual(cfg.getMaxActiveGradeForTier("SSS"), "SSS");
  assert.strictEqual(cfg.getMaxActiveGradeForTier("X"), null);
});

test("主动技能受战机品级限制（不可超品级装备）", () => {
  assert.strictEqual(cfg.canEquipSkill({ type: "active", grade: "B", fighterTier: "B" }), true);
  assert.strictEqual(cfg.canEquipSkill({ type: "active", grade: "S", fighterTier: "B" }), false);
  assert.strictEqual(cfg.canEquipSkill({ type: "active", grade: "S", fighterTier: "S" }), true);
  assert.strictEqual(cfg.canEquipSkill({ type: "active", grade: "SS", fighterTier: "S" }), false);
  assert.strictEqual(cfg.canEquipSkill({ type: "active", grade: "SS", fighterTier: "SS" }), true);
  assert.strictEqual(cfg.canEquipSkill({ type: "active", grade: "SSS", fighterTier: "SS" }), false);
  // F1：战机可升级品质，SSS 战机可装 SSS 主动
  assert.strictEqual(cfg.canEquipSkill({ type: "active", grade: "SSS", fighterTier: "SSS" }), true);
});

test("被动技能不限制战机品级（F2）", () => {
  assert.strictEqual(cfg.canEquipSkill({ type: "passive", grade: 9, fighterTier: "B" }), true);
  assert.strictEqual(cfg.canEquipSkill({ type: "passive", grade: 1, fighterTier: "SS" }), true);
  assert.strictEqual(cfg.canEquipSkill({ type: "passive", grade: 9, fighterTier: "SSS" }), true);
});

test("非法输入返回 false", () => {
  assert.strictEqual(cfg.canEquipSkill(null), false);
  assert.strictEqual(cfg.canEquipSkill({ type: "weird", grade: "S", fighterTier: "S" }), false);
  assert.strictEqual(cfg.canEquipSkill({ type: "active", grade: "Z", fighterTier: "S" }), false);
});

test("召唤僚机 各品级取值正确", () => {
  assert.deepStrictEqual(cfg.getSkillGradeStats("active-summon-wingman", "D"),
    { maxAllies: 1, maxCharges: 1, blockChance: 0.10, attackAngle: 30, attackRange: 620, attackMultiplier: 0.80, maxHits: 1 });
  assert.deepStrictEqual(cfg.getSkillGradeStats("active-summon-wingman", "SSS"),
    { maxAllies: 4, maxCharges: 4, blockChance: 0.40, attackAngle: 120, attackRange: 1000, attackMultiplier: 1.40, maxHits: 4 });
  // 插值档 C/A/SS
  assert.strictEqual(cfg.getSkillGradeStats("active-summon-wingman", "C").attackMultiplier, 0.90);
  assert.strictEqual(cfg.getSkillGradeStats("active-summon-wingman", "A").attackMultiplier, 1.10);
  assert.strictEqual(cfg.getSkillGradeStats("active-summon-wingman", "SS").attackMultiplier, 1.30);
  assert.strictEqual(cfg.getSkillGradeStats("active-summon-wingman", "SS").attackRange, 920);
});

test("替身木 SSS 充能为 2、其余 1", () => {
  assert.strictEqual(cfg.getSkillGradeStats("active-decoy", "D").maxCharges, 1);
  assert.strictEqual(cfg.getSkillGradeStats("active-decoy", "SS").maxCharges, 1);
  assert.strictEqual(cfg.getSkillGradeStats("active-decoy", "SSS").maxCharges, 2);
  assert.strictEqual(cfg.getSkillGradeStats("active-decoy", "SSS").shieldDuration, 2.5);
});

test("连锁闪电（主动）跳跃/倍率/冷却随品级提升", () => {
  var d = cfg.getSkillGradeStats("active-chain-lightning", "D");
  var sss = cfg.getSkillGradeStats("active-chain-lightning", "SSS");
  assert.strictEqual(d.jumps, 2);
  assert.strictEqual(sss.jumps, 8);
  assert.ok(sss.hitMultiplier > d.hitMultiplier);
  assert.ok(sss.cooldown < d.cooldown);
});

test("黑洞 倍率/半径/时长随品级提升", () => {
  var d = cfg.getSkillGradeStats("active-black-hole", "D");
  var sss = cfg.getSkillGradeStats("active-black-hole", "SSS");
  assert.ok(sss.dpsMultiplier > d.dpsMultiplier);
  assert.ok(sss.radiusRatio > d.radiusRatio);
  assert.ok(sss.duration > d.duration);
});

test("正面散射 抵消上限 50% 且随品级提升", () => {
  assert.strictEqual(cfg.getSkillGradeStats("passive-front-spread", 1).bulletCancelRate, 0.10);
  assert.strictEqual(cfg.getSkillGradeStats("passive-front-spread", 9).bulletCancelRate, 0.50);
  assert.strictEqual(cfg.getSkillGradeStats("passive-front-spread", 9).attackAngle, 110);
});

test("轨道炮 轮次=品级、满级间隔 5s、每低1级+0.5s", () => {
  assert.strictEqual(cfg.getSkillGradeStats("passive-railgun", 1).shots, 1);
  assert.strictEqual(cfg.getSkillGradeStats("passive-railgun", 9).shots, 9);
  assert.strictEqual(cfg.getSkillGradeStats("passive-railgun", 9).interval, 5.0);
  assert.strictEqual(cfg.getSkillGradeStats("passive-railgun", 1).interval, 9.0);
  assert.strictEqual(cfg.getSkillGradeStats("passive-railgun", 5).interval, 7.0);
});

test("冲击波 火圈数在 1/5/9 级跳变、清弹率恒 33%", () => {
  assert.strictEqual(cfg.getSkillGradeStats("passive-shockwave", 1).rings, 1);
  assert.strictEqual(cfg.getSkillGradeStats("passive-shockwave", 5).rings, 2);
  assert.strictEqual(cfg.getSkillGradeStats("passive-shockwave", 9).rings, 3);
  for (var g = 1; g <= 9; g++) {
    assert.strictEqual(cfg.getSkillGradeStats("passive-shockwave", g).clearRate, 0.33);
  }
});

test("连锁闪电（被动）跳跃=品级+1、倍率随品级提升", () => {
  assert.strictEqual(cfg.getSkillGradeStats("passive-chain-lightning", 1).jumps, 2);
  assert.strictEqual(cfg.getSkillGradeStats("passive-chain-lightning", 9).jumps, 10);
  assert.ok(cfg.getSkillGradeStats("passive-chain-lightning", 9).hitMultiplier >
    cfg.getSkillGradeStats("passive-chain-lightning", 1).hitMultiplier);
});

test("未知技能返回 null", () => {
  assert.strictEqual(cfg.getSkillGradeStats("nope", "S"), null);
  assert.strictEqual(cfg.getSkillGradeStats("active-decoy", "Z"), null);
});
