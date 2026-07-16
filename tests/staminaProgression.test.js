"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

delete global.RXGame;
const levels = require("../src/shared/levels.js");
require("../src/shared/assets.js");
const profileModule = require("../src/shared/profile.js");
const battleRules = require("../src/shared/battleRules.js");
const progressionSystem = require("../src/h5/meta/progressionSystem.js");

test("体力上限符合1级120、59级410、60级420", () => {
  assert.equal(levels.getMaxEnergyByLevel(1), 120);
  assert.equal(levels.getMaxEnergyByLevel(2), 125);
  assert.equal(levels.getMaxEnergyByLevel(59), 410);
  assert.equal(levels.getMaxEnergyByLevel(60), 420);
  assert.equal(levels.getMaxEnergyByLevel(999), 420);
});

test("新玩家以120满体力开局", () => {
  const profile = profileModule.createProfile();
  assert.equal(profile.staminaRuleVersion, 2);
  assert.equal(profile.resources.energy, 120);
  assert.equal(profile.resources.maxEnergy, 120);
});

test("升级同时增加当前体力和体力上限", () => {
  const profile = profileModule.createProfile();
  profile.resources.energy = 70;
  const result = battleRules.applyProfileExperience(profile, levels.COMMANDER_EXP_TO_NEXT_LEVEL[1]);
  assert.equal(profile.player.level, 2);
  assert.equal(profile.resources.energy, 75);
  assert.equal(profile.resources.maxEnergy, 125);
  assert.equal(result.energyGained, 5);
});

test("一次连升多级时按总上限差补体力", () => {
  const profile = profileModule.createProfile();
  profile.resources.energy = 40;
  const result = battleRules.applyProfileExperience(profile, levels.COMMANDER_TOTAL_EXP_BY_LEVEL[3]);
  assert.equal(profile.player.level, 3);
  assert.equal(profile.resources.energy, 50);
  assert.equal(profile.resources.maxEnergy, 130);
  assert.equal(result.leveled, 2);
  assert.equal(result.energyGained, 10);
});

test("59升60额外补5并达到420上限", () => {
  const profile = profileModule.normalizeProfile({
    staminaRuleVersion: 2,
    player: { level: 59, totalExp: levels.COMMANDER_TOTAL_EXP_BY_LEVEL[59], exp: 0 },
    resources: { energy: 100, maxEnergy: 410 }
  });
  const result = battleRules.applyProfileExperience(profile, levels.COMMANDER_EXP_TO_NEXT_LEVEL[59]);
  assert.equal(profile.player.level, 60);
  assert.equal(profile.resources.energy, 110);
  assert.equal(profile.resources.maxEnergy, 420);
  assert.equal(result.energyGained, 10);
});

test("满级继续获得经验不会再增加体力", () => {
  const profile = profileModule.normalizeProfile({
    staminaRuleVersion: 2,
    player: { level: 60, totalExp: levels.COMMANDER_TOTAL_EXP_BY_LEVEL[60], exp: 0 },
    resources: { energy: 200, maxEnergy: 420 }
  });
  const result = battleRules.applyProfileExperience(profile, 10000);
  assert.equal(profile.player.level, 60);
  assert.equal(profile.resources.energy, 200);
  assert.equal(profile.resources.maxEnergy, 420);
  assert.equal(result.energyGained, 0);
});

test("旧存档体力只压到新上限，不重复回满", () => {
  const overCap = profileModule.normalizeProfile({
    saveVersion: 6,
    staminaRuleVersion: 1,
    player: { level: 1 },
    resources: { energy: 305, maxEnergy: 305 }
  });
  assert.equal(overCap.staminaRuleVersion, 2);
  assert.equal(overCap.resources.energy, 120);
  assert.equal(overCap.resources.maxEnergy, 120);
  overCap.resources.energy = 70;
  const normalizedAgain = profileModule.normalizeProfile(overCap);
  assert.equal(normalizedAgain.resources.energy, 70);
});

