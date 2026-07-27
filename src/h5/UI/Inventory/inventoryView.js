(function registerInventoryView(root) {
  "use strict";
  var scope = root.RXGame || (root.RXGame = {});
  function escapeHtml(value) { return String(value == null ? "" : value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;"); }
  function attr(value) { return escapeHtml(value); }
  function format(value) { return Math.max(0, Math.floor(Number(value) || 0)).toLocaleString("zh-CN"); }

  function create(options) {
    options = options || {};
    var mount = options.mount;
    var catalog = options.catalog || scope.inventoryCatalog;
    var uiAssets = options.uiAssets || {};

    function filters(active) {
      return catalog.CATEGORIES.map(function button(item) {
        var icon = uiAssets[item.iconAsset];
        var iconHtml = icon
          ? '<img src="' + attr(icon) + '" alt="" aria-hidden="true">'
          : '<i aria-hidden="true">' + escapeHtml(item.fallbackIcon || "◇") + '</i>';
        return '<button type="button" class="' + (active === item.id ? 'is-active' : '') + '" data-inventory-action="filter" data-inventory-filter="' + item.id + '"><span class="inventory-filter-icon">' + iconHtml + '</span><strong>' + escapeHtml(item.label) + '</strong></button>';
      }).join("");
    }
    function resourceChip(icon, label, value, modifier) {
      var iconHtml = icon ? '<img src="' + attr(icon) + '" alt="" aria-hidden="true">' : '<i aria-hidden="true"></i>';
      return '<span class="inventory-resource-chip ' + attr(modifier) + '">' + iconHtml + '<small>' + escapeHtml(label) + '</small><strong>' + format(value) + '</strong></span>';
    }
    function currencyMeta(currency) {
      return currency === "diamonds"
        ? { label: "钻石", icon: uiAssets.resourceDiamond || "" }
        : { label: "金币", icon: uiAssets.resourceGold || "" };
    }
    function cards(items, selectedId) {
      if (!items.length) return '<div class="inventory-empty"><span>◇</span><strong>当前分类暂无物资</strong><small>抽卡与活动奖励会自动进入背包</small></div>';
      return items.map(function card(item) {
        return '<button type="button" class="inventory-item-card rarity-' + attr(item.rarity) + (item.id === selectedId ? ' is-selected' : '') + '" data-inventory-action="select" data-inventory-id="' + attr(item.id) + '">' +
          '<span class="inventory-item-icon">' + (item.icon ? '<img src="' + attr(item.icon) + '" alt="">' : '<i>?</i>') + '</span><strong>' + escapeHtml(item.name) + '</strong><em>×' + format(item.quantity) + '</em>' +
        '</button>';
      }).join("");
    }
    function detail(item, cloudMode) {
      if (!item) return '<div class="inventory-detail-empty"><span>SELECT ITEM</span><strong>选择一件物资查看详情</strong></div>';
      var useButton = item.use ? '<button class="is-primary" type="button" data-inventory-action="use" data-inventory-id="' + attr(item.id) + '"' + (cloudMode ? ' disabled' : '') + '>使用</button>' : '';
      var sellButton = "";
      if (item.sellPrice != null && item.quantity > 0) {
        var currency = currencyMeta(item.sellCurrency);
        var currencyIcon = currency.icon ? '<img src="' + attr(currency.icon) + '" alt="" aria-hidden="true">' : '';
        sellButton = '<button class="is-secondary inventory-sell-button" type="button" data-inventory-action="sell" data-inventory-id="' + attr(item.id) + '" data-inventory-sell="' + attr(item.id) + '" aria-label="卖出，回收 ' + format(item.sellPrice) + ' ' + attr(currency.label) + '"' + (cloudMode ? ' disabled' : '') + '><span>卖出</span><em>' + currencyIcon + '<strong>+' + format(item.sellPrice) + '</strong><small>' + escapeHtml(currency.label) + '</small></em></button>';
      }
      return '<article class="inventory-detail-card rarity-' + attr(item.rarity) + '"><div class="inventory-detail-icon">' + (item.icon ? '<img src="' + attr(item.icon) + '" alt="">' : '<i>?</i>') + '</div><small>' + escapeHtml(item.category.toUpperCase()) + '</small><h2>' + escapeHtml(item.name) + '</h2><p>' + escapeHtml(item.description) + '</p><dl><div><dt>拥有数量</dt><dd>' + format(item.quantity) + '</dd></div><div><dt>获取来源</dt><dd>' + escapeHtml(item.source) + '</dd></div></dl><footer>' + useButton + sellButton + '</footer></article>';
    }
    function feedback(receipt) {
      if (!receipt || receipt.kind !== "sell") return "";
      var currency = currencyMeta(receipt.currency);
      var icon = currency.icon ? '<img src="' + attr(currency.icon) + '" alt="" aria-hidden="true">' : '<i aria-hidden="true">◇</i>';
      return '<section class="inventory-feedback-layer" role="presentation"><article class="inventory-feedback" role="dialog" aria-modal="true" aria-live="assertive" aria-label="资源回收完成"><small>RESOURCE RECOVERED</small><h2>资源回收完成</h2><div class="inventory-feedback-reward">' + icon + '<span><small>' + escapeHtml(currency.label) + '</small><strong>+' + format(receipt.amount) + '</strong></span></div><p>已存入当前账户</p><button type="button" data-inventory-action="dismiss-feedback">确认</button></article></section>';
    }
    function render(model) {
      if (!mount) return;
      var resources = model.resources || {};
      var terminalStyle = uiAssets.terminalBackground ? ' style="--inventory-backdrop:url(&quot;' + attr(uiAssets.terminalBackground) + '&quot;)"' : '';
      var resourceSummary = resourceChip(uiAssets.resourceGold, "金币", resources.gold, "is-gold") +
        resourceChip(uiAssets.resourceDiamond, "钻石", resources.diamonds, "is-diamond") +
        resourceChip(uiAssets.resourceTicket, "星链研究券", resources.tickets, "is-ticket");
      var status = model.message ? '<footer class="inventory-status ' + (model.isError ? 'is-error' : '') + '">' + escapeHtml(model.message) + '</footer>' : '';
      mount.innerHTML = '<article class="inventory-terminal"' + terminalStyle + '><header><div class="inventory-heading"><small>STARPORT STORAGE / INDEPENDENT ROOM</small><h1>背包终端</h1></div><div class="inventory-resource-summary">' + resourceSummary + '</div><button class="inventory-close" type="button" data-inventory-action="close" aria-label="关闭背包"><span aria-hidden="true"></span></button></header>' +
        '<div class="inventory-cloud-notice' + (model.cloudMode ? ' is-visible' : '') + '">云端道具使用尚未开放；当前背包只读。</div>' +
        '<div class="inventory-layout"><nav class="inventory-filters" aria-label="背包分类">' + filters(model.filter) + '</nav><main class="inventory-grid" aria-label="物资列表">' + cards(model.items, model.selectedId) + '</main><aside class="inventory-detail">' + detail(model.selected, model.cloudMode) + '</aside></div>' +
        status + feedback(model.feedback) + '</article>';
    }
    return { render: render, clear: function clear() { if (mount) mount.innerHTML = ""; } };
  }
  var api = { create: create };
  scope.inventoryView = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
