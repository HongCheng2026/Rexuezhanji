"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

global.RXGame = {};
const RXGame = global.RXGame;
RXGame.events = {
  WEAPON_FIRED: "weapon:fired", ENEMY_HIT: "enemy:hit", ENEMY_DIED: "enemy:died",
  SKILL_ACTIVATED: "skill:activated", PLAYER_DAMAGED: "player:damaged", PLAYER_DIED: "player:died",
  ITEM_COLLECTED: "item:collected"
};
RXGame.bus = { emit() {} };
RXGame.battleGeometry = { getField: () => ({ width: 800, height: 600, noticeY: 50 }) };
const emittedSpecs = [];
RXGame.weaponSystem = {
  getReferenceVolleyDamage() { return 100; },
  createBullet(x, y, angle, type, damage, speed, radius, color, opts) {
    return Object.assign({ x, y, angle, type, damage, speed, radius, color, owner: "player" }, opts || {});
  },
  emitSpreadVolley(_state, list, spec) {
    emittedSpecs.push(["spread", spec]);
    const count = Math.max(1, Number(spec.projectileCount) || 1);
    const bullets = Array.from({ length: count }, () => ({ type: "spread", damage: spec.damage, extensionWeaponId: spec.extensionWeaponId }));
    list.push(...bullets);
    return bullets;
  },
  emitLaserVolley(_state, list, spec) {
    emittedSpecs.push(["laser", spec]);
    const bullets = (spec.offsets || [0]).map(() => ({ type: "railgun", damage: spec.damage, extensionWeaponId: spec.extensionWeaponId }));
    list.push(...bullets);
    return bullets;
  }
};

require("../src/h5/Data/Balance/balance.js");
require("../src/h5/World/Level/levels.js");
require("../src/h5/Presentation/Assets/assets.js");
const tacticalConfig = require("../src/h5/Gameplay/Fighter/tacticalLoadoutConfig.js");
require("../src/h5/Gameplay/Ability/shipSkills.js");
const profileSystem = require("../src/h5/Gameplay/Player/profile.js");
const combatStats = require("../src/h5/Gameplay/Fighter/combatStats.js");
require("../src/h5/Data/Config/skillGradeConfig.js");
require("../src/h5/Gameplay/Fighter/tacticalLoadoutSystem.js");
require("../src/h5/Gameplay/Combat/collisionSystem.js");
require("../src/h5/Gameplay/Ability/passiveSkillSystem.js");

function makeState() {
  return {
    mode: "fight", player: { x: 100, y: 400, hp: 100, maxHp: 100, radius: 14, invincible: 0 },
    enemies: [], bullets: [], enemyBullets: [], skillEffects: [], coins: [], powerups: [],
    passiveRuntime: {}, elapsed: 0, powerupsCollected: 0
  };
}

function makeMetaRuntime(id, level = 1) {
  const raw = tacticalConfig.getAutoSkillLevelStats(id, level);
  const attack = 100;
  const stats = { ...raw };
  if (stats.damageMultiplier != null) stats.damagePerProjectile = attack * stats.damageMultiplier;
  if (id === "passive-shockwave") stats.damagePerRing = stats.damagePerProjectile;
  if (id === "passive-chain-lightning") stats.damagePerHit = stats.damagePerProjectile;
  return { id, level, resolvedStats: Object.freeze(stats) };
}

test("被动技能从 v8 自动技能等级与六槽配装解析进战斗快照", () => {
  const profile = profileSystem.normalizeProfile({
    saveVersion: 8,
    starterRosterVersion: 2,
    scene: { shipId: "ship-s-09" },
    owned: { ships: ["ship-s-09"] },
    migrationFlags: { weaponModulesV7Refunded: true, activeSkillGradesV8Migrated: true, autoSkillLevelsV8Migrated: true },
    autoWeaponLevels: { "passive-railgun": 5 },
    shipSkillLoadouts: {
      "ship-s-09": {
        activeSlots: [null, null, null, null],
        fixedWeaponOverrides: ["passive-railgun", null, null],
        autoWeaponIds: [null, null, null]
      }
    }
  });
  const loadout = combatStats.generateBattleLoadout(profile);
  assert.deepEqual(loadout.passiveSkills, [{ id: "passive-railgun", grade: "5" }]);
  assert.equal(loadout.autoSkills.slots[0].id, "passive-railgun");
  assert.equal(loadout.autoSkills.slots[0].level, 5);
  assert.deepEqual(loadout.disabledWeaponTypes, ["laser"]);
});

test("轨道炮只按自身快照参数发射", () => {
  const state = makeState();
  RXGame.passiveSkillSystem.fireRuntime(state, makeMetaRuntime("passive-railgun", 1), {});
  assert.ok(state.bullets.length > 0);
  assert.ok(state.bullets.every((bullet) => bullet.type === "railgun"));
});

test("冲击波造成范围伤害并留下表现事件", () => {
  const state = makeState();
  state.enemies = [{ id: "e1", x: 100, y: 400, hp: 1000, radius: 20, canTakeDamage: true, dead: false }];
  const before = state.enemies[0].hp;
  const random = Math.random;
  Math.random = () => 0;
  try {
    RXGame.passiveSkillSystem.fireRuntime(state, makeMetaRuntime("passive-shockwave", 1), {});
  } finally {
    Math.random = random;
  }
  assert.ok(state.enemies[0].hp < before);
  assert.ok(state.skillEffects.some((effect) => effect.type === "passive-shockwave"));
});

test("自动连锁闪电造成跳跃伤害并留下电弧", () => {
  const state = makeState();
  state.enemies = [{ id: "e1", x: 160, y: 400, hp: 1000, radius: 20, canTakeDamage: true, dead: false }];
  const before = state.enemies[0].hp;
  RXGame.passiveSkillSystem.fireRuntime(state, makeMetaRuntime("passive-chain-lightning", 1), {});
  assert.ok(state.enemies[0].hp < before);
  assert.ok(state.skillEffects.some((effect) => effect.type === "passive-chain"));
});

test("正面散射直接消费自己的快照弹数、角度、伤害与抵消率", () => {
  const state = makeState();
  emittedSpecs.length = 0;
  const runtime = makeMetaRuntime("passive-front-spread", 9);
  RXGame.passiveSkillSystem.fireRuntime(state, runtime, {});
  const spec = emittedSpecs.at(-1)[1];
  assert.equal(spec.projectileCount, 12);
  assert.equal(spec.coverageRadians, 130 * Math.PI / 180);
  assert.equal(spec.damage, 315);
  assert.equal(spec.normalBulletCancelRate, 0.5);
  assert.equal(spec.eliteBulletCancelRate, 0.5);
});

test("玩家消弹弹体只抵消普通敌弹，BOSS 弹保持豁免", () => {
  const state = makeState();
  state.bullets = [RXGame.weaponSystem.createBullet(150, 400, 0, "spread", 10, 600, 4, "#fff", {
    normalBulletCancelRate: 1, eliteBulletCancelRate: 1
  })];
  state.enemyBullets = [
    { x: 150, y: 400, radius: 5, sourceEnemyClass: "normal", dead: false },
    { x: 150, y: 400, radius: 5, sourceEnemyClass: "boss", dead: false }
  ];
  RXGame.collisionSystem.checkCollisions(state, null, null);
  assert.equal(state.bullets.length, 0);
  assert.equal(state.enemyBullets.length, 1);
});
