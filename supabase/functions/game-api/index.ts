import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Json = Record<string, unknown>;
type Context = { userId: string; admin: ReturnType<typeof createClient> };

const ENERGY_COST = 5;
const COMMANDER_MAX_LEVEL = 60;
const COMMANDER_EXP_TO_NEXT_LEVEL = [0, 130, 190, 224, 246, 266, 282, 298, 310, 322, 334, 344, 354, 362, 370, 378, 386, 394, 400, 410, 1000, 1100, 1200, 1300, 1400, 1000, 1100, 1200, 1300, 1400, 2736, 3548, 3938, 4214, 4432, 4614, 4772, 4910, 5034, 5148, 5252, 5348, 5438, 5524, 5602, 5678, 5750, 5818, 5882, 5944, 6004, 6062, 6118, 6172, 6222, 6272, 6322, 6370, 6416, 6460, 0];
const COMMANDER_TOTAL_EXP_BY_LEVEL = [0, 0, 130, 320, 544, 790, 1056, 1338, 1636, 1946, 2268, 2602, 2946, 3300, 3662, 4032, 4410, 4796, 5190, 5590, 6000, 7000, 8100, 9300, 10600, 12000, 13000, 14100, 15300, 16600, 18000, 20736, 24284, 28222, 32436, 36868, 41482, 46254, 51164, 56198, 61346, 66598, 71946, 77384, 82908, 88510, 94188, 99938, 105756, 111638, 117582, 123586, 129648, 135766, 141938, 148160, 154432, 160754, 167124, 173540, 180000];
const getMaxEnergyByLevel = (level: number) => 300 + Math.max(1, Math.min(COMMANDER_MAX_LEVEL, Math.floor(level || 1))) * 5;
const ENERGY_MAX = getMaxEnergyByLevel(1);
const ENERGY_RECOVER_MS = 5 * 60 * 1000;
const legacyLevels = [
  { id: 1, code: "1-1", reward: 260 },
  { id: 2, code: "1-2", reward: 390 },
  { id: 3, code: "1-3", reward: 560 }
];
const levels = (() => {
  const result: Array<{ id: number; code: string; reward: number }> = [];
  for (let stage = 1; stage <= 3; stage += 1) result.push({ id: result.length + 1, code: `序章-${stage}`, reward: 180 + stage * 60 });
  for (let chapter = 1; chapter <= 9; chapter += 1) for (let stage = 1; stage <= 10; stage += 1) result.push({ id: result.length + 1, code: `${chapter}-${stage}`, reward: Math.round(280 + chapter * 210 + stage * 55 + (stage === 10 ? 320 : 0)) });
  return result;
})();
const upgrades: Record<string, { max: number; baseCost: number }> = {
  fire: { max: 10, baseCost: 90 },
  armor: { max: 6, baseCost: 130 },
  engine: { max: 6, baseCost: 110 },
  bounty: { max: 8, baseCost: 100 }
};
const redeemCodes: Record<string, { minLevel: number; rewards: Array<{ type: "gold" | "stamina" | "item"; amount: number; itemId?: string }> }> = {
  RXZJ666: { minLevel: 1, rewards: [{ type: "gold", amount: 30000 }, { type: "stamina", amount: 50 }] },
  SKY2026: { minLevel: 1, rewards: [{ type: "gold", amount: 50000 }] },
  FIGHTER888: { minLevel: 5, rewards: [{ type: "gold", amount: 80000 }, { type: "item", itemId: "fighter_upgrade_ticket", amount: 1 }] },
  PILOT888: { minLevel: 3, rewards: [{ type: "gold", amount: 60000 }, { type: "item", itemId: "pilot_training_chip", amount: 3 }] },
  ACE2026: { minLevel: 10, rewards: [{ type: "gold", amount: 100000 }, { type: "stamina", amount: 100 }] }
};
const shopItems: Record<string, { priceDiamond: number; gold: number }> = { gold_200: { priceDiamond: 1, gold: 200 } };

