# 子UI与小UI资源接入说明给Codex

## 1. 本次要接入的资源是什么

这次一共接入 9 张图：

### 8 张子UI参考图

1. 任务子UI参考图  
2. 成就子UI参考图  
3. 排行榜子UI参考图  
4. 战机仓库子UI参考图  
5. 战姬子UI参考图  
6. 战机升级子UI参考图  
7. 商店子UI参考图  
8. 好友子UI参考图  

### 1 张小UI参考图

9. 白底小UI图标总表参考图  

---

## 2. 这些图的正确用途

这些图的用途是：

```text
参考视觉风格
参考布局结构
参考面板层级
参考按钮与发光质感
参考列表结构
参考图标风格
```

这些图不是直接写死逻辑数据的依据。

不能直接照抄图中的：

```text
任务名称
任务奖励数值
排行榜玩家名
排行榜战力
商店商品价格
商店商品名称
战机具体属性值
角色具体名字
好友具体列表数据
```

也就是说：

```text
参考样式，不参考具体内容。
```

---

## 3. 子UI应该怎么接入

8 个子UI界面都应走同一种思路：

```text
界面结构参考图
实际内容走数据驱动
```

推荐做法：

```text
任务：任务列表数据来自 task system
成就：成就列表数据来自 achievement system
排行榜：排行数据来自 ranking system
战机仓库：战机列表来自 fighter inventory
战姬：战姬列表来自 pilot inventory
战机升级：升级信息来自 fighter upgrade system
商店：商品列表来自 shop config
好友：好友数据来自 friend system
```

也就是说，图只负责：

```text
这个界面长什么样
```

系统数据负责：

```text
这个界面显示什么内容
```

---

## 4. 小UI应该怎么接入

那张白底小UI总表图，不建议整张直接拿来上屏。

正确做法是：

```text
先保留整张图作为样式参考板
然后把里面的小元素按功能拆成独立资源
再在运行时按键名调用
```

例如拆成：

```text
gold.png
diamond.png
stamina.png
crown_3_color.png
crown_3_gold.png
star_3_gold.png
prop_energy_core.png
prop_advanced_computer.png
prop_weapon_module.png
extra_gold_reward.png
honor_lv1.png
...
honor_lv10.png
rarity_s.png
rarity_a.png
rarity_b.png
notification_dot.png
locked.png
mail.png
friend.png
shop.png
reward_chest.png
warning.png
upgrade_ticket.png
btn_start_battle.png
btn_claim.png
```

---

## 5. 为什么要这样做

因为如果把整张大图直接拿来当运行时图标，会有几个问题：

```text
1. 无法灵活复用
2. 不能按需替换
3. 不利于适配不同分辨率
4. 不利于后面增加新图标
5. 不利于程序动态渲染
```

所以正确方案是：

```text
大图做参考
小图做运行时资源
```

---

## 6. 代码文档里已经给了什么

上一份代码 md 里已经给了这几部分：

### A. 安装脚本

```text
uiAssetInstall.mjs
```

作用：

```text
把 9 张图复制到项目目录
```

### B. 资源注册表

```text
uiAssetRegistry.js
```

作用：

```text
注册 8 个子UI参考图
注册 1 个小UI参考图
注册运行时主题颜色、按钮、描边、发光风格
```

### C. 子UI挂载配置

```text
subUiMountConfig.js
```

作用：

```text
定义 task / achievement / ranking / hangar / pilot / upgrade / shop / friend 的挂载结构
```

### D. 小UI运行时注册表

```text
smallUiRuntimeRegistry.js
```

作用：

```text
定义小UI键名和运行时资源路径
```

### E. 样式只读规则

```text
uiStyleOnlyRules.js
```

作用：

```text
明确允许参考什么
明确禁止参考什么
```

### F. 使用示例

```text
exampleUiMountUsage.js
exampleRuntimeData.js
```

作用：

```text
演示如何用真实系统数据去驱动这些子UI
```

---

## 7. Codex 接入时必须遵守的原则

### 原则 1：不能把参考图里的内容写死

例如任务界面里显示过：

```text
某个具体任务名
某个具体奖励值
```

这不能写死。

正确做法：

```text
任务名来自任务系统配置
奖励来自任务系统配置
```

### 原则 2：排行榜不许写死示例玩家

图里出现的：

```text
玩家名字
排名
战力
章节进度
```

全部只能当占位示例。

正确做法：

```text
运行时读取排行榜数据动态渲染
```

### 原则 3：商店价格不能取图里的数字

图里的数字只是视觉示例。

正确做法：

```text
商店价格读取你前面已经定好的价格配置 md
```

### 原则 4：成就、任务奖励不能取图里的内容

图里只是视觉占位。

正确做法：

```text
成就奖励读取 achievement system
任务奖励读取 task system
```

### 原则 5：战机、战姬属性不能取图里的数值

正确做法：

```text
战机属性读取 fighter system
战姬属性读取 pilot system
```

---

## 8. 推荐的项目目录结构

推荐这样放：

```text
src/
  assets/
    ui_reference/
      sub_ui/
        task_reference.png
        achievement_reference.png
        ranking_reference.png
        hangar_reference.png
        pilot_reference.png
        upgrade_reference.png
        shop_reference.png
        friend_reference.png
      small_ui/
        small_ui_reference_sheet.png
    ui_runtime/
      icons/
        gold.png
        diamond.png
        stamina.png
        ...
  ui/
    uiAssetRegistry.js
    subUiMountConfig.js
    smallUiRuntimeRegistry.js
    uiStyleOnlyRules.js
    exampleUiMountUsage.js
```

---

## 9. 接入顺序建议

推荐顺序：

### 第一步

先执行安装脚本：

```bash
node uiAssetInstall.mjs
```

### 第二步

在项目里注册：

```text
uiAssetRegistry.js
subUiMountConfig.js
smallUiRuntimeRegistry.js
```

### 第三步

任务、成就、商店、好友等界面改为：

```text
数据驱动渲染
```

### 第四步

把白底小UI总表图里的元素逐个拆成小图，放入：

```text
src/assets/ui_runtime/icons/
```

### 第五步

运行时所有图标统一通过：

```js
getSmallUiAsset(key)
```

来读取。

---

## 10. 最终接入目标

最终目标不是“把这几张图当成死图贴上去”，而是：

```text
用这些图统一整个游戏UI风格
让所有子UI看起来和主UI一致
让所有内容都能由系统动态刷新
让任务/成就/排行榜/商店/仓库/好友等模块全部可维护
```

---

## 11. Codex 禁止事项

Codex 不要做下面这些事：

```text
不要把图里的示例奖励写死
不要把图里的示例商品价格写死
不要把图里的示例排行榜写死
不要把图里的示例角色名写死
不要把整张小UI图直接当作所有图标运行时贴图
不要让子UI只是一张静态图片而不能动态刷新数据
```

---

## 12. 一句话执行标准

一句话执行标准：

```text
子UI参考整张图的结构和风格；
小UI参考白底总表的图标风格；
实际显示内容全部来自游戏系统数据，而不是来自参考图本身。
```
