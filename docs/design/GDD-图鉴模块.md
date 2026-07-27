# GDD: 星海档案 — 图鉴收集模块

> **版本**: 2.0  
> **日期**: 2026-07-20  
> **作者**: GameDesigner  
> **状态**: 设计阶段 — 待评审  

---

## v2.0 变更摘要

| 变更项 | v1.0 | v2.0 |
|--------|------|------|
| 攻击加成方式 | 百分比 (+31.5%) | **固定数值 (+67)** |
| HP 加成 | 百分比 (+34.5%) | **取消，无 HP 加成** |
| 破甲加成来源 | 多来源分散 | **仅 S 级战机 (1/2/3→+0.01/0.025/0.05)** |
| 移速加成 | +5 | **取消** |
| 武器伤害倍率 | +5% | **取消** |
| 金币加成 | +10% | 保留不变 |

---

## 1. 设计支柱 (Design Pillars)

| # | 支柱 | 含义 | 每次设计决策都问 |
|---|------|------|-------------------|
| P1 | **收集即成长** | 每获得一个新单位，玩家攻击力直接增加 | 这个数值对玩家来说"看得见"吗？ |
| P2 | **渐进式正反馈** | 从小额 per-unit +1 到大里程碑的爆发式奖励 | 玩家在每个阶段都有"下一个目标"吗？ |
| P3 | **独立可拆卸** | 模块移除后其他系统零影响 | 如果 codex 房间被删除，战斗会崩吗？ |

---

## 2. 核心玩法循环

```
┌──────────────────────────────────────────┐
│  获取新单位（购买 / 抽卡 / 初始赠送）      │
│         ↓                                │
│  profile.owned 更新 → codex 自动检测       │
│         ↓                                │
│  触发 CODEX_ENTRY_UNLOCKED 事件            │
│         ↓                                │
│  计算并应用新加成 → generateBattleLoadout() │
│         ↓                                │
│  检查里程碑/套装 → CODEX_MILESTONE_REACHED  │
│         ↓                                │
│  UI 反馈: 图鉴面板解锁动画 / 攻击力跳动      │
│         ↓                                │
│  玩家感知战力提升 → 继续收集下一个           │
└──────────────────────────────────────────┘
```

### 2.1 触发时机

- **自动触发**: 任何渠道获得新战姬/战机时，codex 系统自动检测 `profile.owned` 变化
- **被动计算**: 不维护独立"已解锁"列表，从 `profile.owned.pilots[]` 和 `profile.owned.ships[]` 实时计算
- **零玩家操作**: 图鉴解锁与加成计算全自动

---

## 3. 数值加成体系 (Bonus System) — v2.0

### 3.1 设计总则

- **全固定数值** — 攻击加成为整数，每一步清晰可算
- **无 HP 加成** — 图鉴不改变生存能力
- **破甲仅来自 S 战机收集** — 1/2/3 架 S 战机 → 逐级解锁
- **无移速、无武器倍率** — 图鉴只影响攻击和破甲两维

### 3.2 战姬图鉴 (Pilot Codex) — 11 条

#### Per-Unit 加成

| 条件 | 属性 | 加成 |
|------|------|------|
| 每拥有 1 名战姬 | 攻击力 | **+1** |

#### 里程碑加成

| 条件 | 属性 | 加成 | ID |
|------|------|------|-----|
| 3 名战姬 | 攻击力 | +2 | pilot_3 |
| 6 名战姬 | 攻击力 | +3 | pilot_6 |
| 9 名战姬 | 攻击力 | +4 | pilot_9 |
| **11 名 (全收集)** | 攻击力 | **+5** | pilot_11 |

#### 稀有度套装

| 套装 | 条件 | 加成 |
|------|------|------|
| B 级全集 | 拥有全部 4 名 B 级战姬 | +1 攻击 |
| A 级全集 | 拥有全部 3 名 A 级战姬 | +2 攻击 |
| S 级全集 | 拥有全部 3 名 S 级战姬 | +4 攻击 |

> SS 仅 1 名，无独立套装。计入总数参与 per-unit 和里程碑计算。

### 3.3 战机图鉴 (Ship Codex) — 9 条

#### Per-Unit 加成

| 条件 | 属性 | 加成 |
|------|------|------|
| 每拥有 1 架战机 | 攻击力 | **+1** |

#### 里程碑加成

