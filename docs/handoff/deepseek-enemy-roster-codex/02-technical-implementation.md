# 技术实现说明

## 目标数据流

```text
combatCodexConfig
  ├─ 80 个常规敌军定义
  ├─ 93 个 BOSS 定义
  └─ 93 份关卡出战表
          │
          ├─ enemyStageBalance：计算本关单位权重和最终属性
          ├─ enemySystem：按 unitId 生成、移动、攻击
          ├─ bossSystem：按 bossId 生成关卡 BOSS
          ├─ canvasRenderer：按单位美术元数据绘制
          ├─ chapterSelectView：展示本关真实敌情
          └─ featurePanelController：生成图鉴
```

核心原则：`enemyType` 继续表示底层数值/机制大类，`unitId` 表示玩家实际看到的兵种身份。不得删除 `enemyType` 后把现有平衡系统一次性推倒重写。

## 1. 新增共享资料模块

新增：

`src/shared/combatCodexConfig.js`

保持项目现有 IIFE 注册方式：

```js
(function registerCombatCodexConfig(root) {
  var scope = root.RXGame || (root.RXGame = {});
  // definitions...
  var api = { /* public API */ };
  scope.combatCodexConfig = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
```

不得引入 npm、ES module 构建或 TypeScript。

### 常规敌军字段

每个条目至少包含：

```js
{
  unitId: "mob-c01-01",
  name: "灰巷侦蜂",
  category: "mob",             // mob | fighter | elite
  chapterIndex: 1,
  slot: "M1",                  // M1-M3 | F1-F3 | E1-E2
  firstStageId: "1_1",
  baseType: "small",           // 兼容 ENEMY_TYPE_CONFIG
  motionProfile: {
    type: "edgeLane",
    speedScale: 1,
    amplitude: 0,
    frequency: 0
  },
  attackProfile: {
    type: "single",
    bulletPattern: "single",
    intervalScale: 1
  },
  supportProfile: null,
  statScale: {
    hp: 1,
    damage: 1,
    speed: 1,
    damageReduction: 0
  },
  art: {
    artStatus: "placeholder",
    expectedSrc: "enemies/battle/c01-mob-01.png",
    fallbackAssetId: "scout",
    drawWidth: 46,
    drawHeight: 58,
    drawAngle: -Math.PI / 2,
    hitRadiusX: 18,
    hitRadiusY: 21,
    offsetX: 0,
    offsetY: 0
  },
  codex: {
    attack: "贴近上下边缘侦察。",
    danger: "优先清理密集编队。"
  }
}
```

约束：

- `unitId`、`name`全局唯一。
- `category`与 ID 前缀一致。
- `baseType`必须能在 `ENEMY_TYPE_CONFIG` 中解析。
- 行为可复用 handler，但每个单位必须具有符合 `01-content-catalog.md` 的独立 profile 或参数组合。
- `statScale`只做单位差异；章节和关卡整体成长继续由现有平衡系统负责。
- `expectedSrc`是未来素材槽位，`artStatus`为 placeholder 时不能直接加载。

### BOSS 字段

```js
{
  bossId: "boss-c01-s01",
  stageId: "1_1",
  chapterIndex: 1,
  stageInChapter: 1,
  name: "外环哨塔·灰眼",
  formType: "hoverPlatform",
  theme: "urbanSiege",
  baseType: "boss",
  motionProfile: { type: "verticalPatrol", speedScale: 1 },
  phaseProfile: "aimed",
  cyclePatterns: ["boss_aim", "boss_spread"],
  guardUnitIds: ["fighter-c01-01", "mob-c01-01"],
  statScale: { hp: 1, damage: 1, speed: 1 },
  art: {
    artStatus: "placeholder",
    expectedSrc: "bosses/stages/boss-c01-s01.png",
    fallbackAssetId: "chapter-01",
    drawWidth: 210,
    drawHeight: 235,
    drawAngle: 0,
    hitRadiusX: 76,
    hitRadiusY: 96,
    offsetX: 0,
    offsetY: 0
  }
}
```

所有 BOSS：

- `bossId`、`stageId`一一对应。
- 名称按内容目录，不得用章节通用标题覆盖。
- 第 1–10 关的 `phaseProfile`依次表达瞄准、封路、交叉、冲锋、召唤、狙击、装甲、旋转、混合、终局；序章按目录单独配置。
- 允许现有弹幕函数作为组件，不要求为 93 个 BOSS 写 93 套重复函数。

### 关卡出战表字段

