// Σφουγγαράς — Sponge Diver
// All tuning data lives here. Pure data + pure derived-stat getters.

var SD = window.SD || {}
window.SD = SD

SD.config = {

  pxPerM: 32, // world scale: 32 canvas px = 1 meter of sea

  worldSeed: 480, // fixed seed — the sea is one real, learnable place (480 BC, naturally)

  world: {
    widthPx: 42000,          // ~1.3 km of sea, west village to the temple mountain
    maxDepthM: 135,          // the floor of Poseidon's Plain
    skyTopPx: -300,          // how far above the waterline the camera may see
    // seafloor cross-section, west → east:
    // Village Shallows → rolling Sponge Grounds (with the winding Divers'
    // Cave) → Seagrass Meadows → the long Kelp Forest (with the 80 m Kelp
    // Well) → Pearl Banks → Sunken Marble Quarry → Graveyard of Ships →
    // Hephaestus' Vents → POSEIDON'S PLAIN (a flat 135 m arena) → the
    // Kraken's Grotto → Eastern Rise → the Blue Hole → Aphrodite's Lagoon →
    // the Temple Mountain, hollow, with an air pocket in its heart.
    floorPoints: [
      { x: 0, m: -3 }, { x: 260, m: 0 }, { x: 520, m: 4 }, { x: 900, m: 7 },
      // — the Sponge Grounds, long and rolling —
      { x: 1250, m: 13 }, { x: 1500, m: 9 }, { x: 1800, m: 16 }, { x: 2100, m: 6 },
      { x: 2400, m: 11 }, { x: 2700, m: 19 }, { x: 2950, m: 8 },
      { x: 3080, m: 16 }, { x: 3160, m: 31 }, { x: 3260, m: 33 }, { x: 3340, m: 16 }, // the Divers' Cave slot
      { x: 3600, m: 10 }, { x: 3900, m: 17 }, { x: 4200, m: 7 }, { x: 4500, m: 14 },
      { x: 4800, m: 19 }, { x: 5100, m: 9 }, { x: 5400, m: 15 }, { x: 5700, m: 6 },
      { x: 6000, m: 12 }, { x: 6300, m: 8 },
      // — the Seagrass Meadows —
      { x: 6600, m: 10 }, { x: 7000, m: 13 }, { x: 7400, m: 9 }, { x: 7800, m: 14 },
      { x: 8200, m: 11 }, { x: 8600, m: 13 }, { x: 8900, m: 12 },
      // — the Kelp Forest flat —
      { x: 9200, m: 15 }, { x: 10000, m: 16 }, { x: 11000, m: 17 },
      { x: 11560, m: 17 }, { x: 11660, m: 76 }, { x: 11780, m: 80 }, { x: 11880, m: 17 }, // the Kelp Well
      { x: 12500, m: 17 }, { x: 13300, m: 18 }, { x: 13900, m: 17 },
      // — the Pearl Banks —
      { x: 14400, m: 27 }, { x: 15000, m: 32 }, { x: 15800, m: 36 }, { x: 16600, m: 40 },
      // — the Sunken Marble Quarry, terraced —
      { x: 17300, m: 44 }, { x: 17700, m: 52 }, { x: 18100, m: 48 },
      { x: 18600, m: 58 }, { x: 19100, m: 54 }, { x: 19600, m: 62 },
      // — the Graveyard of Ships —
      { x: 20400, m: 66 }, { x: 21000, m: 72 }, { x: 21800, m: 68 },
      { x: 22500, m: 80 }, { x: 23300, m: 84 }, { x: 23900, m: 88 },
      // — Hephaestus' Vents —
      { x: 24400, m: 76 }, { x: 25000, m: 72 }, { x: 25700, m: 80 },
      { x: 26400, m: 74 }, { x: 26900, m: 82 },
      // — down to Poseidon's Plain: wide, flat, 135 m —
      { x: 27600, m: 100 }, { x: 28200, m: 120 }, { x: 28600, m: 133 },
      { x: 29000, m: 135 }, { x: 30000, m: 135 }, { x: 31000, m: 135 },
      { x: 32000, m: 135 }, { x: 32400, m: 134 },
      // — the east wall + the Kraken's Grotto —
      { x: 33000, m: 120 }, { x: 33500, m: 100 },
      { x: 33900, m: 92 }, { x: 34000, m: 108 }, { x: 34150, m: 110 }, { x: 34300, m: 88 }, // the grotto slot
      // — the Eastern Rise —
      { x: 34800, m: 74 }, { x: 35400, m: 58 }, { x: 36000, m: 44 },
      { x: 36700, m: 28 }, { x: 37200, m: 16 },
      // — Aphrodite's Lagoon, with the Blue Hole —
      { x: 37600, m: 9 }, { x: 37900, m: 6 },
      { x: 38160, m: 7 }, { x: 38260, m: 62 }, { x: 38400, m: 65 }, { x: 38500, m: 7 }, // the Blue Hole shaft
      { x: 38800, m: 5 }, { x: 39200, m: 6 }, { x: 39600, m: 7 },
      // — the water runs on beneath the Temple Mountain —
      { x: 39900, m: 20 }, { x: 40200, m: 34 }, { x: 40800, m: 40 },
      { x: 41400, m: 38 }, { x: 41800, m: 30 }, { x: 42000, m: 26 }
    ],
    dock: { x: 470, radius: 150 },       // home jetty — swim here to sell, B for the chandlery
    temple: { x: 41430, radius: 320 },   // inside the mountain's air pocket — T to train
    vaultX: 30600,                       // center of the hoard on Poseidon's Plain
    caveX: 3200,                         // the winding Divers' Cave in the sponge grounds
    kelpX1: 9000,                        // the forest spans the flat shelf
    kelpX2: 14000,
    kelpWellX: 11720,                    // the narrow 80 m shaft under the forest
    blueHoleX: 38330,                    // the round shaft in the lagoon
    grottoX: 34075,                      // the Kraken's den in the plain's east wall
    seagrass: { x1: 6500, x2: 9000 },
    pearls: { x1: 14000, x2: 17000 },
    quarry: { x1: 17000, x2: 20000 },
    graveyard: { x1: 20000, x2: 24000 },
    ventsZone: { x1: 24000, x2: 27000 },
    lagoon: { x1: 37500, x2: 39650 },
    // the hollow mountain: rock from above the waterline down to the tunnel,
    // a winding way in at ~28 m, and a great air pocket over a dry ledge
    mountain: {
      faceX: 39900,                      // the cliff face where the sea meets rock
      tunnelY1: 26 * 32,                 // the way in, on the west face
      tunnelY2: 38 * 32,
      shaftX1: 41000, shaftX2: 41260,    // the rising throat into the pocket
      pocketX1: 41060, pocketX2: 41800,  // the air-pocket chamber
      pocketSurfaceY: 6 * 32,            // the water level inside the mountain
      pocketCeilY: 1.2 * 32,             // rock above the air
      ledgeX: 41430, ledgeY: 5.6 * 32    // the dry shelf the temple stands on
    },
    boatStartX: 560,
    boatMaxX: 39650                      // she anchors at the mountain's face, no further
  },

  player: {
    radius: 13,
    accel: 900,          // swim acceleration px/s^2
    baseSpeed: 100,      // max swim speed px/s before fins/training/levels
    baseBreath: 22,      // seconds of breath before any training
    baseRecovery: 7,     // breath seconds regained per second at the surface
    buoyancy: 16,        // gentle upward drift px/s^2
    harvestRadius: 42,
    invulnTime: 0.9
  },

  // --- experience ---
  levelCap: 40,
  perLevel: { breath: 0.7, speed: 1, recovery: 0.12 }, // stat bumps per diver level

  // --- temple training: paid in OFFERINGS (speared fish, pried octopus).
  // The village eats sponge-money; the god eats fish. ---
  training: {
    apnea: { name: 'Apnea', icon: '🫁', desc: 'Long stillness in the temple pool. Breath hold.', offerBase: 3, per: 2.2, unit: 's breath', max: 12 },
    stroke: { name: 'Stroke Drills', icon: '🌊', desc: 'Race the priests across the bay. Swim speed.', offerBase: 3, per: 6, unit: ' speed', max: 12 },
    discipline: { name: 'Breath Discipline', icon: '🧘', desc: 'The god teaches calm. Faster recovery, and panic fades — gone entirely at mastery.', offerBase: 4, per: 1.2, unit: '/s recovery', max: 12 }
  },
  offeringGrowth: 2, // extra offering points per rank already held

  // --- fauna: the animals of the sea. Speared with the kamaki, offered to the god. ---
  fauna: {
    mullet: { name: 'Striped Mullet', count: 40, minM: 3, maxM: 25, offering: 1, xp: 4, weight: 1, cruise: 55, fleeSpeed: 250, fleeRadius: 110, r: 9, respawn: 90 },
    bream: { name: 'Gilt-head Bream', count: 26, minM: 12, maxM: 55, offering: 2, xp: 8, weight: 1, cruise: 70, fleeSpeed: 270, fleeRadius: 125, r: 11, respawn: 140 },
    grouper: { name: 'Dusky Grouper', count: 12, minM: 50, maxM: 125, offering: 8, xp: 20, weight: 3, cruise: 48, fleeSpeed: 230, fleeRadius: 135, r: 16, respawn: 300 }
  },
  lagoonFishBonus: { mullet: 14, bream: 8 }, // Aphrodite's Lagoon teems — easy tribute if you can get there

  // --- the boss cast: many spear hits, key-item drops, tribute trophies ---
  bosses: {
    karcharias: {
      name: 'KARCHARIAS', hp: 8, r: 40, drop: 'sharkFin', xp: 200, respawn: 1200,
      circleR: 260, circleSpeed: 1.1, chargeSpeed: 440, chargeCd: 3.2, windup: 0.55,
      bite: 14, aggroR: 520
    },
    kraken: {
      name: 'THE KRAKEN', hp: 12, r: 52, drop: 'krakenBeak', xp: 300, respawn: 1500,
      grabR: 130, grabDrain: 2.2, grabHold: 3.2, bite: 6, aggroR: 320
    },
    ketos: {
      name: 'KETOS', hp: 15, r: 46, drop: 'ketosHorn', xp: 450, respawn: 1800,
      cruise: 90, chase: 190, ram: 12, aggroR: 460,
      minM: 60, maxM: 120, x1: 15000, x2: 36000 // it roams the whole deep, unannounced
    }
  },
  kamakiReach: [0, 55, 75, 95],        // strike distance px by kamaki tier
  kamakiCooldown: [0, 1.1, 0.8, 0.55], // seconds between thrusts by tier
  ventsUpdraft: 300,                   // px/s^2 of rising water over a vent
  ventCount: 7,

  // breath drain: 1 s/s, plus pressure past pressureStartM, plus panic when low
  breath: {
    pressureStartM: 40,
    pressureDiv: 78,      // extra drain = (depth - start) / div, so ~1.15 extra at 130 m
    panicBelow: 0.25,     // panic sets in under this fraction of breath
    panicDrain: 2.2       // max extra s/s at empty, scaled down by discipline (0 at rank 12)
  },

  darkness: {
    startM: 18,      // depth where the dark begins
    fullM: 110,      // depth of maximum darkness
    maxAlpha: 0.93,
    baseLight: 150,  // light radius px before goggles
    lightPerTier: 70
  },

  // water murk: things blur away past the clarity radius. Bare human eyes
  // are nearly useless underwater — tier 0 sees an arm's length. The first
  // pair of goggles changes your life.
  clarityByTier: [70, 260, 380, 520, 700, 900],
  inkClarity: 60,    // clarity radius while squid-inked
  inkTime: 3.5,

  // regions are PLACES on the map, not depths — see SD.regionAt below

  // Loot: value in drachmae, xp, carry weight, spawn depth window (m),
  // base seconds to gather, spawn count, regrow seconds (0 = never regrows).
  // placement: 'floor' rests on seafloor/rocks, 'vault' is placed by hand.
  lootTypes: {
    sponge: { name: 'Sponge', value: 8, xp: 3, weight: 1, minM: 3, maxM: 20, harvest: 1.1, count: 120, regrow: 50, placement: 'floor' },
    honeycomb: { name: 'Honeycomb Sponge', value: 20, xp: 7, weight: 1, minM: 13, maxM: 34, harvest: 1.4, count: 44, regrow: 80, placement: 'floor' },
    fino: { name: 'Fino Sponge', value: 45, xp: 12, weight: 1, minM: 8, maxM: 30, harvest: 1.6, count: 8, regrow: 120, placement: 'cave' },
    murex: { name: 'Murex Snail', value: 35, xp: 10, weight: 1, minM: 4, maxM: 22, harvest: 1.3, count: 26, regrow: 110, placement: 'floor', zone: 'weedy' },
    shard: { name: 'Amphora Shard', value: 15, xp: 6, weight: 1, minM: 4, maxM: 42, harvest: 1.0, count: 30, regrow: 90, placement: 'floor' },
    oyster: { name: 'Pearl Oyster', value: 60, xp: 14, weight: 2, minM: 24, maxM: 66, harvest: 1.8, count: 34, regrow: 140, placement: 'floor' },
    amphora: { name: 'Amphora', value: 90, xp: 20, weight: 3, minM: 40, maxM: 92, harvest: 2.2, count: 22, regrow: 180, placement: 'floor' },
    helmet: { name: 'Bronze Helmet', value: 150, xp: 28, weight: 3, minM: 55, maxM: 95, harvest: 2.0, count: 10, regrow: 240, placement: 'floor' },
    laurel: { name: 'Gold Laurel', value: 260, xp: 40, weight: 2, minM: 60, maxM: 110, harvest: 2.0, count: 9, regrow: 300, placement: 'floor' },
    statue: { name: 'Marble Head', value: 400, xp: 55, weight: 4, minM: 42, maxM: 125, harvest: 2.6, count: 8, regrow: 380, placement: 'floor' },
    obsidian: { name: 'Obsidian Shard', value: 120, xp: 24, weight: 2, minM: 68, maxM: 86, harvest: 1.6, count: 8, regrow: 200, placement: 'floor', zone: 'vents' },
    coin: { name: "Poseidon's Coin", value: 400, xp: 45, weight: 1, minM: 130, maxM: 135, harvest: 1.0, count: 5, regrow: 200, placement: 'floor' },
    octopus: { name: 'Octopus', value: 0, offering: 4, xp: 14, weight: 2, minM: 10, maxM: 60, harvest: 2.4, count: 16, regrow: 200, placement: 'floor', needsKnife: true },
    chest: { name: 'Abyssal Treasure Chest', value: 1800, xp: 300, weight: 12, minM: 134, maxM: 135, harvest: 3.5, count: 1, regrow: 900, placement: 'vault', heavy: true },
    trident: { name: 'Trident of Poseidon', value: 0, xp: 400, weight: 0, minM: 134, maxM: 135, harvest: 3.2, count: 1, regrow: 0, placement: 'vault', relic: true },
    bottle: { name: 'Message in a Bottle', value: 0, xp: 5, weight: 0, minM: 0, maxM: 0, harvest: 0.8, count: 1, regrow: 0, placement: 'surface' },
    // boss tributes — never spawned, only dropped by the fallen
    sharkFin: { name: 'Fin of Karcharias', value: 0, offering: 25, xp: 60, weight: 4, harvest: 1.2, count: 0, regrow: 0, placement: 'drop' },
    krakenBeak: { name: "Kraken's Beak", value: 0, offering: 40, xp: 90, weight: 5, harvest: 1.4, count: 0, regrow: 0, placement: 'drop' },
    ketosHorn: { name: 'Horn of the Ketos', value: 0, offering: 60, xp: 140, weight: 6, harvest: 1.6, count: 0, regrow: 0, placement: 'drop' }
  },

  dangers: {
    urchin: { count: 26, minM: 4, sting: 4, radius: 12 },
    jelly: { count: 16, minM: 14, maxM: 70, sting: 6, radius: 21, driftSpeed: 14 },
    eel: { count: 7, minM: 38, maxM: 92, sting: 8, alertRadius: 230, lungeSpeed: 420, extent: 235, cooldown: 2.5, radius: 12, fendKnife: 2 },
    shark: {
      count: 5, minM: 58, maxM: 118, sting: 10, radius: 26,
      patrolSpeed: 120, chaseSpeed: 195, detectRadius: 340,
      ceilingM: 52,   // sharks give up above this depth — climb to escape
      cooldown: 4
    },
    abyssShark: {
      count: 3, minM: 100, maxM: 129, sting: 13, radius: 30,
      patrolSpeed: 140, chaseSpeed: 230, detectRadius: 400,
      ceilingM: 88,   // the black hunters of the trench range higher before giving up
      cooldown: 3
    },
    squid: { count: 4, minM: 50, maxM: 110, sting: 2, radius: 17, driftSpeed: 30, inkRadius: 130, cooldown: 4 },
    current: { count: 10, minM: 30, maxM: 95, minForce: 60, maxForce: 140, minW: 500, maxW: 900, minH: 90, maxH: 150 },
    kelp: { stalks: 250, gapChance: 0.16, slow: 0.45 }, // 5 km of true forest, floor to surface
    poseidon: {
      awakeRadius: 380,   // come this close and the god stirs
      approachSpeed: 130, // he has a whole plain to work with now
      stabRange: 115,     // he winds up when you are this close
      windup: 0.5,
      thrustTime: 0.22,
      recover: 0.75,
      thrustReach: 130,   // how far the trident tip extends on a thrust
      tipRadius: 32,
      damage: 12,         // seconds of breath, before the charm
      bodyDamage: 6,
      leash: 1500,        // the plain is his arena — he ranges most of it
      radius: 46
    }
  },

  // Shop catalog — the dockside chandlery. Physical equipment only;
  // breath lives at the temple now. tiers[i] = drachma cost to reach tier i+1.
  upgrades: [
    {
      id: 'fins', icon: '🪽', name: 'Fins of Hermes',
      flavor: 'Bronze-winged. Hermes takes 2% royalties.',
      what: 'Swim speed',
      tiers: [40, 110, 260, 560, 1100, 2100],
      levels: ['steady', 'brisk', 'quick', 'swift', 'darting', 'winged', 'god-tier']
    },
    {
      id: 'stone', icon: '🪨', name: 'Skandalopetra',
      flavor: 'A rock. But a really, really good rock.',
      what: 'Descent speed, hold ↓',
      tiers: [70, 200, 520, 1200],
      levels: ['—', '+50%', '+100%', '+150%', '+200%']
    },
    {
      id: 'light', icon: '🫒', name: 'Olive-Oil Goggles',
      flavor: 'Lens tech of the ancients. Extra virgin, obviously. Without them, the sea is a blur.',
      what: 'Clear sight & light below',
      tiers: [60, 170, 420, 950, 1900],
      levels: ['blurry', 'clear', 'keen', 'sharp', 'bright', 'radiant']
    },
    {
      id: 'net', icon: '🧺', name: 'Woven Net Bag',
      flavor: 'Woven by the Fates. Lifetime warranty.',
      what: 'Carry weight',
      tiers: [30, 90, 220, 520, 1100, 2200],
      levels: ['2 wt', '4 wt', '7 wt', '10 wt', '14 wt', '19 wt', '25 wt']
    },
    {
      id: 'knife', icon: '🗡️', name: 'Diving Knife',
      flavor: "From Hephaestus' clearance sale. Barely forge-damaged. Pries octopus too.",
      what: 'Cut faster, cut kelp, fend off eels',
      tiers: [50, 160, 420, 1000],
      levels: ['bare hands', 'bronze', 'iron', 'steel', 'legend']
    },
    {
      id: 'kamaki', icon: '🎣', name: 'The Kamaki',
      flavor: 'A fishing spear. The god does not take drachmae — he takes tribute.',
      what: 'Spear fish for the temple',
      tiers: [90, 320, 900],
      levels: ['bare hands', 'ash shaft', 'bronze barbs', "hunter's arm"]
    },
    {
      id: 'charm', icon: '🧿', name: "Nereid's Charm",
      flavor: 'Nereid-approved sting protection. SPF infinity.',
      what: 'Stings hurt less',
      tiers: [150, 400, 950],
      levels: ['—', '−20%', '−38%', '−55%']
    },
    {
      id: 'boat', icon: '⛵', name: 'The Kaiki',
      flavor: 'Board her, sail her, fill her hold. Sell it all back at the dock.',
      what: 'A boat & her cargo hold',
      tiers: [450, 700, 1400],
      levels: ['swim home', 'hold 24 wt', 'hold 48 wt', 'hold 90 wt']
    },
    {
      id: 'sail', icon: '🌬️', name: 'Sails of Boreas',
      flavor: 'Cut from the north wind itself. The kaiki barely touches the water.',
      what: 'Sailing speed (needs the kaiki)',
      tiers: [280, 750],
      levels: ['—', '+40%', '+85%']
    },
    {
      id: 'favor', icon: '🔱', name: "Poseidon's Favor",
      flavor: 'The god personally guarantees your catch. Terms apply.',
      what: 'Keep your bag if you black out',
      tiers: [1200],
      levels: ['no', 'yes']
    }
  ],

  netCapacity: [2, 4, 7, 10, 14, 19, 25],    // carry weight by net tier
  holdCapacity: [0, 24, 48, 90],              // boat hold weight by boat tier
  boatSpeed: 300,                             // sailing px/s before the Sails of Boreas
  sailMults: [1, 1.4, 1.85],                  // sailing multiplier by sail tier
  boatBoardRadius: 95,                        // close enough to board (E) — anywhere along the hull
  boatTransferRadius: 110,                    // surfacing this close auto-loads the hold
  knifeMults: [1, 0.78, 0.6, 0.45, 0.33],     // harvest-time multiplier by knife tier
  stoneMults: [1, 1.5, 2.0, 2.5, 3.0],        // descent-speed multiplier by stone tier
  charmResist: [0, 0.2, 0.38, 0.55],          // sting reduction by charm tier
  weightSlow: 0.032                           // speed mult = 1 / (1 + carried * this)
}

