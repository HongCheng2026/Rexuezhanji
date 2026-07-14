# 敌军名称、单位身份与 93 关出战表

## 文档地位

本文是本任务的内容真相源。DeepSeek必须按本文建立单位和关卡配置，不得自行缩减数量、合并名字或把阵容名称当成单位名称。

## 数量与命名规则

- 小怪：30个，每章含序章各3个。
- 普通敌机：30个，每章含序章各3个。
- 精英敌机：20个，每章含序章各2个。
- 常规敌军合计：80个。
- BOSS：93个，每个 `stageId`唯一对应一个 `bossId`。
- 我方战机：9架，名称继续以 `SHIP_ASSETS`为唯一来源。
- 同一 `unitId`跨关出现时保持同一名称、行为身份和图鉴卡。
- 不同 `bossId`不得共用正式名称。

ID规则：

```text
mob-c{章节两位}-{槽位两位}
fighter-c{章节两位}-{槽位两位}
elite-c{章节两位}-{槽位两位}
boss-c{章节两位}-s{关卡两位}
```

序章章节号使用 `00`。

## 80个常规敌军单位

行为可以复用底层 handler，但表中每个单位必须落成独立 profile 或独立参数组合，不能只改 `name`。

### 序章：苍穹启动

| 槽位 | unitId | 正式名 | 首次出现 | baseType | 行为摘要 |
|---|---|---|---|---|---|
| M1 | `mob-c00-01` | 校准蜂 | `prologue_1` | `small` | 直线飞行、不发弹的基础靶机 |
| M2 | `mob-c00-02` | 靶标雀 | `prologue_1` | `small` | 正弦移动、低速单发 |
| M3 | `mob-c00-03` | 测距针 | `prologue_2` | `small` | 斜切入场、短暂瞄准 |
| F1 | `fighter-c00-01` | 蓝穹教练机 | `prologue_1` | `shooter` | 窄角三连射 |
| F2 | `fighter-c00-02` | 火控验收机 | `prologue_2` | `shooter` | 上下双线射击 |
| F3 | `fighter-c00-03` | 规避压测机 | `prologue_3` | `charger` | 显示航道后冲刺 |
| E1 | `elite-c00-01` | 苍穹监考官 | `prologue_2` | `elite` | 间歇扇形射击 |
| E2 | `elite-c00-02` | 越权黑匣 | `prologue_3` | `elite` | 召唤靶机并释放干扰弹 |

### 第一章：城市外围夺回战

| 槽位 | unitId | 正式名 | 首次出现 | baseType | 行为摘要 |
|---|---|---|---|---|---|
| M1 | `mob-c01-01` | 灰巷侦蜂 | `1_1` | `small` | 贴近上下边缘侦察 |
| M2 | `mob-c01-02` | 路灯伏梭 | `1_1` | `small` | 从上下方向伏击 |
| M3 | `mob-c01-03` | 城环噪蝇 | `1_3` | `small` | 三机小编队扰动 |
| F1 | `fighter-c01-01` | 外环射手·獠 | `1_1` | `shooter` | 连续三发射击 |
| F2 | `fighter-c01-02` | 路障截击机·栅 | `1_2` | `shield` | 封锁固定航道 |
| F3 | `fighter-c01-03` | 信标猎犬·巡 | `1_6` | `shooter` | 低速追踪弹 |
| E1 | `elite-c01-01` | 包围圈执旗者 | `1_3` | `elite` | 带领护航机同步齐射 |
| E2 | `elite-c01-02` | 投影节点护送官 | `1_8` | `elite` | 召唤侦察蜂并释放回传火力 |

### 第二章：重甲空域

| 槽位 | unitId | 正式名 | 首次出现 | baseType | 行为摘要 |
|---|---|---|---|---|---|
| M1 | `mob-c02-01` | 铆钉蚊 | `2_1` | `small` | 高速直线穿越 |
| M2 | `mob-c02-02` | 甲片蜂 | `2_1` | `small` | 低速飞行并带轻型护甲 |
| M3 | `mob-c02-03` | 铁壳梭 | `2_3` | `small` | 外壳击破后突然加速 |
| F1 | `fighter-c02-01` | 重甲推进机·犀 | `2_1` | `charger` | 正面冲撞 |
| F2 | `fighter-c02-02` | 折盾轰击机·垒 | `2_2` | `shield` | 释放慢速封路弹 |
| F3 | `fighter-c02-03` | 破阵冲角·槌 | `2_6` | `charger` | 两段式预警撞击 |
| E1 | `elite-c02-01` | 玄甲近卫·门神 | `2_3` | `elite` | 护盾与暴露阶段循环 |
| E2 | `elite-c02-02` | 装甲共振核·磐 | `2_8` | `elite` | 为附近敌机提供减伤 |

### 第三章：沦陷空港

| 槽位 | unitId | 正式名 | 首次出现 | baseType | 行为摘要 |
|---|---|---|---|---|---|
| M1 | `mob-c03-01` | 锈轨侦雀 | `3_1` | `small` | 沿固定轨道进入 |
| M2 | `mob-c03-02` | 废舱掠蜂 | `3_1` | `small` | 折线变道 |
| M3 | `mob-c03-03` | 导航寄生针 | `3_3` | `small` | 假动作后突然换道 |
| F1 | `fighter-c03-01` | 航站伏击机·折返 | `3_1` | `charger` | 突入后反向折返 |
| F2 | `fighter-c03-02` | 轨道剪切机·岔口 | `3_2` | `shooter` | 交叉火力 |
| F3 | `fighter-c03-03` | 数据窃航机·抄写 | `3_6` | `shooter` | 复制上一波敌弹模式 |
| E1 | `elite-c03-01` | 旧港守夜人 | `3_3` | `elite` | 上下夹击 |
| E2 | `elite-c03-02` | 导航阵列劫持核 | `3_8` | `elite` | 改变敌机入场方向并召唤护卫 |

### 第四章：护盾防线

