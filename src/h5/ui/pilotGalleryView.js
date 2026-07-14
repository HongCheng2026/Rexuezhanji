(function registerPilotGalleryView(root) {
  var scope = root.RXGame || (root.RXGame = {});

  var assetsConfig = scope.assets || {};
  var balanceConfig = scope.balance || {};
  var combatStats = scope.combatStats || {};
  var rosterEconomy = scope.rosterEconomy || {};
  var PILOT_ASSETS = assetsConfig.PILOT_ASSETS || [];
  var DEFAULT_PILOT_ID = assetsConfig.DEFAULT_PILOT_ID || "pilot-b-linzhihan";
  var LOCAL_TEST_UNLOCK_ALL_PILOTS = false;

  function renderPilotGallery(container, profile, callbacks) {
    callbacks = callbacks || {};
    container.innerHTML = "";
    container.className = "pilot-dossier";
    container.tabIndex = 0;

    var activePilotId = (profile.scene && profile.scene.pilotId) || DEFAULT_PILOT_ID;
    var ownedPilotIds = (profile.owned && Array.isArray(profile.owned.pilots)) ? profile.owned.pilots : [];
    var gold = scope.profile && scope.profile.getGold ? scope.profile.getGold(profile) : Math.max(0, Number(profile.resources && profile.resources.gold) || 0);
    var selectedIndex = findPilotIndex(activePilotId);
    var dragStartX = null;
    var dragStartY = null;

    var shell = document.createElement("section");
    shell.className = "pilot-dossier-shell";
    shell.setAttribute("aria-label", "战姬档案");

    var prevButton = createNavButton("prev", "上一位战姬");
    var nextButton = createNavButton("next", "下一位战姬");
    var stage = document.createElement("article");
    stage.className = "pilot-dossier-stage";

    shell.appendChild(prevButton);
    shell.appendChild(stage);
    shell.appendChild(nextButton);

    var thumbStrip = document.createElement("nav");
    thumbStrip.className = "pilot-dossier-thumbs";
    thumbStrip.setAttribute("aria-label", "战姬列表");

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
    setTimeout(function focusDossier() {
      if (document.activeElement === document.body || document.activeElement === null) {
        container.focus({ preventScroll: true });
      }
    }, 0);

    function selectRelative(step) {
      selectedIndex = normalizePilotIndex(selectedIndex + step);
      renderCurrent();
    }

    function selectAbsolute(index) {
      selectedIndex = normalizePilotIndex(index);
      renderCurrent();
    }

    function renderCurrent() {
      var pilot = PILOT_ASSETS[selectedIndex] || PILOT_ASSETS[0];
      var isActive = pilot && pilot.id === ((profile.scene && profile.scene.pilotId) || DEFAULT_PILOT_ID);
      var isOwned = pilot && ownedPilotIds.indexOf(pilot.id) >= 0;
      stage.innerHTML = "";
      thumbStrip.innerHTML = "";
      if (!pilot) {
        stage.appendChild(createEmptyState());
        return;
      }

      stage.appendChild(createPilotArtwork(pilot));
      stage.appendChild(createPilotInfo(pilot, isActive, isOwned, gold, callbacks));
      renderThumbs(thumbStrip, selectedIndex, (profile.scene && profile.scene.pilotId) || DEFAULT_PILOT_ID, ownedPilotIds, selectAbsolute);
    }
  }

  function createNavButton(direction, label) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "pilot-dossier-nav pilot-dossier-nav-" + direction;
    button.setAttribute("aria-label", label);
    button.textContent = direction === "prev" ? "‹" : "›";
    return button;
  }

  function createPilotArtwork(pilot) {
    var frame = document.createElement("div");
    frame.className = "pilot-dossier-art";

    var img = document.createElement("img");
    img.src = encodeAssetSrc(pilot.src);
    img.alt = pilot.name;
    img.loading = "lazy";
    frame.appendChild(img);

    return frame;
  }

  function createPilotInfo(pilot, isActive, isOwned, gold, callbacks) {
    var info = document.createElement("div");
    info.className = "pilot-dossier-info";

    var body = document.createElement("div");
    body.className = "pilot-dossier-info-body";
    info.appendChild(body);

    var control = document.createElement("div");
    control.className = "pilot-dossier-control";
    control.appendChild(createRankLine(pilot));
    info.appendChild(control);

    var kicker = document.createElement("span");
    kicker.className = "pilot-dossier-kicker";
    kicker.textContent = "CODE " + (pilot.codeName || pilot.name);
    body.appendChild(kicker);

    var title = document.createElement("h3");
    title.textContent = pilot.name;
    body.appendChild(title);

    var desc = document.createElement("p");
    desc.className = "pilot-dossier-desc";
    desc.textContent = pilot.description || "待补充战姬档案。";
    body.appendChild(desc);

    if (pilot.story) {
      var story = document.createElement("p");
      story.className = "pilot-dossier-story";
      story.textContent = pilot.story;
      body.appendChild(story);
    }

    var stats = document.createElement("div");
    stats.className = "pilot-dossier-stats";
    var armorPenetration = getPilotArmorPenetration(pilot);
    appendStat(stats, "攻击", pilot.damage);
    appendStat(stats, "生命", pilot.hp || 0);
    appendStat(stats, "破甲", formatPercent(armorPenetration));
    appendStat(stats, "战力", formatPower(combatStats.calculateUnitPower ? combatStats.calculateUnitPower(pilot, "pilot") : 0));
    info.appendChild(stats);

    var status = document.createElement("div");
    status.className = "pilot-dossier-status";
    var price = rosterEconomy.getPrice ? rosterEconomy.getPrice("pilot", pilot.rank) : 0;
    var canAfford = gold >= price;
    status.textContent = isOwned ? "已拥有" : (canAfford ? "售价 " : "金币不足 · 售价 ") + formatGold(price);
    if (!isOwned && !canAfford) status.classList.add("insufficient");

    var action = document.createElement("button");
    action.type = "button";
    action.className = "pilot-dossier-equip";
    action.textContent = isOwned ? (isActive ? "当前出战" : "设为出战") : "购买 " + formatGold(price);
    action.disabled = isOwned ? isActive : !canAfford || !price;
    if (!isOwned) action.classList.add("purchase");
    action.addEventListener("click", function onEquip() {
      if (isOwned) {
        if (isActive) return;
        if (callbacks.onSelectPilot) callbacks.onSelectPilot(pilot.id);
        return;
      }
      if (canAfford && callbacks.onBuyPilot) callbacks.onBuyPilot(pilot.id);
    });
    control.appendChild(action);
    control.appendChild(status);

    return info;
  }

  function createRankLine(pilot) {
    var line = document.createElement("div");
    line.className = "pilot-dossier-rankline";

    var badge = document.createElement("span");
    badge.className = "pilot-dossier-rank-badge rank-" + pilot.rank;
    badge.textContent = pilot.rank + "级";
    line.appendChild(badge);

    var label = document.createElement("span");
    label.textContent = "战姬评级";
    line.appendChild(label);

    return line;
  }

  function appendStat(container, labelText, valueText) {
    var item = document.createElement("div");
    item.className = "pilot-dossier-stat";

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

  function renderThumbs(container, selectedIndex, activePilotId, ownedPilotIds, onSelect) {
    for (var i = 0; i < PILOT_ASSETS.length; i++) {
      var pilot = PILOT_ASSETS[i];
      var button = document.createElement("button");
      button.type = "button";
      button.className = "pilot-dossier-thumb";
      if (i === selectedIndex) button.classList.add("selected");
      if (pilot.id === activePilotId) button.classList.add("active");
      if (ownedPilotIds.indexOf(pilot.id) < 0) button.classList.add("locked");
      button.setAttribute("aria-label", "查看" + pilot.name);
      button.setAttribute("aria-current", i === selectedIndex ? "true" : "false");

      var img = document.createElement("img");
      img.src = encodeAssetSrc(pilot.src);
      img.alt = "";
      img.loading = "lazy";
      button.appendChild(img);

      var name = document.createElement("span");
      name.textContent = pilot.name;
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
    empty.className = "pilot-dossier-empty";
    empty.textContent = "暂无战姬档案。";
    return empty;
  }

  function findPilotIndex(pilotId) {
    for (var i = 0; i < PILOT_ASSETS.length; i++) {
      if (PILOT_ASSETS[i].id === pilotId) return i;
    }
    for (var j = 0; j < PILOT_ASSETS.length; j++) {
      if (PILOT_ASSETS[j].id === DEFAULT_PILOT_ID) return j;
    }
    return 0;
  }

  function normalizePilotIndex(index) {
    var total = PILOT_ASSETS.length;
    if (!total) return 0;
    return ((index % total) + total) % total;
  }

  function getPilotArmorPenetration(pilot) {
    var stats = balanceConfig.PILOT_RARITY_STATS || {};
    return stats[pilot.rank] ? Number(stats[pilot.rank].armorPenetration) || 0 : 0;
  }

  function formatPercent(value) {
    return Math.round((Number(value) || 0) * 100) + "%";
  }

  function encodeAssetSrc(source) {
    return String(source || "").indexOf("data:") === 0 ? source : encodeURI(String(source || ""));
  }

  var api = {
    renderPilotGallery: renderPilotGallery,
    LOCAL_TEST_UNLOCK_ALL_PILOTS: LOCAL_TEST_UNLOCK_ALL_PILOTS
  };

  scope.pilotGalleryView = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
