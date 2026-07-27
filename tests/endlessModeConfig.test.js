const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const configPath = path.resolve(__dirname, "../src/h5/Gameplay/Combat/Endless/endlessModeConfig.js");

function loadConfig() {
  const previous = global.RXGame;
  global.RXGame = {};
  delete require.cache[require.resolve(configPath)];
  return {
    config: require(configPath),
    restore() {
      global.RXGame = previous;
    }
  };
}

test("无尽 BOSS 每轮增加 100% 基础血量、100% 基础攻击和 10% 减伤", () => {
  const loaded = loadConfig();
  try {
    const { config } = loaded;
    const expected = [
      { round: 1, multiplier: 1, reduction: 0.1 },
      { round: 2, multiplier: 2, reduction: 0.2 },
      { round: 5, multiplier: 5, reduction: 0.5 },
      { round: 9, multiplier: 9, reduction: 0.9 },
      { round: 10, multiplier: 10, reduction: 1 }
    ];

    for (const sample of expected) {
      const stats = config.getRoundStats(sample.round);
      assert.equal(stats.hp, config.BASE_BOSS_HP * sample.multiplier);
      assert.equal(stats.hpMultiplier, sample.multiplier);
      assert.equal(stats.attackDamage, config.BASE_BOSS_ATTACK * sample.multiplier);
      assert.equal(stats.attackMultiplier, sample.multiplier);
      assert.equal(stats.attackBonusRate, sample.multiplier - 1);
      assert.equal(stats.damageReductionRate, sample.reduction);
      assert.equal(stats.damageTakenMultiplier, Math.max(0, 1 - sample.reduction));
    }
  } finally {
    loaded.restore();
  }
});

test("无尽 BOSS 成长继续作用于自定义基础数值", () => {
  const loaded = loadConfig();
  try {
    const stats = loaded.config.getRoundStats(3, {
      baseHp: 250000,
      baseAttack: 125,
      bulletSpeed: 420
    });
    assert.equal(stats.hp, 750000);
    assert.equal(stats.attackDamage, 375);
    assert.equal(stats.damageReductionRate, 0.3);
    assert.equal(stats.bulletSpeed, 420);
  } finally {
    loaded.restore();
  }
});

test("无尽小怪使用高频护航与高密度空档增援", () => {
  const loaded = loadConfig();
  try {
    const { config } = loaded;
    assert.equal(config.BOSS_ESCORT_FIRST_DELAY_SECONDS, 2);
    assert.equal(config.BOSS_ESCORT_INTERVAL_SECONDS, 4);
    assert.equal(config.BOSS_ESCORT_WAVE_SIZE, 5);
    assert.equal(config.BOSS_ESCORT_ACTIVE_CAP, 18);
    assert.deepEqual(
      config.INTERMISSION_REINFORCEMENT_OFFSETS_SECONDS,
      [0.5, 2.5, 4.5, 6.5, 8.5, 10.5, 12.5, 14.5]
    );
    assert.equal(config.INTERMISSION_REINFORCEMENT_WAVE_SIZE, 6);
    assert.equal(config.INTERMISSION_REINFORCEMENT_ACTIVE_CAP, 24);
  } finally {
    loaded.restore();
  }
});
