const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const catalog = require("../src/h5/UI/Inventory/inventoryCatalog.js");
const model = require("../src/h5/UI/Inventory/inventoryModel.js");
const source = fs.readFileSync(path.join(__dirname, "../src/h5/UI/Inventory/inventoryRoom.js"), "utf8");

function createHarness(options = {}) {
  let factory;
  let currentProfile = {
    resources: {
      gold: 1200,
      diamonds: 30,
      energy: options.energy == null ? 20 : options.energy,
      maxEnergy: 100,
      inventory: { energy_small: 1, s_pilot_token: 1, auto_weapon_module_purple: 1 }
    }
  };
  let hidden = true;
  let commits = 0;
  const dispatches = [];
  const renders = [];
  const shared = {
    roomRegistry: {
      defineRoom(name, roomFactory) { assert.equal(name, "inventory"); factory = roomFactory; },
      dispatch(action, payload) { dispatches.push([action, payload]); return true; }
    },
    inventoryCatalog: catalog,
    inventoryModel: model,
    inventoryView: { create: () => ({ render(state) { renders.push(state); }, clear() {} }) },
    assets: { INVENTORY_UI_ASSETS: {}, SHOP_ITEM_ASSETS: {} }
  };
  const context = { console, globalThis: null, RXGame: shared };
  context.globalThis = context;
  vm.runInNewContext(source, context, { filename: "inventoryRoom.js" });
  const room = factory({
    dom: {
      inventoryScreen: { classList: { add(name) { if (name === "hidden") hidden = true; }, remove(name) { if (name === "hidden") hidden = false; } } },
      inventoryMount: {}
    },
    inventory: {
      getProfile: () => currentProfile,
      isCloudMode: () => Boolean(options.cloud),
      commitProfile(next) {
        commits += 1;
        if (options.commitFails) throw new Error("disk full");
        currentProfile = next;
      }
    }
  });
  return {
    room,
    dispatches,
    renders,
    getProfile: () => currentProfile,
    getCommits: () => commits,
    isHidden: () => hidden
  };
}

test("背包房间拥有独立动作契约与开关状态", () => {
  const harness = createHarness();
  assert.deepEqual(Object.keys(harness.room.actions).sort(), [
    "inventory.close",
    "inventory.dismissFeedback",
    "inventory.filter",
    "inventory.open",
    "inventory.select",
    "inventory.sell",
    "inventory.use"
  ].sort());
  assert.equal(harness.room.actions["inventory.open"](), true);
  assert.equal(harness.isHidden(), false);
  assert.equal(harness.room.actions["inventory.close"](), true);
  assert.equal(harness.isHidden(), true);
});

test("背包房间成功使用体力药水后只提交一次", () => {
  const harness = createHarness();
  const result = harness.room.actions["inventory.use"]({ id: "energy_small" });
  assert.equal(result.ok, true);
  assert.equal(harness.getCommits(), 1);
  assert.equal(harness.getProfile().resources.energy, 50);
  assert.equal(harness.getProfile().resources.inventory.energy_small, 0);
});

test("体力满值与云端模式均不提交道具消耗", () => {
  const full = createHarness({ energy: 100 });
  assert.equal(full.room.actions["inventory.use"]({ id: "energy_small" }).reason, "ENERGY_FULL");
  assert.equal(full.getCommits(), 0);
  assert.equal(full.getProfile().resources.inventory.energy_small, 1);

  const cloud = createHarness({ cloud: true });
  assert.equal(cloud.room.actions["inventory.use"]({ id: "energy_small" }).reason, "CLOUD_INVENTORY_DISABLED");
  assert.equal(cloud.getCommits(), 0);
  assert.equal(cloud.getProfile().resources.inventory.energy_small, 1);
});

test("背包存储失败时保留使用前玩家档", () => {
  const harness = createHarness({ commitFails: true });
  const before = JSON.stringify(harness.getProfile());
  const result = harness.room.actions["inventory.use"]({ id: "energy_small" });
  assert.equal(result.reason, "STORAGE_FAILED");
  assert.equal(JSON.stringify(harness.getProfile()), before);
  assert.equal(harness.getCommits(), 1);
});

test("出售后显示资源回收提示，确认后关闭提示", () => {
  const harness = createHarness();
  harness.room.actions["inventory.open"]();
  const result = harness.room.actions["inventory.sell"]({ id: "auto_weapon_module_purple" });
  assert.equal(result.ok, true);
  assert.equal(harness.getProfile().resources.gold, 11200);
  assert.deepEqual(JSON.parse(JSON.stringify(harness.renders.at(-1).feedback)), { kind: "sell", currency: "gold", amount: 10000 });
  assert.equal(harness.room.actions["inventory.dismissFeedback"](), true);
  assert.equal(harness.renders.at(-1).feedback, null);
  assert.equal(harness.dispatches.length, 0);
});
