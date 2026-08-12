"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const controllerModule = require("../src/h5/Gameplay/Player/profileController.js");

function profileFixture() {
  return {
    player: { uid: "100000094", name: "王牌飞行员", signature: "保持航线。", level: 1 },
    completed: [],
    progress: {},
    owned: { pilots: [], ships: [] },
    resources: { energy: 100, maxEnergy: 100, lastEnergyAt: Date.now(), gold: 0 }
  };
}

function createController(accountState, overrides = {}) {
  let profile = profileFixture();
  const dom = {
    featurePanelKicker: { textContent: "" },
    featurePanelTitle: { textContent: "" },
    featurePanelBody: { textContent: "" },
    featurePanelSlots: {
      className: "",
      innerHTML: "",
      querySelector() { return null; }
    }
  };
  const gateway = Object.assign({
    isCloud: accountState.reason !== "local",
    getAccountState() { return accountState; },
    async sendEmailCode() { return { ok: true }; },
    async verifyEmailCode() { return { profile }; },
    async sendPhoneCode() { return { ok: true }; },
    async verifyPhoneCode() { return { profile }; }
  }, overrides.gateway || {});
  const controller = controllerModule.create({
    shared: {
      profile: { recoverEnergy() {} },
      powerCalculator: {
        calculateTotalPower() { return { total: 600, pilotTotal: 100, shipTotal: 500, sharedUpgradePower: 0 }; },
        calculateActivePower() { return 600; },
        calculateUnitPower() { return 100; }
      },
      featurePanelContent: { ACHIEVEMENT_CONTENT: [] },
      fighterUpgradeApi: { getLevels() { return {}; } }
    },
    dom,
    assetsConfig: { DEFAULT_AVATAR: "avatar.png", PILOT_ASSETS: [], SHIP_ASSETS: [] },
    getProfile() { return profile; },
    createLevelProgressSnapshot() { return { level: 1, percent: 0, exp: 0, expMax: 130, totalExp: 0, isMaxLevel: false }; },
    getHonorText() { return "I"; },
    getPilotAsset() { return { name: "林知寒", src: "pilot.png" }; },
    getShipAsset() { return { name: "蓝隼", src: "ship.png" }; },
    getLevelById() { return {}; },
    getGameGateway() { return gateway; },
    getGatewayError() { return null; },
    ensureGameGateway() { return Promise.resolve(gateway); },
    applyGatewayProfile(next) { profile = next; },
    openFeaturePanelShell() {},
    closeFeaturePanel() {},
    renderLobby() {}
  });
  return { controller, dom, gateway };
}

function clickTab(controller, tab) {
  controller.handleClick({
    target: {
      closest(selector) {
        return selector === "[data-profile-tab]" ? { dataset: { profileTab: tab } } : null;
      }
    }
  });
}

function clickAction(controller, action, data = {}) {
  controller.handleClick({
    target: {
      closest(selector) {
        if (selector === "[data-profile-tab]") return null;
        return selector === "[data-profile-action]" ? { dataset: Object.assign({ profileAction: action }, data) } : null;
      }
    }
  });
}

function submitForm(controller, type, value) {
  const form = {
    dataset: { profileCloudForm: type },
    querySelector(selector) {
      if (selector === "[data-profile-cloud-identifier]" || selector === "#profileCloudCode") return { value };
      return null;
    }
  };
  return controller.handleSubmit({
    preventDefault() {},
    target: { closest(selector) { return selector === "[data-profile-cloud-form]" ? form : null; } }
  });
}

test("资料页增加云存档分页，游客、已绑定和本地状态分别渲染", () => {
  const guest = createController({ available: true, status: "guest", provider: null, maskedIdentifier: "游客云档", reason: "" });
  guest.controller.render();
  assert.match(guest.dom.featurePanelSlots.innerHTML, />云存档<\/button>/);
  assert.match(guest.dom.featurePanelSlots.innerHTML, />游客云档<\/span>/);
  clickTab(guest.controller, "cloud");
  assert.match(guest.dom.featurePanelSlots.innerHTML, /data-profile-cloud-form="send-code"/);
  assert.match(guest.dom.featurePanelSlots.innerHTML, /绑定当前云存档/);
  assert.match(guest.dom.featurePanelSlots.innerHTML, /邮箱验证码/);
  assert.match(guest.dom.featurePanelSlots.innerHTML, /手机验证码/);
  assert.match(guest.dom.featurePanelSlots.innerHTML, /读取已有存档/);

  const bound = createController({ available: true, status: "email", provider: "email", maskedIdentifier: "pi***@example.com", reason: "" });
  clickTab(bound.controller, "cloud");
  assert.match(bound.dom.featurePanelSlots.innerHTML, /存档已保障/);
  assert.match(bound.dom.featurePanelSlots.innerHTML, /pi\*\*\*@example\.com/);
  assert.match(bound.dom.featurePanelSlots.innerHTML, /邮箱已绑定/);

  const phoneBound = createController({ available: true, status: "phone", provider: "phone", maskedIdentifier: "+86 138****8000", reason: "" });
  clickTab(phoneBound.controller, "cloud");
  assert.match(phoneBound.dom.featurePanelSlots.innerHTML, /手机已绑定/);
  assert.match(phoneBound.dom.featurePanelSlots.innerHTML, /\+86 138\*\*\*\*8000/);
  assert.match(phoneBound.dom.featurePanelSlots.innerHTML, /读取其他云存档/);

  const local = createController({ available: false, status: "unavailable", provider: null, maskedIdentifier: "", reason: "local" });
  clickTab(local.controller, "cloud");
  assert.match(local.dom.featurePanelSlots.innerHTML, /当前为本地存档/);
  assert.doesNotMatch(local.dom.featurePanelSlots.innerHTML, /data-profile-cloud-form/);
});

