// Σφουγγαράς — Sponge Diver
// Dive-site generation. A fresh layout is generated for each dive:
// rocks, seafloor, loot by depth band, dangers, fish, and decor.

var SD = window.SD || {}
window.SD = SD

// Pure: seafloor depth in meters at a given world x.
// Gentle rolling floor at ~95 m, carved down to 122 m inside the trench.
SD.floorDepthAt = function (x) {
  var cfg = SD.config.world
  var base = cfg.floorDepthM + Math.sin(x * 0.004) * 2 + Math.sin(x * 0.013) * 1.2
  var t = SD.smoothstep(cfg.trench.x1, cfg.trench.x1 + 260, x) * (1 - SD.smoothstep(cfg.trench.x2 - 260, cfg.trench.x2, x))
  return SD.lerp(base, cfg.trench.depthM, t)
}

// Pure: seafloor y in px at a given world x
SD.floorYAt = function (x) {
  return SD.floorDepthAt(x) * SD.config.pxPerM
}

// Pure-ish (Math.random): scatter n rocks in a depth window
function makeRocks () {
  var cfg = SD.config.world
  var rocks = []
  var i
  // side walls, stacked blobs down each edge
  for (i = 0; i < 14; i++) {
    rocks.push({ x: SD.randRange(-40, 60), y: 200 + i * 220 + SD.randRange(-40, 40), r: SD.randRange(80, 130) })
    rocks.push({ x: cfg.widthPx + SD.randRange(-60, 40), y: 200 + i * 220 + SD.randRange(-40, 40), r: SD.randRange(80, 130) })
  }
  // shallow reef rocks — hosts for sponges + urchins
  for (i = 0; i < 12; i++) {
    var sx = SD.randRange(200, cfg.widthPx - 200)
    rocks.push({ x: sx, y: SD.randRange(6, 26) * SD.config.pxPerM, r: SD.randRange(34, 64) })
  }
  // scattered field rocks at swim depths
  for (i = 0; i < 16; i++) {
    var x = SD.randRange(200, cfg.widthPx - 200)
    var maxD = SD.floorDepthAt(x) - 6
    var d = SD.randRange(20, maxD)
    rocks.push({ x: x, y: d * SD.config.pxPerM, r: SD.randRange(40, 86) })
  }
  // trench walls, funneling down
  for (i = 0; i < 5; i++) {
    var t = i / 4
    var d1 = SD.lerp(97, 118, t)
    rocks.push({ x: cfg.trench.x1 + 90 + SD.randRange(-30, 30), y: d1 * SD.config.pxPerM, r: SD.randRange(60, 90) })
    rocks.push({ x: cfg.trench.x2 - 90 + SD.randRange(-30, 30), y: d1 * SD.config.pxPerM, r: SD.randRange(60, 90) })
  }
  return rocks
}

// Pure-ish (Math.random): find a spawn spot for a loot type, respecting the seafloor.
// Floor items rest on the seafloor when their depth window reaches it,
// otherwise they grow on the upper rim of a rock in their window.
// Returns {x, y} or null if no valid spot found in a few tries.
function lootSpot (type, rocks) {
  var cfg = SD.config.world
  var info = SD.config.lootTypes[type]
  for (var tries = 0; tries < 40; tries++) {
    var x = SD.randRange(160, cfg.widthPx - 160)
    var floorM = SD.floorDepthAt(x)
    var maxM = Math.min(info.maxM, floorM - 0.5)
    if (maxM < info.minM) continue // this column is too deep-locked for the item — try elsewhere
    if (info.placement !== 'floor') {
      return { x: x, y: SD.randRange(info.minM, maxM) * SD.config.pxPerM }
    }
    if (info.maxM >= floorM - 2) {
      return { x: x, y: (floorM - SD.randRange(0.2, 0.6)) * SD.config.pxPerM }
    }
    // seafloor out of reach — grow on a rock rim inside the depth window
    var hosts = rocks.filter(function (r) {
      var rimM = SD.depthM(r.y - r.r * 0.82)
      return r.x > 150 && r.x < cfg.widthPx - 150 && rimM >= info.minM - 2 && rimM <= info.maxM
    })
    if (!hosts.length) continue
    var rock = SD.pick(hosts)
    var ang = SD.randRange(-Math.PI * 0.8, -Math.PI * 0.2)
    return {
      x: rock.x + Math.cos(ang) * rock.r * 0.9,
      y: rock.y + Math.sin(ang) * rock.r * 0.76
    }
  }
  return null
}

// Pure-ish (Math.random): all loot for one dive
function makeLoot (state, rocks) {
  var loot = []
  var types = SD.config.lootTypes
  for (var type in types) {
    if (type === 'trident') continue // placed by hand below
    if (type === 'coin' && !state.tridentClaimed) continue // coins only after the trident is won
    for (var i = 0; i < types[type].count; i++) {
      var spot = lootSpot(type, rocks)
      if (spot) {
        loot.push({ type: type, x: spot.x, y: spot.y, phase: Math.random() * SD.TAU, progress: 0 })
      }
    }
  }
  // the trident waits on a shrine pedestal at the bottom of the trench
  if (!state.tridentClaimed) {
    var cfg = SD.config.world
    var tx = (cfg.trench.x1 + cfg.trench.x2) / 2
    loot.push({ type: 'trident', x: tx, y: SD.floorYAt(tx) - 46, phase: 0, progress: 0 })
  }
  return loot
}

