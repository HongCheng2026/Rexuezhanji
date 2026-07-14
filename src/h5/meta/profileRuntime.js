(function registerProfileRuntime(root) {
  var scope = root.RXGame || (root.RXGame = {});

  var profileModule = scope.profile || {};
  var combatStatsModule = scope.combatStats || {};
  var levelsConfig = scope.levels || {};
  var assetsConfig = scope.assets || {};

  var STORAGE_KEY = "rxgame_save_v5";

  /**
   * 从 localStorage 读取存档
   */
  function loadProfile() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return createDefaultProfile();
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return createDefaultProfile();
      parsed = unlockForLocalTest(parsed);
      var profile = profileModule.normalizeProfile
        ? profileModule.normalizeProfile(parsed)
        : parsed;

      return unlockForLocalTest(profile);
    } catch (e) {
      console.warn("读取存档失败，使用默认存档。", e);
      return createDefaultProfile();
    }
  }

  /**
   * 创建默认存档
   */
  function createDefaultProfile() {
    var profile = profileModule.createProfile
      ? profileModule.createProfile({})
      : { unlockedLevel: 1, completed: [] };

    return unlockForLocalTest(profile);
  }

  /**
   * 保存存档到 localStorage
   */
  function saveProfile(profile) {
    try {
      profile = unlockForLocalTest(profile);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } catch (e) {
      console.warn("保存存档失败。", e);
    }
  }

  /**
   * 本地测试：在存档规范化前声明测试解锁，避免 scene 选择被重置。
   */
  function unlockForLocalTest(profile) {
    profile = profile || {};
    if (combatStatsModule.LOCAL_TEST_UNLOCK_ALL_LEVELS) {
      var levelCount = (levelsConfig.levels || []).length || 3;
      profile.unlockedLevel = levelCount;
    }
    if (combatStatsModule.LOCAL_TEST_UNLOCK_ALL_PILOTS) {
      profile.owned = profile.owned || {};
      var ownedPilots = Array.isArray(profile.owned.pilots) ? profile.owned.pilots.slice() : [];
      (assetsConfig.PILOT_ASSETS || []).forEach(function unlockPilot(pilot) {
        if (pilot && pilot.id && ownedPilots.indexOf(pilot.id) < 0) {
          ownedPilots.push(pilot.id);
        }
      });
      profile.owned.pilots = ownedPilots;
    }
    if (combatStatsModule.LOCAL_TEST_UNLOCK_ALL_SHIPS) {
      profile.owned = profile.owned || {};
      var ownedShips = Array.isArray(profile.owned.ships) ? profile.owned.ships.slice() : [];
      (assetsConfig.SHIP_ASSETS || []).forEach(function unlockShip(ship) {
        if (ship && ship.id && ownedShips.indexOf(ship.id) < 0) {
          ownedShips.push(ship.id);
        }
      });
      profile.owned.ships = ownedShips;
    }
    return profile;
  }

  /**
   * 重新加载存档
   */
  function reloadProfileFromSave() {
    return loadProfile();
  }

  /**
   * 恢复体力
   */
  function recoverEnergy(profile, now) {
    if (profileModule.recoverEnergy) {
      return profileModule.recoverEnergy(profile, now || Date.now());
    }
    return profile;
  }

  /**
   * 获取金币
   */
  function getGold(profile) {
    if (profileModule.getGold) {
      return profileModule.getGold(profile);
    }
    return Math.max(0, Math.floor(
      (profile && profile.resources ? profile.resources.gold : 0) || 0
    ));
  }

  /**
   * 设置金币
   */
  function setGold(profile, value) {
    if (profileModule.setGold) {
      return profileModule.setGold(profile, value);
    }
    profile.resources = profile.resources || {};
    profile.resources.gold = Math.max(0, Math.floor(value || 0));
    return profile;
  }

  /**
   * 消耗体力
   */
  function spendEnergy(profile, amount) {
    if (profileModule.spendEnergy) {
      return profileModule.spendEnergy(profile, amount);
    }
    profile.resources = profile.resources || {};
    profile.resources.energy = Math.max(0, (profile.resources.energy || 0) - amount);
    return profile.resources.energy >= 0;
  }

  var api = {
    loadProfile: loadProfile,
    createDefaultProfile: createDefaultProfile,
    saveProfile: saveProfile,
    reloadProfileFromSave: reloadProfileFromSave,
    recoverEnergy: recoverEnergy,
    getGold: getGold,
    setGold: setGold,
    spendEnergy: spendEnergy,
    STORAGE_KEY: STORAGE_KEY
  };

  scope.profileRuntime = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
