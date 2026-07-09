// Σφουγγαράς — Sponge Diver
// The sea itself. Generated ONCE from a fixed seed — ~1.3 km of coast-to-
// mountain geography: the village, the rolling Sponge Grounds and their
// winding cave, the Seagrass Meadows, the great Kelp Forest and its 80 m
// well, the Pearl Banks, the Sunken Quarry, the Graveyard of Ships,
// Hephaestus' Vents, Poseidon's Plain, the Kraken's Grotto, the Eastern
// Rise, Aphrodite's Lagoon with the Blue Hole, and the hollow Temple
// Mountain. Loot regrows on timers; the geography never changes.

var SD = window.SD || {}
window.SD = SD

// Pure: seafloor depth in meters at a given world x.
// Smoothstep-blended control points + a gentle wobble that fades out
// near the beaches so the shorelines stay clean.
SD.floorDepthAt = function (x) {
  var pts = SD.config.world.floorPoints
  var m = pts[pts.length - 1].m
  for (var i = 0; i < pts.length - 1; i++) {
    if (x <= pts[i + 1].x) {
      var t = (x - pts[i].x) / (pts[i + 1].x - pts[i].x)
      m = SD.lerp(pts[i].m, pts[i + 1].m, SD.smoothstep(0, 1, SD.clamp(t, 0, 1)))
      break
    }
  }
  var wobble = Math.sin(x * 0.004) * 1.6 + Math.sin(x * 0.013) * 0.9
  m += wobble * SD.clamp(m / 10, 0, 1)
  // the Anemone's Grave: the crevasse she tore open when she fell
  if (SD.worldFlags && SD.worldFlags.anemoneFell) {
    var gw = SD.config.giantWreckX + 50
    var t2 = 1 - Math.abs(x - gw) / 260
    if (t2 > 0) m += 44 * SD.smoothstep(0, 1, t2)
  }
  return m
}

// Pure: seafloor y in px at a given world x
SD.floorYAt = function (x) {
  return SD.floorDepthAt(x) * SD.config.pxPerM
}

// Pure: true when x lies in a named zone range {x1, x2}
function inRange (x, zone) {
  return x >= zone.x1 && x <= zone.x2
}

// Pure: rocks resting on the seafloor — boulders sunk a little into the
// sand, stacked pairs, wall ledges, arena cover, and the hollow mountain.
function makeRocks (rng) {
  var cfg = SD.config.world
  var rocks = []

  // Side effect on rocks: drops one boulder onto the floor at x, returns it
  function drop (x, r) {
    var rock = { x: x, y: SD.floorYAt(x) - r * 0.57, r: r }
    rocks.push(rock)
    return rock
  }

  // sponge-host boulders wherever the bottom is shallow (3–22 m)
  var i, x
  for (i = 0; i < 85; i++) {
    for (var tries = 0; tries < 30; tries++) {
      x = SD.rngRange(rng, 250, 39500)
      var m = SD.floorDepthAt(x)
      if (m >= 3 && m <= 22) break
    }
    var base = drop(x, SD.rngRange(rng, 30, 62))
    if (rng() < 0.25) { // a second boulder perched on the first
      rocks.push({ x: base.x + SD.rngRange(rng, -12, 12), y: base.y - base.r * 0.75, r: base.r * SD.rngRange(rng, 0.45, 0.6) })
    }
  }

  // mid-depth field boulders (24–100 m) — eel homes, urchin perches.
  // The Anemone's grave is kept clear; she needs no company.
  for (i = 0; i < 70; i++) {
    for (var t2 = 0; t2 < 30; t2++) {
      x = SD.rngRange(rng, 9000, 37000)
      var m2 = SD.floorDepthAt(x)
      if (m2 >= 24 && m2 <= 100 && Math.abs(x - SD.config.giantWreckX) > 900) break
    }
    drop(x, SD.rngRange(rng, 40, 88))
  }

  // the plain's walls — buried ledge boulders down both descents
  for (i = 0; i < 6; i++) {
    x = SD.rngRange(rng, 28100, 28700)
    var lr = SD.rngRange(rng, 60, 100)
    rocks.push({ x: x, y: SD.floorYAt(x) - lr * 0.3, r: lr })
    x = SD.rngRange(rng, 32500, 33300)
    var lr2 = SD.rngRange(rng, 60, 100)
    rocks.push({ x: x, y: SD.floorYAt(x) - lr2 * 0.3, r: lr2 })
  }

  // arena cover on Poseidon's Plain — something to dodge behind at speed
  drop(29300, 95)
  drop(29900, 75)
  drop(31200, 90)
  drop(31900, 80)

  // the grotto's brow — a heavy roof over the Kraken's slot
  rocks.push({ x: cfg.grottoX - 130, y: SD.floorYAt(cfg.grottoX - 160) - 60, r: 95 })
  rocks.push({ x: cfg.grottoX + 140, y: SD.floorYAt(cfg.grottoX + 170) - 55, r: 90 })
  rocks.push({ x: cfg.grottoX + 10, y: (92 * SD.config.pxPerM) - 40, r: 85 }) // the lintel over the den

  return rocks
}

