/**
 * 图鉴模块单元测试 (codex.test.js) — v3.0（纯点亮 + 羁绊）
 *
 * v3.0 起加成只来自两层：
 *   1) 点亮单个单位（按原生品阶）
 *   2) 组合羁绊（覆盖全部成员）
 * 破甲唯一来源：2 个 SS（黑月 / 凌光）点亮各 +2% + 互为羁绊 +1% = 5%。
 *
 * 全点亮 + 全羁绊上限：攻击 +50 / 破甲 +5% / 金币 +10%。
 *
 * 运行: node --test tests/codex.test.js
 */
const { describe, it } = require("node:test");
const assert = require("node:assert");
const path = require("path");
const vm = require("vm");

// ── 构建测试用 RXGame 沙箱 ──

function buildSandbox(moduleCode, depCodes) {
  var sandbox = { console: console, Object: Object, Array: Array, Number: Number };
  var RXGame = {};
  sandbox.RXGame = RXGame;
  sandbox.globalThis = sandbox;

  var ctx = vm.createContext(sandbox);
  (depCodes || []).forEach(function (code) {
    try { vm.runInContext(code, ctx); } catch (e) { /* 已加载则跳过 */ }
  });
  vm.runInContext(moduleCode, ctx);
  return { sandbox: sandbox, RXGame: RXGame };
}

// ── 真实 21 名成员（与 assets.js 一致）──

function mockAssets() {
  return {
    PILOT_ASSETS: [
      { id: "pilot-ss-heiyue", rank: "SS" },
      { id: "pilot-s-lingyan", rank: "S" },
      { id: "pilot-s-luoqi", rank: "S" },
      { id: "pilot-a-yelan", rank: "S" },
      { id: "pilot-a-luofeiyin", rank: "A" },
      { id: "pilot-a-shenyao", rank: "A" },
      { id: "pilot-b-shenqingyao", rank: "A" },
      { id: "pilot-b-bailing", rank: "B" },
      { id: "pilot-b-linzhihan", rank: "B" },
      { id: "pilot-b-sumianxing", rank: "B" },
      { id: "pilot-b-xingtao", rank: "B" }
    ],
    SHIP_ASSETS: [
      { id: "ship-ss-lingguang", rank: "SS" },
      { id: "ship-s-09", rank: "S" },
      { id: "ship-s-08", rank: "S" },
      { id: "ship-b-04", rank: "S" },
      { id: "ship-a-07", rank: "A" },
      { id: "ship-a-06", rank: "A" },
      { id: "ship-b-02", rank: "A" },
      { id: "ship-b-01", rank: "B" },
      { id: "ship-b-03", rank: "B" },
      { id: "ship-b-05", rank: "B" }
    ]
  };
}

// ── 构建 mock profile ──

var ALL_PILOT_IDS = ["pilot-ss-heiyue","pilot-s-lingyan","pilot-s-luoqi","pilot-a-yelan","pilot-a-luofeiyin","pilot-a-shenyao","pilot-b-shenqingyao","pilot-b-bailing","pilot-b-linzhihan","pilot-b-sumianxing","pilot-b-xingtao"];
var ALL_SHIP_IDS = ["ship-ss-lingguang","ship-s-09","ship-s-08","ship-b-04","ship-a-07","ship-a-06","ship-b-02","ship-b-01","ship-b-03","ship-b-05"];
var ALL_BOND_IDS = ["bond_starter","bond_fire_duo","bond_azure_pact","bond_shadow_strike","bond_royal_phalanx","bond_crimson_verdict","bond_coldmoon_lance","bond_bluebird_bastion","bond_peach_shadow","bond_starlight_escort","bond_ultimate_starlink"];

function mockProfile(pilotIds, shipIds, litUnits, litBonds) {
  var pilots = pilotIds || [];
  var ships = shipIds || [];
  var units = litUnits || pilots.concat(ships);
  var bonds = litBonds || [];
  return {
    owned: { pilots: pilots, ships: ships },
    codexBonds: units.map(function (id) { return "unit:" + id; }).concat(bonds)
  };
}

function fullProfile() {
  return mockProfile(ALL_PILOT_IDS, ALL_SHIP_IDS, ALL_PILOT_IDS.concat(ALL_SHIP_IDS), ALL_BOND_IDS);
}

// ── 加载源文件 ──

var fs = require("fs");
var projectRoot = path.resolve(__dirname, "..");
var balanceCode = fs.readFileSync(path.join(projectRoot, "src/h5/Gameplay/Collection/codexBalance.js"), "utf8");
var configCode = fs.readFileSync(path.join(projectRoot, "src/h5/Gameplay/Collection/codexConfig.js"), "utf8");
var systemCode = fs.readFileSync(path.join(projectRoot, "src/h5/Gameplay/Collection/codexSystem.js"), "utf8");

var env = buildSandbox(systemCode, [balanceCode, configCode]);
var RXGame = env.RXGame;
RXGame.assets = mockAssets();

