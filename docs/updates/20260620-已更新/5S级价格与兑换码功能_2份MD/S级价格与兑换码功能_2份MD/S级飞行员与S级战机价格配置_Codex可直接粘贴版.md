# S级飞行员与S级战机价格配置_Codex可直接粘贴版

```js
// sRankPriceConfig.js

export const CURRENCY_EXCHANGE_RATE = {
  goldPerDiamond: 200,
  diamondPerCny: 100,
  goldPerCny: 20000
};

export const S_RANK_PRICE_CONFIG = {
  pilot: {
    rarity: "S",
    type: "pilot",
    priceGold: 900000,
    diamondEquivalent: 4500,
    cnyEquivalent: 45
  },

  fighter: {
    rarity: "S",
    type: "fighter",
    priceGold: 1300000,
    diamondEquivalent: 6500,
    cnyEquivalent: 65
  },

  combo: {
    rarity: "S",
    type: "pilot_fighter_combo",
    priceGold: 2200000,
    diamondEquivalent: 11000,
    cnyEquivalent: 110
  }
};

export const S_RANK_PRICE_DESIGN_NOTE = {
  economyRule: "体力产出金币主要用于强化；任务和成就金币主要用于购买B/A级内容；S级飞行员和S级战机是长期金币目标。",
  sPilotPriceReason: "S级飞行员定价900000金币，对应4500钻石，约45元等值。",
  sFighterPriceReason: "S级战机定价1300000金币，对应6500钻石，约65元等值。战机对战斗数值影响更直接，因此价格高于飞行员。",
  sComboPriceReason: "S飞行员+S战机合计2200000金币，对应11000钻石，约110元等值，适合作为长期追求目标。"
};

export function goldToDiamond(gold) {
  return Math.ceil(gold / CURRENCY_EXCHANGE_RATE.goldPerDiamond);
}

export function diamondToGold(diamond) {
  return diamond * CURRENCY_EXCHANGE_RATE.goldPerDiamond;
}

export function diamondToCny(diamond) {
  return diamond / CURRENCY_EXCHANGE_RATE.diamondPerCny;
}

export function cnyToDiamond(cny) {
  return cny * CURRENCY_EXCHANGE_RATE.diamondPerCny;
}

export function goldToCny(gold) {
  return gold / CURRENCY_EXCHANGE_RATE.goldPerCny;
}

export function getSRankPilotPrice() {
  return S_RANK_PRICE_CONFIG.pilot;
}

export function getSRankFighterPrice() {
  return S_RANK_PRICE_CONFIG.fighter;
}

export function getSRankComboPrice() {
  return S_RANK_PRICE_CONFIG.combo;
}

export function getSRankPriceByType(type) {
  if (type === "pilot") {
    return getSRankPilotPrice();
  }

  if (type === "fighter") {
    return getSRankFighterPrice();
  }

  if (type === "combo") {
    return getSRankComboPrice();
  }

  return null;
}

export function canAffordSRankItem({
  playerGold,
  type
}) {
  const priceConfig = getSRankPriceByType(type);

  if (!priceConfig) {
    return {
      canAfford: false,
      reason: "S_RANK_PRICE_TYPE_NOT_FOUND",
      priceGold: 0
    };
  }

  if (playerGold < priceConfig.priceGold) {
    return {
      canAfford: false,
      reason: "GOLD_NOT_ENOUGH",
      priceGold: priceConfig.priceGold,
      needGold: priceConfig.priceGold - playerGold
    };
  }

  return {
    canAfford: true,
    reason: "OK",
    priceGold: priceConfig.priceGold,
    needGold: 0
  };
}

export function formatSRankPriceText(type) {
  const priceConfig = getSRankPriceByType(type);

  if (!priceConfig) {
    return "";
  }

  return `${priceConfig.priceGold}金币 / ${priceConfig.diamondEquivalent}钻石等值 / 约${priceConfig.cnyEquivalent}元`;
}
```

## 价格最终口径

| 内容 | 金币价格 | 钻石等值 | 人民币等值 |
|---|---:|---:|---:|
| S级飞行员 | 900,000金币 | 4,500钻石 | 约45元 |
| S级战机 | 1,300,000金币 | 6,500钻石 | 约65元 |
| S级飞行员 + S级战机 | 2,200,000金币 | 11,000钻石 | 约110元 |

## 换算口径

```text
1钻石 = 200金币
1元 = 100钻石
1元 = 20,000金币
```

## 设计原则

```text
体力金币：主要用于强化到当前指挥官等级。
任务/成就金币：主要帮助玩家买到B级、A级内容。
S级飞行员和S级战机：长期目标，不由前期任务和成就直接送到。
```
