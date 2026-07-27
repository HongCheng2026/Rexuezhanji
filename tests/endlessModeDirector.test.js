const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const configPath = path.join(root, "src/h5/Gameplay/Combat/Endless/endlessModeConfig.js");
const directorPath = path.join(root, "src/h5/Gameplay/Combat/Endless/endlessModeDirector.js");

function loadDirector() {
  const previous = global.RXGame;
  const waves = [];
  global.RXGame = {
    enemySystem: {
      spawnWave(_state, _level, options) {
        waves.push({ ...options });
        return options.waveSize;
      }
    }
  };
  delete require.cache[require.resolve(configPath)];
  delete require.cache[require.resolve(directorPath)];
  const config = require(configPath);
  const director = require(directorPath);
  return {
    config,
    director,
    waves,
    restore() { global.RXGame = previous; }
  };
}

test("BOSS 存活阶段从第 2 秒开始每 4 秒生成 5 只护航小怪", () => {
  const loaded = loadDirector();
  try {
    const state = {
      battleMode: "endless",
      elapsed: 1.99,
      boss: { hp: 100 },
      enemies: [],
      endless: {
        round: 1,
        kills: 0,
        nextBossAt: 0,
        nextEscortAt: 2,
        intermissionStartedAt: null,
        reinforcementIndex: 0
      }
    };
    loaded.director.beforeUpdate(state);
    assert.equal(loaded.waves.length, 0);

    state.elapsed = 2;
    loaded.director.beforeUpdate(state);
    assert.equal(loaded.waves.length, 1);
    assert.equal(loaded.waves[0].waveSize, 5);
    assert.equal(loaded.waves[0].activeCap, 18);

    state.elapsed = 6;
    loaded.director.beforeUpdate(state);
    assert.equal(loaded.waves.length, 2);
  } finally {
    loaded.restore();
  }
});

test("15 秒空档期按八个节点生成 6 只小怪且同屏上限为 24", () => {
  const loaded = loadDirector();
  try {
    const state = {
      battleMode: "endless",
      elapsed: 14.5,
      boss: null,
      enemies: [],
      endless: {
        round: 1,
        kills: 1,
        nextBossAt: 15,
        nextEscortAt: null,
        intermissionStartedAt: 0,
        reinforcementIndex: 0
      }
    };
    loaded.director.beforeUpdate(state);
    assert.equal(loaded.waves.length, 8);
    for (const wave of loaded.waves) {
      assert.equal(wave.waveSize, 6);
      assert.equal(wave.activeCap, 24);
      assert.equal(wave.allowElite, false);
    }
  } finally {
    loaded.restore();
  }
});

test("无尽战斗逻辑只位于 Gameplay/Combat/Endless 模块", () => {
  const fs = require("node:fs");
  const combatDir = path.join(root, "src/h5/Gameplay/Combat/Endless");
  const presentationDir = path.join(root, "src/h5/Presentation/Endless");
  assert.equal(fs.existsSync(path.join(combatDir, "endlessModeConfig.js")), true);
  assert.equal(fs.existsSync(path.join(combatDir, "endlessModeDirector.js")), true);
  assert.equal(fs.existsSync(path.join(combatDir, "endlessModeRoomController.js")), true);
  assert.equal(fs.existsSync(path.join(combatDir, "endlessRoom.js")), true);
  assert.equal(fs.existsSync(path.join(presentationDir, "endlessModeConfig.js")), false);
  assert.equal(fs.existsSync(path.join(presentationDir, "endlessModeDirector.js")), false);
  assert.equal(fs.existsSync(path.join(presentationDir, "endlessModeRoomController.js")), false);
  assert.equal(fs.existsSync(path.join(presentationDir, "endlessRoom.js")), false);
});
