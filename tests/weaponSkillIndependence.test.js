"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

global.RXGame = {};
const RXGame = global.RXGame;
RXGame.events = {
  WEAPON_FIRED: "weapon:fired",
  WEAPON_UPGRADED: "weapon:upgraded",
  PLAYER_DAMAGED: "player:damaged",
  PLAYER_DIED: "player:died"
};
RXGame.bus = { emit() {} };
RXGame.battleGeometry = {
  createField() { return { width: 1280, height: 720, playerLeft: 150, noticeY: 60 }; },
  getField(state) { return state.field || this.createField(); }
};

require("../src/h5/Data/Balance/balance.js");
require("../src/h5/World/Level/levels.js");
require("../src/h5/Presentation/Assets/assets.js");
const tacticalConfig = require("../src/h5/Gameplay/Fighter/tacticalLoadoutConfig.js");
require("../src/h5/Gameplay/Ability/shipSkills.js");
const profileSystem = require("../src/h5/Gameplay/Player/profile.js");
require("../src/h5/Data/Config/skillGradeConfig.js");
require("../src/h5/Gameplay/Fighter/tacticalLoadoutSystem.js");
const combatStats = require("../src/h5/Gameplay/Fighter/combatStats.js");
const weaponSystem = require("../src/h5/Gameplay/Combat/weaponSystem.js");
require("../src/h5/Gameplay/Ability/passiveSkillSystem.js");
const extensionWeaponSystem = require("../src/h5/Gameplay/Combat/extensionWeaponSystem.js");
const abilitySystem = require("../src/h5/Gameplay/Ability/abilitySystem.js");
const battleState = require("../src/h5/Gameplay/Combat/battleState.js");

function makeProfile(frontSpreadLevel) {
  return profileSystem.normalizeProfile({
    saveVersion: 8,
    starterRosterVersion: 2,
    scene: { shipId: "ship-ss-lingguang" },
    owned: { ships: ["ship-ss-lingguang"] },
    migrationFlags: {
      weaponModulesV7Refunded: true,
      activeSkillGradesV8Migrated: true,
      autoSkillLevelsV8Migrated: true
    },
    autoWeaponLevels: { "passive-front-spread": frontSpreadLevel },
    shipSkillLoadouts: {
      "ship-ss-lingguang": {
        activeSlots: [null, null, null, null],
        fixedWeaponOverrides: [null, null, null],
        autoWeaponIds: ["passive-front-spread", null, null]
      }
    }
  });
}

function makeFight(loadout) {
  const field = RXGame.battleGeometry.createField();
  return {
    mode: "fight",
    field,
    elapsed: 0,
    player: battleState.createPlayer(loadout, field),
    bullets: [],
    enemyBullets: [],
    enemies: [],
    boss: null,
    skillEffects: [],
    particles: [],
    shockwaves: [],
    notices: [],
    coins: [],
    powerups: []
  };
}

function bulletSignature(bullets, skillId) {
  return bullets
    .filter((bullet) => bullet.extensionWeaponId === skillId)
    .map((bullet) => ({
      angle: bullet.angle,
      damage: bullet.damage,
      speed: bullet.speed,
      normalBulletCancelRate: bullet.normalBulletCancelRate,
      eliteBulletCancelRate: bullet.eliteBulletCancelRate
    }));
}

test("三个局内武器与全部局外技能都有各自独立的发射处理函数", () => {
  const fixedIds = ["spread", "laser", "missile"];
  const fixedHandlers = fixedIds.map((id) => weaponSystem.getFixedWeaponHandler(id));
  assert.ok(fixedHandlers.every((handler) => typeof handler === "function"));
  assert.equal(new Set(fixedHandlers).size, fixedIds.length);

  const metaIds = Object.keys(tacticalConfig.ALL_AUTO_SKILLS);
  const metaHandlers = metaIds.map((id) => extensionWeaponSystem.getFireHandler(id));
  assert.ok(metaHandlers.every((handler) => typeof handler === "function"));
  assert.equal(new Set(metaHandlers).size, metaIds.length);
});

test("正面散射开战快照不随局内散射拾取升级而改变", () => {
  const profile = makeProfile(3);
  const loadout = combatStats.generateBattleLoadout(profile);
  const state = makeFight(loadout);
  const runtime = state.player.weaponSkills.meta.find((entry) => entry.id === "passive-front-spread");
  assert.ok(runtime);
  assert.equal(runtime.level, 3);
  assert.equal(runtime.resolvedStats.projectileCount, 5);
  assert.equal(runtime.resolvedStats.coverageAngle, 65);
  assert.ok(Object.isFrozen(runtime.resolvedStats));

  extensionWeaponSystem.fireRuntime(state, runtime, loadout);
  const before = bulletSignature(state.bullets, runtime.id);
  const frozenStats = runtime.resolvedStats;

  state.bullets.length = 0;
  state.player.weapons.spread = 9;
  battleState.refreshFixedWeaponSkill(state.player, "spread");
  profile.autoWeaponLevels["passive-front-spread"] = 10;
  extensionWeaponSystem.fireRuntime(state, runtime, loadout);
  const after = bulletSignature(state.bullets, runtime.id);

  assert.equal(state.player.weaponSkills.fixed.find((entry) => entry && entry.weaponType === "spread").level, 9);
  assert.strictEqual(runtime.resolvedStats, frozenStats);
  assert.equal(runtime.level, 3);
  assert.deepEqual(after, before);
});

test("正面散射只给自己的弹体消弹率，不再修改局内基础武器", () => {
  const profile = makeProfile(9);
  const loadout = combatStats.generateBattleLoadout(profile);
  const state = makeFight(loadout);
  const modifiers = abilitySystem.getWeaponModifiers(state, loadout, "spread");
  assert.equal(modifiers.normalBulletCancelRate, 0);
  assert.equal(modifiers.eliteBulletCancelRate, 0);

  const baseBullets = [];
  weaponSystem.fireWeapon(state, loadout, baseBullets, "spread", 1, state.player.x, state.player.y);
  assert.ok(baseBullets.length > 0);
  assert.ok(baseBullets.every((bullet) => Number(bullet.normalBulletCancelRate) === 0));

  const runtime = state.player.weaponSkills.meta.find((entry) => entry.id === "passive-front-spread");
  state.bullets.length = 0;
  extensionWeaponSystem.fireRuntime(state, runtime, loadout);
  const metaBullets = state.bullets.filter((bullet) => bullet.extensionWeaponId === runtime.id);
  assert.ok(metaBullets.length > 0);
  assert.ok(metaBullets.every((bullet) => bullet.normalBulletCancelRate === 0.5));
});

test("拾取某一种局内武器时只刷新对应固定实例", () => {
  const profile = makeProfile(3);
  const loadout = combatStats.generateBattleLoadout(profile);
  const state = makeFight(loadout);
  const beforeFixed = state.player.weaponSkills.fixed.slice();
  const meta = state.player.weaponSkills.meta[0];

  state.player.weapons.laser = 7;
  battleState.refreshFixedWeaponSkill(state.player, "laser");

  assert.notStrictEqual(state.player.weaponSkills.fixed[0], beforeFixed[0]);
  assert.strictEqual(state.player.weaponSkills.fixed[1], beforeFixed[1]);
  assert.strictEqual(state.player.weaponSkills.fixed[2], beforeFixed[2]);
  assert.strictEqual(state.player.weaponSkills.meta[0], meta);
});
