// Σφουγγαράς — Sponge Diver
// The dive site. Generated ONCE from a fixed seed — the sea is a real place
// with two shores: the village dock on the left, Poseidon's temple on the
// right, and a 130 m abyssal vault between them. Loot regrows on timers.

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
  return m + wobble * SD.clamp(m / 10, 0, 1)
}

// Pure: seafloor y in px at a given world x
SD.floorYAt = function (x) {
  return SD.floorDepthAt(x) * SD.config.pxPerM
}

// Pure: rocks resting on the seafloor — boulders sunk a little into the sand,
// with occasional stacked pairs. No floating boulders; this is a real sea.
function makeRocks (rng) {
  var cfg = SD.config.world
  var rocks = []

  // Side effect on rocks: drops one boulder onto the floor at x, returns it
  function drop (x, r) {
    var rock = { x: x, y: SD.floorYAt(x) - r * 0.57, r: r }
    rocks.push(rock)
    return rock
  }

  // sponge-bed boulders on both shore slopes (floor 3–22 m) — sponge hosts
  var i, x
  for (i = 0; i < 26; i++) {
    for (var tries = 0; tries < 30; tries++) {
      x = SD.rngRange(rng, 250, cfg.widthPx - 250)
      var m = SD.floorDepthAt(x)
      if (m >= 3 && m <= 22) break
    }
    var base = drop(x, SD.rngRange(rng, 30, 62))
    if (rng() < 0.25) { // a second boulder perched on the first
      rocks.push({ x: base.x + SD.rngRange(rng, -12, 12), y: base.y - base.r * 0.75, r: base.r * SD.rngRange(rng, 0.45, 0.6) })
    }
  }

  // mid-depth field boulders (floor 24–95 m) — eel homes, urchin perches
  for (i = 0; i < 22; i++) {
    for (var t2 = 0; t2 < 30; t2++) {
      x = SD.rngRange(rng, 400, cfg.widthPx - 400)
      var m2 = SD.floorDepthAt(x)
      if (m2 >= 24 && m2 <= 95) break
    }
    drop(x, SD.rngRange(rng, 40, 88))
  }

  // trench-wall ledges — big boulders sunk deep into the steep slopes
  for (i = 0; i < 8; i++) {
    var side = i % 2 === 0 ? -1 : 1
    x = cfg.vaultX + side * SD.rngRange(rng, 220, 520)
    var lr = SD.rngRange(rng, 60, 100)
    rocks.push({ x: x, y: SD.floorYAt(x) - lr * 0.3, r: lr }) // buried, not perched
  }

  // a couple of giants on the vault floor itself
  drop(cfg.vaultX - SD.rngRange(rng, 300, 360), SD.rngRange(rng, 70, 95))
  drop(cfg.vaultX + SD.rngRange(rng, 300, 360), SD.rngRange(rng, 70, 95))

  return rocks
}

// Pure: the sponge cave — a boulder dome over the deepest dip of the sponge
// grounds, mouth on the right, primo fino sponges and a certain bottle inside.
function makeCave () {
  var cx = SD.config.world.caveX
  var floorY = SD.floorYAt(cx)
  return {
    x: cx,
    y: floorY - 95,
    r: 130,
    rocks: [
      { x: cx - 150, y: floorY - 30, r: 70 },   // left base
      { x: cx - 112, y: floorY - 128, r: 64 },  // left shoulder
      { x: cx - 8, y: floorY - 182, r: 76 },    // crown
      { x: cx + 118, y: floorY - 155, r: 52 },  // right shoulder
      { x: cx + 168, y: floorY - 16, r: 46 }    // right base — the mouth gapes between these two
    ],
    finoSpots: [
      { x: cx - 72, y: floorY - 10 },
      { x: cx - 22, y: floorY - 8 },
      { x: cx + 34, y: floorY - 12 },
      { x: cx - 92, y: floorY - 92 },
      { x: cx + 4, y: floorY - 118 },
      { x: cx + 66, y: floorY - 98 }
    ],
    bottleSpot: { x: cx - 40, y: floorY - 14 }
  }
}

