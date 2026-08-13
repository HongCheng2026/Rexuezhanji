"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

global.RXGame = {
  assets: {
    PILOT_ASSETS: [
      { id: "pilot-b-01", rank: "B", damage: 10 },
      { id: "pilot-ss-heiyue", rank: "SS", damage: 40 }
    ],
    SHIP_ASSETS: [
      { id: "ship-b-01", rank: "B", damage: 30, hp: 100 },
      { id: "ship-s-01", rank: "S", damage: 90, hp: 300 },
      { id: "ship-ss-lingguang", rank: "SS", damage: 120, hp: 400 }
    ],
    RANK_DAMAGE: {
      pilot: { B: 10, A: 20, S: 30, SS: 40, SSS: 50 },
      ship: { B: 30, A: 60, S: 90, SS: 120, SSS: 150 }
    },
    RANK_HP: { ship: { B: 100, A: 200, S: 300, SS: 400, SSS: 500 } }
  },
  balance: {
    PILOT_RARITY_STATS: {
      B: { armorPenetration: 0 },
      A: { armorPenetration: 0.05 },
      S: { armorPenetration: 0.1 },
      SS: { armorPenetration: 0.25 },
      SSS: { armorPenetration: 0.35 }
    },
    FIGHTER_RARITY_STATS: {
      B: { armorPenetration: 0 },
      A: { armorPenetration: 0 },
      S: { armorPenetration: 0.05 },
      SS: { armorPenetration: 0.15 },
      SSS: { armorPenetration: 0.2 }
    }
  }
};
const rosterEconomy = require("../src/h5/Data/Balance/rosterEconomy.js");
const powerCalculator = require("../src/h5/Gameplay/Combat/powerCalculator.js");

function baseProfile(overrides = {}) {
  return Object.assign({
    resources: { gold: 0, inventory: {} },
    owned: { pilots: ["pilot-b-01", "pilot-ss-heiyue"], ships: ["ship-b-01", "ship-s-01", "ship-ss-lingguang"] },
    scene: { pilotId: "pilot-b-01", shipId: "ship-b-01" },
    pilotRanks: {},
    shipRanks: {},
    pilotStars: {},
    shipStars: {}
  }, overrides);
}

test("B 级战姬消耗 A 级档案令晋升为 A 级", () => {
  const profile = baseProfile({ resources: { gold: 0, inventory: { pilot_rank_a_token: 1 } } });
  const result = rosterEconomy.promoteWithToken(profile, "pilot", "pilot-b-01", "pilot_rank_a_token");
  assert.equal(result.ok, true);
  assert.equal(result.toRank, "A");
  assert.equal(profile.pilotRanks["pilot-b-01"], "A");
  assert.equal(profile.resources.inventory.pilot_rank_a_token, 0);
});

test("同类但不匹配当前品级的档案令返回 RANK_NOT_ELIGIBLE", () => {
  const profile = baseProfile({
    pilotRanks: { "pilot-b-01": "A" },
    resources: { gold: 0, inventory: { pilot_rank_a_token: 1 } }
  });
  const result = rosterEconomy.promoteWithToken(profile, "pilot", "pilot-b-01", "pilot_rank_a_token");
  assert.equal(result.ok, false);
  assert.equal(result.reason, "RANK_NOT_ELIGIBLE");
});

test("缺少升阶材料不会改变品级", () => {
  const profile = baseProfile();
  const result = rosterEconomy.promoteWithToken(profile, "pilot", "pilot-b-01", "pilot_rank_a_token");
  assert.equal(result.ok, false);
  assert.equal(result.reason, "TOKEN_NOT_OWNED");
  assert.equal(rosterEconomy.getOwnedRank(profile, "pilot", "pilot-b-01"), "B");
});

test("战姬不能使用战机升阶令", () => {
  const profile = baseProfile({ resources: { gold: 0, inventory: { fighter_rank_s_token: 1 } } });
  const result = rosterEconomy.promoteWithToken(profile, "pilot", "pilot-b-01", "fighter_rank_s_token");
  assert.equal(result.ok, false);
  assert.equal(result.reason, "INVALID_TOKEN");
});

test("B 级战机消耗 A 级改装令晋升为 A 级", () => {
  const profile = baseProfile({ resources: { gold: 0, inventory: { fighter_rank_a_token: 1 } } });
  const result = rosterEconomy.promoteWithToken(profile, "ship", "ship-b-01", "fighter_rank_a_token");
  assert.equal(result.ok, true);
  assert.equal(result.toRank, "A");
  assert.deepEqual(rosterEconomy.getShipStats(profile, "ship-b-01"), {
    rank: "A", stars: 0, attack: 60, hp: 200, armorPenetration: 0
  });
});

