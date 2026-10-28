# LANTERNFALL

*A small flame in a large dark.* A retro-inspired metroidvania for the browser, built with plain HTML5 Canvas, CSS and JavaScript. No dependencies, no build step, no external assets: every sprite, tile, background, sound effect and music track is generated procedurally in code.

You are the last ember of the Great Lantern, which fell from the Ember Spire. Explore four hand-built regions (Mossroot Hollow, Glimmer Deep, the Drowned Chapel and the Ember Spire), gain new abilities, defeat three guardians for their sigils, and relight the Great Lantern.

## Install as an app (PWA)

Lanternfall is a Progressive Web App: it can be installed to your home screen or desktop and plays fully **offline**.

- **Android / Chrome / Edge:** open the hosted game, then use the browser menu **Install app** (or the in-game **Install App** button on the title screen).
- **iPhone / iPad (Safari):** Share, then **Add to Home Screen**.
- It needs to be served over `https://` (GitHub Pages is fine) or `http://localhost`. Opening `index.html` straight from disk still plays, but without install or offline caching.
- The game caches itself on first load. After you publish an update, run `python3 tools/stamp_sw.py` so installed copies pick up the new version (they show an "Update ready" toast, then reload).
- `dist/lanternfall-single.html` is the no-install, double-click version and is not a PWA.

## Launch

Open **`index.html`** in a modern browser (double-clicking works). If your browser blocks local scripts, serve the folder instead:

```bash
cd lanternfall
python3 -m http.server 8000      # then open http://localhost:8000
```

There is also a **single-file build**, `dist/lanternfall-single.html`, with everything inlined (rebuild with `python3 tools/build_single.py`).

## Controls

| Action | Keyboard | Touch |
|---|---|---|
| Move | A / D, arrow keys | on-screen arrows |
| Jump (hold = higher) | Space, Z, K | JUMP |
| Strike (hold Up/Down to aim) | X, J, Enter | HIT |
| Ember Shot (after the first boss; hold Up/Down to aim, hold to charge a Lance) | G, B, O | SHOT (drag to aim) |
| Dash (once unlocked) | C, Shift, L | DASH |
| Interact / talk / read | Up, W, E | ACT |
| Kindle (heal with embers) | hold Down on the ground | hold the down button |
| Flare (needs 50% gauge) | V, F, Q | FLARE |
| Pause / menu | Esc, P | II |
| Map / Charms | M / I, Tab | MAP |

Gamepads (standard mapping) work as well; the B button fires Ember Shots. Touch controls appear automatically on touch devices and can be forced on or off in Settings, with a Small / Medium / Large button size.

**Bigger on phones (optional):** Settings → **Screen: ROTATE** turns the game sideways while the phone is upright, so it fills the whole screen when you hold the phone in landscape, even with rotation lock on. You can also tap the "Rotate your device" banner to switch it on. Where the browser supports it, **Fullscreen** hides the browser bars and asks for landscape. The default, **FIT**, is unchanged.

## Features

