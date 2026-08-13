const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");

function loadCollisionSystem() {
  const previous = global.RXGame;
  const collisionPath = path.join(root, "src/h5/Gameplay/Combat/collisionSystem.js");
  delete require.cache[require.resolve(collisionPath)];
  global.RXGame = { levels: {}, fxSystem: { burst() {}, shockwave() {} } };
  return { previous, collisionSystem: require(collisionPath) };
}

function createState(playerHp, enemyHp) {
  return {
    elapsed: 0,
    player: { x: 100, y: 100, radius: 20, hp: playerHp, maxHp: 100, lives: 1, shield: 15, invincible: 0, weapons: {} },
    enemies: [{ x: 100, y: 100, radius: 20, hp: enemyHp, maxHp: 100, dead: false }],
    boss: null,
    bullets: [],
    enemyBullets: [],
    coins: [],
    powerups: [],
    notices: [],
    particles: [],
    shockwaves: [],
    killStats: { small: 0, elite: 0, boss: 0, total: 0, baseGold: 0 },
    damageTaken: 0,
    damageTakenAmount: 0,
    powerupsCollected: 0
  };
}

test("机体碰撞按敌机碰撞瞬间当前血量扣血且不被护盾替代", () => {
  const loaded = loadCollisionSystem();
  try {
    const state = createState(100, 37);
    loaded.collisionSystem.checkCollisions(state, null, null);
    assert.equal(state.player.hp, 63);
    assert.equal(state.damageTakenAmount, 37);
    assert.equal(state.player.shield, 15);
    assert.equal(state.enemies.length, 0);
  } finally {
    global.RXGame = loaded.previous;
  }
});

test("机体碰撞伤害等于或超过玩家当前生命时立即判败", () => {
  const loaded = loadCollisionSystem();
  try {
    const equal = createState(30, 30);
    loaded.collisionSystem.checkCollisions(equal, null, null);
    assert.equal(equal.player.hp, 0);
    assert.equal(equal.damageTakenAmount, 30);

    const insufficient = createState(29, 30);
    loaded.collisionSystem.checkCollisions(insufficient, null, null);
    assert.equal(insufficient.player.hp, 0);
    assert.equal(insufficient.player.lives, 0);
    assert.equal(insufficient.damageTakenAmount, 29);
  } finally {
    global.RXGame = loaded.previous;
  }
});
