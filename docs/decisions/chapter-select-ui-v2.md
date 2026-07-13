# Chapter Select UI V2

The H5 chapter-select screen uses a fixed 1600x900 design canvas. The canvas may only be scaled uniformly to fit the available landscape viewport.

- Keep chapter tabs, briefing, route map, mission detail, and actions in five independent grid rows.
- Absolute positioning is allowed only for route nodes inside the route panel.
- Runtime art must be exported at its design size. Do not stretch individual panel, node, tab, or button assets.
- Generate precise UI chrome from `assets/runtime/ui/chapter-select-v2/layout-spec.json` with `scripts/build-chapter-select-assets.ps1`. Do not crop controls from a full-screen mockup.
- Each exported control must have its own transparent canvas and may not contain neighboring borders, dividers, or button fragments.
- Detail columns, chapter-tab spacing, and action-button spacing must come from the generated layout CSS; do not duplicate those coordinates in override rules.
- Keep chapter-select styles in `src/h5/ui/chapterSelectView.css` under the `campaign-map-*` prefix.
- Do not add chapter-select overrides to `src/h5/style.css`.
- Decorative layers must use `pointer-events: none`; interaction layers must not depend on z-index escalation to remain clickable.
- Portrait mobile viewports show a rotate-device state instead of reflowing the five-row layout.
