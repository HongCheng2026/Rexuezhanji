(function registerShopView(root) {
  "use strict";
  // ── 商店视图与领取逻辑（独立模块，自包含） ──
  // 从 FeaturePanels 抽离，自带 tab 状态与少量 helper 副本，
  // 仅依赖 scope.shopConfig（数据）与 scope.assets（图标），不直接耦合 FeaturePanels。
  var scope = root.RXGame || (root.RXGame = {});

  var shopTabs = ["金币", "钻石", "兑换"];
  var shopActiveTab = "金币";

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch];
    });
  }
  function escapeAttr(value) { return escapeHtml(value); }

  function formatNumber(value) {
    var number = Math.max(0, Math.floor(Number(value) || 0));
    return String(number).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  function localDateKey(date) {
    date = date || new Date();
    return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
  }

  // 简单稳定周键：取本周四所在年份 + 周序号（与本地日期挂钩即可，用于周限购去重）。
  function isoWeekString(date) {
    date = date || new Date();
    var d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    var day = (d.getDay() + 6) % 7; // 周一=0
    d.setDate(d.getDate() - day + 3); // 本周四
    var firstThursday = new Date(d.getFullYear(), 0, 4);
    var firstDay = (firstThursday.getDay() + 6) % 7;
    firstThursday.setDate(4 - firstDay);
    var week = 1 + Math.round((d - firstThursday) / (7 * 24 * 3600 * 1000));
    return d.getFullYear() + "-W" + String(week).padStart(2, "0");
  }

  function applyRewards(profile, rewards) {
    profile.resources = profile.resources || {};
    profile.resources.inventory = profile.resources.inventory || {};
    for (var i = 0; i < (rewards || []).length; i++) {
      var reward = rewards[i];
      var amount = Math.max(0, Math.floor(Number(reward.amount) || 0));
      if (reward.type === "gold") {
        profile.resources.gold = Math.max(0, Math.floor(Number(profile.resources.gold || profile.coins || 0) + amount));
        profile.coins = profile.resources.gold;
      } else if (reward.type === "diamonds") {
        profile.resources.diamonds = Math.max(0, Math.floor(Number(profile.resources.diamonds || 0) + amount));
      } else if (reward.type === "energy") {
        profile.resources.energy = Math.max(0, Math.floor(Number(profile.resources.energy || 0) + amount));
      } else if (reward.type === "item") {
        var id = reward.itemId || "item";
        profile.resources.inventory[id] = Math.max(0, Math.floor(Number(profile.resources.inventory[id]) || 0) + amount);
      }
    }
  }

  function addUnique(list, id) {
    list = Array.isArray(list) ? list : [];
    if (list.indexOf(id) < 0) list.push(id);
    return list;
  }

  function getCurrencyIcon(currency, assets) {
    var hudAssets = assets && assets.UI_A_HUD_ASSETS || scope.assets && scope.assets.UI_A_HUD_ASSETS || {};
    return currency === "gold" ? hudAssets.resourceGoldIcon || "" : hudAssets.resourceDiamondIcon || "";
  }

  function renderCurrencyIcon(currency, assets) {
    var src = getCurrencyIcon(currency, assets);
    var className = currency === "gold" ? "gold" : "diamond";
    return src
      ? '<img class="shop-currency-icon ' + className + '" src="' + escapeAttr(src) + '" alt="" aria-hidden="true">'
      : '<i class="' + className + '" aria-hidden="true"></i>';
  }

  function renderExchangeTabIcon(assets) {
    var hudAssets = assets && assets.UI_A_HUD_ASSETS || scope.assets && scope.assets.UI_A_HUD_ASSETS || {};
    var src = hudAssets.menuShopIcon || "";
    return src
      ? '<img class="shop-currency-icon exchange" src="' + escapeAttr(src) + '" alt="" aria-hidden="true">'
      : '<i class="exchange" aria-hidden="true">⇄</i>';
  }

  function renderV3Resources(profile, assets) {
    var resources = profile && profile.resources || {};
    var gold = resources.gold != null ? resources.gold : profile && profile.coins || 0;
    var diamonds = resources.diamonds || 0;
    return '<div class="feature-panel-resources">' +
      '<span>' + renderCurrencyIcon("gold", assets) + '金币 <b>' + formatNumber(gold) + '</b></span>' +
      '<span>' + renderCurrencyIcon("diamonds", assets) + '钻石 <b>' + formatNumber(diamonds) + '</b></span>' +
    '</div>';
  }

  function renderFeatureTabs(panelKey, tabs, active, assets) {
    var html = '<nav class="feature-tabbar" aria-label="分类">';
    for (var i = 0; i < tabs.length; i++) {
      var isExchange = tabs[i] === "兑换";
      var currencyClass = isExchange ? " shop-tab-exchange" : tabs[i] === "钻石" ? " shop-tab-diamond" : " shop-tab-gold";
      var currency = tabs[i] === "钻石" ? "diamonds" : "gold";
      html += '<button type="button" class="' + (tabs[i] === active ? "active" : "") + currencyClass + '" data-feature-tab="' + escapeAttr(tabs[i]) + '" data-feature-tab-index="' + i + '" data-feature-panel="' + escapeAttr(panelKey) + '">' +
        (isExchange ? renderExchangeTabIcon(assets) : renderCurrencyIcon(currency, assets)) + '<span>' + escapeHtml(tabs[i]) + '</span></button>';
    }
    return html + '</nav>';
  }

  function getShopImage(item, assets) {
    var map = (assets && assets.SHOP_ITEM_ASSETS) || (scope.assets && scope.assets.SHOP_ITEM_ASSETS) || {};
    return map[item && item.image] || "";
  }

  function getInventoryAmount(profile, itemId) {
    var inventory = profile && profile.resources && profile.resources.inventory || {};
    return Math.max(0, Math.floor(Number(inventory[itemId]) || 0));
  }

  function getPriceCurrencyLabel(item) {
    if (item && item.priceCurrency === "item") return item.priceItemTitle || "兑换物资";
    return item && item.priceCurrency === "gold" ? "金币" : "钻石";
  }

  function getPriceCurrencyClass(item) {
    if (item && item.priceCurrency === "item") return "is-exchange";
    return item && item.priceCurrency === "gold" ? "is-gold" : "is-diamond";
  }

  function renderPriceCurrencyIcon(item, assets) {
    if (item && item.priceCurrency === "item") {
      var src = getShopImage({ image: item.priceItemImage }, assets);
      return src ? '<img class="shop-price-item-icon" src="' + escapeAttr(src) + '" alt="" aria-hidden="true">' : '';
    }
    return renderCurrencyIcon(item && item.priceCurrency, assets);
  }

  function getPurchaseBalance(profile, item) {
    if (item && item.priceCurrency === "item") return getInventoryAmount(profile, item.priceItemId);
    return getCurrencyBalance(profile, item && item.priceCurrency);
  }

  // 计算单个商品在当前档案下的购买状态：已购次数、是否售罄、当前档位价。
  function getItemState(profile, item) {
    profile = profile || {};
    var dailyPurchases = profile.shopDailyPurchases || {};
    var weeklyPurchases = profile.shopWeeklyPurchases || {};
    var dateKey = localDateKey();
    var weekKey = isoWeekString();
    var legacyWeekKey = weekKey.replace("-W", "-");
    var dailyCount = (dailyPurchases[dateKey] || {})[item.id] || 0;
    var weeklyCount = Math.max(
      (weeklyPurchases[weekKey] || {})[item.id] || 0,
      (weeklyPurchases[legacyWeekKey] || {})[item.id] || 0
    );
    var count = item.limitType === "daily" ? dailyCount : item.limitType === "weekly" ? weeklyCount : 0;
    var soldOut = (item.limit || 0) > 0 && count >= (item.limit || 0);
    var price = item.priceAmount;
    if (item.priceTiers && item.priceTiers.length) price = item.priceTiers[Math.min(count, item.priceTiers.length - 1)];
    return { count: count, soldOut: soldOut, price: price };
  }

  function renderShopCard(item, assets, state, profile) {
    var img = getShopImage(item, assets);
    var priceLabel = formatNumber(state.price) + " " + getPriceCurrencyLabel(item);
    var buttonLabel = state.soldOut ? (item.limitType === "daily" ? "今日已售罄" : "本周已售罄") : "购买";
    var limitLabel = item.limit
      ? (item.limitType === "daily" ? "今日" : "本周") + " " + formatNumber(state.count) + "/" + formatNumber(item.limit)
      : "";
    var ownedLabel = item.priceCurrency === "item"
      ? '<span class="shop-item-owned">持有 <b>' + formatNumber(getPurchaseBalance(profile || {}, item)) + '</b></span>'
      : '';
    var currencyClass = " " + getPriceCurrencyClass(item);
    return '<article class="shop-item-card' + currencyClass + (state.soldOut ? " is-soldout" : "") + '">' +
      '<div class="shop-item-art">' + (img ? '<img src="' + escapeAttr(img) + '" alt="' + escapeAttr(item.title) + '">' : '<span aria-hidden="true"></span>') + '</div>' +
      '<div class="shop-item-copy"><strong>' + escapeHtml(item.title) + '</strong><p>' + escapeHtml(item.description || "战备物资") + '</p></div>' +
      '<div class="shop-item-price"><em>' + renderPriceCurrencyIcon(item, assets) + '<span>' + escapeHtml(priceLabel) + '</span></em>' + (limitLabel ? '<small>' + escapeHtml(limitLabel) + '</small>' : '') + '</div>' +
      '<div class="shop-item-actions">' + ownedLabel + '<button type="button" aria-label="购买' + escapeAttr(item.title) + '" data-shop-buy="' + escapeAttr(item.id) + '"' + (state.soldOut ? ' disabled' : '') + '>' + buttonLabel + '</button></div>' +
    '</article>';
  }

  function multiplyRewards(rewards, quantity) {
    quantity = Math.max(1, Math.floor(Number(quantity) || 1));
    return (rewards || []).map(function (reward) {
      return Object.assign({}, reward, { amount: Math.max(0, Math.floor(Number(reward.amount) || 0)) * quantity });
    });
  }

  function getCurrencyBalance(profile, currency) {
    var resources = profile && profile.resources || {};
    return currency === "gold"
      ? Math.max(0, Math.floor(Number(resources.gold != null ? resources.gold : profile && profile.coins) || 0))
      : Math.max(0, Math.floor(Number(resources.diamonds) || 0));
  }

  function getPurchaseQuote(profile, item, requestedQuantity) {
    if (!item) return { quantity: 0, maxQuantity: 0, totalPrice: 0, affordable: false, rewards: [] };
    var state = getItemState(profile || {}, item);
    var balance = getPurchaseBalance(profile || {}, item);
    var remaining = (item.limit || 0) > 0 ? Math.max(0, item.limit - state.count) : (item.batchable ? 99 : 1);
    if (item.priceCurrency === "item") {
      remaining = Math.min(remaining, Math.floor(balance / Math.max(1, Math.floor(Number(item.priceAmount) || 1))));
    }
    var maxQuantity = item.batchable ? Math.min(99, remaining) : Math.min(1, remaining);
    var quantity = maxQuantity > 0 ? Math.max(1, Math.min(maxQuantity, Math.floor(Number(requestedQuantity) || 1))) : 0;
    var totalPrice = 0;
    for (var i = 0; i < quantity; i++) {
      totalPrice += item.priceTiers && item.priceTiers.length
        ? item.priceTiers[Math.min(state.count + i, item.priceTiers.length - 1)]
        : Math.max(0, Math.floor(Number(item.priceAmount) || 0));
    }
    return {
      quantity: quantity,
      maxQuantity: maxQuantity,
      unitPrice: state.price,
      totalPrice: totalPrice,
      priceCurrency: item.priceCurrency,
      balance: balance,
      affordable: quantity > 0 && balance >= totalPrice,
      rewards: multiplyRewards(item.rewards, quantity || 1),
      count: state.count,
      soldOut: state.soldOut
    };
  }

  // 等价兑换目录：以「交出物资 → 获得物资」为键，给对话框与结果页提供展示元数据。
  function getExchangeCatalog() {
    var catalog = {};
    var items = (scope.shopConfig && scope.shopConfig.SHOP_CONTENT) || [];
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      if (item.priceCurrency !== "item" || !item.priceItemId) continue;
      var reward = item.rewards && item.rewards[0];
      if (reward && reward.itemId) catalog[reward.itemId] = { id: reward.itemId, title: item.title, image: item.image };
      catalog[item.priceItemId] = { id: item.priceItemId, title: item.priceItemTitle || item.title, image: item.priceItemImage || item.image };
    }
    return catalog;
  }

  function getExchangeItem(itemId) {
    return getExchangeCatalog()[itemId] || null;
  }

  // 等价兑换报价：fromItemId 为兑换商品的 id（如 exchange_sss_fighter_module）。
  function getExchangeQuote(profile, fromItemId, requestedQuantity) {
    var exchangeItem = scope.shopConfig && scope.shopConfig.getShopItem ? scope.shopConfig.getShopItem(fromItemId) : null;
    if (!exchangeItem || exchangeItem.priceCurrency !== "item") {
      return { quantity: 0, maxQuantity: 0, canExchange: false, fromItem: null, toItem: null };
    }
    var reward = exchangeItem.rewards && exchangeItem.rewards[0];
    var catalog = getExchangeCatalog();
    var fromItem = catalog[exchangeItem.priceItemId] || null;
    var toItem = reward ? catalog[reward.itemId] || null : null;
    if (!fromItem || !toItem) {
      return { quantity: 0, maxQuantity: 0, canExchange: false, fromItem: fromItem, toItem: toItem };
    }
    profile = profile || {};
    var pricePerSwap = Math.max(1, Math.floor(Number(exchangeItem.priceAmount) || 1));
    var gainPerSwap = reward ? Math.max(1, Math.floor(Number(reward.amount) || 1)) : 1;
    var sourceCount = getInventoryAmount(profile, exchangeItem.priceItemId);
    var targetCount = getInventoryAmount(profile, reward.itemId);
    var maxSwaps = Math.floor(sourceCount / pricePerSwap);
    var maxQuantity = Math.max(0, Math.min(99, maxSwaps));
    var quantity = maxQuantity > 0 ? Math.max(1, Math.min(maxQuantity, Math.floor(Number(requestedQuantity) || 1))) : 0;
    var spendQuantity = quantity * pricePerSwap;
    var gainQuantity = quantity * gainPerSwap;
    return {
      fromItem: fromItem,
      toItem: toItem,
      sourceCount: sourceCount,
      targetCount: targetCount,
      pricePerSwap: pricePerSwap,
      gainPerSwap: gainPerSwap,
      quantity: quantity,
      maxQuantity: maxQuantity,
      spendQuantity: spendQuantity,
      gainQuantity: gainQuantity,
      canExchange: quantity > 0 && sourceCount >= spendQuantity
    };
  }

  // 本地购买：校验货币 / 限购 / 自定义确认后一次性扣费并发放奖励。
  function buyShopItem(profile, itemId, options) {
    options = options || {};
    var item = (scope.shopConfig && scope.shopConfig.getShopItem) ? scope.shopConfig.getShopItem(itemId) : null;
    if (!item) return { ok: false, reason: "SHOP_ITEM_NOT_FOUND", itemId: itemId };
    var dateKey = localDateKey();
    var weekKey = isoWeekString();
    var legacyWeekKey = weekKey.replace("-W", "-");
    var dailyPurchases = profile.shopDailyPurchases || {};
    var weeklyPurchases = profile.shopWeeklyPurchases || {};
    var dailyMap = dailyPurchases[dateKey] || {};
    var weeklyMap = weeklyPurchases[weekKey] || {};
    var legacyWeeklyMap = weeklyPurchases[legacyWeekKey] || {};

    var count = item.limitType === "daily" ? (dailyMap[item.id] || 0)
      : item.limitType === "weekly" ? Math.max(weeklyMap[item.id] || 0, legacyWeeklyMap[item.id] || 0) : 0;
    var quantity = item.batchable ? Math.max(1, Math.min(99, Math.floor(Number(options.quantity) || 1))) : 1;
    if ((item.limit || 0) > 0 && count + quantity > (item.limit || 0)) {
      return { ok: false, reason: "LIMIT_REACHED", itemId: item.id };
    }

    var quote = getPurchaseQuote(profile, item, quantity);
    if (item.priceCurrency === "item" && quote.quantity < quantity) {
      return { ok: false, reason: "PRICE_ITEM_NOT_ENOUGH", itemId: item.id, priceItemId: item.priceItemId };
    }
    var price = quote.totalPrice;
    var currentGold = getCurrencyBalance(profile, "gold");
    var currentDiamonds = getCurrencyBalance(profile, "diamonds");

    if (item.priceCurrency === "gold") {
      if (currentGold < price) return { ok: false, reason: "GOLD_NOT_ENOUGH", itemId: item.id };
    } else if (item.priceCurrency === "diamonds") {
      if (currentDiamonds < price) return { ok: false, reason: "DIAMONDS_NOT_ENOUGH", itemId: item.id };
    } else if (item.priceCurrency === "item") {
      if (!item.priceItemId || getInventoryAmount(profile, item.priceItemId) < price) {
        return { ok: false, reason: "PRICE_ITEM_NOT_ENOUGH", itemId: item.id, priceItemId: item.priceItemId };
      }
    } else {
      return { ok: false, reason: "UNSUPPORTED_CURRENCY", itemId: item.id };
    }

    if (item.confirm && options.confirmed !== true) {
      if (typeof options.confirm !== "function") return { ok: false, reason: "CONFIRM_REQUIRED", itemId: item.id };
      if (!options.confirm("确认购买 " + item.title + "？")) return { ok: false, reason: "USER_CANCELLED", itemId: item.id };
    }

    profile.resources = profile.resources || {};
    profile.resources.inventory = profile.resources.inventory || {};
    var resources = profile.resources;
    resources.gold = currentGold;
    resources.coins = currentGold;
    resources.diamonds = currentDiamonds;
    resources.maxEnergy = Math.max(0, Math.floor(Number(resources.maxEnergy) || 0));
    resources.energy = Math.max(0, Math.floor(Number(resources.energy) || 0));
    profile.shopDailyPurchases = dailyPurchases;
    profile.shopWeeklyPurchases = weeklyPurchases;
    dailyMap = profile.shopDailyPurchases[dateKey] = dailyMap;
    weeklyMap = profile.shopWeeklyPurchases[weekKey] = weeklyMap;

    if (item.priceCurrency === "gold") {
      resources.gold -= price;
      resources.coins = resources.gold;
    } else if (item.priceCurrency === "diamonds") {
      resources.diamonds -= price;
    } else if (item.priceCurrency === "item") {
      resources.inventory[item.priceItemId] = getInventoryAmount(profile, item.priceItemId) - price;
    }

    var grantedRewards = multiplyRewards(item.rewards, quantity);
    applyRewards(profile, grantedRewards);

    if (item.limitType === "daily") dailyMap[item.id] = count + quantity;
    else if (item.limitType === "weekly") weeklyMap[item.id] = count + quantity;

    return {
      ok: true,
      itemId: item.id,
      price: price,
      unitPrice: quote.unitPrice,
      priceCurrency: item.priceCurrency,
      priceItemId: item.priceItemId || null,
      quantity: quantity,
      rewards: grantedRewards,
      title: item.title,
      image: item.image
    };
  }

  function closePurchaseDialog(container) {
    if (!container || !container.querySelector) return false;
    var modal = container.querySelector(".shop-purchase-modal");
    if (!modal || !modal.parentNode) return false;
    modal.parentNode.removeChild(modal);
    return true;
  }

  function openPurchaseDialog(container, profile, itemId, assets) {
    if (!container || typeof document === "undefined") return false;
    var item = scope.shopConfig && scope.shopConfig.getShopItem ? scope.shopConfig.getShopItem(itemId) : null;
    if (!item) return false;
    closePurchaseDialog(container);

    var modal = document.createElement("section");
    modal.className = "shop-purchase-modal is-selection";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-label", "确认购买 " + item.title);
    var image = getShopImage(item, assets);
    var currencyLabel = getPriceCurrencyLabel(item);
    var priceCurrencyIcon = renderPriceCurrencyIcon(item, assets);
    var initialQuote = getPurchaseQuote(profile, item, 1);
    modal.innerHTML =
      '<div class="shop-purchase-backdrop" data-shop-dialog-close></div>' +
      '<div class="shop-purchase-panel" tabindex="-1">' +
        '<header class="shop-purchase-heading"><div><span>SHOP PROCUREMENT</span><h3>确认购买</h3><p>核对商品与支付信息</p></div><button type="button" data-shop-dialog-close aria-label="关闭购买窗口">×</button></header>' +
        '<section class="shop-purchase-product">' +
          (image ? '<img src="' + escapeAttr(image) + '" alt="' + escapeAttr(item.title) + '">' : '<span class="shop-purchase-placeholder" aria-hidden="true"></span>') +
          '<div><small>战备物资</small><strong>' + escapeHtml(item.title) + '</strong><p>' + escapeHtml(item.description || "战备物资") + '</p></div>' +
        '</section>' +
        (item.batchable ? '<section class="shop-purchase-quantity" aria-label="选择购买数量"><span>购买数量</span><div class="shop-quantity-stepper"><button type="button" data-shop-quantity-minus aria-label="减少购买数量">−</button><input type="number" inputmode="numeric" aria-label="购买数量" data-shop-quantity-input><button type="button" data-shop-quantity-plus aria-label="增加购买数量">＋</button></div><button type="button" data-shop-quantity-max>最大</button></section>' : '') +
        '<section class="shop-purchase-summary">' +
          '<div><small>当前持有</small><strong>' + priceCurrencyIcon + '<span data-shop-balance></span></strong></div>' +
          '<i aria-hidden="true"></i>' +
          '<div><small>购买数量</small><strong data-shop-selected-quantity></strong></div>' +
          '<i aria-hidden="true"></i>' +
          '<div><small>合计支付</small><strong class="shop-purchase-total ' + getPriceCurrencyClass(item) + '">' + priceCurrencyIcon + '<span data-shop-total></span></strong></div>' +
        '</section>' +
        '<p class="shop-purchase-status" data-shop-purchase-status role="status"></p>' +
        '<footer class="shop-purchase-actions"><button type="button" class="secondary" data-shop-dialog-close>取消</button><button type="button" class="primary" data-shop-buy="' + escapeAttr(item.id) + '" data-shop-confirmed="true" data-shop-quantity="1">确认购买</button></footer>' +
      '</div>';
    container.appendChild(modal);

    var input = modal.querySelector("[data-shop-quantity-input]");
    var minus = modal.querySelector("[data-shop-quantity-minus]");
    var plus = modal.querySelector("[data-shop-quantity-plus]");
    var maxButton = modal.querySelector("[data-shop-quantity-max]");
    var confirmButton = modal.querySelector('[data-shop-buy="' + item.id + '"]');
    var status = modal.querySelector("[data-shop-purchase-status]");
    if (input) {
      input.min = initialQuote.maxQuantity > 0 ? "1" : "0";
      input.max = String(initialQuote.maxQuantity);
    }

    function update(nextQuantity) {
      var quote = getPurchaseQuote(profile, item, nextQuantity);
      if (input) input.value = String(quote.quantity);
      if (minus) minus.disabled = quote.quantity <= 1;
      if (plus) plus.disabled = quote.quantity >= quote.maxQuantity;
      if (maxButton) maxButton.disabled = quote.maxQuantity <= 0 || quote.quantity >= quote.maxQuantity;
      modal.querySelector("[data-shop-balance]").textContent = formatNumber(quote.balance) + " " + currencyLabel;
      modal.querySelector("[data-shop-selected-quantity]").textContent = "×" + formatNumber(quote.quantity);
      modal.querySelector("[data-shop-total]").textContent = formatNumber(quote.totalPrice) + " " + currencyLabel;
      confirmButton.dataset.shopQuantity = String(quote.quantity);
      confirmButton.dataset.available = quote.affordable ? "true" : "false";
      confirmButton.disabled = !quote.affordable;
      if (item.priceCurrency === "item" && quote.maxQuantity <= 0) status.textContent = currencyLabel + "不足，暂时无法购买。";
      else if (quote.soldOut || quote.maxQuantity <= 0) status.textContent = "当前商品已达到购买上限。";
      else if (!quote.affordable) status.textContent = currencyLabel + "不足，请调整数量。";
      else status.textContent = item.batchable ? "可购买 1–" + formatNumber(quote.maxQuantity) + " 件。" : "确认后将立即完成支付。";
    }

    modal.addEventListener("click", function handleDialogClick(event) {
      if (event.target && event.target.closest && event.target.closest("[data-shop-dialog-close]")) {
        if (modal.dataset.pending !== "true") closePurchaseDialog(container);
        return;
      }
      if (event.target && event.target.closest && event.target.closest("[data-shop-quantity-minus]")) update(Number(input && input.value) - 1);
      else if (event.target && event.target.closest && event.target.closest("[data-shop-quantity-plus]")) update(Number(input && input.value) + 1);
      else if (event.target && event.target.closest && event.target.closest("[data-shop-quantity-max]")) update(initialQuote.maxQuantity);
    });
    if (input) input.addEventListener("change", function () { update(input.value); });
    modal.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && modal.dataset.pending !== "true") closePurchaseDialog(container);
    });
    update(1);
    if (input) input.focus();
    else confirmButton.focus();
    return true;
  }

  function openExchangeDialog(container, profile, fromItemId, assets) {
    if (!container || typeof document === "undefined") return false;
    var initialQuote = getExchangeQuote(profile, fromItemId, 1);
    if (!initialQuote.fromItem || !initialQuote.toItem) return false;
    closePurchaseDialog(container);

    var fromImage = getShopImage(initialQuote.fromItem, assets);
    var toImage = getShopImage(initialQuote.toItem, assets);
    var modal = document.createElement("section");
    modal.className = "shop-purchase-modal is-exchange-selection";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-label", "等价兑换 " + initialQuote.fromItem.title + " 为 " + initialQuote.toItem.title);
    modal.innerHTML =
      '<div class="shop-purchase-backdrop" data-shop-dialog-close></div>' +
      '<div class="shop-purchase-panel shop-exchange-dialog" tabindex="-1">' +
        '<header class="shop-purchase-heading"><div><span>EQUIVALENT EXCHANGE</span><h3>确认兑换</h3><p>稀有物资按固定比例互换</p></div><button type="button" data-shop-dialog-close aria-label="关闭兑换窗口">×</button></header>' +
        '<section class="shop-exchange-dialog-pair">' +
          '<figure>' + (fromImage ? '<img src="' + escapeAttr(fromImage) + '" alt="' + escapeAttr(initialQuote.fromItem.title) + '">' : '') + '<figcaption><small>交出</small><strong>' + escapeHtml(initialQuote.fromItem.title) + '</strong><span>持有 ' + formatNumber(initialQuote.sourceCount) + '</span></figcaption></figure>' +
          '<div><strong>1 : 1</strong><i aria-hidden="true">→</i><small>等价兑换</small></div>' +
          '<figure>' + (toImage ? '<img src="' + escapeAttr(toImage) + '" alt="' + escapeAttr(initialQuote.toItem.title) + '">' : '') + '<figcaption><small>获得</small><strong>' + escapeHtml(initialQuote.toItem.title) + '</strong><span>持有 ' + formatNumber(initialQuote.targetCount) + '</span></figcaption></figure>' +
        '</section>' +
        '<section class="shop-purchase-quantity" aria-label="选择兑换数量"><span>兑换数量</span><div class="shop-quantity-stepper"><button type="button" data-shop-quantity-minus aria-label="减少兑换数量">−</button><input type="number" inputmode="numeric" aria-label="兑换数量" data-shop-quantity-input><button type="button" data-shop-quantity-plus aria-label="增加兑换数量">＋</button></div><button type="button" data-shop-quantity-max>最大</button></section>' +
        '<section class="shop-exchange-dialog-summary"><span>交出 <b data-shop-exchange-spend></b></span><i aria-hidden="true">→</i><span>获得 <b data-shop-exchange-gain></b></span></section>' +
        '<p class="shop-purchase-status" data-shop-exchange-status role="status"></p>' +
        '<footer class="shop-purchase-actions"><button type="button" class="secondary" data-shop-dialog-close>取消</button><button type="button" class="primary" data-shop-exchange="' + escapeAttr(fromItemId) + '" data-shop-exchange-confirmed="true" data-shop-quantity="1">确认兑换</button></footer>' +
      '</div>';
    container.appendChild(modal);

    var input = modal.querySelector("[data-shop-quantity-input]");
    var minus = modal.querySelector("[data-shop-quantity-minus]");
    var plus = modal.querySelector("[data-shop-quantity-plus]");
    var maxButton = modal.querySelector("[data-shop-quantity-max]");
    var confirmButton = modal.querySelector("[data-shop-exchange]");
    var status = modal.querySelector("[data-shop-exchange-status]");
    input.min = initialQuote.maxQuantity > 0 ? "1" : "0";
    input.max = String(initialQuote.maxQuantity);

    function update(nextQuantity) {
      var quote = getExchangeQuote(profile, fromItemId, nextQuantity);
      input.value = String(quote.quantity);
      minus.disabled = quote.quantity <= 1;
      plus.disabled = quote.quantity >= quote.maxQuantity;
      maxButton.disabled = quote.maxQuantity <= 0 || quote.quantity >= quote.maxQuantity;
      modal.querySelector("[data-shop-exchange-spend]").textContent = quote.fromItem.title + " ×" + formatNumber(quote.quantity);
      modal.querySelector("[data-shop-exchange-gain]").textContent = quote.toItem.title + " ×" + formatNumber(quote.quantity);
      confirmButton.dataset.shopQuantity = String(quote.quantity);
      confirmButton.dataset.available = quote.canExchange ? "true" : "false";
      confirmButton.disabled = !quote.canExchange;
      status.textContent = quote.canExchange
        ? "可兑换 1–" + formatNumber(quote.maxQuantity) + " 件；确认后不可撤回。"
        : "当前没有可用于兑换的" + quote.fromItem.title + "。";
    }

    modal.addEventListener("click", function handleExchangeDialogClick(event) {
      if (event.target && event.target.closest && event.target.closest("[data-shop-dialog-close]")) {
        if (modal.dataset.pending !== "true") closePurchaseDialog(container);
        return;
      }
      if (event.target && event.target.closest && event.target.closest("[data-shop-quantity-minus]")) update(Number(input.value) - 1);
      else if (event.target && event.target.closest && event.target.closest("[data-shop-quantity-plus]")) update(Number(input.value) + 1);
      else if (event.target && event.target.closest && event.target.closest("[data-shop-quantity-max]")) update(initialQuote.maxQuantity);
    });
    input.addEventListener("change", function () { update(input.value); });
    modal.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && modal.dataset.pending !== "true") closePurchaseDialog(container);
    });
    update(1);
    input.focus();
    return true;
  }

  function setExchangeDialogPending(container, pending) {
    if (!container || !container.querySelector) return false;
    var modal = container.querySelector(".shop-purchase-modal.is-exchange-selection");
    if (!modal) return false;
    modal.dataset.pending = pending ? "true" : "false";
    var controls = modal.querySelectorAll("button, input");
    for (var i = 0; i < controls.length; i++) controls[i].disabled = Boolean(pending);
    var confirmButton = modal.querySelector("[data-shop-exchange]");
    if (confirmButton) {
      confirmButton.textContent = pending ? "兑换处理中…" : "确认兑换";
      if (!pending && confirmButton.dataset.available !== "true") confirmButton.disabled = true;
    }
    return true;
  }

  function setExchangeDialogError(container, message) {
    if (!container || !container.querySelector) return false;
    var status = container.querySelector(".shop-purchase-modal [data-shop-exchange-status]");
    if (!status) return false;
    status.textContent = String(message || "兑换失败，请稍后重试。");
    setExchangeDialogPending(container, false);
    return true;
  }

  function showExchangeResult(container, result, assets) {
    if (!container || typeof document === "undefined" || !result) return false;
    var fromItem = getExchangeItem(result.fromItemId);
    var toItem = getExchangeItem(result.toItemId);
    if (!fromItem || !toItem) return false;
    closePurchaseDialog(container);
    var quantity = Math.max(1, Math.floor(Number(result.quantity) || 1));
    var fromImage = getShopImage(fromItem, assets);
    var toImage = getShopImage(toItem, assets);
    var modal = document.createElement("section");
    modal.className = "shop-purchase-modal is-exchange-result";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-label", "兑换完成");
    modal.innerHTML =
      '<div class="shop-purchase-backdrop"></div>' +
      '<div class="shop-result-panel shop-exchange-result" tabindex="-1">' +
        '<span class="shop-result-kicker">EXCHANGE COMPLETE</span><h3>兑换完成</h3>' +
        '<div class="shop-exchange-result-flow">' +
          '<figure>' + (fromImage ? '<img src="' + escapeAttr(fromImage) + '" alt="' + escapeAttr(fromItem.title) + '">' : '') + '<figcaption>' + escapeHtml(fromItem.title) + '<strong>−' + formatNumber(quantity) + '</strong></figcaption></figure>' +
          '<i aria-hidden="true">→</i>' +
          '<figure>' + (toImage ? '<img src="' + escapeAttr(toImage) + '" alt="' + escapeAttr(toItem.title) + '">' : '') + '<figcaption>' + escapeHtml(toItem.title) + '<strong>＋' + formatNumber(quantity) + '</strong></figcaption></figure>' +
        '</div>' +
        '<p>已按 1:1 写入当前档案</p>' +
        '<button type="button" data-shop-result-close>收下</button>' +
      '</div>';
    container.appendChild(modal);
    function finish() { closePurchaseDialog(container); }
    modal.querySelector("[data-shop-result-close]").addEventListener("click", finish);
    modal.addEventListener("keydown", function (event) { if (event.key === "Escape" || event.key === "Enter") finish(); });
    modal.querySelector("[data-shop-result-close]").focus();
    return true;
  }

  function setPurchaseDialogPending(container, pending) {
    if (!container || !container.querySelector) return false;
    var modal = container.querySelector(".shop-purchase-modal.is-selection");
    if (!modal) return false;
    modal.dataset.pending = pending ? "true" : "false";
    var controls = modal.querySelectorAll("button, input");
    for (var i = 0; i < controls.length; i++) controls[i].disabled = Boolean(pending);
    var confirmButton = modal.querySelector("[data-shop-buy]");
    if (confirmButton) {
      confirmButton.textContent = pending ? "购买处理中…" : "确认购买";
      if (!pending && confirmButton.dataset.available !== "true") confirmButton.disabled = true;
    }
    return true;
  }

  function setPurchaseDialogError(container, message) {
    if (!container || !container.querySelector) return false;
    var status = container.querySelector(".shop-purchase-modal [data-shop-purchase-status]");
    if (!status) return false;
    status.textContent = String(message || "购买失败，请稍后重试。");
    setPurchaseDialogPending(container, false);
    return true;
  }

  function showPurchaseResult(container, result, assets) {
    if (!container || typeof document === "undefined" || !result) return false;
    var item = scope.shopConfig && scope.shopConfig.getShopItem ? scope.shopConfig.getShopItem(result.itemId) : null;
    if (!item) return false;
    closePurchaseDialog(container);
    var quantity = Math.max(1, Math.floor(Number(result.quantity) || 1));
    var image = getShopImage(item, assets);
    var currencyLabel = getPriceCurrencyLabel(item);
    var modal = document.createElement("section");
    modal.className = "shop-purchase-modal is-result";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-label", "获得 " + item.title);
    modal.innerHTML =
      '<div class="shop-purchase-backdrop"></div>' +
      '<div class="shop-result-panel" tabindex="-1">' +
        '<span class="shop-result-kicker">ITEM ACQUIRED</span><h3>获得物资</h3>' +
        '<div class="shop-result-glow" aria-hidden="true"></div>' +
        (image ? '<img src="' + escapeAttr(image) + '" alt="' + escapeAttr(item.title) + '">' : '') +
        '<strong>' + escapeHtml(item.title) + '</strong><em>×' + formatNumber(quantity) + '</em>' +
        '<p>物资已写入当前档案</p>' +
        '<div class="shop-result-cost"><small>本次支付</small><span>' + renderPriceCurrencyIcon(item, assets) + formatNumber(result.price) + " " + currencyLabel + '</span></div>' +
        '<button type="button" data-shop-result-close>收下</button>' +
      '</div>';
    container.appendChild(modal);
    function finish() { closePurchaseDialog(container); }
    modal.querySelector("[data-shop-result-close]").addEventListener("click", finish);
    modal.addEventListener("keydown", function (event) { if (event.key === "Escape" || event.key === "Enter") finish(); });
    modal.querySelector("[data-shop-result-close]").focus();
    return true;
  }

  function ensureActiveShopTab() {
    var tabs = getShopTabs();
    if (tabs.indexOf(shopActiveTab) < 0) shopActiveTab = tabs[0] || "金币";
    return shopActiveTab;
  }

  function getShopTabs() {
    var configured = scope.shopConfig && scope.shopConfig.SHOP_CATEGORIES;
    return Array.isArray(configured) && configured.length ? configured.slice() : shopTabs.slice();
  }

  function setShopTab(value) {
    var tabs = getShopTabs();
    if (tabs.indexOf(value) >= 0) shopActiveTab = value;
    return shopActiveTab;
  }

  function renderShopPanel(profile, assets) {
    var items = (scope.shopConfig && scope.shopConfig.SHOP_CONTENT) || [];
    var tabs = getShopTabs();
    var activeTab = ensureActiveShopTab();
    var filtered = items.filter(function (item) { return item.category === activeTab; });
    var grid = '<section class="shop-board board-page feature-board">' +
      renderV3Resources(profile, assets) +
      renderFeatureTabs("shop", tabs, activeTab, assets) +
      '<div class="shop-item-grid">';
    for (var i = 0; i < filtered.length; i++) {
      grid += renderShopCard(filtered[i], assets, getItemState(profile, filtered[i]), profile);
    }
    if (!filtered.length) grid += '<article class="board-empty">当前分类暂无商品。</article>';
    grid += '</div></section>';
    return grid;
  }

  // 保留兼容：每日免费补给已下架，此处恒返回不可领取（供 ShopRoom.dailyFree 调用）。
  function claimDailyShopItem(profile, itemId) {
    return { ok: false, reason: "SHOP_ITEM_NOT_CLAIMABLE" };
  }

  var api = {
    renderShopPanel: renderShopPanel,
    renderShopCard: renderShopCard,
    getItemState: getItemState,
    getShopImage: getShopImage,
    claimDailyShopItem: claimDailyShopItem,
    getShopTabs: getShopTabs,
    setShopTab: setShopTab,
    ensureActiveShopTab: ensureActiveShopTab,
    localDateKey: localDateKey,
    isoWeekString: isoWeekString,
    applyRewards: applyRewards,
    buyShopItem: buyShopItem,
    getPurchaseQuote: getPurchaseQuote,
    getExchangeQuote: getExchangeQuote,
    getExchangeItem: getExchangeItem,
    openPurchaseDialog: openPurchaseDialog,
    closePurchaseDialog: closePurchaseDialog,
    setPurchaseDialogPending: setPurchaseDialogPending,
    setPurchaseDialogError: setPurchaseDialogError,
    showPurchaseResult: showPurchaseResult
  };
  scope.shopView = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
