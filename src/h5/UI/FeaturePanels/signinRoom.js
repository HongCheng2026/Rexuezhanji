(function defineSigninRoom(root) {
  "use strict";
  var registry = root.RXGame && root.RXGame.roomRegistry;
  if (!registry) return;
  registry.defineRoom("signin", function createSigninRoom(context) {
    var shared = context.shared || root.RXGame || {};
    var capabilities = context.signin || {};
    var busy = false;

    function shanghaiDateKey() {
      try {
        var parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
        var values = {};
        parts.forEach(function collect(part) { values[part.type] = part.value; });
        return values.year + "-" + values.month + "-" + values.day;
      } catch (error) {
        return new Date().toISOString().slice(0, 10);
      }
    }

    function setUiState(message, isError) {
      shared.signinUiState = { busy: busy, message: message || "", isError: Boolean(isError) };
    }

    function render() {
      return context.featurePanelController.open("signin");
    }

    function rerender() {
      if (capabilities.renderPanel) return capabilities.renderPanel();
      return context.featurePanelController.open("signin", true);
    }

    function claimLocal() {
      var profile = capabilities.getProfile ? capabilities.getProfile() : {};
      var today = shanghaiDateKey();
      var record = profile.signIn && typeof profile.signIn === "object" ? profile.signIn : {};
      if (record.lastClaimDate === today) return { ok: false, reason: "SIGNIN_CLAIMED" };
      var day = Math.max(1, Math.min(7, (Math.floor(Number(record.day) || 0) % 7) + 1));
      var content = shared.featurePanelContent && shared.featurePanelContent.SIGNIN_CONTENT || [];
      var item = content.filter(function match(entry) { return Number(entry.day) === day; })[0];
      var rewards = item && item.rewards || [];
      if (shared.taskSystem && typeof shared.taskSystem.applyRewards === "function") {
        shared.taskSystem.applyRewards(profile, rewards);
      }
      profile.signIn = {
        day: day,
        lastClaimDate: today,
        totalClaims: Math.max(0, Math.floor(Number(record.totalClaims) || 0)) + 1
      };
      if (capabilities.saveProfile) capabilities.saveProfile();
      return { ok: true, profile: profile, day: day, rewards: rewards };
    }

    function claim() {
      if (busy) return false;
      var cloudMode = Boolean(capabilities.isCloudMode && capabilities.isCloudMode());
      if (!cloudMode) {
        var localResult = claimLocal();
        setUiState(localResult.ok ? "签到成功，奖励已写入当前存档。" : "今日签到奖励已领取。", !localResult.ok);
        if (capabilities.renderLobby) capabilities.renderLobby();
        rerender();
        return localResult;
      }
      busy = true;
      setUiState("正在等待云端确认…", false);
      rerender();
      return Promise.resolve(capabilities.ensureGameGateway ? capabilities.ensureGameGateway() : null)
        .then(function claimThroughGateway() {
          var gateway = capabilities.getGameGateway && capabilities.getGameGateway();
          if (!gateway || typeof gateway.claimSignIn !== "function") throw new Error("云端签到服务尚未就绪。");
          return gateway.claimSignIn();
        })
        .then(function applyResult(result) {
          if (!result || !result.profile) throw new Error("云端签到结果无效。");
          if (capabilities.applyGatewayProfile) capabilities.applyGatewayProfile(result.profile);
          setUiState("签到成功，DAY " + result.day + " 奖励已写入云存档。", false);
          if (capabilities.renderLobby) capabilities.renderLobby();
          return result;
        })
        .catch(function showError(error) {
          setUiState(error && error.message ? error.message : "签到失败，请稍后重试。", true);
          return { ok: false, reason: "SIGNIN_FAILED", error: error };
        })
        .finally(function release() {
          busy = false;
          shared.signinUiState.busy = false;
          rerender();
        });
    }

    return { actions: {
      render: render,
      claim: claim
    } };
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
