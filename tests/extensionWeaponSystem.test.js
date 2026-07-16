"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

global.RXGame = {};
require("../src/shared/balance.js");
require("../src/shared/levels.js");
require("../src/shared/shipSkills.js");
const tacticalConfig = require("../src/shared/tacticalLoadoutConfig.js");
require("../src/shared/assets.js");
require("../src/shared/battleRules.js");
require("../src/shared/stageHonorSystem.js");
const profileSystem = require("../src/shared/profile.js");
const combatStats = require("../src/h5/meta/combatStats.js");
const tacticalSystem = require("../src/h5/meta/tacticalLoadoutSystem.js");
const geometry = require("../src/h5/battle/battleGeometry.js");
require("../src/h5/battle/weaponSystem.js");
const battleState = require("../src/h5/battle/battleState.js");
const extensionWeapons = require("../src/h5/battle/extensionWeaponSystem.js");
const collisionSystem = require("../src/h5/battle/collisionSystem.js");

function createConfiguredBattle(level) {
  const profile = profileSystem.normalizeProfile({
    saveVersion: 7,
    starterRosterVersion: 2,
    player: { level: 30 },
    scene: { shipId: "ship-a-06" },
    owned: { ships: ["ship-a-06", "ship-s-09", "ship-s-08"] },
    resources: { gold: 10000000 },
    migrationFlags: { weaponModulesV7Refunded: true },
    autoWeaponLevels: {
      weapon_module_04: level,
      weapon_module_05: level,
      weapon_module_06: level
    }
  });
  tacticalSystem.save(profile, "ship-a-06", {
    activeSlots: [null, null, null, null],
    autoWeaponIds: ["weapon_module_04", "weapon_module_05", "weapon_module_06"]
  });
  const loadout = combatStats.generateBattleLoadout(profile);
  const player = battleState.createPlayer(loadout, geometry.createField());
  player.x = 100;
  player.y = 250;
  return {
    profile,
    loadout,
    state: {
      mode: "fight",
      elapsed: 0,
      field: geometry.createField(),
      player,
      bullets: [],
      enemies: [{ id: "target", x: 700, y: 250, hp: 10000, maxHp: 10000, radius: 22 }],
      boss: null
    }
  };
}

test("三个局外武器拥有完整且互不引用的 1—9 级静态表", () => {
  assert.equal(tacticalConfig.SIDEWING_LEVEL_STATS.length, 10);
  assert.equal(tacticalConfig.ORBITAL_LEVEL_STATS.length, 10);
  assert.equal(tacticalConfig.SWARM_LEVEL_STATS.length, 10);
  assert.equal(tacticalConfig.ORBITAL_LEVEL_STATS[9].damageMultiplier, 4.68);
  assert.equal(tacticalConfig.ORBITAL_LEVEL_STATS[9].fireInterval, 1.96);
  assert.equal(tacticalConfig.SWARM_LEVEL_STATS[9].projectileCount, 11);
  assert.equal(tacticalConfig.SWARM_LEVEL_STATS[9].targetCount, 8);
  assert.equal(tacticalConfig.AUTO_WEAPONS.weapon_module_05.maxLevel, 9);
  assert.equal(tacticalConfig.AUTO_WEAPONS.weapon_module_06.maxLevel, 9);
});

test("局外三级快照不随局内武器升到九级而变化", () => {
  const battle = createConfiguredBattle(3);
  const before = JSON.stringify(battle.state.player.weaponSkills.extensions);
  battle.state.player.weapons.spread = 9;
  battle.state.player.weapons.laser = 9;
  battle.state.player.weapons.missile = 9;
  battleState.refreshFixedWeaponSkill(battle.state.player, "spread");
  battleState.refreshFixedWeaponSkill(battle.state.player, "laser");
  battleState.refreshFixedWeaponSkill(battle.state.player, "missile");
  assert.equal(JSON.stringify(battle.state.player.weaponSkills.extensions), before);
  assert.deepEqual(battle.state.player.weaponSkills.fixed.map((entry) => entry.level), [9, 9, 9]);
  assert.equal(battle.loadout.autoWeapons.extensionSlots[0].resolvedStats.damagePerProjectile,
    Math.round(battle.loadout.finalStats.attack * 1.45));
});

test("三个局外武器按自己的时间轴释放且无目标时保持就绪", () => {
  const battle = createConfiguredBattle(3);
  const { state } = battle;
  extensionWeapons.update(state);
  assert.equal(state.bullets.filter((bullet) => bullet.extensionWeaponId === "weapon_module_04").length, 3);
  assert.equal(state.bullets.filter((bullet) => bullet.extensionWeaponId === "weapon_module_05").length, 1);
  assert.equal(state.bullets.filter((bullet) => bullet.extensionWeaponId === "weapon_module_06").length, 5);
  const orbitalReadyAt = state.player.weaponSkills.extensions[1].nextFireAt;
  assert.equal(orbitalReadyAt, tacticalConfig.ORBITAL_LEVEL_STATS[3].fireInterval);

  state.elapsed = 0.17;
  extensionWeapons.update(state);
  assert.equal(state.bullets.filter((bullet) => bullet.extensionWeaponId === "weapon_module_04").length, 6);
  assert.equal(state.bullets.filter((bullet) => bullet.extensionWeaponId === "weapon_module_05").length, 1);

  const noTarget = createConfiguredBattle(3).state;
  noTarget.enemies = [];
  noTarget.elapsed = 1;
  extensionWeapons.update(noTarget);
  assert.deepEqual(noTarget.player.weaponSkills.extensions.map((entry) => entry.nextFireAt), [0, 0, 0]);
  assert.ok(noTarget.player.weaponSkills.extensions.every((entry) => entry.waitingForTarget));
});

test("侧翼火幕按弹道使用完整单弹倍率，并分别处理普通与精英消弹率", () => {
  const battle = createConfiguredBattle(5);
  extensionWeapons.update(battle.state);
  const bullets = battle.state.bullets.filter((bullet) => bullet.extensionWeaponId === "weapon_module_04");
  assert.equal(bullets.length, 5);
  assert.ok(bullets.every((bullet) => bullet.damage === Math.round(battle.loadout.finalStats.attack * 2.1)));
  assert.equal(collisionSystem.getProjectileCancelRate(bullets[0], { sourceEnemyClass: "normal" }), 0.3);
  assert.equal(collisionSystem.getProjectileCancelRate(bullets[0], { sourceEnemyType: "elite", sourceEnemyClass: "heavy" }), 0.15);
  assert.equal(collisionSystem.getProjectileCancelRate(bullets[0], { sourceEnemyType: "boss", sourceEnemyClass: "boss" }), 0);
});

test("浮游炮和蜂群导弹从一级升至九级使用统一局外费用", () => {
  for (const id of ["weapon_module_05", "weapon_module_06"]) {
    const profile = profileSystem.normalizeProfile({
      saveVersion: 7,
      starterRosterVersion: 2,
      resources: { gold: 4000000 },
      migrationFlags: { weaponModulesV7Refunded: true }
    });
    for (let level = 2; level <= 9; level += 1) {
      tacticalSystem.upgradeAutoWeapon(profile, id, id + "-" + level);
    }
    assert.equal(profile.autoWeaponLevels[id], 9);
    assert.equal(profileSystem.getGold(profile), 100000);
  }
});
