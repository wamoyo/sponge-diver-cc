// Σφουγγαράς — Sponge Diver
// All tuning data lives here. Pure data + pure derived-stat getters.

var SD = window.SD || {}
window.SD = SD

SD.config = {

  pxPerM: 32, // world scale: 32 canvas px = 1 meter of sea

  world: {
    widthPx: 3600,
    floorDepthM: 95,                          // seafloor outside the trench
    trench: { x1: 2150, x2: 3050, depthM: 122 }, // the trench dips down to here
    boatX: 620,
    skyTopPx: -300                            // how far above the waterline the camera may see
  },

  player: {
    radius: 13,
    accel: 900,          // swim acceleration px/s^2
    baseSpeed: 105,      // max swim speed px/s before fins
    baseBreath: 25,      // seconds of breath before training
    buoyancy: 16,        // gentle upward drift px/s^2
    surfaceRefillRate: 0.5, // fraction of max breath refilled per second at surface
    harvestRadius: 42,
    invulnTime: 0.9
  },

  breathPerTier: 10,       // +seconds per lung-training tier
  speedPerTier: 25,        // +px/s per fins tier
  conditioningPerDive: 0.4, // passive breath gain per successful dive (seconds)
  conditioningCap: 8,

  darkness: {
    startM: 16,      // depth where the dark begins
    fullM: 100,      // depth of maximum darkness
    maxAlpha: 0.93,
    baseLight: 150,  // light radius px before goggles
    lightPerTier: 90
  },

  bands: [
    { maxM: 3, name: 'The Surface' },
    { maxM: 20, name: 'The Sponge Beds' },
    { maxM: 40, name: 'The Blue Meadow' },
    { maxM: 65, name: 'The Amphora Field' },
    { maxM: 95, name: 'The Wreck of the Anemone' },
    { maxM: 123, name: "Poseidon's Trench" }
  ],

  // Loot: value in drachmae, spawn depth window (m), base seconds to gather, spawn count per dive.
  // placement: 'floor' rests on seafloor/rocks, 'water' floats free.
  lootTypes: {
    sponge: { name: 'Sponge', value: 8, minM: 3, maxM: 19, harvest: 1.1, count: 26, placement: 'floor' },
    honeycomb: { name: 'Honeycomb Sponge', value: 20, minM: 13, maxM: 34, harvest: 1.4, count: 12, placement: 'floor' },
    shard: { name: 'Amphora Shard', value: 15, minM: 16, maxM: 40, harvest: 1.0, count: 9, placement: 'floor' },
    oyster: { name: 'Pearl Oyster', value: 60, minM: 36, maxM: 64, harvest: 1.8, count: 9, placement: 'floor' },
    amphora: { name: 'Amphora', value: 90, minM: 46, maxM: 80, harvest: 2.2, count: 6, placement: 'floor' },
    helmet: { name: 'Bronze Helmet', value: 150, minM: 62, maxM: 92, harvest: 2.0, count: 3, placement: 'floor' },
    laurel: { name: 'Gold Laurel', value: 260, minM: 74, maxM: 104, harvest: 2.0, count: 3, placement: 'floor' },
    statue: { name: 'Marble Head', value: 400, minM: 88, maxM: 118, harvest: 2.6, count: 2, placement: 'floor' },
    trident: { name: 'Trident of Poseidon', value: 1500, minM: 119, maxM: 121, harvest: 3.2, count: 1, placement: 'floor' },
    coin: { name: "Poseidon's Coin", value: 400, minM: 116, maxM: 121, harvest: 1.0, count: 1, placement: 'floor' }
  },

  dangers: {
    urchin: { count: 16, minM: 5, sting: 4, radius: 12 },
    jelly: { count: 13, minM: 14, maxM: 70, sting: 6, radius: 21, driftSpeed: 14 },
    eel: { count: 6, minM: 38, maxM: 92, sting: 8, alertRadius: 230, lungeSpeed: 420, extent: 235, cooldown: 2.5, radius: 12 },
    shark: {
      count: 5, minM: 62, maxM: 118, sting: 10, radius: 26,
      patrolSpeed: 120, chaseSpeed: 195, detectRadius: 340,
      ceilingM: 55,   // sharks give up above this depth — climb to escape
      cooldown: 4
    }
  },

  // Shop catalog. tiers[i] = drachma cost to reach tier i+1.
  // levels[i] = human label for what tier i+1 gives you (levels[-1]-style base label first).
  upgrades: [
    {
      id: 'breath', icon: '🫧', name: "Pearl-Diver's Lungs",
      flavor: 'Certified by the Kalymnos Apnea Academy, est. 512 BC.',
      what: 'Breath hold',
      tiers: [50, 150, 400, 900, 2000],
      levels: ['25 s', '35 s', '45 s', '55 s', '65 s', '75 s']
    },
    {
      id: 'fins', icon: '🪽', name: 'Fins of Hermes',
      flavor: 'Bronze-winged. Hermes takes 2% royalties.',
      what: 'Swim speed',
      tiers: [40, 120, 350, 800, 1800],
      levels: ['steady', 'brisk', 'quick', 'swift', 'darting', 'god-tier']
    },
    {
      id: 'stone', icon: '🪨', name: 'Skandalopetra',
      flavor: 'A rock. But a really, really good rock.',
      what: 'Descent speed, hold ↓',
      tiers: [80, 240, 700],
      levels: ['—', '+50%', '+100%', '+150%']
    },
    {
      id: 'light', icon: '🫒', name: 'Olive-Oil Goggles',
      flavor: 'Lens tech of the ancients. Extra virgin, obviously.',
      what: 'Light in the deep',
      tiers: [70, 220, 650],
      levels: ['dim', 'clear', 'bright', 'radiant']
    },
    {
      id: 'bag', icon: '🧺', name: 'Woven Net Bag',
      flavor: 'Woven by the Fates. Lifetime warranty.',
      what: 'Carry capacity',
      tiers: [60, 200, 600],
      levels: ['6 items', '10 items', '14 items', '18 items']
    },
    {
      id: 'knife', icon: '🗡️', name: 'Diving Knife',
      flavor: "From Hephaestus' clearance sale. Barely forge-damaged.",
      what: 'Gathering speed',
      tiers: [50, 180, 500],
      levels: ['bronze', 'iron', 'steel', 'legend']
    },
    {
      id: 'charm', icon: '🧿', name: "Nereid's Charm",
      flavor: 'Nereid-approved sting protection. SPF infinity.',
      what: 'Stings hurt less',
      tiers: [150, 450],
      levels: ['—', '−25%', '−50%']
    },
    {
      id: 'favor', icon: '🔱', name: "Poseidon's Favor",
      flavor: 'The god personally guarantees your catch. Terms apply.',
      what: 'Keep your catch if you black out',
      tiers: [1200],
      levels: ['no', 'yes']
    }
  ],

  bagBase: 6,
  bagPerTier: 4,
  knifeMults: [1, 0.75, 0.55, 0.4],   // harvest-time multiplier by knife tier
  stoneMults: [1, 1.5, 2.0, 2.5],     // descent-speed multiplier by stone tier
  charmResist: [0, 0.25, 0.5]         // sting reduction by charm tier
}

