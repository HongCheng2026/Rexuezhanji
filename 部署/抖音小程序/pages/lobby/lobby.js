const { loadProfile, formatResource } = require("../../utils/profile");

Page({
  data: {
    profile: null,
    resources: {
      energy: "0",
      energyMax: "0",
      gold: "0",
      diamond: "0"
    },
    expPercent: 0,
    menuItems: [
      { key: "task", icon: "▣", title: "任务", sub: "TASK", notice: true },
      { key: "event", icon: "✦", title: "活动", sub: "EVENT", notice: true },
      { key: "achievement", icon: "♛", title: "成就", sub: "ACHIEVEMENT", notice: true },
      { key: "signin", icon: "✓", title: "签到", sub: "SIGN IN", notice: true },
      { key: "friend", icon: "♟", title: "好友", sub: "FRIENDS" },
      { key: "mail", icon: "✉", title: "邮件", sub: "MAIL", notice: true },
      { key: "ranking", icon: "▥", title: "排行榜", sub: "RANKING" },
      { key: "setting", icon: "⚙", title: "设置", sub: "SETTING" }
    ]
  },

  onShow() {
    this.refreshProfile();
  },

  refreshProfile() {
    const profile = loadProfile();
    const expMax = Math.max(1, Number(profile.player.expMax) || 1);
    const exp = Math.max(0, Math.min(Number(profile.player.exp) || 0, expMax));
    this.setData({
      profile,
      expPercent: Math.round((exp / expMax) * 100),
      resources: {
        energy: formatResource(profile.resources.energy),
        energyMax: formatResource(profile.resources.energyMax),
        gold: formatResource(profile.resources.gold),
        diamond: formatResource(profile.resources.diamond)
      }
    });
  },

  openFeature(event) {
    const key = event.currentTarget.dataset.key;
    tt.navigateTo({
      url: `/pages/feature/feature?key=${key}`
    });
  },

  startBattle() {
    tt.navigateTo({
      url: "/pages/battle/battle"
    });
  },

  greetAssistant() {
    tt.showToast({
      title: `${this.data.profile.assistant.name}：欢迎回来，${this.data.profile.player.name}`,
      icon: "none",
      duration: 1800
    });
  }
});

