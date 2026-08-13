(function registerGameEvents(root) {
  "use strict";

  var scope = root.RXGame = root.RXGame || {};
  var events = Object.freeze({
    // Combat lifecycle
    COMBAT_STARTED: "combat:started",
    PLAYER_DAMAGED: "player:damaged",
    PLAYER_HIT_ABSORBED: "player:hit:absorbed",
    PLAYER_DIED: "player:died",
    ENEMY_DIED: "enemy:died",
    BOSS_SPAWNED: "boss:spawned",
    WEAPON_UPGRADED: "weapon:upgraded",
    ITEM_COLLECTED: "item:collected",
    LEVEL_CLEARED: "level:cleared",
    GOLD_CHANGED: "gold:changed",
    // Real-world calendar shared by lobby, missions and economy projections
    WORLD_TIME_TICK: "world-time:tick",
    WORLD_TIME_SYNCED: "world-time:synced",
    WORLD_DATE_CHANGED: "world-time:date-changed",
    // Semantic events (audio subscribes to these)
    WEAPON_FIRED: "weapon:fired",
    ENEMY_HIT: "enemy:hit",
    SKILL_ACTIVATED: "skill:activated",
    // Phase 1 — BOSS mechanics
    BOSS_PHASE_BURST: "boss:phase:burst",
    BOSS_ARMOR_SWITCH: "boss:armor:switch",
    BOSS_DEFEATED: "boss:defeated",
    BOSS_TELEGRAPH: "boss:telegraph",
    // Phase 1 — Skills & Decisive Commands
    DECISIVE_COMMAND_USED: "decisive:command:used",
    DECISIVE_COMMAND_READY: "decisive:command:ready",
    SKILL_COOLDOWN_READY: "skill:cooldown:ready",
    // Phase 1 — Player states
    PLAYER_LOW_HP: "player:low:hp",
    PLAYER_HP_RECOVERED: "player:hp:recovered",
    // Phase 1 — Level / Chapter
    CHAPTER_CLEARED: "chapter:cleared",
    ELITE_WAVE_INCOMING: "elite:wave:incoming",
    // Phase 1 — Endless mode
    ENDLESS_WAVE_TRANSITION: "endless:wave:transition",
    // Phase 1 — UI events
    UI_PANEL_OPENED: "ui:panel:opened",
    UI_PANEL_CLOSED: "ui:panel:closed",
    UI_ACHIEVEMENT_UNLOCKED: "ui:achievement:unlocked",
    UI_QUEST_COMPLETED: "ui:quest:completed",
    UI_LEVEL_UP: "ui:level:up",
    UI_GACHA_PULL: "ui:gacha:pull",
    UI_GACHA_REVEAL: "ui:gacha:reveal",
    UI_PURCHASE: "ui:purchase",
    UI_SWEEP_COMPLETE: "ui:sweep:complete",
    UI_ERROR: "ui:error",
    // Codex collection system events
    CODEX_ENTRY_UNLOCKED: "codex:entry:unlocked",
    CODEX_FULL_COLLECTION: "codex:full:collection",
    // Phase 2 — Boss signature skills & chapter mechanics
    // Ch1 Fan: Density Modulation
    BOSS_FIELD_MARK: "boss:field:mark",
    BOSS_GAZE_TARGET: "boss:gaze:target",
    BOSS_DENSITY_CHANGED: "boss:density:changed",
    // Ch2 Shield: Layered Plating
    BOSS_SHIELD_LAYER_BROKEN: "boss:shield:layer:broken",
    BOSS_BARRIER_SPAWNED: "boss:barrier:spawned",
    BOSS_BARRIER_DESTROYED: "boss:barrier:destroyed",
    BOSS_OVERLOAD_START: "boss:overload:start",
    BOSS_OVERLOAD_END: "boss:overload:end",
    // Ch3 Crossfire: Cross-Lock Grid
    BOSS_CROSS_GRID_UPDATED: "boss:cross:grid:updated",
    BOSS_DRIFTER_SPAWNED: "boss:drifter:spawned",
    BOSS_DRIFTER_DESTROYED: "boss:drifter:destroyed",
    BOSS_DEADLOCK_CROSS_ACTIVATED: "boss:deadlock:cross:activated",
    // Ch4 Charge: Rage System
    BOSS_RAGE_CHANGED: "boss:rage:changed",
    BOSS_RAGE_ACTIVATED: "boss:rage:activated",
    BOSS_RAGE_ENDED: "boss:rage:ended",
    BOSS_SHOCKWAVE: "boss:shockwave",
    // Ch5 Summon: Tactical Orders
    BOSS_TACTICAL_ORDER: "boss:tactical:order",
    BOSS_RESONANCE_LINK: "boss:resonance:link",
    BOSS_RESONANCE_BROKEN: "boss:resonance:broken",
    BOSS_MIRROR_SPAWNED: "boss:mirror:spawned",
    // Ch6 Sniper: Lock Stack
    BOSS_LOCK_CHANGED: "boss:lock:changed",
    BOSS_LOCK_FIRED: "boss:lock:fired",
    BOSS_JUDGMENT_CHARGING: "boss:judgment:charging",
    BOSS_JUDGMENT_FIRED: "boss:judgment:fired",
    // Ch7 ArmorCore: Heat Cycle
    BOSS_HEAT_CHANGED: "boss:heat:changed",
    BOSS_OVERHEAT: "boss:overheat",
    BOSS_HEAT_DUMP: "boss:heat:dump",
    BOSS_CORE_EXPOSED: "boss:core:exposed",
    BOSS_MATRIX_ACTIVATED: "boss:matrix:activated",
    BOSS_MATRIX_DESTROYED: "boss:matrix:destroyed",
    // Ch8 Rotating: Rotor Phase
    BOSS_ROTOR_PHASE_CHANGED: "boss:rotor:phase:changed",
    BOSS_ROTOR_OVERDRIVE: "boss:rotor:overdrive",
    BOSS_NEST_SPLIT: "boss:nest:split",
    BOSS_MIGRATION_CHARGE: "boss:migration:charge",
    // Ch9 Mothership: Form Shift
    BOSS_FORM_CHANGED: "boss:form:changed",
    BOSS_SINGULARITY_SPAWNED: "boss:singularity:spawned",
    BOSS_SINGULARITY_IMPLODED: "boss:singularity:imploded",
    BOSS_SWARM_LAUNCHED: "boss:swarm:launched",
    BOSS_FULL_ARSENAL: "boss:full:arsenal",
    BOSS_ENDGAME: "boss:endgame"
  });

  scope.events = events;
  if (typeof module !== "undefined" && module.exports) module.exports = events;
})(typeof globalThis !== "undefined" ? globalThis : this);
