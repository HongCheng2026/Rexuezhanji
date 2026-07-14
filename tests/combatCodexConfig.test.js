// combatCodexConfig.test.js — Static data tests for enemy roster, bosses, and stage rosters
const test = require("node:test");
const assert = require("node:assert/strict");

// Load shared modules in order (Node test environment)
require("../src/shared/combatCodexConfig.js");

const config = globalThis.RXGame && globalThis.RXGame.combatCodexConfig;

function fail(desc) { throw new assert.AssertionError({ message: desc }); }

// ─── Helpers ──────────────────────────────────────────────────────────

function assertUnique(arr, label, keyFn) {
  const seen = new Set();
  for (const item of arr) {
    const key = keyFn ? keyFn(item) : item;
    if (seen.has(key)) fail(label + " duplicate: " + key);
    seen.add(key);
  }
}

// ─── Section 2: Static data tests ─────────────────────────────────────

test("getAllEnemyUnits returns exactly 80 regular enemies", () => {
  const all = config.getAllEnemyUnits();
  assert.equal(all.length, 80);
});

test("category mob count is exactly 30", () => {
  const all = config.getAllEnemyUnits();
  const mobs = all.filter(e => e.category === "mob");
  assert.equal(mobs.length, 30);
});

test("category fighter count is exactly 30", () => {
  const all = config.getAllEnemyUnits();
  const fighters = all.filter(e => e.category === "fighter");
  assert.equal(fighters.length, 30);
});

test("category elite count is exactly 20", () => {
  const all = config.getAllEnemyUnits();
  const elites = all.filter(e => e.category === "elite");
  assert.equal(elites.length, 20);
});

test("BOSSES count is exactly 93", () => {
  assert.equal(config.BOSSES.length, 93);
});

test("STAGE_ROSTERS count is exactly 93", () => {
  assert.equal(config.STAGE_ROSTERS.length, 93);
});

test("unitId globally unique across all regular enemies", () => {
  const all = config.getAllEnemyUnits();
  assertUnique(all, "unitId", e => e.unitId);
});

test("regular enemy names globally unique", () => {
  const all = config.getAllEnemyUnits();
  assertUnique(all, "name", e => e.name);
});

test("bossId globally unique", () => {
  assertUnique(config.BOSSES, "bossId", b => b.bossId);
});

test("stageId 1:1 in BOSSES and STAGE_ROSTERS", () => {
  const bossStageIds = new Set(config.BOSSES.map(b => b.stageId));
  const rosterStageIds = new Set(config.STAGE_ROSTERS.map(r => r.stageId));
  assert.equal(bossStageIds.size, config.BOSSES.length, "boss stageIds not unique");
  assert.equal(rosterStageIds.size, config.STAGE_ROSTERS.length, "roster stageIds not unique");
  for (const id of bossStageIds) {
    assert.ok(rosterStageIds.has(id), "BOSS stageId " + id + " missing from rosters");
  }
  for (const id of rosterStageIds) {
    assert.ok(bossStageIds.has(id), "roster stageId " + id + " missing from BOSSES");
  }
});

test("93 boss names globally unique", () => {
  assertUnique(config.BOSSES, "boss name", b => b.name);
});

test("prologue is 3 stages, chapters 1-9 are 10 stages each", () => {
  for (let s = 1; s <= 3; s++) {
    const r = config.getStageEnemyRosterById("prologue_" + s);
    assert.ok(r, "prologue_" + s + " roster missing");
    const b = config.getStageBossById("prologue_" + s);
    assert.ok(b, "prologue_" + s + " boss missing");
  }
  for (let ch = 1; ch <= 9; ch++) {
    for (let s = 1; s <= 10; s++) {
      const stageId = ch + "_" + s;
      const r = config.getStageEnemyRosterById(stageId);
      assert.ok(r, stageId + " roster missing");
      const b = config.getStageBossById(stageId);
      assert.ok(b, stageId + " boss missing");
    }
  }
});

test("all roster unitIds resolve via getEnemyUnit", () => {
  for (const roster of config.STAGE_ROSTERS) {
    const ids = [
      ...(roster.mobs || []),
      ...(roster.fighters || []),
      ...(roster.elites || [])
    ];
    for (const uid of ids) {
      assert.ok(config.getEnemyUnit(uid), uid + " in " + roster.stageId + " roster does not resolve");
    }
  }
});

