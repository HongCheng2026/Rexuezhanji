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
    var ensureGameGateway = options.ensureGameGateway || function noopGateway() { return Promise.resolve(null); };
    var getGameGateway = options.getGameGateway || function emptyGateway() { return null; };
    var getGatewayError = options.getGatewayError || function noGatewayError() { return null; };
    var applyGatewayProfile = options.applyGatewayProfile || function noopApply() {};
    var cloudSaveState = {
      step: "idle",
      intent: "bind",
      channel: "email",
      identifier: "",
      code: "",
      pending: false,
      message: "",
      isError: false,
      cooldownUntil: 0
    };
    var cooldownTimer = null;

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
    var honorDefinition = shared.playerHonorView && shared.playerHonorView.getEquippedHonorDefinition
      ? shared.playerHonorView.getEquippedHonorDefinition(player)
      : null;
    var pilot = getPilotAsset() || {};
    var ship = getShipAsset() || {};
    var power = getTotalPowerBreakdown();
    var record = getProfileRecordSnapshot();
    var uid = String(player.uid || "").replace(/\D/g, "");
    var accountState = readAccountState();
    var syncPresentation = getSyncPresentation(accountState, uid);

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
          '<div class="player-profile-meta-row"><span>UID</span><strong>' + escapeHtml(uid ? formatUid(uid) : "离线未分配") + '</strong><button type="button" data-profile-action="copy-uid"' + (uid ? '' : ' disabled') + '>复制</button><span class="player-profile-sync-state ' + syncPresentation.className + '">' + escapeHtml(syncPresentation.label) + '</span></div>' +
          '<label class="player-profile-signature-label" for="profileSignatureInput">个性签名</label>' +
          '<input id="profileSignatureInput" class="player-profile-signature-input" maxlength="36" value="' + escapeAttr(player.signature || "保持航线，火力覆盖。") + '">' +
          '<div class="player-profile-progress-row">' +
            '<span>Lv.' + progress.level + '</span><span>荣誉 ' + escapeHtml(honorDefinition ? "H-" + honorDefinition.numeral + " · " + honorDefinition.title : getHonorText(player)) + '</span>' +
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
        renderProfileTab("cloud", "云存档") +
      '</nav>' +
      '<section class="player-profile-tab-body">' + renderProfileTabBody(profilePanelTab, progress, pilot, ship, power, record, accountState, uid) + '</section>' +
      '<footer class="player-profile-actions">' +
        '<button type="button" data-profile-action="save-profile">保存资料修改</button>' +
        '<button type="button" class="is-secondary" data-profile-action="close">关闭</button>' +
      '</footer>';
    openFeaturePanelShell("profile-dossier-panel");
    if (profilePanelTab === "cloud" && cloudSaveState.step === "code") scheduleCooldownTick();
    else clearCooldownTimer();
  }

  function renderProfileMetric(label, value) {
    return '<article class="player-profile-metric"><span>' + escapeHtml(label) + '</span><strong>' + escapeHtml(value) + '</strong></article>';
  }

  function renderProfileTab(id, label) {
    return '<button type="button" class="' + (profilePanelTab === id ? "is-active" : "") + '" data-profile-tab="' + id + '">' + escapeHtml(label) + '</button>';
  }

  function renderProfileTabBody(tab, progress, pilot, ship, power, record, accountState, uid) {
    if (tab === "record") return renderProfileRecord(record);
    if (tab === "lineup") return renderProfileLineup(pilot, ship);
    if (tab === "cloud") return renderCloudSave(accountState, uid);
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
    var honorCatalog = shared.playerHonorView && shared.playerHonorView.renderCatalog
      ? shared.playerHonorView.renderCatalog(profile.player || {})
      : "";
    return '<div class="player-profile-record"><div class="player-profile-detail-grid is-record player-profile-record-stats">' + renderProfileDetail("已通关关卡", String(record.completedCount)) + renderProfileDetail("最高章节", record.highestChapterLabel) + renderProfileDetail("最高荣誉", record.bestHonorLabel) + renderProfileDetail("完美通关", String(record.perfectClearCount)) + renderProfileDetail("无伤 Boss", String(record.noDamageBossClearCount)) + renderProfileDetail("总出击", String(record.sorties)) + '</div>' + honorCatalog + '</div>';
  }

  function renderProfileLineup(pilot, ship) {
    return '<div class="player-profile-lineup-detail">' + renderProfileUnit(pilot, "展示战姬", "pilot") + renderProfileUnit(ship, "展示战机", "ship") + '<article class="player-profile-active-power"><span>出战战力</span><strong>' + formatResource(calculateActivePower()) + '</strong><p>切换展示阵容会改变出战战力，不会改变收藏总战力。</p></article></div>';
  }

  function readAccountState() {
    var gateway = getGameGateway();
    var gatewayError = getGatewayError();
    if (!gateway) {
      return { available: false, status: "unavailable", provider: null, maskedIdentifier: "", reason: gatewayError ? "cloud" : "loading" };
    }
    if (gateway.isCloud && gatewayError) {
      return { available: false, status: "unavailable", provider: null, maskedIdentifier: "", reason: "cloud" };
    }
    if (typeof gateway.getAccountState !== "function") {
      return { available: false, status: "unavailable", provider: null, maskedIdentifier: "", reason: gateway.isCloud ? "cloud" : "local" };
    }
    return gateway.getAccountState();
  }

  function getSyncPresentation(accountState, uid) {
    if (accountState && accountState.status === "email") return { className: "is-email", label: "邮箱已绑定" };
    if (accountState && accountState.status === "phone") return { className: "is-phone", label: "手机已绑定" };
    if (accountState && accountState.status === "guest") return { className: "is-guest", label: "游客云档" };
    if (accountState && accountState.reason === "local") return { className: "is-local", label: "本地存档" };
    if (accountState && accountState.reason === "loading") return { className: "is-offline", label: "连接中" };
    return { className: uid ? "is-offline" : "is-local", label: uid ? "云端不可用" : "本地存档" };
  }

  function renderCloudSave(accountState, uid) {
    accountState = accountState || { available: false, status: "unavailable", reason: "cloud" };
    if (!accountState.available || accountState.status === "unavailable") return renderCloudUnavailable(accountState.reason);
    if (cloudSaveState.step === "code") return renderCloudCode(accountState);
    if ((accountState.status === "email" || accountState.status === "phone") && cloudSaveState.step !== "form") return renderBoundCloudSave(accountState, uid);
    return renderCloudAccountForm(accountState);
  }

  function renderCloudUnavailable(reason) {
    var isLocal = reason === "local";
    var isLoading = reason === "loading";
    var title = isLocal ? "当前为本地存档" : isLoading ? "正在连接云存档" : "云存档暂不可用";
    var body = isLocal
      ? "本地开发模式不会发送验证码，正式服务器上可通过邮箱或手机号绑定和读取存档。"
      : isLoading ? "正在读取玩家身份，请稍候再打开本分页。" : "无法连接账号服务，当前进度不会被覆盖，请刷新页面后重试。";
    return '<div class="player-profile-cloud-panel is-unavailable">' +
      '<div class="player-profile-cloud-heading"><span class="player-profile-cloud-icon" aria-hidden="true">☁</span><div><small>CLOUD ARCHIVE</small><h3>' + escapeHtml(title) + '</h3><p>' + escapeHtml(body) + '</p></div><span class="player-profile-cloud-badge">' + (isLocal ? '本地' : isLoading ? '连接中' : '离线') + '</span></div>' +
      '<div class="player-profile-cloud-readonly"><strong>存档安全提示</strong><p>请勿清理浏览器数据；恢复云端连接后再进行账号绑定。</p></div>' +
    '</div>';
  }

  function renderCloudAccountForm(accountState) {
    var canBind = accountState.status === "guest";
    if (!canBind && cloudSaveState.intent === "bind") cloudSaveState.intent = "load";
    var isLoad = cloudSaveState.intent === "load";
    var isPhone = cloudSaveState.channel === "phone";
    var identifierLabel = isPhone ? "手机号" : "邮箱地址";
    var identifierId = isPhone ? "profileCloudPhone" : "profileCloudEmail";
    var inputType = isPhone ? "tel" : "email";
    var inputMode = isPhone ? "tel" : "email";
    var autocomplete = isPhone ? "tel" : "email";
    var placeholder = isPhone ? "138 0013 8000" : "pilot@example.com";
    var title = isLoad ? "读取已有云存档" : "绑定当前云存档";
    var body = isLoad
      ? "输入已绑定的邮箱或手机号，验证成功后读取该账号的云存档，当前档案不会覆盖目标档案。"
      : "当前进度已自动保存在云端。绑定邮箱或手机号后，更换设备也能通过验证码找回。";
    var statusLabel = accountState.status === "guest" ? "游客云档" : "已绑定存档";
    var rule = isLoad ? "只允许读取已经存在的云存档账号" : "新账号会继承当前游客进度";
    return '<div class="player-profile-cloud-panel">' +
      '<div class="player-profile-cloud-heading"><span class="player-profile-cloud-icon" aria-hidden="true">☁</span><div><small>CLOUD ARCHIVE</small><h3>' + escapeHtml(title) + '</h3><p>' + escapeHtml(body) + '</p></div><span class="player-profile-cloud-badge is-warning">' + (isLoad ? '读取存档' : '绑定存档') + '</span></div>' +
      '<div class="player-profile-cloud-choice-bar">' +
        (canBind ? '<div class="player-profile-cloud-choice" role="group" aria-label="存档操作"><span>我要</span><button type="button" data-profile-action="select-cloud-intent" data-profile-intent="bind" aria-pressed="' + String(!isLoad) + '" class="' + (!isLoad ? 'is-selected' : '') + '"' + (cloudSaveState.pending ? ' disabled' : '') + '>绑定当前存档</button><button type="button" data-profile-action="select-cloud-intent" data-profile-intent="load" aria-pressed="' + String(isLoad) + '" class="' + (isLoad ? 'is-selected' : '') + '"' + (cloudSaveState.pending ? ' disabled' : '') + '>读取已有存档</button></div>' : '<div class="player-profile-cloud-choice is-single"><span>我要</span><strong>读取已有存档</strong></div>') +
        '<div class="player-profile-cloud-choice" role="group" aria-label="验证码接收方式"><span>验证方式</span><button type="button" data-profile-action="select-cloud-channel" data-profile-channel="email" aria-pressed="' + String(!isPhone) + '" class="' + (!isPhone ? 'is-selected' : '') + '"' + (cloudSaveState.pending ? ' disabled' : '') + '>邮箱验证码</button><button type="button" data-profile-action="select-cloud-channel" data-profile-channel="phone" aria-pressed="' + String(isPhone) + '" class="' + (isPhone ? 'is-selected' : '') + '"' + (cloudSaveState.pending ? ' disabled' : '') + '>手机验证码</button></div>' +
      '</div>' +
      '<div class="player-profile-cloud-grid">' +
        '<article class="player-profile-cloud-summary"><span>当前状态</span><strong>' + escapeHtml(statusLabel) + '</strong><ul><li>战斗与养成操作自动写入云端</li><li>' + escapeHtml(rule) + '</li></ul></article>' +
        '<form class="player-profile-cloud-form" data-profile-cloud-form="send-code" novalidate>' +
          '<label for="' + identifierId + '">' + identifierLabel + '</label>' +
          '<div class="player-profile-cloud-input-row"><input id="' + identifierId + '" data-profile-cloud-identifier type="' + inputType + '" maxlength="' + (isPhone ? '24' : '254') + '" autocomplete="' + autocomplete + '" inputmode="' + inputMode + '" placeholder="' + placeholder + '" value="' + escapeAttr(cloudSaveState.identifier) + '"' + (cloudSaveState.pending ? ' disabled' : '') + '><button type="submit"' + (cloudSaveState.pending ? ' disabled' : '') + '>' + (cloudSaveState.pending ? '发送中…' : '发送验证码') + '</button></div>' +
          '<p class="player-profile-cloud-hint">' + (isPhone ? '中国大陆 11 位手机号会自动补全 +86；其他地区请填写国家区号。' : '邮件中会显示 6 位数字验证码，不需要点击登录链接。') + '</p>' +
        '</form>' +
      '</div>' + renderCloudFeedback() +
    '</div>';
  }

  function renderCloudCode() {
    var remaining = getCooldownSeconds();
    var isPhone = cloudSaveState.channel === "phone";
    var channelLabel = isPhone ? "手机" : "邮箱";
    var isLoad = cloudSaveState.intent === "load";
    var confirmLabel = isLoad ? "确认并读取存档" : "确认并绑定存档";
    var summaryTitle = isLoad ? "目标云档优先" : "安全绑定当前进度";
    var summaryRules = isLoad
      ? '<li>仅登录已经存在的云存档账号</li><li>失败时保留当前账号与档案</li>'
      : '<li>新账号：继承当前游客进度</li><li>账号已有云档：保护并读取已有进度</li>';
    return '<div class="player-profile-cloud-panel is-verifying">' +
      '<div class="player-profile-cloud-heading"><span class="player-profile-cloud-icon" aria-hidden="true">' + (isPhone ? '☎' : '✉') + '</span><div><small>IDENTITY CHECK</small><h3>输入' + channelLabel + '验证码</h3><p>6 位验证码已发送至 <strong>' + escapeHtml(maskCloudIdentifier(cloudSaveState.channel, cloudSaveState.identifier)) + '</strong>。验证成功后将' + (isLoad ? '读取已有云存档' : '完成当前存档绑定') + '。</p></div><span class="player-profile-cloud-badge is-active">待验证</span></div>' +
      '<div class="player-profile-cloud-grid">' +
        '<article class="player-profile-cloud-summary is-security"><span>存档安全规则</span><strong>' + summaryTitle + '</strong><ul>' + summaryRules + '</ul></article>' +
        '<form class="player-profile-cloud-form" data-profile-cloud-form="verify-code" novalidate>' +
          '<label for="profileCloudCode">6 位验证码</label>' +
          '<div class="player-profile-cloud-input-row"><input id="profileCloudCode" class="player-profile-cloud-code" type="text" maxlength="6" autocomplete="one-time-code" inputmode="numeric" pattern="[0-9]*" placeholder="000000" value="' + escapeAttr(cloudSaveState.code) + '"' + (cloudSaveState.pending ? ' disabled' : '') + '><button type="submit"' + (cloudSaveState.pending ? ' disabled' : '') + '>' + (cloudSaveState.pending ? '验证中…' : confirmLabel) + '</button></div>' +
          '<div class="player-profile-cloud-form-actions"><button type="button" class="is-secondary" data-profile-action="resend-cloud-code" data-profile-resend' + (remaining > 0 || cloudSaveState.pending ? ' disabled' : '') + '>' + (remaining > 0 ? remaining + ' 秒后可重发' : '重新发送') + '</button><button type="button" class="is-secondary" data-profile-action="change-cloud-identifier"' + (cloudSaveState.pending ? ' disabled' : '') + '>更换' + channelLabel + '</button></div>' +
        '</form>' +
      '</div>' + renderCloudFeedback() +
    '</div>';
  }

  function renderBoundCloudSave(accountState, uid) {
    var isPhone = accountState.status === "phone";
    var channelLabel = isPhone ? "手机" : "邮箱";
    return '<div class="player-profile-cloud-panel is-bound">' +
      '<div class="player-profile-cloud-heading"><span class="player-profile-cloud-icon" aria-hidden="true">✓</span><div><small>CLOUD ARCHIVE</small><h3>存档已保障</h3><p>战斗、养成与资料修改会自动写入当前' + channelLabel + '账号。</p></div><span class="player-profile-cloud-badge is-bound">' + channelLabel + '已绑定</span></div>' +
      '<div class="player-profile-cloud-bound-grid">' +
        '<article><span>找回方式</span><strong>' + escapeHtml(accountState.maskedIdentifier || ("已绑定" + channelLabel)) + '</strong></article>' +
        '<article><span>玩家 UID</span><strong>' + escapeHtml(uid ? formatUid(uid) : "同步中") + '</strong></article>' +
        '<article><span>保存模式</span><strong>自动云存档</strong></article>' +
      '</div>' +
      '<div class="player-profile-cloud-bound-actions"><p>在新设备上输入同一' + channelLabel + '并接收验证码，即可读取这份存档。</p><button type="button" class="is-secondary" data-profile-action="load-cloud-save">读取其他云存档</button></div>' +
      renderCloudFeedback() +
    '</div>';
  }

  function renderCloudFeedback() {
    var className = cloudSaveState.message ? (cloudSaveState.isError ? " is-error" : " is-success") : "";
    return '<output class="player-profile-cloud-feedback' + className + '" data-profile-cloud-status aria-live="polite">' + escapeHtml(cloudSaveState.message || "") + '</output>';
  }

  function maskEmailForDisplay(email) {
    var normalized = String(email || "").trim().toLowerCase();
    var parts = normalized.split("@");
    if (parts.length !== 2) return normalized;
    var visible = parts[0].slice(0, Math.min(2, parts[0].length));
    return visible + new Array(Math.max(4, parts[0].length - visible.length + 1)).join("*") + "@" + parts[1];
  }

  function maskPhoneForDisplay(phone) {
    var normalized = String(phone || "").trim();
    if (/^\+861[3-9]\d{9}$/.test(normalized)) return "+86 " + normalized.slice(3, 6) + "****" + normalized.slice(-4);
    var prefixLength = Math.min(4, Math.max(2, normalized.length - 4));
    return normalized.slice(0, prefixLength) + new Array(Math.max(5, normalized.length - prefixLength - 3)).join("*") + normalized.slice(-4);
  }

  function maskCloudIdentifier(channel, identifier) {
    return channel === "phone" ? maskPhoneForDisplay(identifier) : maskEmailForDisplay(identifier);
  }

  function getCooldownSeconds() {
    return Math.max(0, Math.ceil((cloudSaveState.cooldownUntil - Date.now()) / 1000));
  }

  function clearCooldownTimer() {
    if (cooldownTimer) root.clearTimeout(cooldownTimer);
    cooldownTimer = null;
  }

  function scheduleCooldownTick() {
    clearCooldownTimer();
    function tick() {
      var button = dom.featurePanelSlots && dom.featurePanelSlots.querySelector ? dom.featurePanelSlots.querySelector("[data-profile-resend]") : null;
      if (!button) return;
      var remaining = getCooldownSeconds();
      button.disabled = remaining > 0 || cloudSaveState.pending;
      button.textContent = remaining > 0 ? remaining + " 秒后可重发" : "重新发送";
      if (remaining > 0) cooldownTimer = root.setTimeout(tick, 1000);
    }
    tick();
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

  function normalizeCloudEmail(value) {
    var email = String(value || "").trim().toLowerCase();
    return /^\S+@\S+\.\S+$/.test(email) && email.length <= 254 ? email : "";
  }

  function normalizeCloudPhone(value) {
    var phone = String(value || "").trim().replace(/[\s()-]/g, "");
    if (/^1[3-9]\d{9}$/.test(phone)) phone = "+86" + phone;
    else if (/^861[3-9]\d{9}$/.test(phone)) phone = "+" + phone;
    else if (/^00\d+$/.test(phone)) phone = "+" + phone.slice(2);
    return /^\+[1-9]\d{7,14}$/.test(phone) ? phone : "";
  }

  function cloudChannelLabel() {
    return cloudSaveState.channel === "phone" ? "手机" : "邮箱";
  }

  function friendlyCloudError(error) {
    var message = String(error && error.message || "");
    if (error && error.status === 429) return "操作过于频繁，请稍后再发送验证码。";
    if (error && error.code === "REQUEST_TIMEOUT") return "云端响应超时，原存档保持不变，请重试。";
    if (cloudSaveState.channel === "phone" && /phone|sms|provider/i.test(message) && /disabled|unsupported|not enabled|not configured/i.test(message)) {
      return "手机验证码服务尚未开启，请改用邮箱，或联系运营人员配置短信渠道。";
    }
    if (/expired|invalid|token|otp|verification/i.test(message)) return "验证码无效或已过期，请重新获取。";
    if (/already|registered|not found|does not exist|signups? not allowed/i.test(message)) return "该" + cloudChannelLabel() + "没有可读取的已有存档。";
    return message || "云存档请求失败，当前进度保持不变。";
  }

  function requestCloudCode(value) {
    if (cloudSaveState.pending) return Promise.resolve(false);
    var isPhone = cloudSaveState.channel === "phone";
    var identifier = isPhone ? normalizeCloudPhone(value) : normalizeCloudEmail(value);
    if (!identifier) {
      cloudSaveState.message = isPhone ? "请输入有效的手机号，国际号码需包含国家区号。" : "请输入有效的邮箱地址。";
      cloudSaveState.isError = true;
      renderProfilePanel();
      return Promise.resolve(false);
    }
    cloudSaveState.identifier = identifier;
    cloudSaveState.pending = true;
    cloudSaveState.message = "正在发送验证码…";
    cloudSaveState.isError = false;
    renderProfilePanel();
    return ensureGameGateway().then(function sendThroughGateway(gateway) {
      gateway = gateway || getGameGateway();
      var methodName = isPhone ? "sendPhoneCode" : "sendEmailCode";
      if (!gateway || typeof gateway[methodName] !== "function") throw new Error(cloudChannelLabel() + "登录接口尚未连接。");
      return gateway[methodName](identifier, { createUser: cloudSaveState.intent === "bind" });
    }).then(function onCodeSent() {
      cloudSaveState.step = "code";
      cloudSaveState.pending = false;
      cloudSaveState.code = "";
      cloudSaveState.cooldownUntil = Date.now() + 60000;
      cloudSaveState.message = isPhone ? "验证码已发送，请查收短信。" : "验证码已发送，请查收邮件中的 6 位数字码。";
      cloudSaveState.isError = false;
      renderProfilePanel();
      return true;
    }).catch(function onCodeError(error) {
      cloudSaveState.pending = false;
      cloudSaveState.message = friendlyCloudError(error);
      cloudSaveState.isError = true;
      renderProfilePanel();
      return false;
    });
  }

  function verifyCloudCode(value) {
    if (cloudSaveState.pending) return Promise.resolve(false);
    var code = String(value || "").replace(/\D/g, "").slice(0, 6);
    cloudSaveState.code = code;
    if (!/^\d{6}$/.test(code)) {
      cloudSaveState.message = "请输入 6 位数字验证码。";
      cloudSaveState.isError = true;
      renderProfilePanel();
      return Promise.resolve(false);
    }
    cloudSaveState.pending = true;
    cloudSaveState.message = cloudSaveState.intent === "load" ? "正在验证身份并读取云存档…" : "正在验证身份并绑定当前存档…";
    cloudSaveState.isError = false;
    renderProfilePanel();
    return ensureGameGateway().then(function verifyThroughGateway(gateway) {
      gateway = gateway || getGameGateway();
      var methodName = cloudSaveState.channel === "phone" ? "verifyPhoneCode" : "verifyEmailCode";
      if (!gateway || typeof gateway[methodName] !== "function") throw new Error(cloudChannelLabel() + "登录接口尚未连接。");
      return gateway[methodName](cloudSaveState.identifier, code);
    }).then(function onVerified(result) {
      if (result && result.profile) applyGatewayProfile(result.profile);
      profile = options.getProfile();
      var successLabel = cloudChannelLabel();
      var successIntent = cloudSaveState.intent;
      cloudSaveState.step = "idle";
      cloudSaveState.intent = "bind";
      cloudSaveState.identifier = "";
      cloudSaveState.code = "";
      cloudSaveState.pending = false;
      cloudSaveState.cooldownUntil = 0;
      cloudSaveState.message = successIntent === "load"
        ? successLabel + "验证成功，已读取该账号的云存档。"
        : successLabel + "验证成功，当前云存档已完成绑定。";
      cloudSaveState.isError = false;
      renderLobby();
      renderProfilePanel();
      return true;
    }).catch(function onVerifyError(error) {
      cloudSaveState.pending = false;
      cloudSaveState.message = friendlyCloudError(error);
      cloudSaveState.isError = true;
      renderProfilePanel();
      return false;
    });
  }

  function handleProfilePanelSubmit(event) {
    var form = event && event.target && event.target.closest ? event.target.closest("[data-profile-cloud-form]") : null;
    if (!form) return false;
    if (event.preventDefault) event.preventDefault();
    var type = form.dataset.profileCloudForm;
    if (type === "send-code") {
      var identifierInput = form.querySelector("[data-profile-cloud-identifier]");
      return requestCloudCode(identifierInput && identifierInput.value);
    }
    if (type === "verify-code") {
      var codeInput = form.querySelector("#profileCloudCode");
      return verifyCloudCode(codeInput && codeInput.value);
    }
    return false;
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
    if (type === "equip-honor") {
      profile.player = profile.player || {};
      var equippedHonor = shared.playerHonorView && shared.playerHonorView.equipHonor
        ? shared.playerHonorView.equipHonor(profile.player, action.dataset.honorLevel)
        : null;
      if (!equippedHonor) return;
      persistProfileMetadata().catch(function keepLocalHonorSelection() {});
      renderLobby();
      renderProfilePanel();
      return;
    }
    if (type === "load-cloud-save") {
      cloudSaveState.step = "form";
      cloudSaveState.intent = "load";
      cloudSaveState.identifier = "";
      cloudSaveState.code = "";
      cloudSaveState.message = "请选择邮箱或手机号，读取对应的已有云存档。";
      cloudSaveState.isError = false;
      renderProfilePanel();
      return;
    }
    if (type === "select-cloud-intent") {
      cloudSaveState.step = "form";
      cloudSaveState.intent = action.dataset.profileIntent === "load" ? "load" : "bind";
      cloudSaveState.identifier = "";
      cloudSaveState.code = "";
      cloudSaveState.message = "";
      cloudSaveState.isError = false;
      cloudSaveState.cooldownUntil = 0;
      renderProfilePanel();
      return;
    }
    if (type === "select-cloud-channel") {
      cloudSaveState.step = "form";
      cloudSaveState.channel = action.dataset.profileChannel === "phone" ? "phone" : "email";
      cloudSaveState.identifier = "";
      cloudSaveState.code = "";
      cloudSaveState.message = "";
      cloudSaveState.isError = false;
      cloudSaveState.cooldownUntil = 0;
      renderProfilePanel();
      return;
    }
    if (type === "change-cloud-identifier") {
      cloudSaveState.step = "form";
      cloudSaveState.identifier = "";
      cloudSaveState.code = "";
      cloudSaveState.message = "";
      cloudSaveState.isError = false;
      cloudSaveState.cooldownUntil = 0;
      renderProfilePanel();
      return;
    }
    if (type === "resend-cloud-code") {
      if (getCooldownSeconds() <= 0) requestCloudCode(cloudSaveState.identifier);
      return;
    }
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
      clearCooldownTimer();
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
      handleSubmit: handleProfilePanelSubmit,
      handleAvatarUpload: handleAvatarUpload,
      calculateTotalPower: calculateTotalPower,
      calculateActivePower: calculateActivePower
    };
  }

  var api = { create: create };
  scope.profileController = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
