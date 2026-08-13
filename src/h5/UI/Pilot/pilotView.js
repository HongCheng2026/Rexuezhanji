(function registerPilotView(root) {
  var scope = root.RXGame || (root.RXGame = {});

  var assetsConfig = scope.assets || {};
  var balanceConfig = scope.balance || {};
  var powerCalculator = scope.powerCalculator || {};
  var rosterEconomy = scope.rosterEconomy || {};
  var PILOT_ASSETS = assetsConfig.PILOT_ASSETS || [];
  var DEFAULT_PILOT_ID = assetsConfig.DEFAULT_PILOT_ID || "pilot-b-linzhihan";

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

      var artworkStars = String(pilot.rank || "").toUpperCase() === "SS" && isOwned
        ? (rosterEconomy.getPilotStarLevel ? rosterEconomy.getPilotStarLevel(profile, pilot.id) : 0)
        : null;
      stage.appendChild(createPilotArtwork(pilot, artworkStars));
      stage.appendChild(createPilotInfo(pilot, isActive, isOwned, gold, profile, callbacks));
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

  function createPilotArtwork(pilot, stars) {
    var frame = document.createElement("div");
    frame.className = "pilot-dossier-art";

    var img = document.createElement("img");
    img.src = assetSrc(pilot.src);
    img.alt = pilot.name;
    img.loading = "lazy";
    frame.appendChild(img);

    if (stars !== null) {
      frame.classList.add("has-stars");
      frame.appendChild(createStarLine(stars, "pilot-dossier-art-stars"));
    }

    return frame;
  }

  function createPilotInfo(pilot, isActive, isOwned, gold, profile, callbacks) {
    var info = document.createElement("div");
    info.className = "pilot-dossier-info";
    var effectiveStats = rosterEconomy.getPilotStats ? rosterEconomy.getPilotStats(profile, pilot.id) : null;
    var effectiveRank = effectiveStats && effectiveStats.rank ? effectiveStats.rank : pilot.rank;

    var body = document.createElement("div");
    body.className = "pilot-dossier-info-body";
    info.appendChild(body);

    var control = document.createElement("div");
    control.className = "pilot-dossier-control";
    control.setAttribute("aria-label", "战姬管理");
    control.appendChild(createRankLine(effectiveRank));
    info.appendChild(control);

    var title = document.createElement("h3");
    title.textContent = pilot.name;
    body.appendChild(title);

    var desc = document.createElement("p");
    desc.className = "pilot-dossier-desc";
    desc.textContent = pilot.description || "待补充战姬档案。";
    body.appendChild(desc);

    var stats = document.createElement("div");
    stats.className = "pilot-dossier-stats";
    var armorPenetration = effectiveStats ? effectiveStats.armorPenetration : getPilotArmorPenetration(pilot, effectiveRank);
    var attack = effectiveStats ? effectiveStats.attack : pilot.damage;
    appendStat(stats, "攻击", attack);
    appendStat(stats, "破甲", formatPercent(armorPenetration));
    appendStat(stats, "战力", formatPower(powerCalculator.calculateUnitPower ? powerCalculator.calculateUnitPower(pilot, "pilot", profile) : 0));
    body.appendChild(stats);

    var ownershipGroup = document.createElement("div");
    ownershipGroup.className = "pilot-dossier-action-group pilot-dossier-ownership-group";
    control.appendChild(ownershipGroup);

    var status = document.createElement("div");
    status.className = "pilot-dossier-status";
    var isGachaOnly = pilot.acquisition === "gacha-only";
    var price = rosterEconomy.getPrice ? rosterEconomy.getPrice("pilot", pilot.rank) : 0;
    var canAfford = gold >= price;
    status.textContent = isOwned ? "已拥有" : isGachaOnly ? "抽卡限定" : (canAfford ? "售价 " : "金币不足 · 售价 ") + formatGold(price);
    if (!isOwned && (!canAfford || isGachaOnly)) status.classList.add("insufficient");

    var action = document.createElement("button");
    action.type = "button";
    action.className = "pilot-dossier-equip";
    action.textContent = isOwned ? (isActive ? "当前出战" : "设为出战") : isGachaOnly ? "抽卡限定" : "购买 " + formatGold(price);
    action.disabled = isOwned ? isActive : isGachaOnly || !canAfford || !price;
    if (!isOwned) action.classList.add("purchase");
    action.addEventListener("click", function onEquip() {
      if (isOwned) {
        if (isActive) return;
        if (callbacks.onSelectPilot) callbacks.onSelectPilot(pilot.id);
        return;
      }
      if (!isGachaOnly && canAfford && callbacks.onBuyPilot) callbacks.onBuyPilot(pilot.id);
    });
    ownershipGroup.appendChild(action);
    ownershipGroup.appendChild(status);

    var promotionGroup = document.createElement("div");
    promotionGroup.className = "pilot-dossier-action-group pilot-dossier-promotion-group";
    control.appendChild(promotionGroup);

    var promotionPlan = rosterEconomy.getPromotionPlan ? rosterEconomy.getPromotionPlan(profile, "pilot", pilot.id) : { ok: false, reason: "RANK_NOT_ELIGIBLE", currentRank: effectiveRank };
    var promote = document.createElement("button");
    promote.type = "button";
    promote.className = "pilot-dossier-equip pilot-dossier-promote";
    promote.textContent = getPromotionButtonLabel(isOwned, effectiveRank, promotionPlan);
    promote.disabled = !promotionPlan.ok;
    promote.addEventListener("click", function onPromote() {
      if (promotionPlan.ok && callbacks.onPromotePilot) callbacks.onPromotePilot(pilot.id, promotionPlan.tokenId);
    });
    promotionGroup.appendChild(promote);

    var promotionStatus = document.createElement("div");
    promotionStatus.className = "pilot-dossier-status pilot-dossier-progress-status";
    promotionStatus.textContent = getPromotionStatus(isOwned, effectiveRank, promotionPlan);
    if (!promotionPlan.ok && promotionPlan.reason === "TOKEN_NOT_OWNED") promotionStatus.classList.add("insufficient");
    promotionGroup.appendChild(promotionStatus);

    if (String(pilot.rank || "").toUpperCase() === "SS" && isOwned) {
      var stars = effectiveStats ? effectiveStats.stars : (rosterEconomy.getPilotStarLevel ? rosterEconomy.getPilotStarLevel(profile, pilot.id) : 0);
      var starGroup = document.createElement("div");
      starGroup.className = "pilot-dossier-action-group pilot-dossier-star-group";
      control.appendChild(starGroup);
      var starPlan = rosterEconomy.getPilotStarPlan ? rosterEconomy.getPilotStarPlan(profile, pilot.id) : { ok: false, reason: "COPY_NOT_OWNED", currentStars: stars, copiesOwned: 0 };
      var starButton = document.createElement("button");
      starButton.type = "button";
      starButton.className = "pilot-dossier-equip pilot-dossier-star-up";
      starButton.textContent = starPlan.reason === "MAX_STARS" ? "已满6星" : "升星";
      starButton.disabled = !starPlan.ok;
      starButton.addEventListener("click", function onStarUp() {
        if (starPlan.ok && callbacks.onStarUpPilot) callbacks.onStarUpPilot(pilot.id);
      });
      starGroup.appendChild(starButton);

      var starStatus = document.createElement("div");
      starStatus.className = "pilot-dossier-status pilot-dossier-progress-status";
      starStatus.textContent = starPlan.reason === "MAX_STARS"
        ? "星级已满"
        : "黑月本体 " + (starPlan.copiesOwned || 0) + "/1 · SSS级战姬奖章 " + (starPlan.medalsOwned || 0) + "/" + (starPlan.medalsRequired || 5);
      if (!starPlan.ok && (starPlan.reason === "COPY_NOT_OWNED" || starPlan.reason === "MEDAL_NOT_OWNED")) starStatus.classList.add("insufficient");
      starGroup.appendChild(starStatus);
    }

    return info;
  }

  function createRankLine(rank) {
    var line = document.createElement("div");
    line.className = "pilot-dossier-rankline";

    var badge = document.createElement("span");
    badge.className = "pilot-dossier-rank-badge rank-" + rank;
    badge.textContent = rank + "级";
    line.appendChild(badge);

    var label = document.createElement("span");
    label.textContent = "战姬评级";
    line.appendChild(label);

    return line;
  }

  function createStarLine(stars, extraClass) {
    var line = document.createElement("div");
    line.className = "pilot-dossier-stars" + (extraClass ? " " + extraClass : "");
    line.setAttribute("aria-label", stars + "星，最高6星");
    for (var i = 0; i < 6; i++) {
      var star = document.createElement("span");
      star.textContent = i < stars ? "★" : "☆";
      if (i < stars) star.className = "filled";
      line.appendChild(star);
    }
    return line;
  }

  function getPromotionButtonLabel(isOwned, rank, plan) {
    if (!isOwned) return "拥有后可升阶";
    if (plan && plan.targetRank) return "升阶至 " + plan.targetRank;
    if (rank === "S") return "已达最高品质";
    if (rank === "SSS") return "已达最高阶";
    return "当前不可升阶";
  }

  function getPromotionStatus(isOwned, rank, plan) {
    if (!isOwned) return "未拥有";
    if (plan && plan.tokenId) {
      var labels = { pilot_rank_a_token: "A级档案令", pilot_rank_s_token: "S级档案令", sss_pilot_medal: "SSS级战姬奖章" };
      return (labels[plan.tokenId] || plan.tokenId) + " " + (plan.tokenOwned || 0) + "/" + (plan.tokenRequired || 1);
    }
    return rank === "S" ? "当前品质已达上限" : rank === "SSS" ? "已完成终极晋升" : "无可用升阶路线";
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
      img.src = assetSrc(pilot.src);
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

  function getPilotArmorPenetration(pilot, rank) {
    var stats = balanceConfig.PILOT_RARITY_STATS || {};
    var effectiveRank = rank || pilot.rank;
    return stats[effectiveRank] ? Number(stats[effectiveRank].armorPenetration) || 0 : 0;
  }

  function formatPercent(value) {
    return Math.round((Number(value) || 0) * 100) + "%";
  }

  function assetSrc(source) {
    return String(source || "");
  }

  var api = {
    renderPilotGallery: renderPilotGallery
  };

  scope.pilotView = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