// ---------- Derived stats (all pure: read state, return a number) ----------

// Pure: max breath in seconds for current training + conditioning
SD.maxBreath = function (state) {
  return SD.config.player.baseBreath + state.upgrades.breath * SD.config.breathPerTier + state.conditioning
}

// Pure: max swim speed px/s for current fins
SD.maxSpeed = function (state) {
  return SD.config.player.baseSpeed + state.upgrades.fins * SD.config.speedPerTier
}

// Pure: light radius px for current goggles
SD.lightRadius = function (state) {
  return SD.config.darkness.baseLight + state.upgrades.light * SD.config.darkness.lightPerTier
}

// Pure: net bag capacity in items
SD.bagSize = function (state) {
  return SD.config.bagBase + state.upgrades.bag * SD.config.bagPerTier
}

// Pure: harvest-time multiplier for current knife (lower is faster)
SD.harvestMult = function (state) {
  return SD.config.knifeMults[state.upgrades.knife]
}

// Pure: descent-speed multiplier when holding down, for current stone
SD.descentMult = function (state) {
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

// Pure: band descriptor for a given depth in meters
SD.bandAt = function (depthM) {
  var bands = SD.config.bands
  for (var i = 0; i < bands.length; i++) {
    if (depthM <= bands[i].maxM) return bands[i]
  }
  return bands[bands.length - 1]
}