// Pure: the winding Divers' Cave — staggered ledges over the deep slot in
// the sponge grounds force a zig-zag descent into the fino chamber.
function makeCave () {
  var cx = SD.config.world.caveX
  var floorY = SD.floorYAt(cx) // ~33 m at the slot bottom
  var lipY = 17 * 32           // the surrounding ground
  return {
    x: cx,
    y: (floorY + lipY) / 2,
    r: 210,
    rocks: [
      // the roof over the slot, leaving a mouth on the left
      { x: cx + 40, y: lipY - 10, r: 95 },
      { x: cx + 155, y: lipY + 15, r: 75 },
      // staggered ledges: left wall, then right, then left — the winding way
      { x: cx - 130, y: lipY + 130, r: 70 },
      { x: cx + 120, y: lipY + 250, r: 78 },
      { x: cx - 115, y: lipY + 390, r: 72 }
    ],
    finoSpots: [
      { x: cx - 55, y: floorY - 10 },
      { x: cx - 5, y: floorY - 8 },
      { x: cx + 55, y: floorY - 12 },
      { x: cx - 90, y: floorY - 60 },
      { x: cx + 90, y: floorY - 70 },
      { x: cx + 30, y: floorY - 130 },
      { x: cx - 40, y: floorY - 190 },
      { x: cx + 70, y: floorY - 240 }
    ],
    bottleSpot: { x: cx + 8, y: floorY - 14 }
  }
}

// Pure: ledge rocks that make the Kelp Well and the Blue Hole into winding
// descents rather than open elevator shafts, plus their treasure spots.
function makeShafts () {
  var w = SD.config.world
  var out = { rocks: [], wellLoot: [], holeLoot: [] }

  // the Kelp Well: dark, narrow, ~80 m
  var wx = w.kelpWellX
  out.rocks.push(
    { x: wx - 95, y: 30 * 32, r: 62 },
    { x: wx + 95, y: 44 * 32, r: 66 },
    { x: wx - 90, y: 58 * 32, r: 60 },
    { x: wx + 85, y: 70 * 32, r: 58 }
  )
  var wellFloor = SD.floorYAt(wx)
  out.wellLoot = [
    { type: 'laurel', x: wx - 40, y: wellFloor - 12 },
    { type: 'laurel', x: wx + 45, y: wellFloor - 10 },
    { type: 'statue', x: wx + 4, y: wellFloor - 16 }
  ]

  // the Blue Hole: bright turquoise shaft in the lagoon, ~65 m
  var bx = w.blueHoleX
  out.rocks.push(
    { x: bx - 100, y: 20 * 32, r: 58 },
    { x: bx + 100, y: 34 * 32, r: 60 },
    { x: bx - 92, y: 48 * 32, r: 56 }
  )
  var holeFloor = SD.floorYAt(bx)
  out.holeLoot = [
    { type: 'oyster', x: bx - 35, y: holeFloor - 10 },
    { type: 'oyster', x: bx + 40, y: holeFloor - 12 },
    { type: 'helmet', x: bx + 5, y: holeFloor - 14 },
    { type: 'laurel', x: bx - 70, y: holeFloor - 40 }
  ]

  return out
}

// Pure: the Anemone — a giant merchant wreck lying breached in the
// Graveyard. Hidden collision stones trace her hull; a gap in the upper
// planking lets a diver swim into the cargo hold and rob the dead.
function makeGiantWreck (state) {
  var wx = SD.config.giantWreckX
  var S = 2.1 // she was a great ship — ~45 m of her
  if (SD.worldFlags.anemoneFell) {
    // she lies stern-down in the crevasse she tore open
    var gy = SD.floorYAt(wx + 50)
    return {
      x: wx + 50,
      y: gy,
      scale: S,
      fallen: true,
      rocks: [
        { x: wx - 120, y: gy - 420, r: 130, hidden: true }, // the raised bow
        { x: wx + 40, y: gy - 240, r: 120, hidden: true },  // amidships, tilted
        { x: wx + 130, y: gy - 60, r: 110, hidden: true }   // the buried stern
      ],
      lootSpots: [
        { type: 'laurel', x: wx - 10, y: gy - 14 },
        { type: 'laurel', x: wx + 90, y: gy - 12 },
        { type: 'helmet', x: wx + 40, y: gy - 16 },
        { type: 'amphora', x: wx - 60, y: gy - 14 },
        { type: 'amphora', x: wx + 140, y: gy - 15 }
      ]
    }
  }
  var floorY = SD.floorYAt(wx)
  // hidden hull walls (drawn as timber by drawGiantWreck, not as stone)
  var rocks = [
    { x: wx - 240 * S, y: floorY - 70 * S, r: 72 * S * 0.92, hidden: true },  // the bow
    { x: wx - 130 * S, y: floorY - 138 * S, r: 55 * S * 0.92, hidden: true }, // fore deck
    { x: wx - 10 * S, y: floorY - 150 * S, r: 55 * S * 0.92, hidden: true },  // mid deck
    // — the breach: open water amidships up top —
    { x: wx + 205 * S, y: floorY - 130 * S, r: 58 * S * 0.92, hidden: true }, // aft deck
    { x: wx + 262 * S, y: floorY - 66 * S, r: 70 * S * 0.92, hidden: true }   // the stern
  ]
  return {
    x: wx,
    y: floorY,
    scale: S,
    rocks: rocks,
    lootSpots: [
      { type: 'amphora', x: wx - 130 * S, y: floorY - 16 },
      { type: 'amphora', x: wx - 55 * S, y: floorY - 14 },
      { type: 'amphora', x: wx + 40 * S, y: floorY - 15 },
      { type: 'shard', x: wx - 90 * S, y: floorY - 12 },
      { type: 'helmet', x: wx + 10 * S, y: floorY - 60 },
      { type: 'laurel', x: wx + 95 * S, y: floorY - 16 },
      { type: 'laurel', x: wx - 20 * S, y: floorY - 90 },
      { type: 'statue', x: wx - 300 * S, y: floorY - 12 }, // spilled at the bow, half-buried
      { type: 'strongbox', x: wx + 120, y: floorY - 18 }    // the captain's box — her ballast, and her doom
    ]
  }
}