function baseProfile() {
  const now = Date.now();
  return {
    saveVersion: 5,
    coins: 0,
    unlockedLevel: 1,
    completed: [] as number[],
    upgrades: { fire: 0, armor: 0, engine: 0, bounty: 0 },
    fighterUpgrades: { attack: 1, armorPenetration: 1, hp: 1 },
    player: { name: "王牌飞行员", avatar: "", level: 1, exp: 0, expMax: 130, totalExp: 0, badge: "I" },
    resources: { energy: ENERGY_MAX, maxEnergy: ENERGY_MAX, gold: 0, diamonds: 0, lastEnergyAt: now },
    scene: { pilotId: "pilot-s-lingyan", shipId: "ship-a-06", backgroundId: "bg-hangar-01" },
    owned: { pilots: ["pilot-s-lingyan"], ships: ["ship-a-06"], backgrounds: ["bg-hangar-01"] },
    ratings: {},
    progress: { clearedStageIds: [] as string[], clearedChapterIds: [] as number[], stageStars: {}, perfectClearCount: 0, noDamageBossClearCount: 0, clearCount: 0 },
    localEarned: { gold: 0, diamonds: 0 }
  };
}

function normalizeProfile(input: any = {}) {
  const base = baseProfile();
  const profile: any = {
    ...base,
    ...input,
    player: { ...base.player, ...(input.player || {}) },
    resources: { ...base.resources, ...(input.resources || {}) },
    scene: { ...base.scene, ...(input.scene || {}) },
    owned: { ...base.owned, ...(input.owned || {}) },
    upgrades: { ...base.upgrades, ...(input.upgrades || {}) },
    fighterUpgrades: { ...base.fighterUpgrades, ...(input.fighterUpgrades || {}) },
    ratings: input.ratings || {}
    ,progress: { ...base.progress, ...(input.progress || {}) }
  };
  profile.saveVersion = 5;
  profile.unlockedLevel = Math.max(1, Math.min(levels.length, Math.floor(Number(profile.unlockedLevel) || 1)));
  profile.completed = Array.from(new Set((Array.isArray(input.completed) ? input.completed : []).map(Number).filter((id) => levels.some((level) => level.id === id))));
  profile.player.level = Math.max(1, Math.min(COMMANDER_MAX_LEVEL, Math.floor(Number(profile.player.level) || 1)));
  const legacyExp = Math.max(0, Math.floor(Number(profile.player.exp) || 0));
  const suppliedTotalExp = Number(profile.player.totalExp);
  profile.player.totalExp = Math.max(0, Math.floor(Number.isFinite(suppliedTotalExp) ? suppliedTotalExp : COMMANDER_TOTAL_EXP_BY_LEVEL[profile.player.level] + legacyExp));
  while (profile.player.level < COMMANDER_MAX_LEVEL && profile.player.totalExp >= COMMANDER_TOTAL_EXP_BY_LEVEL[profile.player.level + 1]) profile.player.level += 1;
  profile.player.expMax = COMMANDER_EXP_TO_NEXT_LEVEL[profile.player.level];
  profile.player.exp = profile.player.level >= COMMANDER_MAX_LEVEL ? 0 : profile.player.totalExp - COMMANDER_TOTAL_EXP_BY_LEVEL[profile.player.level];
  profile.resources.maxEnergy = getMaxEnergyByLevel(profile.player.level);
  profile.resources.energy = Math.max(0, Math.min(profile.resources.maxEnergy, Math.floor(Number(profile.resources.energy) || 0)));
  profile.resources.gold = Math.max(0, Math.floor(Number(profile.resources.gold ?? profile.coins) || 0));
  profile.resources.diamonds = Math.max(0, Math.floor(Number(profile.resources.diamonds) || 0));
  profile.resources.lastEnergyAt = Math.floor(Number(profile.resources.lastEnergyAt) || Date.now());
  profile.coins = profile.resources.gold;
  profile.progress.clearedStageIds = Array.from(new Set(Array.isArray(profile.progress.clearedStageIds) ? profile.progress.clearedStageIds.map(String) : []));
  profile.progress.clearedChapterIds = Array.from(new Set(Array.isArray(profile.progress.clearedChapterIds) ? profile.progress.clearedChapterIds.map(Number).filter(Number.isFinite) : []));
  profile.progress.stageStars = profile.progress.stageStars || {};
  for (const [key, definition] of Object.entries(upgrades)) profile.upgrades[key] = Math.max(0, Math.min(definition.max, Math.floor(Number(profile.upgrades[key]) || 0)));
  for (const key of ["attack", "armorPenetration", "hp"]) profile.fighterUpgrades[key] = Math.max(1, Math.min(profile.player.level, Math.floor(Number(profile.fighterUpgrades[key]) || 1)));
  return profile;
}

