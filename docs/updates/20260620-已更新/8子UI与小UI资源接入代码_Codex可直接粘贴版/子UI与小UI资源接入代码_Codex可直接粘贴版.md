# 子UI与小UI资源接入代码_Codex可直接粘贴版

```js
// uiAssetInstall.mjs
// 作用：把当前已生成的9张UI参考图复制到项目资源目录。
// 这些图只作为“样式参考图”和“界面底稿参考图”，不要把图里的具体奖励、具体任务文案、具体排行榜数据写死到游戏逻辑里。

import fs from "fs";
import path from "path";

const PROJECT_ROOT = process.cwd();
const TARGET_ROOT = path.join(PROJECT_ROOT, "src/assets/ui_reference");

const UI_SOURCE_FILES = {
  task: "/mnt/data/ghostwriter_images/generated/a_dark_sci_fi_game_ui_screenshot_overall_scene_a_1.png",
  achievement: "/mnt/data/ghostwriter_images/generated/a_cinematic_sci_fi_game_ui_screenshot_overall_sce_2_batch_1.png",
  ranking: "/mnt/data/ghostwriter_images/generated/a_dark_sci_fi_game_ui_screenshot_with_a_large_semi_3_batch_2.png",
  hangar: "/mnt/data/ghostwriter_images/generated/a_dark_sci_fi_game_ui_screenshot_overall_scene_is_4_batch_3.png",
  pilot: "/mnt/data/ghostwriter_images/generated/a_wide_ui_screenshot_of_a_sci_fi_game_character_ro_5_batch_4.png",
  upgrade: "/mnt/data/ghostwriter_images/generated/a_polished_sci_fi_game_interface_screenshot_overa_6_batch_5.png",
  shop: "/mnt/data/ghostwriter_images/generated/a_widescreen_sci_fi_mobile_game_user_interface_sce_7_batch_6.png",
  friend: "/mnt/data/ghostwriter_images/generated/a_wide_screenshot_of_a_sci_fi_mobile_pc_game_ui_wi_8_batch_7.png",
  smallUiSheet: "/mnt/data/ghostwriter_images/generated/a_clean_white_background_image_of_a_game_ui_icon_a_9_batch_8.png"
};

const UI_TARGET_FILES = {
  task: "sub_ui/task_reference.png",
  achievement: "sub_ui/achievement_reference.png",
  ranking: "sub_ui/ranking_reference.png",
  hangar: "sub_ui/hangar_reference.png",
  pilot: "sub_ui/pilot_reference.png",
  upgrade: "sub_ui/upgrade_reference.png",
  shop: "sub_ui/shop_reference.png",
  friend: "sub_ui/friend_reference.png",
  smallUiSheet: "small_ui/small_ui_reference_sheet.png"
};

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function copyFileSafe(from, to) {
  ensureDir(path.dirname(to));
  fs.copyFileSync(from, to);
  console.log(`[ui-install] copied: ${from} -> ${to}`);
}

export function installUiReferenceAssets() {
  ensureDir(TARGET_ROOT);

  Object.keys(UI_SOURCE_FILES).forEach((key) => {
    const sourcePath = UI_SOURCE_FILES[key];
    const targetPath = path.join(TARGET_ROOT, UI_TARGET_FILES[key]);
    copyFileSafe(sourcePath, targetPath);
  });

  console.log("[ui-install] all ui reference assets installed.");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  installUiReferenceAssets();
}
```

