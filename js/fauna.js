// Σφουγγαράς — Sponge Diver
// The animals of the sea: mullet in the shallows, bream over the reef,
// grouper in the dark. They cruise, they flee the spear, and — with a good
// kamaki and a quiet approach — they become tribute for the temple.

var SD = window.SD || {}
window.SD = SD

// Side effect: advances all fauna, resolves fleeing + spearing + respawns.
// With interactive=false nothing is catchable and nothing panics.
SD.updateFauna = function (state, dt, interactive) {
  var p = state.player
  var fauna = state.world.fauna
  var tier = state.upgrades.kamaki
  var reach = SD.config.kamakiReach[tier]

  if (p.spearCd > 0) p.spearCd -= dt
  if (p.spearFlash > 0) p.spearFlash -= dt

  for (var i = 0; i < fauna.length; i++) {
    var f = fauna[i]
    var cfg = SD.config.fauna[f.kind]

    // respawn: the sea replaces what the spear takes
    if (f.taken) {
      if (state.time >= f.respawnAt) {
        f.taken = false
        f.x = SD.clamp(f.x + SD.randRange(-600, 600), 350, SD.config.world.widthPx - 350)
        var maxM = Math.min(cfg.maxM, SD.floorDepthAt(f.x) - 3)
        if (maxM > cfg.minM) {
          f.y = SD.randRange(cfg.minM, maxM) * SD.config.pxPerM
          f.homeY = f.y
        } else {
          f.respawnAt = state.time + 5 // bad spot; try again shortly
          f.taken = true
        }
      }
      continue
    }

    f.phase += dt
    var toPlayer = SD.dist(f.x, f.y, p.x, p.y)
    var under = p.y > SD.config.pxPerM * 0.4

    // --- fear of the diver ---
    if (interactive && under && toPlayer < cfg.fleeRadius && f.mode !== 'flee') {
      f.mode = 'flee'
      f.fleeT = 1.1
      var away = Math.max(toPlayer, 0.001)
      f.vx = (f.x - p.x) / away * cfg.fleeSpeed
      f.vy = (f.y - p.y) / away * cfg.fleeSpeed * 0.7
    }

    if (f.mode === 'flee') {
      f.fleeT -= dt
      f.x += f.vx * dt
      f.y += f.vy * dt
      f.vx *= Math.exp(-1.2 * dt)
      f.vy *= Math.exp(-1.2 * dt)
      if (f.fleeT <= 0) {
        f.mode = 'cruise'
        f.vx = (f.vx < 0 ? -1 : 1) * cfg.cruise
        f.homeY = f.y
      }
    } else {
      f.x += f.vx * dt
      f.y = f.homeY + Math.sin(f.phase * 1.1) * 14
      if (f.x < 320) { f.x = 320; f.vx = Math.abs(f.vx) }
      if (f.x > SD.config.world.widthPx - 320) { f.x = SD.config.world.widthPx - 320; f.vx = -Math.abs(f.vx) }
      // read the bottom ahead: rise over gentle ground, turn from steep ground
      var dir = f.vx >= 0 ? 1 : -1
      var aheadY = SD.floorYAt(f.x + dir * 70)
      if (f.homeY > aheadY - 46) {
        if (aheadY - 46 > cfg.minM * SD.config.pxPerM * 0.5) {
          f.homeY = aheadY - 46
        } else {
          f.vx = -f.vx // shoal ahead — come about
        }
      }
    }

    // stay in honest water, never in the ground
    var floorY = SD.floorYAt(f.x)
    if (f.y > floorY - 34) { f.y = floorY - 34; f.homeY = Math.min(f.homeY, f.y); f.vy = Math.min(f.vy, 0) }
    if (f.y < cfg.minM * SD.config.pxPerM * 0.5) f.y = cfg.minM * SD.config.pxPerM * 0.5

    // --- the strike ---
    if (interactive && under && tier > 0 && p.spearCd <= 0 && toPlayer < reach) {
      p.spearCd = SD.config.kamakiCooldown[tier]
      p.spearFlash = 0.35
      if (SD.bagWeight(p.bag) + cfg.weight > SD.bagCapacity(state)) {
        SD.hud.toast('The ' + cfg.name.toLowerCase() + ' slips away — net full!', 'warn')
        continue
      }
      f.taken = true
      f.respawnAt = state.time + cfg.respawn
      f.mode = 'cruise'
      p.bag.push(f.kind)
      state.stats.items = (state.stats.items || 0) + 1
      SD.awardXp(state, cfg.xp)
      SD.audio.spear()
      SD.burstBubbles(state, f.x, f.y, 6)
      SD.hud.toast('🎣 ' + cfg.name + ' — tribute for the god (+' + cfg.xp + ' xp)')
    }
  }
}
