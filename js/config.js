// Σφουγγαράς — Sponge Diver
// All tuning data lives here. Pure data + pure derived-stat getters.

var SD = window.SD || {}
window.SD = SD

SD.config = {

  pxPerM: 32, // world scale: 32 canvas px = 1 meter of sea

  worldSeed: 480, // fixed seed — the sea is one real, learnable place (480 BC, naturally)

  world: {
    widthPx: 8400,           // ~260 m from shore to shore
    maxDepthM: 130,          // world-record territory, at the vault floor
    skyTopPx: -300,          // how far above the waterline the camera may see
    // seafloor cross-section: home beach → long ROLLING sponge grounds
    // (hills and 15–20 m dips, one hiding a cave) → the flat kelp shelf
    // (a forest you slog through, or sail over) → a drop-off into rich
    // water → the abyssal vault → up the far slope to the temple beach.
    floorPoints: [
      { x: 0, m: -3 }, { x: 260, m: 0 }, { x: 520, m: 4 },
      { x: 900, m: 7 }, { x: 1250, m: 13 }, { x: 1500, m: 9 },      // rolling
      { x: 1780, m: 16 }, { x: 2050, m: 6 }, { x: 2350, m: 11 },    // sponge
      { x: 2600, m: 19 }, { x: 2850, m: 8 }, { x: 3150, m: 14 },    // grounds
      { x: 3400, m: 10 }, { x: 3600, m: 14 },
      { x: 3800, m: 15 }, { x: 4600, m: 16 }, { x: 5400, m: 17 },   // the kelp flat
      { x: 5650, m: 30 }, { x: 6000, m: 55 }, { x: 6400, m: 84 },   // the drop-off
      { x: 6700, m: 110 }, { x: 6850, m: 127 }, { x: 7000, m: 130 },
      { x: 7150, m: 127 }, { x: 7300, m: 110 },                     // the vault
      { x: 7550, m: 84 }, { x: 7800, m: 50 }, { x: 7950, m: 22 },
      { x: 8060, m: 8 }, { x: 8140, m: 0 }, { x: 8400, m: -3 }      // temple slope
    ],
    dock: { x: 470, radius: 150 },     // home jetty — swim here to sell, B for the chandlery
    temple: { x: 8080, radius: 160 },  // Poseidon's jetty — T to train
    vaultX: 7000,                      // center of the abyssal vault
    kelpX1: 3600,                      // the forest spans the flat shelf
    kelpX2: 5400,
    caveX: 2600,                       // a boulder-dome cave in the deepest sponge dip
    boatStartX: 560
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
    mullet: { name: 'Striped Mullet', count: 14, minM: 3, maxM: 25, offering: 1, xp: 4, weight: 1, cruise: 55, fleeSpeed: 250, fleeRadius: 110, r: 9, respawn: 90 },
    bream: { name: 'Gilt-head Bream', count: 10, minM: 15, maxM: 55, offering: 2, xp: 8, weight: 1, cruise: 70, fleeSpeed: 270, fleeRadius: 125, r: 11, respawn: 140 },
    grouper: { name: 'Dusky Grouper', count: 4, minM: 55, maxM: 115, offering: 8, xp: 20, weight: 3, cruise: 48, fleeSpeed: 230, fleeRadius: 135, r: 16, respawn: 300 }
  },
  kamakiReach: [0, 55, 75, 95],        // strike distance px by kamaki tier
  kamakiCooldown: [0, 1.1, 0.8, 0.55], // seconds between thrusts by tier

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
    sponge: { name: 'Sponge', value: 8, xp: 3, weight: 1, minM: 3, maxM: 20, harvest: 1.1, count: 42, regrow: 50, placement: 'floor' },
    honeycomb: { name: 'Honeycomb Sponge', value: 20, xp: 7, weight: 1, minM: 13, maxM: 34, harvest: 1.4, count: 18, regrow: 80, placement: 'floor' },
    fino: { name: 'Fino Sponge', value: 45, xp: 12, weight: 1, minM: 8, maxM: 24, harvest: 1.6, count: 6, regrow: 120, placement: 'cave' },
    murex: { name: 'Murex Snail', value: 35, xp: 10, weight: 1, minM: 12, maxM: 22, harvest: 1.3, count: 10, regrow: 110, placement: 'floor', zone: 'kelp' },
    shard: { name: 'Amphora Shard', value: 15, xp: 6, weight: 1, minM: 14, maxM: 42, harvest: 1.0, count: 12, regrow: 90, placement: 'floor' },
    oyster: { name: 'Pearl Oyster', value: 60, xp: 14, weight: 2, minM: 30, maxM: 66, harvest: 1.8, count: 13, regrow: 140, placement: 'floor' },
    amphora: { name: 'Amphora', value: 90, xp: 20, weight: 3, minM: 40, maxM: 82, harvest: 2.2, count: 8, regrow: 180, placement: 'floor' },
    helmet: { name: 'Bronze Helmet', value: 150, xp: 28, weight: 3, minM: 62, maxM: 95, harvest: 2.0, count: 3, regrow: 240, placement: 'floor' },
    laurel: { name: 'Gold Laurel', value: 260, xp: 40, weight: 2, minM: 74, maxM: 106, harvest: 2.0, count: 3, regrow: 300, placement: 'floor' },
    statue: { name: 'Marble Head', value: 400, xp: 55, weight: 4, minM: 88, maxM: 121, harvest: 2.6, count: 2, regrow: 380, placement: 'floor' },
    coin: { name: "Poseidon's Coin", value: 400, xp: 45, weight: 1, minM: 124, maxM: 129.5, harvest: 1.0, count: 3, regrow: 200, placement: 'floor' },
    octopus: { name: 'Octopus', value: 0, offering: 4, xp: 14, weight: 2, minM: 10, maxM: 60, harvest: 2.4, count: 6, regrow: 200, placement: 'floor', needsKnife: true },
    chest: { name: 'Abyssal Treasure Chest', value: 1800, xp: 300, weight: 12, minM: 129, maxM: 130, harvest: 3.5, count: 1, regrow: 900, placement: 'vault', heavy: true },
    trident: { name: 'Trident of Poseidon', value: 1500, xp: 250, weight: 2, minM: 129, maxM: 130, harvest: 3.2, count: 1, regrow: 0, placement: 'vault' },
    bottle: { name: 'Message in a Bottle', value: 0, xp: 5, weight: 0, minM: 0, maxM: 0, harvest: 0.8, count: 1, regrow: 0, placement: 'surface' }
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
    kelp: { stalks: 92, gapChance: 0.16, slow: 0.45 }, // a true forest on the flat shelf, floor to surface
    poseidon: {
      awakeRadius: 300,   // come this close and the god stirs
      approachSpeed: 80,
      stabRange: 105,     // he winds up when you are this close
      windup: 0.55,
      thrustTime: 0.22,
      recover: 0.9,
      thrustReach: 120,   // how far the trident tip extends on a thrust
      tipRadius: 30,
      damage: 12,         // seconds of breath, before the charm
      bodyDamage: 6,
      leash: 420,         // he will not chase beyond this from the vault
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
      id: 'favor', icon: '🔱', name: "Poseidon's Favor",
      flavor: 'The god personally guarantees your catch. Terms apply.',
      what: 'Keep your bag if you black out',
      tiers: [1200],
      levels: ['no', 'yes']
    }
  ],

  netCapacity: [2, 4, 7, 10, 14, 19, 25],    // carry weight by net tier
  holdCapacity: [0, 24, 48, 90],              // boat hold weight by boat tier
  boatSpeed: 300,                             // sailing px/s
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

