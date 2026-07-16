"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

global.RXGame = {};
require("../src/shared/balance.js");
require("../src/shared/levels.js");
const shipSkills = require("../src/shared/shipSkills.js");
const tacticalConfig = require("../src/shared/tacticalLoadoutConfig.js");
const assets = require("../src/shared/assets.js");
require("../src/shared/stageHonorSystem.js");
const profileSystem = require("../src/shared/profile.js");
const tacticalSystem = require("../src/h5/meta/tacticalLoadoutSystem.js");
const combatStats = require("../src/h5/meta/combatStats.js");

function makeOwnedProfile() {
  return profileSystem.normalizeProfile({
    saveVersion: 7,
    starterRosterVersion: 2,
    player: { level: 30 },
    resources: { gold: 5000000 },
    scene: { shipId: "ship-a-06" },
    owned: { ships: ["ship-a-06", "ship-s-09", "ship-s-08"] },
    migrationFlags: { weaponModulesV7Refunded: true },
    autoWeaponLevels: { weapon_module_04: 1, weapon_module_05: 1, weapon_module_06: 1 }
  });
}

test("侧翼火幕九级数值与购买至 MAX 费用使用需求记录", () => {
  const stats = tacticalConfig.SIDEWING_LEVEL_STATS.slice(1);
  assert.deepEqual(stats.map((item) => item.damageMultiplier * 100), [100, 120, 145, 175, 210, 250, 295, 345, 400]);
  assert.deepEqual(stats.map((item) => item.coverageAngle), [0, 12, 24, 36, 48, 60, 70, 80, 90]);
  assert.deepEqual(stats.map((item) => item.trajectoryCount), [1, 2, 3, 4, 5, 6, 7, 8, 10]);
  assert.equal(stats.reduce((sum, item) => sum + item.cost, 0), 3950000);
});

test("v6 旧模块只按去重后合法 ID 退款一次，并保留当前 S 战机原生技能", () => {
  const migrated = profileSystem.normalizeProfile({
    saveVersion: 6,
    starterRosterVersion: 2,
    resources: { gold: 1000 },
    scene: { shipId: "ship-s-09" },
    owned: { ships: ["ship-s-09"] },
    weaponModules: { ownedIds: ["spread-focus", "spread-focus", "laser-prism", "invalid"], equippedId: "spread-focus" }
  });
  assert.equal(migrated.saveVersion, 7);
  assert.equal(profileSystem.getGold(migrated), 101000);
  assert.equal(Object.hasOwn(migrated, "weaponModules"), false);
  assert.equal(migrated.migrationFlags.weaponModulesV7Refunded, true);
  assert.deepEqual(migrated.shipSkillLoadouts["ship-s-09"].activeSlots, [
    { skillId: "sky-lock-beam", autoEnabled: false }, null, null, null
  ]);
  assert.deepEqual(migrated.shipSkillLoadouts["ship-s-09"].autoWeaponIds, [null, null, null]);
  assert.deepEqual(migrated.autoWeaponLevels, { weapon_module_04: 0, weapon_module_05: 1, weapon_module_06: 1 });
  const normalizedAgain = profileSystem.normalizeProfile(migrated);
  assert.equal(profileSystem.getGold(normalizedAgain), 101000);
});

