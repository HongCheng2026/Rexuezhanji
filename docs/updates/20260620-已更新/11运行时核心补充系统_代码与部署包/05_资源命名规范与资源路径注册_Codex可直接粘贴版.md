# 05_资源命名规范与资源路径注册_Codex可直接粘贴版

```js
// src/systems/assetNamingSystem.js

export const ASSET_CATEGORY = {
  UI: "ui",
  ICON: "icon",
  PILOT: "pilot",
  FIGHTER: "fighter",
  ENEMY: "enemy",
  BOSS: "boss",
  AUDIO: "audio",
  FX: "fx",
  BG: "bg"
};

export const ASSET_NAMING_RULE = {
  ui: "ui_{module}_{name}",
  icon: "icon_{name}",
  pilotFull: "pilot_{pilotId}_full",
  pilotAvatar: "pilot_{pilotId}_avatar",
  fighterFull: "fighter_{fighterId}_full",
  fighterIcon: "fighter_{fighterId}_icon",
  enemy: "enemy_{enemyType}_{index}",
  boss: "boss_chapter_{chapterIndex}_{bossId}",
  audio: "audio_{module}_{name}",
  fx: "fx_{name}",
  bg: "bg_{sceneName}"
};

export const ASSET_PATH_RULE = {
  ui: "/assets/ui/{fileName}",
  icon: "/assets/icons/{fileName}",
  pilot: "/assets/pilots/{fileName}",
  fighter: "/assets/fighters/{fileName}",
  enemy: "/assets/enemies/{fileName}",
  boss: "/assets/bosses/{fileName}",
  audio: "/assets/audio/{fileName}",
  fx: "/assets/fx/{fileName}",
  bg: "/assets/backgrounds/{fileName}"
};

export function toSnakeCase(input) {
  return String(input)
    .trim()
    .replace(/[\s-]+/g, "_")
    .replace(/[^\w\u4e00-\u9fa5]/g, "")
    .toLowerCase();
}

export function createAssetFileName({
  category,
  name,
  ext = "png"
}) {
  const safeCategory = toSnakeCase(category);
  const safeName = toSnakeCase(name);
  return `${safeCategory}_${safeName}.${ext}`;
}

export function createPilotAssetNames(pilotId) {
  return {
    full: `pilot_${pilotId}_full.png`,
    avatar: `pilot_${pilotId}_avatar.png`,
    shop: `pilot_${pilotId}_shop.png`
  };
}

export function createFighterAssetNames(fighterId) {
  return {
    full: `fighter_${fighterId}_full.png`,
    icon: `fighter_${fighterId}_icon.png`,
    shop: `fighter_${fighterId}_shop.png`
  };
}

export function createBossAssetName(chapterIndex, bossId) {
  return `boss_chapter_${chapterIndex}_${bossId}.png`;
}

export function createUiAssetName(moduleName, assetName) {
  return `ui_${toSnakeCase(moduleName)}_${toSnakeCase(assetName)}.png`;
}

export function validateAssetName(fileName) {
  const invalidChars = /[\\s\\\\/:*?"<>|]/;

  if (invalidChars.test(fileName)) {
    return {
      valid: false,
      reason: "INVALID_CHAR"
    };
  }

  if (!fileName.includes(".")) {
    return {
      valid: false,
      reason: "MISSING_EXTENSION"
    };
  }

  return {
    valid: true,
    reason: "OK"
  };
}

export const REQUIRED_CORE_ASSETS = [
  "ui_main_bg.png",
  "ui_panel_task.png",
  "ui_panel_achievement.png",
  "ui_panel_hangar.png",
  "ui_panel_pilot.png",
  "ui_panel_upgrade.png",
  "ui_panel_shop.png",
  "ui_panel_friend.png",

  "icon_gold.png",
  "icon_diamond.png",
  "icon_stamina.png",
  "icon_reward_chest.png",
  "icon_warning.png",
  "icon_locked.png",

  "pilot_yelan_full.png",
  "pilot_yelan_avatar.png",

  "fighter_skywing_full.png",
  "fighter_skywing_icon.png"
];

export function createAssetRegistryItem({
  id,
  category,
  path,
  required = false
}) {
  return {
    id,
    category,
    path,
    required
  };
}
```

## 命名规则

```text
UI：ui_模块_名称.png
图标：icon_名称.png
战姬大图：pilot_角色id_full.png
战姬头像：pilot_角色id_avatar.png
战机大图：fighter_战机id_full.png
战机图标：fighter_战机id_icon.png
敌机：enemy_类型_编号.png
BOSS：boss_chapter_章节_bossid.png
音效：audio_模块_名称.mp3
```
