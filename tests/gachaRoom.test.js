const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const config = require("../src/h5/UI/Gacha/gachaConfig.js");
const model = require("../src/h5/UI/Gacha/gachaModel.js");
const source = fs.readFileSync(path.join(__dirname, "../src/h5/UI/Gacha/gachaRoom.js"), "utf8");

function createHarness(options = {}) {
  let factory;
  let stored = { target: options.target || "pilot", pity: options.pity || 0, totalDraws: 0, history: [] };
  let raw = JSON.stringify(stored);
  const profile = {
    resources: { gold: 0, energy: 0, maxEnergy: 100, diamonds: options.diamonds || 0, inventory: { starlink_ticket: options.tickets == null ? 1 : options.tickets } },
    owned: { pilots: [], ships: [] }
  };
  const screen = { classList: { add() {}, remove() {} } };
  const store = {
    load: () => JSON.parse(raw),
    save: (next) => { stored = JSON.parse(JSON.stringify(next)); raw = JSON.stringify(stored); return stored; },
    snapshot: () => raw,
    restore: (before) => { raw = before; }
  };
  const shared = {
    roomRegistry: { defineRoom(name, roomFactory) { assert.equal(name, "gacha"); factory = roomFactory; } },
    gachaConfig: config,
    gachaModel: model,
    gachaStateStore: { create: () => store },
    gachaView: { create: () => ({ render() {}, clear() {} }) },
    assets: {
      GACHA_UI_ASSETS: {},
      PILOT_ASSETS: [{ id: config.TARGETS.pilot.id, src: "pilot.png" }],
      SHIP_ASSETS: [{ id: config.TARGETS.ship.id, src: "ship.png" }]
    }
  };
  const context = { console, globalThis: null, RXGame: shared };
  context.globalThis = context;
  vm.runInNewContext(source, context, { filename: "gachaRoom.js" });
  let commits = 0;
  const room = factory({
    dom: { gachaScreen: screen, gachaMount: {} },
    gacha: {
      getProfile: () => profile,
      isCloudMode: () => Boolean(options.cloud),
      commitProfile: (next) => {
        commits += 1;
        if (options.commitFails) throw new Error("disk full");
        Object.keys(profile).forEach((key) => delete profile[key]);
        Object.assign(profile, JSON.parse(JSON.stringify(next)));
      },
      rng: () => 0.99
    }
  });
  return { room, profile, getRaw: () => raw, getCommits: () => commits };
}

test("抽卡房间拥有独立动作契约", () => {
  const harness = createHarness();
  assert.deepEqual(
    Object.keys(harness.room.actions).sort(),
    ["gacha.back", "gacha.cancelTopUp", "gacha.close", "gacha.confirmTopUp", "gacha.draw", "gacha.open", "gacha.redraw", "gacha.selectTarget"].sort()
  );
});

test("正式云端模式禁用真实抽取且不扣券", () => {
  const harness = createHarness({ cloud: true });
  const before = JSON.stringify(harness.profile);
  const result = harness.room.actions["gacha.draw"]({ count: 1 });
  assert.equal(result.reason, "CLOUD_GACHA_DISABLED");
  assert.equal(JSON.stringify(harness.profile), before);
  assert.equal(harness.getCommits(), 0);
});

test("玩家档提交失败时恢复保底快照", () => {
  const harness = createHarness({ commitFails: true, pity: 8 });
  const beforeRaw = harness.getRaw();
  const beforeProfile = JSON.stringify(harness.profile);
  const result = harness.room.actions["gacha.draw"]({ count: 1 });
  assert.equal(result.reason, "STORAGE_FAILED");
  assert.equal(harness.getRaw(), beforeRaw);
  assert.equal(JSON.stringify(harness.profile), beforeProfile);
});

test("券不足时房间先等待确认，确认后才补券与抽取", () => {
  const harness = createHarness({ diamonds: 1000, tickets: 4 });
  const pending = harness.room.actions["gacha.draw"]({ count: 10 });
  assert.equal(pending.reason, "TICKET_TOPUP_REQUIRED");
  assert.equal(harness.profile.resources.diamonds, 1000);
  assert.equal(harness.profile.resources.inventory.starlink_ticket, 4);
  assert.equal(harness.getCommits(), 0);
  const result = harness.room.actions["gacha.confirmTopUp"]();
  assert.equal(result.ok, true);
  assert.equal(harness.profile.resources.diamonds, 400);
  assert.equal(harness.profile.resources.inventory.starlink_ticket, 0);
  assert.equal(harness.getCommits(), 1);
});
