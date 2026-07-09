# 成就系统模块_Codex可直接粘贴版

```js
// achievementSystemConfig.js

export const ACHIEVEMENT_REWARD_TYPE = {
  TITLE: "title",
  AVATAR_FRAME: "avatar_frame",
  BADGE: "badge"
};

export const ACHIEVEMENT_CATEGORY = {
  CLEAR: "clear",
  PERFECT: "perfect",
  COLLECTION: "collection",
  UPGRADE: "upgrade",
  CHALLENGE: "challenge"
};

export const ACHIEVEMENT_STATUS = {
  LOCKED: "locked",
  UNLOCKED: "unlocked",
  CLAIMED: "claimed"
};

export const ACHIEVEMENT_CONDITION_TYPE = {
  CLEAR_STAGE: "clear_stage",
  CLEAR_CHAPTER: "clear_chapter",
  PERFECT_CLEAR_COUNT: "perfect_clear_count",
  OWN_PILOT_COUNT: "own_pilot_count",
  OWN_FIGHTER_COUNT: "own_fighter_count",
  OWN_RARITY_PILOT_COUNT: "own_rarity_pilot_count",
  OWN_RARITY_FIGHTER_COUNT: "own_rarity_fighter_count",
  UPGRADE_STAT_LEVEL: "upgrade_stat_level",
  ALL_UPGRADE_STAT_LEVEL: "all_upgrade_stat_level",
  CLEAR_STAGE_WITH_RARITY: "clear_stage_with_rarity",
  CLEAR_STAGE_UNDER_POWER: "clear_stage_under_power"
};

export const ACHIEVEMENT_ECONOMY_LIMIT = {
  designGoal: "成就系统主要提供称号、头像框、徽章，不发金币，避免破坏金币经济。",
  goldRewardTotal: 0,
  reason: "金币来源已经由体力、任务、关卡奖励承担；成就只提供收藏感和长期目标。"
};

export const ACHIEVEMENT_CONFIG = [
  {
    id: "ach_clear_prologue",
    category: ACHIEVEMENT_CATEGORY.CLEAR,
    title: "初入苍穹",
    description: "完成序章",
    condition: {
      type: ACHIEVEMENT_CONDITION_TYPE.CLEAR_STAGE,
      stageId: "prologue_3"
    },
    rewards: [
      {
        type: ACHIEVEMENT_REWARD_TYPE.AVATAR_FRAME,
        frameId: "frame_first_sky"
      }
    ]
  },
  {
    id: "ach_clear_chapter_1",
    category: ACHIEVEMENT_CATEGORY.CLEAR,
    title: "城市守望者",
    description: "通关第1章",
    condition: {
      type: ACHIEVEMENT_CONDITION_TYPE.CLEAR_CHAPTER,
      chapterIndex: 1
    },
    rewards: [
      {
        type: ACHIEVEMENT_REWARD_TYPE.BADGE,
        badgeId: "badge_city_guardian"
      }
    ]
  },
  {
    id: "ach_clear_chapter_2",
    category: ACHIEVEMENT_CATEGORY.CLEAR,
    title: "重甲突破者",
    description: "通关第2章",
    condition: {
      type: ACHIEVEMENT_CONDITION_TYPE.CLEAR_CHAPTER,
      chapterIndex: 2
    },
    rewards: [
      {
        type: ACHIEVEMENT_REWARD_TYPE.BADGE,
        badgeId: "badge_heavy_armor_breaker"
      }
    ]
  },
  {
    id: "ach_clear_chapter_3",
    category: ACHIEVEMENT_CATEGORY.CLEAR,
    title: "空港夺回者",
    description: "通关第3章",
    condition: {
      type: ACHIEVEMENT_CONDITION_TYPE.CLEAR_CHAPTER,
      chapterIndex: 3
    },
    rewards: [
      {
        type: ACHIEVEMENT_REWARD_TYPE.BADGE,
        badgeId: "badge_airport_reclaimer"
      }
    ]
  },
  {
    id: "ach_clear_chapter_9",
    category: ACHIEVEMENT_CATEGORY.CLEAR,
    title: "黑潮终结者",
    description: "通关第9章",
    condition: {
      type: ACHIEVEMENT_CONDITION_TYPE.CLEAR_CHAPTER,
      chapterIndex: 9
    },
    rewards: [
      {
        type: ACHIEVEMENT_REWARD_TYPE.TITLE,
        titleId: "title_black_tide_terminator"
      }
    ]
  },

  {
    id: "ach_perfect_10",
    category: ACHIEVEMENT_CATEGORY.PERFECT,
    title: "精准清场",
    description: "累计完美通关10次",
    condition: {
      type: ACHIEVEMENT_CONDITION_TYPE.PERFECT_CLEAR_COUNT,
      count: 10
    },
    rewards: [
      {
        type: ACHIEVEMENT_REWARD_TYPE.BADGE,
        badgeId: "badge_perfect_10"
      }
    ]
  },
  {
    id: "ach_perfect_50",
    category: ACHIEVEMENT_CATEGORY.PERFECT,
    title: "无漏之翼",
    description: "累计完美通关50次",
    condition: {
      type: ACHIEVEMENT_CONDITION_TYPE.PERFECT_CLEAR_COUNT,
      count: 50
    },
    rewards: [
      {
        type: ACHIEVEMENT_REWARD_TYPE.AVATAR_FRAME,
        frameId: "frame_no_leak_wing"
      }
    ]
  },
  {
    id: "ach_perfect_100",
    category: ACHIEVEMENT_CATEGORY.PERFECT,
    title: "天空收割者",
    description: "累计完美通关100次",
    condition: {
      type: ACHIEVEMENT_CONDITION_TYPE.PERFECT_CLEAR_COUNT,
      count: 100
    },
    rewards: [
      {
        type: ACHIEVEMENT_REWARD_TYPE.TITLE,
        titleId: "title_sky_reaper"
      }
    ]
  },

  {
    id: "ach_own_1_pilot",
    category: ACHIEVEMENT_CATEGORY.COLLECTION,
    title: "初识战姬",
    description: "拥有1名飞行员",
    condition: {
      type: ACHIEVEMENT_CONDITION_TYPE.OWN_PILOT_COUNT,
      count: 1
    },
    rewards: [
      {
        type: ACHIEVEMENT_REWARD_TYPE.BADGE,
        badgeId: "badge_first_pilot"
      }
    ]
  },
  {
    id: "ach_own_3_pilots",
    category: ACHIEVEMENT_CATEGORY.COLLECTION,
    title: "王牌小队",
    description: "拥有3名飞行员",
    condition: {
      type: ACHIEVEMENT_CONDITION_TYPE.OWN_PILOT_COUNT,
      count: 3
    },
    rewards: [
      {
        type: ACHIEVEMENT_REWARD_TYPE.AVATAR_FRAME,
        frameId: "frame_ace_team"
      }
    ]
  },
  {
    id: "ach_own_s_pilot",
    category: ACHIEVEMENT_CATEGORY.COLLECTION,
    title: "S级王牌",
    description: "拥有1名S级飞行员",
    condition: {
      type: ACHIEVEMENT_CONDITION_TYPE.OWN_RARITY_PILOT_COUNT,
      rarity: "S",
      count: 1
    },
    rewards: [
      {
        type: ACHIEVEMENT_REWARD_TYPE.TITLE,
        titleId: "title_s_rank_ace"
      }
    ]
  },
  {
    id: "ach_own_1_fighter",
    category: ACHIEVEMENT_CATEGORY.COLLECTION,
    title: "第一架战机",
    description: "拥有1架战机",
    condition: {
      type: ACHIEVEMENT_CONDITION_TYPE.OWN_FIGHTER_COUNT,
      count: 1
    },
    rewards: [
      {
        type: ACHIEVEMENT_REWARD_TYPE.BADGE,
        badgeId: "badge_first_fighter"
      }
    ]
  },
  {
    id: "ach_own_s_fighter",
    category: ACHIEVEMENT_CATEGORY.COLLECTION,
    title: "S级机体",
    description: "拥有1架S级战机",
    condition: {
      type: ACHIEVEMENT_CONDITION_TYPE.OWN_RARITY_FIGHTER_COUNT,
      rarity: "S",
      count: 1
    },
    rewards: [
      {
        type: ACHIEVEMENT_REWARD_TYPE.TITLE,
        titleId: "title_s_rank_machine"
      }
    ]
  },

  {
    id: "ach_upgrade_attack_20",
    category: ACHIEVEMENT_CATEGORY.UPGRADE,
    title: "火力升级",
    description: "任意战机攻击强化到20级",
    condition: {
      type: ACHIEVEMENT_CONDITION_TYPE.UPGRADE_STAT_LEVEL,
      stat: "attack",
      level: 20
    },
    rewards: [
      {
        type: ACHIEVEMENT_REWARD_TYPE.BADGE,
        badgeId: "badge_attack_20"
      }
    ]
  },
  {
    id: "ach_upgrade_penetration_20",
    category: ACHIEVEMENT_CATEGORY.UPGRADE,
    title: "破甲专家",
    description: "任意战机破甲强化到20级",
    condition: {
      type: ACHIEVEMENT_CONDITION_TYPE.UPGRADE_STAT_LEVEL,
      stat: "armorPenetration",
      level: 20
    },
    rewards: [
      {
        type: ACHIEVEMENT_REWARD_TYPE.BADGE,
        badgeId: "badge_penetration_20"
      }
    ]
  },
  {
    id: "ach_upgrade_hp_20",
    category: ACHIEVEMENT_CATEGORY.UPGRADE,
    title: "装甲加固",
    description: "任意战机生命强化到20级",
    condition: {
      type: ACHIEVEMENT_CONDITION_TYPE.UPGRADE_STAT_LEVEL,
      stat: "hp",
      level: 20
    },
    rewards: [
      {
        type: ACHIEVEMENT_REWARD_TYPE.BADGE,
        badgeId: "badge_hp_20"
      }
    ]
  },
  {
    id: "ach_all_upgrade_60",
    category: ACHIEVEMENT_CATEGORY.UPGRADE,
    title: "完全强化",
    description: "任意战机三项强化全部达到60级",
    condition: {
      type: ACHIEVEMENT_CONDITION_TYPE.ALL_UPGRADE_STAT_LEVEL,
      level: 60
    },
    rewards: [
      {
        type: ACHIEVEMENT_REWARD_TYPE.TITLE,
        titleId: "title_full_upgrade"
      }
    ]
  },

  {
    id: "ach_b_pilot_clear_3_10",
    category: ACHIEVEMENT_CATEGORY.CHALLENGE,
    title: "B级逆袭",
    description: "使用B级飞行员通关3-10",
    condition: {
      type: ACHIEVEMENT_CONDITION_TYPE.CLEAR_STAGE_WITH_RARITY,
      stageId: "3_10",
      targetType: "pilot",
      rarity: "B"
    },
    rewards: [
      {
        type: ACHIEVEMENT_REWARD_TYPE.TITLE,
        titleId: "title_b_rank_counterattack"
      }
    ]
  },
  {
    id: "ach_under_power_boss",
    category: ACHIEVEMENT_CATEGORY.CHALLENGE,
    title: "逆风突破",
    description: "战力低于推荐值通关任意BOSS关",
    condition: {
      type: ACHIEVEMENT_CONDITION_TYPE.CLEAR_STAGE_UNDER_POWER,
      count: 1
    },
    rewards: [
      {
        type: ACHIEVEMENT_REWARD_TYPE.AVATAR_FRAME,
        frameId: "frame_under_power_breaker"
      }
    ]
  }
];

export function createAchievementState({
  claimedAchievementIds = []
} = {}) {
  return {
    claimedAchievementIds: [...claimedAchievementIds]
  };
}

export function getAchievementById(achievementId) {
  return ACHIEVEMENT_CONFIG.find((achievement) => achievement.id === achievementId) || null;
}

export function isAchievementClaimed(achievementState, achievementId) {
  return achievementState.claimedAchievementIds.includes(achievementId);
}

export function isStageCleared(progress, stageId) {
  return (progress.clearedStageIds || []).includes(stageId);
}

export function isChapterCleared(progress, chapterIndex) {
  return (progress.clearedChapterIds || []).includes(chapterIndex);
}

export function countOwnedByRarity(items, rarity) {
  return items.filter((item) => item.rarity === rarity).length;
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

export function hasAnyFighterAllStatsAtLevel(player, targetLevel) {
  const fighters = player.fighters || [];

  return fighters.some((fighter) => {
    const upgrades = fighter.upgrades || {};

    return (
      (upgrades.attack || 0) >= targetLevel &&
      (upgrades.armorPenetration || 0) >= targetLevel &&
      (upgrades.hp || 0) >= targetLevel
    );
  });
}

export function checkAchievementUnlocked({
  achievement,
  player,
  progress
}) {
  const condition = achievement.condition;

  if (condition.type === ACHIEVEMENT_CONDITION_TYPE.CLEAR_STAGE) {
    return isStageCleared(progress, condition.stageId);
  }

  if (condition.type === ACHIEVEMENT_CONDITION_TYPE.CLEAR_CHAPTER) {
    return isChapterCleared(progress, condition.chapterIndex);
  }

  if (condition.type === ACHIEVEMENT_CONDITION_TYPE.PERFECT_CLEAR_COUNT) {
    return (progress.perfectClearCount || 0) >= condition.count;
  }

  if (condition.type === ACHIEVEMENT_CONDITION_TYPE.OWN_PILOT_COUNT) {
    return (player.pilots || []).length >= condition.count;
  }

  if (condition.type === ACHIEVEMENT_CONDITION_TYPE.OWN_FIGHTER_COUNT) {
    return (player.fighters || []).length >= condition.count;
  }

  if (condition.type === ACHIEVEMENT_CONDITION_TYPE.OWN_RARITY_PILOT_COUNT) {
    return countOwnedByRarity(player.pilots || [], condition.rarity) >= condition.count;
  }

  if (condition.type === ACHIEVEMENT_CONDITION_TYPE.OWN_RARITY_FIGHTER_COUNT) {
    return countOwnedByRarity(player.fighters || [], condition.rarity) >= condition.count;
  }

  if (condition.type === ACHIEVEMENT_CONDITION_TYPE.UPGRADE_STAT_LEVEL) {
    return getMaxUpgradeLevel(player, condition.stat) >= condition.level;
  }

  if (condition.type === ACHIEVEMENT_CONDITION_TYPE.ALL_UPGRADE_STAT_LEVEL) {
    return hasAnyFighterAllStatsAtLevel(player, condition.level);
  }

  if (condition.type === ACHIEVEMENT_CONDITION_TYPE.CLEAR_STAGE_WITH_RARITY) {
    const records = progress.specialClearRecords || [];

    return records.some((record) => {
      return (
        record.stageId === condition.stageId &&
        record.targetType === condition.targetType &&
        record.rarity === condition.rarity
      );
    });
  }

  if (condition.type === ACHIEVEMENT_CONDITION_TYPE.CLEAR_STAGE_UNDER_POWER) {
    return (progress.underPowerBossClearCount || 0) >= condition.count;
  }

  return false;
}

export function getAchievementStatus({
  achievement,
  achievementState,
  player,
  progress
}) {
  if (isAchievementClaimed(achievementState, achievement.id)) {
    return ACHIEVEMENT_STATUS.CLAIMED;
  }

  const unlocked = checkAchievementUnlocked({
    achievement,
    player,
    progress
  });

  return unlocked ? ACHIEVEMENT_STATUS.UNLOCKED : ACHIEVEMENT_STATUS.LOCKED;
}

export function addAchievementRewardToPlayer({
  player,
  reward
}) {
  const nextPlayer = {
    ...player,
    titleIds: [...(player.titleIds || [])],
    avatarFrameIds: [...(player.avatarFrameIds || [])],
    badgeIds: [...(player.badgeIds || [])]
  };

  if (reward.type === ACHIEVEMENT_REWARD_TYPE.TITLE) {
    if (!nextPlayer.titleIds.includes(reward.titleId)) {
      nextPlayer.titleIds.push(reward.titleId);
    }
  }

  if (reward.type === ACHIEVEMENT_REWARD_TYPE.AVATAR_FRAME) {
    if (!nextPlayer.avatarFrameIds.includes(reward.frameId)) {
      nextPlayer.avatarFrameIds.push(reward.frameId);
    }
  }

  if (reward.type === ACHIEVEMENT_REWARD_TYPE.BADGE) {
    if (!nextPlayer.badgeIds.includes(reward.badgeId)) {
      nextPlayer.badgeIds.push(reward.badgeId);
    }
  }

  return nextPlayer;
}

export function claimAchievementReward({
  achievementId,
  achievementState,
  player,
  progress
}) {
  const achievement = getAchievementById(achievementId);

  if (!achievement) {
    return {
      success: false,
      reason: "ACHIEVEMENT_NOT_FOUND",
      player,
      achievementState
    };
  }

  const status = getAchievementStatus({
    achievement,
    achievementState,
    player,
    progress
  });

  if (status === ACHIEVEMENT_STATUS.CLAIMED) {
    return {
      success: false,
      reason: "ACHIEVEMENT_ALREADY_CLAIMED",
      player,
      achievementState
    };
  }

  if (status !== ACHIEVEMENT_STATUS.UNLOCKED) {
    return {
      success: false,
      reason: "ACHIEVEMENT_NOT_UNLOCKED",
      player,
      achievementState
    };
  }

  let nextPlayer = player;

  for (const reward of achievement.rewards) {
    nextPlayer = addAchievementRewardToPlayer({
      player: nextPlayer,
      reward
    });
  }

  const nextAchievementState = {
    ...achievementState,
    claimedAchievementIds: [
      ...achievementState.claimedAchievementIds,
      achievementId
    ]
  };

  return {
    success: true,
    reason: "OK",
    achievement,
    rewards: achievement.rewards,
    player: nextPlayer,
    achievementState: nextAchievementState
  };
}

export function getAchievementListViewModel({
  achievementState,
  player,
  progress,
  category = null
}) {
  return ACHIEVEMENT_CONFIG
    .filter((achievement) => {
      if (!category) {
        return true;
      }

      return achievement.category === category;
    })
    .map((achievement) => {
      const status = getAchievementStatus({
        achievement,
        achievementState,
        player,
        progress
      });

      return {
        id: achievement.id,
        category: achievement.category,
        title: achievement.title,
        description: achievement.description,
        rewards: achievement.rewards,
        status,
        canClaim: status === ACHIEVEMENT_STATUS.UNLOCKED
      };
    });
}

export function getAchievementGoldRewardTotal() {
  return 0;
}
```

## 成就奖励原则

```text
成就系统不发金币。
成就奖励只给称号、头像框、徽章。
这样不会破坏金币经济，也不会让玩家靠成就直接买S级飞行员或S级战机。
```

## UI建议

成就界面分5页：

```text
通关
完美
收集
强化
挑战
```
