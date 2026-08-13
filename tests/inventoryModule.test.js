const assert = require("node:assert/strict");
const test = require("node:test");

const catalog = require("../src/h5/UI/Inventory/inventoryCatalog.js");
const model = require("../src/h5/UI/Inventory/inventoryModel.js");

function profile(energy = 20, maxEnergy = 100) {
  return {
    resources: {
      energy,
      maxEnergy,
      inventory: { energy_small: 2, energy_large: 1, attack_core: 3, legacy_relic: 4, s_pilot_token: 1 }
    }
  };
}

test("背包目录投影支持分类和未知旧物资", () => {
  const all = model.project(profile(), "all", catalog, {});
  assert.equal(all.some((item) => item.id === "legacy_relic" && item.unknown && item.name === "未知物资"), true);
  const consumables = model.project(profile(), "consumable", catalog, {});
  assert.deepEqual(consumables.map((item) => item.id).sort(), ["energy_large", "energy_small"]);
  const archive = model.project(profile(), "archive", catalog, {});
  assert.deepEqual(archive.map((item) => item.id), ["s_pilot_token"]);
});

test("重复 SS 本体以虹彩收藏卡进入背包并保留独立数量与 UI", () => {
  const source = profile();
  source.resources.inventory.pilot_ss_heiyue_copy = 2;
  source.resources.inventory.ship_ss_lingguang_copy = 3;
  const archive = model.project(source, "archive", catalog, {
    pilot_ss_heiyue_copy: "pilot-copy.png",
    ship_ss_lingguang_copy: "ship-copy.png"
  });
  const pilotCopy = archive.find((item) => item.id === "pilot_ss_heiyue_copy");
  const shipCopy = archive.find((item) => item.id === "ship_ss_lingguang_copy");
  assert.equal(pilotCopy.quantity, 2);
  assert.equal(pilotCopy.icon, "pilot-copy.png");
  assert.equal(pilotCopy.rarity, "rainbow");
  assert.equal(shipCopy.quantity, 3);
  assert.equal(shipCopy.icon, "ship-copy.png");
  assert.equal(model.use(source, "pilot_ss_heiyue_copy", catalog).reason, "ITEM_READ_ONLY");
});

test("小体力药水恢复 30 且只消耗一个", () => {
  const source = profile(20, 100);
  const result = model.use(source, "energy_small", catalog);
  assert.equal(result.ok, true);
  assert.equal(result.profile.resources.energy, 50);
  assert.equal(result.profile.resources.inventory.energy_small, 1);
  assert.equal(source.resources.energy, 20, "纯模型不修改输入档");
});

test("大体力药水最多恢复到上限", () => {
  const result = model.use(profile(70, 100), "energy_large", catalog);
  assert.equal(result.ok, true);
  assert.equal(result.restored, 30);
  assert.equal(result.profile.resources.energy, 100);
  assert.equal(result.profile.resources.inventory.energy_large, 0);
});

test("体力满值时不消耗，档案与未知物资只读", () => {
  const full = profile(100, 100);
  assert.equal(model.use(full, "energy_small", catalog).reason, "ENERGY_FULL");
  assert.equal(full.resources.inventory.energy_small, 2);
  assert.equal(model.use(full, "s_pilot_token", catalog).reason, "ITEM_READ_ONLY");
  assert.equal(model.use(full, "legacy_relic", catalog).reason, "ITEM_READ_ONLY");
});

test("历史库存体力药水与标准体力药水合并显示并共用消耗", () => {
  const source = profile(20, 100);
  source.resources.inventory.stamina_potion = 2;
  source.resources.inventory.energy_potion_inventory = 3;
  const projected = model.project(source, "consumable", catalog, { stamina_potion: "shared-potion.png" });
  const potion = projected.find((item) => item.id === "stamina_potion");
  assert.equal(projected.some((item) => item.id === "energy_potion_inventory"), false);
  assert.equal(potion.quantity, 5);
  assert.equal(potion.icon, "shared-potion.png");

  source.resources.inventory.stamina_potion = 0;
  const used = model.use(source, "stamina_potion", catalog);
  assert.equal(used.ok, true);
  assert.equal(used.profile.resources.inventory.energy_potion_inventory, 2);
});
