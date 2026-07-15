(function registerAssets(root) {
  const scope = root.RXGame || (root.RXGame = {});

  const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 128 128'%3E%3Cdefs%3E%3ClinearGradient id='a' x1='18' x2='110' y1='14' y2='116' gradientUnits='userSpaceOnUse'%3E%3Cstop stop-color='%2343c8ff'/%3E%3Cstop offset='1' stop-color='%23ffd166'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='128' height='128' fill='%23071422'/%3E%3Ccircle cx='64' cy='64' r='48' fill='url(%23a)' opacity='.16'/%3E%3Cpath fill='%23d9f5ff' d='M17 67 57 47l54 17-41 10-12 24-8-21-33-10z'/%3E%3Cpath fill='%2343c8ff' d='M57 47 70 74l-12 24-8-21-33-10z' opacity='.72'/%3E%3Ccircle cx='72' cy='64' r='5' fill='%23ffd166'/%3E%3C/svg%3E";
  const DEFAULT_PILOT_ID = "pilot-b-linzhihan";
  const DEFAULT_SHIP_ID = "ship-b-01";
  const DEFAULT_BACKGROUND_ID = "bg-hangar-01";
  const LOBBY_REFERENCE = Object.freeze({ width: 1600, height: 900 });
  const pagePath = root.location?.pathname ? decodeURIComponent(root.location.pathname).replace(/\\/g, "/") : "";
  const runtimeRelativeBase = /(?:^|\/)src\/h5(?:\/|$)/i.test(pagePath) ? "../../assets/runtime/" : "assets/runtime/";
  const runtimeBase = root.location?.href ? new URL(runtimeRelativeBase, root.location.href).href : runtimeRelativeBase;
  const runtimeAsset = (group, file) => runtimeBase + group + "/" + file;
  const shipLobbyAsset = (file) => runtimeAsset("ships/lobby", file);
  const shipBattleAsset = (file) => runtimeAsset("ships/battle", file);
  const enemyCodexAsset = (file) => runtimeAsset("enemies/codex", file);
  const enemyBattleAsset = (file) => runtimeAsset("enemies/battle", file);
  const enemyBulletAsset = (file) => runtimeAsset("enemies/bullets", file);
  const uiHudAsset = (file) => runtimeAsset("ui/a-hud", file);
  const uiHudV5Asset = (file) => runtimeAsset("ui/a-hud-v5", file);
  const uiLobbyIconAsset = (file) => runtimeAsset("ui/lobby-icons", file);

  const RANK_DAMAGE = {
    pilot: { SS: 60, S: 55, A: 50, B: 45 },
    ship: { SSS: 120, SS: 112, S: 106, A: 100, B: 90 }
  };

  const RANK_HP = {
    pilot: { SS: 38, S: 30, A: 20, B: 10 },
    ship: { SSS: 72, SS: 66, S: 60, A: 45, B: 30 }
  };

  const DEFAULT_LOBBY_POSES = {
    pilot: {
      left: "300px",
      width: "560px",
      opacity: "1",
      translateX: "-50%",
      translateY: "0",
      rotate: "0deg",
      scale: "1"
    },
    ship: {
      left: "820px",
      top: "430px",
      width: "900px",
      height: "390px",
      opacity: "0.82",
      translateX: "-50%",
      translateY: "-50%",
      rotate: "0deg",
      scale: "1"
    }
  };

  const PILOT_LOBBY_POSES = {
    "pilot-s-lingyan": { left: "300px", width: "560px" },
    "pilot-s-luoqi": { left: "298px", width: "560px" },
    "pilot-a-yelan": { left: "298px", width: "560px" },
    "pilot-a-luofeiyin": { left: "300px", width: "560px" },
    "pilot-a-shenyao": { left: "300px", width: "560px" },
    "pilot-b-shenqingyao": { left: "306px", width: "580px" },
    "pilot-b-bailing": { left: "300px", width: "560px" },
    "pilot-b-linzhihan": { left: "292px", width: "590px" },
    "pilot-b-sumianxing": { left: "302px", width: "560px" },
    "pilot-b-xingtao": { left: "300px", width: "560px" }
  };

  const SHIP_LOBBY_POSES = {
    "ship-s-09": { left: "820px", top: "430px", width: "940px", height: "370px", opacity: "0.84" },
    "ship-s-08": { left: "820px", top: "430px", width: "930px", height: "370px", opacity: "0.84" },
    "ship-b-04": { left: "820px", top: "430px", width: "920px", height: "380px", opacity: "0.84" },
    "ship-a-07": { left: "820px", top: "435px", width: "890px", height: "400px", opacity: "0.84" },
    "ship-a-06": { left: "820px", top: "430px", width: "900px", height: "390px", opacity: "0.84" },
    "ship-b-02": { left: "820px", top: "435px", width: "850px", height: "420px", opacity: "0.84" },
    "ship-b-01": { left: "820px", top: "430px", width: "900px", height: "390px", opacity: "0.84" },
    "ship-b-03": { left: "820px", top: "430px", width: "900px", height: "390px", opacity: "0.84" },
    "ship-b-05": { left: "820px", top: "430px", width: "930px", height: "370px", opacity: "0.84" }
  };

  const PILOT_ASSETS = [
    { id: "pilot-s-lingyan", rank: "S", name: "\u51cc\u7130", codeName: "\u8d64\u7130", description: "\u91cd\u706b\u529b\u738b\u724c\u6218\u59ec\uff0c\u9002\u5408\u9ad8\u538b BOSS \u6218\u548c\u540e\u671f\u6838\u5fc3\u7a81\u7834\u3002", story: "\u65e7\u661f\u6e2f\u64a4\u79bb\u6218\u4e2d\uff0c\u5979\u72ec\u81ea\u5b88\u4f4f\u6700\u540e\u4e00\u6761\u64a4\u79bb\u822a\u7ebf\uff0c\u56e0\u6b64\u88ab\u7f16\u5165\u6838\u5fc3\u7a81\u51fb\u5e8f\u5217\u3002", src: runtimeAsset("pilots", "pilot-09.png") },
    { id: "pilot-s-luoqi", rank: "S", name: "\u6d1b\u7eee", codeName: "\u91d1\u7fbd", description: "\u7cbe\u82f1\u538b\u5236\u578b\u6218\u59ec\uff0c\u517c\u5177\u9ad8\u7a7f\u900f\u4e0e\u7a33\u5b9a\u8f93\u51fa\u80fd\u529b\u3002", story: "\u5979\u66fe\u662f\u8230\u961f\u8bd5\u98de\u7ec4\u7684\u738b\u724c\u8bb0\u5f55\u5458\uff0c\u4e60\u60ef\u7528\u6700\u77ed\u822a\u7ebf\u7ed3\u675f\u6700\u590d\u6742\u7684\u6218\u6597\u3002", src: runtimeAsset("pilots", "pilot-10.png") },
    { id: "pilot-a-yelan", rank: "S", name: "\u591c\u5c9a", codeName: "\u7d2b\u7535", description: "\u9ad8\u901f\u7a81\u88ad\u578b\u6218\u59ec\uff0c\u64c5\u957f\u5feb\u901f\u7a7f\u63d2\u4e0e\u7a81\u7834\u91cd\u7532\u9632\u7ebf\u3002", story: "\u591c\u5c9a\u5728\u6df1\u7a7a\u4fa6\u5bdf\u961f\u6210\u540d\uff0c\u9760\u8fd1\u8ddd\u79bb\u7a81\u5165\u548c\u6781\u9650\u89c4\u907f\u6495\u5f00\u654c\u519b\u9635\u578b\u3002", src: runtimeAsset("pilots", "pilot-03.png") },
    { id: "pilot-a-luofeiyin", rank: "A", name: "\u6d1b\u7eef\u97f3", codeName: "\u7eef\u7fbd", description: "\u673a\u52a8\u538b\u5236\u578b\u6218\u59ec\uff0c\u64c5\u957f\u5728\u4e2d\u671f\u63a8\u8fdb\u4e2d\u7a33\u5b9a\u6495\u5f00\u654c\u65b9\u9635\u7ebf\u3002", story: "\u5979\u51fa\u8eab\u8fb9\u5883\u62a4\u822a\u961f\uff0c\u64c5\u957f\u5728\u6df7\u4e71\u5f39\u5e55\u4e2d\u7ed9\u961f\u53cb\u5f00\u51fa\u7a33\u5b9a\u7a97\u53e3\u3002", src: runtimeAsset("pilots", "pilot-01.png") },
    { id: "pilot-a-shenyao", rank: "A", name: "\u6c88\u66dc", codeName: "\u663c\u661f", description: "\u706b\u529b\u6307\u6325\u578b\u6218\u59ec\uff0c\u9002\u5408\u6301\u7eed\u538b\u5236\u7cbe\u82f1\u654c\u673a\u4e0e\u62a4\u76fe\u76ee\u6807\u3002", story: "\u6c88\u66dc\u8d1f\u8d23\u8fc7\u591a\u6b21\u706b\u63a7\u6821\u51c6\u4efb\u52a1\uff0c\u6218\u573a\u4e0a\u4e60\u60ef\u5148\u5224\u65ad\u8282\u594f\u518d\u96c6\u4e2d\u706b\u529b\u3002", src: runtimeAsset("pilots", "pilot-02.png") },
    { id: "pilot-b-shenqingyao", rank: "A", name: "\u6c88\u6e05\u66dc", codeName: "\u51b7\u6708", description: "\u5747\u8861\u652f\u63f4\u578b\u6218\u59ec\uff0c\u9002\u5408\u65e9\u671f\u5173\u5361\u7684\u7a33\u6b65\u63a8\u8fdb\u3002", story: "\u5979\u662f\u5b66\u9662\u51fa\u8eab\u7684\u51b7\u9759\u6d3e\u961f\u957f\uff0c\u64c5\u957f\u7528\u6807\u51c6\u52a8\u4f5c\u628a\u4f4e\u98ce\u9669\u6536\u76ca\u505a\u5230\u6781\u81f4\u3002", src: runtimeAsset("pilots", "pilot-06.png") },
    { id: "pilot-b-bailing", rank: "B", name: "\u767d\u51cc", codeName: "\u94f6\u96bc", description: "\u7cbe\u51c6\u4f5c\u6218\u578b\u6218\u59ec\uff0c\u9002\u5408\u5e8f\u7ae0\u5230\u7b2c\u4e00\u7ae0\u7684\u7a33\u5b9a\u8bad\u7ec3\u3002", story: "\u767d\u51cc\u4ece\u9776\u573a\u6559\u5b98\u8f6c\u5165\u5b9e\u6218\uff0c\u6700\u64c5\u957f\u8ba9\u65b0\u4eba\u770b\u61c2\u5f39\u9053\u548c\u5c04\u51fb\u8282\u62cd\u3002", src: runtimeAsset("pilots", "pilot-04.png") },
    { id: "pilot-b-linzhihan", rank: "B", name: "\u6797\u77e5\u5bd2", codeName: "\u84dd\u9e22", description: "\u51b7\u9759\u9632\u5b88\u578b\u6218\u59ec\uff0c\u80fd\u5e2e\u52a9\u65b0\u624b\u719f\u6089\u57fa\u7840\u706b\u63a7\u8282\u594f\u3002", story: "\u5979\u4e60\u60ef\u628a\u6bcf\u6b21\u6218\u6597\u62c6\u6210\u6e05\u6670\u6b65\u9aa4\uff0c\u7528\u7a33\u5b9a\u9632\u5b88\u6362\u53d6\u53cd\u51fb\u65f6\u673a\u3002", src: runtimeAsset("pilots", "pilot-05.png") },
    { id: "pilot-b-sumianxing", rank: "B", name: "\u82cf\u7ef5\u661f", codeName: "\u7ef5\u661f", description: "\u65b0\u624b\u652f\u63f4\u578b\u6218\u59ec\uff0c\u63d0\u4f9b\u5e73\u987a\u7684\u57fa\u7840\u6218\u6597\u624b\u611f\u3002", story: "\u82cf\u7ef5\u661f\u8d1f\u8d23\u65b0\u5175\u9002\u5e94\u8bad\u7ec3\uff0c\u6e29\u548c\u7684\u8282\u594f\u80fd\u8ba9\u57fa\u7840\u64cd\u4f5c\u66f4\u5bb9\u6613\u6210\u578b\u3002", src: runtimeAsset("pilots", "pilot-07.png") },
    { id: "pilot-b-xingtao", rank: "B", name: "\u661f\u6843", codeName: "\u6843\u661f", description: "\u7075\u5de7\u4fa6\u5bdf\u578b\u6218\u59ec\uff0c\u9002\u5408\u719f\u6089\u654c\u673a\u5f39\u5e55\u4e0e\u62fe\u53d6\u8def\u7ebf\u3002", story: "\u661f\u6843\u6765\u81ea\u4fa6\u5bdf\u5c0f\u961f\uff0c\u559c\u6b22\u63d0\u524d\u6807\u51fa\u8865\u7ed9\u8def\u7ebf\uff0c\u518d\u7528\u7075\u5de7\u673a\u52a8\u5b8c\u6210\u56de\u6536\u3002", src: runtimeAsset("pilots", "pilot-08.png") }
  ].map((item) => ({
    ...item,
    damage: RANK_DAMAGE.pilot[item.rank],
    hp: RANK_HP.pilot[item.rank],
    lobbyPose: { ...DEFAULT_LOBBY_POSES.pilot, ...(PILOT_LOBBY_POSES[item.id] || {}), ...(item.lobbyPose || {}) }
  }));

  const SHIP_ASSETS = [
    { id: "ship-s-09", rank: "S", name: "苍穹零式", codeName: "星链", primaryWeapon: "laser", description: "旗舰原型机，蓝白能量导流覆盖全机，适合高压清场与 BOSS 输出。", activeSkillId: "sky-lock-beam", decisiveCommandEffect: { id: "stellar-beam", name: "星链贯星炮", description: "释放贯穿光束，清直线敌机并压制 BOSS。", damageMultiplier: 4.8 }, src: shipLobbyAsset("ship-lobby-09.png"), battleSrc: shipBattleAsset("ship-battle-tech-09.png") },
    { id: "ship-s-08", rank: "S", name: "黑曜幽影", codeName: "暗核", primaryWeapon: "missile", description: "重型隐袭轰击机，黑色装甲与宽翼结构适合深空突防。", activeSkillId: "obsidian-gravity-well", decisiveCommandEffect: { id: "dark-core", name: "暗核坍缩弹", description: "投放暗核爆点，吸附附近目标后爆炸清场。", damageMultiplier: 3.6 }, src: shipLobbyAsset("ship-lobby-08.png"), battleSrc: shipBattleAsset("ship-battle-tech-08.png") },
    { id: "ship-b-04", rank: "S", name: "金矢裁决", codeName: "金矢", primaryWeapon: "spread", description: "金色精密截击机，短爆发窗口强，适合压制高护甲目标。", activeSkillId: "gold-judgement-buff", decisiveCommandEffect: { id: "golden-lances", name: "金矢裁决阵", description: "释放多枚贯穿金矛，短时间破甲并穿透多目标。", damageMultiplier: 3.8 }, src: shipLobbyAsset("ship-lobby-05.png"), battleSrc: shipBattleAsset("ship-battle-tech-05.png") },
    { id: "ship-a-07", rank: "A", name: "白昼指挥", codeName: "白昼", primaryWeapon: "laser", description: "指挥级白色战机，传感器与装甲层级更高，适合稳定推进。", src: shipLobbyAsset("ship-lobby-07.png"), battleSrc: shipBattleAsset("ship-battle-tech-07.png") },
    { id: "ship-a-06", rank: "A", name: "银翼06", codeName: "银翼", primaryWeapon: "spread", description: "均衡型主力战机，火力、破甲和操控稳定，是长期出战基准。", src: shipLobbyAsset("ship-lobby-01.png"), battleSrc: shipBattleAsset("ship-battle-tech-01.png") },
    { id: "ship-b-02", rank: "A", name: "赤枪03", codeName: "赤枪", primaryWeapon: "missile", description: "红色突击战机，挂点强化明显，适合中距离持续压制。", src: shipLobbyAsset("ship-lobby-03.png"), battleSrc: shipBattleAsset("ship-battle-tech-03.png") },
    { id: "ship-b-01", rank: "B", name: "蓝隼01", codeName: "蓝隼", primaryWeapon: "laser", description: "轻型高速截击机，适合快速入场和干净规避。", src: shipLobbyAsset("ship-lobby-02.png"), battleSrc: shipBattleAsset("ship-battle-tech-02.png") },
    { id: "ship-b-03", rank: "B", name: "绿堡04", codeName: "绿堡", primaryWeapon: "spread", description: "装甲支援战机，机体稳定，适合稳扎稳打的推进节奏。", src: shipLobbyAsset("ship-lobby-04.png"), battleSrc: shipBattleAsset("ship-battle-tech-04.png") },
    { id: "ship-b-05", rank: "B", name: "紫影05", codeName: "紫影", primaryWeapon: "missile", description: "低轮廓隐身战机，速度感强，适合练习穿插和补给回收。", src: shipLobbyAsset("ship-lobby-06.png"), battleSrc: shipBattleAsset("ship-battle-tech-06.png") }
  ].map((item) => {
    const exclusiveSkill = item.activeSkillId && scope.shipSkills && scope.shipSkills.getActiveSkill
      ? scope.shipSkills.getActiveSkill(item.activeSkillId)
      : null;
    return {
      ...item,
      lobbySrc: item.lobbySrc || item.src,
      primaryWeapon: item.primaryWeapon || "spread",
      activeSkills: exclusiveSkill ? [exclusiveSkill] : [],
      decisiveCommandEffect: item.decisiveCommandEffect || null,
      battleScale: item.battleScale || 1,
      battleWidth: item.battleWidth || 110,
      battleHeight: item.battleHeight || 86,
      battleRotation: item.battleRotation || 0,
      damage: RANK_DAMAGE.ship[item.rank],
      hp: RANK_HP.ship[item.rank],
      lobbyPose: { ...DEFAULT_LOBBY_POSES.ship, ...(SHIP_LOBBY_POSES[item.id] || {}), ...(item.lobbyPose || {}) }
    };
  });

  const BACKGROUND_ASSETS = [
    { id: DEFAULT_BACKGROUND_ID, rank: "BASE", name: "\u661f\u6e2f\u5927\u5385", src: runtimeAsset("backgrounds", "lobby-command-cockpit-a.png") }
  ];

  const UI_A_HUD_ASSETS = {
    panelFrame: uiHudAsset("panel-frame.png"),
    dockFrame: uiHudAsset("dock-frame.png"),
    routeFrame: uiHudAsset("route-frame.png"),
    railFrame: uiHudAsset("rail-frame.png"),
    rewardDock: uiHudAsset("reward-dock.png"),
    panelTexture: uiHudAsset("panel-texture.png"),
    iconSprite: uiHudAsset("icon-sprite.png"),
    gachaBanner: uiHudAsset("gacha-banner.png"),
    gachaMachine: uiHudAsset("gacha-machine.png"),
    gachaCurrency: uiHudAsset("gacha-currency.png"),
    gachaTenPull: uiHudAsset("gacha-ten-pull.png"),
    gachaCardBlue: uiHudAsset("gacha-card-blue.png"),
    gachaCardPurple: uiHudAsset("gacha-card-purple.png"),
    gachaCardGold: uiHudAsset("gacha-card-gold.png"),
    gachaAircraftCard: uiHudAsset("gacha-aircraft-card.png"),
    gachaBurst: uiHudAsset("gacha-burst.png"),
    gachaProbability: uiHudAsset("gacha-probability.png"),
    qrPlaceholder: uiHudAsset("qr-placeholder.png"),
    resourceCapsule: uiHudAsset("resource-capsule.png"),
    starWingsButton: uiHudAsset("star-wings-button.png"),
    contactButton: uiHudAsset("contact-button.png"),
    quickIcons: uiHudAsset("quick-icons.png"),
    chatStrip: uiHudAsset("chat-strip.png"),
    contactPanel: uiHudAsset("contact-panel.png"),
    v5TopCrest: uiHudV5Asset("v5-top-crest.png"),
    lobbyFrameWide: uiHudV5Asset("v5-menu-tile-clean-alpha.png"),
    lobbyFrameEntry: uiHudV5Asset("v5-left-tile-alpha.png"),
    lobbyFrameTile: uiHudV5Asset("v5-menu-tile-clean-alpha.png"),
    lobbyFrameContact: uiHudV5Asset("v6-contact-card-alpha.png"),
    lobbyFrameBattle: uiHudV5Asset("v6-start-button-alpha.png"),
    lobbyFrameChat: uiHudV5Asset("v5-chat-strip.png"),
    lobbyPromoArt: uiHudAsset("star-wings-promo-v2.png"),
    featurePilotIcon: uiHudV5Asset("feature-pilot-panel.png"),
    featureFighterIcon: uiHudV5Asset("feature-fighter-panel.png"),
    featureUpgradeIcon: uiHudV5Asset("feature-upgrade-panel.png"),
    featureCodexIcon: uiHudV5Asset("feature-codex-panel.png"),
    menuTaskIcon: uiLobbyIconAsset("menu-task.png"),
    menuEventIcon: uiLobbyIconAsset("menu-event.png"),
    menuAchievementIcon: uiLobbyIconAsset("menu-achievement.png"),
    menuShopIcon: uiLobbyIconAsset("menu-shop.png"),
    menuRankingIcon: uiLobbyIconAsset("menu-ranking.png"),
    menuChatIcon: uiLobbyIconAsset("menu-chat.png"),
    quickMailIcon: uiLobbyIconAsset("quick-mail.png"),
    quickSigninIcon: uiLobbyIconAsset("quick-signin.png"),
    quickFriendIcon: uiLobbyIconAsset("quick-friend.png"),
    quickSettingIcon: uiLobbyIconAsset("quick-setting.png"),
    pilotHonorIcon: uiLobbyIconAsset("contact-emblem.png"),
    contactEmblemIcon: uiLobbyIconAsset("contact-emblem.png"),
    resourceEnergyIcon: uiLobbyIconAsset("resource-energy.png"),
    resourceGoldIcon: uiLobbyIconAsset("resource-gold.png")
  };

  const shopItemAsset = (file) => runtimeAsset("ui/shop-items", file);
  const SHOP_ITEM_ASSETS = {
    daily_free_supply: shopItemAsset("daily-free-supply.png"),
    energy_small: shopItemAsset("energy-small.png"),
    energy_large: shopItemAsset("energy-large.png"),
    gold_small: shopItemAsset("gold-small.png"),
    gold_medium: shopItemAsset("gold-medium.png"),
    gold_large: shopItemAsset("gold-large.png"),
    attack_pack: shopItemAsset("attack-pack.png"),
    armor_pack: shopItemAsset("armor-pack.png"),
    pierce_pack: shopItemAsset("pierce-pack.png"),
    upgrade_bundle: shopItemAsset("upgrade-bundle.png"),
    starlink_ticket: shopItemAsset("starlink-ticket.png"),
    starlink_ten: shopItemAsset("starlink-ten.png"),
    silver_wing_box: shopItemAsset("silver-wing-box.png"),
    s_pilot_token: shopItemAsset("s-pilot-token.png"),
    s_fighter_token: shopItemAsset("s-fighter-token.png")
  };

  const FEATURE_PANEL_ASSETS = {
    eventHero: runtimeAsset("ui/feature-panels", "event-starport-breakthrough.png"),
    contactQr: runtimeAsset("ui/contact", "wechat-qr.jpg")
  };

  const CHAPTER_COVER_ASSETS = Array.from({ length: 10 }, (_, index) => ({
    chapterIndex: index,
    src: runtimeAsset("chapter-covers", "chapter-" + String(index).padStart(2, "0") + ".png")
  }));

  const chapterSelectAsset = (file) => runtimeAsset("ui/chapter-select-v2", file);
  const CHAPTER_SELECT_ASSETS = {
    screenShell: chapterSelectAsset("screen-shell.png"),
    headerFrame: chapterSelectAsset("chapter-header-frame.png"),
    detailFrame: chapterSelectAsset("chapter-detail-frame.png"),
    crest: chapterSelectAsset("chapter-crest-gold.png"),
    icons: chapterSelectAsset("chapter-select-icons.svg"),
    tabs: {
      normal: chapterSelectAsset("tab-normal.png"),
      active: chapterSelectAsset("tab-active.png"),
      locked: chapterSelectAsset("tab-locked.png")
    },
    nodes: {
      normal: chapterSelectAsset("node-normal.png"),
      active: chapterSelectAsset("node-active.png"),
      locked: chapterSelectAsset("node-locked.png"),
      boss: chapterSelectAsset("node-boss.png")
    },
    buttons: {
      secondary: chapterSelectAsset("button-secondary.png"),
      primary: chapterSelectAsset("button-primary.png"),
      disabled: chapterSelectAsset("button-disabled.png")
    },
    routes: Array.from({ length: 10 }, (_, index) => chapterSelectAsset("routes/route-" + String(index).padStart(2, "0") + ".webp"))
  };

  const ASSET_PATHS = {
    player: runtimeAsset("characters", "player.png"),
    boss: runtimeAsset("characters", "boss.png"),
    smallEnemies: [
      runtimeAsset("enemies", "enemy-small-01.png"),
      runtimeAsset("enemies", "enemy-small-02.png"),
      runtimeAsset("enemies", "enemy-small-03.png")
    ],
    eliteEnemies: [
      runtimeAsset("enemies", "enemy-elite-01.png"),
      runtimeAsset("enemies", "enemy-elite-02.png")
    ],
    enemySprites: {
      small: [enemyBattleAsset("enemy-battle-scout-01.png")],
      scout: [enemyBattleAsset("enemy-battle-scout-01.png")],
      shooter: [enemyBattleAsset("enemy-battle-shooter-01.png")],
      shield: [enemyBattleAsset("enemy-battle-shield-01.png")],
      charger: [enemyBattleAsset("enemy-battle-charger-01.png")],
      bomber: [enemyBattleAsset("enemy-battle-bomber-01.png")],
      sniper: [enemyBattleAsset("enemy-battle-sniper-01.png")],
      guard: [enemyBattleAsset("enemy-battle-guard-01.png")],
      rotor: [enemyBattleAsset("enemy-battle-rotor-01.png")],
      core: [enemyBattleAsset("enemy-battle-core-01.png")],
      elite: [enemyBattleAsset("enemy-battle-core-01.png"), enemyBattleAsset("enemy-battle-guard-01.png")]
    }
  };

  const BOSS_VISUALS = {
    1: { id: "messiah-observer", title: "弥赛亚·观测投影节点", src: runtimeAsset("bosses", "chapter-01-messiah-observer.png"), drawWidth: 210, drawHeight: 235, hitRadiusX: 76, hitRadiusY: 96, drawAngle: 0 },
    2: { id: "armored-beast", title: "玄甲空兽", src: runtimeAsset("bosses", "chapter-02-armored-beast.png"), drawWidth: 260, drawHeight: 200, hitRadiusX: 112, hitRadiusY: 82, drawAngle: 0 },
    3: { id: "spaceport-warden", title: "失落空港守墓者", src: runtimeAsset("bosses", "chapter-03-spaceport-warden.png"), drawWidth: 205, drawHeight: 270, hitRadiusX: 82, hitRadiusY: 115, drawAngle: 0 },
    4: { id: "shield-relay-atlas", title: "天幕护盾中继·阿特拉斯", src: runtimeAsset("bosses", "chapter-04-shield-relay-atlas.png"), drawWidth: 250, drawHeight: 250, hitRadiusX: 106, hitRadiusY: 106, drawAngle: 0 },
    5: { id: "elite-conductor-zero", title: "黑潮节拍者·零式", src: runtimeAsset("bosses", "chapter-05-elite-conductor-zero.png"), drawWidth: 190, drawHeight: 285, hitRadiusX: 70, hitRadiusY: 122, drawAngle: 0 },
    6: { id: "starbreaker-dreadnought", title: "断星级主力舰·噬光", src: runtimeAsset("bosses", "chapter-06-starbreaker-dreadnought.png"), drawWidth: 300, drawHeight: 170, hitRadiusX: 132, hitRadiusY: 68, drawAngle: 0 },
    7: { id: "bastion-colossus", title: "母舰外壳·壁垒巨像", src: runtimeAsset("bosses", "chapter-07-bastion-colossus.png"), drawWidth: 250, drawHeight: 245, hitRadiusX: 110, hitRadiusY: 104, drawAngle: 0 },
    8: { id: "mobile-nest-city", title: "迁徙基地中枢·巢城", src: runtimeAsset("bosses", "chapter-08-mobile-nest-city.png"), drawWidth: 270, drawHeight: 230, hitRadiusX: 116, hitRadiusY: 96, drawAngle: 0 },
    9: { id: "messiah-queen", title: "黑潮女王·弥赛亚", src: runtimeAsset("bosses", "chapter-09-messiah-queen.png"), drawWidth: 230, drawHeight: 310, hitRadiusX: 92, hitRadiusY: 138, drawAngle: 0 }
  };

  function getBossVisual(chapterIndex, stageInChapter) {
    var chapter = Number(chapterIndex);
    var stage = Number(stageInChapter);
    if (chapter < 1 || chapter > 9 || stage < 1 || stage > 10) return null;
    return BOSS_VISUALS[chapter] || null;
  }

  const ENEMY_BULLET_CODEX = {
    single: { id: "single", name: "单发弹", firstChapter: 1, danger: "慢速直线弹，横移即可规避。", src: enemyBulletAsset("bullet-single.png"), color: "#ff6b45", shape: "circle", radius: 4.5 },
    triple: { id: "triple", name: "三连弹", firstChapter: 1, danger: "三枚小角度扇形弹，注意中线空隙。", src: enemyBulletAsset("bullet-triple.png"), color: "#ff7c93", shape: "circle", radius: 4.8 },
    slow_wall: { id: "slow_wall", name: "慢速封路弹", firstChapter: 2, danger: "纵向封路，提前选通道。", src: enemyBulletAsset("bullet-wall.png"), color: "#ffb347", shape: "beam", radius: 7.2, width: 18, height: 7 },
    sniper_warning: { id: "sniper_warning", name: "狙击弹", firstChapter: 6, danger: "有锁定线，离开警戒线后再反击。", src: enemyBulletAsset("bullet-sniper.png"), color: "#fff2a8", shape: "beam", radius: 5, width: 28, height: 5 },
    delayed_burst: { id: "delayed_burst", name: "分裂弹", firstChapter: 8, danger: "延迟分裂，不能贴着弹头穿。", src: enemyBulletAsset("bullet-split.png"), color: "#ff5d73", shape: "circle", radius: 5.6 },
    rotating: { id: "rotating", name: "旋转弹", firstChapter: 8, danger: "旋转封锁，跟随节奏穿过缺口。", src: enemyBulletAsset("bullet-rotating.png"), color: "#ff6bff", shape: "triangle", radius: 5.8, width: 18, height: 14 },
    bomb_mine: { id: "bomb_mine", name: "爆雷", firstChapter: 5, danger: "横移投放，爆点附近要提前离开。", src: enemyBulletAsset("bullet-mine.png"), color: "#ffd166", shape: "circle", radius: 8 },
    mothership_core: { id: "mothership_core", name: "母舰核心弹", firstChapter: 9, danger: "高压混合弹，先看前摇再移动。", src: enemyBulletAsset("bullet-mothership.png"), color: "#ff5d73", shape: "circle", radius: 8 }
  };

  const ENEMY_CODEX = [
    { id: "scout", name: "侦察机", firstChapter: 0, attack: "直线入场，少量单发弹。", bulletType: "single", danger: "低威胁清兵目标。", src: enemyBattleAsset("enemy-battle-scout-01.png") },
    { id: "shooter", name: "射击机", firstChapter: 1, attack: "三连弹或交叉火力。", bulletType: "triple", danger: "第一章开始教玩家躲子弹。", src: enemyBattleAsset("enemy-battle-shooter-01.png") },
    { id: "shield", name: "护盾机", firstChapter: 2, attack: "慢速封路弹，护甲更高。", bulletType: "slow_wall", danger: "需要识别护盾并绕开弹线。", src: enemyBattleAsset("enemy-battle-shield-01.png") },
    { id: "charger", name: "冲锋机", firstChapter: 4, attack: "航道预警后高速突进。", bulletType: "single", danger: "危险来自撞击路线。", src: enemyBattleAsset("enemy-battle-charger-01.png") },
    { id: "bomber", name: "轰炸机", firstChapter: 5, attack: "横移投放爆雷。", bulletType: "bomb_mine", danger: "不要停在爆点附近。", src: enemyBattleAsset("enemy-battle-bomber-01.png") },
    { id: "sniper", name: "狙击机", firstChapter: 6, attack: "锁定线后发射高速狙击弹。", bulletType: "sniper_warning", danger: "看见锁定线先躲。", src: enemyBattleAsset("enemy-battle-sniper-01.png") },
    { id: "guard", name: "母舰护卫", firstChapter: 7, attack: "护卫齐射与编队压迫。", bulletType: "triple", danger: "常和 BOSS 或精英一起出现。", src: enemyBattleAsset("enemy-battle-guard-01.png") },
    { id: "rotor", name: "旋翼封锁机", firstChapter: 8, attack: "旋转封锁弹幕。", bulletType: "rotating", danger: "等缺口，不要硬穿。", src: enemyBattleAsset("enemy-battle-rotor-01.png") },
    { id: "core", name: "精英核心", firstChapter: 9, attack: "母舰混合机制与分裂弹。", bulletType: "mothership_core", danger: "终章高压目标，优先处理。", src: enemyBattleAsset("enemy-battle-core-01.png") }
  ];

  const SETTLEMENT_ICON_ASSETS = {
    gold: runtimeAsset("ui-icons/settlement", "gold-coin.png"),
    exp: runtimeAsset("ui-icons/settlement", "exp-ticket.png"),
    crownColorful: runtimeAsset("ui-icons/settlement", "crown-colorful.png"),
    crownGold: runtimeAsset("ui-icons/settlement", "crown-gold.png"),
    starBadge: runtimeAsset("ui-icons/settlement", "star-badge.png"),
    chestClosed: runtimeAsset("ui-icons/settlement", "reward-chest-closed.png"),
    chestOpen: runtimeAsset("ui-icons/settlement", "reward-chest-open.png"),
    primaryButton: runtimeAsset("ui-icons/settlement", "primary-button.png"),
    claimButton: runtimeAsset("ui-icons/settlement", "claim-button.png"),
    rewardSlot: runtimeAsset("ui-icons/settlement", "reward-slot.png"),
    emptySlot: runtimeAsset("ui-icons/settlement", "empty-slot.png"),
    victoryAura: runtimeAsset("ui-icons/settlement", "victory-aura.png"),
    defeatAura: runtimeAsset("ui-icons/settlement", "defeat-aura.png"),
    honorFrame: runtimeAsset("ui-icons/settlement", "honor-frame.png"),
    honorDivider: runtimeAsset("ui-icons/settlement", "honor-divider.png")
  };

  const AUDIO_ASSETS = {
    uiClick: runtimeAsset("audio", "sfx-ui-click.wav"),
    button: runtimeAsset("audio", "sfx-ui-click.wav"),
    start: runtimeAsset("audio", "sfx-start.wav"),
    shoot: runtimeAsset("audio", "sfx-shoot-spread.wav"),
    shootSpread: runtimeAsset("audio", "sfx-shoot-spread.wav"),
    shootLaser: runtimeAsset("audio", "sfx-shoot-laser.wav"),
    shootMissile: runtimeAsset("audio", "sfx-shoot-missile.wav"),
    enemyHit: runtimeAsset("audio", "sfx-enemy-hit.wav"),
    explosionSmall: runtimeAsset("audio", "sfx-explosion-small.wav"),
    explosionHeavy: runtimeAsset("audio", "sfx-explosion-heavy.wav"),
    pickup: runtimeAsset("audio", "sfx-pickup.wav"),
    skill: runtimeAsset("audio", "sfx-skill.wav"),
    boss: runtimeAsset("audio", "sfx-boss-warning.wav"),
    bossWarning: runtimeAsset("audio", "sfx-boss-warning.wav"),
    bossExplosion: runtimeAsset("audio", "sfx-boss-explosion.wav"),
    chest: runtimeAsset("audio", "sfx-chest.wav"),
    victory: runtimeAsset("audio", "sfx-victory.wav"),
    defeat: runtimeAsset("audio", "sfx-defeat.wav")
  };

  const api = {
    DEFAULT_AVATAR,
    DEFAULT_PILOT_ID,
    DEFAULT_SHIP_ID,
    DEFAULT_BACKGROUND_ID,
    LOBBY_REFERENCE,
    DEFAULT_LOBBY_POSES,
    RANK_DAMAGE,
    RANK_HP,
    PILOT_ASSETS,
    SHIP_ASSETS,
    BACKGROUND_ASSETS,
    CHAPTER_COVER_ASSETS,
    ASSET_PATHS,
    BOSS_VISUALS,
    getBossVisual,
    ENEMY_CODEX,
    ENEMY_BULLET_CODEX,
    UI_A_HUD_ASSETS,
    SHOP_ITEM_ASSETS,
    FEATURE_PANEL_ASSETS,
    CHAPTER_SELECT_ASSETS,
    SETTLEMENT_ICON_ASSETS,
    AUDIO_ASSETS
  };

  scope.assets = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
