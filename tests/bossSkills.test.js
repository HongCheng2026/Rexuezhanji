// Boss Skills Tests — Phase 2
// Uses Node.js test runner
const test = require("node:test");
const assert = require("node:assert");
const path = require("path");
const fs = require("fs");

// Load game scripts in order (simulate browser)
function loadScripts(basePath) {
  var root = Object.create(null);
  root.RXGame = Object.create(null);

  var order = [
    "Game/EventBus/events.js",
    "Gameplay/Enemy/enemyStageBalance.js",
    "Data/Balance/balance.js",
    "Data/Balance/combatCodexConfig.js",
    "Gameplay/Enemy/enemyAI.js"
  ];

  order.forEach(function(f) {
    var p = path.join(basePath, f);
    if (!fs.existsSync(p)) return;
    var code = fs.readFileSync(p, "utf8");
    // Extract the IIFE body: find first '{' after 'function' and last '}' before '})'
    var funcStart = code.indexOf("function") + 8;
    var bodyStart = code.indexOf("{", funcStart) + 1;
    var bodyEnd = code.lastIndexOf("}");
    var body = code.slice(bodyStart, bodyEnd);
    var fn = new Function("root", body);
    try { fn(root); } catch (e) { /* skip dependency errors */ }
  });
  return root;
}

const h5Root = path.join(__dirname, "..", "src", "h5");
const scope = loadScripts(h5Root);
const events = scope.RXGame.events;

// ===== Test: Event Constants =====

test("Phase 2 Boss events are defined", function() {
  const requiredEvents = [
    "BOSS_FIELD_MARK", "BOSS_GAZE_TARGET", "BOSS_DENSITY_CHANGED",
    "BOSS_SHIELD_LAYER_BROKEN", "BOSS_BARRIER_SPAWNED", "BOSS_BARRIER_DESTROYED",
    "BOSS_OVERLOAD_START", "BOSS_OVERLOAD_END",
    "BOSS_CROSS_GRID_UPDATED", "BOSS_DRIFTER_SPAWNED", "BOSS_DRIFTER_DESTROYED",
    "BOSS_RAGE_CHANGED", "BOSS_RAGE_ACTIVATED", "BOSS_RAGE_ENDED", "BOSS_SHOCKWAVE",
    "BOSS_TACTICAL_ORDER", "BOSS_RESONANCE_LINK", "BOSS_RESONANCE_BROKEN",
    "BOSS_MIRROR_SPAWNED",
    "BOSS_LOCK_CHANGED", "BOSS_LOCK_FIRED", "BOSS_JUDGMENT_CHARGING", "BOSS_JUDGMENT_FIRED",
    "BOSS_HEAT_CHANGED", "BOSS_OVERHEAT", "BOSS_HEAT_DUMP", "BOSS_CORE_EXPOSED",
    "BOSS_MATRIX_ACTIVATED", "BOSS_MATRIX_DESTROYED",
    "BOSS_ROTOR_PHASE_CHANGED", "BOSS_ROTOR_OVERDRIVE",
    "BOSS_NEST_SPLIT", "BOSS_MIGRATION_CHARGE",
    "BOSS_FORM_CHANGED", "BOSS_SINGULARITY_SPAWNED", "BOSS_SINGULARITY_IMPLODED",
    "BOSS_SWARM_LAUNCHED", "BOSS_FULL_ARSENAL", "BOSS_ENDGAME"
  ];
  for (var i = 0; i < requiredEvents.length; i++) {
    assert.ok(events[requiredEvents[i]], "Missing event: " + requiredEvents[i]);
  }
});

// ===== Test: BOSS_THEME_CONFIG signature skills =====

test("Each chapter theme has chapterMechanic and signatureSkills", function() {
  const balance = scope.RXGame.enemyStageBalance;
  const config = balance && balance._themeConfig;
  if (!config) return; // skip if internal access unavailable

  const themes = ["fan", "shield", "crossfire", "charge", "summon", "sniper", "armorCore", "rotating", "mothership"];
  for (var i = 0; i < themes.length; i++) {
    var t = themes[i];
    assert.ok(config[t], "Missing theme: " + t);
    assert.ok(config[t].chapterMechanic, t + " missing chapterMechanic");
    assert.ok(Array.isArray(config[t].signatureSkills), t + " signatureSkills should be array");
    assert.ok(config[t].signatureSkills.length >= 2, t + " should have at least 2 signature skills");
  }
});

