# 03_完美战斗经验金币奖励_Codex可直接粘贴版

## 1. 固定口径

```text
每场战斗消耗体力：5
每场战斗第60秒出现BOSS
每场战斗第90秒结束

完美战斗定义：
不漏掉任何敌机。

完美战斗奖励：
经验 = 100
金币 = 1000
```

## 2. 奖励表

| 战斗结果 | 经验 | 金币 |
|---|---:|---:|
| 完美战斗 | 100 | 1000 |

## 3. 可直接粘贴进程序的代码

```js
// battleRewardConfig.js

export const BATTLE_REWARD_CONFIG = {
  staminaCost: 5,

  bossAppearSeconds: 60,
  battleEndSeconds: 90,

  perfectExp: 100,
  perfectGold: 1000
};

export function getPerfectBattleReward() {
  return {
    exp: BATTLE_REWARD_CONFIG.perfectExp,
    gold: BATTLE_REWARD_CONFIG.perfectGold,
    staminaCost: BATTLE_REWARD_CONFIG.staminaCost,
    bossAppearSeconds: BATTLE_REWARD_CONFIG.bossAppearSeconds,
    battleEndSeconds: BATTLE_REWARD_CONFIG.battleEndSeconds,
    isPerfect: true
  };
}

export function getBattleRewardByKillCount({
  killedEnemies,
  totalEnemies
}) {
  if (totalEnemies <= 0) {
    return {
      exp: 0,
      gold: 0,
      clearRate: 0,
      isPerfect: false
    };
  }

  const clearRate = Math.max(
    0,
    Math.min(1, killedEnemies / totalEnemies)
  );

  return {
    exp: Math.floor(BATTLE_REWARD_CONFIG.perfectExp * clearRate),
    gold: Math.floor(BATTLE_REWARD_CONFIG.perfectGold * clearRate),
    clearRate,
    isPerfect: clearRate >= 1
  };
}

export function canStartBattle(currentStamina) {
  return currentStamina >= BATTLE_REWARD_CONFIG.staminaCost;
}

export function consumeBattleStamina(currentStamina) {
  if (!canStartBattle(currentStamina)) {
    return {
      success: false,
      stamina: currentStamina,
      reason: "STAMINA_NOT_ENOUGH"
    };
  }

  return {
    success: true,
    stamina: currentStamina - BATTLE_REWARD_CONFIG.staminaCost
  };
}
```
