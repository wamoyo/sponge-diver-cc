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
  updateStormFeel(state, dt)
  if (p.aboard) { // the kaiki carries you; boat.js drives this frame
    updateBuddy(state, dt)
    return
  }
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

  // gentle buoyancy, stronger right under the local waterline (inside the
  // mountain — or up a cave dome — the air pocket has its own surface)
  var surfY = SD.surfaceYAt(p.x, p.y)
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

  var prevX = p.x
  p.x += p.vx * dt
  p.y += p.vy * dt
  p.swimPhase += dt * (3 + SD.dist(0, 0, p.vx, p.vy) * 0.045)

  // --- world bounds (ground and roof are LOCAL: inside the Caves of
  // Hephaestus the cave floor and the slab's underside take over) ---
  p.x = SD.clamp(p.x, 150, SD.config.world.widthPx - 150)
  var floorY = SD.groundYAt(p.x, p.y)
  if (p.y > floorY - cfg.radius) {
    // if the ground rises like a WALL along our motion (shaft sides, the
    // wells, the trench cliffs), stop at it — never ride up its face
    var prevFloorY = SD.groundYAt(prevX, p.y)
    var slope = (prevFloorY - floorY) / Math.max(Math.abs(p.x - prevX), 0.001)
    if (slope > 4 || p.y - (floorY - cfg.radius) > 46) {
      p.x = prevX
      p.vx = 0
      floorY = prevFloorY
    }
    if (p.y > floorY - cfg.radius) {
      p.y = floorY - cfg.radius
      if (p.vy > 0) p.vy = 0
    }
  }

  // the rock overhead: the mountain's carved belly, or the cave slab's
  // underside — the cliff face is a wall, the low roof presses you down
  var ceilY = SD.overheadYAt(p.x, p.y)
  if (p.y < ceilY + cfg.radius) {
    var prevCeilY = SD.overheadYAt(prevX, p.y)
    var cSlope = (ceilY - prevCeilY) / Math.max(Math.abs(p.x - prevX), 0.001)
    if (cSlope > 4 || ceilY + cfg.radius - p.y > 46) {
      p.x = prevX
      p.vx = 0
      ceilY = prevCeilY
    }
    if (p.y < ceilY + cfg.radius) {
      p.y = ceilY + cfg.radius
      if (p.vy < 0) p.vy = 0
    }
  }

  if (p.y < surfY && floorY > surfY) { // only where there IS water below —
    p.y = Math.max(p.y, surfY - 6)     // dry ledges above the line are land
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
    updateDockVoices(state)
  }
  updateBuddy(state, dt)
  updateWellTunnel(state, dt)
  updateHarvest(state, dt)
}

// Side effect: Poseidon's standing storm, felt in the body — surface chop
// shoves a swimmer back west, thunder rolls, and the first crossing into
// the god's waters gets its warning. Runs every frame, sailing or swimming.
function updateStormFeel (state, dt) {
  var p = state.player
  var storm = SD.stormAt(p.x)
  if (storm <= 0) return
  var pxPerM = SD.config.pxPerM

  // the chop: a swimmer on the surface is pushed away from the mountain
  if (!p.aboard && p.y > -8 && p.y < pxPerM * 1.2 && SD.surfaceYAt(p.x, p.y) === 0) {
    p.x -= storm * 30 * dt
  }

  if (storm > 0.5 && !state.stormToasted) {
    state.stormToasted = true
    SD.hud.toast("⛈ The sky turns to bronze — you have entered Poseidon's waters", 'warn')
  }

  if (storm > 0.55 && p.y < pxPerM * 6) { // thunder only reaches the shallow water
    state.thunderCd = (state.thunderCd || 0) - dt
    if (state.thunderCd <= 0) {
      state.thunderCd = 6 + (Math.sin(state.time * 7.3) + 1) * 4
      SD.audio.rumble()
    }
  }
}

