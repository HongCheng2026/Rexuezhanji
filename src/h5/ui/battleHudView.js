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

  function getWeaponName(type) {
    return (POWERUPS[type] && POWERUPS[type].name) ? POWERUPS[type].name : (ITEM_LABELS[type] || type);
  }

  function getWeaponColor(type) {
    return (POWERUPS[type] && POWERUPS[type].color) ? POWERUPS[type].color : "#42d6b5";
  }

  function setBar(selector, ratio) {
    var node = root.document && root.document.querySelector(selector);
    if (!node) return;
    node.style.width = Math.max(0, Math.min(100, Math.round((ratio || 0) * 100))) + "%";
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

    container.innerHTML = html;
  }

  function renderItemSlots(state) {
    var container = root.document && root.document.querySelector("#battleItemSlots");
    if (!container || !state || !state.player) return;
    var shield = Math.max(0, Math.ceil(state.player.shield || 0));
    var recent = Array.isArray(state.itemFeed) ? state.itemFeed.slice(-1).reverse() : [];
    var html = '<article class="item-slot' + (shield > 0 ? " active" : "") + '">' +
      '<strong>\u62a4\u76fe</strong><span>' + (shield > 0 ? shield + "s" : "\u5f85\u62fe\u53d6") + '</span>' +
    '</article>';

    if (recent.length) {
      for (var i = 0; i < recent.length; i += 1) {
        var type = recent[i].type || "";
        var name = recent[i].name || ITEM_LABELS[type] || "\u8865\u7ed9";
        html += '<article class="item-slot active recent"><strong>' + name + '</strong><span>\u521a\u62fe\u53d6</span></article>';
      }
    } else {
      html += '<article class="item-slot"><strong>\u8865\u7ed9</strong><span>\u7a7a\u69fd</span></article>';
    }

    container.innerHTML = html;
  }

  function renderActiveSkill(state) {
    var button = root.document && root.document.querySelector("#activeSkillButton");
    if (!button) return;
    var skill = state && state.player ? state.player.activeSkill : null;
    if (!skill) {
      button.disabled = true;
      button.classList.remove("ready", "charging");
      button.innerHTML = '<strong>未搭载</strong><span>NO SKILL</span><em></em>';
      return;
    }
    var charges = Math.max(0, Math.floor(Number(skill.charges) || 0));
    var maxCharges = Math.max(1, Math.floor(Number(skill.maxCharges) || 2));
    var recharge = Math.max(1, Number(skill.rechargeSeconds) || 18);
    var timer = Math.max(0, Number(skill.rechargeTimer) || 0);
    var progress = charges >= maxCharges ? 100 : Math.round((1 - timer / recharge) * 100);
    button.disabled = charges <= 0;
    button.classList.toggle("ready", charges > 0);
    button.classList.toggle("charging", charges <= 0);
    button.style.setProperty("--active-skill-progress", Math.max(0, Math.min(100, progress)) + "%");
    button.innerHTML = '<strong>' + escapeHtml(skill.name || "主动技能") + '</strong>' +
      '<span>' + charges + '/' + maxCharges + ' 充能</span>' +
      '<em>' + (charges > 0 ? "SPACE / TAP" : Math.ceil(timer) + "s") + '</em>';
  }

  function updateHud(state, profile, dom) {
    dom = dom || {};
    state = state || {};
    var level = state.level;

    if (dom.levelLabelEl && level) {
      dom.levelLabelEl.textContent = level.code || (level.id || "");
    }

    if (dom.timeLabelEl) {
      if (state.mode === "fight" && !state.bossSpawned) {
        dom.timeLabelEl.textContent = Math.max(0, Math.ceil(BOSS_SPAWN_TIME - (state.elapsed || 0)));
      } else if (state.boss) {
        dom.timeLabelEl.textContent = "\u63a5\u654c";
      } else {
        dom.timeLabelEl.textContent = LEVEL_DURATION;
      }
    }

    if (dom.livesEl && state.player) {
      var hp = state.player.hp != null ? state.player.hp : ((state.player.lives || 1) * 100);
      var maxHp = Math.max(1, Math.ceil(state.player.maxHp || hp || 100));
      dom.livesEl.textContent = Math.max(0, Math.ceil(hp)) + "/" + maxHp;
      setBar("#playerHpBar", hp / maxHp);
    }

    if (dom.weaponEl) {
      if (state.boss) {
        var bossRatio = Math.max(0, Math.min(1, state.boss.hp / Math.max(1, state.boss.maxHp || 1)));
        dom.weaponEl.textContent = "BOSS " + Math.ceil(bossRatio * 100) + "%";
        setBar("#bossHpBar", bossRatio);
      } else if (state.bossSpawned) {
        dom.weaponEl.textContent = "BOSS \u63a5\u8fd1";
        setBar("#bossHpBar", 0);
      } else {
        dom.weaponEl.textContent = "BOSS \u672a\u63a5\u654c";
        setBar("#bossHpBar", 0);
      }
    }

    if (dom.coinsEl) {
      var totalKills = state.killStats && state.killStats.total ? state.killStats.total : 0;
      dom.coinsEl.textContent = state.mode === "paused" ? "\u6682\u505c" : String(totalKills);
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
    updateHud: updateHud
  };

  scope.battleHudView = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