// Pure: the one-time wonders and the story's bones — found gear origins,
// the Great Pearl in its jelly ring, the sealed ways, Nikandros' bottles,
// and the quiet dead who tried before you.
function makeSpecials (state) {
  var cfg = SD.config
  var out = { rocks: [], loot: [], jellies: [], decor: {} }

  function item (type, x, y, extra) {
    var it = { type: type, x: x, y: y, phase: 0, progress: 0, taken: false, respawnAt: 0 }
    if (extra) for (var k in extra) it[k] = extra[k]
    out.loot.push(it)
  }

  // — the Statue of Hermes, in a shallow alcove of the sponge grounds —
  var hx = cfg.hermesX
  var hFloor = SD.floorYAt(hx)
  out.rocks.push(
    { x: hx - 95, y: hFloor - 44, r: 55 },
    { x: hx + 95, y: hFloor - 40, r: 52 },
    { x: hx + 8, y: hFloor - 118, r: 62 } // the roof over the god
  )
  out.decor.hermes = { x: hx, y: hFloor }
  if (!state.relics.fins) item('hermesFins', hx + 26, hFloor - 12)

  // — the pearl-trader's bones, goggles still in his kit —
  var kx = cfg.pearlKitX
  out.decor.pearlKit = { x: kx, y: SD.floorYAt(kx) }
  if (!state.relics.sight) item('pearlKit', kx + 18, SD.floorYAt(kx) - 10)

  // — the great dead grouper in the meadows, an old kamaki through it —
  var gx = cfg.grouperX
  out.decor.carcass = { x: gx, y: SD.floorYAt(gx) }
  if (!state.relics.hunt) item('grouperKamaki', gx + 12, SD.floorYAt(gx) - 22)

  // — the Great Pearl, ringed by jellyfish, sealed to all but a legend edge —
  var px = cfg.greatPearlX
  var pFloor = SD.floorYAt(px)
  item('greatPearl', px, pFloor - 14)
  for (var j = 0; j < 8; j++) {
    var ja = (j / 8) * Math.PI * 2
    out.jellies.push({
      x: px + Math.cos(ja) * 120,
      y: pFloor - 90 + Math.sin(ja) * 70,
      baseY: pFloor - 90 + Math.sin(ja) * 70,
      phase: ja, drift: 0
    })
  }

  // — the sealed ways —
  if (!SD.worldFlags.wellTunnel) item('blockage', cfg.wellMouthA.x, cfg.wellMouthA.y)
  if (!SD.worldFlags.quarryOpen) item('slab', cfg.quarrySlabX, SD.floorYAt(cfg.quarrySlabX) - 20)
  if (SD.worldFlags.quarryOpen) {
    // the opened alcove keeps its cache
    var qx = cfg.quarrySlabX
    item('statue', qx + 40, SD.floorYAt(qx + 40) - 14)
    item('statue', qx + 95, SD.floorYAt(qx + 95) - 12)
    item('laurel', qx + 65, SD.floorYAt(qx + 65) - 30)
  }

  // — Nikandros' trail: six bottles, each where its warning matters —
  for (var b = 0; b < cfg.bottles.length; b++) {
    if (state.bottlesRead[b]) continue
    var bb = cfg.bottles[b]
    item('bottle', bb.x, SD.floorYAt(bb.x) + (bb.dy || -12), { idx: b })
  }
  // his bones, beside the hoard
  out.decor.nikandros = { x: 30480, y: SD.floorYAt(30480) }

  // — three more divers who never surfaced, each with a keepsake —
  var bones = [
    { x: 12480, trinket: 'shard' },   // the kelp took him
    { x: 23150, trinket: 'laurel' },  // the sharks found her
    { x: 26550, trinket: 'obsidian' } // the fires kept him warm, at least
  ]
  out.decor.skeletons = []
  for (var s = 0; s < bones.length; s++) {
    var sx = bones[s].x
    out.decor.skeletons.push({ x: sx, y: SD.floorYAt(sx) })
    item(bones[s].trinket, sx + 24, SD.floorYAt(sx + 24) - 10)
  }

  return out
}

// Pure: the kelp forest — 5 km of stalks with hidden clearings, rooted in
// the sand, grown to the surface. The Well's mouth hides in a clearing.
function makeKelp (rng) {
  var cfg = SD.config.world
  var kcfg = SD.config.dangers.kelp
  var kelp = []
  var clearings = [10250, cfg.kelpWellX, 12900] // glades in the weeds
  var span = cfg.kelpX2 - cfg.kelpX1
  for (var s = 0; s < kcfg.stalks; s++) {
    if (rng() < kcfg.gapChance) continue // small gaps to catch your breath
    var sx = cfg.kelpX1 + (s / kcfg.stalks) * span + SD.rngRange(rng, -14, 14)
    var clear = false
    for (var c = 0; c < clearings.length; c++) {
      if (Math.abs(sx - clearings[c]) < 170) clear = true
    }
    if (clear) continue
    var baseY = SD.floorYAt(sx)
    if (baseY > 24 * 32) continue // no kelp down the Well
    var topY = SD.rngRange(rng, -6, 60)
    kelp.push({
      x: sx,
      baseY: baseY,
      h: Math.max(70, baseY - topY),
      phase: rng() * SD.TAU,
      sway: SD.rngRange(rng, 4, 8) + baseY * 0.012
    })
  }
  // stray fringe on the lagoon's west edge
  for (var p = 0; p < 12; p++) {
    var px = SD.rngRange(rng, 37000, 37500)
    var pm = SD.floorDepthAt(px)
    if (pm < 5 || pm > 20) continue
    kelp.push({
      x: px,
      baseY: SD.floorYAt(px),
      h: SD.rngRange(rng, 100, Math.max(140, pm * SD.config.pxPerM * 0.9)),
      phase: rng() * SD.TAU,
      sway: SD.rngRange(rng, 4, 9)
    })
  }
  return kelp
}

