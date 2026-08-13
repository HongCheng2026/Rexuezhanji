const assert = require("node:assert/strict");
const test = require("node:test");

const config = require("../src/h5/UI/Gacha/gachaConfig.js");
const model = require("../src/h5/UI/Gacha/gachaModel.js");
const storeModule = require("../src/h5/UI/Gacha/gachaStateStore.js");
const inventoryCatalog = require("../src/h5/UI/Inventory/inventoryCatalog.js");
const inventoryModel = require("../src/h5/UI/Inventory/inventoryModel.js");

function profile(tickets = 20) {
  return {
    coins: 100,
    resources: { gold: 100, energy: 10, maxEnergy: 100, inventory: { starlink_ticket: tickets } },
    owned: { pilots: [], ships: [], backgrounds: [] }
  };
}

function sequence(values, fallback = 0) {
  let index = 0;
  return () => (index < values.length ? values[index++] : fallback);
}

test("四档概率边界（终极大奖1% / 传奇5% / 精英24% / 标准70%）", () => {
  // pity 取高位，避免硬保底强制介入
  assert.equal(model.rollTier(() => 0.009999, 50), "ultimate");
  assert.equal(model.rollTier(() => 0.01, 50), "legendary");
  assert.equal(model.rollTier(() => 0.059999, 50), "legendary");
  assert.equal(model.rollTier(() => 0.06, 50), "elite");
  assert.equal(model.rollTier(() => 0.299999, 50), "elite");
  assert.equal(model.rollTier(() => 0.3, 50), "standard");
  assert.equal(model.rollTier(() => 0.99, 50), "standard");
});

test("保底为距终极大奖的剩余抽数：<=1 强制终极大奖，高位不强制", () => {
  assert.equal(model.rollTier(() => 0.99, 1), "ultimate");
  assert.equal(model.rollTier(() => 0.99, 0), "ultimate");
  assert.equal(model.rollTier(() => 0.99, 2), "standard");
  assert.equal(model.rollTier(() => 0.99, 50), "standard");
});

test("100 抽硬保底：连续未出终极大奖时第 100 抽必出并重置为 PITY_LIMIT", () => {
  const source = profile(200);
  const state = { target: "pilot" };
  let lastResult;
  for (let i = 0; i < 100; i += 1) {
    lastResult = model.draw(source, state, { count: 1, rng: () => 0.99, now: () => i });
    state.pity = lastResult.state.pity;
    source.resources = lastResult.profile.resources;
    source.owned = lastResult.profile.owned;
    if (i < 99) assert.notEqual(lastResult.results[0].tier, "ultimate", `第 ${i + 1} 抽不应提前出终极大奖`);
  }
  assert.equal(lastResult.results[0].tier, "ultimate", "第 100 抽必须出终极大奖");
  assert.equal(lastResult.state.pity, config.PITY_LIMIT, "终极大奖后保底重置为 PITY_LIMIT");
});

test("非终极大奖每抽使保底剩余 -1", () => {
  const result = model.draw(profile(10), { target: "pilot", pity: 50 }, { count: 1, rng: sequence([0.5, 0.0]), now: () => 1 });
  assert.equal(result.results[0].tier, "standard");
  assert.equal(result.state.pity, 49);
});

test("十连按九折只消耗 9 张研究券，且仍逐条产出 10 个结果", () => {
  const result = model.draw(profile(9), { target: "pilot", pity: 50 }, { count: 10, rng: () => 0.99, now: () => 1 });
  assert.equal(result.ok, true);
  assert.deepEqual(
    result.results.map((entry) => entry.tier),
    Array(10).fill("standard")
  );
  assert.equal(result.profile.resources.inventory.starlink_ticket, 0);
});

test("传奇金奖从 SSS 战机模组与 SSS 战姬奖章中随机二选一", () => {
  const weapon = model.draw(profile(1), { target: "pilot", pity: 50 }, { count: 1, rng: sequence([0.02, 0]), now: () => 1 });
  const medal = model.draw(profile(1), { target: "pilot", pity: 50 }, { count: 1, rng: sequence([0.02, 0.99]), now: () => 1 });
  assert.equal(weapon.results[0].reward.id, "sss_fighter_module");
  assert.equal(weapon.profile.resources.inventory.sss_fighter_module, 1);
  assert.equal(weapon.profile.resources.inventory.sss_pilot_medal, undefined);
  assert.equal(medal.results[0].reward.id, "sss_pilot_medal");
  assert.equal(medal.profile.resources.inventory.sss_pilot_medal, 1);
  assert.equal(medal.profile.resources.inventory.sss_fighter_module, undefined);

  const weaponBackpack = inventoryModel.project(weapon.profile, "material", inventoryCatalog, { sss_fighter_module: "fighter.png" });
  const medalBackpack = inventoryModel.project(medal.profile, "material", inventoryCatalog, { sss_pilot_medal: "medal.png" });
  assert.equal(weaponBackpack.some((item) => item.id === "sss_fighter_module" && item.quantity === 1 && item.icon === "fighter.png"), true);
  assert.equal(medalBackpack.some((item) => item.id === "sss_pilot_medal" && item.quantity === 1 && item.icon === "medal.png"), true);
});

test("精英紫发放主动武器模组", () => {
  const result = model.draw(profile(1), { target: "pilot", pity: 50 }, { count: 1, rng: () => 0.1, now: () => 1 });
  assert.equal(result.results[0].tier, "elite");
  assert.equal(result.profile.resources.inventory.active_weapon_module, 1);
});

