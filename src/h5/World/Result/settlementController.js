(function registerSettlementController(root) {
  "use strict";

  var scope = root.RXGame || (root.RXGame = {});

  function create(options) {
    options = options || {};
    var dom = options.dom || {};
    var assetsConfig = options.assetsConfig || {};
    var getPilotAsset = options.getPilotAsset || function emptyPilot() { return {}; };
    var getSettlementStoryMessage = options.getSettlementStoryMessage || function fallbackStory(result, fallback) { return fallback || ""; };
    var onResult = options.onResult || function noopResult() {};
    var currentView = "";

    function escapeHtml(value) {
      return String(value == null ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    }

    function escapeAttr(value) {
      return escapeHtml(value);
    }

    function setSettlementAssetVars(icons) {
      icons = icons || {};
      if (!dom.shopScreen || !dom.shopScreen.style) return;
      dom.shopScreen.style.setProperty("--settlement-primary-button", "url('" + (icons.primaryButton || "") + "')");
      dom.shopScreen.style.setProperty("--settlement-honor-divider", "url('" + (icons.honorDivider || "") + "')");
      dom.shopScreen.style.setProperty("--settlement-reward-slot", "url('" + (icons.rewardSlot || "") + "')");
    }

  function renderVictoryIntro(result) {
    result = result || {};
    currentView = "intro";
    var syncLocked = isSettlementLocked(result);
    onResult(result);
    var icons = assetsConfig.SETTLEMENT_ICON_ASSETS || {};
    var pilot = getPilotAsset();
    var rating = result.rating || {};
    setSettlementAssetVars(icons);
    dom.shopScreen.classList.remove("settlement-chest-mode", "settlement-opened-mode", "settlement-fail-mode");
    dom.shopScreen.classList.add("settlement-victory-intro-mode", "settlement-ceremony-mode", "settlement-win-mode", "settlement-focused-mode");
    dom.shopMessageEl.textContent = "作战胜利";
    dom.shopCoinsEl.textContent = "战报确认";
    dom.upgradeList.innerHTML = "";
    dom.upgradeList.className = "settlement-victory-intro-view battle-report-intro-view";
    dom.upgradeList.innerHTML =
      '<section class="battle-report-intro">' +
        '<div class="battle-report-glow" aria-hidden="true"></div>' +
        renderSettlementPilotHeader(pilot, "作战胜利", getSettlementStoryMessage(result, "航线已压制，奖励舱正在回收。")) +
        '<section class="battle-report-hero">' +
          '<div class="battle-report-rating">' + renderSettlementHonorStars(rating.honorTier || rating.stars || 1, icons[rating.honorIcon] || "") + '</div>' +
          '<div class="battle-report-copy">' +
            '<span>MISSION CLEAR</span>' +
            '<strong>航线压制完成</strong>' +
          '</div>' +
        '</section>' +
        renderSettlementRatingStats(rating) +
        '<button type="button" class="battle-report-primary" data-open-victory-chest="1"' + (syncLocked ? ' disabled' : '') + '>' + (result.syncState === "error" ? '结算失败，请重试' : (isSettlementPending(result) ? '奖励同步中…' : '领取奖励')) + '</button>' +
      '</section>';
    dom.nextLevelButton.textContent = result.syncState === "error" ? "结算失败，请重试" : (isSettlementPending(result) ? "奖励同步中…" : "领取奖励");
    setLegacyActionsPending(syncLocked);
    dom.replayButton.style.display = "none";
    dom.backToChapterButton.textContent = "返回关卡";
  }

  function renderSettlementChest(result) {
    result = result || {};
    // 兼容旧 room 动作；胜利结算已压缩为“战报 → 最终奖励”两步。
    renderSettlement(result);
  }

  function renderSettlement(result) {
    result = result || {};
    currentView = "result";
    onResult(result);
    var breakdown = result.goldBreakdown || {};
    var icons = assetsConfig.SETTLEMENT_ICON_ASSETS || {};
    var pilot = getPilotAsset();
    var rating = result.rating || {};
    var honorTier = Math.max(0, Math.floor(Number(rating.honorTier) || Number(rating.stars) || 0));
    var honorIcon = icons[rating.honorIcon] || "";
    var title = result.isWin ? "胜利战报" : "作战失败";
    var levelProgress = result.levelProgress || {};
    setSettlementAssetVars(icons);
    dom.shopScreen.classList.remove("settlement-victory-intro-mode", "settlement-chest-mode", "settlement-focused-mode");
    dom.shopScreen.classList.add("settlement-ceremony-mode", "settlement-opened-mode", result.isWin ? "settlement-win-mode" : "settlement-fail-mode");
    var pending = isSettlementPending(result);
    var syncError = result.syncState === "error";
    var syncLocked = pending || syncError;
    dom.shopMessageEl.textContent = pending
      ? title + "：奖励正在同步。"
      : syncError
        ? title + "：奖励尚未入账，请重试结算。"
        : title + "：金币 +" + Math.max(0, Math.floor(result.coinsEarned || 0)) + "，经验 +" + Math.max(0, Math.floor(result.expEarned || 0)) + "。";
    dom.shopCoinsEl.textContent = pending ? "奖励同步中" : (syncError ? "同步失败" : (result.isWin ? "最终结算" : "失败结算"));
    dom.upgradeList.innerHTML = "";
    dom.upgradeList.className = "settlement-result-view battle-report-result-view";

    var rewardCards = [
      { icon: icons.gold || "", label: "金币", value: syncLocked ? (pending ? "同步中" : "未入账") : "+" + Math.max(0, Math.floor(result.coinsEarned || 0)), detail: syncLocked ? (pending ? "等待云端确认" : "结算失败，重试后更新") : "击落 +" + (breakdown.killGold || 0) + " / 通关 +" + (breakdown.clearBonus || 0), className: syncLocked ? " is-syncing" : "" },
      { icon: icons.exp || "", label: "经验", value: syncLocked ? (pending ? "同步中" : "未入账") : "+" + Math.max(0, Math.floor(result.expEarned || 0)), detail: syncLocked ? (pending ? "等待云端确认" : "结算失败，重试后更新") : formatLevelProgress(levelProgress), className: syncLocked ? " level-progress is-syncing" : " level-progress" },
      { icon: icons.emptySlot || "", label: "奖励栏位", value: "待解析", detail: "预留道具 / 碎片", className: " empty" },
      { icon: icons.emptySlot || "", label: "奖励栏位", value: "待解析", detail: "预留装备 / 模组", className: " empty" }
    ];

    var body = document.createElement("section");
    body.className = "battle-report-result " + (result.isWin ? "victory" : "defeat") + " honor-tier-" + honorTier;
    body.innerHTML =
      '<div class="battle-report-glow" aria-hidden="true"></div>' +
      '<section class="battle-report-main">' +
        renderSettlementPilotHeader(pilot, title, getSettlementStoryMessage(result, result.isWin ? "胜利数据已写入航线记录。" : "本次未通关，宝箱不会出现。")) +
        '<div class="battle-report-grade">' +
          renderSettlementHonorStars(honorTier, honorIcon) +
        '</div>' +
      '</section>' +
      renderSettlementRatingStats(rating);

    var grid = document.createElement("section");
    grid.className = "settlement-grid battle-report-rewards";
    rewardCards.forEach(function renderCard(item) {
      var card = document.createElement("article");
      card.className = "battle-report-reward" + (item.className || "");
      card.innerHTML =
        (item.icon ? '<img src="' + escapeAttr(item.icon) + '" alt="">' : "") +
        '<span>' + escapeHtml(item.label) + '</span>' +
        '<strong>' + escapeHtml(item.value) + '</strong>' +
        '<em>' + escapeHtml(item.detail) + '</em>' +
        ((item.className || "").indexOf("level-progress") >= 0 ? renderSettlementLevelBar(levelProgress) : "");
      grid.appendChild(card);
    });
    body.appendChild(grid);

    var actionBar = document.createElement("section");
    actionBar.className = "battle-report-actions";
    function appendReportAction(action, label, primary) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "battle-report-action" + (primary ? " primary" : "");
      button.dataset.settlementAction = action;
      button.textContent = label;
      button.disabled = syncLocked;
      actionBar.appendChild(button);
    }
    appendReportAction(result.isWin ? "next" : "replay", result.isWin ? "下一关" : "再战", true);
    if (result.isWin) appendReportAction("replay", "再战", false);
    if (result.isWin && result.hasPostBattleStory) appendReportAction("story", "战后剧情", false);
    appendReportAction("chapter", "返回关卡", false);
    body.appendChild(actionBar);
    dom.upgradeList.appendChild(body);

    dom.nextLevelButton.textContent = result.isWin ? "下一关" : "再战";
    setLegacyActionsPending(syncLocked);
    dom.replayButton.textContent = "再战";
    dom.replayButton.style.display = "";
    dom.backToChapterButton.textContent = "返回关卡";
  }

  function isSettlementPending(result) {
    return result && result.syncState === "pending";
  }

  function isSettlementLocked(result) {
    return Boolean(result && (result.syncState === "pending" || result.syncState === "error"));
  }

  function setLegacyActionsPending(pending) {
    if (dom.nextLevelButton) dom.nextLevelButton.disabled = Boolean(pending);
    if (dom.replayButton) dom.replayButton.disabled = Boolean(pending);
    if (dom.backToChapterButton) dom.backToChapterButton.disabled = Boolean(pending);
  }

  function refresh(result) {
    if (!currentView) return false;
    if (currentView === "intro" && result && result.isWin) renderVictoryIntro(result);
    else renderSettlement(result);
    return true;
  }

  function renderSettlementHonorStars(tier, crownIcon) {
    tier = Math.max(0, Math.min(5, Math.floor(Number(tier) || 0)));
    var filledStars = Math.min(3, tier);
    var html = '<div class="settlement-honor-badge battle-report-stars"><div class="settlement-star-row">';
    for (var i = 1; i <= 3; i += 1) {
      html += '<span class="settlement-star' + (i <= filledStars ? " filled" : "") + '"></span>';
    }
    html += '</div>';
    if (tier >= 4 && crownIcon) html += '<img class="settlement-crown-mark tier-' + tier + '" src="' + escapeAttr(crownIcon) + '" alt="">';
    html += '</div>';
    return html;
  }

  function renderSettlementRatingStats(rating) {
    rating = rating || {};
    var killedEnemies = Math.max(0, Math.floor(Number(rating.killedEnemies) || 0));
    var damageTaken = Math.max(0, Math.floor(Number(rating.damageTaken) || 0));
    var bossTime = Number(rating.bossClearTime);
    return '<div class="settlement-rating-stats battle-report-stats">' +
      '<span><b>击落敌机</b><strong>' + killedEnemies + '架</strong></span>' +
      '<span><b>受击</b><strong>' + damageTaken + '</strong></span>' +
      '<span><b>BOSS时间</b><strong>' + (bossTime >= 999 || !isFinite(bossTime) ? "--" : Math.ceil(bossTime) + "s") + '</strong></span>' +
    '</div>';
  }

  function renderSettlementPilotHeader(pilot, title, message) {
    pilot = pilot || {};
    return '<section class="settlement-pilot-report battle-report-pilot">' +
      '<figure class="settlement-pilot-art battle-report-pilot-art">' +
        '<img src="' + escapeAttr(pilot.src || assetsConfig.DEFAULT_AVATAR || "") + '" alt="' + escapeAttr(pilot.name || "战姬") + '">' +
      '</figure>' +
      '<div class="settlement-pilot-copy battle-report-pilot-copy">' +
        '<span>' + escapeHtml((pilot.rank || "A") + " RANK / " + (pilot.codeName || "BATTLE REPORT")) + '</span>' +
        '<h2>' + escapeHtml(pilot.name || "出战战姬") + '</h2>' +
        '<strong>' + escapeHtml(title || "战斗结算") + '</strong>' +
        '<p>' + escapeHtml(message || "") + '</p>' +
      '</div>' +
    '</section>';
  }

  function formatLevelProgress(levelProgress) {
    var before = levelProgress && levelProgress.before ? levelProgress.before : null;
    var after = levelProgress && levelProgress.after ? levelProgress.after : null;
    if (!after) return "指挥官经验";
    if (after.isMaxLevel) return before && before.level !== after.level ? "Lv." + before.level + " -> Lv." + after.level + " / 已满级" : "已满级";
    if (before && before.level !== after.level) return "等级提升 Lv." + before.level + " -> Lv." + after.level;
    return "距离 Lv." + (after.level + 1) + " 还差 " + Math.max(0, after.expMax - after.exp) + " 经验";
  }

  function renderSettlementLevelBar(levelProgress) {
    var after = levelProgress && levelProgress.after ? levelProgress.after : null;
    if (!after) return "";
    return '<div class="settlement-level-track"><span style="width: ' + Math.max(0, Math.min(100, after.percent || 0)) + '%;"></span></div>';
  }


    return {
      renderVictoryIntro: renderVictoryIntro,
      renderSettlementChest: renderSettlementChest,
      renderSettlement: renderSettlement,
      refresh: refresh
    };
  }

  var api = { create: create };
  scope.settlementController = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