// Pure: the animals of the sea — fish everywhere the depth suits them,
// a bonus crowd in Aphrodite's Lagoon, and the boss cast in their lairs.
function makeFauna (rng) {
  var cfg = SD.config.world
  var out = []

  // Side effect on out: one fish of a kind near x (or anywhere suitable)
  function spawnFish (kind, forceX1, forceX2) {
    var f = SD.config.fauna[kind]
    var fx = 0
    var fd = 0
    for (var tries = 0; tries < 60; tries++) {
      fx = forceX1 ? SD.rngRange(rng, forceX1, forceX2) : SD.rngRange(rng, 350, 39400)
      var fmax = Math.min(f.maxM, SD.floorDepthAt(fx) - 3)
      if (fmax > f.minM) {
        fd = SD.rngRange(rng, f.minM, fmax)
        break
      }
    }
    if (!fd) return
    out.push({
      kind: kind,
      x: fx, y: fd * SD.config.pxPerM,
      homeY: fd * SD.config.pxPerM,
      vx: (rng() < 0.5 ? -1 : 1) * f.cruise,
      vy: 0,
      mode: 'cruise',
      fleeT: 0,
      taken: false,
      respawnAt: 0,
      phase: rng() * SD.TAU
    })
  }

  for (var kind in SD.config.fauna) {
    for (var i = 0; i < SD.config.fauna[kind].count; i++) spawnFish(kind)
  }
  // Aphrodite's Lagoon teems with easy tribute
  for (var m = 0; m < SD.config.lagoonFishBonus.mullet; m++) spawnFish('mullet', cfg.lagoon.x1 + 100, cfg.lagoon.x2 - 100)
  for (var b = 0; b < SD.config.lagoonFishBonus.bream; b++) spawnFish('bream', cfg.lagoon.x1 + 100, cfg.lagoon.x2 - 100)

  // — the boss cast —
  var bz = SD.config.bosses
  out.push({
    kind: 'karcharias', boss: true,
    x: 22200, y: 70 * 32, homeX: 22200, homeY: 70 * 32,
    vx: bz.karcharias.cruise || 60, vy: 0,
    hp: bz.karcharias.hp, maxHp: bz.karcharias.hp,
    mode: 'patrol', modeT: 0, angle: 0, dir: 1,
    taken: false, respawnAt: 0, phase: rng() * SD.TAU
  })
  out.push({
    kind: 'kraken', boss: true,
    x: cfg.grottoX, y: SD.floorYAt(cfg.grottoX) - 60,
    homeX: cfg.grottoX, homeY: SD.floorYAt(cfg.grottoX) - 60,
    vx: 0, vy: 0,
    hp: bz.kraken.hp, maxHp: bz.kraken.hp,
    mode: 'lurk', modeT: 0, grabT: 0, dir: -1,
    taken: false, respawnAt: 0, phase: rng() * SD.TAU
  })
  out.push({
    kind: 'ketos', boss: true,
    x: SD.rngRange(rng, bz.ketos.x1, bz.ketos.x2), y: 90 * 32,
    homeX: 0, homeY: 0,
    vx: bz.ketos.cruise, vy: 0,
    hp: bz.ketos.hp, maxHp: bz.ketos.hp,
    mode: 'roam', modeT: 0, dir: 1,
    taken: false, respawnAt: 0, phase: rng() * SD.TAU
  })

  return out
}

// Pure: horizontal current bands in open water, stronger with depth
function makeCurrents (rng) {
  var cfg = SD.config.world
  var ccfg = SD.config.dangers.current
  var out = []
  for (var i = 0; i < ccfg.count; i++) {
    var m = SD.rngRange(rng, ccfg.minM, ccfg.maxM)
    var w = SD.rngRange(rng, ccfg.minW, ccfg.maxW)
    var x = 0
    for (var tries = 0; tries < 60; tries++) {
      x = SD.rngRange(rng, 9000, 37000 - w)
      if (SD.floorDepthAt(x) > m + 6 && SD.floorDepthAt(x + w) > m + 6) break
    }
    var deepBoost = 1 + m / 140
    out.push({
      x: x,
      y: m * SD.config.pxPerM,
      w: w,
      h: SD.rngRange(rng, ccfg.minH, ccfg.maxH),
      force: (rng() < 0.5 ? -1 : 1) * SD.rngRange(rng, ccfg.minForce, ccfg.maxForce) * deepBoost,
      phase: rng() * SD.TAU
    })
  }
  return out
}