test("本地扫荡升级也会补体力", () => {
  const level = levels.levels[0];
  const profile = profileModule.normalizeProfile({
    staminaRuleVersion: 2,
    player: { level: 1, totalExp: levels.COMMANDER_EXP_TO_NEXT_LEVEL[1] - 1, exp: levels.COMMANDER_EXP_TO_NEXT_LEVEL[1] - 1 },
    resources: { energy: 120, maxEnergy: 120 },
    completed: [level.id],
    ratings: { [level.id]: 3 }
  });
  const result = progressionSystem.sweepLevel(profile, level);
  assert.equal(result.success, true);
  assert.equal(profile.player.level, 2);
  assert.equal(profile.resources.energy, 120);
  assert.equal(profile.resources.maxEnergy, 125);
  assert.equal(result.levelProgress.energyGained, 5);
});

test("新关卡进度记录可以正常扫荡", () => {
  const level = levels.levels[3];
  const profile = profileModule.normalizeProfile({
    resources: { energy: 20, maxEnergy: 120 },
    completed: [],
    progress: { clearedStageIds: ["1_1"] },
    ratings: { [level.id]: 3 }
  });
  const beforeGold = profile.resources.gold;
  const result = progressionSystem.sweepLevel(profile, level);
  assert.equal(result.success, true);
  assert.equal(profile.resources.energy, 15);
  assert.ok(profile.resources.gold > beforeGold);
});

test("本地扫荡体力不足时不扣资源也不发奖励", () => {
  const level = levels.levels[0];
  const profile = profileModule.normalizeProfile({
    resources: { energy: 4, maxEnergy: 120, gold: 321 },
    completed: [level.id],
    ratings: { [level.id]: 3 }
  });
  const result = progressionSystem.sweepLevel(profile, level);
  assert.deepEqual(result, { success: false, reason: "NO_ENERGY", maxCount: 0 });
  assert.equal(profile.resources.energy, 4);
  assert.equal(profile.resources.gold, 321);
});

test("只有三星、金冠和彩冠关卡可以扫荡", () => {
  const level = levels.levels[0];
  for (const tier of [1, 2]) {
    const profile = profileModule.normalizeProfile({
      resources: { energy: 20, maxEnergy: 120 },
      completed: [level.id],
      ratings: { [level.id]: tier }
    });
    assert.equal(progressionSystem.sweepLevel(profile, level).reason, "NOT_THREE_STAR");
  }
  for (const tier of [3, 4, 5]) {
    const profile = profileModule.normalizeProfile({
      resources: { energy: 20, maxEnergy: 120 },
      completed: [level.id],
      ratings: { [level.id]: tier }
    });
    assert.equal(progressionSystem.sweepLevel(profile, level).success, true);
  }
});

test("多次扫荡一次扣除总消耗并发放总奖励", () => {
  const level = levels.levels[0];
  const profile = profileModule.normalizeProfile({
    resources: { energy: 33, maxEnergy: 120, gold: 100 },
    completed: [level.id],
    ratings: { [level.id]: 3 }
  });
  const singleGold = progressionSystem.getSweepReward(level);
  const singleExperience = battleRules.getSweepExperience(singleGold, level.id);
  const result = progressionSystem.sweepLevel(profile, level, 3);
  assert.equal(result.success, true);
  assert.equal(result.count, 3);
  assert.equal(result.energySpent, 15);
  assert.equal(result.goldEarned, singleGold * 3);
  assert.equal(result.expEarned, singleExperience * 3);
  assert.equal(profile.resources.energy, 18);
  assert.equal(profile.resources.gold, 100 + singleGold * 3);
});

test("扫荡最大次数同时受当前体力和体力上限约束", () => {
  const level = levels.levels[0];
  const profile = profileModule.normalizeProfile({
    resources: { energy: 500, maxEnergy: 120, gold: 100 },
    completed: [level.id],
    ratings: { [level.id]: 3 }
  });
  profile.resources.energy = 500;
  profile.resources.maxEnergy = 120;
  assert.equal(battleRules.getSweepMaxCount(profile), 24);
  const before = { energy: profile.resources.energy, gold: profile.resources.gold };
  const result = progressionSystem.sweepLevel(profile, level, 25);
  assert.deepEqual(result, { success: false, reason: "NO_ENERGY", maxCount: 24 });
  assert.deepEqual({ energy: profile.resources.energy, gold: profile.resources.gold }, before);
});
