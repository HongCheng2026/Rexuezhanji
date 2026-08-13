(function registerInventoryCatalog(root) {
  "use strict";
  var scope = root.RXGame || (root.RXGame = {});

  var CATEGORIES = Object.freeze([
    Object.freeze({ id: "all", label: "全部", iconAsset: "categoryAll", fallbackIcon: "▦" }),
    Object.freeze({ id: "consumable", label: "消耗品", iconAsset: "categoryConsumable", fallbackIcon: "+" }),
    Object.freeze({ id: "material", label: "强化材料", iconAsset: "categoryMaterial", fallbackIcon: "◇" }),
    Object.freeze({ id: "ticket", label: "票券", iconAsset: "categoryTicket", fallbackIcon: "⌁" }),
    Object.freeze({ id: "archive", label: "档案收藏", iconAsset: "categoryArchive", fallbackIcon: "▣" })
  ]);

  // sellPrice / sellCurrency 仅存在于可原价出售的物资；model.sell 以 sellPrice 是否存在判定可售。
  var ITEMS = Object.freeze({
    energy_small: Object.freeze({ id: "energy_small", name: "小体力药水", category: "consumable", rarity: "blue", description: "恢复 30 点体力。体力已满时不会消耗。", source: "商店、抽卡标准奖励", use: { energy: 30 } }),
    energy_large: Object.freeze({ id: "energy_large", name: "大体力药水", category: "consumable", rarity: "purple", description: "恢复 80 点体力。体力已满时不会消耗。", source: "商店、抽卡精英奖励", use: { energy: 80 } }),
    stamina_potion: Object.freeze({ id: "stamina_potion", name: "体力药水", category: "consumable", rarity: "blue", description: "恢复 100 点体力。体力已满时不会消耗。可放入背包保存。", source: "商店、抽卡标准奖励", use: { energy: 100 } }),
    energy_potion_daily: Object.freeze({ id: "energy_potion_daily", name: "体力药水（当日）", category: "consumable", rarity: "blue", description: "当日求购的体力药水，恢复 20 点体力。", source: "商店（金币）", use: { energy: 20 } }),
    energy_potion_inventory: Object.freeze({ id: "energy_potion_inventory", name: "体力药水", category: "consumable", rarity: "blue", description: "历史版本库存体力药水，与体力药水共用库存显示。", source: "商店（钻石）", use: { energy: 100 } }),
    attack_core: Object.freeze({ id: "attack_core", name: "攻击核心", category: "material", rarity: "purple", description: "用于提升战机攻击模块的强化材料。", source: "商店、抽卡" }),
    armor_core: Object.freeze({ id: "armor_core", name: "装甲核心", category: "material", rarity: "purple", description: "用于提升战机装甲模块的强化材料。", source: "商店、抽卡" }),
    pierce_core: Object.freeze({ id: "pierce_core", name: "破甲核心", category: "material", rarity: "purple", description: "用于提升战机破甲模块的强化材料。", source: "商店、抽卡" }),
    silver_wing_part: Object.freeze({ id: "silver_wing_part", name: "银翼部件", category: "material", rarity: "blue", description: "银翼系列战机通用结构部件。", source: "商店、抽卡" }),
    auto_weapon_module_purple: Object.freeze({ id: "auto_weapon_module_purple", name: "自动武器模块", category: "material", rarity: "blue", description: "解锁与升级自动技能（1-9级）的必备材料。", source: "商店、抽卡标准奖励", sellPrice: 10000, sellCurrency: "gold" }),
    auto_weapon_module_gold: Object.freeze({ id: "auto_weapon_module_gold", name: "自动武器核心", category: "material", rarity: "purple", description: "高阶自动技能进阶核心（7-9级需与自动武器模块同时消耗）。", source: "商店（钻石）", sellPrice: 100, sellCurrency: "diamonds" }),
    fighter_upgrade_ticket: Object.freeze({ id: "fighter_upgrade_ticket", name: "战机强化券", category: "ticket", rarity: "blue", description: "战机强化系统使用的专项票券。", source: "活动与成长奖励" }),
    pilot_training_chip: Object.freeze({ id: "pilot_training_chip", name: "战姬训练芯片", category: "material", rarity: "blue", description: "战姬训练与成长所需的数据芯片。", source: "活动与成长奖励" }),
    starlink_ticket: Object.freeze({ id: "starlink_ticket", name: "星链研究券", category: "ticket", rarity: "gold", description: "星穹之翼抽卡的专用研究凭证。", source: "商店、抽卡与活动", sellPrice: 120, sellCurrency: "diamonds" }),
    s_pilot_token: Object.freeze({ id: "s_pilot_token", name: "S 战姬档案令", category: "archive", rarity: "gold", description: "记录 S 级战姬完整档案的收藏令牌。", source: "商店与历史重复奖励", relatedPanel: "pilotGallery" }),
    s_fighter_token: Object.freeze({ id: "s_fighter_token", name: "S 战机档案令", category: "archive", rarity: "gold", description: "记录 S 级战机完整档案的收藏令牌。", source: "商店与历史奖励", relatedPanel: "shipGallery" }),
    active_skill_module_c: Object.freeze({ id: "active_skill_module_c", name: "主动技能模组·C", category: "archive", rarity: "green", description: "主动技能低阶升级核心，可在商店以金币购入。", source: "商店" }),
    active_skill_module_b: Object.freeze({ id: "active_skill_module_b", name: "主动技能模组·B", category: "archive", rarity: "blue", description: "主动技能中阶升级核心，可在商店以金币购入。", source: "商店" }),
    active_skill_module_a: Object.freeze({ id: "active_skill_module_a", name: "主动技能模组·A", category: "archive", rarity: "purple", description: "主动技能高阶升级核心，可在商店以金币购入。", source: "商店" }),
    active_skill_module_s: Object.freeze({ id: "active_skill_module_s", name: "主动技能模组·S", category: "archive", rarity: "gold", description: "主动技能稀有升级核心，可在商店以钻石购入。", source: "商店" }),
    active_skill_module_ss: Object.freeze({ id: "active_skill_module_ss", name: "主动技能模组·SS", category: "archive", rarity: "pink", description: "主动技能顶级升级核心，可在商店以钻石购入。", source: "商店" }),
    active_skill_module_sss: Object.freeze({ id: "active_skill_module_sss", name: "主动技能模组·SSS", category: "archive", rarity: "rainbow", description: "主动技能终极升级核心，可在商店以钻石购入。", source: "商店" }),
    pilot_rank_a_token: Object.freeze({ id: "pilot_rank_a_token", name: "A级档案令", category: "archive", rarity: "purple", description: "用于将 B 级战姬晋升为 A 级的档案令。", source: "商店（金币）", sellPrice: 90000, sellCurrency: "gold" }),
    fighter_rank_a_token: Object.freeze({ id: "fighter_rank_a_token", name: "A级改装令", category: "archive", rarity: "purple", description: "用于将 B 级战机晋升为 A 级的改装令。", source: "商店（金币）", sellPrice: 100000, sellCurrency: "gold" }),
    pilot_rank_s_token: Object.freeze({ id: "pilot_rank_s_token", name: "S级档案令", category: "archive", rarity: "gold", description: "用于将 A 级战姬晋升为 S 级的档案令。", source: "商店（金币）", sellPrice: 780000, sellCurrency: "gold" }),
    fighter_rank_s_token: Object.freeze({ id: "fighter_rank_s_token", name: "S级改装令", category: "archive", rarity: "gold", description: "用于将 A 级战机晋升为 S 级。SS 战机突破至 SSS 改用 5 个 SSS战机模组。", source: "商店（金币）", sellPrice: 1150000, sellCurrency: "gold" }),
    sss_fighter_module: Object.freeze({ id: "sss_fighter_module", name: "SSS战机模组", category: "material", rarity: "rainbow", description: "SS 战机升阶至 SSS 需消耗 5 个；SSS 战机每次升星还需消耗 5 个。", source: "抽卡传奇奖励（二选一）", relatedPanel: "shipGallery" }),
    sss_pilot_medal: Object.freeze({ id: "sss_pilot_medal", name: "SSS级战姬奖章", category: "material", rarity: "rainbow", description: "集齐 5 枚可将 SS 级战姬晋升为 SSS 级；战姬升星时也需消耗 5 枚。", source: "抽卡传奇奖励（二选一）", relatedPanel: "pilotGallery" }),
    pilot_ss_heiyue_copy: Object.freeze({ id: "pilot_ss_heiyue_copy", name: "SS 战姬本体·黑月", category: "archive", rarity: "rainbow", description: "重复获得的黑月完整本体；每次消耗 1 个本体和 5 枚 SSS级战姬奖章提升 1 星，最高 6 星。", source: "重复获得 SS 战姬", relatedPanel: "pilotGallery" }),
    ship_ss_lingguang_copy: Object.freeze({ id: "ship_ss_lingguang_copy", name: "SS 战机本体·凌光", category: "archive", rarity: "rainbow", description: "重复获得的凌光完整本体；凌光达到 SSS 后，每次消耗 1 个本体和 5 个 SSS战机模组提升 1 星并增加 10 点攻击，最高 6 星。", source: "重复获得 SS 战机", relatedPanel: "shipGallery" }),
    active_weapon_module: Object.freeze({ id: "active_weapon_module", name: "武器模组", category: "material", rarity: "purple", description: "可在兑换界面兑换自动武器核心的核心道具。", source: "抽卡精英奖励" })
  });

  function get(id) {
    if (ITEMS[id]) return ITEMS[id];
    return { id: id, name: "未知物资", category: "material", rarity: "blue", description: "旧版本或未登记物资，已安全保留数量。", source: "历史存档" };
  }

  var api = { CATEGORIES: CATEGORIES, ITEMS: ITEMS, get: get };
  scope.inventoryCatalog = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
