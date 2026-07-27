(function defineRedeemRoom(root) {
  "use strict";
  var registry = root.RXGame && root.RXGame.roomRegistry;
  if (!registry) return;
  registry.defineRoom("redeem", function createRedeemRoom(context) {
    function submit(input) {
      var payload = typeof input === "string" ? { code: input } : (input || {});
      var code = String(payload.code || "").trim();
      if (!code) {
        if (payload.status) payload.status.textContent = "请输入兑换码。";
        return Promise.resolve(null);
      }
      if (payload.submit) payload.submit.disabled = true;
      if (payload.status) payload.status.textContent = "正在兑换…";
      return Promise.resolve(context.featurePanelController.redeemCode(code)).then(function showSuccess(result) {
        var rewards = result && Array.isArray(result.rewards) ? result.rewards : [];
        var goldReward = rewards.filter(function isGold(reward) { return reward && reward.type === "gold"; })
          .reduce(function sumGold(total, reward) { return total + (Number(reward.amount) || 0); }, 0);
        var diamondReward = rewards.filter(function isDiamond(reward) { return reward && reward.type === "diamonds"; })
          .reduce(function sumDiamond(total, reward) { return total + (Number(reward.amount) || 0); }, 0);
        var staminaReward = rewards.filter(function isStamina(reward) { return reward && reward.type === "stamina"; })
          .reduce(function sumStamina(total, reward) { return total + (Number(reward.amount) || 0); }, 0);
        var parts = [];
        if (goldReward) parts.push(Math.floor(goldReward).toLocaleString("zh-CN") + " 金币");
        if (diamondReward) parts.push(Math.floor(diamondReward).toLocaleString("zh-CN") + " 钻石");
        if (staminaReward) parts.push(Math.floor(staminaReward) + " 体力");
        if (payload.status) payload.status.textContent = "兑换成功，获得 " + (parts.join("、") || "奖励") + "。";
        if (payload.input) payload.input.value = "";
        return result;
      }).catch(function showError(error) {
        if (payload.status) payload.status.textContent = error && error.message ? error.message : "兑换失败，请稍后重试。";
        return null;
      }).finally(function releaseButton() {
        if (payload.submit) payload.submit.disabled = false;
      });
    }

    return { actions: {
      submit: submit
    } };
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
