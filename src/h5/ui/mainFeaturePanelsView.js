(function registerMainFeaturePanelsView(root) {
  "use strict";

  var scope = root.RXGame || (root.RXGame = {});
  var content = scope.featurePanelContent || {};
  var panelState = {
    task: "每日",
    achievement: "通关",
    shop: "资源"
  };
  var panelTabs = {
    task: ["每日", "成长", "强化", "作战", "收集"],
    achievement: ["通关", "技巧", "养成", "收集", "荣誉"],
    shop: ["每日", "资源", "强化", "战机/抽取"]
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
    var fighter = (profile && profile.fighterUpgrades) || {};
    return Math.max(0,
      Math.floor(Number(fighter.attack) || 1) +
      Math.floor(Number(fighter.hp) || 1) +
      Math.floor(Number(fighter.armorPenetration) || 1)
    );
  }

  function getTaskProgress(task, profile, levels) {
    var condition = task.condition || {};
    var owned = (profile && profile.owned) || {};
    var fighter = (profile && profile.fighterUpgrades) || {};
    var current = 0;
    var target = Math.max(1, Number(condition.target) || 1);
    if (condition.type === "login") current = 1;
    if (condition.type === "clear_count") current = getClearCount(profile);
    if (condition.type === "clear_stage") current = isStageCleared(condition.stageId, profile, levels) ? 1 : 0;
    if (condition.type === "clear_chapter") {
      var chapters = getProgressRoot(profile).clearedChapterIds || [];
      current = chapters.indexOf(condition.chapterIndex) >= 0 ? 1 : 0;
    }
    if (condition.type === "fighter_upgrade") current = Math.max(1, Math.floor(Number(fighter[condition.stat]) || 1));
    if (condition.type === "fighter_upgrade_total") current = getUpgradeTotal(profile);
    if (condition.type === "fighter_upgrade_any") current = Math.max(0, getUpgradeTotal(profile) - 3);
    if (condition.type === "perfect_count") current = getPerfectCount(profile);
    if (condition.type === "no_damage_boss_count") current = Math.max(0, Math.floor(Number(getProgressRoot(profile).noDamageBossClearCount) || 0));
    if (condition.type === "earned_gold") current = Math.max(0, Math.floor(Number(profile && profile.localEarned && profile.localEarned.gold) || 0));
    if (condition.type === "owned_pilots") current = Array.isArray(owned.pilots) ? owned.pilots.length : 0;
    if (condition.type === "owned_ships") current = Array.isArray(owned.ships) ? owned.ships.length : 0;
    if (condition.type === "selected_ship_rank") current = hasOwnedSRank(profile) ? 1 : 0;
    return { current: Math.min(current, target), rawCurrent: current, target: target, label: condition.label || task.title, done: current >= target };
  }

  function getAchievementMetric(item, profile, levels) {
    var metric = item.metric || "";
    var fighter = (profile && profile.fighterUpgrades) || {};
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

  function renderListRow(data) {
    var progress = data.progress;
    var statusClass = data.statusClass || (progress && progress.done ? "is-ready" : "");
    var button = data.buttonHtml || '<em class="' + statusClass + '">' + escapeHtml(data.status || "") + '</em>';
    var html = '<article class="terminal-list-row">' +
      '<span class="terminal-row-icon" aria-hidden="true"></span>' +
      '<div><span class="terminal-row-tag">' + escapeHtml(data.tag || "") + '</span><strong>' + escapeHtml(data.title || "") + '</strong><p>' + escapeHtml(data.desc || "") + '</p>';
    if (progress) html += '<small>' + escapeHtml(progress.label) + ' / ' + formatNumber(progress.current) + '/' + formatNumber(progress.target) + '</small>' + renderProgressBar(progress.current, progress.target);
    return html + '</div><span class="terminal-row-reward">' + escapeHtml(data.reward || "") + '</span>' + button + '</article>';
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

  function getDailyClaimIds(profile) {
    var daily = profile && profile.claimedDailyTasks;
    var today = localDateKey();
    if (Array.isArray(daily)) return daily;
    if (daily && daily.date === today && Array.isArray(daily.ids)) return daily.ids;
    return [];
  }

  function isTaskClaimed(task, profile) {
    if (!task) return false;
    if (task.bucket === "daily") return getDailyClaimIds(profile).indexOf(task.id) >= 0;
    return Array.isArray(profile && profile.claimedTasks) && profile.claimedTasks.indexOf(task.id) >= 0;
  }

  function getTaskStatus(progress, claimed) {
    if (claimed) return "已领取";
    return progress.done ? "可领取" : "进行中";
  }

  function decorateTasks(items, profile, levels) {
    var rows = (items || []).map(function (item) {
      var progress = getTaskProgress(item, profile, levels);
      var claimed = isTaskClaimed(item, profile);
      return { item: item, progress: progress, claimed: claimed };
    });
    rows.sort(function (a, b) {
      var aw = a.claimed ? 0 : a.progress.done ? 2 : 1;
      var bw = b.claimed ? 0 : b.progress.done ? 2 : 1;
      return bw - aw;
    });
    return rows;
  }

  function countDone(rows) {
    return rows.reduce(function (sum, row) { return sum + (row.progress.done ? 1 : 0); }, 0);
  }

  function countReady(rows) {
    return rows.reduce(function (sum, row) { return sum + (row.progress.done && !row.claimed ? 1 : 0); }, 0);
  }

  function getActivity(rows) {
    return rows.reduce(function (sum, row) {
      return sum + ((row.progress.done || row.claimed) ? Math.max(0, Number(row.item.activity) || 0) : 0);
    }, 0);
  }

  function renderTaskButton(row) {
    if (row.claimed) return '<em class="is-claimed">已领取</em>';
    if (row.progress.done) return '<button type="button" class="terminal-row-button is-ready" data-task-claim="' + escapeAttr(row.item.id) + '">领取</button>';
    return '<button type="button" class="terminal-row-button" disabled>前往</button>';
  }

  function renderTaskRows(title, rows) {
    var html = '<section class="terminal-task-section"><h3>' + escapeHtml(title) + '</h3><div class="terminal-list">';
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      html += renderListRow({
        tag: row.item.category,
        title: row.item.title,
        desc: row.item.desc,
        progress: row.progress,
        status: getTaskStatus(row.progress, row.claimed),
        statusClass: row.claimed ? "is-claimed" : row.progress.done ? "is-ready" : "",
        reward: renderRewardList(row.item.rewards),
        buttonHtml: renderTaskButton(row)
      });
    }
    return html + '</div></section>';
  }

  function getDailyActivityClaims(profile) {
    var state = profile && profile.claimedDailyActivityRewards;
    return state && state.date === localDateKey() && Array.isArray(state.points) ? state.points : [];
  }

  function isActivityRewardClaimed(profile, points) {
    return getDailyActivityClaims(profile).indexOf(Number(points)) >= 0;
  }

  function renderV3Resources(profile, extra) {
    var resources = profile && profile.resources || {};
    var gold = resources.gold != null ? resources.gold : profile && profile.coins || 0;
    var energy = resources.energy || 0;
    var maxEnergy = resources.maxEnergy || 0;
    return '<div class="fp-v3-resources">' +
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

  function renderChipList(value) {
    if (!value) return "";
    return String(value).split("/").map(function (part) {
      return '<span>' + escapeHtml(part.trim()) + '</span>';
    }).join("");
  }

  function renderTaskAction(row) {
    if (row.claimed) return '<em class="board-state is-claimed">已领取</em>';
    if (row.progress.done) return '<button type="button" class="board-action is-ready" data-task-claim="' + escapeAttr(row.item.id) + '">领取</button>';
    return '<button type="button" class="board-action" disabled>前往</button>';
  }

  function renderTaskBoardRows(rows) {
    if (!rows.length) return '<article class="board-empty">当前分类暂无任务。</article>';
    var html = '<div class="task-list board-list">';
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      var stateClass = row.claimed ? "is-claimed" : row.progress.done ? "is-ready" : "is-running";
      html += '<article class="task-row ' + stateClass + '">' +
        '<span class="task-row-mark" aria-hidden="true"></span>' +
        '<div class="task-row-copy"><span>' + escapeHtml(row.item.category) + '</span><strong>' + escapeHtml(row.item.title) + '</strong><p>' + escapeHtml(row.item.desc) + '</p></div>' +
        '<div class="task-row-progress"><b>' + escapeHtml(row.progress.label) + '</b><em>' + formatNumber(row.progress.current) + '/' + formatNumber(row.progress.target) + '</em>' + renderProgressBar(row.progress.current, row.progress.target) + '</div>' +
        '<div class="board-reward">' + renderChipList(renderRewardList(row.item.rewards)) + '</div>' +
        renderTaskAction(row) +
      '</article>';
    }
    return html + '</div>';
  }

  function renderTaskActivityBoard(activity, profile) {
    var cfg = getConfig();
    var rewards = cfg.TASK_ACTIVITY_REWARDS || [];
    var claimable = null;
    for (var c = 0; c < rewards.length; c++) {
      if (activity >= rewards[c].points && !isActivityRewardClaimed(profile, rewards[c].points)) claimable = rewards[c];
    }
    var html = '<section class="task-activity-card">' +
      '<div class="task-activity-head"><span>今日活跃</span><strong>' + Math.min(100, activity) + '<small>/100</small></strong><p>' + (claimable ? '阶段补给已经就绪' : '完成每日任务提升活跃') + '</p></div>' +
      '<div class="task-activity-route"><div class="task-activity-bar"><span style="width:' + progressPercent(activity, 100) + '%"></span></div>' +
      '<div class="task-reward-nodes">';
    for (var i = 0; i < rewards.length; i++) {
      var row = rewards[i];
      var claimed = isActivityRewardClaimed(profile, row.points);
      html += '<article class="' + (activity >= row.points ? "active" : "") + (claimed ? ' claimed' : '') + '"><b>' + row.points + '</b><span>' + (claimed ? '✓' : row.points === 100 ? '⬡' : '◇') + '</span><em>' + escapeHtml(renderRewardList(row.rewards)) + '</em></article>';
    }
    html += '</div></div>';
    if (claimable) html += '<button type="button" class="board-action is-ready activity-claim" data-activity-claim="' + claimable.points + '">领取</button>';
    else html += '<em class="board-state activity-state">' + (activity >= 100 ? '今日完成' : '继续完成') + '</em>';
    return html + '</section>';
  }

  function renderActivityRewards(activity) {
    var cfg = getConfig();
    var rewards = cfg.TASK_ACTIVITY_REWARDS || [];
    var html = '<section class="terminal-activity-track"><span>阶段奖励</span><div>';
    for (var i = 0; i < rewards.length; i++) {
      var row = rewards[i];
      html += '<article class="' + (activity >= row.points ? "active" : "") + '">' +
        '<b>' + row.points + '</b><em>' + escapeHtml(renderRewardList(row.rewards)) + '</em></article>';
    }
    return html + '</div></section>';
  }

  function renderTaskPanel(profile, levels) {
    var cfg = getConfig();
    var tabs = panelTabs.task;
    var activeTab = ensureActiveTab("task", tabs, "每日");
    var dailyRows = decorateTasks(cfg.DAILY_TASKS || [], profile, levels);
    var growthRows = decorateTasks(cfg.GROWTH_TASKS || [], profile, levels);
    var allRows = dailyRows.concat(growthRows);
    var activity = getActivity(dailyRows);
    var rows = activeTab === "每日"
      ? dailyRows
      : growthRows.filter(function (row) { return row.item.category === activeTab; });
    if (activeTab === "成长") rows = growthRows.filter(function (row) { return row.item.category === "成长"; });
    var list = '<section class="task-board board-page fp-v3">' +
      renderV3Resources(profile) +
      renderFeatureTabs("task", tabs, activeTab) +
      renderTaskActivityBoard(activity, profile) +
      '<section class="board-section-head"><div><strong>' + escapeHtml(activeTab) + '任务</strong><span>优先显示可领取与接近完成的目标</span></div><p>' + countReady(allRows) + ' 项可领取</p></section>' +
      renderTaskBoardRows(rows) +
      '</section>';
    return list;
  }

  function renderAchievementPanel(profile, levels) {
    var cfg = getConfig();
    var tabs = panelTabs.achievement;
    var activeTab = ensureActiveTab("achievement", tabs, "通关");
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
    var filtered = activeTab === "通关" ? rows.slice(0, 8) : rows.filter(function (row) { return row.item.category === activeTab; });
    var focus = filtered[0] || rows[0] || {};
    var settlement = scope.assets && scope.assets.SETTLEMENT_ICON_ASSETS || {};
    var focusState = focus.claimed ? "已领取" : focus.progress && focus.progress.done ? "可领取" : "进行中";
    var list = '<section class="achievement-board board-page fp-v3">' +
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

  function getShopImage(item) {
    var assets = scope.assets && scope.assets.SHOP_ITEM_ASSETS || {};
    return assets[item.image] || "";
  }

  function renderShopCard(item) {
    return '<article class="shop-item-card ' + (item.id === "energy_large" ? "is-featured" : "") + '">' +
      (item.id === "energy_large" ? '<span class="shop-recommend">推荐</span>' : '') +
      '<div class="shop-item-art">' + (getShopImage(item) ? '<img src="' + escapeAttr(getShopImage(item)) + '" alt="">' : '<span></span>') + '</div>' +
      '<div class="shop-item-copy"><span>' + escapeHtml(item.category) + '</span><strong>' + escapeHtml(item.title) + '</strong><p>' + escapeHtml(item.reward) + '</p></div>' +
      '<div class="shop-item-price"><em>' + escapeHtml(item.price) + '</em></div>' +
      '<button type="button" data-shop-buy="' + escapeAttr(item.id) + '">' + (item.id === "daily_free_supply" ? "领取" : "购买") + '</button>' +
    '</article>';
  }

  function renderShopPanel(profile) {
    var cfg = getConfig();
    var tabs = panelTabs.shop;
    var activeTab = ensureActiveTab("shop", tabs, "每日");
    var items = cfg.SHOP_CONTENT || [];
    var resources = (profile && profile.resources) || {};
    var dailyShop = profile && profile.claimedDailyShop || {};
    var freeClaimed = dailyShop.date === localDateKey() && Array.isArray(dailyShop.ids) && dailyShop.ids.indexOf("daily_free_supply") >= 0;
    var freeItem = items.filter(function (item) { return item.id === "daily_free_supply"; })[0] || {};
    var filtered = items.filter(function (item) {
      if (item.id === "daily_free_supply") return false;
      return item.category === activeTab;
    });
    if (activeTab === "每日") filtered = [];
    if (activeTab === "资源") filtered = items.filter(function (item) { return item.id !== "daily_free_supply"; }).slice(0, 8);
    var grid = '<section class="shop-board board-page fp-v3">' +
      renderV3Resources(profile, '<span class="item-total">商品 <b>' + items.length + '</b></span>') +
      renderFeatureTabs("shop", tabs, activeTab) +
      '<article class="shop-free-strip">' +
        '<div class="shop-free-art">' + (getShopImage(freeItem) ? '<img src="' + escapeAttr(getShopImage(freeItem)) + '" alt="">' : '<span></span>') + '</div>' +
        '<div><span>每日限定 · 1/1</span><strong>' + escapeHtml(freeItem.title || "每日补给") + '</strong><p>' + escapeHtml(freeItem.desc || "每日基础补给。") + '</p></div>' +
        '<div class="shop-free-reward"><span>补给内容</span><strong>' + escapeHtml(freeItem.reward || "") + '</strong></div>' +
        '<button type="button" data-shop-buy="daily_free_supply"' + (freeClaimed ? ' disabled' : '') + '>' + (freeClaimed ? '已领取' : '领取') + '</button>' +
      '</article><section class="board-section-head"><div><strong>' + escapeHtml(activeTab === "每日" ? "每日补给" : activeTab + "补给") + '</strong><span>当前显示：' + escapeHtml(activeTab) + '</span></div><p>' + filtered.length + ' 件商品</p></section>' +
      '<div class="shop-item-grid">';
    for (var i = 0; i < filtered.length; i++) grid += renderShopCard(filtered[i]);
    if (!filtered.length && activeTab !== "每日") grid += '<article class="board-empty">当前分类暂无商品。</article>';
    grid += '</div></section>';
    return grid;
  }

  function renderMailPanel() {
    var cfg = getConfig();
    var mails = cfg.MAIL_CONTENT || [];
    var focus = mails[0] || {};
    var list = '<div class="terminal-list">';
    for (var i = 1; i < mails.length; i++) {
      list += renderListRow({ tag: mails[i].type, title: mails[i].title, desc: mails[i].text + " / " + mails[i].time, status: mails[i].status, reward: mails[i].reward });
    }
    list += '</div>';
    return renderTerminalShell({
      key: "mail",
      kicker: "MAIL RELAY",
      title: "星港邮件",
      desc: "系统公告、补给通知、活动预告和维护说明集中展示。",
      rail: renderRail(["公告", "补给", "活动", "维护"], focus.type, "邮件附件暂不发放真实奖励。"),
      summary: renderStatusSummary([{ label: "邮件总数", value: mails.length }, { label: "附件邮件", value: "2" }, { label: "状态", value: "展示" }]),
      focus: renderActionCard({ tag: focus.type, title: focus.title, desc: focus.text, status: focus.status, reward: focus.time + " / " + focus.reward, action: "查看", disabled: true }),
      list: list,
      dock: renderDock({ kicker: "MAIL", reward: focus.reward, note: focus.time, action: focus.status, overviewTitle: "INBOX", stats: [{ label: "TOTAL", value: mails.length }, { label: "ATTACH", value: "2" }, { label: "STATE", value: focus.status }] })
    });
  }

  function renderSigninPanel() {
    var cfg = getConfig();
    var signin = cfg.SIGNIN_CONTENT || [];
    var focus = signin[0] || {};
    var list = '<div class="terminal-signin-grid">';
    for (var i = 0; i < signin.length; i++) {
      list += '<article class="' + (i === 0 ? "is-today" : "") + '"><span>DAY ' + signin[i].day + '</span><strong>' + escapeHtml(signin[i].title) + '</strong><p>' + escapeHtml(signin[i].reward) + '</p><em>' + escapeHtml(signin[i].status) + '</em></article>';
    }
    list += '</div>';
    return renderTerminalShell({
      key: "signin",
      kicker: "7-DAY ROUTE",
      title: "新兵七日航线",
      desc: "签到前 7 日奖励展示，正式领取逻辑可复用任务奖励发放。",
      rail: renderRail(["今日", "明日", "大奖"], "今日", "当前为展示态。"),
      summary: renderStatusSummary([{ label: "签到周期", value: "7 日" }, { label: "今日", value: "DAY " + focus.day }, { label: "大奖", value: "DAY 7" }]),
      focus: renderActionCard({ tag: "DAY " + focus.day, title: focus.title, desc: "今日航线整备奖励用于提示签到系统结构。", status: focus.status, reward: focus.reward, action: "查看", disabled: true }),
      list: list,
      dock: renderDock({ kicker: "SIGN", reward: focus.reward, note: "DAY " + focus.day, action: focus.status, overviewTitle: "ROUTE", stats: [{ label: "CYCLE", value: "7" }, { label: "TODAY", value: "DAY " + focus.day }, { label: "FINAL", value: "DAY 7" }] })
    });
  }

  function renderSettingPanel(audioSettings) {
    audioSettings = audioSettings || {};
    var musicVolume = Math.round(Number(audioSettings.musicVolume == null ? 0.32 : audioSettings.musicVolume) * 100);
    var sfxVolume = Math.round(Number(audioSettings.sfxVolume == null ? 0.42 : audioSettings.sfxVolume) * 100);
    var musicOn = !audioSettings.musicMuted;
    var sfxOn = !audioSettings.sfxMuted;
    var controls = '<div class="settings-console terminal-settings">' +
      '<section class="settings-control-row"><div><strong>大厅音乐</strong><p>控制星港大厅 BGM 播放。</p></div><button type="button" class="' + (musicOn ? "active" : "") + '" data-audio-toggle="music">' + (musicOn ? "音乐开" : "音乐关") + '</button></section>' +
      '<section class="settings-control-row"><div><strong>音乐音量</strong><p>当前 ' + musicVolume + '%，拖动后即时生效。</p></div><input type="range" min="0" max="100" value="' + musicVolume + '" data-audio-volume="music" /></section>' +
      '<section class="settings-control-row"><div><strong>战斗音效</strong><p>控制按钮、射击、拾取、技能和结算音效。</p></div><button type="button" class="' + (sfxOn ? "active" : "") + '" data-audio-toggle="sfx">' + (sfxOn ? "音效开" : "音效关") + '</button></section>' +
      '<section class="settings-control-row"><div><strong>音效音量</strong><p>当前 ' + sfxVolume + '%，影响所有 SFX。</p></div><input type="range" min="0" max="100" value="' + sfxVolume + '" data-audio-volume="sfx" /></section>' +
      '<section class="settings-control-row"><div><strong>BGM 试听</strong><p>重启大厅音乐，用于确认音量和循环。</p></div><button type="button" data-setting-action="restart-bgm">试听 / 重启</button></section>' +
      '<section class="settings-control-row settings-redeem-row"><div><strong>兑换码</strong><p>兑换奖励会保存到当前玩家的云存档，每个兑换码只能使用一次。</p></div><form class="settings-redeem-form" data-redeem-form><input type="text" maxlength="24" autocomplete="off" autocapitalize="characters" placeholder="请输入兑换码" aria-label="兑换码" data-redeem-code /><button type="submit">兑换</button><output data-redeem-status aria-live="polite"></output></form></section>' +
      '<section class="settings-control-row muted-row"><div><strong>画面表现</strong><p>星港玻璃 UI、扫描线、能量边框已启用；性能档位未开放。</p></div><button type="button" disabled>展示态</button></section>' +
      '</div>';
    return renderTerminalShell({
      key: "setting",
      kicker: "AUDIO CONFIG",
      title: "系统设置",
      desc: "音乐和音效设置会立即生效，并保存到 localStorage。",
      rail: renderRail(["音频", "画面", "性能"], "音频", "音乐 / 音效为真实可操作。"),
      summary: renderStatusSummary([{ label: "音乐", value: musicOn ? "开启" : "关闭" }, { label: "音效", value: sfxOn ? "开启" : "关闭" }, { label: "保存", value: "本地" }]),
      list: controls,
      dock: renderDock({ kicker: "AUDIO", reward: musicOn ? "MUSIC ON" : "MUSIC OFF", note: "BGM " + musicVolume + "% / SFX " + sfxVolume + "%", action: "SAVED", ready: musicOn || sfxOn, overviewTitle: "SYSTEM", stats: [{ label: "MUSIC", value: musicOn ? "ON" : "OFF" }, { label: "SFX", value: sfxOn ? "ON" : "OFF" }, { label: "SAVE", value: "LOCAL" }] })
    });
  }

  function setPanel(dom, kicker, title, body, className, html) {
    dom.featurePanelKicker.textContent = kicker;
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
    if (key === "mail") return setAndReport(dom, "MAIL", "邮件", "星港邮件中继，展示公告、补给、活动和维护信息。", "terminal-panel-content mail-panel-content", renderMailPanel());
    if (key === "signin") return setAndReport(dom, "SIGN IN", "签到", "新兵七日航线奖励展示。", "terminal-panel-content signin-panel-content", renderSigninPanel());
    if (key === "setting") return setAndReport(dom, "SETTING", "设置", "音乐和音效设置会立即生效并保存到本地。", "terminal-panel-content setting-panel-content", renderSettingPanel(audioSettings));
    if (key === "task") return setAndReport(dom, "", "任务", "今日活跃正在累计", "terminal-panel-content task-panel-content feature-v3-content", renderTaskPanel(profile, levels));
    if (key === "event" && scope.endlessModePanelView) return setAndReport(dom, "", "无尽模式", "每 30 秒一个 BOSS 节点，只记录个人纪录", "terminal-panel-content event-panel-content feature-v3-content", scope.endlessModePanelView.render(profile, options));
    if (key === "achievement") return setAndReport(dom, "", "成就", countReady((getConfig().ACHIEVEMENT_CONTENT || []).map(function (item) { var current = getAchievementMetric(item, profile, levels); return { progress: { done: current >= item.target }, claimed: (profile.claimedAchievements || []).indexOf(item.id) >= 0 }; })) + " 项成就奖励可领取", "terminal-panel-content achievement-panel-content feature-v3-content", renderAchievementPanel(profile, levels));
    if (key === "shop") return setAndReport(dom, "", "商店", "每日补给已刷新", "terminal-panel-content shop-panel-content feature-v3-content", renderShopPanel(profile));
    if (key === "friend" && scope.socialFeaturePanelsView) return setAndReport(dom, "", "好友", "连接星港好友网络...", "terminal-panel-content friend-panel-content feature-v3-content", scope.socialFeaturePanelsView.renderPanel(key, options));
    if (key === "ranking" && scope.socialFeaturePanelsView) return setAndReport(dom, "", "排行榜", "星港先锋赛季 · 实时榜单", "terminal-panel-content ranking-panel-content feature-v3-content", scope.socialFeaturePanelsView.renderPanel(key, options));
    if (key === "chat" && scope.socialFeaturePanelsView) return setAndReport(dom, "CHAT", "世界频道", "星港通讯已上线，与指挥官们实时交流。", "terminal-panel-content chat-panel-content", scope.socialFeaturePanelsView.renderPanel(key, options));
    return false;
  }

  function handleEvent(event, dom, options) {
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

  function findTask(taskId) {
    var cfg = getConfig();
    var tasks = [].concat(cfg.DAILY_TASKS || [], cfg.GROWTH_TASKS || []);
    for (var i = 0; i < tasks.length; i++) {
      if (tasks[i].id === taskId) return tasks[i];
    }
    return null;
  }

  function addUnique(list, id) {
    list = Array.isArray(list) ? list : [];
    if (list.indexOf(id) < 0) list.push(id);
    return list;
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

  function claimTask(profile, taskId, options) {
    options = options || {};
    var task = findTask(taskId);
    if (!task) return { ok: false, reason: "TASK_NOT_FOUND" };
    var progress = getTaskProgress(task, profile, options.levels || []);
    if (!progress.done) return { ok: false, reason: "TASK_NOT_COMPLETE" };
    if (isTaskClaimed(task, profile)) return { ok: false, reason: "TASK_ALREADY_CLAIMED" };
    // Try cloud via gateway (fire-and-forget, doesn't block local)
    tryCloudClaim(profile, "claimTask", taskId, options);
    // Local fallback (always available)
    applyRewards(profile, task.rewards || []);
    if (task.bucket === "daily") {
      var today = localDateKey();
      var current = profile.claimedDailyTasks;
      var ids = current && current.date === today && Array.isArray(current.ids) ? current.ids : [];
      profile.claimedDailyTasks = { date: today, ids: addUnique(ids, task.id) };
    } else {
      profile.claimedTasks = addUnique(profile.claimedTasks, task.id);
    }
    return { ok: true, task: task, rewards: task.rewards || [] };
  }

  function claimActivityReward(profile, points, options) {
    options = options || {};
    points = Number(points);
    var rewards = getConfig().TASK_ACTIVITY_REWARDS || [];
    var reward = rewards.filter(function (item) { return Number(item.points) === points; })[0];
    if (!reward) return { ok: false, reason: "ACTIVITY_REWARD_NOT_FOUND" };
    var dailyRows = decorateTasks(getConfig().DAILY_TASKS || [], profile, options.levels || []);
    if (getActivity(dailyRows) < points) return { ok: false, reason: "ACTIVITY_REWARD_LOCKED" };
    if (isActivityRewardClaimed(profile, points)) return { ok: false, reason: "ACTIVITY_REWARD_CLAIMED" };
    tryCloudClaim(profile, "claimActivityReward", points, options);
    applyRewards(profile, reward.rewards || []);
    profile.claimedDailyActivityRewards = { date: localDateKey(), points: getDailyActivityClaims(profile).concat([points]) };
    return { ok: true, rewards: reward.rewards || [] };
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
    claimTask: claimTask,
    claimActivityReward: claimActivityReward,
    claimAchievement: claimAchievement,
    stopChatPolling: stopChatPolling
  };

})(typeof globalThis !== "undefined" ? globalThis : this);