```js
// uiAssetRegistry.js
// 作用：统一注册子UI参考图、小UI参考图、运行时主题令牌。
// 重点：运行时界面要走数据驱动，图只参考样式，不参考图中具体内容。

export const UI_REFERENCE_SCREENS = {
  task: {
    id: "task",
    title: "任务",
    referenceAsset: "/assets/ui_reference/sub_ui/task_reference.png",
    mountTarget: "task_panel",
    useMode: "style_reference_only"
  },
  achievement: {
    id: "achievement",
    title: "成就",
    referenceAsset: "/assets/ui_reference/sub_ui/achievement_reference.png",
    mountTarget: "achievement_panel",
    useMode: "style_reference_only"
  },
  ranking: {
    id: "ranking",
    title: "排行榜",
    referenceAsset: "/assets/ui_reference/sub_ui/ranking_reference.png",
    mountTarget: "ranking_panel",
    useMode: "style_reference_only"
  },
  hangar: {
    id: "hangar",
    title: "战机仓库",
    referenceAsset: "/assets/ui_reference/sub_ui/hangar_reference.png",
    mountTarget: "hangar_panel",
    useMode: "style_reference_only"
  },
  pilot: {
    id: "pilot",
    title: "战姬",
    referenceAsset: "/assets/ui_reference/sub_ui/pilot_reference.png",
    mountTarget: "pilot_panel",
    useMode: "style_reference_only"
  },
  upgrade: {
    id: "upgrade",
    title: "战机升级",
    referenceAsset: "/assets/ui_reference/sub_ui/upgrade_reference.png",
    mountTarget: "upgrade_panel",
    useMode: "style_reference_only"
  },
  shop: {
    id: "shop",
    title: "商店",
    referenceAsset: "/assets/ui_reference/sub_ui/shop_reference.png",
    mountTarget: "shop_panel",
    useMode: "style_reference_only"
  },
  friend: {
    id: "friend",
    title: "好友",
    referenceAsset: "/assets/ui_reference/sub_ui/friend_reference.png",
    mountTarget: "friend_panel",
    useMode: "style_reference_only"
  }
};

export const SMALL_UI_REFERENCE_SHEET = {
  id: "small_ui_sheet",
  referenceAsset: "/assets/ui_reference/small_ui/small_ui_reference_sheet.png",
  useMode: "style_reference_only"
};

export const UI_RUNTIME_THEME = {
  panel: {
    background: "rgba(5, 27, 55, 0.88)",
    borderColor: "#1ba7ff",
    borderGlow: "0 0 16px rgba(27,167,255,0.35)",
    borderRadius: "16px"
  },
  panelHeader: {
    titleColor: "#ffffff",
    subTitleColor: "#ffcf62",
    dividerColor: "rgba(52,180,255,0.45)"
  },
  tab: {
    normalBackground: "rgba(9, 35, 68, 0.85)",
    normalBorder: "#1a86d9",
    activeBackground: "linear-gradient(180deg, #f7d36f 0%, #a46a12 100%)",
    activeTextColor: "#ffffff",
    normalTextColor: "#d9f1ff"
  },
  listCard: {
    background: "rgba(7, 31, 62, 0.86)",
    border: "1px solid rgba(64, 186, 255, 0.65)",
    shadow: "0 0 12px rgba(37, 164, 255, 0.22)"
  },
  primaryButton: {
    background: "linear-gradient(180deg, #f4cc63 0%, #ad6d16 100%)",
    color: "#ffffff",
    glow: "0 0 14px rgba(255, 203, 88, 0.32)"
  },
  secondaryButton: {
    background: "rgba(10, 61, 110, 0.95)",
    border: "1px solid #36beff",
    color: "#e8f8ff",
    glow: "0 0 14px rgba(54, 190, 255, 0.25)"
  },
  progressBar: {
    rail: "rgba(17, 52, 88, 1)",
    fill: "linear-gradient(90deg, #39c1ff 0%, #72e6ff 100%)",
    valueColor: "#e7fbff"
  },
  text: {
    main: "#f2f9ff",
    sub: "#8fc9e8",
    gold: "#ffd364",
    success: "#62ff9d",
    warn: "#ffaf4b",
    disable: "#6e86a1"
  }
};

export const SMALL_UI_KEYS = {
  gold: "gold",
  diamond: "diamond",
  stamina: "stamina",
  crown3Color: "crown3Color",
  crown3Gold: "crown3Gold",
  star3Gold: "star3Gold",
  propEnergyCore: "propEnergyCore",
  propAdvancedComputer: "propAdvancedComputer",
  propWeaponModule: "propWeaponModule",
  extraGoldReward: "extraGoldReward",
  honorLv1: "honorLv1",
  honorLv2: "honorLv2",
  honorLv3: "honorLv3",
  honorLv4: "honorLv4",
  honorLv5: "honorLv5",
  honorLv6: "honorLv6",
  honorLv7: "honorLv7",
  honorLv8: "honorLv8",
  honorLv9: "honorLv9",
  honorLv10: "honorLv10",
  rarityS: "rarityS",
  rarityA: "rarityA",
  rarityB: "rarityB",
  notificationDot: "notificationDot",
  locked: "locked",
  mail: "mail",
  friend: "friend",
  shop: "shop",
  rewardChest: "rewardChest",
  warning: "warning",
  upgradeTicket: "upgradeTicket",
  iconCheck: "iconCheck",
  iconClose: "iconClose",
  iconMenu: "iconMenu",
  iconSetting: "iconSetting",
  barStamina: "barStamina",
  textGold: "textGold",
  textDiamond: "textDiamond",
  btnStartBattle: "btnStartBattle",
  btnClaim: "btnClaim"
};
```

