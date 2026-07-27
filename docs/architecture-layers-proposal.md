# 热血战姬 · 分层与模块地图（大白话版）

> 目的：把现有 `src/h5` 的 7 个顶层目录，重新讲清楚——谁是地基、谁是大腿、谁只是打工的。
> 不改动任何代码，只给架构地图 + 当前需要清理的模糊边界。
> 解耦思想来源：Unity 架构师的"数据资产化 + 事件通道 + 单一职责"，已翻译成本项目能落地的规矩。

---

## 一、先记住三把"解耦钥匙"（核心规矩）

你现有架构已经暗含这三把钥匙，只是没点破：

| 钥匙 | 你工程里的对应物 | 大白话 | Unity 黑话对照 |
|------|----------------|--------|----------------|
| **门（动作门）** | `roomRegistry.dispatch("upgrade.click", payload)` | 玩家点一下、系统要干一件事 → 不直接调别家函数，喊一声动作名，注册表找真正干活的房间执行 | 别用 `GetComponent` 跨对象硬调，走事件通道 |
| **广播（语义事件）** | `eventBus.emit(events.WEAPON_FIRED)` | 内核发生了什么（开火/命中/技能触发）→ 喊一声事件名，关心的人（如音频）自己订阅。内核不知道谁在听 | `GameEvent` ScriptableObject 事件资产 |
| **数据资产化** | `Data/` 目录（数值、配置、存档结构） | 所有可调数值、文案、资源映射都放 Data 层；逻辑层只读，策划改平衡不用翻代码 | `ScriptableObject` 资产库 |

**一句话铁律**：
- 内核（Gameplay）**只说话、不动手**——通过门和广播对外，绝不自己 `playSound()`、自己改 DOM、自己写存档。
- 表现层（UI/Presentation）**只画、不决策**——收到事件就画，玩家点击就走门，绝不自己改数值。
- 谁要跨层要东西，一律走"门"或"广播"，**禁止** A 房间直接 `require`/调用 B 房间的内部函数。

---

## 二、五大层地图

```
外壳与入口 (Shell)
   └─ 只负责把页面跑起来，不管任何游戏逻辑
引擎内核 / 公共地基 (Engine Core)  ← 所有系统都依赖它，它不依赖任何业务
   └─ 门、广播、房间注册、存档读写、资源网关、视口
数据与配置 (Data & Config)
   └─ 全是数值和配置，没有逻辑、不引用任何界面
玩法内核 / 战斗与成长 (Gameplay Core)  ← 纯逻辑，零界面、零音频、零存档直连
   └─ 子弹怎么飞、伤害怎么算、BOSS 怎么出招、战机怎么升级
内容与世界 (World / Content)  ← "导演"，把内核组装成关卡/剧情/任务/结算
   └─ 编排，不自己写规则
表现层 (Presentation & UI)  ← 玩家看到的界面、听到的声音、加载的资源
   └─ 把内核状态和事件画出来、播声音、响应点击（点击→走门）
```

---

## 三、每层里有什么、各管啥（基于现有文件）

### 第 0 层 · 外壳与入口 `Shell/`
| 文件 | 管啥 |
|------|------|
| `index.html` / `game-frame.html` | 页面骨架、竖屏入口 |
| `shared-loader.js` | 按依赖顺序加载脚本（事件总线→事件清单→注册表→各房间→入口） |
| `style.css` / `viewport.css` | 全局样式与屏幕适配 |

**职责**：启动引擎、加载脚本、屏幕缩放。**不碰任何游戏逻辑。**

---

### 第 1 层 · 引擎内核 / 公共地基 `Game/`
所有系统都依赖它；它自己**不依赖任何业务代码**（这是地基的底线）。