// Pure: the kelp forest — one true forest on the flat shelf, rooted in the
// sand, growing all the way to the surface. You swim through it slowly,
// or you buy a boat and sail over the canopy like a civilized person.
function makeKelp (rng) {
  var cfg = SD.config.world
  var kcfg = SD.config.dangers.kelp
  var kelp = []
  var span = cfg.kelpX2 - cfg.kelpX1
  for (var s = 0; s < kcfg.stalks; s++) {
    if (rng() < kcfg.gapChance) continue // small clearings to catch your breath
    var sx = cfg.kelpX1 + (s / kcfg.stalks) * span + SD.rngRange(rng, -14, 14)
    var baseY = SD.floorYAt(sx)
    // top ends at the surface or just short of it; a few fronds break water
    var topY = SD.rngRange(rng, -6, 60)
    kelp.push({
      x: sx,
      baseY: baseY,
      h: Math.max(70, baseY - topY),
      phase: rng() * SD.TAU,
      sway: SD.rngRange(rng, 4, 8) + baseY * 0.012
    })
  }
  // stray patches on the temple slope, where the bottom is still shallow
  for (var p = 0; p < 10; p++) {
    var px = SD.rngRange(rng, cfg.temple.x - 220, cfg.temple.x + 30)
    var pm = SD.floorDepthAt(px)
    if (pm < 6 || pm > 24) continue
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

// Pure: the animals of the sea — they wander their depth bands and flee
// the spear. Caught ones respawn elsewhere after a while.
function makeFauna (rng) {
  var cfg = SD.config.world
  var out = []
  for (var kind in SD.config.fauna) {
    var f = SD.config.fauna[kind]
    for (var i = 0; i < f.count; i++) {
      var fx = 0
      var fd = 0
      for (var tries = 0; tries < 50; tries++) {
        fx = SD.rngRange(rng, 350, cfg.widthPx - 350)
        var fmax = Math.min(f.maxM, SD.floorDepthAt(fx) - 3)
        if (fmax > f.minM) {
          fd = SD.rngRange(rng, f.minM, fmax)
          break
        }
      }
      if (!fd) continue
      out.push({
        kind: kind,
        x: fx, y: fd * SD.config.pxPerM,
        homeY: fd * SD.config.pxPerM,
        vx: (rng() < 0.5 ? -1 : 1) * f.cruise,
        vy: 0,
        mode: 'cruise', // cruise | flee
        fleeT: 0,
        taken: false,
        respawnAt: 0,
        phase: rng() * SD.TAU
      })
    }
  }
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
    for (var tries = 0; tries < 40; tries++) {
      x = SD.rngRange(rng, 300, cfg.widthPx - 300 - w)
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

// Pure: find a spawn spot for a loot type, respecting the seafloor.
// Sponges prefer to grow on the boulders; everything else rests where it sank.
// Returns {x, y} or null if no valid spot found in a few tries.
function lootSpot (rng, type, rocks) {
  var cfg = SD.config.world
  var info = SD.config.lootTypes[type]
  var spongey = type === 'sponge' || type === 'honeycomb' || type === 'octopus'
  for (var tries = 0; tries < 50; tries++) {
    var x = info.zone === 'kelp'
      ? SD.rngRange(rng, cfg.kelpX1 + 40, cfg.kelpX2 - 40) // murex live among the holdfasts
      : SD.rngRange(rng, 220, cfg.widthPx - 220)
    var floorM = SD.floorDepthAt(x)

    // sponges grow on boulder rims; octopus den in them too
    if (spongey && rng() < 0.6) {
      var hosts = rocks.filter(function (r) {
        var rimM = SD.depthM(r.y - r.r * 0.82)
        return rimM >= info.minM - 2 && rimM <= info.maxM
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

// Pure: all loot spots for the whole sea, including the vault treasures
// and the cave's little secrets
function makeLoot (state, rng, rocks, cave) {
  var cfg = SD.config.world
  var loot = []
  var types = SD.config.lootTypes

  for (var type in types) {
    if (types[type].placement !== 'floor') continue
    for (var i = 0; i < types[type].count; i++) {
      var spot = lootSpot(rng, type, rocks)
      if (spot) {
        var item = lootItem(type, spot.x, spot.y, rng() * SD.TAU)
        // Poseidon's coins sleep until the trident is claimed
        if (type === 'coin' && !state.tridentClaimed) item.taken = true
        loot.push(item)
      }
    }
  }

  // — the cave: primo fino sponges, and the bottle that started the rumors —
  for (var f = 0; f < cave.finoSpots.length; f++) {
    loot.push(lootItem('fino', cave.finoSpots[f].x, cave.finoSpots[f].y, rng() * SD.TAU))
  }
  if (!state.bottleRead) {
    loot.push(lootItem('bottle', cave.bottleSpot.x, cave.bottleSpot.y, 0))
  }

  // — the vault: trident on the shrine, the great chest beside the hoard —
  var vx = cfg.vaultX
  if (!state.tridentClaimed) {
    loot.push(lootItem('trident', vx, SD.floorYAt(vx) - 46, 0))
  }
  var chest = lootItem('chest', vx + 150, SD.floorYAt(vx + 150) - 16, 0)
  loot.push(chest)

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
  var out = { urchins: [], jellies: [], eels: [], sharks: [], squids: [], poseidon: null }
  var i, x, tries

  var candidates = rocks.filter(function (r) { return r.x > 200 && r.x < cfg.widthPx - 200 })
  var urchinRocks = candidates.filter(function (r) { return SD.depthM(r.y) >= d.urchin.minM })

  for (i = 0; i < d.urchin.count && urchinRocks.length; i++) {
    var rock = SD.rngPick(rng, urchinRocks)
    var ang = SD.rngRange(rng, -Math.PI * 0.85, -Math.PI * 0.15) // upper rim of the rock
    out.urchins.push({
      x: rock.x + Math.cos(ang) * rock.r,
      y: rock.y + Math.sin(ang) * rock.r,
      phase: rng() * SD.TAU
    })
  }

  for (i = 0; i < d.jelly.count; i++) {
    var jx = 0
    var jd = 0
    for (tries = 0; tries < 40; tries++) {
      jx = SD.rngRange(rng, 300, cfg.widthPx - 300)
      var jmax = Math.min(d.jelly.maxM, SD.floorDepthAt(jx) - 4)
      if (jmax > d.jelly.minM) {
        jd = SD.rngRange(rng, d.jelly.minM, jmax)
        break
      }
    }
    if (!jd) continue
    out.jellies.push({
      x: jx, y: jd * SD.config.pxPerM, baseY: jd * SD.config.pxPerM,
      phase: rng() * SD.TAU, drift: SD.rngRange(rng, -1, 1)
    })
  }

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

  // reef sharks patrol the open mid-depths; abyss sharks haunt the trench
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
  for (i = 0; i < d.shark.count; i++) {
    // patrol lanes east of the kelp, where the floor actually reaches shark depth
    out.sharks.push(makeShark(d.shark, cfg.kelpX2 + 400, cfg.vaultX + 350, 'reef'))
  }
  for (i = 0; i < d.abyssShark.count; i++) {
    out.sharks.push(makeShark(d.abyssShark, cfg.vaultX - 850, cfg.vaultX + 850, 'abyss'))
  }

  for (i = 0; i < d.squid.count; i++) {
    var qx = 0
    var qd = 0
    for (tries = 0; tries < 40; tries++) {
      qx = SD.rngRange(rng, 500, cfg.widthPx - 500)
      var qmax = Math.min(d.squid.maxM, SD.floorDepthAt(qx) - 6)
      if (qmax > d.squid.minM) {
        qd = SD.rngRange(rng, d.squid.minM, qmax)
        break
      }
    }
    if (!qd) continue
    out.squids.push({
      x: qx, y: qd * SD.config.pxPerM, baseY: qd * SD.config.pxPerM,
      dir: rng() < 0.5 ? -1 : 1, cooldown: 0, phase: rng() * SD.TAU
    })
  }

  // — Poseidon himself, hovering over his hoard —
  var vx = cfg.vaultX
  out.poseidon = {
    homeX: vx - 40,
    homeY: SD.floorYAt(vx - 40) - 130,
    x: vx - 40,
    y: SD.floorYAt(vx - 40) - 130,
    facing: -1,
    awake: false,
    mode: 'idle',      // idle | approach | windup | thrust | recover
    modeT: 0,
    thrust: 0,
    stabAngle: 0,
    phase: rng() * SD.TAU
  }

  return out
}

// Pure: ambient fish schools, purely decorative
function makeFish (rng) {
  var cfg = SD.config.world
  var schools = []
  for (var i = 0; i < 12; i++) {
    var fx = SD.rngRange(rng, 400, cfg.widthPx - 400)
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

// Pure: background decor — grass, columns, the wreck, the vault hoard
function makeDecor (rng) {
  var cfg = SD.config.world
  var grass = []
  for (var i = 0; i < 110; i++) {
    var gx = SD.rngRange(rng, 250, cfg.widthPx - 250)
    if (SD.floorDepthAt(gx) < 2) continue
    grass.push({ x: gx, y: SD.floorYAt(gx), h: SD.rngRange(rng, 18, 52), phase: rng() * SD.TAU })
  }
  var columns = []
  for (var c = 0; c < 5; c++) {
    var cx = 0
    for (var tries = 0; tries < 40; tries++) {
      cx = SD.rngRange(rng, 1200, cfg.widthPx - 1200)
      var m = SD.floorDepthAt(cx)
      if (m > 30 && m < 100) break
    }
    columns.push({ x: cx, y: SD.floorYAt(cx), h: SD.rngRange(rng, 90, 170), tilt: SD.rngRange(rng, -0.16, 0.16), broken: rng() < 0.7 })
  }

  // the wreck lies on the drop-off shoulder before the trench
  var wreckX = 0
  for (var wt = 0; wt < 60; wt++) {
    wreckX = SD.rngRange(rng, cfg.vaultX - 1000, cfg.vaultX - 400)
    var wm = SD.floorDepthAt(wreckX)
    if (wm > 72 && wm < 96) break
  }

  // gold hoard mounds heaped around the vault shrine — a proper hoard
  var hoard = []
  for (var hM = 0; hM < 9; hM++) {
    var hx = cfg.vaultX + SD.rngRange(rng, -290, 290)
    hoard.push({
      x: hx,
      y: SD.floorYAt(hx),
      w: SD.rngRange(rng, 40, 100),
      h: SD.rngRange(rng, 12, 30),
      phase: rng() * SD.TAU
    })
  }

  return {
    grass: grass,
    columns: columns,
    wreck: { x: wreckX, y: SD.floorYAt(wreckX) },
    shrine: { x: cfg.vaultX, y: SD.floorYAt(cfg.vaultX) },
    hoard: hoard
  }
}

// Pure-ish (seeded rng): builds the one true sea. Call once at boot.
SD.genWorld = function (state) {
  var rng = SD.makeRng(SD.config.worldSeed)
  var cave = makeCave()
  var rocks = makeRocks(rng).concat(cave.rocks)
  var decor = makeDecor(rng)
  decor.cave = { x: cave.x, y: cave.y, r: cave.r }
  return {
    rocks: rocks,
    kelp: makeKelp(rng),
    currents: makeCurrents(rng),
    loot: makeLoot(state, rng, rocks, cave),
    fauna: makeFauna(rng),
    dangers: makeDangers(rng, rocks),
    fishSchools: makeFish(rng),
    decor: decor
  }
}