```js
// subUiMountConfig.js
// 作用：定义8个子UI界面的挂载配置。
// 注意：只用图的风格，不要使用图里的固定奖励、固定排行、固定角色名、固定商品价格。

import { UI_REFERENCE_SCREENS, SMALL_UI_KEYS } from "./uiAssetRegistry.js";

export const SUB_UI_MOUNT_CONFIG = {
  task_panel: {
    key: "task",
    title: "任务",
    referenceAsset: UI_REFERENCE_SCREENS.task.referenceAsset,
    tabs: ["成长任务", "章节任务", "挑战任务"],
    renderer: "taskList",
    itemShape: {
      iconKey: SMALL_UI_KEYS.rarityS,
      title: "",
      desc: "",
      progressValue: 0,
      progressMax: 1,
      rewards: [],
      actionText: "领取"
    }
  },
  achievement_panel: {
    key: "achievement",
    title: "成就",
    referenceAsset: UI_REFERENCE_SCREENS.achievement.referenceAsset,
    tabs: ["通关", "完美", "收集", "强化", "挑战"],
    renderer: "achievementList",
    itemShape: {
      iconKey: SMALL_UI_KEYS.honorLv1,
      title: "",
      desc: "",
      progressValue: 0,
      progressMax: 1,
      rewards: [],
      statusText: "未完成"
    }
  },
  ranking_panel: {
    key: "ranking",
    title: "排行榜",
    referenceAsset: UI_REFERENCE_SCREENS.ranking.referenceAsset,
    tabs: ["全服", "好友"],
    renderer: "rankingList",
    itemShape: {
      rank: 0,
      avatar: "",
      name: "",
      chapterText: "",
      powerText: ""
    }
  },
  hangar_panel: {
    key: "hangar",
    title: "战机仓库",
    referenceAsset: UI_REFERENCE_SCREENS.hangar.referenceAsset,
    renderer: "fighterGallery",
    itemShape: {
      rarity: "B",
      icon: "",
      name: "",
      level: 1,
      power: 0,
      stats: {}
    }
  },
  pilot_panel: {
    key: "pilot",
    title: "战姬",
    referenceAsset: UI_REFERENCE_SCREENS.pilot.referenceAsset,
    renderer: "pilotGallery",
    itemShape: {
      rarity: "B",
      portrait: "",
      name: "",
      codeName: "",
      specialty: "",
      armorPenetration: "",
      role: "",
      skills: []
    }
  },
  upgrade_panel: {
    key: "upgrade",
    title: "战机升级",
    referenceAsset: UI_REFERENCE_SCREENS.upgrade.referenceAsset,
    renderer: "fighterUpgrade",
    itemShape: {
      fighterId: "",
      fighterName: "",
      levelCap: 30,
      totalLevel: 1,
      battlePower: 0,
      upgrades: {
        attack: { level: 1, currentText: "", nextText: "", cost: [] },
        penetration: { level: 1, currentText: "", nextText: "", cost: [] },
        hp: { level: 1, currentText: "", nextText: "", cost: [] }
      }
    }
  },
  shop_panel: {
    key: "shop",
    title: "商店",
    referenceAsset: UI_REFERENCE_SCREENS.shop.referenceAsset,
    tabs: ["飞行员", "战机", "礼包", "道具"],
    renderer: "shopGrid",
    itemShape: {
      rarity: "B",
      cover: "",
      name: "",
      desc: "",
      priceType: "gold",
      priceValue: 0,
      limitText: ""
    }
  },
  friend_panel: {
    key: "friend",
    title: "好友",
    referenceAsset: UI_REFERENCE_SCREENS.friend.referenceAsset,
    tabs: ["好友列表", "添加好友", "申请列表"],
    renderer: "friendList",
    itemShape: {
      avatar: "",
      name: "",
      level: 1,
      onlineText: "在线",
      chapterText: "",
      staminaGift: 10
    }
  }
};
```

