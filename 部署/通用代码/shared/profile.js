(function registerProfile(root) {
  const scope = root.RXGame || (root.RXGame = {});
  const assets = scope.assets || {};
  const levelConfig = scope.levels || {};

  const SAVE_VERSION = 5;
  const ENERGY_MAX = levelConfig.ENERGY_MAX || 305;
  const ENERGY_COST = levelConfig.ENERGY_COST || 5;
  const ENERGY_RECOVER_MS = levelConfig.ENERGY_RECOVER_MS || 5 * 60 * 1000;

  const LOBBY_DEFAULTS = {
    player: {
      name: "王牌飞行员",
      avatar: assets.DEFAULT_AVATAR || "",
      level: 1,
      exp: 0,
      expMax: levelConfig.getCommanderExpToNextLevel ? levelConfig.getCommanderExpToNextLevel(1) : 130,
      totalExp: 0,
      badge: "I"
    },
    resources: {
      energy: ENERGY_MAX,
      maxEnergy: ENERGY_MAX,
      gold: 0,
      diamonds: 0,
      lastEnergyAt: Date.now()
    },
    scene: {
      pilotId: assets.DEFAULT_PILOT_ID || "pilot-s-lingyan",
      shipId: assets.DEFAULT_SHIP_ID || "ship-a-06",
      backgroundId: assets.DEFAULT_BACKGROUND_ID || "bg-hangar-01"
    },
    owned: {
      pilots: [assets.DEFAULT_PILOT_ID || "pilot-s-lingyan"],
      ships: [assets.DEFAULT_SHIP_ID || "ship-a-06"],
      backgrounds: [assets.DEFAULT_BACKGROUND_ID || "bg-hangar-01"]
    }
  };

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, Number(value) || 0));
  }

  function uniqueList(list) {
    return Array.from(new Set(Array.isArray(list) ? list.filter(Boolean) : []));
  }

  function normalizeProfile(nextProfile = {}) {
    const incomingVersion = Number(nextProfile.saveVersion) || 0;
    let player = { ...LOBBY_DEFAULTS.player, ...(nextProfile.player || {}) };
    if (incomingVersion < SAVE_VERSION && (player.avatar === "guide.png" || (Number(player.level) === 56 && Number(player.exp) === 12080))) {
      player = { ...LOBBY_DEFAULTS.player };
    }
    const maxLevel = levelConfig.COMMANDER_MAX_LEVEL || 60;
    player.level = clamp(Math.floor(Number(player.level) || LOBBY_DEFAULTS.player.level), 1, maxLevel);
    const oldExpMax = Math.max(1, Math.floor(Number(player.expMax) || LOBBY_DEFAULTS.player.expMax));
    const oldExp = clamp(Math.floor(Number(player.exp) || 0), 0, oldExpMax);
    const levelStartExp = (levelConfig.COMMANDER_TOTAL_EXP_BY_LEVEL || [0])[player.level] || 0;
    const suppliedTotalExp = Number(player.totalExp);
    player.totalExp = Math.max(0, Math.floor(Number.isFinite(suppliedTotalExp) ? suppliedTotalExp : levelStartExp + oldExp));
    while (player.level < maxLevel && player.totalExp >= ((levelConfig.COMMANDER_TOTAL_EXP_BY_LEVEL || [])[player.level + 1] || Infinity)) player.level += 1;
    player.expMax = levelConfig.getCommanderExpToNextLevel ? levelConfig.getCommanderExpToNextLevel(player.level) : oldExpMax;
    player.exp = player.level >= maxLevel ? 0 : Math.max(0, player.totalExp - ((levelConfig.COMMANDER_TOTAL_EXP_BY_LEVEL || [])[player.level] || 0));
    player.avatar = player.avatar && player.avatar !== "guide.png" ? player.avatar : LOBBY_DEFAULTS.player.avatar;
    player.badge = player.badge || LOBBY_DEFAULTS.player.badge;

    const resources = { ...LOBBY_DEFAULTS.resources, ...(nextProfile.resources || {}) };
    const energyMaxForLevel = levelConfig.getMaxEnergyByLevel ? levelConfig.getMaxEnergyByLevel(player.level) : ENERGY_MAX;
    resources.maxEnergy = energyMaxForLevel;
    if (incomingVersion < SAVE_VERSION) resources.energy = Math.max(Math.floor(Number(resources.energy) || 0), energyMaxForLevel);
    resources.energy = clamp(Math.floor(Number(resources.energy) || 0), 0, resources.maxEnergy);
    resources.diamonds = Math.max(0, Math.floor(Number(resources.diamonds) || 0));
    resources.gold = Math.max(0, Math.floor(Number(resources.gold ?? nextProfile.coins) || 0));
    resources.lastEnergyAt = Math.floor(Number(resources.lastEnergyAt) || Date.now());

    const owned = {
      pilots: uniqueList([...(LOBBY_DEFAULTS.owned.pilots || []), ...((nextProfile.owned && nextProfile.owned.pilots) || [])]),
      ships: uniqueList([...(LOBBY_DEFAULTS.owned.ships || []), ...((nextProfile.owned && nextProfile.owned.ships) || [])]),
      backgrounds: uniqueList([...(LOBBY_DEFAULTS.owned.backgrounds || []), ...((nextProfile.owned && nextProfile.owned.backgrounds) || [])])
    };

    const scene = { ...LOBBY_DEFAULTS.scene, ...(nextProfile.scene || {}) };
    scene.pilotId = owned.pilots.includes(scene.pilotId) ? scene.pilotId : LOBBY_DEFAULTS.scene.pilotId;
    scene.shipId = owned.ships.includes(scene.shipId) ? scene.shipId : LOBBY_DEFAULTS.scene.shipId;
    scene.backgroundId = owned.backgrounds.includes(scene.backgroundId) ? scene.backgroundId : LOBBY_DEFAULTS.scene.backgroundId;

    const normalized = {
      ...nextProfile,
      saveVersion: SAVE_VERSION,
      coins: resources.gold,
      completed: Array.isArray(nextProfile.completed) ? nextProfile.completed : [],
      upgrades: { fire: 0, armor: 0, engine: 0, bounty: 0, ...(nextProfile.upgrades || {}) },
      fighterUpgrades: { attack: 1, armorPenetration: 1, hp: 1, ...(nextProfile.fighterUpgrades || {}) },
      player,
      resources,
      scene,
      owned,
      ratings: nextProfile.ratings || {},
      localEarned: nextProfile.localEarned || { gold: 0, diamonds: 0 }
      ,usedRedeemCodes: uniqueList(nextProfile.usedRedeemCodes)
    };

    recoverEnergy(normalized);
    for (const statType of ["attack", "armorPenetration", "hp"]) {
      normalized.fighterUpgrades[statType] = clamp(Math.floor(Number(normalized.fighterUpgrades[statType]) || 1), 1, Math.min(player.level, levelConfig.FIGHTER_MAX_UPGRADE_LEVEL || 60));
    }
    return normalized;
  }

  function createProfile(input = {}) {
    return normalizeProfile({
      saveVersion: SAVE_VERSION,
      coins: 0,
      unlockedLevel: 1,
      completed: [],
      upgrades: { fire: 0, armor: 0, engine: 0, bounty: 0 },
      fighterUpgrades: { attack: 1, armorPenetration: 1, hp: 1 },
      player: { ...LOBBY_DEFAULTS.player },
      resources: { ...LOBBY_DEFAULTS.resources },
      scene: { ...LOBBY_DEFAULTS.scene },
      owned: { ...LOBBY_DEFAULTS.owned },
      ...input
    });
  }

  function recoverEnergy(targetProfile, now = Date.now()) {
    const resources = targetProfile.resources;
    resources.maxEnergy = levelConfig.getMaxEnergyByLevel ? levelConfig.getMaxEnergyByLevel(targetProfile.player?.level) : Math.max(ENERGY_COST, Math.floor(Number(resources.maxEnergy) || ENERGY_MAX));
    resources.energy = clamp(Math.floor(Number(resources.energy) || 0), 0, resources.maxEnergy);
    resources.lastEnergyAt = Math.floor(Number(resources.lastEnergyAt) || now);
    if (resources.energy >= resources.maxEnergy) {
      resources.lastEnergyAt = now;
      return targetProfile;
    }
    const recovered = Math.floor((now - resources.lastEnergyAt) / ENERGY_RECOVER_MS);
    if (recovered > 0) {
      resources.energy = clamp(resources.energy + recovered, 0, resources.maxEnergy);
      resources.lastEnergyAt += recovered * ENERGY_RECOVER_MS;
      if (resources.energy >= resources.maxEnergy) resources.lastEnergyAt = now;
    }
    return targetProfile;
  }

  function getGold(profile) {
    recoverEnergy(profile);
    return Math.max(0, Math.floor(Number(profile.resources.gold ?? profile.coins) || 0));
  }

  function setGold(profile, value) {
    profile.resources.gold = Math.max(0, Math.floor(Number(value) || 0));
    profile.coins = profile.resources.gold;
    return profile;
  }

  function spendEnergy(profile, amount) {
    recoverEnergy(profile);
    profile.resources.energy = Math.max(0, Math.floor(Number(profile.resources.energy) || 0));
    if (profile.resources.energy < amount) return false;
    profile.resources.energy -= amount;
    return true;
  }

  const api = {
    SAVE_VERSION,
    LOBBY_DEFAULTS,
    uniqueList,
    normalizeProfile,
    createProfile,
    recoverEnergy,
    getGold,
    setGold,
    spendEnergy
  };

  scope.profile = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
