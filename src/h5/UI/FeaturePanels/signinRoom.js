(function defineSigninRoom(root) {
  "use strict";
  var registry = root.RXGame && root.RXGame.roomRegistry;
  if (!registry) return;
  registry.defineRoom("signin", function createSigninRoom(context) {
    return { actions: {
      render: function render() { return context.featurePanelController.open("signin"); }
    } };
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
