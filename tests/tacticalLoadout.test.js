"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

global.RXGame = {};
require("../src/h5/Data/Balance/balance.js");
require("../src/h5/World/Level/levels.js");
require("../src/h5/Gameplay/Ability/shipSkills.js");
require("../src/h5/Data/Config/skillGradeConfig.js");
const tacticalConfig = require("../src/h5/Gameplay/Fighter/tacticalLoadoutConfig.js");
require("../src/h5/Presentation/Assets/assets.js");
require("../src/h5/World/Level/stageHonorSystem.js");
const profileSystem = require("../src/h5/Gameplay/Player/profile.js");
const tacticalSystem = require("../src/h5/Gameplay/Fighter/tacticalLoadoutSystem.js");
const combatStats = require("../src/h5/Gameplay/Fighter/combatStats.js");

function makeOwnedProfile() {
  return profileSystem.normalizeProfile({
    saveVersion: 8,
    starterRosterVersion: 2,
    player: { level: 30 },
    resources: { gold: 5000000, inventory: {} },
    scene: { shipId: "ship-s-09" },
    owned: { ships: ["ship-a-06", "ship-s-09", "ship-ss-lingguang"] },
    migrationFlags: { weaponModulesV7Refunded: true, activeSkillGradesV8Migrated: true, autoSkillLevelsV8Migrated: true },
    activeSkillGrades: {
      "active-summon-wingman": "D", "active-decoy": "D",
      "active-chain-lightning": "D", "active-black-hole": "D"
    },
    autoWeaponLevels: { weapon_module_04: 1, weapon_module_05: 1, weapon_module_06: 1 }
  });
}

function emptyLoadout() {
  return {
    activeSlots: [null, null, null, null],
    fixedWeaponOverrides: [null, null, null],
    autoWeaponIds: [null, null, null]
  };
}

test("侧翼火幕保留前九级策划曲线并在十级获得明显强化", () => {
  const legacyStats = tacticalConfig.SIDEWING_LEVEL_STATS.slice(1, 10);
  const levelTen = tacticalConfig.SIDEWING_LEVEL_STATS[10];
  assert.deepEqual(legacyStats.map((item) => item.damageMultiplier * 100), [100, 120, 145, 175, 210, 250, 295, 345, 400]);
  assert.deepEqual(legacyStats.map((item) => item.trajectoryCount), [1, 2, 3, 4, 5, 6, 7, 8, 10]);
  assert.equal(legacyStats.reduce((sum, item) => sum + item.cost, 0), 3950000);
  assert.equal(levelTen.level, 10);
  assert.equal(levelTen.trajectoryCount, 12);
  assert.ok(levelTen.damageMultiplier > legacyStats.at(-1).damageMultiplier);
  assert.ok(levelTen.fireInterval < legacyStats.at(-1).fireInterval);
});

test("v6 模块退款只执行一次，旧主动技能迁入自动技能扩展槽", () => {
  const migrated = profileSystem.normalizeProfile({
    saveVersion: 6,
    starterRosterVersion: 2,
    resources: { gold: 1000 },
    scene: { shipId: "ship-s-09" },
    owned: { ships: ["ship-s-09"] },
    weaponModules: { ownedIds: ["spread-focus", "spread-focus", "laser-prism", "invalid"] }
  });
  assert.equal(migrated.saveVersion, 8);
  assert.equal(profileSystem.getGold(migrated), 101000);
  assert.equal(Object.hasOwn(migrated, "weaponModules"), false);
  assert.deepEqual(migrated.shipSkillLoadouts["ship-s-09"].activeSlots, [null, null, null, null]);
  assert.deepEqual(migrated.shipSkillLoadouts["ship-s-09"].autoWeaponIds, ["sky-lock-beam", null, null]);
  assert.equal(migrated.autoWeaponLevels["sky-lock-beam"], 1);
  const normalizedAgain = profileSystem.normalizeProfile(migrated);
  assert.equal(profileSystem.getGold(normalizedAgain), 101000);
});

test("主动技能全局养成、按战机独立配装，S 与 SS 战机读取同一全局品级", () => {
  const profile = makeOwnedProfile();
  const sLoadout = emptyLoadout();
  sLoadout.activeSlots[0] = { skillId: "active-summon-wingman", autoEnabled: false };
  tacticalSystem.save(profile, "ship-s-09", sLoadout);
  const ssLoadout = emptyLoadout();
  ssLoadout.activeSlots[0] = { skillId: "active-summon-wingman", autoEnabled: true };
  tacticalSystem.save(profile, "ship-ss-lingguang", ssLoadout);
  assert.equal(profile.shipSkillLoadouts["ship-s-09"].activeSlots[0].autoEnabled, false);
  assert.equal(profile.shipSkillLoadouts["ship-ss-lingguang"].activeSlots[0].autoEnabled, true);
  profile.activeSkillGrades["active-summon-wingman"] = "S";
  profile.scene.shipId = "ship-s-09";
  assert.equal(combatStats.generateBattleLoadout(profile).abilities.activeSlots[0].globalGrade, "S");
  profile.scene.shipId = "ship-ss-lingguang";
  assert.equal(combatStats.generateBattleLoadout(profile).abilities.activeSlots[0].globalGrade, "S");
  const activeSnapshot = combatStats.generateBattleLoadout(profile).abilities.activeSlots[0];
  assert.equal(activeSnapshot.initialCharges, 1);
  assert.equal(activeSnapshot.maxCharges, 3);
  assert.ok(activeSnapshot.rechargeSeconds > 0);
});

