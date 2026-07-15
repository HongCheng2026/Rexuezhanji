"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { fileURLToPath, pathToFileURL } = require("node:url");

global.RXGame = {};
const balance = require("../src/shared/balance.js");
require("../src/shared/levels.js");
const shipSkills = require("../src/shared/shipSkills.js");
const assets = require("../src/shared/assets.js");
require("../src/shared/battleRules.js");
const profileSystem = require("../src/shared/profile.js");
const combatStats = require("../src/h5/meta/combatStats.js");
const weaponModuleSystem = require("../src/h5/meta/weaponModuleSystem.js");
const battleGeometry = require("../src/h5/battle/battleGeometry.js");
const weaponSystem = require("../src/h5/battle/weaponSystem.js");
const activeSkillPreferences = require("../src/h5/battle/activeSkillPreferences.js");
const activeSkillSystem = require("../src/h5/battle/activeSkillSystem.js");
const abilitySystem = require("../src/h5/battle/abilitySystem.js");
require("../src/h5/battle/activeSkills/skyLockBeam.js");
require("../src/h5/battle/activeSkills/obsidianGravityWell.js");
require("../src/h5/battle/activeSkills/goldJudgementBuff.js");
const battleState = require("../src/h5/battle/battleState.js");

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

test("三架 S 战机的专属技能只进入主动技能第 1 格", () => {
  const expectedIds = new Set(["sky-lock-beam", "obsidian-gravity-well", "gold-judgement-buff"]);
  for (const ship of assets.SHIP_ASSETS.filter((item) => item.rank === "S")) {
    const loadout = combatStats.generateBattleLoadout(makeProfileForShip(ship));
    assert.ok(expectedIds.has(loadout.abilities.activeSlots[0].id));
    assert.deepEqual(loadout.abilities.activeSlots.slice(1), [null, null, null]);
  }
  for (const ship of assets.SHIP_ASSETS.filter((item) => item.rank !== "S")) {
    const loadout = combatStats.generateBattleLoadout(makeProfileForShip(ship));
    assert.deepEqual(loadout.abilities.activeSlots, [null, null, null, null]);
  }
});

test("三个 S 专属技能按各自持续时间运行且不能叠加", () => {
  const enemy = { id: "enemy", enemyType: "elite", x: 600, y: 250, hp: 1000, maxHp: 1000, radius: 24 };
  function cast(skillId) {
    const ship = assets.SHIP_ASSETS.find((item) => item.activeSkills[0] && item.activeSkills[0].id === skillId);
    const loadout = combatStats.generateBattleLoadout(makeProfileForShip(ship));
    const player = battleState.createPlayer(loadout, battleGeometry.createField());
    player.x = 100;
    player.y = 250;
    const state = {
      mode: "fight",
      elapsed: 2,
      field: battleGeometry.createField(),
      player,
      bullets: [],
      skillEffects: [],
      enemies: [{ ...enemy }],
      boss: null,
      notices: []
    };
    assert.equal(abilitySystem.tryCastActiveSlot(state, loadout, 0), true);
    assert.equal(abilitySystem.tryCastActiveSlot(state, loadout, 0), false);
    return { state, loadout, runtime: player.abilities.activeSlots[0] };
  }

  const sky = cast("sky-lock-beam");
  assert.equal(sky.runtime.activeRemaining, 3);
  assert.equal(sky.runtime.cooldownTimer, 10);
  assert.equal(sky.state.bullets[0].type, "skyLockBeam");
  abilitySystem.update(sky.state, sky.loadout, 0.61);
  assert.equal(sky.state.bullets.length, 2);

  const dark = cast("obsidian-gravity-well");
  assert.equal(dark.runtime.activeRemaining, 5);
  assert.equal(dark.runtime.cooldownTimer, 15);
  assert.equal(dark.state.skillEffects[0].activeSkillId, "obsidian-gravity-well");

  const gold = cast("gold-judgement-buff");
  assert.equal(gold.runtime.activeRemaining, 4);
  assert.equal(gold.runtime.cooldownTimer, 13);
  assert.deepEqual(abilitySystem.getWeaponModifiers(gold.state, gold.loadout, "spread"), {
    damageMultiplier: 1.3,
    armorPierceBonus: 0.25
  });
  weaponSystem.fireWeapon(gold.state, gold.loadout, gold.state.bullets, "spread", 3, 100, 250);
  assert.equal(gold.state.bullets[0].armorPierceRatio, gold.loadout.finalStats.armorPenetration + 0.25);
});

