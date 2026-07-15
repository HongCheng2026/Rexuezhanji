(function registerSocialFeaturePanelsView(root) {
  "use strict";

  var scope = root.RXGame || (root.RXGame = {});
  var panelState = { friend: "好友名册", ranking: "战力榜" };
  var panelTabs = {
    friend: ["好友名册", "申请"],
    ranking: ["战力榜", "通关榜", "荣誉榜"]
  };

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch];
    });
  }

  function formatNumber(value) {
    return String(Math.max(0, Math.floor(Number(value) || 0))).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  function renderResources(profile) {
    var resources = profile && profile.resources || {};
    var gold = resources.gold != null ? resources.gold : profile && profile.coins || 0;
    return '<div class="fp-v3-resources">' +
      '<span><i class="gold"></i>金币 <b>' + formatNumber(gold) + '</b></span>' +
      '<span><i class="diamond"></i>钻石 <b>' + formatNumber(resources.diamonds || 0) + '</b></span>' +
      '<span><i class="energy"></i>体力 <b>' + formatNumber(resources.energy || 0) + (resources.maxEnergy ? '/' + formatNumber(resources.maxEnergy) : '') + '</b></span>' +
      '</div>';
  }

  function renderTabs(panel, tabs) {
    var active = panelState[panel] || tabs[0];
    var html = '<nav class="feature-tabs">';
    for (var i = 0; i < tabs.length; i++) {
      html += '<button type="button" class="' + (tabs[i] === active ? 'is-active' : '') + '" data-feature-panel="' + panel + '" data-feature-tab-index="' + i + '">' + escapeHtml(tabs[i]) + '</button>';
    }
    return html + '</nav>';
  }

  function renderFriendPanel(options) {
    options = options || {};
    var gateway = options.getGameGateway && options.getGameGateway();
    var dom = options.dom;
    var isCloud = Boolean(gateway && gateway.isCloud);
    var activeTab = panelState.friend;
    var list = '<section class="friend-board board-page fp-v3">' +
      renderTabs("friend", panelTabs.friend) +
      '<div class="friend-search-bar"><input type="text" class="friend-search-input" placeholder="输入玩家 ID 搜索..." maxlength="10" data-friend-search-input /><button type="button" class="friend-search-btn" data-friend-search-btn>搜索</button><span class="friend-search-status" data-friend-search-status></span></div>' +
      '<section class="friend-layout">' +
      '<section class="friend-roster"><section class="board-section-head"><div><strong>' + (activeTab === "申请" ? "好友申请" : "好友列表") + '</strong><span data-friend-online>加载中...</span></div><p data-friend-total>...</p></section><div class="friend-grid" data-friend-grid><article class="friend-card is-offline"><div><span>加载中</span><strong>正在连接...</strong></div></article></div></section>' +
      '<section class="friend-requests"><section class="board-section-head"><div><strong>好友申请</strong></div></section><div class="friend-request-list" data-friend-requests><p class="friend-empty-hint">暂无待处理申请</p></div></section>' +
      '</section></section>';

    setTimeout(function loadFriends() {
      if (isCloud && gateway.friendList) {
        gateway.friendList().then(function (result) {
          updateFriendGrid(dom, result.friends || []);
          updateFriendRequests(dom, result.pendingRequests || []);
        }).catch(function () {
          updateFriendGrid(dom, []);
          updateFriendRequests(dom, []);
          var grid = dom && dom.featurePanelSlots && dom.featurePanelSlots.querySelector("[data-friend-grid]");
          if (grid) grid.innerHTML = '<p class="friend-empty-hint">连接失败，请稍后重试。</p>';
        });
        return;
      }
      var local = scope.featurePanelContent && scope.featurePanelContent.FRIEND_CONTENT || [];
      updateFriendGrid(dom, local.map(function (friend) {
        return { name: friend.title, publicUid: 0, level: 1, isOnline: friend.tag === "在线", isLocal: true };
      }));
    }, 0);
    return list;
  }

  function updateFriendGrid(dom, friends) {
    var rootNode = dom && dom.featurePanelSlots;
    var grid = rootNode && rootNode.querySelector("[data-friend-grid]");
    if (!grid) return;
    var online = friends.filter(function (friend) { return friend.isOnline; }).length;
    var total = rootNode.querySelector("[data-friend-total]");
    var onlineNode = rootNode.querySelector("[data-friend-online]");
    if (total) total.textContent = "共 " + friends.length + " 人";
    if (onlineNode) onlineNode.textContent = "在线 " + online;
    if (!friends.length) {
      grid.innerHTML = '<p class="friend-empty-hint">暂无好友，仍可处理右侧收到的申请。</p>';
      return;
    }
    grid.innerHTML = friends.map(function (friend) {
      return '<article class="friend-card ' + (friend.isOnline ? 'is-online' : 'is-offline') + '">' +
        '<i class="friend-avatar-letter">' + escapeHtml((friend.name || "?").charAt(0).toUpperCase()) + '</i>' +
        '<div><span>' + (friend.isOnline ? "在线" : "离线") + '</span><strong>' + escapeHtml(friend.name) + '</strong><p>Lv.' + (friend.level || 1) + (friend.publicUid ? ' · ID:' + friend.publicUid : '') + '</p></div>' +
        (friend.isLocal ? '<button type="button" disabled>预览</button>' : '<button type="button" class="friend-remove-btn" data-friend-remove="' + friend.publicUid + '">删除</button>') +
        '</article>';
    }).join("");
  }

  function updateFriendRequests(dom, requests) {
    var list = dom && dom.featurePanelSlots && dom.featurePanelSlots.querySelector("[data-friend-requests]");
    if (!list) return;
    if (!requests.length) {
      list.innerHTML = '<p class="friend-empty-hint">暂无待处理申请</p>';
      return;
    }
    list.innerHTML = requests.map(function (request) {
      return '<article class="friend-request-item"><strong>' + escapeHtml(request.name) + '</strong><span>ID: ' + request.publicUid + '</span>' +
        '<button type="button" class="friend-accept-btn" data-friend-accept="' + request.id + '">接受</button>' +
        '<button type="button" class="friend-reject-btn" data-friend-reject="' + request.id + '">拒绝</button></article>';
    }).join("");
  }

  function getProgress(profile) {
    return profile && profile.progress || {};
  }

  function getBestHonor(profile) {
    var honors = getProgress(profile).stageHonors || {};
    var best = 0;
    Object.keys(honors).forEach(function (key) {
      best = Math.max(best, Number(honors[key]) || 0);
    });
    return best;
  }

  function renderRankingPanel(profile, combatPower, options) {
    options = options || {};
    profile = profile || {};
    var gateway = options.getGameGateway && options.getGameGateway();
    var dom = options.dom;
    var isCloud = Boolean(gateway && gateway.isCloud);
    var active = panelState.ranking;
    var category = active === "通关榜" ? "clear" : active === "荣誉榜" ? "honor" : "power";
    var formatter = category === "clear" ? function (value) { return formatNumber(value) + " 关"; } : category === "honor" ? function (value) { return value ? "Tier " + value : "未记录"; } : formatNumber;
    var fallback = scope.featurePanelContent && scope.featurePanelContent.RANKING_CONTENT || {};
    var rows = isCloud ? [] : (fallback[category] || []).slice();
    if (!isCloud) rows.push({ name: profile.player && profile.player.name || "本地指挥官", title: "星港新锐", score: category === "clear" ? Number(getProgress(profile).clearCount) || 0 : category === "honor" ? getBestHonor(profile) : Number(combatPower) || 0, tag: "我的" });
    rows.sort(function (a, b) { return Number(b.score) - Number(a.score); });
    var list = '<section class="ranking-board board-page fp-v3" data-ranking-board>' + renderResources(profile) + renderTabs("ranking", panelTabs.ranking) +
      '<section class="ranking-layout"><article class="ranking-podium"><div class="season-copy"><span>SEASON 01</span><strong>星港先锋赛季</strong><p>实时云端记录</p></div><div class="podium-grid" data-ranking-podium>' + renderPodium(rows.slice(0, 3), formatter) + '</div></article>' +
      '<section class="ranking-table"><section class="board-section-head"><div><strong>' + escapeHtml(active) + '</strong><span data-ranking-source>' + (isCloud ? '正在连接云端榜单' : '本地模拟榜单') + '</span></div><p>切换标签刷新</p></section>' +
      '<header><span>排名</span><span>玩家</span><span>称号</span><span>成绩</span></header><div class="ranking-rows" data-ranking-rows>' + renderRankingRows(rows.slice(3), formatter, 4) + '</div>' +
      '<footer><span>赛季奖励</span><strong>首版仅展示成绩，不从客户端提交分数</strong><button type="button" disabled>规则</button></footer></section></section></section>';

    if (isCloud && gateway.leaderboardFetch) {
      setTimeout(function loadLeaderboard() {
        gateway.leaderboardFetch(category).then(function (data) {
          updateRankingBoard(dom, data.rows || [], formatter, data.self);
        }).catch(function () {
          var board = dom && dom.featurePanelSlots && dom.featurePanelSlots.querySelector("[data-ranking-board]");
          var source = board && board.querySelector("[data-ranking-source]");
          var rowRoot = board && board.querySelector("[data-ranking-rows]");
          if (source) source.textContent = "连接失败，请切换标签重试";
          if (rowRoot) rowRoot.innerHTML = '<p class="ranking-empty-hint">云端排行榜暂时不可用。</p>';
        });
      }, 0);
    }
    return list;
  }

  function renderPodium(rows, formatter) {
    var padded = rows.slice(0, 3);
    while (padded.length < 3) padded.push({ name: "-", title: "暂无记录", score: 0 });
    return [1, 0, 2].map(function (index) {
      var row = padded[index];
      return '<article class="podium-rank rank-' + (index + 1) + '"><span>' + (index + 1) + '</span>' + (index === 0 ? '<b class="podium-crown">♛</b>' : '') + '<i>' + escapeHtml((row.name || "-").slice(0, 2)) + '</i><strong>' + escapeHtml(row.name) + '</strong><p>' + escapeHtml(row.title || "") + '</p><em>' + escapeHtml(formatter(row.score)) + '</em></article>';
    }).join("");
  }

  function renderRankingRows(rows, formatter, offset, self) {
    return rows.map(function (row, index) {
      var rank = offset + index;
      var isSelf = Boolean(self && self.rank === rank);
      return '<article class="' + (isSelf ? 'is-self' : '') + '"><b>' + String(rank).padStart(2, "0") + '</b><i>' + escapeHtml((row.name || "-").slice(0, 1)) + '</i><strong>' + escapeHtml(row.name) + '</strong><span>' + escapeHtml(row.title || "") + '</span><em>' + escapeHtml(formatter(row.score)) + '</em>' + (isSelf ? '<u>你的位置</u>' : '') + '</article>';
    }).join("") || '<p class="ranking-empty-hint">暂无更多排名</p>';
  }

  function updateRankingBoard(dom, rows, formatter, self) {
    var board = dom && dom.featurePanelSlots && dom.featurePanelSlots.querySelector("[data-ranking-board]");
    if (!board) return;
    var source = board.querySelector("[data-ranking-source]");
    if (source) source.textContent = "云端实时榜单";
    var podium = board.querySelector("[data-ranking-podium]");
    var rowRoot = board.querySelector("[data-ranking-rows]");
    if (podium) podium.innerHTML = renderPodium(rows.slice(0, 3), formatter);
    if (rowRoot) {
      var html = renderRankingRows(rows.slice(3), formatter, 4, self);
      if (self && self.rank > rows.length) html += '<article class="is-self"><b>' + String(self.rank).padStart(2, "0") + '</b><strong>你的排名</strong><span></span><em>' + escapeHtml(formatter(self.score)) + '</em><u>你的位置</u></article>';
      rowRoot.innerHTML = html;
    }
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
    if (key === "friend") return renderFriendPanel(options);
    if (key === "ranking") return renderRankingPanel(options.profile, options.combatPower, options);
    if (key === "chat") return renderChatPanel(options);
    return "";
  }

  function handleEvent(event, dom, options) {
    var tab = event.target && event.target.closest ? event.target.closest("[data-feature-tab]") : null;
    var panel = tab && tab.dataset && tab.dataset.featurePanel;
    if (!panelTabs[panel]) return false;
    var index = Math.floor(Number(tab.dataset.featureTabIndex));
    var next = panelTabs[panel][index];
    if (!next) return false;
    panelState[panel] = next;
    return scope.mainFeaturePanelsView.renderPanel(panel, dom, options || {});
  }

  function handleClick(event, dom, options) {
    options = options || {};
    var target = event.target;
    var gateway = options.getGameGateway && options.getGameGateway();
    var rerender = function rerender() { return scope.mainFeaturePanelsView.renderPanel("friend", dom, options); };
    if (target && target.hasAttribute && target.hasAttribute("data-friend-search-btn")) {
      var input = dom.featurePanelSlots.querySelector("[data-friend-search-input]");
      var status = dom.featurePanelSlots.querySelector("[data-friend-search-status]");
      var uid = input ? parseInt(input.value, 10) : 0;
      if (!uid || uid < 100000001) { if (status) status.textContent = "请输入有效的玩家 ID"; return true; }
      if (!gateway || !gateway.friendSearch) { if (status) status.textContent = "好友服务未连接"; return true; }
      if (status) status.textContent = "搜索中...";
      gateway.friendSearch(uid).then(function (result) {
        if (result.relation && result.relation.status === "accepted") { if (status) status.textContent = "已是好友"; return; }
        if (result.relation && result.relation.status === "pending") { if (status) status.textContent = result.relation.direction === "sent" ? "已发送请求" : "对方已向你发送请求"; return; }
        if (status) status.textContent = "找到：" + result.name + "，发送好友请求...";
        return gateway.friendRequest(uid).then(function () { if (status) status.textContent = "好友请求已发送"; });
      }).catch(function (error) { if (status) status.textContent = error && error.message || "搜索或发送失败"; });
      return true;
    }
    var action = target && target.hasAttribute && (target.hasAttribute("data-friend-accept") ? "accept" : target.hasAttribute("data-friend-reject") ? "reject" : "");
    if (action && gateway && gateway.friendRespond) {
      target.disabled = true;
      target.textContent = "处理中...";
      gateway.friendRespond(parseInt(target.getAttribute("data-friend-" + action), 10), action).then(rerender).catch(function () { target.disabled = false; target.textContent = "重试"; });
      return true;
    }
    if (target && target.hasAttribute && target.hasAttribute("data-friend-remove") && gateway && gateway.friendRemove) {
      if (root.confirm && !root.confirm("确定要删除该好友吗？")) return true;
      target.disabled = true;
      gateway.friendRemove(parseInt(target.getAttribute("data-friend-remove"), 10)).then(rerender).catch(function () { target.disabled = false; target.textContent = "重试"; });
      return true;
    }
    if (target && target.hasAttribute && target.hasAttribute("data-chat-send")) {
      var chatInput = dom.featurePanelSlots.querySelector("[data-chat-input]");
      var message = chatInput ? chatInput.value.trim() : "";
      if (!message || !gateway || !gateway.chatSend) return true;
      chatInput.disabled = true;
      target.disabled = true;
      target.textContent = "发送中...";
      gateway.chatSend("world", message).then(function () { chatInput.value = ""; target.textContent = "发送"; }).catch(function () { target.textContent = "失败，重试"; }).finally(function () { chatInput.disabled = false; target.disabled = false; });
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