// Side effect: the dock has voices — one line per visit. The elder points
// you at the next unfound secret; Billy mans his grill for the kraken hero;
// the fishmonger talks shop. Leave the dock and come back for the next line.
function updateDockVoices (state) {
  var p = state.player
  var dock = SD.config.world.dock
  if (Math.abs(p.x - dock.x) >= dock.radius) {
    state.dockVisited = false
    return
  }
  if (state.dockVisited) return
  state.dockVisited = true
  state.stats.dockVisits = (state.stats.dockVisits || 0) + 1
  SD.hud.toast(dockLine(state))
}

// Pure: picks this visit's line. Odd visits are the elder's — he hints the
// first unfound secret, in the order a diver could reach them. Even visits
// belong to the grill and the fish stall.
function dockLine (state) {
  var f = SD.worldFlags
  var visits = state.stats.dockVisits || 1
  var hints = [
    [!state.relics.fins, '«West past the sponge beds, a god stands in a little cave. Take what he offers — he means you to have it.» — the elder'],
    [!state.relics.sight, '«A pearl trader went down off the Banks, kit and all. His goggles never fogged, they say.» — the elder'],
    [!state.relics.hunt, '«A great grouper lies dead in the meadows, an old kamaki still in its back. Pull it free.» — the elder'],
    [!f.wellTunnel, '«The Well and the Pearl Banks were one passage once, before the stones fell. A blade could clear it.» — the elder'],
    [!f.quarryOpen, '«The quarrymen sealed their finest work behind a slab and never came back for it.» — the elder'],
    [!f.anemoneFell, "«The Anemone's captain kept a strongbox aft. She rests uneasy on that ledge — mind she doesn't roll.» — the elder"]
  ]
  if (visits % 2 === 1) {
    for (var i = 0; i < hints.length; i++) {
      if (hints[i][0]) return hints[i][1]
    }
    return 'The elder just nods. The sea has no secrets left from you.'
  }
  if (state.relics.feast) return '«Oi, the kraken-griller himself! Free skewer for the hero — always.» — Billy'
  var stall = [
    '«Fine finos fetch triple what the coarse ones do. Depth pays — if you live to sell it.» — the fishmonger',
    "«That storm sits on the east sea like a lid. Poseidon's in a mood again.» — the fishmonger",
    '«A man came back white as marble last week. Wouldn\'t say what he saw past the graveyard.» — the fishmonger'
  ]
  return stall[Math.floor(visits / 2) % stall.length]
}

// Side effect: your safety buddy works the surface and watches your clock.
// He needs his own air to reach you, so he floats up top until the arithmetic
// of a rescue — your seconds of breath against the climb home — says he must
// drop. Then he gulps air and dives to meet you on his line. Never dive alone.
function updateBuddy (state, dt) {
  var p = state.player
  var b = state.buddy
  var pxPerM = SD.config.pxPerM
  var maxY = SD.config.buddyRescueM[state.upgrades.buddy] * pxPerM
  var surfY = SD.surfaceYAt(p.x)
  var targetX = p.x - 62
  var targetY = surfY - 4 // his post: floating, eyes down

  var climb = Math.max(60, SD.maxSpeed(state) * 0.8) // px/s, a tired diver ascending
  var margin = p.breath - Math.max(0, p.y - surfY) / climb
  b.diving = b.diving ? margin < 16 : margin < 10 // drops early, surfaces late
  if (p.y < surfY + pxPerM * 3) b.diving = false // you're basically home
  if (b.diving) {
    targetY = SD.clamp(p.y * 0.85, surfY - 4, maxY)
    if (!b.wasDiving) SD.hud.toast('Yiannis gulps air and drops after you —')
  }

  if (p.aboard) { // the deck carries him — no easing, or a fast boat outruns him
    b.diving = false
    b.wasDiving = false
    b.aboard = true
    b.x = state.boat.x - 24
    b.y = -13
    b.phase += dt * 2
    return
  }
  b.aboard = false
  b.wasDiving = b.diving

  var ease = 1 - Math.exp(-(b.diving ? 4.5 : 3.2) * dt)
  b.x += (targetX - b.x) * ease
  b.y += (targetY - b.y) * ease
  b.phase += dt * (3 + Math.abs(targetY - b.y) * 0.02)
}

