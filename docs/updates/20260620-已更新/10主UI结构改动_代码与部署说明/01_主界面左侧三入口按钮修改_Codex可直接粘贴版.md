# 01_主界面左侧三入口按钮修改_Codex可直接粘贴版

```js
// mainLeftEntryConfig.js

export const MAIN_LEFT_ENTRY_BUTTONS = [
  {
    id: "main_entry_pilot",
    title: "战姬",
    subTitle: "PILOT",
    iconKey: "pilot",
    route: "pilot_panel",
    order: 1,
    visible: true,
    enabled: true
  },
  {
    id: "main_entry_fighter",
    title: "战机",
    subTitle: "FIGHTER",
    iconKey: "fighter",
    route: "hangar_panel",
    order: 2,
    visible: true,
    enabled: true
  },
  {
    id: "main_entry_fighter_upgrade",
    title: "战机升级",
    subTitle: "UPGRADE",
    iconKey: "upgrade",
    route: "upgrade_panel",
    order: 3,
    visible: true,
    enabled: true
  }
];

export const MAIN_LEFT_ENTRY_STYLE_CONFIG = {
  layout: "vertical",
  position: "left",
  buttonWidth: 390,
  buttonHeight: 130,
  gap: 16,

  panelBackground: "rgba(2, 22, 43, 0.78)",
  panelBorder: "1px solid rgba(45, 190, 255, 0.85)",
  panelRadius: 8,

  titleColor: "#ffffff",
  subTitleColor: "#b7e8ff",

  hoverGlow: "0 0 18px rgba(50, 190, 255, 0.35)",
  activeBorder: "1px solid #ffd565",
  activeGlow: "0 0 18px rgba(255, 213, 101, 0.32)"
};

export function getMainLeftEntryButtons() {
  return MAIN_LEFT_ENTRY_BUTTONS
    .filter((button) => button.visible)
    .sort((a, b) => a.order - b.order);
}

export function getMainLeftEntryButtonById(id) {
  return MAIN_LEFT_ENTRY_BUTTONS.find((button) => button.id === id) || null;
}

export function handleMainLeftEntryClick(buttonId, router) {
  const button = getMainLeftEntryButtonById(buttonId);

  if (!button || !button.enabled) {
    return {
      success: false,
      reason: "BUTTON_DISABLED_OR_NOT_FOUND"
    };
  }

  if (button.route === "pilot_panel") {
    router.openPilotPanel?.();
  }

  if (button.route === "hangar_panel") {
    router.openHangarPanel?.();
  }

  if (button.route === "upgrade_panel") {
    router.openUpgradePanel?.();
  }

  return {
    success: true,
    reason: "OK",
    route: button.route
  };
}
```

## 替换关系

```text
原：作战任务 / CHAPTER MAP
改：战姬 / PILOT

原：战机仓库 / HANGAR
改：战机 / FIGHTER

原：升级 / UPGRADE
改：战机升级 / UPGRADE
```

## 注意

```text
左侧这3个是主功能入口，不再放作战任务。
作战任务入口已经放到右侧六宫格里的“任务”。
```
