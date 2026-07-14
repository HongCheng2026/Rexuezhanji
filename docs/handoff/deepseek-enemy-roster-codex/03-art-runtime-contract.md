# 美术槽位与运行时契约

## 本轮状态

本轮是代码阶段。最终需要 173 个敌军美术槽位：

- 小怪 30
- 普通敌机 30
- 精英敌机 20
- BOSS 93

现有正式候选素材数量远少于 173，因此允许复用现有图片作为 placeholder。代码必须诚实表达这一状态，不能把“有素材接口”写成“最终美术完成”。

## 1. 美术字段

每个单位和 BOSS 都必须有独立 `art`对象：

```js
art: {
  artStatus: "placeholder",     // placeholder | final
  expectedSrc: "enemies/battle/c01-mob-01.png",
  fallbackAssetId: "scout",
  drawWidth: 46,
  drawHeight: 58,
  drawAngle: -Math.PI / 2,
  hitRadiusX: 18,
  hitRadiusY: 21,
  offsetX: 0,
  offsetY: 0
}
```

规则：

- `expectedSrc`表示未来相对 `assets/runtime/`的素材槽位。
- `artStatus === "placeholder"`时，运行时不得加载 `expectedSrc`。
- `artStatus === "final"`时，测试必须确认文件存在，才能返回正式路径。
- `fallbackAssetId`必须能解析到当前真实存在的图片。
- 图鉴和战斗使用同一解析函数，不能各自猜路径。

## 2. 文件命名

未来正式素材按以下规则进入运行时目录：

```text
assets/runtime/enemies/battle/c00-mob-01.png
assets/runtime/enemies/battle/c00-fighter-01.png
assets/runtime/enemies/battle/c00-elite-01.png

assets/runtime/enemies/battle/c01-mob-01.png
assets/runtime/enemies/battle/c01-fighter-01.png
assets/runtime/enemies/battle/c01-elite-01.png

assets/runtime/bosses/stages/boss-c00-s01.png
assets/runtime/bosses/stages/boss-c01-s01.png
assets/runtime/bosses/stages/boss-c09-s10.png
```

约束：

- 章节统一两位数字。
- 单位槽位和关卡统一两位数字。
- 文件名只使用 ASCII、小写字母、数字和连字符。
- 图片透明背景，不包含关卡编号、名称、边框或灰色底板。

## 3. Placeholder 回退表

可使用 `src/shared/assets.js`中现有 `ASSET_PATHS.enemySprites`作为回退：

| fallbackAssetId | 现有素材键 | 建议用途 |
|---|---|---|
| `scout` | `enemySprites.scout`或`small` | 轻型小怪 |
| `shooter` | `enemySprites.shooter` | 射击型敌机 |
| `charger` | `enemySprites.charger` | 冲锋型敌机 |
| `shield` | `enemySprites.shield` | 护盾型敌机 |
| `bomber` | `enemySprites.bomber` | 轰炸与布雷型 |
| `sniper` | `enemySprites.sniper` | 狙击与标记型 |
| `guard` | `enemySprites.guard` | 护航和支援型 |
| `rotor` | `enemySprites.rotor` | 旋转封锁型 |
| `core` | `enemySprites.core` | 核心和高阶精英 |
| `elite` | `enemySprites.elite` | 其他精英回退 |

BOSS 回退：

- 第一章至第九章优先使用现有对应 `BOSS_VISUALS[chapterIndex]`。
- 序章使用当前通用 BOSS 图片。
- 回退只是本轮代码占位，同一章多个 BOSS 暂时同图必须在报告中统计。

## 4. 解析流程

`resolveEnemyArt(unitOrBoss, assetsConfig)`必须：

1. 检查 `artStatus`。
2. `final`状态下解析正式运行时 URL。
3. `placeholder`状态下忽略 `expectedSrc`，直接解析 fallback。
4. 返回 `{ src, isPlaceholder, art }`。
5. fallback 也不存在时，返回现有通用敌机或 BOSS 图片，不能返回一个不存在的路径。

浏览器图片对象增加一次性 `onerror`回退，但不得产生无限重试。

## 5. 源图和游戏内尺寸