```js
{
  stageId: "1_1",
  chapterIndex: 1,
  stageInChapter: 1,
  mobs: ["mob-c01-01", "mob-c01-02"],
  fighters: ["fighter-c01-01"],
  elites: [],
  bossId: "boss-c01-s01",
  weights: {
    "mob-c01-01": 0.58,
    "mob-c01-02": 0.27,
    "fighter-c01-01": 0.15
  }
}
```

`weights`可以由数组和分类比例稳定生成，不要求手写 93 份数字；但最终权重必须满足：

- 只包含本关阵容中的 `unitId`。
- 数值总和归一化为 1。
- 本关列出的每个单位权重大于 0，保证实际能出现。
- 精英仍受阶段 `eliteChance`控制，但选中精英时只能从本关 `elites`中抽取。

## 2. 必须提供的公共接口

```js
getEnemyUnit(unitId)
getAllEnemyUnits()
getStageEnemyRoster(chapterIndex, stageInChapter)
getStageEnemyRosterById(stageId)
getStageBoss(chapterIndex, stageInChapter)
getStageBossById(stageId)
getChapterCodex(chapterIndex)
getPlayerShipName(shipId)
resolveEnemyArt(unitOrBoss, assetsConfig)
```

行为要求：

- 查询不到 ID 时返回 `null`，底层调用方决定安全回退；不要静默返回错误单位。
- 返回数组时使用副本，避免 UI 修改共享配置。
- `getPlayerShipName`运行时从 `RXGame.assets.SHIP_ASSETS`查找，不复制战机名称表。
- Node 测试环境中 `assets.js`已加载时同样可用。

## 3. 加载顺序

修改 `src/h5/shared-loader.js`：

- `combatCodexConfig.js`必须在 `enemyStageBalance.js`、战斗模块和 UI 控制器之前加载。
- 如果配置需要读取 `assets.SHIP_ASSETS`，函数调用时再取 `scope.assets`，避免加载时循环依赖。
- 在 `tests/controllerModules.test.js`或新增测试中断言加载顺序。

建议顺序：

```text
balance.js
levels.js
combatCodexConfig.js
enemyStageBalance.js
...
assets.js
...
enemySystem.js
bossSystem.js
featurePanelController.js
gameApp.js
```

如果实现选择让素材解析依赖 `assets.js`，可以把 `assets.js`提前，但必须核对其他模块依赖并补测试；不要为了省事制造全局未定义错误。

## 4. 改造敌军平衡与生成

### `src/shared/enemyStageBalance.js`

保留：

- `ENEMY_TYPE_CONFIG`
- 章节和关卡血量成长
- 子弹速度、开火压力、同时在场上限
- 现有阶段结构和基础弹幕组件

调整：

- `getStageEnemySpawnPlan`增加 `roster`和按 `unitId`生成的权重。
- 新增或扩展 `getEnemyFinalStats`，允许传入 `unitId`；先用其 `baseType`取得基础数值，再合并 `statScale`。
- 旧调用只传 `enemyType`时继续可用，避免一次性破坏其他模块。
- `getEnemyFireProfile`允许接收单位 `attackProfile`覆盖弹型、间隔或能否开火。

### `src/h5/battle/enemySystem.js`

生成流程改为：

1. 获取本关 roster。
2. 按当前阶段和分类压力选择 category。
3. 在该 category 的本关 `unitId`中按权重选择一个。
4. 通过 `unit.baseType`取得基础属性。
5. 合并单位 profile 和美术元数据。
6. 创建带 `unitId`、`displayName`、`category`的敌机对象。

敌机对象至少增加：

```js
unitId
displayName
category
motionProfile
attackProfile
supportProfile
drawWidth
drawHeight
drawAngle
hitRadiusX
hitRadiusY
artStatus
```

兼容保留：

```js
enemyType
radius
heavy
bulletPattern
image
```

### 行为处理方式

不要在 `updateEnemies`里堆 80 个名字判断。按 profile 类型分发：

```text
movement handlers
- straight / edgeLane / sine / diagonal / zigzag
- formation / laneSwap / feint / returnPass
- charge / orbit / blink / boundaryAmbush

attack handlers
- none / single / triple / aimed / cross
- slowWall / bombMine / sniper / rotating / split
- counterShot / gravityShot / patternCycle

support handlers
- shieldAlly / damageReductionAura
- healOrRepair / markTarget / summon
- formationCommand / splitOnDeath
```

同类 handler 通过参数产生差异。所有召唤、分裂、修复必须受现有场上敌机上限和子弹上限约束。

## 5. 改造 BOSS

### `src/h5/battle/bossSystem.js`

