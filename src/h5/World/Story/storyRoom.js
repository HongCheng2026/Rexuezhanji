(function defineStoryRoom(root) {
  "use strict";
  var registry = root.RXGame && root.RXGame.roomRegistry;
  if (!registry) return;
  registry.defineRoom("story", function createStoryRoom(context) {
    return { actions: {
      replay: function replay(event) { return context.battleFlowController.handleStoryReplayClick(event); }
    } };
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
