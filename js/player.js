// Σφουγγαράς — Sponge Diver
// Player physics, breath, harvesting, surfacing + selling.
// Mutates state; fires HUD toasts and audio (documented side effects).

var SD = window.SD || {}
window.SD = SD

// Pure: a fresh player object floating at the surface near the boat
SD.newPlayer = function () {
  return {
    x: SD.config.world.boatX + 90,
    y: 0,
    vx: 0,
    vy: 0,
    facing: 1,
    breath: SD.config.player.baseBreath,
    bag: [],
    invuln: 0,
    swimPhase: 0,
    diveMaxM: 0,     // deepest point of the current dive
    wasUnder: false, // for splash + sell triggers
    holdingStone: false
  }
}

// Side effect: mutates state.player physics + breath. Calls sell/blackout flows.
// input is analog: {x, y} each in -1..1 (keyboard feeds ±1, joystick fractions).
SD.updatePlayer = function (state, input, dt) {
  var p = state.player
  var cfg = SD.config.player
  var pxPerM = SD.config.pxPerM

  // --- input → acceleration ---
  var ix = SD.clamp(input.x, -1, 1)
  var iy = SD.clamp(input.y, -1, 1)
  var diving = iy > 0.4
  var stoneMult = diving ? SD.descentMult(state) : 1
  p.holdingStone = diving && state.upgrades.stone > 0 && p.y > 8

  p.vx += ix * cfg.accel * dt
  p.vy += iy * cfg.accel * (iy > 0 ? stoneMult : 1) * dt
  if (Math.abs(ix) > 0.15) p.facing = ix > 0 ? 1 : -1

  // water drag when the diver stops kicking on an axis
  if (Math.abs(ix) < 0.05) p.vx *= Math.exp(-4.2 * dt)
  if (Math.abs(iy) < 0.05) p.vy *= Math.exp(-4.2 * dt)

  // gentle buoyancy, stronger right under the waterline
  if (p.y > 0 && iy <= 0.05) {
    p.vy -= cfg.buoyancy * dt
    if (p.y < pxPerM * 1.2 && Math.abs(iy) < 0.05) p.vy -= 60 * dt
  }

  // clamp speed (descending with the stone is allowed to exceed it)
  var max = SD.maxSpeed(state)
  p.vx = SD.clamp(p.vx, -max, max)
  p.vy = SD.clamp(p.vy, -max, max * stoneMult)

  p.x += p.vx * dt
  p.y += p.vy * dt
  p.swimPhase += dt * (3 + SD.dist(0, 0, p.vx, p.vy) * 0.045)

  // --- world bounds ---
  p.x = SD.clamp(p.x, 90, SD.config.world.widthPx - 90)
  var floorY = SD.floorYAt(p.x)
  if (p.y > floorY - cfg.radius) {
    p.y = floorY - cfg.radius
    if (p.vy > 0) p.vy = 0
  }
  if (p.y < 0) {
    p.y = Math.max(p.y, -6) // bobbing at the waterline, never airborne
    if (p.vy < -30) p.vy = -30
  }

  // rocks push the diver out
  var rocks = state.world.rocks
  for (var i = 0; i < rocks.length; i++) {
    var r = rocks[i]
    if (Math.abs(r.x - p.x) > r.r + 40 || Math.abs(r.y - p.y) > r.r + 40) continue
    var d = SD.dist(r.x, r.y, p.x, p.y)
    var minD = r.r + cfg.radius
    if (d < minD && d > 0.001) {
      p.x += (p.x - r.x) / d * (minD - d)
      p.y += (p.y - r.y) / d * (minD - d)
    }
  }

  // --- breath ---
  var under = p.y > pxPerM * 0.4
  var maxBreath = SD.maxBreath(state)
  if (under) {
    p.breath -= dt
    p.diveMaxM = Math.max(p.diveMaxM, SD.depthM(p.y))
    state.stats.deepest = Math.max(state.stats.deepest, Math.round(SD.depthM(p.y)))
  } else {
    p.breath = Math.min(maxBreath, p.breath + maxBreath * cfg.surfaceRefillRate * dt)
  }

  // splash + sell on crossing the waterline
  if (under && !p.wasUnder) SD.audio.splash()
  if (!under && p.wasUnder) {
    SD.audio.splash()
    if (p.diveMaxM > 3) surfaceFromDive(state)
  }
  p.wasUnder = under

  if (p.invuln > 0) p.invuln -= dt

  if (p.breath <= 0 && state.mode === 'playing') {
    SD.startBlackout(state)
    return
  }

  updateHarvest(state, dt)
}

