# 主UI改动部署说明给Codex

## 1. 本次要修改的5个区域

本次只改主界面UI结构，不改战斗数值。

修改区域：

```text
1. 左侧三个大入口按钮
2. 左上角玩家信息栏
3. 右侧九宫格功能按钮
4. 底部礼包位
5. 底部聊天框
```

---

## 2. 要创建的代码文件

请把对应 md 中的代码保存为以下 JS 文件：

```text
src/ui/main/mainLeftEntryConfig.js
src/ui/main/playerProfileHeaderConfig.js
src/ui/main/mainRightGridConfig.js
src/ui/main/bottomPromoConfig.js
src/ui/main/mainChatChannelConfig.js
src/ui/main/mainUiLayoutPatchConfig.js
```

---

## 3. 左侧三个大入口按钮

原来左侧是：

```text
作战任务
战机仓库
升级
```

现在改为：

```text
战姬 / PILOT
战机 / FIGHTER
战机升级 / UPGRADE
```

对应路由：

```text
战姬 -> openPilotPanel()
战机 -> openHangarPanel()
战机升级 -> openUpgradePanel()
```

注意：

```text
作战任务不放在左侧了。
任务入口放到右侧六宫格的“任务”按钮里。
```

---

## 4. 玩家信息栏

左上角玩家信息栏需要改成：

```text
玩家头像：玩家可自己上传
玩家名字：默认“王牌飞行员”，玩家可修改
名字铭牌：来自成就系统，可装备
荣誉等级：最右侧黄色方块显示荣誉等级图标
```

保留：

```text
等级
经验进度条
```

移除或替换：

```text
最右侧原来的三条竖线按钮
```

改为：

```text
荣誉等级图标
```

荣誉等级图标可以使用之前白底小UI里的 Lv.1-Lv.10 荣誉勋章。

---

## 5. 右侧按钮区

原来是九宫格：

```text
任务
活动
成就
排行榜
邮件
签到
商店
好友
设置
```

现在改成六宫格：

```text
第一排：任务 / 活动 / 成就
第二排：商店 / 好友 / 排行榜
```

必须去掉：

```text
邮件
签到
设置
```

原因：

```text
设置和顶部齿轮重复。
邮件不是当前核心功能。
签到会和“不做每日任务”的原则冲突。
```

---

## 6. 底部礼包位

原来：

```text
首充礼包 / FIRST TOP-UP
```

改为：

```text
赞助我们 / SUPPORT US
```

保留：

```text
星穹之翼 / 限时概率提升
```

注意：

```text
不要再出现“首充礼包”字样。
赞助我们可以打开 sponsor_panel。
```

---

## 7. 聊天框

底部聊天框增加频道：

```text
系统
世界
公会
好友
```

显示格式：

```text
[系统] 系统：欢迎加入飞行战队，指挥官。
[世界] 王牌飞行员：欢迎加入飞行战队！
[公会] 系统：加入公会后可查看公会消息。
[好友] 系统：添加好友后可查看好友消息。
```

频道切换只切换聊天显示，不影响战斗。

---

## 8. 总入口文件

创建总入口：

```text
mainUiLayoutPatchConfig.js
```

页面初始化时调用：

```js
import {
  createMainUiViewModel
} from "./ui/main/mainUiLayoutPatchConfig.js";

const mainUiViewModel = createMainUiViewModel({
  playerProfile,
  chatState
});
```

然后用 `mainUiViewModel` 渲染主UI。

---

## 9. 路由对象要求

主界面需要提供 router：

```js
const router = {
  openPilotPanel: () => {},
  openHangarPanel: () => {},
  openUpgradePanel: () => {},

  openTaskPanel: () => {},
  openEventPanel: () => {},
  openAchievementPanel: () => {},
  openShopPanel: () => {},
  openFriendPanel: () => {},
  openRankingPanel: () => {},

  openStarWingEvent: () => {},
  openSponsorPanel: (config) => {}
};
```

---

## 10. 需要接入存档的数据

玩家资料需要进存档：

```js
playerProfile = {
  avatarAsset: "",
  uploadedAvatarDataUrl: "",
  name: "王牌飞行员",
  level: 12,
  exp: 1401,
  nextExp: 2318,
  equippedNameplateId: "nameplate_new_pilot",
  honorLevel: 1
};
```

聊天状态可以本地保存：

```js
chatState = {
  activeChannel: "world",
  messages: {}
};
```

---

## 11. Codex禁止事项

```text
不要保留左侧“作战任务”
不要保留右侧“邮件”
不要保留右侧“签到”
不要保留右侧“设置”
不要保留“首充礼包”
不要把玩家名字写死不能改
不要把头像写死不能上传
不要把荣誉等级继续做成三条竖线
不要让聊天框只有世界频道
```

---

## 12. 最小验收标准

部署完成后检查：

```text
1. 左侧显示：战姬、战机、战机升级
2. 点击战姬打开战姬界面
3. 点击战机打开战机仓库
4. 点击战机升级打开升级界面
5. 左上角头像可替换
6. 玩家名字可修改
7. 名字能显示铭牌
8. 右侧只剩6个按钮
9. 右侧没有邮件、签到、设置
10. 底部没有首充礼包，显示赞助我们
11. 聊天框可以切换系统、世界、公会、好友
```