test("S 级战机无法继续升阶", () => {
  const profile = baseProfile({ resources: { gold: 0, inventory: { fighter_rank_s_token: 1 } } });
  const plan = rosterEconomy.getPromotionPlan(profile, "ship", "ship-s-01");
  assert.equal(plan.ok, false);
  assert.equal(plan.reason, "RANK_NOT_ELIGIBLE");
});

test("SS 级战机升到 SSS 仅增加 20 攻击，生命与破甲不变", () => {
  const profile = baseProfile({ resources: { gold: 0, inventory: { sss_fighter_module: 5 } } });
  const beforePower = powerCalculator.calculateUnitPower(global.RXGame.assets.SHIP_ASSETS[2], "ship", profile);
  const result = rosterEconomy.promoteWithToken(profile, "ship", "ship-ss-lingguang", "sss_fighter_module");
  assert.equal(result.ok, true);
  assert.equal(result.toRank, "SSS");
  assert.equal(result.tokenUsed, 5);
  assert.equal(profile.resources.inventory.sss_fighter_module, 0);
  assert.deepEqual(rosterEconomy.getShipStats(profile, "ship-ss-lingguang"), {
    rank: "SSS", stars: 0, attack: 140, hp: 400, armorPenetration: 0.15
  });
  assert.equal(beforePower, 2270);
  assert.equal(powerCalculator.calculateUnitPower(global.RXGame.assets.SHIP_ASSETS[2], "ship", profile), 2470);
});

test("A 级战姬消耗 S 级档案令晋升为 S 级，S 级封顶", () => {
  const profile = baseProfile({
    pilotRanks: { "pilot-b-01": "A" },
    resources: { gold: 0, inventory: { pilot_rank_s_token: 1 } }
  });
  const promoted = rosterEconomy.promoteWithToken(profile, "pilot", "pilot-b-01", "pilot_rank_s_token");
  assert.equal(promoted.ok, true);
  assert.equal(promoted.toRank, "S");
  assert.equal(rosterEconomy.getPromotionPlan(profile, "pilot", "pilot-b-01").reason, "RANK_NOT_ELIGIBLE");
});

test("SS 战姬消耗 5 枚 SSS 战姬奖章晋升 SSS", () => {
  const profile = baseProfile({ resources: { gold: 0, inventory: { sss_pilot_medal: 5 } } });
  const beforePower = powerCalculator.calculateUnitPower(global.RXGame.assets.PILOT_ASSETS[1], "pilot", profile);
  const result = rosterEconomy.promoteWithToken(profile, "pilot", "pilot-ss-heiyue", "sss_pilot_medal");
  assert.equal(result.ok, true);
  assert.equal(result.toRank, "SSS");
  assert.equal(profile.resources.inventory.sss_pilot_medal, 0);
  assert.equal(rosterEconomy.getPilotStats(profile, "pilot-ss-heiyue").attack, 50);
  assert.equal(rosterEconomy.getPilotStats(profile, "pilot-ss-heiyue").armorPenetration, 0.35);
  assert.ok(powerCalculator.calculateUnitPower(global.RXGame.assets.PILOT_ASSETS[1], "pilot", profile) > beforePower);
});

test("重复黑月本体每次升 1 星，增加 5 个百分点破甲", () => {
  const profile = baseProfile({ resources: { gold: 0, inventory: { pilot_ss_heiyue_copy: 2, sss_pilot_medal: 5 } } });
  const result = rosterEconomy.starUpPilot(profile, "pilot-ss-heiyue");
  assert.equal(result.ok, true);
  assert.equal(result.toStars, 1);
  assert.equal(profile.resources.inventory.pilot_ss_heiyue_copy, 1);
  assert.equal(profile.resources.inventory.sss_pilot_medal, 0);
  assert.equal(result.medalsUsed, 5);
  assert.equal(rosterEconomy.getPilotStats(profile, "pilot-ss-heiyue").armorPenetration, 0.3);
});

test("黑月升星缺少 5 枚 SSS 战姬奖章时不消耗本体", () => {
  const profile = baseProfile({ resources: { gold: 0, inventory: { pilot_ss_heiyue_copy: 1, sss_pilot_medal: 4 } } });
  const result = rosterEconomy.starUpPilot(profile, "pilot-ss-heiyue");
  assert.equal(result.ok, false);
  assert.equal(result.reason, "MEDAL_NOT_OWNED");
  assert.equal(profile.resources.inventory.pilot_ss_heiyue_copy, 1);
  assert.equal(profile.resources.inventory.sss_pilot_medal, 4);
  assert.equal(rosterEconomy.getPilotStarLevel(profile, "pilot-ss-heiyue"), 0);
});