| 子目录 | 管啥 |
|--------|------|
| `Game/Core` | 启动入口 `gameApp.boot`、运行时装配 `applicationRuntime`、主循环 `runtimeCore`/`game.js`、战斗流程编排 `battleFlowController`、演示模式 `demoMode` |
| `Game/EventBus` | `eventBus.js` 广播总线 + `events.js` 事件清单（目前 71 个事件常量，**唯一**事件名来源） |
| `Game/SceneManager` | `roomRegistry.js` 房间生命周期与动作门；`gameEventRouter.js` 把 DOM 点击转成同步 `dispatch` |
| `Game/Storage` | `profileRuntime` / `profileSession` 存档会话与档案运行时 |
| `Game/Gateway` | `localGateway` / `gameGateway` / `gatewayCoordinator` 本地与云存档网关 |
| `Game/Camera` | `gameViewportController` / `viewportHost` 战斗视口 |

**职责**：提供四种公共能力——**门（dispatch）、广播（emit）、房间注册、存档读写、资源网关**。
对应 Unity 的"全局服务 + ScriptableObject 事件通道"，但**没有单例滥用**（房间自己注册、自己卸载）。

---

### 第 2 层 · 数据与配置 `Data/`
**全是数值和配置，没有逻辑，不 `require` 任何界面文件。**

| 子目录 | 管啥 |
|--------|------|
| `Data/Balance` | 数值平衡：`balance.js`、`combatCodexConfig`、`rosterEconomy`（经济）、`sRankPriceConfig` |
| `Data/Config` | 文案与配置：`featurePanelContent`、`mainUiConfig`、`redeemCodeSystem`（兑换码）、`shopConfig`（商店）、`skillGradeConfig`、`testUnlockFlags` |
| `Data/SaveData` | 存档结构定义：`cloud-save`、`supabase-config` |

**职责**：所有可调数值、文案、资源映射、存档字段都放这。**改平衡不用翻代码。**

---

### 第 3 层 · 玩法内核 `Gameplay/`
**纯逻辑，零界面、零音频、零存档直连。** 这是项目的"规则发动机"。

| 子目录 | 管啥 |
|--------|------|
| `Gameplay/Combat` | 战斗规则：`battleRoom`/`battleRuntime`/`battleState`、`weaponSystem`、`collisionSystem`、`dropSystem`、`fxSystem`、`canvasRenderer`、`powerCalculator`、`settlementSystem`（算谁赢、拿啥）、`battleInput`/`battleGeometry` |
| `Gameplay/Enemy` | 敌人与 BOSS：`enemySystem`、`enemyAI`、`bossSystem`、`enemyStageBalance`、`battleRules` |
| `Gameplay/Ability` | 技能与 buff：`abilitySystem`、`activeSkillSystem`、`shipSkills`、各 BOSS 签名技能（重力井/相位盾/天锁束等） |
| `Gameplay/Fighter` | 战机成长：`fighterUpgradeApi`（对外唯一门面）、`combatStats`、`tacticalLoadoutSystem`、`Gallery` 图鉴 |
| `Gameplay/Player` | 玩家档案：`profile`、`profileController`、`profileRoom`、`commanderLevel`、飞行员图鉴 |
| `Gameplay/Collection` | 图鉴收集：`codex*` 系列 |
| `Gameplay/Progression` | 进度系统：`progressionSystem` |

**职责**：所有"规则"——子弹怎么飞、伤害怎么算、BOSS 怎么出招、战机怎么升级。
**对外只通过门和广播说话**，不知道谁在听、谁在画。

---

### 第 4 层 · 内容与世界 `World/`
**"导演"层**：把玩法内核组装成关卡、剧情、任务、结算。**调用内核的门，但不自己写规则。**

| 子目录 | 管啥 |
|--------|------|
| `World/Level` | 关卡编排：`levels`、`chapterMapSystem`、`stageHonorSystem` |
| `World/Story` | 剧情播放：`campaignStory*`、`battleStorySystem`、`battleSettlementSystem`、`stageStoryConfig`、`storyRoom` |
| `World/Mission` | 任务/成就/活动：`taskSystem`、`achievementSystem`、`activityRoom` |
| `World/Result` | 结算汇总页：`settlementController`、`settlementRoom` |
| `World/Difficulty` | 失败引导：`failGuideSystem` |