// Pure: max swim speed px/s — base + fins + stroke drills + diver level
SD.maxSpeed = function (state) {
  if (state.devMode) return 380
  return SD.config.player.baseSpeed +
    state.upgrades.fins * 12 +
    state.training.stroke * SD.config.training.stroke.per +
    SD.level(state) * SD.config.perLevel.speed
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

// Pure: fraction of sting damage absorbed by the charm
SD.stingResist = function (state) {
  return SD.config.charmResist[state.upgrades.charm]
}

// Pure: player depth in meters (0 at the surface)
SD.depthM = function (y) {
  return Math.max(0, y / SD.config.pxPerM)
}

// Pure: the named PLACE at a position — geography first, depth only where
// depth is the geography (the trench). First match wins.
SD.regionAt = function (x, m) {
  var w = SD.config.world
  if (Math.abs(x - w.caveX) < 160 && m > SD.floorDepthAt(w.caveX) - 7) return "The Divers' Cave"
  if (Math.abs(x - w.vaultX) < 480 && m > 112) return 'The Vault of the Deep'
  if (x > w.kelpX2 + 50 && x < 7950 && m > 90) return "Poseidon's Trench"
  if (x >= w.kelpX1 && x <= w.kelpX2) return 'The Kelp Forest'
  if (x > w.kelpX2 && x < w.vaultX - 350 && m > 22) return 'The Drop-Off'
  if (x >= 7900) return 'The Temple Shore'
  if (x > w.vaultX + 350 && x < 7900 && m > 6) return 'The Eastern Slope'
  if (x < 700) return 'The Village Shallows'
  if (x < w.kelpX1) return 'The Sponge Grounds'
  return 'The Open Blue'
}