test("标准蓝五选一：金币三档、体力药水或自动武器模块", () => {
  const cases = [
    { seq: [0.5, 0.0], check: (p) => p.resources.gold === 100 + 10000 },
    { seq: [0.5, 0.25], check: (p) => p.resources.gold === 100 + 30000 },
    { seq: [0.5, 0.50], check: (p) => p.resources.gold === 100 + 50000 },
    { seq: [0.5, 0.68], check: (p) => p.resources.inventory.stamina_potion === 1 },
    { seq: [0.5, 0.85], check: (p) => p.resources.inventory.auto_weapon_module_purple === 1 }
  ];
  cases.forEach((item, index) => {
    const result = model.draw(profile(1), { target: "pilot", pity: 50 }, { count: 1, rng: sequence(item.seq), now: () => index });
    assert.equal(result.results[0].tier, "standard");
    assert.ok(item.check(result.profile), `标准蓝分支 ${index} 奖励符合预期`);
  });
});

test("券不足先返回精确补券报价，确认前档案零修改", () => {
  const p = profile(4);
  p.resources.diamonds = 1000;
  const before = JSON.stringify(p);
  const result = model.draw(p, { target: "pilot", pity: 50 }, { count: 10, rng: () => 0.5 });
  assert.equal(result.reason, "TICKET_TOPUP_REQUIRED");
  assert.equal(result.missingTickets, 5);
  assert.equal(result.diamondCost, 5 * config.TICKET_DIAMOND_PRICE);
  assert.equal(result.canAfford, true);
  assert.equal(JSON.stringify(p), before);
});

test("确认补券后以钻石补足并按券完成十连", () => {
  const p = profile(4);
  p.resources.diamonds = 1000;
  const result = model.draw(p, { target: "pilot", pity: 50 }, { count: 10, buyMissingTickets: true, rng: () => 0.99, now: () => 1 });
  assert.equal(result.ok, true);
  assert.equal(result.purchasedTickets, 5);
  assert.equal(result.profile.resources.diamonds, 400);
  assert.equal(result.profile.resources.inventory.starlink_ticket, 0);
  assert.equal(result.results.length, 10);
});

test("目标可在抽取前切换，终极大奖进入现有 owned 结构且保底重置", () => {
  const result = model.draw(profile(1), { target: "pilot", pity: 1 }, { count: 1, target: "ship", rng: () => 0.99, now: () => 2 });
  assert.equal(result.ok, true);
  assert.equal(result.state.target, "ship");
  assert.equal(result.results[0].tier, "ultimate");
  assert.equal(result.profile.owned.ships.includes(config.TARGETS.ship.id), true);
  assert.equal(result.state.pity, config.PITY_LIMIT);
});

test("重复 SS 战姬本体进入背包且不转换、不返还研究券", () => {
  const source = profile(1);
  source.owned.pilots.push(config.TARGETS.pilot.id);
  const result = model.draw(source, { target: "pilot", pity: 1 }, { count: 1, rng: () => 0.99, now: () => 3 });
  assert.equal(result.results[0].reward.duplicate, true);
  assert.equal(result.profile.resources.inventory.pilot_ss_heiyue_copy, 1);
  assert.equal(result.profile.resources.inventory.s_pilot_token, undefined);
  assert.equal(result.profile.resources.inventory.starlink_ticket, 0);
  assert.doesNotMatch(result.results[0].reward.label, /转换|研究券/);
  assert.equal(source.resources.inventory.starlink_ticket, 1, "纯模型不应修改输入快照");
});

test("重复 SS 战机本体进入背包，独立于战姬本体计数", () => {
  const source = profile(1);
  source.owned.ships.push(config.TARGETS.ship.id);
  const result = model.draw(source, { target: "ship", pity: 1 }, { count: 1, rng: () => 0.99, now: () => 4 });
  assert.equal(result.results[0].reward.duplicate, true);
  assert.equal(result.profile.resources.inventory.ship_ss_lingguang_copy, 1);
  assert.equal(result.profile.resources.inventory.pilot_ss_heiyue_copy, undefined);
  assert.equal(result.profile.resources.inventory.starlink_ticket, 0);
});

test("券不足待确认或未选择目标时玩家档和保底状态零修改", () => {
  const source = profile(0);
  const state = { target: "pilot", pity: 12, history: [] };
  const beforeProfile = JSON.stringify(source);
  const beforeState = JSON.stringify(state);
  assert.equal(model.draw(source, state, { count: 1 }).reason, "TICKET_TOPUP_REQUIRED");
  assert.equal(model.draw(profile(1), { pity: 0 }, { count: 1 }).reason, "TARGET_REQUIRED");
  assert.equal(JSON.stringify(source), beforeProfile);
  assert.equal(JSON.stringify(state), beforeState);
});

test("保底状态键跟随当前存档键隔离", () => {
  const data = new Map();
  const storage = {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, value),
    removeItem: (key) => data.delete(key)
  };
  const a = storeModule.create({ storage, profileKey: "rxgame_save_alpha", config });
  const b = storeModule.create({ storage, profileKey: "rxgame_save_beta", config });
  a.save({ target: "pilot", pity: 23 });
  b.save({ target: "ship", pity: 4 });
  assert.notEqual(a.key, b.key);
  assert.equal(a.load().pity, 23);
  assert.equal(b.load().pity, 4);
});
