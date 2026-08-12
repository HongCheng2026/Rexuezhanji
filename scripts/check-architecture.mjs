import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, "..");
const h5Root = path.join(root, "src", "h5");
const baselineOnly = process.argv.includes("--baseline");
const failures = [];
const warnings = [];

function walkFiles(dir, predicate = () => true) {
  const result = [];
  if (!fs.existsSync(dir)) return result;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...walkFiles(absolute, predicate));
    else if (predicate(absolute)) result.push(absolute);
  }
  return result;
}

function relative(file) {
  return path.relative(root, file).replaceAll("\\", "/");
}

function addProblem(message, strictOnly = false) {
  if (strictOnly && baselineOnly) warnings.push(message);
  else failures.push(message);
}

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function checkSyntax() {
  const jsFiles = walkFiles(h5Root, (file) => file.endsWith(".js"));
  for (const file of jsFiles) {
    try {
      new vm.Script(read(file), { filename: relative(file) });
    } catch (error) {
      addProblem(`syntax: ${relative(file)}\n${error.message}`);
    }
  }
  return jsFiles.length;
}

function checkLoaderPaths() {
  const loaderFile = path.join(h5Root, "Shell", "shared-loader.js");
  const source = read(loaderFile);
  const entries = [...source.matchAll(/["']([A-Za-z][^"'?]+\.js)["']/g)].map((match) => match[1]);
  const unique = [...new Set(entries)];
  for (const entry of unique) {
    if (!fs.existsSync(path.join(h5Root, entry))) addProblem(`loader path missing: ${entry}`);
  }
  return unique.length;
}

function getLoaderEntries() {
  const source = read(path.join(h5Root, "Shell", "shared-loader.js"));
  return [...source.matchAll(/["']([A-Za-z][^"'?]+\.js)["']/g)].map((match) => match[1]);
}

function checkLoaderOrder() {
  const entries = getLoaderEntries();
  const constraints = [
    ["Data/Balance/balance.js", "Gameplay/Player/profile.js"],
    ["World/Level/levels.js", "Gameplay/Player/profile.js"],
    ["Gameplay/Fighter/tacticalLoadoutConfig.js", "Gameplay/Player/profile.js"],
    ["World/Level/stageHonorSystem.js", "Gameplay/Player/profile.js"],
    ["World/Level/stageHonorSystem.js", "Gameplay/Enemy/battleRules.js"],
    ["Gameplay/Fighter/combatStats.js", "Game/Storage/profileRuntime.js"],
    ["Data/Config/testUnlockFlags.js", "Game/Storage/profileRuntime.js"],
    ["UI/Fighter/Upgrade/fighterUpgradeAssets.js", "UI/Fighter/Upgrade/fighterUpgradeView.js"],
    ["UI/Fighter/Upgrade/fighterUpgradeModel.js", "UI/Fighter/Upgrade/fighterUpgradeRoom.js"],
    ["UI/Fighter/Upgrade/fighterUpgradeView.js", "UI/Fighter/Upgrade/fighterUpgradeRoom.js"],
  ["UI/Fighter/fighterView.js", "UI/Fighter/fighterRoom.js"],
  ["UI/Fighter/fighterRoom.js", "Game/Core/applicationRuntime.js"],
    ["Gameplay/Combat/fxSystem.js", "Gameplay/Combat/collisionSystem.js"],
    ["Gameplay/Combat/fxSystem.js", "Gameplay/Combat/battleRuntime.js"]
  ];
  for (const [producer, consumer] of constraints) {
    if (entries.indexOf(producer) < 0 || entries.indexOf(consumer) < 0 || entries.indexOf(producer) >= entries.indexOf(consumer)) {
      addProblem(`loader order invalid: ${producer} must load before ${consumer}`);
    }
  }
  const duplicates = entries.filter((entry, index) => entries.indexOf(entry) !== index);
  if (duplicates.length) addProblem(`loader duplicate entries: ${[...new Set(duplicates)].join(", ")}`);
  return constraints.length;
}

