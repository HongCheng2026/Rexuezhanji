# 敌机关卡难度与攻速模块_代码说明给Codex

本文档用于解释《敌机关卡难度与攻速模块_Codex可直接粘贴版.md》中的代码结构，帮助 Codex 正确接入游戏逻辑。

---

## 1. 模块目标

本模块负责以下系统：

1. 关卡结构  
2. 关卡解锁  
3. 敌机类型配置  
4. 敌机攻速成长  
5. 敌机血量成长  
6. 敌机减伤成长  
7. 关卡敌机数量  
8. 关卡敌机组成比例  
9. BOSS出现与BOSS爆发攻击  
10. 生成完整关卡配置  

本模块不负责以下系统：

1. 玩家伤害计算  
2. 玩家飞行员属性  
3. 玩家战机强化  
4. 玩家体力消耗  
5. 玩家经验和金币奖励  
6. UI显示  
7. 关卡内具体刷怪坐标  
8. 子弹碰撞检测  
9. 道具掉落  
10. 存档系统  

---

## 2. 关卡结构

代码中的关卡结构由 `STAGE_STRUCTURE_CONFIG` 控制。

当前设定：

```text
序章 chapterIndex = 0
序章共3关

正式章节 chapterIndex = 1 到 9
每个正式章节10关

每场战斗90秒结束
正式章节第10关在第60秒出现BOSS
```

Codex接入时应使用：

```js
getStageConfig(chapterIndex, stageInChapter)
```

获取某一关的完整配置。

---

## 3. 关卡ID规则

关卡ID由 `getStageId(chapterIndex, stageInChapter)` 生成。

规则：

```text
序章第1关 = prologue_1
序章第2关 = prologue_2
序章第3关 = prologue_3

第1章第1关 = 1_1
第1章第10关 = 1_10
第7章第5关 = 7_5
第9章第10关 = 9_10
```

Codex不应手写关卡ID，应统一调用：

```js
getStageId(chapterIndex, stageInChapter)
```

---

## 4. 关卡解锁逻辑

关卡解锁由以下函数处理：

```js
getPreviousStageId(chapterIndex, stageInChapter)
isStageUnlocked({ chapterIndex, stageInChapter, clearedStageIds })
```

规则：

```text
序章1默认解锁
序章2需要通关序章1
序章3需要通关序章2
1-1需要通关序章3
其他关卡都需要通关前一关
```

Codex接入关卡选择界面时，应使用：

```js
isStageUnlocked({
  chapterIndex,
  stageInChapter,
  clearedStageIds: player.clearedStageIds
})
```

其中 `player.clearedStageIds` 是玩家已经通关的关卡ID数组。

---

## 5. 敌机类型

敌机类型统一定义在：

```js
ENEMY_TYPE_CONFIG
```

当前敌机类型：

| enemyType | 说明 |
|---|---|
| small | 小型敌机 |
| shooter | 射击敌机 |
| charger | 高速突击敌机 |
| shield | 护盾敌机 |
| elite | 精英战机 |
| boss | BOSS战机 |

Codex生成敌机实例时，不要直接读取 `ENEMY_TYPE_CONFIG` 作为最终数值，而应调用：

```js
getEnemyFinalStats({
  chapterIndex,
  stageInChapter,
  enemyType
})
```

该函数会返回经过章节和关卡难度修正后的最终敌机数值。

---

## 6. 敌机攻速设计

章节基础攻速由以下对象控制：

```js
CHAPTER_ENEMY_FIRE_INTERVAL_BASE
```

当前正式章节基础攻速：

```text
第1章：1.0秒/次
第2章：0.9秒/次
第3章：0.8秒/次
第4章：0.7秒/次
第5章：0.65秒/次
第6章：0.6秒/次
第7章：0.55秒/次
第8章：0.5秒/次
第9章：0.45秒/次
```

不同敌机还会乘以自己的 `fireIntervalMultiplier`。

例如：

```text
small 的 fireIntervalMultiplier = 1.2
shooter 的 fireIntervalMultiplier = 1.0
elite 的 fireIntervalMultiplier = 0.8
boss 的 fireIntervalMultiplier = 0.7
```

最终攻击间隔由以下函数计算：

```js
getEnemyFireInterval(chapterIndex, enemyType)
```

