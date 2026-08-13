"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

delete global.RXGame;
require("../src/h5/Data/Balance/balance.js");
require("../src/h5/World/Level/levels.js");
const commanderLevel = require("../src/h5/Gameplay/Player/commanderLevel.js");
require("../src/h5/Presentation/Assets/assets.js");
const profileModule = require("../src/h5/Gameplay/Player/profile.js");
const battleRules = require("../src/h5/Gameplay/Enemy/battleRules.js");

test("体力溢出在档案规范化和自然恢复检查后仍会保留", () => {
  const normalized = profileModule.normalizeProfile({
    player: { level: 1 },
    resources: { energy: 250, maxEnergy: 120, lastEnergyAt: 1 }
  });
  assert.equal(normalized.resources.maxEnergy, commanderLevel.getMaxEnergyByLevel(1));
  assert.equal(normalized.resources.energy, 250);

  commanderLevel.recoverEnergy(normalized, Date.now() + commanderLevel.getEnergyRecoverMs() * 10);
  assert.equal(normalized.resources.energy, 250);
});

test("体力溢出可用于扫荡，升级结算不会把溢出部分截掉", () => {
  const profile = profileModule.createProfile();
  profile.resources.energy = 250;
  profile.resources.maxEnergy = commanderLevel.getMaxEnergyByLevel(profile.player.level);
  assert.equal(battleRules.getSweepMaxCount(profile), 50);

  battleRules.applyProfileExperience(profile, 0);
  assert.equal(profile.resources.energy, 250);
});
