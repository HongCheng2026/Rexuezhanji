(function registerEndlessModeSettlementView(root) {
  "use strict";

  var scope = root.RXGame || (root.RXGame = {});

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch];
    });
  }

  function value(number) {
    return Math.max(0, Math.floor(Number(number) || 0)).toLocaleString("zh-CN");
  }

  function render(container, model) {
    if (!container) return;
    model = model || {};
    var frames = scope.endlessModeAssets && scope.endlessModeAssets.getFrames ? scope.endlessModeAssets.getFrames() : {};
    var failed = model.syncState === "error";
    var syncing = model.syncState === "syncing";
    var title = model.reason === "quit" ? "主动撤离" : "本轮战败";
    var lead = model.reason === "quit" ? "已主动断开黑潮信号，本轮数据已封存。" : "黑潮信号中断，本轮数据已封存。";
    var status = syncing ? "正在同步个人纪录…" : failed ? (model.errorMessage || "纪录保存失败，请重试") : "个人纪录已同步";
    var killGap = Math.max(0, Math.floor(Number(model.bestKills) || 0) - Math.floor(Number(model.bossKills) || 0));
    var timeGap = Math.max(0, Math.floor(Number(model.bestSurvivalSeconds) || 0) - Math.floor(Number(model.survivalSeconds) || 0));

    container.innerHTML = '<section class="endless-result-page" data-endless-result>' +
      '<img class="endless-result-frame" src="' + escapeHtml(frames.settlement || "") + '" alt="">' +
      '<header class="endless-report-heading"><strong>作战记录</strong><small>ENDLESS REPORT</small></header>' +
      '<div class="endless-result-outcome"><strong>' + title + '</strong><p>' + lead + '</p></div>' +
      '<div class="endless-result-primary">' +
        '<article><span>击破 BOSS</span><strong>' + value(model.bossKills) + '<em>只</em></strong>' + (model.newBestKills ? '<b>新纪录</b>' : '') + '</article>' +
        '<article><span>生存时间</span><strong>' + value(model.survivalSeconds) + '<em>秒</em></strong>' + (model.newBestTime ? '<b>新纪录</b>' : '') + '</article>' +
      '</div>' +
      '<div class="endless-result-compare"><span>历史最佳 <strong>' + value(model.bestKills) + ' 只 / ' + value(model.bestSurvivalSeconds) + ' 秒</strong></span><span>距最佳 <strong>' + value(killGap) + ' 只 · ' + value(timeGap) + ' 秒</strong></span></div>' +
      '<div class="endless-result-secondary"><article><span>普通敌机</span><strong>' + value(model.enemyKills) + '</strong></article><article><span>承受伤害</span><strong>' + value(model.damageTaken) + '<em>点</em></strong></article><article><span>到达轮次</span><strong>' + value(model.roundReached) + '</strong></article></div>' +
      '<div class="endless-result-status" data-endless-sync-status data-state="' + escapeHtml(model.syncState || "idle") + '"><span>' + escapeHtml(status) + '</span></div>' +
      '<div class="endless-result-actions"><button type="button" data-endless-result-action="activity"' + (failed || syncing ? ' disabled' : '') + '>返回活动</button><button type="button" data-endless-result-action="' + (failed ? "retry-save" : "replay") + '"' + (syncing ? ' disabled' : '') + '>' + (failed ? "重试保存" : "再战一次") + '</button></div>' +
    '</section>';
    container.classList.remove("hidden");
  }

  var api = { render: render };
  scope.endlessModeSettlementView = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
