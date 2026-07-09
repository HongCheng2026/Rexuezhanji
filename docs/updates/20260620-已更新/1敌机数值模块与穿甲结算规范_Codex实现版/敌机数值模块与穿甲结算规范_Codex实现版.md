# 敌机数值模块与穿甲结算规范（Codex实现版）

本文档用于指导 Codex 以最少代码量实现飞机小游戏的敌机血量、敌机减伤、玩家穿甲和敌机最终承伤计算。

目标：不手写每一关数值表，通过固定基础数值 + 变量函数 + 补充函数完成自动计算。

---

## 1. 模块拆分原则

敌机数值系统拆成 4 个模块：

1. **基础数值模块**  
   定义敌机原始血量。

2. **章节变量函数模块**  
   根据章节编号增加敌机血量和敌机减伤。

3. **小关补充函数模块**  
   第 5 关、第 10 关增加额外血量和减伤。

4. **玩家穿甲模块**  
   飞行员和战机提供穿甲，用于抵消敌机减伤。

---

## 2. 基础数值模块

敌机基础血量如下：

| 敌机类型 | 程序ID | 基础血量 |
|---|---|---:|
| 敌军小飞机 | small | 100 |
| 精英战机 | elite | 1000 |
| BOSS战机 | boss | 10000 |

对应代码：

```js
export const ENEMY_BASE_STATS = {
  small: {
    name: "敌军小飞机",
    baseHp: 100
  },
  elite: {
    name: "精英战机",
    baseHp: 1000
  },
  boss: {
    name: "BOSS战机",
    baseHp: 10000
  }
};
```

---

## 3. 章节变量函数模块

章节编号从 `0` 开始。

| 章节 | chapterIndex | 章节加成 |
|---|---:|---:|
| 序章 | 0 | 0% |
| 第1章 | 1 | 10% |
| 第2章 | 2 | 20% |
| 第3章 | 3 | 30% |
| 第4章 | 4 | 40% |
| 第5章 | 5 | 50% |
| 第6章 | 6 | 60% |
| 第7章 | 7 | 70% |
| 第8章 | 8 | 80% |
| 第9章 | 9 | 90% |

章节加成公式：

```text
章节加成 = chapterIndex * 0.1
```

对应代码：

```js
export function getChapterBonus(chapterIndex) {
  return chapterIndex * ENEMY_BALANCE_RULES.chapterGrowthPerLevel;
}
```

---

## 4. 小关补充函数模块

每章包含 10 个小关。

| 小关编号 | 额外加成 |
|---:|---:|
| 第1关 | 0% |
| 第2关 | 0% |
| 第3关 | 0% |
| 第4关 | 0% |
| 第5关 | 5% |
| 第6关 | 0% |
| 第7关 | 0% |
| 第8关 | 0% |
| 第9关 | 0% |
| 第10关 | 10% |

说明：

- 第 5 关额外增加 5% 血量和 5% 减伤。
- 第 10 关额外增加 10% 血量和 10% 减伤。
- 第 10 关只按 10% 计算，不叠加第 5 关规则。

对应代码：

```js
export function getStageExtraBonus(stageInChapter) {
  return ENEMY_BALANCE_RULES.stageExtraGrowth[stageInChapter] || 0;
}
```

---

## 5. 玩家穿甲模块

玩家穿甲由飞行员和战机提供。

当前规则：

| 来源 | 品级 | 穿甲 |
|---|---|---:|
| 飞行员 | S级 | 20% |
| 战机 | S级 | 10% |

穿甲定义：

```text
穿甲不是额外增伤。
穿甲用于抵消敌机减伤。
```

推荐公式：

```text
玩家总穿甲率 = 飞行员穿甲率 + 战机穿甲率
```

```text
实际敌机减伤率 = max(0, 敌机原始减伤率 - 玩家总穿甲率)
```

```text
敌机承伤系数 = 1 - 实际敌机减伤率
```

对应代码：

```js
export const PILOT_RARITY_STATS = {
  S: { armorPenetration: 0.2 },
  A: { armorPenetration: 0.1 },
  B: { armorPenetration: 0 }
};

export const FIGHTER_RARITY_STATS = {
  S: { armorPenetration: 0.1 },
  A: { armorPenetration: 0.05 },
  B: { armorPenetration: 0 }
};

export function getTotalArmorPenetration(pilotRarity, fighterRarity) {
  const pilotPen = PILOT_RARITY_STATS[pilotRarity]?.armorPenetration || 0;
  const fighterPen = FIGHTER_RARITY_STATS[fighterRarity]?.armorPenetration || 0;

  return pilotPen + fighterPen;
}
```

---

## 6. 总成长公式

敌机总成长由章节加成和小关额外加成组成。

```text
totalBonus = chapterBonus + stageBonus
```

敌机最终血量：

```text
finalHp = ceil(baseHp * (1 + totalBonus))
```

敌机原始减伤：

```text
rawDamageReductionRate = totalBonus
```

玩家总穿甲：

```text
armorPenetration = pilotArmorPenetration + fighterArmorPenetration
```

实际敌机减伤：

```text
finalDamageReductionRate = max(0, rawDamageReductionRate - armorPenetration)
```

敌机承伤系数：

```text
damageTakenMultiplier = 1 - finalDamageReductionRate
```

---

## 7. 完整最小代码

