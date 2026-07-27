(function registerEndlessModeEntryView(root) {
  "use strict";

  var scope = root.RXGame || (root.RXGame = {});
  var lastRun = null;

  function number(value) {
    return Math.max(0, Math.floor(Number(value) || 0)).toLocaleString("zh-CN");
  }

  function renderRun(label, run, emptyText) {
    if (!run) {
      return '<article class="endless-entry-run is-empty"><span>' + label + '</span><strong>' + emptyText + '</strong></article>';
    }
    return '<article class="endless-entry-run"><span>' + label + '</span><strong>击破 <b>' + number(run.bossKills) + '</b> 只 <i>·</i> 生存 <b>' + number(run.survivalSeconds) + '</b> 秒</strong></article>';
  }

  function render(profile, options) {
    profile = profile || {};
    options = options || {};
    var record = profile.endlessRecord || {};
    var gateway = options.getGameGateway && options.getGameGateway();
    var cloud = Boolean(gateway && gateway.isCloud);
    var bestRun = {
      bossKills: record.bestKills,
      survivalSeconds: record.bestSurvivalSeconds
    };
    var html = '<section class="endless-mode-overview" data-endless-entry>' +
      '<div class="endless-entry-copy"><small>ENDLESS / DARK TIDE</small><strong>黑潮信标</strong><p>首只 BOSS 立即出现，击破后 15 秒进入下一轮。<br>敌机持续增援，生存越久，威胁越强。</p></div>' +
      '<div class="endless-entry-dock" aria-label="无尽模式战绩与操作">' +
        renderRun("个人最佳", bestRun, "暂无记录") +
        renderRun("最近一局", lastRun, "暂无战报") +
        '<div class="endless-entry-command"><button type="button" data-endless-start><span>开始挑战</span></button><small>免费挑战 · 仅记录个人战绩</small></div>' +
        '<div class="endless-entry-sync" data-endless-record-status aria-live="polite">' + (cloud ? "同步中" : "") + '</div>' +
      '</div>' +
    '</section>';

    if (cloud && gateway.getEndlessRecord) {
      setTimeout(function loadCloudRecord() {
        gateway.getEndlessRecord().then(function (result) {
          updateRecord(options.dom, result && result.record || record, "");
        }).catch(function () {
          updateRecord(options.dom, record, "本地记录 · 云端同步失败");
        });
      }, 0);
    }
    return html;
  }

  function updateRecord(dom, record, statusText) {
    var panel = dom && dom.featurePanelSlots;
    if (!panel) return;
    var best = panel.querySelector(".endless-entry-run:first-child strong");
    var status = panel.querySelector("[data-endless-record-status]");
    if (best) {
      best.innerHTML = '击破 <b>' + number(record && record.bestKills) + '</b> 只 <i>·</i> 生存 <b>' + number(record && record.bestSurvivalSeconds) + '</b> 秒';
    }
    if (status) status.textContent = statusText || "";
  }

  function setLastRun(result) {
    if (!result) return;
    lastRun = {
      bossKills: Math.max(0, Math.floor(Number(result.bossKills) || 0)),
      survivalSeconds: Math.max(0, Math.floor(Number(result.survivalSeconds) || 0))
    };
  }

  function handleEvent(event, dom, options) {
    var button = event && event.target && event.target.closest ? event.target.closest("[data-endless-start]") : null;
    if (!button || button.disabled || !options.startEndlessMode) return false;
    button.disabled = true;
    var label = button.querySelector("span");
    if (label) label.textContent = "正在接入信标…";
    Promise.resolve(options.startEndlessMode()).catch(function showStartError(error) {
      button.disabled = false;
      if (label) label.textContent = "开始挑战";
      var status = dom && dom.featurePanelSlots && dom.featurePanelSlots.querySelector("[data-endless-record-status]");
      if (status) status.textContent = error && error.message ? error.message : "暂时无法开始挑战";
    });
    return true;
  }

  var api = { render: render, handleEvent: handleEvent, updateRecord: updateRecord, setLastRun: setLastRun };
  scope.endlessModeEntryView = api;
  if (scope.eventModeHubView && scope.eventModeHubView.registerMode) {
    scope.eventModeHubView.registerMode({
      id: "endless",
      label: "无尽模式",
      navSubtitle: "进行中",
      description: "个人极限记录 · 不消耗体力",
      getFrame: function getFrame() {
        var frames = scope.endlessModeAssets && scope.endlessModeAssets.getFrames ? scope.endlessModeAssets.getFrames() : {};
        return frames.entry || "";
      },
      render: render,
      handleEvent: handleEvent
    });
  }
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
