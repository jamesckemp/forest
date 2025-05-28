# Forest Horror Game - Improvement TODO

## Core Difficulty Improvements
- [x] Increase creeper density (from 8% to 18%)
- [x] Extend creeper detection range (from 20 to 45 units)
- [x] Move objective farther away (from 150 to 350 units)
- [x] Add more creepers overall (increase max from 8 to 20)

## Movement System Overhaul
- [x] Add crouch system (C key) - slower movement, harder to detect
- [x] Add sprint system (Shift key) - faster but louder
- [x] Implement stamina for sprinting
- [x] Add different movement speeds:
  - Crouch: 2 units/s
  - Walk: 4 units/s  
  - Run: 8 units/s
  - Sprint: 12 units/s

## Stealth Mechanics
- [x] Implement visibility system based on stance
- [x] Add tall grass patches for hiding
- [x] Make crouching in grass = invisible
- [x] Add noise system (sprint = loud, crouch = quiet)
- [x] Creepers detect based on visibility AND noise

## Visual Danger Indicator
- [x] Create screen edge vignette effect
- [x] Red tint that intensifies with danger
- [x] Danger levels:
  - Safe: No effect
  - Alert: Slight red edges (creeper nearby)
  - Danger: Strong red vignette (creeper sees you)
  - Critical: Pulsing red screen (multiple creepers chasing)

## Additional Features
- [ ] Add footstep sounds with volume based on movement speed
- [x] Create more tall grass clusters around the map
- [ ] Add visual breath/fog effect when sprinting
- [ ] Make creepers coordinate when multiple spot you
- [ ] Add creeper patrol patterns instead of pure random wandering

## Polish
- [x] Balance detection ranges with new stealth system
- [x] Test gameplay difficulty curve
- [x] Add tutorial hints for controls
- [x] Fine-tune stamina regeneration

## Summary of Changes
- Creeper density increased from 8% to 18%
- Creeper detection range increased from 20 to 45 units
- Creeper spawn time increased to 15-25 seconds (from 5-13)
- Objective moved from 150 to 350 units away
- Max active creepers increased from 8 to 20
- Added crouch/sprint system with stamina
- Added stealth mechanics with tall grass hiding spots
- Added visual danger indicator with red vignette
- Added control hints on game start 