// ── 测试套件 ──

describe("codexSystem — 点亮层", function () {
  var system = RXGame.codexSystem;

  it("未点亮的单位不计入加成", function () {
    var p = mockProfile(["pilot-b-bailing"], [], [], []);
    assert.strictEqual(system.calculateBonus(p).attackFlat, 0);
  });

  it("B 战姬点亮 → +1 攻击", function () {
    assert.strictEqual(system.calculateBonus(mockProfile(["pilot-b-bailing"], [])).attackFlat, 1);
  });

  it("A 战姬点亮 → +2 攻击", function () {
    assert.strictEqual(system.calculateBonus(mockProfile(["pilot-a-luofeiyin"], [])).attackFlat, 2);
  });

  it("S 战姬点亮 → +2 攻击", function () {
    assert.strictEqual(system.calculateBonus(mockProfile(["pilot-s-lingyan"], [])).attackFlat, 2);
  });

  it("SS 战姬点亮 → +2 攻击 + 2% 破甲", function () {
    var b = system.calculateBonus(mockProfile(["pilot-ss-heiyue"], []));
    assert.strictEqual(b.attackFlat, 2);
    assert.strictEqual(b.armorPenetrationFlat, 0.02);
  });

  it("B 战机点亮 → +1 攻击，无破甲", function () {
    var b = system.calculateBonus(mockProfile([], ["ship-b-01"]));
    assert.strictEqual(b.attackFlat, 1);
    assert.strictEqual(b.armorPenetrationFlat, 0);
  });
});

describe("codexSystem — 破甲只来自 2 个 SS", function () {
  var system = RXGame.codexSystem;

  it("非 SS 点亮 / 非 SS 羁绊均不给破甲", function () {
    // 夜岚(S) + 银翼(A) 点亮并点亮其羁绊 azure_pact
    var p = mockProfile(["pilot-a-yelan"], ["ship-a-06"], ["pilot-a-yelan","ship-a-06"], ["bond_azure_pact"]);
    var b = system.calculateBonus(p);
    assert.strictEqual(b.armorPenetrationFlat, 0);
  });

  it("点亮 1 个 SS → +2% 破甲", function () {
    assert.strictEqual(system.calculateBonus(mockProfile(["pilot-ss-heiyue"], [])).armorPenetrationFlat, 0.02);
    assert.strictEqual(system.calculateBonus(mockProfile([], ["ship-ss-lingguang"])).armorPenetrationFlat, 0.02);
  });

  it("点亮 2 个 SS → +4% 破甲", function () {
    assert.strictEqual(system.calculateBonus(mockProfile(["pilot-ss-heiyue"], ["ship-ss-lingguang"])).armorPenetrationFlat, 0.04);
  });

  it("2 个 SS 点亮 + 终极星链羁绊 → 共 +5% 破甲", function () {
    var p = mockProfile(["pilot-ss-heiyue"], ["ship-ss-lingguang"], ["pilot-ss-heiyue","ship-ss-lingguang"], ["bond_ultimate_starlink"]);
    assert.strictEqual(system.calculateBonus(p).armorPenetrationFlat, 0.05);
  });
});

describe("codexSystem — 羁绊层", function () {
  var system = RXGame.codexSystem;

  it("点亮 bond_starter（白凌+蓝隼）→ +1 攻击", function () {
    var p = mockProfile(["pilot-b-bailing"], ["ship-b-01"], [], ["bond_starter"]);
    assert.strictEqual(system.calculateBonus(p).attackFlat, 1);
  });

  it("未点亮羁绊则不计入", function () {
    var p = mockProfile(["pilot-b-bailing"], ["ship-b-01"], ["pilot-b-bailing","ship-b-01"], []);
    assert.strictEqual(system.calculateBonus(p).attackFlat, 2); // 仅点亮层 1+1
  });

  it("bond_fire_duo（凌焰+苍穹）→ +3 攻击", function () {
    var p = mockProfile(["pilot-s-lingyan"], ["ship-s-09"], [], ["bond_fire_duo"]);
    assert.strictEqual(system.calculateBonus(p).attackFlat, 3);
  });

  it("bond_starlight_escort → +1 攻击 + 10% 金币", function () {
    var p = mockProfile(["pilot-b-sumianxing"], ["ship-b-01"], [], ["bond_starlight_escort"]);
    var b = system.calculateBonus(p);
    assert.strictEqual(b.attackFlat, 1);
    assert.strictEqual(b.coinBonusMultiplier, 0.10);
  });

  it("11 条羁绊全部点亮（不含单位点亮）→ 攻击 +15 / 破甲 +1%（仅终极星链）/ 金币 +10%", function () {
    // 拥有全部单位，仅点亮羁绊（不点亮单个单位）；
    // 此时 2 个 SS 未被点亮，破甲只来自终极星链羁绊的 +1%。
    var p = mockProfile(ALL_PILOT_IDS, ALL_SHIP_IDS, [], ALL_BOND_IDS);
    var b = system.calculateBonus(p);
    assert.strictEqual(b.attackFlat, 15);
    assert.strictEqual(b.armorPenetrationFlat, 0.01);
    assert.strictEqual(b.coinBonusMultiplier, 0.10);
  });
});

