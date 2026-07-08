// Σφουγγαράς — Sponge Diver
// Danger behavior + collisions. Stings cost seconds of breath —
// time is the only currency that matters down there.

var SD = window.SD || {}
window.SD = SD

// Side effect: applies a sting to the player — breath loss, knockback, flash, toast
function applySting (state, amount, fromX, fromY, label) {
  var p = state.player
  if (p.invuln > 0) return
  var resisted = amount * (1 - SD.stingResist(state))
  p.breath -= resisted
  p.invuln = SD.config.player.invulnTime

  var d = Math.max(SD.dist(fromX, fromY, p.x, p.y), 0.001)
  p.vx += (p.x - fromX) / d * 260
  p.vy += (p.y - fromY) / d * 260

  state.effects.flash = 0.6
  state.effects.shake = 9
  SD.burstBubbles(state, p.x, p.y, 10)
  SD.audio.sting()
  SD.hud.toast(label + '  −' + Math.round(resisted * 10) / 10 + ' s', 'warn')
}

// Side effect: a shark bite also knocks one item out of the net bag
function sharkBite (state, shark) {
  var p = state.player
  if (p.invuln > 0) return
  applySting(state, SD.config.dangers.shark.sting, shark.x, shark.y, 'Shark bite!')
  p.invuln = 1.6
  shark.mode = 'flee'
  shark.cooldown = SD.config.dangers.shark.cooldown

  var droppable = []
  for (var i = 0; i < p.bag.length; i++) {
    if (p.bag[i] !== 'trident') droppable.push(i)
  }
  if (droppable.length) {
    var idx = SD.pick(droppable)
    var type = p.bag.splice(idx, 1)[0]
    state.world.loot.push({
      type: type,
      x: p.x + SD.randRange(-30, 30),
      y: p.y + SD.randRange(-20, 20),
      phase: Math.random() * SD.TAU,
      progress: 0,
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

  // --- jellyfish: slow vertical drift ---
  for (i = 0; i < w.dangers.jellies.length; i++) {
    var j = w.dangers.jellies[i]
    j.phase += dt * 0.9
    j.y = j.baseY + Math.sin(j.phase) * 46
    j.x += j.drift * cfg.jelly.driftSpeed * dt
    if (j.x < 160 || j.x > SD.config.world.widthPx - 160) j.drift *= -1
    if (interactive && SD.dist(j.x, j.y, p.x, p.y) < cfg.jelly.radius + SD.config.player.radius) {
      applySting(state, cfg.jelly.sting, j.x, j.y, 'Jellyfish sting!')
    }
  }

  // --- moray eels: lurk in a rock, lunge at close prey ---
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
        applySting(state, cfg.eel.sting, e.x, e.y, 'Moray bite!')
      }
      var fromHome = SD.dist(e.x, e.y, e.homeX, e.homeY)
      if (td < 10 || fromHome > cfg.eel.extent) {
        e.mode = 'lurk'
        e.cooldown = cfg.eel.cooldown
      }
    }
  }

  // --- sharks: patrol, then chase; they dislike the shallows ---
  for (i = 0; i < w.dangers.sharks.length; i++) {
    var s = w.dangers.sharks[i]
    s.phase += dt
    if (s.cooldown > 0) s.cooldown -= dt

    var toPlayer = SD.dist(s.x, s.y, p.x, p.y)
    var playerDeep = SD.depthM(p.y) > cfg.shark.ceilingM

    if (s.mode === 'patrol') {
      s.x += s.dir * cfg.shark.patrolSpeed * dt
      s.y += Math.sin(s.phase * 0.8) * 12 * dt
      if (s.x < s.x1) { s.x = s.x1; s.dir = 1 }
      if (s.x > s.x2) { s.x = s.x2; s.dir = -1 }
      if (interactive && toPlayer < cfg.shark.detectRadius && playerDeep && s.cooldown <= 0) s.mode = 'chase'
    } else if (s.mode === 'chase') {
      if (!interactive || !playerDeep || toPlayer > cfg.shark.detectRadius * 1.9) {
        s.mode = 'patrol' // lost interest — too shallow or too far
      } else {
        var cdx = p.x - s.x
        var cdy = p.y - s.y
        var cd = Math.max(toPlayer, 0.001)
        s.x += cdx / cd * cfg.shark.chaseSpeed * dt
        s.y += cdy / cd * cfg.shark.chaseSpeed * dt
        s.dir = cdx < 0 ? -1 : 1
        if (toPlayer < cfg.shark.radius + SD.config.player.radius) sharkBite(state, s)
      }
    } else if (s.mode === 'flee') {
      s.x += s.dir * -cfg.shark.patrolSpeed * 1.6 * dt
      if (s.cooldown <= 0) s.mode = 'patrol'
    }

    // keep sharks below their ceiling and off the floor
    var minY = cfg.shark.ceilingM * pxPerM
    var maxY = SD.floorYAt(s.x) - 40
    s.y = SD.clamp(s.y, minY, maxY)
  }

  // dropped loot sinks gently until it settles
  for (i = 0; i < w.loot.length; i++) {
    var item = w.loot[i]
    if (item.dropped) {
      item.y = Math.min(item.y + 26 * dt, SD.floorYAt(item.x) - 10)
    }
  }
}
