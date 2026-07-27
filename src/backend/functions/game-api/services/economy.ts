type Json = Record<string, unknown>;
type Context = { userId: string; admin: any };
type Reward = { type: "gold" | "diamonds" | "energy" | "item"; amount: number; itemId?: string };
type ShopItem = { priceCurrency: "free" | "gold" | "diamonds"; priceAmount: number; rewards: Reward[]; daily?: boolean };

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

const shopItems: Record<string, ShopItem> = {
  daily_free_supply: { priceCurrency: "free", priceAmount: 0, daily: true, rewards: [{ type: "energy", amount: 20 }, { type: "gold", amount: 1000 }] },
  energy_small: { priceCurrency: "diamonds", priceAmount: 3, rewards: [{ type: "energy", amount: 50 }] },
  energy_large: { priceCurrency: "diamonds", priceAmount: 8, rewards: [{ type: "energy", amount: 150 }, { type: "gold", amount: 2000 }] },
  gold_small: { priceCurrency: "diamonds", priceAmount: 5, rewards: [{ type: "gold", amount: 1200 }] },
  gold_medium: { priceCurrency: "diamonds", priceAmount: 20, rewards: [{ type: "gold", amount: 5500 }] },
  gold_large: { priceCurrency: "diamonds", priceAmount: 60, rewards: [{ type: "gold", amount: 18000 }] },
  attack_pack: { priceCurrency: "gold", priceAmount: 6000, rewards: [{ type: "item", itemId: "attack_core", amount: 1 }] },
  armor_pack: { priceCurrency: "gold", priceAmount: 6000, rewards: [{ type: "item", itemId: "armor_core", amount: 1 }] },
  pierce_pack: { priceCurrency: "gold", priceAmount: 8000, rewards: [{ type: "item", itemId: "pierce_core", amount: 1 }] },
  upgrade_bundle: { priceCurrency: "diamonds", priceAmount: 18, rewards: [{ type: "item", itemId: "attack_core", amount: 1 }, { type: "item", itemId: "armor_core", amount: 1 }, { type: "item", itemId: "pierce_core", amount: 1 }, { type: "gold", amount: 5000 }] },
  starlink_ticket: { priceCurrency: "diamonds", priceAmount: 12, rewards: [{ type: "item", itemId: "starlink_ticket", amount: 1 }] },
  starlink_ten: { priceCurrency: "diamonds", priceAmount: 108, rewards: [{ type: "item", itemId: "starlink_ticket", amount: 10 }] },
  silver_wing_box: { priceCurrency: "diamonds", priceAmount: 30, rewards: [{ type: "item", itemId: "silver_wing_part", amount: 1 }] },
  s_pilot_token: { priceCurrency: "gold", priceAmount: 900000, rewards: [{ type: "item", itemId: "s_pilot_token", amount: 1 }] },
  s_fighter_token: { priceCurrency: "gold", priceAmount: 1300000, rewards: [{ type: "item", itemId: "s_fighter_token", amount: 1 }] }
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
  daily_sortie_1: [{ type: "gold", amount: 2000 }], daily_sortie_3: [{ type: "gold", amount: 5000 }], daily_upgrade_once: [{ type: "gold", amount: 3000 }],
  daily_perfect_1: [{ type: "gold", amount: 8000 }], daily_boss_1: [{ type: "gold", amount: 5000 }], daily_gold_10000: [{ type: "energy", amount: 20 }],
  daily_dossier_check: [{ type: "gold", amount: 1000 }], daily_supply_check: [{ type: "gold", amount: 1000 }], task_first_sortie: [{ type: "gold", amount: 2000 }],
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
      energy: rewards.filter((reward) => reward.type === "energy").reduce((sum, reward) => sum + reward.amount, 0)
    };
  }

  async function buyShopItem(ctx: Context, body: Json) {
    const itemId = String(body.itemId || "");
    const item = shopItems[itemId];
    if (!item) return deps.error("商品不存在。", 404);
    const { profile, revision } = await deps.loadProfile(ctx);
    const today = shanghaiDateKey();
    const claimed = profile.claimedDailyShop?.date === today && Array.isArray(profile.claimedDailyShop.ids) ? profile.claimedDailyShop.ids : [];
    if (item.daily && claimed.includes(itemId)) return deps.error("今日已领取此商品。", 409);
    if (item.priceCurrency === "diamonds" && Number(profile.resources.diamonds || 0) < item.priceAmount) return deps.error("钻石不足。", 409);
    if (item.priceCurrency === "gold" && deps.getGold(profile) < item.priceAmount) return deps.error("金币不足。", 409);
    if (item.priceCurrency === "diamonds") profile.resources.diamonds -= item.priceAmount;
    if (item.priceCurrency === "gold") deps.setGold(profile, deps.getGold(profile) - item.priceAmount);
    if (item.daily) profile.claimedDailyShop = { date: today, ids: [...claimed, itemId] };
    applyRewards(profile, item.rewards, true);
    const delta = rewardDeltas(item.rewards);
    const saved = await deps.commitProfileOperation(ctx, profile, revision, body, "shop-buy", delta.gold - (item.priceCurrency === "gold" ? item.priceAmount : 0), delta.energy, {
      itemId, priceCurrency: item.priceCurrency, priceAmount: item.priceAmount, rewards: item.rewards
    });
    await deps.refreshLeaderboard(ctx, saved);
    return deps.reply({ profile: deps.publicProfile(saved), itemId, rewards: item.rewards });
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

  return { buyShopItem, claimTask, claimAchievement, claimActivityReward };
}
