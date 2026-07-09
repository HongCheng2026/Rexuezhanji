# 05_剧情系统说明给Codex

## 1. 文件关系

本次剧情系统包含两个代码文件：

```text
stageStoryConfig.js
battleStoryPlaybackSystem.js
```

`stageStoryConfig.js` 负责保存剧本内容。  
`battleStoryPlaybackSystem.js` 负责在战斗中按时间播放剧情。

Codex不要把这两个文件合并。

---

## 2. 剧情内容文件

把《03_全关卡剧情对白配置_Codex可直接粘贴版.md》中的代码保存为：

```text
stageStoryConfig.js
```

这个文件包含：

```text
游戏剧情总信息
序章到第9章的章节信息
序章3关 + 1-9章90关的关卡剧情
战前剧情
战斗中剧情
胜利剧情
失败剧情
```

---

## 3. 战斗播放文件

把《04_战斗内剧情播放系统_Codex可直接粘贴版.md》中的代码保存为：

```text
battleStoryPlaybackSystem.js
```

这个文件负责：

```text
读取当前关卡剧情
读取当前选择飞行员
把current_pilot替换为玩家当前选择的飞行员
在0秒、30秒、60秒、75秒、85秒触发对白
生成UI可显示的事件对象
```

---

## 4. 当前选择飞行员

进入战斗时，必须传入玩家当前选择的飞行员：

```js
const selectedPilot = {
  id: "pilot_yelan",
  name: "夜岚",
  avatarId: "pilot_yelan_avatar"
};
```

战斗中大部分剧情的 speakerType 是：

```text
current_pilot
```

播放系统会自动把它替换成当前飞行员。

---

## 5. 战斗中剧情显示位置

战斗中剧情必须显示在：

```text
画面左下角
```

UI要求：

```text
不暂停游戏
不阻塞玩家操作
不遮挡战斗主体
自动消失
```

UI系统需要实现：

```js
showBattleStoryMessage(event)
```

事件里会提供：

```js
speakerName
avatarId
text
durationMs
uiPosition
pauseBattle
blockInput
```

---

## 6. 战斗接入示例

```js
import {
  createBattleStoryRuntime,
  getBattleResultStoryEvents,
  shouldRenderBattleStoryMessage
} from "./battleStoryPlaybackSystem.js";

const storyRuntime = createBattleStoryRuntime({
  chapterIndex: 2,
  stageInChapter: 5,
  selectedPilot
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
  const resultEvents = getBattleResultStoryEvents({
    chapterIndex: 2,
    stageInChapter: 5,
    selectedPilot,
    isWin
  });

  for (const event of resultEvents) {
    if (shouldRenderBattleStoryMessage(event)) {
      showBattleStoryMessage(event);
    }
  }
}
```

---

## 7. 关键剧情节点

```text
1-10：最终BOSS弥赛亚首次现身
2-5：首次明确重甲敌机与破甲重要性
2-10：明确S级飞行员和S级战机价值
7-5：真正重甲门槛
7-10：S级组合检测关
9-10：最终决战弥赛亚
```

---

## 8. Codex禁止事项

```text
不要让剧情暂停战斗
不要让剧情阻塞玩家输入
不要把剧情框放到屏幕中央
不要让普通战斗剧情由固定飞行员说
不要删除current_pilot机制
不要让弥赛亚在普通关频繁说话
不要把9-10之前的弥赛亚当作最终被击败状态
不要改动1-10结尾弥赛亚首次现身
不要改动2章强调S级战力价值的剧情
不要改动7章作为S级门槛的剧情定位
```

---

## 9. 推荐目录

```text
src/
  story/
    stageStoryConfig.js
    battleStoryPlaybackSystem.js
```
