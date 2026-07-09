# 任务系统模块_Codex可直接粘贴版

```js
// taskSystemConfig.js

export const TASK_REWARD_TYPE = {
  GOLD: "gold",
  STAMINA: "stamina",
  ITEM: "item",
  TITLE: "title",
  AVATAR_FRAME: "avatar_frame"
};

export const TASK_CATEGORY = {
  GROWTH: "growth",
  CHAPTER: "chapter",
  CHALLENGE: "challenge"
};

export const TASK_STATUS = {
  LOCKED: "locked",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  CLAIMED: "claimed"
};

export const TASK_CONDITION_TYPE = {
  CLEAR_STAGE: "clear_stage",
  CLEAR_CHAPTER: "clear_chapter",
  BUY_PILOT_COUNT: "buy_pilot_count",
  BUY_FIGHTER_COUNT: "buy_fighter_count",
  UPGRADE_STAT_LEVEL: "upgrade_stat_level",
  PERFECT_CLEAR_COUNT: "perfect_clear_count",
  NO_DAMAGE_BOSS_CLEAR_COUNT: "no_damage_boss_clear_count",
  CLEAR_STAGE_WITH_RARITY: "clear_stage_with_rarity"
};

export const TASK_ECONOMY_LIMIT = {
  designGoal: "任务系统不做每日任务。任务金币总量只帮助玩家买到A级战机，不支撑S级购买。",
  aRankFighterPriceGold: 150000,
  totalTaskGoldReward: 150000,
  sRankPilotPriceGold: 900000,
  sRankFighterPriceGold: 1300000
};

export const TASK_CONFIG = [
  {
    id: "growth_clear_prologue_1",
    category: TASK_CATEGORY.GROWTH,
    title: "首次接入",
    description: "完成序章第1关",
    condition: {
      type: TASK_CONDITION_TYPE.CLEAR_STAGE,
      stageId: "prologue_1"
    },
    rewards: [
      {
        type: TASK_REWARD_TYPE.GOLD,
        amount: 3000
      }
    ]
  },
  {
    id: "growth_clear_prologue_3",
    category: TASK_CATEGORY.GROWTH,
    title: "黑潮警报",
    description: "完成序章全部关卡",
    condition: {
      type: TASK_CONDITION_TYPE.CLEAR_STAGE,
      stageId: "prologue_3"
    },
    rewards: [
      {
        type: TASK_REWARD_TYPE.GOLD,
        amount: 5000
      }
    ]
  },
  {
    id: "growth_buy_first_pilot",
    category: TASK_CATEGORY.GROWTH,
    title: "战姬入队",
    description: "购买1名飞行员",
    condition: {
      type: TASK_CONDITION_TYPE.BUY_PILOT_COUNT,
      count: 1
    },
    rewards: [
      {
        type: TASK_REWARD_TYPE.GOLD,
        amount: 5000
      }
    ]
  },
  {
    id: "growth_buy_first_fighter",
    category: TASK_CATEGORY.GROWTH,
    title: "第一架战机",
    description: "购买1架战机",
    condition: {
      type: TASK_CONDITION_TYPE.BUY_FIGHTER_COUNT,
      count: 1
    },
    rewards: [
      {
        type: TASK_REWARD_TYPE.GOLD,
        amount: 5000
      }
    ]
  },
  {
    id: "growth_upgrade_attack_1",
    category: TASK_CATEGORY.GROWTH,
    title: "火力校准",
    description: "任意战机攻击强化1次",
    condition: {
      type: TASK_CONDITION_TYPE.UPGRADE_STAT_LEVEL,
      stat: "attack",
      level: 1
    },
    rewards: [
      {
        type: TASK_REWARD_TYPE.GOLD,
        amount: 3000
      }
    ]
  },
  {
    id: "growth_upgrade_penetration_1",
    category: TASK_CATEGORY.GROWTH,
    title: "破甲校准",
    description: "任意战机破甲强化1次",
    condition: {
      type: TASK_CONDITION_TYPE.UPGRADE_STAT_LEVEL,
      stat: "armorPenetration",
      level: 1
    },
    rewards: [
      {
        type: TASK_REWARD_TYPE.GOLD,
        amount: 3000
      }
    ]
  },
  {
    id: "growth_upgrade_hp_1",
    category: TASK_CATEGORY.GROWTH,
    title: "机体加固",
    description: "任意战机生命强化1次",
    condition: {
      type: TASK_CONDITION_TYPE.UPGRADE_STAT_LEVEL,
      stat: "hp",
      level: 1
    },
    rewards: [
      {
        type: TASK_REWARD_TYPE.GOLD,
        amount: 3000
      }
    ]
  },
  {
    id: "growth_clear_1_5",
    category: TASK_CATEGORY.GROWTH,
    title: "外围突破",
    description: "通关1-5",
    condition: {
      type: TASK_CONDITION_TYPE.CLEAR_STAGE,
      stageId: "1_5"
    },
    rewards: [
      {
        type: TASK_REWARD_TYPE.GOLD,
        amount: 10000
      }
    ]
  },
  {
    id: "growth_clear_1_10",
    category: TASK_CATEGORY.GROWTH,
    title: "弥赛亚现身",
    description: "通关1-10",
    condition: {
      type: TASK_CONDITION_TYPE.CLEAR_STAGE,
      stageId: "1_10"
    },
    rewards: [
      {
        type: TASK_REWARD_TYPE.GOLD,
        amount: 13000
      }
    ]
  },

  {
    id: "chapter_clear_1",
    category: TASK_CATEGORY.CHAPTER,
    title: "夺回外围",
    description: "通关第1章",
    condition: {
      type: TASK_CONDITION_TYPE.CLEAR_CHAPTER,
      chapterIndex: 1
    },
    rewards: [
      {
        type: TASK_REWARD_TYPE.GOLD,
        amount: 10000
      }
    ]
  },
  {
    id: "chapter_clear_2",
    category: TASK_CATEGORY.CHAPTER,
    title: "重甲初破",
    description: "通关第2章",
    condition: {
      type: TASK_CONDITION_TYPE.CLEAR_CHAPTER,
      chapterIndex: 2
    },
    rewards: [
      {
        type: TASK_REWARD_TYPE.GOLD,
        amount: 15000
      }
    ]
  },
  {
    id: "chapter_clear_3",
    category: TASK_CATEGORY.CHAPTER,
    title: "空港夺回",
    description: "通关第3章",
    condition: {
      type: TASK_CONDITION_TYPE.CLEAR_CHAPTER,
      chapterIndex: 3
    },
    rewards: [
      {
        type: TASK_REWARD_TYPE.GOLD,
        amount: 20000
      }
    ]
  },
  {
    id: "chapter_clear_4",
    category: TASK_CATEGORY.CHAPTER,
    title: "护盾瓦解",
    description: "通关第4章",
    condition: {
      type: TASK_CONDITION_TYPE.CLEAR_CHAPTER,
      chapterIndex: 4
    },
    rewards: [
      {
        type: TASK_REWARD_TYPE.GOLD,
        amount: 12000
      }
    ]
  },
  {
    id: "chapter_clear_5",
    category: TASK_CATEGORY.CHAPTER,
    title: "猎杀反制",
    description: "通关第5章",
    condition: {
      type: TASK_CONDITION_TYPE.CLEAR_CHAPTER,
      chapterIndex: 5
    },
    rewards: [
      {
        type: TASK_REWARD_TYPE.GOLD,
        amount: 13000
      }
    ]
  },
  {
    id: "chapter_clear_6",
    category: TASK_CATEGORY.CHAPTER,
    title: "主力拦截",
    description: "通关第6章",
    condition: {
      type: TASK_CONDITION_TYPE.CLEAR_CHAPTER,
      chapterIndex: 6
    },
    rewards: [
      {
        type: TASK_REWARD_TYPE.TITLE,
        titleId: "title_main_fleet_interceptor"
      }
    ]
  },
  {
    id: "chapter_clear_7",
    category: TASK_CATEGORY.CHAPTER,
    title: "重甲突破",
    description: "通关第7章",
    condition: {
      type: TASK_CONDITION_TYPE.CLEAR_CHAPTER,
      chapterIndex: 7
    },
    rewards: [
      {
        type: TASK_REWARD_TYPE.AVATAR_FRAME,
        frameId: "frame_heavy_armor_breaker"
      }
    ]
  },
  {
    id: "chapter_clear_8",
    category: TASK_CATEGORY.CHAPTER,
    title: "反攻前线",
    description: "通关第8章",
    condition: {
      type: TASK_CONDITION_TYPE.CLEAR_CHAPTER,
      chapterIndex: 8
    },
    rewards: [
      {
        type: TASK_REWARD_TYPE.TITLE,
        titleId: "title_frontline_counterattack"
      }
    ]
  },
  {
    id: "chapter_clear_9",
    category: TASK_CATEGORY.CHAPTER,
    title: "女王陨落",
    description: "通关第9章",
    condition: {
      type: TASK_CONDITION_TYPE.CLEAR_CHAPTER,
      chapterIndex: 9
    },
    rewards: [
      {
        type: TASK_REWARD_TYPE.TITLE,
        titleId: "title_black_tide_terminator"
      }
    ]
  },

  {
    id: "challenge_perfect_10",
    category: TASK_CATEGORY.CHALLENGE,
    title: "精准清场",
    description: "累计完美通关10次",
    condition: {
      type: TASK_CONDITION_TYPE.PERFECT_CLEAR_COUNT,
      count: 10
    },
    rewards: [
      {
        type: TASK_REWARD_TYPE.GOLD,
        amount: 10000
      }
    ]
  },
  {
    id: "challenge_no_damage_boss_1",
    category: TASK_CATEGORY.CHALLENGE,
    title: "无伤斩首",
    description: "无伤通关任意BOSS关1次",
    condition: {
      type: TASK_CONDITION_TYPE.NO_DAMAGE_BOSS_CLEAR_COUNT,
      count: 1
    },
    rewards: [
      {
        type: TASK_REWARD_TYPE.GOLD,
        amount: 10000
      }
    ]
  },
  {
    id: "challenge_b_clear_2_10",
    category: TASK_CATEGORY.CHALLENGE,
    title: "B级逆袭",
    description: "使用B级飞行员通关2-10",
    condition: {
      type: TASK_CONDITION_TYPE.CLEAR_STAGE_WITH_RARITY,
      stageId: "2_10",
      targetType: "pilot",
      rarity: "B"
    },
    rewards: [
      {
        type: TASK_REWARD_TYPE.GOLD,
        amount: 10000
      }
    ]
  }
];

export function createTaskState({
  claimedTaskIds = []
} = {}) {
  return {
    claimedTaskIds: [...claimedTaskIds]
  };
}

export function getTaskById(taskId) {
  return TASK_CONFIG.find((task) => task.id === taskId) || null;
}

export function isTaskClaimed(taskState, taskId) {
  return taskState.claimedTaskIds.includes(taskId);
}

export function isStageCleared(progress, stageId) {
  return (progress.clearedStageIds || []).includes(stageId);
}

export function isChapterCleared(progress, chapterIndex) {
  return (progress.clearedChapterIds || []).includes(chapterIndex);
}

export function getMaxUpgradeLevel(player, stat) {
  const fighters = player.fighters || [];

  if (fighters.length <= 0) {
    return 0;
  }

  return Math.max(
    ...fighters.map((fighter) => {
      const upgrades = fighter.upgrades || {};
      return upgrades[stat] || 0;
    })
  );
}

export function checkTaskCompleted({
  task,
  player,
  progress
}) {
  const condition = task.condition;

  if (condition.type === TASK_CONDITION_TYPE.CLEAR_STAGE) {
    return isStageCleared(progress, condition.stageId);
  }

  if (condition.type === TASK_CONDITION_TYPE.CLEAR_CHAPTER) {
    return isChapterCleared(progress, condition.chapterIndex);
  }

  if (condition.type === TASK_CONDITION_TYPE.BUY_PILOT_COUNT) {
    return (player.ownedPilotIds || []).length >= condition.count;
  }

  if (condition.type === TASK_CONDITION_TYPE.BUY_FIGHTER_COUNT) {
    return (player.ownedFighterIds || []).length >= condition.count;
  }

  if (condition.type === TASK_CONDITION_TYPE.UPGRADE_STAT_LEVEL) {
    return getMaxUpgradeLevel(player, condition.stat) >= condition.level;
  }

  if (condition.type === TASK_CONDITION_TYPE.PERFECT_CLEAR_COUNT) {
    return (progress.perfectClearCount || 0) >= condition.count;
  }

  if (condition.type === TASK_CONDITION_TYPE.NO_DAMAGE_BOSS_CLEAR_COUNT) {
    return (progress.noDamageBossClearCount || 0) >= condition.count;
  }

  if (condition.type === TASK_CONDITION_TYPE.CLEAR_STAGE_WITH_RARITY) {
    const records = progress.specialClearRecords || [];

    return records.some((record) => {
      return (
        record.stageId === condition.stageId &&
        record.targetType === condition.targetType &&
        record.rarity === condition.rarity
      );
    });
  }

  return false;
}

export function getTaskStatus({
  task,
  taskState,
  player,
  progress
}) {
  if (isTaskClaimed(taskState, task.id)) {
    return TASK_STATUS.CLAIMED;
  }

  const completed = checkTaskCompleted({
    task,
    player,
    progress
  });

  return completed ? TASK_STATUS.COMPLETED : TASK_STATUS.IN_PROGRESS;
}

export function addRewardToPlayer({
  player,
  reward
}) {
  const nextPlayer = {
    ...player,
    inventory: {
      ...(player.inventory || {})
    },
    titleIds: [...(player.titleIds || [])],
    avatarFrameIds: [...(player.avatarFrameIds || [])]
  };

  if (reward.type === TASK_REWARD_TYPE.GOLD) {
    nextPlayer.gold = (nextPlayer.gold || 0) + reward.amount;
  }

  if (reward.type === TASK_REWARD_TYPE.STAMINA) {
    nextPlayer.stamina = (nextPlayer.stamina || 0) + reward.amount;
  }

  if (reward.type === TASK_REWARD_TYPE.ITEM) {
    nextPlayer.inventory[reward.itemId] =
      (nextPlayer.inventory[reward.itemId] || 0) + reward.amount;
  }

  if (reward.type === TASK_REWARD_TYPE.TITLE) {
    if (!nextPlayer.titleIds.includes(reward.titleId)) {
      nextPlayer.titleIds.push(reward.titleId);
    }
  }

  if (reward.type === TASK_REWARD_TYPE.AVATAR_FRAME) {
    if (!nextPlayer.avatarFrameIds.includes(reward.frameId)) {
      nextPlayer.avatarFrameIds.push(reward.frameId);
    }
  }

  return nextPlayer;
}

export function claimTaskReward({
  taskId,
  taskState,
  player,
  progress
}) {
  const task = getTaskById(taskId);

  if (!task) {
    return {
      success: false,
      reason: "TASK_NOT_FOUND",
      player,
      taskState
    };
  }

  const status = getTaskStatus({
    task,
    taskState,
    player,
    progress
  });

  if (status === TASK_STATUS.CLAIMED) {
    return {
      success: false,
      reason: "TASK_ALREADY_CLAIMED",
      player,
      taskState
    };
  }

  if (status !== TASK_STATUS.COMPLETED) {
    return {
      success: false,
      reason: "TASK_NOT_COMPLETED",
      player,
      taskState
    };
  }

  let nextPlayer = player;

  for (const reward of task.rewards) {
    nextPlayer = addRewardToPlayer({
      player: nextPlayer,
      reward
    });
  }

  const nextTaskState = {
    ...taskState,
    claimedTaskIds: [...taskState.claimedTaskIds, taskId]
  };

  return {
    success: true,
    reason: "OK",
    task,
    rewards: task.rewards,
    player: nextPlayer,
    taskState: nextTaskState
  };
}

export function getTaskListViewModel({
  taskState,
  player,
  progress,
  category = null
}) {
  return TASK_CONFIG
    .filter((task) => {
      if (!category) {
        return true;
      }

      return task.category === category;
    })
    .map((task) => {
      const status = getTaskStatus({
        task,
        taskState,
        player,
        progress
      });

      return {
        id: task.id,
        category: task.category,
        title: task.title,
        description: task.description,
        rewards: task.rewards,
        status,
        canClaim: status === TASK_STATUS.COMPLETED
      };
    });
}

export function getTotalTaskGoldReward() {
  return TASK_CONFIG.reduce((sum, task) => {
    const goldRewards = task.rewards.filter(
      (reward) => reward.type === TASK_REWARD_TYPE.GOLD
    );

    const goldSum = goldRewards.reduce((innerSum, reward) => {
      return innerSum + reward.amount;
    }, 0);

    return sum + goldSum;
  }, 0);
}
```

## 奖励总量说明

```text
任务系统金币总量 = 150,000金币
A级战机价格 = 150,000金币
任务金币只够买A级战机，不支撑S级飞行员或S级战机购买。
```

## UI建议

任务界面分3页：

```text
成长任务
章节任务
挑战任务
```

不做每日任务，不做限时打卡任务。
