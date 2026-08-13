"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

// --- 组装最小战斗作用域：真实 activeSkillSystem + 4 个新主动技能处理器 ---
// 注意：activeSkillSystem 在加载时即捕获 scope.events，因此必须在 require 之前装好事件/总线/战斗原语。
global.RXGame = {};
const RXGame = global.RXGame;
RXGame.events = {
  SKILL_ACTIVATED: "skill:activated",
  ENEMY_HIT: "enemy:hit",
  PLAYER_DAMAGED: "player:damaged",
  PLAYER_DIED: "player:died"
};
RXGame.bus = { emit: function () {} };
RXGame.weaponSystem = {
  getReferenceVolleyDamage: function () { return 100; },
  createBullet: function (x, y, angle, type, damage, speed, radius, color, opts) {
    return { x: x, y: y, angle: angle, type: type, damage: damage, speed: speed, radius: radius, color: color, owner: opts && opts.owner };
  }
};
RXGame.collisionSystem = {
  damageArea: function (state, source, radius, damage) {
    state.damageAreaCalls = (Number(state.damageAreaCalls) || 0) + 1;
    var hits = 0;
    var targets = (state.enemies || []).slice();
    if (state.boss) targets.push(state.boss);
    targets.forEach(function (t) {
      if (t.dead) return;
      var d = Math.sqrt((t.x - source.x) * (t.x - source.x) + (t.y - source.y) * (t.y - source.y));
      if (d <= radius + (t.radius || 0)) { t.hp -= damage; hits += 1; if (t.hp <= 0) t.dead = true; }
    });
    return { hits: hits };
  }
};
require("../src/h5/Data/Config/skillGradeConfig.js");
require("../src/h5/Gameplay/Ability/activeSkillSystem.js");
require("../src/h5/Gameplay/Ability/activeSummonWingman.js");
require("../src/h5/Gameplay/Ability/activeDecoy.js");
require("../src/h5/Gameplay/Ability/activeChainLightning.js");
require("../src/h5/Gameplay/Ability/activeBlackHole.js");

function makeState() {
  return {
    mode: "fight",
    player: { x: 100, y: 400, hp: 100, maxHp: 100, decoyShieldRemaining: 0, phaseShieldRemaining: 0 },
    enemies: [{ id: "e1", x: 300, y: 400, hp: 100, maxHp: 100, radius: 20, canTakeDamage: true, dead: false }],
    bullets: [],
    skillEffects: [],
    allies: [],
    blackHoleFields: [],
    elapsed: 0
  };
}

function makeLoadout(skillId, grade, duration, cooldown, charges) {
  var skill = { id: skillId, grade: grade, duration: duration, cooldown: cooldown };
  if (charges != null) skill.charges = charges;
  return { abilities: { activeSlots: [skill] } };
}

function makeRuntime(skillId, duration, cooldown, charges) {
  return {
    id: skillId,
    cooldown: cooldown,
    cooldownTimer: 0,
    duration: duration,
    activeRemaining: 0,
    autoEnabled: false,
    castLocked: false,
    data: null,
    charges: charges == null ? null : charges
  };
}

function cast(state, loadout, runtime) {
  state.player.abilities = { activeSlots: [runtime] };
  return RXGame.activeSkillSystem.tryCastActiveSlot(state, loadout, 0, "manual");
}

test("canEquipSkill：主动技能品级受战机品级限制，被动技能不受限", () => {
  const cfg = require("../src/h5/Data/Config/skillGradeConfig.js");
  assert.equal(cfg.canEquipSkill({ type: "active", grade: "SSS", fighterTier: "B" }), false);
  assert.equal(cfg.canEquipSkill({ type: "active", grade: "B", fighterTier: "B" }), true);
  assert.equal(cfg.canEquipSkill({ type: "active", grade: "S", fighterTier: "SS" }), true);
  assert.equal(cfg.canEquipSkill({ type: "passive", grade: 9, fighterTier: "B" }), true);
});

