(function registerGachaView(root) {
  "use strict";
  var scope = root.RXGame || (root.RXGame = {});

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function attr(value) { return escapeHtml(value); }
  function format(value) { return Math.max(0, Math.floor(Number(value) || 0)).toLocaleString("zh-CN"); }

  function create(options) {
    options = options || {};
    var mount = options.mount;
    var config = options.config || scope.gachaConfig;
    var uiAssets = options.uiAssets || {};

    function tierDefinition(id) {
      return config.TIERS.find(function findTier(tier) { return tier.id === id; }) || { label: id };
    }

    function rewardIcon(id) {
      return uiAssets.rewardIcons && uiAssets.rewardIcons[id] || uiAssets.unknownReward || "";
    }

    function walletChip(icon, label, value, className) {
      return '<span class="gacha-wallet-chip ' + className + '">' +
        '<i class="gacha-wallet-icon">' + (icon ? '<img src="' + attr(icon) + '" alt="">' : '') + '</i>' +
        '<span><small>' + escapeHtml(label) + '</small><strong>' + format(value) + '</strong></span>' +
      '</span>';
    }

    function cardFrame(tier) {
      if (tier === "standard") return uiAssets.cardBlue || "";
      if (tier === "elite") return uiAssets.cardPurple || "";
      if (tier === "legendary") return uiAssets.cardGold || "";
      return uiAssets.cardUltimate || uiAssets.ultimateBurst || "";
    }

    function targetCard(key, model) {
      var target = config.TARGETS[key];
      var preview = model.targets[key] || {};
      var selected = model.state.target === key;
      return '<button class="gacha-target-card' + (selected ? ' is-selected' : '') + '" type="button" data-gacha-action="target" data-gacha-target="' + key + '">' +
        '<span class="gacha-target-rank">SS</span><span><strong>' + escapeHtml(target.label) + '</strong><em>' + escapeHtml(target.name + ' / ' + target.codeName) + '</em><small>' + (preview.owned ? '已拥有 · 重复本体将存入背包' : '未拥有 · 当前终极目标') + '</small></span>' +
      '</button>';
    }

    function tierRows() {
      return config.TIERS.map(function row(tier) {
        return '<li class="tier-' + tier.id + '"><span>' + escapeHtml(tier.label) + '</span><strong>' + tier.percent + '</strong></li>';
      }).join("");
    }

    function historyTime(value) {
      var date = new Date(Number(value) || 0);
      if (!Number.isFinite(date.getTime())) return "--";
      return String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0") + " " + String(date.getHours()).padStart(2, "0") + ":" + String(date.getMinutes()).padStart(2, "0");
    }

    function historyRows(history) {
      if (!history || !history.length) return '<p class="gacha-empty-copy">尚无抽取记录</p>';
      return history.slice(0, config.HISTORY_LIMIT).map(function row(item) {
        var icon = rewardIcon(item.rewardId);
        return '<article class="gacha-history-row tier-' + attr(item.tier) + '">' +
          '<span class="gacha-history-icon">' + (icon ? '<img src="' + attr(icon) + '" alt="">' : '<i>◇</i>') + '</span>' +
          '<span class="gacha-history-copy"><strong>' + escapeHtml(item.label) + '</strong><small>#' + format(item.drawNumber) + ' · ' + escapeHtml(historyTime(item.at)) + '</small></span>' +
          '<em>' + escapeHtml(tierDefinition(item.tier).label) + '</em>' +
        '</article>';
      }).join("");
    }

    function resultCard(item, index, hasUltimate) {
      var icon = rewardIcon(item.reward.id);
      var frame = cardFrame(item.tier);
      var delay = hasUltimate ? 1150 + index * 90 : 360 + index * 55;
      var style = '--card-delay:' + delay + 'ms;' + (frame ? '--reward-frame:url(&quot;' + attr(frame) + '&quot;);' : '');
      return '<article class="gacha-result-card tier-' + attr(item.tier) + '" style="' + style + '">' +
        '<span class="gacha-reward-frame" aria-hidden="true"></span>' +
        '<span class="gacha-result-icon">' + (icon ? '<img src="' + attr(icon) + '" alt="">' : '<i>◇</i>') + '</span>' +
        '<strong>' + escapeHtml(item.reward.label) + '</strong>' +
      '</article>';
    }

    function resultLayer(model) {
      if (!model.results || !model.results.length) return "";
      var ultimate = model.results.find(function findUltimate(item) { return item.tier === "ultimate"; });
      var ultimateIcon = ultimate && rewardIcon(ultimate.reward.id);
      var cards = model.results.map(function renderResultCard(item, index) { return resultCard(item, index, Boolean(ultimate)); }).join("");
      var redrawCount = Number(model.lastDrawCount) === 10 ? 10 : 1;
      var ultimateShowcase = ultimate ? '<section class="gacha-ultimate-showcase"><span>SS · ULTIMATE SIGNAL</span><div>' + (ultimateIcon ? '<img src="' + attr(ultimateIcon) + '" alt="' + attr(ultimate.reward.label) + '">' : '') + '</div><strong>' + escapeHtml(ultimate.reward.label) + '</strong><small>终极定向奖励已接入当前阵容</small></section>' : '';
      return '<section class="gacha-result-layer' + (ultimate ? ' has-ultimate' : '') + '" aria-label="抽取结果">' +
        '<div class="gacha-ritual" aria-hidden="true"><i></i><b></b><span></span></div>' +
        '<button class="gacha-skip-reveal" type="button" data-gacha-action="skip-reveal" aria-label="跳过抽卡动画"><span>点击跳过</span></button>' +
        '<div class="gacha-result-box"><header><small>SIGNAL ACQUIRED</small><strong>' + (ultimate ? '终极信号确认' : '跃迁结果') + '</strong></header>' +
          ultimateShowcase + '<div class="gacha-result-grid count-' + model.results.length + '">' + cards + '</div>' +
          '<footer class="gacha-result-actions"><button type="button" data-gacha-action="back">← 返回</button><button class="is-primary" type="button" data-gacha-action="redraw">再抽' + redrawCount + '次 <small>' + drawCostLabel(model, redrawCount) + '</small></button></footer>' +
        '</div></section>';
    }

    function drawCostLabel(model, count) {
      var cost = Math.max(1, Number(config.DRAW_COSTS[count]) || 1);
      var missing = Math.max(0, cost - Math.max(0, Number(model.tickets) || 0));
      if (!missing) return cost + ' 券' + (Number(count) === 10 ? ' · 9折' : '');
      return '缺' + missing + '券 · 可用' + format(missing * config.TICKET_DIAMOND_PRICE) + '钻补足';
    }

    function topUpDialog(model) {
      var pending = model.pendingTopUp;
      if (!pending) return "";
      return '<section class="gacha-topup-layer" role="dialog" aria-modal="true" aria-label="购买研究券"><article><small>RESEARCH TICKET SUPPLY</small><h2>星链研究券不足</h2><p>本次需要 <strong>' + pending.ticketCost + '</strong> 张，当前还差 <strong>' + pending.missingTickets + '</strong> 张。是否花费 <strong>' + pending.diamondCost + ' 钻石</strong> 补足并继续抽取？</p><div><span>钻石余额 ' + format(model.diamonds) + '</span><span>' + (pending.canAfford ? '确认后一次性结算' : '钻石不足，请先充值') + '</span></div><footer><button type="button" data-gacha-action="cancel-topup">取消</button>' + (pending.canAfford ? '<button class="is-primary" type="button" data-gacha-action="confirm-topup">购买并抽取</button>' : '<button class="is-primary" type="button" data-gacha-action="recharge">充值钻石</button>') + '</footer></article></section>';
    }

    function render(model) {
      if (!mount) return;
      var selectedKey = model.state.target;
      var selected = selectedKey && model.targets[selectedKey] || null;
      var canDraw = Boolean(selectedKey);
      var deviceStyle = uiAssets.summonDevice ? ' style="background-image:url(&quot;' + attr(uiAssets.summonDevice) + '&quot;)"' : '';
      var terminalStyle = uiAssets.backdrop ? ' style="--gacha-backdrop:url(&quot;' + attr(uiAssets.backdrop) + '&quot;)"' : '';
      mount.innerHTML =
        '<article class="gacha-terminal"' + terminalStyle + '>' +
          '<header class="gacha-header"><div><small>STAR WINGS / INDEPENDENT SIGNAL ROOM</small><h1>星穹之翼 · 定向跃迁</h1></div><div class="gacha-wallet">' + walletChip(uiAssets.resourceTicket, '星链研究券', model.tickets, 'is-ticket') + walletChip(uiAssets.resourceDiamond, '钻石', model.diamonds, 'is-diamond') + '</div><button type="button" data-gacha-action="close" aria-label="关闭抽卡">×</button></header>' +
          '<div class="gacha-cloud-notice' + (model.cloudMode ? ' is-visible' : '') + '">云端抽取已启用：抽取概率与保底由服务器校验并发放，结果与全服一致。</div>' +
          '<div class="gacha-layout">' +
            '<aside class="gacha-targets"><h2>选择终极目标</h2>' + targetCard('pilot', model) + targetCard('ship', model) + '<p>每次抽取前均可切换。100 抽必出当前目标；券不足时可按 ' + format(config.TICKET_DIAMOND_PRICE) + ' 钻石/张补购。</p></aside>' +
            '<main class="gacha-core"><div class="gacha-device"' + deviceStyle + '><div class="gacha-device-ring"></div>' +
              (selected ? '<img src="' + attr(selected.src) + '" alt="' + attr(selected.name) + '"><div class="gacha-selected-copy"><small>ULTIMATE TARGET</small><strong>' + escapeHtml(selected.name) + '</strong><span>' + escapeHtml(selected.codeName) + '</span></div>' : '<div class="gacha-no-target">请先选择 SS 战姬或 SS 战机</div>') +
            '</div><div class="gacha-pity"><span><strong>' + format(model.state.pity) + '</strong> 抽内必出</span><div><i style="width:' + Math.min(100, (config.PITY_LIMIT - model.state.pity) / config.PITY_LIMIT * 100) + '%"></i></div><small>终极大奖出现后保底重置为 ' + config.PITY_LIMIT + ' 抽</small></div></main>' +
            '<aside class="gacha-intel"><section><h2>四档概率</h2><ol class="gacha-tier-list">' + tierRows() + '</ol></section><section class="gacha-history-panel"><h2>最近 100 次 <span>' + Math.min(config.HISTORY_LIMIT, model.state.history.length) + '/100</span></h2><div class="gacha-history">' + historyRows(model.state.history) + '</div></section></aside>' +
          '</div>' +
          '<footer class="gacha-actions"><p class="' + (model.isError ? 'is-error' : '') + '">' + escapeHtml(model.message || '研究券为唯一抽取货币；十连 9 折，只消耗 9 张。') + '</p><div><button type="button" data-gacha-action="draw" data-gacha-count="1"' + (canDraw ? '' : ' disabled') + '>单次跃迁 <span>×1</span> <small>' + drawCostLabel(model, 1) + '</small></button><button class="is-primary" type="button" data-gacha-action="draw" data-gacha-count="10"' + (canDraw ? '' : ' disabled') + '>十连跃迁 <span>×10</span> <small>' + drawCostLabel(model, 10) + '</small></button></div></footer>' +
          resultLayer(model) + topUpDialog(model) +
        '</article>';
    }

    return { render: render, clear: function clear() { if (mount) mount.innerHTML = ""; } };
  }

  var api = { create: create };
  scope.gachaView = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
