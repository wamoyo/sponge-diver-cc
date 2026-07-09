# Σφουγγαράς — Sponge Diver

Ancient-Greece-themed freediving game. You're a Kalymnos sponge diver in a
fixed, learnable sea ~1.3 km across — a real geography, west to east: the
Village Shallows · the rolling Sponge Grounds and the winding Divers' Cave ·
the Seagrass Meadows · the great Kelp Forest and the 80 m Kelp Well beneath
it · the Pearl Banks · the Sunken Marble Quarry · the Graveyard of Ships
(Karcharias hunts here) · Hephaestus' Vents, with the CAVES OF HEPHAESTUS
cut into the rock beneath them — air pockets, and the smith's own forge ·
POSEIDON'S PLAIN, a flat
135 m arena where the god guards his hoard · the Kraken's Grotto · the
Eastern Rise · Aphrodite's Lagoon and its Blue Hole · and the hollow Temple
Mountain, whose sanctum sits beside an air pocket you surface into from an
underwater passage. Sell treasure at the dock; spear fish as tribute; slay
the boss cast for relics: the Trident (your spear strikes as three),
Karcharias' hide (half damage forever), and the Kraken — which Billy grills
for the whole village (+XP, +8% swim speed, forever).

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
| Forge | **F** at the smith's ledge in the caves | tap the pill |
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
- **NEVER DIVE ALONE.** Cousin Yiannis is always in the water above you —
  but he needs his own air to save you, so he floats on the surface watching
  your clock: when your remaining breath gets thin against the climb home,
  he gulps air and drops to meet you on his line. Black out within his reach
  (10 m, trained to 20 m, then 30 m at the chandlery) and he hauls you —
  *and everything you carry* — back to the village. Black out beyond his
  reach and that is the end: ΘΑΝΑΤΟΣ, one life, the save returns to the sea.
  When you sail, he rides the kaiki with you, feet over the gunwale.
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
- **Hephaestus' Vents are a gauntlet:** each vent throws a cone of lift
  that widens all the way to ~8 m below the surface. Untrained divers
  simply cannot force their way down through the cores — go around, or
  come back stronger. At the bottom the throats are narrow, with calm
  water between them for looting obsidian. Then step into a column and
  ride it home.
- **The Caves of Hephaestus** are cut into the rock BENEATH the vents shelf
  — a carved tube with the shelf itself for a roof and its own sanded floor.
  The only way in is the Smith's Throat at the eastern drop-off: a shaft
  owned by the **worst vent of them all**, whose column you must force your
  way down. Then the tube works west under the shelf — caves, a dome of
  **trapped air to breathe in**, more caves, more air — past moray recesses
  and obsidian seams, until the roof lifts into a vaulted temple under the
  second vent. There, on a dry stone platform, Hephaestus works his anvil:
  bring him **obsidian** and gear already at the chandlery's best, and he
  forges it one god-tier further (fins, goggles, knife, kamaki — **F** to
  offer).
- **The Wreck of the Anemone:** a giant merchant ship lies breached in the
  Graveyard. Swim in through the torn planking amidships and rob the hold —
  amphorae, a helmet, gold — while a moray watches from the dark and
  Karcharias circles outside.
- **It gets murky, then dark.** Detail fades past your clarity radius
  (olive-oil goggles extend it; ink shrinks it) and past ~18 m the water
  goes properly dark (goggles light that too). Region captions name the
  places as you cross into them — geography, not depth bands.
- **Poseidon's waters are stormy — always.** A standing storm hangs over
  POSEIDON'S PLAIN and nowhere else: it gathers on the descent from the Deep
  Approaches, rages directly above the god, and breaks before the Eastern
  Rise. Under it the sky goes bronze-dark, the water bruises, rain drives
  into a heavy swell, lightning walks the Plain, thunder rolls, the chop
  shoves surfaced swimmers back west, and the kaiki fights an eastward bow.
  Either side of it — and in the lagoon, and inside the mountain — the sea
  is glass. When the weather turns filthy overhead, you're above the hoard.
- **The best gear is found, not bought.** The chandlery won't sell fins,
  goggles, or the kamaki until you've recovered their originals: the Fins
  of Hermes in a western alcove, a pearl-trader's goggles among the Banks,
  an old kamaki rusting in a carcass in the meadows. The elder at the dock
  points you at the next secret — the dock has voices, one line per visit.
- **Nikandros' trail.** Six messages in bottles, each left where its warning
  matters, lead from the shallows to the bones of the diver who wrote them —
  beside the hoard he never carried home. The pause menu keeps a journal:
  secrets uncovered, bottles read, monsters slain, rescues owed to Yiannis.
- **The world scars.** Take the strongbox from the Anemone's stern and she
  rolls off her ledge, tearing open a crevasse — the Anemone's Grave — with
  new depths to rob. Cut the blockage in the Kelp Well and a freed current
  flings you between the Well and the Pearl Banks forever after. Pry the
  quarrymen's slab and their sealed cache stays open. All of it persists.
- **The Great Pearl** waits in a ring of jellyfish off the Banks — worth a
  boat on its own, and only a Legend-tier edge can pry the shell.
- **It sounds like the Aegean.** Lyre plucks in the Phrygian mode for the
  catch, an aulos flourish for level-ups, a temple gong for offerings, a
  conch-and-rumble when something immense wakes, thunder over the god's
  waters, papyrus rustle for the message. All synthesized live, no audio files.

## The Art Lab

Open `art-lab.html` — a live workbench that renders **every sprite in the
game** (the diver with sliders for fitness and gear, Poseidon's whole attack
cycle, the boss cast with state buttons, all fauna, dangers, loot, and world
pieces) using the game's actual draw functions from `js/render.js`. Change
the code, refresh, judge. Space freezes every animation; the 🌑 button
previews everything against deep water.

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
- `js/forge.js` — Hephaestus' blessings: obsidian for god-forged gear
- `js/main.js` — boot, input, game loop, camera

## Ideas for later

- A new top-tier chandlery item (Poseidon's Favor was retired — undecided)
- Sirens (pull you toward them), NPC rival divers, agora contracts
- Day counter + daily sponge prices at the dock
