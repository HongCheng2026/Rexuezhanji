(function defineMailRoom(root) {
  "use strict";
  var registry = root.RXGame && root.RXGame.roomRegistry;
  if (!registry) return;
  registry.defineRoom("mail", function createMailRoom(context) {
    return { actions: {
      render: function render() { return context.featurePanelController.open("mail"); }
    } };
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