test("六槽配装校验长度、合法 ID、重复装备和品级槽位规则", () => {
  const profile = makeOwnedProfile();
  assert.throws(() => tacticalSystem.save(profile, "ship-s-09", { activeSlots: [], fixedWeaponOverrides: [], autoWeaponIds: [] }));
  const invalid = emptyLoadout();
  invalid.activeSlots[0] = { skillId: "not-a-real-skill" };
  assert.throws(() => tacticalSystem.save(profile, "ship-s-09", invalid));
  const duplicateActive = emptyLoadout();
  duplicateActive.activeSlots[0] = { skillId: "active-decoy" };
  duplicateActive.activeSlots[1] = { skillId: "active-decoy" };
  assert.throws(() => tacticalSystem.save(profile, "ship-s-09", duplicateActive));
  const duplicateAuto = emptyLoadout();
  duplicateAuto.fixedWeaponOverrides[0] = "weapon_module_05";
  duplicateAuto.autoWeaponIds[0] = "weapon_module_05";
  assert.throws(() => tacticalSystem.save(profile, "ship-s-09", duplicateAuto));
  const aOverride = emptyLoadout();
  aOverride.fixedWeaponOverrides[0] = "weapon_module_05";
  assert.throws(() => tacticalSystem.save(profile, "ship-a-06", aOverride));
});

test("黑洞仅允许 SS 及以上战机装配，旧的越级配装不会进入战斗快照", () => {
  const profile = makeOwnedProfile();
  const blackHoleLoadout = emptyLoadout();
  blackHoleLoadout.activeSlots[0] = { skillId: "active-black-hole", autoEnabled: false };
  assert.throws(
    () => tacticalSystem.save(profile, "ship-s-09", blackHoleLoadout),
    /黑洞.*SS/
  );
  assert.equal(tacticalSystem.canUseActiveSkill("S", "active-black-hole"), false);
  assert.equal(tacticalSystem.canUseActiveSkill("SS", "active-black-hole"), true);

  tacticalSystem.save(profile, "ship-ss-lingguang", blackHoleLoadout);
  profile.scene.shipId = "ship-ss-lingguang";
  assert.equal(combatStats.generateBattleLoadout(profile).abilities.activeSlots[0].id, "active-black-hole");

  profile.scene.shipId = "ship-s-09";
  profile.shipSkillLoadouts["ship-s-09"] = blackHoleLoadout;
  assert.equal(combatStats.generateBattleLoadout(profile).abilities.activeSlots[0], null);
});

test("三种扩展武器按自己的全局等级写入六槽战斗快照", () => {
  const profile = makeOwnedProfile();
  profile.autoWeaponLevels.weapon_module_04 = 3;
  profile.autoWeaponLevels.weapon_module_05 = 5;
  profile.autoWeaponLevels.weapon_module_06 = 9;
  const loadout = emptyLoadout();
  loadout.autoWeaponIds = ["weapon_module_04", "weapon_module_05", "weapon_module_06"];
  tacticalSystem.save(profile, "ship-ss-lingguang", loadout);
  profile.scene.shipId = "ship-ss-lingguang";
  const battle = combatStats.generateBattleLoadout(profile);
  assert.deepEqual(battle.autoSkills.slots.slice(3).map((slot) => [slot.id, slot.level]), [
    ["weapon_module_04", 3], ["weapon_module_05", 5], ["weapon_module_06", 9]
  ]);
  assert.equal(battle.autoSkills.slots[3].resolvedStats.trajectoryCount, 3);
  assert.equal(battle.autoSkills.slots[4].resolvedStats.fireInterval, 2.73);
  assert.equal(battle.autoSkills.slots[5].resolvedStats.projectileCount, 11);
});

test("相位护盾已迁入自动技能，一级为 3 秒、18 秒、半血触发", () => {
  assert.equal(global.RXGame.shipSkills.getActiveSkill("phase-shield"), null);
  const definition = tacticalConfig.ALL_AUTO_SKILLS["phase-shield"];
  const stats = tacticalConfig.getAutoSkillLevelStats("phase-shield", 1);
  assert.equal(stats.duration, 3);
  assert.equal(stats.fireInterval, 18);
  assert.deepEqual(definition.autoCondition, { type: "hpRatioAtMost", value: 0.5 });
});

test("战术技能(被动)等级参数表定义先于声明，levelStats 为数组且可全程解析", () => {
  const passiveIds = ["passive-front-spread", "passive-railgun", "passive-shockwave", "passive-chain-lightning"];
  for (const id of passiveIds) {
    const def = tacticalConfig.ALL_AUTO_SKILLS[id];
    assert.ok(def, "TACTICAL_SKILLS 应包含 " + id);
    // 关键回归防护：var 提升曾让 levelStats 捕获到 undefined，导致升级房只剩图标、
    // 战斗快照里对应槽位为 null（装备不在局内生效）。
    assert.ok(Array.isArray(def.levelStats), id + " 的 levelStats 必须是数组（防止 var 提升回退）");
    for (const lvl of [1, 3, 5, 9, 10]) {
      const stats = tacticalConfig.getAutoSkillLevelStats(id, lvl);
      assert.ok(stats && typeof stats === "object", id + " L" + lvl + " 必须解析出参数");
      assert.equal(stats.level, lvl);
    }
  }
});

test("所有局外自动技能均以十级为上限，十级参数可被战斗快照解析", () => {
  const definitions = tacticalConfig.ALL_AUTO_SKILLS;
  assert.equal(Object.keys(definitions).length, 11);
  for (const [id, definition] of Object.entries(definitions)) {
    assert.equal(definition.maxLevel, 10, id);
    const levelNine = tacticalConfig.getAutoSkillLevelStats(id, 9);
    const levelTen = tacticalConfig.getAutoSkillLevelStats(id, 10);
    assert.equal(levelTen.level, 10, id);
    assert.ok(levelTen.fireInterval <= levelNine.fireInterval, id + " 的十级射速不得退化");
  }
});
