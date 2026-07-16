const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");

function loadBalanceModules() {
  const previous = global.RXGame;
  const balancePath = path.join(root, "src/shared/balance.js");
  const enemyPath = path.join(root, "src/shared/enemyStageBalance.js");
  delete require.cache[require.resolve(balancePath)];
  delete require.cache[require.resolve(enemyPath)];
  global.RXGame = {};
  const balance = require(balancePath);
  const enemyStageBalance = require(enemyPath);
  return { previous, balance, enemyStageBalance };
}

test("章节 BOSS 血量与减伤只使用 balance 唯一规则源", () => {
  const loaded = loadBalanceModules();
  try {
    for (let chapter = 1; chapter <= 9; chapter += 1) {
      for (let stage = 1; stage <= 10; stage += 1) {
        const hpBonus = stage === 5 ? 0.5 : stage === 10 ? 1 : 0;
        const reductionBonus = stage === 5 ? 0.05 : stage === 10 ? 0.1 : 0;
        const expectedHp = 100000 * (1 + chapter + hpBonus);
        const baseReduction = loaded.enemyStageBalance.getStageDamageReductionRate(chapter, stage);
        const expectedReduction = Number(Math.min(0.9, baseReduction + reductionBonus).toFixed(6));
        const canonical = loaded.balance.getBossScaling(chapter, stage, baseReduction);
        const runtime = loaded.enemyStageBalance.getEnemyFinalStats({ chapterIndex: chapter, stageInChapter: stage, enemyType: "boss" });
        assert.equal(canonical.hp, expectedHp, `${chapter}-${stage} canonical hp`);
        assert.equal(canonical.damageReductionRate, expectedReduction, `${chapter}-${stage} canonical reduction`);
        assert.equal(runtime.hp, expectedHp, `${chapter}-${stage} runtime hp`);
        assert.equal(runtime.damageReductionRate, expectedReduction, `${chapter}-${stage} runtime reduction`);
        assert.equal(canonical.armorPierceRatio, chapter / 10, `${chapter}-${stage} canonical armor pierce`);
        assert.equal(runtime.armorPierceRatio, chapter / 10, `${chapter}-${stage} runtime armor pierce`);
      }
    }
    assert.deepEqual(loaded.balance.getBossScaling(1, 1), {
      chapterIndex: 1,
      stageInChapter: 1,
      hpMultiplier: 2,
      hp: 200000,
      damageReductionRate: 0,
      damageTakenMultiplier: 1,
      armorPierceRatio: 0.1
    });
    assert.equal(loaded.balance.getBossScaling(9, 1).hp, 1000000);
    assert.equal(loaded.balance.getBossScaling(9, 10).hp, 1100000);
    assert.equal(
      loaded.balance.getBossScaling(9, 10, loaded.enemyStageBalance.getStageDamageReductionRate(9, 10)).damageReductionRate,
      0.74
    );
    assert.equal(typeof loaded.enemyStageBalance.getBossHpMultiplier, "undefined");
  } finally {
    global.RXGame = loaded.previous;
  }
});

test("序章 BOSS 保持十万血与零减伤", () => {
  const loaded = loadBalanceModules();
  try {
    for (let stage = 1; stage <= 3; stage += 1) {
      const stats = loaded.balance.getBossScaling(0, stage);
      assert.equal(stats.hp, 100000);
      assert.equal(stats.damageReductionRate, 0);
      assert.equal(stats.armorPierceRatio, 0);
    }
  } finally {
    global.RXGame = loaded.previous;
  }
});

test("普通敌人与无尽 BOSS 不引用章节 BOSS 血量公式", () => {
  const loaded = loadBalanceModules();
  try {
    const normal = loaded.enemyStageBalance.getEnemyFinalStats({ chapterIndex: 9, stageInChapter: 10, enemyType: "small" });
    assert.notEqual(normal.hp, loaded.balance.getBossScaling(9, 10).hp);
    assert.equal(normal.armorPierceRatio, 0);
    assert.equal(normal.damageReductionRate, loaded.enemyStageBalance.getStageDamageReductionRate(9, 10));
    const elite = loaded.enemyStageBalance.getEnemyFinalStats({ chapterIndex: 9, stageInChapter: 5, enemyType: "elite" });
    assert.equal(elite.damageReductionRate, loaded.enemyStageBalance.getStageDamageReductionRate(9, 5));
    const endlessPath = path.join(root, "src/shared/endlessModeConfig.js");
    delete require.cache[require.resolve(endlessPath)];
    const endless = require(endlessPath);
    assert.equal(endless.getRoundStats(1).hp, endless.BASE_BOSS_HP);
  } finally {
    global.RXGame = loaded.previous;
  }
});