// Pure: find a spawn spot for a loot type, respecting the seafloor and zones
function lootSpot (rng, type, rocks) {
  var cfg = SD.config.world
  var info = SD.config.lootTypes[type]
  var spongey = type === 'sponge' || type === 'honeycomb' || type === 'octopus'
  for (var tries = 0; tries < 60; tries++) {
    var x
    if (info.zone === 'weedy') {
      // murex live where the greenery is: kelp, seagrass, or the lagoon
      var pickZone = rng()
      x = pickZone < 0.45 ? SD.rngRange(rng, cfg.kelpX1 + 40, cfg.kelpX2 - 40)
        : pickZone < 0.8 ? SD.rngRange(rng, cfg.seagrass.x1 + 40, cfg.seagrass.x2 - 40)
          : SD.rngRange(rng, cfg.lagoon.x1 + 60, cfg.lagoon.x2 - 60)
    } else if (info.zone === 'vents') {
      x = SD.rngRange(rng, cfg.ventsZone.x1 + 60, cfg.ventsZone.x2 - 60)
    } else {
      x = SD.rngRange(rng, 220, 39500)
    }
    var floorM = SD.floorDepthAt(x)

    // sponges grow on boulder rims; octopus den in them too
    if (spongey && rng() < 0.6) {
      var hosts = rocks.filter(function (r) {
        var rimM = SD.depthM(r.y - r.r * 0.82)
        return r.x < 39500 && rimM >= info.minM - 2 && rimM <= info.maxM
      })
      if (hosts.length) {
        var rock = SD.rngPick(rng, hosts)
        var ang = SD.rngRange(rng, -Math.PI * 0.8, -Math.PI * 0.2)
        return {
          x: rock.x + Math.cos(ang) * rock.r * 0.9,
          y: rock.y + Math.sin(ang) * rock.r * 0.76
        }
      }
    }

    // otherwise it rests on the seafloor, if the floor here is in the window
    if (floorM >= info.minM && floorM <= info.maxM) {
      return { x: x, y: (floorM - SD.rngRange(rng, 0.2, 0.6)) * SD.config.pxPerM }
    }
  }
  return null
}

// Pure: one loot item record. Taken items regrow after their timer.
function lootItem (type, x, y, phase) {
  return { type: type, x: x, y: y, phase: phase, progress: 0, taken: false, respawnAt: 0 }
}

// Pure: all loot for the whole sea — zone spawns, the cave, the shafts,
// the kelp clearings and their wreck, and the hoard on the plain
function makeLoot (state, rng, rocks, cave, shafts, kelpWreckX) {
  var cfg = SD.config.world
  var loot = []
  var types = SD.config.lootTypes
  var i

  for (var type in types) {
    if (types[type].placement !== 'floor') continue
    for (i = 0; i < types[type].count; i++) {
      var spot = lootSpot(rng, type, rocks)
      if (spot) {
        var item = lootItem(type, spot.x, spot.y, rng() * SD.TAU)
        // Poseidon's coins sleep until the trident is claimed
        if (type === 'coin' && !state.tridentClaimed) item.taken = true
        loot.push(item)
      }
    }
  }

  // — the Divers' Cave: primo finos, and the bottle that started it all —
  for (i = 0; i < cave.finoSpots.length; i++) {
    loot.push(lootItem('fino', cave.finoSpots[i].x, cave.finoSpots[i].y, rng() * SD.TAU))
  }
  if (!state.bottleRead) {
    loot.push(lootItem('bottle', cave.bottleSpot.x, cave.bottleSpot.y, 0))
  }

  // — the Kelp Well and the Blue Hole pay for the dive —
  for (i = 0; i < shafts.wellLoot.length; i++) {
    loot.push(lootItem(shafts.wellLoot[i].type, shafts.wellLoot[i].x, shafts.wellLoot[i].y, rng() * SD.TAU))
  }
  for (i = 0; i < shafts.holeLoot.length; i++) {
    loot.push(lootItem(shafts.holeLoot[i].type, shafts.holeLoot[i].x, shafts.holeLoot[i].y, rng() * SD.TAU))
  }

  // — kelp clearings hold small caches; the swallowed kaiki holds better —
  var clearings = [10250, 12900]
  for (var c = 0; c < clearings.length; c++) {
    for (var mrx = 0; mrx < 3; mrx++) {
      var mx = clearings[c] + SD.rngRange(rng, -120, 120)
      loot.push(lootItem('murex', mx, SD.floorYAt(mx) - 8, rng() * SD.TAU))
    }
    var shx = clearings[c] + SD.rngRange(rng, -80, 80)
    loot.push(lootItem('shard', shx, SD.floorYAt(shx) - 8, rng() * SD.TAU))
  }
  loot.push(lootItem('amphora', kelpWreckX - 40, SD.floorYAt(kelpWreckX - 40) - 12, 0))
  loot.push(lootItem('helmet', kelpWreckX + 55, SD.floorYAt(kelpWreckX + 55) - 10, 0))
  loot.push(lootItem('shard', kelpWreckX + 10, SD.floorYAt(kelpWreckX + 10) - 34, 0))

  // — the hoard on Poseidon's Plain: trident on the shrine, the great chest —
  var vx = cfg.vaultX
  if (!state.tridentClaimed) {
    loot.push(lootItem('trident', vx, SD.floorYAt(vx) - 46, 0))
  }
  loot.push(lootItem('chest', vx + 170, SD.floorYAt(vx + 170) - 16, 0))

  return loot
}

