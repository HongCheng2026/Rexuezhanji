# 02_玩家头像名字铭牌荣誉等级模块_Codex可直接粘贴版

```js
// playerProfileHeaderConfig.js

export const PLAYER_PROFILE_HEADER_CONFIG = {
  containerId: "player_profile_header",
  defaultAvatarAsset: "/assets/ui/default_player_avatar.png",
  allowAvatarUpload: true,
  allowNameEdit: true,

  defaultName: "王牌飞行员",
  maxNameLength: 8,

  showLevel: true,
  showExp: true,
  showNameplate: true,
  showHonorLevel: true,

  honorButtonPosition: "right",
  honorButtonStyle: "gold_square",

  nameplateSource: "achievement_system",
  honorSource: "honor_medal_system"
};

export const DEFAULT_PLAYER_PROFILE = {
  playerId: "local_player",
  avatarAsset: "/assets/ui/default_player_avatar.png",
  uploadedAvatarDataUrl: "",
  name: "王牌飞行员",
  level: 1,
  exp: 0,
  nextExp: 100,
  equippedNameplateId: "nameplate_new_pilot",
  honorLevel: 1
};

export const NAMEPLATE_CONFIG = {
  nameplate_new_pilot: {
    id: "nameplate_new_pilot",
    name: "新星飞行员",
    rarity: "B",
    source: "初始默认",
    style: {
      background: "linear-gradient(90deg, rgba(40,130,190,0.8), rgba(10,40,80,0.75))",
      border: "1px solid rgba(100,210,255,0.85)",
      textColor: "#dff8ff"
    }
  },
  nameplate_galaxy_explorer: {
    id: "nameplate_galaxy_explorer",
    name: "银河探索者",
    rarity: "A",
    source: "成就解锁",
    style: {
      background: "linear-gradient(90deg, rgba(62,60,165,0.86), rgba(15,45,100,0.78))",
      border: "1px solid rgba(145,135,255,0.88)",
      textColor: "#eef0ff"
    }
  },
  nameplate_star_conqueror: {
    id: "nameplate_star_conqueror",
    name: "星际征服者",
    rarity: "S",
    source: "成就解锁",
    style: {
      background: "linear-gradient(90deg, rgba(160,98,22,0.92), rgba(40,28,8,0.82))",
      border: "1px solid rgba(255,211,98,0.95)",
      textColor: "#fff3c4"
    }
  },
  nameplate_black_tide_terminator: {
    id: "nameplate_black_tide_terminator",
    name: "黑潮终结者",
    rarity: "S",
    source: "通关第9章",
    style: {
      background: "linear-gradient(90deg, rgba(90,20,120,0.9), rgba(7,20,50,0.88))",
      border: "1px solid rgba(190,115,255,0.95)",
      textColor: "#f7e8ff"
    }
  }
};

export const HONOR_LEVEL_CONFIG = {
  1: { level: 1, iconKey: "honorLv1", text: "I" },
  2: { level: 2, iconKey: "honorLv2", text: "II" },
  3: { level: 3, iconKey: "honorLv3", text: "III" },
  4: { level: 4, iconKey: "honorLv4", text: "IV" },
  5: { level: 5, iconKey: "honorLv5", text: "V" },
  6: { level: 6, iconKey: "honorLv6", text: "VI" },
  7: { level: 7, iconKey: "honorLv7", text: "VII" },
  8: { level: 8, iconKey: "honorLv8", text: "VIII" },
  9: { level: 9, iconKey: "honorLv9", text: "IX" },
  10: { level: 10, iconKey: "honorLv10", text: "X" }
};

export function normalizePlayerName(name) {
  if (!name) {
    return PLAYER_PROFILE_HEADER_CONFIG.defaultName;
  }

  return String(name).trim().slice(0, PLAYER_PROFILE_HEADER_CONFIG.maxNameLength);
}

export function updatePlayerName(playerProfile, nextName) {
  return {
    ...playerProfile,
    name: normalizePlayerName(nextName)
  };
}

export function updatePlayerAvatar(playerProfile, uploadedAvatarDataUrl) {
  return {
    ...playerProfile,
    uploadedAvatarDataUrl: uploadedAvatarDataUrl || "",
    avatarAsset: uploadedAvatarDataUrl || PLAYER_PROFILE_HEADER_CONFIG.defaultAvatarAsset
  };
}

export function equipNameplate(playerProfile, nameplateId, unlockedNameplateIds = []) {
  if (!NAMEPLATE_CONFIG[nameplateId]) {
    return {
      success: false,
      reason: "NAMEPLATE_NOT_FOUND",
      playerProfile
    };
  }

  if (!unlockedNameplateIds.includes(nameplateId)) {
    return {
      success: false,
      reason: "NAMEPLATE_NOT_UNLOCKED",
      playerProfile
    };
  }

  return {
    success: true,
    reason: "OK",
    playerProfile: {
      ...playerProfile,
      equippedNameplateId: nameplateId
    }
  };
}

export function getHonorLevelConfig(honorLevel) {
  const safeLevel = Math.max(1, Math.min(10, honorLevel || 1));
  return HONOR_LEVEL_CONFIG[safeLevel];
}

export function getNameplateConfig(nameplateId) {
  return NAMEPLATE_CONFIG[nameplateId] || NAMEPLATE_CONFIG.nameplate_new_pilot;
}

export function createPlayerProfileHeaderViewModel(playerProfile) {
  const safeProfile = {
    ...DEFAULT_PLAYER_PROFILE,
    ...playerProfile
  };

  const nameplate = getNameplateConfig(safeProfile.equippedNameplateId);
  const honor = getHonorLevelConfig(safeProfile.honorLevel);

  return {
    containerId: PLAYER_PROFILE_HEADER_CONFIG.containerId,
    avatar: safeProfile.uploadedAvatarDataUrl || safeProfile.avatarAsset || PLAYER_PROFILE_HEADER_CONFIG.defaultAvatarAsset,
    name: normalizePlayerName(safeProfile.name),
    levelText: `Lv.${safeProfile.level}`,
    expText: `${safeProfile.exp}/${safeProfile.nextExp}`,
    expRate: safeProfile.nextExp > 0 ? safeProfile.exp / safeProfile.nextExp : 0,

    nameplate,
    honor,

    canEditName: PLAYER_PROFILE_HEADER_CONFIG.allowNameEdit,
    canUploadAvatar: PLAYER_PROFILE_HEADER_CONFIG.allowAvatarUpload
  };
}
```

## 改动目标

```text
头像：玩家自己上传。
名字：默认“王牌飞行员”，玩家可改。
名字铭牌：来自成就系统解锁，可装备。
右侧黄色按钮：改为荣誉等级，使用之前小UI里的荣誉勋章图标。
```

## UI表现

```text
头像在左。
名字在头像右侧。
名字下方显示等级和经验条。
名字后方或下方可以显示铭牌。
最右侧黄色方块显示荣誉等级图标，不再只是三条竖线。
```
