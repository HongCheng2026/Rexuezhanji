"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

global.RXGame = {};
const balance = require("../src/shared/balance.js");
require("../src/shared/levels.js");
const assets = require("../src/shared/assets.js");
const profileSystem = require("../src/shared/profile.js");
const combatStats = require("../src/h5/meta/combatStats.js");
const weaponModuleSystem = require("../src/h5/meta/weaponModuleSystem.js");
const weaponSystem = require("../src/h5/battle/weaponSystem.js");
const abilitySystem = require("../src/h5/battle/abilitySystem.js");

function makeProfileForShip(ship) {
  return profileSystem.normalizeProfile({
    saveVersion: profileSystem.SAVE_VERSION,
    player: { level: 20 },
    scene: { shipId: ship.id },
    owned: { ships: [ship.id] }
  });
}

test("B/A/S 战机严格以 Lv1/Lv2/Lv3 开场", () => {
  for (const [rank, expected] of [["B", 1], ["A", 2], ["S", 3]]) {
    const ship = assets.SHIP_ASSETS.find((item) => item.rank === rank);
    assert.ok(ship, `缺少 ${rank} 级测试战机`);
    const loadout = combatStats.generateBattleLoadout(makeProfileForShip(ship));
    assert.deepEqual(loadout.initialWeapons, { spread: expected, laser: expected, missile: expected });
  }
});

test("旧火力核心只迁移一次，且不再进入战斗伤害倍率", () => {
  const migrated = profileSystem.normalizeProfile({
    saveVersion: 5,
    player: { level: 10 },
    resources: { gold: 100 },
    upgrades: { fire: 3 },
    fighterUpgrades: { attack: 1, armorPenetration: 1, hp: 1 }
  });
  assert.equal(migrated.upgrades.fire, 0);
  assert.equal(migrated.fighterUpgrades.attack, 2);
  assert.equal(profileSystem.getGold(migrated), 250);
  const normalizedAgain = profileSystem.normalizeProfile(migrated);
  assert.equal(normalizedAgain.fighterUpgrades.attack, 2);
  assert.equal(profileSystem.getGold(normalizedAgain), 250);
  assert.equal(combatStats.generateBattleLoadout(normalizedAgain).finalStats.weaponDamageMultiplier, 1);
});

test("追踪弹保留活目标，目标死亡后才重新锁定", () => {
  const missile = weaponSystem.createBullet(100, 250, 0.2, "missile", 10, 400, 7, "#fff", {});
  Object.assign(missile, {
    targetId: "enemy-a",
    homingStartAge: 0.08,
    homingTurnRate: 6,
    homingSteerGain: 9,
    launchSpeed: 400,
    maxSpeed: 520,
    accelerationDuration: 0.35
  });
  const enemyA = { id: "enemy-a", x: 600, y: 120, hp: 100, maxHp: 100, radius: 20 };
  const enemyB = { id: "enemy-b", x: 300, y: 250, hp: 100, maxHp: 100, radius: 20 };
  const state = { bullets: [missile], enemies: [enemyA, enemyB], boss: null };
  weaponSystem.updateBullets(state, 0.1);
  assert.equal(missile.targetId, "enemy-a");
  enemyA.dead = true;
  weaponSystem.updateBullets(state, 0.016);
  assert.equal(missile.targetId, "enemy-b");
});

test("多枚追踪弹会分散锁定，场上无小怪时才锁 BOSS", () => {
  const bullets = [];
  const state = {
    player: { weaponPierceSlots: {}, weaponVolleyCounts: {} },
    bullets,
    enemies: [
      { id: "a", x: 520, y: 150, hp: 100, maxHp: 100, radius: 18 },
      { id: "b", x: 540, y: 250, hp: 100, maxHp: 100, radius: 18 },
      { id: "c", x: 560, y: 350, hp: 100, maxHp: 100, radius: 18 }
    ],
    boss: { id: "boss", x: 760, y: 250, hp: 1000, maxHp: 1000, radius: 50 }
  };
  const loadout = { finalStats: { attack: 100 }, weaponPierceSlots: {}, equippedWeaponModule: null };
  weaponSystem.fireWeapon(state, loadout, bullets, "missile", 3, 100, 250);
  assert.ok(new Set(bullets.map((bullet) => bullet.targetId)).size >= 2);
  assert.ok(bullets.every((bullet) => bullet.targetId !== "boss"));
  state.enemies = [];
  bullets.length = 0;
  weaponSystem.fireWeapon(state, loadout, bullets, "missile", 3, 100, 250);
  assert.ok(bullets.every((bullet) => bullet.targetId === "boss"));
});

