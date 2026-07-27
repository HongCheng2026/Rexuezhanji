const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("大厅只替换六宫格好友，顶部好友快捷入口保留", () => {
  const html = read("src/h5/Shell/game-frame.html");
  assert.match(html, /quick-icon friend-icon[\s\S]*data-panel="friend"/);
  assert.match(html, /menu-tile inventory[\s\S]*data-panel="inventory"[\s\S]*<strong>背包<\/strong><em>INVENTORY<\/em>/);
  assert.doesNotMatch(html, /menu-tile friend/);
});

test("抽卡和背包各自位于 UI 独立子文件夹，旧抽卡视图已移除", () => {
  [
    "src/h5/UI/Gacha/gachaConfig.js",
    "src/h5/UI/Gacha/gachaModel.js",
    "src/h5/UI/Gacha/gachaStateStore.js",
    "src/h5/UI/Gacha/gachaView.js",
    "src/h5/UI/Gacha/gachaRoom.js",
    "src/h5/UI/Inventory/inventoryCatalog.js",
    "src/h5/UI/Inventory/inventoryModel.js",
    "src/h5/UI/Inventory/inventoryView.js",
    "src/h5/UI/Inventory/inventoryRoom.js"
  ].forEach((file) => assert.equal(fs.existsSync(path.join(root, file)), true, file));
  assert.equal(fs.existsSync(path.join(root, "src/h5/UI/FeaturePanels/starWingsGachaView.js")), false);
  assert.equal(fs.existsSync(path.join(root, "src/h5/UI/FeaturePanels/starWingsGachaView.css")), false);
});

test("Loader 顺序满足配置、模型、视图先于房间，公共壳只路由到房间门", () => {
  const loader = read("src/h5/Shell/shared-loader.js");
  assert.ok(loader.indexOf("UI/Gacha/gachaConfig.js") < loader.indexOf("UI/Gacha/gachaRoom.js"));
  assert.ok(loader.indexOf("UI/Inventory/inventoryCatalog.js") < loader.indexOf("UI/Inventory/inventoryRoom.js"));
  const router = read("src/h5/UI/FeaturePanels/featurePanelRoom.js");
  assert.match(router, /starWingsGacha:\s*"gacha\.open"/);
  assert.match(router, /inventory:\s*"inventory\.open"/);
  assert.doesNotMatch(router, /starWingsGachaView/);
});

