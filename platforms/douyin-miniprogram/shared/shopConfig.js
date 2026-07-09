(function registerShopConfig(root) {
  const scope = root.RXGame || (root.RXGame = {});
  const SHOP_ITEMS = [{ id: "gold_200", name: "200 金币", priceDiamond: 1, rewards: { gold: 200 } }];
  const getShopItem = (id) => SHOP_ITEMS.find((item) => item.id === id) || null;
  const api = { SHOP_ITEMS, getShopItem };
  scope.shopConfig = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
