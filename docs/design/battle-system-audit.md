# Battle System Audit

Date: 2026-07-03

## Goal

Rebuild the battle loop around clear-screen fun, visible growth, readable pressure, chapter identity, and boss rhythm.

## Current Diagnosis

| Area | Current issue | Direction |
|---|---|---|
| Player firepower | Default profile enters battle with all pickup weapons at level 0, so the first impression is weak and narrow. | Start every battle with spread, laser, and missile active. Upgrades raise starting levels. |
| Pickup growth | Pickup choice can keep feeding the highest weapon, which makes one weapon snowball while others stay absent or low. | Prefer the lowest weapon level and keep the three weapons within a close band. |
| Spawn director | Shared config still exposes total enemy budgets and enemy counts, which encourages thinking in fixed totals. | Treat battle as a continuous director: phase, wave size, interval, same-screen cap, entry pattern. |
| Difficulty | Enemy density and bullet pressure are mixed together. Raising one often accidentally raises the other. | Split density from fire profile. Small enemies can fill the screen without all becoming bullet sources. |
| Boss fights | Boss difficulty is partly felt through fire frequency and guard pressure. HP should remain formula-driven. | Keep HP from the shared enemy stat formula; tune boss skills, warning time, guard burst, and bullet pressure. |
| Chapter identity | Chapter themes exist but early chapters can still feel like pressure tuning instead of clear learning steps. | One chapter introduces one dominant idea: fan, shield, crossfire, charge, summon, sniper, armor, rotating, mothership. |
| Reward feedback | Drops and coins exist, but the early loop does not guarantee visible weapon growth. | Scheduled supply plus kill drops should reliably show growth before boss arrival. |
| Readability | Dense enemies, pickups, explosions, and bullets compete for attention. | Enemy bullets must remain fewer, slower, brighter, and telegraphed early; density comes from enemies first. |

## Design Baseline

- Screen fullness should come from enemies, explosions, coins, and pickups before enemy bullets.
- Enemy bullets are failure information; they must be readable and should not be the first impression.
- Early small enemies are targets first, bullet sources later.
- A stage is not a fixed enemy budget. It is a 90-second director that keeps refilling waves under same-screen limits.
- Boss HP is formula-driven. Boss difficulty is adjusted through skill timing, warning time, guard count, and bullet profile.
- Each chapter should add one readable battle idea before mixing it with later ideas.

## Tuning Knobs

| Knob | Controls |
|---|---|
| `activeCap` | Maximum live enemy pressure and visual density. |
| `waveSize` | Burst size of each incoming group. |
| `waveInterval` | Rhythm of refill pressure. |
| `typeWeights` | What kind of problem the wave creates. |
| `fireProfile` | Whether enemies can fire, how soon, how often, and how fast. |
| `entryPatterns` | How the player reads the incoming wave. |
| `bossTheme` | Boss skill identity. |

## Chapter Baseline

| Chapter | Enemy director | Fire pressure | Boss identity |
|---|---|---|---|
| Prologue | Straight lanes, small enemies first. | Mostly no fire. | Tutorial line and small fan. |
| 1 | Lane and diagonal groups. | Light single/triple fire. | Fan. |
| 2 | Shield line and fish-scale groups. | Slow wall and light cross fire. | Shield windows. |
| 3 | Cross-layer formations. | Cross fire. | Crossfire. |
| 4 | Charger lanes. | Lane warnings. | Charge. |
| 5 | Escort and summon groups. | Guard volleys. | Summon. |
| 6 | Pincer and sniper groups. | Sniper warning. | Sniper. |
| 7 | Armor and shield groups. | Heavy but paced fire. | Armor core. |
| 8 | Top/bottom attacks. | Rotating and delayed burst. | Rotating. |
| 9 | Mixed mothership guard groups. | High but telegraphed mix. | Mothership. |

## Acceptance Signals

- Default battle starts with spread, laser, and missile visible.
- Pickup drops tend to upgrade the weakest weapon first.
- Spawn plans no longer carry per-stage total enemy counts as battle-director decisions.
- Prologue uses enemy density for fun and very low bullet pressure.
- Later chapters can raise bullet pressure without changing boss HP ad hoc.