// Side effect on state.world.loot: regrows taken loot whose timer has passed.
// The trident and the bottle never regrow; coins wait for the trident.
SD.updateLootRegrow = function (state) {
  var loot = state.world.loot
  for (var i = 0; i < loot.length; i++) {
    var item = loot[i]
    if (!item.taken || item.dropped) continue
    var info = SD.config.lootTypes[item.type]
    if (!info.regrow) continue
    if (item.type === 'coin' && !state.tridentClaimed) continue
    if (item.type === 'coin' && !item.respawnAt) {
      item.respawnAt = state.time + SD.randRange(4, 30) // stagger the first coins after the trident falls
      continue
    }
    if (state.time >= item.respawnAt) {
      item.taken = false
      item.progress = 0
    }
  }
}

// Pure: dangers for the sea — placed once, they live here
function makeDangers (rng, rocks) {
  var cfg = SD.config.world
  var d = SD.config.dangers
  var out = { urchins: [], jellies: [], eels: [], sharks: [], squids: [], vents: [], poseidon: null }
  var i, tries

  var candidates = rocks.filter(function (r) { return r.x > 200 && r.x < 39500 })
  var urchinRocks = candidates.filter(function (r) { return SD.depthM(r.y) >= d.urchin.minM })

  for (i = 0; i < d.urchin.count && urchinRocks.length; i++) {
    var rock = SD.rngPick(rng, urchinRocks)
    var ang = SD.rngRange(rng, -Math.PI * 0.85, -Math.PI * 0.15)
    out.urchins.push({
      x: rock.x + Math.cos(ang) * rock.r,
      y: rock.y + Math.sin(ang) * rock.r,
      phase: rng() * SD.TAU
    })
  }

  // Side effect on out: one jelly drifting near x (or anywhere suitable)
  function spawnJelly (x1, x2) {
    for (var jt = 0; jt < 40; jt++) {
      var jx = SD.rngRange(rng, x1, x2)
      var jmax = Math.min(d.jelly.maxM, SD.floorDepthAt(jx) - 4)
      if (jmax > d.jelly.minM) {
        var jd = SD.rngRange(rng, d.jelly.minM, jmax)
        out.jellies.push({
          x: jx, y: jd * SD.config.pxPerM, baseY: jd * SD.config.pxPerM,
          phase: rng() * SD.TAU, drift: SD.rngRange(rng, -1, 1)
        })
        return
      }
    }
  }
  for (i = 0; i < d.jelly.count; i++) spawnJelly(300, 39400)
  for (i = 0; i < 8; i++) spawnJelly(cfg.pearls.x1, cfg.pearls.x2) // curtains over the Pearl Banks

  var eelRocks = candidates.filter(function (r) {
    var m = SD.depthM(r.y)
    return m > d.eel.minM && m < d.eel.maxM && r.r > 45
  })
  for (i = 0; i < d.eel.count && eelRocks.length; i++) {
    var home = eelRocks.splice(Math.floor(rng() * eelRocks.length), 1)[0]
    out.eels.push({
      homeX: home.x, homeY: home.y, r: home.r,
      x: home.x, y: home.y,
      mode: 'lurk', cooldown: 0, targetX: 0, targetY: 0, bit: false,
      phase: rng() * SD.TAU
    })
  }

  // reef sharks over the quarry + graveyard; abyss sharks on the plain
  function makeShark (scfg, x1, x2, kind) {
    var sx = SD.rngRange(rng, x1, x2)
    var smax = Math.min(scfg.maxM, SD.floorDepthAt(sx) - 5)
    var sd = SD.rngRange(rng, scfg.minM, Math.max(smax, scfg.minM + 2))
    return {
      kind: kind,
      x: sx, y: sd * SD.config.pxPerM,
      x1: x1, x2: x2, dir: rng() < 0.5 ? -1 : 1,
      mode: 'patrol', cooldown: 0, phase: rng() * SD.TAU
    }
  }
  for (i = 0; i < 2; i++) out.sharks.push(makeShark(d.shark, cfg.quarry.x1, cfg.quarry.x2, 'reef'))
  for (i = 0; i < 4; i++) out.sharks.push(makeShark(d.shark, cfg.graveyard.x1, cfg.graveyard.x2, 'reef'))
  for (i = 0; i < d.abyssShark.count; i++) {
    out.sharks.push(makeShark(d.abyssShark, 28600, 32600, 'abyss'))
  }

  // Side effect on out: one squid in deep water between x1..x2
  function spawnSquid (x1, x2) {
    for (var qt = 0; qt < 40; qt++) {
      var qx = SD.rngRange(rng, x1, x2)
      var qmax = Math.min(d.squid.maxM, SD.floorDepthAt(qx) - 6)
      if (qmax > d.squid.minM) {
        var qd = SD.rngRange(rng, d.squid.minM, qmax)
        out.squids.push({
          x: qx, y: qd * SD.config.pxPerM, baseY: qd * SD.config.pxPerM,
          dir: rng() < 0.5 ? -1 : 1, cooldown: 0, phase: rng() * SD.TAU
        })
        return
      }
    }
  }
  for (i = 0; i < 7; i++) spawnSquid(17000, 36000)

  // Hephaestus' Vents — columns of rising water off the volcanic shelf
  for (i = 0; i < SD.config.ventCount; i++) {
    var vx = cfg.ventsZone.x1 + 200 + (i / SD.config.ventCount) * (cfg.ventsZone.x2 - cfg.ventsZone.x1 - 400) + SD.rngRange(rng, -120, 120)
    out.vents.push({ x: vx, y: SD.floorYAt(vx), phase: rng() * SD.TAU })
  }

  // — Poseidon, sovereign of the plain —
  var px = cfg.vaultX - 40
  out.poseidon = {
    homeX: px,
    homeY: SD.floorYAt(px) - 140,
    x: px,
    y: SD.floorYAt(px) - 140,
    facing: -1,
    awake: false,
    mode: 'idle',
    modeT: 0,
    thrust: 0,
    stabAngle: 0,
    phase: rng() * SD.TAU
  }

  return out
}

