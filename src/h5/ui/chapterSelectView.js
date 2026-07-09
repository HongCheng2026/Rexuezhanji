(function registerChapterSelectView(root) {
  var scope = root.RXGame || (root.RXGame = {});

  var levelsConfig = scope.levels || {};
  var combatStats = scope.combatStats || {};
  var assets = scope.assets || {};
  var settlementIcons = assets.SETTLEMENT_ICON_ASSETS || {};
  var storyConfig = scope.stageStoryConfig || {};
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
    "夺回城市外环制空权，在敌军包围圈中打通第一条航线。",
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
    { x: 18, y: 58 },
    { x: 50, y: 38 },
    { x: 82, y: 58 }
  ];

  var ROUTE_POINTS_10 = [
    { x: 10, y: 62 },
    { x: 19, y: 38 },
    { x: 29, y: 57 },
    { x: 39, y: 32 },
    { x: 50, y: 52 },
    { x: 61, y: 32 },
    { x: 71, y: 57 },
    { x: 81, y: 38 },
    { x: 92, y: 26 },
    { x: 88, y: 78 }
  ];

  function renderChapterSelect(container, profile, selectedChapter, selectedLevel, callbacks) {
    callbacks = callbacks || {};
    container.innerHTML = "";
    container.className = "chapter-select cover-chapter-select starmap-select";

    var levelsInChapter = levels.filter(function filterChapter(level) {
      return level.chapterIndex === selectedChapter;
    });
    var selectedLevelModel = findLevel(selectedLevel) || levelsInChapter[0] || levels[0];
    var chapterTitle = getChapterTitle(selectedChapter);
    var cover = getChapterCover(selectedChapter);

    var coverLayer = document.createElement("div");
    coverLayer.className = "chapter-cover-layer";
    var coverImage = document.createElement("img");
    coverImage.className = "chapter-cover-image";
    coverImage.alt = "";
    coverImage.src = cover;
    coverImage.onerror = function fallbackCover() {
      var fallback = assets.BACKGROUND_ASSETS && assets.BACKGROUND_ASSETS[0];
      if (fallback && coverImage.src !== fallback.src) coverImage.src = fallback.src;
    };
    coverLayer.appendChild(coverImage);
    container.appendChild(coverLayer);

    container.appendChild(renderChapterStrip(profile, selectedChapter, callbacks));

    var board = document.createElement("section");
    board.className = "starmap-board starmap-board-merged";

    var mapPanel = document.createElement("section");
    mapPanel.className = "mission-map-panel";
    mapPanel.innerHTML =
      '<header class="mission-briefing-head">' +
        '<span class="briefing-kicker">作战航线 / ROUTE MAP</span>' +
        '<h2>' + escapeHtml(chapterTitle) + '</h2>' +
        '<p>' + escapeHtml(CHAPTER_SUMMARIES[selectedChapter] || CHAPTER_SUMMARIES[1]) + '</p>' +
      '</header>';
    mapPanel.appendChild(renderRouteMap(profile, levelsInChapter, selectedLevelModel, callbacks));
    mapPanel.appendChild(renderMissionDetail(profile, selectedLevelModel));
    board.appendChild(mapPanel);
    container.appendChild(board);

    var actions = document.createElement("section");
    actions.className = "starmap-actions";
    var backButton = document.createElement("button");
    backButton.className = "briefing-back-button";
    backButton.type = "button";
    backButton.textContent = "返回大厅";
    backButton.addEventListener("click", function onBackLobby() {
      if (callbacks.onBackLobby) callbacks.onBackLobby();
    });
    actions.appendChild(backButton);
    if (callbacks.actionButton) {
      callbacks.actionButton.classList.add("briefing-start-button");
      actions.appendChild(callbacks.actionButton);
    }
    var sweepButton = document.createElement("button");
    sweepButton.className = "briefing-sweep-button";
    sweepButton.type = "button";
    sweepButton.disabled = !isCompleted(profile, selectedLevelModel);
    sweepButton.textContent = sweepButton.disabled
      ? "通关后可扫荡"
      : "扫荡 " + (selectedLevelModel && selectedLevelModel.code || "") + " -" + ENERGY_COST + " 体力";
    sweepButton.addEventListener("click", function onSweep() {
      if (callbacks.onSweepLevel && selectedLevelModel) callbacks.onSweepLevel(selectedLevelModel.id);
    });
    actions.appendChild(sweepButton);
    container.appendChild(actions);

    return {
      container: container,
      levelGrid: mapPanel,
      selectedLevel: selectedLevelModel
    };
  }

  function renderChapterStrip(profile, selectedChapter, callbacks) {
    var strip = document.createElement("nav");
    strip.className = "chapter-strip";
    strip.setAttribute("aria-label", "章节选择");
    var activeTab = null;

    for (var ci = 0; ci <= 9; ci += 1) {
      var firstLevel = levels.find(function findFirst(level) {
        return level.chapterIndex === ci;
      });
      var tab = document.createElement("button");
      var isCurrent = selectedChapter === ci;
      var isUnlocked = firstLevel && firstLevel.id <= (profile.unlockedLevel || 0);
      tab.type = "button";
      tab.className = "chapter-strip-item" + (isCurrent ? " active" : "") + (isUnlocked ? "" : " locked");
      tab.disabled = !isUnlocked;
      tab.innerHTML =
        '<span>' + (ci === 0 ? "序章" : "第 " + ci + " 章") + '</span>' +
        '<b>' + escapeHtml(getShortChapterName(ci)) + '</b>';
      tab.addEventListener("click", (function createTabHandler(chapterIndex) {
        return function onClickTab() {
          if (callbacks.onSelectChapter) callbacks.onSelectChapter(chapterIndex);
        };
      })(ci));
      if (isCurrent) activeTab = tab;
      strip.appendChild(tab);
    }

    if (activeTab && activeTab.scrollIntoView) {
      setTimeout(function centerActiveChapter() {
        activeTab.scrollIntoView({ block: "nearest", inline: "nearest" });
        var stripRect = strip.getBoundingClientRect ? strip.getBoundingClientRect() : null;
        var tabs = strip.children || [];
        if (!stripRect) return;
        for (var ti = 0; ti < tabs.length; ti += 1) {
          var tabRect = tabs[ti].getBoundingClientRect ? tabs[ti].getBoundingClientRect() : null;
          if (!tabRect || tabRect.right <= stripRect.left || tabRect.left >= stripRect.right) continue;
          if (tabRect.left < stripRect.left && tabRect.right < stripRect.right) {
            strip.scrollLeft += Math.ceil(tabRect.right - stripRect.left + 10);
          }
          break;
        }
      }, 0);
    }

    return strip;
  }

  function renderRouteMap(profile, levelsInChapter, selectedLevelModel, callbacks) {
    var map = document.createElement("div");
    map.className = "mission-route-map";
    var points = getRoutePoints(levelsInChapter.length);
    var polyline = points.map(function pointText(point) {
      return point.x + "," + point.y;
    }).join(" ");

    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "route-lines");
    svg.setAttribute("viewBox", "0 0 100 100");
    svg.setAttribute("preserveAspectRatio", "none");
    var baseLine = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    baseLine.setAttribute("points", polyline);
    baseLine.setAttribute("class", "route-line route-line-base");
    var glowLine = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    glowLine.setAttribute("points", polyline);
    glowLine.setAttribute("class", "route-line route-line-glow");
    svg.appendChild(baseLine);
    svg.appendChild(glowLine);
    map.appendChild(svg);

    levelsInChapter.forEach(function renderNode(level, index) {
      var point = points[index] || points[points.length - 1] || { x: 50, y: 50 };
      var unlocked = level.id <= (profile.unlockedLevel || 0);
      var completed = isCompleted(profile, level);
      var selected = selectedLevelModel && selectedLevelModel.id === level.id;
      var node = document.createElement("button");
      node.type = "button";
      node.disabled = !unlocked;
      node.className = "mission-node" +
        (selected ? " active" : "") +
        (completed ? " completed" : "") +
        (unlocked ? "" : " locked") +
        (level.isDifficultyStage ? " boss" : "");
      node.style.left = point.x + "%";
      node.style.top = point.y + "%";
      var honor = getStageHonor(profile, level);
      node.innerHTML =
        '<span class="node-code">' + escapeHtml(level.code || level.id) + '</span>' +
        '<span class="node-dot"></span>' +
        (honor.tier > 0
          ? renderHonorBadge(honor, true)
          : '<span class="node-type">' + escapeHtml(level.isDifficultyStage ? "决战" : getLevelStatus(profile, level)) + '</span>');
      node.addEventListener("click", function onSelectNode() {
        if (callbacks.onSelectLevel) callbacks.onSelectLevel(level.id, level.chapterIndex);
      });
      map.appendChild(node);
    });

    return map;
  }

  function renderMissionDetail(profile, level) {
    var detail = document.createElement("aside");
    detail.className = "mission-detail-card mission-detail-strip";
    var honor = getStageHonor(profile, level);
    detail.innerHTML =
      '<div class="mission-detail-main">' +
        '<span class="mission-detail-kicker">' + escapeHtml(getMissionType(level)) + '</span>' +
        '<strong>' + escapeHtml(getLevelTitle(level)) + '</strong>' +
        '<p>' + escapeHtml(level && level.desc || "选择关卡后开始战斗。") + '</p>' +
      '</div>' +
      '<div class="mission-detail-meta">' +
      '<span>状态 ' + escapeHtml(getLevelStatus(profile, level)) + '</span>' +
      '<span>奖励 ' + escapeHtml(level && level.reward || 0) + '</span>' +
      '<span class="mission-honor-meta">' + renderHonorBadge(honor, false) + '</span>' +
      '<span>' + escapeHtml(level && level.isDifficultyStage ? "最终节点" : "航线节点") + '</span>' +
      '</div>';
    return detail;
  }

  function getStageHonor(profile, level) {
    if (!level || !profile || !profile.progress || !profile.progress.stageHonors) {
      return { tier: 0, shortLabel: "", longLabel: "" };
    }
    var stageId = level.chapterIndex === 0 ? "prologue_" + level.stageInChapter : level.chapterIndex + "_" + level.stageInChapter;
    var tier = Math.max(0, Math.floor(Number(profile.progress.stageHonors[stageId]) || 0));
    var shortLabels = { 1: "1星", 2: "2星", 3: "3星", 4: "皇冠", 5: "彩冠" };
    var longLabels = { 1: "1星", 2: "2星", 3: "3星", 4: "三星+皇冠", 5: "三星+彩冠" };
    return { tier: tier, shortLabel: shortLabels[tier] || "", longLabel: longLabels[tier] || "" };
  }

  function renderHonorBadge(honor, compact) {
    honor = honor || {};
    var tier = Math.max(0, Math.min(5, Math.floor(Number(honor.tier) || 0)));
    var icon = getHonorIconSrc(tier);
    var filledStars = Math.min(3, tier);
    var stars = "";
    for (var si = 1; si <= 3; si += 1) {
      stars += '<i class="' + (si <= filledStars ? "filled" : "") + '"></i>';
    }
    return '<span class="honor-badge tier-' + tier + (compact ? " compact" : "") + '">' +
      '<span class="honor-stars">' + stars + '</span>' +
      (icon && tier >= 4 ? '<img class="honor-crown" src="' + escapeHtml(icon) + '" alt="">' : "") +
    '</span>';
  }

  function getHonorIconSrc(tier) {
    if (tier >= 5) return settlementIcons.crownColorful || "";
    if (tier >= 4) return settlementIcons.crownGold || "";
    return "";
  }

  function getRoutePoints(count) {
    if (count <= 3) return ROUTE_POINTS_3.slice(0, count);
    return ROUTE_POINTS_10.slice(0, count);
  }

  function getChapterCover(chapterIndex) {
    var cover = (assets.CHAPTER_COVER_ASSETS || []).find(function findCover(item) {
      return item.chapterIndex === chapterIndex;
    });
    var fallback = assets.BACKGROUND_ASSETS && assets.BACKGROUND_ASSETS[0];
    return cover && cover.src || fallback && fallback.src || "";
  }

  function getChapterTitle(chapterIndex) {
    var storyTitle = storyConfig.chapterNames && storyConfig.chapterNames[chapterIndex];
    return storyTitle || FALLBACK_CHAPTER_NAMES[chapterIndex] || FALLBACK_CHAPTER_NAMES[1];
  }

  function getShortChapterName(chapterIndex) {
    var title = getChapterTitle(chapterIndex);
    var parts = title.split("：");
    return parts[1] || parts[0] || "";
  }

  function getLevelTitle(level) {
    if (!level) return "未选择关卡";
    return (level.code || level.id) + " " + (level.name || "");
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

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  var api = {
    renderChapterSelect: renderChapterSelect
  };

  scope.chapterSelectView = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
