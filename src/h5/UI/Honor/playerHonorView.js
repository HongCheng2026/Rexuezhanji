(function registerPlayerHonorView(root) {
  "use strict";

  var scope = root.RXGame || (root.RXGame = {});

  var HONOR_TIERS = Object.freeze([
    Object.freeze({ level: 1, numeral: "I", title: "新翼学员", callSign: "CADET", assetKey: "honor-tier-01" }),
    Object.freeze({ level: 2, numeral: "II", title: "银翼飞行员", callSign: "SILVER WING", assetKey: "honor-tier-02" }),
    Object.freeze({ level: 3, numeral: "III", title: "巡航先锋", callSign: "VANGUARD", assetKey: "honor-tier-03" }),
    Object.freeze({ level: 4, numeral: "IV", title: "苍穹猎手", callSign: "SKY HUNTER", assetKey: "honor-tier-04" }),
    Object.freeze({ level: 5, numeral: "V", title: "星港卫士", callSign: "STAR GUARD", assetKey: "honor-tier-05" }),
    Object.freeze({ level: 6, numeral: "VI", title: "王牌领航", callSign: "ACE LEADER", assetKey: "honor-tier-06" }),
    Object.freeze({ level: 7, numeral: "VII", title: "天穹战将", callSign: "SKY WARLORD", assetKey: "honor-tier-07" }),
    Object.freeze({ level: 8, numeral: "VIII", title: "星域统领", callSign: "STAR COMMAND", assetKey: "honor-tier-08" }),
    Object.freeze({ level: 9, numeral: "IX", title: "银河元帅", callSign: "GALAXY MARSHAL", assetKey: "honor-tier-09" }),
    Object.freeze({ level: 10, numeral: "X", title: "不朽传奇", callSign: "IMMORTAL", assetKey: "honor-tier-10" })
  ]);

  var ROMAN_LEVELS = Object.freeze({ I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10 });

  function normalizeHonorLevel(value, fallbackBadge) {
    var commanderLevel = scope.commanderLevel;
    if (commanderLevel && typeof commanderLevel.normalizeHonorLevel === "function") {
      return commanderLevel.normalizeHonorLevel(value, fallbackBadge);
    }
    var direct = Math.floor(Number(value) || 0);
    if (direct >= 1 && direct <= HONOR_TIERS.length) return direct;
    return ROMAN_LEVELS[String(fallbackBadge || "").trim().toUpperCase()] || 1;
  }

  function getHonorDefinition(value, fallbackBadge) {
    return HONOR_TIERS[normalizeHonorLevel(value, fallbackBadge) - 1] || HONOR_TIERS[0];
  }

  function getAcquiredHonorLevel(player) {
    player = player || {};
    return normalizeHonorLevel(player.honorLevel, player.badge);
  }

  function getEquippedHonorLevel(player) {
    player = player || {};
    var acquiredLevel = getAcquiredHonorLevel(player);
    var equippedLevel = Math.floor(Number(player.equippedHonorLevel) || 0);
    if (equippedLevel < 1) return acquiredLevel;
    return Math.min(acquiredLevel, equippedLevel);
  }

  function getEquippedHonorDefinition(player) {
    return HONOR_TIERS[getEquippedHonorLevel(player) - 1] || HONOR_TIERS[0];
  }

  function equipHonor(player, level) {
    if (!player || typeof player !== "object") return null;
    var acquiredLevel = getAcquiredHonorLevel(player);
    var requestedLevel = Math.floor(Number(level) || 0);
    if (requestedLevel < 1 || requestedLevel > acquiredLevel) return null;
    player.equippedHonorLevel = requestedLevel;
    return HONOR_TIERS[requestedLevel - 1] || null;
  }

  function getHonorImageSource(definition) {
    var assets = scope.assets && scope.assets.HONOR_BADGE_ASSETS;
    return Array.isArray(assets) ? assets[definition.level - 1] || "" : "";
  }

  function renderArtwork(definition) {
    return '<img class="player-honor-art player-honor-art--tier-' + definition.level + '" src="' + getHonorImageSource(definition) + '" alt="" aria-hidden="true" decoding="async" draggable="false" />';
  }

  function renderCompactMarkup(definition) {
    return '<span class="player-honor-icon">' + renderArtwork(definition) + '</span>' +
      '<span class="player-honor-rank"><span class="player-honor-rank-prefix">H-</span><strong>' + definition.numeral + '</strong></span>' +
      '<span class="player-honor-label">HONOR</span>';
  }

  function renderCatalogCard(definition, acquiredLevel, equippedLevel) {
    var isEquipped = definition.level === equippedLevel;
    var isEarned = definition.level <= acquiredLevel;
    var stateClass = isEquipped ? " is-current is-equipped" : isEarned ? " is-earned" : " is-future";
    var stateText = isEquipped ? "佩戴中" : isEarned ? "点击佩戴" : "未解锁";
    var indexText = definition.level < 10 ? "0" + definition.level : "10";
    return '<button type="button" class="player-honor-card player-honor-card--tier-' + definition.level + stateClass + '" data-profile-action="equip-honor" data-honor-level="' + definition.level + '" aria-pressed="' + String(isEquipped) + '"' + (isEarned ? '' : ' disabled') + ' aria-label="荣誉 H-' + definition.numeral + '，' + definition.title + '，' + stateText + '">' +
      '<span class="player-honor-card-index"><small>SEQUENCE</small><b>' + indexText + '</b></span>' +
      '<span class="player-honor-card-emblem" aria-hidden="true">' + renderArtwork(definition) + '</span>' +
      '<span class="player-honor-card-copy"><span class="player-honor-card-rank">H-' + definition.numeral + '</span><strong>' + definition.title + '</strong><small>' + definition.callSign + '</small><i aria-hidden="true"></i></span>' +
      '<span class="player-honor-card-state"><i aria-hidden="true"></i>' + stateText + '</span>' +
    '</button>';
  }

  function renderCatalog(player) {
    player = player || {};
    var acquiredLevel = getAcquiredHonorLevel(player);
    var current = getEquippedHonorDefinition(player);
    var cards = HONOR_TIERS.map(function renderTier(definition) {
      return renderCatalogCard(definition, acquiredLevel, current.level);
    }).join("");
    return '<section class="player-honor-catalog" aria-label="全部荣誉等级与徽记">' +
      '<span class="player-honor-catalog-scan" aria-hidden="true"></span>' +
      '<header class="player-honor-catalog-header"><div class="player-honor-catalog-heading"><small>HONOR ASCENSION PROTOCOL · 01—10</small><h3><span>荣誉</span>晋升序列</h3><p>星港联合舰队 · 指挥权限认证矩阵</p></div>' +
      '<div class="player-honor-catalog-current player-honor-card--tier-' + current.level + '"><span class="player-honor-current-emblem">' + renderArtwork(current) + '</span><span class="player-honor-current-copy"><small>当前佩戴 · EQUIPPED HONOR</small><strong>H-' + current.numeral + '</strong><em>' + current.title + '</em></span></div></header>' +
      '<div class="player-honor-catalog-rail" aria-hidden="true"><span></span><i></i><span></span><i></i><span></span></div>' +
      '<div class="player-honor-catalog-grid">' + cards + '</div>' +
    '</section>';
  }

  function render(container, player) {
    if (!container) return null;
    player = player || {};
    var definition = getEquippedHonorDefinition(player);
    container.className = "pilot-honor player-honor player-honor--tier-" + definition.level;
    container.setAttribute("data-honor-level", String(definition.level));
    container.setAttribute("data-honor-title", definition.title);
    container.setAttribute("aria-label", "荣誉等级 " + definition.numeral + "，" + definition.title);
    container.setAttribute("title", "HONOR H-" + definition.numeral);
    container.innerHTML = renderCompactMarkup(definition);
    return definition;
  }

  var api = {
    HONOR_TIERS: HONOR_TIERS,
    normalizeHonorLevel: normalizeHonorLevel,
    getHonorDefinition: getHonorDefinition,
    getAcquiredHonorLevel: getAcquiredHonorLevel,
    getEquippedHonorLevel: getEquippedHonorLevel,
    getEquippedHonorDefinition: getEquippedHonorDefinition,
    equipHonor: equipHonor,
    getHonorImageSource: getHonorImageSource,
    renderMarkup: renderCompactMarkup,
    renderCatalog: renderCatalog,
    render: render
  };

  scope.playerHonorView = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