describe("codexSystem — 全点亮 + 全羁绊总额", function () {
  var system = RXGame.codexSystem;

  it("21 名成员全部点亮 + 11 条羁绊全部点亮 = 攻击 +50 / 破甲 +5% / 金币 +10%", function () {
    var b = system.calculateBonus(fullProfile());
    assert.strictEqual(b.attackFlat, 50);
    assert.strictEqual(b.armorPenetrationFlat, 0.05);
    assert.strictEqual(b.coinBonusMultiplier, 0.10);
  });
});

describe("codexSystem — 边界与不变量", function () {
  var system = RXGame.codexSystem;

  it("null profile → 全 0", function () {
    var b = system.calculateBonus(null);
    assert.strictEqual(b.attackFlat, 0);
    assert.strictEqual(b.armorPenetrationFlat, 0);
    assert.strictEqual(b.coinBonusMultiplier, 0);
  });

  it("无效 ID 被过滤", function () {
    var p = mockProfile(["nope"], ["nope_x"], ["nope","nope_x"], []);
    assert.strictEqual(system.calculateBonus(p).attackFlat, 0);
  });

  it("calculateBonus 不修改 profile", function () {
    var p = mockProfile(["pilot-b-bailing"], ["ship-b-01"]);
    var snap = JSON.stringify(p);
    system.calculateBonus(p);
    assert.strictEqual(JSON.stringify(p), snap);
  });

  it("多次调用结果一致（幂等）", function () {
    var p = fullProfile();
    var r1 = system.calculateBonus(p);
    var r2 = system.calculateBonus(p);
    assert.strictEqual(r2.attackFlat, r1.attackFlat);
    assert.strictEqual(r2.armorPenetrationFlat, r1.armorPenetrationFlat);
    assert.strictEqual(r2.coinBonusMultiplier, r1.coinBonusMultiplier);
  });
});

describe("codex coverage — 每个成员都被羁绊覆盖", function () {
  it("11 条羁绊的 requires 覆盖全部 21 名成员", function () {
    var bonds = RXGame.codexBalance.BONDS;
    assert.strictEqual(bonds.length, 11);
    var covered = {};
    bonds.forEach(function (bond) {
      (bond.requires.pilots || []).forEach(function (id) { covered[id] = true; });
      (bond.requires.ships || []).forEach(function (id) { covered[id] = true; });
    });
    ALL_PILOT_IDS.concat(ALL_SHIP_IDS).forEach(function (id) {
      assert.ok(covered[id], "成员未被任何羁绊覆盖: " + id);
    });
  });

  it("蓝隼(ship-b-01) 在 2 条羁绊中重复出现", function () {
    var bonds = RXGame.codexBalance.BONDS;
    var count = bonds.filter(function (bond) {
      return (bond.requires.ships || []).indexOf("ship-b-01") >= 0;
    }).length;
    assert.strictEqual(count, 2);
  });

  it("仅终极星链(bond_ultimate_starlink)带破甲", function () {
    var bonds = RXGame.codexBalance.BONDS;
    var penBonds = bonds.filter(function (b) { return (b.bonus && b.bonus.armorPenetrationFlat) > 0; });
    assert.strictEqual(penBonds.length, 1);
    assert.strictEqual(penBonds[0].id, "bond_ultimate_starlink");
  });
});

describe("codexConfig — 全收集与羁绊状态", function () {
  var config = RXGame.codexConfig;
  var system = RXGame.codexSystem;

  it("isFullCollection 在集齐 11 战姬 + 10 战机时为 true", function () {
    assert.strictEqual(config.isFullCollection(11, 10), true);
    assert.strictEqual(config.isFullCollection(10, 10), false);
    assert.strictEqual(config.isFullCollection(11, 9), false);
  });

  it("getBondsState 标记可点亮 / 已点亮", function () {
    var p = mockProfile(["pilot-b-bailing"], ["ship-b-01"], [], []);
    var state = system.getBondsState(p);
    var bond = state.bonds.filter(function (b) { return b.def.id === "bond_starter"; })[0];
    assert.strictEqual(bond.ownedAll, true);
    assert.strictEqual(bond.lit, false);
    assert.strictEqual(bond.lightable, true);
    assert.strictEqual(state.anyLightable, true);

    var p2 = mockProfile(["pilot-b-bailing"], ["ship-b-01"], [], ["bond_starter"]);
    var state2 = system.getBondsState(p2);
    var bond2 = state2.bonds.filter(function (b) { return b.def.id === "bond_starter"; })[0];
    assert.strictEqual(bond2.lit, true);
    assert.strictEqual(bond2.lightable, false);
    assert.strictEqual(state2.anyLightable, false);
  });
});
