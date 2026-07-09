```js
// battleStorySystem.js

export const BATTLE_STORY_UI_CONFIG = {
  position: "bottom_left",
  nonBlocking: true,
  pauseBattle: false,
  blockInput: false,
  maxVisibleMessages: 1,
  defaultDurationMs: 2200,
  importantDurationMs: 2800,
  fadeInMs: 120,
  fadeOutMs: 160,
  portraitSize: 96,
  textMaxLength: 28
};

export const BATTLE_STORY_EVENT_TYPE = {
  STAGE_START: "stage_start",
  MID_WAVE: "mid_wave",
  BOSS_APPEAR: "boss_appear",
  BOSS_BURST: "boss_burst",
  LAST_WARNING: "last_warning",
  STAGE_CLEAR: "stage_clear",
  STAGE_FAIL: "stage_fail"
};

export const BATTLE_STORY_TIMELINE_SECONDS = {
  stageStart: 0,
  midWave: 30,
  bossAppear: 60,
  bossBurst: 75,
  lastWarning: 85
};

export const PILOT_FALLBACK_CONFIG = {
  id: "pilot_default",
  name: "飞行员",
  avatarId: "pilot_default_avatar"
};

export const GENERIC_BATTLE_STORY_BY_CHAPTER = {
  0: {
    start: "指挥官，我已接入战斗系统，开始清扫敌机。",
    midWave: "敌机数量不多，保持火力压制。",
    bossAppear: "",
    bossBurst: "",
    lastWarning: "最后一波敌机，马上结束。"
  },

  1: {
    start: "敌群进入射程，指挥官，准许我开火。",
    midWave: "敌机开始反击，注意弹道。",
    bossAppear: "高能反应接近，BOSS进入战场。",
    bossBurst: "BOSS火力增强，保持移动。",
    lastWarning: "它撑不了多久，继续压制。"
  },

  2: {
    start: "第二空域敌军增多，准备进入交战。",
    midWave: "检测到重甲敌机，普通火力效率下降。",
    bossAppear: "重甲BOSS出现，建议提升破甲能力。",
    bossBurst: "它的装甲正在过载，小心爆发火力。",
    lastWarning: "集中火力，别让它拖到最后。"
  },

  3: {
    start: "黑潮空港已经沦陷，敌机会从多方向压过来。",
    midWave: "敌机密度上升，优先清理射击单位。",
    bossAppear: "BOSS进入空港上空，准备迎击。",
    bossBurst: "弹幕变密了，指挥官，别停在中线。",
    lastWarning: "最后十秒，继续输出。"
  },

  4: {
    start: "护盾敌机开始量产，破甲属性会更重要。",
    midWave: "前方护盾单位增多，普通攻击会被削弱。",
    bossAppear: "护盾核心出现，先打穿它的装甲层。",
    bossBurst: "护盾反应增强，注意弹幕间隙。",
    lastWarning: "护盾快碎了，继续攻击核心。"
  },

  5: {
    start: "精英战机编队出现，今天不会轻松。",
    midWave: "精英机正在锁定我们，优先击破。",
    bossAppear: "敌方精英指挥机入场。",
    bossBurst: "它开始压制空域，注意两侧弹道。",
    lastWarning: "它的防线破了，收尾。"
  },

  6: {
    start: "黑潮主力舰队压境，弹幕密度会明显上升。",
    midWave: "组合敌机出现，别被夹击。",
    bossAppear: "主力舰队BOSS出现。",
    bossBurst: "BOSS进入火力爆发，保持走位。",
    lastWarning: "撑住这波，我们就能突破。"
  },

  7: {
    start: "第七空域是重甲防线，破甲不足会很吃力。",
    midWave: "敌方装甲强度异常，S级战力会更稳定。",
    bossAppear: "重甲核心出现，普通火力很难击穿。",
    bossBurst: "它在展开重甲反击，指挥官，注意弹幕。",
    lastWarning: "还差一点，继续压制核心。"
  },

  8: {
    start: "我们开始反攻黑潮前线基地。",
    midWave: "敌军反扑，保持推进节奏。",
    bossAppear: "基地防卫BOSS出现。",
    bossBurst: "它试图封锁航线，别被火力压住。",
    lastWarning: "防线快崩了，继续前压。"
  },

  9: {
    start: "最终空域已开启，黑潮母舰就在前方。",
    midWave: "母舰防卫群出现，火力会非常密。",
    bossAppear: "弥赛亚的核心投影出现了。",
    bossBurst: "弥赛亚进入压制模式，保持机动。",
    lastWarning: "最后十秒，所有火力打进核心。"
  }
};

export const SPECIAL_STAGE_BATTLE_STORY = {
  "1_10": {
    bossAppear: "这不是普通BOSS，后方还有更大的东西。",
    bossBurst: "它在向黑潮主脑发送战斗数据。",
    clear: "指挥官，天空中出现了黑潮主脑投影。"
  },

  "2_5": {
    start: "这关开始会出现重甲敌机，注意输出效率。",
    midWave: "普通火力打得很慢，破甲属性会越来越重要。",
    lastWarning: "重甲单位还没清完，继续压制。"
  },

  "2_10": {
    start: "这架BOSS装甲很厚，别和它硬耗。",
    bossAppear: "重甲BOSS出现，S级飞行员和S级战机会更有效。",
    bossBurst: "它的装甲层在反击，破甲不足会拖到超时。",
    fail: "指挥官，火力不是问题，问题是破甲不够。"
  },

  "7_5": {
    start: "第七章中段开始是真正的重甲防线。",
    midWave: "破甲不足会明显刮痧，建议检查飞行员和战机。",
    bossAppear: "重甲核心出现，普通组合很难突破。",
    fail: "这不是操作失误，是敌方装甲强度超过了当前配置。"
  },

  "7_10": {
    start: "这是第七空域最后防线，没有S级组合会非常吃力。",
    midWave: "敌方装甲已经接近临界值，S级穿甲能打开缺口。",
    bossAppear: "重甲核心BOSS出现，集中火力打穿它。",
    bossBurst: "它在强行压制空域，别停，继续移动。",
    fail: "指挥官，建议启用S级飞行员和S级战机再来。",
    clear: "重甲防线被击穿了，S级战力验证完成。"
  },

  "9_10": {
    start: "最终战开始，弥赛亚就在母舰核心里。",
    midWave: "母舰护卫群正在重组，不要给它喘息。",
    bossAppear: "弥赛亚核心出现，所有火力集中。",
    bossBurst: "弥赛亚正在释放全域压制，继续规避。",
    lastWarning: "最后一轮，把天空夺回来。",
    clear: "指挥官，黑潮核心反应正在消失。"
  }
};

export function getSafePilot(selectedPilot) {
  if (!selectedPilot) {
    return PILOT_FALLBACK_CONFIG;
  }

  return {
    id: selectedPilot.id || PILOT_FALLBACK_CONFIG.id,
    name: selectedPilot.name || PILOT_FALLBACK_CONFIG.name,
    avatarId: selectedPilot.avatarId || PILOT_FALLBACK_CONFIG.avatarId
  };
}

export function getStageId(chapterIndex, stageInChapter) {
  if (chapterIndex === 0) {
    return `prologue_${stageInChapter}`;
  }

  return `${chapterIndex}_${stageInChapter}`;
}

export function trimBattleStoryText(text) {
  if (!text) {
    return "";
  }

  const maxLength = BATTLE_STORY_UI_CONFIG.textMaxLength;

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 1)}…`;
}

