(function registerEndlessModePanelView(root) {
  "use strict";

  var scope = root.RXGame || (root.RXGame = {});

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch];
    });
  }

  function formatNumber(value) {
    return String(Math.max(0, Math.floor(Number(value) || 0))).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  function renderResources(profile) {
    var resources = profile && profile.resources || {};
    var gold = resources.gold != null ? resources.gold : profile && profile.coins || 0;
    return '<div class="fp-v3-resources">' +
      '<span><i class="gold"></i>金币 <b>' + formatNumber(gold) + '</b></span>' +
      '<span><i class="diamond"></i>钻石 <b>' + formatNumber(resources.diamonds || 0) + '</b></span>' +
      '<span><i class="energy"></i>体力 <b>' + formatNumber(resources.energy || 0) + (resources.maxEnergy ? '/' + formatNumber(resources.maxEnergy) : '') + '</b></span>' +
      '</div>';
  }

  function render(profile, options) {
    profile = profile || {};
    options = options || {};
    var gateway = options.getGameGateway && options.getGameGateway();
    var localRecord = profile.endlessRecord || {};
    var cloud = Boolean(gateway && gateway.isCloud);
    var visuals = scope.assets && scope.assets.BOSS_VISUALS || {};
    var bosses = "";
    for (var chapter = 1; chapter <= 9; chapter++) {
      var visual = visuals[chapter] || {};
      bosses += '<article><span>' + chapter + '</span>' + (visual.src ? '<img src="' + escapeHtml(visual.src) + '" alt="">' : '') + '<strong>' + escapeHtml(visual.title || ("第 " + chapter + " 章 BOSS")) + '</strong></article>';
    }
    var html = '<section class="event-board endless-board board-page fp-v3">' + renderResources(profile) +
      '<article class="endless-hero"><div><span>ENDLESS BOSS RUSH</span><strong>BOSS 无尽模式</strong><p>第一只立即出场，之后每 30 秒进入下一个出怪节点。场上只保留一只 BOSS，未击破时不会叠怪。</p></div>' +
      '<dl><div><dt>最高击杀</dt><dd data-endless-best-kills>' + (cloud ? '读取中…' : Math.max(0, Number(localRecord.bestKills) || 0) + ' 只') + '</dd></div><div><dt>最长生存</dt><dd data-endless-best-time>' + (cloud ? '读取中…' : Math.max(0, Number(localRecord.bestSurvivalSeconds) || 0) + ' 秒') + '</dd></div><div><dt>养成奖励</dt><dd>首版不发放</dd></div></dl>' +
      '<button type="button" data-endless-start>开始挑战</button></article>' +
      '<section class="endless-rules"><article><strong>生命</strong><span>第 n 只 = n × 100%</span></article><article><strong>攻击</strong><span>附加 n × 10%</span></article><article><strong>减伤</strong><span>n%，可超过 100%</span></article></section>' +
      '<section class="board-section-head"><div><strong>循环 BOSS</strong><span>第 1～9 章最终 BOSS，按顺序循环</span></div><p>9 套模型与行为</p></section>' +
      '<div class="endless-boss-grid">' + bosses + '</div></section>';
    if (cloud && gateway.getEndlessRecord) {
      setTimeout(function loadRecord() {
        gateway.getEndlessRecord().then(function (result) {
          var record = result.record || {};
          var kills = options.dom && options.dom.featurePanelSlots.querySelector("[data-endless-best-kills]");
          var time = options.dom && options.dom.featurePanelSlots.querySelector("[data-endless-best-time]");
          if (kills) kills.textContent = Math.max(0, Number(record.bestKills) || 0) + " 只";
          if (time) time.textContent = Math.max(0, Number(record.bestSurvivalSeconds) || 0) + " 秒";
        }).catch(function () {
          var kills = options.dom && options.dom.featurePanelSlots.querySelector("[data-endless-best-kills]");
          var time = options.dom && options.dom.featurePanelSlots.querySelector("[data-endless-best-time]");
          if (kills) kills.textContent = "连接失败";
          if (time) time.textContent = "请重试";
        });
      }, 0);
    }
    return html;
  }

  scope.endlessModePanelView = { render: render };
})(typeof globalThis !== "undefined" ? globalThis : this);