```js
// smallUiRuntimeRegistry.js
// 作用：注册小UI图标的运行时键名。
// 这里不强制把参考图做成一整张精灵图直接上屏。
// 推荐做法：后续把 small_ui_reference_sheet.png 按键名切成独立小图，再填到 individualAssets。

import { SMALL_UI_REFERENCE_SHEET, SMALL_UI_KEYS } from "./uiAssetRegistry.js";

export const SMALL_UI_RUNTIME_REGISTRY = {
  referenceSheet: SMALL_UI_REFERENCE_SHEET.referenceAsset,
  individualAssets: {
    [SMALL_UI_KEYS.gold]: "/assets/ui_runtime/icons/gold.png",
    [SMALL_UI_KEYS.diamond]: "/assets/ui_runtime/icons/diamond.png",
    [SMALL_UI_KEYS.stamina]: "/assets/ui_runtime/icons/stamina.png",
    [SMALL_UI_KEYS.crown3Color]: "/assets/ui_runtime/icons/crown_3_color.png",
    [SMALL_UI_KEYS.crown3Gold]: "/assets/ui_runtime/icons/crown_3_gold.png",
    [SMALL_UI_KEYS.star3Gold]: "/assets/ui_runtime/icons/star_3_gold.png",
    [SMALL_UI_KEYS.propEnergyCore]: "/assets/ui_runtime/icons/prop_energy_core.png",
    [SMALL_UI_KEYS.propAdvancedComputer]: "/assets/ui_runtime/icons/prop_advanced_computer.png",
    [SMALL_UI_KEYS.propWeaponModule]: "/assets/ui_runtime/icons/prop_weapon_module.png",
    [SMALL_UI_KEYS.extraGoldReward]: "/assets/ui_runtime/icons/extra_gold_reward.png",
    [SMALL_UI_KEYS.honorLv1]: "/assets/ui_runtime/icons/honor_lv1.png",
    [SMALL_UI_KEYS.honorLv2]: "/assets/ui_runtime/icons/honor_lv2.png",
    [SMALL_UI_KEYS.honorLv3]: "/assets/ui_runtime/icons/honor_lv3.png",
    [SMALL_UI_KEYS.honorLv4]: "/assets/ui_runtime/icons/honor_lv4.png",
    [SMALL_UI_KEYS.honorLv5]: "/assets/ui_runtime/icons/honor_lv5.png",
    [SMALL_UI_KEYS.honorLv6]: "/assets/ui_runtime/icons/honor_lv6.png",
    [SMALL_UI_KEYS.honorLv7]: "/assets/ui_runtime/icons/honor_lv7.png",
    [SMALL_UI_KEYS.honorLv8]: "/assets/ui_runtime/icons/honor_lv8.png",
    [SMALL_UI_KEYS.honorLv9]: "/assets/ui_runtime/icons/honor_lv9.png",
    [SMALL_UI_KEYS.honorLv10]: "/assets/ui_runtime/icons/honor_lv10.png",
    [SMALL_UI_KEYS.rarityS]: "/assets/ui_runtime/icons/rarity_s.png",
    [SMALL_UI_KEYS.rarityA]: "/assets/ui_runtime/icons/rarity_a.png",
    [SMALL_UI_KEYS.rarityB]: "/assets/ui_runtime/icons/rarity_b.png",
    [SMALL_UI_KEYS.notificationDot]: "/assets/ui_runtime/icons/notification_dot.png",
    [SMALL_UI_KEYS.locked]: "/assets/ui_runtime/icons/locked.png",
    [SMALL_UI_KEYS.mail]: "/assets/ui_runtime/icons/mail.png",
    [SMALL_UI_KEYS.friend]: "/assets/ui_runtime/icons/friend.png",
    [SMALL_UI_KEYS.shop]: "/assets/ui_runtime/icons/shop.png",
    [SMALL_UI_KEYS.rewardChest]: "/assets/ui_runtime/icons/reward_chest.png",
    [SMALL_UI_KEYS.warning]: "/assets/ui_runtime/icons/warning.png",
    [SMALL_UI_KEYS.upgradeTicket]: "/assets/ui_runtime/icons/upgrade_ticket.png",
    [SMALL_UI_KEYS.iconCheck]: "/assets/ui_runtime/icons/icon_check.png",
    [SMALL_UI_KEYS.iconClose]: "/assets/ui_runtime/icons/icon_close.png",
    [SMALL_UI_KEYS.iconMenu]: "/assets/ui_runtime/icons/icon_menu.png",
    [SMALL_UI_KEYS.iconSetting]: "/assets/ui_runtime/icons/icon_setting.png",
    [SMALL_UI_KEYS.barStamina]: "/assets/ui_runtime/icons/bar_stamina.png",
    [SMALL_UI_KEYS.textGold]: "/assets/ui_runtime/icons/text_gold.png",
    [SMALL_UI_KEYS.textDiamond]: "/assets/ui_runtime/icons/text_diamond.png",
    [SMALL_UI_KEYS.btnStartBattle]: "/assets/ui_runtime/icons/btn_start_battle.png",
    [SMALL_UI_KEYS.btnClaim]: "/assets/ui_runtime/icons/btn_claim.png"
  }
};

export function getSmallUiAsset(key) {
  return SMALL_UI_RUNTIME_REGISTRY.individualAssets[key] || "";
}

export function getHonorMedalKey(level) {
  if (level <= 1) return SMALL_UI_KEYS.honorLv1;
  if (level === 2) return SMALL_UI_KEYS.honorLv2;
  if (level === 3) return SMALL_UI_KEYS.honorLv3;
  if (level === 4) return SMALL_UI_KEYS.honorLv4;
  if (level === 5) return SMALL_UI_KEYS.honorLv5;
  if (level === 6) return SMALL_UI_KEYS.honorLv6;
  if (level === 7) return SMALL_UI_KEYS.honorLv7;
  if (level === 8) return SMALL_UI_KEYS.honorLv8;
  if (level === 9) return SMALL_UI_KEYS.honorLv9;
  return SMALL_UI_KEYS.honorLv10;
}
```