test("发送验证码时阻止重复提交，成功后进入 60 秒倒计验证态", async () => {
  let calls = 0;
  let release;
  const sent = new Promise((resolve) => { release = resolve; });
  const harness = createController(
    { available: true, status: "guest", provider: null, maskedIdentifier: "游客云档", reason: "" },
    { gateway: { sendEmailCode() { calls += 1; return sent; } } }
  );
  clickTab(harness.controller, "cloud");
  const first = submitForm(harness.controller, "send-code", "pilot@example.com");
  const duplicate = await submitForm(harness.controller, "send-code", "pilot@example.com");
  assert.equal(duplicate, false);
  await Promise.resolve();
  assert.equal(calls, 1);
  release({ ok: true });
  assert.equal(await first, true);
  assert.match(harness.dom.featurePanelSlots.innerHTML, /data-profile-cloud-form="verify-code"/);
  assert.match(harness.dom.featurePanelSlots.innerHTML, /60 秒后可重发/);
  assert.match(harness.dom.featurePanelSlots.innerHTML, /aria-live="polite"/);
  clickAction(harness.controller, "close");
});

test("游客可选择手机绑定或读取已有账号，createUser 参数与操作意图一致", async () => {
  const calls = [];
  const harness = createController(
    { available: true, status: "guest", provider: null, maskedIdentifier: "游客云档", reason: "" },
    {
      gateway: {
        async sendPhoneCode(phone, options) {
          calls.push({ method: "sendPhoneCode", phone, options });
          return { ok: true };
        },
        async sendEmailCode(email, options) {
          calls.push({ method: "sendEmailCode", email, options });
          return { ok: true };
        }
      }
    }
  );
  clickTab(harness.controller, "cloud");
  clickAction(harness.controller, "select-cloud-channel", { profileChannel: "phone" });
  assert.match(harness.dom.featurePanelSlots.innerHTML, /id="profileCloudPhone"/);
  assert.equal(await submitForm(harness.controller, "send-code", "138 0013 8000"), true);
  assert.deepEqual(calls[0], { method: "sendPhoneCode", phone: "+8613800138000", options: { createUser: true } });
  assert.match(harness.dom.featurePanelSlots.innerHTML, /输入手机验证码/);
  clickAction(harness.controller, "change-cloud-identifier");
  clickAction(harness.controller, "select-cloud-intent", { profileIntent: "load" });
  clickAction(harness.controller, "select-cloud-channel", { profileChannel: "email" });
  assert.match(harness.dom.featurePanelSlots.innerHTML, /读取已有云存档/);
  assert.equal(await submitForm(harness.controller, "send-code", "pilot@example.com"), true);
  assert.deepEqual(calls[1], { method: "sendEmailCode", email: "pilot@example.com", options: { createUser: false } });
  clickAction(harness.controller, "close");
});

test("云存档样式和表单事件保持页面级隔离", () => {
  const css = fs.readFileSync(path.join(root, "src/h5/Gameplay/Player/profileView.css"), "utf8");
  const router = fs.readFileSync(path.join(root, "src/h5/Game/SceneManager/gameEventRouter.js"), "utf8");
  const room = fs.readFileSync(path.join(root, "src/h5/Gameplay/Player/profileRoom.js"), "utf8");
  assert.match(css, /\.feature-panel\.profile-dossier-panel \.player-profile-page \.player-profile-cloud-panel/);
  assert.match(css, /@media \(max-width: 520px\)[\s\S]*player-profile-cloud-input-row/);
  assert.match(router, /dispatch\("profile\.submit", event\)/);
  assert.match(room, /handleSubmit/);
});
