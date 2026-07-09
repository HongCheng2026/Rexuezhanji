# 三个核心功能部署说明给Codex

## 1. 本次不做什么

本次不做新手引导。

不要新增：

```text
新手教程
强制点击引导
遮罩引导
手指动画引导
第一次进入强制流程
```

---

## 2. 本次要部署的3个功能

需要部署：

```text
失败引导系统
战斗结算系统
关卡选择地图系统
```

对应代码文件：

```text
failGuideSystem.js
battleSettlementSystem.js
chapterMapSystem.js
```

---

## 3. 推荐保存路径

```text
src/systems/failGuideSystem.js
src/systems/battleSettlementSystem.js
src/systems/chapterMapSystem.js
```

如果项目没有 `src/systems/`，就创建该目录。

---

## 4. 部署顺序

建议按这个顺序接：

```text
1. chapterMapSystem.js
2. battleSettlementSystem.js
3. failGuideSystem.js
```

原因：

```text
关卡地图负责关卡解锁和星级显示。
战斗结算负责更新关卡进度和星级。
失败引导依赖战斗失败数据和关卡推荐战力。
```

---

## 5. 关卡地图接入方式

主UI点击：

```text
作战任务 / CHAPTER MAP
```

时打开关卡选择地图。

调用：

```js
import {
  createFullChapterMapViewModel,
  createChapterMapViewModel,
  getCurrentRecommendedStage
} from "./systems/chapterMapSystem.js";

const mapViewModel = createFullChapterMapViewModel(progress);
```

UI根据 `mapViewModel` 渲染：

```text
序章3关
第1-9章每章10关
第5关机制关
第10关BOSS关
星级
锁定状态
当前推荐关卡
```

---

## 6. 战斗结算接入方式

战斗结束时，统一调用：

```js
import {
  settleBattle
} from "./systems/battleSettlementSystem.js";

const settlement = settleBattle({
  player,
  progress,
  battleResult,
  stageConfig,
  unlockedTasks,
  unlockedAchievements
});

player = settlement.player;
progress = settlement.progress;

renderBattleSettlement(settlement.viewModel);
```

`battleResult` 推荐结构：

```js
const battleResult = {
  isWin: true,
  isTimeOut: false,
  isPlayerDead: false,

  killCount: 120,
  enemyLeakCount: 0,

  battleSeconds: 90,

  playerFinalHp: 800,
  playerMaxHp: 1000,

  bossFinalHp: 0,
  bossMaxHp: 10000
};
```

`stageConfig` 推荐结构：

```js
const stageConfig = {
  stageId: "2_10",
  chapterIndex: 2,
  stageInChapter: 10,
  hasBoss: true,
  recommendedPower: 18000,
  recommendedArmorPenetration: 0.15
};
```

---

## 7. 失败引导接入方式

如果 `battleResult.isWin === false`，在结算界面中继续调用：

```js
import {
  getFailGuideViewModel,
  handleFailGuideAction
} from "./systems/failGuideSystem.js";

const failGuide = getFailGuideViewModel({
  battleResult,
  stageConfig,
  playerBuild
});

renderFailGuide(failGuide);
```

`playerBuild` 推荐结构：

```js
const playerBuild = {
  battlePower: 15200,
  totalArmorPenetration: 0.08,
  attackUpgradeLevel: 12,
  armorPenetrationUpgradeLevel: 6,
  hpUpgradeLevel: 10
};
```

按钮行为：

```js
handleFailGuideAction(failGuide.primaryAction, router);
```

`router` 需要提供：

```js
const router = {
  openUpgradePanel: ({ focusStat } = {}) => {},
  openHangarPanel: () => {},
  openPilotPanel: () => {},
  openShopPanel: () => {},
  replayStage: () => {}
};
```

---

## 8. 三星规则

本版本三星规则：

```text
1星：通关
2星：通关时生命高于50%
3星：不漏怪通关
```

注意：

```text
不做复杂评分。
不把时间纳入三星。
避免玩家压力过大。
```

---

## 9. 失败原因判断规则

失败引导按优先级判断：

```text
破甲不足
输出不足
生命不足
漏怪过多
BOSS未击破
战斗超时
战机被击坠
未知原因
```

失败后不要只显示“失败”。

要显示：

```text
失败原因
原因解释
推荐操作
主按钮
副按钮
```

---

## 10. 和已有系统的关系

这些文件需要和之前系统配合：

```text
enemyStageBalance.js 提供 stageConfig
taskSystemConfig.js 提供 unlockedTasks
achievementSystemConfig.js 提供 unlockedAchievements
fighter upgrade system 提供 playerBuild
progress save system 保存 clearedStageIds 和 stageStars
```

---

## 11. 必须进入存档的数据

战斗结算后要保存：

```js
progress.clearedStageIds
progress.clearedChapterIds
progress.stageStars
progress.perfectClearCount
progress.noDamageBossClearCount
player.gold
player.exp
```

否则关卡地图和成就任务会失效。

---

## 12. Codex禁止事项

```text
不要做新手引导
不要新增每日任务
不要把失败界面只做成“失败”两个字
不要让三星规则过于复杂
不要让关卡地图手写93个静态按钮
不要让星级不进存档
不要让结算奖励绕过金币经济
不要让失败引导直接弹商店作为唯一推荐
```

---

## 13. 最小部署检查

部署完成后检查：

```text
1. 点作战任务能打开关卡地图
2. 序章第1关默认解锁
3. 通关后下一关解锁
4. 通关后关卡显示星级
5. 第5关显示机制关标记
6. 第10关显示BOSS标记
7. 失败后能看到失败原因
8. 失败后按钮能跳转到升级/战机仓库/战姬界面
9. 胜利后能看到金币、经验、星级
10. 刷新游戏后通关状态仍然存在
```
