/**
 * 图鉴模块判定配置 (codexConfig.js) — v3.0
 *
 * 仅封装全收集的判定逻辑（v3.0 起里程碑/套装/联动已全部移除，
 * 属性只来自「单位激活」+「羁绊激活」两层）。
 * 依赖 scope.codexBalance 和 scope.assets。
 *
 * @module codexConfig
 */
(function registerCodexConfig(root) {
  "use strict";
  var scope = root.RXGame || (root.RXGame = {});

  function getBalance() { return scope.codexBalance || {}; }
  function getAssets() { return scope.assets || {}; }

  function countByRank(ownedIds, assetList) {
    var counts = { B: 0, A: 0, S: 0 };
    ownedIds.forEach(function (id) {
      var asset = assetList.find(function (a) { return a && a.id === id; });
      if (asset && counts[asset.rank] !== undefined) counts[asset.rank] += 1;
    });
    return counts;
  }

  /**
   * 检查是否达成全收集（v3.0 起仅用于「星海档案」成就与全收集事件）
   */
  function isFullCollection(pilotCount, shipCount, totalPilotMax, totalShipMax) {
    var pilots = (typeof totalPilotMax === "number" && totalPilotMax > 0)
      ? totalPilotMax
      : (getAssets().PILOT_ASSETS || []).length;
    var ships = (typeof totalShipMax === "number" && totalShipMax > 0)
      ? totalShipMax
      : (getAssets().SHIP_ASSETS || []).length;
    return pilotCount >= pilots && shipCount >= ships;
  }

  // ── 组合羁绊状态 ──
  function hasAllUnits(requiredIds, ownedIds) {
    if (!requiredIds || !requiredIds.length) return true;
    for (var i = 0; i < requiredIds.length; i++) {
      if (ownedIds.indexOf(requiredIds[i]) < 0) return false;
    }
    return true;
  }

  /**
   * 返回图鉴组合羁绊的逐条状态。
   * @returns {{ bonds: Array<{def, ownedAll, activated, activatable}>, anyActivatable: boolean }}
   */
  function getBondsState(profile) {
    var balance = getBalance();
    var bonds = balance.BONDS || [];
    var owned = (profile && profile.owned) || {};
    var ownedPilots = Array.isArray(owned.pilots) ? owned.pilots : [];
    var ownedShips = Array.isArray(owned.ships) ? owned.ships : [];
    var allIds = ownedPilots.concat(ownedShips);
    var activated = Array.isArray(profile && profile.codex && profile.codex.activatedBonds)
      ? profile.codex.activatedBonds
      : (Array.isArray(profile && profile.codexBonds)
        ? profile.codexBonds.filter(function keepLegacyBond(id) { return String(id).indexOf("unit:") !== 0; })
        : []);

    var bondsState = bonds.map(function (b) {
      var reqPilots = (b.requires && b.requires.pilots) || [];
      var reqShips = (b.requires && b.requires.ships) || [];
      var ownedAll = hasAllUnits(reqPilots, allIds) && hasAllUnits(reqShips, allIds);
      var isActivated = activated.indexOf(b.id) >= 0;
      return {
        def: b,
        ownedAll: ownedAll,
        activated: isActivated,
        activatable: ownedAll && !isActivated
      };
    });
    var anyActivatable = bondsState.some(function (s) { return s.activatable; });
    return { bonds: bondsState, anyActivatable: anyActivatable };
  }

  var api = {
    isFullCollection: isFullCollection,
    countByRank: countByRank
  };

  scope.codexConfig = api;

  api.getBondsState = getBondsState;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
