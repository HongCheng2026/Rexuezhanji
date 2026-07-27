(function registerResourceExchangeView(root) {
  "use strict";
  var scope = root.RXGame || (root.RXGame = {});

  function create(options) {
    options = options || {};
    var mount = options.mount;
    var assets = options.assets || {};

    function render(model) {
      if (!mount) return;
      var quote = model.quote;
      var message = model.message || (quote.canExchange ? "确认后立即写入当前存档。" : "钻石不足，请点击顶部钻石加号联系充值。" );
      mount.innerHTML =
        '<article class="resource-exchange-dialog" data-resource-exchange-root>' +
          '<header><div><small>CURRENCY CONVERSION</small><strong>钻石兑换金币</strong></div>' +
          '<button type="button" data-exchange-action="close" aria-label="关闭钻石兑换">×</button></header>' +
          '<section class="resource-exchange-rate" aria-label="兑换比例">' +
            currency(assets.resourceDiamondIcon, "钻石", "1") + '<span>兑换</span>' + currency(assets.resourceGoldIcon, "金币", "1,000") +
          '</section>' +
          '<section class="resource-exchange-balance">' +
            '<span>当前钻石 <strong>' + format(quote.diamonds) + '</strong></span>' +
            '<span>当前金币 <strong>' + format(quote.gold) + '</strong></span>' +
          '</section>' +
          '<section class="resource-exchange-amount">' +
            '<small>兑换数量</small><div><button type="button" data-exchange-action="adjust" data-exchange-delta="-1">−</button>' +
            '<input data-exchange-input type="number" inputmode="numeric" min="1" max="' + Math.max(1, quote.diamonds) + '" value="' + quote.amount + '" aria-label="兑换钻石数量">' +
            '<button type="button" data-exchange-action="adjust" data-exchange-delta="1">＋</button></div>' +
            '<nav aria-label="快速选择">' + preset(1) + preset(10) + preset(50) + '<button type="button" data-exchange-action="preset" data-exchange-amount="' + Math.max(1, quote.diamonds) + '">全部</button></nav>' +
          '</section>' +
          '<section class="resource-exchange-result">' +
            '<span>本次消耗 <strong>' + format(quote.amount) + ' 钻石</strong></span>' +
            '<span>获得 <strong>' + format(quote.goldGain) + ' 金币</strong></span>' +
          '</section>' +
          '<p class="resource-exchange-message' + (model.isError ? ' is-error' : '') + '">' + escapeHtml(message) + '</p>' +
          '<footer><button type="button" data-exchange-action="close">取消</button>' +
          '<button type="button" data-exchange-action="confirm"' + (!quote.canExchange ? ' disabled' : '') + '>确认兑换</button></footer>' +
        '</article>';
    }

    function currency(src, label, value) {
      return '<div class="resource-exchange-currency"><img src="' + escapeAttr(src) + '" alt=""><span><small>' + label + '</small><strong>' + value + '</strong></span></div>';
    }

    function preset(value) {
      return '<button type="button" data-exchange-action="preset" data-exchange-amount="' + value + '">' + value + '</button>';
    }

    return { render: render, clear: function clear() { if (mount) mount.innerHTML = ""; } };
  }

  function format(value) { return Math.max(0, Math.floor(Number(value) || 0)).toLocaleString("zh-CN"); }
  function escapeHtml(value) { return String(value == null ? "" : value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;"); }
  function escapeAttr(value) { return escapeHtml(value); }

  scope.resourceExchangeView = { create: create };
  if (typeof module !== "undefined" && module.exports) module.exports = scope.resourceExchangeView;
})(typeof globalThis !== "undefined" ? globalThis : window);
