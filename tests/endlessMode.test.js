const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const config = require(path.join(root, "src/shared/endlessModeConfig.js"));

test("无尽 BOSS 按第 1 至第 9 章循环", () => {
  assert.equal(config.getBossChapter(1), 1);
  assert.equal(config.getBossChapter(9), 9);
  assert.equal(config.getBossChapter(10), 1);
  assert.equal(config.getBossChapter(90), 9);
  assert.equal(config.getBossChapter(91), 1);
});

test("第 1/9/10/90/91/100 只 BOSS 数值线性增长", () => {
  for (const round of [1, 9, 10, 90, 91, 100]) {
    const stats = config.getRoundStats(round, { baseHp: 100, baseAttack: 10, bulletSpeed: 20 });
    assert.equal(stats.hp, 100 * round);
    assert.equal(stats.attackBonusRate, round * 0.1);
    assert.equal(stats.attackDamage, 10 * (1 + round * 0.1));
    assert.equal(stats.damageReductionRate, round / 100);
  }
});

test("超 100% 减伤先扣破甲，最低零伤且不会回血", () => {
  assert.ok(Math.abs(config.getDamageTakenMultiplier(0.9, 0.2) - 0.3) < 1e-9);
  assert.equal(config.getDamageTakenMultiplier(1, 0), 0);
  assert.ok(Math.abs(config.getDamageTakenMultiplier(1.1, 0.2) - 0.1) < 1e-9);
  assert.equal(config.getDamageTakenMultiplier(1.1, 0.05), 0);
  assert.equal(config.getDamageTakenMultiplier(2, 0), 0);
});

test("第一只立即出现，后续 30 秒节点且场上只保留一只", () => {
  const previousGame = global.RXGame;
  const directorPath = path.join(root, "src/h5/battle/endlessModeDirector.js");
  delete require.cache[require.resolve(directorPath)];
  let spawnCount = 0;
  global.RXGame = {
    endlessModeConfig: config,
    bossSystem: {
      spawnBoss(state, _level, options) {
        spawnCount += 1;
        state.boss = { hp: options.bossStats.hp, endlessRound: options.endlessRound };
        return state.boss;
      }
    },
    enemyStageBalance: { getEnemyFinalStats: () => ({ waveConfig: {} }) },
    combatCodexConfig: { getStageBoss: () => ({ name: "测试 BOSS" }) },
    assets: { getBossVisual: () => null }
  };
  const director = require(directorPath);
  const state = { elapsed: 0, enemies: [], enemyBullets: [], notices: [], fieldWidth: 1600 };
  director.start(state);
  director.beforeUpdate(state);
  director.beforeUpdate(state);
  assert.equal(spawnCount, 1);
  state.boss.hp = 0;
  director.afterCollisions(state);
  state.elapsed = 29.9;
  director.beforeUpdate(state);
  assert.equal(spawnCount, 1);
  state.elapsed = 30;
  director.beforeUpdate(state);
  assert.equal(spawnCount, 2);
  assert.equal(state.boss.endlessRound, 2);
  global.RXGame = previousGame;
});

test("理论最大出怪数包含 0 秒立即出现的第一只", () => {
  assert.equal(config.getTheoreticalMaxBosses(0), 1);
  assert.equal(config.getTheoreticalMaxBosses(29.9), 1);
  assert.equal(config.getTheoreticalMaxBosses(30), 2);
  assert.equal(config.getTheoreticalMaxBosses(90), 4);
});

test("碰撞结算对超额减伤返回零倍率，不会产生负伤害", () => {
  const previousGame = global.RXGame;
  const collisionPath = path.join(root, "src/h5/battle/collisionSystem.js");
  delete require.cache[require.resolve(collisionPath)];
  global.RXGame = {};
  const collisions = require(collisionPath);
  const state = { elapsed: 10 };
  assert.equal(collisions.getBulletDamageTakenMultiplier(state, { damageReductionRate: 1.2, damageTakenMultiplier: 0, originalDamageTakenMultiplier: 0 }, { armorPierceRatio: 0.1 }), 0);
  assert.ok(Math.abs(collisions.getBulletDamageTakenMultiplier(state, { damageReductionRate: 1.2, damageTakenMultiplier: 0, originalDamageTakenMultiplier: 0 }, { armorPierceRatio: 0.35 }) - 0.15) < 1e-9);
  global.RXGame = previousGame;
});
