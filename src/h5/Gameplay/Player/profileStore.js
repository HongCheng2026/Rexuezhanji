/**
 * profileStore — single writer for the shared mutable profile blob.
 *
 * The profile is a serialized save document. Per the refactor design, every
 * runtime mutation of player state must go through an *intent mutator* here,
 * never via scattered `profile.resources.x = y` / `profile.fighterUpgrades.x =
 * y` assignments elsewhere. Each mutator writes the field and then calls
 * bumpVersion(), which advances `profile.__loadoutVersion`. DerivedStatsCache is
 * keyed on that version, so the cached battle loadout is invalidated on any
 * change that can affect combat stats.
 *
 * The profile shape / save schema (rxgame_save_v5) is intentionally untouched —
 * __loadoutVersion is a transient runtime counter, not a persisted gameplay field.
 *
 * @module profileStore
 */
(function registerProfileStore(root) {
  "use strict";
  var scope = root.RXGame || (root.RXGame = {});

  function getCommanderLevel() { return scope.commanderLevel || {}; }

  // Advances the derived-cache invalidation counter. Consumed by
  // DerivedStatsCache (keyed on profile.__loadoutVersion).
  function bumpVersion(profile) {
    if (!profile) return profile;
    profile.__loadoutVersion = (Number(profile.__loadoutVersion) || 0) + 1;
    return profile;
  }

  // ── fighter upgrade writer (the ONLY writer of profile.fighterUpgrades) ──
  function applyFighterUpgrade(profile, statType, level) {
    if (!profile) return profile;
    profile.fighterUpgrades = profile.fighterUpgrades || {};
    profile.fighterUpgrades[statType] = Math.max(1, Math.floor(Number(level) || 1));
    bumpVersion(profile);
    return profile;
  }

  // ── gold writers ──
  function spendGold(profile, amount) {
    if (!profile) return false;
    var have = Math.max(0, Math.floor(Number(profile.resources && profile.resources.gold) || 0));
    amount = Math.max(0, Math.floor(Number(amount) || 0));
    if (have < amount) return false;
    profile.resources.gold = have - amount;
    profile.coins = profile.resources.gold;
    bumpVersion(profile);
    return true;
  }

  function setGold(profile, amount) {
    if (!profile) return profile;
    profile.resources.gold = Math.max(0, Math.floor(Number(amount) || 0));
    profile.coins = profile.resources.gold;
    bumpVersion(profile);
    return profile;
  }

  // ── energy writers ──
  // Recovery delegates to the commander-level rule (the canonical source of
  // truth for energy regen). It does NOT call back into profile.js to avoid a
  // circular delegation; the actual regen math lives in commanderLevel.
  function recoverEnergy(profile, now) {
    if (!profile) return profile;
    var CL = getCommanderLevel();
    if (CL.recoverEnergy) CL.recoverEnergy(profile, now);
    bumpVersion(profile);
    return profile;
  }

  function spendEnergy(profile, amount) {
    if (!profile) return false;
    recoverEnergy(profile);
    var have = Math.max(0, Math.floor(Number(profile.resources && profile.resources.energy) || 0));
    amount = Math.max(0, Math.floor(Number(amount) || 0));
    if (have < amount) return false;
    profile.resources.energy = have - amount;
    return true;
  }

  function setEnergy(profile, value) {
    if (!profile) return profile;
    profile.resources.energy = Math.max(0, Math.floor(Number(value) || 0));
    bumpVersion(profile);
    return profile;
  }

  var api = {
    bumpVersion: bumpVersion,
    applyFighterUpgrade: applyFighterUpgrade,
    spendGold: spendGold,
    setGold: setGold,
    spendEnergy: spendEnergy,
    setEnergy: setEnergy,
    recoverEnergy: recoverEnergy
  };

  scope.profileStore = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
