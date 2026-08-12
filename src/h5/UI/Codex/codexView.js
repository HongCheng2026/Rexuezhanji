/**
 * 图鉴模块视图 (codexView.js) — v4 重新布局版
 *
 * 三栏档案舱布局：
 *   左栏 ─ 战姬 / 战机 / 首领 / 敌机(含弹种) / 羁绊 竖向分类列表
 *   中栏 ─ 随分类切换的档案索引
 *   右栏 ─ 当前条目的同屏完整详情
 *
 * 详情区采用「3 张等大卡 + 同一底色」结构：
 *   - 卡 1：图像（机库底色，未解锁剪影受图卡边界裁切）
 *   - 卡 2：信息（出战属性 / 激活属性 / 参与羁绊 或 核心机制 / 签名技能）
 *   - 卡 3：小传 / 战机档案 / 首领战绩
 * BOSS 详情额外要求：上下两区固定 1fr，签名技能溢出走图卡内部滑块。
 *
 * 解锁规则：
 *   战姬 / 战机 ── profile.owned 包含即「已获得」（高亮），否则剪影
 *   首领 / 敌机 / 弹种 ── 随玩家推进关卡解锁（已解锁显示，否则剪影）
 *
 * 仅依赖 scope 上的数据/配置模块，不直接耦合 Gameplay 实现。
 *
 * @module codexView
 */
