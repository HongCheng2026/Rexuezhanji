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

test("第一只立即出现，后续在击破后严格等待 15 秒", () => {
  const previousGame = global.RXGame;
  const directorPath = path.join(root, "src/h5/endless/endlessModeDirector.js");
  delete require.cache[require.resolve(directorPath)];
  let spawnCount = 0;
  const reinforcementCalls = [];
  global.RXGame = {
    endlessModeConfig: config,
    bossSystem: {
      spawnBoss(state, _level, options) {
        spawnCount += 1;
        state.boss = { hp: options.bossStats.hp, endlessRound: options.endlessRound };
        return state.boss;
      }
    },
    enemySystem: {
      spawnWave(_state, level, options) {
        reinforcementCalls.push({ level, options });
        return options.waveSize;
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
  state.elapsed = 20;
  state.boss.hp = 0;
  director.afterCollisions(state);
  assert.equal(state.endless.nextBossAt, 35);
  state.enemies.push({ id: "survivor" });
  state.elapsed = 20.9;
  director.beforeUpdate(state);
  assert.equal(spawnCount, 1);
  assert.equal(state.enemies.length, 1, "无尽导演不应逐帧清空小怪");
  state.elapsed = 21;
  director.beforeUpdate(state);
  assert.equal(reinforcementCalls.length, 1);
  state.elapsed = 24;
  director.beforeUpdate(state);
  assert.equal(reinforcementCalls.length, 2);
  state.elapsed = 33;
  director.beforeUpdate(state);
  assert.equal(reinforcementCalls.length, 5);
  assert.equal(reinforcementCalls[0].options.waveSize, 4);
  assert.equal(reinforcementCalls[0].options.activeCap, 12);
  assert.equal(reinforcementCalls[0].options.allowElite, false);
  assert.equal(state.endless.kills, 1, "小怪增援不能计入 BOSS 击破数");
  state.elapsed = 34.9;
  director.beforeUpdate(state);
  assert.equal(spawnCount, 1);
  state.elapsed = 35;
  director.beforeUpdate(state);
  assert.equal(spawnCount, 2);
  assert.equal(state.boss.endlessRound, 2);
  global.RXGame = previousGame;
});

test("BOSS 存活阶段第 4 秒起每 8 秒生成护航小怪", () => {
  const previousGame = global.RXGame;
  const directorPath = path.join(root, "src/h5/endless/endlessModeDirector.js");
  delete require.cache[require.resolve(directorPath)];
  const waves = [];
  global.RXGame = {
    endlessModeConfig: config,
    bossSystem: { spawnBoss(state, _level, options) { state.boss = { hp: options.bossStats.hp }; return state.boss; } },
    enemySystem: { spawnWave(_state, level, options) { waves.push({ level, options }); return options.waveSize; } },
    enemyStageBalance: { getEnemyFinalStats: () => ({}) },
    combatCodexConfig: { getStageBoss: () => null },
    assets: { getBossVisual: () => null }
  };
  const director = require(directorPath);
  const state = { elapsed: 0, enemies: [], enemyBullets: [], notices: [] };
  director.start(state);
  director.beforeUpdate(state);
  state.elapsed = 3.99;
  director.beforeUpdate(state);
  assert.equal(waves.length, 0);
  state.elapsed = 4;
  director.beforeUpdate(state);
  state.elapsed = 20;
  director.beforeUpdate(state);
  assert.equal(waves.length, 3);
  assert.ok(waves.every((wave) => wave.options.waveSize === 3));
  assert.ok(waves.every((wave) => wave.options.activeCap === 8));
  assert.ok(waves.every((wave) => wave.options.allowElite === false));
  assert.equal(waves[0].level.chapterIndex, 1);
  global.RXGame = previousGame;
});

test("理论最大出怪数包含 0 秒立即出现的第一只", () => {
  assert.equal(config.getTheoreticalMaxBosses(0), 1);
  assert.equal(config.getTheoreticalMaxBosses(14.9), 1);
  assert.equal(config.getTheoreticalMaxBosses(15), 2);
  assert.equal(config.getTheoreticalMaxBosses(45), 4);
});

test("独立增援波复用章节小怪并严格遵守同屏上限", () => {
  const previousGame = global.RXGame;
  const enemyPath = path.join(root, "src/h5/battle/enemySystem.js");
  delete require.cache[require.resolve(enemyPath)];
  global.RXGame = {
    enemyStageBalance: {
      getStageEnemySpawnPlan: () => ({
        spawnPressure: {
          activeCap: 18,
          phases: [{
            id: "bossPressure",
            start: 0,
            end: 90,
            waveSize: 4,
            typeWeights: { small: 1 },
            fireProfile: {},
            entryPatterns: ["lane"]
          }]
        },
        simultaneousCap: 18,
        bossGuardCap: 8,
        threatBudget: 1
      }),
      getEnemyFinalStats: () => ({ hp: 10, moveSpeed: 100, attackDamage: 1, bulletSpeed: 100 })
    },
    combatCodexConfig: {},
    assets: { ASSET_PATHS: { enemySprites: {}, smallEnemies: [] } },
    weaponSystem: {},
    battleGeometry: {
      getField: (state) => state.field,
      scaleY: (_state, value) => value
    }
  };
  const enemySystem = require(enemyPath);
  const state = {
    elapsed: 10,
    field: { width: 1600, height: 600, spawnPadding: 80 },
    player: { x: 120, y: 300 },
    enemies: Array.from({ length: 5 }, (_, index) => ({ id: index, dead: false, spawnState: "active" }))
  };
  const level = { id: 23, chapterIndex: 2, stageInChapter: 10 };
  assert.equal(enemySystem.spawnWave(state, level, { waveSize: 4, activeCap: 12, allowElite: false }), 4);
  assert.equal(state.enemies.length, 9);
  assert.equal(state.enemies[8].enemyType, "small");
  assert.equal(enemySystem.spawnWave(state, level, { waveSize: 4, activeCap: 12, allowElite: false }), 3);
  assert.equal(state.enemies.length, 12);
  global.RXGame = previousGame;
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