test("all six weapon modules change only their matching base weapon", () => {
  function makeState() {
    return {
      player: { weaponPierceSlots: {}, weaponVolleyCounts: {} },
      bullets: [],
      enemies: [{ id: "enemy", x: 520, y: 250, hp: 100, maxHp: 100, radius: 18 }],
      boss: null
    };
  }
  function fire(moduleId, type, level = 1, prepare) {
    const state = makeState();
    if (prepare) prepare(state);
    const loadout = {
      finalStats: { attack: 100 },
      weaponPierceSlots: {},
      equippedWeaponModule: balance.WEAPON_MODULES[moduleId]
    };
    weaponSystem.fireWeapon(state, loadout, state.bullets, type, level, 100, 250);
    return state.bullets;
  }

  const focused = fire("spread-focus", "spread");
  assert.equal(focused.length, 3);
  assert.equal(focused[0].damage, 118);
  assert.ok(Math.abs(focused[1].angle - focused[0].angle) < 0.04);

  const storm = fire("spread-storm", "spread");
  assert.equal(storm.length, 5);
  assert.equal(storm[0].damage, 92);

  const prism = fire("laser-prism", "laser");
  assert.equal(prism[0].damage, 108);
  assert.equal(prism[0].pierceRemaining, 1);

  const capacitor = fire("laser-capacitor", "laser", 1, (state) => {
    state.player.weaponVolleyCounts.laser = 4;
  });
  assert.equal(capacitor.length, 2);
  assert.equal(capacitor[0].damage, 95);
  assert.equal(capacitor[1].damage, 200);

  const guidance = fire("missile-guidance", "missile");
  assert.equal(guidance.length, 2);
  assert.equal(guidance[0].damage, 92);
  assert.ok(Math.abs(guidance[0].homingTurnRate - 8.1) < 1e-9);

  const warhead = fire("missile-warhead", "missile");
  assert.equal(warhead.length, 1);
  assert.equal(warhead[0].damage, 120);
  assert.equal(warhead[0].splashRadius, 64);
  assert.ok(warhead[0].launchSpeed < 472);
});

test("three S-rank automatic skills create distinct combat effects", () => {
  const enemy = { id: "enemy", enemyType: "elite", x: 600, y: 250, hp: 1000, maxHp: 1000, radius: 24 };
  function cast(skillId) {
    const ship = assets.SHIP_ASSETS.find((item) => item.passiveSkill && item.passiveSkill.id === skillId);
    const loadout = combatStats.generateBattleLoadout(makeProfileForShip(ship));
    const state = {
      elapsed: 2,
      player: { passiveLastAt: {} },
      bullets: [],
      skillEffects: [],
      enemies: [{ ...enemy }],
      boss: null
    };
    abilitySystem.onVolleyFired(state, loadout, state.bullets, { x: 100, y: 250 });
    return state;
  }

  const sky = cast("sky-lock-beam");
  assert.equal(sky.bullets[0].type, "skyLockBeam");
  assert.equal(sky.bullets[0].pierceRemaining, 999);

  const dark = cast("obsidian-gravity-well");
  assert.equal(dark.bullets.length, 0);
  assert.equal(dark.skillEffects[0].type, "obsidian-gravity-well");
  assert.equal(dark.skillEffects[0].ticksRemaining, 4);

  const gold = cast("gold-judgement-spear");
  assert.equal(gold.bullets[0].type, "goldJudgement");
  assert.equal(gold.bullets[0].pierceRemaining, 5);
  assert.equal(gold.bullets[0].armorBreakRatio, 0.15);
  assert.equal(gold.bullets[0].armorBreakDuration, 1.5);
});