| 槽位 | unitId | 正式名 | 首次出现 | baseType | 行为摘要 |
|---|---|---|---|---|---|
| M1 | `mob-c04-01` | 薄幕蜂 | `4_1` | `small` | 拥有一次性前向护盾 |
| M2 | `mob-c04-02` | 折光针 | `4_1` | `small` | 短距离闪移 |
| M3 | `mob-c04-03` | 充能梭 | `4_3` | `small` | 为邻近敌机补充护盾 |
| F1 | `fighter-c04-01` | 护盾投射机·屏 | `4_1` | `shield` | 组成移动盾墙 |
| F2 | `fighter-c04-02` | 冲锋破线机·锥 | `4_2` | `charger` | 预警后高速冲锋 |
| F3 | `fighter-c04-03` | 封路编织机·格 | `4_6` | `shield` | 发射交错慢弹 |
| E1 | `elite-c04-01` | 天幕执盾者 | `4_3` | `elite` | 周期性展开大型护盾 |
| E2 | `elite-c04-02` | 中继充能核心 | `4_8` | `elite` | 释放范围护盾脉冲 |

### 第五章：精英舰队

| 槽位 | unitId | 正式名 | 首次出现 | baseType | 行为摘要 |
|---|---|---|---|---|---|
| M1 | `mob-c05-01` | 节拍蜂 | `5_1` | `small` | 按固定节奏单发 |
| M2 | `mob-c05-02` | 爆点萤 | `5_1` | `small` | 投放小型爆雷 |
| M3 | `mob-c05-03` | 标记梭 | `5_3` | `small` | 标记玩家后引导齐射 |
| F1 | `fighter-c05-01` | 黑潮轰炸机·落钟 | `5_1` | `bomber` | 连续投放爆雷 |
| F2 | `fighter-c05-02` | 齐射指挥机·拍点 | `5_2` | `shooter` | 控制周围敌机同步开火 |
| F3 | `fighter-c05-03` | 追猎修正机·回拍 | `5_6` | `sniper` | 子弹飞行中进行一次方向修正 |
| E1 | `elite-c05-01` | 精英乐团首席·强音 | `5_3` | `elite` | 宽角扇射和重弹交替 |
| E2 | `elite-c05-02` | 战术学习核心·拟态 | `5_8` | `elite` | 三种弹型循环切换 |

### 第六章：黑潮主力舰队

| 槽位 | unitId | 正式名 | 首次出现 | baseType | 行为摘要 |
|---|---|---|---|---|---|
| M1 | `mob-c06-01` | 舰群信标蜂 | `6_1` | `small` | 为狙击单位标记目标 |
| M2 | `mob-c06-02` | 照准针 | `6_1` | `small` | 长预警、高速直线弹 |
| M3 | `mob-c06-03` | 补位梭 | `6_3` | `small` | 自动补入编队空位 |
| F1 | `fighter-c06-01` | 长程狙击机·白线 | `6_1` | `sniper` | 锁定线狙击 |
| F2 | `fighter-c06-02` | 舰队护航机·侧卫 | `6_2` | `guard` | 护航队列齐射 |
| F3 | `fighter-c06-03` | 光矛炮艇·贯星 | `6_6` | `sniper` | 蓄力直线贯穿炮 |
| E1 | `elite-c06-01` | 断星级火控官 | `6_3` | `elite` | 同时生成多条锁定线 |
| E2 | `elite-c06-02` | 主力舰队执戟卫 | `6_8` | `elite` | 护航冲刺与齐射组合 |

### 第七章：重甲核心防线

| 槽位 | unitId | 正式名 | 首次出现 | baseType | 行为摘要 |
|---|---|---|---|---|---|
| M1 | `mob-c07-01` | 装甲螨 | `7_1` | `small` | 贴边群行并带轻度减伤 |
| M2 | `mob-c07-02` | 炉芯蜂 | `7_1` | `small` | 蓄力后发射爆裂弹 |
| M3 | `mob-c07-03` | 反击梭 | `7_3` | `small` | 受到攻击后释放一次短距反击弹 |
| F1 | `fighter-c07-01` | 母舰护卫·铁幕 | `7_1` | `guard` | 重甲护航齐射 |
| F2 | `fighter-c07-02` | 装甲反击机·回刺 | `7_2` | `shield` | 受击反击并改变航道 |
| F3 | `fighter-c07-03` | 核心搬运机·负山 | `7_6` | `core` | 低速重甲推进并携带护卫 |
| E1 | `elite-c07-01` | 壁垒禁卫·巨盾 | `7_3` | `elite` | 重盾与暴露窗口循环 |
| E2 | `elite-c07-02` | 重甲核心·地心 | `7_8` | `elite` | 范围减伤与重型弹幕 |

### 第八章：反攻前线基地

| 槽位 | unitId | 正式名 | 首次出现 | baseType | 行为摘要 |
|---|---|---|---|---|---|
| M1 | `mob-c08-01` | 补给蚁 | `8_1` | `small` | 为重型敌机缓慢恢复护盾 |
| M2 | `mob-c08-02` | 旋翼蜂 | `8_1` | `small` | 弧形环绕移动 |
| M3 | `mob-c08-03` | 分裂籽 | `8_3` | `small` | 被击毁后分裂成两个低血量子体 |
| F1 | `fighter-c08-01` | 旋翼封锁机·环刃 | `8_1` | `rotor` | 旋转弹幕 |
| F2 | `fighter-c08-02` | 补给牵引机·驮星 | `8_2` | `guard` | 修复并拖带护卫 |
| F3 | `fighter-c08-03` | 延迟分裂机·子母 | `8_6` | `bomber` | 延迟分裂弹 |
| E1 | `elite-c08-01` | 基地防卫队长·禁飞 | `8_3` | `elite` | 旋转封锁与冲刺组合 |
| E2 | `elite-c08-02` | 巢城供能核心·脐带 | `8_8` | `elite` | 范围修复并召唤补给机 |

### 第九章：黑潮母舰

