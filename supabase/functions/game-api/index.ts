import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createSocialService } from "./services/social.ts";
import { createEndlessService } from "./services/endless.ts";
import { createEconomyService } from "./services/economy.ts";
import { createProfileTransactionService } from "./services/profileTransaction.ts";

type Json = Record<string, unknown>;
type Context = { userId: string; admin: ReturnType<typeof createClient> };

const ENERGY_COST = 5;
const COMMANDER_MAX_LEVEL = 60;
const STAMINA_LEVEL_ONE_MAX = 120;
const STAMINA_PER_LEVEL = 5;
const STAMINA_MAX_LEVEL_BONUS = 5;
const STAMINA_RULE_VERSION = 2;
const COMMANDER_EXP_TO_NEXT_LEVEL = [0, 130, 190, 224, 246, 266, 282, 298, 310, 322, 334, 344, 354, 362, 370, 378, 386, 394, 400, 410, 1000, 1100, 1200, 1300, 1400, 1000, 1100, 1200, 1300, 1400, 2736, 3548, 3938, 4214, 4432, 4614, 4772, 4910, 5034, 5148, 5252, 5348, 5438, 5524, 5602, 5678, 5750, 5818, 5882, 5944, 6004, 6062, 6118, 6172, 6222, 6272, 6322, 6370, 6416, 6460, 0];
const COMMANDER_TOTAL_EXP_BY_LEVEL = [0, 0, 130, 320, 544, 790, 1056, 1338, 1636, 1946, 2268, 2602, 2946, 3300, 3662, 4032, 4410, 4796, 5190, 5590, 6000, 7000, 8100, 9300, 10600, 12000, 13000, 14100, 15300, 16600, 18000, 20736, 24284, 28222, 32436, 36868, 41482, 46254, 51164, 56198, 61346, 66598, 71946, 77384, 82908, 88510, 94188, 99938, 105756, 111638, 117582, 123586, 129648, 135766, 141938, 148160, 154432, 160754, 167124, 173540, 180000];
const getMaxEnergyByLevel = (level: number) => {
  const safeLevel = Math.max(1, Math.min(COMMANDER_MAX_LEVEL, Math.floor(level || 1)));
  return STAMINA_LEVEL_ONE_MAX + (safeLevel - 1) * STAMINA_PER_LEVEL + (safeLevel >= COMMANDER_MAX_LEVEL ? STAMINA_MAX_LEVEL_BONUS : 0);
};
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

function normalizeHonorTier(value: unknown) {
  return Math.max(0, Math.min(5, Math.floor(Number(value) || 0)));
}

function readHonorTier(value: unknown) {
  if (value && typeof value === "object") {
    const rating = value as Json;
    return normalizeHonorTier(Math.max(
      Number(rating.bestHonorTier) || 0,
      Number(rating.honorTier) || 0,
      Number(rating.tier) || 0,
      Number(rating.stars) || 0
    ));
  }
  return normalizeHonorTier(value);
}

function getStageKeyByLevelId(levelId: number) {
  if (levelId <= 3) return `prologue_${levelId}`;
  const chapterIndex = Math.floor((levelId - 4) / 10) + 1;
  const stageInChapter = ((levelId - 4) % 10) + 1;
  return `${chapterIndex}_${stageInChapter}`;
}

function getStageAliases(level: { id: number; code: string }) {
  const stageKey = getStageKeyByLevelId(level.id);
  return Array.from(new Set([
    stageKey,
    stageKey.replace(/_/g, "-"),
    String(level.id),
    level.code,
    level.code.replace(/-/g, "_")
  ]));
}

function readBestHonor(map: Json | undefined, aliases: string[]) {
  if (!map) return 0;
  return aliases.reduce((best, key) => Math.max(best, readHonorTier(map[key])), 0);
}

