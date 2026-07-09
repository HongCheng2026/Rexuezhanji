# 06_主UI布局总配置_Codex可直接粘贴版

```js
// mainUiLayoutPatchConfig.js

import {
  getMainLeftEntryButtons,
  handleMainLeftEntryClick
} from "./mainLeftEntryConfig.js";

import {
  createPlayerProfileHeaderViewModel,
  updatePlayerName,
  updatePlayerAvatar,
  equipNameplate
} from "./playerProfileHeaderConfig.js";

import {
  getMainRightGridButtons,
  handleMainRightGridClick
} from "./mainRightGridConfig.js";

import {
  getBottomPromoCards,
  handleBottomPromoClick
} from "./bottomPromoConfig.js";

import {
  createChatState,
  createChatBarViewModel,
  switchChatChannel,
  addChatMessage
} from "./mainChatChannelConfig.js";

export const MAIN_UI_PATCH_VERSION = "main-ui-patch-2026-06-20";

export const MAIN_UI_PATCH_SUMMARY = {
  leftEntries: "左侧3个大按钮改为：战姬、战机、战机升级。",
  playerProfile: "玩家头像可上传，名字可修改，名字支持成就铭牌，右侧黄色位改为荣誉等级。",
  rightGrid: "右侧九宫格改为六宫格：任务、活动、成就、商店、好友、排行榜。",
  bottomPromo: "去掉首充礼包，改成赞助我们。",
  chat: "聊天框增加频道：系统、世界、公会、好友。"
};

export function createMainUiViewModel({
  playerProfile,
  chatState
}) {
  return {
    patchVersion: MAIN_UI_PATCH_VERSION,

    leftEntries: getMainLeftEntryButtons(),
    playerProfileHeader: createPlayerProfileHeaderViewModel(playerProfile),
    rightGridButtons: getMainRightGridButtons(),
    bottomPromoCards: getBottomPromoCards(),
    chatBar: createChatBarViewModel(chatState),

    removedUi: [
      "left_chapter_map_entry",
      "right_mail_button",
      "right_sign_in_button",
      "right_setting_button",
      "first_top_up_button"
    ]
  };
}

export const MAIN_UI_PATCH_API = {
  getMainLeftEntryButtons,
  handleMainLeftEntryClick,

  createPlayerProfileHeaderViewModel,
  updatePlayerName,
  updatePlayerAvatar,
  equipNameplate,

  getMainRightGridButtons,
  handleMainRightGridClick,

  getBottomPromoCards,
  handleBottomPromoClick,

  createChatState,
  createChatBarViewModel,
  switchChatChannel,
  addChatMessage
};
```
