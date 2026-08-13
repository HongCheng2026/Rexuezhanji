"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

global.RXGame = {};
const RXGame = global.RXGame;
RXGame.events = {
  SKILL_ACTIVATED: "skill:activated", ENEMY_HIT: "enemy:hit", ENEMY_DIED: "enemy:died",
  PLAYER_DAMAGED: "player:damaged", PLAYER_DIED: "player:died", ITEM_COLLECTED: "item:collected"
};
RXGame.bus = { emit() {} };
RXGame.weaponSystem = {
  getReferenceVolleyDamage() { return 100; },
  createBullet(x, y, angle, type, damage, speed, radius, color, opts) {
    return Object.assign({ x, y, angle, type, damage, speed, radius, color }, opts || {});
  }
};
require("../src/h5/Data/Config/skillGradeConfig.js");
require("../src/h5/Gameplay/Ability/shipSkills.js");
require("../src/h5/Gameplay/Ability/activeSkillSystem.js");
require("../src/h5/Gameplay/Ability/activeSummonWingman.js");
require("../src/h5/Gameplay/Combat/collisionSystem.js");

function makeState() {
  return {
    mode: "fight",
    elapsed: 0,
    field: { width: 1280, height: 720 },
    player: {
      x: 180, y: 360, hp: 500, maxHp: 500, radius: 18, invincible: 0,
      damageTaken: 0, damageTakenAmount: 0,
      abilities: { activeSlots: [{ id: "active-summon-wingman", cooldownTimer: 0, duration: 0, activeRemaining: 0, autoEnabled: false, castLocked: false, data: null }] }
    },
    enemies: [], bullets: [], enemyBullets: [], skillEffects: [], allies: [],
    coins: [], powerups: [], powerupsCollected: 0
  };
}

test("召唤僚机由 AI 独立巡航，无持续时间且只在被击落后消失", () => {
  const state = makeState();
  const skill = Object.assign({}, RXGame.shipSkills.getActiveSkill("active-summon-wingman"), { grade: "D" });
  const loadout = { finalStats: { maxHp: 500 }, abilities: { activeSlots: [skill] } };
  assert.equal(skill.duration, 0);
  assert.equal(RXGame.activeSkillSystem.tryCastActiveSlot(state, loadout, 0, "manual"), true);
  assert.equal(state.allies.length, 1);
  assert.equal(state.player.abilities.activeSlots[0].activeRemaining, 0);

  const ally = state.allies[0];
  const originalOffset = { x: ally.x - state.player.x, y: ally.y - state.player.y };
  state.player.x = 980;
  state.player.y = 80;
  for (let i = 0; i < 120; i += 1) {
    state.elapsed += 1 / 60;
    RXGame.activeSkillSystem.update(state, loadout, 1 / 60);
  }
  assert.equal(state.allies.length, 1, "没有倒计时清理");
  assert.notEqual(Math.round(ally.x - state.player.x), Math.round(originalOffset.x), "僚机不锁定主机水平偏移");
  assert.notEqual(Math.round(ally.y - state.player.y), Math.round(originalOffset.y), "僚机不锁定主机垂直偏移");

  state.enemyBullets.push({ x: ally.x, y: ally.y, radius: 8, damage: ally.maxHp + 1, dead: false });
  RXGame.collisionSystem.checkCollisions(state, null, loadout);
  assert.equal(state.allies.length, 0, "承受致命攻击后被击落");
  assert.equal(state.player.hp, 500);
  assert.equal(state.player.damageTaken, 0);
  assert.equal(state.player.damageTakenAmount, 0);
});

test("僚机只在前向有效射程内开火，并跳过身后的最近敌人", () => {
  const state = makeState();
  const skill = Object.assign({}, RXGame.shipSkills.getActiveSkill("active-summon-wingman"), { grade: "D" });
  const loadout = { finalStats: { maxHp: 500 }, abilities: { activeSlots: [skill] } };
  assert.equal(RXGame.activeSkillSystem.tryCastActiveSlot(state, loadout, 0, "manual"), true);
  const ally = state.allies[0];

  state.enemies = [
    { id: "behind", x: ally.x - 20, y: ally.y, hp: 100, radius: 12, canTakeDamage: true },
    { id: "ahead", x: ally.x + 300, y: ally.y, hp: 100, radius: 12, canTakeDamage: true }
  ];
  RXGame.activeSkillSystem.update(state, loadout, 0.3);
  assert.equal(state.bullets.length, 1, "身后更近的敌人不能阻塞前方索敌");
  assert.ok(Math.abs(state.bullets[0].angle) < 0.2, "子弹应射向前方目标");

  state.bullets.length = 0;
  ally.fireTimer = 0;
  state.enemies = [{ id: "far", x: ally.x + ally.attackRange + 100, y: ally.y, hp: 100, radius: 12, canTakeDamage: true }];
  RXGame.activeSkillSystem.update(state, loadout, 0.1);
  assert.equal(state.bullets.length, 0, "射程外目标不能触发开火");

  state.enemies[0].x = ally.x + Math.min(500, ally.attackRange - 20);
  state.enemies[0].y = ally.y;
  RXGame.activeSkillSystem.update(state, loadout, 0.1);
  assert.equal(state.bullets.length, 1, "目标进入有效射程后应立即触发开火");
});