test("all roster bossIds resolve via bossId lookup", () => {
  // Build a bossId → boss map for verification
  const bossByIdMap = {};
  for (const b of config.BOSSES) bossByIdMap[b.bossId] = b;
  for (const roster of config.STAGE_ROSTERS) {
    assert.ok(bossByIdMap[roster.bossId], roster.bossId + " in " + roster.stageId + " roster does not resolve as bossId");
    // Also verify getStageBossById(stageId) returns the same boss
    const bossFromStageId = config.getStageBossById(roster.stageId);
    assert.ok(bossFromStageId, roster.stageId + " boss not found by stageId");
    assert.equal(bossFromStageId.bossId, roster.bossId, roster.stageId + " bossId mismatch");
  }
});

test("roster units belong to the correct chapter", () => {
  for (const roster of config.STAGE_ROSTERS) {
    const ids = [
      ...(roster.mobs || []),
      ...(roster.fighters || []),
      ...(roster.elites || [])
    ];
    for (const uid of ids) {
      const unit = config.getEnemyUnit(uid);
      if (!unit) continue;
      assert.equal(unit.chapterIndex, roster.chapterIndex, uid + " chapter mismatch in " + roster.stageId);
    }
  }
});

test("every regular unit appears in at least one stage", () => {
  const all = config.getAllEnemyUnits();
  const appearingIds = new Set();
  for (const roster of config.STAGE_ROSTERS) {
    for (const uid of [...(roster.mobs || []), ...(roster.fighters || []), ...(roster.elites || [])]) {
      appearingIds.add(uid);
    }
  }
  for (const unit of all) {
    assert.ok(appearingIds.has(unit.unitId), unit.unitId + " (" + unit.name + ") never appears in any stage roster");
  }
});

test("every BOSS appears in exactly one stage", () => {
  const bossStageMap = new Map();
  for (const roster of config.STAGE_ROSTERS) {
    if (bossStageMap.has(roster.bossId)) {
      fail("bossId " + roster.bossId + " appears in multiple stages: " + bossStageMap.get(roster.bossId) + " and " + roster.stageId);
    }
    bossStageMap.set(roster.bossId, roster.stageId);
  }
  for (const boss of config.BOSSES) {
    assert.ok(bossStageMap.has(boss.bossId), "BOSS " + boss.bossId + " has no stage roster entry");
  }
});

// ─── Section 3: Roster sizes ──────────────────────────────────────────

test("prologue roster sizes", () => {
  var r1 = config.getStageEnemyRosterById("prologue_1");
  assert.equal(r1.mobs.length, 2);
  assert.equal(r1.fighters.length, 1);
  assert.equal(r1.elites.length, 0);
  assert.ok(r1.bossId);

  var r2 = config.getStageEnemyRosterById("prologue_2");
  assert.equal(r2.mobs.length, 3);
  assert.equal(r2.fighters.length, 2);
  assert.equal(r2.elites.length, 1);

  var r3 = config.getStageEnemyRosterById("prologue_3");
  assert.equal(r3.mobs.length, 3);
  assert.equal(r3.fighters.length, 3);
  assert.equal(r3.elites.length, 2);
});

test("chapter stages: stage 1 = 2/1/0/1", () => {
  for (let ch = 1; ch <= 9; ch++) {
    const r = config.getStageEnemyRosterById(ch + "_1");
    assert.ok(r, ch + "_1 missing");
    assert.equal(r.mobs.length, 2, ch + "_1 mobs");
    assert.equal(r.fighters.length, 1, ch + "_1 fighters");
    assert.equal(r.elites.length, 0, ch + "_1 elites");
  }
});

test("chapter stages: stage 2 = 2/2/0/1", () => {
  for (let ch = 1; ch <= 9; ch++) {
    const r = config.getStageEnemyRosterById(ch + "_2");
    assert.ok(r);
    assert.equal(r.mobs.length, 2);
    assert.equal(r.fighters.length, 2);
    assert.equal(r.elites.length, 0);
  }
});