// Pure: ambient fish schools, purely decorative
function makeFish (rng) {
  var schools = []
  for (var i = 0; i < 30; i++) {
    var fx = SD.rngRange(rng, 400, 39400)
    var fd = SD.rngRange(rng, 4, Math.max(8, Math.min(80, SD.floorDepthAt(fx) - 8)))
    var n = 4 + Math.floor(rng() * 6)
    var fish = []
    for (var j = 0; j < n; j++) {
      fish.push({ ox: SD.rngRange(rng, -46, 46), oy: SD.rngRange(rng, -26, 26), phase: rng() * SD.TAU })
    }
    schools.push({
      x: fx, y: fd * SD.config.pxPerM, dir: rng() < 0.5 ? -1 : 1,
      speed: SD.rngRange(rng, 18, 40), fish: fish, size: SD.rngRange(rng, 4, 7)
    })
  }
  return schools
}

// Pure: background decor — grass, seagrass meadows, columns, wrecks, the
// quarry's cut marble, gorgonian fans, seahorses, the hoard, the shrine
function makeDecor (rng, kelpWreckX) {
  var cfg = SD.config.world
  var i

  var grass = []
  for (i = 0; i < 220; i++) {
    var gx = SD.rngRange(rng, 250, 39500)
    if (SD.floorDepthAt(gx) < 2) continue
    grass.push({ x: gx, y: SD.floorYAt(gx), h: SD.rngRange(rng, 18, 52), phase: rng() * SD.TAU })
  }
  // the Seagrass Meadows themselves: tall posidonia, thick as a carpet
  for (i = 0; i < 160; i++) {
    var sx = SD.rngRange(rng, cfg.seagrass.x1, cfg.seagrass.x2)
    grass.push({ x: sx, y: SD.floorYAt(sx), h: SD.rngRange(rng, 44, 96), phase: rng() * SD.TAU })
  }

  var columns = []
  for (var c = 0; c < 10; c++) {
    var cx = 0
    for (var tries = 0; tries < 40; tries++) {
      cx = SD.rngRange(rng, 9000, 37000)
      var m = SD.floorDepthAt(cx)
      if (m > 25 && m < 100) break
    }
    columns.push({ x: cx, y: SD.floorYAt(cx), h: SD.rngRange(rng, 90, 170), tilt: SD.rngRange(rng, -0.16, 0.16), broken: rng() < 0.7 })
  }

  // wrecks: the kelp's swallowed kaiki + a fleet's graveyard, giving the
  // Anemone's huge grave a wide berth
  var wrecks = [{ x: kelpWreckX, y: SD.floorYAt(kelpWreckX) }]
  var wreckXs = [20250, 22800, 23600]
  for (i = 0; i < wreckXs.length; i++) {
    wrecks.push({ x: wreckXs[i], y: SD.floorYAt(wreckXs[i]) })
  }

  // the quarry's cut stone: a drowned industry of it — blocks, giants,
  // and a colonnade's worth of extra marble
  var blocks = []
  for (i = 0; i < 40; i++) {
    var qx = SD.rngRange(rng, cfg.quarry.x1 + 200, cfg.quarry.x2 - 200)
    blocks.push({
      x: qx, y: SD.floorYAt(qx),
      w: SD.rngRange(rng, 36, 120), h: SD.rngRange(rng, 22, 64),
      tilt: SD.rngRange(rng, -0.14, 0.14)
    })
  }
  var giants = [
    { x: 17650, y: SD.floorYAt(17650), h: 190, tilt: -0.12 },
    { x: 18200, y: SD.floorYAt(18200), h: 210, tilt: -0.18 },
    { x: 18850, y: SD.floorYAt(18850), h: 160, tilt: 0.1 },
    { x: 19200, y: SD.floorYAt(19200), h: 170, tilt: 0.24 },
    { x: 19520, y: SD.floorYAt(19520), h: 230, tilt: -0.05 }
  ]
  for (var qc = 0; qc < 6; qc++) { // fallen colonnade
    var qcx = SD.rngRange(rng, cfg.quarry.x1 + 250, cfg.quarry.x2 - 250)
    columns.push({ x: qcx, y: SD.floorYAt(qcx), h: SD.rngRange(rng, 80, 150), tilt: SD.rngRange(rng, -0.5, 0.5), broken: rng() < 0.85 })
  }

  // gorgonian fans + seahorses for the pretty shallows
  var fans = []
  for (i = 0; i < 16; i++) {
    var fx = rng() < 0.5 ? SD.rngRange(rng, cfg.seagrass.x1, cfg.seagrass.x2) : SD.rngRange(rng, cfg.lagoon.x1, cfg.lagoon.x2 - 200)
    if (SD.floorDepthAt(fx) < 3) continue
    fans.push({ x: fx, y: SD.floorYAt(fx), h: SD.rngRange(rng, 26, 54), phase: rng() * SD.TAU, pink: rng() < 0.6 })
  }
  var seahorses = []
  for (i = 0; i < 12; i++) {
    var hx = rng() < 0.5 ? SD.rngRange(rng, cfg.seagrass.x1, cfg.seagrass.x2) : SD.rngRange(rng, cfg.lagoon.x1, cfg.lagoon.x2 - 200)
    var hm = SD.floorDepthAt(hx)
    if (hm < 3) continue
    seahorses.push({ x: hx, y: SD.floorYAt(hx) - SD.rngRange(rng, 20, 60), phase: rng() * SD.TAU, dir: rng() < 0.5 ? -1 : 1 })
  }

  // gold hoard mounds heaped around the shrine on the plain
  var hoard = []
  for (var hM = 0; hM < 11; hM++) {
    var hx2 = cfg.vaultX + SD.rngRange(rng, -340, 340)
    hoard.push({
      x: hx2,
      y: SD.floorYAt(hx2),
      w: SD.rngRange(rng, 40, 100),
      h: SD.rngRange(rng, 12, 30),
      phase: rng() * SD.TAU
    })
  }

  // Pure: one lap-cruising creature — home point, lap ellipse, own pace
  function cruiser (x, y, rx, ry, spd) {
    return {
      homeX: x, homeY: y, x: x, y: y,
      rx: rx, ry: ry, spd: spd,
      lapA: rng() * SD.TAU, dir: 1, tilt: 0, phase: rng() * SD.TAU
    }
  }

  // monk seals lap the sunny shallows — the sponge grounds and the lagoon
  var seals = []
  for (i = 0; i < 4; i++) {
    var sealZone = i < 3 ? [1100, 2750] : [37700, 39200]
    for (var sTry = 0; sTry < 40; sTry++) {
      var slx = SD.rngRange(rng, sealZone[0], sealZone[1])
      var slm = SD.floorDepthAt(slx)
      if (slm > 7 && slm < 22) {
        seals.push(cruiser(slx, slm * 0.5 * SD.config.pxPerM,
          SD.rngRange(rng, 60, 110), SD.rngRange(rng, 14, 24), SD.rngRange(rng, 0.5, 0.75)))
        break
      }
    }
  }

  // mantas soar the open deeps — the banks, the graveyard, the approaches
  var mantas = []
  var mantaZones = [[14600, 16800], [21000, 23400], [27600, 33000]]
  for (i = 0; i < mantaZones.length; i++) {
    for (var mTry = 0; mTry < 40; mTry++) {
      var mnx = SD.rngRange(rng, mantaZones[i][0], mantaZones[i][1])
      var mnm = SD.floorDepthAt(mnx)
      if (mnm > 34) {
        mantas.push(cruiser(mnx, SD.rngRange(rng, 22, mnm - 14) * SD.config.pxPerM,
          SD.rngRange(rng, 130, 200), SD.rngRange(rng, 20, 34), SD.rngRange(rng, 0.16, 0.26)))
        break
      }
    }
  }

  return {
    grass: grass,
    columns: columns,
    wrecks: wrecks,
    blocks: blocks,
    giants: giants,
    fans: fans,
    seahorses: seahorses,
    seals: seals,
    mantas: mantas,
    hoard: hoard,
    shrine: { x: cfg.vaultX, y: SD.floorYAt(cfg.vaultX) }
  }
}

