# 战机购买价格与横版滑动UI模块_Codex可直接粘贴版

```js
// fighterShopConfig.js

export const FIGHTER_RARITY_PRICE_CONFIG = {
  B: {
    rarity: "B",
    priceGold: 50000
  },
  A: {
    rarity: "A",
    priceGold: 180000
  },
  S: {
    rarity: "S",
    priceGold: 680000
  }
};

export const FIGHTER_SHOP_UI_CONFIG = {
  pageId: "fighter_shop",
  title: "战机购买",
  orientation: "landscape",
  aspectRatio: "16:9",

  displayMode: "horizontal_image_slider",
  itemCardMode: "large_image_card",

  backgroundType: "sci_fi_hangar",
  imageFit: "contain",
  imagePosition: "center",

  showLeftButton: true,
  showRightButton: true,
  leftButtonId: "fighter_shop_prev_button",
  rightButtonId: "fighter_shop_next_button",

  showBuyButton: true,
  buyButtonId: "fighter_shop_buy_button",

  showEquipButton: true,
  equipButtonId: "fighter_shop_equip_button",

  showPrice: true,
  showRarity: true,
  showName: true,
  showBaseAttack: true,
  showBaseHp: true,
  showArmorPenetration: true,

  sliderLoop: true,
  swipeEnabled: true,
  keyboardArrowEnabled: true,

  selectedScale: 1.0,
  sidePreviewScale: 0.72,

  transitionDurationMs: 220
};

export const FIGHTER_SHOP_ITEMS = [
  {
    id: "fighter_novice_wing",
    name: "苍翼",
    rarity: "B",
    priceGold: FIGHTER_RARITY_PRICE_CONFIG.B.priceGold,
    baseAttack: 100,
    baseHp: 1000,
    armorPenetration: 0,
    imageAssetId: "fighter_novice_wing_full",
    iconAssetId: "fighter_novice_wing_icon",
    description: "B级基础战机，适合序章和第一章推进。"
  },
  {
    id: "fighter_silver_falcon",
    name: "银隼",
    rarity: "A",
    priceGold: FIGHTER_RARITY_PRICE_CONFIG.A.priceGold,
    baseAttack: 140,
    baseHp: 1400,
    armorPenetration: 0.05,
    imageAssetId: "fighter_silver_falcon_full",
    iconAssetId: "fighter_silver_falcon_icon",
    description: "A级高速战机，兼顾火力和机动。"
  },
  {
    id: "fighter_black_raven",
    name: "黑鸦",
    rarity: "A",
    priceGold: FIGHTER_RARITY_PRICE_CONFIG.A.priceGold,
    baseAttack: 155,
    baseHp: 1250,
    armorPenetration: 0.05,
    imageAssetId: "fighter_black_raven_full",
    iconAssetId: "fighter_black_raven_icon",
    description: "A级突击战机，适合压制精英敌机。"
  },
  {
    id: "fighter_purple_kite",
    name: "紫鸢",
    rarity: "S",
    priceGold: FIGHTER_RARITY_PRICE_CONFIG.S.priceGold,
    baseAttack: 200,
    baseHp: 1800,
    armorPenetration: 0.1,
    imageAssetId: "fighter_purple_kite_full",
    iconAssetId: "fighter_purple_kite_icon",
    description: "S级破甲战机，用于突破后期重甲防线。"
  },
  {
    id: "fighter_void_spear",
    name: "虚空枪骑",
    rarity: "S",
    priceGold: FIGHTER_RARITY_PRICE_CONFIG.S.priceGold,
    baseAttack: 230,
    baseHp: 1600,
    armorPenetration: 0.1,
    imageAssetId: "fighter_void_spear_full",
    iconAssetId: "fighter_void_spear_icon",
    description: "S级高火力战机，适合BOSS战和第七章以后关卡。"
  }
];

export function createFighterShopState({
  initialIndex = 0,
  ownedFighterIds = [],
  equippedFighterId = null
} = {}) {
  const safeIndex = clampFighterShopIndex(initialIndex);

  return {
    currentIndex: safeIndex,
    ownedFighterIds: [...ownedFighterIds],
    equippedFighterId
  };
}

export function clampFighterShopIndex(index) {
  if (FIGHTER_SHOP_ITEMS.length <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(index, FIGHTER_SHOP_ITEMS.length - 1));
}

export function normalizeFighterShopIndex(index) {
  const total = FIGHTER_SHOP_ITEMS.length;

  if (total <= 0) {
    return 0;
  }

  if (FIGHTER_SHOP_UI_CONFIG.sliderLoop) {
    return ((index % total) + total) % total;
  }

  return clampFighterShopIndex(index);
}

export function getCurrentFighterShopItem(shopState) {
  const index = normalizeFighterShopIndex(shopState.currentIndex);
  return FIGHTER_SHOP_ITEMS[index];
}

export function getFighterShopItemById(fighterId) {
  return FIGHTER_SHOP_ITEMS.find((item) => item.id === fighterId) || null;
}

export function goToPreviousFighter(shopState) {
  return {
    ...shopState,
    currentIndex: normalizeFighterShopIndex(shopState.currentIndex - 1)
  };
}

export function goToNextFighter(shopState) {
  return {
    ...shopState,
    currentIndex: normalizeFighterShopIndex(shopState.currentIndex + 1)
  };
}

export function isFighterOwned(shopState, fighterId) {
  return shopState.ownedFighterIds.includes(fighterId);
}

export function canBuyFighter({
  playerGold,
  shopState,
  fighterId
}) {
  const fighter = getFighterShopItemById(fighterId);

  if (!fighter) {
    return {
      canBuy: false,
      reason: "FIGHTER_NOT_FOUND",
      priceGold: 0
    };
  }

  if (isFighterOwned(shopState, fighterId)) {
    return {
      canBuy: false,
      reason: "FIGHTER_ALREADY_OWNED",
      priceGold: fighter.priceGold
    };
  }

  if (playerGold < fighter.priceGold) {
    return {
      canBuy: false,
      reason: "GOLD_NOT_ENOUGH",
      priceGold: fighter.priceGold
    };
  }

  return {
    canBuy: true,
    reason: "OK",
    priceGold: fighter.priceGold
  };
}

export function buyFighter({
  player,
  shopState,
  fighterId
}) {
  const fighter = getFighterShopItemById(fighterId);

  if (!fighter) {
    return {
      success: false,
      reason: "FIGHTER_NOT_FOUND",
      player,
      shopState
    };
  }

  const check = canBuyFighter({
    playerGold: player.gold,
    shopState,
    fighterId
  });

  if (!check.canBuy) {
    return {
      success: false,
      reason: check.reason,
      priceGold: check.priceGold,
      player,
      shopState
    };
  }

  const nextPlayer = {
    ...player,
    gold: player.gold - fighter.priceGold
  };

  const nextShopState = {
    ...shopState,
    ownedFighterIds: [...shopState.ownedFighterIds, fighterId],
    equippedFighterId: shopState.equippedFighterId || fighterId
  };

  return {
    success: true,
    reason: "OK",
    priceGold: fighter.priceGold,
    item: fighter,
    player: nextPlayer,
    shopState: nextShopState
  };
}

export function equipFighter({
  shopState,
  fighterId
}) {
  if (!isFighterOwned(shopState, fighterId)) {
    return {
      success: false,
      reason: "FIGHTER_NOT_OWNED",
      shopState
    };
  }

  return {
    success: true,
    reason: "OK",
    shopState: {
      ...shopState,
      equippedFighterId: fighterId
    }
  };
}

export function getFighterShopCardViewModel({
  shopState,
  playerGold
}) {
  const item = getCurrentFighterShopItem(shopState);
  const owned = isFighterOwned(shopState, item.id);
  const equipped = shopState.equippedFighterId === item.id;

  return {
    pageId: FIGHTER_SHOP_UI_CONFIG.pageId,
    layout: FIGHTER_SHOP_UI_CONFIG.orientation,
    displayMode: FIGHTER_SHOP_UI_CONFIG.displayMode,

    itemId: item.id,
    name: item.name,
    rarity: item.rarity,
    priceGold: item.priceGold,
    baseAttack: item.baseAttack,
    baseHp: item.baseHp,
    armorPenetration: item.armorPenetration,
    armorPenetrationText: `${Math.round(item.armorPenetration * 100)}%`,
    imageAssetId: item.imageAssetId,
    iconAssetId: item.iconAssetId,
    description: item.description,

    currentIndex: shopState.currentIndex,
    totalCount: FIGHTER_SHOP_ITEMS.length,

    owned,
    equipped,
    canBuy: !owned && playerGold >= item.priceGold,
    canEquip: owned && !equipped,

    leftButtonId: FIGHTER_SHOP_UI_CONFIG.leftButtonId,
    rightButtonId: FIGHTER_SHOP_UI_CONFIG.rightButtonId,
    buyButtonId: FIGHTER_SHOP_UI_CONFIG.buyButtonId,
    equipButtonId: FIGHTER_SHOP_UI_CONFIG.equipButtonId
  };
}

export function handleFighterShopAction({
  actionType,
  player,
  shopState
}) {
  const currentItem = getCurrentFighterShopItem(shopState);

  if (actionType === "prev") {
    return {
      player,
      shopState: goToPreviousFighter(shopState)
    };
  }

  if (actionType === "next") {
    return {
      player,
      shopState: goToNextFighter(shopState)
    };
  }

  if (actionType === "buy") {
    return buyFighter({
      player,
      shopState,
      fighterId: currentItem.id
    });
  }

  if (actionType === "equip") {
    const result = equipFighter({
      shopState,
      fighterId: currentItem.id
    });

    return {
      ...result,
      player
    };
  }

  return {
    success: false,
    reason: "UNKNOWN_ACTION",
    player,
    shopState
  };
}
```