```js
// enemyBalance.js

export const ENEMY_BASE_STATS = {
  small: {
    name: "敌军小飞机",
    baseHp: 100
  },
  elite: {
    name: "精英战机",
    baseHp: 1000
  },
  boss: {
    name: "BOSS战机",
    baseHp: 10000
  }
};

export const ENEMY_BALANCE_RULES = {
  chapterGrowthPerLevel: 0.1,
  stageExtraGrowth: {
    5: 0.05,
    10: 0.1
  }
};

export const PILOT_RARITY_STATS = {
  S: { armorPenetration: 0.2 },
  A: { armorPenetration: 0.1 },
  B: { armorPenetration: 0 }
};

export const FIGHTER_RARITY_STATS = {
  S: { armorPenetration: 0.1 },
  A: { armorPenetration: 0.05 },
  B: { armorPenetration: 0 }
};

export function getChapterBonus(chapterIndex) {
  return chapterIndex * ENEMY_BALANCE_RULES.chapterGrowthPerLevel;
}

export function getStageExtraBonus(stageInChapter) {
  return ENEMY_BALANCE_RULES.stageExtraGrowth[stageInChapter] || 0;
}

export function getTotalArmorPenetration(pilotRarity, fighterRarity) {
  const pilotPen = PILOT_RARITY_STATS[pilotRarity]?.armorPenetration || 0;
  const fighterPen = FIGHTER_RARITY_STATS[fighterRarity]?.armorPenetration || 0;

  return pilotPen + fighterPen;
}

export function getEnemyScaling({
  chapterIndex,
  stageInChapter,
  pilotRarity,
  fighterRarity
}) {
  const chapterBonus = getChapterBonus(chapterIndex);
  const stageBonus = getStageExtraBonus(stageInChapter);

  const totalBonus = chapterBonus + stageBonus;

  const hpMultiplier = 1 + totalBonus;

  const rawDamageReductionRate = totalBonus;

  const armorPenetration = getTotalArmorPenetration(
    pilotRarity,
    fighterRarity
  );

  const finalDamageReductionRate = Math.max(
    0,
    rawDamageReductionRate - armorPenetration
  );

  const damageTakenMultiplier = 1 - finalDamageReductionRate;

  return {
    chapterBonus,
    stageBonus,
    totalBonus,
    hpMultiplier,
    rawDamageReductionRate,
    armorPenetration,
    finalDamageReductionRate,
    damageTakenMultiplier
  };
}

export function getEnemyStats({
  enemyType,
  chapterIndex,
  stageInChapter,
  pilotRarity,
  fighterRarity
}) {
  const baseStats = ENEMY_BASE_STATS[enemyType];

  if (!baseStats) {
    throw new Error(`Unknown enemy type: ${enemyType}`);
  }

  const scaling = getEnemyScaling({
    chapterIndex,
    stageInChapter,
    pilotRarity,
    fighterRarity
  });

  return {
    enemyType,
    name: baseStats.name,
    baseHp: baseStats.baseHp,
    finalHp: Math.ceil(baseStats.baseHp * scaling.hpMultiplier),
    hpMultiplier: scaling.hpMultiplier,
    rawDamageReductionRate: scaling.rawDamageReductionRate,
    armorPenetration: scaling.armorPenetration,
    finalDamageReductionRate: scaling.finalDamageReductionRate,
    damageTakenMultiplier: scaling.damageTakenMultiplier
  };
}
```

---

## 8. 调用示例

```js
const enemy = getEnemyStats({
  enemyType: "small",
  chapterIndex: 9,
  stageInChapter: 10,
  pilotRarity: "S",
  fighterRarity: "S"
});

console.log(enemy);
```

结果示例：

```js
{
  enemyType: "small",
  name: "敌军小飞机",
  baseHp: 100,
  finalHp: 200,
  hpMultiplier: 2,
  rawDamageReductionRate: 1,
  armorPenetration: 0.3,
  finalDamageReductionRate: 0.7,
  damageTakenMultiplier: 0.3
}
```

解释：

```text
第9章加成 = 90%
第10关额外加成 = 10%
敌机原始减伤 = 100%

S级飞行员穿甲 = 20%
S级战机穿甲 = 10%
玩家总穿甲 = 30%

实际敌机减伤 = 100% - 30% = 70%
敌机承伤系数 = 30%
```

---

## 9. Codex执行要求

让 Codex 实现时，必须遵守以下规则：

1. 不要手写每一关的敌机血量表。
2. 不要把敌机减伤直接写死成固定值。
3. 不要把穿甲做成额外增伤。
4. 穿甲只用于抵消敌机减伤。
5. 所有百分比在代码中统一使用小数。
6. 血量计算结果向上取整。
7. 小关第 5 关和第 10 关只使用对应额外加成，不做倍数叠加。
8. 第 10 关额外加成是 10%，不是 5% + 10%。

---

## 10. 最终结算口径

最终口径如下：

```text
敌机基础血量：
small = 100
elite = 1000
boss = 10000

章节成长：
chapterBonus = chapterIndex * 0.1

小关成长：
stageBonus = 0
stageBonus = 0.05 when stageInChapter === 5
stageBonus = 0.1 when stageInChapter === 10

总成长：
totalBonus = chapterBonus + stageBonus

血量系数：
hpMultiplier = 1 + totalBonus

敌机最终血量：
finalHp = ceil(baseHp * hpMultiplier)

敌机原始减伤：
rawDamageReductionRate = totalBonus

玩家总穿甲：
armorPenetration = pilotArmorPenetration + fighterArmorPenetration

实际敌机减伤：
finalDamageReductionRate = max(0, rawDamageReductionRate - armorPenetration)

敌机承伤系数：
damageTakenMultiplier = 1 - finalDamageReductionRate
```
