"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

function loadCollisionSystem() {
  global.RXGame = { levels: {}, fxSystem: { burst() {}, shockwave() {} } };
  const path = require.resolve("../src/h5/Gameplay/Combat/collisionSystem.js");
  delete require.cache[path];
  return require(path);
}

function stateWithEnemy(enemyHp) {
  return {
    elapsed: 0,
    player: {
      x: 100, y: 100, radius: 20, hp: 100, maxHp: 100, lives: 1,
      shield: 0, invincible: 0, weapons: {}, decoyShieldRemaining: 1
    },
    enemies: enemyHp ? [{ x: 100, y: 100, radius: 20, hp: enemyHp, maxHp: enemyHp, dead: false }] : [],
    boss: null, bullets: [], enemyBullets: [], coins: [], powerups: [], notices: [], particles: [],
    shockwaves: [], skillEffects: [], killStats: { small: 0, elite: 0, boss: 0, total: 0, baseGold: 0 },
    damageTaken: 0, damageTakenAmount: 0, powerupsCollected: 0
  };
}

test("幻影装甲吸收敌弹时不计玩家受击", () => {
  const collision = loadCollisionSystem();
  const state = stateWithEnemy(0);
  state.enemyBullets.push({ x: 100, y: 100, radius: 8, damage: 60, dead: false });
  collision.checkCollisions(state, null, null);
  assert.equal(state.player.hp, 100);
  assert.equal(state.damageTaken, 0);
  assert.equal(state.damageTakenAmount, 0);
  assert.ok(state.skillEffects.some((effect) => effect.visualId === "vfx-decoy-absorb"));
});

test("幻影装甲吸收机体碰撞时不计玩家受击", () => {
  const collision = loadCollisionSystem();
  const state = stateWithEnemy(80);
  collision.checkCollisions(state, null, null);
  assert.equal(state.player.hp, 100);
  assert.equal(state.damageTaken, 0);
  assert.equal(state.damageTakenAmount, 0);
  assert.ok(state.skillEffects.some((effect) => effect.visualId === "vfx-decoy-absorb"));
});
