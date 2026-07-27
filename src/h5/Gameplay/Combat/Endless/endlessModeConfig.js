(function registerEndlessModeConfig(root) {
  "use strict";

  var scope = root.RXGame || (root.RXGame = {});
  var BOSS_COUNT = 9;
  var BOSS_INTERVAL_SECONDS = 15;
  var BOSS_ESCORT_FIRST_DELAY_SECONDS = 2;
  var BOSS_ESCORT_INTERVAL_SECONDS = 4;
  var BOSS_ESCORT_WAVE_SIZE = 5;
  var BOSS_ESCORT_ACTIVE_CAP = 18;
  var INTERMISSION_REINFORCEMENT_OFFSETS_SECONDS = Object.freeze([0.5, 2.5, 4.5, 6.5, 8.5, 10.5, 12.5, 14.5]);
  var INTERMISSION_REINFORCEMENT_WAVE_SIZE = 6;
  var INTERMISSION_REINFORCEMENT_ACTIVE_CAP = 24;
  var BASE_BOSS_HP = 100000;
  var BASE_BOSS_ATTACK = 80;
  var BASE_BOSS_BULLET_SPEED = 360;
  var BOSS_HP_GROWTH_PER_ROUND = 1;
  var BOSS_ATTACK_GROWTH_PER_ROUND = 1;
  var BOSS_DAMAGE_REDUCTION_PER_ROUND = 0.1;

  function normalizeRound(value) {
    return Math.max(1, Math.floor(Number(value) || 1));
  }

  function getBossChapter(round) {
    return ((normalizeRound(round) - 1) % BOSS_COUNT) + 1;
  }

  function getRoundStats(round, overrides) {
    round = normalizeRound(round);
    overrides = overrides || {};
    var baseHp = Math.max(1, Number(overrides.baseHp) || BASE_BOSS_HP);
    var baseAttack = Math.max(0, Number(overrides.baseAttack) || BASE_BOSS_ATTACK);
    var completedRounds = round - 1;
    var hpMultiplier = 1 + completedRounds * BOSS_HP_GROWTH_PER_ROUND;
    var attackMultiplier = 1 + completedRounds * BOSS_ATTACK_GROWTH_PER_ROUND;
    var damageReductionRate = Number((round * BOSS_DAMAGE_REDUCTION_PER_ROUND).toFixed(6));
    return {
      round: round,
      chapterIndex: getBossChapter(round),
      hp: Math.round(baseHp * hpMultiplier),
      hpMultiplier: hpMultiplier,
      attackDamage: baseAttack * attackMultiplier,
      attackMultiplier: attackMultiplier,
      attackBonusRate: completedRounds * BOSS_ATTACK_GROWTH_PER_ROUND,
      bulletSpeed: Math.max(1, Number(overrides.bulletSpeed) || BASE_BOSS_BULLET_SPEED),
      damageReductionRate: damageReductionRate,
      damageTakenMultiplier: Math.max(0, 1 - damageReductionRate)
    };
  }

  function getEffectiveDamageReduction(damageReductionRate, armorPenetration) {
    return Math.max(0, Number(damageReductionRate) || 0) - Math.max(0, Number(armorPenetration) || 0);
  }

  function getDamageTakenMultiplier(damageReductionRate, armorPenetration) {
    return Math.max(0, 1 - getEffectiveDamageReduction(damageReductionRate, armorPenetration));
  }

  function getTheoreticalMaxBosses(elapsedSeconds) {
    return Math.max(1, Math.floor(Math.max(0, Number(elapsedSeconds) || 0) / BOSS_INTERVAL_SECONDS) + 1);
  }

  var api = {
    BOSS_COUNT: BOSS_COUNT,
    BOSS_INTERVAL_SECONDS: BOSS_INTERVAL_SECONDS,
    BOSS_ESCORT_FIRST_DELAY_SECONDS: BOSS_ESCORT_FIRST_DELAY_SECONDS,
    BOSS_ESCORT_INTERVAL_SECONDS: BOSS_ESCORT_INTERVAL_SECONDS,
    BOSS_ESCORT_WAVE_SIZE: BOSS_ESCORT_WAVE_SIZE,
    BOSS_ESCORT_ACTIVE_CAP: BOSS_ESCORT_ACTIVE_CAP,
    INTERMISSION_REINFORCEMENT_OFFSETS_SECONDS: INTERMISSION_REINFORCEMENT_OFFSETS_SECONDS,
    INTERMISSION_REINFORCEMENT_WAVE_SIZE: INTERMISSION_REINFORCEMENT_WAVE_SIZE,
    INTERMISSION_REINFORCEMENT_ACTIVE_CAP: INTERMISSION_REINFORCEMENT_ACTIVE_CAP,
    BASE_BOSS_HP: BASE_BOSS_HP,
    BASE_BOSS_ATTACK: BASE_BOSS_ATTACK,
    BASE_BOSS_BULLET_SPEED: BASE_BOSS_BULLET_SPEED,
    BOSS_HP_GROWTH_PER_ROUND: BOSS_HP_GROWTH_PER_ROUND,
    BOSS_ATTACK_GROWTH_PER_ROUND: BOSS_ATTACK_GROWTH_PER_ROUND,
    BOSS_DAMAGE_REDUCTION_PER_ROUND: BOSS_DAMAGE_REDUCTION_PER_ROUND,
    getBossChapter: getBossChapter,
    getRoundStats: getRoundStats,
    getEffectiveDamageReduction: getEffectiveDamageReduction,
    getDamageTakenMultiplier: getDamageTakenMultiplier,
    getTheoreticalMaxBosses: getTheoreticalMaxBosses
  };

  scope.endlessModeConfig = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
