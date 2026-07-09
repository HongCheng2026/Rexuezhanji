# 战斗内飞行员剧情模块_说明给Codex

## 1. 模块用途

对应代码文件：

```text
battleStorySystem.js
```

该模块用于控制战斗过程中出现的轻量剧情通讯。

剧情呈现规则：

```text
战斗不暂停
不阻塞玩家操作
不遮挡主要战斗区域
由玩家当前选择的飞行员说话
飞行员头像和对白显示在画面左下角
对白自动消失
```

---

## 2. Codex最终要保存的文件

请把《战斗内飞行员剧情模块_Codex可直接粘贴版.md》中的代码保存为：

```text
battleStorySystem.js
```

然后在战斗系统中引用。

---

## 3. 当前飞行员数据要求

进入战斗时，玩家必须有一个当前选择的飞行员对象。

推荐结构：

```js
const selectedPilot = {
  id: "pilot_yelan",
  name: "夜岚",
  avatarId: "pilot_yelan_avatar"
};
```

如果没有传入飞行员，模块会使用默认飞行员：

```js
PILOT_FALLBACK_CONFIG
```

但是正式游戏中不建议缺省。

---

## 4. UI显示要求

战斗内剧情UI使用以下配置：

```js
BATTLE_STORY_UI_CONFIG
```

核心要求：

```text
position = bottom_left
nonBlocking = true
pauseBattle = false
blockInput = false
```

Codex实现UI时，应将剧情显示在画面左下角。

推荐UI结构：

```text
左下角飞行员头像
头像右侧或上方显示半透明通讯框
通讯框显示飞行员名字和对白
对白持续约2.2秒
重要对白持续约2.8秒
自动淡入淡出
```

不要弹出全屏剧情框。  
不要暂停游戏。  
不要挡住玩家飞机、子弹和敌机主体区域。

---

## 5. 战斗时间点

模块内置战斗剧情时间点：

```js
BATTLE_STORY_TIMELINE_SECONDS
```

当前时间点：

| 时间 | 事件 |
|---:|---|
| 0秒 | 开场通讯 |
| 30秒 | 中段敌情提示 |
| 60秒 | BOSS出现 |
| 75秒 | BOSS爆发 |
| 85秒 | 最后警告 |

正式章节第10关有BOSS事件。  
序章和普通小关默认没有BOSS事件。

---

## 6. 章节通用对白

章节通用对白存放在：

```js
GENERIC_BATTLE_STORY_BY_CHAPTER
```

如果某一关没有特殊剧情，就使用章节通用对白。

例如：

```js
GENERIC_BATTLE_STORY_BY_CHAPTER[2].midWave
```

代表第2章中段提示。

Codex不要把这些文案写死在战斗系统里，应从该配置中读取。

---

## 7. 特殊关卡对白

特殊关卡对白存放在：

```js
SPECIAL_STAGE_BATTLE_STORY
```

当前关键关卡包括：

```text
1_10
2_5
2_10
7_5
7_10
9_10
```

这些关卡会覆盖章节通用对白。

例如第2章第5关：

```js
SPECIAL_STAGE_BATTLE_STORY["2_5"]
```

用于提示重甲敌机和破甲属性重要性。

第7章第10关用于提示：

```text
S级飞行员 + S级战机的重要性
```

---

## 8. 关卡ID规则

关卡ID由：

```js
getStageId(chapterIndex, stageInChapter)
```

生成。

规则：

```text
序章第1关 = prologue_1
第1章第10关 = 1_10
第7章第5关 = 7_5
第9章第10关 = 9_10
```

Codex不要手写额外规则，统一调用该函数。

---

## 9. 战斗开始时如何接入

进入关卡时，调用：

```js
const storyRuntime = createBattleStoryRuntime({
  chapterIndex,
  stageInChapter,
  selectedPilot,
  hasBoss
});
```

`hasBoss` 可以从关卡配置中读取。

如果已经使用 `enemyStageBalance.js`，可以这样接入：

```js
const stageConfig = getStageConfig(chapterIndex, stageInChapter);

const storyRuntime = createBattleStoryRuntime({
  chapterIndex,
  stageInChapter,
  selectedPilot,
  hasBoss: stageConfig.hasBoss
});
```

---

## 10. 战斗循环中如何调用

在战斗update循环中，每帧或每0.1秒调用：

```js
const eventsToShow = storyRuntime.getEventsToShow(currentBattleSeconds);
```

然后把返回的事件交给UI系统显示。

示例：

