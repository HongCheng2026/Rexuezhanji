(function defineProfileRoom(root) {
  "use strict";
  var registry = root.RXGame && root.RXGame.roomRegistry;
  if (!registry) return;
  registry.defineRoom("profile", function createProfileRoom(context) {
    return { actions: {
      backdropClick: function backdropClick(event) {
        if (context.profileController.handleClick) return context.profileController.handleClick(event);
      },
      avatarUpload: function avatarUpload(event) {
        if (context.profileController.handleAvatarUpload) return context.profileController.handleAvatarUpload(event);
      }
    } };
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
