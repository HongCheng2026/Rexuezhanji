(function defineFeaturePanelRoom(root) {
  "use strict";
  var registry = root.RXGame && root.RXGame.roomRegistry;
  if (!registry) return;
  registry.defineRoom("featurePanel", function createFeaturePanelRoom(context) {
    var shared = context.shared;
    var routes = {
      pilotGallery: "pilot.open",
      task: "task.render",
      achievement: "achievement.render",
      event: "activity.render",
      shop: "shop.render",
      mail: "mail.render",
      signin: "signin.render",
      starWingsGacha: "gacha.open",
      inventory: "inventory.open",
      recharge: "recharge.open",
      contact: "contact.open",
      setting: "setting.open",
      shipGallery: "fighter.open",
      upgrade: "upgrade.open",
      codex: "codex.open"
    };

    function handleEvent(event) {
      if (!shared.mainFeaturePanelsView || !shared.mainFeaturePanelsView.handleEvent) return false;
      return Boolean(shared.mainFeaturePanelsView.handleEvent(event, context.dom, {
        profile: context.getProfile(),
        levels: context.levels,
        combatPower: context.calculateTotalPower(),
        audioSettings: context.audioSystem && context.audioSystem.getSettings ? context.audioSystem.getSettings() : null,
        visualSettings: context.visualQualitySystem && context.visualQualitySystem.getSettings ? context.visualQualitySystem.getSettings() : null,
        framePacing: context.framePacingMonitor && context.framePacingMonitor.getSnapshot ? context.framePacingMonitor.getSnapshot() : null,
        getGameGateway: context.getGameGateway,
        startEndlessMode: function startEndlessMode() { return registry.dispatch("endless.start"); }
      }));
    }

    return { actions: {
      close: function close() { return context.featurePanelController && context.featurePanelController.close(); },
      open: function open(key) {
        var action = routes[key];
        if (action && registry.hasAction(action)) return registry.dispatch(action);
        return context.featurePanelController && context.featurePanelController.open(key);
      },
      handleEvent: handleEvent,
      handleKeydown: function handleKeydown(event) {
        return Boolean(shared.eventModeHubView && shared.eventModeHubView.handleKeydown &&
          shared.eventModeHubView.handleKeydown(event, context.dom));
      }
    } };
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
