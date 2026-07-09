// Σφουγγαράς — Sponge Diver
// Danger behavior + collisions. Stings cost seconds of breath —
// time is the only currency that matters down there.
// Poseidon lives at the bottom of this file, as is proper.

var SD = window.SD || {}
window.SD = SD

// Side effect: applies a sting to the player — breath loss, knockback, flash,
// toast. Shared with the boss fights in fauna.js, hence public.
SD.applySting = function (state, amount, fromX, fromY, label, knock) {
  var p = state.player
  if (p.invuln > 0 || state.devMode) return
  var resisted = amount * (1 - SD.stingResist(state))
  p.breath -= resisted
  p.invuln = SD.config.player.invulnTime

  var kick = knock || 260
  var d = Math.max(SD.dist(fromX, fromY, p.x, p.y), 0.001)
  p.vx += (p.x - fromX) / d * kick
  p.vy += (p.y - fromY) / d * kick

  state.effects.flash = 0.6
  state.effects.shake = 9
  SD.burstBubbles(state, p.x, p.y, 10)
  SD.audio.sting()
  SD.hud.toast(label + '  −' + Math.round(resisted * 10) / 10 + ' s', 'warn')
}
var applySting = SD.applySting

// Side effect: a shark bite also knocks one item out of the net bag
function sharkBite (state, shark, cfg) {
  var p = state.player
  if (p.invuln > 0 || state.devMode) return
  applySting(state, cfg.sting, shark.x, shark.y, shark.kind === 'abyss' ? 'Abyss shark!' : 'Shark bite!')
  p.invuln = 1.6
  shark.mode = 'flee'
  shark.cooldown = cfg.cooldown

  var droppable = []
  for (var i = 0; i < p.bag.length; i++) {
    if (p.bag[i] !== 'trident') droppable.push(i)
  }
  if (droppable.length) {
    var idx = SD.pick(droppable)
    var type = p.bag.splice(idx, 1)[0]
    if (SD.offeringOf(type) > 0) {
      // a fish in the net is a shark's idea of room service
      SD.hud.toast('The shark swallows your ' + SD.carryInfo(type).name.toLowerCase() + '!', 'warn')
      return
    }
    state.world.loot.push({
      type: type,
      x: p.x + SD.randRange(-30, 30),
      y: p.y + SD.randRange(-20, 20),
      phase: Math.random() * SD.TAU,
      progress: 0,
      taken: false,
      dropped: true
    })
    SD.hud.toast('It knocked a ' + SD.config.lootTypes[type].name + ' from your bag!', 'warn')
  }
}

