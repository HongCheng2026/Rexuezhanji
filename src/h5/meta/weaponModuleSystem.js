(function registerWeaponModuleSystem(root) {
  "use strict";

  var scope = root.RXGame || (root.RXGame = {});

  function ensureState(profile) {
    profile.weaponModules = profile.weaponModules || { ownedIds: [], equippedId: null };
    profile.weaponModules.ownedIds = Array.isArray(profile.weaponModules.ownedIds) ? profile.weaponModules.ownedIds : [];
    return profile.weaponModules;
  }

  function buy(profile, moduleId) {
    var definition = scope.balance && scope.balance.WEAPON_MODULES && scope.balance.WEAPON_MODULES[moduleId];
    if (!definition) throw new Error("武器模块不存在。");
    var moduleState = ensureState(profile);
    if (moduleState.ownedIds.indexOf(moduleId) >= 0) throw new Error("该模块已经购买。");
    var price = Math.max(0, Math.floor(Number(definition.price) || 0));
    var gold = scope.profile.getGold(profile);
    if (gold < price) throw new Error("金币不足。");
    scope.profile.setGold(profile, gold - price);
    moduleState.ownedIds.push(moduleId);
    return { profile: profile, cost: price, moduleId: moduleId };
  }

  function equip(profile, moduleId, ship) {
    var modules = scope.balance && scope.balance.WEAPON_MODULES || {};
    var moduleState = ensureState(profile);
    if (moduleId && !modules[moduleId]) throw new Error("武器模块不存在。");
    if (moduleId && moduleState.ownedIds.indexOf(moduleId) < 0) throw new Error("请先购买该模块。");
    if (moduleId && (!ship || ship.rank !== "S")) throw new Error("只有 S 级战机可以装备模块。");
    moduleState.equippedId = moduleId || null;
    return { profile: profile, moduleId: moduleState.equippedId };
  }

  var api = { buy: buy, equip: equip };
  scope.weaponModuleSystem = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