export function createPilotBattleStoryEvent({
  time,
  type,
  selectedPilot,
  text,
  important = false
}) {
  const pilot = getSafePilot(selectedPilot);

  if (!text) {
    return null;
  }

  return {
    time,
    type,
    speakerType: "pilot",
    speakerId: pilot.id,
    speakerName: pilot.name,
    avatarId: pilot.avatarId,
    text: trimBattleStoryText(text),
    rawText: text,
    uiPosition: BATTLE_STORY_UI_CONFIG.position,
    nonBlocking: BATTLE_STORY_UI_CONFIG.nonBlocking,
    pauseBattle: BATTLE_STORY_UI_CONFIG.pauseBattle,
    blockInput: BATTLE_STORY_UI_CONFIG.blockInput,
    durationMs: important
      ? BATTLE_STORY_UI_CONFIG.importantDurationMs
      : BATTLE_STORY_UI_CONFIG.defaultDurationMs
  };
}

export function getBattleStoryText({
  chapterIndex,
  stageInChapter,
  key
}) {
  const stageId = getStageId(chapterIndex, stageInChapter);
  const specialConfig = SPECIAL_STAGE_BATTLE_STORY[stageId] || {};

  if (specialConfig[key]) {
    return specialConfig[key];
  }

  const chapterConfig =
    GENERIC_BATTLE_STORY_BY_CHAPTER[chapterIndex] ||
    GENERIC_BATTLE_STORY_BY_CHAPTER[1];

  return chapterConfig[key] || "";
}