- `spawnBoss`先用当前章节和关卡取得 `bossDefinition`。
- `state.boss.id`使用 `bossId`，不要继续只用关卡序号拼临时 ID。
- `title`始终使用关卡 BOSS 名称，不再限制“第 10 关才使用 visual.title”。
- `visual`、尺寸、偏移、碰撞框和主题来自 BOSS 定义。
- `cyclePatterns`来自关卡 BOSS；现有 `BOSS_THEME_CONFIG`只作为弹幕组件或最后回退。
- 召唤护卫优先使用 BOSS 的 `guardUnitIds`，并确认它们属于当前关卡阵容。
- `state.bossIntro`、通知、血条和结算引用同一 `state.boss.title`。

### 阶段组合

正式章节使用以下基础阶段：

1. `aimed`
2. `lanes`
3. `cross`
4. `charge`
5. `summon`
6. `sniper`
7. `armorCounter`
8. `rotatingZone`
9. `mixedEscort`
10. `chapterFinale`

章节主题只改变组件组合和参数，不改变 BOSS 与关卡一一对应的事实。

## 6. 渲染和碰撞

修改 `src/h5/battle/canvasRenderer.js`：

- 常规敌机优先使用 `drawWidth`、`drawHeight`、`drawAngle`，旧 radius 公式作为回退。
- BOSS继续支持非旋转居中绘制，但角度必须来自配置。
- 预加载仅处理当前关卡 roster 和 BOSS，不遍历 173 个条目。
- 图片解析统一调用 `resolveEnemyArt`，placeholder 只加载 fallback。

碰撞系统如果只支持圆形：

- 常规敌机继续用兼容 `radius`。
- BOSS和大型精英优先增加椭圆碰撞判断；如果改动风险过大，本轮至少用 `min(hitRadiusX, hitRadiusY)`生成保守圆形，并在报告中列为技术债。
- 不允许碰撞框明显大于可见造型。

## 7. 图鉴和关卡详情

### `src/h5/app/featurePanelController.js`

当前直接读取 `assets.ENEMY_CODEX`的实现改为读取 `combatCodexConfig`。

图鉴结构：

```text
我方战机
敌军
  ├─ 序章至第九章章节筛选
  ├─ 本章兵种库：3 小怪 + 3 普通敌机 + 2 精英
  └─ 关卡筛选：显示本关完整阵容和专属 BOSS
敌弹（保留现有内容）
```

卡片至少显示：

- 名称
- 分类
- 首次出现
- 攻击特点
- 危险提示
- 当前真实图片或明确的占位图片

重复兵种只维护一张资料卡；关卡阵容引用同一资料卡。

### `src/h5/ui/mainFeaturePanelsView.css`

- 新样式必须挂在敌军图鉴页面级根类下。
- 不添加无作用域 `.card`、`.tab`等选择器。
- 处理 1600×900 基准和较窄窗口。

### `src/h5/ui/chapterSelectView.js`

- “主要敌军”不再只使用章节通用 `enemyFocus`。
- 读取当前关卡 roster，按“小怪 / 敌机 / 精英 / BOSS”显示真实名称。
- 没有精英的早期关卡显示“本关无精英单位”，不要伪造一个精英名字。

## 8. 我方战机名称同步

唯一来源：`src/shared/assets.js`中的 `SHIP_ASSETS`。

需要全仓搜索以下 9 个正式名和代号：

```text
苍穹零式 / 星链
黑曜幽影 / 暗核
金矢裁决 / 金矢
白昼指挥 / 白昼
银翼06 / 银翼
赤枪03 / 赤枪
蓝隼01 / 蓝隼
绿堡04 / 绿堡
紫影05 / 紫影
```

处理规则：

- 如果字符串表示具体战机名称，用 `shipId`查询。
- 如果字符串是任务标题、商品名称或剧情称号，判断其是否真的需要随战机改名；只有表示机体本身时才替换。
- 星穹之翼卡池中的“苍穹零式”必须从 `ship-s-09`查询。
- 不修改存档里的 `shipId`。

## 9. 失败与回退

- 未知 `stageId`：沿用现有关卡基础配置，记录一次开发警告，不崩溃。
- 未知 `unitId`：该次生成跳过并记录警告，不能随机生成阵容外单位。
- roster 中某分类为空：权重计算跳过该分类。
- placeholder：只返回存在的 fallback 图片。
- 最终图片加载失败：图片对象 `onerror`切换到 fallback，避免永久空白。
- 图鉴配置异常：显示“资料暂缺”，敌弹图鉴仍可打开。

## 10. 性能与兼容

- 不能在每帧遍历 80 个单位定义；模块加载时建立 ID 索引。
- 不能在每次生成敌机时重新构建整章 roster。
- 当前关卡开始时缓存 resolved roster。
- 图鉴切换章节时再生成该章卡片。
- 不新增存档字段，不改云端接口，不改 Supabase。
- 不手改 `release/`或小程序镜像。
