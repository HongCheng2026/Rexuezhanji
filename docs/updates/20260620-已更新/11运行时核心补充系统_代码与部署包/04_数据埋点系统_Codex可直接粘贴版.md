# 04_数据埋点系统_Codex可直接粘贴版

```js
// src/systems/analyticsSystem.js

export const ANALYTICS_EVENT = {
  GAME_START: "game_start",
  GAME_EXIT: "game_exit",

  STAGE_START: "stage_start",
  STAGE_CLEAR: "stage_clear",
  STAGE_FAIL: "stage_fail",

  UPGRADE_FIGHTER: "upgrade_fighter",
  BUY_PILOT: "buy_pilot",
  BUY_FIGHTER: "buy_fighter",

  OPEN_SHOP: "open_shop",
  OPEN_SPONSOR: "open_sponsor",

  TASK_CLAIM: "task_claim",
  ACHIEVEMENT_CLAIM: "achievement_claim",

  REDEEM_CODE: "redeem_code",
  REVIVE_USED: "revive_used",

  FAIL_GUIDE_SHOWN: "fail_guide_shown",
  FAIL_GUIDE_CLICK: "fail_guide_click",

  S_RANK_HINT_SHOWN: "s_rank_hint_shown"
};

export const ANALYTICS_CONFIG = {
  localStorageKey: "rxzj_analytics_events",
  maxLocalEvents: 500,
  enableConsoleLog: true,
  enableRemoteUpload: false,
  remoteEndpoint: ""
};

export function createAnalyticsSystem(config = ANALYTICS_CONFIG) {
  return {
    config,

    track(eventName, payload = {}) {
      const event = {
        eventName,
        payload,
        time: Date.now(),
        sessionId: getSessionId()
      };

      saveEventToLocal(event, config);

      if (config.enableConsoleLog) {
        console.log("[analytics]", event);
      }

      if (config.enableRemoteUpload && config.remoteEndpoint) {
        uploadEvent(event, config).catch((error) => {
          console.warn("[analytics] upload failed", error);
        });
      }

      return event;
    },

    getLocalEvents() {
      return getLocalEvents(config);
    },

    clearLocalEvents() {
      localStorage.removeItem(config.localStorageKey);
    }
  };
}

export function saveEventToLocal(event, config = ANALYTICS_CONFIG) {
  const events = getLocalEvents(config);
  events.push(event);

  const limited = events.slice(-config.maxLocalEvents);
  localStorage.setItem(config.localStorageKey, JSON.stringify(limited));
}

export function getLocalEvents(config = ANALYTICS_CONFIG) {
  try {
    const raw = localStorage.getItem(config.localStorageKey);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

export async function uploadEvent(event, config = ANALYTICS_CONFIG) {
  await fetch(config.remoteEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(event)
  });
}

export function getSessionId() {
  const key = "rxzj_session_id";
  let sessionId = sessionStorage.getItem(key);

  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    sessionStorage.setItem(key, sessionId);
  }

  return sessionId;
}

export function trackStageStart(analytics, {
  stageId,
  chapterIndex,
  stageInChapter,
  playerPower,
  armorPenetration
}) {
  return analytics.track(ANALYTICS_EVENT.STAGE_START, {
    stageId,
    chapterIndex,
    stageInChapter,
    playerPower,
    armorPenetration
  });
}

export function trackStageClear(analytics, {
  stageId,
  stars,
  battleSeconds,
  killCount,
  playerFinalHp,
  playerMaxHp
}) {
  return analytics.track(ANALYTICS_EVENT.STAGE_CLEAR, {
    stageId,
    stars,
    battleSeconds,
    killCount,
    hpRate: playerMaxHp > 0 ? playerFinalHp / playerMaxHp : 0
  });
}

export function trackStageFail(analytics, {
  stageId,
  failReason,
  battleSeconds,
  enemyLeakCount,
  bossHpRate,
  playerPower,
  recommendedPower
}) {
  return analytics.track(ANALYTICS_EVENT.STAGE_FAIL, {
    stageId,
    failReason,
    battleSeconds,
    enemyLeakCount,
    bossHpRate,
    playerPower,
    recommendedPower
  });
}

export function trackCurrencySpend(analytics, {
  reason,
  amount,
  currencyType,
  before,
  after
}) {
  return analytics.track("currency_spend", {
    reason,
    amount,
    currencyType,
    before,
    after
  });
}
```

## 必须记录的事件

```text
玩家卡在哪一关
失败原因
强化了什么属性
是否购买A级战机
是否看过S级提示
是否打开商店
是否点击赞助我们
第几关流失
第几分钟退出
```