**Gameplay**
- 20 interconnected rooms across 4 regions, with distinct palettes, music, ambience, hazards and landmarks.
- Movement tuned for feel: coyote time, jump buffering, variable jump height, acceleration, hit-stop, screen shake and hit flashes.
- Abilities that open the world: **Moth Wings** (double jump), **Ember Dash** (breaks orange-cracked stone), **Dusk Glide**.
- Combat with directional strikes, downward pogo off enemies and spikes, 8+ enemy types, and **4 multi-phase bosses**.
- Hazards and puzzles: spikes, crumbling ledges, spring pads, water, levers and barred gates, sigil gates, cracked walls, illusion walls and secret rooms.
- Progression: 3 sigils, heart containers and heart fragments, 7 charms with equip slots, shop upgrades (damage, light, cheaper kindling), 11 hidden moths, lore inscriptions.
- Risk and reward: dying drops your embers where you fell, and you must reach them again. Shrines save and heal.
- **Flare gauge:** hits and kills fill it. Spend half for a shockwave that damages foes and erases shots; spend a full gauge for an **Overflare** that hits harder and heals a heart.
- **Combos and chains:** every third strike is a **Finisher** (+1 damage, extra impact). Kills within about 3 seconds build a **kill chain** that drops bonus embers.
- **Deflect:** strike an incoming shot to send it homing back at foes; a **perfect parry** (shot almost touching you) hits twice as hard.
- **Elite foes:** roughly one in five enemies spawns with an affix (**Gilded** tough and rich, **Volatile** bursts into sparks, **Swift** much faster), shown with an aura and marker. Enemy health bars appear once a tough foe is hurt.
- **4 new charms:** Echo Flame (strikes loose a bolt), Moth Ward (longer safety after a hit), Flame Siphon (faster Flare) and Phoenix Ash (survive one fatal blow per shrine rest). Sold by Pip, who now has a scrolling shop.
- **Seasonal bonus boards:** after the Thornmother, a storm portal opens in the Glade. **Tempest Ridge** is a harder board with heavy rain, telegraphed lightning bolts, gales that shove you around, extra elites, spike pits and no shrine; clearing it first time grants a heart and opens the snow portal. **Frostmere Pass** is an icy board (slippery floors, blizzards that shrink your light, aurora skies) full of throwing **snowmen**, ending at the **Frost Throne** where the crowned snowman boss **Frost King** rolls, hurls snowballs, calls a blizzard and summons snowmen. First clear grants the **Frostbite** charm (strikes chill foes). Both boards are replayable for embers.
- **Shielded elites:** a fourth affix that blocks frontal strikes; hit from behind, above or below. **Night wisps** drift into Mossroot after dusk. Two new shop upgrades (Bright Core, Wick Tinder) tune the Flare, and Wick, Pip and Marrow explain the new systems.
- **Bounties and Bestiary:** a pause-menu tab with 7 auto-claimed bounties (embers, charms, a charm slot, a heart) and a bestiary of every foe.
- **Ember Graze:** dash through a foe or an incoming shot to feed the Flare gauge and earn an ember. **Air Chain:** keep pogoing off foes without landing for bonus Flare and embers. Two new bounties (Needle Thread, Sky Dancer) and new Stats rows track them.
- **Frenzied elites** (a fifth affix) enrage at half health and charge much faster. Two new charms, **Needle Wick** (double Flare from grazes, brief safety after dashing) and **Skyfire** (richer Air Chains), are earned from bounties, which now number 14.
- **Ember Shot:** a real ranged attack, unlocked when you defeat the Thornmother (saves already past her get it on load). Fire with G / B (touch: SHOT), aim 8 ways with Up/Down and the arrows, and shots lean toward foes in view (aim assist with line of sight). On touch, **drag from the SHOT button** to aim in 8 directions (dots show the aim while you hold), or just tap it to fire at the nearest foe across a wide arc. Bosses take reduced damage from shots (half from normal shots, about 60% from Lances), so melee stays the main way to fight them. You carry 3 shots that refill on their own (HUD pips under the Flare gauge). Hold the button to charge a **Lance** (2 shots) that pierces foes, Shielded guards and enemy shots, cracks walls in one hit, and launches you upward when fired straight down mid-air (once per jump). Normal shots knock enemy shots out of the air; Shielded elites block them from the front.
- **Shot depth:** two charms (**Spitfire** forks shots into three, sold by Pip once Ember Shot is unlocked, as are the two shot upgrades; **Seeker Ember** makes shots curve toward foes, from a bounty), two shop upgrades (**Ember Quiver** for more shots, **Kindled Lance** for harder Lances) and three bounties (Sharpshooter, Lancer, Skeet Flame).
- **Ember Arcade mini games**, from the title screen (**Mini Games**) or the pause menu (**Arcade** tab): **Moth Catcher** (catch falling moths, dodge thorn seeds), **Ember Range** (a shooting gallery with combos, reloads and an accuracy bonus; tap to shoot on touch), **Flame Hop** (an endless runner with double hops, thorns and bats) and **Lantern Echo** (repeat the lantern sequence). Each has bronze, silver and gold medals and a best score. Played from the pause menu during a journey, a new medal pays embers once (25 / 50 / 100), and two bounties reward medals in every game.
- Optional **Trial of Embers** (5 waves) and **New Game+** (stronger foes, keep your gear) after the ending.
- Four NPCs with distinct voices (Wick, Pip, Marrow, Vesper), and a working shop.

**Presentation**
- **Polish pass:** contact shadows baked into every room, dark outlines on the player and foes for readability, pixel-stepped slash arcs, impact rings, fish in the water and prompts drawn above the lighting.
- **Visual upgrade:** bloom on bright light, per-region colour grading, weather and ambience (drifting leaves and night rain in Mossroot, twinkling crystal dust in Glimmer Deep, rising bubbles underwater, ash and wind streaks in the Spire), light shafts, drifting ground fog, foreground vines and stalactites with faster parallax, soft entity shadows, rising embers off the player, floating damage and chain text, a low-health warning vignette and a Flare shockwave ring.
- **Graphics pass 4:** nearby light now re-lights the baked rock so stone texture glows warm around your lantern, water gets depth shading and animated caustics (also on the floor beneath it), heavy hits add a brief chromatic fringe (off with Reduce flashes), dashes leave streaks, and kills release rising soul wisps.
- **Graphics pass 5:** heat shimmer in the Spire, water wobble in the Drowned Chapel and a rippling Flare shockwave (all off with Reduce flashes), anamorphic streaks through strong lights, and a warm pool of light on the ground under you.
- Layered parallax backgrounds, animated foliage, crystals, candles, vents and fog, god rays underwater, dynamic lantern lighting with a darkness layer, and a day/night cycle in the first region.
- Chiptune music with a distinct track per region and boss/ending themes, procedural sound effects, and layered ambience (wind, drips, water, fire), all synthesized with the Web Audio API.
- Title screen with Continue / New Game, settings (music, effects and ambience volumes, mute, screen shake, reduced flashes, touch controls), pause menu with Charms, Map, Journal, Stats and Help tabs, contextual tutorial tips, and confirmation prompts for destructive actions.
- Responsive 16:9 scaling for desktop and mobile; saves to `localStorage` (autosaves at shrines, room changes and every 30 s) with an in-memory fallback if storage is blocked.