function migrateStageHonors(profile: any) {
  profile.progress = profile.progress || {};
  profile.progress.stageHonors = profile.progress.stageHonors || {};
  profile.progress.stageStars = profile.progress.stageStars || {};
  profile.ratings = profile.ratings || {};
  for (const level of levels) {
    const aliases = getStageAliases(level);
    const tier = Math.max(
      readBestHonor(profile.progress.stageHonors, aliases),
      readBestHonor(profile.progress.stageStars, aliases),
      readBestHonor(profile.ratings, aliases)
    );
    if (tier > 0) profile.progress.stageHonors[getStageKeyByLevelId(level.id)] = tier;
  }
}
const upgrades: Record<string, { max: number; baseCost: number }> = {
  armor: { max: 6, baseCost: 130 },
  engine: { max: 6, baseCost: 110 },
  bounty: { max: 8, baseCost: 100 }
};
const FIGHTER_MAX_UPGRADE_LEVEL = 60;
const fighterUpgradeCosts: Record<string, number[]> = {
  attack: [0, 0, 390, 570, 672, 738, 798, 846, 894, 930, 966, 1002, 1032, 1062, 1086, 1110, 1134, 1158, 1182, 1200, 1230, 3000, 3300, 3600, 3900, 4200, 3000, 3300, 3600, 3900, 4200, 8208, 10644, 11814, 12642, 13296, 13842, 14316, 14730, 15102, 15444, 15756, 16044, 16314, 16572, 16806, 17034, 17250, 17454, 17646, 17832, 18012, 18186, 18354, 18516, 18666, 18816, 18966, 19110, 19248, 19380],
  armorPenetration: [0, 0, 585, 855, 1008, 1107, 1197, 1269, 1341, 1395, 1449, 1503, 1548, 1593, 1629, 1665, 1701, 1737, 1773, 1800, 1845, 4500, 4950, 5400, 5850, 6300, 4500, 4950, 5400, 5850, 6300, 12312, 15966, 17721, 18963, 19944, 20763, 21474, 22095, 22653, 23166, 23634, 24066, 24471, 24858, 25209, 25551, 25875, 26181, 26469, 26748, 27018, 27279, 27531, 27774, 27999, 28224, 28449, 28665, 28872, 29070],
  hp: [0, 0, 325, 475, 560, 615, 665, 705, 745, 775, 805, 835, 860, 885, 905, 925, 945, 965, 985, 1000, 1025, 2500, 2750, 3000, 3250, 3500, 2500, 2750, 3000, 3250, 3500, 6840, 8870, 9845, 10535, 11080, 11535, 11930, 12275, 12585, 12870, 13130, 13370, 13595, 13810, 14005, 14195, 14375, 14545, 14705, 14860, 15010, 15155, 15295, 15430, 15555, 15680, 15805, 15925, 16040, 16150]
};
const LEGACY_WEAPON_MODULE_IDS = new Set(["spread-focus", "spread-storm", "laser-prism", "laser-capacitor", "missile-guidance", "missile-warhead"]);
const ACTIVE_SKILL_IDS = new Set([
  "active-summon-wingman",
  "active-decoy",
  "active-chain-lightning",
  "active-black-hole"
]);
const AUTO_PROTOCOL_SOURCE_SHIP: Record<string, string | null> = {
  "sky-lock-beam": "ship-s-09",
  "obsidian-gravity-well": "ship-s-08",
  "gold-judgement-buff": "ship-b-04",
  "phase-shield": null
};
const AUTO_WEAPON_MODULES: Record<string, { defaultLevel: number; maxLevel: number; baseGold: number; goldPerLevel: number }> = {
  weapon_module_04: { defaultLevel: 0, maxLevel: 10, baseGold: 5000, goldPerLevel: 6000 },
  weapon_module_05: { defaultLevel: 1, maxLevel: 10, baseGold: 6000, goldPerLevel: 7000 },
  weapon_module_06: { defaultLevel: 1, maxLevel: 10, baseGold: 5000, goldPerLevel: 6000 },
  "passive-front-spread": { defaultLevel: 0, maxLevel: 10, baseGold: 3000, goldPerLevel: 4000 },
  "passive-railgun": { defaultLevel: 0, maxLevel: 10, baseGold: 5000, goldPerLevel: 6000 },
  "passive-shockwave": { defaultLevel: 0, maxLevel: 10, baseGold: 4000, goldPerLevel: 5000 },
  "passive-chain-lightning": { defaultLevel: 0, maxLevel: 10, baseGold: 4500, goldPerLevel: 5500 },
  "sky-lock-beam": { defaultLevel: 0, maxLevel: 10, baseGold: 6000, goldPerLevel: 7000 },
  "obsidian-gravity-well": { defaultLevel: 0, maxLevel: 10, baseGold: 7000, goldPerLevel: 8000 },
  "gold-judgement-buff": { defaultLevel: 0, maxLevel: 10, baseGold: 5000, goldPerLevel: 6000 },
  "phase-shield": { defaultLevel: 1, maxLevel: 10, baseGold: 6000, goldPerLevel: 7000 }
};
const PILOT_RANK_BY_ID: Record<string, "S" | "A" | "B"> = {
  "pilot-s-lingyan": "S",
  "pilot-s-luoqi": "S",
  "pilot-a-yelan": "S",
  "pilot-a-luofeiyin": "A",
  "pilot-a-shenyao": "A",
  "pilot-b-shenqingyao": "A",
  "pilot-b-bailing": "B",
  "pilot-b-linzhihan": "B",
  "pilot-b-sumianxing": "B",
  "pilot-b-xingtao": "B"
};
const SHIP_RANK_BY_ID: Record<string, "SS" | "S" | "A" | "B"> = {
  "ship-ss-lingguang": "SS",
  "ship-s-09": "S",
  "ship-s-08": "S",
  "ship-b-04": "S",
  "ship-a-07": "A",
  "ship-a-06": "A",
  "ship-b-02": "A",
  "ship-b-01": "B",
  "ship-b-03": "B",
  "ship-b-05": "B"
};
const PILOT_PRICE_BY_RANK = { B: 30000, A: 120000, S: 900000 } as const;
const SHIP_PRICE_BY_RANK = { B: 50000, A: 150000, S: 1300000, SS: 5000000 } as const;
const redeemCodes: Record<string, { minLevel: number; rewards: Array<{ type: "gold" | "stamina" | "item"; amount: number; itemId?: string }> }> = {
  SVIP0903: { minLevel: 1, rewards: [{ type: "gold", amount: 5000000 }] },
  RXZJ666: { minLevel: 1, rewards: [{ type: "gold", amount: 30000 }, { type: "stamina", amount: 50 }] },
  SKY2026: { minLevel: 1, rewards: [{ type: "gold", amount: 50000 }] },
  FIGHTER888: { minLevel: 5, rewards: [{ type: "gold", amount: 80000 }, { type: "item", itemId: "fighter_upgrade_ticket", amount: 1 }] },
  PILOT888: { minLevel: 3, rewards: [{ type: "gold", amount: 60000 }, { type: "item", itemId: "pilot_training_chip", amount: 3 }] },
  ACE2026: { minLevel: 10, rewards: [{ type: "gold", amount: 100000 }, { type: "stamina", amount: 100 }] }
};
function baseProfile() {
  const now = Date.now();
  return {
    saveVersion: 8,
    staminaRuleVersion: STAMINA_RULE_VERSION,
    starterRosterVersion: 2,
    coins: 0,
    unlockedLevel: 1,
    completed: [] as number[],
    upgrades: { fire: 0, armor: 0, engine: 0, bounty: 0 },
    fighterUpgrades: { attack: 1, armorPenetration: 1, hp: 1 },
    shipSkillLoadouts: {} as Record<string, { activeSlots: Array<{ skillId: string; autoEnabled: boolean } | null>; fixedWeaponOverrides: Array<string | null>; autoWeaponIds: Array<string | null> }>,
    autoWeaponLevels: Object.fromEntries(Object.entries(AUTO_WEAPON_MODULES).map(([id, definition]) => [id, definition.defaultLevel])),
    migrationFlags: { weaponModulesV7Refunded: true, activeSkillGradesV8Migrated: true, autoSkillLevelsV8Migrated: true },
    player: { uid: "", name: "王牌飞行员", signature: "保持航线，火力覆盖。", avatar: "", level: 1, exp: 0, expMax: 130, totalExp: 0, badge: "I" },
    resources: { energy: ENERGY_MAX, maxEnergy: ENERGY_MAX, gold: 0, diamonds: 0, lastEnergyAt: now },
    scene: { pilotId: "pilot-b-linzhihan", shipId: "ship-b-01", backgroundId: "bg-hangar-01" },
    owned: { pilots: ["pilot-b-linzhihan"], ships: ["ship-b-01"], backgrounds: ["bg-hangar-01"] },
    ratings: {},
    progress: { clearedStageIds: [] as string[], clearedChapterIds: [] as number[], stageStars: {}, stageHonors: {}, perfectClearCount: 0, noDamageBossClearCount: 0, clearCount: 0 },
    localEarned: { gold: 0, diamonds: 0 }
  };
}