test("主动技能自动开关按技能独立记忆，且没有目标时不空放", () => {
  activeSkillPreferences.resetForTests();
  const ship = assets.SHIP_ASSETS.find((item) => item.activeSkillId === "sky-lock-beam");
  const loadout = combatStats.generateBattleLoadout(makeProfileForShip(ship));
  const player = battleState.createPlayer(loadout, battleGeometry.createField());
  const state = {
    mode: "fight",
    field: battleGeometry.createField(),
    player,
    bullets: [],
    skillEffects: [],
    enemies: [],
    boss: null,
    notices: []
  };
  assert.equal(abilitySystem.toggleActiveSlotAuto(state, loadout, 0), true);
  assert.equal(activeSkillPreferences.isEnabled("sky-lock-beam"), true);
  assert.equal(activeSkillPreferences.isEnabled("obsidian-gravity-well"), false);
  abilitySystem.update(state, loadout, 0.5);
  assert.equal(player.abilities.activeSlots[0].cooldownTimer, 0);
  assert.equal(state.bullets.length, 0);
  state.enemies.push({ id: "target", x: 600, y: 250, hp: 100, maxHp: 100, radius: 20 });
  abilitySystem.update(state, loadout, 0.016);
  assert.equal(state.bullets.length, 1);
  assert.equal(player.abilities.activeSlots[0].activeRemaining, 3);
  assert.equal(abilitySystem.toggleActiveSlotAuto(state, loadout, 0), false);
  const activeBeforeManualMode = player.abilities.activeSlots[0].activeRemaining;
  abilitySystem.update(state, loadout, 0.25);
  assert.ok(player.abilities.activeSlots[0].activeRemaining < activeBeforeManualMode);

  const nextPlayer = battleState.createPlayer(loadout, battleGeometry.createField());
  assert.equal(nextPlayer.abilities.activeSlots[0].autoEnabled, false);
  state.mode = "paused";
  const remaining = player.abilities.activeSlots[0].activeRemaining;
  abilitySystem.update(state, loadout, 1);
  assert.equal(player.abilities.activeSlots[0].activeRemaining, remaining);
});

