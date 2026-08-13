(function defineContactRoom(root) {
  "use strict";
  var registry = root.RXGame && root.RXGame.roomRegistry;
  if (!registry) return;

  registry.defineRoom("contact", function createContactRoom(context) {
    return { actions: {
      open: function open() {
        var view = context.shared && context.shared.contactView;
        if (!view || typeof view.render !== "function") {
          return context.featurePanelController && context.featurePanelController.open("contact");
        }
        view.render(context.dom);
        return context.featurePanelController && context.featurePanelController.openShell("contact-panel");
      }
    } };
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