Codex接入敌机发射逻辑时，应使用该函数返回值作为敌机普通攻击间隔。

如果返回 `null`，表示该敌机不会发射子弹，例如 `charger`。

---

## 7. 第一次开火时间

敌机第一次开火时间由以下函数返回：

```js
getEnemyFirstFireDelay(enemyType)
```

当前规则：

| enemyType | 第一次开火延迟 |
|---|---:|
| small | 0.4秒 |
| shooter | 0.3秒 |
| shield | 0.8秒 |
| elite | 0.6秒 |
| boss | 1.0秒 |
| charger | null |

Codex实现敌机AI时，应在敌机入场后等待 `firstFireDelay` 秒再允许第一次开火。

---

## 8. BOSS爆发攻击

BOSS爆发攻击配置：

```js
BOSS_BURST_ATTACK_CONFIG
```

当前规则：

```text
爆发攻击间隔：0.1秒
爆发持续时间：2秒
爆发冷却时间：8秒
触发血量：70%、40%、15%
```

Codex实现BOSS时，应把普通攻击和爆发攻击分开处理：

```text
BOSS普通攻击使用 getEnemyFireInterval(chapterIndex, "boss")
BOSS爆发攻击使用 BOSS_BURST_ATTACK_CONFIG.fireInterval
```

0.1秒攻击间隔只允许用于BOSS爆发，不应用于普通敌机持续攻击。

---

## 9. 关卡难度

正式章节关卡难度由两个部分组成：

```text
章节基础难度 + 小关模板难度
```

章节基础难度函数：

```js
getChapterDifficultyBase(chapterIndex)
```

规则：

```text
第1章基础难度 = 0
第2章基础难度 = 0.12
第3章基础难度 = 0.24
第4章基础难度 = 0.36
后续每章继续递增0.12
```

小关模板难度由：

```js
STAGE_DIFFICULTY_TEMPLATE
```

控制。

最终难度通过：

```js
getStageDifficulty(chapterIndex, stageInChapter)
```

获得。

Codex不应手写难度值，应统一调用该函数。

---

## 10. 敌机血量成长

普通敌机血量倍率由以下函数返回：

```js
getStageEnemyHpMultiplier(chapterIndex, stageInChapter)
```

公式：

```text
敌机血量倍率 = 1 + 当前关卡难度
```

BOSS血量倍率由以下函数返回：

```js
getBossHpMultiplier(chapterIndex, stageInChapter)
```

第10关BOSS会额外增加血量压力。

Codex生成普通敌机时调用：

```js
getEnemyFinalStats({ chapterIndex, stageInChapter, enemyType })
```

该函数内部已经处理血量倍率，不需要Codex重复计算。

---

## 11. 敌机减伤成长

关卡基础减伤由以下函数返回：

```js
getStageDamageReductionRate(chapterIndex, stageInChapter)
```

普通章节使用：

```text
damageReductionRate = difficulty * 0.5
最高不超过0.65
```

第7章使用独立减伤表：

```js
CHAPTER_7_STAGE_DAMAGE_REDUCTION
```

第7章是穿甲检测章节。  
7-5开始明显变硬，7-10是S飞行员+S战机检测关。

如果敌机本身是 `shield`，会额外增加：

```text
extraDamageReductionRate = 0.15
```

最终敌机减伤在：

```js
getEnemyFinalStats()
```

内部完成。

Codex计算伤害时，应使用敌机最终返回值中的：

```js
damageReductionRate
damageTakenMultiplier
```

---

## 12. 关卡敌机数量

关卡敌机数量由以下函数返回：

```js
getStageEnemyCount(chapterIndex, stageInChapter)
```

序章使用 `PROLOGUE_STAGE_CONFIG` 中的固定敌机数量。

正式章节使用：

```text
基础小关敌机数量 * (1 + difficulty * 0.25)
```

Codex不应手写每关敌机数量，应调用该函数或直接使用 `getStageConfig()` 返回的 `spawnPlan.totalEnemyCount`。

---

## 13. 关卡敌机组成

敌机组成由以下函数返回：

```js
getStageEnemyComposition(chapterIndex, stageInChapter)
```

正式章节使用4类模板：

```text
1-4关：grass
5关：gate
6-9关：pressure
10关：boss
```

