// Σφουγγαράς — Sponge Diver
// The animals of the sea — and the monsters. Fish cruise and flee the
// kamaki; the boss cast (Karcharias, the Kraken, Ketos) takes many spear
// hits, fights back, and falls for tribute trophies and key relics.

var SD = window.SD || {}
window.SD = SD

// Side effect: a fallen boss pays out — trophy tribute, scattered treasure,
// experience, and the relic it owed you
function slayBoss (state, f, cfg) {
  var p = state.player
  f.taken = true
  f.respawnAt = state.time + cfg.respawn
  SD.awardXp(state, cfg.xp)
  SD.audio.fanfare()
  state.effects.shake = 12

  // the trophy sinks where it fell — pry it loose like any treasure
  state.world.loot.push({
    type: cfg.drop, x: f.x, y: Math.min(f.y, SD.floorYAt(f.x) - 14),
    phase: 0, progress: 0, taken: false, dropped: true
  })
  // and a little of what it swallowed over the years
  for (var s = 0; s < 2; s++) {
    state.world.loot.push({
      type: s === 0 ? 'laurel' : 'shard',
      x: f.x + SD.randRange(-50, 50), y: f.y + SD.randRange(-20, 20),
      phase: Math.random() * SD.TAU, progress: 0, taken: false, dropped: true
    })
  }

  state.slain[f.kind] = true
  if (f.kind === 'karcharias') {
    state.relics.hide = true
    SD.hud.toast('🦈 KARCHARIAS FALLS — you wear his hide: stings hurt half as much, forever', 'big')
  } else if (f.kind === 'kraken') {
    state.relics.feastPending = true
    SD.hud.toast('🐙 THE KRAKEN FALLS — haul word to the dock: Billy fires up the grill', 'big')
  } else {
    SD.hud.toast('🌊 KETOS FALLS — the deep goes quiet. Its horn is a king\'s tribute', 'big')
  }
  SD.saveGame(state)
}

// Side effect: one spear strike against a boss — damage, enrage, death
function spearBoss (state, f, cfg) {
  var p = state.player
  f.hp -= SD.spearDamage(state)
  p.spearFlash = 0.35
  f.hurtT = 0.3
  SD.audio.spear()
  SD.burstBubbles(state, f.x, f.y, 8)
  if (f.hp <= 0) {
    slayBoss(state, f, cfg)
  } else {
    SD.hud.toast(cfg.name + ' — ' + f.hp + '/' + f.maxHp, 'warn')
  }
}

// Side effect: Karcharias — circles wide, then charges in a straight line.
// Spear him as he passes; don't be where his teeth are.
function updateKarcharias (state, f, dt, interactive) {
  var p = state.player
  var cfg = SD.config.bosses.karcharias
  var toPlayer = SD.dist(f.x, f.y, p.x, p.y)
  var under = p.y > SD.surfaceYAt(p.x) + 12
  f.modeT -= dt

  if (f.mode === 'patrol') {
    f.x += f.vx * dt
    if (f.x < f.homeX - 900) { f.x = f.homeX - 900; f.vx = Math.abs(f.vx) }
    if (f.x > f.homeX + 900) { f.x = f.homeX + 900; f.vx = -Math.abs(f.vx) }
    f.y = f.homeY + Math.sin(f.phase * 0.7) * 60
    if (interactive && under && toPlayer < cfg.aggroR) {
      f.mode = 'circle'
      f.angle = Math.atan2(f.y - p.y, f.x - p.x)
      f.modeT = cfg.chargeCd
      SD.hud.toast('🦈 KARCHARIAS has your scent', 'big')
      SD.audio.conch()
    }
  } else if (f.mode === 'circle') {
    f.angle += cfg.circleSpeed * dt
    var tx = p.x + Math.cos(f.angle) * cfg.circleR
    var ty = p.y + Math.sin(f.angle) * cfg.circleR
    f.x += (tx - f.x) * Math.min(1, 3 * dt)
    f.y += (ty - f.y) * Math.min(1, 3 * dt)
    f.vx = Math.cos(f.angle + Math.PI / 2) // facing along the circle
    if (!interactive || toPlayer > cfg.aggroR * 1.6 || !under) {
      f.mode = 'patrol'
      f.vx = cfg.circleSpeed * 60
    } else if (f.modeT <= 0) {
      f.mode = 'windup'
      f.modeT = cfg.windup
      f.chargeX = p.x
      f.chargeY = p.y
    }
  } else if (f.mode === 'windup') {
    // a heartbeat of stillness, nose to you — MOVE
    if (f.modeT <= 0) {
      var d = Math.max(SD.dist(f.x, f.y, f.chargeX, f.chargeY), 0.001)
      f.vx = (f.chargeX - f.x) / d * cfg.chargeSpeed
      f.vy = (f.chargeY - f.y) / d * cfg.chargeSpeed
      f.mode = 'charge'
      f.modeT = 0.9
    }
  } else if (f.mode === 'charge') {
    f.x += f.vx * dt
    f.y += f.vy * dt
    if (interactive && toPlayer < cfg.r + 16) {
      SD.applySting(state, cfg.bite, f.x, f.y, 'KARCHARIAS bites!', 380)
    }
    if (f.modeT <= 0) {
      f.mode = 'circle'
      f.modeT = cfg.chargeCd
    }
  }

  // never in the ground, never in the sky
  var floorY = SD.floorYAt(f.x)
  f.y = SD.clamp(f.y, 40 * 32, floorY - 50)
}

