(function registerCommanderLevel(root) {
  "use strict";
  var scope = root.RXGame || (root.RXGame = {});

  // ── 默认常量（levels.js 加载前使用，加载后以 levels.js 为准）──
  var COMMANDER_MAX_LEVEL = 60;
  var ENERGY_MAX = 120;
  var ENERGY_COST = 5;
  var ENERGY_RECOVER_MS = 5 * 60 * 1000;
  var STAMINA_RULE_VERSION = 2;
  var FIGHTER_MAX_UPGRADE_LEVEL = 60;

  // ── 懒加载：每次调用时读取 scope.levels，避免 levels.js 加载时序问题 ──
  function levelConfig() {
    return scope.levels || {};
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, Number(value) || 0));
  }

  // ── 指挥官等级 ──

  function getCommanderMaxLevel() {
    return levelConfig().COMMANDER_MAX_LEVEL || COMMANDER_MAX_LEVEL;
  }

  function getCommanderExpToNextLevel(commanderLevel) {
    var cfg = levelConfig();
    if (typeof cfg.getCommanderExpToNextLevel === "function") {
      return cfg.getCommanderExpToNextLevel(commanderLevel);
    }
    return Math.max(1, 100 + (commanderLevel - 1) * 22);
  }

  /**
   * 从 totalExp 推算当前等级、exp、expMax
   * 返回 { level, exp, expMax, totalExp }
   */
  function normalizeCommanderLevel(player) {
    var maxLevel = getCommanderMaxLevel();
    var expTable = levelConfig().COMMANDER_TOTAL_EXP_BY_LEVEL || [];

    player.level = clamp(Math.floor(Number(player.level) || 1), 1, maxLevel);
    player.totalExp = Math.max(0, Math.floor(Number.isFinite(player.totalExp)
      ? player.totalExp
      : (expTable[player.level] || 0) + clamp(Math.floor(Number(player.exp) || 0), 0, Math.max(1, Number(player.expMax) || 130))));

    // 根据 totalExp 反推等级
    while (player.level < maxLevel && player.totalExp >= (expTable[player.level + 1] || Infinity)) {
      player.level += 1;
    }
    player.expMax = getCommanderExpToNextLevel(player.level);
    player.exp = player.level >= maxLevel
      ? 0
      : Math.max(0, player.totalExp - (expTable[player.level] || 0));
    return player;
  }

  /**
   * 向指挥官添加经验值，自动处理升级
   * 返回 { gained, leveled, totalLeveled }
   */
  function addCommanderExperience(profile, expAmount) {
    var gained = Math.max(0, Math.floor(Number(expAmount) || 0));
    if (gained <= 0) return { gained: 0, leveled: 0, totalLeveled: 0 };

    var player = profile.player || {};
    var oldLevel = clamp(Math.floor(Number(player.level) || 1), 1, getCommanderMaxLevel());
    player.totalExp = Math.max(0, Math.floor(Number(player.totalExp) || 0)) + gained;
    normalizeCommanderLevel(player);
    profile.player = player;

    var newLevel = player.level;
    var totalLeveled = newLevel - oldLevel;
    return { gained: gained, leveled: totalLeveled, totalLeveled: totalLeveled };
  }

  // ── 体力/能量 ──

  function getMaxEnergyByLevel(commanderLevel) {
    var cfg = levelConfig();
    if (typeof cfg.getMaxEnergyByLevel === "function") {
      return cfg.getMaxEnergyByLevel(commanderLevel);
    }
    var lvl = Math.max(1, Math.floor(Number(commanderLevel) || 1));
    return Math.max(ENERGY_COST, Math.floor((lvl - 1) * 5 + ENERGY_MAX));
  }

  function getEnergyCost() {
    return levelConfig().ENERGY_COST || ENERGY_COST;
  }

  function getEnergyRecoverMs() {
    return levelConfig().ENERGY_RECOVER_MS || ENERGY_RECOVER_MS;
  }

  function getDefaultEnergyMax() {
    return ENERGY_MAX;
  }

  /**
   * 恢复体力（基于时间流逝）
   */
  function recoverEnergy(targetProfile, now) {
    now = Math.floor(Number(now) || Date.now());
    var resources = targetProfile.resources;
    if (!resources) return targetProfile;

    resources.maxEnergy = getMaxEnergyByLevel(targetProfile.player && targetProfile.player.level);
    resources.energy = Math.max(0, Math.floor(Number(resources.energy) || 0));
    resources.lastEnergyAt = Math.floor(Number(resources.lastEnergyAt) || now);

    if (resources.energy >= resources.maxEnergy) {
      resources.lastEnergyAt = now;
      return targetProfile;
    }
    var recovered = Math.floor((now - resources.lastEnergyAt) / getEnergyRecoverMs());
    if (recovered > 0) {
      resources.energy = clamp(resources.energy + recovered, 0, resources.maxEnergy);
      resources.lastEnergyAt += recovered * getEnergyRecoverMs();
      if (resources.energy >= resources.maxEnergy) resources.lastEnergyAt = now;
    }
    return targetProfile;
  }

  function spendEnergy(profile, amount) {
    recoverEnergy(profile);
    var cost = Math.max(0, Math.floor(Number(amount) || 0));
    var current = Math.max(0, Math.floor(Number(profile.resources && profile.resources.energy) || 0));
    if (current < cost) return false;
    profile.resources.energy = current - cost;
    return true;
  }

  // ── 战机强化等级上限 ──

  function getFighterMaxUpgradeLevel(commanderLevel) {
    return Math.min(
      Math.max(1, Math.floor(Number(commanderLevel) || 1)),
      levelConfig().FIGHTER_MAX_UPGRADE_LEVEL || FIGHTER_MAX_UPGRADE_LEVEL
    );
  }

  function getFighterUpgradeCost(statType, targetLevel) {
    var cfg = levelConfig();
    if (typeof cfg.getFighterUpgradeCost === "function") {
      return Math.max(0, Math.floor(Number(cfg.getFighterUpgradeCost(statType, targetLevel)) || 0));
    }
    return Math.max(0, Math.floor(targetLevel * 90));
  }

  // ── 激励等级（Honor） ──

  function normalizeHonorLevel(value, fallbackBadge) {
    var direct = Math.floor(Number(value) || 0);
    if (direct >= 1 && direct <= 10) return direct;
    var map = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10 };
    return map[String(fallbackBadge || "").trim().toUpperCase()] || 1;
  }

  function honorLevelToText(value) {
    var labels = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
    return labels[Math.max(1, Math.min(10, Math.floor(Number(value) || 1)))] || "I";
  }

  function getStaminaRuleVersion() {
    return levelConfig().STAMINA_RULE_VERSION || STAMINA_RULE_VERSION;
  }

  var api = {
    getCommanderMaxLevel: getCommanderMaxLevel,
    getCommanderExpToNextLevel: getCommanderExpToNextLevel,
    normalizeCommanderLevel: normalizeCommanderLevel,
    addCommanderExperience: addCommanderExperience,
    getMaxEnergyByLevel: getMaxEnergyByLevel,
    getEnergyCost: getEnergyCost,
    getEnergyRecoverMs: getEnergyRecoverMs,
    getDefaultEnergyMax: getDefaultEnergyMax,
    recoverEnergy: recoverEnergy,
    spendEnergy: spendEnergy,
    getFighterMaxUpgradeLevel: getFighterMaxUpgradeLevel,
    getFighterUpgradeCost: getFighterUpgradeCost,
    normalizeHonorLevel: normalizeHonorLevel,
    honorLevelToText: honorLevelToText,
    getStaminaRuleVersion: getStaminaRuleVersion
  };

  scope.commanderLevel = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
