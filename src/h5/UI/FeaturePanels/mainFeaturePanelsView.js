(function registerMainFeaturePanelsView(root) {
  "use strict";

  var scope = root.RXGame || (root.RXGame = {});
  var content = scope.featurePanelContent || {};
  var panelState = {
    achievement: "航线开拓",
    shop: "金币"
  };
  var panelTabs = {
    achievement: ["航线开拓", "王牌技巧", "整备精进", "星舰收集", "极限挑战", "星港功勋"],
    shop: ["金币", "钻石", "兑换"]
  };

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch];
    });
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }

  function clampNumber(value, min, max) {
    var number = Number(value);
    if (!isFinite(number)) number = min;
    return Math.max(min, Math.min(max, number));
  }

  function formatNumber(value) {
    var number = Math.max(0, Math.floor(Number(value) || 0));
    return String(number).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  function progressPercent(current, target) {
    return clampNumber(Math.round((Math.max(0, current) / Math.max(1, target)) * 100), 0, 100);
  }

  function localDateKey(date) {
    date = date || new Date();
    return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
  }

  function getConfig() {
    content = scope.featurePanelContent || content || {};
    return content;
  }

  function getProgressRoot(profile) {
    return (profile && profile.progress) || {};
  }

  function getClearCount(profile) {
    return Math.max(0, Math.floor(Number(getProgressRoot(profile).clearCount) || 0));
  }

  function getPerfectCount(profile) {
    return Math.max(0, Math.floor(Number(getProgressRoot(profile).perfectClearCount) || 0));
  }

  function normalizeStageId(stageId) {
    return String(stageId || "").replace(/-/g, "_");
  }

  function isStageCleared(stageId, profile, levels) {
    var progress = getProgressRoot(profile);
    var ids = Array.isArray(progress.clearedStageIds) ? progress.clearedStageIds : [];
    var normalized = normalizeStageId(stageId);
    for (var i = 0; i < ids.length; i++) {
      if (normalizeStageId(ids[i]) === normalized) return true;
    }
    var ratings = (profile && profile.ratings) || {};
    if (ratings[stageId] || ratings[normalized] || ratings[String(stageId).replace(/_/g, "-")]) return true;
    levels = levels || [];
    for (var j = 0; j < levels.length; j++) {
      var level = levels[j];
      if (!level) continue;
      if (normalizeStageId(level.code) === normalized || normalizeStageId(level.id) === normalized) {
        return !!(ratings[level.id] || ratings[level.code]);
      }
    }
    return false;
  }

  function hasOwnedSRank(profile) {
    var assets = scope.assets || {};
    var owned = (profile && profile.owned) || {};
    var ids = []
      .concat(Array.isArray(owned.pilots) ? owned.pilots : [])
      .concat(Array.isArray(owned.ships) ? owned.ships : []);
    var map = {};
    (assets.PILOT_ASSETS || []).concat(assets.SHIP_ASSETS || []).forEach(function (item) {
      if (item && item.id) map[item.id] = item.rank;
    });
    for (var i = 0; i < ids.length; i++) {
      if (map[ids[i]] === "S" || String(ids[i]).toLowerCase().indexOf("-s-") >= 0) return true;
    }
    return false;
  }

  function getBestHonor(profile) {
    var honors = getProgressRoot(profile).stageHonors || {};
    var best = 0;
    Object.keys(honors).forEach(function (key) {
      best = Math.max(best, Math.floor(Number(honors[key]) || 0));
    });
    return best;
  }

  function getUpgradeTotal(profile) {
    var fighter = scope.fighterUpgradeApi && scope.fighterUpgradeApi.getLevels(profile) || {};
    return Math.max(0,
      Math.floor(Number(fighter.attack) || 1) +
      Math.floor(Number(fighter.hp) || 1) +
      Math.floor(Number(fighter.armorPenetration) || 1)
    );
  }

  function getAchievementMetric(item, profile, levels) {
    var metric = item.metric || "";
    var fighter = scope.fighterUpgradeApi && scope.fighterUpgradeApi.getLevels(profile) || {};
    var owned = (profile && profile.owned) || {};
    if (metric === "clearCount") return getClearCount(profile);
    if (metric === "perfectClearCount") return getPerfectCount(profile);
    if (metric === "noDamageBossClearCount") return Math.max(0, Number(getProgressRoot(profile).noDamageBossClearCount) || 0);
    if (metric.indexOf("stage:") === 0) return isStageCleared(metric.slice(6), profile, levels) ? 1 : 0;
    if (metric.indexOf("upgrade:") === 0) return Math.max(1, Math.floor(Number(fighter[metric.slice(8)]) || 1));
    if (metric === "upgradeTotal") return getUpgradeTotal(profile);
    if (metric === "ownedPilots") return Array.isArray(owned.pilots) ? owned.pilots.length : 0;
    if (metric === "ownedShips") return Array.isArray(owned.ships) ? owned.ships.length : 0;
    if (metric === "ownedSRank") return hasOwnedSRank(profile) ? 1 : 0;
    if (metric === "bestHonor") return getBestHonor(profile);
    // 新增成就 metric（2026-07 成就系统扩展）
    if (metric === "starTotal") return Math.max(0, Number(getProgressRoot(profile).starTotal) || 0);
    if (metric === "enemyKillTotal") return Math.max(0, Number(getProgressRoot(profile).enemyKillTotal) || 0);
    if (metric === "clearTotalBossKills") return Math.max(0, Number(getProgressRoot(profile).clearTotalBossKills) || 0);
    if (metric === "endlessBestKills") return Math.max(0, Number(getProgressRoot(profile).endlessBestKills) || 0);
    if (metric === "endlessBestSurvivalSeconds") return Math.max(0, Number(getProgressRoot(profile).endlessBestSurvivalSeconds) || 0);
    if (metric === "tacticalOpsCount") return Math.max(0, Number(getProgressRoot(profile).tacticalOpsCount) || 0);
    if (metric === "loginDays") return Math.max(0, Number(getProgressRoot(profile).loginDays) || 0);
    if (metric === "clear_chapter") return Math.max(0, Number(getProgressRoot(profile).clearedChapterIds.length) || 0);
    // Codex 成就（v3.0 起仅全收集一项）
    if (metric.indexOf("codex:") === 0) {
      var codexConfig = scope.codexConfig;
      if (!codexConfig) return 0;
      var profileObj = profile || {};
      var ownedPilots = Array.isArray(profileObj.owned && profileObj.owned.pilots) ? profileObj.owned.pilots : [];
      var ownedShips = Array.isArray(profileObj.owned && profileObj.owned.ships) ? profileObj.owned.ships : [];
      var shipList = (scope.assets && scope.assets.SHIP_ASSETS) || [];
      var pilotList2 = (scope.assets && scope.assets.PILOT_ASSETS) || [];
      var isFull = codexConfig.isFullCollection(ownedPilots.length, ownedShips.length, pilotList2.length, shipList.length);
      return isFull ? 1 : 0;
    }
    return 0;
  }

  function rewardName(type) {
    return ({ gold: "金币", diamonds: "钻石", energy: "体力", item: "道具" })[type] || type || "奖励";
  }

  function renderRewardList(rewards) {
    if (!rewards || !rewards.length) return "奖励";
    return rewards.map(function (item) {
      if (item.type === "item") return (item.name || item.itemId || "道具") + " " + formatNumber(item.amount || 0);
      return rewardName(item.type) + " " + formatNumber(item.amount || 0);
    }).join(" / ");
  }

  function renderProgressBar(current, target) {
    return '<div class="terminal-progress" aria-hidden="true"><span style="width:' + progressPercent(current, target) + '%"></span></div>';
  }

  function renderStatusSummary(items) {
    var html = '<div class="terminal-summary">';
    for (var i = 0; i < items.length; i++) {
      html += '<article><span>' + escapeHtml(items[i].label) + '</span><strong>' + escapeHtml(items[i].value) + '</strong></article>';
    }
    return html + '</div>';
  }

  function renderRail(categories, active, note) {
    var html = '<aside class="terminal-rail">';
    for (var i = 0; i < categories.length; i++) {
      html += '<button type="button" class="' + (categories[i] === active ? "active" : "") + '" disabled>' + escapeHtml(categories[i]) + '</button>';
    }
    if (note) html += '<p>' + escapeHtml(note) + '</p>';
    return html + '</aside>';
  }

  function renderRoute(progress) {
    if (!progress) return "";
    var percent = progressPercent(progress.current, progress.target);
    var labels = ["1-1", "1-2", "1-3", "1-4", "BOSS"];
    var html = '<div class="terminal-route" style="--route-progress:' + percent + '%">';
    for (var i = 0; i < labels.length; i++) {
      var threshold = (i / Math.max(1, labels.length - 1)) * 100;
      html += '<span class="' + (percent >= threshold ? "active" : "") + '"><b></b><em>' + escapeHtml(labels[i]) + '</em></span>';
    }
    return html + '</div>';
  }

  function renderDock(data) {
    data = data || {};
    var stats = data.stats || [];
    var html = '<aside class="terminal-dock">' +
      '<section class="terminal-reward-box">' +
        '<span>' + escapeHtml(data.kicker || "REWARD") + '</span>' +
        '<div class="terminal-reward-icon" aria-hidden="true"></div>' +
        '<strong>' + escapeHtml(data.reward || "") + '</strong>' +
        '<p>' + escapeHtml(data.note || "") + '</p>' +
        '<button type="button" class="' + (data.ready ? "is-ready" : "") + '" disabled>' + escapeHtml(data.action || "") + '</button>' +
      '</section>' +
      '<section class="terminal-overview-box"><span>' + escapeHtml(data.overviewTitle || "STATUS") + '</span>';
    for (var i = 0; i < stats.length; i++) {
      html += '<article><em>' + escapeHtml(stats[i].label) + '</em><strong>' + escapeHtml(stats[i].value) + '</strong></article>';
    }
    return html + '</section></aside>';
  }

  function renderActionCard(data) {
    var progress = data.progress;
    var statusClass = data.statusClass || (progress && progress.done ? "is-ready" : "");
    var action = data.action || "查看";
    var disabled = data.disabled ? " disabled" : "";
    var actionAttr = data.actionAttr || "";
    var html = '<article class="terminal-focus-card">' +
      '<div class="terminal-focus-top"><span>' + escapeHtml(data.tag || "重点目标") + '</span><em class="' + statusClass + '">' + escapeHtml(data.status || "") + '</em></div>' +
      '<strong>' + escapeHtml(data.title || "") + '</strong>' +
      '<p>' + escapeHtml(data.desc || "") + '</p>';
    if (data.meta) html += '<dl>' + data.meta.map(function (row) { return '<div><dt>' + escapeHtml(row[0]) + '</dt><dd>' + escapeHtml(row[1]) + '</dd></div>'; }).join("") + '</dl>';
    if (progress) {
      html += '<div class="terminal-focus-progress"><span>' + escapeHtml(progress.label) + '</span><b>' + formatNumber(progress.current) + '/' + formatNumber(progress.target) + '</b></div>' +
        renderRoute(progress) +
        renderProgressBar(progress.current, progress.target);
    }
    html += '<footer><em>' + escapeHtml(data.reward || "") + '</em><button type="button"' + actionAttr + disabled + '>' + escapeHtml(action) + '</button></footer></article>';
    return html;
  }

  function renderTerminalShell(config) {
    return '<section class="terminal-panel terminal-panel-' + escapeHtml(config.key || "default") + '">' +
      '<header class="terminal-header">' +
      '<div><span>' + escapeHtml(config.kicker || "STARPORT") + '</span><strong>' + escapeHtml(config.title || "") + '</strong></div>' +
      '<p>' + escapeHtml(config.desc || "") + '</p>' +
      '</header>' +
      '<section class="terminal-body">' +
      (config.rail || "") +
      '<section class="terminal-content">' +
      (config.summary || "") +
      (config.focus || "") +
      (config.list || "") +
      (config.footer || "") +
      '</section>' +
      (config.dock || "") +
      '</section></section>';
  }

  function countDone(rows) {
    return rows.reduce(function (sum, row) { return sum + (row.progress.done ? 1 : 0); }, 0);
  }

  function countReady(rows) {
    return rows.reduce(function (sum, row) { return sum + (row.progress.done && !row.claimed ? 1 : 0); }, 0);
  }

  function getLobbyClaimableState(profile, levels) {
    profile = profile || {};
    levels = levels || [];
    var cfg = getConfig();

    var claimedAchievements = Array.isArray(profile.claimedAchievements) ? profile.claimedAchievements : [];
    var achievements = cfg.ACHIEVEMENT_CONTENT || [];
    var achievementReady = achievements.some(function (item) {
      return claimedAchievements.indexOf(item.id) < 0 && getAchievementMetric(item, profile, levels) >= item.target;
    });

    var dailyShop = profile.claimedDailyShop || {};
    var hasDailySupply = ((scope.shopConfig && scope.shopConfig.SHOP_CONTENT) || []).some(function (item) { return item.id === "daily_free_supply"; });
    var shopReady = hasDailySupply && (dailyShop.date !== localDateKey() || !Array.isArray(dailyShop.ids) || dailyShop.ids.indexOf("daily_free_supply") < 0);

    var codexBonds = scope.codexSystem && scope.codexSystem.getBondsState
      ? scope.codexSystem.getBondsState(profile)
      : { anyLightable: false };

    var taskStates = scope.taskSystem && scope.taskSystem.getTaskStates ? scope.taskSystem.getTaskStates(profile) : [];
    var activityStates = scope.taskSystem && scope.taskSystem.getActivityRewardStates ? scope.taskSystem.getActivityRewardStates(profile) : [];
    var taskReady = taskStates.some(function (state) { return state.ready; });
    var activityReady = activityStates.some(function (state) { return state.ready; });

    return {
      event: false,
      achievement: achievementReady,
      task: taskReady,
      shop: shopReady,
      ranking: false,
      inventory: false,
      codex: !!codexBonds.anyLightable,
      activity: activityReady
    };
  }

  function renderV3Resources(profile, extra) {
    var resources = profile && profile.resources || {};
    var gold = resources.gold != null ? resources.gold : profile && profile.coins || 0;
    var energy = resources.energy || 0;
    var maxEnergy = resources.maxEnergy || 0;
    return '<div class="feature-panel-resources">' +
      '<span><i class="gold"></i>金币 <b>' + formatNumber(gold) + '</b></span>' +
      '<span><i class="diamond"></i>钻石 <b>' + formatNumber(resources.diamonds || 0) + '</b></span>' +
      '<span><i class="energy"></i>体力 <b>' + formatNumber(energy) + (maxEnergy ? '/' + formatNumber(maxEnergy) : '') + '</b></span>' +
      (extra || '') +
    '</div>';
  }

  function isActiveTab(panelKey, tab) {
    return panelState[panelKey] === tab;
  }

  function ensureActiveTab(panelKey, tabs, fallback) {
    var active = panelState[panelKey] || fallback || (tabs && tabs[0]);
    if (tabs && tabs.indexOf(active) < 0) active = fallback || tabs[0];
    panelState[panelKey] = active;
    return active;
  }

  function renderFeatureTabs(panelKey, tabs, active) {
    var html = '<nav class="feature-tabbar" aria-label="分类">';
    for (var i = 0; i < tabs.length; i++) {
      html += '<button type="button" class="' + (tabs[i] === active ? "active" : "") + '" data-feature-tab="' + escapeAttr(tabs[i]) + '" data-feature-tab-index="' + i + '" data-feature-panel="' + escapeAttr(panelKey) + '">' + escapeHtml(tabs[i]) + '</button>';
    }
    return html + '</nav>';
  }

  function renderAchievementPanel(profile, levels) {
    var cfg = getConfig();
    var tabs = panelTabs.achievement;
    var activeTab = ensureActiveTab("achievement", tabs, "航线开拓");
    var items = cfg.ACHIEVEMENT_CONTENT || [];
    var claimed = Array.isArray(profile && profile.claimedAchievements) ? profile.claimedAchievements : [];
    var rows = items.map(function (item) {
      var current = getAchievementMetric(item, profile, levels);
      var progress = { current: Math.min(current, item.target), rawCurrent: current, target: item.target, label: "徽章 " + item.badge, done: current >= item.target };
      return { item: item, progress: progress, claimed: claimed.indexOf(item.id) >= 0 };
    }).sort(function (a, b) {
      var aw = a.claimed ? 0 : a.progress.done ? 2 : 1;
      var bw = b.claimed ? 0 : b.progress.done ? 2 : 1;
      return bw - aw;
    });
    var filtered = rows.filter(function (row) { return row.item.category === activeTab; });
    var focus = filtered[0] || rows[0] || {};
    var settlement = scope.assets && scope.assets.SETTLEMENT_ICON_ASSETS || {};
    var focusState = focus.claimed ? "已领取" : focus.progress && focus.progress.done ? "可领取" : "进行中";
    var list = '<section class="achievement-board board-page feature-board">' +
      renderV3Resources(profile) +
      renderFeatureTabs("achievement", tabs, activeTab) +
      '<div class="achievement-hero">' +
        '<article class="achievement-detail ' + (focus.claimed ? "is-claimed" : focus.progress && focus.progress.done ? "is-ready" : "is-locked") + '">' +
          '<div class="achievement-badge-large" aria-hidden="true">' + (settlement.crownGold ? '<img src="' + escapeAttr(settlement.crownGold) + '" alt="">' : '') + '<span>' + escapeHtml(focus.item && focus.item.badge ? focus.item.badge.slice(0, 1) : "章") + '</span></div>' +
          '<div class="achievement-focus-copy"><span>' + escapeHtml(focusState + ' · ' + (focus.item && focus.item.category || activeTab)) + '</span><strong>' + escapeHtml(focus.item && focus.item.title || "暂无成就") + '</strong><p>' + escapeHtml(focus.item && focus.item.desc || "当前分类暂无可展示成就。") + '</p>' +
          (focus.progress ? '<div class="achievement-progress"><b>' + escapeHtml(focus.progress.label) + '</b><em>' + formatNumber(focus.progress.current) + '/' + formatNumber(focus.progress.target) + '</em>' + renderProgressBar(focus.progress.current, focus.progress.target) + '</div>' : "") +
          '</div><div class="achievement-focus-reward"><span>成就奖励</span><strong>' + escapeHtml(renderRewardList(focus.item && focus.item.rewards)) + '</strong>' +
          (focus.claimed ? '<em class="board-state is-claimed">已领取</em>' : focus.progress && focus.progress.done ? '<button type="button" class="board-action is-ready" data-achievement-claim="' + escapeAttr(focus.item.id) + '">领取奖励</button>' : '<em class="board-state">进行中</em>') + '</div>' +
          '<div class="achievement-summary"><span>已完成<b>' + countDone(rows) + '</b></span><span>档案总数<b>' + items.length + '</b></span><span>最高荣誉<b>' + escapeHtml(getBestHonor(profile) ? "Tier " + getBestHonor(profile) : "0") + '</b></span></div>' +
        '</article>' +
      '</div><section class="board-section-head"><div><strong>徽章档案墙</strong><span>可领取成就已置顶</span></div><p>' + countReady(rows) + ' 项可领取</p></section><div class="achievement-grid">';
    for (var i = 0; i < filtered.length; i++) {
      var row = rows[i];
      row = filtered[i];
      list += '<article class="achievement-badge-card ' + (row.claimed ? "is-claimed" : row.progress.done ? "is-ready" : "is-locked") + '">' +
        '<div class="achievement-badge-icon" aria-hidden="true"><span>' + escapeHtml(row.item.badge ? row.item.badge.slice(0, 1) : "章") + '</span></div>' +
        '<span>' + escapeHtml(row.item.category) + '</span><strong>' + escapeHtml(row.item.title) + '</strong>' +
        '<p>' + escapeHtml(row.progress.label) + ' ' + formatNumber(row.progress.current) + '/' + formatNumber(row.progress.target) + '</p>' +
        '<em>' + escapeHtml(row.claimed ? "已领取" : row.progress.done ? "可领取" : "进行中") + '</em>' +
      '</article>';
    }
    list += '</div></section>';
    return list;
  }

  // 商店渲染与领取逻辑已独立到 scope.shopView，数据来自 scope.shopConfig。
  // 本模块的商店分支仅做委托，panelState.shop / panelTabs.shop 仍保留供 tab 路由使用。
  // 本模块的商店分支仅做委托，panelState.shop / panelTabs.shop 仍保留供 tab 路由使用。

  function renderMailPanel() {
    var cfg = getConfig();
    var mails = cfg.MAIL_CONTENT || [];
    var focus = mails[0] || {};
    var tabs = ["全部", "公告", "补给", "活动", "维护"];
    var activeTab = "全部";
    var listHtml = "";
    for (var i = 0; i < mails.length; i++) {
      var m = mails[i];
      var isFocus = i === 0;
      listHtml += '<article class="mail-list-item ' + (isFocus ? "is-focus" : "") + '" data-mail-index="' + i + '">' +
        '<span class="mail-item-tag">' + escapeHtml(m.type || "系统") + '</span>' +
        '<strong>' + escapeHtml(m.title || "无标题") + '</strong>' +
        '<p>' + escapeHtml(m.text || "") + '</p>' +
        '<em>' + escapeHtml(m.time || "") + '</em>' +
        (m.reward ? '<i class="mail-has-attach" aria-label="有附件"></i>' : '') +
      '</article>';
    }
    return '<section class="mail-panel">' +
      '<nav class="mail-sidebar">' +
        '<div class="mail-tabs">' +
          (function () {
            var h = "";
            for (var t = 0; t < tabs.length; t++) {
              h += '<button type="button" class="' + (tabs[t] === activeTab ? "active" : "") + '" data-mail-tab="' + escapeAttr(tabs[t]) + '">' + escapeHtml(tabs[t]) + '</button>';
            }
            return h;
          })() +
        '</div>' +
        '<div class="mail-list" data-mail-list>' + listHtml + '</div>' +
        '<p class="mail-footer-note">邮件附件暂不发放真实奖励。</p>' +
      '</nav>' +
      '<main class="mail-main">' +
        '<section class="mail-content">' +
          '<header class="mail-content-header">' +
            '<span class="mail-content-tag">' + escapeHtml(focus.type || "系统") + '</span>' +
            '<strong>' + escapeHtml(focus.title || "无标题") + '</strong>' +
            '<time>' + escapeHtml(focus.time || "") + '</time>' +
          '</header>' +
          '<article class="mail-body">' +
            '<p>' + escapeHtml(focus.text || "暂无内容。") + '</p>' +
          '</article>' +
        '</section>' +
        '<section class="mail-rewards">' +
          '<span class="mail-rewards-label">附件奖励</span>' +
          '<div class="mail-rewards-list">' +
            (focus.reward ? '<div class="mail-reward-item"><em>' + escapeHtml(focus.reward) + '</em><button type="button" disabled>' + escapeHtml(focus.status || "领取") + '</button></div>' : '<p class="mail-no-reward">本邮件无附件</p>') +
          '</div>' +
        '</section>' +
      '</main>' +
    '</section>';
  }

  function shanghaiDateKey() {
    try {
      var parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
      var values = {};
      parts.forEach(function collect(part) { values[part.type] = part.value; });
      return values.year + "-" + values.month + "-" + values.day;
    } catch (error) {
      return new Date().toISOString().slice(0, 10);
    }
  }

  function renderSigninPanel(profile) {
    var cfg = getConfig();
    var signin = cfg.SIGNIN_CONTENT || [];
    var record = profile && profile.signIn && typeof profile.signIn === "object" ? profile.signIn : {};
    var claimedToday = record.lastClaimDate === shanghaiDateKey();
    var previousDay = Math.max(0, Math.min(7, Math.floor(Number(record.day) || 0)));
    var todayDay = claimedToday ? Math.max(1, previousDay) : (previousDay % 7) + 1;
    var finalDay = signin.length > 0 ? signin[signin.length - 1] : null;
    var uiState = scope.signinUiState || {};
    var daysHtml = "";
    for (var i = 0; i < signin.length; i++) {
      var d = signin[i];
      var isToday = Number(d.day) === todayDay;
      var isFinal = i === signin.length - 1;
      var isClaimed = isToday && claimedToday;
      var cls = "signin-day" + (isToday ? " is-today" : "") + (isFinal ? " is-final" : "") + (isClaimed ? " is-claimed" : "");
      var claimBtn = (isToday && !isClaimed) ? '<button type="button" class="signin-claim-btn" data-signin-claim="' + escapeAttr(d.day || (i + 1)) + '"' + (uiState.busy ? " disabled" : "") + '>' + (uiState.busy ? "领取中…" : "领取") + "</button>" : "";
      var status = isClaimed ? "已领取" : isToday ? "今日" : isFinal ? "大奖" : "待解锁";
      daysHtml += '<article class="' + cls + '" data-signin-day="' + escapeAttr(d.day || (i + 1)) + '">' +
        '<span class="signin-day-badge">DAY ' + (d.day || (i + 1)) + '</span>' +
        '<div class="signin-day-body">' +
          '<strong class="signin-day-title">' + escapeHtml(d.title || "奖励") + '</strong>' +
          '<p class="signin-day-reward">' + escapeHtml(d.reward || "") + '</p>' +
        '</div>' +
        '<em class="signin-day-status">' + escapeHtml(status) + '</em>' +
        claimBtn +
      '</article>';
    }
    return '<section class="signin-panel">' +
      '<header class="signin-header">' +
        '<div><span>7-DAY ROUTE</span><strong>新兵七日航线</strong></div>' +
        '<p>每日签到由云端校验并立即写入存档；第 7 日领取后开启下一轮。</p>' +
      '</header>' +
      '<div class="signin-cycle">' +
        '<div class="signin-days-grid">' + daysHtml + '</div>' +
      '</div>' +
      '<footer class="signin-footer">' +
        '<div class="signin-summary">' +
          '<span>签到周期 <b>7 日</b></span>' +
          '<span>今日 <b>DAY ' + todayDay + '</b></span>' +
          '<span>大奖 <b>DAY ' + (finalDay ? finalDay.day : 7) + '</b></span>' +
        '</div>' +
        (uiState.message ? '<p class="signin-feedback' + (uiState.isError ? " is-error" : "") + '">' + escapeHtml(uiState.message) + "</p>" : "") +
      '</footer>' +
    '</section>';
  }

  function renderSettingPanel(audioSettings) {
    audioSettings = audioSettings || {};
    var musicVolume = Math.round(Number(audioSettings.musicVolume == null ? 0.32 : audioSettings.musicVolume) * 100);
    var sfxVolume = Math.round(Number(audioSettings.sfxVolume == null ? 0.42 : audioSettings.sfxVolume) * 100);
    var musicOn = !audioSettings.musicMuted;
    var sfxOn = !audioSettings.sfxMuted;
    var controls =
      '<section class="settings-row"><div class="settings-label"><strong>音乐开关</strong><p>大厅音乐 BGM 播放。</p></div><button type="button" class="' + (musicOn ? "active" : "") + '" data-audio-toggle="music">' + (musicOn ? "音乐开" : "音乐关") + '</button></section>' +
      '<section class="settings-row"><div class="settings-label"><strong>音乐音量</strong><p>当前 ' + musicVolume + '%，拖动后即时生效。</p></div><input type="range" min="0" max="100" value="' + musicVolume + '" data-audio-volume="music" class="settings-slider" /></section>' +
      '<section class="settings-row"><div class="settings-label"><strong>战斗音效</strong><p>控制按钮、射击、拾取、技能和结算音效。</p></div><button type="button" class="' + (sfxOn ? "active" : "") + '" data-audio-toggle="sfx">' + (sfxOn ? "音效开" : "音效关") + '</button></section>' +
      '<section class="settings-row"><div class="settings-label"><strong>音效音量</strong><p>当前 ' + sfxVolume + '%，影响所有 SFX。</p></div><input type="range" min="0" max="100" value="' + sfxVolume + '" data-audio-volume="sfx" class="settings-slider" /></section>' +
      '<section class="settings-row"><div class="settings-label"><strong>BGM 试听</strong><p>重启大厅音乐，用于确认音量和循环。</p></div><button type="button" data-setting-action="restart-bgm" class="settings-action-btn">试听 / 重启</button></section>' +
      '<section class="settings-row settings-redeem-row"><div class="settings-label"><strong>兑换码</strong><p>兑换奖励会保存到当前玩家的云存档，每个兑换码只能使用一次。</p></div><form class="settings-redeem-form" data-redeem-form><input type="text" maxlength="24" autocomplete="off" autocapitalize="characters" placeholder="请输入兑换码" aria-label="兑换码" data-redeem-code /><button type="submit">兑换</button><output data-redeem-status aria-live="polite"></output></form></section>' +
      '<section class="settings-row muted-row"><div class="settings-label"><strong>画面表现</strong><p>星港玻璃 UI、扫描线、能量边框已启用；性能档位未开放。</p></div><button type="button" disabled class="settings-action-btn">展示态</button></section>';
    return '<section class="settings-panel">' +
      '<header class="settings-header">' +
        '<div><span>AUDIO CONFIG</span><strong>系统设置</strong></div>' +
        '<p>音乐和音效设置会立即生效，并保存到 localStorage。</p>' +
      '</header>' +
      '<div class="settings-body">' +
        '<aside class="settings-rail">' +
          '<button type="button" class="active" disabled>音频</button>' +
          '<button type="button" disabled>画面</button>' +
          '<button type="button" disabled>性能</button>' +
          '<p>音乐 / 音效为真实可操作。</p>' +
        '</aside>' +
        '<main class="settings-main">' +
          '<section class="settings-status-bar">' +
            '<article><em>音乐</em><strong>' + (musicOn ? "开启" : "关闭") + '</strong></article>' +
            '<article><em>音效</em><strong>' + (sfxOn ? "开启" : "关闭") + '</strong></article>' +
            '<article><em>保存</em><strong>本地</strong></article>' +
          '</section>' +
          '<div class="settings-controls">' + controls + '</div>' +
        '</main>' +
        '<aside class="settings-dock">' +
          '<section class="settings-dock-reward"><span>AUDIO</span><strong>' + (musicOn ? "MUSIC ON" : "MUSIC OFF") + '</strong><p>BGM ' + musicVolume + '% / SFX ' + sfxVolume + '%</p><button type="button" disabled' + (musicOn || sfxOn ? ' class="is-ready"' : '') + '>SAVED</button></section>' +
          '<section class="settings-dock-overview"><span>SYSTEM</span>' +
            '<article><em>MUSIC</em><strong>' + (musicOn ? "ON" : "OFF") + '</strong></article>' +
            '<article><em>SFX</em><strong>' + (sfxOn ? "ON" : "OFF") + '</strong></article>' +
            '<article><em>SAVE</em><strong>LOCAL</strong></article>' +
          '</section>' +
        '</aside>' +
      '</div>' +
    '</section>';
  }

  function setPanel(dom, kicker, title, body, className, html) {
    dom.featurePanelKicker.textContent = kicker;
    dom.featurePanelTitle.classList.remove("event-mode-title");
    dom.featurePanelTitle.textContent = title;
    dom.featurePanelBody.textContent = body;
    dom.featurePanelSlots.className = className;
    dom.featurePanelSlots.innerHTML = html;
  }

  function stopChatPolling(dom) {
    if (scope.socialFeaturePanelsView) scope.socialFeaturePanelsView.stopChatPolling(dom);
  }

  function renderPanel(key, dom, options) {
    options = options || {};
    if (key !== "chat") stopChatPolling(dom);
    var profile = options.profile || {};
    var levels = options.levels || [];
    var combatPower = clampNumber(options.combatPower, 0, 9999999);
    var audioSettings = options.audioSettings || {};
    if (key === "mail") return setAndReport(dom, "MAIL", "邮件", "星港邮件中继，展示公告、补给、活动和维护信息。", "terminal-panel-content", renderMailPanel());
    if (key === "signin") return setAndReport(dom, "SIGN IN", "签到", "每日奖励由云端校验并写入存档。", "terminal-panel-content", renderSigninPanel(profile));
    if (key === "setting") return setAndReport(dom, "SETTING", "设置", "音乐和音效设置会立即生效并保存到本地。", "terminal-panel-content", renderSettingPanel(audioSettings));
    if (key === "event" && scope.eventModeHubView) return scope.eventModeHubView.renderPanel(dom, Object.assign({}, options, { profile: profile }));
    if (key === "achievement") return setAndReport(dom, "", "成就", countReady((getConfig().ACHIEVEMENT_CONTENT || []).map(function (item) { var current = getAchievementMetric(item, profile, levels); return { progress: { done: current >= item.target }, claimed: (profile.claimedAchievements || []).indexOf(item.id) >= 0 }; })) + " 项成就奖励可领取", "terminal-panel-content feature-panel-room-content", renderAchievementPanel(profile, levels));
    if (key === "task" && scope.taskView && scope.taskView.renderPanel) return scope.taskView.renderPanel(dom, options);
    if (key === "shop") {
      if (scope.shopView && scope.shopView.setShopTab && panelState.shop) scope.shopView.setShopTab(panelState.shop);
      return setAndReport(dom, "", "商店", "购买战备物资或进行稀有物资兑换", "terminal-panel-content feature-panel-room-content", scope.shopView ? scope.shopView.renderShopPanel(profile, scope.assets) : "");
    }
    if (key === "friend" && scope.socialFeaturePanelsView) return setAndReport(dom, "", "好友", "连接星港好友网络...", "terminal-panel-content feature-panel-room-content", scope.socialFeaturePanelsView.renderPanel(key, options));
    if (key === "ranking" && scope.socialFeaturePanelsView) return setAndReport(dom, "", "排行榜", "星港先锋赛季 · 实时榜单", "terminal-panel-content feature-panel-room-content", scope.socialFeaturePanelsView.renderPanel(key, options));
    if (key === "chat" && scope.socialFeaturePanelsView) return setAndReport(dom, "CHAT", "世界频道", "星港通讯已上线，与指挥官们实时交流。", "terminal-panel-content", scope.socialFeaturePanelsView.renderPanel(key, options));
    return false;
  }

  function handleEvent(event, dom, options) {
    if (scope.taskView && scope.taskView.handleEvent && scope.taskView.handleEvent(event, dom, options || {})) return true;
    if (scope.eventModeHubView && scope.eventModeHubView.handleEvent && scope.eventModeHubView.handleEvent(event, dom, options || {})) return true;
    if (scope.socialFeaturePanelsView && scope.socialFeaturePanelsView.handleEvent(event, dom, options || {})) return true;
    var tab = event.target && event.target.closest ? event.target.closest("[data-feature-tab]") : null;
    if (!tab || !tab.dataset) return false;
    var panel = tab.dataset.featurePanel || "";
    var index = Math.floor(Number(tab.dataset.featureTabIndex));
    var value = panelTabs[panel] && panelTabs[panel][index] || tab.dataset.featureTab || "";
    if (!panel || !value || !Object.prototype.hasOwnProperty.call(panelState, panel)) return false;
    if (isActiveTab(panel, value)) return true;
    panelState[panel] = value;
    return renderPanel(panel, dom, options || {});
  }

  function setAndReport(dom, kicker, title, body, className, html) {
    setPanel(dom, kicker, title, body, className, html);
    return true;
  }

  function applyRewards(profile, rewards) {
    profile.resources = profile.resources || {};
    profile.resources.inventory = profile.resources.inventory || {};
    for (var i = 0; i < (rewards || []).length; i++) {
      var reward = rewards[i];
      var amount = Math.max(0, Math.floor(Number(reward.amount) || 0));
      if (reward.type === "gold") {
        profile.resources.gold = Math.max(0, Math.floor(Number(profile.resources.gold || profile.coins || 0) + amount));
        profile.coins = profile.resources.gold;
      } else if (reward.type === "diamonds") {
        profile.resources.diamonds = Math.max(0, Math.floor(Number(profile.resources.diamonds || 0) + amount));
      } else if (reward.type === "energy") {
        var maxEnergy = Math.max(0, Math.floor(Number(profile.resources.maxEnergy) || 0));
        profile.resources.energy = Math.min(maxEnergy || Infinity, Math.max(0, Math.floor(Number(profile.resources.energy || 0) + amount)));
      } else if (reward.type === "item") {
        var id = reward.itemId || "item";
        profile.resources.inventory[id] = Math.max(0, Math.floor(Number(profile.resources.inventory[id]) || 0) + amount);
      }
    }
  }

  function claimAchievement(profile, achievementId, options) {
    options = options || {};
    var items = getConfig().ACHIEVEMENT_CONTENT || [];
    var item = items.filter(function (entry) { return entry.id === achievementId; })[0];
    if (!item) return { ok: false, reason: "ACHIEVEMENT_NOT_FOUND" };
    profile.claimedAchievements = Array.isArray(profile.claimedAchievements) ? profile.claimedAchievements : [];
    if (profile.claimedAchievements.indexOf(item.id) >= 0) return { ok: false, reason: "ACHIEVEMENT_CLAIMED" };
    if (getAchievementMetric(item, profile, options.levels || []) < item.target) return { ok: false, reason: "ACHIEVEMENT_LOCKED" };
    tryCloudClaim(profile, "claimAchievement", achievementId, options);
    applyRewards(profile, item.rewards || []);
    profile.claimedAchievements.push(item.id);
    return { ok: true, rewards: item.rewards || [] };
  }

  function claimDailyShopItem(profile, itemId) {
    if (scope.shopView && scope.shopView.claimDailyShopItem) return scope.shopView.claimDailyShopItem(profile, itemId);
    return { ok: false, reason: "SHOP_VIEW_UNAVAILABLE" };
  }

  // Fire-and-forget cloud claim helper
  function tryCloudClaim(profile, method, param, options) {
    options = options || {};
    var gateway = options.gateway;
    if (!gateway || typeof gateway[method] !== "function") return;
    try {
      var result = gateway[method](param);
      if (result && typeof result.then === "function") {
        result.then(function(res) {
          if (res && res.profile) { Object.assign(profile, res.profile); }
        }).catch(function() { /* silent */ });
      }
    } catch (e) { /* silent */ }
  }

  scope.mainFeaturePanelPrimitives = {
    renderTerminalShell: renderTerminalShell,
    renderRail: renderRail,
    renderStatusSummary: renderStatusSummary,
    renderDock: renderDock
  };

  scope.mainFeaturePanelsView = {
    renderPanel: renderPanel,
    handleEvent: handleEvent,
    handleSocialClick: function handleSocialClick(event, dom, options) {
      return scope.socialFeaturePanelsView && scope.socialFeaturePanelsView.handleClick(event, dom, options || {});
    },
    claimAchievement: claimAchievement,
    claimDailyShopItem: claimDailyShopItem,
    getLobbyClaimableState: getLobbyClaimableState,
    stopChatPolling: stopChatPolling
  };

})(typeof globalThis !== "undefined" ? globalThis : this);