function checkLoaderCoverage(jsFiles) {
  const loaded = new Set(getLoaderEntries().map((entry) => `src/h5/${entry}`));
  const htmlEntrypoints = new Set();
  for (const file of walkFiles(h5Root, (entry) => entry.endsWith(".html"))) {
    for (const match of read(file).matchAll(/src=["']([^"'?]+\.js)(?:\?[^"']*)?["']/g)) {
      htmlEntrypoints.add(relative(path.resolve(path.dirname(file), match[1])));
    }
  }
  for (const file of jsFiles) {
    const rel = relative(file);
    if (!loaded.has(rel) && !htmlEntrypoints.has(rel)) addProblem(`orphan JS is not loaded or an HTML entrypoint: ${rel}`);
  }
}

function checkLateDependencyReads() {
  const checks = [
    ["Gameplay/Player/profile.js", /\bconst tacticalConfig\s*=\s*scope\.tacticalLoadoutConfig/, "profile captures tactical config at startup", 800],
    ["Gameplay/Player/profile.js", /\bconst stageHonorSystem\s*=\s*scope\.stageHonorSystem/, "profile captures honor system at startup", 800],
    ["Gameplay/Enemy/battleRules.js", /\bconst stageHonorSystem\s*=\s*scope\.stageHonorSystem/, "battleRules captures honor system at startup", 600],
    ["Game/Storage/profileRuntime.js", /\bvar combatStatsModule\s*=\s*scope\.combatStats/, "profileRuntime captures combatStats at startup", 500],
    ["Gameplay/Combat/collisionSystem.js", /var burst\s*=\s*scope\.fxSystem|var shockwave\s*=\s*scope\.fxSystem/, "collisionSystem captures fxSystem at startup", Infinity]
  ];
  for (const [entry, pattern, message, limit] of checks) {
    const source = read(path.join(h5Root, entry));
    if (pattern.test(Number.isFinite(limit) ? source.slice(0, limit) : source)) addProblem(message);
  }
}

function checkTacticalDockAssets() {
  const assetsSource = read(path.join(h5Root, "Presentation", "Assets", "assets.js"));
  const artSource = read(path.join(h5Root, "UI", "Fighter", "Upgrade", "fighterUpgradeAssets.js"));
  const cssSource = read(path.join(h5Root, "UI", "Fighter", "Upgrade", "fighterUpgradeView.css"));
  const viewSource = read(path.join(h5Root, "UI", "Fighter", "Upgrade", "fighterUpgradeView.js"));
  const roomSource = read(path.join(h5Root, "UI", "Fighter", "Upgrade", "fighterUpgradeRoom.js"));
  const requiredKeys = [
    "panelFrame", "panelFrameSelected", "matrixRadar", "attributeAttack", "attributeArmor", "attributeLife",
    "slotEmpty", "activeLockBeam", "activeGravityWell", "activeJudgement", "activePhaseShield",
    "weaponFixedLaser", "weaponFixedSpread", "weaponFixedMissile", "weaponSidewing", "weaponOrbital", "weaponSwarm"
  ];
  for (const key of requiredKeys) {
    if (!new RegExp(`\\b${key}\\s*:`).test(assetsSource)) addProblem(`tactical dock asset mapping missing: ${key}`);
  }
  for (const id of ["attack", "armorPenetration", "hp", "empty", "weapon_module_04", "weapon_module_05", "weapon_module_06"]) {
    if (!artSource.includes(`${id}:`) && !artSource.includes(`"${id}":`)) addProblem(`tactical dock art id missing: ${id}`);
  }
  if (/--rx-td-(?:screen-chassis|matrix-field|panel-surface)/.test(cssSource)) addProblem("fighter upgrade still stacks a full-screen or legacy structural material");
  if (/fighter-upgrade-chassis/.test(assetsSource + cssSource)) addProblem("fighter upgrade full-screen chassis must not exist");
  for (const cssVar of ["--rx-td-panel-frame", "--rx-td-panel-frame-selected", "--rx-td-matrix-radar"]) {
    if (!cssSource.includes(cssVar)) addProblem(`fighter upgrade component material is not used: ${cssVar}`);
  }
  if (!/class="[^"]*fu-(?:vault|skill)-detail/.test(viewSource)) addProblem("fighter upgrade skill detail region is missing");
  if (!/fighterUpgradeAssets\s*&&\s*shared\.fighterUpgradeAssets\.image/.test(viewSource)) addProblem("fighter upgrade view does not use its module asset manifest");
  if (!/defineRoom\("upgrade"/.test(roomSource)) addProblem("fighter upgrade is not an independently defined room");
  if (/featurePanelController|featurePanelSlots|fighter-upgrade-panel/.test(roomSource)) addProblem("fighter upgrade room still depends on FeaturePanel");
  if (/\.feature-panel|core-panel-frame|matrix-panel-frame|skill-panel-frame/.test(cssSource)) addProblem("fighter upgrade CSS still contains legacy shell or baked panel plates");
  const gameFrame = read(path.join(h5Root, "Shell", "game-frame.html"));
  if (!/id="fighterUpgradeScreen"/.test(gameFrame) || !/id="fighterUpgradeMount"/.test(gameFrame)) addProblem("standalone fighter upgrade screen root is missing");
  for (const legacy of ["fighterUpgradeController.js", "fighterStatsPanel.js", "fighterSkillPanel.js"]) {
    if (fs.existsSync(path.join(h5Root, "Gameplay", "Fighter", legacy))) addProblem(`legacy fighter upgrade module still exists: ${legacy}`);
  }
  if (fs.existsSync(path.join(h5Root, "Gameplay", "Fighter", "Upgrade"))) addProblem("legacy Gameplay/Fighter/Upgrade directory still exists");
  if (fs.existsSync(path.join(h5Root, "Presentation", "Assets", "tacticalDockArt.js"))) addProblem("legacy tacticalDockArt module still exists");
}

function checkFighterRoom() {
  const viewFile = path.join(h5Root, "UI", "Fighter", "fighterView.js");
  const cssFile = path.join(h5Root, "UI", "Fighter", "fighterView.css");
  const roomFile = path.join(h5Root, "UI", "Fighter", "fighterRoom.js");
  const controllerFile = path.join(h5Root, "UI", "FeaturePanels", "featurePanelController.js");
  const routerFile = path.join(h5Root, "UI", "FeaturePanels", "featurePanelRoom.js");
  for (const file of [viewFile, cssFile, roomFile]) {
    if (!fs.existsSync(file)) addProblem(`fighter UI module missing: ${relative(file)}`);
  }
  if (![viewFile, cssFile, roomFile].every((file) => fs.existsSync(file))) return;
  const view = read(viewFile);
  const css = read(cssFile);
  const room = read(roomFile);
  const controller = read(controllerFile);
  const router = read(routerFile);
  if (!/defineRoom\("fighter"/.test(room)) addProblem("fighter hangar is not an independently defined room");
  if (!/shipGallery:\s*"fighter\.open"/.test(router)) addProblem("FeaturePanel shell does not route shipGallery to fighter.open");
  if (/shipGallery|fighterView|renderShipGallery/.test(controller)) addProblem("FeaturePanel controller still owns fighter hangar behavior");
  if (/\bCODE\s/.test(view)) addProblem("fighter hangar still renders CODE aliases");
  if (!/grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/.test(css)) addProblem("fighter hangar desktop columns are not symmetric");
  if (!/ship-hangar-promote/.test(view + css)) addProblem("fighter hangar promotion action is missing");
  if (!["ownership", "promotion", "star"].every((group) => view.includes(`ship-hangar-${group}-group`)) || !/ship-hangar-action-group/.test(css)) addProblem("fighter hangar does not use independent pilot-style action groups");
  if (!/"fighter\.starUp"/.test(room) || !/gateway\.starUpFighter/.test(room)) addProblem("fighter hangar star-up action is missing");
  if (!/sss_fighter_module/.test(view) || /pilot-dossier|pilot\.starUp|pilot\.promote/.test(view + room + css)) addProblem("fighter hangar progression is mixed with pilot ownership");
  for (const legacy of [
    path.join(h5Root, "Gameplay", "Fighter", "Gallery", "shipGalleryView.js"),
    path.join(h5Root, "Gameplay", "Fighter", "Gallery", "shipGalleryView.css")
  ]) {
    if (fs.existsSync(legacy)) addProblem(`legacy fighter gallery still exists: ${relative(legacy)}`);
  }
}

function checkHtmlPaths() {
  const htmlFiles = ["index.html", "game-frame.html"].map((name) => path.join(h5Root, "Shell", name));
  let count = 0;
  for (const file of htmlFiles) {
    const refs = [...read(file).matchAll(/(?:src|href)=["']([^"'#?]+)(?:[?#][^"']*)?["']/g)].map((match) => match[1]);
    for (const ref of refs) {
      if (/^(?:https?:|data:)/i.test(ref)) continue;
      count += 1;
      if (!fs.existsSync(path.resolve(path.dirname(file), ref))) {
        addProblem(`html path missing: ${relative(file)} -> ${ref}`);
      }
    }
  }
  return count;
}

function checkAssets() {
  const assetsFile = path.join(h5Root, "Presentation", "Assets", "assets.js");
  const require = createRequire(import.meta.url);
  globalThis.RXGame = {};
  delete require.cache[require.resolve(assetsFile)];
  const assets = require(assetsFile);
  const refs = new Set();
  const visited = new WeakSet();

  function visit(value) {
    if (typeof value === "string") {
      const marker = "assets/runtime/";
      const index = value.indexOf(marker);
      if (index >= 0) refs.add(value.slice(index + marker.length).split("?")[0]);
      return;
    }
    if (!value || typeof value !== "object" || visited.has(value)) return;
    visited.add(value);
    for (const child of Object.values(value)) visit(child);
  }

  visit(assets);
  for (const ref of refs) {
    if (!fs.existsSync(path.join(root, "assets", "runtime", ...ref.split("/")))) {
      addProblem(`runtime asset missing: ${ref}`);
    }
  }
  return refs.size;
}

function checkActionContracts(jsFiles) {
  const routerFile = path.join(h5Root, "Game", "SceneManager", "gameEventRouter.js");
  const router = read(routerFile);
  const dispatched = new Set([...router.matchAll(/dispatch\(["']([^"']+)["']/g)].map((match) => match[1]));
  const defined = new Set();

  for (const file of jsFiles) {
    const source = read(file);
    for (const match of source.matchAll(/registerAction\(["']([^"']+)["']/g)) defined.add(match[1]);
    for (const match of source.matchAll(/["']([a-z][\w-]*\.[A-Za-z][\w.-]*)["']\s*:/g)) defined.add(match[1]);
    const roomMatch = source.match(/defineRoom\(["']([a-z][\w-]*)["']/);
    if (roomMatch) {
      for (const match of source.matchAll(/^\s{6}([A-Za-z][\w-]*)\s*:/gm)) {
        defined.add(`${roomMatch[1]}.${match[1]}`);
      }
    }
  }

  for (const action of dispatched) {
    if (!defined.has(action)) addProblem(`unowned dispatched action: ${action}`, true);
  }
  return { dispatched: dispatched.size, defined: defined.size };
}

function checkDependencyRules(jsFiles) {
  const gameplayFiles = jsFiles.filter((file) => relative(file).startsWith("src/h5/Gameplay/"));
  for (const file of gameplayFiles) {
    const source = read(file);
    if (/scope\.audioSystem\b/.test(source)) addProblem(`Gameplay directly depends on audio: ${relative(file)}`, true);
    if (/scope\.(?:battleUiView|lobbyView|profileView)\b/.test(source)) addProblem(`Gameplay directly depends on UI: ${relative(file)}`, true);
    if (/\blocalStorage\b|profileRuntime\.(?:load|save)Profile/.test(source)) addProblem(`Gameplay directly depends on persistence: ${relative(file)}`, true);
  }

  const registryFile = path.join(h5Root, "Game", "SceneManager", "roomRegistry.js");
  for (const file of jsFiles) {
    if (file !== registryFile && /\.registerAction\(/.test(read(file))) {
      addProblem(`legacy registerAction used outside registry: ${relative(file)}`, true);
    }
  }

  const routerFile = path.join(h5Root, "Game", "SceneManager", "gameEventRouter.js");
  const router = read(routerFile);
  for (const token of ["audioSystem", "mainFeaturePanelsView", "starWingsGachaView", "eventModeHubView", "socialFeaturePanelsView"]) {
    if (router.includes(token)) addProblem(`DOM router still knows concrete dependency: ${token}`, true);
  }

  const appFile = path.join(h5Root, "Game", "Core", "gameApp.js");
  const app = read(appFile);
  if (/\.registerAction\(/.test(app)) addProblem("gameApp still registers individual business actions", true);
  for (const token of ["localStorage", "saveProfile", "claimEconomy", "setGold", "addGold"]) {
    if (app.includes(token)) addProblem(`gameApp still implements business responsibility: ${token}`, true);
  }

  for (const file of jsFiles) {
    const source = read(file);
    if (/src\/(?:shared|h5\/(?:app|battle|meta|ui|endless))\//i.test(source)) {
      addProblem(`old source path remains: ${relative(file)}`, true);
    }
  }
}

function checkEventContracts(jsFiles) {
  const expected = [
    "combat:started", "player:damaged", "player:died", "enemy:died",
    "boss:spawned", "weapon:upgraded", "item:collected", "level:cleared",
    "gold:changed", "weapon:fired", "enemy:hit", "skill:activated"
  ];
  const sources = jsFiles.map((file) => ({ file, source: read(file) }));
  const eventsFile = path.join(h5Root, "Game", "EventBus", "events.js");
  const constantsSource = fs.existsSync(eventsFile) ? read(eventsFile) : "";

  for (const event of expected) {
    const escaped = event.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const keyMatch = constantsSource.match(new RegExp(`([A-Z][A-Z0-9_]*)\\s*:\\s*["']${escaped}["']`));
    const key = keyMatch && keyMatch[1];
    const emitPattern = key
      ? new RegExp(`\\.emit\\(\\s*(?:events|EVENTS)\\.${key}\\b|\\.emit\\(\\s*["']${escaped}["']`)
      : new RegExp(`\\.emit\\(\\s*["']${escaped}["']`);
    const onPattern = key
      ? new RegExp(`\\.on\\(\\s*(?:events|EVENTS)\\.${key}\\b|\\.on\\(\\s*["']${escaped}["']`)
      : new RegExp(`\\.on\\(\\s*["']${escaped}["']`);
    if (!sources.some((entry) => emitPattern.test(entry.source))) addProblem(`event has no emitter: ${event}`, true);
    if (!sources.some((entry) => onPattern.test(entry.source))) warnings.push(`event has no subscriber: ${event}`);
  }

  const audioSource = read(path.join(h5Root, "Presentation", "Audio", "audioSystem.js"));
  for (const key of ["WEAPON_FIRED", "ENEMY_HIT", "SKILL_ACTIVATED"]) {
    if (!new RegExp(`\\.on\\(\\s*events\\.${key}\\b`).test(audioSource)) addProblem(`audio missing semantic subscription: ${key}`, true);
  }
}

const jsFiles = walkFiles(h5Root, (file) => file.endsWith(".js"));
const summary = {
  syntaxFiles: checkSyntax(),
  loaderEntries: checkLoaderPaths(),
  loaderOrderRules: checkLoaderOrder(),
  htmlRefs: checkHtmlPaths(),
  runtimeAssetRefs: checkAssets(),
  actions: checkActionContracts(jsFiles)
};
checkLoaderCoverage(jsFiles);
checkLateDependencyReads();
checkTacticalDockAssets();
checkFighterRoom();
checkDependencyRules(jsFiles);
checkEventContracts(jsFiles);

for (const warning of warnings) console.warn(`WARN ${warning}`);
if (failures.length) {
  for (const failure of failures) console.error(`FAIL ${failure}`);
  console.error(`architecture-check failed (${failures.length})`);
  process.exitCode = 1;
} else {
  console.log(`architecture-check OK ${JSON.stringify(summary)}`);
}