// Side effect: advances all dangers and resolves their collisions with the player.
// With interactive=false (menus, pause) everything still swims but nothing bites.
SD.updateDangers = function (state, dt, interactive) {
  var p = state.player
  var w = state.world
  var cfg = SD.config.dangers
  var pxPerM = SD.config.pxPerM
  var i

  // --- urchins: stationary, spiky ---
  for (i = 0; i < w.dangers.urchins.length; i++) {
    var u = w.dangers.urchins[i]
    if (interactive && SD.dist(u.x, u.y, p.x, p.y) < cfg.urchin.radius + SD.config.player.radius) {
      applySting(state, cfg.urchin.sting, u.x, u.y, 'Sea urchin!')
    }
  }

  // --- jellyfish: slow vertical drift; the ground turns them around ---
  for (i = 0; i < w.dangers.jellies.length; i++) {
    var j = w.dangers.jellies[i]
    j.phase += dt * 0.9
    j.x += j.drift * cfg.jelly.driftSpeed * dt
    if (j.x < 260 || j.x > SD.config.world.widthPx - 260) j.drift *= -1
    var jFloor = SD.floorYAt(j.x)
    if (j.baseY > jFloor - 90) {
      j.baseY = jFloor - 90 // rise off the rising bottom
      if (SD.floorYAt(j.x + j.drift * 80) < jFloor - 20) j.drift *= -1 // and drift back to open water
    }
    j.y = Math.min(j.baseY + Math.sin(j.phase) * 46, jFloor - 30)
    if (interactive && SD.dist(j.x, j.y, p.x, p.y) < cfg.jelly.radius + SD.config.player.radius) {
      applySting(state, cfg.jelly.sting, j.x, j.y, 'Jellyfish sting!')
    }
  }

  // --- moray eels: lurk in a rock, lunge at close prey. A good knife fends them. ---
  for (i = 0; i < w.dangers.eels.length; i++) {
    var e = w.dangers.eels[i]
    e.phase += dt
    if (e.cooldown > 0) e.cooldown -= dt

    if (e.mode === 'lurk') {
      e.x = SD.lerp(e.x, e.homeX, 1 - Math.exp(-6 * dt))
      e.y = SD.lerp(e.y, e.homeY, 1 - Math.exp(-6 * dt))
      var pd = SD.dist(e.homeX, e.homeY, p.x, p.y)
      if (interactive && pd < cfg.eel.alertRadius && e.cooldown <= 0) {
        e.mode = 'lunge'
        e.bit = false
        e.targetX = p.x
        e.targetY = p.y
      }
    } else if (e.mode === 'lunge') {
      var tdx = e.targetX - e.x
      var tdy = e.targetY - e.y
      var td = Math.max(SD.dist(e.x, e.y, e.targetX, e.targetY), 0.001)
      e.x += tdx / td * cfg.eel.lungeSpeed * dt
      e.y += tdy / td * cfg.eel.lungeSpeed * dt
      if (interactive && !e.bit && SD.dist(e.x, e.y, p.x, p.y) < cfg.eel.radius + SD.config.player.radius + 4) {
        e.bit = true
        if (state.upgrades.knife >= cfg.eel.fendKnife) {
          p.knifeFlash = 1.1
          e.mode = 'lurk'
          e.cooldown = cfg.eel.cooldown * 1.6
          SD.audio.pickup()
          SD.hud.toast('Your knife drives the moray back!')
        } else {
          applySting(state, cfg.eel.sting, e.x, e.y, 'Moray bite!')
        }
      }
      var fromHome = SD.dist(e.x, e.y, e.homeX, e.homeY)
      if (td < 10 || fromHome > cfg.eel.extent) {
        e.mode = 'lurk'
        e.cooldown = cfg.eel.cooldown
      }
    }
  }

  // --- sharks: patrol, then chase; each kind has its own ceiling ---
  for (i = 0; i < w.dangers.sharks.length; i++) {
    var s = w.dangers.sharks[i]
    var scfg = s.kind === 'abyss' ? cfg.abyssShark : cfg.shark
    s.phase += dt
    if (s.cooldown > 0) s.cooldown -= dt

    var toPlayer = SD.dist(s.x, s.y, p.x, p.y)
    var playerDeep = SD.depthM(p.y) > scfg.ceilingM

    if (s.mode === 'patrol') {
      s.x += s.dir * scfg.patrolSpeed * dt
      s.y += Math.sin(s.phase * 0.8) * 12 * dt
      if (s.x < s.x1) { s.x = s.x1; s.dir = 1 }
      if (s.x > s.x2) { s.x = s.x2; s.dir = -1 }
      if (interactive && toPlayer < scfg.detectRadius && playerDeep && s.cooldown <= 0) s.mode = 'chase'
    } else if (s.mode === 'chase') {
      if (!interactive || !playerDeep || toPlayer > scfg.detectRadius * 1.9) {
        s.mode = 'patrol' // lost interest — too shallow or too far
      } else {
        var cdx = p.x - s.x
        var cdy = p.y - s.y
        var cd = Math.max(toPlayer, 0.001)
        s.x += cdx / cd * scfg.chaseSpeed * dt
        s.y += cdy / cd * scfg.chaseSpeed * dt
        s.dir = cdx < 0 ? -1 : 1
        if (toPlayer < scfg.radius + SD.config.player.radius) sharkBite(state, s, scfg)
      }
    } else if (s.mode === 'flee') {
      s.x += s.dir * -scfg.patrolSpeed * 1.6 * dt
      if (s.cooldown <= 0) s.mode = 'patrol'
    }

    // keep sharks below their ceiling and off the floor
    var minY = scfg.ceilingM * pxPerM
    var maxY = SD.floorYAt(s.x) - 40
    s.y = SD.clamp(s.y, minY, maxY)
  }

  // --- squid: drift the mid-dark, ink the curious ---
  for (i = 0; i < w.dangers.squids.length; i++) {
    var q = w.dangers.squids[i]
    q.phase += dt
    if (q.cooldown > 0) q.cooldown -= dt
    q.x += q.dir * cfg.squid.driftSpeed * dt
    if (q.x < 400 || q.x > SD.config.world.widthPx - 400) q.dir *= -1
    var qFloor = SD.floorYAt(q.x)
    if (q.baseY > qFloor - 70) {
      q.baseY = qFloor - 70
      if (SD.floorYAt(q.x + q.dir * 90) < qFloor - 20) q.dir *= -1 // deep water is behind it
    }
    q.y = Math.min(q.baseY + Math.sin(q.phase * 0.9) * 30, qFloor - 26)
    if (interactive && !state.devMode && q.cooldown <= 0 && SD.dist(q.x, q.y, p.x, p.y) < cfg.squid.inkRadius) {
      q.cooldown = cfg.squid.cooldown
      q.dir = q.x < p.x ? -1 : 1
      q.x += q.dir * 30 // jet away
      state.inkT = SD.config.inkTime
      applySting(state, cfg.squid.sting, q.x, q.y, 'Ink cloud!', 120)
      SD.burstBubbles(state, p.x, p.y, 14)
    }
  }

  // --- kelp: rooted in the seafloor; it grabs ankles. A knife makes it a formality. ---
  if (interactive) {
    for (i = 0; i < w.kelp.length; i++) {
      var k = w.kelp[i]
      if (Math.abs(p.x - k.x) > 16) continue
      if (p.y < k.baseY - k.h || p.y > k.baseY) continue
      if (state.upgrades.knife > 0) {
        p.entangled = Math.max(p.entangled, 0.12)
        p.knifeFlash = Math.max(p.knifeFlash || 0, 0.3)
      } else {
        p.entangled = Math.max(p.entangled, 0.5)
      }
    }

    // --- currents: broad lanes of moving water shove you sideways ---
    for (i = 0; i < w.currents.length; i++) {
      var c = w.currents[i]
      if (p.x > c.x && p.x < c.x + c.w && p.y > c.y && p.y < c.y + c.h) {
        p.vx += c.force * dt
      }
    }

    // --- Hephaestus' Vents: columns of rising water off the volcanic shelf ---
    for (i = 0; i < w.dangers.vents.length; i++) {
      var v = w.dangers.vents[i]
      if (Math.abs(p.x - v.x) < 46 && p.y < v.y && p.y > v.y - 560) {
        p.vy -= SD.config.ventsUpdraft * dt // the sea itself throws you upward
      }
    }
  }

  // --- the god of the sea ---
  if (w.dangers.poseidon) stepPoseidon(state, w.dangers.poseidon, dt, interactive)

  // dropped loot sinks gently until it settles
  for (i = 0; i < w.loot.length; i++) {
    var item = w.loot[i]
    if (item.dropped) {
      item.y = Math.min(item.y + 26 * dt, SD.floorYAt(item.x) - 10)
    }
  }
}