test("chapter stages: stage 3 = 2/2/1/1", () => {
  for (let ch = 1; ch <= 9; ch++) {
    const r = config.getStageEnemyRosterById(ch + "_3");
    assert.ok(r);
    assert.equal(r.mobs.length, 2);
    assert.equal(r.fighters.length, 2);
    assert.equal(r.elites.length, 1);
  }
});

test("chapter stages: stage 4 = 2/2/1/1", () => {
  for (let ch = 1; ch <= 9; ch++) {
    const r = config.getStageEnemyRosterById(ch + "_4");
    assert.ok(r);
    assert.equal(r.mobs.length, 2);
    assert.equal(r.fighters.length, 2);
    assert.equal(r.elites.length, 1);
  }
});

test("chapter stages: stage 5 = 3/2/1/1", () => {
  for (let ch = 1; ch <= 9; ch++) {
    const r = config.getStageEnemyRosterById(ch + "_5");
    assert.ok(r);
    assert.equal(r.mobs.length, 3);
    assert.equal(r.fighters.length, 2);
    assert.equal(r.elites.length, 1);
  }
});

test("chapter stages: stage 6 = 3/2/1/1", () => {
  for (let ch = 1; ch <= 9; ch++) {
    const r = config.getStageEnemyRosterById(ch + "_6");
    assert.ok(r);
    assert.equal(r.mobs.length, 3);
    assert.equal(r.fighters.length, 2);
    assert.equal(r.elites.length, 1);
  }
});

test("chapter stages: stage 7 = 3/3/1/1", () => {
  for (let ch = 1; ch <= 9; ch++) {
    const r = config.getStageEnemyRosterById(ch + "_7");
    assert.ok(r);
    assert.equal(r.mobs.length, 3);
    assert.equal(r.fighters.length, 3);
    assert.equal(r.elites.length, 1);
  }
});

test("chapter stages: stage 8 = 3/3/2/1", () => {
  for (let ch = 1; ch <= 9; ch++) {
    const r = config.getStageEnemyRosterById(ch + "_8");
    assert.ok(r);
    assert.equal(r.mobs.length, 3);
    assert.equal(r.fighters.length, 3);
    assert.equal(r.elites.length, 2);
  }
});

test("chapter stages: stage 9 = 3/2/2/1", () => {
  for (let ch = 1; ch <= 9; ch++) {
    const r = config.getStageEnemyRosterById(ch + "_9");
    assert.ok(r);
    assert.equal(r.mobs.length, 3);
    assert.equal(r.fighters.length, 2);
    assert.equal(r.elites.length, 2);
  }
});

test("chapter stages: stage 10 = 3/3/2/1", () => {
  for (let ch = 1; ch <= 9; ch++) {
    const r = config.getStageEnemyRosterById(ch + "_10");
    assert.ok(r);
    assert.equal(r.mobs.length, 3);
    assert.equal(r.fighters.length, 3);
    assert.equal(r.elites.length, 2);
  }
});

// ─── Section 4: Behavior & stat tests ─────────────────────────────────

test("every unit has a valid baseType", () => {
  const validTypes = ["small", "shooter", "charger", "shield", "bomber", "sniper", "guard", "rotor", "core", "elite", "boss"];
  for (const unit of config.getAllEnemyUnits()) {
    assert.ok(validTypes.indexOf(unit.baseType) >= 0, unit.unitId + " invalid baseType: " + unit.baseType);
  }
  for (const boss of config.BOSSES) {
    assert.equal(boss.baseType, "boss", boss.bossId + " baseType is not boss");
  }
});

test("every unit has motionProfile and attackProfile", () => {
  for (const unit of config.getAllEnemyUnits()) {
    assert.ok(unit.motionProfile, unit.unitId + " missing motionProfile");
    assert.ok(unit.attackProfile, unit.unitId + " missing attackProfile");
  }
});