| 槽位 | unitId | 正式名 | 首次出现 | baseType | 行为摘要 |
|---|---|---|---|---|---|
| M1 | `mob-c09-01` | 潮孢侦体 | `9_1` | `small` | 漂移移动并释放孢子弹 |
| M2 | `mob-c09-02` | 草母触须蜂 | `9_1` | `small` | 摆动飞行、短程追踪 |
| M3 | `mob-c09-03` | 母巢幼体 | `9_3` | `small` | 击毁后散出小型孢子弹 |
| F1 | `fighter-c09-01` | 内壁寄生机·附骨 | `9_1` | `charger` | 贴近战场边缘伏击 |
| F2 | `fighter-c09-02` | 母舰护卫·潮刃 | `9_2` | `guard` | 弧线冲切 |
| F3 | `fighter-c09-03` | 核心收割机·沉梦 | `9_6` | `core` | 引力慢弹与范围拖拽 |
| E1 | `elite-c09-01` | 三海草母·分株 | `9_3` | `elite` | 触须扇幕并召唤孢子体 |
| E2 | `elite-c09-02` | 弥赛亚近卫·圣骸 | `9_8` | `elite` | 护盾、冲锋、狙击三模式轮换 |

## 93个关卡BOSS

正式章节的基础 `phaseProfile`顺序固定为：`aimed`、`lanes`、`cross`、`charge`、`summon`、`sniper`、`armorCounter`、`rotatingZone`、`mixedEscort`、`chapterFinale`。章节主题在此基础上增加差异。

### 序章BOSS

| stageId | bossId | 正式名 | phaseProfile | 机制摘要 |
|---|---|---|---|---|
| `prologue_1` | `boss-c00-s01` | 训练靶舰·启航 | `tutorialAimed` | 单发瞄准与双线教学 |
| `prologue_2` | `boss-c00-s02` | 火控考官·准星 | `tutorialLanes` | 窄扇与安全航道教学 |
| `prologue_3` | `boss-c00-s03` | 黑潮侵入体·零号 | `intrusionMixed` | 训练弹型被黑潮干扰并召唤越权单位 |

### 第一章BOSS

| stageId | bossId | 正式名 | phaseProfile | 机制摘要 |
|---|---|---|---|---|
| `1_1` | `boss-c01-s01` | 外环哨塔·灰眼 | `aimed` | 哨塔瞄准与探照预警 |
| `1_2` | `boss-c01-s02` | 封路截击机·赤栅 | `lanes` | 城市航道封锁 |
| `1_3` | `boss-c01-s03` | 撤离线猎手·钩爪 | `cross` | 交叉钩锁弹幕 |
| `1_4` | `boss-c01-s04` | 城环压制艇·铁幕 | `charge` | 横扫压制与短冲锋 |
| `1_5` | `boss-c01-s05` | 包围圈队长·收网 | `summon` | 召唤包围编队 |
| `1_6` | `boss-c01-s06` | 星港断路者·裂灯 | `sniper` | 信标锁定与断路射击 |
| `1_7` | `boss-c01-s07` | 高架伏击兽·跃脊 | `armorCounter` | 伏击扑跃与受击反扑 |
| `1_8` | `boss-c01-s08` | 城门攻坚甲·破栅 | `rotatingZone` | 浮空攻坚甲与旋转封区 |
| `1_9` | `boss-c01-s09` | 黑潮信标母机·回声 | `mixedEscort` | 信标回声与护卫混合火力 |
| `1_10` | `boss-c01-s10` | 弥赛亚·观测投影节点 | `chapterFinale` | 弥赛亚投影、数据回传和章节终局 |

### 第二章BOSS

| stageId | bossId | 正式名 | phaseProfile | 机制摘要 |
|---|---|---|---|---|
| `2_1` | `boss-c02-s01` | 铆城巡弋舰·灰堡 | `aimed` | 重甲瞄准炮 |
| `2_2` | `boss-c02-s02` | 双盾截击兽·犀角 | `lanes` | 双盾形成安全航道 |
| `2_3` | `boss-c02-s03` | 层甲镇压机·叠岳 | `cross` | 层甲交叉火力 |
| `2_4` | `boss-c02-s04` | 反冲装甲艇·铁潮 | `charge` | 反冲推进与装甲冲撞 |
| `2_5` | `boss-c02-s05` | 破甲试炼者·不动 | `summon` | 召唤盾机检验破甲 |
| `2_6` | `boss-c02-s06` | 合页壁垒·玄门 | `sniper` | 护甲开合后的直线重炮 |
| `2_7` | `boss-c02-s07` | 装甲列阵核心·方城 | `armorCounter` | 装甲列阵与反击阶段 |
| `2_8` | `boss-c02-s08` | 重力碾压机·坠岳 | `rotatingZone` | 重力旋区压迫 |
| `2_9` | `boss-c02-s09` | 玄甲王庭·镇空 | `mixedEscort` | 重甲护卫与盾墙混合 |
| `2_10` | `boss-c02-s10` | 玄甲空兽 | `chapterFinale` | 多层装甲、冲角与终局弹幕 |

### 第三章BOSS

| stageId | bossId | 正式名 | phaseProfile | 机制摘要 |
|---|---|---|---|---|
| `3_1` | `boss-c03-s01` | 闭锁登机桥·铡门 | `aimed` | 登机桥闭锁射线 |
| `3_2` | `boss-c03-s02` | 失控牵引机·拖网 | `lanes` | 牵引网封锁航道 |
| `3_3` | `boss-c03-s03` | 跑道猎杀者·低空 | `cross` | 低空交叉冲切 |
| `3_4` | `boss-c03-s04` | 废舱拼接兽·百足 | `charge` | 分段推进与连续冲锋 |
| `3_5` | `boss-c03-s05` | 伏击调度官·岔路 | `summon` | 从多入口调度伏击单位 |
| `3_6` | `boss-c03-s06` | 导航欺骗体·假星 | `sniper` | 假预警与真实狙击 |
| `3_7` | `boss-c03-s07` | 补给库吞噬机·空仓 | `armorCounter` | 吞噬护盾与暴露核心 |
| `3_8` | `boss-c03-s08` | 撤离记录者·终班 | `rotatingZone` | 撤离航线回放形成旋区 |
| `3_9` | `boss-c03-s09` | 星港墓园中枢·默航 | `mixedEscort` | 废舱护卫与导航欺骗混合 |
| `3_10` | `boss-c03-s10` | 失落空港守墓者 | `chapterFinale` | 星港设施、多入口伏击和终局 |

