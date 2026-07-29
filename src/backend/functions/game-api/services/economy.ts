type Json = Record<string, unknown>;
type Context = { userId: string; admin: any };
type Reward = { type: "gold" | "diamonds" | "energy" | "item"; amount: number; itemId?: string };
type ShopItem = {
  priceCurrency: "free" | "gold" | "diamonds" | "item";
  priceAmount: number;
  priceItemId?: string;
  priceItemTitle?: string;
  priceTiers?: number[];
  limit?: number;
  limitType?: "daily" | "weekly";
  batchable?: boolean;
  rewards: Reward[];
};

type Dependencies = {
  reply: (body: Json, status?: number) => Response;
  error: (message: string, status?: number) => Response;
  loadProfile: (ctx: Context) => Promise<{ profile: any; revision: number; uid: number }>;
  commitProfileOperation: (ctx: Context, profile: any, revision: number, body: Json, action: string, gold: number, energy: number, payload: Json) => Promise<any>;
  publicProfile: (profile: any) => any;
  refreshLeaderboard: (ctx: Context, profile: any) => Promise<unknown>;
  getGold: (profile: any) => number;
  setGold: (profile: any, value: number) => void;
  getStageAliases: (level: { id: number; code: string }) => string[];
  levels: Array<{ id: number; code: string }>;
  readHonorTier: (value: unknown) => number;
  pilotRankById: Record<string, "B" | "A" | "S">;
  shipRankById: Record<string, "B" | "A" | "S">;
};

// ─────────────────────────────────────────────────────────────────────────────
// 商店目录：与前端 src/h5/UI/Shop/ShopConfig.js 的 SHOP_CONTENT 逐项对齐。
// 玩家可见目录必须等于前端；后端为权威校验来源（钻石/金币/持有/品阶/限购/阶梯价）。
// priceAmount 为单价（无阶梯时）；priceTiers 为日/周限购阶梯单价数组；
// priceItemId 仅物物兑换（priceCurrency==="item"）使用，扣减该背包物资。
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// 抽卡（星链研究）服务端权威配置
// 与前端 src/h5/UI/Gacha/gachaConfig.js 逐项对齐。概率 / 保底 / 成本 / 发奖全部由
// 服务器决定，客户端无法篡改结果，从根本上杜绝本地抽卡作弊。
// ─────────────────────────────────────────────────────────────────────────────
const GACHA_TICKET_ID = "starlink_ticket";
const GACHA_PITY_LIMIT = 100;
const GACHA_HISTORY_LIMIT = 100;
const GACHA_DRAW_COSTS: Record<number, number> = { 1: 1, 10: 9 }; // 十连九折，只消耗 9 张
const GACHA_TICKET_DIAMOND_PRICE = 120; // 与商店 starlink_ticket 售价一致
const GACHA_TARGETS: Record<string, { id: string; ownedKey: "pilots" | "ships"; duplicateItem: string; label: string; name: string }> = {
  pilot: { id: "pilot-ss-heiyue", ownedKey: "pilots", duplicateItem: "pilot_ss_heiyue_copy", label: "SS 战姬", name: "黑月" },
  ship: { id: "ship-ss-lingguang", ownedKey: "ships", duplicateItem: "ship_ss_lingguang_copy", label: "SS 战机", name: "凌光" }
};
const GACHA_REWARD_POOLS: Record<string, Array<{ id: string; kind: "gold" | "inventory"; quantity: number; label: string }>> = {
  legendary: [
    { id: "sss_fighter_module", kind: "inventory", quantity: 1, label: "SSS战机模组 ×1" },
    { id: "sss_pilot_medal", kind: "inventory", quantity: 1, label: "SSS级战姬奖章 ×1" }
  ],
  elite: [{ id: "active_weapon_module", kind: "inventory", quantity: 1, label: "武器模组 ×1" }],
  standard: [
    { id: "gold_10000", kind: "gold", quantity: 10000, label: "金币 ×10,000" },
    { id: "gold_30000", kind: "gold", quantity: 30000, label: "金币 ×30,000" },
    { id: "gold_50000", kind: "gold", quantity: 50000, label: "金币 ×50,000" },
    { id: "stamina_potion", kind: "inventory", quantity: 1, label: "体力药水 ×1" },
    { id: "auto_weapon_module_purple", kind: "inventory", quantity: 1, label: "自动武器模块 ×1" }
  ]
};

const DIAMOND_TO_GOLD_RATE = 1000;
const INVENTORY_USE_ENERGY: Record<string, number> = {
  energy_small: 30,
  energy_large: 80,
  stamina_potion: 100,
  energy_potion_daily: 20,
  energy_potion_inventory: 100
};
const INVENTORY_ALIASES: Record<string, string> = {
  energy_potion_inventory: "stamina_potion"
};
const INVENTORY_SELL: Record<string, { currency: "gold" | "diamonds"; amount: number }> = {
  auto_weapon_module_purple: { currency: "gold", amount: 10000 },
  auto_weapon_module_gold: { currency: "diamonds", amount: 100 },
  starlink_ticket: { currency: "diamonds", amount: 120 },
  pilot_rank_a_token: { currency: "gold", amount: 90000 },
  fighter_rank_a_token: { currency: "gold", amount: 100000 },
  pilot_rank_s_token: { currency: "gold", amount: 780000 },
  fighter_rank_s_token: { currency: "gold", amount: 1150000 }
};
const SIGNIN_REWARDS: Record<number, Reward[]> = {
  1: [{ type: "gold", amount: 3000 }],
  2: [{ type: "item", itemId: "attack_core", amount: 1 }],
  3: [{ type: "energy", amount: 60 }],
  4: [{ type: "item", itemId: "armor_core", amount: 1 }],
  5: [{ type: "item", itemId: "silver_wing_part", amount: 1 }],
  6: [{ type: "item", itemId: "starlink_ticket", amount: 1 }],
  7: [{ type: "diamonds", amount: 30 }, { type: "gold", amount: 20000 }]
};

