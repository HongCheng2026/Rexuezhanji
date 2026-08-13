"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

function loadCollisionSystem() {
  global.RXGame = {
    events: { ENEMY_HIT: "enemy:hit", ENEMY_DIED: "enemy:died", PLAYER_DAMAGED: "player:damaged", PLAYER_DIED: "player:died" },
    bus: { emit() {} },
    levels: { POWERUPS: {} },
    battleGeometry: { getField() { return { width: 1280, height: 720, cullPadding: 160, noticeY: 50 }; } }
  };
  const file = require.resolve("../src/h5/Gameplay/Combat/collisionSystem.js");
  delete require.cache[file];
  return require(file);
}

function playerBullet(x, y, cancelRate = 0) {
  return {
    x, y, radius: 3, damage: 2, color: "#fff", type: "normal",
    hitIds: new Set(), normalBulletCancelRate: cancelRate,
    eliteBulletCancelRate: cancelRate
  };
}

test("高弹幕碰撞使用复用网格并保持弹体数组引用稳定", () => {
  const collision = loadCollisionSystem();
  const bullets = [playerBullet(200, 200, 1), playerBullet(900, 300)];
  for (let i = 0; i < 1198; i += 1) bullets.push(playerBullet(40 + (i % 10), 40 + (i % 8)));
  const enemyBullets = [{ x: 200, y: 200, radius: 4, sourceEnemyClass: "normal", dead: false }];
  for (let i = 0; i < 199; i += 1) enemyBullets.push({ x: 1180 + (i % 8), y: 650 + (i % 6), radius: 4, sourceEnemyClass: "normal", dead: false });
  const state = {
    mode: "fight",
    elapsed: 1,
    player: { x: 20, y: 680, radius: 10, hp: 100, maxHp: 100, invincible: 0 },
    bullets,
    enemyBullets,
    enemies: [{ id: "target", x: 900, y: 300, radius: 20, hp: 100, maxHp: 100, canTakeDamage: true, dead: false }],
    boss: null,
    coins: [],
    powerups: [],
    allies: [],
    particles: [],
    shockwaves: [],
    notices: [],
    powerupsCollected: 0
  };

  collision.checkCollisions(state, null, null);

  assert.strictEqual(state.bullets, bullets, "碰撞回收不得每帧重建玩家弹数组");
  assert.strictEqual(state.enemyBullets, enemyBullets, "碰撞回收不得每帧重建敌弹数组");
  assert.ok(state._collisionScratch && state._collisionScratch.player.used.length > 0);
  assert.equal(state.enemies[0].hp, 98);
  assert.equal(state.enemyBullets.length, 199);
});
