"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

global.RXGame = {};
require("../src/h5/Data/Config/skillGradeConfig.js");
require("../src/h5/Gameplay/Ability/shipSkills.js");
require("../src/h5/Presentation/Assets/assets.js");
require("../src/h5/Gameplay/Fighter/tacticalLoadoutConfig.js");
const tacticalSystem = require("../src/h5/Gameplay/Fighter/tacticalLoadoutSystem.js");
const fighterUpgradeApi = require("../src/h5/Gameplay/Fighter/fighterUpgradeApi.js");

global.RXGame.assets.SHIP_ASSETS = global.RXGame.assets.SHIP_ASSETS.concat([
  { id: "ship-b-test", rank: "B" },
  { id: "ship-ss-test", rank: "SS" },
  { id: "ship-sss-test", rank: "SSS" }
]);

function makeProfile(shipId, rank, grade, inventory) {
  return {
    player: { level: 50 },
    resources: { gold: 0, inventory: inventory || {} },
    owned: { ships: [shipId] },
    scene: { shipId },
    shipRanks: { [shipId]: rank },
    activeSkillGrades: { "active-summon-wingman": grade || "D" },
    shipSkillLoadouts: {
      [shipId]: {
        activeSlots: [{ skillId: "active-summon-wingman", autoEnabled: false }, null, null, null],
        fixedWeaponOverrides: [null, null, null],
        autoWeaponIds: [null, null, null]
      }
    }
  };
}

test("主动技能升级按全局品级读取，而不是读取槽位内旧 grade", () => {
  const profile = makeProfile("ship-ss-test", "SS", "C", {});
  profile.shipSkillLoadouts["ship-ss-test"].activeSlots[0].grade = "SSS";
  const plan = fighterUpgradeApi.getActiveGradeUpgradePlan(profile, "ship-ss-test", 0, "C");
  assert.equal(plan.ok, false);
  assert.equal(plan.reason, "ALREADY_AT_OR_ABOVE");
});

test("主动技能只能逐级升级并受战机品级上限限制", () => {
  const sequence = fighterUpgradeApi.getActiveGradeUpgradePlan(
    makeProfile("ship-ss-test", "SS", "D", { active_skill_module_b: 1 }),
    "ship-ss-test", 0, "B"
  );
  assert.equal(sequence.reason, "GRADE_SEQUENCE_INVALID");

  const tierLimit = fighterUpgradeApi.getActiveGradeUpgradePlan(
    makeProfile("ship-b-test", "B", "B", { active_skill_module_a: 1 }),
    "ship-b-test", 0, "A"
  );
  assert.equal(tierLimit.reason, "SHIP_TIER_LIMIT");
});

test("主动技能升级计划明确返回缺少的目标品级模组", () => {
  const plan = fighterUpgradeApi.getActiveGradeUpgradePlan(makeProfile("ship-ss-test", "SS", "D", {}), "ship-ss-test", 0, "C");
  assert.equal(plan.ok, false);
  assert.equal(plan.reason, "TOKEN_NOT_OWNED");
  assert.equal(plan.tokenId, "active_skill_module_c");
});

test("升级计划更新全局品级，配装槽只保存 skillId 与自动开关", () => {
  const profile = makeProfile("ship-ss-test", "SS", "D", { active_skill_module_c: 1 });
  const plan = fighterUpgradeApi.getActiveGradeUpgradePlan(profile, "ship-ss-test", 0, "C");
  assert.equal(plan.ok, true);
  profile.resources.inventory[plan.tokenId] -= 1;
  profile.activeSkillGrades = plan.nextActiveSkillGrades;
  tacticalSystem.save(profile, "ship-ss-test", plan.nextLoadout);
  assert.equal(profile.activeSkillGrades["active-summon-wingman"], "C");
  assert.deepEqual(profile.shipSkillLoadouts["ship-ss-test"].activeSlots[0], {
    skillId: "active-summon-wingman",
    autoEnabled: false
  });
  assert.equal(profile.resources.inventory.active_skill_module_c, 0);
});

test("SSS 战机允许主动技能从 SS 升至 SSS", () => {
  const profile = makeProfile("ship-sss-test", "SSS", "SS", { active_skill_module_sss: 1 });
  const plan = fighterUpgradeApi.getActiveGradeUpgradePlan(profile, "ship-sss-test", 0, "SSS");
  assert.equal(plan.ok, true);
  assert.equal(plan.currentGrade, "SS");
  assert.equal(plan.targetGrade, "SSS");
});