第7章使用专门的组成覆盖：

```js
CHAPTER_7_COMPOSITION_OVERRIDE
```

Codex不应手动判断敌机比例，应使用：

```js
getStageEnemySpawnPlan(chapterIndex, stageInChapter)
```

该函数会返回：

```js
{
  totalEnemyCount,
  enemyCounts,
  composition
}
```

其中 `enemyCounts` 是每种敌机需要生成的数量。

---

## 14. 推荐接入入口

Codex接入关卡时，最推荐只调用一个入口函数：

```js
getStageConfig(chapterIndex, stageInChapter)
```

该函数返回该关完整配置：

```js
{
  stageId,
  chapterIndex,
  stageInChapter,
  previousStageId,

  battleEndSeconds,
  bossAppearSeconds,

  difficulty,
  damageReductionRate,
  enemyHpMultiplier,

  hasBoss,
  boss,

  spawnPlan
}
```

Codex可以用它完成：

```text
关卡ID
前置关卡
战斗时长
BOSS出现时间
关卡难度
敌机减伤
敌机血量倍率
是否有BOSS
BOSS配置
刷怪总数
刷怪类型数量
```

---

## 15. 生成全部关卡配置

如果Codex需要一次性生成所有关卡配置，调用：

```js
generateAllStageConfigs()
```

返回数组包含：

```text
序章3关
第1章10关
第2章10关
...
第9章10关
```

总关卡数量：

```text
3 + 9 * 10 = 93关
```

---

## 16. Codex接入建议

Codex应按以下顺序接入：

### 第一步：导入模块

```js
import {
  getStageConfig,
  getEnemyFinalStats,
  isStageUnlocked
} from "./enemyStageBalance.js";
```

### 第二步：关卡选择界面判断是否解锁

```js
const unlocked = isStageUnlocked({
  chapterIndex,
  stageInChapter,
  clearedStageIds: player.clearedStageIds
});
```

### 第三步：进入关卡时读取关卡配置

```js
const stageConfig = getStageConfig(chapterIndex, stageInChapter);
```

### 第四步：根据刷怪计划生成敌机

```js
const spawnPlan = stageConfig.spawnPlan;
```

### 第五步：生成某种敌机时读取最终敌机数值

```js
const enemyStats = getEnemyFinalStats({
  chapterIndex,
  stageInChapter,
  enemyType: "shooter"
});
```

### 第六步：BOSS关在60秒生成BOSS

```js
if (stageConfig.hasBoss && battleTime >= stageConfig.bossAppearSeconds) {
  const bossStats = stageConfig.boss.stats;
}
```

---

## 17. Codex禁止事项

Codex不要做以下事情：

1. 不要手写93关配置。
2. 不要手写敌机最终血量。
3. 不要手写敌机最终攻速。
4. 不要把0.1秒攻速应用到普通敌机。
5. 不要绕过 `getStageConfig()` 单独拼关卡数据。
6. 不要绕过 `getEnemyFinalStats()` 直接读取敌机基础血量。
7. 不要把第7章减伤逻辑改成普通章节逻辑。
8. 不要把BOSS爆发攻击当成BOSS普通攻击。
9. 不要把 `charger` 做成会发子弹的敌机。
10. 不要让未通关前置关卡的玩家进入后续关卡。

---

## 18. 最小运行示例

```js
const player = {
  clearedStageIds: ["prologue_1", "prologue_2", "prologue_3", "1_1"]
};

const chapterIndex = 1;
const stageInChapter = 2;

const unlocked = isStageUnlocked({
  chapterIndex,
  stageInChapter,
  clearedStageIds: player.clearedStageIds
});

if (unlocked) {
  const stageConfig = getStageConfig(chapterIndex, stageInChapter);

  console.log(stageConfig.spawnPlan);

  const smallEnemyStats = getEnemyFinalStats({
    chapterIndex,
    stageInChapter,
    enemyType: "small"
  });

  console.log(smallEnemyStats);
}
```

---

## 19. 本模块最终产物

Codex最终应把《敌机关卡难度与攻速模块_Codex可直接粘贴版.md》中的代码保存为：

```text
enemyStageBalance.js
```

然后在游戏关卡系统、刷怪系统、敌机AI系统、BOSS系统中引用该模块。
