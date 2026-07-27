(function registerGachaConfig(root) {
  "use strict";
  var scope = root.RXGame || (root.RXGame = {});

  var TARGETS = Object.freeze({
    pilot: Object.freeze({
      id: "pilot-ss-heiyue",
      ownedKey: "pilots",
      duplicateItem: "pilot_ss_heiyue_copy",
      label: "SS 战姬",
      name: "黑月",
      codeName: "蚀夜"
    }),
    ship: Object.freeze({
      id: "ship-ss-lingguang",
      ownedKey: "ships",
      duplicateItem: "ship_ss_lingguang_copy",
      label: "SS 战机",
      name: "凌光",
      codeName: "零界"
    })
  });

  var TIERS = Object.freeze([
    Object.freeze({ id: "ultimate", rank: 4, label: "终极大奖", probability: 0.01, percent: "1%" }),
    Object.freeze({ id: "legendary", rank: 3, label: "传奇·金", probability: 0.05, percent: "5%" }),
    Object.freeze({ id: "elite", rank: 2, label: "精英·紫", probability: 0.24, percent: "24%" }),
    Object.freeze({ id: "standard", rank: 1, label: "标准·蓝", probability: 0.70, percent: "70%" })
  ]);

  // 传奇金奖每次只从两件 SSS 核心材料中随机产出一件。
  var REWARD_POOLS = Object.freeze({
    legendary: Object.freeze([
      Object.freeze({ id: "sss_fighter_module", kind: "inventory", quantity: 1, label: "SSS战机模组 ×1" }),
      Object.freeze({ id: "sss_pilot_medal", kind: "inventory", quantity: 1, label: "SSS级战姬奖章 ×1" })
    ]),
    elite: Object.freeze([
      Object.freeze({ id: "active_weapon_module", kind: "inventory", quantity: 1, label: "武器模组 ×1" })
    ]),
    standard: Object.freeze([
      Object.freeze({ id: "gold_10000", kind: "gold", quantity: 10000, label: "金币 ×10,000" }),
      Object.freeze({ id: "gold_30000", kind: "gold", quantity: 30000, label: "金币 ×30,000" }),
      Object.freeze({ id: "gold_50000", kind: "gold", quantity: 50000, label: "金币 ×50,000" }),
      Object.freeze({ id: "stamina_potion", kind: "inventory", quantity: 1, label: "体力药水 ×1" }),
      Object.freeze({ id: "auto_weapon_module_purple", kind: "inventory", quantity: 1, label: "自动武器模块 ×1" })
    ])
  });

  var api = {
    STATE_KEY_PREFIX: "rxgame_gacha_state_v1::",
    TICKET_ID: "starlink_ticket",
    PITY_LIMIT: 100,
    HISTORY_LIMIT: 100,
    // 星链研究券是唯一抽取货币；十连按九折收取 9 张。
    DRAW_COSTS: Object.freeze({ 1: 1, 10: 9 }),
    // 券不足时按现有商店单价用钻石补齐，确认前不修改玩家档。
    // 与商店 starlink_ticket 的正式售价保持一致，禁止抽卡弹窗使用另一套折价。
    TICKET_DIAMOND_PRICE: 120,
    TARGETS: TARGETS,
    TIERS: TIERS,
    REWARD_POOLS: REWARD_POOLS
  };

  scope.gachaConfig = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
