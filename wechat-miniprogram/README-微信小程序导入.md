# 微信小程序版本说明

## 工程目录

微信小程序工程目录：

`E:\JT\20260618-游戏\wechat-miniprogram`

用微信开发者工具导入项目时，项目目录选择这个文件夹。

## 当前已完成

- 已创建可导入的微信小程序工程结构。
- 已完成大厅页面 `pages/lobby/lobby`。
- 左上角头像、名字、等级、经验、徽章已做成变量。
- 右上角体力、金币、钻石已做成变量；体力默认 120/120，金币和钻石默认从 0 开始。
- 大厅每个入口都可以点击进入对应占位界面。
- 中间助理已预留为可替换变量，当前使用主 UI 背景中的助理形象作为展示，点击助理会问候玩家。
- “开始战斗”会进入关卡选择。
- 已完成微信 Canvas 竖屏战斗页 `pages/battle/battle`。
- 战斗页包含 60 秒割草阶段、Boss 战、密集但可躲避弹幕、胜负状态和金币奖励。
- 玩家首次战败会获得一次复活机会，复活后攻击力提升 10 倍，并获得 20 秒无敌时间。
- 战斗结束后会回到主 UI，大厅金币变量会同步更新。

## 页面结构

```text
app.json
app.js
app.wxss
project.config.json

pages/lobby/      大厅 UI
pages/battle/     关卡选择与 Canvas 战斗
pages/feature/    任务、活动、商店、设置等通用占位界面
utils/profile.js  玩家资料、资源、关卡进度、本地存档
assets/images/    小程序轻量素材
```

## 导入方式

1. 打开微信开发者工具。
2. 选择“导入项目”。
3. 项目目录选择：

   `E:\JT\20260618-游戏\wechat-miniprogram`

4. AppID 可以先使用测试号或游客模式，后续替换成正式小程序 AppID。
5. 导入后默认进入大厅页面。

## 后续素材填充

目前素材已压缩为轻量版，方便小程序导入和预览。

后续如果要替换素材，优先替换：

- `assets/images/lobby-overview-lite.jpg`
- `assets/images/main-ui-portrait-lite.jpg`
- `assets/images/pilot-lite.jpg`
- `assets/images/player-ship-lite.png`
- `assets/images/enemy-small-01-lite.png`
- `assets/images/boss-lite.png`

中间助理的独立替换图必须使用透明底 PNG。不要使用白底 JPG/PNG 作为助理贴图。

如果使用高清大图，建议压缩后放入小程序包，或者放到云存储/CDN，再在代码里换成网络地址。

## 支付和充值说明

体力、金币、钻石现在已经是变量。

充值支付暂未接真实微信支付接口。后续接入时，建议把支付逻辑放到原生小程序页面里，通过后端下单，再调用微信支付能力，支付成功后更新 `utils/profile.js` 里的资源数据。
