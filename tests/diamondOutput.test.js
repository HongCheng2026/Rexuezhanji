"use strict";

// 后端钻石产出闭环：成就 / 任务 / 活动奖励经 economy.ts 权威发放钻石；
// 物物兑换按背包物资扣减并发放奖励。通过子进程以 --experimental-strip-types 加载 economy.ts。
const { execFileSync } = require("node:child_process");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const root = path.resolve(__dirname, "..");
const harness = path.join(root, "tests/fixtures/economyBackendHarness.mjs");

function runHarness(scenario) {
  const out = execFileSync(process.execPath, ["--experimental-strip-types", harness, JSON.stringify(scenario)], {
    encoding: "utf8",
    cwd: root
  });
  return JSON.parse(out);
}

test("all daily tasks plus the 80-point activity reward grant exactly 120 diamonds", () => {
  const scenario = {
    profile: {
      resources: { gold: 0, diamonds: 0, energy: 0, maxEnergy: 200, inventory: {} },
      completed: [1, 2, 3],
      fighterUpgrades: { attack: 2, hp: 2, armorPenetration: 2 },
      progress: { clearCount: 3, perfectClearCount: 1, noDamageBossClearCount: 0 },
      localEarned: { gold: 10000, diamonds: 0 }
    },
    steps: [
      { call: "claimTask", taskId: "daily_dossier_check" },
      { call: "claimTask", taskId: "daily_supply_check" },
      { call: "claimTask", taskId: "daily_sortie_1" },
      { call: "claimTask", taskId: "daily_sortie_3" },
      { call: "claimTask", taskId: "daily_upgrade_once" },
      { call: "claimTask", taskId: "daily_boss_1" },
      { call: "claimTask", taskId: "daily_perfect_1" },
      { call: "claimTask", taskId: "daily_gold_10000" },
      { call: "claimActivityReward", points: 80 }
    ]
  };
  const result = runHarness(scenario);
  assert.equal(result.finalProfile.resources.diamonds, 120);
  assert.equal(result.finalProfile.resources.gold, 25000);
  assert.deepEqual(result.replies.map((r) => r.ok), Array(9).fill(true));
});

test("backend exchange deducts the priced item and grants the reward item", () => {
  const scenario = {
    profile: { resources: { gold: 0, diamonds: 0, energy: 0, maxEnergy: 200, inventory: { sss_pilot_medal: 5 } } },
    steps: [{ call: "buyShopItem", itemId: "exchange_sss_fighter_module", quantity: 1 }]
  };
  const result = runHarness(scenario);
  const reply = result.replies[0];
  assert.equal(reply.ok, true);
  assert.equal(result.finalProfile.resources.inventory.sss_pilot_medal, 4, "应扣减 1 枚 SSS 战姬奖章");
  assert.equal(result.finalProfile.resources.inventory.sss_fighter_module, 1, "应发放 1 个 SSS 战机模组");
  assert.equal(reply.priceItemId, "sss_pilot_medal");
  assert.equal(reply.rewards[0].itemId, "sss_fighter_module");
  assert.equal(reply.priceCurrency, "item");
});

test("shop batch purchase and ten-draw are server-authoritative and mutate one profile", () => {
  const result = runHarness({
    profile: {
      resources: { gold: 50000, diamonds: 0, energy: 20, maxEnergy: 100, inventory: { starlink_ticket: 9 } },
      owned: { pilots: [], ships: [], backgrounds: [] }
    },
    steps: [
      { call: "buyShopItem", itemId: "auto_weapon_module_purple", quantity: 2 },
      { call: "gachaDraw", target: "pilot", count: 10 }
    ]
  });
  assert.deepEqual(result.replies.map((reply) => reply.ok), [true, true]);
  assert.equal(result.replies[0].quantity, 2);
  assert.equal(result.finalProfile.resources.inventory.auto_weapon_module_purple >= 2, true);
  assert.equal(result.replies[1].results.length, 10);
  assert.equal(result.replies[1].ticketCost, 9);
  assert.equal(result.finalProfile.resources.inventory.starlink_ticket, 0);
});

test("sign-in, inventory and diamond exchange reject duplicates and update atomically", () => {
  const result = runHarness({
    profile: {
      resources: {
        gold: 0,
        diamonds: 3,
        energy: 20,
        maxEnergy: 100,
        inventory: { stamina_potion: 1, auto_weapon_module_purple: 1 }
      }
    },
    steps: [
      { call: "claimSignIn" },
      { call: "claimSignIn" },
      { call: "useInventoryItem", itemId: "stamina_potion" },
      { call: "sellInventoryItem", itemId: "auto_weapon_module_purple" },
      { call: "exchangeDiamonds", amount: 2 }
    ]
  });
  assert.equal(result.replies[0].ok, true);
  assert.equal(result.replies[1].ok, false);
  assert.equal(result.replies[1].status, 409);
  assert.equal(result.replies[2].restored, 80);
  assert.equal(result.replies[3].refunded, 10000);
  assert.equal(result.replies[4].goldGain, 2000);
  assert.equal(result.finalProfile.resources.energy, 100);
  assert.equal(result.finalProfile.resources.diamonds, 1);
  assert.equal(result.finalProfile.resources.gold, 15000);
});