### 第四章BOSS

| stageId | bossId | 正式名 | phaseProfile | 机制摘要 |
|---|---|---|---|---|
| `4_1` | `boss-c04-s01` | 折光浮标·棱镜 | `aimed` | 折光瞄准弹 |
| `4_2` | `boss-c04-s02` | 双翼盾墙·雁门 | `lanes` | 双翼护盾航道 |
| `4_3` | `boss-c04-s03` | 冲锋楔机·贯阵 | `cross` | 楔形交叉穿阵 |
| `4_4` | `boss-c04-s04` | 封路织机·经纬 | `charge` | 格线封路与横扫 |
| `4_5` | `boss-c04-s05` | 穿插拦截者·回廊 | `summon` | 召唤穿插编队 |
| `4_6` | `boss-c04-s06` | 低轨电容兽·蓄雷 | `sniper` | 蓄能后直线雷击 |
| `4_7` | `boss-c04-s07` | 四面盾塔·方阵 | `armorCounter` | 四面盾循环与暴露窗口 |
| `4_8` | `boss-c04-s08` | 天幕维修母机·补天 | `rotatingZone` | 维修无人机与旋转护盾区 |
| `4_9` | `boss-c04-s09` | 护盾链总控·穹锁 | `mixedEscort` | 多中继护盾和混合护卫 |
| `4_10` | `boss-c04-s10` | 天幕护盾中继·阿特拉斯 | `chapterFinale` | 护盾、冲锋和封路终局 |

### 第五章BOSS

| stageId | bossId | 正式名 | phaseProfile | 机制摘要 |
|---|---|---|---|---|
| `5_1` | `boss-c05-s01` | 节拍拦截机·先声 | `aimed` | 节拍瞄准弹 |
| `5_2` | `boss-c05-s02` | 爆雷编舞者·落点 | `lanes` | 爆雷排列安全航道 |
| `5_3` | `boss-c05-s03` | 齐射领航舰·合拍 | `cross` | 编队同步交叉齐射 |
| `5_4` | `boss-c05-s04` | 猎杀校正体·复盘 | `charge` | 复盘玩家位置后修正冲锋 |
| `5_5` | `boss-c05-s05` | 战术学习机·镜像 | `summon` | 召唤并模仿前一波弹型 |
| `5_6` | `boss-c05-s06` | 浮空弦阵·共鸣 | `sniper` | 弦阵共鸣锁定线 |
| `5_7` | `boss-c05-s07` | 精英列队长·铁拍 | `armorCounter` | 节奏护甲与重音反击 |
| `5_8` | `boss-c05-s08` | 轰炸指挥母机·终止符 | `rotatingZone` | 旋转雷区和轰炸护卫 |
| `5_9` | `boss-c05-s09` | 黑潮乐团旗舰·狂想 | `mixedEscort` | 多弹型轮换和精英乐团 |
| `5_10` | `boss-c05-s10` | 黑潮节拍者·零式 | `chapterFinale` | 节拍加速、爆雷与齐射终局 |

### 第六章BOSS

| stageId | bossId | 正式名 | phaseProfile | 机制摘要 |
|---|---|---|---|---|
| `6_1` | `boss-c06-s01` | 前锋炮艇·开膛 | `aimed` | 前锋重炮瞄准 |
| `6_2` | `boss-c06-s02` | 远距照准塔·白线 | `lanes` | 多条预警线封锁 |
| `6_3` | `boss-c06-s03` | 侧卫巡洋机·咬翼 | `cross` | 侧卫交叉火力 |
| `6_4` | `boss-c06-s04` | 光矛列舰·穿星 | `charge` | 光矛蓄力与直线穿刺 |
| `6_5` | `boss-c06-s05` | 母舰信号牧者·引潮 | `summon` | 召唤主力舰护航群 |
| `6_6` | `boss-c06-s06` | 舰队火控脑·千眼 | `sniper` | 多目标锁定狙击 |
| `6_7` | `boss-c06-s07` | 重炮浮城·沉钟 | `armorCounter` | 炮门装甲和重炮反击 |
| `6_8` | `boss-c06-s08` | 护航战列兽·断鳍 | `rotatingZone` | 战列兽环形炮阵 |
| `6_9` | `boss-c06-s09` | 断星舰队旗舰·蚀日 | `mixedEscort` | 旗舰齐射与精英侧卫 |
| `6_10` | `boss-c06-s10` | 断星级主力舰·噬光 | `chapterFinale` | 舰队级狙击、齐射和终局炮击 |

### 第七章BOSS

| stageId | bossId | 正式名 | phaseProfile | 机制摘要 |
|---|---|---|---|---|
| `7_1` | `boss-c07-s01` | 外壳巡逻机·甲虫 | `aimed` | 装甲侦测炮 |
| `7_2` | `boss-c07-s02` | 反击盾兽·回震 | `lanes` | 盾面反射形成封路 |
| `7_3` | `boss-c07-s03` | 核心搬运体·负山 | `cross` | 重甲搬运体交叉护卫 |
| `7_4` | `boss-c07-s04` | 多层装甲门·九锁 | `charge` | 装甲门开合横扫 |
| `7_5` | `boss-c07-s05` | 穿透校验者·硬界 | `summon` | 召唤装甲单位检验穿透 |
| `7_6` | `boss-c07-s06` | 壁垒修复机·缝甲 | `sniper` | 修复窗口与弱点锁定 |
| `7_7` | `boss-c07-s07` | 母舰骨架兽·脊城 | `armorCounter` | 骨架装甲与反击脊炮 |
| `7_8` | `boss-c07-s08` | 重甲反应炉·赤心 | `rotatingZone` | 反应炉旋转热区 |
| `7_9` | `boss-c07-s09` | 外壳守门巨像·不落 | `mixedEscort` | 巨盾、反击和重甲护卫 |
| `7_10` | `boss-c07-s10` | 母舰外壳·壁垒巨像 | `chapterFinale` | 多层装甲、暴露核心和终局反击 |

### 第八章BOSS