// Pure-ish (seeded rng): builds the one true sea. Call once at boot.
SD.genWorld = function (state) {
  var rng = SD.makeRng(SD.config.worldSeed)
  var cave = makeCave()
  var shafts = makeShafts()
  var giantWreck = makeGiantWreck(state)
  var specials = makeSpecials(state)
  var kelpWreckX = 10700
  var rocks = makeRocks(rng).concat(cave.rocks, shafts.rocks, giantWreck.rocks, specials.rocks)
  var decor = makeDecor(rng, kelpWreckX)
  decor.cave = { x: cave.x, y: cave.y, r: cave.r }
  decor.giantWreck = { x: giantWreck.x, y: giantWreck.y, scale: giantWreck.scale, fallen: !!giantWreck.fallen }
  decor.hermes = specials.decor.hermes
  decor.pearlKit = specials.decor.pearlKit
  decor.carcass = specials.decor.carcass
  decor.nikandros = specials.decor.nikandros
  decor.skeletons = specials.decor.skeletons
  var dangers = makeDangers(rng, rocks)
  // a moray keeps house in the swallowed kaiki, another in the Anemone's hold
  dangers.eels.push({
    homeX: kelpWreckX + 20, homeY: SD.floorYAt(kelpWreckX + 20) - 30, r: 60,
    x: kelpWreckX + 20, y: SD.floorYAt(kelpWreckX + 20) - 30,
    mode: 'lurk', cooldown: 0, targetX: 0, targetY: 0, bit: false, phase: 0
  })
  dangers.eels.push({
    homeX: giantWreck.x + 150, homeY: giantWreck.y - 30, r: 60,
    x: giantWreck.x + 150, y: giantWreck.y - 30,
    mode: 'lurk', cooldown: 0, targetX: 0, targetY: 0, bit: false, phase: 2
  })
  var loot = makeLoot(state, rng, rocks, cave, shafts, kelpWreckX)
  for (var gw = 0; gw < giantWreck.lootSpots.length; gw++) {
    var spot = giantWreck.lootSpots[gw]
    loot.push({ type: spot.type, x: spot.x, y: spot.y, phase: rng() * SD.TAU, progress: 0, taken: false, respawnAt: 0 })
  }
  loot = loot.concat(specials.loot)
  dangers.jellies = dangers.jellies.concat(specials.jellies)
  return {
    rocks: rocks,
    kelp: makeKelp(rng),
    currents: makeCurrents(rng),
    loot: loot,
    fauna: makeFauna(rng),
    dangers: dangers,
    fishSchools: makeFish(rng),
    decor: decor
  }
}
