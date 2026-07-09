# 06_错误兜底系统_Codex可直接粘贴版

```js
// src/systems/errorFallbackSystem.js

export const FALLBACK_TYPE = {
  IMAGE: "image",
  AUDIO: "audio",
  SAVE: "save",
  CONFIG: "config",
  NETWORK: "network",
  UNKNOWN: "unknown"
};

export const FALLBACK_CONFIG = {
  defaultAvatar: "/assets/fallback/default_avatar.png",
  defaultPilotFull: "/assets/fallback/default_pilot_full.png",
  defaultFighterFull: "/assets/fallback/default_fighter_full.png",
  defaultImage: "/assets/fallback/fallback_image.png",
  defaultAudio: "/assets/fallback/fallback_audio.mp3",

  enableConsoleWarn: true,
  enableUserToast: true
};

export function createFallbackSystem(config = FALLBACK_CONFIG) {
  return {
    config,

    getFallbackImage(assetType) {
      if (assetType === "avatar") {
        return config.defaultAvatar;
      }

      if (assetType === "pilot") {
        return config.defaultPilotFull;
      }

      if (assetType === "fighter") {
        return config.defaultFighterFull;
      }

      return config.defaultImage;
    },

    getFallbackAudio() {
      return config.defaultAudio;
    },

    handleError({
      type = FALLBACK_TYPE.UNKNOWN,
      message = "",
      detail = null,
      userMessage = ""
    }) {
      const error = {
        type,
        message,
        detail,
        time: Date.now()
      };

      if (config.enableConsoleWarn) {
        console.warn("[fallback]", error);
      }

      if (config.enableUserToast && userMessage) {
        window.dispatchEvent(
          new CustomEvent("game_toast", {
            detail: {
              message: userMessage
            }
          })
        );
      }

      return error;
    }
  };
}

export function safeJsonParse(raw, fallbackValue) {
  try {
    return JSON.parse(raw);
  } catch (error) {
    return fallbackValue;
  }
}

export function repairSaveData(saveData) {
  const repaired = {
    player: {
      gold: 0,
      diamond: 0,
      stamina: 300,
      exp: 0,
      level: 1,
      ...(saveData?.player || {})
    },
    progress: {
      clearedStageIds: [],
      clearedChapterIds: [],
      stageStars: {},
      ...(saveData?.progress || {})
    },
    inventory: {
      items: {},
      ...(saveData?.inventory || {})
    },
    settings: {
      musicEnabled: true,
      sfxEnabled: true,
      quality: "medium",
      ...(saveData?.settings || {})
    }
  };

  if (!Array.isArray(repaired.progress.clearedStageIds)) {
    repaired.progress.clearedStageIds = [];
  }

  if (!Array.isArray(repaired.progress.clearedChapterIds)) {
    repaired.progress.clearedChapterIds = [];
  }

  if (!repaired.progress.stageStars || typeof repaired.progress.stageStars !== "object") {
    repaired.progress.stageStars = {};
  }

  return repaired;
}

export function withFallbackValue(fn, fallbackValue, onError = null) {
  try {
    return fn();
  } catch (error) {
    if (onError) {
      onError(error);
    }

    return fallbackValue;
  }
}

export async function withAsyncFallback(fn, fallbackValue, onError = null) {
  try {
    return await fn();
  } catch (error) {
    if (onError) {
      onError(error);
    }

    return fallbackValue;
  }
}

export function createFallbackViewModel({
  title = "加载失败",
  desc = "资源加载异常，请稍后重试。",
  actionText = "重试"
} = {}) {
  return {
    panelType: "fallback",
    title,
    desc,
    buttons: [
      {
        id: "retry",
        text: actionText
      }
    ]
  };
}
```

## 兜底规则

```text
头像丢失：默认头像
战姬图丢失：默认战姬图
战机图丢失：默认战机图
音效丢失：静音或默认音效
存档损坏：自动修复基础字段
网络失败：显示本地占位
配置缺失：使用默认配置
```
