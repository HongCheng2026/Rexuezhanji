# 战斗 UI 模块边界

## 决策

战斗页面固定分为顶部状态栏、中间 Canvas 战场、底部技能栏和暂停层。DOM 界面与逐帧战斗逻辑不得相互持有或直接修改。

## 文件职责

- `game.js`：只启动 `gameApp.boot()`。
- `app/gameApp.js`：创建模块并连接状态、输入和页面流程，不创建 HUD 节点，不实现技能。
- `app/battleUiController.js`：把战斗状态转换成 UI 数据，普通刷新最多每 100ms 一次。
- `ui/battleUiView.js`：一次创建顶部、Canvas、底部槽位，只更新 DOM。
- `ui/battlePauseView.js`：只创建和显示暂停层。
- `battle/battleGeometry.js`：唯一战场尺寸和活动边界来源。
- `battle/activeSkillSystem.js`：主动技能槽、手动/自动释放和技能生命周期。
- `battle/abilitySystem.js`：主动技能与决胜指令的统一对外入口。
- `battle/weaponSystem.js`：基础武器和玩家子弹。
- `app/gameEventRouter.js`：把点击、`1–4`、空格和 `P` 转成命令。

`battleHudView.js` 和 `battleHudView.css` 已被替代，不得恢复第二套 HUD。

## 新增技能流程

新增主动技能只允许：

1. 在 `src/shared/shipSkills.js` 增加技能配置。
2. 在 `battle/activeSkills/` 增加独立处理器并调用 `registerActiveSkillHandler()`。
3. 为已有通用槽位提供图标和说明。

新增局内技能只改配置和对应战斗系统。不得复制 HTML、增加专用槽位 CSS，也不得在 `gameApp.js` 增加技能 ID 判断。

## 固定约束

- 主动技能 4 槽，点击切换自动释放，数字键负责手动释放。
- 局内技能 6 槽，前三格显示基础武器实时等级，第 4 格为空，最后 2 格预留。
- 决胜指令独立于主动技能，空格释放。
- B/A/S 决胜指令上限为 2/3/4，开局 1 次，每 18 秒恢复 1 次。
- 战场系统不得写死设计宽高，必须读取 `battleGeometry`。
- 战斗 UI 样式必须位于 `battleUiView.css` 并以 `.battle-screen` 为根作用域。
- 禁止通过 `transform: scale()`、绝对定位覆盖战场、`!important` 或文件末尾追加覆盖修补布局。

## 合入检查

如果新增技能需要修改页面结构、`gameApp.js` 分支、槽位数量或复制一套 CSS，说明边界被破坏，应拒绝合入并回到配置与 `abilitySystem` 处理器方案。
