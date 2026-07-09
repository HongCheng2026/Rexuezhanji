# 战斗结算系统_Codex可直接粘贴版

```js
// battleSettlementSystem.js

export const BATTLE_RESULT_TYPE = {
  WIN: "win",
  FAIL: "fail"
};

export const STAR_RULE_TYPE = {
  CLEAR: "clear",
  HP_OVER_HALF: "hp_over_half",
  PERFECT_CLEAR: "perfect_clear"
};

export const SETTLEMENT_REWARD_TYPE = {
  GOLD: "gold",
  EXP: "exp",
  ITEM: "item"
};

export const BATTLE_SETTLEMENT_CONFIG = {
  baseGold: 1000,
  baseExp: 100,
  perfectGoldBonus: 0,
  perfectExpBonus: 0,
  firstClearGoldBonus: 0,
  maxStars: 3,
  showTaskTip: true,
  showAchievementTip: true
};

export const STAR_RULE_CONFIG = [
  {
    star: 1,
    type: STAR_RULE_TYPE.CLEAR,
    title: "通关",
    desc: "完成关卡"
  },
  {
    star: 2,
    type: STAR_RULE_TYPE.HP_OVER_HALF,
    title: "稳态作战",
    desc: "通关时生命高于50%"
  },
  {
    star: 3,
    type: STAR_RULE_TYPE.PERFECT_CLEAR,
    title: "完美通关",
    desc: "不漏怪完成关卡"
  }
];

export function calculateBattleStars(battleResult) {
  if (!battleResult.isWin) {
    return 0;
  }

  let stars = 1;

  const hpRate = safeDivide(
    battleResult.playerFinalHp,
    battleResult.playerMaxHp
  );

  if (hpRate >= 0.5) {
    stars = Math.max(stars, 2);
  }

  if ((battleResult.enemyLeakCount || 0) <= 0) {
    stars = Math.max(stars, 3);
  }

  return Math.min(stars, BATTLE_SETTLEMENT_CONFIG.maxStars);
}

export function isPerfectClear(battleResult) {
  return battleResult.isWin && (battleResult.enemyLeakCount || 0) <= 0;
}

export function getBattleBaseRewards(battleResult) {
  if (!battleResult.isWin) {
    return [];
  }

  const rewards = [
    {
      type: SETTLEMENT_REWARD_TYPE.GOLD,
      amount: BATTLE_SETTLEMENT_CONFIG.baseGold
    },
    {
      type: SETTLEMENT_REWARD_TYPE.EXP,
      amount: BATTLE_SETTLEMENT_CONFIG.baseExp
    }
  ];

  if (isPerfectClear(battleResult)) {
    if (BATTLE_SETTLEMENT_CONFIG.perfectGoldBonus > 0) {
      rewards.push({
        type: SETTLEMENT_REWARD_TYPE.GOLD,
        amount: BATTLE_SETTLEMENT_CONFIG.perfectGoldBonus
      });
    }

    if (BATTLE_SETTLEMENT_CONFIG.perfectExpBonus > 0) {
      rewards.push({
        type: SETTLEMENT_REWARD_TYPE.EXP,
        amount: BATTLE_SETTLEMENT_CONFIG.perfectExpBonus
      });
    }
  }

  return rewards;
}

export function applySettlementRewards({
  player,
  rewards
}) {
  let nextPlayer = {
    ...player,
    inventory: {
      ...(player.inventory || {})
    }
  };

  for (const reward of rewards) {
    if (reward.type === SETTLEMENT_REWARD_TYPE.GOLD) {
      nextPlayer.gold = (nextPlayer.gold || 0) + reward.amount;
    }

    if (reward.type === SETTLEMENT_REWARD_TYPE.EXP) {
      nextPlayer.exp = (nextPlayer.exp || 0) + reward.amount;
    }

    if (reward.type === SETTLEMENT_REWARD_TYPE.ITEM) {
      nextPlayer.inventory[reward.itemId] =
        (nextPlayer.inventory[reward.itemId] || 0) + reward.amount;
    }
  }

  return nextPlayer;
}

export function updateStageProgress({
  progress,
  battleResult,
  stageId,
  chapterIndex,
  stageInChapter
}) {
  const nextProgress = {
    ...progress,
    clearedStageIds: [...(progress.clearedStageIds || [])],
    clearedChapterIds: [...(progress.clearedChapterIds || [])],
    stageStars: {
      ...(progress.stageStars || {})
    },
    perfectClearCount: progress.perfectClearCount || 0,
    noDamageBossClearCount: progress.noDamageBossClearCount || 0
  };

  if (!battleResult.isWin) {
    return nextProgress;
  }

  if (!nextProgress.clearedStageIds.includes(stageId)) {
    nextProgress.clearedStageIds.push(stageId);
  }

  const stars = calculateBattleStars(battleResult);
  const oldStars = nextProgress.stageStars[stageId] || 0;
  nextProgress.stageStars[stageId] = Math.max(oldStars, stars);

  if (isPerfectClear(battleResult)) {
    nextProgress.perfectClearCount += 1;
  }

  const hpRate = safeDivide(
    battleResult.playerFinalHp,
    battleResult.playerMaxHp
  );

  const isBossStage = stageInChapter === 10 && chapterIndex > 0;

  if (isBossStage && hpRate >= 1) {
    nextProgress.noDamageBossClearCount += 1;
  }

  if (chapterIndex > 0 && stageInChapter === 10) {
    if (!nextProgress.clearedChapterIds.includes(chapterIndex)) {
      nextProgress.clearedChapterIds.push(chapterIndex);
    }
  }

  return nextProgress;
}

export function createSettlementViewModel({
  battleResult,
  stageConfig,
  rewards,
  unlockedTasks = [],
  unlockedAchievements = []
}) {
  const isWin = !!battleResult.isWin;
  const stars = calculateBattleStars(battleResult);

  return {
    resultType: isWin ? BATTLE_RESULT_TYPE.WIN : BATTLE_RESULT_TYPE.FAIL,
    title: isWin ? "作战胜利" : "作战失败",
    subTitle: isWin ? "空域清扫完成" : "本次作战未完成",
    stageId: stageConfig.stageId,
    chapterIndex: stageConfig.chapterIndex,
    stageInChapter: stageConfig.stageInChapter,

    stars,
    starRules: STAR_RULE_CONFIG.map((rule) => ({
      ...rule,
      achieved: stars >= rule.star
    })),

    rewards,
    stats: {
      killCount: battleResult.killCount || 0,
      enemyLeakCount: battleResult.enemyLeakCount || 0,
      battleSeconds: battleResult.battleSeconds || 0,
      playerFinalHp: battleResult.playerFinalHp || 0,
      playerMaxHp: battleResult.playerMaxHp || 0,
      bossFinalHp: battleResult.bossFinalHp || 0,
      bossMaxHp: battleResult.bossMaxHp || 0
    },

    tips: {
      showTaskTip: unlockedTasks.length > 0,
      showAchievementTip: unlockedAchievements.length > 0,
      unlockedTasks,
      unlockedAchievements
    },

    ui: {
      panelType: "battle_settlement",
      showDimBackground: true,
      showContinueButton: true,
      continueButtonText: isWin ? "继续" : "返回强化",
      showReplayButton: true,
      replayButtonText: "再次挑战"
    }
  };
}

export function settleBattle({
  player,
  progress,
  battleResult,
  stageConfig,
  unlockedTasks = [],
  unlockedAchievements = []
}) {
  const rewards = getBattleBaseRewards(battleResult);

  const nextPlayer = applySettlementRewards({
    player,
    rewards
  });

  const nextProgress = updateStageProgress({
    progress,
    battleResult,
    stageId: stageConfig.stageId,
    chapterIndex: stageConfig.chapterIndex,
    stageInChapter: stageConfig.stageInChapter
  });

  const viewModel = createSettlementViewModel({
    battleResult,
    stageConfig,
    rewards,
    unlockedTasks,
    unlockedAchievements
  });

  return {
    player: nextPlayer,
    progress: nextProgress,
    viewModel
  };
}

export function safeDivide(a, b) {
  if (!b || b <= 0) {
    return 0;
  }

  return a / b;
}
```

## 接入口

战斗结束时统一调用：

```js
const settlement = settleBattle({
  player,
  progress,
  battleResult,
  stageConfig,
  unlockedTasks,
  unlockedAchievements
});
```

胜利与失败都走结算系统。失败时可以继续接入失败引导系统。