function normalizeAutoWeaponLevels(input: any) {
  const source = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const result: Record<string, number> = {};
  for (const [id, definition] of Object.entries(AUTO_WEAPON_MODULES)) {
    const supplied = Math.floor(Number(source[id]));
    result[id] = Number.isFinite(supplied)
      ? Math.max(definition.defaultLevel, Math.min(definition.maxLevel, supplied))
      : definition.defaultLevel;
  }
  return result;
}

function emptySkillLoadout(): { activeSlots: Array<{ skillId: string; autoEnabled: boolean } | null>; fixedWeaponOverrides: Array<string | null>; autoWeaponIds: Array<string | null> } {
  return { activeSlots: [null, null, null, null], fixedWeaponOverrides: [null, null, null], autoWeaponIds: [null, null, null] };
}

function unlockedActiveSkillIds(profile: any) {
  return new Set<string>(ACTIVE_SKILL_IDS);
}

function ownsAutoSkill(profile: any, skillId: string) {
  if (!Object.prototype.hasOwnProperty.call(AUTO_PROTOCOL_SOURCE_SHIP, skillId)) return true;
  const sourceShipId = AUTO_PROTOCOL_SOURCE_SHIP[skillId];
  return sourceShipId == null || (Array.isArray(profile.owned?.ships) && profile.owned.ships.includes(sourceShipId));
}

function normalizeShipSkillLoadouts(profile: any, input: any, incomingVersion: number) {
  const source = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const unlockedSkills = unlockedActiveSkillIds(profile);
  const result: Record<string, any> = {};
  for (const shipId of profile.owned.ships) {
    const raw = source[shipId];
    if (!raw || typeof raw !== "object") continue;
    const seenSkills = new Set<string>();
    const seenWeapons = new Set<string>();
    const normalizeAutoSlot = (value: any) => {
      const moduleId = String(value || "");
      if (!AUTO_WEAPON_MODULES[moduleId] || !ownsAutoSkill(profile, moduleId) || seenWeapons.has(moduleId) || !(Number(profile.autoWeaponLevels[moduleId]) > 0)) return null;
      seenWeapons.add(moduleId);
      return moduleId;
    };
    const activeSlots = Array.from({ length: 4 }, (_, index) => {
      const slot = Array.isArray(raw.activeSlots) ? raw.activeSlots[index] : null;
      const skillId = String(slot?.skillId || "");
      if (!skillId || !unlockedSkills.has(skillId) || seenSkills.has(skillId)) return null;
      seenSkills.add(skillId);
      return { skillId, autoEnabled: Boolean(slot.autoEnabled) };
    });
    const fixedWeaponOverrides = Array.from({ length: 3 }, (_, index) =>
      normalizeAutoSlot(Array.isArray(raw.fixedWeaponOverrides) ? raw.fixedWeaponOverrides[index] : null));
    const autoWeaponIds = Array.from({ length: 3 }, (_, index) =>
      normalizeAutoSlot(Array.isArray(raw.autoWeaponIds) ? raw.autoWeaponIds[index] : null));
    result[shipId] = { activeSlots, fixedWeaponOverrides, autoWeaponIds };
  }
  if (incomingVersion < 7 && !result[profile.scene.shipId]) {
    const starter = emptySkillLoadout();
    result[profile.scene.shipId] = starter;
  }
  return result;
}

function validateFighterSkillLoadout(profile: any, shipId: string, activeSlots: any, fixedWeaponOverrides: any, autoWeaponIds: any) {
  if (!profile.owned.ships.includes(shipId) || !SHIP_RANK_BY_ID[shipId]) throw new Error("不能为尚未拥有的战机保存配装。");
  if (!Array.isArray(activeSlots) || activeSlots.length !== 4) throw new Error("主动技能槽必须恰好为 4 格。");
  if (!Array.isArray(fixedWeaponOverrides) || fixedWeaponOverrides.length !== 3) throw new Error("基础武器替换槽必须恰好为 3 格。");
  if (!Array.isArray(autoWeaponIds) || autoWeaponIds.length !== 3) throw new Error("扩展自动武装槽必须恰好为 3 格。");
  const unlockedSkills = unlockedActiveSkillIds(profile);
  const seenSkills = new Set<string>();
  const normalizedActive = activeSlots.map((slot: any) => {
    if (slot == null) return null;
    const skillId = String(slot.skillId || "");
    if (!ACTIVE_SKILL_IDS.has(skillId)) throw new Error("主动技能 ID 不合法。");
    if (!unlockedSkills.has(skillId)) throw new Error("该主动技能尚未解锁。");
    if (seenSkills.has(skillId)) throw new Error("同一战机不能重复装备同一主动技能。");
    seenSkills.add(skillId);
    return { skillId, autoEnabled: Boolean(slot.autoEnabled) };
  });
  const seenWeapons = new Set<string>();
  const normalizeAutoSlot = (value: any) => {
    if (value == null || value === "") return null;
    const moduleId = String(value);
    if (!AUTO_WEAPON_MODULES[moduleId]) throw new Error("自动武装 ID 不合法。");
    if (!ownsAutoSkill(profile, moduleId)) throw new Error("尚未拥有该专属自动技能。");
    if (!(Number(profile.autoWeaponLevels[moduleId]) > 0)) throw new Error("请先解锁该自动武装。");
    if (seenWeapons.has(moduleId)) throw new Error("同一战机不能重复装备同一自动武装。");
    seenWeapons.add(moduleId);
    return moduleId;
  };
  const normalizedOverrides = fixedWeaponOverrides.map(normalizeAutoSlot);
  const normalizedWeapons = autoWeaponIds.map(normalizeAutoSlot);
  return { activeSlots: normalizedActive, fixedWeaponOverrides: normalizedOverrides, autoWeaponIds: normalizedWeapons };
}