test("S 专属技能输出占比满足 Lv3、Lv7、Lv8 目标", () => {
  const reference = balance.getReferenceVolleyMultiplier(8);
  const exclusiveDps = reference / 0.8;
  function baseDps(level) { return balance.getReferenceVolleyMultiplier(level) / 0.16; }
  const level3Share = exclusiveDps / (exclusiveDps + baseDps(3));
  const level7BaseShare = baseDps(7) / (exclusiveDps + baseDps(7));
  const level8BaseShare = baseDps(8) / (exclusiveDps + baseDps(8));
  assert.ok(level3Share >= 0.35 && level3Share <= 0.45, `Lv3 专属占比 ${level3Share}`);
  assert.ok(level7BaseShare >= 0.75, `Lv7 基础占比 ${level7BaseShare}`);
  assert.ok(level8BaseShare >= 0.8, `Lv8 基础占比 ${level8BaseShare}`);
});

test("模块存档只保留合法ID，且只有 S 战机的出战快照生效", () => {
  const normalized = profileSystem.normalizeProfile({
    saveVersion: 6,
    weaponModules: { ownedIds: ["spread-focus", "invalid", "spread-focus"], equippedId: "spread-focus" }
  });
  assert.deepEqual(normalized.weaponModules, { ownedIds: ["spread-focus"], equippedId: "spread-focus" });
  const sShip = assets.SHIP_ASSETS.find((item) => item.rank === "S");
  const aShip = assets.SHIP_ASSETS.find((item) => item.rank === "A");
  const sProfile = makeProfileForShip(sShip);
  sProfile.weaponModules = normalized.weaponModules;
  assert.equal(combatStats.generateBattleLoadout(sProfile).equippedWeaponModule.id, "spread-focus");
  const aProfile = makeProfileForShip(aShip);
  aProfile.weaponModules = normalized.weaponModules;
  assert.equal(combatStats.generateBattleLoadout(aProfile).equippedWeaponModule, null);
});

test("本地模块购买、重复购买、装备和卸下遵守同一套规则", () => {
  const moduleProfile = profileSystem.normalizeProfile({ saveVersion: 6, resources: { gold: 100000 } });
  const sShip = assets.SHIP_ASSETS.find((item) => item.rank === "S");
  const aShip = assets.SHIP_ASSETS.find((item) => item.rank === "A");
  const result = weaponModuleSystem.buy(moduleProfile, "missile-guidance");
  assert.equal(result.cost, 50000);
  assert.equal(profileSystem.getGold(moduleProfile), 50000);
  assert.throws(() => weaponModuleSystem.buy(moduleProfile, "missile-guidance"), /已经购买/);
  assert.throws(() => weaponModuleSystem.equip(moduleProfile, "missile-guidance", aShip), /只有 S 级/);
  weaponModuleSystem.equip(moduleProfile, "missile-guidance", sShip);
  assert.equal(moduleProfile.weaponModules.equippedId, "missile-guidance");
  weaponModuleSystem.equip(moduleProfile, null, aShip);
  assert.equal(moduleProfile.weaponModules.equippedId, null);
});

test("玩家与 BOSS 血条使用独立的桌面和窄屏高度", () => {
  const css = fs.readFileSync(path.resolve(__dirname, "../src/h5/ui/battleHudView.css"), "utf8");
  assert.match(css, /\.battle-screen \.hud-bar\.player[\s\S]*?height:\s*10px/);
  assert.match(css, /\.battle-screen \.hud-bar\.boss[\s\S]*?height:\s*12px/);
  assert.match(css, /@media[\s\S]*\.battle-screen \.hud-bar\.player[\s\S]*?height:\s*8px/);
  assert.match(css, /@media[\s\S]*\.battle-screen \.hud-bar\.boss[\s\S]*?height:\s*10px/);
  assert.match(css, /\.battle-screen \.battle-side-panel[\s\S]*?right:\s*16px/);
  assert.doesNotMatch(css, /\.battle-screen \.battle-side-panel\s*\{[^}]*left:/);
});
