"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

global.RXGame = {};
const RXGame = global.RXGame;
RXGame.events = { WEAPON_FIRED: "weapon:fired", WEAPON_UPGRADED: "weapon:upgraded" };
RXGame.bus = { emit() {} };

const calls = [];
RXGame.weaponSystem = {
  emitSpreadVolley(_state, _list, spec) { calls.push(["spread", spec]); return [{}]; },
  emitLaserVolley(_state, _list, spec) { calls.push(["laser", spec]); return [{}]; },
  emitMissileVolley(_state, _list, spec) { calls.push(["missile", spec]); return [{}]; },
  getReferenceVolleyDamage() { return 100; },
  isValidMissileTarget() { return true; },
  createBullet(x, y, angle, type, damage, speed, radius, color, options) {
    return { x, y, angle, type, damage, speed, radius, color, owner: options && options.owner };
  }
};
RXGame.collisionSystem = {
  damageArea(state, source, radius, damage) {
    for (const enemy of state.enemies || []) {
      if (!enemy.dead && Math.hypot(enemy.x - source.x, enemy.y - source.y) <= radius + (enemy.radius || 0)) {
        enemy.hp -= damage;
      }
    }
    return { hits: 1 };
  },
  canCancelEnemyBullet() { return true; }
};
RXGame.battleGeometry = { getField() { return { width: 1280, height: 720, noticeY: 80 }; }, scaleY(_state, value) { return value; } };

require("../src/h5/Data/Balance/balance.js");
require("../src/h5/World/Level/levels.js");
require("../src/h5/Presentation/Assets/assets.js");
const tacticalConfig = require("../src/h5/Gameplay/Fighter/tacticalLoadoutConfig.js");
require("../src/h5/Gameplay/Ability/shipSkills.js");
const profileSystem = require("../src/h5/Gameplay/Player/profile.js");
require("../src/h5/Data/Config/skillGradeConfig.js");
require("../src/h5/Gameplay/Fighter/tacticalLoadoutSystem.js");
const combatStats = require("../src/h5/Gameplay/Fighter/combatStats.js");
require("../src/h5/Gameplay/Ability/activeSkillSystem.js");
require("../src/h5/Gameplay/Ability/passiveSkillSystem.js");
require("../src/h5/Gameplay/Ability/skyLockBeam.js");
require("../src/h5/Gameplay/Ability/obsidianGravityWell.js");
require("../src/h5/Gameplay/Ability/goldJudgementBuff.js");
require("../src/h5/Gameplay/Ability/phaseShield.js");
const extensionWeaponSystem = require("../src/h5/Gameplay/Combat/extensionWeaponSystem.js");
const dropSystem = require("../src/h5/Gameplay/Combat/dropSystem.js");

function runtime(id, level = 3) {
  const definition = tacticalConfig.ALL_AUTO_SKILLS[id];
  const levelStats = tacticalConfig.getAutoSkillLevelStats(id, level);
  return {
    id,
    name: definition.name,
    category: definition.category,
    visualId: definition.visualId,
    level,
    nextFireAt: 0,
    activeRemaining: 0,
    resolvedStats: Object.assign({}, levelStats, {
      damagePerProjectile: 100,
      damagePerRing: 100,
      damagePerHit: 100,
      trajectoryCount: 3,
      coverageAngle: 24,
      projectileCount: 4,
      targetCount: 2,
      projectileSpeed: 620,
      pierceTargets: 4,
      armorPierceRatio: 0
    })
  };
}

function fightState() {
  return {
    mode: "fight",
    elapsed: 10,
    player: { x: 100, y: 300, hp: 40, maxHp: 100, phaseShieldRemaining: 0 },
    enemies: [{ id: "enemy-1", x: 240, y: 300, hp: 10000, maxHp: 10000, radius: 20, canTakeDamage: true }],
    bullets: [],
    enemyBullets: [],
    skillEffects: []
  };
}

test("三件局外武器使用可执行类别并进入各自底层发射器", () => {
  const state = { player: { x: 100, y: 300 }, bullets: [] };
  calls.length = 0;
  assert.equal(extensionWeaponSystem.fireRuntime(state, runtime("weapon_module_04"), {}), true);
  assert.equal(extensionWeaponSystem.fireRuntime(state, runtime("weapon_module_05"), {}), true);
  assert.equal(extensionWeaponSystem.fireRuntime(state, runtime("weapon_module_06"), {}), true);
  assert.deepEqual(calls.map((entry) => entry[0]), ["spread", "spread", "laser", "missile"]);
  assert.equal(calls[0][1].angle, -Math.PI / 2);
  assert.equal(calls[1][1].angle, Math.PI / 2);
});

test("冲击波和自动连锁闪电快照写入各自运行时伤害字段", () => {
  const profile = profileSystem.normalizeProfile({
    saveVersion: 8,
    starterRosterVersion: 2,
    scene: { shipId: "ship-ss-lingguang" },
    owned: { ships: ["ship-ss-lingguang"] },
    migrationFlags: { weaponModulesV7Refunded: true, activeSkillGradesV8Migrated: true, autoSkillLevelsV8Migrated: true },
    autoWeaponLevels: { "passive-shockwave": 3, "passive-chain-lightning": 4 },
    shipSkillLoadouts: {
      "ship-ss-lingguang": {
        activeSlots: [null, null, null, null],
        fixedWeaponOverrides: ["passive-shockwave", "passive-chain-lightning", null],
        autoWeaponIds: [null, null, null]
      }
    }
  });
  const loadout = combatStats.generateBattleLoadout(profile);
  const shockwave = loadout.autoSkills.slots[0];
  const chain = loadout.autoSkills.slots[1];
  assert.ok(shockwave.resolvedStats.damagePerRing > 1);
  assert.ok(chain.resolvedStats.damagePerHit > 1);
  assert.equal(shockwave.resolvedStats.damagePerRing, shockwave.resolvedStats.damagePerProjectile);
  assert.equal(chain.resolvedStats.damagePerHit, chain.resolvedStats.damagePerProjectile);
});

test("十一种局外自动技能都有可执行处理器并能在战斗状态触发", () => {
  const ids = Object.keys(tacticalConfig.ALL_AUTO_SKILLS);
  assert.equal(ids.length, 11);
  for (const id of ids) {
    const state = fightState();
    assert.equal(extensionWeaponSystem.fireRuntime(state, runtime(id), {}), true, id);
  }
});

test("自动技能调度直接使用同级配置射速，不读取局内武器等级", () => {
  const ids = Object.keys(tacticalConfig.ALL_AUTO_SKILLS);
  for (const id of ids) {
    const state = fightState();
    const skillRuntime = runtime(id, 5);
    state.player.weapons = { spread: 9, laser: 1, missile: 4 };
    state.player.weaponSkills = { meta: [skillRuntime], nextWakeAt: 0 };

    assert.equal(extensionWeaponSystem.update(state, {}, 1 / 60), true, id);
    const expected = state.elapsed + tacticalConfig.getAutoSkillLevelStats(id, 5).fireInterval;
    assert.equal(skillRuntime.nextFireAt, expected, id);
  }
});

test("局外自动技能替换固定武器后，局内升级道具不能改变该槽数据", () => {
  const state = fightState();
  state.player.weapons = { spread: 2, laser: 3, missile: 1 };
  state.player.disabledWeaponTypes = ["laser"];
  state.notices = [];

  dropSystem.applyPowerup(state, {}, "laser");

  assert.equal(state.player.weapons.laser, 3);
  assert.equal(state.notices.length, 0);
});