function applyExperience(player: any, amount: number) {
  const gained = Math.max(0, Math.floor(amount || 0));
  const oldLevel = Math.max(1, Math.min(COMMANDER_MAX_LEVEL, Math.floor(Number(player.level) || 1)));
  player.totalExp = Math.max(0, Math.floor(Number(player.totalExp) || COMMANDER_TOTAL_EXP_BY_LEVEL[oldLevel] + Number(player.exp || 0))) + gained;
  player.level = oldLevel;
  while (player.level < COMMANDER_MAX_LEVEL && player.totalExp >= COMMANDER_TOTAL_EXP_BY_LEVEL[player.level + 1]) player.level += 1;
  player.expMax = COMMANDER_EXP_TO_NEXT_LEVEL[player.level];
  player.exp = player.level >= COMMANDER_MAX_LEVEL ? 0 : player.totalExp - COMMANDER_TOTAL_EXP_BY_LEVEL[player.level];
  player.badge = player.level >= 30 ? "V" : player.level >= 20 ? "IV" : player.level >= 12 ? "III" : player.level >= 6 ? "II" : "I";
}

const game = {
  profile: {
    createProfile: baseProfile,
    normalizeProfile,
    getGold: (profile: any) => Math.max(0, Math.floor(Number(profile.resources.gold ?? profile.coins) || 0)),
    setGold: (profile: any, value: number) => { profile.resources.gold = Math.max(0, Math.floor(value || 0)); profile.coins = profile.resources.gold; }
  },
  battleRules: {
    getBattleExperience: ({ levelId, levelCoins = 0, baseReward = 0 }: any) => Math.max(5, Math.round(Number(levelCoins) * 0.28) + Math.round(Number(baseReward) * 0.18) + Number(levelId) * 12),
    applyExperience,
    getSweepReward: (level: any) => Math.round(level.reward * 0.72),
    getSweepExperience: (reward: number, levelId: number) => Math.round((Math.max(5, Math.round(reward * 0.18) + levelId * 12)) * 0.55),
    getUpgradeCost: (upgrade: { baseCost: number }, currentLevel: number) => upgrade.baseCost * (currentLevel + 1),
    completeLevel: (profile: any, level: any, rating: any) => {
      profile.completed = Array.from(new Set([...(profile.completed || []), level.id]));
      profile.unlockedLevel = Math.max(profile.unlockedLevel || 1, Math.min(levels.length, level.id + 1));
      profile.ratings = profile.ratings || {};
      profile.ratings[level.id] = Math.max(Number(profile.ratings[level.id]) || 0, rating.stars);
      profile.progress = profile.progress || { clearedStageIds: [], clearedChapterIds: [], stageStars: {}, perfectClearCount: 0, noDamageBossClearCount: 0, clearCount: 0 };
      const chapterIndex = level.id <= 3 ? 0 : Math.floor((level.id - 4) / 10) + 1;
      const stageInChapter = level.id <= 3 ? level.id : ((level.id - 4) % 10) + 1;
      const stageId = chapterIndex === 0 ? `prologue_${stageInChapter}` : `${chapterIndex}_${stageInChapter}`;
      if (!profile.progress.clearedStageIds.includes(stageId)) profile.progress.clearCount += 1;
      profile.progress.clearedStageIds = Array.from(new Set([...profile.progress.clearedStageIds, stageId]));
      profile.progress.stageStars[level.id] = Math.max(Number(profile.progress.stageStars[level.id]) || 0, rating.stars);
      if (rating.stars >= 3) profile.progress.perfectClearCount += 1;
      if (stageInChapter === 10 && profile.progress.clearedStageIds.filter((id: string) => id.startsWith(`${chapterIndex}_`)).length >= 10 && !profile.progress.clearedChapterIds.includes(chapterIndex)) profile.progress.clearedChapterIds.push(chapterIndex);
    }
  }
};
const corsHeaders = {
  "Access-Control-Allow-Origin": "https://www.rexuezhanji.top",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-rexuezhanji-source-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

function reply(body: Json, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function error(message: string, status = 400) {
  return reply({ error: message }, status);
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((part) => part.toString(16).padStart(2, "0")).join("");
}

function getLevel(levelId: unknown) {
  const level = levels.find((item: { id: number }) => item.id === Number(levelId));
  if (!level) throw new Error("关卡不存在。");
  return level;
}

function normalize(profile: Json) {
  return game.profile.normalizeProfile(profile);
}

function createProfile() {
  return game.profile.createProfile();
}

function recover(profile: any) {
  const now = Date.now();
  const resources = profile.resources;
  resources.energy = Math.max(0, Math.min(resources.maxEnergy, Math.floor(Number(resources.energy) || 0)));
  resources.lastEnergyAt = Math.floor(Number(resources.lastEnergyAt) || now);
  if (resources.energy < resources.maxEnergy) {
    const gained = Math.floor((now - resources.lastEnergyAt) / ENERGY_RECOVER_MS);
    if (gained > 0) {
      resources.energy = Math.min(resources.maxEnergy, resources.energy + gained);
      resources.lastEnergyAt += gained * ENERGY_RECOVER_MS;
    }
  }
  if (resources.energy >= resources.maxEnergy) resources.lastEnergyAt = now;
  return profile;
}

async function context(request: Request): Promise<Context | Response> {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.replace(/^Bearer\s+/i, "");
  if (!token) return error("请先登录。", 401);
  const url = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error: authError } = await admin.auth.getUser(token);
  if (authError || !data.user) return error("登录已过期，请重新登录。", 401);
  return { userId: data.user.id, admin };
}

async function loadProfile(ctx: Context) {
  const { data, error: readError } = await ctx.admin.from("player_profiles").select("profile, revision").eq("user_id", ctx.userId).maybeSingle();
  if (readError) throw readError;
  if (data) return { profile: recover(normalize(data.profile)), revision: Number(data.revision) || 0 };
  const profile = recover(createProfile());
  const { error: insertError } = await ctx.admin.from("player_profiles").insert({ user_id: ctx.userId, save_version: profile.saveVersion, profile, revision: 0 });
  if (insertError) throw insertError;
  return { profile, revision: 0 };
}

async function saveProfile(ctx: Context, profile: any, revision: number) {
  profile = normalize(profile);
  const { data, error: updateError } = await ctx.admin
    .from("player_profiles")
    .update({ profile, save_version: profile.saveVersion, revision: revision + 1 })
    .eq("user_id", ctx.userId)
    .eq("revision", revision)
    .select("revision")
    .maybeSingle();
  if (updateError) throw updateError;
  if (!data) throw new Error("存档正在另一台设备更新，请刷新后重试。");
  return profile;
}

async function ledger(ctx: Context, action: string, gold: number, energy: number, payload: Json = {}) {
  const { error: writeError } = await ctx.admin.from("reward_ledger").insert({
    player_id: ctx.userId,
    operation_id: crypto.randomUUID(),
    action,
    delta_gold: gold,
    delta_energy: energy,
    payload
  });
  if (writeError) throw writeError;
}

function publicProfile(profile: any) {
  return normalize(profile);
}

async function bootstrap(ctx: Context) {
  const { profile, revision } = await loadProfile(ctx);
  const saved = await saveProfile(ctx, profile, revision);
  return reply({ profile: publicProfile(saved) });
}

async function startBattle(ctx: Context, body: Json) {
  const level = getLevel(body.levelId);
  const { profile, revision } = await loadProfile(ctx);
  if (level.id > Number(profile.unlockedLevel || 1)) return error("该关卡尚未解锁。", 403);
  if (profile.resources.energy < ENERGY_COST) return error("体力不足。", 409);
  profile.resources.energy -= ENERGY_COST;
  const ticket = `${crypto.randomUUID()}${crypto.randomUUID()}`;
  const ticketHash = await sha256(ticket);
  const saved = await saveProfile(ctx, profile, revision);
  const { error: insertError } = await ctx.admin.from("battle_sessions").insert({
    player_id: ctx.userId,
    level_id: String(level.id),
    ticket_hash: ticketHash,
    expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString()
  });
  if (insertError) throw insertError;
  await ledger(ctx, "start-battle", 0, -ENERGY_COST, { levelId: level.id });
  return reply({ profile: publicProfile(saved), ticket });
}

async function finishBattle(ctx: Context, body: Json) {
  const level = getLevel(body.levelId);
  const ticketHash = await sha256(String(body.ticket || ""));
  const { data: battle, error: battleError } = await ctx.admin.from("battle_sessions")
    .select("id, state, started_at, expires_at")
    .eq("player_id", ctx.userId).eq("ticket_hash", ticketHash).maybeSingle();
  if (battleError) throw battleError;
  if (!battle || battle.state !== "started") return error("战斗票据无效或已经结算。", 409);
  const elapsed = Date.now() - new Date(battle.started_at).getTime();
  if (Date.now() > new Date(battle.expires_at).getTime() || elapsed < 60_000) return error("战斗时长校验未通过。", 409);
  const { profile, revision } = await loadProfile(ctx);
  if (level.id > Number(profile.unlockedLevel || 1)) return error("关卡状态异常。", 409);
  const stars = Math.max(1, Math.min(3, Math.floor(Number((body.rating as Json)?.stars) || 1)));
  const rating = { stars, icons: "★".repeat(stars) + "☆".repeat(3 - stars), label: `${stars}星` };
  const gold = Math.floor(Number(level.reward) || 0);
  const experience = game.battleRules.getBattleExperience({ levelId: level.id, levelCoins: 0, baseReward: gold });
  game.profile.setGold(profile, game.profile.getGold(profile) + gold);
  game.battleRules.applyExperience(profile.player, experience);
  game.battleRules.completeLevel(profile, level, rating);
  const saved = await saveProfile(ctx, profile, revision);
  const settlement = { gold, experience, rating };
  const { error: settledError } = await ctx.admin.from("battle_sessions")
    .update({ state: "settled", settled_at: new Date().toISOString(), settlement })
    .eq("id", battle.id).eq("state", "started");
  if (settledError) throw settledError;
  await ledger(ctx, "finish-battle", gold, 0, { levelId: level.id, rating });
  return reply({ profile: publicProfile(saved), settlement });
}

async function abandonBattle(ctx: Context, body: Json) {
  const ticketHash = await sha256(String(body.ticket || ""));
  await ctx.admin.from("battle_sessions").update({ state: "abandoned", settled_at: new Date().toISOString() })
    .eq("player_id", ctx.userId).eq("ticket_hash", ticketHash).eq("state", "started");
  return reply({ ok: true });
}

async function sweep(ctx: Context, body: Json) {
  const level = getLevel(body.levelId);
  const { profile, revision } = await loadProfile(ctx);
  if (!Array.isArray(profile.completed) || !profile.completed.includes(level.id)) return error("只能扫荡已通关关卡。", 403);
  if (profile.resources.energy < ENERGY_COST) return error("体力不足。", 409);
  const gold = game.battleRules.getSweepReward(level);
  const experience = game.battleRules.getSweepExperience(gold, level.id);
  profile.resources.energy -= ENERGY_COST;
  game.profile.setGold(profile, game.profile.getGold(profile) + gold);
  game.battleRules.applyExperience(profile.player, experience);
  const saved = await saveProfile(ctx, profile, revision);
  await ledger(ctx, "sweep", gold, -ENERGY_COST, { levelId: level.id });
  return reply({ profile: publicProfile(saved), settlement: { gold, experience } });
}

async function upgrade(ctx: Context, body: Json) {
  const key = String(body.key || "");
  const definition = upgrades[key];
  if (!definition) return error("升级项不存在。");
  const { profile, revision } = await loadProfile(ctx);
  const current = Math.max(0, Math.floor(Number(profile.upgrades?.[key]) || 0));
  if (current >= definition.max) return error("该升级已满级。", 409);
  const cost = game.battleRules.getUpgradeCost(definition, current);
  if (game.profile.getGold(profile) < cost) return error("金币不足。", 409);
  game.profile.setGold(profile, game.profile.getGold(profile) - cost);
  profile.upgrades[key] = current + 1;
  const saved = await saveProfile(ctx, profile, revision);
  await ledger(ctx, "upgrade", -cost, 0, { key, level: current + 1 });
  return reply({ profile: publicProfile(saved), cost, key, level: current + 1 });
}

async function saveCosmetics(ctx: Context, body: Json) {
  const { profile, revision } = await loadProfile(ctx);
  const incoming = (body.profile || {}) as any;
  if (typeof incoming.player?.name === "string") profile.player.name = incoming.player.name.trim().slice(0, 20) || profile.player.name;
  if (typeof incoming.player?.avatar === "string" && incoming.player.avatar.length <= 400_000) profile.player.avatar = incoming.player.avatar;
  for (const field of ["pilotId", "shipId", "backgroundId"]) {
    if (typeof incoming.scene?.[field] === "string") profile.scene[field] = incoming.scene[field];
  }
  const saved = await saveProfile(ctx, profile, revision);
  return reply({ profile: publicProfile(saved) });
}

async function redeem(ctx: Context, body: Json) {
  const code = String(body.code || "").replace(/\s+/g, "").toUpperCase().slice(0, 24);
  if (!code) return error("请输入兑换码。", 400);
  const definition = redeemCodes[code];
  if (!definition) return error("兑换码不存在。", 404);
  const { profile, revision } = await loadProfile(ctx);
  profile.usedRedeemCodes = Array.from(new Set(Array.isArray(profile.usedRedeemCodes) ? profile.usedRedeemCodes.map(String) : []));
  if (profile.usedRedeemCodes.includes(code)) return error("该兑换码已使用。", 409);
  if (Number(profile.player?.level || 1) < definition.minLevel) return error(`指挥官等级达到 ${definition.minLevel} 级后可兑换。`, 403);
  profile.resources.inventory = profile.resources.inventory || {};
  for (const reward of definition.rewards) {
    if (reward.type === "gold") game.profile.setGold(profile, game.profile.getGold(profile) + reward.amount);
    if (reward.type === "stamina") profile.resources.energy = Math.min(profile.resources.maxEnergy, profile.resources.energy + reward.amount);
    if (reward.type === "item" && reward.itemId) profile.resources.inventory[reward.itemId] = Math.max(0, Number(profile.resources.inventory[reward.itemId]) || 0) + reward.amount;
  }
  profile.usedRedeemCodes.push(code);
  const saved = await saveProfile(ctx, profile, revision);
  await ledger(ctx, "redeem", definition.rewards.filter((reward) => reward.type === "gold").reduce((sum, reward) => sum + reward.amount, 0), 0, { code, rewards: definition.rewards });
  return reply({ profile: publicProfile(saved), code, rewards: definition.rewards });
}

async function buyShopItem(ctx: Context, body: Json) {
  const item = shopItems[String(body.itemId || "")];
  if (!item) return error("商品不存在。", 404);
  const { profile, revision } = await loadProfile(ctx);
  if (profile.resources.diamonds < item.priceDiamond) return error("钻石不足。", 409);
  profile.resources.diamonds -= item.priceDiamond;
  game.profile.setGold(profile, game.profile.getGold(profile) + item.gold);
  const saved = await saveProfile(ctx, profile, revision);
  await ledger(ctx, "shop", item.gold, 0, { itemId: body.itemId, diamonds: -item.priceDiamond });
  return reply({ profile: publicProfile(saved), itemId: body.itemId, gold: item.gold, priceDiamond: item.priceDiamond });
}

async function migrateAnonymous(ctx: Context, request: Request) {
  const sourceToken = request.headers.get("x-rexuezhanji-source-token") || "";
  if (!sourceToken) return error("缺少游客账号凭据。", 401);
  const { data: sourceData, error: sourceError } = await ctx.admin.auth.getUser(sourceToken);
  if (sourceError || !sourceData.user || sourceData.user.id === ctx.userId) return error("游客账号迁移校验失败。", 401);
  const { data: destination } = await ctx.admin.from("player_profiles").select("user_id").eq("user_id", ctx.userId).maybeSingle();
  if (destination) return bootstrap(ctx);
  const { data: source, error: readError } = await ctx.admin.from("player_profiles").select("profile").eq("user_id", sourceData.user.id).maybeSingle();
  if (readError) throw readError;
  if (source) {
    const { error: insertError } = await ctx.admin.from("player_profiles").insert({ user_id: ctx.userId, save_version: source.profile.saveVersion || 4, profile: normalize(source.profile), revision: 0 });
    if (insertError) throw insertError;
  }
  return bootstrap(ctx);
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return error("仅支持 POST 请求。", 405);
  try {
    const ctx = await context(request);
    if (ctx instanceof Response) return ctx;
    const body = await request.json().catch(() => ({}));
    const action = new URL(request.url).searchParams.get("action");
    if (action === "bootstrap") return await bootstrap(ctx);
    if (action === "start-battle") return await startBattle(ctx, body);
    if (action === "finish-battle") return await finishBattle(ctx, body);
    if (action === "abandon-battle") return await abandonBattle(ctx, body);
    if (action === "sweep") return await sweep(ctx, body);
    if (action === "upgrade") return await upgrade(ctx, body);
    if (action === "save-cosmetics") return await saveCosmetics(ctx, body);
    if (action === "redeem") return await redeem(ctx, body);
    if (action === "shop-buy") return await buyShopItem(ctx, body);
    if (action === "migrate-anonymous") return await migrateAnonymous(ctx, request);
    return error("未知操作。", 404);
  } catch (caught) {
    console.error(caught);
    return error(caught instanceof Error ? caught.message : "服务器处理失败。", 500);
  }
});
