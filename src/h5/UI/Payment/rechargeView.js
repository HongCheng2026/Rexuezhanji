(function registerRechargeView(root) {
  "use strict";

  var scope = root.RXGame || (root.RXGame = {});

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function formatMoney(amountMinor, currency) {
    var amount = (Math.max(0, Math.floor(Number(amountMinor) || 0)) / 100).toFixed(2);
    return currency === "CNY" ? "¥" + amount.replace(/\.00$/, "") : "$" + amount;
  }

  function rewardLabel(reward) {
    if (!reward) return "";
    var amount = Math.max(0, Math.floor(Number(reward.amount) || 0));
    if (reward.type === "diamonds") return amount + " 钻石";
    var names = {
      stamina_potion: "体力药水",
      starlink_ticket: "星链研究券",
      auto_weapon_module_gold: "自动武器核心"
    };
    return (names[reward.itemId] || reward.itemId || "道具") + " ×" + amount;
  }

  function productCard(offer, disabled) {
    var rewards = (offer.rewards || []).map(rewardLabel).filter(Boolean);
    var first = offer.firstPurchaseAvailable && (offer.firstBonusRewards || []).length
      ? '<span class="recharge-center__bonus">首充加赠 ' + escapeHtml((offer.firstBonusRewards || []).map(rewardLabel).join("、")) + '</span>'
      : "";
    var soldOut = Boolean(offer.soldOut);
    return '<article class="recharge-center__offer' + (soldOut ? ' is-sold-out' : '') + '">' +
      '<header><span>' + (offer.type === "bundle" ? "LIMITED SUPPLY" : "DIAMOND SUPPLY") + '</span><h3>' + escapeHtml(offer.title) + '</h3></header>' +
      '<div class="recharge-center__crystal" aria-hidden="true"><i></i><b>' + escapeHtml((offer.rewards || []).filter(function (item) { return item.type === "diamonds"; }).map(function (item) { return item.amount; })[0] || "+") + '</b></div>' +
      '<p>' + escapeHtml(rewards.join("、")) + '</p>' + first +
      '<button type="button" data-payment-action="buy" data-offer-id="' + escapeHtml(offer.offerId) + '"' + (disabled || soldOut ? ' disabled' : '') + '>' +
        (soldOut ? "已购买" : formatMoney(offer.amountMinor, offer.currency)) +
      '</button>' +
    '</article>';
  }

  function qrMarkup(codeUrl) {
    if (!codeUrl || typeof root.qrcode !== "function") return "";
    try {
      var qr = root.qrcode(0, "M");
      qr.addData(codeUrl, "Byte");
      qr.make();
      return qr.createSvgTag({ cellSize: 5, margin: 4, scalable: true });
    } catch (error) {
      return "";
    }
  }

  function create(options) {
    options = options || {};
    var dom = options.dom || {};

    function render(model) {
      model = model || {};
      var mount = dom.featurePanelSlots;
      if (!mount) return false;
      var offers = (model.offers || []).filter(function (offer) { return offer.type === model.productType; });
      var eligibility = model.eligibility || {};
      var disabled = model.localMode || model.loading || !model.enabled || !eligibility.eligible;
      var reason = model.localMode
        ? "充值需连接云端，本地存档不会模拟付款或发货。"
        : model.loading ? "正在读取服务端商品目录……"
        : eligibility.reason || (!model.enabled ? "当前支付渠道尚未开放。" : "账户已通过付费校验。");
      var statusClass = model.error ? " is-error" : model.success ? " is-success" : "";
      mount.className = "feature-panel-room-content recharge-center";
      mount.innerHTML =
        '<section class="recharge-center__shell" aria-label="充值中心">' +
          '<header class="recharge-center__hero"><div><span>CRYSTAL REQUISITION</span><h2>战备充值中心</h2><p>价格与奖励以服务端快照为准，付款成功后统一查单发货。</p></div>' +
            '<div class="recharge-center__wallet"><small>当前钻石</small><strong>' + escapeHtml(model.diamonds || 0) + '</strong></div></header>' +
          '<nav class="recharge-center__markets" aria-label="支付地区">' +
            '<button type="button" data-payment-action="market" data-market="CN" aria-pressed="' + (model.market === "CN") + '" class="' + (model.market === "CN" ? "is-active" : "") + '"><b>微信支付</b><small>中国大陆 · CNY</small></button>' +
            '<button type="button" data-payment-action="market" data-market="GLOBAL" aria-pressed="' + (model.market === "GLOBAL") + '" class="' + (model.market === "GLOBAL" ? "is-active" : "") + '"><b>PayPal</b><small>Global · USD</small></button>' +
          '</nav>' +
          '<div class="recharge-center__toolbar"><div role="tablist" aria-label="商品类型">' +
            '<button role="tab" type="button" data-payment-action="type" data-product-type="diamonds" aria-selected="' + (model.productType === "diamonds") + '" class="' + (model.productType === "diamonds" ? "is-active" : "") + '">钻石直充</button>' +
            '<button role="tab" type="button" data-payment-action="type" data-product-type="bundle" aria-selected="' + (model.productType === "bundle") + '" class="' + (model.productType === "bundle" ? "is-active" : "") + '">限购礼包</button>' +
          '</div><button type="button" class="recharge-center__refresh" data-payment-action="refresh" aria-label="刷新充值状态">刷新</button></div>' +
          '<p class="recharge-center__eligibility' + (!eligibility.eligible || model.localMode ? ' is-blocked' : '') + '"><i aria-hidden="true"></i><span>' + escapeHtml(reason) + '</span>' +
            (!model.localMode && eligibility.code === "EMAIL_VERIFICATION_REQUIRED" ? '<button type="button" data-payment-action="account">去绑定邮箱</button>' : '') + '</p>' +
          '<div class="recharge-center__offers" role="tabpanel">' + (offers.length ? offers.map(function (offer) { return productCard(offer, disabled); }).join("") : '<p class="recharge-center__empty">' + (model.loading ? "正在装载商品……" : "当前分类暂无可用商品。") + '</p>') + '</div>' +
          '<footer class="recharge-center__notice"><span>安全提示</span><p>不根据前端跳转结果发奖；页面刷新或回调延迟时会继续查询订单。退款后首充和礼包资格不恢复。</p></footer>' +
          '<p class="recharge-center__status' + statusClass + '" role="status" aria-live="polite">' + escapeHtml(model.status || "") + '</p>' +
        '</section>' +
        (model.qrCodeUrl ? '<section class="recharge-center__modal" role="dialog" aria-modal="true" aria-label="微信扫码支付"><div class="recharge-center__backdrop" data-payment-action="cancel"></div><article><small>WECHAT PAY</small><h3>微信扫码支付</h3><div class="recharge-center__qr">' + qrMarkup(model.qrCodeUrl) + '</div><p>请使用微信扫码完成付款，不要关闭当前页面。</p><button type="button" data-payment-action="cancel">取消等待</button></article></section>' : '');
      return true;
    }

    return { render: render };
  }

  scope.rechargeView = { create: create, formatMoney: formatMoney, rewardLabel: rewardLabel };
  if (typeof module !== "undefined" && module.exports) module.exports = scope.rechargeView;
})(typeof globalThis !== "undefined" ? globalThis : window);
