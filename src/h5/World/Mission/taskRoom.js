(function defineTaskRoom(root) {
  "use strict";
  var registry = root.RXGame && root.RXGame.roomRegistry;
  if (!registry) return;
  registry.defineRoom("task", function createTaskRoom(context) {
    return { actions: {
      render: function render() { return context.featurePanelController.open("task"); },
      claim: function claim(element) { return context.claimEconomy(element, "claimTask", "task", "taskClaim", false); }
    } };
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