| 条件 | 属性 | 加成 | ID |
|------|------|------|-----|
| 3 架战机 | 攻击力 | +2 | ship_3 |
| 5 架战机 | 攻击力 | +3 | ship_5 |
| 7 架战机 | 攻击力 | +4 | ship_7 |
| **9 架 (全收集)** | 攻击力 | **+5** | ship_9 |

#### S 级战机破甲加成

> 这是**唯一的破甲来源**，仅与拥有的 S 级战机数量挂钩。

| 条件 | 破甲率 | ID |
|------|--------|-----|
| 拥有 1 架 S 级战机 | +0.01 | s_ship_pen_1 |
| 拥有 2 架 S 级战机 | +0.025 | s_ship_pen_2 |
| 拥有 3 架 S 级战机 | **+0.05** | s_ship_pen_3 |

> S 级战机共 3 架（苍穹零式 / 黑曜幽影 / 金矢裁决）。

#### 稀有度套装

| 套装 | 条件 | 加成 |
|------|------|------|
| B 级全集 | 拥有全部 3 架 B 级战机 | +1 攻击 |
| A 级全集 | 拥有全部 3 架 A 级战机 | +2 攻击 |
| S 级全集 | 拥有全部 3 架 S 级战机 | +4 攻击 |

### 3.4 联合图鉴 (Combined Codex) — 20 条总计

| 条件 | 属性 | 加成 |
|------|------|------|
| 总计 10 条 | 金币加成 | +5% |
| 总计 15 条 | 金币加成 | +5% (累计 +10%) |
| **总计 20 条 (全收集)** | 攻击力 | **+5** |

### 3.5 全收集上限总览

| 属性 | 最大加成 | 来源分解 |
|------|---------|---------|
| **攻击力** | **+67** | per-unit: 11+9=20, 里程碑: 14+14=28, 套装: 7+7=14, 联合20: +5 |
| **破甲率** | **+0.05** | 仅 S 级战机 (3架) |
| **金币加成** | **+10%** | 联合 10+15 条 |

**战力贡献**: 全收集时攻击力 219→286 (+30.6%), 战力 +670（攻击）+180（破甲）= +850

---

## 4. 平衡性分析 (Balance Analysis)

### 4.1 各阶段攻击力增长

| 阶段 | 收集数 | 典型出战攻击 | 图鉴加成 | 加成比例 | 感知 |
|------|--------|------------|---------|---------|------|
| 初始 | 1p+1s | 40 | **+2** | 5.0% | 微弱，不影响新手关基线 |
| B 套完成 | 4p+3s | 80 | **+13** | 16.3% | 可感知，约等于多一级武器 |
| AB 套完成 | 7p+6s | 120 | **+29** | 24.2% | 明显，成为战力重要组成 |
| ABS 套+1S船 | 10p+6s | 160 | **+44** | 27.5% | 显著，驱动 S 级收集 |
| 全 S 套+3S船 | 10p+9s | 200 | **+56** | 28.0% | S 破甲满，接近毕业 |
| 全收集 | 11p+9s | 219 | **+67** | 30.6% | 终极奖励，长期目标 |

> 以上为按金币成本最优路径（B→A→S→SS）的典型值。实际加成取决于玩家收集顺序。

### 4.2 破甲率增长曲线

| S 战机数 | 破甲加成 | 累计总破甲 (全 S 出战) | 感知 |
|---------|---------|---------------------|------|
| 0 | 0 | 0.20 (S pilot + S ship) | — |
| 1 | +0.01 | 0.21 | 微小 |
| 2 | +0.025 | 0.225 | 可感知 |
| 3 | +0.05 | 0.25 | 显著突破 |

> 破甲加成定位为**后期差异化奖励**——只有投入重金收集全部 S 级战机的玩家才能解锁完整的 +0.05。

### 4.3 经济成本估算

| 收集路径 | 金币成本 |
|---------|---------|
| 全部 B 级 (4p+3s) | ~270,000 |
| 全部 A 级 (3p+3s) | ~810,000 |
| 全部 S 级 (3p+3s) | ~6,600,000 |
| SS 级 (1p+1s) | 抽卡限定 |
| **总计 (不含 SS)** | **~7,680,000** |

### 4.4 玩家行为预期

| 玩家类型 | 收集深度 | 预期攻击加成 | 关键驱动 |
|---------|---------|------------|---------|
| 轻度 F2P | B+A 级 | +20~25 | per-unit +1 让每个单位都有回报 |
| 中度玩家 | 冲击 S 级 | +35~50 | S 套装 +4 + 破甲解锁 |
| 重度 whale | 全 20 条 | +67 + 0.05 破甲 | 全收集 +5 + 三 S 破甲满 |

