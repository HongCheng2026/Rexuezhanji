# 设置界面兑换码功能模块_Codex可直接粘贴版

```js
// redeemCodeSystem.js

export const SETTINGS_REDEEM_CODE_UI_CONFIG = {
  entryPageId: "settings",
  entryButtonId: "settings_redeem_code_button",
  entryButtonText: "兑换码",

  modalId: "redeem_code_modal",
  modalTitle: "兑换码兑换",

  inputId: "redeem_code_input",
  inputPlaceholder: "请输入兑换码",

  confirmButtonId: "redeem_code_confirm_button",
  confirmButtonText: "兑换",

  closeButtonId: "redeem_code_close_button",
  closeButtonText: "关闭",

  successToastDurationMs: 1800,
  errorToastDurationMs: 1800,

  inputMaxLength: 24,
  autoUpperCase: true,
  trimSpace: true
};

export const REDEEM_REWARD_TYPE = {
  GOLD: "gold",
  STAMINA: "stamina",
  PILOT: "pilot",
  FIGHTER: "fighter",
  ITEM: "item"
};

export const REDEEM_CODE_STATUS = {
  OK: "OK",
  EMPTY_CODE: "EMPTY_CODE",
  CODE_NOT_FOUND: "CODE_NOT_FOUND",
  CODE_ALREADY_USED: "CODE_ALREADY_USED",
  CODE_EXPIRED: "CODE_EXPIRED",
  PLAYER_LEVEL_NOT_ENOUGH: "PLAYER_LEVEL_NOT_ENOUGH"
};

export const REDEEM_CODE_CONFIG = {
  "RXZJ666": {
    code: "RXZJ666",
    title: "新手出击礼包",
    description: "金币30000，体力50",
    expireAt: null,
    minCommanderLevel: 1,
    rewards: [
      {
        type: REDEEM_REWARD_TYPE.GOLD,
        amount: 30000
      },
      {
        type: REDEEM_REWARD_TYPE.STAMINA,
        amount: 50
      }
    ]
  },

  "SKY2026": {
    code: "SKY2026",
    title: "苍穹补给礼包",
    description: "金币50000",
    expireAt: null,
    minCommanderLevel: 1,
    rewards: [
      {
        type: REDEEM_REWARD_TYPE.GOLD,
        amount: 50000
      }
    ]
  },

  "FIGHTER888": {
    code: "FIGHTER888",
    title: "战机强化礼包",
    description: "金币80000，战机强化券1张",
    expireAt: null,
    minCommanderLevel: 5,
    rewards: [
      {
        type: REDEEM_REWARD_TYPE.GOLD,
        amount: 80000
      },
      {
        type: REDEEM_REWARD_TYPE.ITEM,
        itemId: "fighter_upgrade_ticket",
        amount: 1
      }
    ]
  },

  "PILOT888": {
    code: "PILOT888",
    title: "飞行员补给礼包",
    description: "金币60000，飞行员训练芯片3个",
    expireAt: null,
    minCommanderLevel: 3,
    rewards: [
      {
        type: REDEEM_REWARD_TYPE.GOLD,
        amount: 60000
      },
      {
        type: REDEEM_REWARD_TYPE.ITEM,
        itemId: "pilot_training_chip",
        amount: 3
      }
    ]
  },

  "ACE2026": {
    code: "ACE2026",
    title: "王牌成长礼包",
    description: "金币100000，体力100",
    expireAt: null,
    minCommanderLevel: 10,
    rewards: [
      {
        type: REDEEM_REWARD_TYPE.GOLD,
        amount: 100000
      },
      {
        type: REDEEM_REWARD_TYPE.STAMINA,
        amount: 100
      }
    ]
  }
};

export function normalizeRedeemCode(rawCode) {
  if (!rawCode) {
    return "";
  }

  let code = String(rawCode);

  if (SETTINGS_REDEEM_CODE_UI_CONFIG.trimSpace) {
    code = code.trim();
  }

  code = code.replace(/\s+/g, "");

  if (SETTINGS_REDEEM_CODE_UI_CONFIG.autoUpperCase) {
    code = code.toUpperCase();
  }

  return code.slice(0, SETTINGS_REDEEM_CODE_UI_CONFIG.inputMaxLength);
}

export function createRedeemCodeState({
  usedRedeemCodes = []
} = {}) {
  return {
    usedRedeemCodes: [...usedRedeemCodes]
  };
}

export function isRedeemCodeUsed({
  redeemState,
  code
}) {
  return redeemState.usedRedeemCodes.includes(code);
}

export function isRedeemCodeExpired(redeemConfig, now = Date.now()) {
  if (!redeemConfig.expireAt) {
    return false;
  }

  return now > new Date(redeemConfig.expireAt).getTime();
}

export function validateRedeemCode({
  rawCode,
  player,
  redeemState,
  now = Date.now()
}) {
  const code = normalizeRedeemCode(rawCode);

  if (!code) {
    return {
      status: REDEEM_CODE_STATUS.EMPTY_CODE,
      success: false,
      code
    };
  }

  const redeemConfig = REDEEM_CODE_CONFIG[code];

  if (!redeemConfig) {
    return {
      status: REDEEM_CODE_STATUS.CODE_NOT_FOUND,
      success: false,
      code
    };
  }

  if (isRedeemCodeUsed({ redeemState, code })) {
    return {
      status: REDEEM_CODE_STATUS.CODE_ALREADY_USED,
      success: false,
      code,
      redeemConfig
    };
  }

  if (isRedeemCodeExpired(redeemConfig, now)) {
    return {
      status: REDEEM_CODE_STATUS.CODE_EXPIRED,
      success: false,
      code,
      redeemConfig
    };
  }

  const commanderLevel = player.commanderLevel || 1;

  if (commanderLevel < redeemConfig.minCommanderLevel) {
    return {
      status: REDEEM_CODE_STATUS.PLAYER_LEVEL_NOT_ENOUGH,
      success: false,
      code,
      redeemConfig,
      requiredLevel: redeemConfig.minCommanderLevel
    };
  }

  return {
    status: REDEEM_CODE_STATUS.OK,
    success: true,
    code,
    redeemConfig
  };
}

export function addItemToInventory({
  inventory,
  itemId,
  amount
}) {
  const nextInventory = {
    ...inventory
  };

  nextInventory[itemId] = (nextInventory[itemId] || 0) + amount;

  return nextInventory;
}

export function applyRedeemRewards({
  player,
  rewards
}) {
  let nextPlayer = {
    ...player,
    inventory: {
      ...(player.inventory || {})
    },
    ownedPilotIds: [...(player.ownedPilotIds || [])],
    ownedFighterIds: [...(player.ownedFighterIds || [])]
  };

  for (const reward of rewards) {
    if (reward.type === REDEEM_REWARD_TYPE.GOLD) {
      nextPlayer.gold = (nextPlayer.gold || 0) + reward.amount;
    }

    if (reward.type === REDEEM_REWARD_TYPE.STAMINA) {
      nextPlayer.stamina = (nextPlayer.stamina || 0) + reward.amount;
    }

    if (reward.type === REDEEM_REWARD_TYPE.PILOT) {
      if (!nextPlayer.ownedPilotIds.includes(reward.pilotId)) {
        nextPlayer.ownedPilotIds.push(reward.pilotId);
      }
    }

    if (reward.type === REDEEM_REWARD_TYPE.FIGHTER) {
      if (!nextPlayer.ownedFighterIds.includes(reward.fighterId)) {
        nextPlayer.ownedFighterIds.push(reward.fighterId);
      }
    }

    if (reward.type === REDEEM_REWARD_TYPE.ITEM) {
      nextPlayer.inventory = addItemToInventory({
        inventory: nextPlayer.inventory,
        itemId: reward.itemId,
        amount: reward.amount
      });
    }
  }

  return nextPlayer;
}

export function redeemCode({
  rawCode,
  player,
  redeemState,
  now = Date.now()
}) {
  const validation = validateRedeemCode({
    rawCode,
    player,
    redeemState,
    now
  });

  if (!validation.success) {
    return {
      success: false,
      status: validation.status,
      message: getRedeemCodeMessage(validation),
      player,
      redeemState
    };
  }

  const { code, redeemConfig } = validation;

  const nextPlayer = applyRedeemRewards({
    player,
    rewards: redeemConfig.rewards
  });

  const nextRedeemState = {
    ...redeemState,
    usedRedeemCodes: [
      ...redeemState.usedRedeemCodes,
      code
    ]
  };

  return {
    success: true,
    status: REDEEM_CODE_STATUS.OK,
    message: `兑换成功：${redeemConfig.description}`,
    code,
    rewards: redeemConfig.rewards,
    player: nextPlayer,
    redeemState: nextRedeemState
  };
}

export function getRedeemCodeMessage(validation) {
  if (validation.status === REDEEM_CODE_STATUS.EMPTY_CODE) {
    return "请输入兑换码";
  }

  if (validation.status === REDEEM_CODE_STATUS.CODE_NOT_FOUND) {
    return "兑换码不存在";
  }

  if (validation.status === REDEEM_CODE_STATUS.CODE_ALREADY_USED) {
    return "该兑换码已使用";
  }

  if (validation.status === REDEEM_CODE_STATUS.CODE_EXPIRED) {
    return "该兑换码已过期";
  }

  if (validation.status === REDEEM_CODE_STATUS.PLAYER_LEVEL_NOT_ENOUGH) {
    return `指挥官等级达到${validation.requiredLevel}级后可兑换`;
  }

  return "兑换失败";
}

export function getRedeemCodeUiViewModel({
  rawCode = "",
  lastResult = null
} = {}) {
  return {
    entryPageId: SETTINGS_REDEEM_CODE_UI_CONFIG.entryPageId,
    entryButtonId: SETTINGS_REDEEM_CODE_UI_CONFIG.entryButtonId,
    entryButtonText: SETTINGS_REDEEM_CODE_UI_CONFIG.entryButtonText,

    modalId: SETTINGS_REDEEM_CODE_UI_CONFIG.modalId,
    modalTitle: SETTINGS_REDEEM_CODE_UI_CONFIG.modalTitle,

    inputId: SETTINGS_REDEEM_CODE_UI_CONFIG.inputId,
    inputPlaceholder: SETTINGS_REDEEM_CODE_UI_CONFIG.inputPlaceholder,
    inputValue: rawCode,

    confirmButtonId: SETTINGS_REDEEM_CODE_UI_CONFIG.confirmButtonId,
    confirmButtonText: SETTINGS_REDEEM_CODE_UI_CONFIG.confirmButtonText,

    closeButtonId: SETTINGS_REDEEM_CODE_UI_CONFIG.closeButtonId,
    closeButtonText: SETTINGS_REDEEM_CODE_UI_CONFIG.closeButtonText,

    lastResult
  };
}
```

