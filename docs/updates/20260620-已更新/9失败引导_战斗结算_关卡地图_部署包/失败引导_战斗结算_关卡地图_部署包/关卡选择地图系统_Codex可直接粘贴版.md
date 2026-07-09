# 关卡选择地图系统_Codex可直接粘贴版

```js
// chapterMapSystem.js

export const CHAPTER_MAP_STAGE_TYPE = {
  NORMAL: "normal",
  MECHANIC: "mechanic",
  BOSS: "boss"
};

export const CHAPTER_MAP_STAGE_STATUS = {
  LOCKED: "locked",
  CURRENT: "current",
  CLEARED: "cleared",
  AVAILABLE: "available"
};

export const CHAPTER_MAP_CONFIG = {
  prologueStageCount: 3,
  normalChapterCount: 9,
  stagesPerChapter: 10,
  bossStageIndex: 10,
  mechanicStageIndex: 5
};

export const CHAPTER_TITLE_CONFIG = {
  0: {
    title: "序章",
    subTitle: "苍穹启动"
  },
  1: {
    title: "第一章",
    subTitle: "城市外围夺回战"
  },
  2: {
    title: "第二章",
    subTitle: "重甲空域"
  },
  3: {
    title: "第三章",
    subTitle: "沦陷空港"
  },
  4: {
    title: "第四章",
    subTitle: "护盾量产线"
  },
  5: {
    title: "第五章",
    subTitle: "精英猎杀令"
  },
  6: {
    title: "第六章",
    subTitle: "主力舰队压境"
  },
  7: {
    title: "第七章",
    subTitle: "重甲核心防线"
  },
  8: {
    title: "第八章",
    subTitle: "反攻前线基地"
  },
  9: {
    title: "第九章",
    subTitle: "黑潮母舰决战"
  }
};

export function getStageId(chapterIndex, stageInChapter) {
  if (chapterIndex === 0) {
    return `prologue_${stageInChapter}`;
  }

  return `${chapterIndex}_${stageInChapter}`;
}

export function getPreviousStageId(chapterIndex, stageInChapter) {
  if (chapterIndex === 0 && stageInChapter === 1) {
    return null;
  }

  if (chapterIndex === 0) {
    return getStageId(0, stageInChapter - 1);
  }

  if (chapterIndex === 1 && stageInChapter === 1) {
    return getStageId(0, CHAPTER_MAP_CONFIG.prologueStageCount);
  }

  if (stageInChapter === 1) {
    return getStageId(chapterIndex - 1, CHAPTER_MAP_CONFIG.stagesPerChapter);
  }

  return getStageId(chapterIndex, stageInChapter - 1);
}

export function getNextStageId(chapterIndex, stageInChapter) {
  if (chapterIndex === 0) {
    if (stageInChapter < CHAPTER_MAP_CONFIG.prologueStageCount) {
      return getStageId(0, stageInChapter + 1);
    }

    return getStageId(1, 1);
  }

  if (stageInChapter < CHAPTER_MAP_CONFIG.stagesPerChapter) {
    return getStageId(chapterIndex, stageInChapter + 1);
  }

  if (chapterIndex < CHAPTER_MAP_CONFIG.normalChapterCount) {
    return getStageId(chapterIndex + 1, 1);
  }

  return null;
}

export function getStageType(chapterIndex, stageInChapter) {
  if (chapterIndex === 0) {
    return CHAPTER_MAP_STAGE_TYPE.NORMAL;
  }

  if (stageInChapter === CHAPTER_MAP_CONFIG.bossStageIndex) {
    return CHAPTER_MAP_STAGE_TYPE.BOSS;
  }

  if (stageInChapter === CHAPTER_MAP_CONFIG.mechanicStageIndex) {
    return CHAPTER_MAP_STAGE_TYPE.MECHANIC;
  }

  return CHAPTER_MAP_STAGE_TYPE.NORMAL;
}

export function isStageCleared(progress, stageId) {
  return (progress.clearedStageIds || []).includes(stageId);
}

export function isStageUnlocked(progress, chapterIndex, stageInChapter) {
  const previousStageId = getPreviousStageId(chapterIndex, stageInChapter);

  if (!previousStageId) {
    return true;
  }

  return isStageCleared(progress, previousStageId);
}

export function getStageStars(progress, stageId) {
  return (progress.stageStars || {})[stageId] || 0;
}

export function getStageStatus(progress, chapterIndex, stageInChapter) {
  const stageId = getStageId(chapterIndex, stageInChapter);

  if (isStageCleared(progress, stageId)) {
    return CHAPTER_MAP_STAGE_STATUS.CLEARED;
  }

  if (isStageUnlocked(progress, chapterIndex, stageInChapter)) {
    return CHAPTER_MAP_STAGE_STATUS.AVAILABLE;
  }

  return CHAPTER_MAP_STAGE_STATUS.LOCKED;
}

export function createStageNodeViewModel({
  progress,
  chapterIndex,
  stageInChapter
}) {
  const stageId = getStageId(chapterIndex, stageInChapter);
  const type = getStageType(chapterIndex, stageInChapter);
  const status = getStageStatus(progress, chapterIndex, stageInChapter);
  const stars = getStageStars(progress, stageId);

  return {
    stageId,
    chapterIndex,
    stageInChapter,
    type,
    status,
    stars,
    isLocked: status === CHAPTER_MAP_STAGE_STATUS.LOCKED,
    isCleared: status === CHAPTER_MAP_STAGE_STATUS.CLEARED,
    isBoss: type === CHAPTER_MAP_STAGE_TYPE.BOSS,
    isMechanic: type === CHAPTER_MAP_STAGE_TYPE.MECHANIC,
    label: chapterIndex === 0 ? `序-${stageInChapter}` : `${chapterIndex}-${stageInChapter}`,
    iconKey: getStageIconKey({ type, status, stars })
  };
}

export function getStageIconKey({ type, status, stars }) {
  if (status === CHAPTER_MAP_STAGE_STATUS.LOCKED) {
    return "locked";
  }

  if (type === CHAPTER_MAP_STAGE_TYPE.BOSS) {
    return stars >= 3 ? "boss_crown_3" : "boss";
  }

  if (type === CHAPTER_MAP_STAGE_TYPE.MECHANIC) {
    return stars >= 3 ? "mechanic_crown_3" : "mechanic";
  }

  if (stars >= 3) {
    return "stage_3_star";
  }

  if (stars > 0) {
    return `stage_${stars}_star`;
  }

  return "stage_available";
}

export function getChapterStageCount(chapterIndex) {
  if (chapterIndex === 0) {
    return CHAPTER_MAP_CONFIG.prologueStageCount;
  }

  return CHAPTER_MAP_CONFIG.stagesPerChapter;
}

export function createChapterMapViewModel({
  progress,
  chapterIndex
}) {
  const chapterInfo = CHAPTER_TITLE_CONFIG[chapterIndex];
  const stageCount = getChapterStageCount(chapterIndex);

  const stages = [];

  for (let stageInChapter = 1; stageInChapter <= stageCount; stageInChapter += 1) {
    stages.push(
      createStageNodeViewModel({
        progress,
        chapterIndex,
        stageInChapter
      })
    );
  }

  const clearedCount = stages.filter((stage) => stage.isCleared).length;
  const totalStars = stages.reduce((sum, stage) => sum + stage.stars, 0);
  const maxStars = stageCount * 3;

  return {
    chapterIndex,
    title: chapterInfo.title,
    subTitle: chapterInfo.subTitle,
    clearedCount,
    stageCount,
    totalStars,
    maxStars,
    stages,
    ui: {
      panelType: "chapter_map",
      showChapterTabs: true,
      showStarProgress: true,
      showBossMarker: true,
      showMechanicMarker: true
    }
  };
}

export function getCurrentRecommendedStage(progress) {
  for (let chapterIndex = 0; chapterIndex <= CHAPTER_MAP_CONFIG.normalChapterCount; chapterIndex += 1) {
    const stageCount = getChapterStageCount(chapterIndex);

    for (let stageInChapter = 1; stageInChapter <= stageCount; stageInChapter += 1) {
      const stageId = getStageId(chapterIndex, stageInChapter);

      if (!isStageCleared(progress, stageId) && isStageUnlocked(progress, chapterIndex, stageInChapter)) {
        return {
          stageId,
          chapterIndex,
          stageInChapter
        };
      }
    }
  }

  return null;
}

export function createFullChapterMapViewModel(progress) {
  const chapters = [];

  for (let chapterIndex = 0; chapterIndex <= CHAPTER_MAP_CONFIG.normalChapterCount; chapterIndex += 1) {
    chapters.push(
      createChapterMapViewModel({
        progress,
        chapterIndex
      })
    );
  }

  return {
    chapters,
    currentRecommendedStage: getCurrentRecommendedStage(progress)
  };
}
```

## UI规则

```text
序章3关。
第1-9章每章10关。
第5关显示机制关标记。
第10关显示BOSS标记。
已通关显示星级。
未解锁置灰。
当前可挑战关高亮。
```