// Side effect: the Well's freed current flings you between its two mouths
function updateWellTunnel (state, dt) {
  if (!SD.worldFlags.wellTunnel) return
  if (state.tunnelCd > 0) { state.tunnelCd -= dt; return }
  var p = state.player
  var A = { x: SD.config.wellMouthA.x, y: SD.floorYAt(SD.config.wellMouthA.x) - 22 }
  var B = SD.config.wellMouthB
  var dest = null
  if (SD.dist(p.x, p.y, A.x, A.y) < 50) dest = B
  else if (SD.dist(p.x, p.y, B.x, B.y) < 50) dest = A
  if (dest) {
    state.tunnelCd = 2.5
    SD.burstBubbles(state, p.x, p.y, 14)
    p.x = dest.x + (dest === B ? 60 : -60)
    p.y = dest.y
    p.vx = dest === B ? 180 : -180
    p.vy = 0
    SD.burstBubbles(state, p.x, p.y, 14)
    SD.audio.splash()
    SD.hud.toast('The current takes you!')
  }
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

  // some things demand a blade — and the Great Pearl demands a LEGEND
  var reqKnife = info.needsKnife === true ? 1 : (info.needsKnife || 0)
  if (state.upgrades.knife < reqKnife) {
    if (!state.bagFullAt || state.time - state.bagFullAt > 2.5) {
      state.bagFullAt = state.time
      SD.hud.toast(reqKnife >= 4
        ? 'The shell laughs at your blade — only a LEGEND edge pries this'
        : 'It holds fast — you need a better knife', 'warn')
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
    state.bottlesRead[item.idx || 0] = true
    SD.awardXp(state, info.xp)
    SD.audio.parchment()
    SD.hud.showParchment(state, item.idx || 0)
    SD.saveGame(state)
    return
  }

  // — the found origins and the one-time wonders —
  if (info.event === 'fins') {
    state.relics.fins = true
    if (state.upgrades.fins < 1) state.upgrades.fins = 1
    SD.audio.fanfare()
    SD.hud.toast('🕊️ THE FINS OF HERMES — the god grants; the chandlery refines', 'big')
    SD.awardXp(state, info.xp)
    SD.saveGame(state)
    return
  }
  if (info.event === 'sight') {
    state.relics.sight = true
    if (state.upgrades.light < 1) state.upgrades.light = 1
    SD.audio.fanfare()
    SD.hud.toast("🫒 THE TRADER'S GOGGLES — suddenly, the sea has edges", 'big')
    SD.awardXp(state, info.xp)
    SD.saveGame(state)
    return
  }
  if (info.event === 'hunt') {
    state.relics.hunt = true
    if (state.upgrades.kamaki < 1) state.upgrades.kamaki = 1
    SD.audio.fanfare()
    SD.hud.toast('🎣 AN OLD KAMAKI — still sharp. Someone hunted here before you', 'big')
    SD.awardXp(state, info.xp)
    SD.saveGame(state)
    return
  }
  if (info.event === 'tunnel') {
    SD.worldFlags.wellTunnel = true
    SD.audio.fanfare()
    SD.hud.toast('🌊 The kelp gives — a CURRENT roars through! The Well and the Pearl Banks are joined', 'big')
    SD.awardXp(state, info.xp)
    SD.saveGame(state)
    return
  }
  if (info.event === 'quarry') {
    SD.worldFlags.quarryOpen = true
    var qx = SD.config.quarrySlabX
    var cache = [
      { type: 'statue', dx: 40, dy: -14 },
      { type: 'statue', dx: 95, dy: -12 },
      { type: 'laurel', dx: 65, dy: -30 }
    ]
    for (var c = 0; c < cache.length; c++) {
      loot.push({ type: cache[c].type, x: qx + cache[c].dx, y: SD.floorYAt(qx + cache[c].dx) + cache[c].dy, phase: 0, progress: 0, taken: false, respawnAt: 0 })
    }
    state.effects.shake = 10
    SD.audio.fanfare()
    SD.hud.toast('⛏️ The slab falls away — a mason\'s cache, sealed since the quarry drowned', 'big')
    SD.awardXp(state, info.xp)
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

  if (info.event === 'topple') {
    SD.toppleAnemone(state)
  }

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

// Side effect: the Anemone falls — the strongbox was her ballast. The
// crevasse opens beneath her and she slides in, stern-first, forever.
SD.toppleAnemone = function (state) {
  SD.worldFlags.anemoneFell = true
  state.effects.shake = 18
  SD.audio.conch()
  SD.audio.blackout()
  SD.hud.toast('⚓ HER TIMBERS SCREAM — THE ANEMONE IS FALLING. SWIM!', 'big')

  // the ground opens: reseat everything in the span on the new floor
  var gw = SD.config.giantWreckX
  var loot = state.world.loot
  for (var i = 0; i < loot.length; i++) {
    if (Math.abs(loot[i].x - gw - 50) < 280 && !loot[i].taken) {
      loot[i].y = SD.floorYAt(loot[i].x) - 14
    }
  }
  // her hull re-lies stern-down in the grave; new bones, new cache
  var world = state.world
  world.rocks = world.rocks.filter(function (r) { return !r.hidden || Math.abs(r.x - gw) > 900 })
  var gy = SD.floorYAt(gw + 50)
  world.rocks.push(
    { x: gw - 120, y: gy - 420, r: 130, hidden: true },
    { x: gw + 40, y: gy - 240, r: 120, hidden: true },
    { x: gw + 130, y: gy - 60, r: 110, hidden: true }
  )
  world.decor.giantWreck = { x: gw + 50, y: gy, scale: 2.1, fallen: true }
  var cache = [
    { type: 'laurel', dx: -60 }, { type: 'laurel', dx: 40 },
    { type: 'helmet', dx: -10 }, { type: 'amphora', dx: 90 }
  ]
  for (var c = 0; c < cache.length; c++) {
    loot.push({ type: cache[c].type, x: gw + 50 + cache[c].dx, y: SD.floorYAt(gw + 50 + cache[c].dx) - 14, phase: 0, progress: 0, taken: false, respawnAt: 0 })
  }
  SD.saveGame(state)
}

// Side effect: breath is gone. The first rule of freediving decides what
// happens next: if you blacked out within your buddy's reach, he takes you
// up — you keep your catch, and everyone goes home. Beyond his reach, the
// sea keeps you, and everything ends.
SD.startBlackout = function (state) {
  var p = state.player
  var depthNow = SD.depthM(p.y)
  var reach = SD.config.buddyRescueM[state.upgrades.buddy] + 1.5
  state.stats.blackouts += 1
  state.stats.dives += 1

  if (depthNow <= reach) {
    state.mode = 'blackout'
    state.blackoutT = 0
    state.rescued = true
    SD.audio.blackout()
    SD.awardXp(state, Math.round(p.diveMaxM * 0.2))
    SD.hud.showBlackout(state)
    SD.saveGame(state)
  } else {
    state.mode = 'gameover'
    SD.audio.blackout()
    SD.hud.showGameOver(state, depthNow)
  }
}

// Side effect: your buddy hauls you to the boat, and everyone goes home —
// you, your catch, the kaiki, and him. That is what buddies are for.
SD.finishBlackout = function (state) {
  var p = state.player
  p.x = SD.config.world.dock.x + 160
  p.y = -4
  p.vx = 0
  p.vy = 0
  p.breath = SD.maxBreath(state)
  p.invuln = 2
  p.diveMaxM = 0
  p.wasUnder = false
  p.entangled = 0
  p.aboard = false
  state.boat.x = SD.config.world.boatStartX
  state.buddy.x = p.x - 62
  state.buddy.y = -4
  state.mode = 'playing'
  SD.hud.hideBlackout()
  SD.hud.toast('🤝 Yiannis hauls you home. "Breathe. The sponges will keep."')
}