// ---------- Experience (all pure) ----------

// Pure: XP required to go from level L to L+1
SD.xpForLevel = function (level) {
  return Math.floor(40 + level * 28 + level * level * 4)
}

// Pure: {level, into, need} from total xp
SD.levelFromXp = function (xp) {
  var level = 0
  var rest = Math.max(0, xp || 0)
  while (rest >= SD.xpForLevel(level) && level < SD.config.levelCap) {
    rest -= SD.xpForLevel(level)
    level++
  }
  return { level: level, into: rest, need: SD.xpForLevel(level) }
}

// Pure: diver level for current state
SD.level = function (state) {
  return SD.levelFromXp(state.xp).level
}

// Pure: 0..1 athletic look — levels + temple training + a life spent diving.
// Drives the tan and the muscle in the drawing.
SD.fitness = function (state) {
  if (state.devMode) return 1
  var lv = SD.level(state)
  var t = state.training
  var trainSum = t.apnea + t.stroke * 1.35 + t.discipline
  return Math.min(1, lv * 0.03 + trainSum * 0.025 + state.stats.dives * 0.002)
}

// ---------- Derived stats (all pure: read state, return a number) ----------
// state.devMode (the G toggle, never saved) pins everything to godlike
// values so the world can be explored freely while we build it.

