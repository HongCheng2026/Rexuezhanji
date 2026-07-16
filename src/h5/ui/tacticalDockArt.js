(function registerTacticalDockArt(root) {
  "use strict";

  var scope = root.RXGame || (root.RXGame = {});
  var serial = 0;

  var SHAPES = {
    attack: '<circle cx="47" cy="48" r="24"/><circle cx="47" cy="48" r="12"/><path d="M9 48h71M47 12v72"/><path class="solid accent" d="m54 36 34 12-34 12 9-12z"/>',
    armorPenetration: '<path class="solid panel" d="M48 7 80 24v34L48 89 16 58V24z"/><path d="M48 18 68 29v23L48 74 28 52V29z"/><path class="accent" d="M8 48h80M48 26v44"/>',
    hp: '<path class="solid panel" d="M48 6 81 25v38L48 90 15 63V25z"/><circle cx="48" cy="49" r="20"/><path class="accent" d="M48 34v30M33 49h30"/>',
    "sky-lock-beam": '<circle cx="42" cy="48" r="25"/><circle cx="42" cy="48" r="10"/><path d="M7 48h73M42 13v70"/><path class="solid accent" d="m50 39 39 9-39 9 11-9z"/><path d="M16 24 7 15m61 9 9-9M16 72l-9 9m61-9 9 9"/>',
    "obsidian-gravity-well": '<ellipse cx="48" cy="48" rx="38" ry="23"/><ellipse cx="48" cy="48" rx="29" ry="15"/><circle class="solid violet" cx="48" cy="48" r="10"/><path d="M16 18c26 2 47 30 29 63M80 18C54 20 33 48 51 81"/>',
    "gold-judgement-buff": '<path class="solid panel" d="M48 7 80 25v38L48 89 16 63V25z"/><path d="m48 18 19 11v26L48 72 29 55V29z"/><path class="accent" d="M48 24v49M23 48h50"/><circle cx="48" cy="48" r="8"/>',
    "phase-shield": '<path class="solid panel" d="M48 7 82 26v30c0 18-13 28-34 35-21-7-34-17-34-35V26z"/><path d="M48 19 69 31v22c0 11-8 18-21 24-13-6-21-13-21-24V31z"/><path class="accent" d="m48 28 12 8v21l-12 9-12-9V36z"/>',
    weapon_fixed_01: '<path class="solid panel" d="M10 39 45 24l24 8 17 16-17 16-24 8L10 57z"/><path d="M20 42h43l19 6-19 6H20"/><path class="accent" d="M42 48h50"/><circle cx="35" cy="48" r="8"/>',
    weapon_fixed_02: '<path class="solid panel" d="M8 40 38 26l18 8v28l-18 8L8 56z"/><path class="accent" d="M37 48h51M37 48l45-24M37 48l45 24M37 48l50-11M37 48l50 11"/><circle cx="35" cy="48" r="7"/>',
    weapon_fixed_03: '<path class="solid panel" d="M14 42 45 25l25 8 13 15-13 15-25 8-31-17z"/><path class="accent" d="m44 35 17-18 5 15m-22 29 17 18 5-15M39 48h47"/><path d="m22 41 13 7-13 7z"/>',
    weapon_module_04: '<path class="solid panel" d="m8 48 24-23 15 10v26L32 71z"/><path class="solid panel" d="m88 48-24-23-15 10v26l15 10z"/><path class="accent" d="M31 48H4m61 0h27M25 37 6 27m65 10 19-10M25 59 6 69m65-10 19 10"/><circle cx="48" cy="48" r="8"/>',
    weapon_module_05: '<ellipse cx="48" cy="48" rx="41" ry="21"/><ellipse cx="48" cy="48" rx="30" ry="13"/><path class="solid panel" d="m36 24 12-12 12 12-5 16H41z"/><path class="solid panel" d="m36 72 12 12 12-12-5-16H41z"/><circle class="solid accent" cx="48" cy="48" r="10"/><path d="M6 48h84"/>',
    weapon_module_06: '<path class="solid panel" d="M11 36 35 19l14 8v42l-14 8-24-17z"/><path class="solid panel" d="M50 27 66 18l20 18v24L66 78l-16-9z"/><path class="accent" d="m25 40 15 8-15 8m37-16 15 8-15 8"/><circle cx="34" cy="48" r="6"/><circle cx="68" cy="48" r="6"/>',
    empty: '<path class="solid panel" d="M18 25 48 8l30 17v46L48 88 18 71z"/><path class="accent" d="M48 31v34M31 48h34"/>'
  };

  var ALIASES = {
    laser: "weapon_fixed_01",
    spread: "weapon_fixed_02",
    missile: "weapon_fixed_03"
  };

  function render(id) {
    var key = ALIASES[id] || String(id || "empty");
    var shape = SHAPES[key] || SHAPES.empty;
    var uid = "td-art-" + (++serial);
    return '<svg class="tactical-art tactical-art-' + safeClass(key) + '" viewBox="0 0 96 96" aria-hidden="true" focusable="false">' +
      '<defs>' +
        '<linearGradient id="' + uid + '-panel" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#123f67"/><stop offset=".48" stop-color="#07182d"/><stop offset="1" stop-color="#0b3554"/></linearGradient>' +
        '<linearGradient id="' + uid + '-accent" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#e6fcff"/><stop offset=".3" stop-color="#47e4ff"/><stop offset="1" stop-color="#148dcc"/></linearGradient>' +
        '<radialGradient id="' + uid + '-violet"><stop stop-color="#e8d2ff"/><stop offset=".42" stop-color="#925cff"/><stop offset="1" stop-color="#25114f"/></radialGradient>' +
        '<filter id="' + uid + '-glow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
      '</defs>' +
      '<circle class="art-orbit" cx="48" cy="48" r="43"/>' +
      '<g class="art-geometry">' + shape + '</g>' +
      '<g class="art-ticks"><path d="M48 2v7M48 87v7M2 48h7M87 48h7"/></g>' +
      '<style>.panel{fill:url(#' + uid + '-panel)}.accent{fill:url(#' + uid + '-accent);stroke:#8cf4ff}.violet{fill:url(#' + uid + '-violet);stroke:#c6a4ff}.art-geometry{filter:url(#' + uid + '-glow)}</style>' +
    '</svg>';
  }

  function safeClass(value) {
    return String(value || "empty").replace(/[^a-z0-9_-]/gi, "-");
  }

  scope.tacticalDockArt = { render: render };
  if (typeof module !== "undefined" && module.exports) module.exports = scope.tacticalDockArt;
})(typeof globalThis !== "undefined" ? globalThis : window);
