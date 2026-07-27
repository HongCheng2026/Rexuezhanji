(function registerFighterView(root) {
  var scope = root.RXGame || (root.RXGame = {});

  var assetsConfig = scope.assets || {};
  var balanceConfig = scope.balance || {};
  var powerCalculator = scope.powerCalculator || {};
  var rosterEconomy = scope.rosterEconomy || {};
  var SHIP_ASSETS = assetsConfig.SHIP_ASSETS || [];
  var DEFAULT_SHIP_ID = assetsConfig.DEFAULT_SHIP_ID || "ship-b-01";

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

      var effectiveStats = getShipStats(profile, ship);
      var artworkStars = String(ship.rank || "").toUpperCase() === "SS" && isOwned && effectiveStats.rank === "SSS"
        ? (rosterEconomy.getFighterStarLevel ? rosterEconomy.getFighterStarLevel(profile, ship.id) : 0)
        : null;
      stage.appendChild(createShipArtwork(ship, artworkStars));
      stage.appendChild(createShipInfo(ship, profile, isActive, isOwned, gold, callbacks, effectiveStats));
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

  function createShipArtwork(ship, stars) {
    var frame = document.createElement("div");
    frame.className = "ship-hangar-art";

    var img = document.createElement("img");
    img.src = assetSrc(ship.src);
    img.alt = ship.name;
    img.loading = "lazy";
    frame.appendChild(img);

    var rail = document.createElement("span");
    rail.className = "ship-hangar-rail";
    frame.appendChild(rail);

    if (stars !== null) {
      frame.classList.add("has-stars");
      frame.appendChild(createStarLine(stars, "ship-hangar-art-stars"));
    }

    return frame;
  }

  function createShipInfo(ship, profile, isActive, isOwned, gold, callbacks, effectiveStats) {
    var info = document.createElement("div");
    info.className = "ship-hangar-info";

    var shipStats = effectiveStats || getShipStats(profile, ship);
    var currentRank = shipStats.rank;
    var promotionPlan = rosterEconomy.getPromotionPlan
      ? rosterEconomy.getPromotionPlan(profile, "ship", ship.id)
      : { ok: false, reason: "RANK_NOT_ELIGIBLE", currentRank: currentRank };

    var body = document.createElement("div");
    body.className = "ship-hangar-info-body";
    info.appendChild(body);

    var control = document.createElement("div");
    control.className = "ship-hangar-control";
    control.setAttribute("aria-label", "战机管理");
    control.appendChild(createRankLine(currentRank));
    info.appendChild(control);

    var title = document.createElement("h3");
    title.textContent = ship.name;
    body.appendChild(title);

    var desc = document.createElement("p");
    desc.className = "ship-hangar-desc";
    desc.textContent = ship.description || "待补充战机档案。";
    body.appendChild(desc);

    var stats = document.createElement("div");
    stats.className = "ship-hangar-stats";
    appendStat(stats, "攻击", shipStats.attack);
    appendStat(stats, "生命", shipStats.hp);
    appendStat(stats, "破甲", formatPercent(shipStats.armorPenetration));
    appendStat(stats, "战力", formatPower(powerCalculator.calculateUnitPower ? powerCalculator.calculateUnitPower(ship, "ship", profile) : 0));
    info.appendChild(stats);

    var skills = document.createElement("div");
    skills.className = "ship-hangar-skills";
    body.appendChild(skills);
    appendShipSkill(skills, Array.isArray(ship.activeSkills) && ship.activeSkills[0] ? "专属技能" : "基础武装",
      Array.isArray(ship.activeSkills) && ship.activeSkills[0] ? ship.activeSkills[0] : {
        name: getWeaponName(ship.primaryWeapon),
        description: "随战机评级提升初始武装等级。"
      });
    appendShipSkill(skills, "决胜指令", {
      name: ship.decisiveCommandEffect ? "决胜指令 · " + ship.decisiveCommandEffect.name : "决胜指令",
      description: ship.decisiveCommandEffect
        ? ship.decisiveCommandEffect.description
        : "清除敌方子弹和普通敌机。"
    });

    var status = document.createElement("div");
    status.className = "ship-hangar-status";
    var isGachaOnly = ship.acquisition === "gacha-only";
    var price = rosterEconomy.getPrice ? rosterEconomy.getPrice("ship", ship.rank) : 0;
    var canAfford = gold >= price;
    status.textContent = isOwned ? "已拥有" : isGachaOnly ? "抽卡限定" : (canAfford ? "售价 " : "金币不足 · 售价 ") + formatGold(price);
    if (!isOwned && (!canAfford || isGachaOnly)) status.classList.add("insufficient");

    var action = document.createElement("button");
    action.type = "button";
    action.className = "ship-hangar-equip";
    action.textContent = isOwned ? (isActive ? "当前出战" : "设为出战") : isGachaOnly ? "抽卡限定" : "购买 " + formatGold(price);
    action.disabled = Boolean(callbacks.busy || (isOwned ? isActive : isGachaOnly || !canAfford || !price));
    if (!isOwned) action.classList.add("purchase");
    action.addEventListener("click", function onEquip() {
      if (isOwned) {
        if (isActive) return;
        if (callbacks.onSelectShip) callbacks.onSelectShip(ship.id);
        return;
      }
      if (!isGachaOnly && canAfford && callbacks.onBuyShip) callbacks.onBuyShip(ship.id);
    });

    var ownershipGroup = document.createElement("div");
    ownershipGroup.className = "ship-hangar-action-group ship-hangar-ownership-group";
    ownershipGroup.appendChild(action);
    ownershipGroup.appendChild(status);
    control.appendChild(ownershipGroup);

    var promotionGroup = document.createElement("div");
    promotionGroup.className = "ship-hangar-action-group ship-hangar-promotion-group";
    promotionGroup.appendChild(createPromotionButton(ship, isOwned, promotionPlan, callbacks));
    var promotionStatus = document.createElement("div");
    promotionStatus.className = "ship-hangar-status ship-hangar-progress-status";
    promotionStatus.textContent = getPromotionStatus(isOwned, currentRank, promotionPlan);
    if (!promotionPlan.ok && promotionPlan.reason === "TOKEN_NOT_OWNED") promotionStatus.classList.add("insufficient");
    promotionGroup.appendChild(promotionStatus);
    control.appendChild(promotionGroup);

    if (String(ship.rank || "").toUpperCase() === "SS" && isOwned && currentRank === "SSS") {
      var starPlan = rosterEconomy.getFighterStarPlan
        ? rosterEconomy.getFighterStarPlan(profile, ship.id)
        : { ok: false, reason: "COPY_NOT_OWNED", currentStars: shipStats.stars || 0, copiesOwned: 0, modulesOwned: 0, modulesRequired: 5 };
      var starGroup = document.createElement("div");
      starGroup.className = "ship-hangar-action-group ship-hangar-star-group";
      var starButton = document.createElement("button");
      starButton.type = "button";
      starButton.className = "ship-hangar-equip ship-hangar-star-up";
      starButton.textContent = starPlan.reason === "MAX_STARS" ? "已满6星" : "升星";
      starButton.disabled = Boolean(!starPlan.ok || callbacks.busy);
      starButton.addEventListener("click", function onStarUp() {
        if (starPlan.ok && callbacks.onStarUpShip) callbacks.onStarUpShip(ship.id);
      });
      starGroup.appendChild(starButton);
      var starStatus = document.createElement("div");
      starStatus.className = "ship-hangar-status ship-hangar-progress-status";
      starStatus.textContent = starPlan.reason === "MAX_STARS"
        ? "星级已满"
        : "凌光本体 " + (starPlan.copiesOwned || 0) + "/1 · SSS战机模组 " + (starPlan.modulesOwned || 0) + "/" + (starPlan.modulesRequired || 5);
      if (!starPlan.ok && (starPlan.reason === "COPY_NOT_OWNED" || starPlan.reason === "MODULE_NOT_OWNED")) starStatus.classList.add("insufficient");
      starGroup.appendChild(starStatus);
      control.appendChild(starGroup);
    }

    if (callbacks.notice) {
      var notice = document.createElement("output");
      notice.className = "ship-hangar-notice";
      notice.setAttribute("aria-live", "polite");
      notice.textContent = callbacks.notice;
      control.appendChild(notice);
    }

    return info;
  }

  function createPromotionButton(ship, isOwned, plan, callbacks) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "ship-hangar-equip ship-hangar-promote";
    var currentRank = String(plan && plan.currentRank || ship.rank || "").toUpperCase();
    var previewTargetRank = plan && plan.targetRank || ({ B: "A", A: "S", SS: "SSS" })[currentRank] || "";
    button.textContent = !isOwned
      ? "拥有后可升阶"
      : previewTargetRank ? "升阶至 " + previewTargetRank : currentRank === "S" ? "已达最高品质" : "已达最高阶";
    button.disabled = Boolean(!isOwned || !plan || !plan.ok || callbacks.busy);
    if (!button.disabled) {
      button.title = "消耗 " + Math.max(1, Number(plan.tokenRequired) || 1) + " 个" + getTokenName(plan.tokenId);
      button.addEventListener("click", function onPromote() {
        if (callbacks.onPromoteShip) callbacks.onPromoteShip(ship.id, plan.tokenId);
      });
    }
    return button;
  }

  function getPromotionStatus(isOwned, rank, plan) {
    if (!isOwned) return "未拥有";
    if (plan && plan.tokenId) {
      return getTokenName(plan.tokenId) + " " + (plan.tokenOwned || 0) + "/" + (plan.tokenRequired || 1);
    }
    return rank === "S" ? "当前品质已达上限" : rank === "SSS" ? "已完成终极升阶" : "无可用升阶路线";
  }

  function createStarLine(stars, extraClass) {
    var line = document.createElement("div");
    line.className = "ship-hangar-stars" + (extraClass ? " " + extraClass : "");
    line.setAttribute("aria-label", stars + "星，最高6星");
    for (var i = 0; i < 6; i++) {
      var star = document.createElement("span");
      star.textContent = i < stars ? "★" : "☆";
      if (i < stars) star.className = "filled";
      line.appendChild(star);
    }
    return line;
  }

  function appendShipSkill(parent, label, config) {
    if (!config) return;
    var skill = document.createElement("div");
    skill.className = "ship-hangar-skill";
    var skillLabel = document.createElement("span");
    skillLabel.textContent = label;
    skill.appendChild(skillLabel);
    var skillName = document.createElement("strong");
    skillName.textContent = config.name || "未命名技能";
    skill.appendChild(skillName);
    var skillDesc = document.createElement("em");
    skillDesc.textContent = config.description || "技能说明待补充。";
    skill.appendChild(skillDesc);
    parent.appendChild(skill);
  }

  function createRankLine(rank) {
    var line = document.createElement("div");
    line.className = "ship-hangar-rankline";

    var badge = document.createElement("span");
    badge.className = "ship-hangar-rank-badge rank-" + rank;
    badge.textContent = rank + "级";
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
      img.src = assetSrc(ship.src);
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

  function getShipStats(profile, ship) {
    if (rosterEconomy.getShipStats) {
      var promoted = rosterEconomy.getShipStats(profile, ship.id);
      if (promoted) return promoted;
    }
    var rank = ship && ship.rank ? String(ship.rank).toUpperCase() : "B";
    var stats = balanceConfig.FIGHTER_RARITY_STATS || {};
    return {
      rank: rank,
      attack: Math.max(0, Number(ship && ship.damage) || 0),
      hp: Math.max(0, Number(ship && ship.hp) || 0),
      armorPenetration: stats[rank] ? Number(stats[rank].armorPenetration) || 0 : 0
    };
  }

  function getWeaponName(type) {
    if (type === "laser") return "激光主炮";
    if (type === "missile") return "追踪导弹";
    return "散射机炮";
  }

  function getTokenName(tokenId) {
    if (tokenId === "fighter_rank_a_token") return "A级改装令";
    if (tokenId === "fighter_rank_s_token") return "S级改装令";
    if (tokenId === "sss_fighter_module") return "SSS战机模组";
    return tokenId || "升阶材料";
  }

  function formatPercent(value) {
    return Math.round((Number(value) || 0) * 100) + "%";
  }

  function assetSrc(source) {
    return String(source || "");
  }

  var api = {
    renderShipGallery: renderShipGallery
  };

  scope.fighterView = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