| stageId | bossId | 正式名 | phaseProfile | 机制摘要 |
|---|---|---|---|---|
| `8_1` | `boss-c08-s01` | 前线探照塔·昼盲 | `aimed` | 探照标记与瞄准 |
| `8_2` | `boss-c08-s02` | 旋翼绞杀机·轮墓 | `lanes` | 旋翼切割形成航道 |
| `8_3` | `boss-c08-s03` | 补给拖航兽·驮城 | `cross` | 拖航编队交叉护卫 |
| `8_4` | `boss-c08-s04` | 分裂弹巢·千籽 | `charge` | 弹巢前压与分裂弹 |
| `8_5` | `boss-c08-s05` | 供应链监工·断粮 | `summon` | 召唤补给和维修单位 |
| `8_6` | `boss-c08-s06` | 移动机库·吞翼 | `sniper` | 机库炮门锁定与放飞敌机 |
| `8_7` | `boss-c08-s07` | 基地轨道炮·落轴 | `armorCounter` | 轨道炮装甲和反击射线 |
| `8_8` | `boss-c08-s08` | 巢城外环·迁徙足 | `rotatingZone` | 基地外环旋转封锁 |
| `8_9` | `boss-c08-s09` | 防卫总控·封疆 | `mixedEscort` | 旋翼、补给和分裂混合 |
| `8_10` | `boss-c08-s10` | 迁徙基地中枢·巢城 | `chapterFinale` | 移动基地、供能核心和终局防卫 |

### 第九章BOSS

| stageId | bossId | 正式名 | phaseProfile | 机制摘要 |
|---|---|---|---|---|
| `9_1` | `boss-c09-s01` | 母舰舱门·吞口 | `aimed` | 舱门咬合与瞄准触须 |
| `9_2` | `boss-c09-s02` | 潮汐血管·逆流 | `lanes` | 血管脉冲形成逆流航道 |
| `9_3` | `boss-c09-s03` | 内壁寄生王·附骨 | `cross` | 舱壁伏击与寄生交叉弹 |
| `9_4` | `boss-c09-s04` | 三海草母·藻冠 | `charge` | 冠状触须横扫与突进 |
| `9_5` | `boss-c09-s05` | 三海草母·潮根 | `summon` | 根系召唤孢子和分株 |
| `9_6` | `boss-c09-s06` | 三海草母·孢宫 | `sniper` | 孢宫锁定与孢子狙击 |
| `9_7` | `boss-c09-s07` | 弥赛亚近卫·告解 | `armorCounter` | 圣骸护盾和告解反击 |
| `9_8` | `boss-c09-s08` | 母舰意识海·深潮 | `rotatingZone` | 意识海旋涡和引力拖拽 |
| `9_9` | `boss-c09-s09` | 弥赛亚机甲·圣像 | `mixedEscort` | 机甲复合模式和近卫护航 |
| `9_10` | `boss-c09-s10` | 黑潮女王·弥赛亚 | `chapterFinale` | 三阶段全域压制、召唤与最终核心 |

## 93关逐关出战表

表中列出的是必须写入 `STAGE_ENEMY_ROSTERS`的真实 ID，不是展示用总称。

### 序章3关

| stageId | 小怪 | 普通敌机 | 精英 | BOSS |
|---|---|---|---|---|
| `prologue_1` | `mob-c00-01`, `mob-c00-02` | `fighter-c00-01` | — | `boss-c00-s01` |
| `prologue_2` | `mob-c00-01`, `mob-c00-02`, `mob-c00-03` | `fighter-c00-01`, `fighter-c00-02` | `elite-c00-01` | `boss-c00-s02` |
| `prologue_3` | `mob-c00-01`, `mob-c00-02`, `mob-c00-03` | `fighter-c00-01`, `fighter-c00-02`, `fighter-c00-03` | `elite-c00-01`, `elite-c00-02` | `boss-c00-s03` |

### 第一章10关

| stageId | 小怪 | 普通敌机 | 精英 | BOSS |
|---|---|---|---|---|
| `1_1` | `mob-c01-01`, `mob-c01-02` | `fighter-c01-01` | — | `boss-c01-s01` |
| `1_2` | `mob-c01-01`, `mob-c01-02` | `fighter-c01-01`, `fighter-c01-02` | — | `boss-c01-s02` |
| `1_3` | `mob-c01-01`, `mob-c01-03` | `fighter-c01-01`, `fighter-c01-02` | `elite-c01-01` | `boss-c01-s03` |
| `1_4` | `mob-c01-02`, `mob-c01-03` | `fighter-c01-01`, `fighter-c01-02` | `elite-c01-01` | `boss-c01-s04` |
| `1_5` | `mob-c01-01`, `mob-c01-02`, `mob-c01-03` | `fighter-c01-01`, `fighter-c01-02` | `elite-c01-01` | `boss-c01-s05` |
| `1_6` | `mob-c01-01`, `mob-c01-02`, `mob-c01-03` | `fighter-c01-02`, `fighter-c01-03` | `elite-c01-01` | `boss-c01-s06` |
| `1_7` | `mob-c01-01`, `mob-c01-02`, `mob-c01-03` | `fighter-c01-01`, `fighter-c01-02`, `fighter-c01-03` | `elite-c01-01` | `boss-c01-s07` |
| `1_8` | `mob-c01-01`, `mob-c01-02`, `mob-c01-03` | `fighter-c01-01`, `fighter-c01-02`, `fighter-c01-03` | `elite-c01-01`, `elite-c01-02` | `boss-c01-s08` |
| `1_9` | `mob-c01-01`, `mob-c01-02`, `mob-c01-03` | `fighter-c01-02`, `fighter-c01-03` | `elite-c01-01`, `elite-c01-02` | `boss-c01-s09` |
| `1_10` | `mob-c01-01`, `mob-c01-02`, `mob-c01-03` | `fighter-c01-01`, `fighter-c01-02`, `fighter-c01-03` | `elite-c01-01`, `elite-c01-02` | `boss-c01-s10` |

### 第二章10关

