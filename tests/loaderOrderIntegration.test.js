"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const h5 = path.join(root, "src", "h5");
const loaderSource = fs.readFileSync(path.join(h5, "Shell", "shared-loader.js"), "utf8");
const loaderEntries = [...loaderSource.matchAll(/["']([A-Za-z][^"'?]+\.js)["']/g)].map((match) => match[1]);

function indexOf(entry) {
  const index = loaderEntries.indexOf(entry);
  assert.notEqual(index, -1, entry + " is missing from loader");
  return index;
}

function createBrowserContext(seed = {}) {
  const context = vm.createContext({ console: { log() {}, warn() {}, error() {} }, URL, setTimeout, clearTimeout, ...seed });
  context.globalThis = context;
  context.window = context;
  context.location = { pathname: "/src/h5/Shell/game-frame.html", href: "http://127.0.0.1:8000/src/h5/Shell/game-frame.html" };
  context.RXGame = context.RXGame || {};
  return context;
}

function runInRealLoaderOrder(context, selectedEntries) {
  const selected = new Set(selectedEntries);
  loaderEntries.filter((entry) => selected.has(entry)).forEach((entry) => {
    const filename = path.join(h5, ...entry.split("/"));
    vm.runInContext(fs.readFileSync(filename, "utf8"), context, { filename });
  });
}

test("真实 loader 顺序先加载战术配置、荣誉和战斗统计，再规范化档案", () => {
  assert.ok(indexOf("Gameplay/Fighter/tacticalLoadoutConfig.js") < indexOf("Gameplay/Player/profile.js"));
  assert.ok(indexOf("World/Level/stageHonorSystem.js") < indexOf("Gameplay/Player/profile.js"));
  assert.ok(indexOf("Gameplay/Fighter/combatStats.js") < indexOf("Game/Storage/profileRuntime.js"));

  const context = createBrowserContext();
  runInRealLoaderOrder(context, [
    "Presentation/Assets/assets.js", "Data/Balance/balance.js", "World/Level/levels.js",
    "Gameplay/Fighter/tacticalLoadoutConfig.js", "World/Level/stageHonorSystem.js",
    "Gameplay/Player/commanderLevel.js", "Gameplay/Player/profile.js"
  ]);
  // 扩展自动技能槽按战机品质开放；使用 SSS 战机验证三个槽位的 loader 迁移顺序。
  const shipId = "ship-ss-lingguang";
  const normalized = context.RXGame.profile.normalizeProfile({
    saveVersion: 7,
    starterRosterVersion: 2,
    player: { level: 30 },
    resources: { gold: 500000 },
    scene: { shipId },
    owned: { ships: [shipId] },
    shipRanks: { [shipId]: "SSS" },
    migrationFlags: { weaponModulesV7Refunded: true },
    autoWeaponLevels: { weapon_module_04: 1, weapon_module_05: 2, weapon_module_06: 3 },
    shipSkillLoadouts: {
      [shipId]: { activeSlots: [null, null, null, null], autoWeaponIds: ["weapon_module_04", "weapon_module_05", "weapon_module_06"] }
    },
    progress: { stageHonors: { "1_1": 5 } }
  });
  assert.deepEqual(
    ["weapon_module_04", "weapon_module_05", "weapon_module_06"].map((id) => normalized.autoWeaponLevels[id]),
    [1, 2, 3]
  );
  assert.equal(normalized.autoWeaponLevels["phase-shield"], 1);
  assert.equal(Object.keys(normalized.autoWeaponLevels).length, 11);
  assert.deepEqual(Array.from(normalized.shipSkillLoadouts[shipId].autoWeaponIds), ["weapon_module_04", "weapon_module_05", "weapon_module_06"]);
  assert.equal(normalized.progress.stageHonors["1_1"], 5);
});

test("真实 loader 顺序在碰撞消费者前加载 FX，击破产生粒子和冲击波", () => {
  assert.ok(indexOf("Gameplay/Combat/fxSystem.js") < indexOf("Gameplay/Combat/collisionSystem.js"));
  const context = createBrowserContext({ RXGame: {
    events: { ENEMY_DIED: "enemy:died", ENEMY_HIT: "enemy:hit" },
    bus: { emit() {} },
    levels: { POWERUPS: {} }
  } });
  runInRealLoaderOrder(context, ["Gameplay/Combat/fxSystem.js", "Gameplay/Combat/collisionSystem.js"]);
  const target = { id: "enemy-1", x: 0, y: 0, radius: 10, hp: 1, maxHp: 1, enemyType: "small", value: 0 };
  const state = {
    bullets: [{ x: 0, y: 0, radius: 10, damage: 2, hitIds: new Set(), color: "#fff", type: "normal", armorBreakRatio: 0, armorBreakDuration: 0 }],
    enemies: [target], enemyBullets: [], coins: [], powerups: [], particles: [], shockwaves: [],
    killStats: { small: 0, elite: 0, boss: 0, total: 0, baseGold: 0 }, elapsed: 0, boss: null
  };
  context.RXGame.collisionSystem.hitTargetWithBullets(state, target, {});
  assert.equal(target.dead, true);
  assert.equal(state.particles.length, 30);
  assert.equal(state.shockwaves.length, 1);
});
