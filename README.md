# WILDLANDS — Frontier Survival

A 3D open-world survival prototype built with Three.js and Vite.

## Play
- Install Node.js 22 or newer.
- Run `npm install`.
- Run `npm run dev` and open the local URL printed by Vite.
- Click **Abenteuer beginnen** and click the game view to capture the mouse.

## Controls
- `W A S D`: move; mouse: look; `Shift`: sprint; `Space`: jump
- `E`: gather nearby trees, rocks or berry bushes
- `F`: build a campfire when you have 5 wood and 3 stone
- `Q`: eat berries; `1–5`: select a hotbar slot; `Esc`: pause
- The game stores a local save in the browser.

## Downloadable desktop build
A GitHub Actions workflow builds Windows and Linux packages after changes. Open the [Actions page](https://github.com/lucaszatkowski3-eng/Game/actions), select a successful **Build WILDLANDS** run, and download `wildlands-windows` or `wildlands-linux` under Artifacts. Artifacts are temporary; the workflow keeps them for 14 days.

## Scope
This is an early playable foundation with generated terrain, forest, rocks, water, atmospheric lighting, day/night, survival stats, resource gathering and campfire crafting. It is not yet an AAA release; advanced character art, sound, enemies, authored quests and broader building systems are future development work.