---

## 5. 技术集成方案

### 5.1 架构约束

- 图鉴模块 = 独立房间 `codex`
- Gameplay 内核不直接调用 codex
- 跨域通知通过 `eventBus.emit()`

### 5.2 新增文件

```
src/h5/Gameplay/Collection/          # 图鉴模块
├── codexSystem.js                   # 核心逻辑
├── codexRoom.js                     # 房间: UI 交互
├── codexView.js                     # 视图: 图鉴面板
└── codexConfig.js                   # 里程碑/套装判定

src/h5/Data/Balance/
└── codexBalance.js                  # 数值常量
```

### 5.3 修改现有文件

| 文件 | 改动 |
|------|------|
| `combatStats.js` | `generateBattleLoadout()` 调用 `codexSystem.calculateBonus()` 后应用到 `finalStats.attack` 和 `armorPenetration` |
| `powerCalculator.js` | `calculateActivePower()` 自动包含 codex 加成 |
| `profile.js` | `normalizeProfile()` 增加 `profile.codex` 兼容字段 |
| `events.js` | 新增 4 个 codex 事件 |

### 5.4 数据流

```
profile.owned.pilots[] ──┐
                         ├──→ codexSystem.calculateBonus() ──→ { attackFlat, armorPenFlat, coinMult }
profile.owned.ships[]  ──┘                                        │
                                                                  ↓
                                            generateBattleLoadout() 应用
                                              attack += codexBonus.attackFlat
                                              armorPen += codexBonus.armorPenFlat
                                              coinBonus += codexBonus.coinMult
```

### 5.5 Bonus 数据结构 (v2.0)

```javascript
// codexSystem.calculateBonus(profile) 返回:
{
  attackFlat: 67,              // 固定攻击力加成
  armorPenetrationFlat: 0.05,  // S 战机破甲加成
  coinBonusMultiplier: 0.10,   // 金币倍率

  // 元数据 (供 UI)
  totalPilots: 11,
  totalShips: 9,
  totalEntries: 20,
  sRankShipCount: 3,
  unlockedMilestones: ["pilot_3","pilot_6","ship_3","ship_5",...],
  unlockedSets: ["pilot_B","pilot_A","ship_B","ship_A",...],
  isFullCollection: true
}
```

### 5.6 combatStats.js 集成点

```javascript
// 在 finalStats 计算段末尾：
if (codexBonus) {
  attack = Math.round(attack + (codexBonus.attackFlat || 0));
  totalArmorPenetration = totalArmorPenetration + (codexBonus.armorPenetrationFlat || 0);
  coinBonus = coinBonus + (codexBonus.coinBonusMultiplier || 0);
}
```

### 5.7 事件定义

```javascript
CODEX_ENTRY_UNLOCKED:    "codex:entry_unlocked",     // { type, id, rank, name }
CODEX_MILESTONE_REACHED: "codex:milestone_reached",  // { milestoneId, bonus }
CODEX_SET_COMPLETED:     "codex:set_completed",       // { setId, setType, rank }
CODEX_FULL_COLLECTION:   "codex:full_collection"      // { totalEntries }
```

---

## 6. 房间规格 (Room Specification)

### codexRoom

```
Purpose: 图鉴收集系统 — 管理图鉴解锁、加成计算、UI 交互
Player Fantasy: "每收集一个战姬/战机，我的攻击力就 +1"
Dependencies: profile.owned, combatStats, eventBus
可删除性: 删除后战斗退化到无 codex 加成状态，不影响核心循环

Actions:
  codex.open          — 打开图鉴面板
  codex.close         — 关闭图鉴面板
  codex.navigate      — 面板内导航（战姬 / 战机 / 总览）
  codex.selectEntry   — 选中条目查看详情

发射事件:
  CODEX_ENTRY_UNLOCKED    — 新单位加入时
  CODEX_MILESTONE_REACHED — 达成里程碑时
  CODEX_SET_COMPLETED     — 完成稀有度套装时
  CODEX_FULL_COLLECTION   — 全收集达成时（仅一次）
```

### 图鉴面板 UI