## Project structure

```
index.html            entry point
css/style.css         UI styling
js/util.js            namespace, math, RNG, keyboard/touch/gamepad input
js/save.js            settings + save data
js/audio.js           Web Audio synth: music, sfx, ambience
js/content.js         charms, shop, lore, dialogue, tips, ending text
js/art.js             palettes, tile baking, parallax backgrounds, animated decor
js/sprites.js         procedural sprites and icons
js/levels.js          room builder + Mossroot Hollow rooms
js/levels2.js         Glimmer Deep, Drowned Chapel, Ember Spire, Trial
js/entities.js        physics, player, enemies
js/bosses.js          boss logic and hazards
js/game.js            game state, rooms, death/respawn, rewards
js/world.js           simulation loop, combat, items, interactions
js/render.js          renderer, lighting, HUD, title backdrop
js/depth.js           Flare, combos, elites, deflect, new charms, bounties, bestiary
js/seasons.js         storm and snow bonus boards, snowmen, portals, board hazards
js/pwa.js             service worker registration and install prompt
manifest.webmanifest  PWA manifest
sw.js                 generated service worker (offline cache)
icons/                PWA icons (tools/make_icons.py)
js/polish.js          contact shadows, sprite outlines, slash arcs, impact rings, fish
js/depth2.js          night wisps, NPC hints for new systems
js/depth3.js          Ember Graze, Air Chain, soul wisps, new bounties and stats
js/fx3.js             heat and water shimmer, light streaks, ground light pool
js/depth4.js          Frenzied elites, Needle Wick and Skyfire charms, more bounties
js/shot.js            Ember Shot: aiming, aim assist, ammo, charged Lance, shot charms, upgrades and bounties
js/arcade.js          Ember Arcade: four mini games, medals, best scores and rewards
js/fx2.js             lamp-lit surfaces, water depth and caustics, chromatic fringe, dash streaks
js/fx.js              bloom, grading, weather, shafts, fog, shadows, HUD extras
js/ui.js, js/ui2.js   menus, dialog, shop, map, journal, ending
js/main.js            boot, fixed-timestep loop, scaling, error handling
tools/build_single.py builds dist/lanternfall-single.html
tools/stamp_sw.py     regenerates sw.js with a new cache version
tools/make_icons.py   regenerates the icons
tests/                headless Playwright tests
```

## Testing locally

```bash
python3 -m http.server 8123 &
pip install playwright && playwright install chromium
python3 tests/smoke_test.py /tmp/shots       # loads all 20 rooms, checks doors, dialog, menus, shop, death, save/continue, ending
python3 tests/boss_bot_test.py /tmp/shots    # a bot defeats all 4 bosses and clears the Trial
python3 tests/depth4_test.py                 # frenzied enrage, new charms and bounties
python3 tests/depth3_test.py                 # graze, air chain, hit-stop input buffering, Phoenix Ash reset
python3 tests/arcade_test.py                 # Ember Shot unlock, Lance, boss damage, touch drag-aim, mini games, medal rewards, rotate mode
```

Both tests report any console or page errors. You can also play it by hand and open the browser console; the game object is exposed as `window.LF`.

## Publish on GitHub Pages

1. Create a new GitHub repository and push the contents of this folder to the `main` branch:
   ```bash
   git init && git add . && git commit -m "Lanternfall"
   git branch -M main
   git remote add origin https://github.com/<you>/lanternfall.git
   git push -u origin main
   ```
2. In the repository, go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, select `main` and `/ (root)`, then save.
4. After a minute the game is live at `https://<you>.github.io/lanternfall/`.

An empty `.nojekyll` file is included so Pages serves the files as-is.

## Verified vs. limitations

Verified by automated tests in headless Chromium: all 20 rooms load and render without errors with matching door links; dialog, pause menu, every menu tab, shop purchase, death and respawn, save then reload then Continue, and the ending flow work; all four bosses and the Trial can be completed (using a bot with extra health).

Honest limitations:
- A full start-to-finish route through every room was not machine-solved, so some secrets and jump sequences may feel harder or easier than intended. The bot tests cover bosses and systems, not routing.
- Audio is synthesized, so it sounds chiptune-like rather than composed; it starts after the first click or key press (browser autoplay rules).
- Art is procedural pixel art; there is no sprite-sheet editor or external asset pipeline.
- Touch controls are fixed on-screen buttons; portrait phones work but landscape (or Screen: ROTATE) is recommended.
- Saves live in one browser profile; there is a single save slot.
