(function loadSharedCore() {
  const isSourceH5 = /(?:^|[\\/])H5(?:[\\/]|$)/.test(decodeURIComponent(location.pathname));
  const base = isSourceH5 ? "../shared/" : "shared/";
  const files = ["balance.js", "levels.js", "assets.js", "profile.js", "battleRules.js"];
  for (const file of files) {
    document.write(`<script src="${base}${file}"><\/script>`);
  }
})();
