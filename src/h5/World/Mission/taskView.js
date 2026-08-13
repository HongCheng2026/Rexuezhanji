(function registerTaskView(root) {
  "use strict";

  var scope = root.RXGame || (root.RXGame = {});
  var viewState = { track: "daily", filter: "all" };

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (character) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character];
    });
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }

  function formatNumber(value) {
    return String(Math.max(0, Math.floor(Number(value) || 0))).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  function rewardLabel(reward) {
    var labels = { gold: "金币", diamonds: "钻石", energy: "体力", item: "物资" };
    return (labels[reward.type] || reward.type || "奖励") + " " + formatNumber(reward.amount);
  }

  function renderRewards(rewards) {
    return (rewards || []).map(function (reward) {
      return '<span>' + escapeHtml(rewardLabel(reward)) + '</span>';
    }).join("");
  }

  function statusLabel(state) {
    return state.claimed ? "已归档" : state.ready ? "待领取" : "执行中";
  }

  function renderAction(state, compact) {
    if (state.claimed) return '<em class="mission-state is-claimed">已领取</em>';
    if (state.ready) {
      return '<button type="button" class="mission-claim' + (compact ? " is-compact" : "") + '" data-task-claim="' + escapeAttr(state.task.id) + '">领取奖励</button>';
    }
    return '<em class="mission-state">执行中</em>';
  }

  function renderResources(profile) {
    var resources = profile && profile.resources || {};
    var gold = resources.gold != null ? resources.gold : profile && profile.coins || 0;
    return '<div class="mission-resource-line" aria-label="当前资源">' +
      '<span><i class="is-gold"></i>金币 <b>' + formatNumber(gold) + '</b></span>' +
      '<span><i class="is-diamond"></i>钻石 <b>' + formatNumber(resources.diamonds) + '</b></span>' +
      '<span><i class="is-energy"></i>体力 <b>' + formatNumber(resources.energy) + (resources.maxEnergy ? "/" + formatNumber(resources.maxEnergy) : "") + '</b></span>' +
    '</div>';
  }

  function renderTrackTabs(snapshot) {
    return '<nav class="mission-track-tabs" aria-label="任务航线">' + snapshot.tracks.map(function (track) {
      return '<button type="button" class="' + (track.id === snapshot.track.id ? "is-active" : "") + '" data-task-track="' + escapeAttr(track.id) + '">' +
        '<span>' + escapeHtml(track.kicker) + '</span><strong>' + escapeHtml(track.label) + '</strong>' +
      '</button>';
    }).join("") + '</nav>';
  }

  function renderProgress(state) {
    return '<div class="mission-progress">' +
      '<div><span>' + escapeHtml(state.task.condition.label || "任务进度") + '</span><b>' + formatNumber(state.current) + ' / ' + formatNumber(state.target) + '</b></div>' +
      '<i aria-hidden="true"><span style="width:' + state.percent + '%"></span></i>' +
    '</div>';
  }

  function renderFocus(snapshot) {
    var state = snapshot.focus;
    if (!state) return '<section class="mission-focus is-empty"><p>当前航线没有可用指令。</p></section>';
    return '<section class="mission-focus is-' + state.status + '">' +
      '<div class="mission-focus-index" aria-hidden="true"><span>ORDER</span><b>' + String((state.task.priority || 0) / 10).padStart(2, "0") + '</b></div>' +
      '<div class="mission-focus-copy">' +
        '<div class="mission-eyebrow"><span>当前指令 · ' + escapeHtml(state.task.category) + '</span><em>' + escapeHtml(statusLabel(state)) + '</em></div>' +
        '<h3>' + escapeHtml(state.task.title) + '</h3>' +
        '<p>' + escapeHtml(state.task.desc) + '</p>' +
        renderProgress(state) +
      '</div>' +
      '<aside class="mission-focus-reward"><span>完成报酬</span><div>' + renderRewards(state.task.rewards) + '</div>' + renderAction(state, false) + '</aside>' +
    '</section>';
  }

  function renderActivity(snapshot) {
    if (snapshot.track.id !== "daily") {
      return '<section class="mission-route-note"><span>ROUTE PROTOCOL</span><strong>主线推进 → 机体强化 → 技巧突破 → 阵容扩编</strong><p>可领取目标会自动置顶，已归档目标沉入列表末尾。</p></section>';
    }
    return '<section class="mission-activity">' +
      '<header><div><span>DAILY SIGNAL</span><strong>' + formatNumber(snapshot.activity) + '<small>/100</small></strong></div><p>战备活跃度</p></header>' +
      '<div class="mission-activity-route"><i aria-hidden="true"><span style="width:' + Math.min(100, snapshot.activity) + '%"></span></i><ol>' +
        snapshot.activityRewards.map(function (state) {
          var action = state.claimed
            ? '<em>已领取</em>'
            : state.ready
              ? '<button type="button" data-activity-claim="' + state.reward.points + '">领取</button>'
              : '<em>未解锁</em>';
          return '<li class="is-' + state.status + '"><b>' + state.reward.points + '</b><span>' + renderRewards(state.reward.rewards) + '</span>' + action + '</li>';
        }).join("") +
      '</ol></div>' +
    '</section>';
  }

  function matchesFilter(state) {
    if (viewState.filter === "ready") return state.ready;
    if (viewState.filter === "active") return state.status === "active";
    if (viewState.filter === "claimed") return state.claimed;
    return true;
  }

  function renderFilters(snapshot) {
    var filters = [
      { id: "all", label: "全部", count: snapshot.summary.total },
      { id: "ready", label: "待领取", count: snapshot.summary.ready },
      { id: "active", label: "执行中", count: snapshot.summary.active },
      { id: "claimed", label: "已归档", count: snapshot.summary.claimed }
    ];
    return '<nav class="mission-filters" aria-label="任务状态筛选">' + filters.map(function (filter) {
      return '<button type="button" class="' + (viewState.filter === filter.id ? "is-active" : "") + '" data-task-filter="' + filter.id + '">' +
        escapeHtml(filter.label) + '<b>' + filter.count + '</b></button>';
    }).join("") + '</nav>';
  }

  function renderTaskCard(state, index) {
    return '<article class="mission-card is-' + state.status + '">' +
      '<div class="mission-card-mark"><b>' + String(index + 1).padStart(2, "0") + '</b><span>' + escapeHtml(state.task.category) + '</span></div>' +
      '<div class="mission-card-copy"><div><strong>' + escapeHtml(state.task.title) + '</strong><em>' + escapeHtml(statusLabel(state)) + '</em></div><p>' + escapeHtml(state.task.desc) + '</p>' + renderProgress(state) + '</div>' +
      '<div class="mission-card-reward"><span>报酬</span><div>' + renderRewards(state.task.rewards) + '</div></div>' +
      '<div class="mission-card-action">' + renderAction(state, true) + '</div>' +
    '</article>';
  }

  function renderTaskList(snapshot) {
    var visible = snapshot.tasks.filter(matchesFilter);
    if (!visible.length) return '<div class="mission-empty"><strong>当前筛选没有指令</strong><p>切换状态筛选查看其他任务。</p></div>';
    return '<div class="mission-list">' + visible.map(renderTaskCard).join("") + '</div>';
  }

  function render(profile) {
    var system = scope.taskSystem;
    if (!system) return '<section class="task-command-center"><div class="mission-empty"><strong>任务系统未加载</strong><p>请刷新页面后重试。</p></div></section>';
    var snapshot = system.getSnapshot(profile || {}, viewState.track);
    return '<section class="task-command-center" data-task-root>' +
      '<header class="mission-toolbar">' + renderResources(profile || {}) + '<span>' + escapeHtml(snapshot.track.resetLabel) + '</span></header>' +
      renderTrackTabs(snapshot) +
      '<div class="mission-dashboard">' + renderFocus(snapshot) + renderActivity(snapshot) + '</div>' +
      '<section class="mission-orders">' +
        '<header><div><span>' + escapeHtml(snapshot.track.kicker) + '</span><strong>' + escapeHtml(snapshot.track.label) + '指令</strong><p>' + escapeHtml(snapshot.track.description) + '</p></div>' + renderFilters(snapshot) + '</header>' +
        renderTaskList(snapshot) +
      '</section>' +
    '</section>';
  }

  function renderPanel(dom, options) {
    options = options || {};
    var profile = options.profile || {};
    var readyCount = scope.taskSystem ? scope.taskSystem.getReadyCount(profile) : 0;
    dom.featurePanelKicker.textContent = "MISSION CONTROL";
    dom.featurePanelTitle.textContent = "战备指令台";
    dom.featurePanelBody.textContent = readyCount ? readyCount + " 项奖励等待确认。" : "当前指令已同步，优先完成置顶目标。";
    dom.featurePanelSlots.className = "feature-panel-room-content task-room-host";
    dom.featurePanelSlots.innerHTML = render(profile);
    return true;
  }

  function handleEvent(event, dom, options) {
    var target = event.target && event.target.closest
      ? event.target.closest("[data-task-track],[data-task-filter]")
      : null;
    if (!target || !target.dataset) return false;
    if (target.dataset.taskTrack) {
      viewState.track = target.dataset.taskTrack;
      viewState.filter = "all";
    } else if (target.dataset.taskFilter) {
      viewState.filter = target.dataset.taskFilter;
    }
    renderPanel(dom, options || {});
    return true;
  }

  scope.taskView = {
    render: render,
    renderPanel: renderPanel,
    handleEvent: handleEvent,
    getState: function getState() { return { track: viewState.track, filter: viewState.filter }; }
  };

  if (typeof module !== "undefined" && module.exports) module.exports = scope.taskView;
})(typeof globalThis !== "undefined" ? globalThis : this);