// Side effect: the Kraken — lord of its grotto. Reach too close and a
// tentacle takes you; stab your way out.
function updateKraken (state, f, dt, interactive) {
  var p = state.player
  var cfg = SD.config.bosses.kraken
  var toPlayer = SD.dist(f.x, f.y, p.x, p.y)
  f.modeT -= dt

  // it sways in its slot, always
  f.x = f.homeX + Math.sin(f.phase * 0.6) * 14
  f.y = f.homeY + Math.sin(f.phase * 0.4) * 10

  if (f.mode === 'lurk') {
    if (interactive && toPlayer < cfg.grabR && f.modeT <= 0 && !state.devMode) {
      f.mode = 'grab'
      f.grabT = cfg.grabHold
      SD.applySting(state, cfg.bite, f.x, f.y, 'The KRAKEN takes hold!', 60)
      SD.hud.toast('🐙 Stab it to break free!', 'warn')
    }
  } else if (f.mode === 'grab') {
    f.grabT -= dt
    // held: dragged toward the beak, breath crushed away
    var d = Math.max(toPlayer, 0.001)
    p.vx = (f.x - p.x) / d * 60
    p.vy = (f.y - p.y) / d * 60
    p.breath -= cfg.grabDrain * dt
    p.entangled = Math.max(p.entangled, 0.2)
    if (f.grabT <= 0 || toPlayer > cfg.grabR * 2 || !interactive) {
      f.mode = 'lurk'
      f.modeT = 2.4 // it must gather itself before grabbing again
    }
  }
}

// Side effect: Ketos — the roaming leviathan of the deep water. You don't
// find it; it finds you.
function updateKetos (state, f, dt, interactive) {
  var p = state.player
  var cfg = SD.config.bosses.ketos
  var toPlayer = SD.dist(f.x, f.y, p.x, p.y)
  var under = p.y > SD.surfaceYAt(p.x) + 12
  var deepPlayer = SD.depthM(p.y) > 45

  if (f.mode === 'roam') {
    f.x += f.vx * dt
    if (f.x < cfg.x1) { f.x = cfg.x1; f.vx = Math.abs(f.vx) }
    if (f.x > cfg.x2) { f.x = cfg.x2; f.vx = -Math.abs(f.vx) }
    f.y += Math.sin(f.phase * 0.5) * 30 * dt
    if (interactive && under && deepPlayer && toPlayer < cfg.aggroR) {
      f.mode = 'chase'
      SD.hud.toast('🌊 Something vast turns toward you — KETOS', 'big')
      SD.audio.conch()
    }
  } else if (f.mode === 'chase') {
    var d = Math.max(toPlayer, 0.001)
    f.x += (p.x - f.x) / d * cfg.chase * dt
    f.y += (p.y - f.y) / d * cfg.chase * 0.8 * dt
    if (interactive && toPlayer < cfg.r + 14) {
      SD.applySting(state, cfg.ram, f.x, f.y, 'KETOS rams you!', 420)
    }
    if (!interactive || !deepPlayer || toPlayer > cfg.aggroR * 1.8) {
      f.mode = 'roam'
      f.vx = (f.vx < 0 ? -1 : 1) * cfg.cruise
    }
  }

  var floorY = SD.floorYAt(f.x)
  f.y = SD.clamp(f.y, cfg.minM * 32 * 0.7, floorY - 60)
}

// Side effect: advances all fauna — fish and bosses — plus spearing.
// With interactive=false nothing is catchable and nothing hunts.
SD.updateFauna = function (state, dt, interactive) {
  var p = state.player
  var fauna = state.world.fauna
  var tier = state.upgrades.kamaki
  var reach = SD.config.kamakiReach[tier]

  if (p.spearCd > 0) p.spearCd -= dt
  if (p.spearFlash > 0) p.spearFlash -= dt

  for (var i = 0; i < fauna.length; i++) {
    var f = fauna[i]

    // respawn: the sea replaces what the spear takes
    if (f.taken) {
      if (state.time >= f.respawnAt) {
        f.taken = false
        if (f.boss) {
          f.hp = f.maxHp
          f.mode = f.kind === 'kraken' ? 'lurk' : f.kind === 'ketos' ? 'roam' : 'patrol'
          if (f.homeX) { f.x = f.homeX; f.y = f.homeY }
        } else {
          var cfgR = SD.config.fauna[f.kind]
          f.x = SD.clamp(f.x + SD.randRange(-600, 600), 350, 39400)
          var maxM = Math.min(cfgR.maxM, SD.floorDepthAt(f.x) - 3)
          if (maxM > cfgR.minM) {
            f.y = SD.randRange(cfgR.minM, maxM) * SD.config.pxPerM
            f.homeY = f.y
          } else {
            f.respawnAt = state.time + 5
            f.taken = true
          }
        }
      }
      continue
    }

    f.phase += dt
    if (f.hurtT > 0) f.hurtT -= dt

    // --- the bosses run their own minds ---
    if (f.boss) {
      var bcfg = SD.config.bosses[f.kind]
      if (f.kind === 'karcharias') updateKarcharias(state, f, dt, interactive)
      else if (f.kind === 'kraken') updateKraken(state, f, dt, interactive)
      else updateKetos(state, f, dt, interactive)

      // spear the monster
      if (interactive && tier > 0 && p.spearCd <= 0 &&
        SD.dist(f.x, f.y, p.x, p.y) < reach + bcfg.r * 0.5) {
        p.spearCd = SD.config.kamakiCooldown[tier]
        spearBoss(state, f, bcfg)
      }
      continue
    }

    // --- ordinary fish ---
    var cfg = SD.config.fauna[f.kind]
    var toPlayer = SD.dist(f.x, f.y, p.x, p.y)
    var under = p.y > SD.surfaceYAt(p.x) + SD.config.pxPerM * 0.4

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
      if (f.x > 39400) { f.x = 39400; f.vx = -Math.abs(f.vx) }
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
