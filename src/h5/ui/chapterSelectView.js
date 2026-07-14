(function registerChapterSelectView(root) {
  var scope = root.RXGame || (root.RXGame = {});
  var levelsConfig = scope.levels || {};
  var assets = scope.assets || {};
  var settlementIcons = assets.SETTLEMENT_ICON_ASSETS || {};
  var storyConfig = scope.stageStoryConfig || {};
  var campaignStory = scope.campaignStoryFramework || {};
  var levels = levelsConfig.levels || [];
  var ENERGY_COST = levelsConfig.ENERGY_COST || 5;

  var FALLBACK_CHAPTER_NAMES = [
    "序章：苍穹启动",
    "第一章：城市外围夺回战",
    "第二章：重甲空域",
    "第三章：沦陷空港",
    "第四章：护盾防线",
    "第五章：精英舰队",
    "第六章：黑潮主力舰队",
    "第七章：重甲核心防线",
    "第八章：反攻前线基地",
    "第九章：黑潮母舰"
  ];

  var CHAPTER_SUMMARIES = [
    "完成基础升空训练，确认战姬、战机与火控系统的出战同步。",
    "夺回城市外环制空权，在敌军包围圈中打通第一条撤离航线。",
    "敌方重甲单位开始成型，破甲和持续火力成为关键。",
    "沦陷空港布满伏击航道，保持机动并清理隐藏拦截。",
    "护盾防线覆盖低轨阵列，需要稳定突破防御节点。",
    "精英舰队接管前线，弹幕密度和攻击节奏明显提升。",
    "黑潮主力舰队压境，战场规模进入正面决战阶段。",
    "核心防线装甲极厚，出战配置需要更高穿透效率。",
    "反攻基地完成集结，舰队准备向母舰区域推进。",
    "最终母舰现身，所有航线汇入最后的决战空域。"
  ];

  var ROUTE_POINTS_3 = [
    { x: 220, y: 164 },
    { x: 772, y: 108 },
    { x: 1324, y: 164 }
  ];

  var ROUTE_POINTS_10 = [
    { x: 100, y: 102 },
    { x: 248, y: 208 },
    { x: 396, y: 102 },
    { x: 544, y: 208 },
    { x: 692, y: 102 },
    { x: 840, y: 208 },
    { x: 988, y: 102 },
    { x: 1136, y: 208 },
    { x: 1284, y: 102 },
    { x: 1438, y: 208 }
  ];

  function renderChapterSelect(container, profile, selectedChapter, selectedLevel, callbacks) {
    callbacks = callbacks || {};
    container.innerHTML = "";
    container.className = "campaign-map-viewport";

    var levelsInChapter = levels.filter(function filterChapter(level) {
      return level.chapterIndex === selectedChapter;
    });
    var selectedLevelModel = findLevel(selectedLevel) || levelsInChapter[0] || levels[0];
    var chapterBriefing = getChapterBriefing(selectedChapter);
    var chapterAssets = assets.CHAPTER_SELECT_ASSETS || {};

    var canvas = document.createElement("section");
    canvas.className = "campaign-map-canvas";
    canvas.setAttribute("aria-label", getChapterTitle(selectedChapter) + "关卡选择");
    setAssetVariables(canvas, chapterAssets);

    canvas.appendChild(createArtImage("campaign-map-shell-art", chapterAssets.screenShell, ""));

    var layout = document.createElement("div");
    layout.className = "campaign-map-layout";
    layout.appendChild(renderChapterStrip(profile, selectedChapter, callbacks, chapterAssets));
    layout.appendChild(renderChapterHeader(selectedChapter, chapterBriefing, chapterAssets));
    layout.appendChild(renderRouteMap(profile, selectedChapter, levelsInChapter, selectedLevelModel, callbacks, chapterAssets));
    layout.appendChild(renderMissionDetail(profile, selectedLevelModel, callbacks, chapterAssets));
    layout.appendChild(renderActions(profile, selectedLevelModel, callbacks, chapterAssets));
    canvas.appendChild(layout);
    container.appendChild(canvas);

    var rotate = document.createElement("div");
    rotate.className = "campaign-map-rotate";
    rotate.innerHTML = '<strong>请横屏作战</strong><span>旋转设备后继续选择关卡</span>';
    container.appendChild(rotate);

    return {
      container: container,
      levelGrid: layout.querySelector(".campaign-map-route"),
      selectedLevel: selectedLevelModel
    };
  }

  function renderChapterStrip(profile, selectedChapter, callbacks, chapterAssets) {
    var strip = document.createElement("nav");
    strip.className = "campaign-map-chapters";
    strip.setAttribute("aria-label", "章节选择");

    for (var ci = 0; ci <= 9; ci += 1) {
      var firstLevel = levels.find(function findFirst(level) {
        return level.chapterIndex === ci;
      });
      var isCurrent = selectedChapter === ci;
      var isUnlocked = Boolean(firstLevel && firstLevel.id <= (profile.unlockedLevel || 0));
      var tab = document.createElement("button");
      tab.type = "button";
      tab.className = "campaign-map-chapter" + (isCurrent ? " is-active" : "") + (isUnlocked ? "" : " is-locked");
      tab.disabled = !isUnlocked;
      tab.style.setProperty("--campaign-tab-art", assetUrl(isUnlocked ? (isCurrent ? chapterAssets.tabs && chapterAssets.tabs.active : chapterAssets.tabs && chapterAssets.tabs.normal) : chapterAssets.tabs && chapterAssets.tabs.locked));
      tab.innerHTML = '<span>' + (ci === 0 ? "序章" : "第 " + ci + " 章") + '</span><b>' + escapeHtml(getShortChapterName(ci)) + "</b>";
      tab.addEventListener("click", createChapterHandler(callbacks, ci));
      strip.appendChild(tab);
    }
    return strip;
  }

  function renderChapterHeader(chapterIndex, briefing, chapterAssets) {
    var header = document.createElement("section");
    header.className = "campaign-map-header";
    header.appendChild(createArtImage("campaign-map-section-art", chapterAssets.headerFrame, ""));

    var title = document.createElement("div");
    title.className = "campaign-map-title";
    title.innerHTML =
      '<img src="' + escapeHtml(chapterAssets.crest || "") + '" alt="">' +
      '<div><span>' + (chapterIndex === 0 ? "PROLOGUE" : "CHAPTER " + String(chapterIndex).padStart(2, "0")) + '</span>' +
      '<h1>' + escapeHtml(getChapterTitle(chapterIndex)) + '</h1>' +
      '<p>' + escapeHtml(briefing.summary || CHAPTER_SUMMARIES[chapterIndex] || CHAPTER_SUMMARIES[1]) + "</p></div>";

    var story = document.createElement("div");
    story.className = "campaign-map-briefing";
    story.innerHTML =
      '<span>作战简报 / CAMPAIGN STORY</span>' +
      '<strong>' + escapeHtml(briefing.title || getChapterTitle(chapterIndex)) + '</strong>' +
      '<p>' + escapeHtml(findStoryValue(briefing, ["作战目标", "目标"]) || briefing.objective || briefing.summary || "推进当前章节作战航线。") + '</p>' +
      '<em>推进状况：' + escapeHtml(findStoryValue(briefing, ["推进状态", "推进"]) || getChapterProgressText(chapterIndex)) + "</em>";

    var content = document.createElement("div");
    content.className = "campaign-map-header-content";
    content.appendChild(title);
    content.appendChild(story);
    header.appendChild(content);
    return header;
  }

  function renderRouteMap(profile, chapterIndex, levelsInChapter, selectedLevelModel, callbacks, chapterAssets) {
    var map = document.createElement("section");
    map.className = "campaign-map-route";
    var routeSrc = chapterAssets.routes && chapterAssets.routes[chapterIndex] || "";
    var routeArt = createArtImage("campaign-map-route-art", routeSrc, "");
    routeArt.onerror = function onRouteError() { routeArt.classList.add("is-missing"); };
    map.appendChild(routeArt);

    var label = document.createElement("span");
    label.className = "campaign-map-route-label";
    label.textContent = "作战航线 / ROUTE MAP";
    map.appendChild(label);

    var points = getRoutePoints(levelsInChapter.length);
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "campaign-map-route-lines");
    svg.setAttribute("viewBox", "0 0 1544 300");
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    var polyline = points.map(function pointText(point) { return point.x + "," + point.y; }).join(" ");
    svg.appendChild(createRouteLine(polyline, "campaign-map-route-line-base"));
    svg.appendChild(createRouteLine(polyline, "campaign-map-route-line-glow"));
    map.appendChild(svg);

    levelsInChapter.forEach(function renderNode(level, index) {
      var point = points[index] || points[points.length - 1] || { x: 772, y: 150 };
      var unlocked = level.id <= (profile.unlockedLevel || 0);
      var completed = isCompleted(profile, level);
      var selected = selectedLevelModel && selectedLevelModel.id === level.id;
      var node = document.createElement("button");
      var nodeAsset = selectNodeAsset(chapterAssets, unlocked, selected, level.isDifficultyStage);
      node.type = "button";
      node.disabled = !unlocked;
      node.className = "campaign-map-node" + (selected ? " is-active" : "") + (completed ? " is-completed" : "") + (unlocked ? "" : " is-locked") + (level.isDifficultyStage ? " is-boss" : "");
      node.style.left = point.x + "px";
      node.style.top = point.y + "px";
      node.style.setProperty("--campaign-node-art", assetUrl(nodeAsset));
      node.innerHTML = '<span>' + escapeHtml(level.code || level.id) + '</span>' + renderNodeHonor(getStageHonor(profile, level), completed, level.isDifficultyStage);
      node.addEventListener("click", function onSelectNode() {
        if (callbacks.onSelectLevel) callbacks.onSelectLevel(level.id, level.chapterIndex);
      });
      map.appendChild(node);
    });
    return map;
  }

  function renderMissionDetail(profile, level, callbacks, chapterAssets) {
    var detail = document.createElement("section");
    detail.className = "campaign-map-detail";
    detail.appendChild(createArtImage("campaign-map-section-art", chapterAssets.detailFrame, ""));

    var story = getStageBriefing(level);
    var honor = getStageHonor(profile, level);
    var replayScenes = getReplayScenes(level);
    var cells = document.createElement("div");
    cells.className = "campaign-map-detail-cells";
    cells.innerHTML =
      renderDetailCell("campaign-map-detail-main", "", getMissionType(level), getLevelTitle(level), story.summary || level && level.desc || "选择关卡后开始战斗。") +
      renderDetailCell("", "status", "状态", getLevelStatus(profile, level), "") +
      renderDetailCell("", "target", "作战目标", findStoryValue(story, ["作战目标", "目标"]) || level && level.desc || "击破关卡 BOSS", "") +
      renderDetailCell("", "enemy", "主要敌军", findStoryValue(story, ["主要敌情", "敌情"]) || (level && level.isDifficultyStage ? "重甲旗舰 / 护卫群" : "敌方战斗机 / 精英护航"), "") +
      renderDetailCell("", "drop", "可能掉落", "强化凭证 / 战斗金币", "") +
      renderDetailCell("", "reward", "首通奖励", String(level && level.reward || 0) + " 金币", "") +
      renderDetailCell("campaign-map-detail-honor", "honor", "荣誉评价", renderHonorBadge(honor, false), "", true) +
      '<div class="campaign-map-detail-cell campaign-map-detail-story">' +
        (replayScenes.length
          ? '<button type="button" data-story-replay="1">' + renderIcon("story", chapterAssets) + '<span>回顾剧情</span></button>'
          : '<span class="campaign-map-no-story">无剧情</span>') +
      "</div>";
    detail.appendChild(cells);
    hydrateDetailIcons(detail, chapterAssets);

    var replayButton = detail.querySelector("[data-story-replay]");
    if (replayButton) replayButton.addEventListener("click", function onReplayStory(event) {
      event.preventDefault();
      event.stopPropagation();
      if (callbacks.onReplayStory && level) callbacks.onReplayStory(level);
    });
    return detail;
  }

  function renderActions(profile, level, callbacks, chapterAssets) {
    var actions = document.createElement("section");
    actions.className = "campaign-map-actions";

    var backButton = document.createElement("button");
    backButton.type = "button";
    backButton.className = "campaign-map-action campaign-map-action-secondary";
    backButton.style.setProperty("--campaign-action-art", assetUrl(chapterAssets.buttons && chapterAssets.buttons.secondary));
    backButton.innerHTML = renderIcon("back", chapterAssets) + "<span>返回大厅</span>";
    backButton.addEventListener("click", function onBackLobby() {
      if (callbacks.onBackLobby) callbacks.onBackLobby();
    });
    actions.appendChild(backButton);

    if (callbacks.actionButton) {
      callbacks.actionButton.className = "campaign-map-action campaign-map-action-primary";
      callbacks.actionButton.style.setProperty("--campaign-action-art", assetUrl(chapterAssets.buttons && chapterAssets.buttons.primary));
      actions.appendChild(callbacks.actionButton);
    }

    var sweepButton = document.createElement("button");
    var canSweep = isCompleted(profile, level);
    sweepButton.type = "button";
    sweepButton.className = "campaign-map-action campaign-map-action-secondary";
    sweepButton.disabled = !canSweep;
    sweepButton.style.setProperty("--campaign-action-art", assetUrl(chapterAssets.buttons && (canSweep ? chapterAssets.buttons.secondary : chapterAssets.buttons.disabled)));
    sweepButton.innerHTML = renderIcon("energy", chapterAssets) + '<span>' + (canSweep ? "扫荡 " + (level && level.code || "") + " -" + ENERGY_COST + " 体力" : "通关后可扫荡") + "</span>";
    sweepButton.addEventListener("click", function onSweep() {
      if (callbacks.onSweepLevel && level) callbacks.onSweepLevel(level.id);
    });
    actions.appendChild(sweepButton);
    return actions;
  }

  function setAssetVariables(canvas, chapterAssets) {
    canvas.style.setProperty("--campaign-shell-art", assetUrl(chapterAssets.screenShell));
  }

  function selectNodeAsset(chapterAssets, unlocked, selected, isBoss) {
    var nodeAssets = chapterAssets.nodes || {};
    if (!unlocked) return nodeAssets.locked;
    if (selected) return nodeAssets.active;
    if (isBoss) return nodeAssets.boss;
    return nodeAssets.normal;
  }

  function createChapterHandler(callbacks, chapterIndex) {
    return function onClickChapter() {
      if (callbacks.onSelectChapter) callbacks.onSelectChapter(chapterIndex);
    };
  }

  function createRouteLine(points, className) {
    var line = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    line.setAttribute("points", points);
    line.setAttribute("class", className);
    return line;
  }

  function createArtImage(className, src, alt) {
    var image = document.createElement("img");
    image.className = className;
    image.src = src || "";
    image.alt = alt || "";
    image.draggable = false;
    image.setAttribute("aria-hidden", alt ? "false" : "true");
    return image;
  }

  function renderDetailCell(className, iconName, label, value, detail, allowHtml) {
    return '<div class="campaign-map-detail-cell ' + className + '">' +
      (iconName ? '<span class="campaign-map-detail-icon" data-icon="' + iconName + '"></span>' : "") +
      '<small>' + escapeHtml(label) + '</small>' +
      '<strong>' + (allowHtml ? value : escapeHtml(value)) + '</strong>' +
      (detail ? '<p>' + escapeHtml(detail) + "</p>" : "") +
    "</div>";
  }

  function hydrateDetailIcons(rootNode, chapterAssets) {
    var nodes = rootNode.querySelectorAll("[data-icon]");
    for (var i = 0; i < nodes.length; i += 1) {
      nodes[i].innerHTML = renderIcon(nodes[i].getAttribute("data-icon"), chapterAssets);
    }
  }

  function renderIcon(name, chapterAssets) {
    var src = chapterAssets.icons || "";
    return '<svg class="campaign-map-icon" aria-hidden="true"><use href="' + escapeHtml(src) + "#" + escapeHtml(name) + '"></use></svg>';
  }

  function renderNodeHonor(honor, completed, isBoss) {
    if (honor.tier > 0) return renderHonorBadge(honor, true);
    return '<em>' + (completed ? "★★★" : isBoss ? "决战" : "待命") + "</em>";
  }

  function getStageHonor(profile, level) {
    if (!level || !profile || !profile.progress || !profile.progress.stageHonors) return { tier: 0 };
    var stageId = level.chapterIndex === 0 ? "prologue_" + level.stageInChapter : level.chapterIndex + "_" + level.stageInChapter;
    return { tier: Math.max(0, Math.floor(Number(profile.progress.stageHonors[stageId]) || 0)) };
  }

  function renderHonorBadge(honor, compact) {
    var tier = Math.max(0, Math.min(5, Math.floor(Number(honor && honor.tier) || 0)));
    var stars = "";
    for (var i = 1; i <= 3; i += 1) stars += '<i class="' + (i <= Math.min(3, tier) ? "is-filled" : "") + '">★</i>';
    var crown = getHonorIconSrc(tier);
    return '<span class="campaign-map-honor' + (compact ? " is-compact" : "") + '"><span>' + stars + "</span>" + (crown ? '<img src="' + escapeHtml(crown) + '" alt="">' : "") + "</span>";
  }

  function getHonorIconSrc(tier) {
    if (tier >= 5) return settlementIcons.crownColorful || "";
    if (tier >= 4) return settlementIcons.crownGold || "";
    return "";
  }

  function getRoutePoints(count) {
    return count <= 3 ? ROUTE_POINTS_3.slice(0, count) : ROUTE_POINTS_10.slice(0, count);
  }

  function getChapterProgressText(chapterIndex) {
    if (chapterIndex === 0) return "完成三项升空训练后转入实战。";
    return chapterIndex + "-10 将结束本章故事并返还作战航线。";
  }

  function getChapterTitle(chapterIndex) {
    var chapterStory = getChapterBriefing(chapterIndex);
    if (chapterStory && chapterStory.title) return chapterStory.title;
    var storyTitle = storyConfig.chapterNames && storyConfig.chapterNames[chapterIndex];
    return storyTitle || FALLBACK_CHAPTER_NAMES[chapterIndex] || FALLBACK_CHAPTER_NAMES[1];
  }

  function getChapterBriefing(chapterIndex) {
    if (campaignStory.getChapterBriefingViewModel) return campaignStory.getChapterBriefingViewModel(chapterIndex) || {};
    if (campaignStory.getChapterStory) return campaignStory.getChapterStory(chapterIndex) || {};
    return { title: FALLBACK_CHAPTER_NAMES[chapterIndex] || FALLBACK_CHAPTER_NAMES[1], summary: CHAPTER_SUMMARIES[chapterIndex] || CHAPTER_SUMMARIES[1] };
  }

  function getStageBriefing(level) {
    if (!level) return {};
    if (campaignStory.getStageBriefingViewModel) return campaignStory.getStageBriefingViewModel(level.chapterIndex, level.stageInChapter) || {};
    if (campaignStory.getStageStory) return campaignStory.getStageStory(level.chapterIndex, level.stageInChapter) || {};
    return storyConfig.getStageBattleStory ? storyConfig.getStageBattleStory(level.chapterIndex, level.stageInChapter) || {} : {};
  }

  function findStoryValue(viewModel, labels) {
    var rows = Array.isArray(viewModel && viewModel.rows) ? viewModel.rows : [];
    for (var i = 0; i < rows.length; i += 1) {
      if (labels.indexOf(rows[i].label) >= 0) return rows[i].value || "";
    }
    return "";
  }

  function getReplayScenes(level) {
    if (!level || !campaignStory.getStoryReplayScenes) return [];
    return campaignStory.getStoryReplayScenes({ chapterIndex: level.chapterIndex, stageInChapter: level.stageInChapter }) || [];
  }

  function getShortChapterName(chapterIndex) {
    var parts = getChapterTitle(chapterIndex).split("：");
    return parts[1] || parts[0] || "";
  }

  function getLevelTitle(level) {
    return level ? (level.code || level.id) + " " + (level.name || "") : "未选择关卡";
  }

  function getMissionType(level) {
    if (!level) return "作战关卡";
    return level.isDifficultyStage ? "章节决战" : level.hasBoss ? "BOSS 作战" : "常规作战";
  }

  function getLevelStatus(profile, level) {
    if (!level) return "未选择";
    if (isCompleted(profile, level)) return "已通关";
    return level.id <= (profile.unlockedLevel || 0) ? "已解锁" : "未解锁";
  }

  function isCompleted(profile, level) {
    if (!level) return false;
    var completed = profile.completed || [];
    var cleared = profile.progress && profile.progress.clearedStageIds || [];
    var stageId = level.chapterIndex === 0 ? "prologue_" + level.stageInChapter : level.chapterIndex + "_" + level.stageInChapter;
    return completed.indexOf(level.id) >= 0 || cleared.indexOf(stageId) >= 0;
  }

  function findLevel(levelId) {
    return levels.find(function find(level) { return level.id === levelId; });
  }

  function assetUrl(src) {
    if (!src) return "none";
    var resolved = String(src);
    try {
      resolved = new URL(resolved, document.baseURI).href;
    } catch (error) {
      resolved = String(src);
    }
    return 'url("' + resolved.replace(/"/g, "%22") + '")';
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  var api = { renderChapterSelect: renderChapterSelect };
  scope.chapterSelectView = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