| stageId | 小怪 | 普通敌机 | 精英 | BOSS |
|---|---|---|---|---|
| `2_1` | `mob-c02-01`, `mob-c02-02` | `fighter-c02-01` | — | `boss-c02-s01` |
| `2_2` | `mob-c02-01`, `mob-c02-02` | `fighter-c02-01`, `fighter-c02-02` | — | `boss-c02-s02` |
| `2_3` | `mob-c02-01`, `mob-c02-03` | `fighter-c02-01`, `fighter-c02-02` | `elite-c02-01` | `boss-c02-s03` |
| `2_4` | `mob-c02-02`, `mob-c02-03` | `fighter-c02-01`, `fighter-c02-02` | `elite-c02-01` | `boss-c02-s04` |
| `2_5` | `mob-c02-01`, `mob-c02-02`, `mob-c02-03` | `fighter-c02-01`, `fighter-c02-02` | `elite-c02-01` | `boss-c02-s05` |
| `2_6` | `mob-c02-01`, `mob-c02-02`, `mob-c02-03` | `fighter-c02-02`, `fighter-c02-03` | `elite-c02-01` | `boss-c02-s06` |
| `2_7` | `mob-c02-01`, `mob-c02-02`, `mob-c02-03` | `fighter-c02-01`, `fighter-c02-02`, `fighter-c02-03` | `elite-c02-01` | `boss-c02-s07` |
| `2_8` | `mob-c02-01`, `mob-c02-02`, `mob-c02-03` | `fighter-c02-01`, `fighter-c02-02`, `fighter-c02-03` | `elite-c02-01`, `elite-c02-02` | `boss-c02-s08` |
| `2_9` | `mob-c02-01`, `mob-c02-02`, `mob-c02-03` | `fighter-c02-02`, `fighter-c02-03` | `elite-c02-01`, `elite-c02-02` | `boss-c02-s09` |
| `2_10` | `mob-c02-01`, `mob-c02-02`, `mob-c02-03` | `fighter-c02-01`, `fighter-c02-02`, `fighter-c02-03` | `elite-c02-01`, `elite-c02-02` | `boss-c02-s10` |

### 第三章10关

| stageId | 小怪 | 普通敌机 | 精英 | BOSS |
|---|---|---|---|---|
| `3_1` | `mob-c03-01`, `mob-c03-02` | `fighter-c03-01` | — | `boss-c03-s01` |
| `3_2` | `mob-c03-01`, `mob-c03-02` | `fighter-c03-01`, `fighter-c03-02` | — | `boss-c03-s02` |
| `3_3` | `mob-c03-01`, `mob-c03-03` | `fighter-c03-01`, `fighter-c03-02` | `elite-c03-01` | `boss-c03-s03` |
| `3_4` | `mob-c03-02`, `mob-c03-03` | `fighter-c03-01`, `fighter-c03-02` | `elite-c03-01` | `boss-c03-s04` |
| `3_5` | `mob-c03-01`, `mob-c03-02`, `mob-c03-03` | `fighter-c03-01`, `fighter-c03-02` | `elite-c03-01` | `boss-c03-s05` |
| `3_6` | `mob-c03-01`, `mob-c03-02`, `mob-c03-03` | `fighter-c03-02`, `fighter-c03-03` | `elite-c03-01` | `boss-c03-s06` |
| `3_7` | `mob-c03-01`, `mob-c03-02`, `mob-c03-03` | `fighter-c03-01`, `fighter-c03-02`, `fighter-c03-03` | `elite-c03-01` | `boss-c03-s07` |
| `3_8` | `mob-c03-01`, `mob-c03-02`, `mob-c03-03` | `fighter-c03-01`, `fighter-c03-02`, `fighter-c03-03` | `elite-c03-01`, `elite-c03-02` | `boss-c03-s08` |
| `3_9` | `mob-c03-01`, `mob-c03-02`, `mob-c03-03` | `fighter-c03-02`, `fighter-c03-03` | `elite-c03-01`, `elite-c03-02` | `boss-c03-s09` |
| `3_10` | `mob-c03-01`, `mob-c03-02`, `mob-c03-03` | `fighter-c03-01`, `fighter-c03-02`, `fighter-c03-03` | `elite-c03-01`, `elite-c03-02` | `boss-c03-s10` |

### 第四章10关

| stageId | 小怪 | 普通敌机 | 精英 | BOSS |
|---|---|---|---|---|
| `4_1` | `mob-c04-01`, `mob-c04-02` | `fighter-c04-01` | — | `boss-c04-s01` |
| `4_2` | `mob-c04-01`, `mob-c04-02` | `fighter-c04-01`, `fighter-c04-02` | — | `boss-c04-s02` |
| `4_3` | `mob-c04-01`, `mob-c04-03` | `fighter-c04-01`, `fighter-c04-02` | `elite-c04-01` | `boss-c04-s03` |
| `4_4` | `mob-c04-02`, `mob-c04-03` | `fighter-c04-01`, `fighter-c04-02` | `elite-c04-01` | `boss-c04-s04` |
| `4_5` | `mob-c04-01`, `mob-c04-02`, `mob-c04-03` | `fighter-c04-01`, `fighter-c04-02` | `elite-c04-01` | `boss-c04-s05` |
| `4_6` | `mob-c04-01`, `mob-c04-02`, `mob-c04-03` | `fighter-c04-02`, `fighter-c04-03` | `elite-c04-01` | `boss-c04-s06` |
| `4_7` | `mob-c04-01`, `mob-c04-02`, `mob-c04-03` | `fighter-c04-01`, `fighter-c04-02`, `fighter-c04-03` | `elite-c04-01` | `boss-c04-s07` |
| `4_8` | `mob-c04-01`, `mob-c04-02`, `mob-c04-03` | `fighter-c04-01`, `fighter-c04-02`, `fighter-c04-03` | `elite-c04-01`, `elite-c04-02` | `boss-c04-s08` |
| `4_9` | `mob-c04-01`, `mob-c04-02`, `mob-c04-03` | `fighter-c04-02`, `fighter-c04-03` | `elite-c04-01`, `elite-c04-02` | `boss-c04-s09` |
| `4_10` | `mob-c04-01`, `mob-c04-02`, `mob-c04-03` | `fighter-c04-01`, `fighter-c04-02`, `fighter-c04-03` | `elite-c04-01`, `elite-c04-02` | `boss-c04-s10` |

