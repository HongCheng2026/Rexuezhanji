(function defineAchievementRoom(root) {
  "use strict";
  var registry = root.RXGame && root.RXGame.roomRegistry;
  if (!registry) return;
  registry.defineRoom("achievement", function createAchievementRoom(context) {
    var bus = root.RXGame && root.RXGame.bus;
    var events = root.RXGame && root.RXGame.events;
    function onCodexFull(payload) {
      if (bus && events) bus.emit(events.UI_ACHIEVEMENT_UNLOCKED, payload);
    }
    if (bus && events) {
      bus.on(events.CODEX_FULL_COLLECTION, onCodexFull);
    }
    return { actions: {
      render: function render() { return context.featurePanelController.open("achievement"); },
      claim: function claim(element) { return context.claimEconomy(element, "claimAchievement", "achievement", "achievementClaim", false); }
    }, dispose: function() {
      if (bus && events) {
        bus.off(events.CODEX_FULL_COLLECTION, onCodexFull);
      }
    } };
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