// Pure: max breath in seconds — base + apnea training + diver level
SD.maxBreath = function (state) {
  if (state.devMode) return 300
  return SD.config.player.baseBreath +
    state.training.apnea * SD.config.training.apnea.per +
    SD.level(state) * SD.config.perLevel.breath
}

// Pure: max swim speed px/s — base + fins + stroke drills + diver level.
// Billy's grilled kraken sticks to the ribs: +8% forever after the feast.
SD.maxSpeed = function (state) {
  if (state.devMode) return 380
  var v = SD.config.player.baseSpeed +
    state.upgrades.fins * 12 +
    state.training.stroke * SD.config.training.stroke.per +
    SD.level(state) * SD.config.perLevel.speed
  return state.relics.feast ? v * 1.08 : v
}

// Pure: sailing speed px/s for the current Sails of Boreas
SD.sailSpeed = function (state) {
  return SD.config.boatSpeed * SD.config.sailMults[state.upgrades.sail]
}

// Pure: kamaki damage per thrust — the Trident of Poseidon strikes as three
SD.spearDamage = function (state) {
  if (state.devMode) return 5
  return state.tridentClaimed ? 3 : 1
}

// Pure: breath seconds regained per second at the surface
SD.recoveryRate = function (state) {
  if (state.devMode) return 100
  return SD.config.player.baseRecovery +
    state.training.discipline * SD.config.training.discipline.per +
    SD.level(state) * SD.config.perLevel.recovery
}