### 第五章10关

| stageId | 小怪 | 普通敌机 | 精英 | BOSS |
|---|---|---|---|---|
| `5_1` | `mob-c05-01`, `mob-c05-02` | `fighter-c05-01` | — | `boss-c05-s01` |
| `5_2` | `mob-c05-01`, `mob-c05-02` | `fighter-c05-01`, `fighter-c05-02` | — | `boss-c05-s02` |
| `5_3` | `mob-c05-01`, `mob-c05-03` | `fighter-c05-01`, `fighter-c05-02` | `elite-c05-01` | `boss-c05-s03` |
| `5_4` | `mob-c05-02`, `mob-c05-03` | `fighter-c05-01`, `fighter-c05-02` | `elite-c05-01` | `boss-c05-s04` |
| `5_5` | `mob-c05-01`, `mob-c05-02`, `mob-c05-03` | `fighter-c05-01`, `fighter-c05-02` | `elite-c05-01` | `boss-c05-s05` |
| `5_6` | `mob-c05-01`, `mob-c05-02`, `mob-c05-03` | `fighter-c05-02`, `fighter-c05-03` | `elite-c05-01` | `boss-c05-s06` |
| `5_7` | `mob-c05-01`, `mob-c05-02`, `mob-c05-03` | `fighter-c05-01`, `fighter-c05-02`, `fighter-c05-03` | `elite-c05-01` | `boss-c05-s07` |
| `5_8` | `mob-c05-01`, `mob-c05-02`, `mob-c05-03` | `fighter-c05-01`, `fighter-c05-02`, `fighter-c05-03` | `elite-c05-01`, `elite-c05-02` | `boss-c05-s08` |
| `5_9` | `mob-c05-01`, `mob-c05-02`, `mob-c05-03` | `fighter-c05-02`, `fighter-c05-03` | `elite-c05-01`, `elite-c05-02` | `boss-c05-s09` |
| `5_10` | `mob-c05-01`, `mob-c05-02`, `mob-c05-03` | `fighter-c05-01`, `fighter-c05-02`, `fighter-c05-03` | `elite-c05-01`, `elite-c05-02` | `boss-c05-s10` |

### 第六章10关

| stageId | 小怪 | 普通敌机 | 精英 | BOSS |
|---|---|---|---|---|
| `6_1` | `mob-c06-01`, `mob-c06-02` | `fighter-c06-01` | — | `boss-c06-s01` |
| `6_2` | `mob-c06-01`, `mob-c06-02` | `fighter-c06-01`, `fighter-c06-02` | — | `boss-c06-s02` |
| `6_3` | `mob-c06-01`, `mob-c06-03` | `fighter-c06-01`, `fighter-c06-02` | `elite-c06-01` | `boss-c06-s03` |
| `6_4` | `mob-c06-02`, `mob-c06-03` | `fighter-c06-01`, `fighter-c06-02` | `elite-c06-01` | `boss-c06-s04` |
| `6_5` | `mob-c06-01`, `mob-c06-02`, `mob-c06-03` | `fighter-c06-01`, `fighter-c06-02` | `elite-c06-01` | `boss-c06-s05` |
| `6_6` | `mob-c06-01`, `mob-c06-02`, `mob-c06-03` | `fighter-c06-02`, `fighter-c06-03` | `elite-c06-01` | `boss-c06-s06` |
| `6_7` | `mob-c06-01`, `mob-c06-02`, `mob-c06-03` | `fighter-c06-01`, `fighter-c06-02`, `fighter-c06-03` | `elite-c06-01` | `boss-c06-s07` |
| `6_8` | `mob-c06-01`, `mob-c06-02`, `mob-c06-03` | `fighter-c06-01`, `fighter-c06-02`, `fighter-c06-03` | `elite-c06-01`, `elite-c06-02` | `boss-c06-s08` |
| `6_9` | `mob-c06-01`, `mob-c06-02`, `mob-c06-03` | `fighter-c06-02`, `fighter-c06-03` | `elite-c06-01`, `elite-c06-02` | `boss-c06-s09` |
| `6_10` | `mob-c06-01`, `mob-c06-02`, `mob-c06-03` | `fighter-c06-01`, `fighter-c06-02`, `fighter-c06-03` | `elite-c06-01`, `elite-c06-02` | `boss-c06-s10` |

### 第七章10关

| stageId | 小怪 | 普通敌机 | 精英 | BOSS |
|---|---|---|---|---|
| `7_1` | `mob-c07-01`, `mob-c07-02` | `fighter-c07-01` | — | `boss-c07-s01` |
| `7_2` | `mob-c07-01`, `mob-c07-02` | `fighter-c07-01`, `fighter-c07-02` | — | `boss-c07-s02` |
| `7_3` | `mob-c07-01`, `mob-c07-03` | `fighter-c07-01`, `fighter-c07-02` | `elite-c07-01` | `boss-c07-s03` |
| `7_4` | `mob-c07-02`, `mob-c07-03` | `fighter-c07-01`, `fighter-c07-02` | `elite-c07-01` | `boss-c07-s04` |
| `7_5` | `mob-c07-01`, `mob-c07-02`, `mob-c07-03` | `fighter-c07-01`, `fighter-c07-02` | `elite-c07-01` | `boss-c07-s05` |
| `7_6` | `mob-c07-01`, `mob-c07-02`, `mob-c07-03` | `fighter-c07-02`, `fighter-c07-03` | `elite-c07-01` | `boss-c07-s06` |
| `7_7` | `mob-c07-01`, `mob-c07-02`, `mob-c07-03` | `fighter-c07-01`, `fighter-c07-02`, `fighter-c07-03` | `elite-c07-01` | `boss-c07-s07` |
| `7_8` | `mob-c07-01`, `mob-c07-02`, `mob-c07-03` | `fighter-c07-01`, `fighter-c07-02`, `fighter-c07-03` | `elite-c07-01`, `elite-c07-02` | `boss-c07-s08` |
| `7_9` | `mob-c07-01`, `mob-c07-02`, `mob-c07-03` | `fighter-c07-02`, `fighter-c07-03` | `elite-c07-01`, `elite-c07-02` | `boss-c07-s09` |
| `7_10` | `mob-c07-01`, `mob-c07-02`, `mob-c07-03` | `fighter-c07-01`, `fighter-c07-02`, `fighter-c07-03` | `elite-c07-01`, `elite-c07-02` | `boss-c07-s10` |

