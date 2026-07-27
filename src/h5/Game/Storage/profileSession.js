(function registerProfileSession(root) {
  "use strict";

  var scope = root.RXGame || (root.RXGame = {});

  function create(options) {
    options = options || {};
    var shared = options.shared || scope;
    var levels = options.levels || [];
    var assets = options.assets || {};
    var demoConfig = options.demoConfig || { enabled: false };

    function cloneProfile(source) {
      try { return JSON.parse(JSON.stringify(source || {})); }
      catch (error) { return source || {}; }
    }

    function unlockForLocalTest(nextProfile) {
      nextProfile = nextProfile || {};
      if (shared.testUnlockFlags && shared.testUnlockFlags.LOCAL_TEST_UNLOCK_ALL_LEVELS) {
        nextProfile.unlockedLevel = levels.length || nextProfile.unlockedLevel || 1;
      }
      var unlockAllPilots = shared.testUnlockFlags && shared.testUnlockFlags.LOCAL_TEST_UNLOCK_ALL_PILOTS;
      if (unlockAllPilots) {
        nextProfile.owned = nextProfile.owned || {};
        var ownedPilots = Array.isArray(nextProfile.owned.pilots) ? nextProfile.owned.pilots.slice() : [];
        (assets.PILOT_ASSETS || []).forEach(function unlockPilot(pilot) {
          if (pilot && pilot.id && ownedPilots.indexOf(pilot.id) < 0) ownedPilots.push(pilot.id);
        });
        nextProfile.owned.pilots = ownedPilots;
      }
      var unlockAllShips = shared.testUnlockFlags && shared.testUnlockFlags.LOCAL_TEST_UNLOCK_ALL_SHIPS;
      if (unlockAllShips) {
        nextProfile.owned = nextProfile.owned || {};
        var ownedShips = Array.isArray(nextProfile.owned.ships) ? nextProfile.owned.ships.slice() : [];
        (assets.SHIP_ASSETS || []).forEach(function unlockShip(ship) {
          if (ship && ship.id && ownedShips.indexOf(ship.id) < 0) ownedShips.push(ship.id);
        });
        nextProfile.owned.ships = ownedShips;
      }
      return nextProfile;
    }

    function normalize(nextProfile) {
      return shared.profile.normalizeProfile(unlockForLocalTest(nextProfile));
    }

    function loadProfile() {
      if (demoConfig.enabled && options.createDemoProfile) return normalize(options.createDemoProfile());
      var runtime = shared.profileRuntime;
      var nextProfile = runtime && runtime.loadProfile
        ? runtime.loadProfile()
        : shared.profile.createProfile(JSON.parse(root.localStorage.getItem(shared.profileRuntime.STORAGE_KEY) || "{}"));
      return normalize(nextProfile);
    }

    function saveProfile(profile) {
      if (demoConfig.enabled) return profile;
      var normalized = normalize(profile);
      if (shared.profileRuntime && shared.profileRuntime.saveProfile) shared.profileRuntime.saveProfile(normalized);
      else root.localStorage.setItem(shared.profileRuntime.STORAGE_KEY, JSON.stringify(normalized));
      return normalized;
    }

    function applyGatewayProfile(nextProfile) {
      var normalized = normalize(nextProfile);
      root.localStorage.setItem(shared.profileRuntime.STORAGE_KEY, JSON.stringify(normalized));
      return normalized;
    }

    function mergeLocalCosmetics(cloudProfile, localProfile) {
      var merged = cloneProfile(cloudProfile || {});
      var localPlayer = localProfile && localProfile.player || {};
      var localScene = localProfile && localProfile.scene || {};
      var cloudOwned = merged.owned || {};
      merged.player = merged.player || {};
      merged.scene = merged.scene || {};
      ["name", "signature", "avatar"].forEach(function copyPlayerField(field) {
        if (typeof localPlayer[field] === "string" && localPlayer[field]) merged.player[field] = localPlayer[field];
      });
      var ownershipFields = { pilotId: "pilots", shipId: "ships", backgroundId: "backgrounds" };
      ["pilotId", "shipId", "backgroundId"].forEach(function copyOwnedSceneField(field) {
        var ownedIds = Array.isArray(cloudOwned[ownershipFields[field]]) ? cloudOwned[ownershipFields[field]] : [];
        if (typeof localScene[field] === "string" && ownedIds.indexOf(localScene[field]) >= 0) merged.scene[field] = localScene[field];
      });
      return merged;
    }

    function hasCosmeticDifference(before, after) {
      if (!before || !after) return false;
      return JSON.stringify({ player: before.player, scene: before.scene }) !==
        JSON.stringify({ player: after.player, scene: after.scene });
    }

    return {
      loadProfile: loadProfile,
      saveProfile: saveProfile,
      applyGatewayProfile: applyGatewayProfile,
      unlockForLocalTest: unlockForLocalTest,
      cloneProfile: cloneProfile,
      mergeLocalCosmetics: mergeLocalCosmetics,
      hasCosmeticDifference: hasCosmeticDifference
    };
  }

  scope.profileSession = { create: create };
  if (typeof module !== "undefined" && module.exports) module.exports = { create: create };
})(typeof globalThis !== "undefined" ? globalThis : this);
