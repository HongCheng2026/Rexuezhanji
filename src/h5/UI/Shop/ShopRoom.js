(function defineShopRoom(root) {
  "use strict";
  // ── 商店房间（独立模块） ──
  // 原 UI/FeaturePanels/shopRoom.js 迁移至此，行为保持不变：
  // render → 在 FeaturePanels 壳内打开商店面板；
  // open   → 大厅机库强化商店（独立入口，沿用既有行为）；
  // buy / dailyFree → 经 claimEconomy 走 economyFeatureController 领取逻辑。
  var registry = root.RXGame && root.RXGame.roomRegistry;
  if (!registry) return;
  registry.defineRoom("shop", function createShopRoom(context) {
    return { actions: {
      render: function render() { return context.featurePanelController.open("shop"); },
      open: function open() {
        var battleContext = context.getBattleContext();
        if (battleContext) context.root.cancelAnimationFrame(battleContext.animationId);
        context.getState().mode = "shop";
        context.lobbyController.renderShop();
        return context.lobbyController.showShop();
      },
      buy: function buy(element) {
        if (!element || !element.dataset) return false;
        if (element.dataset.shopConfirmed === "true") {
          return context.claimEconomy(element, "buyShopItem", "shop", "shopBuy", false);
        }
        var shopView = context.shared && context.shared.shopView;
        return Boolean(shopView && shopView.openPurchaseDialog && shopView.openPurchaseDialog(
          context.dom && context.dom.featurePanelSlots,
          context.getProfile(),
          element.dataset.shopBuy,
          context.shared.assets
        ));
      },
      dailyFree: function dailyFree(element) { return context.claimEconomy(element, "claimDailyShopItem", "shop", "shopBuy", true); }
    } };
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
