# 03_主界面右侧六宫格按钮修改_Codex可直接粘贴版

```js
// mainRightGridConfig.js

export const MAIN_RIGHT_GRID_CONFIG = {
  containerId: "main_right_grid",
  columns: 3,
  rows: 2,
  gapX: 14,
  gapY: 14,
  buttonWidth: 135,
  buttonHeight: 130,

  removedButtons: [
    "mail",
    "sign_in",
    "setting"
  ]
};

export const MAIN_RIGHT_GRID_BUTTONS = [
  {
    id: "task",
    title: "任务",
    subTitle: "TASK",
    iconKey: "task",
    route: "task_panel",
    row: 1,
    col: 1,
    visible: true
  },
  {
    id: "event",
    title: "活动",
    subTitle: "EVENT",
    iconKey: "event",
    route: "event_panel",
    row: 1,
    col: 2,
    visible: true
  },
  {
    id: "achievement",
    title: "成就",
    subTitle: "ACHIEVEMENT",
    iconKey: "achievement",
    route: "achievement_panel",
    row: 1,
    col: 3,
    visible: true
  },
  {
    id: "shop",
    title: "商店",
    subTitle: "SHOP",
    iconKey: "shop",
    route: "shop_panel",
    row: 2,
    col: 1,
    visible: true
  },
  {
    id: "friend",
    title: "好友",
    subTitle: "FRIEND",
    iconKey: "friend",
    route: "friend_panel",
    row: 2,
    col: 2,
    visible: true
  },
  {
    id: "ranking",
    title: "排行榜",
    subTitle: "RANKING",
    iconKey: "ranking",
    route: "ranking_panel",
    row: 2,
    col: 3,
    visible: true
  }
];

export function getMainRightGridButtons() {
  return MAIN_RIGHT_GRID_BUTTONS
    .filter((button) => button.visible)
    .sort((a, b) => {
      if (a.row !== b.row) {
        return a.row - b.row;
      }

      return a.col - b.col;
    });
}

export function getMainRightGridButtonById(buttonId) {
  return MAIN_RIGHT_GRID_BUTTONS.find((button) => button.id === buttonId) || null;
}

export function handleMainRightGridClick(buttonId, router) {
  const button = getMainRightGridButtonById(buttonId);

  if (!button) {
    return {
      success: false,
      reason: "BUTTON_NOT_FOUND"
    };
  }

  if (button.route === "task_panel") {
    router.openTaskPanel?.();
  }

  if (button.route === "event_panel") {
    router.openEventPanel?.();
  }

  if (button.route === "achievement_panel") {
    router.openAchievementPanel?.();
  }

  if (button.route === "shop_panel") {
    router.openShopPanel?.();
  }

  if (button.route === "friend_panel") {
    router.openFriendPanel?.();
  }

  if (button.route === "ranking_panel") {
    router.openRankingPanel?.();
  }

  return {
    success: true,
    reason: "OK",
    route: button.route
  };
}
```

## 改动目标

```text
去掉：设置
去掉：邮件
去掉：签到

右侧只保留6个按钮，两排三列：

第一排：任务 / 活动 / 成就
第二排：商店 / 好友 / 排行榜
```

## 注意

```text
设置可以保留在顶部小齿轮入口。
邮件可以后续放进公告/系统消息里。
签到不做，避免和“不做每日任务”的规则冲突。
```
