(function registerSocialFeaturePanelsView(root) {
  "use strict";

  var scope = root.RXGame || (root.RXGame = {});
  /* ── 社交枢纽状态 ── */
  var socialTab = "friend";
  var socialSelected = null;
  var lastFriendList = [];
  var dialogueStep = 0;

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch];
    });
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }

  /* ═══════════════════════════════════════════
     社交枢纽（好友 / 战姬 对话）
     完全重绘，不沿用旧 friend-panel 结构
  ═══════════════════════════════════════════ */

  function renderSocialHub(options) {
    options = options || {};
    var gateway = options.getGameGateway && options.getGameGateway();
    var dom = options.dom;
    var isCloud = Boolean(gateway && gateway.isCloud);
    socialTab = "friend";
    socialSelected = null;
    dialogueStep = 0;

    var html = '<section class="social-hub" data-social-hub>' +
      '<aside class="social-sidebar">' +
        '<nav class="social-nav">' +
          '<button type="button" class="social-tab is-active" data-social-tab="friend">好友</button>' +
          '<button type="button" class="social-tab" data-social-tab="pilot">战姬</button>' +
        '</nav>' +
        '<div class="social-search-wrap" data-social-search-wrap>' +
          '<input type="text" class="social-search-input" placeholder="输入玩家 ID 搜索..." maxlength="10" data-social-search-input />' +
          '<button type="button" class="social-search-btn" data-social-search-btn>搜索</button>' +
          '<span class="social-search-status" data-social-search-status></span>' +
        '</div>' +
        '<div class="social-roster" data-social-roster>' +
          '<div class="social-roster-loading">加载中...</div>' +
        '</div>' +
      '</aside>' +
      '<main class="social-chat" data-social-chat>' +
        '<div class="social-chat-empty"><p>选择左侧列表开始对话。</p></div>' +
      '</main>' +
      '</section>';

    setTimeout(function () {
      loadFriendData(dom, gateway, isCloud);
      loadPilotData(dom);
    }, 0);
    return html;
  }

  /* ── 好友数据加载 ── */
  function loadFriendData(dom, gateway, isCloud) {
    if (isCloud && gateway.friendList) {
      gateway.friendList().then(function (result) {
        renderFriendRoster(dom, result.friends || []);
      }).catch(function () {
        renderFriendRoster(dom, []);
        showSearchStatus(dom, "连接失败");
      });
      return;
    }
    var local = scope.featurePanelContent && scope.featurePanelContent.FRIEND_CONTENT || [];
    renderFriendRoster(dom, local.map(function (f, i) {
      return { name: f.title, publicUid: "local" + i, level: 1, isOnline: f.tag === "在线", isLocal: true, role: f.role || "", messages: [] };
    }));
  }

  function renderFriendRoster(dom, friends) {
    lastFriendList = friends || [];
    var roster = dom && dom.featurePanelSlots && dom.featurePanelSlots.querySelector("[data-social-roster]");
    if (!roster) return;
    if (socialTab !== "friend") { roster.innerHTML = ""; return; }
    if (!friends.length) {
      roster.innerHTML = '<div class="social-empty">暂无好友。</div>';
      return;
    }
    roster.innerHTML = friends.map(function (f) {
      var uid = f.publicUid != null ? f.publicUid : "";
      return '<div class="social-item ' + (f.isOnline ? 'is-online' : 'is-offline') + '" data-social-item="' + escapeAttr(String(uid)) + '" data-social-type="friend">' +
        '<span class="social-item-avatar">' + escapeHtml((f.name || "?").charAt(0)) + '</span>' +
        '<div class="social-item-info"><strong>' + escapeHtml(f.name) + '</strong><span>' + (f.role || (f.isLocal ? '本地预览' : 'Lv.' + (f.level || 1))) + '</span></div>' +
        '<em class="social-item-dot ' + (f.isOnline ? 'online' : '') + '"></em>' +
        '</div>';
    }).join("");
  }

  /* ── 战姬数据加载 ── */
  function loadPilotData(dom) {
    var pilotAssets = (scope.assets && scope.assets.PILOT_ASSETS) || [];
    var ownedIds = [];
    var profile = dom && dom.profile || {};
    if (profile.owned && Array.isArray(profile.owned.pilots)) ownedIds = profile.owned.pilots;

    var owned = pilotAssets.filter(function (p) { return ownedIds.indexOf(p.id) >= 0; });
    if (!owned.length && pilotAssets.length) owned = pilotAssets.slice(0, 3);

    if (socialTab === "pilot") renderPilotRoster(dom, owned);
  }

  function renderPilotRoster(dom, pilots) {
    var roster = dom && dom.featurePanelSlots && dom.featurePanelSlots.querySelector("[data-social-roster]");
    if (!roster) return;
    if (socialTab !== "pilot") { roster.innerHTML = ""; return; }
    if (!pilots.length) {
      roster.innerHTML = '<div class="social-empty">暂无战姬。</div>';
      return;
    }
    roster.innerHTML = pilots.map(function (p) {
      return '<div class="social-item social-item-pilot" data-social-item="' + escapeAttr(p.id) + '" data-social-type="pilot">' +
        '<span class="social-item-avatar pilot-rank-' + (p.rank || "B").toLowerCase() + '">' + escapeHtml((p.name || "?").charAt(0)) + '</span>' +
        '<div class="social-item-info"><strong>' + escapeHtml(p.name) + '</strong><span>' + escapeHtml(p.codeName || p.rank || "") + ' · ' + escapeHtml(p.rank || "") + '</span></div>' +
        '</div>';
    }).join("");
  }

  /* ── 标签切换 ── */
  function switchSocialTab(dom, tab) {
    socialTab = tab;
    socialSelected = null;
    dialogueStep = 0;
    var searchWrap = dom.featurePanelSlots.querySelector("[data-social-search-wrap]");
    if (searchWrap) searchWrap.style.display = tab === "friend" ? "" : "none";

    var navBtns = dom.featurePanelSlots.querySelectorAll(".social-tab");
    for (var i = 0; i < navBtns.length; i++) {
      navBtns[i].classList.toggle("is-active", navBtns[i].getAttribute("data-social-tab") === tab);
    }
    if (tab === "friend") loadFriendData(dom, optionsForDom(dom).getGate(), optionsForDom(dom).isCloud());
    else loadPilotData(dom);

    clearChatArea(dom);
  }

  function optionsForDom(dom) {
    if (!dom || !dom._socialOpts) return { getGate: function () {}, isCloud: function () { return false; } };
    return dom._socialOpts;
  }

  /* ── 聊天区：好友留言板 ── */
  function openFriendChat(dom, friend) {
    socialSelected = friend;
    var chatArea = dom.featurePanelSlots.querySelector("[data-social-chat]");
    if (!chatArea) return;
    var uid = friend.publicUid != null ? friend.publicUid : "";
    var messages = friend.messages || [];
    var html = '<header class="social-chat-header">' +
      '<span class="social-chat-avatar">' + escapeHtml((friend.name || "?").charAt(0)) + '</span>' +
      '<div class="social-chat-meta"><strong>' + escapeHtml(friend.name) + '</strong><span>' + (friend.role || (friend.isLocal ? '本地预览' : 'Lv.' + (friend.level || 1))) + '</span></div>' +
      '</header>' +
      '<div class="social-chat-body" data-social-chat-body>';

    if (messages.length) {
      for (var i = 0; i < messages.length; i++) {
        html += '<div class="chat-msg other"><div class="chat-bubble"><p>' + escapeHtml(messages[i].text || "") + '</p><time>' + escapeHtml(messages[i].time || "") + '</time></div></div>';
      }
    } else {
      html += '<div class="chat-msg other"><div class="chat-bubble"><p>与 ' + escapeHtml(friend.name) + ' 暂无留言记录。上线后可在此查看消息。</p></div></div>';
    }
    html += '</div>';
    chatArea.innerHTML = html;

    highlightSelectedItem(dom, uid);
  }

  /* ── 聊天区：战姬对话（剧情介绍 + 选项）── */
  var PILOT_DIALOGUES = {
    _commonChoices: [
      { text: "最近任务怎么样？", replyTag: "mission" },
      { text: "有什么战斗建议吗？", replyTag: "advice" },
      { text: "今天状态如何？", replyTag: "mood" }
    ],
    _replies: {
      mission: [
        "核心闸门的压制任务还在持续，敌机刷新频率比上周高了约 15%。",
        "金羽航线的试飞数据已经整理完毕，短窗口击穿效率提升了。",
        "深空侦察队刚完成一轮穿插训练，新航线标记了三个补给点。",
        "序章弹道训练的记录还在，需要的话我可以帮你复盘关键节点。"
      ],
      advice: [
        "先把火力核心强化到 Lv.3，再考虑破甲和生命。前期输出优先。",
        "不要贪输出——深空航线的关键是规避节奏，不是火力密度。",
        "建议在混乱弹幕中给队友开稳定窗口，比单打独斗效率高得多。",
        "新手阶段先熟悉基础火控节奏，等弹道稳定后再追求高阶操作。"
      ],
      mood: [
        "随时待命。只要指挥官一声令下，我就能进入出击位置。",
        "状态良好。机库维护刚结束，武装系统已校准完毕。",
        "有点累但还能坚持。连续出击后需要休息窗口，不过现在还不是时候。",
        "精神集中。每次出击前我都会重新确认航线参数和补给路线。"
      ]
    }
  };

  function openPilotDialogue(dom, pilot) {
    socialSelected = pilot;
    dialogueStep = 0;
    var chatArea = dom.featurePanelSlots.querySelector("[data-social-chat]");
    if (!chatArea) return;
    var storyLine = pilot.story || ("我是" + (pilot.name || "未知战姬") + "，" + (pilot.description || "随时准备出击。"));

    var html = '<header class="social-chat-header">' +
      '<span class="social-chat-avatar pilot-rank-' + (pilot.rank || "B").toLowerCase() + '">' + escapeHtml((pilot.name || "?").charAt(0)) + '</span>' +
      '<div class="social-chat-meta"><strong>' + escapeHtml(pilot.name) + '</strong><span>' + escapeHtml(pilot.codeName || "") + ' · ' + escapeHtml(pilot.rank || "") + ' 级战姬</span></div>' +
      '</header>' +
      '<div class="social-chat-body" data-social-chat-body>' +
        '<div class="chat-msg other"><div class="chat-bubble"><p>' + escapeHtml(storyLine) + '</p></div></div>' +
      '</div>' +
      '<footer class="social-chat-actions" data-social-actions>' +
        renderDialogueChoices(pilot) +
      '</footer>';
    chatArea.innerHTML = html;
    highlightSelectedItem(dom, pilot.id);
  }

  function renderDialogueChoices(pilot) {
    var choices = PILOT_DIALOGUES._commonChoices;
    return choices.map(function (c, idx) {
      return '<button type="button" class="chat-choice" data-chat-choice="' + idx + '" data-choice-tag="' + escapeAttr(c.replyTag) + '">' + escapeHtml(c.text) + '</button>';
    }).join("");
  }

  function advanceDialogue(dom, choiceTag) {
    var body = dom.featurePanelSlots.querySelector("[data-social-chat-body]");
    var actionsFooter = dom.featurePanelSlots.querySelector("[data-social-actions]");
    if (!body || !actionsFooter) return;

    var pilot = socialSelected;
    if (!pilot || !pilot.id) return;

    var replies = PILOT_DIALOGUES._replies[choiceTag] || PILOT_DIALOGUES._replies.mood;
    var replyText = replies[Math.floor(Math.random() * replies.length)];

    body.insertAdjacentHTML('beforeend',
      '<div class="chat-msg self"><div class="chat-bubble"><p>' + escapeHtml(PILOT_DIALOGUES._commonChoices.filter(function (c) { return c.replyTag === choiceTag; })[0].text || "...") + '</p></div></div>' +
      '<div class="chat-msg other"><div class="chat-bubble"><p>' + escapeHtml(replyText) + '</p></div></div>'
    );
    body.scrollTop = body.scrollHeight;
    dialogueStep++;

    if (dialogueStep >= 2) {
      actionsFooter.innerHTML = '<span class="chat-ended">对话已结束，可重新选择战姬继续交流。</span>';
    } else {
      actionsFooter.innerHTML = renderDialogueChoices(pilot);
    }
  }

  /* ── 工具函数 ── */
  function clearChatArea(dom) {
    var chatArea = dom.featurePanelSlots && dom.featurePanelSlots.querySelector("[data-social-chat]");
    if (chatArea) chatArea.innerHTML = '<div class="social-chat-empty"><p>选择左侧列表开始对话。</p></div>';
    var items = dom.featurePanelSlots && dom.featurePanelSlots.querySelectorAll(".social-item");
    for (var i = 0; items && i < items.length; i++) items[i].classList.remove("is-selected");
  }

  function highlightSelectedItem(dom, id) {
    var items = dom.featurePanelSlots.querySelectorAll(".social-item");
    for (var i = 0; i < items.length; i++) {
      var itemId = items[i].getAttribute("data-social-item");
      items[i].classList.toggle("is-selected", String(itemId) === String(id));
    }
  }

  function showSearchStatus(dom, msg) {
    var el = dom.featurePanelSlots && dom.featurePanelSlots.querySelector("[data-social-search-status]");
    if (el) el.textContent = msg || "";
  }

  function renderChatPanel(options) {
    options = options || {};
    var gateway = options.getGameGateway && options.getGameGateway();
    var dom = options.dom;
    var isCloud = Boolean(gateway && gateway.isCloud);
    var primitives = scope.mainFeaturePanelPrimitives || {};
    var messages = '<div class="terminal-chat-flow"><div class="chat-messages-list" data-chat-messages><p class="chat-loading">连接星港通讯中...</p></div></div>' +
      '<footer class="terminal-chat-input">' + (isCloud ? '<input type="text" maxlength="200" placeholder="输入消息..." data-chat-input /><button type="button" data-chat-send>发送</button>' : '<input type="text" disabled value="频道预览，发送功能未开放" /><button type="button" disabled>发送</button>') + '</footer>';
    var html = primitives.renderTerminalShell ? primitives.renderTerminalShell({
      key: "chat", kicker: isCloud ? "COMMS ONLINE" : "CHANNEL PREVIEW", title: "星港通讯频道", desc: isCloud ? "世界频道已连接，与其他指挥官实时交流。" : "本地仅提供频道预览。",
      rail: primitives.renderRail(["世界", "好友（未开放）", "公会（未开放）"], "世界", isCloud ? "在线" : "频道为本地预览。"),
      summary: primitives.renderStatusSummary([{ label: "频道", value: isCloud ? "在线" : "预览" }, { label: "消息", value: "-" }, { label: "发送", value: isCloud ? "可用" : "未开放" }]),
      list: messages,
      dock: primitives.renderDock({ kicker: "COMMS", reward: "-", note: isCloud ? "ONLINE" : "PREVIEW", action: isCloud ? "LIVE" : "LOCAL", overviewTitle: "COMMS", stats: [{ label: "CHANNEL", value: "WORLD" }, { label: "MESSAGE", value: "-" }, { label: "STATE", value: isCloud ? "LIVE" : "LOCAL" }] })
    }) : messages;
    if (isCloud && gateway.chatPoll) startChatPolling(dom, gateway);
    return html;
  }

  function startChatPolling(dom, gateway) {
    var lastTimestamp = "";
    setTimeout(function initialPoll() {
      gateway.chatPoll("world", "").then(function (data) {
        var messages = data.messages || [];
        if (messages.length) lastTimestamp = messages[messages.length - 1].created_at;
        updateChatMessages(dom, messages, false);
      }).catch(function () {
        var rootNode = dom && dom.featurePanelSlots && dom.featurePanelSlots.querySelector("[data-chat-messages]");
        if (rootNode) rootNode.innerHTML = '<p class="chat-empty-hint">连接失败，请关闭面板后重试。</p>';
      });
    }, 0);
    stopChatPolling(dom);
    var timer = setInterval(function pollWorld() {
      gateway.chatPoll("world", lastTimestamp).then(function (data) {
        var messages = data.messages || [];
        if (!messages.length) return;
        lastTimestamp = messages[messages.length - 1].created_at;
        updateChatMessages(dom, messages, true);
      }).catch(function () {});
    }, 3000);
    var visibility = function visibility() { if (document.hidden) stopChatPolling(dom); };
    document.addEventListener("visibilitychange", visibility);
    if (dom && dom.featurePanel) dom.featurePanel._chatCleanup = { timer: timer, visibility: visibility };
  }

  function stopChatPolling(dom) {
    var panel = dom && dom.featurePanel;
    var cleanup = panel && panel._chatCleanup;
    if (!cleanup) return;
    if (cleanup.timer) clearInterval(cleanup.timer);
    if (cleanup.visibility) document.removeEventListener("visibilitychange", cleanup.visibility);
    panel._chatCleanup = null;
  }

  function updateChatMessages(dom, messages, append) {
    var rootNode = dom && dom.featurePanelSlots && dom.featurePanelSlots.querySelector("[data-chat-messages]");
    if (!rootNode) return;
    var html = messages.map(function (message) {
      var date = message.created_at ? new Date(message.created_at) : null;
      var time = date ? String(date.getHours()).padStart(2, "0") + ":" + String(date.getMinutes()).padStart(2, "0") : "";
      return '<article><span>[' + escapeHtml(message.player_name || "系统") + ']</span><p>' + escapeHtml(message.message) + '</p><time>' + time + '</time></article>';
    }).join("");
    if (append) {
      var hint = rootNode.querySelector(".chat-empty-hint");
      if (hint) hint.remove();
      rootNode.insertAdjacentHTML("beforeend", html);
    } else {
      rootNode.innerHTML = html || '<p class="chat-empty-hint">暂无消息，发送第一条消息吧</p>';
    }
    rootNode.scrollTop = rootNode.scrollHeight;
  }

  function renderPanel(key, options) {
    if (key === "friend") { if (options && options.dom) options.dom._socialOpts = { getGate: function () { var g = options.getGameGateway; return g ? g() : null; }, isCloud: function () { var g = options.getGameGateway && options.getGameGateway(); return Boolean(g && g.isCloud); } }; return renderSocialHub(options); }
    if (key === "chat") return renderChatPanel(options);
    return "";
  }

  function handleEvent() { return false; }

  function handleClick(event, dom, options) {
    options = options || {};
    var target = event.target;
    var gateway = options.getGameGateway && options.getGameGateway();

    /* 社交枢纽：标签切换 */
    var sTab = target && target.closest ? target.closest("[data-social-tab]") : null;
    if (sTab) { switchSocialTab(dom, sTab.getAttribute("data-social-tab")); return true; }

    /* 社交枢纽：列表项点击 */
    var sItem = target && target.closest ? target.closest("[data-social-item]") : null;
    if (sItem) {
      var sid = sItem.getAttribute("data-social-item");
      var stype = sItem.getAttribute("data-social-type");
      if (stype === "pilot") {
        var pa = (scope.assets && scope.assets.PILOT_ASSETS) || [];
        var pp = pa.filter(function (p) { return p.id === sid; })[0];
        if (pp) openPilotDialogue(dom, pp);
      } else {
        var fp = (lastFriendList || []).filter(function (f) { return String(f.publicUid != null ? f.publicUid : "") === String(sid); })[0];
        if (fp) openFriendChat(dom, fp);
      }
      return true;
    }

    /* 社交枢纽：对话选项 */
    if (target && target.hasAttribute && target.hasAttribute("data-chat-choice")) {
      advanceDialogue(dom, target.getAttribute("data-choice-tag"));
      return true;
    }

    /* 好友搜索 */
    if (target && target.hasAttribute && target.hasAttribute("data-social-search-btn")) {
      var inp = dom.featurePanelSlots.querySelector("[data-social-search-input]");
      var st = dom.featurePanelSlots.querySelector("[data-social-search-status]");
      var suid = inp ? parseInt(inp.value, 10) : 0;
      if (!suid || suid < 100000001) { showSearchStatus(dom, "请输入有效的玩家 ID"); return true; }
      if (!gateway || !gateway.friendSearch) { showSearchStatus(dom, "好友服务未连接"); return true; }
      showSearchStatus(dom, "搜索中...");
      gateway.friendSearch(suid).then(function (result) {
        if (result.relation && result.relation.status === "accepted") { showSearchStatus(dom, "已是好友"); return; }
        if (result.relation && result.relation.status === "pending") { showSearchStatus(dom, result.relation.direction === "sent" ? "已发送请求" : "对方已向你发送请求"); return; }
        showSearchStatus(dom, "找到：" + result.name + "，发送好友请求...");
        return gateway.friendRequest(suid).then(function () { showSearchStatus(dom, "好友请求已发送"); });
      }).catch(function () { showSearchStatus(dom, "搜索或发送失败"); });
      return true;
    }

    /* 聊天频道发送 */
    if (target && target.hasAttribute && target.hasAttribute("data-chat-send")) {
      var cIn = dom.featurePanelSlots.querySelector("[data-chat-input]");
      var cMsg = cIn ? cIn.value.trim() : "";
      if (!cMsg || !gateway || !gateway.chatSend) return true;
      cIn.disabled = true;
      target.disabled = true;
      target.textContent = "发送中...";
      gateway.chatSend("world", cMsg).then(function () { cIn.value = ""; target.textContent = "发送"; }).catch(function () { target.textContent = "失败，重试"; }).finally(function () { cIn.disabled = false; target.disabled = false; });
      return true;
    }
    return false;
  }

  scope.socialFeaturePanelsView = {
    renderPanel: renderPanel,
    handleEvent: handleEvent,
    handleClick: handleClick,
    stopChatPolling: stopChatPolling
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
