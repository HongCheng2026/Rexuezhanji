(function registerProfileController(root) {
  "use strict";

  var scope = root.RXGame || (root.RXGame = {});

  function create(options) {
    options = options || {};
    var shared = options.shared || scope;
    var dom = options.dom || {};
    var assetsConfig = options.assetsConfig || {};
    var profile = options.getProfile();
    var profilePanelTab = "overview";
    var createLevelProgressSnapshot = options.createLevelProgressSnapshot;
    var getHonorText = options.getHonorText;
    var getPilotAsset = options.getPilotAsset || function emptyPilot() { return {}; };
    var getShipAsset = options.getShipAsset || function emptyShip() { return {}; };
    var getLevelById = options.getLevelById || function emptyLevel() { return {}; };
    var setFeaturePanelMode = options.setFeaturePanelMode || function noopMode() {};
    var openFeaturePanelShell = options.openFeaturePanelShell || function noopOpen() {};
    var closeFeaturePanel = options.closeFeaturePanel || function noopClose() {};
    var persistProfileMetadata = options.persistProfileMetadata || function noopPersist() { return Promise.resolve(); };
    var renderLobby = options.renderLobby || function noopLobby() {};

    function escapeHtml(value) {
      return String(value == null ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    }

    function escapeAttr(value) {
      return escapeHtml(value);
    }

    function formatResource(value) {
      var number = Number(value) || 0;
      if (number >= 1000000) return (number / 1000000).toFixed(1) + "M";
      if (number >= 10000) return (number / 1000).toFixed(1) + "K";
      return String(Math.floor(number));
    }

  function renderProfilePanel() {
    profile = options.getProfile();
    shared.profile.recoverEnergy(profile);
    var player = profile.player || {};
    var progress = createLevelProgressSnapshot(player);
    var pilot = getPilotAsset() || {};
    var ship = getShipAsset() || {};
    var power = getTotalPowerBreakdown();
    var record = getProfileRecordSnapshot();
    var uid = String(player.uid || "").replace(/\D/g, "");

    setFeaturePanelMode("profile-dossier-panel");
    dom.featurePanelKicker.textContent = "";
    dom.featurePanelTitle.textContent = "玩家资料";
    dom.featurePanelBody.textContent = "公开名片与作战档案";
    dom.featurePanelSlots.className = "player-profile-page";
    dom.featurePanelSlots.innerHTML =
      '<section class="player-profile-identity-card">' +
        '<div class="player-profile-avatar-column">' +
          '<img class="player-profile-avatar" src="' + escapeAttr(player.avatar || assetsConfig.DEFAULT_AVATAR || "") + '" alt="玩家头像">' +
          '<div class="player-profile-avatar-actions"><button type="button" data-profile-action="upload-avatar">更换头像</button><button type="button" class="is-secondary" data-profile-action="reset-avatar">恢复默认</button></div>' +
        '</div>' +
        '<div class="player-profile-identity">' +
          '<div class="player-profile-name-row"><input id="profileNameInput" class="player-profile-name-input" aria-label="玩家昵称" maxlength="12" value="' + escapeAttr(player.name || "王牌飞行员") + '"><span class="player-profile-title">星港先锋</span></div>' +
          '<div class="player-profile-meta-row"><span>UID</span><strong>' + escapeHtml(uid ? formatUid(uid) : "离线未分配") + '</strong><button type="button" data-profile-action="copy-uid"' + (uid ? '' : ' disabled') + '>复制</button><span class="player-profile-sync-state ' + (uid ? 'is-synced' : 'is-offline') + '">' + (uid ? '身份已同步' : '离线') + '</span></div>' +
          '<label class="player-profile-signature-label" for="profileSignatureInput">个性签名</label>' +
          '<input id="profileSignatureInput" class="player-profile-signature-input" maxlength="36" value="' + escapeAttr(player.signature || "保持航线，火力覆盖。") + '">' +
          '<div class="player-profile-progress-row">' +
            '<span>Lv.' + progress.level + '</span><span>荣誉 ' + escapeHtml(getHonorText(player)) + '</span>' +
            '<div class="player-profile-exp"><i style="width:' + progress.percent + '%"></i></div>' +
            '<strong>' + escapeHtml(progress.isMaxLevel ? "MAX" : progress.exp + "/" + progress.expMax) + '</strong>' +
          '</div>' +
        '</div>' +
        '<div class="player-profile-power-card"><span>总战力</span><strong>' + formatResource(power.total) + '</strong>' +
          '<div><em>战姬</em><b>' + formatResource(power.pilotTotal) + '</b></div><div><em>战机</em><b>' + formatResource(power.shipTotal) + '</b></div><div><em>强化</em><b>' + formatResource(power.sharedUpgradePower) + '</b></div>' +
        '</div>' +
      '</section>' +
      '<section class="player-profile-public-metrics">' + renderProfileMetric("最高章节", record.highestChapterLabel) + renderProfileMetric("成就进度", record.achievementProgress) + renderProfileMetric("总出击", formatResource(record.sorties)) + renderProfileMetric("最高荣誉", record.bestHonorLabel) + '</section>' +
      '<nav class="player-profile-tabs" aria-label="玩家资料分页">' +
        renderProfileTab("overview", "总览") +
        renderProfileTab("record", "战绩") +
        renderProfileTab("lineup", "展示阵容") +
      '</nav>' +
      '<section class="player-profile-tab-body">' + renderProfileTabBody(profilePanelTab, progress, pilot, ship, power, record) + '</section>' +
      '<footer class="player-profile-actions">' +
        '<button type="button" data-profile-action="save-profile">保存资料</button>' +
        '<button type="button" class="is-secondary" data-profile-action="close">关闭</button>' +
      '</footer>';
    openFeaturePanelShell("profile-dossier-panel");
  }

  function renderProfileMetric(label, value) {
    return '<article class="player-profile-metric"><span>' + escapeHtml(label) + '</span><strong>' + escapeHtml(value) + '</strong></article>';
  }

  function renderProfileTab(id, label) {
    return '<button type="button" class="' + (profilePanelTab === id ? "is-active" : "") + '" data-profile-tab="' + id + '">' + escapeHtml(label) + '</button>';
  }

  function renderProfileTabBody(tab, progress, pilot, ship, power, record) {
    if (tab === "record") return renderProfileRecord(record);
    if (tab === "lineup") return renderProfileLineup(pilot, ship);
    return renderProfileOverview(progress, pilot, ship, power);
  }

  function renderProfileOverview(progress, pilot, ship, power) {
    return '<div class="player-profile-overview">' +
      '<article class="player-profile-lineup-summary"><span>当前展示阵容</span><div>' + renderProfileUnit(pilot, "战姬", "pilot") + renderProfileUnit(ship, "战机", "ship") + '</div></article>' +
      '<article class="player-profile-career-summary"><span>指挥官档案</span><div class="player-profile-detail-grid">' +
        renderProfileDetail("指挥官等级", "Lv." + progress.level) + renderProfileDetail("累计经验", formatResource(progress.totalExp)) + renderProfileDetail("收藏总战力", formatResource(power.total)) + renderProfileDetail("出战战力", formatResource(calculateActivePower())) +
      '</div></article></div>';
  }

  function renderProfileUnit(asset, typeLabel, type) {
    var unitPower = shared.powerCalculator && shared.powerCalculator.calculateUnitPower ? shared.powerCalculator.calculateUnitPower(asset, type, profile) : 0;
    return '<div class="player-profile-unit"><img src="' + escapeAttr(asset && asset.src || "") + '" alt=""><span>' + escapeHtml(typeLabel) + '</span><strong>' + escapeHtml(asset && asset.name || "未配置") + '</strong><em>战力 ' + formatResource(unitPower) + '</em></div>';
  }

  function getProfileRecordSnapshot() {
    var profileProgress = profile.progress || {};
    var completed = Array.isArray(profile.completed) ? profile.completed : [];
    var stageHonors = profileProgress.stageHonors || {};
    var bestHonor = Object.keys(stageHonors).reduce(function maxHonor(max, key) {
      return Math.max(max, Math.floor(Number(stageHonors[key]) || 0));
    }, 0);
    var highestChapter = completed.reduce(function maxChapter(max, levelId) {
      var level = getLevelById(levelId);
      return Math.max(max, Math.floor(Number(level && level.chapterIndex) || 0));
    }, 0);
    var achievements = shared.featurePanelContent && shared.featurePanelContent.ACHIEVEMENT_CONTENT || [];
    var completedAchievements = achievements.filter(function (item) {
      return getProfileAchievementMetric(item, profileProgress, bestHonor) >= Math.max(1, Number(item.target) || 1);
    }).length;
    return {
      completedCount: completed.length,
      highestChapterLabel: highestChapter > 0 ? "第 " + highestChapter + " 章" : "序章",
      bestHonorLabel: bestHonor ? "Tier " + bestHonor : "未记录",
      perfectClearCount: Math.max(0, Math.floor(Number(profileProgress.perfectClearCount) || 0)),
      noDamageBossClearCount: Math.max(0, Math.floor(Number(profileProgress.noDamageBossClearCount) || 0)),
      sorties: Math.max(completed.length, Math.floor(Number(profileProgress.clearCount) || 0)),
      achievementProgress: completedAchievements + "/" + achievements.length
    };
  }

  function getProfileAchievementMetric(item, progress, bestHonor) {
    var metric = String(item && item.metric || "");
    var fighter = shared.fighterUpgradeApi && shared.fighterUpgradeApi.getLevels(profile) || {};
    var owned = profile.owned || {};
    if (metric === "clearCount") return Math.max((profile.completed || []).length, Number(progress.clearCount) || 0);
    if (metric === "perfectClearCount") return Number(progress.perfectClearCount) || 0;
    if (metric === "noDamageBossClearCount") return Number(progress.noDamageBossClearCount) || 0;
    if (metric === "upgradeTotal") return (Number(fighter.attack) || 0) + (Number(fighter.hp) || 0) + (Number(fighter.armorPenetration) || 0);
    if (metric === "ownedPilots") return Array.from(new Set(owned.pilots || [])).length;
    if (metric === "ownedShips") return Array.from(new Set(owned.ships || [])).length;
    if (metric === "ownedSRank") {
      var pilotIds = new Set(owned.pilots || []);
      var shipIds = new Set(owned.ships || []);
      return (assetsConfig.PILOT_ASSETS || []).some(function (asset) { return asset.rank === "S" && pilotIds.has(asset.id); }) || (assetsConfig.SHIP_ASSETS || []).some(function (asset) { return asset.rank === "S" && shipIds.has(asset.id); }) ? 1 : 0;
    }
    if (metric === "bestHonor") return bestHonor;
    if (metric.indexOf("stage:") === 0) return (progress.clearedStageIds || []).indexOf(metric.slice(6)) >= 0 ? 1 : 0;
    if (metric.indexOf("upgrade:") === 0) return Number(fighter[metric.slice(8)]) || 0;
    return 0;
  }

  function renderProfileRecord(record) {
    return '<div class="player-profile-detail-grid is-record">' + renderProfileDetail("已通关关卡", String(record.completedCount)) + renderProfileDetail("最高章节", record.highestChapterLabel) + renderProfileDetail("最高荣誉", record.bestHonorLabel) + renderProfileDetail("完美通关", String(record.perfectClearCount)) + renderProfileDetail("无伤 Boss", String(record.noDamageBossClearCount)) + renderProfileDetail("总出击", String(record.sorties)) + '</div>';
  }

  function renderProfileLineup(pilot, ship) {
    return '<div class="player-profile-lineup-detail">' + renderProfileUnit(pilot, "展示战姬", "pilot") + renderProfileUnit(ship, "展示战机", "ship") + '<article class="player-profile-active-power"><span>出战战力</span><strong>' + formatResource(calculateActivePower()) + '</strong><p>切换展示阵容会改变出战战力，不会改变收藏总战力。</p></article></div>';
  }

  function renderProfileDetail(label, value) {
    return '<article class="player-profile-detail"><span>' + escapeHtml(label) + '</span><strong>' + escapeHtml(value) + '</strong></article>';
  }

  function formatUid(uid) {
    return String(uid || "").replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  }

  function getTotalPowerBreakdown() {
    return shared.powerCalculator && shared.powerCalculator.calculateTotalPower ? shared.powerCalculator.calculateTotalPower(profile) : { total: 0, pilotTotal: 0, shipTotal: 0, sharedUpgradePower: 0, pilots: [], ships: [] };
  }

  function calculateTotalPower() {
    profile = options.getProfile();
    return getTotalPowerBreakdown().total;
  }

  function calculateActivePower() {
    profile = options.getProfile();
    return shared.powerCalculator && shared.powerCalculator.calculateActivePower ? shared.powerCalculator.calculateActivePower(profile) : 0;
  }

  function handleAvatarUpload(event) {
    profile = options.getProfile();
    var file = event.target.files && event.target.files[0];
    if (!file || !file.type || file.type.indexOf("image/") !== 0) return;
    var reader = new FileReader();
    reader.addEventListener("load", function loaded() {
      resizeAvatarDataUrl(String(reader.result || ""), function resized(dataUrl) {
        profile.player = profile.player || {};
        profile.player.avatar = dataUrl || assetsConfig.DEFAULT_AVATAR;
        persistProfileMetadata().catch(function keepLocalAvatar() {});
        renderLobby();
        renderProfilePanel();
      });
    });
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  function resizeAvatarDataUrl(source, done) {
    if (!source) {
      done("");
      return;
    }
    var image = new Image();
    image.addEventListener("load", function onLoad() {
      var size = 512;
      var canvasEl = document.createElement("canvas");
      var context = canvasEl.getContext("2d");
      var side = Math.min(image.naturalWidth || image.width, image.naturalHeight || image.height);
      var sx = Math.max(0, ((image.naturalWidth || image.width) - side) / 2);
      var sy = Math.max(0, ((image.naturalHeight || image.height) - side) / 2);
      canvasEl.width = size;
      canvasEl.height = size;
      context.drawImage(image, sx, sy, side, side, 0, 0, size, size);
      done(canvasEl.toDataURL("image/jpeg", 0.86));
    });
    image.addEventListener("error", function onError() {
      done(source);
    });
    image.src = source;
  }

  function handleProfilePanelClick(event) {
    profile = options.getProfile();
    var tab = event.target && event.target.closest ? event.target.closest("[data-profile-tab]") : null;
    if (tab) {
      profilePanelTab = tab.dataset.profileTab || "overview";
      renderProfilePanel();
      return;
    }
    var action = event.target && event.target.closest ? event.target.closest("[data-profile-action]") : null;
    if (!action) return;
    var type = action.dataset.profileAction;
    if (type === "copy-uid") {
      copyProfileUid(action);
      return;
    }
    if (type === "upload-avatar" && dom.avatarUpload) {
      dom.avatarUpload.click();
    }
    if (type === "reset-avatar") {
      profile.player = profile.player || {};
      profile.player.avatar = assetsConfig.DEFAULT_AVATAR || "";
      persistProfileMetadata().catch(function keepLocalAvatarReset() {});
      renderLobby();
      renderProfilePanel();
    }
    if (type === "save-profile") {
      var nameInput = document.querySelector("#profileNameInput");
      var signatureInput = document.querySelector("#profileSignatureInput");
      var nextName = String(nameInput && nameInput.value ? nameInput.value : "").trim().slice(0, 12);
      var nextSignature = String(signatureInput && signatureInput.value ? signatureInput.value : "").trim().slice(0, 36);
      profile.player = profile.player || {};
      profile.player.name = nextName || "王牌飞行员";
      profile.player.signature = nextSignature || "保持航线，火力覆盖。";
      persistProfileMetadata().catch(function keepLocalProfileEdit() {});
      renderLobby();
      renderProfilePanel();
    }
    if (type === "close") {
      closeFeaturePanel();
    }
  }

  function copyProfileUid(button) {
    var uid = String(profile.player && profile.player.uid || "").replace(/\D/g, "");
    if (!uid) return;
    var copied = root.navigator && root.navigator.clipboard && root.navigator.clipboard.writeText
      ? root.navigator.clipboard.writeText(uid)
      : Promise.resolve(copyTextFallback(uid));
    copied.then(function onCopied() {
      button.textContent = "已复制";
      root.setTimeout(function restoreCopyLabel() { if (button && button.isConnected) button.textContent = "复制"; }, 1200);
    }).catch(function fallbackCopy() {
      if (copyTextFallback(uid)) button.textContent = "已复制";
    });
  }

  function copyTextFallback(value) {
    var field = document.createElement("textarea");
    field.value = value;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.appendChild(field);
    field.select();
    var copied = false;
    try { copied = document.execCommand("copy"); } catch (error) { copied = false; }
    document.body.removeChild(field);
    return copied;
  }


    return {
      render: renderProfilePanel,
      handleClick: handleProfilePanelClick,
      handleAvatarUpload: handleAvatarUpload,
      calculateTotalPower: calculateTotalPower,
      calculateActivePower: calculateActivePower
    };
  }

  var api = { create: create };
  scope.profileController = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
