# 03_奖励弹窗与道具背包系统_Codex可直接粘贴版

```js
// src/systems/rewardInventorySystem.js

export const REWARD_TYPE = {
  GOLD: "gold",
  DIAMOND: "diamond",
  STAMINA: "stamina",
  ITEM: "item",
  PILOT: "pilot",
  FIGHTER: "fighter",
  TITLE: "title",
  AVATAR_FRAME: "avatar_frame",
  NAMEPLATE: "nameplate"
};

export const ITEM_TYPE = {
  CONSUMABLE: "consumable",
  MATERIAL: "material",
  TICKET: "ticket",
  CHEST: "chest"
};

export const ITEM_CONFIG = {
  revive_token: {
    id: "revive_token",
    name: "复活道具",
    type: ITEM_TYPE.CONSUMABLE,
    iconKey: "revive_token",
    desc: "战斗失败时可复活一次。"
  },
  stamina_potion: {
    id: "stamina_potion",
    name: "体力药剂",
    type: ITEM_TYPE.CONSUMABLE,
    iconKey: "stamina",
    desc: "使用后恢复体力。"
  },
  fighter_upgrade_ticket: {
    id: "fighter_upgrade_ticket",
    name: "战机强化券",
    type: ITEM_TYPE.TICKET,
    iconKey: "upgradeTicket",
    desc: "用于战机强化。"
  },
  pilot_training_chip: {
    id: "pilot_training_chip",
    name: "飞行员训练芯片",
    type: ITEM_TYPE.MATERIAL,
    iconKey: "propAdvancedComputer",
    desc: "用于飞行员成长。"
  },
  gold_supply_box: {
    id: "gold_supply_box",
    name: "金币补给箱",
    type: ITEM_TYPE.CHEST,
    iconKey: "extraGoldReward",
    desc: "打开后获得金币。"
  }
};

export function createInventoryState({
  items = {}
} = {}) {
  return {
    items: {
      ...items
    }
  };
}

export function addInventoryItem({
  inventoryState,
  itemId,
  amount
}) {
  return {
    ...inventoryState,
    items: {
      ...inventoryState.items,
      [itemId]: (inventoryState.items[itemId] || 0) + amount
    }
  };
}

export function removeInventoryItem({
  inventoryState,
  itemId,
  amount
}) {
  const current = inventoryState.items[itemId] || 0;

  if (current < amount) {
    return {
      success: false,
      reason: "ITEM_NOT_ENOUGH",
      inventoryState
    };
  }

  return {
    success: true,
    reason: "OK",
    inventoryState: {
      ...inventoryState,
      items: {
        ...inventoryState.items,
        [itemId]: current - amount
      }
    }
  };
}

export function getInventoryListViewModel(inventoryState) {
  return Object.keys(inventoryState.items)
    .filter((itemId) => inventoryState.items[itemId] > 0)
    .map((itemId) => {
      const config = ITEM_CONFIG[itemId] || {
        id: itemId,
        name: itemId,
        type: ITEM_TYPE.MATERIAL,
        iconKey: "rewardChest",
        desc: ""
      };

      return {
        ...config,
        amount: inventoryState.items[itemId]
      };
    });
}

export function applyRewards({
  player,
  inventoryState,
  rewards
}) {
  let nextPlayer = {
    ...player,
    ownedPilotIds: [...(player.ownedPilotIds || [])],
    ownedFighterIds: [...(player.ownedFighterIds || [])],
    titleIds: [...(player.titleIds || [])],
    avatarFrameIds: [...(player.avatarFrameIds || [])],
    nameplateIds: [...(player.nameplateIds || [])]
  };

  let nextInventoryState = {
    ...inventoryState,
    items: {
      ...(inventoryState.items || {})
    }
  };

  for (const reward of rewards) {
    if (reward.type === REWARD_TYPE.GOLD) {
      nextPlayer.gold = (nextPlayer.gold || 0) + reward.amount;
    }

    if (reward.type === REWARD_TYPE.DIAMOND) {
      nextPlayer.diamond = (nextPlayer.diamond || 0) + reward.amount;
    }

    if (reward.type === REWARD_TYPE.STAMINA) {
      nextPlayer.stamina = (nextPlayer.stamina || 0) + reward.amount;
    }

    if (reward.type === REWARD_TYPE.ITEM) {
      nextInventoryState = addInventoryItem({
        inventoryState: nextInventoryState,
        itemId: reward.itemId,
        amount: reward.amount
      });
    }

    if (reward.type === REWARD_TYPE.PILOT) {
      if (!nextPlayer.ownedPilotIds.includes(reward.pilotId)) {
        nextPlayer.ownedPilotIds.push(reward.pilotId);
      }
    }

    if (reward.type === REWARD_TYPE.FIGHTER) {
      if (!nextPlayer.ownedFighterIds.includes(reward.fighterId)) {
        nextPlayer.ownedFighterIds.push(reward.fighterId);
      }
    }

    if (reward.type === REWARD_TYPE.TITLE) {
      if (!nextPlayer.titleIds.includes(reward.titleId)) {
        nextPlayer.titleIds.push(reward.titleId);
      }
    }

    if (reward.type === REWARD_TYPE.AVATAR_FRAME) {
      if (!nextPlayer.avatarFrameIds.includes(reward.frameId)) {
        nextPlayer.avatarFrameIds.push(reward.frameId);
      }
    }

    if (reward.type === REWARD_TYPE.NAMEPLATE) {
      if (!nextPlayer.nameplateIds.includes(reward.nameplateId)) {
        nextPlayer.nameplateIds.push(reward.nameplateId);
      }
    }
  }

  return {
    player: nextPlayer,
    inventoryState: nextInventoryState
  };
}

export function createRewardPopupViewModel({
  title = "获得奖励",
  rewards = []
}) {
  return {
    panelType: "reward_popup",
    title,
    rewards: rewards.map(normalizeRewardDisplay),
    buttons: [
      {
        id: "confirm",
        text: "确定"
      }
    ]
  };
}

export function normalizeRewardDisplay(reward) {
  if (reward.type === REWARD_TYPE.GOLD) {
    return {
      type: reward.type,
      iconKey: "gold",
      name: "金币",
      amount: reward.amount
    };
  }

  if (reward.type === REWARD_TYPE.DIAMOND) {
    return {
      type: reward.type,
      iconKey: "diamond",
      name: "钻石",
      amount: reward.amount
    };
  }

  if (reward.type === REWARD_TYPE.STAMINA) {
    return {
      type: reward.type,
      iconKey: "stamina",
      name: "体力",
      amount: reward.amount
    };
  }

  if (reward.type === REWARD_TYPE.ITEM) {
    const item = ITEM_CONFIG[reward.itemId] || {};
    return {
      type: reward.type,
      iconKey: item.iconKey || "rewardChest",
      name: item.name || reward.itemId,
      amount: reward.amount
    };
  }

  return {
    type: reward.type,
    iconKey: "rewardChest",
    name: reward.name || reward.type,
    amount: reward.amount || 1
  };
}

export function useInventoryItem({
  player,
  inventoryState,
  itemId,
  amount = 1
}) {
  const removeResult = removeInventoryItem({
    inventoryState,
    itemId,
    amount
  });

  if (!removeResult.success) {
    return {
      success: false,
      reason: removeResult.reason,
      player,
      inventoryState
    };
  }

  let nextPlayer = {
    ...player
  };

  if (itemId === "stamina_potion") {
    nextPlayer.stamina = (nextPlayer.stamina || 0) + 50;
  }

  if (itemId === "gold_supply_box") {
    nextPlayer.gold = (nextPlayer.gold || 0) + 50000;
  }

  return {
    success: true,
    reason: "OK",
    player: nextPlayer,
    inventoryState: removeResult.inventoryState
  };
}
```
