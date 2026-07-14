(function registerLobbyView(root) {
  var scope = root.RXGame || (root.RXGame = {});

  var assetsConfig = scope.assets || {};
  var profileModule = scope.profile || {};

  var DEFAULT_AVATAR = assetsConfig.DEFAULT_AVATAR || "";
  var DEFAULT_PILOT_ID = assetsConfig.DEFAULT_PILOT_ID || "";
  var DEFAULT_SHIP_ID = assetsConfig.DEFAULT_SHIP_ID || "";
  var PILOT_ASSETS = assetsConfig.PILOT_ASSETS || [];
  var SHIP_ASSETS = assetsConfig.SHIP_ASSETS || [];
  var BACKGROUND_ASSETS = assetsConfig.BACKGROUND_ASSETS || [];

  /**
   * 渲染大厅界面
   */
  function renderLobby(profile, dom) {
    dom = dom || {};
    var pilotAvatar = dom.pilotAvatar;
    var lobbyPilotLayer = dom.lobbyPilotLayer;
    var lobbyShipLayer = dom.lobbyShipLayer;
    var lobbyBackgroundLayer = dom.lobbyBackgroundLayer;
    var pilotName = dom.pilotName;
    var pilotLevel = dom.pilotLevel;
    var pilotExpText = dom.pilotExpText;
    var pilotExpBar = dom.pilotExpBar;
    var pilotBadge = dom.pilotBadge;
    var energyValue = dom.energyValue;
    var goldValue = dom.goldValue;
    var diamondValue = dom.diamondValue;

    // 恢复体力
    if (profileModule.recoverEnergy) {
      profileModule.recoverEnergy(profile);
    }

    var player = profile.player || {};
    var expMax = Math.max(1, Number(player.expMax) || 1);
    var exp = Math.max(0, Math.min(Math.floor(Number(player.exp) || 0), expMax));
    var avatar = player.avatar || DEFAULT_AVATAR;

    var pilotAsset = getPilotAsset(profile.scene ? profile.scene.pilotId : DEFAULT_PILOT_ID);
    var shipAsset = getShipAsset(profile.scene ? profile.scene.shipId : DEFAULT_SHIP_ID);
    var bgAsset = getBackgroundAsset(profile.scene ? profile.scene.backgroundId : "");

    setImageSource(pilotAvatar, avatar);
    setImageSource(lobbyPilotLayer, pilotAsset ? pilotAsset.src : "");
    setImageSource(lobbyShipLayer, shipAsset ? shipAsset.src : "");
    if (bgAsset && bgAsset.src) {
      setImageSource(lobbyBackgroundLayer, bgAsset.src);
      if (lobbyBackgroundLayer) lobbyBackgroundLayer.classList.add("has-image");
    } else if (lobbyBackgroundLayer) {
      lobbyBackgroundLayer.removeAttribute("src");
      lobbyBackgroundLayer.classList.remove("has-image");
    }

    if (pilotName) pilotName.textContent = player.name || "\u738b\u724c\u98de\u884c\u5458";
    if (pilotLevel) pilotLevel.textContent = "Lv." + (player.level || 1);
    if (pilotExpText) pilotExpText.textContent = exp + "/" + expMax;
    if (pilotExpBar) pilotExpBar.style.width = Math.round((exp / expMax) * 100) + "%";
    if (pilotBadge) pilotBadge.textContent = player.badge || "I";

    var resources = profile.resources || {};
    if (energyValue) energyValue.textContent =
      formatResource(resources.energy) + "/" + formatResource(resources.maxEnergy);
    if (goldValue) goldValue.textContent = formatResource(
      resources.gold != null ? resources.gold : (profile.coins || 0)
    );
    if (diamondValue) diamondValue.textContent = formatResource(
      resources.diamonds != null ? resources.diamonds : 0
    );
  }

  function getPilotAsset(id) {
    for (var i = 0; i < PILOT_ASSETS.length; i++) {
      if (PILOT_ASSETS[i].id === id) return PILOT_ASSETS[i];
    }
    for (var j = 0; j < PILOT_ASSETS.length; j++) {
      if (PILOT_ASSETS[j].id === DEFAULT_PILOT_ID) return PILOT_ASSETS[j];
    }
    return PILOT_ASSETS[0];
  }

  function getShipAsset(id) {
    for (var i = 0; i < SHIP_ASSETS.length; i++) {
      if (SHIP_ASSETS[i].id === id) return SHIP_ASSETS[i];
    }
    for (var j = 0; j < SHIP_ASSETS.length; j++) {
      if (SHIP_ASSETS[j].id === DEFAULT_SHIP_ID) return SHIP_ASSETS[j];
    }
    return SHIP_ASSETS[0];
  }

  function getBackgroundAsset(id) {
    for (var i = 0; i < BACKGROUND_ASSETS.length; i++) {
      if (BACKGROUND_ASSETS[i].id === id) return BACKGROUND_ASSETS[i];
    }
    return BACKGROUND_ASSETS[0];
  }

  function setImageSource(image, source) {
    if (!image) return;
    image.src = String(source || "");
  }

  function formatResource(value) {
    var v = Math.max(0, Math.floor(Number(value) || 0));
    if (v >= 100000) return Math.floor(v / 1000) + "K";
    return String(v);
  }

  var api = {
    renderLobby: renderLobby,
    getPilotAsset: getPilotAsset,
    getShipAsset: getShipAsset,
    getBackgroundAsset: getBackgroundAsset
  };

  scope.lobbyView = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