// Pure: panic drain multiplier 0..1 — Breath Discipline cures it entirely at max rank
SD.panicScale = function (state) {
  if (state.devMode) return 0
  return 1 - state.training.discipline / SD.config.training.discipline.max
}

// Pure: offering points needed for the next rank of a training track
SD.offeringCost = function (track, rank) {
  return SD.config.training[track].offerBase + rank * SD.config.offeringGrowth
}

// Pure: offering value of one loot/fauna type id (0 for treasure — the god has plenty)
SD.offeringOf = function (type) {
  var info = SD.config.lootTypes[type] || SD.config.fauna[type]
  return (info && info.offering) || 0
}

// Pure: total offering points in a list of carried type ids
SD.offeringPoints = function (items) {
  var sum = 0
  for (var i = 0; i < items.length; i++) {
    sum += SD.offeringOf(items[i])
  }
  return sum
}

// Pure: clarity radius px — how far the water stays sharp before the murk
SD.clarityRadius = function (state) {
  if (state.devMode) return 2400
  return SD.config.clarityByTier[state.upgrades.light]
}

// Pure: light radius px for current goggles (the dark is a separate matter from the murk)
SD.lightRadius = function (state) {
  if (state.devMode) return 900
  return SD.config.darkness.baseLight + state.upgrades.light * SD.config.darkness.lightPerTier
}