const shopItems: Record<string, ShopItem> = {
  // ── 金币页 ──
  energy_potion_daily: {
    priceCurrency: "gold",
    priceTiers: [1000, 2000, 3000, 4000, 5000],
    limit: 5,
    limitType: "daily",
    rewards: [{ type: "energy", amount: 20 }]
  },
  auto_weapon_module_purple: {
    priceCurrency: "gold",
    priceAmount: 10000,
    limit: 20,
    limitType: "weekly",
    batchable: true,
    rewards: [{ type: "item", itemId: "auto_weapon_module_purple", amount: 1 }]
  },
  pilot_rank_a_token: {
    priceCurrency: "gold",
    priceAmount: 90000,
    batchable: true,
    rewards: [{ type: "item", itemId: "pilot_rank_a_token", amount: 1 }]
  },
  fighter_rank_a_token: {
    priceCurrency: "gold",
    priceAmount: 100000,
    batchable: true,
    rewards: [{ type: "item", itemId: "fighter_rank_a_token", amount: 1 }]
  },
  active_skill_module_c: {
    priceCurrency: "gold",
    priceAmount: 500000,
    batchable: true,
    rewards: [{ type: "item", itemId: "active_skill_module_c", amount: 1 }]
  },
  active_skill_module_b: {
    priceCurrency: "gold",
    priceAmount: 1000000,
    batchable: true,
    rewards: [{ type: "item", itemId: "active_skill_module_b", amount: 1 }]
  },
  active_skill_module_a: {
    priceCurrency: "gold",
    priceAmount: 1500000,
    batchable: true,
    rewards: [{ type: "item", itemId: "active_skill_module_a", amount: 1 }]
  },
  pilot_rank_s_token: {
    priceCurrency: "gold",
    priceAmount: 780000,
    rewards: [{ type: "item", itemId: "pilot_rank_s_token", amount: 1 }]
  },
  fighter_rank_s_token: {
    priceCurrency: "gold",
    priceAmount: 1150000,
    rewards: [{ type: "item", itemId: "fighter_rank_s_token", amount: 1 }]
  },
  // ── 钻石页 ──
  energy_potion_inventory: {
    priceCurrency: "diamonds",
    priceAmount: 10,
    limit: 5,
    limitType: "weekly",
    rewards: [{ type: "item", itemId: "stamina_potion", amount: 1 }]
  },
  auto_weapon_module_gold: {
    priceCurrency: "diamonds",
    priceAmount: 100,
    limit: 6,
    limitType: "weekly",
    batchable: true,
    rewards: [{ type: "item", itemId: "auto_weapon_module_gold", amount: 1 }]
  },
  active_skill_module_s: {
    priceCurrency: "diamonds",
    priceAmount: 2000,
    batchable: true,
    rewards: [{ type: "item", itemId: "active_skill_module_s", amount: 1 }]
  },
  active_skill_module_ss: {
    priceCurrency: "diamonds",
    priceAmount: 5000,
    batchable: true,
    rewards: [{ type: "item", itemId: "active_skill_module_ss", amount: 1 }]
  },
  active_skill_module_sss: {
    priceCurrency: "diamonds",
    priceAmount: 10000,
    batchable: true,
    rewards: [{ type: "item", itemId: "active_skill_module_sss", amount: 1 }]
  },
  starlink_ticket: {
    priceCurrency: "diamonds",
    priceAmount: 120,
    batchable: true,
    rewards: [{ type: "item", itemId: "starlink_ticket", amount: 1 }]
  },
  // ── 兑换页（物物交换，价格货币为背包物资）──
  exchange_sss_fighter_module: {
    priceCurrency: "item",
    priceItemId: "sss_pilot_medal",
    priceItemTitle: "SSS级战姬奖章",
    priceAmount: 1,
    batchable: true,
    rewards: [{ type: "item", itemId: "sss_fighter_module", amount: 1 }]
  },
  exchange_sss_pilot_medal: {
    priceCurrency: "item",
    priceItemId: "sss_fighter_module",
    priceItemTitle: "SSS战机模组",
    priceAmount: 1,
    batchable: true,
    rewards: [{ type: "item", itemId: "sss_pilot_medal", amount: 1 }]
  },
  exchange_weapon_module_to_core: {
    priceCurrency: "item",
    priceItemId: "active_weapon_module",
    priceItemTitle: "武器模组",
    priceAmount: 1,
    batchable: true,
    rewards: [{ type: "item", itemId: "auto_weapon_module_gold", amount: 1 }]
  },
  exchange_core_to_blue_module: {
    priceCurrency: "item",
    priceItemId: "auto_weapon_module_gold",
    priceItemTitle: "自动武器核心",
    priceAmount: 1,
    batchable: true,
    rewards: [{ type: "item", itemId: "auto_weapon_module_purple", amount: 2 }]
  }
};

const achievementRewards: Record<string, Reward[]> = {
  ach_first_clear: [{ type: "gold", amount: 2000 }], ach_outer_clear: [{ type: "gold", amount: 5000 }], ach_gate_clear: [{ type: "gold", amount: 9000 }],
  ach_chapter_runner: [{ type: "gold", amount: 12000 }], ach_perfect_1: [{ type: "gold", amount: 8000 }], ach_bullet_dance: [{ type: "gold", amount: 16000 }],
  ach_perfect_20: [{ type: "gold", amount: 30000 }], ach_boss_no_damage: [{ type: "gold", amount: 20000 }], ach_attack_5: [{ type: "gold", amount: 12000 }],
  ach_hp_5: [{ type: "gold", amount: 12000 }], ach_pen_5: [{ type: "gold", amount: 12000 }], ach_upgrade_total: [{ type: "gold", amount: 24000 }],
  ach_pilot_roster: [{ type: "gold", amount: 15000 }], ach_ship_roster: [{ type: "gold", amount: 15000 }], ach_s_rank_file: [{ type: "diamonds", amount: 20 }],
  ach_honor_record: [{ type: "gold", amount: 18000 }]
};

