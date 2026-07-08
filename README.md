# Σφουγγαράς — Sponge Diver

Ancient-Greece-themed sponge diving game prototype. You're a Kalymnos sponge diver:
dive from your kaiki, gather loot off the seafloor, dodge what stings and bites,
surface before your breath runs out, sell the catch for drachmae, buy better gear,
go deeper. The Trident of Poseidon waits in a shrine at the bottom of the trench.

## Run it

No build, no server. Just open `index.html` in a browser.

## Controls

| Key | Action |
|---|---|
| WASD / Arrows | swim (hold ↓ to drop fast with the skandalopetra) |
| hover near loot | gather it (progress ring) |
| B | boat shop, at the surface |
| Esc | pause |
| M | mute |
| Enter | start from the title |

**On phones** (any coarse-pointer device): drag anywhere on the water — a floating
joystick appears and the drag vector is the swim vector (drag far down to engage
the stone). Tap the ⛵ pill at the surface for the shop, II for pause. The UI
reflows for small screens and devicePixelRatio is capped at 2 for phone GPUs.

## How it plays

- **Breath is the only currency underwater.** It drains 1 s/s; stings knock whole
  seconds off it. Hit zero and you black out — the crew hauls you up, the sea
  keeps your catch (unless you bought Poseidon's Favor; the trident is never lost).
- **Loot ladder by depth:** sponges (3–19 m) → honeycomb sponges + amphora shards →
  pearl oysters → intact amphorae → bronze helmets → gold laurels → marble heads →
  the Trident (~120 m). After the trident is claimed, Poseidon's Coins spawn in
  the trench.
- **Dangers:** sea urchins on rocks, drifting jellyfish, moray eels that lunge from
  crevices, and sharks below 55 m — they chase, bite, and knock loot out of your bag.
  Climb above 55 m and sharks lose interest.
- **It gets dark past ~16 m.** Jellyfish glow (pretty, still stings). Goggles help.
- **Selling:** surfacing auto-sells everything in the net bag. Each selling dive
  also adds +0.4 s of permanent lung conditioning (caps at +8 s).
- The sea restocks (new layout) every time you sell.

## Tuning

Everything lives in `js/config.js` — loot values/depths/counts, danger stats,
upgrade costs, breath/speed/light numbers, world size. Save data persists in
localStorage (`spongeDiverSaveV1`); reset from the pause menu.

## Files

- `js/config.js` — all tuning data + derived-stat getters
- `js/utils.js` — pure helpers
- `js/save.js` — localStorage persistence
- `js/audio.js` — tiny WebAudio synth (plucks, coins, heartbeat)
- `js/world.js` — dive-site generation (rocks, floor + trench, loot, dangers, decor)
- `js/touch.js` — floating virtual joystick for phones
- `js/player.js` — swim physics, breath, harvesting, surfacing/selling, blackout
- `js/dangers.js` — urchin/jelly/eel/shark behavior + stings
- `js/render.js` — canvas drawing (black-figure pottery silhouettes)
- `js/hud.js` — DOM HUD, toasts, tally, band captions
- `js/shop.js` — the boat shop
- `js/main.js` — boot, input, game loop, camera

## Ideas for later

- Waves/weather affecting surface rest, day counter + daily sponge prices
- Sirens (pull you toward them), octopus that steals from the bag
- Enterable shipwreck interior with air pockets
- Touch controls for phones
- Contracts from the agora ("bring 3 amphorae"), NPC rival divers