// Pure: net bag capacity in carry weight
SD.bagCapacity = function (state) {
  if (state.devMode) return 25
  return SD.config.netCapacity[state.upgrades.net]
}

// Pure: boat hold capacity in carry weight (0 = no boat)
SD.holdCapacity = function (state) {
  return SD.config.holdCapacity[state.upgrades.boat]
}

// Pure: full info for any carriable type id — treasure or tribute
SD.carryInfo = function (type) {
  return SD.config.lootTypes[type] || SD.config.fauna[type]
}

// Pure: total carry weight of a bag (array of loot/fauna type ids)
SD.bagWeight = function (bag) {
  var sum = 0
  for (var i = 0; i < bag.length; i++) {
    sum += SD.carryInfo(bag[i]).weight
  }
  return sum
}

// Pure: swim-speed multiplier for carried weight — a heavy haul is a slog
SD.weightMult = function (carried) {
  return 1 / (1 + carried * SD.config.weightSlow)
}

// Pure: harvest-time multiplier for current knife (lower is faster)
SD.harvestMult = function (state) {
  if (state.devMode) return 0.3
  return SD.config.knifeMults[state.upgrades.knife]
}

// Pure: descent-speed multiplier when holding down, for current stone
SD.descentMult = function (state) {
  if (state.devMode) return 3
  return SD.config.stoneMults[state.upgrades.stone]
}