const taskRewards: Record<string, Reward[]> = {
  daily_sortie_1: [{ type: "gold", amount: 2000 }, { type: "diamonds", amount: 10 }],
  daily_sortie_3: [{ type: "gold", amount: 5000 }, { type: "diamonds", amount: 15 }],
  daily_upgrade_once: [{ type: "gold", amount: 3000 }, { type: "diamonds", amount: 15 }],
  daily_perfect_1: [{ type: "gold", amount: 8000 }, { type: "diamonds", amount: 20 }],
  daily_boss_1: [{ type: "gold", amount: 5000 }, { type: "diamonds", amount: 15 }],
  daily_gold_10000: [{ type: "energy", amount: 20 }, { type: "diamonds", amount: 20 }],
  daily_dossier_check: [{ type: "gold", amount: 1000 }, { type: "diamonds", amount: 10 }],
  daily_supply_check: [{ type: "gold", amount: 1000 }, { type: "diamonds", amount: 10 }],
  task_first_sortie: [{ type: "gold", amount: 2000 }],
  task_prologue_1: [{ type: "gold", amount: 3000 }], task_prologue_3: [{ type: "gold", amount: 5000 }], task_stage_1_1: [{ type: "gold", amount: 6000 }],
  task_stage_1_2: [{ type: "gold", amount: 8000 }], task_stage_1_3: [{ type: "gold", amount: 12000 }], task_attack_3: [{ type: "gold", amount: 4000 }],
  task_hp_3: [{ type: "gold", amount: 4000 }], task_pen_3: [{ type: "gold", amount: 4000 }], task_upgrade_total_10: [{ type: "gold", amount: 10000 }],
  task_clear_3: [{ type: "gold", amount: 5000 }], task_clear_10: [{ type: "gold", amount: 12000 }], task_clear_20: [{ type: "gold", amount: 24000 }],
  task_perfect_1: [{ type: "gold", amount: 8000 }], task_perfect_5: [{ type: "gold", amount: 18000 }], task_boss_no_damage_1: [{ type: "gold", amount: 10000 }],
  task_roster_2: [{ type: "gold", amount: 8000 }], task_hangar_2: [{ type: "gold", amount: 8000 }], task_rank_ship: [{ type: "gold", amount: 6000 }]
};

const activityRewards: Record<number, Reward[]> = {
  20: [{ type: "gold", amount: 3000 }], 40: [{ type: "energy", amount: 30 }], 60: [{ type: "gold", amount: 8000 }],
  80: [{ type: "diamonds", amount: 5 }], 100: [{ type: "gold", amount: 15000 }, { type: "energy", amount: 50 }]
};

