```js
// battleStoryPlaybackSystem.js

import {
  getStageBattleStory,
  getStageResultStory
} from "./stageStoryConfig.js";

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

export const PILOT_FALLBACK_CONFIG = {
  id: "pilot_default",
  name: "飞行员",
  avatarId: "pilot_default_avatar"
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

export function resolveStorySpeaker(message, selectedPilot) {
  const pilot = getSafePilot(selectedPilot);

  if (!message || message.speakerType === "current_pilot") {
    return {
      speakerType: "pilot",
      speakerId: pilot.id,
      speakerName: pilot.name,
      avatarId: pilot.avatarId
    };
  }

  if (message.speakerType === "system") {
    return {
      speakerType: "system",
      speakerId: "system",
      speakerName: message.speakerName || "系统",
      avatarId: "system_avatar"
    };
  }

  if (message.speakerType === "enemy") {
    return {
      speakerType: "enemy",
      speakerId: "enemy",
      speakerName: message.speakerName || "敌方",
      avatarId: "enemy_avatar"
    };
  }

  return {
    speakerType: "pilot",
    speakerId: pilot.id,
    speakerName: pilot.name,
    avatarId: pilot.avatarId
  };
}

export function createBattleStoryEvent({
  baseMessage,
  selectedPilot,
  important = false
}) {
  if (!baseMessage || !baseMessage.text) {
    return null;
  }

  const speaker = resolveStorySpeaker(baseMessage, selectedPilot);

  return {
    time: baseMessage.time || 0,
    type: baseMessage.type || "story",
    speakerType: speaker.speakerType,
    speakerId: speaker.speakerId,
    speakerName: speaker.speakerName,
    avatarId: speaker.avatarId,
    text: trimBattleStoryText(baseMessage.text),
    rawText: baseMessage.text,
    uiPosition: BATTLE_STORY_UI_CONFIG.position,
    nonBlocking: BATTLE_STORY_UI_CONFIG.nonBlocking,
    pauseBattle: BATTLE_STORY_UI_CONFIG.pauseBattle,
    blockInput: BATTLE_STORY_UI_CONFIG.blockInput,
    durationMs: important
      ? BATTLE_STORY_UI_CONFIG.importantDurationMs
      : BATTLE_STORY_UI_CONFIG.defaultDurationMs
  };
}

export function createBattleStoryRuntime({
  chapterIndex,
  stageInChapter,
  selectedPilot
}) {
  const baseTimeline = getStageBattleStory(chapterIndex, stageInChapter);
  const timeline = baseTimeline
    .map((message) =>
      createBattleStoryEvent({
        baseMessage: message,
        selectedPilot,
        important:
          message.type === "boss_appear" ||
          message.type === "boss_burst"
      })
    )
    .filter(Boolean)
    .sort((a, b) => a.time - b.time);

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

export function getBattleResultStoryEvents({
  chapterIndex,
  stageInChapter,
  selectedPilot,
  isWin
}) {
  const resultMessages = getStageResultStory({
    chapterIndex,
    stageInChapter,
    isWin
  });

  return resultMessages
    .map((message) =>
      createBattleStoryEvent({
        baseMessage: {
          ...message,
          time: 0,
          type: isWin ? "stage_clear" : "stage_fail"
        },
        selectedPilot,
        important: true
      })
    )
    .filter(Boolean);
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