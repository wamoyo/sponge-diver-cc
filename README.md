# Σφουγγαράς — Sponge Diver

Ancient-Greece-themed freediving game. You're a Kalymnos sponge diver in a
fixed, learnable sea that runs shore to shore — a real geography with named
places: the Village Shallows, the long rolling Sponge Grounds (hills and
15–20 m dips, one of them hiding the Divers' Cave and its primo fino
sponges), the Kelp Forest wall, the Drop-Off, Poseidon's Trench, and — the
old divers only whisper about the far side. Gather sponges off the rocks,
sell at the dock, level up, buy gear and a boat, spear fish as tribute for
the god, and go deeper. At the very bottom, at world-record depth (130 m),
Poseidon himself stands guard over a hoard of gold, a treasure chest too
heavy for a beginner's net, and his own trident.

## Run it

No build needed. Open `index.html` in a browser (or serve the folder with
any static server).

## Controls

| | Desktop | Phone / tablet |
|---|---|---|
| Swim | WASD / arrows, **or drag with the mouse** | drag anywhere (floating joystick) |
| Descend fast | hold ↓ (with the skandalopetra) | drag far down |
| Gather loot | hover close (progress ring) | hover close |
| Chandlery | **B** at the dock, or click the pill | tap the pill |
| Temple | **T** at its jetty, or click the pill | tap the pill |
| Board / leave boat | **E**, or click the pill · **A/D** sail · **S** dive off | tap the pill |
| Pause / mute | Esc or the II pill / M | II pill |
| Zoom | mouse wheel, or **−** / **=** / **0** to reset | — |
| Dev mode | **G** — godlike stats + max fitness, for exploring | — |

Progress saves in `localStorage` (`spongeDiverSaveV2`; old v1 saves migrate
automatically — breath tiers become Apnea ranks, conditioning becomes XP,
and veterans find their kaiki already tied up at the dock).

## How it plays

- **Breath is the only currency underwater.** It drains 1 s/s, faster with
  depth (pressure), and faster still when it's nearly gone (panic — cured
  completely by Breath Discipline training). Stings cost whole seconds.
  Black out and the sea keeps whatever you carry — but never the trident,
  never the hold, and Poseidon's Favor protects the rest.
- **Two economies.** Treasure sells at the village dock for drachmae (gear
  money). Fish and octopus are *tribute* — the fishmonger won't touch them;
  only the temple takes them, in exchange for training that grows your body:
  Apnea (breath), Stroke Drills (speed), Breath Discipline (recovery + panic).
- **Experience shapes you.** Loot, depth, and hunting all grant XP. Levels
  add breath/speed/recovery — and fitness (levels + training + dives) is
  drawn on the diver himself: the skin browns, the shoulders broaden, the
  waist narrows, the legs thicken. Your body is your save file.
- **Spearfishing.** Buy the kamaki at the chandlery, then get close to a
  mullet, bream, or grouper before it bolts. Octopus den on the rocks and
  must be pried loose with the knife.
- **Bare eyes see an arm's length.** Underwater vision starts truly blurry —
  the first pair of olive-oil goggles is the purchase that opens the sea.
  Swimming is honest, too: speed is a real vector, so straight down is
  genuinely the fastest way to depth (the skandalopetra pulls only downward).
- **The kelp forest** spans the flat shelf east of the sponge grounds,
  seafloor to surface, every stalk bowed and swaying. Swimming through it is
  a slog (a knife helps a little). A boat sails clean over the canopy — the
  single best quality-of-life purchase in the game. Murex snails — the
  purple-dye shells of the ancients — live among the holdfasts, and octopus
  den in the boulders.
- **The Divers' Cave** hides in the deepest dip of the sponge grounds: a
  boulder dome with pale, high-grade fino sponges inside — and something
  else, left behind by whoever farmed them first.
- **The kaiki** is a mobile depot: surface beside her and your catch loads
  into the hold automatically; dock her at the village and the hold sells
  itself. Anchor her at the temple jetty and the priests take tribute
  straight from the hold. Cargo in the hold survives blackouts.
- **Loot regrows.** The world is one fixed, seeded place — sponges regrow in
  ~1 min, pearls and relics take longer, Poseidon's coins appear only after
  the trident is claimed, and the abyssal chest returns very slowly.
- **Dangers:** urchins on the rocks, drifting jellyfish, moray eels in
  crevices (a good knife drives them off), reef sharks below 52 m, black
  abyss sharks in the trench, ink squid that blind you, push currents,
  entangling kelp — and the Earth-Shaker himself: wake him and he closes,
  winds up, and drives the trident. He never leaves his vault. Dodge the
  windup, grab, and run.
- **It gets murky, then dark.** Detail fades past your clarity radius
  (olive-oil goggles extend it; ink shrinks it) and past ~18 m the water
  goes properly dark (goggles light that too). Region captions name the
  places as you cross into them — geography, not depth bands.
- **It sounds like the Aegean.** Lyre plucks in the Phrygian mode for the
  catch, an aulos flourish for level-ups, a temple gong for offerings, a
  conch-and-rumble when something immense wakes, papyrus rustle for the
  message. All synthesized live, no audio files.

## Tuning

Everything lives in `js/config.js` — the seafloor cross-section control
points, loot values/weights/XP/regrow timers, fauna behavior, gear tiers,
training curves, breath/pressure/panic numbers, Poseidon's moveset, the
world seed.

## Files

- `js/config.js` — all tuning data + pure derived-stat getters (XP, fitness, stats)
- `js/utils.js` — pure helpers + seeded RNG
- `js/save.js` — localStorage persistence, v1→v2 migration
- `js/audio.js` — tiny WebAudio synth (plucks, coins, heartbeat)
- `js/world.js` — the fixed sea: terrain, rocks, kelp forest, currents, loot + regrow, fauna, vault
- `js/touch.js` — pointer joystick (mouse + finger)
- `js/player.js` — swim physics, weight, breath/pressure/panic, harvesting, XP, dock selling, blackout
- `js/boat.js` — the kaiki: boarding, sailing, hold, dock/temple logistics
- `js/fauna.js` — fish AI (cruise/flee) + kamaki spearing
- `js/dangers.js` — urchin/jelly/eel/shark/squid/kelp/current behavior + Poseidon's boss AI
- `js/render.js` — canvas drawing: the fitness-morphing diver, Poseidon, shores, murk + darkness
- `js/hud.js` — DOM HUD, XP bar, weight, hold, toasts, captions, tally, parchment
- `js/shop.js` — the dockside chandlery
- `js/temple.js` — tribute-based training
- `js/main.js` — boot, input, game loop, camera

## Ideas for later

- Poseidon's temple hidden in an underwater cavern instead of the far beach
- Waves/weather affecting surface rest, day counter + daily sponge prices
- Sirens (pull you toward them), NPC rival divers, agora contracts
- A character-lab page with a fitness slider for admiring the diver
