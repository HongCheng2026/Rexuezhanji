/**
 * DerivedStatsCache — content-hash + version cache for the battle loadout.
 *
 * The full battle loadout aggregation (combatStats.generateBattleLoadout) is
 * expensive: it resolves tactical assembly, weapon/auto-skill snapshots and
 * skill grades. The HUD power figure used to trigger it on every refresh.
 *
 * This module caches the computed loadout keyed by (a) a hash of every profile
 * input that affects the loadout and (b) an explicit version counter
 * (`profile.__loadoutVersion`). The version is the primary invalidation signal
 * — every intent mutator in profileStore bumps it — and the hash is a secondary
 * guard that catches any input drift not yet covered by a store write.
 *
 * Cached values are immutable (generateBattleLoadout returns frozen sub-objects)
 * and are never written back to the profile.
 *
 * @module DerivedStatsCache
 */
(function registerDerivedStatsCache(root) {
  "use strict";
  var scope = root.RXGame || (root.RXGame = {});

  // Every profile input that can change the battle loadout. If any of these
  // differs between two calls the cached loadout must NOT be reused.
  function hashInputs(profile) {
    profile = profile || {};
    var slice = {
      scene: profile.scene,
      upgrades: profile.upgrades,
      fighterUpgrades: profile.fighterUpgrades,
      shipRanks: profile.shipRanks,
      pilotRanks: profile.pilotRanks,
      shipSkillLoadouts: profile.shipSkillLoadouts,
      activeSkillGrades: profile.activeSkillGrades,
      autoWeaponLevels: profile.autoWeaponLevels,
      pilotStars: profile.pilotStars,
      shipStars: profile.shipStars,
      owned: profile.owned,
      codexBonds: profile.codexBonds,
      resources: profile.resources ? { inventory: profile.resources.inventory } : undefined
    };
    try {
      return JSON.stringify(slice);
    } catch (e) {
      return String(profile && profile.scene && profile.scene.pilotId) + ":" +
        String(profile && profile.scene && profile.scene.shipId);
    }
  }

  // Single-slot cache (matches the design doc's simple shape). The loadout is
  // derived purely from profile inputs + version, so one slot is enough.
  var cache = null; // { hash, version, value }

  /**
   * Returns the cached value when both the input hash and version match,
   * otherwise computes it exactly once via computeFn() and caches the result.
   * @param {Object} profile - the profile whose loadout is derived
   * @param {number} version - invalidation counter (profile.__loadoutVersion)
   * @param {Function} computeFn - produces the loadout (computeBattleLoadoutInternal)
   * @returns {*} the cached or freshly computed value
   */
  function get(profile, version, computeFn) {
    var h = hashInputs(profile);
    if (cache && cache.hash === h && cache.version === version) {
      return cache.value;
    }
    var value = computeFn ? computeFn() : null;
    cache = { hash: h, version: version, value: value };
    return value;
  }

  function clear() {
    cache = null;
  }

  var api = { get: get, clear: clear, hashInputs: hashInputs };
  scope.DerivedStatsCache = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