```
┌────────────────────────────────────┐
│  [战姬图鉴] [战机图鉴] [总览加成]    │
├────────────────────────────────────┤
│   ┌──────┐  ┌──────┐  ┌──────┐   │
│   │ 已解锁 │  │ 已解锁 │  │  ???  │   │
│   │ 头像  │  │ 头像  │  │ 黑影  │   │
│   │ ★★☆ │  │ ★★★ │  │ ??? │   │
│   └──────┘  └──────┘  └──────┘   │
│                                    │
│  进度: ████████░░  8/11 战姬       │
│  里程碑: [3✓] [6→] [9  ] [11  ]   │
│  套装: [B✓] [A✓] [S  ]            │
│                                    │
│  当前加成: 攻击 +12 | 破甲 +0.01   │
└────────────────────────────────────┘
```

---

## 7. 玩家引导流程 (Onboarding Flow)

### 7.1 首次图鉴解锁
- 初始默认拥有林知寒 + 蓝隼01 → 自动 2 条已解锁
- 不弹出主动引导 → 仅图鉴入口红点 "2/20"

### 7.2 首次主动打开
- 显示"收集进度 2/20"，当前加成: 攻击 +2
- "下一个里程碑: 收集 3 名战姬 → 攻击 +2"

### 7.3 里程碑达成
- 事件 → 大厅横幅: "战姬集结 · 攻击 +2 已解锁！"
- 攻击力数字跳动动画

### Onboarding Checklist
- [x] 默认单位自动计入
- [x] 首次打开显示进度和下一个目标
- [x] 里程碑达成视觉+音频反馈
- [x] 加成变化时战力刷新动画
- [ ] [PLACEHOLDER] 新手是否强制引导打开图鉴 — 建议不强制

---

## 8. 边界情况与失败状态

| 边界情况 | 处理方式 |
|---------|---------|
| `profile.owned` 为 null/undefined | 返回 `{ attackFlat: 0, armorPenetrationFlat: 0, coinBonusMultiplier: 0 }` |
| owned 包含无效 ID | 仅存在于 PILOT_ASSETS/SHIP_ASSETS 中的 ID 参与计算 |
| 存档 migration 缺失 owned | normalizeProfile 确保至少包含默认单位 |
| 全单位被移除 | 至少保留默认 2 条，per-unit 保底 |
| 多次调用 calculateBonus | 纯函数，幂等 |
| 测试解锁标志开启 | 自然获得全加成 |
| codexSystem 未注册 | combatStats 优雅降级 |

---

## 9. 配置数据 (Configuration)

### 9.1 Per-Unit 基础加成

```javascript
const PER_UNIT_BONUS = {
  pilot: { attackFlat: 1 },
  ship:  { attackFlat: 1 }
};
```

### 9.2 战姬里程碑

```javascript
const PILOT_MILESTONES = [
  { count: 3,  id: "pilot_3",  bonus: { attackFlat: 2 } },
  { count: 6,  id: "pilot_6",  bonus: { attackFlat: 3 } },
  { count: 9,  id: "pilot_9",  bonus: { attackFlat: 4 } },
  { count: 11, id: "pilot_11", bonus: { attackFlat: 5 } }
];
```

### 9.3 战机里程碑

```javascript
const SHIP_MILESTONES = [
  { count: 3, id: "ship_3", bonus: { attackFlat: 2 } },
  { count: 5, id: "ship_5", bonus: { attackFlat: 3 } },
  { count: 7, id: "ship_7", bonus: { attackFlat: 4 } },
  { count: 9, id: "ship_9", bonus: { attackFlat: 5 } }
];
```

### 9.4 S 级战机破甲

```javascript
const S_RANK_SHIP_PENETRATION = [
  { count: 1, bonus: { armorPenetrationFlat: 0.01 } },
  { count: 2, bonus: { armorPenetrationFlat: 0.025 } },
  { count: 3, bonus: { armorPenetrationFlat: 0.05 } }
];
```

### 9.5 稀有度套装

```javascript
const PILOT_SET_BONUSES = {
  B: { rank: "B", countRequired: 4, bonus: { attackFlat: 1 } },
  A: { rank: "A", countRequired: 3, bonus: { attackFlat: 2 } },
  S: { rank: "S", countRequired: 3, bonus: { attackFlat: 4 } }
};

const SHIP_SET_BONUSES = {
  B: { rank: "B", countRequired: 3, bonus: { attackFlat: 1 } },
  A: { rank: "A", countRequired: 3, bonus: { attackFlat: 2 } },
  S: { rank: "S", countRequired: 3, bonus: { attackFlat: 4 } }
};
```

### 9.6 联合里程碑