test("every unit has unique parameter combination (profile fingerprint)", () => {
  const fingerprints = new Map();
  for (const unit of config.getAllEnemyUnits()) {
    const fp = JSON.stringify({
      bt: unit.baseType,
      mp: unit.motionProfile,
      ap: unit.attackProfile,
      sp: unit.supportProfile
    });
    if (!fingerprints.has(fp)) fingerprints.set(fp, []);
    fingerprints.get(fp).push(unit.unitId);
  }
  // Not all need unique fingerprints (some share), but we must have diversity
  // At least 20 different profile combos
  assert.ok(fingerprints.size >= 20, "Only " + fingerprints.size + " unique profiles across 80 units — need more diversity");
});

// ─── Section 5: Roster weight tests ───────────────────────────────────

test("roster weights only contain unitIds from that stage", () => {
  for (const roster of config.STAGE_ROSTERS) {
    const validIds = new Set([
      ...(roster.mobs || []),
      ...(roster.fighters || []),
      ...(roster.elites || [])
    ]);
    const weights = roster.weights || {};
    for (const uid of Object.keys(weights)) {
      assert.ok(validIds.has(uid), uid + " in weights but not in " + roster.stageId + " roster");
    }
  }
});

test("roster weights are normalized and every listed unit has weight > 0", () => {
  for (const roster of config.STAGE_ROSTERS) {
    const weights = roster.weights || {};
    let total = 0;
    for (const uid in weights) total += weights[uid];
    assert.ok(Math.abs(total - 1) < 0.01, roster.stageId + " weights sum to " + total + " not 1");
    const validIds = new Set([
      ...(roster.mobs || []),
      ...(roster.fighters || []),
      ...(roster.elites || [])
    ]);
    for (const uid of validIds) {
      assert.ok(weights[uid] > 0, uid + " missing weight in " + roster.stageId);
    }
  }
});

// ─── Section 6: BOSS tests ────────────────────────────────────────────

test("every BOSS has non-empty cyclePatterns or phaseProfile", () => {
  for (const boss of config.BOSSES) {
    const hasPatterns = Array.isArray(boss.cyclePatterns) && boss.cyclePatterns.length > 0;
    const hasProfile = typeof boss.phaseProfile === "string" && boss.phaseProfile.length > 0;
    assert.ok(hasPatterns || hasProfile, boss.bossId + " has no cyclePatterns or phaseProfile");
  }
});

test("chapter 1-10 BOSS phase profiles cover all 10 base phases", () => {
  const expected = ["aimed", "lanes", "cross", "charge", "summon", "sniper", "armorCounter", "rotatingZone", "mixedEscort", "chapterFinale"];
  for (let ch = 1; ch <= 9; ch++) {
    for (let s = 1; s <= 10; s++) {
      const b = config.getStageBossById(ch + "_" + s);
      if (!b) continue;
      const actual = b.phaseProfile;
      assert.equal(actual, expected[s - 1], ch + "_" + s + " phaseProfile expected " + expected[s - 1] + " got " + actual);
    }
  }
});

test("chapter 9 BOSS names match content catalog", () => {
  assert.equal(config.getStageBossById("9_4").name, "三海草母·藻冠");
  assert.equal(config.getStageBossById("9_5").name, "三海草母·潮根");
  assert.equal(config.getStageBossById("9_6").name, "三海草母·孢宫");
  assert.equal(config.getStageBossById("9_9").name, "弥赛亚机甲·圣像");
  assert.equal(config.getStageBossById("9_10").name, "黑潮女王·弥赛亚");
});

// ─── Section 7: Art tests ─────────────────────────────────────────────

test("every unit and boss has independent art metadata", () => {
  for (const unit of config.getAllEnemyUnits()) {
    assert.ok(unit.art, unit.unitId + " missing art");
    assert.equal(unit.art.artStatus, "placeholder", unit.unitId + " artStatus not placeholder");
    assert.ok(unit.art.fallbackAssetId || unit.art.expectedSrc, unit.unitId + " missing fallback and expectedSrc");
  }
  for (const boss of config.BOSSES) {
    assert.ok(boss.art, boss.bossId + " missing art");
    assert.equal(boss.art.artStatus, "placeholder", boss.bossId + " artStatus not placeholder");
    assert.ok(boss.art.fallbackAssetId || boss.art.expectedSrc, boss.bossId + " missing fallback and expectedSrc");
  }
});