test("召唤僚机：激活生成僚机，update 后发射玩家子弹", () => {
  const state = makeState();
  const loadout = makeLoadout("active-summon-wingman", "D", 12, 25, 1);
  const runtime = makeRuntime("active-summon-wingman", 12, 25, 1);
  const ok = cast(state, loadout, runtime);
  assert.equal(ok, true);
  assert.equal(state.allies.length, 1); // D 级 1 僚机
  assert.equal(runtime.activeRemaining, 12);
  // 让敌机处于僚机前向锥内（与僚机同高，验证“前向弧内自动开火”）
  state.enemies[0].y = state.allies[0].y;
  RXGame.activeSkillSystem.update(state, loadout, 0.3);
  assert.ok(state.bullets.length > 0, "僚机应向敌人开火");
});

test("替身木：激活后玩家进入免疫护盾", () => {
  const state = makeState();
  const loadout = makeLoadout("active-decoy", "D", 1.0, 20);
  const runtime = makeRuntime("active-decoy", 1.0, 20);
  cast(state, loadout, runtime);
  assert.ok(state.player.decoyShieldRemaining > 0);
});

test("连锁闪电：激活即对敌人造成伤害并留下电弧特效", () => {
  const state = makeState();
  const loadout = makeLoadout("active-chain-lightning", "D", 0, 20);
  const runtime = makeRuntime("active-chain-lightning", 0, 20);
  const before = state.enemies[0].hp;
  cast(state, loadout, runtime);
  assert.ok(state.enemies[0].hp < before, "敌人应受连锁伤害");
  assert.ok(state.skillEffects.some(function (e) { return e.activeSkillId === "active-chain-lightning"; }), "应留下电弧特效");
});

test("黑洞：激活生成黑洞场，update 持续灼烧敌人", () => {
  const state = makeState();
  state.field = { width: 1280, height: 720 };
  state.boss = { id: "boss", x: 1080, y: 220, hp: 1000, maxHp: 1000, radius: 60, canTakeDamage: true, dead: false };
  state.enemies[0].x = state.player.x + 500;
  const loadout = makeLoadout("active-black-hole", "D", 2.0, 20);
  const runtime = makeRuntime("active-black-hole", 2.0, 20);
  cast(state, loadout, runtime);
  assert.equal(state.blackHoleFields.length, 1);
  assert.equal(state.blackHoleFields[0].x, state.player.x + 500, "黑洞应固定生成在战机正前方约 500px");
  assert.equal(state.blackHoleFields[0].y, state.player.y);
  assert.notEqual(state.blackHoleFields[0].x, state.boss.x, "Boss 存在时也不能把黑洞吸附到 Boss 身上");
  const before = state.enemies[0].hp;
  RXGame.activeSkillSystem.update(state, loadout, 0.5);
  assert.ok(state.enemies[0].hp < before, "黑洞应持续灼烧敌人");
});

test("召唤僚机：每次只部署一架，SSS 级四次释放后才达到四架上限", () => {
  const state = makeState();
  const loadout = makeLoadout("active-summon-wingman", "SSS", 12, 25, 4);
  const runtime = makeRuntime("active-summon-wingman", 12, 25, 4);
  runtime.maxCharges = 4;
  for (let index = 0; index < 4; index += 1) {
    runtime.cooldownTimer = 0;
    runtime.activeRemaining = 0;
    assert.equal(cast(state, loadout, runtime), true);
    assert.equal(state.allies.length, index + 1);
  }
  assert.equal(state.allies.length, 4);
  assert.equal(runtime.charges, 0);
});

test("可充能技能从一充开始并按自身周期储存到上限", () => {
  const runtime = makeRuntime("active-summon-wingman", 12, 25, 1);
  runtime.maxCharges = 4;
  runtime.rechargeSeconds = 2;
  runtime.rechargeTimer = 2;

  RXGame.activeSkillSystem.updateChargeRuntime(runtime, 6.1);

  assert.equal(runtime.charges, 4);
  assert.equal(runtime.rechargeTimer, 0);
});

test("black hole damage is throttled to ten ticks per second instead of running every frame", () => {
  const state = makeState();
  const loadout = makeLoadout("active-black-hole", "SSS", 5.0, 20);
  const runtime = makeRuntime("active-black-hole", 5.0, 20);
  cast(state, loadout, runtime);
  state.damageAreaCalls = 0;
  for (let frame = 0; frame < 60; frame += 1) {
    RXGame.activeSkillSystem.update(state, loadout, 1 / 60);
  }
  assert.ok(state.damageAreaCalls >= 9 && state.damageAreaCalls <= 10, "damage ticks should stay near 10Hz");
});
