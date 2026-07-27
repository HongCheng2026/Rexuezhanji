(function registerRuntimeTheme(root) {
  "use strict";

  var scope = root.RXGame || (root.RXGame = {});
  var poseFields = ["left", "top", "width", "height", "maxHeight", "opacity", "translateX", "translateY", "rotate", "scale"];

  function kebab(value) {
    return String(value).replace(/[A-Z]/g, function replaceUpper(letter) { return "-" + letter.toLowerCase(); });
  }

  function create(options) {
    options = options || {};
    var assets = options.assets || {};
    var getProfile = options.getProfile || function getEmptyProfile() { return {}; };

    function applyCssVars() {
      var background = assets.BACKGROUND_ASSETS && assets.BACKGROUND_ASSETS[0];
      if (!background || !background.src || !root.document || !root.document.documentElement) return;
      var style = root.document.documentElement.style;
      style.setProperty("--rx-hangar-bg", "url(" + JSON.stringify(background.src) + ")");
      [
        { obj: assets.UI_A_HUD_ASSETS, prefix: "--rx-a-" },
        { obj: assets.TACTICAL_DOCK_ASSETS, prefix: "--rx-td-" },
        { obj: assets.SHOP_ITEM_ASSETS, prefix: "--rx-shi-" },
        { obj: assets.FEATURE_PANEL_ASSETS, prefix: "--rx-fp-" },
        { obj: assets.SETTLEMENT_ICON_ASSETS, prefix: "--rx-set-" },
        { obj: assets.CHAPTER_COVER_ASSETS, prefix: "--rx-cc-" },
        { obj: assets.CHAPTER_SELECT_ASSETS, prefix: "--rx-cs-" }
      ].forEach(function exposeCollection(entry) {
        Object.keys(entry.obj || {}).forEach(function exposeKey(key) {
          var url = entry.obj[key];
          if (!url || typeof url !== "string") return;
          style.setProperty(entry.prefix + kebab(key), "url(" + JSON.stringify(url) + ")");
        });
      });
    }

    function setImageSource(image, source) {
      if (image && source) image.src = String(source);
    }

    function applyLobbyPose(image, pose, role) {
      if (!image || !role) return;
      poseFields.forEach(function clear(field) { image.style.removeProperty("--lobby-" + role + "-" + kebab(field)); });
      var nextPose = pose || (assets.DEFAULT_LOBBY_POSES && assets.DEFAULT_LOBBY_POSES[role]) || {};
      poseFields.forEach(function apply(field) {
        if (nextPose[field] != null) image.style.setProperty("--lobby-" + role + "-" + kebab(field), String(nextPose[field]));
      });
    }

    function findAsset(collection, id, fallbackId) {
      var list = assets[collection] || [];
      return list.find(function find(asset) { return asset.id === (id || fallbackId); }) || list[0];
    }

    return {
      applyCssVars: applyCssVars,
      setImageSource: setImageSource,
      applyLobbyPose: applyLobbyPose,
      getPilotAsset: function getPilotAsset(id) {
        var profile = getProfile() || {};
        return findAsset("PILOT_ASSETS", id || (profile.scene && profile.scene.pilotId), assets.DEFAULT_PILOT_ID);
      },
      getShipAsset: function getShipAsset(id) {
        var profile = getProfile() || {};
        return findAsset("SHIP_ASSETS", id || (profile.scene && profile.scene.shipId), assets.DEFAULT_SHIP_ID);
      },
      getBackgroundAsset: function getBackgroundAsset(id) {
        var profile = getProfile() || {};
        return findAsset("BACKGROUND_ASSETS", id || (profile.scene && profile.scene.backgroundId), assets.DEFAULT_BACKGROUND_ID);
      }
    };
  }

  scope.runtimeTheme = { create: create };
  if (typeof module !== "undefined" && module.exports) module.exports = { create: create };
})(typeof globalThis !== "undefined" ? globalThis : this);
