(function registerShipGalleryView(root) {
  var scope = root.RXGame || (root.RXGame = {});

  var assetsConfig = scope.assets || {};
  var balanceConfig = scope.balance || {};
  var combatStats = scope.combatStats || {};
  var rosterEconomy = scope.rosterEconomy || {};
  var SHIP_ASSETS = assetsConfig.SHIP_ASSETS || [];
  var DEFAULT_SHIP_ID = assetsConfig.DEFAULT_SHIP_ID || "ship-b-01";
  var LOCAL_TEST_UNLOCK_ALL_SHIPS = false;

  function renderShipGallery(container, profile, callbacks) {
    callbacks = callbacks || {};
    container.innerHTML = "";
    container.className = "ship-hangar";
    container.tabIndex = 0;

    var activeShipId = (profile.scene && profile.scene.shipId) || DEFAULT_SHIP_ID;
    var ownedShipIds = (profile.owned && Array.isArray(profile.owned.ships)) ? profile.owned.ships : [];
    var gold = scope.profile && scope.profile.getGold ? scope.profile.getGold(profile) : Math.max(0, Number(profile.resources && profile.resources.gold) || 0);
    var selectedIndex = findShipIndex(activeShipId);
    var dragStartX = null;
    var dragStartY = null;

    var shell = document.createElement("section");
    shell.className = "ship-hangar-shell";
    shell.setAttribute("aria-label", "战机机库");

    var prevButton = createNavButton("prev", "上一架战机");
    var nextButton = createNavButton("next", "下一架战机");
    var stage = document.createElement("article");
    stage.className = "ship-hangar-stage";

    shell.appendChild(prevButton);
    shell.appendChild(stage);
    shell.appendChild(nextButton);

    var thumbStrip = document.createElement("nav");
    thumbStrip.className = "ship-hangar-thumbs";
    thumbStrip.setAttribute("aria-label", "战机列表");

    container.appendChild(shell);
    container.appendChild(thumbStrip);

    prevButton.addEventListener("click", function onPrev() {
      selectRelative(-1);
    });
    nextButton.addEventListener("click", function onNext() {
      selectRelative(1);
    });

    container.addEventListener("keydown", function onKeydown(event) {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        selectRelative(-1);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        selectRelative(1);
      }
    });

    container.addEventListener("pointerdown", function onPointerDown(event) {
      dragStartX = event.clientX;
      dragStartY = event.clientY;
    });

    container.addEventListener("pointerup", function onPointerUp(event) {
      if (dragStartX === null || dragStartY === null) return;
      var deltaX = event.clientX - dragStartX;
      var deltaY = event.clientY - dragStartY;
      dragStartX = null;
      dragStartY = null;
      if (Math.abs(deltaX) < 42 || Math.abs(deltaX) < Math.abs(deltaY) * 1.25) return;
      selectRelative(deltaX < 0 ? 1 : -1);
    });

    renderCurrent();
    setTimeout(function focusHangar() {
      if (document.activeElement === document.body || document.activeElement === null) {
        container.focus({ preventScroll: true });
      }
    }, 0);

    function selectRelative(step) {
      selectedIndex = normalizeShipIndex(selectedIndex + step);
      renderCurrent();
    }

    function selectAbsolute(index) {
      selectedIndex = normalizeShipIndex(index);
      renderCurrent();
    }

    function renderCurrent() {
      var ship = SHIP_ASSETS[selectedIndex] || SHIP_ASSETS[0];
      var activeShipId = (profile.scene && profile.scene.shipId) || DEFAULT_SHIP_ID;
      var isActive = ship && ship.id === activeShipId;
      var isOwned = ship && ownedShipIds.indexOf(ship.id) >= 0;
      stage.innerHTML = "";
      thumbStrip.innerHTML = "";
      if (!ship) {
        stage.appendChild(createEmptyState());
        return;
      }

      stage.appendChild(createShipArtwork(ship));
      stage.appendChild(createShipInfo(ship, isActive, isOwned, gold, callbacks));
      renderThumbs(thumbStrip, selectedIndex, activeShipId, ownedShipIds, selectAbsolute);
    }
  }

  function createNavButton(direction, label) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "ship-hangar-nav ship-hangar-nav-" + direction;
    button.setAttribute("aria-label", label);
    button.textContent = direction === "prev" ? "‹" : "›";
    return button;
  }

  function createShipArtwork(ship) {
    var frame = document.createElement("div");
    frame.className = "ship-hangar-art";

    var img = document.createElement("img");
    img.src = encodeAssetSrc(ship.src);
    img.alt = ship.name;
    img.loading = "lazy";
    frame.appendChild(img);

    var rail = document.createElement("span");
    rail.className = "ship-hangar-rail";
    frame.appendChild(rail);

    return frame;
  }

  function createShipInfo(ship, isActive, isOwned, gold, callbacks) {
    var info = document.createElement("div");
    info.className = "ship-hangar-info";

    var body = document.createElement("div");
    body.className = "ship-hangar-info-body";
    info.appendChild(body);

    var control = document.createElement("div");
    control.className = "ship-hangar-control";
    control.appendChild(createRankLine(ship));
    info.appendChild(control);

    var kicker = document.createElement("span");
    kicker.className = "ship-hangar-kicker";
    kicker.textContent = "CODE " + (ship.codeName || ship.name);
    body.appendChild(kicker);

    var title = document.createElement("h3");
    title.textContent = ship.name;
    body.appendChild(title);

    var desc = document.createElement("p");
    desc.className = "ship-hangar-desc";
    desc.textContent = ship.description || "待补充战机档案。";
    body.appendChild(desc);

    var stats = document.createElement("div");
    stats.className = "ship-hangar-stats";
    var armorPenetration = getShipArmorPenetration(ship);
    appendStat(stats, "攻击", ship.damage);
    appendStat(stats, "生命", ship.hp || 0);
    appendStat(stats, "破甲", formatPercent(armorPenetration));
    appendStat(stats, "战力", formatPower(combatStats.calculateUnitPower ? combatStats.calculateUnitPower(ship, "ship") : 0));
    info.appendChild(stats);

    if (ship.exclusiveSkill) {
      var skill = document.createElement("div");
      skill.className = "ship-hangar-skill";
      var skillLabel = document.createElement("span");
      skillLabel.textContent = "专属技能";
      skill.appendChild(skillLabel);
      var skillName = document.createElement("strong");
      skillName.textContent = ship.exclusiveSkill.name || "未命名技能";
      skill.appendChild(skillName);
      var skillDesc = document.createElement("em");
      skillDesc.textContent = ship.exclusiveSkill.description || "S级战机专属技能。";
      skill.appendChild(skillDesc);
      body.appendChild(skill);
    }

    var status = document.createElement("div");
    status.className = "ship-hangar-status";
    var price = rosterEconomy.getPrice ? rosterEconomy.getPrice("ship", ship.rank) : 0;
    var canAfford = gold >= price;
    status.textContent = isOwned ? "已拥有" : (canAfford ? "售价 " : "金币不足 · 售价 ") + formatGold(price);
    if (!isOwned && !canAfford) status.classList.add("insufficient");

    var action = document.createElement("button");
    action.type = "button";
    action.className = "ship-hangar-equip";
    action.textContent = isOwned ? (isActive ? "当前出战" : "设为出战") : "购买 " + formatGold(price);
    action.disabled = isOwned ? isActive : !canAfford || !price;
    if (!isOwned) action.classList.add("purchase");
    action.addEventListener("click", function onEquip() {
      if (isOwned) {
        if (isActive) return;
        if (callbacks.onSelectShip) callbacks.onSelectShip(ship.id);
        return;
      }
      if (canAfford && callbacks.onBuyShip) callbacks.onBuyShip(ship.id);
    });
    control.appendChild(action);
    control.appendChild(status);

    return info;
  }

  function createRankLine(ship) {
    var line = document.createElement("div");
    line.className = "ship-hangar-rankline";

    var badge = document.createElement("span");
    badge.className = "ship-hangar-rank-badge rank-" + ship.rank;
    badge.textContent = ship.rank + "级";
    line.appendChild(badge);

    var label = document.createElement("span");
    label.textContent = "战机评级";
    line.appendChild(label);

    return line;
  }

  function appendStat(container, labelText, valueText) {
    var item = document.createElement("div");
    item.className = "ship-hangar-stat";

    var label = document.createElement("span");
    label.textContent = labelText;
    item.appendChild(label);

    var value = document.createElement("strong");
    value.textContent = String(valueText);
    item.appendChild(value);

    container.appendChild(item);
  }

  function formatPower(value) {
    return Math.max(0, Math.round(Number(value) || 0)).toLocaleString("zh-CN");
  }

  function formatGold(value) {
    return Math.max(0, Math.floor(Number(value) || 0)).toLocaleString("zh-CN") + " 金币";
  }

  function renderThumbs(container, selectedIndex, activeShipId, ownedShipIds, onSelect) {
    for (var i = 0; i < SHIP_ASSETS.length; i++) {
      var ship = SHIP_ASSETS[i];
      var button = document.createElement("button");
      button.type = "button";
      button.className = "ship-hangar-thumb";
      if (i === selectedIndex) button.classList.add("selected");
      if (ship.id === activeShipId) button.classList.add("active");
      if (ownedShipIds.indexOf(ship.id) < 0) button.classList.add("locked");
      button.setAttribute("aria-label", "查看" + ship.name);
      button.setAttribute("aria-current", i === selectedIndex ? "true" : "false");

      var img = document.createElement("img");
      img.src = encodeAssetSrc(ship.src);
      img.alt = "";
      img.loading = "lazy";
      button.appendChild(img);

      var name = document.createElement("span");
      name.textContent = ship.name;
      button.appendChild(name);

      button.addEventListener("click", createThumbClick(i, onSelect));
      container.appendChild(button);
    }
  }

  function createThumbClick(index, onSelect) {
    return function onThumbClick() {
      onSelect(index);
    };
  }

  function createEmptyState() {
    var empty = document.createElement("div");
    empty.className = "ship-hangar-empty";
    empty.textContent = "暂无战机档案。";
    return empty;
  }

  function findShipIndex(shipId) {
    for (var i = 0; i < SHIP_ASSETS.length; i++) {
      if (SHIP_ASSETS[i].id === shipId) return i;
    }
    for (var j = 0; j < SHIP_ASSETS.length; j++) {
      if (SHIP_ASSETS[j].id === DEFAULT_SHIP_ID) return j;
    }
    return 0;
  }

  function normalizeShipIndex(index) {
    var total = SHIP_ASSETS.length;
    if (!total) return 0;
    return ((index % total) + total) % total;
  }

  function getShipArmorPenetration(ship) {
    var stats = balanceConfig.FIGHTER_RARITY_STATS || {};
    return stats[ship.rank] ? Number(stats[ship.rank].armorPenetration) || 0 : 0;
  }

  function formatPercent(value) {
    return Math.round((Number(value) || 0) * 100) + "%";
  }

  function encodeAssetSrc(source) {
    return String(source || "").indexOf("data:") === 0 ? source : encodeURI(String(source || ""));
  }

  var api = {
    renderShipGallery: renderShipGallery,
    LOCAL_TEST_UNLOCK_ALL_SHIPS: LOCAL_TEST_UNLOCK_ALL_SHIPS
  };

  scope.shipGalleryView = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
