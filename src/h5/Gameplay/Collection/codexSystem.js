/**
 * 图鉴模块核心引擎 — 图鉴状态、激活规则与战斗加成的唯一来源。
 * @module codexSystem
 */
(function registerCodexSystem(root) {
  "use strict";
  var scope = root.RXGame || (root.RXGame = {});

  function getBalance() { return scope.codexBalance || {}; }
  function getConfig() { return scope.codexConfig || {}; }
  function getAssets() { return scope.assets || {}; }
  function getBus() { return scope.bus; }
  function getEvents() { return scope.events; }

  function unique(values) {
    return Array.from(new Set((Array.isArray(values) ? values : []).map(String).filter(Boolean)));
  }

  function getActivationState(profile) {
    var codex = profile && profile.codex && typeof profile.codex === "object" ? profile.codex : {};
    var legacy = Array.isArray(profile && profile.codexBonds) ? profile.codexBonds : [];
    return {
      activatedUnits: unique((codex.activatedUnits || []).concat(legacy.filter(function isUnit(id) {
        return String(id).indexOf("unit:") === 0;
      }).map(function stripPrefix(id) { return String(id).slice(5); }))),
      activatedBonds: unique((codex.activatedBonds || []).concat(legacy.filter(function isBond(id) {
        return String(id).indexOf("unit:") !== 0;
      })))
    };
  }

  function isOwned(profile, id) {
    var owned = profile && profile.owned || {};
    return (Array.isArray(owned.pilots) && owned.pilots.indexOf(id) >= 0) ||
      (Array.isArray(owned.ships) && owned.ships.indexOf(id) >= 0);
  }

  function isUnitActivated(profile, id) {
    return getActivationState(profile).activatedUnits.indexOf(String(id)) >= 0;
  }

  function getBondsState(profile) {
    var config = getConfig();
    return config && config.getBondsState
      ? config.getBondsState(profile)
      : { bonds: [], anyActivatable: false };
  }

  function canActivate(profile, kind, id) {
    id = String(id || "");
    if (kind === "unit") return Boolean(id) && isOwned(profile, id) && !isUnitActivated(profile, id);
    if (kind !== "bond") return false;
    var state = getBondsState(profile).bonds.filter(function match(item) {
      return item.def && item.def.id === id;
    })[0];
    return Boolean(state && state.activatable);
  }

  function activateEntry(profile, kind, id) {
    if (!canActivate(profile, kind, id)) return false;
    if (scope.profileStore && scope.profileStore.activateCodexEntry) {
      return scope.profileStore.activateCodexEntry(profile, kind, id);
    }
    profile.codex = profile.codex && typeof profile.codex === "object" ? profile.codex : {};
    var field = kind === "unit" ? "activatedUnits" : "activatedBonds";
    profile.codex[field] = unique((profile.codex[field] || []).concat(String(id)));
    return true;
  }

  function deactivateEntry(profile, kind, id) {
    if (scope.profileStore && scope.profileStore.deactivateCodexEntry) {
      return scope.profileStore.deactivateCodexEntry(profile, kind, id);
    }
    if (!profile || !profile.codex) return false;
    var field = kind === "unit" ? "activatedUnits" : "activatedBonds";
    var before = Array.isArray(profile.codex[field]) ? profile.codex[field] : [];
    profile.codex[field] = before.filter(function keep(value) { return value !== String(id); });
    return profile.codex[field].length !== before.length;
  }

  function mergeActivationState(profile, entries) {
    if (!profile) return profile;
    var current = getActivationState(profile);
    entries = entries || {};
    profile.codex = {
      activatedUnits: unique(current.activatedUnits.concat(entries.activatedUnits || [])),
      activatedBonds: unique(current.activatedBonds.concat(entries.activatedBonds || []))
    };
    delete profile.codexBonds;
    return profile;
  }

  function findAsset(id, list) {
    return list.filter(function match(asset) { return asset && asset.id === id; })[0] || null;
  }

  function calculateBonus(profile) {
    var state = getActivationState(profile);
    var assets = getAssets();
    var units = (assets.PILOT_ASSETS || []).concat(assets.SHIP_ASSETS || []);
    var rankBonuses = getBalance().UNIT_ACTIVATION_BONUS_BY_RANK || {};
    var bonus = { attackFlat: 0, armorPenetrationFlat: 0, coinBonusMultiplier: 0 };

    state.activatedUnits.forEach(function addUnit(id) {
      if (!isOwned(profile, id)) return;
      var asset = findAsset(id, units);
      if (!asset) return;
      var value = rankBonuses[String(asset.rank || "B").toUpperCase()] || {};
      bonus.attackFlat += Number(value.attackFlat) || 0;
      bonus.armorPenetrationFlat += Number(value.armorPenetrationFlat) || 0;
    });

    getBondsState(profile).bonds.forEach(function addBond(item) {
      if (!item.activated || !item.def || !item.def.bonus) return;
      bonus.attackFlat += Number(item.def.bonus.attackFlat) || 0;
      bonus.armorPenetrationFlat += Number(item.def.bonus.armorPenetrationFlat) || 0;
      bonus.coinBonusMultiplier += Number(item.def.bonus.coinBonusMultiplier) || 0;
    });
    return bonus;
  }

  function getActivationSummary(profile) {
    var state = getActivationState(profile);
    return {
      activatedUnitCount: state.activatedUnits.length,
      activatedBondCount: state.activatedBonds.length,
      bonus: calculateBonus(profile),
      anyActivatable: hasActivatableEntries(profile)
    };
  }

  function hasActivatableEntries(profile) {
    var assets = getAssets();
    var owned = profile && profile.owned || {};
    var unitIds = (Array.isArray(owned.pilots) ? owned.pilots : []).concat(Array.isArray(owned.ships) ? owned.ships : []);
    if (unitIds.some(function pending(id) { return canActivate(profile, "unit", id); })) return true;
    return Boolean(getBondsState(profile).anyActivatable);
  }

  function checkAndEmit(profile, prevOwned) {
    var bus = getBus();
    var events = getEvents();
    if (!bus || !events) return;
    var assets = getAssets();
    var current = profile && profile.owned || {};
    var previous = prevOwned || { pilots: [], ships: [] };
    [["pilot", assets.PILOT_ASSETS || [], current.pilots || [], previous.pilots || []],
      ["ship", assets.SHIP_ASSETS || [], current.ships || [], previous.ships || []]].forEach(function each(group) {
      group[2].forEach(function unlocked(id) {
        if (group[3].indexOf(id) >= 0) return;
        var asset = findAsset(id, group[1]);
        if (asset) bus.emit(events.CODEX_ENTRY_UNLOCKED, { type: group[0], id: id, rank: asset.rank, name: asset.name });
      });
    });
    var config = getConfig();
    if (config && config.isFullCollection &&
      !config.isFullCollection((previous.pilots || []).length, (previous.ships || []).length, (assets.PILOT_ASSETS || []).length, (assets.SHIP_ASSETS || []).length) &&
      config.isFullCollection((current.pilots || []).length, (current.ships || []).length, (assets.PILOT_ASSETS || []).length, (assets.SHIP_ASSETS || []).length)) {
      bus.emit(events.CODEX_FULL_COLLECTION, { totalEntries: (current.pilots || []).length + (current.ships || []).length });
    }
  }

  var api = {
    getActivationState: getActivationState,
    isUnitActivated: isUnitActivated,
    getBondsState: getBondsState,
    canActivate: canActivate,
    activateEntry: activateEntry,
    deactivateEntry: deactivateEntry,
    mergeActivationState: mergeActivationState,
    calculateBonus: calculateBonus,
    getActivationSummary: getActivationSummary,
    hasActivatableEntries: hasActivatableEntries,
    checkAndEmit: checkAndEmit
  };
  scope.codexSystem = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