// Side effect: settles a completed dive — sells the catch, trains the lungs, regrows the sea
function surfaceFromDive (state) {
  var p = state.player
  state.stats.dives += 1
  p.diveMaxM = 0
  if (p.bag.length === 0) {
    SD.saveGame(state)
    return // surfaced empty-handed; the sea below is left as it was
  }

  // group the catch for the tally
  var groups = {}
  var total = 0
  for (var i = 0; i < p.bag.length; i++) {
    var t = p.bag[i]
    var info = SD.config.lootTypes[t]
    if (!groups[t]) groups[t] = { name: info.name, count: 0, value: 0 }
    groups[t].count += 1
    groups[t].value += info.value
    total += info.value
  }
  p.bag = []
  state.drachmae += total
  state.stats.earned += total

  var conditioned = state.conditioning < SD.config.conditioningCap
  if (conditioned) {
    state.conditioning = Math.min(SD.config.conditioningCap, state.conditioning + SD.config.conditioningPerDive)
  }

  SD.audio.coins()
  SD.hud.tally(groups, total, conditioned)
  state.world = SD.genWorld(state) // the sea restocks while you rest at the surface
  SD.saveGame(state)
}

// Side effect: progresses gathering on the nearest loot in reach
function updateHarvest (state, dt) {
  var p = state.player
  var loot = state.world.loot
  var reach = SD.config.player.harvestRadius
  var nearest = null
  var nearestD = Infinity

  for (var i = 0; i < loot.length; i++) {
    var item = loot[i]
    var d = SD.dist(item.x, item.y, p.x, p.y)
    if (d < (item.dropped ? reach + 14 : reach) && d < nearestD) {
      nearest = item
      nearestD = d
    }
  }

  for (var j = 0; j < loot.length; j++) {
    var it = loot[j]
    if (it === nearest) continue
    it.progress = Math.max(0, it.progress - dt * 3) // walking away undoes the cut
  }
  state.harvestTarget = nearest
  if (!nearest) return

  if (p.bag.length >= SD.bagSize(state)) {
    if (!state.bagFullAt || state.time - state.bagFullAt > 2.5) {
      state.bagFullAt = state.time
      SD.hud.toast('Net bag is full!', 'warn')
    }
    return
  }

  var info = SD.config.lootTypes[nearest.type]
  var time = nearest.dropped ? 0.4 : info.harvest * SD.harvestMult(state)
  nearest.progress += dt / time

  if (nearest.progress >= 1) {
    loot.splice(loot.indexOf(nearest), 1)
    p.bag.push(nearest.type)
    state.harvestTarget = null
    if (nearest.type === 'trident') {
      state.tridentClaimed = true
      SD.audio.fanfare()
      SD.hud.toast('🔱 The Trident of Poseidon! The god nods approvingly.', 'big')
      SD.saveGame(state)
    } else {
      SD.audio.pickup()
      SD.hud.toast('+ ' + info.name)
    }
  }
}

// Side effect: begins the blackout sequence — the crew will haul you up
SD.startBlackout = function (state) {
  var p = state.player
  state.mode = 'blackout'
  state.blackoutT = 0
  state.stats.blackouts += 1
  state.stats.dives += 1
  SD.audio.blackout()

  var kept = []
  if (state.upgrades.favor > 0) {
    kept = p.bag // Poseidon holds your net closed
  } else if (p.bag.indexOf('trident') !== -1) {
    kept = ['trident'] // even unconscious, your hands will not open
  }
  state.blackoutKept = kept
  SD.hud.showBlackout(state, kept)
  SD.saveGame(state)
}

// Side effect: wakes the diver at the surface after a blackout
SD.finishBlackout = function (state) {
  var p = state.player
  p.bag = state.blackoutKept || []
  p.x = SD.config.world.boatX + 90
  p.y = -4
  p.vx = 0
  p.vy = 0
  p.breath = SD.maxBreath(state)
  p.invuln = 2
  p.diveMaxM = 0
  p.wasUnder = false
  state.world = SD.genWorld(state)
  state.mode = 'playing'
  SD.hud.hideBlackout()
  if (p.bag.length && state.upgrades.favor > 0) {
    SD.hud.toast("Poseidon's Favor: your catch survived", 'warn')
  }
}