```javascript
const COMBINED_MILESTONES = [
  { count: 10, id: "combined_10", bonus: { coinBonusMultiplier: 0.05 } },
  { count: 15, id: "combined_15", bonus: { coinBonusMultiplier: 0.05 } },
  { count: 20, id: "combined_20", bonus: { attackFlat: 5 } }
];
```

---

## 10. 测试计划

### 10.1 功能测试

| 测试用例 | 通过标准 |
|---------|---------|
| 默认单位计入 | 新 profile 创建后，图鉴显示 1p+1s，攻击 +2 |
| 购买新单位 | 购买战姬后攻击 +1 |
| 里程碑触发 | 第 3 名战姬加入，额外攻击 +2 |
| 套装触发 | 全 4 名 B 战姬，额外攻击 +1 |
| S 破甲触发 | 第 1/2/3 架 S 战机分别 +0.01/0.025/0.05 |
| 全收集触发 | 20/20 时攻击 +5 |
| codex 房间卸载 | 战斗正常运行（无加成） |

### 10.2 数值测试

| 测试用例 | 通过标准 |
|---------|---------|
| 全收集攻击 | 恰好 +67 |
| 全收集破甲 | 恰好 +0.05 |
| 加成与强化叠加 | 固定值直接加到 attack 上 |
| 战力包含 codex | calculateActivePower 结果包含 codex 加成 |

### 10.3 边界测试

| 测试用例 | 通过标准 |
|---------|---------|
| owned 为空 | 零加成，不报错 |
| 无效 ID | 过滤后正常计算 |
| 多次调用 | 幂等 |
| codexSystem 未注册 | 优雅降级 |

---

## 11. 版本记录

| 版本 | 日期 | 变更内容 |
|------|------|---------|
| 1.0 | 2026-07-20 | 初版：百分比加成体系，含 HP/攻击/破甲/移速/武器倍率 |
| **2.0** | **2026-07-20** | **重构：全固定攻击数值，取消 HP/移速/武器倍率，破甲仅 S 战机** |

---

## 附录 A: 图鉴条目清单

### 战姬 (11)

| # | ID | 稀有度 | 名称 | 获取 |
|---|-----|--------|------|------|
| 1 | pilot-b-linzhihan | B | 林知寒 | 默认 |
| 2 | pilot-b-bailing | B | 白凌 | 30,000 |
| 3 | pilot-b-sumianxing | B | 苏绵星 | 30,000 |
| 4 | pilot-b-xingtao | B | 星桃 | 30,000 |
| 5 | pilot-a-luofeiyin | A | 洛绯音 | 120,000 |
| 6 | pilot-a-shenyao | A | 沈曜 | 120,000 |
| 7 | pilot-b-shenqingyao | A | 沈清曜 | 120,000 |
| 8 | pilot-s-lingyan | S | 凌焰 | 900,000 |
| 9 | pilot-s-luoqi | S | 洛绮 | 900,000 |
| 10 | pilot-a-yelan | S | 夜岚 | 900,000 |
| 11 | pilot-ss-heiyue | SS | 黑月 | 抽卡 |

### 战机 (9)

| # | ID | 稀有度 | 名称 | 获取 |
|---|-----|--------|------|------|
| 1 | ship-b-01 | B | 蓝隼01 | 默认 |
| 2 | ship-b-03 | B | 绿堡04 | 50,000 |
| 3 | ship-b-05 | B | 紫影05 | 50,000 |
| 4 | ship-a-06 | A | 银翼06 | 150,000 |
| 5 | ship-a-07 | A | 白昼指挥 | 150,000 |
| 6 | ship-b-02 | A | 赤枪03 | 150,000 |
| 7 | ship-s-08 | **S** | 黑曜幽影 | 1,300,000 |
| 8 | ship-s-09 | **S** | 苍穹零式 | 1,300,000 |
| 9 | ship-b-04 | **S** | 金矢裁决 | 1,300,000 |
| 10 | ship-ss-lingguang | SS | 凌光零式 | 抽卡 |

## 附录 B: 加成计算顺序

```
1. baseAttack = pilot.damage + ship.damage
2. attack = baseAttack + fighterAttackBonus
3. attack = attack + codexBonus.attackFlat          ← 图鉴固定攻击
4. armorPen = pilotPen + shipPen + upgradePen
5. armorPen = armorPen + codexBonus.armorPenetrationFlat  ← S战机破甲
6. coinBonus = 1 + bountyBonus + codexBonus.coinBonusMultiplier  ← 联合金币
```