## UI接入要求

在设置界面增加一个按钮：

```text
兑换码
```

点击后打开弹窗：

```text
标题：兑换码兑换
输入框：请输入兑换码
按钮：兑换
按钮：关闭
```

兑换成功后显示：

```text
兑换成功：奖励内容
```

兑换失败时显示：

```text
兑换码不存在
该兑换码已使用
该兑换码已过期
指挥官等级不足
```

## 一次性使用规则

每个兑换码对同一个玩家只能使用一次。

使用记录保存在：

```js
redeemState.usedRedeemCodes
```

兑换成功后立刻写入：

```js
usedRedeemCodes
```

## 最小接入示例

```js
import {
  createRedeemCodeState,
  redeemCode
} from "./redeemCodeSystem.js";

let player = {
  gold: 0,
  stamina: 300,
  commanderLevel: 1,
  inventory: {},
  ownedPilotIds: [],
  ownedFighterIds: []
};

let redeemState = createRedeemCodeState();

function onClickRedeemButton(inputCode) {
  const result = redeemCode({
    rawCode: inputCode,
    player,
    redeemState
  });

  player = result.player;
  redeemState = result.redeemState;

  showToast(result.message);
}
```

## 注意事项

```text
H5本地版可以先用本地存档记录usedRedeemCodes。
如果以后接服务器，兑换码必须由服务器校验，避免玩家改本地存档重复领取。
兑换码奖励不要直接送S飞行员和S战机，避免破坏S级长期目标。
```
