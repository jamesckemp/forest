# Black Smoke Survival — PRD

## 1. Goal
Turn the current serene forest into a tense hide-and-seek horror experience where the player must survive as long as possible while being hunted by **The Black Smoke**.

## 2. Success Criteria
* Player can survive > N seconds; timer stops when caught
* Black Smoke behaviour feels natural: slow roaming ➜ rapid pursuit when close
* Dynamic night-storm lighting with convincing lightning flashes
* Stable 60 FPS on a 2020 MacBook Pro (Radeon 5300M) at 1920×1080

## 3. Core Gameplay
### 3.1 Black Smoke
* Representation: GPU-friendly particle system (~2–4 k sprites) with noise-based velocity field
* AI States
  1. **Wander** — random walk inside forest bounds @ 1 m/s
  2. **Stalk**  — if player within 40 m; circle player @ 2 m/s staying in foliage
  3. **Chase**  — if within 15 m OR player line-of-sight; lerp speed to 7 m/s, shrink radius, emit screech
  4. **Reset** — returns to Wander when player > 60 m
* Detection → distance & unobstructed raycast (ignores grass/particles)
* Collision radius ≈ 1.5 m; on hit ⇒ death sequence
* Difficulty curve: every 2 min reduce detection radius thresholds by 5 m & +10 % max speed

### 3.2 Player
* No weapons; only sprint (shift) & crouch (ctrl) to lower visibility (reduces detection radius by 25 %)
* Stamina bar: 6 s sprint, 8 s recharge

### 3.3 Win/Loss
* Endless mode — scoreboard: time survived
* Death sequence: vignette ➜ camera shake ➜ fade to black ➜ restart button

## 4. Environment
### 4.1 Night / Storm
* Skybox ⇒ overcast twilight texture (deep blue-grey)
* AmbientLight: 0x1a1e2f @ 0.08
* Moon DirectionalLight: 0xcad7ff @ 0.4, soft shadows
* Fog: 0x0e101a, start 5 m, end 80 m
* Rain particles (optional alpha-blended streaks, pooled)

### 4.2 Lightning System
* Every 5–12 s (random):
  * Flash curve 0 → 1 → 0 in ~600 ms using Tween or custom update
  * Effects triggered
    * Increase renderer.toneMappingExposure × 3, then decay
    * Spawn white DirectionalLight above clouds (disable shadows) @ intensity 3
    * Play thunder SFX after distance-dependent delay (flash-to-thunder ~0.3 s per 100 m)

## 5. Visual FX
* Post-processing: color-grading LUT to teal, film grain, subtle chromatic aberration when smoke close
* Screen shake & desaturation when within 20 m of smoke
* Smoke uses additive & alpha-test materials to avoid overdraw; noise texture scrolling for turbulence

## 6. Audio
* Looping rain & wind bed (–12 LUFS)
* Random thunder claps (3–4 variations)
* Heartbeat & breathing that cross-fade based on proximity (starts at 30 m)
* Death scream when caught

## 7. Controls UI
* HUD elements: timer (top-center), stamina bar (bottom-left), subtle compass (optional)
* Minimal on-screen text; fits existing pointer-lock scheme

## 8. Technical Tasks (Three.js)
1. Refactor init section into modules so we can toggle «Survival» mode
2. Implement **SmokeManager** class
   * Builds Points/InstancedMesh, holds state machine, update(dt)
   * Pathfind: basic A* not needed — use steering behaviours with obstacle avoidance using grid you already have
3. Add **LightingManager** for storm cycle & lightning coroutine
4. Modify render loop: update SmokeManager, LightingManager, stamina, proximity FX
5. Layer 2 ➜ smoke particles, excluded from bloom to keep them dark
6. Add post-processing passes: LUTShader, FilmGrain
7. AudioManager: handles SFX, distance-based thunder delay
8. GameState: tracks elapsed time, death, restart
9. Resize handling: extend to new post-processing passes

## 9. Performance / Risk
* Particle overdraw ⇒ cap smoke alpha, reuse geometry
* Lightning exposure spikes could blow HDR; clamp to 3× baseline
* Ensure mobile fallback disables bloom & grain

## 10. Milestones
| Date | Deliverable |
|------|-------------|
| +3 d | Basic night lighting, rain, timer HUD |
| +6 d | Black Smoke wander & chase, death sequence |
| +8 d | Lightning system + thunder SFX |
| +10 d| Proximity VFX, stamina mechanics |
| +12 d| QA + performance pass |

## 11. Out of Scope
* Multiplayer co-op
* Weapon or combat system
* Story/narrative events beyond smoke encounter

## 12. Stretch Ideas
* Dynamic objectives (collect 3 talisman stones to dispel smoke)
* Alternate enemy types (forest wraiths)
* Shelter cabins where smoke can't enter for brief safety 