test("主动技能自动偏好写入独立本地设置并能重新读取", () => {
  const source = fs.readFileSync(path.resolve(__dirname, "../src/h5/battle/activeSkillPreferences.js"), "utf8");
  const storage = new Map([["rx_active_skill_auto_v1", JSON.stringify({ "sky-lock-beam": true })]]);
  const context = {
    localStorage: {
      getItem(key) { return storage.get(key) || null; },
      setItem(key, value) { storage.set(key, value); }
    }
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(source, context);
  const preferences = context.RXGame.activeSkillPreferences;
  assert.equal(preferences.isEnabled("sky-lock-beam"), true);
  assert.equal(preferences.isEnabled("obsidian-gravity-well"), false);
  preferences.setEnabled("obsidian-gravity-well", true);
  assert.deepEqual(JSON.parse(storage.get("rx_active_skill_auto_v1")), {
    "sky-lock-beam": true,
    "obsidian-gravity-well": true
  });
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

test("B/A/S 决胜指令开局 1 次、上限 2/3/4、18 秒恢复", () => {
  for (const [rank, expectedMax] of [["B", 2], ["A", 3], ["S", 4]]) {
    const ship = assets.SHIP_ASSETS.find((item) => item.rank === rank);
    const loadout = combatStats.generateBattleLoadout(makeProfileForShip(ship));
    const player = battleState.createPlayer(loadout, battleGeometry.createField());
    const state = {
      field: battleGeometry.createField(),
      player,
      bullets: [],
      enemyBullets: [],
      enemies: [],
      skillEffects: [],
      notices: [],
      shake: 0,
      mode: "fight"
    };
    assert.equal(player.abilities.decisiveCommand.charges, 1);
    assert.equal(player.abilities.decisiveCommand.maxCharges, expectedMax);
    assert.equal(player.abilities.decisiveCommand.rechargeSeconds, 18);
    assert.equal(abilitySystem.tryUseDecisiveCommand(state, loadout), true);
    assert.equal(player.abilities.decisiveCommand.charges, 0);
    abilitySystem.update(state, loadout, 18.01);
    assert.equal(player.abilities.decisiveCommand.charges, 1);
  }
});

test("战斗 UI 使用对称分区、固定槽位和原生血条", () => {
  const css = fs.readFileSync(path.resolve(__dirname, "../src/h5/ui/battleUiView.css"), "utf8");
  const view = fs.readFileSync(path.resolve(__dirname, "../src/h5/ui/battleUiView.js"), "utf8");
  assert.match(css, /--battle-rail-size:\s*56px/);
  assert.match(css, /grid-template-rows:\s*var\(--battle-rail-size\) minmax\(0, 1fr\) var\(--battle-rail-size\)/);
  assert.match(css, /\.battle-screen \.battle-rail\s*\{/);
  assert.doesNotMatch(css, /!important|transform:\s*scale\(/);
  assert.match(view, /<progress data-ui="health"/);
  assert.match(view, /<progress data-ui="boss"/);
  assert.match(view, /for \(var i = 0; i < 4; i \+= 1\)/);
  assert.match(view, /for \(var i = 0; i < 6; i \+= 1\)/);
  assert.match(view, /dataset\.auto/);
  assert.match(view, /dataset\.status/);
  assert.match(view, /手动/);
  assert.match(view, /自动/);
  assert.match(view, /释放中/);
  assert.match(view, /冷却/);
  assert.doesNotMatch(view + css, /insurance|passiveSlots|battle-passive/);
});

test("旧保险和自动被动技能运行时代码已经删除", () => {
  const files = [
    "src/shared/assets.js",
    "src/shared/battleRules.js",
    "src/h5/meta/combatStats.js",
    "src/h5/battle/battleState.js",
    "src/h5/battle/abilitySystem.js",
    "src/h5/battle/collisionSystem.js",
    "src/h5/battle/weaponSystem.js",
    "src/h5/app/gameEventRouter.js",
    "src/h5/app/gameApp.js",
    "src/h5/app/battleUiController.js",
    "src/h5/ui/battleUiView.js",
    "src/h5/ui/battleUiView.css"
  ];
  const combined = files.map((file) => fs.readFileSync(path.resolve(__dirname, "..", file), "utf8")).join("\n");
  assert.doesNotMatch(combined, /insurance|passiveSkill|passiveSlots|passiveLastAt|onVolleyFired|tryUseInsurance|clearForInsurance/);
});

test("战场尺寸和四边活动范围只由 battleGeometry 提供", () => {
  assert.equal(battleGeometry.DEFAULT_FIELD.width, 960);
  assert.equal(battleGeometry.DEFAULT_FIELD.height, 473);
  const state = { field: battleGeometry.createField(), player: { x: -50, y: 999 } };
  battleGeometry.clampPlayer(state, state.player);
  assert.equal(state.player.x, state.field.playerLeft);
  assert.equal(state.player.y, state.field.height - state.field.playerBottom);
  const battleDir = path.resolve(__dirname, "../src/h5/battle");
  const offenders = fs.readdirSync(battleDir)
    .filter((name) => name.endsWith(".js") && name !== "battleGeometry.js")
    .filter((name) => /\b(?:960|540)\b/.test(fs.readFileSync(path.join(battleDir, name), "utf8")));
  assert.deepEqual(offenders, []);
});

test("中文目录下的动态贴图地址不会被二次编码", () => {
  const assetsSource = fs.readFileSync(path.resolve(__dirname, "../src/shared/assets.js"), "utf8");
  const frameUrl = pathToFileURL(path.resolve(__dirname, "../src/h5/game-frame.html"));
  const context = { URL, location: frameUrl, console };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(assetsSource, context);
  const shipUrl = context.RXGame.assets.SHIP_ASSETS[0].battleSrc;
  assert.match(shipUrl, /^file:/);
  assert.match(shipUrl, /%[0-9A-F]{2}/i);
  assert.doesNotMatch(shipUrl, /%25[0-9A-F]{2}/i);

  const missingAssets = [];
  const checkedAssets = new Set();
  (function collect(value) {
    if (typeof value === "string" && value.startsWith("file:") && value.includes("/assets/runtime/")) {
      if (!checkedAssets.has(value)) {
        checkedAssets.add(value);
        if (!fs.existsSync(fileURLToPath(value))) missingAssets.push(value);
      }
      return;
    }
    if (!value || typeof value !== "object") return;
    for (const child of Object.values(value)) collect(child);
  })(context.RXGame.assets);
  assert.ok(checkedAssets.size > 100, `只检查到 ${checkedAssets.size} 个动态素材`);
  assert.deepEqual(missingAssets, []);

  for (const file of [
    "src/h5/app/gameApp.js",
    "src/h5/battle/canvasRenderer.js",
    "src/h5/ui/lobbyView.js",
    "src/h5/ui/pilotGalleryView.js",
    "src/h5/ui/shipGalleryView.js"
  ]) {
    assert.doesNotMatch(fs.readFileSync(path.resolve(__dirname, "..", file), "utf8"), /encodeURI\(/, file);
  }
});