test("主动技能可跨品级战机配置，每台战机的配装相互独立", () => {
  const profile = makeOwnedProfile();
  tacticalSystem.save(profile, "ship-a-06", {
    activeSlots: [
      { skillId: "sky-lock-beam", autoEnabled: true },
      { skillId: "obsidian-gravity-well", autoEnabled: false },
      { skillId: "phase-shield", autoEnabled: true },
      null
    ],
    autoWeaponIds: ["weapon_module_04", "weapon_module_05", null]
  });
  tacticalSystem.save(profile, "ship-s-09", {
    activeSlots: [{ skillId: "phase-shield", autoEnabled: false }, null, null, null],
    autoWeaponIds: ["weapon_module_06", null, null]
  });
  assert.equal(profile.shipSkillLoadouts["ship-a-06"].activeSlots[0].skillId, "sky-lock-beam");
  assert.equal(profile.shipSkillLoadouts["ship-s-09"].activeSlots[0].skillId, "phase-shield");

  profile.scene.shipId = "ship-a-06";
  const loadout = combatStats.generateBattleLoadout(profile);
  assert.deepEqual(loadout.abilities.activeSlots.map((item) => item && item.id), ["sky-lock-beam", "obsidian-gravity-well", "phase-shield", null]);
  assert.equal(loadout.abilities.activeSlots[0].autoEnabled, true);
  assert.deepEqual(loadout.autoWeapons.fixed.map((item) => item.id), ["weapon_fixed_01", "weapon_fixed_02", "weapon_fixed_03"]);
  assert.deepEqual(loadout.autoWeapons.extensionSlots.map((item) => item && item.id), ["weapon_module_04", "weapon_module_05", null]);
  assert.equal(Object.hasOwn(loadout, "equippedWeaponModule"), false);
});

test("配装校验拒绝非法长度、未解锁技能、重复技能和重复武装", () => {
  const profile = makeOwnedProfile();
  assert.throws(() => tacticalSystem.save(profile, "ship-a-06", { activeSlots: [], autoWeaponIds: [null, null, null] }), /4 格/);
  assert.throws(() => tacticalSystem.save(profile, "ship-a-06", {
    activeSlots: [{ skillId: "gold-judgement-buff" }, null, null, null], autoWeaponIds: [null, null, null]
  }), /未解锁/);
  assert.throws(() => tacticalSystem.save(profile, "ship-a-06", {
    activeSlots: [{ skillId: "phase-shield" }, { skillId: "phase-shield" }, null, null], autoWeaponIds: [null, null, null]
  }), /重复/);
  assert.throws(() => tacticalSystem.save(profile, "ship-a-06", {
    activeSlots: [null, null, null, null], autoWeaponIds: ["weapon_module_05", "weapon_module_05", null]
  }), /重复/);
  assert.throws(() => tacticalSystem.save(profile, "ship-b-05", {
    activeSlots: [null, null, null, null], autoWeaponIds: [null, null, null]
  }), /尚未拥有/);
});

test("侧翼火幕从购买到 MAX 逐级扣费，重复 operationId 不二次扣费", () => {
  const profile = profileSystem.normalizeProfile({
    saveVersion: 7,
    starterRosterVersion: 2,
    resources: { gold: 4000000 },
    migrationFlags: { weaponModulesV7Refunded: true }
  });
  const first = tacticalSystem.upgradeAutoWeapon(profile, "weapon_module_04", "op-1");
  assert.equal(first.level, 1);
  assert.equal(first.cost, 50000);
  const afterFirst = profileSystem.getGold(profile);
  const duplicate = tacticalSystem.upgradeAutoWeapon(profile, "weapon_module_04", "op-1");
  assert.equal(duplicate.duplicate, true);
  assert.equal(profileSystem.getGold(profile), afterFirst);
  for (let level = 2; level <= 9; level += 1) tacticalSystem.upgradeAutoWeapon(profile, "weapon_module_04", "op-" + level);
  assert.equal(profile.autoWeaponLevels.weapon_module_04, 9);
  assert.equal(profileSystem.getGold(profile), 50000);
  assert.throws(() => tacticalSystem.upgradeAutoWeapon(profile, "weapon_module_04", "op-10"), /MAX/);
});

test("相位护盾配置为 3 秒、18 秒冷却和半血自动条件", () => {
  const shield = shipSkills.getActiveSkill("phase-shield");
  assert.equal(shield.duration, 3);
  assert.equal(shield.cooldown, 18);
  assert.deepEqual(shield.autoCondition, { type: "hpRatioAtMost", value: 0.5 });
});