```js
// uiStyleOnlyRules.js
// 作用：明确哪些内容可以参考图，哪些内容绝对不能参考图。

export const UI_STYLE_ONLY_RULES = {
  allowReference: [
    "整体配色",
    "描边发光",
    "面板层级",
    "按钮材质",
    "列表排布",
    "分页标签结构",
    "标题布局",
    "数值显示区位置",
    "图标视觉风格",
    "排行榜列布局",
    "仓库左右结构",
    "升级三栏结构",
    "商店九宫格结构",
    "好友列表+右侧信息栏结构"
  ],
  denyReference: [
    "任务图中的固定奖励数值",
    "任务图中的固定任务名称",
    "成就图中的固定成就条件",
    "排行榜图中的固定玩家名字",
    "排行榜图中的固定战力",
    "商店图中的固定价格",
    "战姬图中的固定角色名",
    "战机图中的固定属性",
    "好友图中的固定好友列表数据"
  ]
};
```

```js
// exampleUiMountUsage.js
// 作用：演示如何把子UI参考图接入到实际界面。

import {
  UI_REFERENCE_SCREENS,
  UI_RUNTIME_THEME
} from "./uiAssetRegistry.js";
import {
  SUB_UI_MOUNT_CONFIG
} from "./subUiMountConfig.js";
import {
  getSmallUiAsset,
  getHonorMedalKey
} from "./smallUiRuntimeRegistry.js";

export function getPanelReference(screenKey) {
  return UI_REFERENCE_SCREENS[screenKey]?.referenceAsset || "";
}

export function buildTaskUiViewModel(taskDataList) {
  return {
    panelKey: "task_panel",
    panelTitle: SUB_UI_MOUNT_CONFIG.task_panel.title,
    panelReference: getPanelReference("task"),
    theme: UI_RUNTIME_THEME,
    tabs: SUB_UI_MOUNT_CONFIG.task_panel.tabs,
    items: taskDataList.map((task) => ({
      iconKey: task.iconKey,
      iconAsset: getSmallUiAsset(task.iconKey),
      title: task.title,
      desc: task.desc,
      progressValue: task.progressValue,
      progressMax: task.progressMax,
      rewards: task.rewards.map((reward) => ({
        ...reward,
        iconAsset: getSmallUiAsset(reward.iconKey)
      })),
      actionText: task.canClaim ? "领取" : "前往"
    }))
  };
}

export function buildAchievementUiViewModel(achievementList) {
  return {
    panelKey: "achievement_panel",
    panelTitle: SUB_UI_MOUNT_CONFIG.achievement_panel.title,
    panelReference: getPanelReference("achievement"),
    theme: UI_RUNTIME_THEME,
    tabs: SUB_UI_MOUNT_CONFIG.achievement_panel.tabs,
    items: achievementList.map((item) => ({
      medalKey: getHonorMedalKey(item.honorLevel),
      medalAsset: getSmallUiAsset(getHonorMedalKey(item.honorLevel)),
      title: item.title,
      desc: item.desc,
      progressValue: item.progressValue,
      progressMax: item.progressMax,
      rewardTitle: item.rewardTitle,
      rewardFrame: item.rewardFrame,
      statusText: item.statusText
    }))
  };
}

export function buildShopUiViewModel(shopItems) {
  return {
    panelKey: "shop_panel",
    panelTitle: SUB_UI_MOUNT_CONFIG.shop_panel.title,
    panelReference: getPanelReference("shop"),
    theme: UI_RUNTIME_THEME,
    tabs: SUB_UI_MOUNT_CONFIG.shop_panel.tabs,
    items: shopItems.map((item) => ({
      rarity: item.rarity,
      cover: item.cover,
      name: item.name,
      desc: item.desc,
      priceType: item.priceType,
      priceValue: item.priceValue,
      priceIconAsset: item.priceType === "diamond"
        ? getSmallUiAsset("diamond")
        : getSmallUiAsset("gold"),
      limitText: item.limitText
    }))
  };
}
```

