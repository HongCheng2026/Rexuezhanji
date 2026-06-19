const STORAGE_KEY = "sideShooterMiniProfile";

const defaultProfile = {
  player: {
    name: "王牌飞行员",
    avatar: "/assets/images/pilot-lite.jpg",
    level: 56,
    exp: 12080,
    expMax: 23600,
    badge: "V"
  },
  assistant: {
    name: "星港助理",
    image: ""
  },
  resources: {
    energy: 120,
    energyMax: 120,
    gold: 0,
    diamond: 0
  },
  battle: {
    unlockedLevel: 1,
    completed: [],
    upgrades: {
      fire: 0,
      armor: 0,
      engine: 0
    }
  }
};

const featurePanels = {
  profile: ["PILOT", "飞行员资料", "头像、名字、经验和徽章都已经做成变量，后续可以替换成真实玩家数据。", ["头像资产", "称号徽章", "经验等级"]],
  energy: ["RESOURCE", "体力", "体力当前从 0 开始，后续可接入自然恢复、道具领取和充值补充。", ["恢复规则", "购买体力", "体力道具"]],
  gold: ["RESOURCE", "金币", "金币当前从 0 开始，战斗奖励会累计到这里，也可以继续接充值支付入口。", ["战斗产出", "商城消费", "充值累积"]],
  diamond: ["RESOURCE", "钻石", "钻石当前从 0 开始，预留给充值、活动奖励和高级抽取。", ["充值支付", "活动赠送", "高级兑换"]],
  chapter: ["MAP", "关卡地图", "关卡选择已放在开始战斗里，这里保留章节总览入口。", ["章节进度", "星级奖励", "地图素材"]],
  hangar: ["HANGAR", "战机仓库", "用于展示已拥有战机、皮肤和出战配置。", ["战机列表", "皮肤", "出战"]],
  upgrade: ["UPGRADE", "升级", "用于放置火力、装甲、推进器等养成入口。", ["火力核心", "装甲舱", "推进器"]],
  task: ["TASK", "任务", "每日任务、主线任务和周常任务入口已预留。", ["每日", "主线", "周常"]],
  event: ["EVENT", "活动", "限时活动、节日活动和概率提升活动入口已预留。", ["限时活动", "概率提升", "兑换商店"]],
  achievement: ["ACHIEVEMENT", "成就", "击杀、通关、收集、养成类成就入口已预留。", ["战斗成就", "收集成就", "成长成就"]],
  ranking: ["RANKING", "排行榜", "战力榜、通关榜、积分榜入口已预留。", ["战力榜", "通关榜", "积分榜"]],
  mail: ["MAIL", "邮件", "系统邮件、奖励邮件和公告邮件入口已预留。", ["系统", "奖励", "公告"]],
  signin: ["SIGN IN", "签到", "每日签到和连续签到奖励入口已预留。", ["今日奖励", "连续奖励", "补签"]],
  shop: ["SHOP", "商店", "金币、钻石、礼包、皮肤和道具商店入口已预留。", ["道具", "礼包", "充值"]],
  monthlyPass: ["PASS", "月卡特权", "月卡、每日补给和持续权益入口已预留。", ["每日补给", "专属特权", "续费状态"]],
  friend: ["FRIEND", "好友", "好友列表、赠送体力和邀请入口已预留。", ["好友列表", "赠送体力", "邀请"]],
  setting: ["SETTING", "设置", "音量、画质、账号和语言设置入口已预留。", ["声音", "画质", "账号"]],
  promo: ["PROMO", "星穹之翼", "限时概率提升活动入口已预留，后续可以放活动图、抽取规则和奖励池。", ["活动图", "奖励池", "抽取规则"]],
  firstTopup: ["TOP-UP", "首充礼包", "首充入口已预留，后续可以接入微信支付、奖励展示和领取状态。", ["支付入口", "礼包奖励", "领取状态"]],
  chat: ["CHAT", "世界频道", "聊天入口已预留，后续可以加入系统公告、玩家消息和战队频道。", ["世界", "战队", "系统"]]
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeProfile(profile) {
  const next = {
    ...clone(defaultProfile),
    ...(profile || {})
  };
  next.player = { ...clone(defaultProfile.player), ...(profile && profile.player ? profile.player : {}) };
  next.assistant = { ...clone(defaultProfile.assistant), ...(profile && profile.assistant ? profile.assistant : {}) };
  next.resources = { ...clone(defaultProfile.resources), ...(profile && profile.resources ? profile.resources : {}) };
  next.battle = { ...clone(defaultProfile.battle), ...(profile && profile.battle ? profile.battle : {}) };
  next.battle.upgrades = { ...clone(defaultProfile.battle.upgrades), ...(next.battle.upgrades || {}) };
  next.battle.completed = Array.isArray(next.battle.completed) ? next.battle.completed : [];
  return next;
}

function loadProfile() {
  return normalizeProfile(wx.getStorageSync(STORAGE_KEY));
}

function saveProfile(profile) {
  const next = normalizeProfile(profile);
  wx.setStorageSync(STORAGE_KEY, next);
  return next;
}

function addGold(amount) {
  const profile = loadProfile();
  profile.resources.gold += amount;
  return saveProfile(profile);
}

function completeLevel(levelId) {
  const profile = loadProfile();
  if (!profile.battle.completed.includes(levelId)) {
    profile.battle.completed.push(levelId);
  }
  profile.battle.unlockedLevel = Math.max(profile.battle.unlockedLevel, Math.min(3, levelId + 1));
  return saveProfile(profile);
}

function formatResource(value) {
  const number = Number(value) || 0;
  if (number >= 1000000) return `${(number / 1000000).toFixed(1)}M`;
  if (number >= 10000) return `${(number / 1000).toFixed(1)}K`;
  return String(number);
}

function getFeatureConfig(key) {
  const config = featurePanels[key] || ["SYSTEM", "功能界面", "该入口已经接通，内容待填充。", ["素材", "规则", "奖励"]];
  return {
    kicker: config[0],
    title: config[1],
    body: config[2],
    slots: config[3],
    key
  };
}

module.exports = {
  defaultProfile,
  loadProfile,
  saveProfile,
  addGold,
  completeLevel,
  formatResource,
  getFeatureConfig
};
