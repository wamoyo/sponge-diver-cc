// Σφουγγαράς — Sponge Diver
// The kaiki. Buy her at the chandlery, board her (E), sail her (A/D),
// dive off her (S). Surfacing beside her stows your catch in the hold;
// bring the hold to the dock and it all sells at once. The hold is safe
// even if you black out — the sea only takes what you carry.

var SD = window.SD || {}
window.SD = SD

// Pure: a fresh boat anchored off the home dock
SD.newBoat = function () {
  return { x: SD.config.world.boatStartX, hold: [] }
}

// Pure: true when the player owns a kaiki
SD.hasBoat = function (state) {
  return state.upgrades.boat > 0
}

// Pure: current weight stowed in the hold
SD.holdWeight = function (state) {
  return SD.bagWeight(state.boat.hold)
}

// Pure: true when the surfaced player is close enough to board
SD.canBoard = function (state) {
  var p = state.player
  if (!SD.hasBoat(state) || p.aboard) return false
  var surfaced = p.y < SD.config.pxPerM * 0.6
  return surfaced && Math.abs(p.x - state.boat.x) < SD.config.boatBoardRadius
}

// Side effect: climbs aboard / hops off. Called from the E key + touch button.
SD.toggleBoard = function (state) {
  var p = state.player
  if (p.aboard) {
    p.aboard = false
    p.y = 2
    p.vy = 60
    p.vx = 0
    SD.audio.splash()
    return
  }
  if (SD.canBoard(state)) {
    p.aboard = true
    p.form = null // no flukes on deck — you board on two legs
    p.breachT = 0
    p.flipA = 0
    p.vx = 0
    p.vy = 0
    SD.audio.board()
    SD.hud.toast('Aboard the kaiki — A/D to sail, S to dive')
  }
}

// Side effect: sails the boat while aboard; sells the hold at the dock.
// Call every playing frame, before updatePlayer.
SD.updateBoat = function (state, input, dt) {
  if (!SD.hasBoat(state)) return
  var boat = state.boat
  var p = state.player

  if (p.aboard) {
    var ix = SD.clamp(input.x, -1, 1)
    // in the god's storm the swell fights an eastward bow and hurries a west one
    var storm = SD.stormAt(boat.x)
    boat.x += ix * SD.sailSpeed(state) * (ix > 0 ? 1 - storm * 0.3 : 1 + storm * 0.15) * dt
    if (Math.abs(ix) > 0.15) p.facing = ix > 0 ? 1 : -1
    // keep her in honest water — beach at neither shore, stop at the mountain
    boat.x = SD.clamp(boat.x, 320, SD.config.world.boatMaxX)
    p.x = boat.x
    p.y = -14
    p.vx = 0
    p.vy = 0
    p.breath = Math.min(SD.maxBreath(state), p.breath + SD.recoveryRate(state) * dt)
    SD.refillStones(state) // the hold always carries spare stones
    if (input.y > 0.5) SD.toggleBoard(state) // shove off and dive
  }

  // the dock hands unload her the moment she's home with cargo —
  // all but the fish, which are the god's
  var dock = SD.config.world.dock
  if (boat.hold.length && Math.abs(boat.x - dock.x) < dock.radius) {
    var split = SD.splitTribute(boat.hold)
    if (split.sale.length) {
      boat.hold = split.tribute
      SD.sellCatch(state, split.sale, 'Hold Sold at the Dock')
    }
  }
}

// Side effect: stows the surfaced diver's bag into the hold, one item at a
// time, while floating beside the boat. Called from updatePlayer at surface.
SD.updateBoatTransfer = function (state, dt) {
  if (!SD.hasBoat(state)) return
  var p = state.player
  var boat = state.boat
  if (p.aboard || !p.bag.length) return
  if (SD.surfaceYAt(p.x, p.y) > 0) return // surfaced in a pocket — the kaiki is a sea's width away
  if (Math.abs(p.x - boat.x) > SD.config.boatTransferRadius) return

  state.transferAcc = (state.transferAcc || 0) + dt
  if (state.transferAcc < 0.14) return
  state.transferAcc = 0

  var cap = SD.holdCapacity(state)
  for (var i = 0; i < p.bag.length; i++) {
    var t = p.bag[i]
    if (SD.holdWeight(state) + SD.carryInfo(t).weight <= cap) {
      p.bag.splice(i, 1)
      boat.hold.push(t)
      SD.audio.pickup()
      if (!p.bag.length) SD.hud.toast('Catch stowed in the hold — ' + SD.holdWeight(state) + '/' + cap + ' wt')
      return
    }
  }
  // nothing fit
  if (!state.holdFullAt || state.time - state.holdFullAt > 3) {
    state.holdFullAt = state.time
    SD.hud.toast('The hold is full — sail her home', 'warn')
  }
}
