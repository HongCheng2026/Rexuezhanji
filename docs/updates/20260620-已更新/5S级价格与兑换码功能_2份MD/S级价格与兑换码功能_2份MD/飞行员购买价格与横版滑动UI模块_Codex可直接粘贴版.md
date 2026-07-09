# 飞行员购买价格与横版滑动UI模块_Codex可直接粘贴版

```js
// pilotShopConfig.js

export const PILOT_RARITY_PRICE_CONFIG = {
  B: {
    rarity: "B",
    priceGold: 30000
  },
  A: {
    rarity: "A",
    priceGold: 120000
  },
  S: {
    rarity: "S",
    priceGold: 480000
  }
};

export const PILOT_SHOP_UI_CONFIG = {
  pageId: "pilot_shop",
  title: "飞行员购买",
  orientation: "landscape",
  aspectRatio: "16:9",

  displayMode: "horizontal_image_slider",
  itemCardMode: "large_image_card",

  backgroundType: "sci_fi_hangar",
  imageFit: "contain",
  imagePosition: "center",

  showLeftButton: true,
  showRightButton: true,
  leftButtonId: "pilot_shop_prev_button",
  rightButtonId: "pilot_shop_next_button",

  showBuyButton: true,
  buyButtonId: "pilot_shop_buy_button",

  showEquipButton: true,
  equipButtonId: "pilot_shop_equip_button",

  showPrice: true,
  showRarity: true,
  showName: true,
  showCodeName: true,
  showArmorPenetration: true,

  sliderLoop: true,
  swipeEnabled: true,
  keyboardArrowEnabled: true,

  selectedScale: 1.0,
  sidePreviewScale: 0.72,

  transitionDurationMs: 220
};

export const PILOT_SHOP_ITEMS = [
  {
    id: "pilot_yelan",
    name: "夜岚",
    codeName: "紫鸢",
    rarity: "S",
    priceGold: PILOT_RARITY_PRICE_CONFIG.S.priceGold,
    armorPenetration: 0.2,
    imageAssetId: "pilot_yelan_full",
    avatarAssetId: "pilot_yelan_avatar",
    description: "高速突袭型S级飞行员，擅长突破重甲防线。"
  },
  {
    id: "pilot_luoqi",
    name: "洛绮",
    codeName: "金雀",
    rarity: "A",
    priceGold: PILOT_RARITY_PRICE_CONFIG.A.priceGold,
    armorPenetration: 0.1,
    imageAssetId: "pilot_luoqi_full",
    avatarAssetId: "pilot_luoqi_avatar",
    description: "机动压制型A级飞行员，适合中期推进。"
  },
  {
    id: "pilot_shenyao",
    name: "沈曜",
    codeName: "黑翼",
    rarity: "S",
    priceGold: PILOT_RARITY_PRICE_CONFIG.S.priceGold,
    armorPenetration: 0.2,
    imageAssetId: "pilot_shenyao_full",
    avatarAssetId: "pilot_shenyao_avatar",
    description: "重火力指挥型S级飞行员，适合高压BOSS战。"
  },
  {
    id: "pilot_xingtao",
    name: "星桃",
    codeName: "粉星",
    rarity: "B",
    priceGold: PILOT_RARITY_PRICE_CONFIG.B.priceGold,
    armorPenetration: 0,
    imageAssetId: "pilot_xingtao_full",
    avatarAssetId: "pilot_xingtao_avatar",
    description: "新手支援型B级飞行员，适合序章和第一章。"
  },
  {
    id: "pilot_bailing",
    name: "白凌",
    codeName: "银隼",
    rarity: "A",
    priceGold: PILOT_RARITY_PRICE_CONFIG.A.priceGold,
    armorPenetration: 0.1,
    imageAssetId: "pilot_bailing_full",
    avatarAssetId: "pilot_bailing_avatar",
    description: "精准作战型A级飞行员，适合护盾敌机较多的关卡。"
  }
];

export function createPilotShopState({
  initialIndex = 0,
  ownedPilotIds = [],
  equippedPilotId = null
} = {}) {
  const safeIndex = clampPilotShopIndex(initialIndex);

  return {
    currentIndex: safeIndex,
    ownedPilotIds: [...ownedPilotIds],
    equippedPilotId
  };
}

export function clampPilotShopIndex(index) {
  if (PILOT_SHOP_ITEMS.length <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(index, PILOT_SHOP_ITEMS.length - 1));
}

export function normalizePilotShopIndex(index) {
  const total = PILOT_SHOP_ITEMS.length;

  if (total <= 0) {
    return 0;
  }

  if (PILOT_SHOP_UI_CONFIG.sliderLoop) {
    return ((index % total) + total) % total;
  }

  return clampPilotShopIndex(index);
}

export function getCurrentPilotShopItem(shopState) {
  const index = normalizePilotShopIndex(shopState.currentIndex);
  return PILOT_SHOP_ITEMS[index];
}

export function getPilotShopItemById(pilotId) {
  return PILOT_SHOP_ITEMS.find((item) => item.id === pilotId) || null;
}

export function goToPreviousPilot(shopState) {
  return {
    ...shopState,
    currentIndex: normalizePilotShopIndex(shopState.currentIndex - 1)
  };
}

export function goToNextPilot(shopState) {
  return {
    ...shopState,
    currentIndex: normalizePilotShopIndex(shopState.currentIndex + 1)
  };
}

export function isPilotOwned(shopState, pilotId) {
  return shopState.ownedPilotIds.includes(pilotId);
}

export function canBuyPilot({
  playerGold,
  shopState,
  pilotId
}) {
  const pilot = getPilotShopItemById(pilotId);

  if (!pilot) {
    return {
      canBuy: false,
      reason: "PILOT_NOT_FOUND",
      priceGold: 0
    };
  }

  if (isPilotOwned(shopState, pilotId)) {
    return {
      canBuy: false,
      reason: "PILOT_ALREADY_OWNED",
      priceGold: pilot.priceGold
    };
  }

  if (playerGold < pilot.priceGold) {
    return {
      canBuy: false,
      reason: "GOLD_NOT_ENOUGH",
      priceGold: pilot.priceGold
    };
  }

  return {
    canBuy: true,
    reason: "OK",
    priceGold: pilot.priceGold
  };
}

export function buyPilot({
  player,
  shopState,
  pilotId
}) {
  const pilot = getPilotShopItemById(pilotId);

  if (!pilot) {
    return {
      success: false,
      reason: "PILOT_NOT_FOUND",
      player,
      shopState
    };
  }

  const check = canBuyPilot({
    playerGold: player.gold,
    shopState,
    pilotId
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
    gold: player.gold - pilot.priceGold
  };

  const nextShopState = {
    ...shopState,
    ownedPilotIds: [...shopState.ownedPilotIds, pilotId],
    equippedPilotId: shopState.equippedPilotId || pilotId
  };

  return {
    success: true,
    reason: "OK",
    priceGold: pilot.priceGold,
    item: pilot,
    player: nextPlayer,
    shopState: nextShopState
  };
}

export function equipPilot({
  shopState,
  pilotId
}) {
  if (!isPilotOwned(shopState, pilotId)) {
    return {
      success: false,
      reason: "PILOT_NOT_OWNED",
      shopState
    };
  }

  return {
    success: true,
    reason: "OK",
    shopState: {
      ...shopState,
      equippedPilotId: pilotId
    }
  };
}

export function getPilotShopCardViewModel({
  shopState,
  playerGold
}) {
  const item = getCurrentPilotShopItem(shopState);
  const owned = isPilotOwned(shopState, item.id);
  const equipped = shopState.equippedPilotId === item.id;

  return {
    pageId: PILOT_SHOP_UI_CONFIG.pageId,
    layout: PILOT_SHOP_UI_CONFIG.orientation,
    displayMode: PILOT_SHOP_UI_CONFIG.displayMode,

    itemId: item.id,
    name: item.name,
    codeName: item.codeName,
    rarity: item.rarity,
    priceGold: item.priceGold,
    armorPenetration: item.armorPenetration,
    armorPenetrationText: `${Math.round(item.armorPenetration * 100)}%`,
    imageAssetId: item.imageAssetId,
    avatarAssetId: item.avatarAssetId,
    description: item.description,

    currentIndex: shopState.currentIndex,
    totalCount: PILOT_SHOP_ITEMS.length,

    owned,
    equipped,
    canBuy: !owned && playerGold >= item.priceGold,
    canEquip: owned && !equipped,

    leftButtonId: PILOT_SHOP_UI_CONFIG.leftButtonId,
    rightButtonId: PILOT_SHOP_UI_CONFIG.rightButtonId,
    buyButtonId: PILOT_SHOP_UI_CONFIG.buyButtonId,
    equipButtonId: PILOT_SHOP_UI_CONFIG.equipButtonId
  };
}

export function handlePilotShopAction({
  actionType,
  player,
  shopState
}) {
  const currentItem = getCurrentPilotShopItem(shopState);

  if (actionType === "prev") {
    return {
      player,
      shopState: goToPreviousPilot(shopState)
    };
  }

  if (actionType === "next") {
    return {
      player,
      shopState: goToNextPilot(shopState)
    };
  }

  if (actionType === "buy") {
    return buyPilot({
      player,
      shopState,
      pilotId: currentItem.id
    });
  }

  if (actionType === "equip") {
    const result = equipPilot({
      shopState,
      pilotId: currentItem.id
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