| 分类 | 建议透明源图 | 960×540画布内显示范围 | 碰撞范围建议 |
|---|---:|---:|---:|
| 小怪 | 256×256 | 长边42–54 px | X 16–21 / Y 18–24 |
| 普通敌机 | 384×384 | 长边58–78 px | X 21–30 / Y 25–34 |
| 精英敌机 | 512×512 | 长边90–130 px | X 34–48 / Y 42–58 |
| BOSS | 1024×1024 | 180–310 px | 独立椭圆碰撞框 |

尺寸原则：

- 实际尺寸由每个条目的 `drawWidth`、`drawHeight`明确给出。
- BOSS不能占满整个垂直躲避区域。
- 碰撞框应覆盖实体主体，不覆盖透明装饰和远端能量光效。
- placeholder 也使用未来单位的目标尺寸，提前验证战场占位和碰撞手感。

## 6. 朝向标准

常规敌机当前从画面右侧进入并向左飞行。

- 标准俯视飞机源图：机头朝上，运行时默认旋转 `-Math.PI / 2`。
- 已经朝左绘制的素材：`drawAngle`为 0。
- 旋转对称设施可以不强调机头，但必须有明确悬浮结构。
- 每个条目单独保存角度，不允许渲染器按文件名猜方向。

## 7. 飞行合理性标准

飞机类必须具备：

- 明确的机头和前进方向。
- 连贯机身和可解释的内部重心。
- 左右机翼或等效升力/姿态控制结构。
- 尾部或侧后的推进器。
- 武器挂点可以不对称，但机体不能像多个头随意拼接。

非飞机 BOSS允许：

- 空战机甲：背包、肩部、腿部或裙甲推进器。
- 浮空炮台/设施：反重力环、悬浮引擎、拖航装置。
- 生化飞行体：翼膜、喷射囊、孢子推进器、母舰牵引组织。
- 母舰内部结构：固定在舱壁或核心腔体，通过场景移动表现相对运动。

不允许：

- 为了显得巨大堆砌四个、五个、七个无功能“头”。
- 飞机左右结构失衡且没有剧情/功能解释。
- 只有正面怪物头像，没有飞行或悬浮结构。
- 大图细节丰富，但缩到 50 像素后无法辨认机头和轮廓。

## 8. 章节视觉方向

| 章节 | 主要轮廓和材质 |
|---|---|
| 序章 | 蓝白训练设备逐渐被红黑侵蚀 |
| 第一章 | 城市路障、信标、外环哨塔、轻型包围编队 |
| 第二章 | 厚重甲片、盾面、冲角、重型推进器 |
| 第三章 | 废弃星港、锈蚀舱体、导航灯、牵引结构 |
| 第四章 | 折光面板、护盾环、充能中继、楔形冲锋机 |
| 第五章 | 精英舰队、节拍灯、爆雷挂架、指挥天线 |
| 第六章 | 舰队级炮管、狙击传感器、护航巡洋轮廓 |
| 第七章 | 母舰装甲、巨盾、反应炉、骨架支撑结构 |
| 第八章 | 旋翼、补给拖架、分裂弹巢、移动基地模块 |
| 第九章 | 母舰内壁、生化草母、潮汐组织、弥赛亚机甲与女王核心 |

## 9. 加载和性能

- 进入关卡只预加载本关 2–3 个小怪、1–3 个普通敌机、0–2 个精英和 1 个 BOSS。
- 图鉴只加载当前打开的章节和当前关卡。
- 不在大厅启动时加载 173 个图片对象。
- 图片 URL 继续由 `src/shared/assets.js`的运行时基地址逻辑产生，不能硬编码 `file://`或开发机绝对路径。
- 同一 fallback URL应复用图片缓存。

## 10. 美术后续替换流程

未来替换单个单位时只需要：

1. 把正式透明 PNG 放到 `expectedSrc`对应位置。
2. 检查实际游戏尺寸轮廓。
3. 校准 `drawWidth`、`drawHeight`、角度和碰撞框。
4. 把 `artStatus`从 `placeholder`改为 `final`。
5. 运行素材存在性测试和关键关卡冒烟。

不应再修改单位 ID、关卡阵容或图鉴名称。
