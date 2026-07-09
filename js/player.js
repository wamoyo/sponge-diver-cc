// Σφουγγαράς — Sponge Diver
// Player physics, breath (pressure + panic), harvesting, XP, selling at
// the dock. Mutates state; fires HUD toasts and audio (documented side effects).

var SD = window.SD || {}
window.SD = SD

// Pure: a fresh player object floating in the shallows off the home dock
SD.newPlayer = function () {
  return {
    x: SD.config.world.dock.x + 160,
    y: -4,
    vx: 0,
    vy: 0,
    facing: 1,
    breath: SD.config.player.baseBreath,
    bag: [],
    invuln: 0,
    entangled: 0,   // seconds of kelp-slow remaining
    knifeFlash: 0,  // seconds the knife stays drawn after use
    spearCd: 0,     // kamaki cooldown between thrusts
    spearFlash: 0,  // seconds the kamaki stays extended after a strike
    swimPhase: 0,
    diveMaxM: 0,    // deepest point of the current dive
    wasUnder: false, // for splash + dive-end triggers
    holdingStone: false,
    aboard: false   // true while sailing the kaiki
  }
}

// Side effect: grants XP, detects level-ups, toasts + fanfare on level-up
SD.awardXp = function (state, amount) {
  if (amount <= 0) return
  var before = SD.level(state)
  state.xp += Math.round(amount)
  var after = SD.level(state)
  if (after > before) {
    SD.audio.fanfare()
    SD.hud.toast('⚡ Level ' + after + ' — the sea shapes you', 'big')
  }
}