test("战机库位于 UI 独立房间，FeaturePanel 公共壳只保留路由", () => {
  const loader = read("src/h5/Shell/shared-loader.js");
  const router = read("src/h5/UI/FeaturePanels/featurePanelRoom.js");
  const controller = read("src/h5/UI/FeaturePanels/featurePanelController.js");
  const room = read("src/h5/UI/Fighter/fighterRoom.js");
  [
    "src/h5/UI/Fighter/fighterView.js",
    "src/h5/UI/Fighter/fighterView.css",
    "src/h5/UI/Fighter/fighterRoom.js"
  ].forEach((file) => assert.equal(fs.existsSync(path.join(root, file)), true, file));
  assert.equal(fs.existsSync(path.join(root, "src/h5/Gameplay/Fighter/Gallery/shipGalleryView.js")), false);
  assert.equal(fs.existsSync(path.join(root, "src/h5/Gameplay/Fighter/Gallery/shipGalleryView.css")), false);
  assert.ok(loader.indexOf("UI/Fighter/fighterView.js") < loader.indexOf("UI/Fighter/fighterRoom.js"));
  assert.ok(loader.indexOf("UI/Fighter/fighterRoom.js") < loader.indexOf("Game/Core/applicationRuntime.js"));
  assert.match(room, /defineRoom\("fighter"/);
  assert.match(router, /shipGallery:\s*"fighter\.open"/);
  assert.doesNotMatch(controller, /shipGallery|fighterView|renderShipGallery/);
});

test("战机管理区复用战姬的分组规划但保持独立模块边界", () => {
  const view = read("src/h5/UI/Fighter/fighterView.js");
  const room = read("src/h5/UI/Fighter/fighterRoom.js");
  const css = read("src/h5/UI/Fighter/fighterView.css");
  assert.match(view, /ship-hangar-ownership-group/);
  assert.match(view, /ship-hangar-promotion-group/);
  assert.match(view, /ship-hangar-star-group/);
  assert.match(view, /SSS战机模组/);
  assert.match(room, /"fighter\.starUp"/);
  assert.match(room, /gateway\.starUpFighter/);
  assert.match(css, /ship-hangar-action-group/);
  assert.doesNotMatch(view + room + css, /pilot-dossier|pilot\.starUp|pilot\.promote/);
});

test("背包、商店与抽卡统一使用 SSS 战机模组且主动技能模组不变", () => {
  const inventory = read("src/h5/UI/Inventory/inventoryCatalog.js");
  const shop = read("src/h5/UI/Shop/ShopConfig.js");
  const gacha = read("src/h5/UI/Gacha/gachaConfig.js");
  assert.match(inventory, /sss_fighter_module[\s\S]*name:\s*"SSS战机模组"/);
  assert.match(shop, /id:\s*"exchange_sss_fighter_module"[\s\S]*title:\s*"SSS战机模组"/);
  assert.match(gacha, /id:\s*"sss_fighter_module"[\s\S]*label:\s*"SSS战机模组 ×1"/);
  assert.doesNotMatch(inventory + shop + gacha, /SSS(?:级)?武器模组/);
  assert.match(inventory, /active_skill_module_sss[\s\S]*主动技能模组·SSS/);
  assert.match(shop, /id:\s*"active_skill_module_sss"/);
});

test("战机升阶与升星在本地、服务端保持同一材料契约", () => {
  const local = read("src/h5/Data/Balance/rosterEconomy.js");
  const backend = read("src/backend/functions/game-api/index.ts");
  assert.match(local, /SS:\s*Object\.freeze\(\{\s*targetRank:\s*"SSS"[\s\S]*FIGHTER_STAR_MODULE_ID[\s\S]*tokenRequired:\s*5/);
  assert.match(local, /FIGHTER_SSS_PROMOTION_ATTACK\s*=\s*20/);
  assert.match(local, /promotedFromSs\s*\?\s*"SS"\s*:\s*rank/);
  [backend].forEach((source) => {
    assert.match(source, /shipRanks:\s*\{\}\s*as Record<string, string>/);
    assert.match(source, /shipStars:\s*\{\}\s*as Record<string, number>/);
    assert.match(source, /"ship-ss-lingguang":\s*"SS"/);
    assert.match(source, /normalizedShipRanks[\s\S]*nativeRank === "SS"\s*\?\s*\["SS", "SSS"\]/);
    assert.match(source, /SS:\s*\{\s*targetRank:\s*"SSS",\s*tokenId:\s*"sss_fighter_module",\s*tokenRequired:\s*5/);
    assert.match(source, /async function fighterStarUp[\s\S]*ship_ss_lingguang_copy[\s\S]*sss_fighter_module[\s\S]*modulesOwned\s*-\s*5/);
    assert.match(source, /attackGained:\s*10/);
    assert.match(source, /action === "fighter-star-up"/);
    assert.match(source, /profile\.scene\[type === "pilot" \? "pilotId" : "shipId"\] = itemId/);
  });
});

test("战姬档案位于 UI 独立房间，公共功能面板只负责路由", () => {
  const loader = read("src/h5/Shell/shared-loader.js");
  const router = read("src/h5/UI/FeaturePanels/featurePanelRoom.js");
  const controller = read("src/h5/UI/FeaturePanels/featurePanelController.js");
  const room = read("src/h5/UI/Pilot/pilotRoom.js");
  [
    "src/h5/UI/Pilot/pilotView.js",
    "src/h5/UI/Pilot/pilotView.css",
    "src/h5/UI/Pilot/pilotRoom.js"
  ].forEach((file) => assert.equal(fs.existsSync(path.join(root, file)), true, file));
  assert.equal(fs.existsSync(path.join(root, "src/h5/Gameplay/Player/pilotGalleryView.js")), false);
  assert.equal(fs.existsSync(path.join(root, "src/h5/Gameplay/Player/pilotGalleryView.css")), false);
  assert.ok(loader.indexOf("UI/Pilot/pilotView.js") < loader.indexOf("UI/Pilot/pilotRoom.js"));
  assert.match(room, /defineRoom\("pilot"/);
  assert.match(router, /pilotGallery:\s*"pilot\.open"/);
  assert.doesNotMatch(controller, /pilotGallery|pilotView|renderPilotGallery/);
});

test("新素材组通过 runtimeAsset 映射且运行时文件齐全", () => {
  const assets = read("src/h5/Presentation/Assets/assets.js");
  assert.match(assets, /"gacha\/ui":\s*"gacha\/ui\/"/);
  assert.match(assets, /"inventory\/ui":\s*"inventory\/ui\/"/);
  assert.match(assets, /"inventory\/items":\s*"inventory\/items\/"/);
  [
    "assets/runtime/gacha/ui/summon-device.png",
    "assets/runtime/gacha/ui/ultimate-burst.png",
    "assets/runtime/inventory/ui/unknown-item.png",
    "assets/runtime/inventory/ui/category-all.png",
    "assets/runtime/inventory/ui/category-consumable.png",
    "assets/runtime/inventory/ui/category-material.png",
    "assets/runtime/inventory/ui/category-ticket.png",
    "assets/runtime/inventory/ui/category-archive.png",
    "assets/runtime/inventory/items/energy-small.png",
    "assets/runtime/Shared/lobby-icons/menu-inventory.png",
    "assets/runtime/pilot/pilot-ss-heiyue.png",
    "assets/runtime/ship/lobby/ship-lobby-ss-lingguang.png",
    "assets/runtime/ship/battle/ship-battle-ss-lingguang.png"
  ].forEach((file) => assert.equal(fs.existsSync(path.join(root, file)), true, file));
  assert.match(assets, /pilot-ss-heiyue\.png/);
  assert.match(assets, /ship-lobby-ss-lingguang\.png/);
  assert.match(assets, /ship-battle-ss-lingguang\.png/);
  assert.doesNotMatch(assets, /pending-selection/);
});

test("SS 图鉴条目为抽卡限定且不可按零金币购买", () => {
  const assets = read("src/h5/Presentation/Assets/assets.js");
  assert.match(assets, /pilot-ss-heiyue[\s\S]*acquisition:\s*"gacha-only"/);
  assert.match(assets, /ship-ss-lingguang[\s\S]*acquisition:\s*"gacha-only"/);
  assert.match(read("src/h5/UI/Pilot/pilotView.js"), /isGachaOnly[\s\S]*抽卡限定/);
  assert.match(read("src/h5/UI/Fighter/fighterView.js"), /isGachaOnly[\s\S]*抽卡限定/);
});

test("战姬详情用属性战力替代人物小传，并统一品质与升星文案", () => {
  const view = read("src/h5/UI/Pilot/pilotView.js");
  const css = read("src/h5/UI/Pilot/pilotView.css");
  assert.doesNotMatch(view, /pilot\.story|pilot-dossier-story/);
  assert.match(view, /body\.appendChild\(stats\)/);
  assert.match(view, /已达最高品质/);
  assert.match(view, /黑月本体[\s\S]*SSS级战姬奖章/);
  assert.match(view, /pilot-dossier-action-group/);
  assert.match(view, /createPilotArtwork\(pilot, artworkStars\)/);
  assert.doesNotMatch(view, /starGroup\.appendChild\(createStarLine/);
  assert.match(css, /pilot-dossier-stage > \.pilot-dossier-art[\s\S]*height:\s*100%/);
  assert.match(css, /pilot-dossier-art-stars[\s\S]*font-size:\s*24px/);
  assert.match(css, /pilot-dossier-control[\s\S]*overflow:\s*hidden/);
});