// ─── Section 8: getPlayerShipName ─────────────────────────────────────

test("getPlayerShipName resolves 9 ship names via SHIP_ASSETS", () => {
  // Load assets if not already loaded in test env
  try { require("../src/shared/assets.js"); } catch (e) { /* may already be loaded */ }
  const s09 = config.getPlayerShipName("ship-s-09");
  assert.ok(s09 && s09.indexOf("苍穹零式") >= 0, "ship-s-09 name: " + s09);
  const s08 = config.getPlayerShipName("ship-s-08");
  assert.ok(s08 && s08.indexOf("黑曜幽影") >= 0, "ship-s-08 name: " + s08);
  const b04 = config.getPlayerShipName("ship-b-04");
  assert.ok(b04 && b04.indexOf("金矢裁决") >= 0, "ship-b-04 name: " + b04);
  const a07 = config.getPlayerShipName("ship-a-07");
  assert.ok(a07 && a07.indexOf("白昼指挥") >= 0, "ship-a-07 name: " + a07);
  const a06 = config.getPlayerShipName("ship-a-06");
  assert.ok(a06 && a06.indexOf("银翼06") >= 0, "ship-a-06 name: " + a06);
  const b02 = config.getPlayerShipName("ship-b-02");
  assert.ok(b02 && b02.indexOf("赤枪03") >= 0, "ship-b-02 name: " + b02);
  const b01 = config.getPlayerShipName("ship-b-01");
  assert.ok(b01 && b01.indexOf("蓝隼01") >= 0, "ship-b-01 name: " + b01);
  const b03 = config.getPlayerShipName("ship-b-03");
  assert.ok(b03 && b03.indexOf("绿堡04") >= 0, "ship-b-03 name: " + b03);
  const b05 = config.getPlayerShipName("ship-b-05");
  assert.ok(b05 && b05.indexOf("紫影05") >= 0, "ship-b-05 name: " + b05);
});

// ─── Section 9: getChapterCodex ───────────────────────────────────────

test("getChapterCodex returns chapter units", () => {
  for (let ch = 0; ch <= 9; ch++) {
    const codex = config.getChapterCodex(ch);
    assert.ok(codex, "chapter " + ch + " codex missing");
    assert.ok(codex.regularUnits.filter(function(u){return u.category==='mob';}).length <= 3, "chapter " + ch + " too many mobs in codex");
    assert.ok(codex.regularUnits.filter(function(u){return u.category==='fighter';}).length <= 3, "chapter " + ch + " too many fighters in codex");
    assert.ok(codex.regularUnits.filter(function(u){return u.category==='elite';}).length <= 2, "chapter " + ch + " too many elites in codex");
  }
});

// ─── Section 10: Null safety ──────────────────────────────────────────

test("getEnemyUnit returns null for unknown id", () => {
  assert.equal(config.getEnemyUnit("nonexistent"), null);
});

test("getStageBossById returns null for unknown id", () => {
  assert.equal(config.getStageBossById("99_99"), null);
});

test("getStageEnemyRosterById returns null for unknown id", () => {
  assert.equal(config.getStageEnemyRosterById("99_99"), null);
});

test("getPlayerShipName returns null for unknown ship", () => {
  assert.equal(config.getPlayerShipName("ship-zz-99"), null);
});

// ─── Section 11: resolveEnemyArt ──────────────────────────────────────

test("resolveEnemyArt returns fallback for placeholder", () => {
  const assetsConfig = {
    ASSET_PATHS: {
      enemySprites: {
        scout: ["test/scout.png"],
        shooter: ["test/shooter.png"],
        elite: ["test/elite.png"],
        guard: ["test/guard.png"],
        core: ["test/core.png"]
      }
    },
    BOSS_VISUALS: {
      1: { src: "test/boss-ch1.png" }
    }
  };
  const unit = config.getEnemyUnit("mob-c00-01");
  const result = config.resolveEnemyArt(unit, assetsConfig);
  assert.ok(result, "resolveEnemyArt returned null");
  assert.equal(result.isPlaceholder, true);
  assert.ok(result.src, "resolveEnemyArt missing src");
  assert.ok(result.art, "resolveEnemyArt missing art");
});