```js
// exampleRuntimeData.js
// 作用：演示运行时数据结构。
// 注意：这里的数据只是示例，不来自参考图本身。

export const demoTaskData = [
  {
    iconKey: "rarityS",
    title: "完成主线关卡 1-3",
    desc: "推进主线以解锁更多功能",
    progressValue: 1,
    progressMax: 1,
    canClaim: true,
    rewards: [
      { iconKey: "gold", amount: 5000 },
      { iconKey: "diamond", amount: 20 }
    ]
  }
];

export const demoAchievementData = [
  {
    honorLevel: 1,
    title: "初次胜利",
    desc: "首次完成任意主线关卡",
    progressValue: 1,
    progressMax: 1,
    rewardTitle: "新手指挥官",
    rewardFrame: "蓝色头像框",
    statusText: "可领取"
  }
];

export const demoShopData = [
  {
    rarity: "A",
    cover: "/assets/demo/shop_item_01.png",
    name: "标准强化包",
    desc: "用于基础成长",
    priceType: "gold",
    priceValue: 5000,
    limitText: "每周限购 1 次"
  }
];
```

## 建议执行顺序

```bash
node uiAssetInstall.mjs
```

然后在项目中引入：

```js
uiAssetRegistry.js
subUiMountConfig.js
smallUiRuntimeRegistry.js
uiStyleOnlyRules.js
exampleUiMountUsage.js
```