### 第八章10关

| stageId | 小怪 | 普通敌机 | 精英 | BOSS |
|---|---|---|---|---|
| `8_1` | `mob-c08-01`, `mob-c08-02` | `fighter-c08-01` | — | `boss-c08-s01` |
| `8_2` | `mob-c08-01`, `mob-c08-02` | `fighter-c08-01`, `fighter-c08-02` | — | `boss-c08-s02` |
| `8_3` | `mob-c08-01`, `mob-c08-03` | `fighter-c08-01`, `fighter-c08-02` | `elite-c08-01` | `boss-c08-s03` |
| `8_4` | `mob-c08-02`, `mob-c08-03` | `fighter-c08-01`, `fighter-c08-02` | `elite-c08-01` | `boss-c08-s04` |
| `8_5` | `mob-c08-01`, `mob-c08-02`, `mob-c08-03` | `fighter-c08-01`, `fighter-c08-02` | `elite-c08-01` | `boss-c08-s05` |
| `8_6` | `mob-c08-01`, `mob-c08-02`, `mob-c08-03` | `fighter-c08-02`, `fighter-c08-03` | `elite-c08-01` | `boss-c08-s06` |
| `8_7` | `mob-c08-01`, `mob-c08-02`, `mob-c08-03` | `fighter-c08-01`, `fighter-c08-02`, `fighter-c08-03` | `elite-c08-01` | `boss-c08-s07` |
| `8_8` | `mob-c08-01`, `mob-c08-02`, `mob-c08-03` | `fighter-c08-01`, `fighter-c08-02`, `fighter-c08-03` | `elite-c08-01`, `elite-c08-02` | `boss-c08-s08` |
| `8_9` | `mob-c08-01`, `mob-c08-02`, `mob-c08-03` | `fighter-c08-02`, `fighter-c08-03` | `elite-c08-01`, `elite-c08-02` | `boss-c08-s09` |
| `8_10` | `mob-c08-01`, `mob-c08-02`, `mob-c08-03` | `fighter-c08-01`, `fighter-c08-02`, `fighter-c08-03` | `elite-c08-01`, `elite-c08-02` | `boss-c08-s10` |

### 第九章10关

| stageId | 小怪 | 普通敌机 | 精英 | BOSS |
|---|---|---|---|---|
| `9_1` | `mob-c09-01`, `mob-c09-02` | `fighter-c09-01` | — | `boss-c09-s01` |
| `9_2` | `mob-c09-01`, `mob-c09-02` | `fighter-c09-01`, `fighter-c09-02` | — | `boss-c09-s02` |
| `9_3` | `mob-c09-01`, `mob-c09-03` | `fighter-c09-01`, `fighter-c09-02` | `elite-c09-01` | `boss-c09-s03` |
| `9_4` | `mob-c09-02`, `mob-c09-03` | `fighter-c09-01`, `fighter-c09-02` | `elite-c09-01` | `boss-c09-s04` |
| `9_5` | `mob-c09-01`, `mob-c09-02`, `mob-c09-03` | `fighter-c09-01`, `fighter-c09-02` | `elite-c09-01` | `boss-c09-s05` |
| `9_6` | `mob-c09-01`, `mob-c09-02`, `mob-c09-03` | `fighter-c09-02`, `fighter-c09-03` | `elite-c09-01` | `boss-c09-s06` |
| `9_7` | `mob-c09-01`, `mob-c09-02`, `mob-c09-03` | `fighter-c09-01`, `fighter-c09-02`, `fighter-c09-03` | `elite-c09-01` | `boss-c09-s07` |
| `9_8` | `mob-c09-01`, `mob-c09-02`, `mob-c09-03` | `fighter-c09-01`, `fighter-c09-02`, `fighter-c09-03` | `elite-c09-01`, `elite-c09-02` | `boss-c09-s08` |
| `9_9` | `mob-c09-01`, `mob-c09-02`, `mob-c09-03` | `fighter-c09-02`, `fighter-c09-03` | `elite-c09-01`, `elite-c09-02` | `boss-c09-s09` |
| `9_10` | `mob-c09-01`, `mob-c09-02`, `mob-c09-03` | `fighter-c09-01`, `fighter-c09-02`, `fighter-c09-03` | `elite-c09-01`, `elite-c09-02` | `boss-c09-s10` |

## 我方9架战机名称

这些名字不在新敌军资料库中复制；代码通过 `shipId`从 `SHIP_ASSETS`查询。

| shipId | 正式名 | 代号 |
|---|---|---|
| `ship-s-09` | 苍穹零式 | 星链 |
| `ship-s-08` | 黑曜幽影 | 暗核 |
| `ship-b-04` | 金矢裁决 | 金矢 |
| `ship-a-07` | 白昼指挥 | 白昼 |
| `ship-a-06` | 银翼06 | 银翼 |
| `ship-b-02` | 赤枪03 | 赤枪 |
| `ship-b-01` | 蓝隼01 | 蓝隼 |
| `ship-b-03` | 绿堡04 | 绿堡 |
| `ship-b-05` | 紫影05 | 紫影 |

## 第九章剧情顺序不可打乱

```text
9-1至9-3：进入母舰、对抗舱门/血管/寄生体
9-4：三海草母·藻冠
9-5：三海草母·潮根
9-6：三海草母·孢宫
9-7：弥赛亚近卫·告解
9-8：母舰意识海·深潮
9-9：弥赛亚机甲·圣像
9-10：黑潮女王·弥赛亚
```

三海草母三个 BOSS是同一母体系统的不同功能形态，但必须有不同名称、行为配置和未来美术槽位；不能只把同一 BOSS换后缀。