function normalizeProfile(input: any = {}) {
  const base = baseProfile();
  const incomingVersion = Math.max(0, Math.floor(Number(input.saveVersion) || 0));
  const incomingStarterRosterVersion = Math.max(0, Math.floor(Number(input.starterRosterVersion) || 0));
  const profile: any = {
    ...base,
    ...input,
    player: { ...base.player, ...(input.player || {}) },
    resources: { ...base.resources, ...(input.resources || {}) },
    scene: { ...base.scene, ...(input.scene || {}) },
    owned: { ...base.owned, ...(input.owned || {}) },
    upgrades: { ...base.upgrades, ...(input.upgrades || {}) },
    fighterUpgrades: { ...base.fighterUpgrades, ...(input.fighterUpgrades || {}) },
    shipSkillLoadouts: input.shipSkillLoadouts || {},
    autoWeaponLevels: { ...base.autoWeaponLevels, ...(input.autoWeaponLevels || {}) },
    migrationFlags: { ...base.migrationFlags, ...(input.migrationFlags || {}) },
    ratings: input.ratings || {}
    ,progress: { ...base.progress, ...(input.progress || {}) }
  };
  profile.saveVersion = 8;
  profile.staminaRuleVersion = STAMINA_RULE_VERSION;
  profile.starterRosterVersion = 2;
  profile.unlockedLevel = Math.max(1, Math.min(levels.length, Math.floor(Number(profile.unlockedLevel) || 1)));
  profile.completed = Array.from(new Set((Array.isArray(input.completed) ? input.completed : []).map(Number).filter((id) => levels.some((level) => level.id === id))));
  profile.player.level = Math.max(1, Math.min(COMMANDER_MAX_LEVEL, Math.floor(Number(profile.player.level) || 1)));
  profile.player.uid = String(profile.player.uid || "").replace(/\D/g, "").slice(0, 18);
  profile.player.signature = String(profile.player.signature || base.player.signature).trim().slice(0, 36) || base.player.signature;
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
  const incomingOwnedPilots = (Array.isArray(profile.owned.pilots) ? profile.owned.pilots.map(String) : []).filter((id) => incomingStarterRosterVersion >= 2 || id !== "pilot-s-lingyan");
  const incomingOwnedShips = (Array.isArray(profile.owned.ships) ? profile.owned.ships.map(String) : []).filter((id) => incomingStarterRosterVersion >= 2 || id !== "ship-a-06");
  profile.owned.pilots = Array.from(new Set([
    ...base.owned.pilots,
    ...incomingOwnedPilots
  ].filter((id) => Boolean(PILOT_RANK_BY_ID[id]))));
  profile.owned.ships = Array.from(new Set([
    ...base.owned.ships,
    ...incomingOwnedShips
  ].filter((id) => Boolean(SHIP_RANK_BY_ID[id]))));
  if (!profile.owned.pilots.includes(profile.scene.pilotId)) profile.scene.pilotId = base.scene.pilotId;
  if (!profile.owned.ships.includes(profile.scene.shipId)) profile.scene.shipId = base.scene.shipId;
  profile.autoWeaponLevels = normalizeAutoWeaponLevels(profile.autoWeaponLevels);
  for (const [skillId, sourceShipId] of Object.entries(AUTO_PROTOCOL_SOURCE_SHIP)) {
    if (sourceShipId && profile.owned.ships.includes(sourceShipId)) {
      profile.autoWeaponLevels[skillId] = Math.max(1, Number(profile.autoWeaponLevels[skillId]) || 0);
    }
  }
  const migrationAlreadyApplied = Boolean(input.migrationFlags?.weaponModulesV7Refunded);
  if (incomingVersion < 7 && !migrationAlreadyApplied) {
    const legacyIds = Array.from(new Set(
      (Array.isArray(input.weaponModules?.ownedIds) ? input.weaponModules.ownedIds : [])
        .map(String)
        .filter((id: string) => LEGACY_WEAPON_MODULE_IDS.has(id))
    ));
    profile.resources.gold += legacyIds.length * 50000;
  }
  profile.migrationFlags = {
    ...(profile.migrationFlags || {}),
    weaponModulesV7Refunded: true,
    activeSkillGradesV8Migrated: true,
    autoSkillLevelsV8Migrated: true
  };
  profile.shipSkillLoadouts = normalizeShipSkillLoadouts(profile, input.shipSkillLoadouts, incomingVersion);
  profile.progress.clearedStageIds = Array.from(new Set(Array.isArray(profile.progress.clearedStageIds) ? profile.progress.clearedStageIds.map(String) : []));
  profile.progress.clearedChapterIds = Array.from(new Set(Array.isArray(profile.progress.clearedChapterIds) ? profile.progress.clearedChapterIds.map(Number).filter(Number.isFinite) : []));
  profile.progress.stageStars = profile.progress.stageStars || {};
  migrateStageHonors(profile);
  if (incomingVersion < 6) {
    const fireLevel = Math.max(0, Math.min(10, Math.floor(Number(profile.upgrades.fire) || 0)));
    let credit = 90 * fireLevel * (fireLevel + 1) / 2;
    let attackLevel = Math.max(1, Math.min(profile.player.level, Math.floor(Number(profile.fighterUpgrades.attack) || 1)));
    while (attackLevel < Math.min(profile.player.level, FIGHTER_MAX_UPGRADE_LEVEL)) {
      const nextLevel = attackLevel + 1;
      const cost = Math.max(0, Math.floor(Number(fighterUpgradeCosts.attack[nextLevel]) || 0));
      if (!cost || cost > credit) break;
      credit -= cost;
      attackLevel = nextLevel;
    }
    profile.fighterUpgrades.attack = attackLevel;
    profile.resources.gold += credit;
  }
  profile.upgrades.fire = 0;
  for (const [key, definition] of Object.entries(upgrades)) profile.upgrades[key] = Math.max(0, Math.min(definition.max, Math.floor(Number(profile.upgrades[key]) || 0)));
  for (const key of ["attack", "armorPenetration", "hp"]) profile.fighterUpgrades[key] = Math.max(1, Math.min(profile.player.level, Math.floor(Number(profile.fighterUpgrades[key]) || 1)));
  delete profile.weaponModules;
  profile.coins = profile.resources.gold;
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

function applyProfileExperience(profile: any, amount: number) {
  const oldLevel = Math.max(1, Math.min(COMMANDER_MAX_LEVEL, Math.floor(Number(profile.player?.level) || 1)));
  const oldMaxEnergy = getMaxEnergyByLevel(oldLevel);
  const oldEnergy = Math.max(0, Math.min(oldMaxEnergy, Math.floor(Number(profile.resources?.energy) || 0)));
  applyExperience(profile.player, amount);
  const newMaxEnergy = getMaxEnergyByLevel(profile.player.level);
  const energyGained = Math.max(0, newMaxEnergy - oldMaxEnergy);
  profile.resources.maxEnergy = newMaxEnergy;
  profile.resources.energy = Math.min(newMaxEnergy, oldEnergy + energyGained);
  return { leveled: profile.player.level - oldLevel, energyGained, energyBefore: oldEnergy, energyAfter: profile.resources.energy, maxEnergyBefore: oldMaxEnergy, maxEnergyAfter: newMaxEnergy };
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
    applyProfileExperience,
    getSweepReward: (level: any) => Math.round(level.reward * 0.72),
    getSweepExperience: (reward: number, levelId: number) => Math.round((Math.max(5, Math.round(reward * 0.18) + levelId * 12)) * 0.55),
    getUpgradeCost: (upgrade: { baseCost: number }, currentLevel: number) => upgrade.baseCost * (currentLevel + 1),
    completeLevel: (profile: any, level: any, rating: any) => {
      profile.completed = Array.from(new Set([...(profile.completed || []), level.id]));
      profile.unlockedLevel = Math.max(profile.unlockedLevel || 1, Math.min(levels.length, level.id + 1));
      profile.ratings = profile.ratings || {};
      profile.ratings[level.id] = Math.max(Number(profile.ratings[level.id]) || 0, rating.stars);
      profile.progress = profile.progress || { clearedStageIds: [], clearedChapterIds: [], stageStars: {}, stageHonors: {}, perfectClearCount: 0, noDamageBossClearCount: 0, clearCount: 0 };
      const chapterIndex = level.id <= 3 ? 0 : Math.floor((level.id - 4) / 10) + 1;
      const stageInChapter = level.id <= 3 ? level.id : ((level.id - 4) % 10) + 1;
      const stageId = chapterIndex === 0 ? `prologue_${stageInChapter}` : `${chapterIndex}_${stageInChapter}`;
      if (!profile.progress.clearedStageIds.includes(stageId)) profile.progress.clearCount += 1;
      profile.progress.clearedStageIds = Array.from(new Set([...profile.progress.clearedStageIds, stageId]));
      profile.progress.stageStars[level.id] = Math.max(Number(profile.progress.stageStars[level.id]) || 0, rating.stars);
      profile.progress.stageHonors = profile.progress.stageHonors || {};
      profile.progress.stageHonors[stageId] = Math.max(
        readHonorTier(profile.progress.stageHonors[stageId]),
        readHonorTier(rating)
      );
      if (rating.stars >= 3) profile.progress.perfectClearCount += 1;
      if (stageInChapter === 10 && profile.progress.clearedStageIds.filter((id: string) => id.startsWith(`${chapterIndex}_`)).length >= 10 && !profile.progress.clearedChapterIds.includes(chapterIndex)) profile.progress.clearedChapterIds.push(chapterIndex);
    }
  }
};
const allowedOrigins = new Set(["https://rexuezhanji.top", "https://www.rexuezhanji.top"]);