(function registerCodexView(root) {
  "use strict";
  var scope = root.RXGame || (root.RXGame = {});

  var CATEGORIES = [
    { key: "pilot", label: "战姬", code: "PILOT" },
    { key: "ship", label: "战机", code: "FIGHTER" },
    { key: "boss", label: "首领", code: "THREAT" },
    { key: "enemy", label: "敌机", code: "HOSTILE" },
    { key: "bond", label: "羁绊", code: "LINK" }
  ];

  var CHAPTER_NAMES = ["序章", "第一章", "第二章", "第三章", "第四章",
    "第五章", "第六章", "第七章", "第八章", "第九章"];

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch];
    });
  }
  function escapeAttr(value) { return escapeHtml(value); }

  function getAssets() { return scope.assets || {}; }
  function getCombatCodex() { return scope.combatCodexConfig || {}; }
  function getEnemyStageBalance() { return scope.enemyStageBalance || {}; }
  function getMechData() { return scope.codexBossMechanics || {}; }
  function getCodexBalance() { return scope.codexBalance || {}; }

  function getCategoryDefinition(category) {
    for (var i = 0; i < CATEGORIES.length; i++) {
      if (CATEGORIES[i].key === category) return CATEGORIES[i];
    }
    return { key: category, label: "档案", code: "ARCHIVE" };
  }

  // ── 解锁判定 ────────────────────────────────────────────────
  function getUnlockedChapters(profile) {
    var prog = (profile && profile.progress) || {};
    var set = { 0: true, 1: true }; // 序章 + 第一章默认可见
    var stages = Array.isArray(prog.clearedStageIds) ? prog.clearedStageIds : [];
    stages.forEach(function (s) {
      if (s === "prologue_1" || s === "prologue_2" || s === "prologue_3") { set[0] = true; return; }
      var m = /^(\d+)_/.exec(String(s));
      if (m) set[parseInt(m[1], 10)] = true;
    });
    var chs = Array.isArray(prog.clearedChapterIds) ? prog.clearedChapterIds : [];
    chs.forEach(function (c) { set[c] = true; });
    return set;
  }

  function isOwned(profile, type, id) {
    var owned = (profile && profile.owned) || {};
    var list = type === "pilot"
      ? (Array.isArray(owned.pilots) ? owned.pilots : [])
      : (Array.isArray(owned.ships) ? owned.ships : []);
    return list.indexOf(id) >= 0;
  }

  function isBossUnlocked(profile, boss) {
    var prog = (profile && profile.progress) || {};
    var stages = Array.isArray(prog.clearedStageIds) ? prog.clearedStageIds : [];
    var cc = getCombatCodex();
    var stageId = cc.getStageId
      ? cc.getStageId(boss.chapterIndex, boss.stageInChapter)
      : (boss.chapterIndex + "_" + boss.stageInChapter);
    if (stages.indexOf(stageId) >= 0) return true;
    return !!getUnlockedChapters(profile)[boss.chapterIndex];
  }

  function isUnlocked(profile, category, item) {
    if (category === "pilot" || category === "ship") return isOwned(profile, category, item._id);
    if (category === "boss") return isBossUnlocked(profile, item);
    if (category === "enemy") {
      if (item._kind === "bullet") return !!getUnlockedChapters(profile)[item.firstChapter];
      return !!getUnlockedChapters(profile)[item.chapterIndex];
    }
    return false;
  }

  // ── 数据收集 ────────────────────────────────────────────────
  function collect(category, profile) {
    var assets = getAssets();
    var cc = getCombatCodex();
    if (category === "pilot") {
      return (assets.PILOT_ASSETS || []).map(function (p) {
        return { _id: p.id, _name: p.name, _src: p.src, _rank: p.rank, _kind: "pilot",
          codeName: p.codeName, damage: p.damage, description: p.description, story: p.story };
      });
    }
    if (category === "ship") {
      return (assets.SHIP_ASSETS || []).map(function (s) {
        return { _id: s.id, _name: s.name, _src: s.src, _rank: s.rank, _kind: "ship",
          codeName: s.codeName, damage: s.damage, hp: s.hp, description: s.description, story: s.story,
          primaryWeapon: s.primaryWeapon,
          activeSkills: s.activeSkills, decisiveCommandEffect: s.decisiveCommandEffect };
      });
    }
    if (category === "boss") {
      var bosses = (cc.BOSSES || []).slice().sort(function (a, b) {
        return a.chapterIndex - b.chapterIndex || a.stageInChapter - b.stageInChapter;
      });
      // 每章只保留一个代表（取该章首个 boss），不在图鉴中按关卡逐一列出
      var seenBossCh = {};
      var bossItems = [];
      bosses.forEach(function (b) {
        if (!seenBossCh[b.chapterIndex]) {
          seenBossCh[b.chapterIndex] = true;
          var vis = assets.BOSS_VISUALS && assets.BOSS_VISUALS[b.chapterIndex];
          bossItems.push({ _id: b.bossId, _name: b.name, _src: vis ? vis.src : (assets.ASSET_PATHS && assets.ASSET_PATHS.boss) || "",
            _kind: "boss", chapterIndex: b.chapterIndex, stageInChapter: b.stageInChapter, phaseProfile: b.phaseProfile });
        }
      });
      return bossItems;
    }
    if (category === "enemy") {
      // 敌机与弹种合并到同一标签下：先列敌机再列弹种，便于在敌机页内一并查阅
      var list = (cc.REGULAR_ENEMIES || []).slice().sort(function (a, b) {
        return a.chapterIndex - b.chapterIndex;
      });
      var PRIORITY = { elite: 0, fighter: 1, mob: 2 };
      var bestEnemyByCh = {};
      list.forEach(function (e) {
        var ch = e.chapterIndex;
        var cur = bestEnemyByCh[ch];
        var rank = PRIORITY[e.category];
        if (!cur || (rank != null && (PRIORITY[cur.category] == null || rank < PRIORITY[cur.category]))) {
          bestEnemyByCh[ch] = e;
        }
      });
      var enemyItems = Object.keys(bestEnemyByCh).map(function (ch) {
        var e = bestEnemyByCh[ch];
        var art = cc.resolveEnemyArt ? cc.resolveEnemyArt(e, assets) : { src: null };
        return { _id: e.unitId, _name: e.name, _src: art.src, _kind: "enemy",
          chapterIndex: e.chapterIndex, category: e.category, codex: e.codex || {} };
      }).sort(function (a, b) { return a.chapterIndex - b.chapterIndex; });

      // 弹种：每「首次出现章节」只保留一个代表
      var bc = assets.ENEMY_BULLET_CODEX || {};
      var bulletByCh = {};
      Object.keys(bc).forEach(function (k) {
        var b = bc[k];
        var ch = b.firstChapter || 0;
        if (!bulletByCh[ch]) {
          bulletByCh[ch] = { _id: k, _name: b.name, _src: b.src, _kind: "bullet",
            firstChapter: b.firstChapter, danger: b.danger };
        }
      });
      var bulletItems = Object.keys(bulletByCh).map(function (ch) { return bulletByCh[ch]; })
        .sort(function (a, b) { return (a.firstChapter || 0) - (b.firstChapter || 0); });

      return enemyItems.concat(bulletItems);
    }
    return [];
  }

  // ── 剪影 ────────────────────────────────────────────────────
  function silhouetteSvg(type) {
    if (type === "ship") {
      return '<svg viewBox="0 0 64 64" class="codex-silhouette" aria-hidden="true">' +
        '<path d="M32 6 L44 30 L38 34 L38 56 L26 56 L26 34 L20 30 Z"/></svg>';
    }
    if (type === "pilot") {
      return '<svg viewBox="0 0 64 64" class="codex-silhouette" aria-hidden="true">' +
        '<circle cx="32" cy="18" r="11"/><path d="M15 54 Q15 32 32 32 Q49 32 49 54 Z"/></svg>';
    }
    if (type === "boss") {
      return '<svg viewBox="0 0 64 64" class="codex-silhouette" aria-hidden="true">' +
        '<path d="M32 4 L58 24 L50 56 L14 56 L6 24 Z"/></svg>';
    }
    if (type === "enemy") {
      return '<svg viewBox="0 0 64 64" class="codex-silhouette" aria-hidden="true">' +
        '<path d="M32 6 L54 20 L54 44 L32 58 L10 44 L10 20 Z"/></svg>';
    }
    if (type === "bullet") {
      return '<svg viewBox="0 0 64 64" class="codex-silhouette" aria-hidden="true">' +
        '<circle cx="32" cy="32" r="6"/><circle cx="32" cy="32" r="14" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
    }
    return '<svg viewBox="0 0 64 64" class="codex-silhouette" aria-hidden="true">' +
      '<circle cx="32" cy="32" r="20"/></svg>';
  }

  // ── 渲染入口 ────────────────────────────────────────────────
  function renderCodex(dom, profile, opts) {
    opts = opts || {};
    profile = profile || {};
    if (!dom || !dom.featurePanelSlots) return;

    dom.featurePanelKicker.textContent = "CODEX ARCHIVE";
    dom.featurePanelTitle.textContent = "星舰图鉴";
    dom.featurePanelBody.textContent = "战姬 / 战机 / 首领 / 敌机(含弹种) / 羁绊 全档案，随收集与关卡进度解锁。";
    dom.featurePanelSlots.className = "codex-module-slot";
    dom.featurePanelSlots.innerHTML = "";

    var module = document.createElement("section");
    module.className = "codex-module";

    var nav = buildNav();
    var content = document.createElement("div");
    content.className = "codex-content";

    module.appendChild(nav);
    module.appendChild(content);
    dom.featurePanelSlots.appendChild(module);

    renderCategory(lastCategory || "pilot", content, profile, opts);
    return {
      refresh: function refresh(nextProfile, statusText, isError) {
        lastProfile = nextProfile || {};
        lastStatusText = statusText || "";
        lastStatusError = Boolean(isError);
        if (content.isConnected) renderCategory(lastCategory || "pilot", content, lastProfile, lastOpts);
      }
    };
  }

  function buildNav() {
    var nav = document.createElement("nav");
    nav.className = "codex-nav";
    nav.setAttribute("aria-label", "图鉴分类");
    CATEGORIES.forEach(function (cat) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "codex-nav-btn";
      btn.textContent = cat.label;
      btn.setAttribute("data-codex-cat", cat.key);
      btn.setAttribute("data-codex-code", cat.code);
      btn.setAttribute("aria-pressed", "false");
      btn.addEventListener("click", function () {
        var content = nav.parentNode.querySelector(".codex-content");
        renderCategory(cat.key, content, lastProfile, lastOpts);
      });
      nav.appendChild(btn);
    });
    return nav;
  }

  var lastProfile = null;
  var lastOpts = {};
  var lastCategory = "pilot";
  var lastStatusText = "";
  var lastStatusError = false;

  function formatBonusPercent(value) {
    var percent = Math.round((Number(value) || 0) * 10000) / 100;
    return (Number.isInteger(percent) ? String(percent) : percent.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")) + "%";
  }

  function updateBonusSummary(container, profile, statusText, isError) {
    if (!container || !container.querySelector) return;
    var summary = container.classList && container.classList.contains("codex-bonus-summary")
      ? container : container.querySelector(".codex-bonus-summary");
    if (!summary) return;
    var activation = scope.codexSystem && scope.codexSystem.getActivationSummary
      ? scope.codexSystem.getActivationSummary(profile)
      : { activatedUnitCount: 0, activatedBondCount: 0, bonus: {} };
    var bonus = activation.bonus || {};
    summary.innerHTML =
      '<div class="codex-bonus-summary-head"><span>COLLECTION BONUS</span><strong>图鉴总加成</strong></div>' +
      '<div class="codex-bonus-summary-grid">' +
        '<div><span>攻击</span><strong>+' + escapeHtml(Number(bonus.attackFlat) || 0) + '</strong></div>' +
        '<div><span>破甲</span><strong>+' + escapeHtml(formatBonusPercent(bonus.armorPenetrationFlat)) + '</strong></div>' +
        '<div><span>金币</span><strong>+' + escapeHtml(formatBonusPercent(bonus.coinBonusMultiplier)) + '</strong></div>' +
      '</div>' +
      '<small class="codex-bonus-summary-progress' + (isError ? ' is-error' : '') + '" data-codex-sync-status>' +
        escapeHtml(statusText || ("已激活 " + activation.activatedUnitCount + " 个单位 · " + activation.activatedBondCount + " 组羁绊")) +
      '</small>';
  }

  function createBonusSummary(profile) {
    var summary = document.createElement("section");
    summary.className = "codex-bonus-summary";
    summary.setAttribute("aria-label", "图鉴整体属性汇总");
    updateBonusSummary(summary, profile, lastStatusText, lastStatusError);
    return summary;
  }

  function renderCategory(category, content, profile, opts) {
    lastProfile = profile;
    lastOpts = opts || {};
    lastCategory = category;
    // 更新左栏高亮
    var navBtns = content.parentNode.querySelectorAll(".codex-nav-btn");
    for (var i = 0; i < navBtns.length; i++) {
      var active = navBtns[i].getAttribute("data-codex-cat") === category;
      navBtns[i].classList.toggle("active", active);
      navBtns[i].setAttribute("aria-pressed", active ? "true" : "false");
    }

    content.innerHTML = "";
    var cat = getCategoryDefinition(category);
    var indexPane = document.createElement("section");
    indexPane.className = "codex-index-pane";
    var indexHeader = document.createElement("header");
    indexHeader.className = "codex-index-header";
    var bonusSummary = createBonusSummary(profile);
    var gridWrap = document.createElement("div");
    gridWrap.className = "codex-grid-wrap";
    var grid = document.createElement("div");
    grid.className = "codex-grid codex-grid-" + category;
    gridWrap.appendChild(grid);

    var detail = document.createElement("article");
    detail.className = "codex-detail";
    detail.setAttribute("aria-live", "polite");
    detail.innerHTML = '<p class="codex-detail-hint">选择档案条目查看完整资料。</p>';

    indexPane.appendChild(indexHeader);
    indexPane.appendChild(bonusSummary);
    indexPane.appendChild(gridWrap);
    content.appendChild(indexPane);
    content.appendChild(detail);

    if (category === "bond") {
      var bondsState = (scope.codexSystem && scope.codexSystem.getBondsState)
        ? scope.codexSystem.getBondsState(profile)
        : { bonds: [] };
      bondsState.bonds.forEach(function (bs) {
        grid.appendChild(buildBondCard(bs, profile, detail, lastOpts));
      });
      indexHeader.innerHTML = '<span>' + escapeHtml(cat.code) + ' INDEX</span><strong>' +
        escapeHtml(cat.label) + '</strong><em>' + bondsState.bonds.length + ' 项档案</em>';
      var firstBond = grid.querySelector(".codex-bond");
      if (firstBond) firstBond.click();
      return;
    }

    var items = collect(category, profile);
    var unlockedCount = 0;
    items.forEach(function (item) {
      if (isUnlocked(profile, category, item)) unlockedCount += 1;
      grid.appendChild(buildCard(category, item, profile, detail, lastOpts));
    });
    indexHeader.innerHTML = '<span>' + escapeHtml(cat.code) + ' INDEX</span><strong>' +
      escapeHtml(cat.label) + '</strong><em>' + unlockedCount + ' / ' + items.length + ' 已收录</em>';

    // 默认选中第一个
    var firstCard = grid.querySelector(".codex-card");
    if (firstCard) firstCard.click();
  }

  function buildCard(category, item, profile, detail, opts) {
    var unlocked = isUnlocked(profile, category, item);
    var activated = (category === "pilot" || category === "ship") && isUnitActivated(profile, item._id);
    var activatable = (category === "pilot" || category === "ship") && unlocked && !activated;
    var card = document.createElement("button");
    card.type = "button";
    card.className = "codex-card codex-card-" + item._kind + (unlocked ? " is-unlocked" : " is-locked") +
      (activated ? " is-activated" : activatable ? " is-activatable" : "");
    card.setAttribute("data-codex-id", item._id);
    card.setAttribute("aria-pressed", "false");

    var art = document.createElement("div");
    art.className = "codex-card-art";
    if (unlocked && item._src) {
      var img = document.createElement("img");
      img.src = item._src;
      img.alt = item._name;
      img.loading = "lazy";
      art.appendChild(img);
    } else {
      art.innerHTML = silhouetteSvg(item._kind);
    }

    var label = document.createElement("span");
    label.className = "codex-card-label";
    label.textContent = unlocked ? item._name : "加密档案";

    var sub = document.createElement("span");
    sub.className = "codex-card-sub";
    if (item._kind === "boss") sub.textContent = "第" + item.chapterIndex + "章";
    else if (item._kind === "enemy") sub.textContent = enemyCatLabel(item.category);
    else if (item._kind === "bullet") sub.textContent = "弹种 · 第" + (item.firstChapter || 0) + "章";
    else sub.textContent = (item._rank || "") + "级";
    if (!unlocked) sub.textContent = "待解锁";

    var copy = document.createElement("span");
    copy.className = "codex-card-copy";
    copy.appendChild(label);
    copy.appendChild(sub);

    card.appendChild(art);
    card.appendChild(copy);

    card.addEventListener("click", function () {
      var cards = gridOf(card);
      if (cards) {
        var all = cards.querySelectorAll(".codex-card");
        for (var k = 0; k < all.length; k++) {
          all[k].classList.remove("is-selected");
          all[k].setAttribute("aria-pressed", "false");
        }
      }
      card.classList.add("is-selected");
      card.setAttribute("aria-pressed", "true");
      renderDetail(category, item, profile, detail, unlocked, opts);
    });
    return card;
  }

  function gridOf(card) { return card.parentNode; }

  function enemyCatLabel(cat) {
    if (cat === "elite") return "精英";
    if (cat === "fighter") return "普通敌机";
    return "小怪";
  }

  // ── 详情渲染 ────────────────────────────────────────────────
  function renderDetail(category, item, profile, detail, unlocked, opts) {
    if (category === "pilot") return renderUnitDetail(item, detail, "pilot", unlocked, profile, opts);
    if (category === "ship") return renderUnitDetail(item, detail, "ship", unlocked, profile, opts);
    if (category === "boss") return renderBossDetail(item, detail, unlocked);
    if (category === "enemy") {
      if (item._kind === "bullet") return renderBulletDetail(item, detail, unlocked);
      return renderEnemyDetail(item, detail, unlocked);
    }
  }

  function isUnitActivated(profile, id) {
    return Boolean(scope.codexSystem && scope.codexSystem.isUnitActivated && scope.codexSystem.isUnitActivated(profile, id));
  }

  function unitTypeLabel(type) { return type === "pilot" ? "人物小传" : "战机档案"; }

  function unitRecordCode(type) { return type === "pilot" ? "PERSONAL RECORD" : "FIGHTER RECORD"; }

  function unitLore(item, type) {
    if (item.story) return item.story;
    if (item.description) return item.description;
    if (type === "ship") {
      return "代号「" + (item.codeName || item._name) + "」。该战机档案仍在持续补录中。";
    }
    return "该人物档案仍在补录中。";
  }

  function getUnitActivationBonus(rank) {
    var table = getCodexBalance().UNIT_ACTIVATION_BONUS_BY_RANK || {};
    return table[String(rank || "B").toUpperCase()] || { attackFlat: 0, armorPenetrationFlat: 0 };
  }

  function getArmorPenetration(type, rank) {
    var balance = scope.balance || {};
    var table = type === "pilot" ? balance.PILOT_RARITY_STATS : balance.FIGHTER_RARITY_STATS;
    if (table && table[rank]) return Number(table[rank].armorPenetration) || 0;
    return 0;
  }

  // ── 图像卡（统一模板，剪影走图卡边界裁切） ──────────────────────
  function renderImageCard(item, unlocked, opts) {
    opts = opts || {};
    var silhouette = opts.silhouette || item._kind || "pilot";
    var html = '<article class="codex-image-card codex-image-card-' + escapeHtml(silhouette) + '">';
    if (unlocked && item._src) {
      // BOSS 影像走字面量类名 class="codex-boss-target，被样式表选中以施加 drop-shadow
      var classToken = opts.imgClass === "codex-boss-target"
        ? 'class="codex-boss-target'
        : ('class="' + escapeHtml(opts.imgClass || ""));
      html += '<' + 'img ' + classToken + (opts.classified ? ' is-classified' : '') + '" src="' +
        escapeAttr(item._src) + '" alt="' + escapeAttr(item._name) + '">';
    } else {
      html += '<div class="codex-image-card-silhouette">' + silhouetteSvg(silhouette) + '</div>';
    }
    if (opts.scanline) {
      html += '<span class="codex-image-card-scanline">' + escapeHtml(opts.scanline) + '</span>';
    }
    html += '</article>';
    return html;
  }

  // ── 单位详情（战姬 / 战机） ────────────────────────────────
  function renderUnitDetail(item, detail, type, unlocked, profile, opts) {
    var armorPen = getArmorPenetration(type, item._rank);
    var activationBonus = getUnitActivationBonus(item._rank);
    var bonusAttack = activationBonus.attackFlat || 0;
    var bonusPenetration = activationBonus.armorPenetrationFlat || 0;
    var activated = isUnitActivated(profile, item._id);
    var unitBonds = getUnitBonds(profile, item._id);
    var attackVal = Number(item.damage) || 0;
    var hpVal = type === "ship" ? (Number(item.hp) || 0) : 0;
    var penVal = Math.round((armorPen || 0) * 100);

    var html = '<div class="codex-detail-unit codex-detail-unit-' + escapeHtml(type) + ' rank-' + escapeHtml(item._rank) + '">';

    // ── 上半：左图卡 + 右信息卡 ──
    html += '<section class="codex-unit-upper">';
    html += renderImageCard(item, unlocked, { silhouette: type });
    html += '<article class="codex-info-card codex-unit-command">';
    html += '<header class="codex-info-head">';
    html += '<div class="codex-info-head-left">';
    html += '<h3>' + escapeHtml(item._name) + '</h3>';
    html += '<div class="codex-info-head-meta">';
    html += '<span class="codex-detail-rank rank-' + escapeHtml(item._rank) + '">' + escapeHtml(item._rank) + '级</span>';
    if (item.codeName) html += '<span class="codex-detail-code">代号 / ' + escapeHtml(item.codeName) + '</span>';
    html += '</div></div>';
    html += '<span class="codex-detail-status ' + (unlocked ? "is-unlocked" : "is-locked") + '">' +
      (unlocked ? (activated ? "已激活" : "已收录") : "待解锁") + '</span>';
    html += '</header>';

    html += '<div class="codex-info-body">';

    // ① 出战属性
    html += '<section class="codex-info-section">';
    html += '<div class="codex-info-section-head"><span>COMBAT PARAMETER</span><h4>出战属性</h4></div>';
    html += '<div class="codex-stats' + (type === "ship" ? " codex-stats-ship" : "") + '">';
    html += statRowTile("出战攻击", attackVal, attackVal);
    if (type === "ship") html += statRowTile("出战生命", hpVal, hpVal / 5);
    html += statRowTile("出战破甲", penVal + "%", penVal);
    html += '</div></section>';

    // ② 激活属性（与参与羁绊平级，由图鉴控制器处理激活）
    html += '<section class="codex-unit-synergy">';
    html += '<div class="codex-unit-reward">';
    html += '<div class="codex-info-section-head"><span>ARCHIVE REWARD</span><h4>激活属性</h4></div>';
    html += '<div class="codex-reward-row">';
    html += '<div class="codex-reward-tile"><span>攻击</span><strong>+' + bonusAttack + '</strong></div>';
    if (bonusPenetration) {
      html += '<div class="codex-reward-tile"><span>破甲</span><strong>+' + Math.round(bonusPenetration * 100) + '%</strong></div>';
    }
    if (!unlocked) {
      html += '<span class="codex-reward-state">待解锁</span>';
    } else if (!activated) {
      html += '<button type="button" class="codex-unit-activate-btn" data-codex-activate-unit="' + escapeAttr(item._id) + '">激活属性</button>';
    } else {
      html += '<span class="codex-reward-state is-on">已激活</span>';
    }
    html += '</div></div>';

    html += '<div class="codex-unit-bonds">';
    html += '<div class="codex-info-section-head"><span>LINK PROTOCOL</span><h4>参与羁绊</h4></div>';
    if (unitBonds.length) {
      html += '<div class="codex-unit-bond-chips">';
      unitBonds.forEach(function (ub) {
        html += '<span class="codex-unit-bond-chip ' + (ub.activated ? "is-activated" : ub.activatable ? "is-activatable" : "is-locked") + '">' +
          escapeHtml(ub.def.name) + (ub.activated ? " · 已激活" : ub.activatable ? " · 可激活" : " · 未集齐") + '</span>';
      });
      html += '</div>';
    } else {
      html += '<p class="codex-unit-bond-empty">暂无组合羁绊</p>';
    }
    html += '</div>';
    html += '</section>';  // .codex-unit-synergy
    html += '</div>';  // .codex-info-body
    html += '</article>';  // .codex-info-card
    html += '</section>';  // .codex-unit-upper

    // ── 下半：小传 ──
    html += '<section class="codex-unit-lore">';
    html += '<div class="codex-lore-title"><span>' + unitRecordCode(type) + '</span><h4>' + unitTypeLabel(type) + '</h4></div>';
    html += '<p class="codex-lore-story">' + escapeHtml(unitLore(item, type)) + '</p>';
    html += '</section>';

    html += '</div>';
    detail.innerHTML = html;

    var activateBtn = detail.querySelector("[data-codex-activate-unit]");
    if (activateBtn) {
      activateBtn.addEventListener("click", function () {
        if (opts && typeof opts.onActivate === "function") opts.onActivate("unit", item._id);
      });
    }
  }

  function statRowTile(label, value, fillVal) {
    var fill = Math.max(0, Math.min(100, Number(fillVal) || 0));
    return '<div class="codex-stat">' +
      '<span class="codex-stat-label">' + escapeHtml(label) + '</span>' +
      '<strong>' + escapeHtml(value) + '</strong>' +
      '<div class="codex-stat-bar"><span class="codex-stat-bar-fill" style="width:' + fill + '%"></span></div>' +
      '</div>';
  }

  // ── BOSS 详情（上下两区固定 1fr，技能区内部滑块） ──────────
  function renderBossDetail(item, detail, unlocked) {
    var mech = getMechData();
    var esb = getEnemyStageBalance();
    var theme = esb.getBossThemeConfig ? esb.getBossThemeConfig(item.chapterIndex) : null;
    var mechKey = theme ? theme.chapterMechanic : null;
    var mechInfo = (mech.CHAPTER_MECHANICS && mech.CHAPTER_MECHANICS[mechKey]) || mech.CHAPTER_MECHANICS.tutorial || { name: "—", desc: "", phases: [] };
    var skills = (theme && theme.signatureSkills) || [];

    var html = '<div class="codex-detail-boss">';

    // ── 上半：左图卡（含 scanline）+ 右信息卡 ──
    html += '<section class="codex-boss-upper">';
    html += renderImageCard(item, unlocked, {
      silhouette: "boss",
      imgClass: "codex-boss-target",
      classified: !unlocked,
      scanline: unlocked ? 'TARGET IDENTIFIED' : 'SIGNAL CLASSIFIED'
    });
    html += '<article class="codex-info-card codex-boss-info-card">';
    html += '<header class="codex-info-head">';
    html += '<div class="codex-info-head-left">';
    html += '<h3>' + escapeHtml(item._name) + '</h3>';
    html += '<div class="codex-info-head-meta">';
    html += '<span class="codex-detail-chapter">第 ' + item.chapterIndex + ' 章 · 关卡 ' + item.stageInChapter + '</span>';
    html += '</div></div>';
    html += '<span class="codex-detail-status ' + (unlocked ? "is-unlocked" : "is-locked") + '">' +
      (unlocked ? "威胁已识别" : "情报未验证") + '</span>';
    html += '</header>';

    if (!unlocked) html += '<p class="codex-unlock-note">完整战术资料可预览；通关对应章节后解锁目标影像。</p>';

    html += '<div class="codex-info-body">';
    // 核心机制
    html += '<section class="codex-info-section codex-info-mech">';
    html += '<div class="codex-info-section-head"><span>CHAPTER MECHANIC</span><h4>核心机制 · ' + escapeHtml(mechInfo.name || "—") + '</h4></div>';
    html += '<p class="codex-mech-desc">' + escapeHtml(mechInfo.desc || "") + '</p>';
    (mechInfo.phases || []).forEach(function (p) {
      html += '<p class="codex-phase">' + escapeHtml(p) + '</p>';
    });
    html += '</section>';

    // 签名技能（固定标题，列表区走内部滑块以适配任意数量）
    html += '<section class="codex-info-section codex-info-skills">';
    html += '<div class="codex-info-section-head"><span>SIGNATURE SKILLS</span><h4>技能 <em class="codex-skill-count">×' + skills.length + '</em></h4></div>';
    html += '<div class="codex-boss-skills codex-boss-skills-grid">';
    if (skills.length === 0) {
      html += '<p class="codex-boss-skills-empty">本首领无签名技能</p>';
    } else {
      skills.forEach(function (s) {
        var patLabel = (mech.PATTERN_LABEL && mech.PATTERN_LABEL[s.patternOnBoss]) || s.patternOnBoss;
        var desc = (mech.SIGNATURE_SKILL_DESC && mech.SIGNATURE_SKILL_DESC[s.id]) || "";
        html += '<article class="codex-boss-skill">';
        html += '<div class="codex-boss-skill-head"><strong>' + escapeHtml(s.notice || s.id) + '</strong>' +
          '<span class="codex-cd">CD ' + (s.cd || 0) + 's</span></div>';
        html += '<div class="codex-boss-skill-pat">弹幕：' + escapeHtml(patLabel || "—") + '</div>';
        if (desc) html += '<p>' + escapeHtml(desc) + '</p>';
        html += '</article>';
      });
    }
    html += '</div></section>';
    html += '</div>';  // .codex-info-body
    html += '</article>';  // .codex-info-card
    html += '</section>';  // .codex-boss-upper

    // ── 下半：首领战绩 ──
    html += '<section class="codex-unit-lore">';
    html += '<div class="codex-lore-title"><span>WAR RECORD</span><h4>首领战绩</h4></div>';
    html += '<p class="codex-lore-story">' + escapeHtml(bossRecordLore(item)) + '</p>';
    html += '</section>';

    html += '</div>';
    detail.innerHTML = html;
  }

  function bossRecordLore(item) {
    if (item.story) return item.story;
    return "该首领的战绩档案仍在补录中。";
  }

  // ── 敌机详情 ────────────────────────────────────────────
  function renderEnemyDetail(item, detail, unlocked) {
    var codex = item.codex || {};
    var html = '<div class="codex-detail-enemy">';
    html += renderImageCard(item, unlocked, { silhouette: "enemy" });
    html += '<article class="codex-info-card codex-enemy-info-card">';
    html += '<header class="codex-info-head">';
    html += '<div class="codex-info-head-left">';
    html += '<h3>' + escapeHtml(item._name) + '</h3>';
    html += '<div class="codex-info-head-meta">';
    html += '<span class="codex-enemy-cat cat-' + escapeHtml(item.category) + '">' + escapeHtml(enemyCatLabel(item.category)) + '</span>';
    html += '<span class="codex-detail-chapter">第 ' + item.chapterIndex + ' 章</span>';
    html += '</div></div>';
    html += '<span class="codex-detail-status ' + (unlocked ? "is-unlocked" : "is-locked") + '">' +
      (unlocked ? "已收录" : "待解锁") + '</span>';
    html += '</header>';
    if (!unlocked) html += '<p class="codex-unlock-note">战术说明可预览；推进至对应章节后解锁目标影像。</p>';
    html += '<div class="codex-info-body">';
    html += '<section class="codex-info-section"><div class="codex-info-section-head"><span>ATTACK PROFILE</span><h4>攻击方式</h4></div>' +
      '<p>' + escapeHtml(codex.attack || "暂无资料。") + '</p></section>';
    html += '<section class="codex-info-section"><div class="codex-info-section-head"><span>HAZARD</span><h4>危险提示</h4></div>' +
      '<p>' + escapeHtml(codex.danger || "暂无资料。") + '</p></section>';
    html += '</div></article></div>';
    detail.innerHTML = html;
  }

  // ── 弹种详情（在敌机页内作为子条目） ────────────────────
  function renderBulletDetail(item, detail, unlocked) {
    var html = '<div class="codex-detail-bullet">';
    html += renderImageCard(item, unlocked, { silhouette: "bullet" });
    html += '<article class="codex-info-card codex-bullet-info-card">';
    html += '<header class="codex-info-head">';
    html += '<div class="codex-info-head-left">';
    html += '<h3>' + escapeHtml(item._name) + '</h3>';
    html += '<div class="codex-info-head-meta">';
    html += '<span class="codex-bullet-tag">弹种</span>';
    html += '<span class="codex-detail-chapter">首次出现：第 ' + (item.firstChapter || 0) + ' 章</span>';
    html += '</div></div>';
    html += '<span class="codex-detail-status ' + (unlocked ? "is-unlocked" : "is-locked") + '">' +
      (unlocked ? "已收录" : "待解锁") + '</span>';
    html += '</header>';
    if (!unlocked) html += '<p class="codex-unlock-note">弹道资料可预览；推进至对应章节后解锁弹种影像。</p>';
    html += '<div class="codex-info-body">';
    html += '<section class="codex-info-section"><div class="codex-info-section-head"><span>BULLET PROFILE</span><h4>弹种说明</h4></div>' +
      '<p>' + escapeHtml(item.danger || "暂无资料。") + '</p></section>';
    html += '</div></article></div>';
    detail.innerHTML = html;
  }

  // ── 组合羁绊 ──────────────────────────────────────────
  function findAsset(type, id) {
    var assets = getAssets();
    var list = type === "pilot" ? (assets.PILOT_ASSETS || []) : (assets.SHIP_ASSETS || []);
    return list.filter(function (a) { return a && a.id === id; })[0] || null;
  }

  function getUnitBonds(profile, unitId) {
    var system = scope.codexSystem;
    if (!system || !system.getBondsState) return [];
    return system.getBondsState(profile).bonds.filter(function (bs) {
      var req = bs.def && bs.def.requires;
      var ps = (req && req.pilots) || [];
      var ss = (req && req.ships) || [];
      return ps.indexOf(unitId) >= 0 || ss.indexOf(unitId) >= 0;
    });
  }

  function buildBondCard(bs, profile, detail, opts) {
    var def = bs.def;
    var card = document.createElement("button");
    card.type = "button";
    card.className = "codex-bond " + (bs.activated ? "activated" : bs.activatable ? "activatable" : "locked");
    card.setAttribute("data-bond-id", def.id);
    card.setAttribute("aria-pressed", "false");

    var name = document.createElement("span");
    name.className = "codex-bond-name";
    name.textContent = def.name;

    var state = document.createElement("span");
    state.className = "codex-bond-state";
    state.textContent = bs.activated ? "已激活" : bs.activatable ? "可激活" : "未集齐";

    card.appendChild(name);
    card.appendChild(state);

    card.addEventListener("click", function () {
      var cards = gridOf(card);
      if (cards) {
        var all = cards.querySelectorAll(".codex-bond");
        for (var k = 0; k < all.length; k++) {
          all[k].classList.remove("is-selected");
          all[k].setAttribute("aria-pressed", "false");
        }
      }
      card.classList.add("is-selected");
      card.setAttribute("aria-pressed", "true");
      renderBondDetail(bs, detail, profile, opts);
    });
    return card;
  }

  function renderBondUnitList(ids, label, profile) {
    if (!ids.length) return "";
    var owned = (profile && profile.owned) || {};
    var ownedPilots = Array.isArray(owned.pilots) ? owned.pilots : [];
    var ownedShips = Array.isArray(owned.ships) ? owned.ships : [];
    var html = '<div class="codex-bond-unit-row"><em>' + escapeHtml(label) + '</em>';
    ids.forEach(function (id) {
      var isPilot = label === "战姬";
      var has = isPilot ? ownedPilots.indexOf(id) >= 0 : ownedShips.indexOf(id) >= 0;
      var asset = findAsset(isPilot ? "pilot" : "ship", id);
      html += '<span class="codex-bond-unit ' + (has ? "is-have" : "is-miss") + '">' +
        escapeHtml(asset ? asset.name : id) + (has ? "" : " ✕") + '</span>';
    });
    html += '</div>';
    return html;
  }

  function renderBondPortraits(pilotIds, shipIds, profile) {
    var owned = (profile && profile.owned) || {};
    var ownedPilots = Array.isArray(owned.pilots) ? owned.pilots : [];
    var ownedShips = Array.isArray(owned.ships) ? owned.ships : [];
    var entries = pilotIds.map(function (id) { return { id: id, type: "pilot", owned: ownedPilots.indexOf(id) >= 0 }; })
      .concat(shipIds.map(function (id) { return { id: id, type: "ship", owned: ownedShips.indexOf(id) >= 0 }; }));
    var html = '<div class="codex-bond-portraits">';
    entries.forEach(function (entry) {
      var asset = findAsset(entry.type, entry.id);
      html += '<figure class="codex-bond-portrait ' + (entry.owned ? "is-owned" : "is-missing") + '">';
      html += '<div>' + (asset && asset.src
        ? '<img src="' + escapeAttr(asset.src) + '" alt="' + escapeAttr(asset.name) + '">'
        : silhouetteSvg(entry.type)) + '</div>';
      html += '</figure>';
    });
    html += '</div>';
    return html;
  }

  function renderBondDetail(bs, detail, profile, opts) {
    var def = bs.def;
    var req = def.requires || {};
    var pilotIds = req.pilots || [];
    var shipIds = req.ships || [];
    var bonus = def.bonus || {};

    var html = '<div class="codex-detail-bond">';
    html += '<section class="codex-bond-upper">';
    html += '<div class="codex-bond-visual">' + renderBondPortraits(pilotIds, shipIds, profile) + '</div>';
    html += '</section>';
    html += '<section class="codex-bond-lower">';
    html += '<div class="codex-bond-head">';
    html += '<div><h3>' + escapeHtml(def.name) + '</h3></div>';
    html += '<span class="codex-bond-badge ' + (bs.activated ? "is-activated" : bs.activatable ? "is-activatable" : "is-locked") + '">' +
      (bs.activated ? "已激活" : bs.activatable ? "可激活" : "未集齐") + '</span>';
    html += '</div>';

    html += '<div class="codex-bond-dashboard">';
    html += '<section class="codex-bond-units">';
    html += '<h4>羁绊成员</h4>';
    html += renderBondUnitList(pilotIds, "战姬", profile);
    html += renderBondUnitList(shipIds, "战机", profile);
    html += '</section>';

    html += '<section class="codex-bond-bonus">';
    html += '<h4>激活后加成</h4><div class="codex-bond-bonus-grid">';
    if (bonus.attackFlat) html += '<span>攻击 +' + bonus.attackFlat + '</span>';
    if (bonus.armorPenetrationFlat) html += '<span>破甲 +' + Math.round(bonus.armorPenetrationFlat * 100) + '%</span>';
    if (bonus.coinBonusMultiplier) html += '<span>金币 +' + Math.round(bonus.coinBonusMultiplier * 100) + '%</span>';
    if (!bonus.attackFlat && !bonus.armorPenetrationFlat && !bonus.coinBonusMultiplier) html += '<span>—</span>';
    html += '</div>';
    if (bs.activatable) {
      html += '<button type="button" class="codex-bond-activate-btn" data-bond-activate="' + escapeAttr(def.id) + '">激活羁绊</button>';
    }
    html += '</section>';
    html += '</div>';

    html += '<section class="codex-bond-record"><h4>协同档案</h4>';
    html += '<p class="codex-bond-desc">' + escapeHtml(def.desc) + '</p>';
    html += '</section></section></div>';
    detail.innerHTML = html;

    var activateBtn = detail.querySelector("[data-bond-activate]");
    if (activateBtn) {
      activateBtn.addEventListener("click", function () {
        if (opts && typeof opts.onActivate === "function") opts.onActivate("bond", def.id);
      });
    }
  }

  scope.codexView = {
    renderCodex: renderCodex
  };

  if (typeof module !== "undefined" && module.exports) module.exports = scope.codexView;
})(typeof globalThis !== "undefined" ? globalThis : this);
