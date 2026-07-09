# 04_底部礼包位改赞助我们_Codex可直接粘贴版

```js
// bottomPromoConfig.js

export const BOTTOM_PROMO_CONFIG = {
  containerId: "bottom_promo_area",
  layout: "horizontal",
  position: "bottom_left"
};

export const BOTTOM_PROMO_CARDS = [
  {
    id: "star_wing_event",
    title: "星穹之翼",
    subTitle: "限时概率提升",
    route: "event_star_wing",
    visible: true,
    styleType: "blue_event"
  },
  {
    id: "sponsor_us",
    title: "赞助我们",
    subTitle: "SUPPORT US",
    route: "sponsor_panel",
    visible: true,
    styleType: "blue_support"
  }
];

export const SPONSOR_PANEL_CONFIG = {
  panelId: "sponsor_panel",
  title: "赞助我们",
  subTitle: "SUPPORT US",
  desc: "支持项目继续开发，获得感谢铭牌与补给奖励。",
  options: [
    {
      id: "sponsor_6",
      title: "轻量赞助",
      priceCny: 6,
      rewards: [
        {
          type: "nameplate",
          id: "nameplate_supporter"
        },
        {
          type: "gold",
          amount: 30000
        }
      ]
    },
    {
      id: "sponsor_18",
      title: "进阶赞助",
      priceCny: 18,
      rewards: [
        {
          type: "nameplate",
          id: "nameplate_senior_supporter"
        },
        {
          type: "gold",
          amount: 100000
        }
      ]
    }
  ]
};

export function getBottomPromoCards() {
  return BOTTOM_PROMO_CARDS.filter((card) => card.visible);
}

export function getBottomPromoCardById(cardId) {
  return BOTTOM_PROMO_CARDS.find((card) => card.id === cardId) || null;
}

export function handleBottomPromoClick(cardId, router) {
  const card = getBottomPromoCardById(cardId);

  if (!card) {
    return {
      success: false,
      reason: "PROMO_CARD_NOT_FOUND"
    };
  }

  if (card.route === "event_star_wing") {
    router.openStarWingEvent?.();
  }

  if (card.route === "sponsor_panel") {
    router.openSponsorPanel?.(SPONSOR_PANEL_CONFIG);
  }

  return {
    success: true,
    reason: "OK",
    route: card.route
  };
}
```

## 替换关系

```text
原：首充礼包 / FIRST TOP-UP
改：赞助我们 / SUPPORT US
```

## 注意

```text
不要再出现“首充礼包”字样。
赞助我们可以作为轻付费入口，但不要强制弹出。
```