```js
const eventsToShow = storyRuntime.getEventsToShow(currentBattleSeconds);

for (const event of eventsToShow) {
  if (shouldRenderBattleStoryMessage(event)) {
    showBattleStoryMessage(event);
  }
}
```

`showBattleStoryMessage(event)` 由游戏UI系统实现。

事件中已经包含：

```js
speakerName
avatarId
text
uiPosition
durationMs
pauseBattle
blockInput
```

---

## 11. 战斗结果剧情如何调用

战斗结束时调用：

```js
const resultEvent = getBattleResultStoryEvent({
  chapterIndex,
  stageInChapter,
  selectedPilot,
  isWin
});
```

如果返回 `null`，表示该关没有战后剧情。

如果不为 `null`，显示该事件。

示例：

```js
const resultEvent = getBattleResultStoryEvent({
  chapterIndex,
  stageInChapter,
  selectedPilot,
  isWin: true
});

if (shouldRenderBattleStoryMessage(resultEvent)) {
  showBattleStoryMessage(resultEvent);
}
```

---

## 12. 事件对象结构

`createPilotBattleStoryEvent()` 返回的事件结构：

```js
{
  time,
  type,
  speakerType,
  speakerId,
  speakerName,
  avatarId,
  text,
  rawText,
  uiPosition,
  nonBlocking,
  pauseBattle,
  blockInput,
  durationMs
}
```

Codex UI系统应使用：

```js
speakerName
avatarId
text
uiPosition
durationMs
```

不要使用 `rawText` 直接显示，`rawText` 是未截断原文。

---

## 13. 文案长度控制

模块会通过：

```js
trimBattleStoryText(text)
```

将显示对白限制在：

```text
28个字符以内
```

这样可以避免左下角通讯框过宽，影响战斗视野。

如需调整长度，修改：

```js
BATTLE_STORY_UI_CONFIG.textMaxLength
```

---

## 14. Codex禁止事项

Codex不要做以下事情：

1. 不要让战斗剧情暂停游戏。
2. 不要让战斗剧情阻塞玩家输入。
3. 不要把剧情框放在屏幕中央。
4. 不要让剧情遮挡玩家飞机。
5. 不要让剧情遮挡主要弹幕区域。
6. 不要在战斗中播放长对白。
7. 不要让BOSS代替当前飞行员在战斗中说提示。
8. 不要把当前飞行员写死为某一个角色。
9. 不要在普通关每几秒刷一句话。
10. 不要绕过 `createBattleStoryRuntime()` 自己写时间触发逻辑。

---

## 15. 最小接入示例

```js
import {
  createBattleStoryRuntime,
  shouldRenderBattleStoryMessage,
  getBattleResultStoryEvent
} from "./battleStorySystem.js";

const selectedPilot = {
  id: "pilot_yelan",
  name: "夜岚",
  avatarId: "pilot_yelan_avatar"
};

const storyRuntime = createBattleStoryRuntime({
  chapterIndex: 2,
  stageInChapter: 5,
  selectedPilot,
  hasBoss: false
});

function updateBattle(currentBattleSeconds) {
  const events = storyRuntime.getEventsToShow(currentBattleSeconds);

  for (const event of events) {
    if (shouldRenderBattleStoryMessage(event)) {
      showBattleStoryMessage(event);
    }
  }
}

function onBattleEnd(isWin) {
  const resultEvent = getBattleResultStoryEvent({
    chapterIndex: 2,
    stageInChapter: 5,
    selectedPilot,
    isWin
  });

  if (shouldRenderBattleStoryMessage(resultEvent)) {
    showBattleStoryMessage(resultEvent);
  }
}
```

---

## 16. UI系统需要实现的函数

Codex需要在游戏UI层实现：

```js
showBattleStoryMessage(event)
```

建议该函数执行：

```text
读取 event.avatarId 显示飞行员头像
读取 event.speakerName 显示飞行员名字
读取 event.text 显示对白
固定显示在左下角
持续 event.durationMs 后自动隐藏
不暂停游戏
不阻塞输入
```

---

## 17. 与关卡系统的关系

本模块只负责战斗内剧情提示。

关卡是否有BOSS、当前是第几章第几关，可以从关卡模块获取：

```js
getStageConfig(chapterIndex, stageInChapter)
```

推荐流程：

```text
关卡系统生成 stageConfig
玩家系统提供 selectedPilot
剧情系统生成 storyRuntime
战斗update循环触发剧情事件
UI系统显示左下角通讯
```