// Pure-ish (Math.random): dangers for one dive
function makeDangers (rocks) {
  var cfg = SD.config.world
  var d = SD.config.dangers
  var out = { urchins: [], jellies: [], eels: [], sharks: [] }
  var i
  var candidates = rocks.filter( r => r.x > 140 && r.x < cfg.widthPx - 140)
  var urchinRocks = candidates.filter( r => SD.depthM(r.y) >= d.urchin.minM)

  for (i = 0; i < d.urchin.count && urchinRocks.length; i++) {
    var rock = SD.pick(urchinRocks)
    var ang = SD.randRange(-Math.PI * 0.85, -Math.PI * 0.15) // upper rim of the rock
    out.urchins.push({
      x: rock.x + Math.cos(ang) * rock.r,
      y: rock.y + Math.sin(ang) * rock.r,
      phase: Math.random() * SD.TAU
    })
  }

  for (i = 0; i < d.jelly.count; i++) {
    var jx = SD.randRange(200, cfg.widthPx - 200)
    var jmax = Math.min(d.jelly.maxM, SD.floorDepthAt(jx) - 4)
    var jd = SD.randRange(d.jelly.minM, jmax)
    out.jellies.push({
      x: jx, y: jd * SD.config.pxPerM, baseY: jd * SD.config.pxPerM,
      phase: Math.random() * SD.TAU, drift: SD.randRange(-1, 1)
    })
  }

  var eelRocks = candidates.filter( r => SD.depthM(r.y) > d.eel.minM && SD.depthM(r.y) < d.eel.maxM && r.r > 45)
  for (i = 0; i < d.eel.count && eelRocks.length; i++) {
    var home = eelRocks.splice(Math.floor(Math.random() * eelRocks.length), 1)[0]
    out.eels.push({
      homeX: home.x, homeY: home.y, r: home.r,
      x: home.x, y: home.y,
      mode: 'lurk', cooldown: 0, targetX: 0, targetY: 0, bit: false,
      phase: Math.random() * SD.TAU
    })
  }

  for (i = 0; i < d.shark.count; i++) {
    var inTrench = i >= d.shark.count - 2 // the last couple guard the trench
    var sx1 = inTrench ? cfg.trench.x1 + 150 : 250
    var sx2 = inTrench ? cfg.trench.x2 - 150 : cfg.widthPx - 250
    var sx = SD.randRange(sx1, sx2)
    var smax = Math.min(d.shark.maxM, SD.floorDepthAt(sx) - 5)
    var sd = SD.randRange(inTrench ? 100 : d.shark.minM, Math.max(smax, d.shark.minM + 2))
    out.sharks.push({
      x: sx, y: sd * SD.config.pxPerM,
      x1: sx1, x2: sx2, dir: Math.random() < 0.5 ? -1 : 1,
      mode: 'patrol', cooldown: 0, phase: Math.random() * SD.TAU
    })
  }

  return out
}

// Pure-ish (Math.random): ambient fish schools, purely decorative
function makeFish () {
  var cfg = SD.config.world
  var schools = []
  for (var i = 0; i < 7; i++) {
    var fx = SD.randRange(300, cfg.widthPx - 300)
    var fd = SD.randRange(4, Math.min(80, SD.floorDepthAt(fx) - 8))
    var n = 4 + Math.floor(Math.random() * 6)
    var fish = []
    for (var j = 0; j < n; j++) {
      fish.push({ ox: SD.randRange(-46, 46), oy: SD.randRange(-26, 26), phase: Math.random() * SD.TAU })
    }
    schools.push({
      x: fx, y: fd * SD.config.pxPerM, dir: Math.random() < 0.5 ? -1 : 1,
      speed: SD.randRange(18, 40), fish: fish, size: SD.randRange(4, 7)
    })
  }
  return schools
}

// Pure-ish (Math.random): background decor — grass, columns, wreck, shrine
function makeDecor () {
  var cfg = SD.config.world
  var grass = []
  for (var i = 0; i < 60; i++) {
    var gx = SD.randRange(120, cfg.widthPx - 120)
    grass.push({ x: gx, y: SD.floorYAt(gx), h: SD.randRange(18, 52), phase: Math.random() * SD.TAU })
  }
  var columns = []
  for (var c = 0; c < 3; c++) {
    var cx = SD.randRange(500, cfg.widthPx - 700)
    columns.push({ x: cx, y: SD.floorYAt(cx), h: SD.randRange(90, 170), tilt: SD.randRange(-0.16, 0.16), broken: Math.random() < 0.7 })
  }
  var wreckX = SD.randRange(cfg.trench.x1 - 700, cfg.trench.x1 - 300)
  var shrineX = (cfg.trench.x1 + cfg.trench.x2) / 2
  return {
    grass: grass,
    columns: columns,
    wreck: { x: wreckX, y: SD.floorYAt(wreckX) },
    shrine: { x: shrineX, y: SD.floorYAt(shrineX) }
  }
}

// Pure-ish (Math.random): builds a complete new dive site
SD.genWorld = function (state) {
  var rocks = makeRocks()
  return {
    rocks: rocks,
    loot: makeLoot(state, rocks),
    dangers: makeDangers(rocks),
    fishSchools: makeFish(),
    decor: makeDecor()
  }
}