// Side effect: mutates state.player physics + breath. Calls sell/blackout flows.
// input is analog: {x, y} each in -1..1 (keyboard feeds ±1, joystick fractions).
SD.updatePlayer = function (state, input, dt) {
  var p = state.player
  if (p.aboard) return // the kaiki carries you; boat.js drives this frame
  var cfg = SD.config.player
  var pxPerM = SD.config.pxPerM

  // --- input → acceleration (diagonals are not free: the vector is normalized) ---
  var ix = SD.clamp(input.x, -1, 1)
  var iy = SD.clamp(input.y, -1, 1)
  var ilen = Math.sqrt(ix * ix + iy * iy)
  if (ilen > 1) {
    ix /= ilen
    iy /= ilen
  }
  var diving = iy > 0.4
  var stoneMult = diving ? SD.descentMult(state) : 1
  p.holdingStone = diving && state.upgrades.stone > 0 && p.y > 8

  p.vx += ix * cfg.accel * dt
  p.vy += iy * cfg.accel * (iy > 0 ? stoneMult : 1) * dt
  if (Math.abs(ix) > 0.15) p.facing = ix > 0 ? 1 : -1

  // water drag when the diver stops kicking on an axis
  if (Math.abs(ix) < 0.05) p.vx *= Math.exp(-4.2 * dt)
  if (Math.abs(iy) < 0.05) p.vy *= Math.exp(-4.2 * dt)

  // gentle buoyancy, stronger right under the local waterline
  // (inside the mountain, the air pocket has its own surface)
  var surfY = SD.surfaceYAt(p.x)
  if (p.y > surfY && iy <= 0.05) {
    p.vy -= cfg.buoyancy * dt
    if (p.y < surfY + pxPerM * 1.2 && Math.abs(iy) < 0.05) p.vy -= 60 * dt
  }

  // clamp speed as a true VECTOR — swimming diagonally splits your effort,
  // so straight down is genuinely the fastest way to depth. The stone's
  // bonus applies only to the downward component of your motion.
  if (p.entangled > 0) p.entangled -= dt
  var max = SD.maxSpeed(state) * SD.weightMult(SD.bagWeight(p.bag))
  if (p.entangled > 0 && !state.devMode) max *= SD.config.dangers.kelp.slow
  var sp = Math.sqrt(p.vx * p.vx + p.vy * p.vy)
  if (sp > 0.001) {
    var downness = Math.max(0, p.vy / sp)
    var allowed = max * (1 + (stoneMult - 1) * (diving ? downness * downness : 0))
    if (sp > allowed) {
      p.vx *= allowed / sp
      p.vy *= allowed / sp
    }
  }

  p.x += p.vx * dt
  p.y += p.vy * dt
  p.swimPhase += dt * (3 + SD.dist(0, 0, p.vx, p.vy) * 0.045)

  // --- world bounds ---
  p.x = SD.clamp(p.x, 150, SD.config.world.widthPx - 150)
  var floorY = SD.floorYAt(p.x)
  if (p.y > floorY - cfg.radius) {
    p.y = floorY - cfg.radius
    if (p.vy > 0) p.vy = 0
  }
  if (p.y < surfY) {
    p.y = Math.max(p.y, surfY - 6) // bobbing at the waterline, never airborne
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

  // --- breath: 1 s/s, plus the squeeze of depth, plus panic when low ---
  var under = p.y > surfY + pxPerM * 0.4
  var maxBreath = SD.maxBreath(state)
  var depthNow = SD.depthM(p.y)
  if (under) {
    var bcfg = SD.config.breath
    var drain = 1
    if (depthNow > bcfg.pressureStartM) {
      drain += (depthNow - bcfg.pressureStartM) / bcfg.pressureDiv
    }
    var ratio = p.breath / maxBreath
    if (ratio < bcfg.panicBelow) {
      drain += (bcfg.panicBelow - ratio) / bcfg.panicBelow * bcfg.panicDrain * SD.panicScale(state)
    }
    p.breath -= drain * dt
    p.diveMaxM = Math.max(p.diveMaxM, depthNow)
    state.stats.deepest = Math.max(state.stats.deepest, Math.round(depthNow))
  } else {
    p.breath = Math.min(maxBreath, p.breath + SD.recoveryRate(state) * dt)
  }
  if (state.devMode) p.breath = maxBreath // gods do not gasp

  // splash + dive-end on crossing the waterline
  if (under && !p.wasUnder) SD.audio.splash()
  if (!under && p.wasUnder) {
    SD.audio.splash()
    if (p.diveMaxM > 3) surfaceFromDive(state)
  }
  p.wasUnder = under

  if (p.invuln > 0) p.invuln -= dt
  if (p.knifeFlash > 0) p.knifeFlash -= dt

  if (p.breath <= 0 && state.mode === 'playing') {
    SD.startBlackout(state)
    return
  }

  if (!under) {
    SD.updateBoatTransfer(state, dt)
    updateDockSelling(state, dt)
  }
  updateHarvest(state, dt)
}

// Side effect: settles a completed dive — log it, pay the depth in experience
function surfaceFromDive (state) {
  var p = state.player
  state.stats.dives += 1
  var depthXp = Math.round(p.diveMaxM * 0.4)
  if (depthXp > 0) {
    SD.awardXp(state, depthXp)
    SD.hud.toast('+' + depthXp + ' xp — ' + Math.round(p.diveMaxM) + ' m dive')
  }
  p.diveMaxM = 0
  SD.saveGame(state)
}

// Pure: splits carried type ids into what the dock buys and what only the
// god wants. Fish and octopus are tribute — the fishmonger dares not touch them.
SD.splitTribute = function (items) {
  var sale = []
  var tribute = []
  for (var i = 0; i < items.length; i++) {
    if (SD.offeringOf(items[i]) > 0) tribute.push(items[i])
    else sale.push(items[i])
  }
  return { sale: sale, tribute: tribute }
}

// Side effect: sells a list of loot type ids — drachmae, XP, tally, save.
// Returns the total. Shared by dock selling (bag) and boat docking (hold).
SD.sellCatch = function (state, items, sourceLabel) {
  if (!items.length) return 0
  var groups = {}
  var total = 0
  var xp = 0
  for (var i = 0; i < items.length; i++) {
    var t = items[i]
    var info = SD.config.lootTypes[t]
    if (!groups[t]) groups[t] = { name: info.name, count: 0, value: 0 }
    groups[t].count += 1
    groups[t].value += info.value
    total += info.value
    xp += info.xp
  }
  state.drachmae += total
  state.stats.earned += total
  SD.audio.coins()
  SD.hud.tally(groups, total, xp, sourceLabel)
  SD.awardXp(state, xp)
  SD.saveGame(state)
  return total
}

// Side effect: sells the bag when the diver reaches the home dock waters.
// If a slain kraken is owed to Billy, the whole village eats first.
function updateDockSelling (state, dt) {
  var p = state.player
  var dock = SD.config.world.dock
  var inZone = Math.abs(p.x - dock.x) < dock.radius
  if (!inZone) {
    state.sellCooldown = 0
    return
  }
  if (state.relics.feastPending) {
    state.relics.feastPending = false
    state.relics.feast = true
    SD.audio.fanfare()
    SD.hud.toast("🐙 Billy's Famous Grilled Kraken — the village feasts! +400 xp, and you swim 8% faster, forever", 'big')
    SD.awardXp(state, 400)
    SD.saveGame(state)
  }
  state.sellCooldown = (state.sellCooldown || 0) - dt
  if (state.sellCooldown > 0) return
  var split = SD.splitTribute(p.bag)
  if (split.sale.length === 0) return
  state.sellCooldown = 1.2
  p.bag = split.tribute // the fish stay in the net; they belong to the god
  SD.sellCatch(state, split.sale, 'Catch Sold at the Dock')
  if (split.tribute.length) {
    SD.hud.toast('The fishmonger waves the fish away — "those are His."')
  }
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
    if (item.taken) continue
    var d = SD.dist(item.x, item.y, p.x, p.y)
    if (d < (item.dropped ? reach + 14 : reach) && d < nearestD) {
      nearest = item
      nearestD = d
    }
  }

  for (var j = 0; j < loot.length; j++) {
    var it = loot[j]
    if (it === nearest || it.taken) continue
    it.progress = Math.max(0, it.progress - dt * 3) // walking away undoes the cut
  }
  state.harvestTarget = nearest
  if (!nearest) return

  var info = SD.config.lootTypes[nearest.type]

  // an octopus holds its rock like grim death — bare hands won't do
  if (info.needsKnife && state.upgrades.knife < 1) {
    if (!state.bagFullAt || state.time - state.bagFullAt > 2.5) {
      state.bagFullAt = state.time
      SD.hud.toast('It grips the rock — you need a knife to pry it loose', 'warn')
    }
    state.harvestTarget = null
    return
  }

  // weight check — the great chest humbles a small net
  if (SD.bagWeight(p.bag) + info.weight > SD.bagCapacity(state)) {
    if (!state.bagFullAt || state.time - state.bagFullAt > 2.5) {
      state.bagFullAt = state.time
      if (info.heavy) {
        SD.hud.toast('Far too heavy — needs ' + info.weight + ' wt of net. Yours holds ' + SD.bagCapacity(state) + '.', 'warn')
      } else {
        SD.hud.toast('Net bag is full!', 'warn')
      }
    }
    return
  }

  var time = nearest.dropped ? 0.4 : info.harvest * SD.harvestMult(state)
  nearest.progress += dt / time

  if (nearest.progress >= 1) {
    takeLoot(state, nearest)
  }
}

