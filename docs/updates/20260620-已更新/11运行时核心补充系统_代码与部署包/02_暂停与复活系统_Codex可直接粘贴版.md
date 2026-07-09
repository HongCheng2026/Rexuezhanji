# 02_暂停与复活系统_Codex可直接粘贴版

```js
// src/systems/pauseReviveSystem.js

export const BATTLE_PAUSE_STATUS = {
  RUNNING: "running",
  PAUSED: "paused",
  ENDED: "ended"
};

export const REVIVE_COST_TYPE = {
  ITEM: "item",
  GOLD: "gold",
  SPONSOR: "sponsor"
};

export const PAUSE_SYSTEM_CONFIG = {
  allowPause: true,
  allowRestart: true,
  allowReturnMain: true,
  pauseStopsBattleTimer: true,
  pauseStopsEnemySpawn: true,
  pauseStopsBullets: true
};

export const REVIVE_SYSTEM_CONFIG = {
  maxRevivePerBattle: 1,
  reviveHpRate: 0.5,
  keepBossHp: true,
  keepBattleTime: true,
  defaultCostType: REVIVE_COST_TYPE.ITEM,
  reviveItemId: "revive_token",
  reviveGoldCost: 30000
};

export function createPauseState() {
  return {
    status: BATTLE_PAUSE_STATUS.RUNNING,
    pausedAt: 0,
    totalPausedMs: 0
  };
}

export function pauseBattle(pauseState) {
  if (pauseState.status !== BATTLE_PAUSE_STATUS.RUNNING) {
    return {
      success: false,
      reason: "BATTLE_NOT_RUNNING",
      pauseState
    };
  }

  return {
    success: true,
    reason: "OK",
    pauseState: {
      ...pauseState,
      status: BATTLE_PAUSE_STATUS.PAUSED,
      pausedAt: Date.now()
    }
  };
}

export function resumeBattle(pauseState) {
  if (pauseState.status !== BATTLE_PAUSE_STATUS.PAUSED) {
    return {
      success: false,
      reason: "BATTLE_NOT_PAUSED",
      pauseState
    };
  }

  const now = Date.now();
  const pausedDuration = now - pauseState.pausedAt;

  return {
    success: true,
    reason: "OK",
    pauseState: {
      ...pauseState,
      status: BATTLE_PAUSE_STATUS.RUNNING,
      pausedAt: 0,
      totalPausedMs: pauseState.totalPausedMs + pausedDuration
    }
  };
}

export function endPauseState(pauseState) {
  return {
    ...pauseState,
    status: BATTLE_PAUSE_STATUS.ENDED
  };
}

export function createReviveState() {
  return {
    reviveUsedCount: 0,
    revivedThisBattle: false
  };
}

export function canRevive({
  battleState,
  player,
  reviveState,
  config = REVIVE_SYSTEM_CONFIG
}) {
  if (!battleState.isPlayerDead) {
    return {
      canRevive: false,
      reason: "PLAYER_NOT_DEAD"
    };
  }

  if (reviveState.reviveUsedCount >= config.maxRevivePerBattle) {
    return {
      canRevive: false,
      reason: "REVIVE_LIMIT_REACHED"
    };
  }

  const itemCount = (player.inventory || {})[config.reviveItemId] || 0;

  if (itemCount > 0) {
    return {
      canRevive: true,
      reason: "OK",
      costType: REVIVE_COST_TYPE.ITEM,
      itemId: config.reviveItemId,
      amount: 1
    };
  }

  if ((player.gold || 0) >= config.reviveGoldCost) {
    return {
      canRevive: true,
      reason: "OK",
      costType: REVIVE_COST_TYPE.GOLD,
      amount: config.reviveGoldCost
    };
  }

  return {
    canRevive: false,
    reason: "NO_REVIVE_COST"
  };
}

export function applyReviveCost({
  player,
  reviveCheck,
  config = REVIVE_SYSTEM_CONFIG
}) {
  const nextPlayer = {
    ...player,
    inventory: {
      ...(player.inventory || {})
    }
  };

  if (reviveCheck.costType === REVIVE_COST_TYPE.ITEM) {
    nextPlayer.inventory[config.reviveItemId] =
      Math.max(0, (nextPlayer.inventory[config.reviveItemId] || 0) - 1);
  }

  if (reviveCheck.costType === REVIVE_COST_TYPE.GOLD) {
    nextPlayer.gold = Math.max(0, (nextPlayer.gold || 0) - config.reviveGoldCost);
  }

  return nextPlayer;
}

export function reviveBattle({
  battleState,
  player,
  reviveState,
  config = REVIVE_SYSTEM_CONFIG
}) {
  const check = canRevive({
    battleState,
    player,
    reviveState,
    config
  });

  if (!check.canRevive) {
    return {
      success: false,
      reason: check.reason,
      battleState,
      player,
      reviveState
    };
  }

  const nextPlayer = applyReviveCost({
    player,
    reviveCheck: check,
    config
  });

  const restoredHp = Math.ceil(battleState.playerMaxHp * config.reviveHpRate);

  const nextBattleState = {
    ...battleState,
    isPlayerDead: false,
    playerHp: restoredHp,
    playerFinalHp: restoredHp
  };

  const nextReviveState = {
    ...reviveState,
    reviveUsedCount: reviveState.reviveUsedCount + 1,
    revivedThisBattle: true
  };

  return {
    success: true,
    reason: "OK",
    costType: check.costType,
    battleState: nextBattleState,
    player: nextPlayer,
    reviveState: nextReviveState
  };
}

export function createPausePanelViewModel() {
  return {
    panelType: "battle_pause",
    title: "暂停",
    buttons: [
      {
        id: "resume",
        text: "继续战斗"
      },
      {
        id: "restart",
        text: "重新开始"
      },
      {
        id: "settings",
        text: "设置"
      },
      {
        id: "return_main",
        text: "返回主界面"
      }
    ]
  };
}

export function createRevivePanelViewModel({
  player,
  battleState,
  reviveState,
  config = REVIVE_SYSTEM_CONFIG
}) {
  const check = canRevive({
    player,
    battleState,
    reviveState,
    config
  });

  return {
    panelType: "battle_revive",
    title: "是否复活",
    desc: `复活后恢复${Math.round(config.reviveHpRate * 100)}%生命`,
    canRevive: check.canRevive,
    reason: check.reason,
    costType: check.costType || null,
    costText: getReviveCostText(check, config),
    buttons: [
      {
        id: "revive",
        text: "立即复活",
        enabled: check.canRevive
      },
      {
        id: "give_up",
        text: "放弃"
      }
    ]
  };
}

export function getReviveCostText(check, config = REVIVE_SYSTEM_CONFIG) {
  if (!check.canRevive) {
    return "复活次数不足或资源不足";
  }

  if (check.costType === REVIVE_COST_TYPE.ITEM) {
    return "消耗复活道具 ×1";
  }

  if (check.costType === REVIVE_COST_TYPE.GOLD) {
    return `消耗金币 ${config.reviveGoldCost}`;
  }

  return "";
}
```