// Pure: fraction of sting damage absorbed — charm, plus Karcharias' tough
// hide worn as a wetsuit (half of what remains)
SD.stingResist = function (state) {
  var base = SD.config.charmResist[state.upgrades.charm]
  return state.relics.hide ? 1 - (1 - base) * 0.5 : base
}

// Pure: player depth in meters (0 at the surface)
SD.depthM = function (y) {
  return Math.max(0, y / SD.config.pxPerM)
}

// Pure: the local water surface y at a world x — 0 in the open sea, but
// deep inside the Temple Mountain the air pocket has its own waterline
SD.surfaceYAt = function (x) {
  var mt = SD.config.world.mountain
  if (x > mt.shaftX1 && x < mt.pocketX2) return mt.pocketSurfaceY
  return 0
}

// Pure: the named PLACE at a position — geography first, depth only where
// depth is the geography. First match wins.
SD.regionAt = function (x, m) {
  var w = SD.config.world
  if (x > w.mountain.faceX) {
    return m < 12 && x > w.mountain.pocketX1 ? 'The Temple of the Deep' : 'The Mountain Passage'
  }
  if (Math.abs(x - w.caveX) < 220 && m > 20) return "The Divers' Cave"
  if (Math.abs(x - w.kelpWellX) < 220 && m > 24) return 'The Kelp Well'
  if (Math.abs(x - w.blueHoleX) < 220 && m > 12) return 'The Blue Hole'
  if (Math.abs(x - w.grottoX) < 320 && m > 86) return "The Kraken's Grotto"
  if (x > 28000 && x < 33200 && m > 110) return "Poseidon's Plain"
  if (x >= w.kelpX1 && x <= w.kelpX2) return 'The Kelp Forest'
  if (x >= w.seagrass.x1 && x < w.seagrass.x2) return 'The Seagrass Meadows'
  if (x >= w.pearls.x1 && x < w.pearls.x2) return 'The Pearl Banks'
  if (x >= w.quarry.x1 && x < w.quarry.x2) return 'The Sunken Quarry'
  if (x >= w.graveyard.x1 && x < w.graveyard.x2) return 'The Graveyard of Ships'
  if (x >= w.ventsZone.x1 && x < w.ventsZone.x2) return "Hephaestus' Vents"
  if (x >= 27000 && x < 34500) return 'The Deep Approaches'
  if (x >= 34500 && x < w.lagoon.x1) return 'The Eastern Rise'
  if (x >= w.lagoon.x1) return "Aphrodite's Lagoon"
  if (x < 700) return 'The Village Shallows'
  if (x < w.seagrass.x1) return 'The Sponge Grounds'
  return 'The Open Blue'
}