function corsHeaders(request: Request) {
  const origin = request.headers.get("origin") || "";
  const isLocal = /^https?:\/\/(?:127\.0\.0\.1|localhost|\[::1\])(?::\d+)?$/i.test(origin);
  const isDeployPreview = /^https:\/\/[a-z0-9-]+--rexuezhanji\.netlify\.app$/i.test(origin);
  return {
    "Access-Control-Allow-Origin": allowedOrigins.has(origin) || isLocal || isDeployPreview ? origin : "https://rexuezhanji.top",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-rexuezhanji-source-token",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin"
  };
}

function withCors(response: Response, request: Request) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders(request))) headers.set(key, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function reply(body: Json, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
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
  const { data, error: readError } = await ctx.admin.from("player_profiles").select("profile, revision, public_uid").eq("user_id", ctx.userId).maybeSingle();
  if (readError) throw readError;
  if (data) {
    const profile = recover(normalize(data.profile));
    profile.player.uid = String(data.public_uid || "");
    return { profile, revision: Number(data.revision) || 0, uid: String(data.public_uid || "") };
  }
  const profile = recover(createProfile());
  const { data: inserted, error: insertError } = await ctx.admin.from("player_profiles")
    .insert({ user_id: ctx.userId, save_version: profile.saveVersion, profile, revision: 0 })
    .select("public_uid")
    .single();
  if (insertError) throw insertError;
  profile.player.uid = String(inserted.public_uid || "");
  return { profile, revision: 0, uid: profile.player.uid };
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

const profileTransaction = createProfileTransactionService(normalizeProfile);
const socialService = createSocialService({
  reply,
  error,
  loadProfile,
  readHonorTier,
  pilotRankById: PILOT_RANK_BY_ID,
  shipRankById: SHIP_RANK_BY_ID
});
const endlessService = createEndlessService({ reply, error, sha256 });
const economyService = createEconomyService({
  reply,
  error,
  loadProfile,
  commitProfileOperation: profileTransaction.commit,
  publicProfile,
  refreshLeaderboard: socialService.refreshLeaderboard,
  getGold: game.profile.getGold,
  setGold: game.profile.setGold,
  getStageAliases,
  levels,
  readHonorTier,
  pilotRankById: PILOT_RANK_BY_ID,
  shipRankById: SHIP_RANK_BY_ID
});

async function bootstrap(ctx: Context) {
  const { profile, revision, uid } = await loadProfile(ctx);
  const saved = await saveProfile(ctx, profile, revision);
  saved.player.uid = uid;
  return reply({ profile: publicProfile(saved), uid });
}

async function identity(ctx: Context) {
  const { uid } = await loadProfile(ctx);
  return reply({ uid });
}

async function startBattle(ctx: Context, body: Json) {
  const level = getLevel(body.levelId);
  const { profile, revision } = await loadProfile(ctx);
  if (level.id > Number(profile.unlockedLevel || 1)) return error("该关卡尚未解锁。", 403);
  if (profile.resources.energy < ENERGY_COST) return error("体力不足。", 409);
  profile.resources.energy -= ENERGY_COST;
  const ticket = `${crypto.randomUUID()}${crypto.randomUUID()}`;
  const ticketHash = await sha256(ticket);
  profile.resources.lastEnergyAt = Date.now();
  const committedProfile = normalizeProfile(profile);
  const { error: commitError } = await ctx.admin.rpc("commit_battle_start", {
    p_user_id: ctx.userId,
    p_expected_revision: revision,
    p_profile: committedProfile,
    p_save_version: committedProfile.saveVersion,
    p_ticket_hash: ticketHash,
    p_level_id: String(level.id),
    p_expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    p_operation_id: crypto.randomUUID(),
    p_delta_energy: -ENERGY_COST,
    p_payload: { levelId: level.id }
  });
  if (commitError) throw commitError;
  return reply({ profile: publicProfile(committedProfile), ticket });
}

async function finishBattle(ctx: Context, body: Json) {
  const level = getLevel(body.levelId);
  const ticketHash = await sha256(String(body.ticket || ""));
  const { data: battle, error: battleError } = await ctx.admin.from("battle_sessions")
    .select("id, level_id, state, started_at, expires_at")
    .eq("player_id", ctx.userId).eq("ticket_hash", ticketHash).maybeSingle();
  if (battleError) throw battleError;
  if (!battle || battle.state !== "started") return error("战斗票据无效或已经结算。", 409);
  if (Number(battle.level_id) !== level.id) return error("战斗票据与关卡不匹配。", 409);
  const elapsed = Date.now() - new Date(battle.started_at).getTime();
  if (Date.now() > new Date(battle.expires_at).getTime() || elapsed < 60_000) return error("战斗时长校验未通过。", 409);
  const { profile, revision } = await loadProfile(ctx);
  if (level.id > Number(profile.unlockedLevel || 1)) return error("关卡状态异常。", 409);
  const incomingRating = body.rating as Json || {};
  const stars = Math.max(1, Math.min(3, Math.floor(Number(incomingRating.stars) || 1)));
  const honorTier = Math.max(stars, readHonorTier(incomingRating));
  const honorLabels = ["未通关", "1星", "2星", "3星", "3星金冠", "3星彩冠"];
  const rating = {
    stars: Math.min(3, honorTier),
    honorTier,
    honorLabel: honorLabels[honorTier],
    honorIcon: honorTier >= 5 ? "crownColorful" : honorTier >= 4 ? "crownGold" : "starBadge",
    icons: "★".repeat(Math.min(3, honorTier)) + "☆".repeat(3 - Math.min(3, honorTier)),
    label: honorLabels[honorTier]
  };
  const gold = Math.floor(Number(level.reward) || 0);
  const experience = game.battleRules.getBattleExperience({ levelId: level.id, levelCoins: 0, baseReward: gold });
  game.profile.setGold(profile, game.profile.getGold(profile) + gold);
  const levelProgress = game.battleRules.applyProfileExperience(profile, experience);
  game.battleRules.completeLevel(profile, level, rating);
  const saved = normalizeProfile(profile);
  const settlement = { gold, experience, rating, energyGained: levelProgress.energyGained };
  const { error: settledError } = await ctx.admin.rpc("commit_battle_settlement", {
    p_user_id: ctx.userId,
    p_battle_id: battle.id,
    p_expected_revision: revision,
    p_profile: saved,
    p_save_version: saved.saveVersion,
    p_settlement: settlement,
    p_delta_gold: gold,
    p_delta_energy: levelProgress.energyGained,
    p_payload: { levelId: level.id, rating, energyGained: levelProgress.energyGained }
  });
  if (settledError) throw settledError;
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
  const completedByLevel = Array.isArray(profile.completed) && profile.completed.some((id: unknown) => Number(id) === level.id);
  const completedByStage = Array.isArray(profile.progress?.clearedStageIds) && profile.progress.clearedStageIds.map(String).includes(getStageKeyByLevelId(level.id));
  if (!completedByLevel && !completedByStage) return error("只能扫荡已通关关卡。", 403);

  const aliases = getStageAliases(level);
  const honorTier = Math.max(
    readBestHonor(profile.progress?.stageHonors, aliases),
    readBestHonor(profile.progress?.stageStars, aliases),
    readBestHonor(profile.ratings, aliases)
  );
  if (honorTier < 3) return error("只有三星及以上关卡才能扫荡。", 403);

  const count = Math.max(1, Math.floor(Number(body.count) || 1));
  const currentEnergy = Math.max(0, Math.floor(Number(profile.resources.energy) || 0));
  const maxEnergy = Math.max(0, Math.floor(Number(profile.resources.maxEnergy) || currentEnergy));
  const maxCount = Math.floor(Math.min(currentEnergy, maxEnergy) / ENERGY_COST);
  if (count > maxCount) return error("体力不足。", 409);

  const energySpent = count * ENERGY_COST;
  const singleGold = game.battleRules.getSweepReward(level);
  const singleExperience = game.battleRules.getSweepExperience(singleGold, level.id);
  const gold = singleGold * count;
  const experience = singleExperience * count;
  profile.resources.energy -= energySpent;
  game.profile.setGold(profile, game.profile.getGold(profile) + gold);
  const levelProgress = game.battleRules.applyProfileExperience(profile, experience);
  const saved = await saveProfile(ctx, profile, revision);
  await ledger(ctx, "sweep", gold, levelProgress.energyGained - energySpent, {
    levelId: level.id,
    count,
    energySpent,
    energyGained: levelProgress.energyGained
  });
  return reply({
    profile: publicProfile(saved),
    settlement: { count, energySpent, gold, experience, energyGained: levelProgress.energyGained }
  });
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

async function upgradeFighter(ctx: Context, body: Json) {
  const statType = String(body.statType || "");
  const costs = fighterUpgradeCosts[statType];
  if (!costs) return error("战机强化项目不存在。", 404);
  const { profile, revision } = await loadProfile(ctx);
  const current = Math.max(1, Math.floor(Number(profile.fighterUpgrades?.[statType]) || 1));
  const targetLevel = current + 1;
  if (targetLevel > FIGHTER_MAX_UPGRADE_LEVEL) return error("该强化已满级。", 409);
  if (targetLevel > Number(profile.player?.level || 1)) return error("指挥官等级不足。", 409);
  const cost = Math.max(0, Math.floor(Number(costs[targetLevel]) || 0));
  if (!cost) return error("强化费用配置不存在。", 409);
  if (game.profile.getGold(profile) < cost) return error("金币不足。", 409);
  game.profile.setGold(profile, game.profile.getGold(profile) - cost);
  profile.fighterUpgrades = profile.fighterUpgrades || {};
  profile.fighterUpgrades[statType] = targetLevel;
  const saved = await profileTransaction.commit(ctx, profile, revision, body, "upgrade-fighter", -cost, 0, { statType, level: targetLevel });
  await socialService.refreshLeaderboard(ctx, saved);
  return reply({ profile: publicProfile(saved), cost, statType, level: targetLevel });
}

async function buyRosterItem(ctx: Context, body: Json, type: "pilot" | "ship") {
  const idField = type === "pilot" ? "pilotId" : "shipId";
  const itemId = String(body[idField] || "");
  const rankMap = type === "pilot" ? PILOT_RANK_BY_ID : SHIP_RANK_BY_ID;
  const rank = rankMap[itemId];
  if (!rank) return error(type === "pilot" ? "战姬不存在。" : "战机不存在。", 404);
  const prices = type === "pilot" ? PILOT_PRICE_BY_RANK : SHIP_PRICE_BY_RANK;
  const cost = prices[rank];
  const ownedField = type === "pilot" ? "pilots" : "ships";
  const { profile, revision } = await loadProfile(ctx);
  profile.owned = profile.owned || { pilots: [], ships: [], backgrounds: [] };
  const ownedIds = Array.isArray(profile.owned[ownedField]) ? profile.owned[ownedField] : [];
  if (ownedIds.includes(itemId)) return error(type === "pilot" ? "该战姬已经拥有。" : "该战机已经拥有。", 409);
  if (game.profile.getGold(profile) < cost) return error("金币不足。", 409);
  game.profile.setGold(profile, game.profile.getGold(profile) - cost);
  profile.owned[ownedField] = [...ownedIds, itemId];
  const saved = await saveProfile(ctx, profile, revision);
  await ledger(ctx, type === "pilot" ? "buy-pilot" : "buy-ship", -cost, 0, { itemId, rank });
  return reply({ profile: publicProfile(saved), cost, [idField]: itemId, rank });
}

async function buyPilot(ctx: Context, body: Json) {
  return buyRosterItem(ctx, body, "pilot");
}

async function buyShip(ctx: Context, body: Json) {
  return buyRosterItem(ctx, body, "ship");
}

async function saveFighterSkillLoadout(ctx: Context, body: Json) {
  const shipId = String(body.shipId || "");
  const { profile, revision } = await loadProfile(ctx);
  let loadout;
  try {
    loadout = validateFighterSkillLoadout(profile, shipId, body.activeSlots, body.fixedWeaponOverrides, body.autoWeaponIds);
  } catch (validationError) {
    return error(validationError instanceof Error ? validationError.message : "配装数据不合法。", 400);
  }
  profile.shipSkillLoadouts = profile.shipSkillLoadouts || {};
  profile.shipSkillLoadouts[shipId] = loadout;
  const saved = await saveProfile(ctx, profile, revision);
  return reply({ profile: publicProfile(saved), shipId, loadout });
}

async function upgradeAutoWeapon(ctx: Context, body: Json) {
  const moduleId = String(body.moduleId || body.skillId || "");
  const definition = AUTO_WEAPON_MODULES[moduleId];
  if (!definition) return error("自动武装不存在。", 404);
  const { profile, revision } = await loadProfile(ctx);
  profile.autoWeaponLevels = normalizeAutoWeaponLevels(profile.autoWeaponLevels);
  const sourceShipId = AUTO_PROTOCOL_SOURCE_SHIP[moduleId];
  if (sourceShipId && !profile.owned?.ships?.includes(sourceShipId)) return error("尚未拥有该专属自动技能。", 403);
  const currentLevel = Math.max(0, Math.floor(Number(profile.autoWeaponLevels[moduleId]) || 0));
  if (currentLevel >= definition.maxLevel) return error("该自动武装已达 MAX。", 409);
  const targetLevel = currentLevel + 1;
  const itemId = "auto_weapon_module_purple";
  const secondaryItemId = "auto_weapon_module_gold";
  const itemCount = targetLevel;
  const secondaryItemCount = targetLevel >= 7 ? targetLevel - 6 : 0;
  const cost = Math.max(0, Math.floor(definition.baseGold + definition.goldPerLevel * (targetLevel - 1)));
  profile.resources = profile.resources || {};
  const inventory = profile.resources.inventory = profile.resources.inventory || {};
  const itemOwned = Math.max(0, Math.floor(Number(inventory[itemId]) || 0));
  const secondaryOwned = Math.max(0, Math.floor(Number(inventory[secondaryItemId]) || 0));
  if (itemOwned < itemCount) return error(`自动武器模块不足，还需 ${itemCount - itemOwned} 个。`, 409);
  if (secondaryOwned < secondaryItemCount) return error(`自动武器核心不足，还需 ${secondaryItemCount - secondaryOwned} 个。`, 409);
  if (!cost) return error("该自动武装无法升级。", 409);
  if (game.profile.getGold(profile) < cost) return error("金币不足。", 409);
  inventory[itemId] = itemOwned - itemCount;
  if (secondaryItemCount > 0) inventory[secondaryItemId] = secondaryOwned - secondaryItemCount;
  game.profile.setGold(profile, game.profile.getGold(profile) - cost);
  profile.autoWeaponLevels[moduleId] = targetLevel;
  const saved = await profileTransaction.commit(ctx, profile, revision, body, "upgrade-auto-skill", -cost, 0, {
    moduleId, level: targetLevel, itemId, itemCount, secondaryItemId, secondaryItemCount
  });
  const savedLevel = Number(saved.autoWeaponLevels?.[moduleId]) || targetLevel;
  return reply({
    profile: publicProfile(saved),
    cost,
    goldCost: cost,
    moduleId,
    skillId: moduleId,
    level: savedLevel,
    targetGrade: savedLevel,
    itemId,
    itemCount,
    secondaryItemId,
    secondaryItemCount
  });
}

async function saveCosmetics(ctx: Context, body: Json) {
  const { profile, revision } = await loadProfile(ctx);
  const incoming = (body.profile || {}) as any;
  if (typeof incoming.player?.name === "string") profile.player.name = incoming.player.name.trim().slice(0, 20) || profile.player.name;
  if (typeof incoming.player?.signature === "string") profile.player.signature = incoming.player.signature.trim().slice(0, 36) || profile.player.signature;
  if (typeof incoming.player?.avatar === "string" && incoming.player.avatar.length <= 400_000) profile.player.avatar = incoming.player.avatar;
  const ownershipFields: Record<string, string> = { pilotId: "pilots", shipId: "ships", backgroundId: "backgrounds" };
  for (const field of ["pilotId", "shipId", "backgroundId"]) {
    if (typeof incoming.scene?.[field] !== "string") continue;
    const ownedIds = Array.isArray(profile.owned?.[ownershipFields[field]]) ? profile.owned[ownershipFields[field]] : [];
    if (!ownedIds.includes(incoming.scene[field])) return error("不能使用尚未拥有的外观。", 403);
    profile.scene[field] = incoming.scene[field];
  }
  if (Array.isArray(incoming.progress?.storySeenSceneIds)) {
    profile.progress = profile.progress || {};
    profile.progress.storySeenSceneIds = Array.from(new Set(
      incoming.progress.storySeenSceneIds.map(String).map((value: string) => value.slice(0, 80)).filter(Boolean)
    )).slice(0, 500);
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

async function migrateAnonymous(ctx: Context, request: Request) {
  const sourceToken = request.headers.get("x-rexuezhanji-source-token") || "";
  if (!sourceToken) return error("缺少游客账号凭据。", 401);
  const { data: sourceData, error: sourceError } = await ctx.admin.auth.getUser(sourceToken);
  if (sourceError || !sourceData.user || sourceData.user.id === ctx.userId) return error("游客账号迁移校验失败。", 401);
  const { data: destination } = await ctx.admin.from("player_profiles").select("user_id").eq("user_id", ctx.userId).maybeSingle();
  if (destination) return bootstrap(ctx);
  const { data: source, error: readError } = await ctx.admin.from("player_profiles").select("user_id").eq("user_id", sourceData.user.id).maybeSingle();
  if (readError) throw readError;
  if (source) {
    const { error: migrateError } = await ctx.admin.from("player_profiles").update({ user_id: ctx.userId }).eq("user_id", sourceData.user.id);
    if (migrateError) throw migrateError;
  }
  return bootstrap(ctx);
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(request) });
  let response: Response;
  try {
    if (request.method !== "POST") {
      response = error("仅支持 POST 请求。", 405);
    } else {
      const ctx = await context(request);
      if (ctx instanceof Response) {
        response = ctx;
      } else {
        const body = await request.json().catch(() => ({}));
        const action = new URL(request.url).searchParams.get("action");
        if (action === "bootstrap") response = await bootstrap(ctx);
        else if (action === "identity") response = await identity(ctx);
        else if (action === "start-battle") response = await startBattle(ctx, body);
        else if (action === "finish-battle") response = await finishBattle(ctx, body);
        else if (action === "abandon-battle") response = await abandonBattle(ctx, body);
        else if (action === "sweep") response = await sweep(ctx, body);
        else if (action === "upgrade") response = await upgrade(ctx, body);
        else if (action === "upgrade-fighter") response = await upgradeFighter(ctx, body);
        else if (action === "buy-pilot") response = await buyPilot(ctx, body);
        else if (action === "buy-ship") response = await buyShip(ctx, body);
        else if (action === "save-fighter-skill-loadout") response = await saveFighterSkillLoadout(ctx, body);
        else if (action === "upgrade-auto-weapon") response = await upgradeAutoWeapon(ctx, body);
        else if (action === "upgrade-auto-weapon-components") response = await upgradeAutoWeapon(ctx, body);
        else if (action === "upgrade-passive-skill") response = await upgradeAutoWeapon(ctx, body);
        else if (action === "save-cosmetics") response = await saveCosmetics(ctx, body);
        else if (action === "redeem") response = await redeem(ctx, body);
        else if (action === "shop-buy") response = await economyService.buyShopItem(ctx, body);
        else if (action === "migrate-anonymous") response = await migrateAnonymous(ctx, request);
        else if (action === "leaderboard-submit") response = await socialService.leaderboardSubmit(ctx, body);
        else if (action === "leaderboard-fetch") response = await socialService.leaderboardFetch(ctx, body);
        else if (action === "friend-search") response = await socialService.friendSearch(ctx, body);
        else if (action === "friend-request") response = await socialService.friendRequest(ctx, body);
        else if (action === "friend-respond") response = await socialService.friendRespond(ctx, body);
        else if (action === "friend-list") response = await socialService.friendList(ctx);
        else if (action === "friend-remove") response = await socialService.friendRemove(ctx, body);
        else if (action === "chat-send") response = await socialService.chatSend(ctx, body);
        else if (action === "chat-poll") response = await socialService.chatPoll(ctx, body);
        else if (action === "start-endless") response = await endlessService.start(ctx);
        else if (action === "finish-endless") response = await endlessService.finish(ctx, body);
        else if (action === "get-endless-record") response = await endlessService.getRecord(ctx);
        else if (action === "claim-task") response = await economyService.claimTask(ctx, body);
        else if (action === "claim-achievement") response = await economyService.claimAchievement(ctx, body);
        else if (action === "claim-activity-reward") response = await economyService.claimActivityReward(ctx, body);
        else response = error("未知操作。", 404);
      }
    }
  } catch (caught) {
    console.error(caught);
    response = error(caught instanceof Error ? caught.message : "服务器处理失败。", 500);
  }
  return withCors(response, request);
});