// Side effect: resolves a completed harvest — bag it, flag regrow, fire moments
function takeLoot (state, item) {
  var p = state.player
  var loot = state.world.loot
  var info = SD.config.lootTypes[item.type]
  state.harvestTarget = null
  state.stats.items = (state.stats.items || 0) + 1

  if (item.dropped) {
    loot.splice(loot.indexOf(item), 1) // shaken-loose loot is a one-off
  } else {
    item.taken = true
    item.progress = 0
    item.respawnAt = state.time + info.regrow
  }

  if (item.type === 'bottle') {
    state.bottleRead = true
    SD.awardXp(state, info.xp)
    SD.audio.parchment()
    SD.hud.showParchment(state)
    SD.saveGame(state)
    return
  }

  if (item.type === 'trident') {
    // a relic, not cargo: it never enters the bag and never leaves you
    state.tridentClaimed = true
    SD.audio.fanfare()
    SD.hud.toast('🔱 THE TRIDENT OF POSEIDON — your spear now strikes as three', 'big')
    SD.awardXp(state, info.xp)
    SD.saveGame(state)
    return
  }

  p.bag.push(item.type)

  if (info.offering) {
    SD.awardXp(state, info.xp) // a hunt teaches; tribute never reaches the fishmonger
    SD.audio.pickup()
    SD.hud.toast('+ ' + info.name + ' — tribute (+' + info.xp + ' xp)')
  } else if (info.heavy) {
    SD.audio.fanfare()
    SD.hud.toast('The Abyssal Chest is yours — now haul it home!', 'big')
  } else {
    SD.audio.pickup()
    SD.hud.toast('+ ' + info.name + ' (' + info.weight + ' wt)')
  }
}

// Side effect: begins the blackout sequence — someone will haul you out
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
  }
  state.blackoutKept = kept

  // half the depth still teaches you something
  SD.awardXp(state, Math.round(p.diveMaxM * 0.2))
  SD.hud.showBlackout(state, kept)
  SD.saveGame(state)
}

// Side effect: wakes the diver in the dock shallows after a blackout.
// Whatever made it into the kaiki's hold is untouched — the sea only
// takes what you carry.
SD.finishBlackout = function (state) {
  var p = state.player
  p.bag = state.blackoutKept || []
  p.x = SD.config.world.dock.x + 160
  p.y = -4
  p.vx = 0
  p.vy = 0
  p.breath = SD.maxBreath(state)
  p.invuln = 2
  p.diveMaxM = 0
  p.wasUnder = false
  p.entangled = 0
  state.mode = 'playing'
  SD.hud.hideBlackout()
  if (p.bag.length && state.upgrades.favor > 0) {
    SD.hud.toast("Poseidon's Favor: your catch survived", 'warn')
  }
}
