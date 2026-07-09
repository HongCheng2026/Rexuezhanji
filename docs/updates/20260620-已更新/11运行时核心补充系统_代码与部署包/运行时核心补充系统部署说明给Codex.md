# 运行时核心补充系统部署说明给Codex

## 1. 本次部署范围

本次部署以下8个系统：

```text
资源加载与资源管理
暂停系统
复活系统
奖励弹窗
道具背包
数据埋点
资源命名规范
错误兜底
```

其中暂停和复活写在同一个文件里。  
奖励弹窗和背包写在同一个文件里。

---

## 2. 需要创建的代码文件

把各 md 中的代码保存为：

```text
src/systems/resourceManager.js
src/systems/pauseReviveSystem.js
src/systems/rewardInventorySystem.js
src/systems/analyticsSystem.js
src/systems/assetNamingSystem.js
src/systems/errorFallbackSystem.js
```

---

## 3. 推荐部署顺序

```text
1. errorFallbackSystem.js
2. assetNamingSystem.js
3. resourceManager.js
4. rewardInventorySystem.js
5. pauseReviveSystem.js
6. analyticsSystem.js
```

原因：

```text
错误兜底最底层。
资源命名规范影响资源路径。
资源加载依赖兜底。
奖励和背包是任务、成就、结算、兑换码共用底层。
暂停复活接战斗。
埋点最后接入所有系统。
```

---

## 4. 资源管理接入

游戏启动时：

```js
import {
  createResourceManager,
  detectLowEndDevice
} from "./systems/resourceManager.js";

const resourceManager = createResourceManager({
  isLowEndDevice: detectLowEndDevice()
});

await resourceManager.preloadCore();
```

打开子UI时：

```js
await resourceManager.loadGroup("sub_ui");
```

进入战斗前：

```js
await resourceManager.loadGroup("battle");
```

离开战斗后可释放：

```js
resourceManager.releaseGroup("battle");
```

---

## 5. 暂停系统接入

战斗初始化：

```js
import {
  createPauseState,
  pauseBattle,
  resumeBattle,
  createPausePanelViewModel
} from "./systems/pauseReviveSystem.js";

let pauseState = createPauseState();
```

点击暂停：

```js
const result = pauseBattle(pauseState);
pauseState = result.pauseState;
renderPausePanel(createPausePanelViewModel());
```

点击继续：

```js
const result = resumeBattle(pauseState);
pauseState = result.pauseState;
closePausePanel();
```

暂停期间：

```text
战斗计时暂停
敌机生成暂停
子弹暂停
玩家输入暂停
不能结算奖励
```

---

## 6. 复活系统接入

玩家死亡时：

```js
import {
  createReviveState,
  createRevivePanelViewModel,
  reviveBattle
} from "./systems/pauseReviveSystem.js";

let reviveState = createReviveState();

const panel = createRevivePanelViewModel({
  player,
  battleState,
  reviveState
});

renderRevivePanel(panel);
```

点击复活：

```js
const result = reviveBattle({
  battleState,
  player,
  reviveState
});

if (result.success) {
  player = result.player;
  battleState = result.battleState;
  reviveState = result.reviveState;
}
```

规则：

```text
每场最多复活1次
复活恢复50%生命
优先消耗复活道具
没有道具时可消耗金币
```

---

## 7. 奖励弹窗和背包接入

所有奖励统一走：

```js
import {
  createInventoryState,
  applyRewards,
  createRewardPopupViewModel
} from "./systems/rewardInventorySystem.js";
```

领取任务奖励、成就奖励、兑换码奖励、结算奖励时：

```js
const result = applyRewards({
  player,
  inventoryState,
  rewards
});

player = result.player;
inventoryState = result.inventoryState;

renderRewardPopup(
  createRewardPopupViewModel({
    title: "获得奖励",
    rewards
  })
);
```

不要每个系统自己写一套奖励弹窗。

---

## 8. 背包系统接入

背包数据结构：

```js
inventoryState = {
  items: {
    revive_token: 1,
    stamina_potion: 2,
    fighter_upgrade_ticket: 3
  }
};
```

打开背包时：

```js
import {
  getInventoryListViewModel
} from "./systems/rewardInventorySystem.js";

const itemList = getInventoryListViewModel(inventoryState);
renderInventoryPanel(itemList);
```

---

## 9. 数据埋点接入

游戏启动：

```js
import {
  createAnalyticsSystem,
  ANALYTICS_EVENT
} from "./systems/analyticsSystem.js";

const analytics = createAnalyticsSystem();

analytics.track(ANALYTICS_EVENT.GAME_START);
```

关卡开始：

```js
analytics.track(ANALYTICS_EVENT.STAGE_START, {
  stageId,
  playerPower,
  armorPenetration
});
```

关卡失败：

```js
analytics.track(ANALYTICS_EVENT.STAGE_FAIL, {
  stageId,
  failReason,
  playerPower,
  recommendedPower
});
```

必须记录：

```text
玩家卡在哪一关
失败原因
强化了什么属性
是否购买A级战机
是否看过S级提示
是否打开商店
是否点击赞助我们
第几关流失
第几分钟退出
```

---

## 10. 资源命名规范接入

所有新增资源必须遵守：

```text
UI：ui_模块_名称.png
图标：icon_名称.png
战姬大图：pilot_角色id_full.png
战姬头像：pilot_角色id_avatar.png
战机大图：fighter_战机id_full.png
战机图标：fighter_战机id_icon.png
敌机：enemy_类型_编号.png
BOSS：boss_chapter_章节_bossid.png
音效：audio_模块_名称.mp3
```

Codex 新增资源文件时，先检查命名，不要乱命名。

---

## 11. 错误兜底接入

初始化：

```js
import {
  createFallbackSystem,
  repairSaveData
} from "./systems/errorFallbackSystem.js";

const fallbackSystem = createFallbackSystem();
```

读取存档时：

```js
const saveData = repairSaveData(rawSaveData);
```

图片加载失败：

```js
const fallbackImage = fallbackSystem.getFallbackImage("fighter");
```

任何异常不要直接崩溃，要进入兜底逻辑。

---

## 12. 必须进入存档的数据

新增需要保存：

```text
inventoryState
pause/revive不需要长期保存，只存在单场战斗内
analytics本地事件
settings
resource quality setting
```

---

## 13. Codex禁止事项

```text
不要让暂停时继续计时
不要让暂停时继续刷敌人
不要让每场复活超过1次
不要让奖励系统各模块各写一套
不要让背包和奖励分裂成两套数据
不要忽略资源加载失败
不要新增乱命名资源
不要删除埋点
不要让存档损坏导致白屏
```

---

## 14. 最小验收标准

```text
1. 游戏启动能预加载主UI资源
2. 图片丢失不会白屏
3. 战斗中可以暂停和继续
4. 玩家死亡后可弹出复活面板
5. 每场最多复活一次
6. 任务、成就、兑换码、结算奖励都能弹统一奖励弹窗
7. 背包能显示道具数量
8. 关卡失败会记录埋点
9. 打开商店会记录埋点
10. 存档损坏能修复基础结构
```
