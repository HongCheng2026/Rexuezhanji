# 任务与成就系统说明给Codex

## 1. 需要创建的代码文件

把两份代码分别保存为：

```text
taskSystemConfig.js
achievementSystemConfig.js
```

推荐目录：

```text
src/systems/taskSystemConfig.js
src/systems/achievementSystemConfig.js
```

---

## 2. 设计目标

本系统不做每日任务。

任务和成就的目标是：

```text
给玩家短期目标
让玩家顺着关卡推进获得奖励
不要逼玩家每天登录打卡
不要让任务奖励破坏金币经济
```

---

## 3. 金币经济约束

当前金币经济规则：

```text
体力获得的金币：刚好够战机强化到当前指挥官等级
任务获得的金币：总量150,000金币，只够买A级战机
成就获得的金币：0金币，只给称号、头像框、徽章
```

价格锚点：

```text
A级战机 = 150,000金币
S级飞行员 = 900,000金币
S级战机 = 1,300,000金币
```

所以任务和成就不会支撑玩家直接购买S级。

---

## 4. 任务系统结构

任务系统分3类：

```text
成长任务
章节任务
挑战任务
```

不允许新增：

```text
每日任务
限时登录任务
每天打几局任务
每天看广告任务
```

任务总金币：

```text
150,000金币
```

正好等于A级战机价格。

---

## 5. 成就系统结构

成就系统分5类：

```text
通关成就
完美成就
收集成就
强化成就
挑战成就
```

成就奖励不发金币，只发：

```text
称号
头像框
徽章
```

原因：

```text
成就是收藏感和长期目标，不应该成为主要金币来源。
金币主来源仍然是体力战斗和任务系统。
```

---

## 6. 玩家数据要求

任务和成就系统需要读取玩家数据。

推荐 player 结构：

```js
const player = {
  gold: 0,
  stamina: 300,

  ownedPilotIds: ["pilot_yelan"],
  ownedFighterIds: ["fighter_silver_falcon"],

  pilots: [
    {
      id: "pilot_yelan",
      rarity: "S"
    }
  ],

  fighters: [
    {
      id: "fighter_silver_falcon",
      rarity: "A",
      upgrades: {
        attack: 10,
        armorPenetration: 8,
        hp: 10
      }
    }
  ],

  inventory: {},
  titleIds: [],
  avatarFrameIds: [],
  badgeIds: []
};
```

---

## 7. 进度数据要求

推荐 progress 结构：

```js
const progress = {
  clearedStageIds: ["prologue_1", "prologue_2", "prologue_3", "1_1"],
  clearedChapterIds: [1],

  perfectClearCount: 10,
  noDamageBossClearCount: 1,
  underPowerBossClearCount: 0,

  specialClearRecords: [
    {
      stageId: "2_10",
      targetType: "pilot",
      rarity: "B"
    }
  ]
};
```

`specialClearRecords` 用于记录挑战条件，比如：

```text
使用B级飞行员通关2-10
使用B级飞行员通关3-10
战力低于推荐值通关BOSS关
```

---

## 8. 任务系统接入示例

```js
import {
  createTaskState,
  getTaskListViewModel,
  claimTaskReward,
  TASK_CATEGORY
} from "./taskSystemConfig.js";

let taskState = createTaskState();

function refreshGrowthTaskUi(player, progress) {
  const taskList = getTaskListViewModel({
    taskState,
    player,
    progress,
    category: TASK_CATEGORY.GROWTH
  });

  renderTaskList(taskList);
}

function onClickClaimTask(taskId, player, progress) {
  const result = claimTaskReward({
    taskId,
    taskState,
    player,
    progress
  });

  if (result.success) {
    player = result.player;
    taskState = result.taskState;
    showToast("领取成功");
  } else {
    showToast(result.reason);
  }
}
```

---

## 9. 成就系统接入示例

```js
import {
  createAchievementState,
  getAchievementListViewModel,
  claimAchievementReward,
  ACHIEVEMENT_CATEGORY
} from "./achievementSystemConfig.js";

let achievementState = createAchievementState();

function refreshAchievementUi(player, progress) {
  const achievementList = getAchievementListViewModel({
    achievementState,
    player,
    progress,
    category: ACHIEVEMENT_CATEGORY.CLEAR
  });

  renderAchievementList(achievementList);
}

function onClickClaimAchievement(achievementId, player, progress) {
  const result = claimAchievementReward({
    achievementId,
    achievementState,
    player,
    progress
  });

  if (result.success) {
    player = result.player;
    achievementState = result.achievementState;
    showToast("成就奖励已领取");
  } else {
    showToast(result.reason);
  }
}
```

---

## 10. UI建议

任务入口：

```text
主界面底部：任务
```

任务界面三页签：

```text
成长
章节
挑战
```

成就入口：

```text
主界面底部或设置旁：成就
```

成就界面五页签：

```text
通关
完美
收集
强化
挑战
```

---

## 11. Codex禁止事项

```text
不要添加每日任务
不要添加限时任务
不要让成就发金币
不要把任务金币总量改到超过150,000
不要让任务奖励直接送S级飞行员
不要让任务奖励直接送S级战机
不要让任务系统绕过强化金币闭环
不要删除任务和成就的领取状态记录
不要允许同一个任务或成就重复领奖
```

---

## 12. 保存状态

任务领取状态：

```js
taskState.claimedTaskIds
```

成就领取状态：

```js
achievementState.claimedAchievementIds
```

这些状态必须进入本地存档。

H5本地版可以先保存到 localStorage。  
后续如接服务器，需要以服务器存档为准。
