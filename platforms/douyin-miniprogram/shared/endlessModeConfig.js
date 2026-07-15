(function registerEndlessModeConfig(root) {
  "use strict";

  var scope = root.RXGame || (root.RXGame = {});
  var BOSS_COUNT = 9;
  var BOSS_INTERVAL_SECONDS = 30;
  var BASE_BOSS_HP = 100000;
  var BASE_BOSS_ATTACK = 80;
  var BASE_BOSS_BULLET_SPEED = 360;

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
    return {
      round: round,
      chapterIndex: getBossChapter(round),
      hp: Math.round(baseHp * round),
      hpMultiplier: round,
      attackDamage: baseAttack * (1 + round * 0.1),
      attackBonusRate: round * 0.1,
      bulletSpeed: Math.max(1, Number(overrides.bulletSpeed) || BASE_BOSS_BULLET_SPEED),
      damageReductionRate: round / 100,
      damageTakenMultiplier: Math.max(0, 1 - round / 100)
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
    BASE_BOSS_HP: BASE_BOSS_HP,
    BASE_BOSS_ATTACK: BASE_BOSS_ATTACK,
    BASE_BOSS_BULLET_SPEED: BASE_BOSS_BULLET_SPEED,
    getBossChapter: getBossChapter,
    getRoundStats: getRoundStats,
    getEffectiveDamageReduction: getEffectiveDamageReduction,
    getDamageTakenMultiplier: getDamageTakenMultiplier,
    getTheoreticalMaxBosses: getTheoreticalMaxBosses
  };

  scope.endlessModeConfig = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