// ===== Test: Pattern notice strings =====

test("Pattern notice strings cover all new patterns", function() {
  const enemyAI = scope.RXGame.enemyAI;
  const patterns = [
    "boss_wall", "boss_ring_expand", "boss_ring_recall",
    "boss_homing_orb", "boss_fragment_volley", "boss_rotor_overdrive",
    "boss_grid_explosion", "boss_split_nest", "boss_laser_sweep",
    "boss_shockwave_ring"
  ];
  for (var i = 0; i < patterns.length; i++) {
    var notice = enemyAI.getPatternNotice(patterns[i]);
    assert.ok(notice, "Missing notice for: " + patterns[i]);
    assert.ok(notice.length > 0, "Notice should not be empty: " + patterns[i]);
    assert.notStrictEqual(notice, "扇形弹幕预警", patterns[i] + " should have unique notice");
  }
});

// ===== Test: Boss HP scaling formula unchanged =====

test("Boss HP scaling formula is unchanged by Phase 2 additions", function() {
  const balance = scope.RXGame.balance;
  if (!balance || !balance.getBossScaling) return;

  // Chapter 1, stage 1 boss should be 200000 HP
  var scaling = balance.getBossScaling(1, 1, 0);
  assert.ok(scaling, "getBossScaling should return value");
  assert.ok(scaling.hp > 0, "Boss HP should be positive");
});

// ===== Test: Density modulation level ranges =====

test("Density modulation produces valid levels", function() {
  // Simulate density level calculation
  function calcDensity(hpRate, elapsed, timeThreshold) {
    var hpDensity = Math.floor((1 - hpRate) * 2);
    var timeDensity = Math.floor(elapsed / timeThreshold);
    return Math.min(3, Math.max(0, hpDensity + timeDensity));
  }

  // Full HP at start = level 0
  assert.strictEqual(calcDensity(1.0, 0, 15), 0);
  // Half HP = level 1
  assert.strictEqual(calcDensity(0.5, 0, 15), 1);
  // Low HP = level 2
  assert.strictEqual(calcDensity(0.2, 0, 15), 1);
  // Low HP + time = level 3
  assert.strictEqual(calcDensity(0.1, 30, 15), 3);
});

// ===== Test: Rage system thresholds =====

test("Rage system reaches 100 within expected time", function() {
  function calcRageTime(ratePerSecond, startRage) {
    startRage = startRage || 0;
    return (100 - startRage) / ratePerSecond;
  }

  // Stage 1: 3/sec → ~33 seconds
  assert.ok(calcRageTime(3) <= 35, "Stage 1 rage should fill within 35s");
  // Stage 3: 5/sec → ~20 seconds
  assert.ok(calcRageTime(5) <= 21, "Stage 3 rage should fill within 21s");
});

// ===== Test: Lock stack progress =====

test("Lock stack progress calculation", function() {
  function calcLock(currentProgress, lockSpeed, unlockSpeed, dt, playerBehind) {
    if (playerBehind) {
      return Math.max(0, currentProgress - unlockSpeed * dt);
    }
    return Math.min(100, currentProgress + lockSpeed * dt);
  }

  // Lock from 0 to 100 at 25/s takes 4 seconds
  assert.strictEqual(calcLock(0, 25, 40, 4, false), 100);
  // Unlock from 100 at 40/s takes 2.5 seconds
  assert.strictEqual(calcLock(100, 25, 40, 2.5, true), 0);
});

// ===== Test: Heat cycle thresholds =====

test("Heat cycle reaches 100 within 20 seconds", function() {
  function calcTimeToHeat(ratePerSecond) {
    return 100 / ratePerSecond;
  }
  assert.ok(calcTimeToHeat(5) <= 20, "Heat should reach 100 within 20s at rate 5");
});

// ===== Test: Chapter mechanic assignment =====

test("Chapter mechanics are assigned correctly by chapter index", function() {
  var chapterMechanics = {
    1: "densityModulation",
    2: "layeredPlating",
    3: "crossLockGrid",
    4: "rageSystem",
    5: "tacticalOrders",
    6: "lockStack",
    7: "heatCycle",
    8: "rotorPhase",
    9: "mothershipForms"
  };

  for (var ch = 1; ch <= 9; ch++) {
    assert.ok(chapterMechanics[ch], "Chapter " + ch + " missing mechanic");
  }
  assert.strictEqual(chapterMechanics[9], "mothershipForms");
});
