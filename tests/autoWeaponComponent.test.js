"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

global.RXGame = {};
require("../src/h5/Data/Balance/balance.js");
require("../src/h5/World/Level/levels.js");
require("../src/h5/Data/Config/skillGradeConfig.js");
const tacticalConfig = require("../src/h5/Gameplay/Fighter/tacticalLoadoutConfig.js");
const tacticalSystem = require("../src/h5/Gameplay/Fighter/tacticalLoadoutSystem.js");
const profileSystem = require("../src/h5/Gameplay/Player/profile.js");

function baseProfile(inventory) {
  return profileSystem.normalizeProfile({
    saveVersion: 8,
    starterRosterVersion: 2,
    resources: { gold: 1000000, inventory: inventory || {} },
    migrationFlags: { weaponModulesV7Refunded: true, tacticalLoadoutV8Migrated: true },
    autoWeaponLevels: { weapon_module_04: 0 }
  });
}

test("扩展武器升级计划返回蓝模块 + 金币消耗（L0→L1 无紫核心）", () => {
  const plan = tacticalConfig.getAutoWeaponUpgrade("weapon_module_04", 0);
  assert.equal(plan.ok, true);
  assert.equal(plan.itemId, "auto_weapon_module_purple");
  assert.equal(plan.itemCount, 1);
  assert.equal(plan.secondaryItemCount, 0);
  assert.equal(plan.goldCost, 5000);
  assert.equal(plan.targetLevel, 1);
});

test("扩展武器 L6→L7 返回蓝模块 + 紫核心双材料消耗", () => {
  const plan = tacticalConfig.getAutoWeaponUpgrade("weapon_module_04", 6);
  assert.equal(plan.ok, true);
  assert.equal(plan.itemCount, 7);
  assert.equal(plan.secondaryItemId, "auto_weapon_module_gold");
  assert.equal(plan.secondaryItemCount, 1);
  assert.equal(plan.goldCost, 41000);
  assert.equal(plan.targetLevel, 7);
});

test("upgradeAutoWeapon 统一扣蓝模块（+紫核心L7+）并按 operationId 幂等", () => {
  // 进档默认解锁：扩展武器模块/战术技能在 normalizeProfile 后至少为 Lv1
  const fresh = baseProfile({ auto_weapon_module_purple: 6 });
  assert.equal(fresh.autoWeaponLevels.weapon_module_04, 1);
  // 显式回退到 Lv0 以验证升级管线本身（L0→L1：只需蓝模块，无需紫核心）
  const profile = fresh;
  profile.autoWeaponLevels.weapon_module_04 = 0;
  const first = tacticalSystem.upgradeAutoWeapon(profile, "weapon_module_04", "op-1");
  assert.equal(first.targetGrade, 1);
  assert.equal(first.blueCount, 1);
  assert.equal(first.purpleCount, 0);
  assert.equal(profile.resources.inventory.auto_weapon_module_purple, 5);
  assert.equal(profileSystem.getGold(profile), 1000000 - 5000);
  // 幂等：同一 operationId 不重复扣
  const duplicate = tacticalSystem.upgradeAutoWeapon(profile, "weapon_module_04", "op-1");
  assert.equal(duplicate.duplicate, true);
  assert.equal(profile.resources.inventory.auto_weapon_module_purple, 5);
});

test("蓝模块不足时拒绝升级", () => {
  const profile = baseProfile({ auto_weapon_module_purple: 0 });
  assert.throws(() => tacticalSystem.upgradeAutoWeaponWithComponents(profile, "weapon_module_04", "op-poor"), /不足/);
});

test("紫核心不足时拒绝 L7+ 升级", () => {
  // L6→L7 需要 7 蓝模块 + 1 紫核心
  const profile = baseProfile({ auto_weapon_module_purple: 10, auto_weapon_module_gold: 0 });
  profile.autoWeaponLevels.weapon_module_04 = 6;
  assert.throws(() => tacticalSystem.upgradeAutoWeapon(profile, "weapon_module_04", "op-poor7"), /自动武器核心不足/);
});

test("默认解锁：扩展武器模块与战术技能进档即为 Lv1（含旧档迁移）", () => {
  // 空 autoWeaponLevels 模拟旧档/新档，normalizeProfile 后应全部强制 ≥1
  const profile = profileSystem.normalizeProfile({
    saveVersion: 8,
    starterRosterVersion: 2,
    resources: { gold: 1000000, inventory: {} },
    migrationFlags: { weaponModulesV7Refunded: true, tacticalLoadoutV8Migrated: true },
    autoWeaponLevels: {}
  });
  const unlocked = [
    "weapon_module_04", "weapon_module_05", "weapon_module_06",
    "passive-front-spread", "passive-railgun", "passive-shockwave", "passive-chain-lightning"
  ];
  unlocked.forEach(function assertUnlocked(id) {
    assert.ok(profile.autoWeaponLevels[id] >= 1, id + " 应默认解锁 Lv1，实际=" + profile.autoWeaponLevels[id]);
  });
});

test("十级升级同时消耗十个蓝模块、四个紫核心并写回战斗等级源", () => {
  const profile = baseProfile({
    auto_weapon_module_purple: 10,
    auto_weapon_module_gold: 4
  });
  profile.autoWeaponLevels.weapon_module_04 = 9;

  const result = tacticalSystem.upgradeAutoWeapon(profile, "weapon_module_04", "op-level-10");

  assert.equal(result.targetGrade, 10);
  assert.equal(result.blueCount, 10);
  assert.equal(result.purpleCount, 4);
  assert.equal(profile.autoWeaponLevels.weapon_module_04, 10);
  assert.equal(profile.resources.inventory.auto_weapon_module_purple, 0);
  assert.equal(profile.resources.inventory.auto_weapon_module_gold, 0);
  assert.equal(tacticalConfig.getAutoSkillLevelStats("weapon_module_04", profile.autoWeaponLevels.weapon_module_04).level, 10);
});
