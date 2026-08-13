(function defineActivityRoom(root) {
  "use strict";
  var registry = root.RXGame && root.RXGame.roomRegistry;
  if (!registry) return;
  registry.defineRoom("activity", function createActivityRoom(context) {
    return { actions: {
      render: function render() { return context.featurePanelController.open("event"); },
      claim: function claim(element) { return context.claimEconomy(element, "claimActivityReward", "task", "activityClaim", false); }
    } };
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
