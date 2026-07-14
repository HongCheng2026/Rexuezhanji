(function registerBattleHudView(root) {
  var scope = root.RXGame || (root.RXGame = {});

  var levelsConfig = scope.levels || {};
  var balanceConfig = scope.balance || {};
  var POWERUPS = levelsConfig.POWERUPS || {};
  var MAX_WEAPON_LEVEL = balanceConfig.MAX_WEAPON_LEVEL || levelsConfig.MAX_WEAPON_LEVEL || 5;
  var BOSS_SPAWN_TIME = levelsConfig.BOSS_SPAWN_TIME || 60;
  var LEVEL_DURATION = levelsConfig.LEVEL_DURATION || 90;
  var WEAPON_ORDER = ["spread", "laser", "missile"];
  var ITEM_LABELS = {
    shield: "\u62a4\u76fe",
    life: "\u751f\u547d",
    spread: "\u6563\u5c04",
    laser: "\u6fc0\u5149",
    missile: "\u5bfc\u5f39"
  };
  var textCache = typeof WeakMap !== "undefined" ? new WeakMap() : null;
  var barNodes = {};
  var barWidths = {};
  var lastWeaponSlotsNode = null;
  var lastWeaponSlotsHtml = "";
  var lastItemSlotsNode = null;
  var lastItemSlotsHtml = "";
  var lastActiveSkillNode = null;
  var lastActiveSkillHtml = "";
  var lastActiveSkillProgress = "";
  var lastActiveSkillDisabled = null;
  var lastActiveSkillReady = null;
  var lastActiveSkillCharging = null;
  var mountedRoot = null;

  function mount(rootElement) {
    var target = rootElement || (root.document && root.document.querySelector("#battleHudRoot"));
    if (!target) return null;
    if (target !== mountedRoot || !target.querySelector("#pauseButton")) {
      target.innerHTML =
        '<section class="hud battle-cockpit-hud" aria-label="\u6e38\u620f\u72b6\u6001">' +
          '<div class="hud-compact-cell"><span class="label">\u5173\u5361</span><strong id="levelLabel">1-1</strong></div>' +
          '<div class="hud-compact-cell"><span class="label">\u65f6\u95f4</span><strong id="timeLabel">90</strong></div>' +
          '<div class="hud-hp-cell"><span class="label">\u751f\u547d</span><strong id="lives">3</strong><span class="hud-bar player" aria-hidden="true"><span id="playerHpBar"></span></span></div>' +
          '<div class="hud-boss-cell"><span class="label">BOSS</span><strong id="weapon">\u672a\u63a5\u654c</strong><span class="hud-bar boss" aria-hidden="true"><span id="bossHpBar"></span></span></div>' +
          '<div class="hud-status-cell"><span class="label">\u51fb\u843d</span><strong id="coins">0</strong><button id="pauseButton" class="hud-pause-button" type="button">\u6682\u505c</button></div>' +
        '</section>' +
        '<aside id="battleSidePanel" class="battle-side-panel" aria-label="\u6218\u6597\u6b66\u5668\u4e0e\u9053\u5177">' +
          '<section class="weapon-panel"><span class="panel-kicker">WEAPONS</span><div id="battleWeaponSlots" class="weapon-slots"></div></section>' +
          '<section class="item-panel"><span class="panel-kicker">SUPPLY</span><div id="battleItemSlots" class="item-slots"></div></section>' +
          '<section class="active-skill-panel"><span class="panel-kicker">ACTIVE SKILL</span><button id="activeSkillButton" class="active-skill-button" type="button" disabled><strong>\u672a\u642d\u8f7d</strong><span>NO SKILL</span><em></em></button></section>' +
        '</aside>';
      mountedRoot = target;
      barNodes = {};
      barWidths = {};
    }
    return {
      levelLabelEl: target.querySelector("#levelLabel"),
      timeLabelEl: target.querySelector("#timeLabel"),
      livesEl: target.querySelector("#lives"),
      weaponEl: target.querySelector("#weapon"),
      coinsEl: target.querySelector("#coins"),
      pauseButton: target.querySelector("#pauseButton"),
      activeSkillButton: target.querySelector("#activeSkillButton")
    };
  }

  function setText(node, value) {
    if (!node) return;
    var next = String(value == null ? "" : value);
    if (textCache && textCache.get(node) === next && node.textContent === next) return;
    if (!textCache && node.textContent === next) return;
    node.textContent = next;
    if (textCache) textCache.set(node, next);
  }

  function getWeaponName(type) {
    return (POWERUPS[type] && POWERUPS[type].name) ? POWERUPS[type].name : (ITEM_LABELS[type] || type);
  }

  function getWeaponColor(type) {
    return (POWERUPS[type] && POWERUPS[type].color) ? POWERUPS[type].color : "#42d6b5";
  }

  function setBar(selector, ratio) {
    var node = barNodes[selector];
    if (!node || node.isConnected === false) {
      node = root.document && root.document.querySelector(selector);
      barNodes[selector] = node;
      barWidths[selector] = "";
    }
    if (!node) return;
    var width = Math.max(0, Math.min(100, Math.round((ratio || 0) * 100))) + "%";
    if (barWidths[selector] === width) return;
    node.style.width = width;
    barWidths[selector] = width;
  }

  function renderWeaponSlots(state) {
    var container = root.document && root.document.querySelector("#battleWeaponSlots");
    if (!container || !state || !state.player) return;
    var weapons = state.player.weapons || {};
    var html = "";

    for (var i = 0; i < WEAPON_ORDER.length; i += 1) {
      var type = WEAPON_ORDER[i];
      var level = Math.max(0, Math.floor(weapons[type] || 0));
      var ratio = Math.max(0, Math.min(1, level / MAX_WEAPON_LEVEL));
      html += '<article class="weapon-slot' + (level > 0 ? " active" : "") + '" style="--weapon-color:' + getWeaponColor(type) + '">' +
        '<span class="weapon-mark">' + getWeaponName(type).charAt(0) + '</span>' +
        '<span class="weapon-copy"><strong>' + getWeaponName(type) + '</strong><em>Lv.' + level + '</em></span>' +
        '<span class="weapon-charge"><span style="width:' + Math.round(ratio * 100) + '%"></span></span>' +
      '</article>';
    }

    if (container !== lastWeaponSlotsNode || html !== lastWeaponSlotsHtml) {
      container.innerHTML = html;
      lastWeaponSlotsNode = container;
      lastWeaponSlotsHtml = html;
    }
  }

  function renderItemSlots(state) {
    var container = root.document && root.document.querySelector("#battleItemSlots");
    if (!container || !state || !state.player) return;
    var recent = Array.isArray(state.itemFeed) ? state.itemFeed.slice(-1).reverse() : [];
    var html = "";

    if (recent.length) {
      for (var i = 0; i < recent.length; i += 1) {
        var type = recent[i].type || "";
        var name = recent[i].name || ITEM_LABELS[type] || "\u8865\u7ed9";
        html += '<article class="item-slot active recent"><strong>' + name + '</strong><span>\u521a\u62fe\u53d6</span></article>';
      }
    } else {
      html += '<article class="item-slot"><strong>\u6218\u573a\u8865\u7ed9</strong><span>\u5f85\u6295\u653e</span></article>';
    }

    if (container !== lastItemSlotsNode || html !== lastItemSlotsHtml) {
      container.innerHTML = html;
      lastItemSlotsNode = container;
      lastItemSlotsHtml = html;
    }
  }

  function renderActiveSkill(state) {
    var button = root.document && root.document.querySelector("#activeSkillButton");
    if (!button) return;
    if (button !== lastActiveSkillNode) {
      lastActiveSkillNode = button;
      lastActiveSkillHtml = "";
      lastActiveSkillProgress = "";
      lastActiveSkillDisabled = null;
      lastActiveSkillReady = null;
      lastActiveSkillCharging = null;
    }
    var skill = state && state.player ? state.player.activeSkill : null;
    var disabled = true;
    var ready = false;
    var charging = false;
    var progressText = "0%";
    var html = '<strong>\u672a\u642d\u8f7d</strong><span>NO SKILL</span><em></em>';
    if (!skill) {
      syncActiveSkillButton(button, disabled, ready, charging, progressText, html);
      return;
    }
    var charges = Math.max(0, Math.floor(Number(skill.charges) || 0));
    var maxCharges = Math.max(1, Math.floor(Number(skill.maxCharges) || 2));
    var recharge = Math.max(1, Number(skill.rechargeSeconds) || 18);
    var timer = Math.max(0, Number(skill.rechargeTimer) || 0);
    var progress = charges >= maxCharges ? 100 : Math.round((1 - timer / recharge) * 100);
    disabled = charges <= 0;
    ready = charges > 0;
    charging = charges <= 0;
    progressText = Math.max(0, Math.min(100, progress)) + "%";
    html = '<strong>' + escapeHtml(skill.name || "\u4e3b\u52a8\u6280\u80fd") + '</strong>' +
      '<span>' + charges + '/' + maxCharges + ' \u5145\u80fd</span>' +
      '<em>' + (charges > 0 ? "SPACE / TAP" : Math.ceil(timer) + "s") + '</em>';
    syncActiveSkillButton(button, disabled, ready, charging, progressText, html);
  }

  function syncActiveSkillButton(button, disabled, ready, charging, progressText, html) {
    if (lastActiveSkillDisabled !== disabled) {
      button.disabled = disabled;
      lastActiveSkillDisabled = disabled;
    }
    if (lastActiveSkillReady !== ready) {
      button.classList.toggle("ready", ready);
      lastActiveSkillReady = ready;
    }
    if (lastActiveSkillCharging !== charging) {
      button.classList.toggle("charging", charging);
      lastActiveSkillCharging = charging;
    }
    if (lastActiveSkillProgress !== progressText) {
      button.style.setProperty("--active-skill-progress", progressText);
      lastActiveSkillProgress = progressText;
    }
    if (lastActiveSkillHtml !== html) {
      button.innerHTML = html;
      lastActiveSkillHtml = html;
    }
  }

  function updateHud(state, profile, dom) {
    dom = dom || {};
    state = state || {};
    var level = state.level;

    if (dom.levelLabelEl && level) {
      setText(dom.levelLabelEl, level.code || (level.id || ""));
    }

    if (dom.timeLabelEl) {
      if (state.mode === "fight" && !state.bossSpawned) {
        setText(dom.timeLabelEl, Math.max(0, Math.ceil(BOSS_SPAWN_TIME - (state.elapsed || 0))));
      } else if (state.boss) {
        setText(dom.timeLabelEl, "\u63a5\u654c");
      } else {
        setText(dom.timeLabelEl, LEVEL_DURATION);
      }
    }

    if (dom.livesEl && state.player) {
      var hp = state.player.hp != null ? state.player.hp : ((state.player.lives || 1) * 100);
      var maxHp = Math.max(1, Math.ceil(state.player.maxHp || hp || 100));
      setText(dom.livesEl, Math.max(0, Math.ceil(hp)) + "/" + maxHp);
      setBar("#playerHpBar", hp / maxHp);
    }

    if (dom.weaponEl) {
      var bossCell = dom.weaponEl.closest ? dom.weaponEl.closest(".hud-boss-cell") : null;
      if (bossCell) bossCell.classList.toggle("is-active", Boolean(state.boss));
      if (state.boss) {
        var bossRatio = Math.max(0, Math.min(1, state.boss.hp / Math.max(1, state.boss.maxHp || 1)));
        setText(dom.weaponEl, "BOSS " + Math.ceil(bossRatio * 100) + "%");
        setBar("#bossHpBar", bossRatio);
      } else if (state.bossSpawned) {
        setText(dom.weaponEl, "BOSS \u63a5\u8fd1");
        setBar("#bossHpBar", 0);
      } else {
        setText(dom.weaponEl, "BOSS \u672a\u63a5\u654c");
        setBar("#bossHpBar", 0);
      }
    }

    if (dom.coinsEl) {
      var totalKills = state.killStats && state.killStats.total ? state.killStats.total : 0;
      setText(dom.coinsEl, state.mode === "paused" ? "\u6682\u505c" : String(totalKills));
    }

    renderWeaponSlots(state);
    renderItemSlots(state);
    renderActiveSkill(state);
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch] || ch;
    });
  }

  var api = {
    mount: mount,
    updateHud: updateHud
  };

  scope.battleHudView = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