**职责**：关卡怎么排、剧情什么时候播、任务怎么推进、结算页怎么汇总。
**它是编排者，不是规则作者**——要算伤害去找 Combat，要播剧情去找 Story。

---

### 第 5 层 · 表现层 `UI/` + `Presentation/`
**玩家看到、听到的一切。** 只画、只播、只把点击转成门调用。

| 子目录 | 管啥 |
|--------|------|
| `UI/Lobby` | 大厅、`ResourceExchange` 资源兑换 |
| `UI/FeaturePanels` | 任务/成就/活动/商店/邮件/签到/设置 的**壳**（只路由）+ 各独立房间 |
| `UI/HUD` | 战斗 UI 控制器与视图、暂停、战斗结算视图 |
| `UI/ChapterSelect` | 章节选择 |
| `UI/Gacha` | 抽卡 |
| `UI/Inventory` | 背包 |
| `UI/Settings` / `UI/Sweep` / `UI/PauseMenu` | 设置 / 扫荡 / 暂停 |
| `Presentation/Audio` | `audioSystem` 音频（订阅语义事件播 SFX/BGM） |
| `Presentation/Assets` | `assets.js` 资源唯一入口、`runtimeTheme` 主题 |
| `Presentation/Endless` | 无尽模式表现 |

**职责**：把内核状态和事件"画"出来、播声音、响应点击（点击 → 走门 `dispatch`）。**绝不自己改数值、绝不自己算伤害。**

---

## 四、当前需要清理的"模糊边界"（审计发现）

你框架不清，主要就是这几处名字撞车、归属错位：

1. **`Gameplay/Player` 里混了视图**
   `pilotGalleryView.js` 是界面，不该待在玩法内核。→ 挪到 `UI/` 或 `Presentation/`。

2. **`Gameplay/Collection` 的 `codex*` 与图鉴视图混在一起**
   图鉴的"数据/逻辑"和"页面"应分开：逻辑留 Gameplay，页面去 UI/Presentation。

3. **三个都叫 settlement，职责没切清**（最容易出 bug 的地方）
   - `Gameplay/Combat/settlementSystem.js` → 算"谁赢了、拿到啥奖励"（规则）
   - `World/Result/settlementRoom.js` + `settlementController.js` → 做"汇总页的展示与流程"（导演）
   - `UI/HUD/battleSettlementView.js` → "把那个页面画出来"（表现）
   **守住这条线：Combat 算账、World 编排、UI 画页，谁都别抢谁的活。**

4. **图鉴视图散落**
   `Gameplay/Fighter/Gallery`、`Gameplay/Player/*Gallery`、Collection 的图鉴——建议统一到一个 `UI/Gallery` 或 `Presentation/Gallery`，内核只留数据。

5. **`UI/FeaturePanels` 是"万能壳"**
   里面塞了任务/成就/活动/商店/邮件/签到。每个**必须都是独立房间**（你现在已经是 room 了），壳**只做路由转发，别往壳里塞业务逻辑**。

6. **`Gameplay/Core/battleFlowController.js` 归属可疑**
   它管"战斗流程编排"，这其实是 World 层"导演"的活。建议审视：是留在 Core 当通用流程引擎，还是下沉到 World。

---

## 五、给你一句话总结每层定位

| 层 | 一句话 |
|----|--------|
| Shell | 把页面跑起来 |
| Engine Core | 提供门、广播、房间、存档、网关（地基，不依赖业务） |
| Data | 所有数值和配置（策划改这，不碰代码） |
| Gameplay | 规则发动机（只说话，不动手） |
| World | 导演（编排关卡/剧情/任务/结算，不写规则） |
| UI/Presentation | 画出来、播声音、把点击转成门（只画，不决策） |

**只要记住三把钥匙 + "内核只说话、表现只画画、跨层必走门或广播"，你这套架构就稳了。**