// Side effect: Poseidon's whole mind. He sleeps over his hoard; come close
// and he wakes, closes, winds up, and drives the trident. He will not leave
// his vault — the treasure matters more than you do.
function stepPoseidon (state, h, dt, interactive) {
  var p = state.player
  var cfg = SD.config.dangers.poseidon
  h.phase += dt
  h.modeT -= dt

  var toPlayer = SD.dist(h.x, h.y, p.x, p.y)
  var fromHome = SD.dist(h.x, h.y, h.homeX, h.homeY)
  var playerUnder = p.y > SD.config.pxPerM * 0.4
  var playerNear = interactive && playerUnder && SD.dist(h.homeX, h.homeY, p.x, p.y) < cfg.leash

  // waking + facing
  if (interactive && playerUnder && toPlayer < cfg.awakeRadius && !h.awake) {
    h.awake = true
    h.mode = 'approach'
    state.effects.shake = 6
    SD.audio.conch()
    SD.hud.toast('🔱 The water trembles — POSEIDON wakes', 'big')
  }
  if (h.awake && h.mode !== 'windup' && h.mode !== 'thrust') {
    h.facing = p.x >= h.x ? 1 : -1
  }

  if (!playerNear && h.mode !== 'thrust' && h.mode !== 'recover') {
    // the intruder is gone; settle back over the hoard
    h.mode = 'idle'
    if (fromHome > 6) {
      h.x += (h.homeX - h.x) * 1.2 * dt
      h.y += (h.homeY - h.y) * 1.2 * dt
    } else if (h.awake) {
      h.awake = false
    }
  }

  if (h.mode === 'idle') {
    if (!h.awake) {
      // godly presence: slow patrol drift over the treasure
      h.x = h.homeX + Math.sin(h.phase * 0.5) * 30
      h.y = h.homeY + Math.sin(h.phase * 0.33) * 12
    }
    h.thrust = 0
    if (playerNear && h.awake) h.mode = 'approach'
    return
  }

  if (h.mode === 'approach') {
    h.thrust = 0
    if (toPlayer > cfg.stabRange) {
      var ad = Math.max(toPlayer, 0.001)
      h.x += (p.x - h.x) / ad * cfg.approachSpeed * dt
      h.y += (p.y - h.y) / ad * cfg.approachSpeed * 0.7 * dt
      // leash: he guards, he does not hunt
      if (fromHome > cfg.leash) {
        h.x += (h.homeX - h.x) * 1.4 * dt
        h.y += (h.homeY - h.y) * 1.4 * dt
      }
    } else {
      h.mode = 'windup'
      h.modeT = cfg.windup
      h.stabAngle = Math.atan2(p.y - h.y, p.x - h.x)
      SD.hud.toast('Poseidon raises his trident!', 'warn')
    }
    return
  }

  if (h.mode === 'windup') {
    // draw the arm back — this is your moment to move
    h.thrust = -16 - (cfg.windup - Math.max(0, h.modeT)) * 22
    h.x -= h.facing * 8 * dt
    if (h.modeT <= 0) {
      h.mode = 'thrust'
      h.modeT = cfg.thrustTime
    }
    return
  }

  if (h.mode === 'thrust') {
    var prog = 1 - Math.max(0, h.modeT) / cfg.thrustTime
    h.thrust = prog * cfg.thrustReach
    h.x += Math.cos(h.stabAngle) * 150 * dt
    h.y += Math.sin(h.stabAngle) * 110 * dt

    if (interactive) {
      var tipX = h.x + Math.cos(h.stabAngle) * (cfg.radius * 0.8 + h.thrust)
      var tipY = h.y + Math.sin(h.stabAngle) * (cfg.radius * 0.8 + h.thrust)
      if (SD.dist(tipX, tipY, p.x, p.y) < cfg.tipRadius) {
        applySting(state, cfg.damage, h.x, h.y, 'Poseidon strikes!', 420)
        state.effects.shake = 14
      } else if (SD.dist(h.x, h.y, p.x, p.y) < cfg.radius) {
        applySting(state, cfg.bodyDamage, h.x, h.y, 'Swatted by the sea god!', 320)
      }
    }
    if (h.modeT <= 0) {
      h.mode = 'recover'
      h.modeT = cfg.recover
    }
    return
  }

  if (h.mode === 'recover') {
    h.thrust *= Math.exp(-6 * dt)
    h.x += (h.homeX - h.x) * 0.8 * dt
    h.y += (h.homeY - h.y) * 0.8 * dt
    if (h.modeT <= 0) {
      h.mode = playerNear ? 'approach' : 'idle'
    }
  }
}
