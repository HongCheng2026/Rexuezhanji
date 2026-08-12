"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

global.RXGame = {};
require("../src/h5/Data/Balance/balance.js");
require("../src/h5/World/Level/levels.js");
require("../src/h5/Presentation/Assets/assets.js");
require("../src/h5/Gameplay/Collection/codexBalance.js");
require("../src/h5/Gameplay/Collection/codexConfig.js");
require("../src/h5/Gameplay/Collection/codexSystem.js");
const profileSystem = require("../src/h5/Gameplay/Player/profile.js");
const combatStats = require("../src/h5/Gameplay/Fighter/combatStats.js");

test("旧图鉴数组迁移为图鉴模块自有状态", () => {
  const profile = profileSystem.normalizeProfile({
    starterRosterVersion: 2,
    owned: { pilots: ["pilot-s-lingyan"], ships: ["ship-s-09"] },
    codexBonds: ["unit:pilot-s-lingyan", "bond_fire_duo"]
  });
  assert.deepEqual(profile.codex, {
    activatedUnits: ["pilot-s-lingyan"],
    activatedBonds: ["bond_fire_duo"]
  });
  assert.equal(Object.hasOwn(profile, "codexBonds"), false);
});

test("战斗快照冻结图鉴激活清单、总加成和最终属性", () => {
  const profile = profileSystem.normalizeProfile({
    starterRosterVersion: 2,
    owned: { pilots: ["pilot-s-lingyan"], ships: ["ship-s-09"] },
    scene: { pilotId: "pilot-s-lingyan", shipId: "ship-s-09" },
    codex: {
      activatedUnits: ["pilot-s-lingyan", "ship-s-09"],
      activatedBonds: ["bond_fire_duo"]
    }
  });
  const loadout = combatStats.generateBattleLoadout(profile);

  assert.deepEqual(loadout.codexActivation.activatedUnits, ["pilot-s-lingyan", "ship-s-09"]);
  assert.deepEqual(loadout.codexActivation.activatedBonds, ["bond_fire_duo"]);
  assert.deepEqual(loadout.codexActivation.bonus, {
    attackFlat: 7,
    armorPenetrationFlat: 0,
    coinBonusMultiplier: 0
  });
  assert.equal(Object.isFrozen(loadout.codexActivation), true);
  assert.equal(Object.isFrozen(loadout.codexActivation.bonus), true);
  assert.equal(loadout.finalStats.coinBonus, 1);
});