test("黑月最高 6 星，SSS 6 星最终破甲为 65%", () => {
  const profile = baseProfile({
    pilotRanks: { "pilot-ss-heiyue": "SSS" },
    pilotStars: { "pilot-ss-heiyue": 6 },
    resources: { gold: 0, inventory: { pilot_ss_heiyue_copy: 1 } }
  });
  const result = rosterEconomy.starUpPilot(profile, "pilot-ss-heiyue");
  assert.equal(result.ok, false);
  assert.equal(result.reason, "MAX_STARS");
  assert.ok(Math.abs(rosterEconomy.getPilotStats(profile, "pilot-ss-heiyue").armorPenetration - 0.65) < 1e-9);
  assert.equal(powerCalculator.calculateUnitPower(global.RXGame.assets.PILOT_ASSETS[1], "pilot", profile), 1670);
});

test("SSS 战机消耗 1 个 SS 本体和 5 个 SSS 战机模组升星", () => {
  const profile = baseProfile({
    shipRanks: { "ship-ss-lingguang": "SSS" },
    resources: { gold: 0, inventory: { ship_ss_lingguang_copy: 2, sss_fighter_module: 5 } }
  });
  const beforePower = powerCalculator.calculateUnitPower(global.RXGame.assets.SHIP_ASSETS[2], "ship", profile);
  const result = rosterEconomy.starUpFighter(profile, "ship-ss-lingguang");
  assert.equal(result.ok, true);
  assert.equal(result.toStars, 1);
  assert.equal(result.modulesUsed, 5);
  assert.equal(profile.resources.inventory.ship_ss_lingguang_copy, 1);
  assert.equal(profile.resources.inventory.sss_fighter_module, 0);
  assert.equal(result.attackGained, 10);
  assert.equal(rosterEconomy.getShipStats(profile, "ship-ss-lingguang").attack, 150);
  assert.equal(rosterEconomy.getShipStats(profile, "ship-ss-lingguang").armorPenetration, 0.15);
  assert.ok(powerCalculator.calculateUnitPower(global.RXGame.assets.SHIP_ASSETS[2], "ship", profile) > beforePower);
});

test("SS 战机未升到 SSS 前不能升星且不消耗材料", () => {
  const profile = baseProfile({ resources: { gold: 0, inventory: { ship_ss_lingguang_copy: 1, sss_fighter_module: 5 } } });
  const result = rosterEconomy.starUpFighter(profile, "ship-ss-lingguang");
  assert.equal(result.ok, false);
  assert.equal(result.reason, "STAR_REQUIRES_SSS");
  assert.equal(profile.resources.inventory.ship_ss_lingguang_copy, 1);
  assert.equal(profile.resources.inventory.sss_fighter_module, 5);
});

test("SSS 战机升星缺少模组时不消耗本体", () => {
  const profile = baseProfile({
    shipRanks: { "ship-ss-lingguang": "SSS" },
    resources: { gold: 0, inventory: { ship_ss_lingguang_copy: 1, sss_fighter_module: 4 } }
  });
  const result = rosterEconomy.starUpFighter(profile, "ship-ss-lingguang");
  assert.equal(result.ok, false);
  assert.equal(result.reason, "MODULE_NOT_OWNED");
  assert.equal(profile.resources.inventory.ship_ss_lingguang_copy, 1);
  assert.equal(profile.resources.inventory.sss_fighter_module, 4);
});

test("SSS 战机最高 6 星，最终攻击提升 60 点且破甲不变", () => {
  const profile = baseProfile({
    shipRanks: { "ship-ss-lingguang": "SSS" },
    shipStars: { "ship-ss-lingguang": 6 },
    resources: { gold: 0, inventory: { ship_ss_lingguang_copy: 1, sss_fighter_module: 5 } }
  });
  const result = rosterEconomy.starUpFighter(profile, "ship-ss-lingguang");
  assert.equal(result.ok, false);
  assert.equal(result.reason, "MAX_STARS");
  assert.equal(rosterEconomy.getShipStats(profile, "ship-ss-lingguang").attack, 200);
  assert.ok(Math.abs(rosterEconomy.getShipStats(profile, "ship-ss-lingguang").armorPenetration - 0.15) < 1e-9);
  assert.equal(powerCalculator.calculateUnitPower(global.RXGame.assets.SHIP_ASSETS[2], "ship", profile), 3070);
});