export function createEconomyService(deps: Dependencies) {
  function shanghaiDateKey(now = new Date()) {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  }

  // 上海时区 ISO 周键（与前端本地 isoWeekString 算法一致，但锚定上海日期）。
  function shanghaiWeekKey(now = new Date()) {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    const d = new Date(Number(values.year), Number(values.month) - 1, Number(values.day));
    const day = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - day + 3);
    const firstThursday = new Date(d.getFullYear(), 0, 4);
    const firstDay = (firstThursday.getDay() + 6) % 7;
    firstThursday.setDate(4 - firstDay);
    const week = 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000));
    return d.getFullYear() + "-W" + String(week).padStart(2, "0");
  }

  function applyRewards(profile: any, rewards: Reward[], allowEnergyOverflow = false) {
    profile.resources = profile.resources || {};
    profile.resources.inventory = profile.resources.inventory || {};
    for (const reward of rewards) {
      const amount = Math.max(0, Math.floor(Number(reward.amount) || 0));
      if (reward.type === "gold") deps.setGold(profile, deps.getGold(profile) + amount);
      if (reward.type === "diamonds") profile.resources.diamonds = Math.max(0, Math.floor(Number(profile.resources.diamonds) || 0) + amount);
      if (reward.type === "energy") {
        const nextEnergy = Math.max(0, Math.floor(Number(profile.resources.energy) || 0) + amount);
        profile.resources.energy = allowEnergyOverflow ? nextEnergy : Math.min(profile.resources.maxEnergy, nextEnergy);
      }
      if (reward.type === "item" && reward.itemId) profile.resources.inventory[reward.itemId] = Math.max(0, Math.floor(Number(profile.resources.inventory[reward.itemId]) || 0) + amount);
    }
  }

  function rewardDeltas(rewards: Reward[]) {
    return {
      gold: rewards.filter((reward) => reward.type === "gold").reduce((sum, reward) => sum + reward.amount, 0),
      energy: rewards.filter((reward) => reward.type === "energy").reduce((sum, reward) => sum + reward.amount, 0),
      diamonds: rewards.filter((reward) => reward.type === "diamonds").reduce((sum, reward) => sum + reward.amount, 0)
    };
  }

  function currentInventory(profile: any, itemId: string) {
    const inventory = profile.resources && profile.resources.inventory ? profile.resources.inventory : {};
    return Math.max(0, Math.floor(Number(inventory[itemId]) || 0));
  }

  async function buyShopItem(ctx: Context, body: Json) {
    const itemId = String(body.itemId || "");
    const item = shopItems[itemId];
    if (!item) return deps.error("商品不存在。", 404);

    const priceCurrency = item.priceCurrency;
    if (priceCurrency === "free") return deps.error("该商品不可购买。", 400);

    // 非批量商品强制 1 份（与前端 ShopView.buyShopItem 一致）。
    let quantity = Math.max(1, Math.min(99, Math.floor(Number(body.quantity) || 1)));
    if (!item.batchable) quantity = 1;

    const { profile, revision } = await deps.loadProfile(ctx);
    profile.resources = profile.resources || {};
    profile.resources.inventory = profile.resources.inventory || {};

    // ── 日/周限购（上海时区键，兼容旧版无 W 的周键）──
    const dateKey = shanghaiDateKey();
    const weekKey = shanghaiWeekKey();
    const legacyWeekKey = weekKey.replace("-W", "-");
    profile.shopDailyPurchases = profile.shopDailyPurchases || {};
    profile.shopWeeklyPurchases = profile.shopWeeklyPurchases || {};
    const dailyMap = profile.shopDailyPurchases[dateKey] = profile.shopDailyPurchases[dateKey] || {};
    const weeklyMap = profile.shopWeeklyPurchases[weekKey] = profile.shopWeeklyPurchases[weekKey] || {};
    const legacyWeeklyMap = profile.shopWeeklyPurchases[legacyWeekKey] = profile.shopWeeklyPurchases[legacyWeekKey] || {};

    let ownedCount = 0;
    if (item.limitType === "daily") ownedCount = dailyMap[itemId] || 0;
    else if (item.limitType === "weekly") ownedCount = Math.max(weeklyMap[itemId] || 0, legacyWeeklyMap[itemId] || 0);

    const limit = item.limit || 0;
    if (limit > 0 && ownedCount + quantity > limit) {
      return deps.error("今日 / 本周购买已达上限。", 409);
    }

    // ── 单价与总价 ──
    // 阶梯价：第 i 份（i 自已购份数起）单价 = tiers[min(ownedCount + i, len-1)]，总价 = 各份累加（对齐前端 getItemState）。
    let totalPrice = 0;
    if (item.priceTiers && item.priceTiers.length) {
      for (let i = 0; i < quantity; i += 1) {
        const tierIndex = Math.min(ownedCount + i, item.priceTiers.length - 1);
        totalPrice += Math.max(0, Math.floor(Number(item.priceTiers[tierIndex]) || 0));
      }
    } else if (quantity > 1) {
      totalPrice = item.priceAmount * quantity;
    } else {
      totalPrice = item.priceAmount;
    }
    const unitPrice = item.priceTiers && item.priceTiers.length
      ? item.priceTiers[Math.min(ownedCount, item.priceTiers.length - 1)]
      : item.priceAmount;

    // ── 余额 / 物资校验 ──
    if (priceCurrency === "gold" && deps.getGold(profile) < totalPrice) return deps.error("金币不足。", 409);
    if (priceCurrency === "diamonds" && Number(profile.resources.diamonds || 0) < totalPrice) return deps.error("钻石不足。", 409);
    if (priceCurrency === "item") {
      const priceItemId = item.priceItemId as string;
      if (!priceItemId || currentInventory(profile, priceItemId) < totalPrice) return deps.error("用于支付的兑换物资不足。", 409);
    }

    // ── 扣费 ──
    if (priceCurrency === "gold") deps.setGold(profile, deps.getGold(profile) - totalPrice);
    else if (priceCurrency === "diamonds") profile.resources.diamonds -= totalPrice;
    else if (priceCurrency === "item") {
      const priceItemId = item.priceItemId as string;
      profile.resources.inventory[priceItemId] = currentInventory(profile, priceItemId) - totalPrice;
    }

    // ── 发放奖励（按份数累加）──
    const rewards = item.rewards.map((reward) => ({
      type: reward.type,
      amount: reward.amount * quantity,
      ...(reward.itemId ? { itemId: reward.itemId } : {})
    }));
    applyRewards(profile, rewards, true);

    // ── 记录限购 ──
    if (item.limitType === "daily") dailyMap[itemId] = ownedCount + quantity;
    else if (item.limitType === "weekly") {
      weeklyMap[itemId] = ownedCount + quantity;
      legacyWeeklyMap[itemId] = ownedCount + quantity;
    }

    const delta = rewardDeltas(rewards);
    const goldDelta = delta.gold - (priceCurrency === "gold" ? totalPrice : 0);
    const energyDelta = delta.energy;
    const saved = await deps.commitProfileOperation(
      ctx,
      profile,
      revision,
      body,
      "shop-buy",
      goldDelta,
      energyDelta,
      {
        itemId,
        quantity,
        priceCurrency,
        priceItemId: item.priceItemId || null,
        unitPrice,
        priceAmount: totalPrice,
        rewards
      }
    );
    await deps.refreshLeaderboard(ctx, saved);
    return deps.reply({
      profile: deps.publicProfile(saved),
      itemId,
      quantity,
      price: totalPrice,
      priceCurrency,
      priceItemId: item.priceItemId || null,
      priceItemTitle: item.priceItemTitle || null,
      rewards
    });
  }

  async function claimAchievement(ctx: Context, body: Json) {
    const id = String(body.achievementId || "");
    if (!id) return deps.error("缺少 achievementId。", 400);
    const reward = achievementRewards[id];
    if (!reward) return deps.error("成就不存在。", 404);
    const { profile, revision } = await deps.loadProfile(ctx);
    profile.claimedAchievements = Array.isArray(profile.claimedAchievements) ? profile.claimedAchievements : [];
    if (profile.claimedAchievements.includes(id)) return deps.error("成就奖励已领取。", 409);
    if (!isAchievementComplete(id, profile)) return deps.error("成就尚未完成。", 403);
    profile.claimedAchievements = [...profile.claimedAchievements, id];
    applyRewards(profile, reward);
    const delta = rewardDeltas(reward);
    const saved = await deps.commitProfileOperation(ctx, profile, revision, body, "achievement-claim", delta.gold, delta.energy, { achievementId: id, rewards: reward });
    return deps.reply({ profile: deps.publicProfile(saved), rewards: reward });
  }

  async function claimTask(ctx: Context, body: Json) {
    const taskId = String(body.taskId || "");
    if (!taskId) return deps.error("缺少 taskId。", 400);
    const reward = taskRewards[taskId];
    if (!reward) return deps.error("任务不存在。", 404);
    const { profile, revision } = await deps.loadProfile(ctx);
    const daily = taskId.startsWith("daily_");
    const today = shanghaiDateKey();
    const dailyIds = profile.claimedDailyTasks?.date === today && Array.isArray(profile.claimedDailyTasks.ids) ? profile.claimedDailyTasks.ids : [];
    profile.claimedTasks = Array.isArray(profile.claimedTasks) ? profile.claimedTasks : [];
    if (daily ? dailyIds.includes(taskId) : profile.claimedTasks.includes(taskId)) return deps.error(daily ? "今日已领取此任务奖励。" : "任务奖励已领取。", 409);
    if (!isTaskComplete(taskId, profile)) return deps.error("任务尚未完成。", 403);
    if (daily) profile.claimedDailyTasks = { date: today, ids: [...dailyIds, taskId] };
    else profile.claimedTasks = [...profile.claimedTasks, taskId];
    applyRewards(profile, reward);
    const delta = rewardDeltas(reward);
    const saved = await deps.commitProfileOperation(ctx, profile, revision, body, "task-claim", delta.gold, delta.energy, { taskId, rewards: reward });
    return deps.reply({ profile: deps.publicProfile(saved), rewards: reward });
  }

  async function claimActivityReward(ctx: Context, body: Json) {
    const points = Math.floor(Number(body.points) || 0);
    const reward = activityRewards[points];
    if (!reward) return deps.error(points > 0 ? "活跃度奖励不存在。" : "缺少 points。", points > 0 ? 404 : 400);
    const { profile, revision } = await deps.loadProfile(ctx);
    const today = shanghaiDateKey();
    const claimed = profile.claimedDailyActivityRewards?.date === today && Array.isArray(profile.claimedDailyActivityRewards.points) ? profile.claimedDailyActivityRewards.points : [];
    if (claimed.includes(points)) return deps.error("此活跃度奖励已领取。", 409);
    if (getDailyActivity(profile) < points) return deps.error("活跃度尚未达到领取条件。", 403);
    profile.claimedDailyActivityRewards = { date: today, points: [...claimed, points] };
    applyRewards(profile, reward);
    const delta = rewardDeltas(reward);
    const saved = await deps.commitProfileOperation(ctx, profile, revision, body, "activity-reward-claim", delta.gold, delta.energy, { points, rewards: reward });
    return deps.reply({ profile: deps.publicProfile(saved), rewards: reward });
  }

  function hasClearedStage(profile: any, stageId: string) {
    const ids = Array.isArray(profile.progress?.clearedStageIds) ? profile.progress.clearedStageIds.map(String) : [];
    if (ids.includes(stageId) || ids.includes(stageId.replace(/_/g, "-"))) return true;
    const level = deps.levels.find((item) => deps.getStageAliases(item).includes(stageId));
    return Boolean(level && Array.isArray(profile.completed) && profile.completed.includes(level.id));
  }

  function getTaskMetric(taskId: string, profile: any) {
    const clears = Math.max(Number(profile.progress?.clearCount) || 0, Array.isArray(profile.completed) ? profile.completed.length : 0);
    const perfect = Math.max(0, Number(profile.progress?.perfectClearCount) || 0);
    const noDamage = Math.max(0, Number(profile.progress?.noDamageBossClearCount) || 0);
    const fighter = profile.fighterUpgrades || {};
    const upgradeTotal = ["attack", "hp", "armorPenetration"].reduce((sum, key) => sum + Math.max(1, Number(fighter[key]) || 1), 0);
    const scene = profile.scene || {};
    const shipRank = deps.shipRankById[String(scene.shipId || "")] || "B";
    const metrics: Record<string, number> = {
      daily_sortie_1: clears, daily_sortie_3: clears, daily_upgrade_once: upgradeTotal - 3, daily_perfect_1: perfect, daily_boss_1: clears,
      daily_gold_10000: Math.max(0, Number(profile.localEarned?.gold) || 0), daily_dossier_check: 1, daily_supply_check: 1,
      task_first_sortie: clears, task_attack_3: Math.max(1, Number(fighter.attack) || 1), task_hp_3: Math.max(1, Number(fighter.hp) || 1),
      task_pen_3: Math.max(1, Number(fighter.armorPenetration) || 1), task_upgrade_total_10: upgradeTotal, task_clear_3: clears, task_clear_10: clears,
      task_clear_20: clears, task_perfect_1: perfect, task_perfect_5: perfect, task_boss_no_damage_1: noDamage,
      task_roster_2: Array.isArray(profile.owned?.pilots) ? profile.owned.pilots.length : 0, task_hangar_2: Array.isArray(profile.owned?.ships) ? profile.owned.ships.length : 0,
      task_rank_ship: ["A", "S"].includes(shipRank) ? 1 : 0
    };
    if (taskId === "task_prologue_1") return hasClearedStage(profile, "prologue_1") ? 1 : 0;
    if (taskId === "task_prologue_3") return hasClearedStage(profile, "prologue_3") ? 1 : 0;
    if (taskId === "task_stage_1_1") return hasClearedStage(profile, "1_1") ? 1 : 0;
    if (taskId === "task_stage_1_2") return hasClearedStage(profile, "1_2") ? 1 : 0;
    if (taskId === "task_stage_1_3") return hasClearedStage(profile, "1_3") ? 1 : 0;
    return metrics[taskId] ?? -1;
  }

  function isTaskComplete(id: string, profile: any) {
    const targets: Record<string, number> = {
      daily_sortie_1: 1, daily_sortie_3: 3, daily_upgrade_once: 1, daily_perfect_1: 1, daily_boss_1: 1, daily_gold_10000: 10000,
      daily_dossier_check: 1, daily_supply_check: 1, task_first_sortie: 1, task_prologue_1: 1, task_prologue_3: 1, task_stage_1_1: 1,
      task_stage_1_2: 1, task_stage_1_3: 1, task_attack_3: 3, task_hp_3: 3, task_pen_3: 3, task_upgrade_total_10: 10,
      task_clear_3: 3, task_clear_10: 10, task_clear_20: 20, task_perfect_1: 1, task_perfect_5: 5, task_boss_no_damage_1: 1,
      task_roster_2: 2, task_hangar_2: 2, task_rank_ship: 1
    };
    return targets[id] != null && getTaskMetric(id, profile) >= targets[id];
  }

  function getDailyActivity(profile: any) {
    const activity: Record<string, number> = {
      daily_sortie_1: 10, daily_sortie_3: 20, daily_upgrade_once: 15, daily_perfect_1: 25,
      daily_boss_1: 20, daily_gold_10000: 15, daily_dossier_check: 5, daily_supply_check: 5
    };
    return Object.keys(activity).reduce((sum, id) => sum + (isTaskComplete(id, profile) ? activity[id] : 0), 0);
  }

  function isAchievementComplete(id: string, profile: any) {
    const fighter = profile.fighterUpgrades || {};
    const upgradeTotal = ["attack", "hp", "armorPenetration"].reduce((sum, key) => sum + Math.max(1, Number(fighter[key]) || 1), 0);
    const honors = Object.values(profile.progress?.stageHonors || {}).map(deps.readHonorTier);
    const metrics: Record<string, number> = {
      ach_first_clear: Math.max(Number(profile.progress?.clearCount) || 0, Array.isArray(profile.completed) ? profile.completed.length : 0),
      ach_outer_clear: hasClearedStage(profile, "1_1") ? 1 : 0, ach_gate_clear: hasClearedStage(profile, "1_3") ? 1 : 0,
      ach_chapter_runner: Math.max(Number(profile.progress?.clearCount) || 0, Array.isArray(profile.completed) ? profile.completed.length : 0),
      ach_perfect_1: Number(profile.progress?.perfectClearCount) || 0, ach_bullet_dance: Number(profile.progress?.perfectClearCount) || 0,
      ach_perfect_20: Number(profile.progress?.perfectClearCount) || 0, ach_boss_no_damage: Number(profile.progress?.noDamageBossClearCount) || 0,
      ach_attack_5: Number(fighter.attack) || 1, ach_hp_5: Number(fighter.hp) || 1, ach_pen_5: Number(fighter.armorPenetration) || 1,
      ach_upgrade_total: upgradeTotal, ach_pilot_roster: Array.isArray(profile.owned?.pilots) ? profile.owned.pilots.length : 0,
      ach_ship_roster: Array.isArray(profile.owned?.ships) ? profile.owned.ships.length : 0,
      ach_s_rank_file: [...(profile.owned?.pilots || []), ...(profile.owned?.ships || [])].some((assetId: string) => (deps.pilotRankById[assetId] || deps.shipRankById[assetId]) === "S") ? 1 : 0,
      ach_honor_record: honors.length ? Math.max(...honors) : 0
    };
    const targets: Record<string, number> = {
      ach_first_clear: 1, ach_outer_clear: 1, ach_gate_clear: 1, ach_chapter_runner: 10, ach_perfect_1: 1, ach_bullet_dance: 5,
      ach_perfect_20: 20, ach_boss_no_damage: 5, ach_attack_5: 5, ach_hp_5: 5, ach_pen_5: 5, ach_upgrade_total: 15,
      ach_pilot_roster: 3, ach_ship_roster: 3, ach_s_rank_file: 1, ach_honor_record: 3
    };
    return targets[id] != null && (metrics[id] || 0) >= targets[id];
  }

  // ── 抽卡（星链研究）：服务端权威概率 + 扣券/钻石 + 发奖 + 保底 ──
  function normalizeGachaState(value: any) {
    value = value || {};
    const loaded = Number(value.pity);
    const pity = Number.isFinite(loaded) && loaded > 0 ? Math.min(GACHA_PITY_LIMIT, Math.floor(loaded)) : GACHA_PITY_LIMIT;
    return {
      version: 1,
      target: value.target || null,
      pity,
      totalDraws: Math.max(0, Math.floor(Number(value.totalDraws) || 0)),
      history: Array.isArray(value.history) ? value.history.slice(0, GACHA_HISTORY_LIMIT) : []
    };
  }

  function gachaRollTier(rng: () => number, pityRemaining: number) {
    if (pityRemaining <= 1) return "ultimate";
    const roll = rng();
    if (roll < 0.01) return "ultimate";
    if (roll < 0.06) return "legendary";
    if (roll < 0.30) return "elite";
    return "standard";
  }

  function gachaResolveReward(tier: string, targetKey: string) {
    if (tier === "ultimate") {
      const t = GACHA_TARGETS[targetKey];
      return { id: t.id, kind: "ultimate", quantity: 1, label: t.label + " · " + t.name };
    }
    const pool = GACHA_REWARD_POOLS[tier] || [];
    const reward = pool[Math.floor(Math.random() * pool.length)] || { id: "gold_10000", kind: "gold", quantity: 10000, label: "金币 ×10,000" };
    return { ...reward };
  }

  function gachaApplyReward(profile: any, reward: any, targetKey: string) {
    const target = GACHA_TARGETS[targetKey];
    if (reward.kind === "gold") {
      deps.setGold(profile, deps.getGold(profile) + Math.max(0, Math.floor(Number(reward.quantity) || 0)));
      return reward;
    }
    if (reward.kind === "inventory") {
      profile.resources.inventory[reward.id] = Math.max(0, Math.floor(Number(profile.resources.inventory[reward.id]) || 0) + Math.max(0, Math.floor(Number(reward.quantity) || 0)));
      return reward;
    }
    const ownedKey = target.ownedKey;
    profile.owned = profile.owned || {};
    profile.owned[ownedKey] = Array.isArray(profile.owned[ownedKey]) ? profile.owned[ownedKey] : [];
    if (profile.owned[ownedKey].indexOf(target.id) < 0) {
      profile.owned[ownedKey].push(target.id);
      return reward;
    }
    const dupId = target.duplicateItem;
    profile.resources.inventory[dupId] = Math.max(0, Math.floor(Number(profile.resources.inventory[dupId]) || 0) + 1);
    return { id: dupId, kind: "duplicate", quantity: 1, duplicate: true, label: target.label + "本体 ×1（已存入背包）" };
  }

  function gachaSummarize(results: Array<{ tier: string; reward: any }>) {
    const map: Record<string, any> = {};
    for (const item of results) {
      const key = item.reward.id + "::" + item.reward.label;
      if (!map[key]) map[key] = { id: item.reward.id, label: item.reward.label, quantity: 0, tier: item.tier };
      map[key].quantity += Math.max(1, Math.floor(Number(item.reward.quantity) || 1));
    }
    return Object.keys(map).map((key) => map[key]);
  }

  function getDiamondCountLocal(profile: any) {
    return Math.max(0, Math.floor(Number(profile.resources?.diamonds) || 0));
  }

  async function gachaDraw(ctx: Context, body: Json) {
    const targetKey = String(body.target || "");
    if (!targetKey || !GACHA_TARGETS[targetKey]) return deps.error("请先选择终极目标。", 400);
    const count = Number(body.count) === 10 ? 10 : 1;
    const buyMissingTickets = Boolean(body.buyMissingTickets);

    const { profile, revision } = await deps.loadProfile(ctx);
    profile.resources = profile.resources || {};
    profile.resources.inventory = profile.resources.inventory || {};
    profile.owned = profile.owned || { pilots: [], ships: [], backgrounds: [] };
    profile.gacha = profile.gacha && typeof profile.gacha === "object" ? profile.gacha : {};

    const tickets = currentInventory(profile, GACHA_TICKET_ID);
    const cost = GACHA_DRAW_COSTS[count];
    const missingTickets = Math.max(0, cost - tickets);
    const diamondCost = missingTickets * GACHA_TICKET_DIAMOND_PRICE;

    if (missingTickets > 0 && !buyMissingTickets) {
      return deps.reply({
        ok: false,
        reason: "TICKET_TOPUP_REQUIRED",
        count,
        ticketCost: cost,
        missingTickets,
        diamondCost,
        canAfford: getDiamondCountLocal(profile) >= diamondCost,
        target: targetKey
      });
    }
    if (missingTickets > 0 && getDiamondCountLocal(profile) < diamondCost) {
      return deps.reply({
        ok: false,
        reason: "DIAMOND_NOT_ENOUGH",
        count,
        ticketCost: cost,
        missingTickets,
        diamondCost,
        target: targetKey
      });
    }

    const rng = () => Math.random();
    let state = normalizeGachaState(profile.gacha);
    state.target = targetKey;

    profile.resources.diamonds = Math.max(0, getDiamondCountLocal(profile) - diamondCost);
    profile.resources.inventory[GACHA_TICKET_ID] = tickets + missingTickets - cost;

    const results: Array<{ tier: string; reward: any }> = [];
    let goldDelta = 0;
    for (let i = 0; i < count; i += 1) {
      const tier = gachaRollTier(rng, state.pity);
      const reward = gachaResolveReward(tier, targetKey);
      const applied = gachaApplyReward(profile, reward, targetKey);
      if (applied.kind === "gold") goldDelta += Math.max(0, Math.floor(Number(applied.quantity) || 0));
      state.pity = tier === "ultimate" ? GACHA_PITY_LIMIT : state.pity - 1;
      state.totalDraws += 1;
      results.push({ tier, reward: applied });
    }

    const stamped = results.slice().reverse().map((item, idx) => ({
      drawNumber: state.totalDraws - idx,
      tier: item.tier,
      rewardId: item.reward.id,
      label: item.reward.label,
      quantity: item.reward.quantity,
      duplicate: Boolean(item.reward.duplicate),
      at: Date.now()
    }));
    state.history = stamped.concat(state.history || []).slice(0, GACHA_HISTORY_LIMIT);
    state.target = targetKey;
    profile.gacha = state;

    const saved = await deps.commitProfileOperation(
      ctx,
      profile,
      revision,
      body,
      "gacha-draw",
      goldDelta,
      0,
      { target: targetKey, count, cost, missingTickets, diamondCost, results }
    );
    return deps.reply({
      ok: true,
      target: targetKey,
      count,
      cost,
      ticketCost: cost,
      missingTickets,
      purchasedTickets: missingTickets,
      diamondCost,
      currency: "ticket",
      profile: deps.publicProfile(saved),
      state,
      results,
      summary: gachaSummarize(results)
    });
  }

  function canonicalInventoryId(itemId: string) {
    return INVENTORY_ALIASES[itemId] || itemId;
  }

  function inventorySourceId(profile: any, itemId: string) {
    const canonical = canonicalInventoryId(itemId);
    const inventory = profile.resources?.inventory || {};
    if (currentInventory(profile, canonical) > 0) return canonical;
    return Object.keys(inventory).find((key) => canonicalInventoryId(key) === canonical && currentInventory(profile, key) > 0) || "";
  }

  async function useInventoryItem(ctx: Context, body: Json) {
    const requestedId = String(body.itemId || "");
    const itemId = canonicalInventoryId(requestedId);
    const energyAmount = INVENTORY_USE_ENERGY[itemId];
    if (!energyAmount) return deps.error("该物资当前不可使用。", 400);
    const { profile, revision } = await deps.loadProfile(ctx);
    profile.resources = profile.resources || {};
    profile.resources.inventory = profile.resources.inventory || {};
    const sourceId = inventorySourceId(profile, requestedId);
    if (!sourceId) return deps.error("物资数量不足。", 409);
    const maximum = Math.max(0, Math.floor(Number(profile.resources.maxEnergy) || 0));
    const current = Math.max(0, Math.floor(Number(profile.resources.energy) || 0));
    if (maximum > 0 && current >= maximum) return deps.error("体力已满，道具没有消耗。", 409);
    const restored = maximum > 0 ? Math.min(energyAmount, maximum - current) : energyAmount;
    profile.resources.inventory[sourceId] = currentInventory(profile, sourceId) - 1;
    profile.resources.energy = current + restored;
    const saved = await deps.commitProfileOperation(
      ctx,
      profile,
      revision,
      body,
      "inventory-use",
      0,
      restored,
      { itemId, sourceItemId: sourceId, restored }
    );
    return deps.reply({
      profile: deps.publicProfile(saved),
      itemId,
      restored,
      remaining: currentInventory(saved, sourceId)
    });
  }

  async function sellInventoryItem(ctx: Context, body: Json) {
    const itemId = String(body.itemId || "");
    const sale = INVENTORY_SELL[itemId];
    if (!sale) return deps.error("该物资不可出售。", 400);
    const { profile, revision } = await deps.loadProfile(ctx);
    profile.resources = profile.resources || {};
    profile.resources.inventory = profile.resources.inventory || {};
    if (currentInventory(profile, itemId) <= 0) return deps.error("物资数量不足。", 409);
    profile.resources.inventory[itemId] = currentInventory(profile, itemId) - 1;
    if (sale.currency === "gold") deps.setGold(profile, deps.getGold(profile) + sale.amount);
    else profile.resources.diamonds = Math.max(0, Math.floor(Number(profile.resources.diamonds) || 0) + sale.amount);
    const saved = await deps.commitProfileOperation(
      ctx,
      profile,
      revision,
      body,
      "inventory-sell",
      sale.currency === "gold" ? sale.amount : 0,
      0,
      { itemId, sellCurrency: sale.currency, refunded: sale.amount }
    );
    return deps.reply({
      profile: deps.publicProfile(saved),
      itemId,
      sellCurrency: sale.currency,
      refunded: sale.amount,
      remaining: currentInventory(saved, itemId)
    });
  }

  async function exchangeDiamonds(ctx: Context, body: Json) {
    const amount = Math.max(1, Math.min(9999, Math.floor(Number(body.amount) || 1)));
    const { profile, revision } = await deps.loadProfile(ctx);
    profile.resources = profile.resources || {};
    const diamonds = Math.max(0, Math.floor(Number(profile.resources.diamonds) || 0));
    if (diamonds < amount) return deps.error("钻石不足，无法完成兑换。", 409);
    const goldGain = amount * DIAMOND_TO_GOLD_RATE;
    profile.resources.diamonds = diamonds - amount;
    deps.setGold(profile, deps.getGold(profile) + goldGain);
    const saved = await deps.commitProfileOperation(
      ctx,
      profile,
      revision,
      body,
      "exchange-diamonds",
      goldGain,
      0,
      { diamonds: amount, goldGain, rate: DIAMOND_TO_GOLD_RATE }
    );
    return deps.reply({
      profile: deps.publicProfile(saved),
      amount,
      goldGain,
      rate: DIAMOND_TO_GOLD_RATE
    });
  }

  async function claimSignIn(ctx: Context, body: Json) {
    const { profile, revision } = await deps.loadProfile(ctx);
    const today = shanghaiDateKey();
    const record = profile.signIn && typeof profile.signIn === "object" ? profile.signIn : {};
    if (record.lastClaimDate === today) return deps.error("今日签到奖励已领取。", 409);
    const day = Math.max(1, Math.min(7, (Math.floor(Number(record.day) || 0) % 7) + 1));
    const rewards = SIGNIN_REWARDS[day] || [];
    profile.signIn = {
      day,
      lastClaimDate: today,
      totalClaims: Math.max(0, Math.floor(Number(record.totalClaims) || 0)) + 1
    };
    applyRewards(profile, rewards, true);
    const delta = rewardDeltas(rewards);
    const saved = await deps.commitProfileOperation(
      ctx,
      profile,
      revision,
      body,
      "daily-signin",
      delta.gold,
      delta.energy,
      { day, date: today, rewards }
    );
    return deps.reply({
      profile: deps.publicProfile(saved),
      day,
      date: today,
      rewards
    });
  }

  return {
    buyShopItem,
    claimTask,
    claimAchievement,
    claimActivityReward,
    gachaDraw,
    useInventoryItem,
    sellInventoryItem,
    exchangeDiamonds,
    claimSignIn
  };
}
