(function registerStarWingsGachaView(root) {
  "use strict";

  var scope = root.RXGame || (root.RXGame = {});

  var history = [];
  var lastResults = [];
  var drawCount = 0;

  var POOL = [
    { rarity: "SSR", name: "苍穹零式", type: "战机核心", weight: 2 },
    { rarity: "SSR", name: "星链过载模组", type: "限定组件", weight: 3 },
    { rarity: "SR", name: "星链研究券", type: "研究道具", weight: 12 },
    { rarity: "SR", name: "高能晶核", type: "强化素材", weight: 16 },
    { rarity: "R", name: "金币补给", type: "资源补给", weight: 28 },
    { rarity: "R", name: "体力电池", type: "出击补给", weight: 24 },
    { rarity: "R", name: "火力校准件", type: "强化素材", weight: 15 }
  ];

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch];
    });
  }

  function pickReward() {
    var total = POOL.reduce(function (sum, item) { return sum + item.weight; }, 0);
    var roll = Math.random() * total;
    for (var i = 0; i < POOL.length; i++) {
      roll -= POOL[i].weight;
      if (roll <= 0) return POOL[i];
    }
    return POOL[POOL.length - 1];
  }

  function draw(times) {
    var results = [];
    for (var i = 0; i < times; i++) {
      var reward = pickReward();
      results.push(reward);
      history.unshift({ index: ++drawCount, reward: reward });
    }
    history = history.slice(0, 16);
    lastResults = results;
    return results;
  }

  function renderResultOverlay() {
    if (!lastResults.length) return "";
    var html = '<section class="gacha-result-overlay" data-gacha-result>' +
      '<div class="gacha-result-box">' +
      '<header><span>RESULT</span><strong>星穹同步完成</strong><button type="button" data-gacha-action="close-result">×</button></header>' +
      '<div class="gacha-result-grid">';
    for (var i = 0; i < lastResults.length; i++) {
      var item = lastResults[i];
      html += '<article class="gacha-result-card rarity-' + escapeHtml(item.rarity.toLowerCase()) + '">' +
        '<span>' + escapeHtml(item.rarity) + '</span>' +
        '<strong>' + escapeHtml(item.name) + '</strong>' +
        '<em>' + escapeHtml(item.type) + '</em>' +
      '</article>';
    }
    html += '</div><p>本轮为本地模拟预览，不扣除钻石，也不写入永久拥有状态。</p></div></section>';
    return html;
  }

  function renderHistory() {
    if (!history.length) return '<p class="gacha-empty">暂无抽取记录，点击抽取后会显示本页历史。</p>';
    var html = '<div class="gacha-history-list">';
    for (var i = 0; i < history.length; i++) {
      var row = history[i];
      html += '<article><span>#' + row.index + '</span><strong>' + escapeHtml(row.reward.name) + '</strong><em>' + escapeHtml(row.reward.rarity) + '</em></article>';
    }
    return html + '</div>';
  }

  function setPanel(dom, kicker, title, body, className, html) {
    dom.featurePanelKicker.textContent = kicker;
    dom.featurePanelTitle.textContent = title;
    dom.featurePanelBody.textContent = body;
    dom.featurePanelSlots.className = className;
    dom.featurePanelSlots.innerHTML = html;
  }

  function renderGachaPanel(dom) {
    var html = '<section class="star-gacha-shell">' +
      '<div class="gacha-hero">' +
        '<div class="gacha-banner-art" aria-hidden="true"></div>' +
        '<div class="gacha-copy"><span>LIMITED RATE UP</span><strong>星穹之翼</strong><p>苍穹零式与星链研究序列限时预览。当前为本地模拟抽取，不消耗真实资源。</p></div>' +
        '<div class="gacha-machine-art" aria-hidden="true"></div>' +
      '</div>' +
      '<div class="gacha-main-grid">' +
        '<section class="gacha-pool-card"><span>CORE REWARD</span><div class="gacha-aircraft-art" aria-hidden="true"></div><strong>苍穹零式 / 星链</strong><p>激光与贯穿流派主题奖池，正式概率和发放逻辑后续接入。</p></section>' +
        '<section class="gacha-actions"><div class="gacha-currency"><span aria-hidden="true"></span><strong>星晶 0</strong><em>展示货币</em></div><button type="button" data-gacha-action="draw-one">抽取 1 次</button><button type="button" class="primary" data-gacha-action="draw-ten">抽取 10 次</button><p>模拟抽取不会扣费，不写入存档。</p></section>' +
        '<section class="gacha-probability"><span>PROBABILITY</span><ul><li>SSR 5%</li><li>SR 28%</li><li>R 67%</li></ul><div aria-hidden="true"></div></section>' +
        '<section class="gacha-history"><span>HISTORY</span>' + renderHistory() + '</section>' +
      '</div>' +
      renderResultOverlay() +
    '</section>';
    setPanel(dom, "STAR WINGS", "星穹之翼", "独立限时抽取系统，本轮为本地模拟展示。", "star-gacha-panel-content", html);
    return true;
  }

  function renderContactPanel(dom) {
    var html = '<section class="contact-shell">' +
      '<div class="contact-card-art" aria-hidden="true"></div>' +
      '<div class="contact-copy"><span>CONTACT LINK</span><strong>联系我们</strong><p>官方社群 / 客服支持 / 商务联系入口预留。二维码图片接入后会替换右侧占位框。</p><button type="button" disabled>二维码待替换</button></div>' +
      '<div class="qr-placeholder-art" aria-label="二维码占位"></div>' +
      '<footer><span>当前为本地展示态</span><em>不上传图片，不连接后端。</em></footer>' +
    '</section>';
    setPanel(dom, "CONTACT", "联系我们", "二维码联系入口预留，后续替换为正式图片。", "contact-panel-content", html);
    return true;
  }

  function renderPanel(key, dom) {
    if (key === "starWingsGacha") return renderGachaPanel(dom);
    if (key === "contact") return renderContactPanel(dom);
    return false;
  }

  function handleEvent(event, dom) {
    var action = event.target && event.target.closest ? event.target.closest("[data-gacha-action]") : null;
    if (!action) return false;
    if (action.dataset.gachaAction === "draw-one") {
      draw(1);
      renderGachaPanel(dom);
      return true;
    }
    if (action.dataset.gachaAction === "draw-ten") {
      draw(10);
      renderGachaPanel(dom);
      return true;
    }
    if (action.dataset.gachaAction === "close-result") {
      lastResults = [];
      renderGachaPanel(dom);
      return true;
    }
    return false;
  }

  scope.starWingsGachaView = {
    renderPanel: renderPanel,
    handleEvent: handleEvent
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