export function getBattleStoryTimeline({
  chapterIndex,
  stageInChapter,
  selectedPilot,
  hasBoss = stageInChapter === 10 && chapterIndex > 0
}) {
  const events = [];

  const startText = getBattleStoryText({
    chapterIndex,
    stageInChapter,
    key: "start"
  });

  const midWaveText = getBattleStoryText({
    chapterIndex,
    stageInChapter,
    key: "midWave"
  });

  const bossAppearText = getBattleStoryText({
    chapterIndex,
    stageInChapter,
    key: "bossAppear"
  });

  const bossBurstText = getBattleStoryText({
    chapterIndex,
    stageInChapter,
    key: "bossBurst"
  });

  const lastWarningText = getBattleStoryText({
    chapterIndex,
    stageInChapter,
    key: "lastWarning"
  });

  events.push(
    createPilotBattleStoryEvent({
      time: BATTLE_STORY_TIMELINE_SECONDS.stageStart,
      type: BATTLE_STORY_EVENT_TYPE.STAGE_START,
      selectedPilot,
      text: startText
    })
  );

  events.push(
    createPilotBattleStoryEvent({
      time: BATTLE_STORY_TIMELINE_SECONDS.midWave,
      type: BATTLE_STORY_EVENT_TYPE.MID_WAVE,
      selectedPilot,
      text: midWaveText
    })
  );

  if (hasBoss) {
    events.push(
      createPilotBattleStoryEvent({
        time: BATTLE_STORY_TIMELINE_SECONDS.bossAppear,
        type: BATTLE_STORY_EVENT_TYPE.BOSS_APPEAR,
        selectedPilot,
        text: bossAppearText,
        important: true
      })
    );

    events.push(
      createPilotBattleStoryEvent({
        time: BATTLE_STORY_TIMELINE_SECONDS.bossBurst,
        type: BATTLE_STORY_EVENT_TYPE.BOSS_BURST,
        selectedPilot,
        text: bossBurstText
      })
    );
  }

  events.push(
    createPilotBattleStoryEvent({
      time: BATTLE_STORY_TIMELINE_SECONDS.lastWarning,
      type: BATTLE_STORY_EVENT_TYPE.LAST_WARNING,
      selectedPilot,
      text: lastWarningText
    })
  );

  return events
    .filter(Boolean)
    .sort((a, b) => a.time - b.time);
}

export function getBattleResultStoryEvent({
  chapterIndex,
  stageInChapter,
  selectedPilot,
  isWin
}) {
  const text = getBattleStoryText({
    chapterIndex,
    stageInChapter,
    key: isWin ? "clear" : "fail"
  });

  if (!text) {
    return null;
  }

  return createPilotBattleStoryEvent({
    time: 0,
    type: isWin
      ? BATTLE_STORY_EVENT_TYPE.STAGE_CLEAR
      : BATTLE_STORY_EVENT_TYPE.STAGE_FAIL,
    selectedPilot,
    text,
    important: true
  });
}

export function createBattleStoryRuntime({
  chapterIndex,
  stageInChapter,
  selectedPilot,
  hasBoss = stageInChapter === 10 && chapterIndex > 0
}) {
  const timeline = getBattleStoryTimeline({
    chapterIndex,
    stageInChapter,
    selectedPilot,
    hasBoss
  });

  const triggeredEventIds = new Set();

  return {
    timeline,

    getEventsToShow(currentBattleSeconds) {
      const eventsToShow = [];

      for (const event of timeline) {
        const eventId = `${event.type}_${event.time}`;

        if (
          currentBattleSeconds >= event.time &&
          !triggeredEventIds.has(eventId)
        ) {
          triggeredEventIds.add(eventId);
          eventsToShow.push(event);
        }
      }

      return eventsToShow;
    },

    reset() {
      triggeredEventIds.clear();
    }
  };
}

export function shouldRenderBattleStoryMessage(message) {
  if (!message) {
    return false;
  }

  if (!message.text) {
    return false;
  }

  return true;
}
```
