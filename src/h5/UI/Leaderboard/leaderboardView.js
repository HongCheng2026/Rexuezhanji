(function registerLeaderboardView(root) {
  "use strict";

  var scope = root.RXGame || (root.RXGame = {});
  var ENDLESS_SCORE_SCALE = 1000000;
  var activeCategory = "power";
  var requestSequence = 0;
  var lastOptions = {};
  var categories = {
    power: { label: "总战力", kicker: "TOTAL POWER", title: "全服战力序列", note: "根据云端权威存档统计" },
    endless: { label: "无尽挑战", kicker: "ENDLESS", title: "黑潮生存记录", note: "优先比较 BOSS 击破数，相同时比较生存时长" }
  };
  var localPowerRows = [
    { publicUid: 100000017, name: "深空十七", score: 28600 },
    { publicUid: 100000026, name: "凌然", score: 26800 },
    { publicUid: 100000042, name: "洛绪", score: 25400 },
    { publicUid: 100000055, name: "黑曜队长", score: 23100 },
    { publicUid: 100000071, name: "白凌", score: 17600 }
  ];
  var localEndlessRows = [
    { publicUid: 100000017, name: "深空十七", kills: 18, survivalSeconds: 488 },
    { publicUid: 100000042, name: "洛绪", kills: 16, survivalSeconds: 442 },
    { publicUid: 100000026, name: "凌然", kills: 15, survivalSeconds: 471 },
    { publicUid: 100000055, name: "黑曜队长", kills: 12, survivalSeconds: 390 },
    { publicUid: 100000071, name: "白凌", kills: 9, survivalSeconds: 318 }
  ];

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (character) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character];
    });
  }

  function formatNumber(value) {
    return String(Math.max(0, Math.floor(Number(value) || 0))).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  function formatDuration(value) {
    var seconds = Math.max(0, Math.floor(Number(value) || 0));
    var hours = Math.floor(seconds / 3600);
    var minutes = Math.floor((seconds % 3600) / 60);
    var remainder = seconds % 60;
    if (hours > 0) return hours + ":" + String(minutes).padStart(2, "0") + ":" + String(remainder).padStart(2, "0");
    return String(minutes).padStart(2, "0") + ":" + String(remainder).padStart(2, "0");
  }

  function normalizeEndlessRow(row) {
    row = row || {};
    var score = Math.max(0, Math.floor(Number(row.score) || 0));
    var kills = row.kills == null
      ? row.bestKills == null ? Math.floor(score / ENDLESS_SCORE_SCALE) : Math.max(0, Math.floor(Number(row.bestKills) || 0))
      : Math.max(0, Math.floor(Number(row.kills) || 0));
    var survivalSeconds = row.survivalSeconds == null
      ? row.bestSurvivalSeconds == null ? score % ENDLESS_SCORE_SCALE : Math.max(0, Math.floor(Number(row.bestSurvivalSeconds) || 0))
      : Math.max(0, Math.floor(Number(row.survivalSeconds) || 0));
    return Object.assign({}, row, { kills: kills, survivalSeconds: survivalSeconds, score: kills * ENDLESS_SCORE_SCALE + survivalSeconds });
  }

  function formatScore(row, category) {
    if (category === "endless") {
      var record = normalizeEndlessRow(row);
      return "击破 " + formatNumber(record.kills) + " · " + formatDuration(record.survivalSeconds);
    }
    return formatNumber(row && row.score);
  }

  function rankRows(rows) {
    var previousScore = null;
    var currentRank = 0;
    return rows.map(function (row, index) {
      var score = Math.max(0, Math.floor(Number(row.score) || 0));
      if (previousScore === null || score !== previousScore) currentRank = index + 1;
      previousScore = score;
      return Object.assign({}, row, { rank: Number(row.rank) > 0 ? Number(row.rank) : currentRank, score: score });
    });
  }

  function getLocalRows(profile, combatPower, category) {
    profile = profile || {};
    var player = profile.player || {};
    var publicUid = Math.max(0, Math.floor(Number(player.uid) || 100000001));
    var name = String(player.name || "本地指挥官").slice(0, 20);
    var rows;
    if (category === "endless") {
      var localRecord = normalizeEndlessRow(profile.endlessRecord || {});
      rows = localEndlessRows.map(normalizeEndlessRow);
      rows.push(Object.assign({}, localRecord, { publicUid: publicUid, name: name, isSelf: true }));
    } else {
      rows = localPowerRows.map(function (row) { return Object.assign({}, row); });
      rows.push({ publicUid: publicUid, name: name, score: Math.max(0, Math.floor(Number(combatPower) || 0)), isSelf: true });
    }
    rows.sort(function (left, right) { return Number(right.score) - Number(left.score); });
    return rankRows(rows);
  }

  function renderTabs() {
    return '<nav class="leaderboard-tabs" role="tablist" aria-label="排行榜分类">' + Object.keys(categories).map(function (category) {
      var config = categories[category];
      var active = category === activeCategory;
      return '<button type="button" role="tab" aria-selected="' + (active ? "true" : "false") + '" class="' + (active ? "is-active" : "") + '" data-leaderboard-tab="' + category + '"><small>' + config.kicker + '</small><strong>' + config.label + '</strong></button>';
    }).join("") + '</nav>';
  }

  function isSelfRow(row, self) {
    if (row && row.isSelf) return true;
    if (!row || !self) return false;
    var rowUid = Math.floor(Number(row.publicUid) || 0);
    var selfUid = Math.floor(Number(self.publicUid) || 0);
    return rowUid > 0 && selfUid > 0 && rowUid === selfUid;
  }

  function renderPodium(rows, category, self) {
    var podiumRows = rows.slice(0, 3);
    return [1, 0, 2].map(function (index) {
      var rank = index + 1;
      var row = podiumRows[index];
      if (!row) return '<article class="leaderboard-podium-card rank-' + rank + ' is-empty"><span class="leaderboard-rank-number">0' + rank + '</span><i>?</i><strong>暂无记录</strong><p>WAITING</p><em>--</em></article>';
      var selfClass = isSelfRow(row, self) ? " is-self" : "";
      return '<article class="leaderboard-podium-card rank-' + rank + selfClass + '"><span class="leaderboard-rank-number">0' + rank + '</span>' + (rank === 1 ? '<b aria-hidden="true">★</b>' : '') + '<i>' + escapeHtml(String(row.name || "?").slice(0, 1)) + '</i><strong>' + escapeHtml(row.name || "指挥官") + '</strong><p>ID ' + escapeHtml(row.publicUid || "--") + '</p><em>' + escapeHtml(formatScore(row, category)) + '</em></article>';
    }).join("");
  }

  function renderRows(rows, category, self) {
    var visibleRows = rows.filter(function (row) { return Number(row.rank) > 3; });
    var html = visibleRows.map(function (row) {
      var selfClass = isSelfRow(row, self) ? " is-self" : "";
      return '<article class="leaderboard-row' + selfClass + '"><b>' + String(Math.max(0, Math.floor(Number(row.rank) || 0))).padStart(2, "0") + '</b><i>' + escapeHtml(String(row.name || "?").slice(0, 1)) + '</i><strong>' + escapeHtml(row.name || "指挥官") + '</strong><span>ID ' + escapeHtml(row.publicUid || "--") + '</span><em>' + escapeHtml(formatScore(row, category)) + '</em>' + (selfClass ? '<u>我的位置</u>' : '') + '</article>';
    }).join("");
    if (self && Number(self.rank) > 0 && !rows.some(function (row) { return isSelfRow(row, self); })) {
      html += '<div class="leaderboard-rank-gap" aria-hidden="true"><span></span><b>···</b><span></span></div>' +
        '<article class="leaderboard-row is-self"><b>' + String(Math.floor(Number(self.rank))).padStart(2, "0") + '</b><i>我</i><strong>' + escapeHtml(self.name || "我的指挥官") + '</strong><span>ID ' + escapeHtml(self.publicUid || "--") + '</span><em>' + escapeHtml(formatScore(self, category)) + '</em><u>我的位置</u></article>';
    }
    return html || '<p class="leaderboard-empty">尚无全服记录，完成一次战斗后即可上榜。</p>';
  }

  function renderSelfSummary(self, category, isCloud) {
    if (!self || Number(self.rank) <= 0) return '<span>我的排名</span><strong>尚未上榜</strong><p>' + (isCloud ? "战斗数据会由云端自动同步" : "本地演示数据") + '</p>';
    return '<span>我的排名</span><strong>NO.' + escapeHtml(self.rank) + '</strong><p>' + escapeHtml(formatScore(self, category)) + '</p>';
  }

  function renderModule(options) {
    options = options || {};
    var gateway = options.getGameGateway && options.getGameGateway();
    var isCloud = Boolean(gateway && gateway.isCloud);
    var config = categories[activeCategory];
    var rows = isCloud ? [] : getLocalRows(options.profile, options.combatPower, activeCategory);
    var self = rows.filter(function (row) { return row.isSelf; })[0] || null;
    return '<section class="leaderboard-module" data-leaderboard-root data-category="' + activeCategory + '">' +
      '<header class="leaderboard-commandbar">' + renderTabs() + '<div class="leaderboard-source" data-leaderboard-source data-state="' + (isCloud ? "loading" : "local") + '"><i aria-hidden="true"></i><span>' + (isCloud ? "正在收集全服数据" : "本地榜单预览") + '</span><button type="button" data-leaderboard-refresh aria-label="刷新排行榜">刷新</button></div></header>' +
      '<div class="leaderboard-layout"><section class="leaderboard-podium-panel"><header><small>' + config.kicker + '</small><strong>' + config.title + '</strong><p>' + config.note + '</p></header><div class="leaderboard-podium" data-leaderboard-podium>' + renderPodium(rows, activeCategory, self) + '</div></section>' +
        '<section class="leaderboard-list-panel"><header><div><small>ALL SERVER</small><strong>' + config.label + '</strong></div><span>最高展示 100 名</span></header><div class="leaderboard-columns" aria-hidden="true"><span>排名</span><span>指挥官</span><span>玩家 ID</span><span>成绩</span></div><div class="leaderboard-rows" data-leaderboard-rows>' + (isCloud ? '<p class="leaderboard-loading"><i></i>同步全服榜单中...</p>' : renderRows(rows, activeCategory, self)) + '</div></section></div>' +
      '<footer class="leaderboard-self" data-leaderboard-self>' + renderSelfSummary(self, activeCategory, isCloud) + '</footer></section>';
  }

  function getCurrentRoot(dom) {
    return dom && dom.featurePanelSlots && dom.featurePanelSlots.querySelector ? dom.featurePanelSlots.querySelector("[data-leaderboard-root]") : null;
  }

  function updateBoard(dom, category, payload) {
    var moduleRoot = getCurrentRoot(dom);
    if (!moduleRoot || moduleRoot.getAttribute("data-category") !== category) return;
    var rows = rankRows(Array.isArray(payload && payload.rows) ? payload.rows : []);
    var self = payload && payload.self || null;
    var source = moduleRoot.querySelector("[data-leaderboard-source]");
    var podium = moduleRoot.querySelector("[data-leaderboard-podium]");
    var rowRoot = moduleRoot.querySelector("[data-leaderboard-rows]");
    var selfRoot = moduleRoot.querySelector("[data-leaderboard-self]");
    if (source) {
      source.setAttribute("data-state", "online");
      var sourceLabel = source.querySelector("span");
      if (sourceLabel) sourceLabel.textContent = "全服实时数据 · 已更新";
    }
    if (podium) podium.innerHTML = renderPodium(rows, category, self);
    if (rowRoot) rowRoot.innerHTML = renderRows(rows, category, self);
    if (selfRoot) selfRoot.innerHTML = renderSelfSummary(self, category, true);
  }

  function showLoadError(dom, category) {
    var moduleRoot = getCurrentRoot(dom);
    if (!moduleRoot || moduleRoot.getAttribute("data-category") !== category) return;
    var source = moduleRoot.querySelector("[data-leaderboard-source]");
    var rowRoot = moduleRoot.querySelector("[data-leaderboard-rows]");
    if (source) {
      source.setAttribute("data-state", "error");
      var sourceLabel = source.querySelector("span");
      if (sourceLabel) sourceLabel.textContent = "全服数据连接失败";
    }
    if (rowRoot) rowRoot.innerHTML = '<p class="leaderboard-empty">榜单暂时不可用，请点击右上角“刷新”重试。</p>';
  }

  function loadCloudBoard(options, category) {
    var gateway = options.getGameGateway && options.getGameGateway();
    if (!gateway || !gateway.isCloud || typeof gateway.leaderboardFetch !== "function") return;
    var sequence = ++requestSequence;
    setTimeout(function requestLeaderboard() {
      var refreshPower = category === "power" && typeof gateway.leaderboardRefresh === "function" ? Promise.resolve(gateway.leaderboardRefresh()).catch(function () { return null; }) : Promise.resolve();
      refreshPower.then(function fetchLeaderboard() { return gateway.leaderboardFetch(category); }).then(function applyLeaderboard(payload) {
        if (sequence !== requestSequence || category !== activeCategory) return;
        updateBoard(options.dom, category, payload || {});
      }).catch(function handleLeaderboardError() {
        if (sequence !== requestSequence || category !== activeCategory) return;
        showLoadError(options.dom, category);
      });
    }, 0);
  }

  function renderPanel(options) {
    lastOptions = Object.assign({}, lastOptions, options || {});
    var html = renderModule(lastOptions);
    loadCloudBoard(lastOptions, activeCategory);
    return html;
  }

  function rerender(dom, options) {
    lastOptions = Object.assign({}, lastOptions, options || {}, { dom: dom || (options && options.dom) });
    if (!dom || !dom.featurePanelSlots) return false;
    dom.featurePanelSlots.innerHTML = renderPanel(lastOptions);
    return true;
  }

  function handleEvent(event, dom, options) {
    var target = event && event.target;
    var tab = target && target.closest ? target.closest("[data-leaderboard-tab]") : null;
    if (tab) {
      var nextCategory = String(tab.getAttribute("data-leaderboard-tab") || "");
      if (!categories[nextCategory]) return true;
      if (nextCategory !== activeCategory) {
        activeCategory = nextCategory;
        requestSequence += 1;
        rerender(dom, options || {});
      }
      return true;
    }
    var refresh = target && target.closest ? target.closest("[data-leaderboard-refresh]") : null;
    if (refresh) {
      rerender(dom, options || {});
      return true;
    }
    return false;
  }

  var api = {
    renderPanel: renderPanel,
    handleEvent: handleEvent,
    getActiveCategory: function getActiveCategory() { return activeCategory; },
    formatDuration: formatDuration,
    normalizeEndlessRow: normalizeEndlessRow
  };
  scope.leaderboardView = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
