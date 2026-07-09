# 失败引导系统_Codex可直接粘贴版

```js
// failGuideSystem.js

export const FAIL_REASON = {
  PLAYER_DEAD: "player_dead",
  TIME_OUT: "time_out",
  ENEMY_LEAKED: "enemy_leaked",
  BOSS_ALIVE: "boss_alive",
  ARMOR_NOT_ENOUGH: "armor_not_enough",
  DAMAGE_NOT_ENOUGH: "damage_not_enough",
  HP_NOT_ENOUGH: "hp_not_enough",
  UNKNOWN: "unknown"
};

export const FAIL_GUIDE_ACTION = {
  UPGRADE_ATTACK: "upgrade_attack",
  UPGRADE_ARMOR_PENETRATION: "upgrade_armor_penetration",
  UPGRADE_HP: "upgrade_hp",
  OPEN_FIGHTER_UPGRADE: "open_fighter_upgrade",
  OPEN_HANGAR: "open_hangar",
  OPEN_PILOT: "open_pilot",
  OPEN_SHOP: "open_shop",
  REPLAY_STAGE: "replay_stage"
};

export const FAIL_GUIDE_PRIORITY = [
  FAIL_REASON.ARMOR_NOT_ENOUGH,
  FAIL_REASON.DAMAGE_NOT_ENOUGH,
  FAIL_REASON.HP_NOT_ENOUGH,
  FAIL_REASON.ENEMY_LEAKED,
  FAIL_REASON.BOSS_ALIVE,
  FAIL_REASON.TIME_OUT,
  FAIL_REASON.PLAYER_DEAD,
  FAIL_REASON.UNKNOWN
];

export const FAIL_GUIDE_CONFIG = {
  [FAIL_REASON.ARMOR_NOT_ENOUGH]: {
    title: "破甲不足",
    desc: "敌方装甲过高，当前火力被大幅削弱。",
    advice: "优先强化破甲，或更换高破甲飞行员 / 战机。",
    primaryAction: FAIL_GUIDE_ACTION.UPGRADE_ARMOR_PENETRATION,
    primaryText: "强化破甲",
    secondaryAction: FAIL_GUIDE_ACTION.OPEN_PILOT,
    secondaryText: "更换飞行员"
  },

  [FAIL_REASON.DAMAGE_NOT_ENOUGH]: {
    title: "输出不足",
    desc: "敌机存活时间过长，导致战斗被拖慢。",
    advice: "优先强化攻击，提升清怪和打BOSS效率。",
    primaryAction: FAIL_GUIDE_ACTION.UPGRADE_ATTACK,
    primaryText: "强化攻击",
    secondaryAction: FAIL_GUIDE_ACTION.OPEN_FIGHTER_UPGRADE,
    secondaryText: "打开升级"
  },

  [FAIL_REASON.HP_NOT_ENOUGH]: {
    title: "生命不足",
    desc: "战机承受伤害过高，容易在后半段被击坠。",
    advice: "强化生命，或更换生命更高的战机。",
    primaryAction: FAIL_GUIDE_ACTION.UPGRADE_HP,
    primaryText: "强化生命",
    secondaryAction: FAIL_GUIDE_ACTION.OPEN_HANGAR,
    secondaryText: "更换战机"
  },

  [FAIL_REASON.ENEMY_LEAKED]: {
    title: "漏怪过多",
    desc: "敌机没有被及时清理，突破了防线。",
    advice: "提升攻击，或选择更适合清怪的战机和飞行员。",
    primaryAction: FAIL_GUIDE_ACTION.UPGRADE_ATTACK,
    primaryText: "强化攻击",
    secondaryAction: FAIL_GUIDE_ACTION.OPEN_HANGAR,
    secondaryText: "调整战机"
  },

  [FAIL_REASON.BOSS_ALIVE]: {
    title: "BOSS未击破",
    desc: "BOSS在战斗结束前仍未被击败。",
    advice: "提升攻击和破甲，BOSS战更看重单体输出。",
    primaryAction: FAIL_GUIDE_ACTION.UPGRADE_ATTACK,
    primaryText: "强化攻击",
    secondaryAction: FAIL_GUIDE_ACTION.UPGRADE_ARMOR_PENETRATION,
    secondaryText: "强化破甲"
  },

  [FAIL_REASON.TIME_OUT]: {
    title: "战斗超时",
    desc: "敌人没有及时被清理，战斗时间耗尽。",
    advice: "提升战机综合等级，优先强化攻击。",
    primaryAction: FAIL_GUIDE_ACTION.OPEN_FIGHTER_UPGRADE,
    primaryText: "提升战机",
    secondaryAction: FAIL_GUIDE_ACTION.REPLAY_STAGE,
    secondaryText: "再次挑战"
  },

  [FAIL_REASON.PLAYER_DEAD]: {
    title: "战机被击坠",
    desc: "受到伤害过高，战机生命值不足。",
    advice: "强化生命，或提升操作规避密集弹幕。",
    primaryAction: FAIL_GUIDE_ACTION.UPGRADE_HP,
    primaryText: "强化生命",
    secondaryAction: FAIL_GUIDE_ACTION.REPLAY_STAGE,
    secondaryText: "再次挑战"
  },

  [FAIL_REASON.UNKNOWN]: {
    title: "挑战失败",
    desc: "当前配置未能完成本关目标。",
    advice: "建议提升战机等级后再次挑战。",
    primaryAction: FAIL_GUIDE_ACTION.OPEN_FIGHTER_UPGRADE,
    primaryText: "前往升级",
    secondaryAction: FAIL_GUIDE_ACTION.REPLAY_STAGE,
    secondaryText: "再次挑战"
  }
};

export function analyzeBattleFailReason({
  battleResult,
  stageConfig,
  playerBuild
}) {
  const reasons = [];

  const finalHpRate = safeDivide(
    battleResult.playerFinalHp,
    battleResult.playerMaxHp
  );

  const bossHpRate = safeDivide(
    battleResult.bossFinalHp,
    battleResult.bossMaxHp
  );

  const enemyLeakCount = battleResult.enemyLeakCount || 0;
  const isTimeOut = !!battleResult.isTimeOut;
  const isPlayerDead = !!battleResult.isPlayerDead;
  const hasBoss = !!stageConfig?.hasBoss;
  const bossAlive = hasBoss && bossHpRate > 0;

  const requiredArmorPenetration = stageConfig?.recommendedArmorPenetration || 0;
  const playerArmorPenetration = playerBuild?.totalArmorPenetration || 0;

  const recommendedPower = stageConfig?.recommendedPower || 0;
  const playerPower = playerBuild?.battlePower || 0;

  if (requiredArmorPenetration > 0 && playerArmorPenetration < requiredArmorPenetration) {
    reasons.push({
      reason: FAIL_REASON.ARMOR_NOT_ENOUGH,
      score: requiredArmorPenetration - playerArmorPenetration
    });
  }

  if (recommendedPower > 0 && playerPower < recommendedPower * 0.88) {
    reasons.push({
      reason: FAIL_REASON.DAMAGE_NOT_ENOUGH,
      score: recommendedPower - playerPower
    });
  }

  if (isPlayerDead || finalHpRate <= 0) {
    reasons.push({
      reason: FAIL_REASON.PLAYER_DEAD,
      score: 100
    });
  }

  if (finalHpRate > 0 && finalHpRate < 0.25) {
    reasons.push({
      reason: FAIL_REASON.HP_NOT_ENOUGH,
      score: 75
    });
  }

  if (enemyLeakCount > 0) {
    reasons.push({
      reason: FAIL_REASON.ENEMY_LEAKED,
      score: enemyLeakCount
    });
  }

  if (bossAlive) {
    reasons.push({
      reason: FAIL_REASON.BOSS_ALIVE,
      score: Math.ceil(bossHpRate * 100)
    });
  }

  if (isTimeOut) {
    reasons.push({
      reason: FAIL_REASON.TIME_OUT,
      score: 50
    });
  }

  if (reasons.length <= 0) {
    reasons.push({
      reason: FAIL_REASON.UNKNOWN,
      score: 1
    });
  }

  return pickTopFailReason(reasons);
}

export function pickTopFailReason(reasons) {
  const sorted = [...reasons].sort((a, b) => {
    const priorityA = FAIL_GUIDE_PRIORITY.indexOf(a.reason);
    const priorityB = FAIL_GUIDE_PRIORITY.indexOf(b.reason);

    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    return b.score - a.score;
  });

  return sorted[0]?.reason || FAIL_REASON.UNKNOWN;
}

export function getFailGuideViewModel({
  battleResult,
  stageConfig,
  playerBuild
}) {
  const reason = analyzeBattleFailReason({
    battleResult,
    stageConfig,
    playerBuild
  });

  const config = FAIL_GUIDE_CONFIG[reason] || FAIL_GUIDE_CONFIG[FAIL_REASON.UNKNOWN];

  return {
    reason,
    title: config.title,
    desc: config.desc,
    advice: config.advice,
    primaryAction: config.primaryAction,
    primaryText: config.primaryText,
    secondaryAction: config.secondaryAction,
    secondaryText: config.secondaryText,
    ui: {
      modalTitle: "作战失败",
      panelType: "fail_guide",
      showDimBackground: true,
      showPrimaryButton: true,
      showSecondaryButton: true
    }
  };
}

export function handleFailGuideAction(action, router) {
  if (!router) {
    return;
  }

  if (action === FAIL_GUIDE_ACTION.UPGRADE_ATTACK) {
    router.openUpgradePanel?.({ focusStat: "attack" });
    return;
  }

  if (action === FAIL_GUIDE_ACTION.UPGRADE_ARMOR_PENETRATION) {
    router.openUpgradePanel?.({ focusStat: "armorPenetration" });
    return;
  }

  if (action === FAIL_GUIDE_ACTION.UPGRADE_HP) {
    router.openUpgradePanel?.({ focusStat: "hp" });
    return;
  }

  if (action === FAIL_GUIDE_ACTION.OPEN_FIGHTER_UPGRADE) {
    router.openUpgradePanel?.();
    return;
  }

  if (action === FAIL_GUIDE_ACTION.OPEN_HANGAR) {
    router.openHangarPanel?.();
    return;
  }

  if (action === FAIL_GUIDE_ACTION.OPEN_PILOT) {
    router.openPilotPanel?.();
    return;
  }

  if (action === FAIL_GUIDE_ACTION.OPEN_SHOP) {
    router.openShopPanel?.();
    return;
  }

  if (action === FAIL_GUIDE_ACTION.REPLAY_STAGE) {
    router.replayStage?.();
  }
}

export function safeDivide(a, b) {
  if (!b || b <= 0) {
    return 0;
  }

  return a / b;
}
```

## 接入位置

失败结算时调用：

```js
const failGuide = getFailGuideViewModel({
  battleResult,
  stageConfig,
  playerBuild
});
```

然后在失败结算界面展示：

```text
失败原因
失败说明
建议操作
主按钮
副按钮
```
