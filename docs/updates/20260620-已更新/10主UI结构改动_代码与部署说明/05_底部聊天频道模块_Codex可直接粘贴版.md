# 05_底部聊天频道模块_Codex可直接粘贴版

```js
// mainChatChannelConfig.js

export const CHAT_CHANNEL = {
  SYSTEM: "system",
  WORLD: "world",
  GUILD: "guild",
  FRIEND: "friend"
};

export const MAIN_CHAT_CHANNEL_CONFIG = {
  containerId: "main_chat_bar",
  defaultChannel: CHAT_CHANNEL.WORLD,
  maxDisplayLength: 42,
  showChannelTabs: true,
  autoRollIntervalMs: 4500
};

export const CHAT_CHANNEL_TABS = [
  {
    id: CHAT_CHANNEL.SYSTEM,
    title: "系统",
    subTitle: "SYSTEM",
    color: "#ffd56a",
    enabled: true
  },
  {
    id: CHAT_CHANNEL.WORLD,
    title: "世界",
    subTitle: "WORLD",
    color: "#66d9ff",
    enabled: true
  },
  {
    id: CHAT_CHANNEL.GUILD,
    title: "公会",
    subTitle: "GUILD",
    color: "#b98cff",
    enabled: true
  },
  {
    id: CHAT_CHANNEL.FRIEND,
    title: "好友",
    subTitle: "FRIEND",
    color: "#72ffac",
    enabled: true
  }
];

export const DEFAULT_CHAT_MESSAGES = {
  [CHAT_CHANNEL.SYSTEM]: [
    {
      id: "system_welcome",
      channel: CHAT_CHANNEL.SYSTEM,
      senderName: "系统",
      text: "欢迎加入飞行战队，指挥官。",
      time: Date.now()
    }
  ],
  [CHAT_CHANNEL.WORLD]: [
    {
      id: "world_welcome",
      channel: CHAT_CHANNEL.WORLD,
      senderName: "王牌飞行员",
      text: "欢迎加入飞行战队！",
      time: Date.now()
    }
  ],
  [CHAT_CHANNEL.GUILD]: [
    {
      id: "guild_empty",
      channel: CHAT_CHANNEL.GUILD,
      senderName: "系统",
      text: "加入公会后可查看公会消息。",
      time: Date.now()
    }
  ],
  [CHAT_CHANNEL.FRIEND]: [
    {
      id: "friend_empty",
      channel: CHAT_CHANNEL.FRIEND,
      senderName: "系统",
      text: "添加好友后可查看好友消息。",
      time: Date.now()
    }
  ]
};

export function createChatState({
  activeChannel = MAIN_CHAT_CHANNEL_CONFIG.defaultChannel,
  messages = DEFAULT_CHAT_MESSAGES
} = {}) {
  return {
    activeChannel,
    messages: {
      [CHAT_CHANNEL.SYSTEM]: [...(messages[CHAT_CHANNEL.SYSTEM] || [])],
      [CHAT_CHANNEL.WORLD]: [...(messages[CHAT_CHANNEL.WORLD] || [])],
      [CHAT_CHANNEL.GUILD]: [...(messages[CHAT_CHANNEL.GUILD] || [])],
      [CHAT_CHANNEL.FRIEND]: [...(messages[CHAT_CHANNEL.FRIEND] || [])]
    }
  };
}

export function switchChatChannel(chatState, channelId) {
  const tab = CHAT_CHANNEL_TABS.find((item) => item.id === channelId);

  if (!tab || !tab.enabled) {
    return {
      success: false,
      reason: "CHANNEL_NOT_FOUND_OR_DISABLED",
      chatState
    };
  }

  return {
    success: true,
    reason: "OK",
    chatState: {
      ...chatState,
      activeChannel: channelId
    }
  };
}

export function addChatMessage(chatState, message) {
  const channel = message.channel || CHAT_CHANNEL.SYSTEM;

  const nextMessages = {
    ...chatState.messages,
    [channel]: [
      ...(chatState.messages[channel] || []),
      {
        id: message.id || `${channel}_${Date.now()}`,
        channel,
        senderName: message.senderName || "系统",
        text: message.text || "",
        time: message.time || Date.now()
      }
    ]
  };

  return {
    ...chatState,
    messages: nextMessages
  };
}

export function getLatestChatMessage(chatState) {
  const list = chatState.messages[chatState.activeChannel] || [];

  if (list.length <= 0) {
    return null;
  }

  return list[list.length - 1];
}

export function trimChatText(text) {
  if (!text) {
    return "";
  }

  const maxLength = MAIN_CHAT_CHANNEL_CONFIG.maxDisplayLength;

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 1)}…`;
}

export function createChatBarViewModel(chatState) {
  const activeTab = CHAT_CHANNEL_TABS.find(
    (tab) => tab.id === chatState.activeChannel
  );

  const latestMessage = getLatestChatMessage(chatState);

  return {
    containerId: MAIN_CHAT_CHANNEL_CONFIG.containerId,
    tabs: CHAT_CHANNEL_TABS,
    activeChannel: chatState.activeChannel,
    activeChannelTitle: activeTab?.title || "系统",
    activeChannelColor: activeTab?.color || "#ffd56a",
    latestMessage: latestMessage
      ? {
          ...latestMessage,
          text: trimChatText(latestMessage.text),
          displayText: `[${activeTab?.title || "系统"}] ${latestMessage.senderName}：${trimChatText(latestMessage.text)}`
        }
      : null
  };
}
```

## 改动目标

聊天框增加4个频道：

```text
系统
世界
公会
好友
```

## 显示格式

```text
[系统] 系统：欢迎加入飞行战队，指挥官。
[世界] 王牌飞行员：欢迎加入飞行战队！
[公会] 系统：加入公会后可查看公会消息。
[好友] 系统：添加好友后可查看好友消息。
```
