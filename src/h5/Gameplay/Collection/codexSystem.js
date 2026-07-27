/**
 * 图鉴模块核心引擎 (codexSystem.js) — v3.0（纯点亮 + 羁绊）
 *
 * 主入口: calculateBonus(profile) → { attackFlat, armorPenetrationFlat, coinBonusMultiplier }
 * 事件发射: checkAndEmit(profile, prevOwned) → bus.emit(codex events)
 *
 * v3.0 起加成只来自两层：
 *   - 点亮单个单位（UNIT_LIGHT_BONUS_BY_RANK，需玩家在图鉴手动点亮）
 *   - 组合羁绊（BONDS，需玩家手动点亮羁绊）
 * 不再有任何里程碑 / 套装 / 联动 / S 战机数量类加成。
 *
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

  // ── helpers ──

  function filterValid(ids, assetList) {
    if (!Array.isArray(ids)) return [];
    return ids.filter(function (id) {
      return assetList.some(function (a) { return a && a.id === id; });
    });
  }

  function getAssetById(id, assetList) {
    return assetList.find(function (a) { return a && a.id === id; }) || null;
  }

  // 已点亮的单个单位加成（profile.codexBonds 中的 "unit:<id>" 条目）。
  function sumLitUnitBonuses(ids, profile, assetList, rankBonuses) {
    var litIds = Array.isArray(profile && profile.codexBonds) ? profile.codexBonds : [];
    return ids.reduce(function (total, id) {
      if (litIds.indexOf("unit:" + id) < 0) return total;
      var asset = getAssetById(id, assetList);
      var nativeRank = String(asset && asset.rank || "B").toUpperCase();
      var bonus = rankBonuses[nativeRank] || {};
      total.attackFlat += Number(bonus.attackFlat) || 0;
      total.armorPenetrationFlat += Number(bonus.armorPenetrationFlat) || 0;
      return total;
    }, { attackFlat: 0, armorPenetrationFlat: 0 });
  }

  /**
   * 主入口：计算图鉴加成（仅点亮 + 羁绊两层）
   * @param {Object} profile — 规范化后的 player profile
   * @returns {{ attackFlat: number, armorPenetrationFlat: number, coinBonusMultiplier: number }}
   */
  function calculateBonus(profile) {
    var balance = getBalance();
    var assets = getAssets();
    var pilotList = Array.isArray(assets.PILOT_ASSETS) ? assets.PILOT_ASSETS : [];
    var shipList = Array.isArray(assets.SHIP_ASSETS) ? assets.SHIP_ASSETS : [];

    var owned = (profile && profile.owned) || {};
    var pilotIds = filterValid(Array.isArray(owned.pilots) ? owned.pilots : [], pilotList);
    var shipIds = filterValid(Array.isArray(owned.ships) ? owned.ships : [], shipList);

    // 点亮层：每个手动点亮的单个单位，按原生品阶给攻击（SS 另给破甲）。
    var rankBonuses = balance.UNIT_LIGHT_BONUS_BY_RANK || {};
    var litPilot = sumLitUnitBonuses(pilotIds, profile, pilotList, rankBonuses);
    var litShip = sumLitUnitBonuses(shipIds, profile, shipList, rankBonuses);

    var attackFlat = litPilot.attackFlat + litShip.attackFlat;
    var armorPenetrationFlat = litPilot.armorPenetrationFlat + litShip.armorPenetrationFlat;
    var coinBonusMultiplier = 0;

    // 羁绊层：玩家手动点亮的羁绊，叠加攻击 / 破甲 / 金币。
    var config = getConfig();
    if (config && config.getBondsState) {
      var bondsState = config.getBondsState(profile);
      (bondsState.bonds || []).forEach(function (s) {
        if (!s.lit) return;
        var b = s.def && s.def.bonus;
        if (!b) return;
        attackFlat += (b.attackFlat || 0);
        armorPenetrationFlat += (b.armorPenetrationFlat || 0);
        coinBonusMultiplier += (b.coinBonusMultiplier || 0);
      });
    }

    return {
      attackFlat: attackFlat,
      armorPenetrationFlat: armorPenetrationFlat,
      coinBonusMultiplier: coinBonusMultiplier
    };
  }

  // ── 事件发射 ──

  /**
   * 检查收集变化并发射 codex 事件。
   * 应在购买 / 获得新单位成功后调用（确保在用户手势栈内）。
   *
   * @param {Object} profile — 当前规范化 profile
   * @param {Object} prevOwned — 之前的 owned 状态 { pilots: [], ships: [] }
   */
  function checkAndEmit(profile, prevOwned) {
    var bus = getBus();
    var events = getEvents();
    if (!bus || !events) return;

    var assets = getAssets();
    var pilotList = Array.isArray(assets.PILOT_ASSETS) ? assets.PILOT_ASSETS : [];
    var shipList = Array.isArray(assets.SHIP_ASSETS) ? assets.SHIP_ASSETS : [];

    var owned = (profile && profile.owned) || {};
    var curPilotIds = filterValid(Array.isArray(owned.pilots) ? owned.pilots : [], pilotList);
    var curShipIds = filterValid(Array.isArray(owned.ships) ? owned.ships : [], shipList);

    var prev = prevOwned || { pilots: [], ships: [] };
    var prevPilotIds = filterValid(prev.pilots || [], pilotList);
    var prevShipIds = filterValid(prev.ships || [], shipList);

    // 发射 ENTRY_UNLOCKED（获得新单位）
    curPilotIds.forEach(function (id) {
      if (prevPilotIds.indexOf(id) < 0) {
        var asset = getAssetById(id, pilotList);
        bus.emit(events.CODEX_ENTRY_UNLOCKED, {
          type: "pilot", id: id,
          rank: asset ? asset.rank : "?", name: asset ? asset.name : id
        });
      }
    });
    curShipIds.forEach(function (id) {
      if (prevShipIds.indexOf(id) < 0) {
        var asset = getAssetById(id, shipList);
        bus.emit(events.CODEX_ENTRY_UNLOCKED, {
          type: "ship", id: id,
          rank: asset ? asset.rank : "?", name: asset ? asset.name : id
        });
      }
    });

    // 全收集检测
    var config = getConfig();
    if (!config) return;
    var wasFull = config.isFullCollection(prevPilotIds.length, prevShipIds.length, pilotList.length, shipList.length);
    var isFull = config.isFullCollection(curPilotIds.length, curShipIds.length, pilotList.length, shipList.length);
    if (!wasFull && isFull) {
      bus.emit(events.CODEX_FULL_COLLECTION, { totalEntries: curPilotIds.length + curShipIds.length });
    }
  }

  var api = {
    calculateBonus: calculateBonus,
    checkAndEmit: checkAndEmit,
    getBondsState: function getBondsState(profile) {
      var config = getConfig();
      return config && config.getBondsState ? config.getBondsState(profile) : { bonds: [], anyLightable: false };
    }
  };

  scope.codexSystem = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
