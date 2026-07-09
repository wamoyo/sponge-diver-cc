// Σφουγγαράς — Sponge Diver
// Poseidon's temple on the far shore. The god does not take drachmae —
// he takes tribute: speared fish, pried octopus. Offer your catch and
// he trains the body itself. All side effects on the DOM + state.

var SD = window.SD || {}
window.SD = SD

SD.temple = (function () {

  var templeEl = null
  var cardsEl = null
  var moneyEl = null
  var statsEl = null

  // Side effect: wires up temple DOM. Call once on boot with the game state.
  function init (state) {
    templeEl = document.getElementById('temple')
    cardsEl = document.getElementById('temple-cards')
    moneyEl = document.getElementById('temple-money')
    statsEl = document.getElementById('temple-stats')
    document.getElementById('temple-close').addEventListener('click', function () {
      close(state)
    })
    cardsEl.addEventListener('click', function (ev) {
      var btn = ev.target.closest('button[data-train]')
      if (btn) train(state, btn.getAttribute('data-train'))
    })
  }

  // Pure: rank pips like ●●●○○
  function pips (rank, max) {
    var out = ''
    for (var i = 0; i < max; i++) {
      out += i < rank ? '●' : '○'
    }
    return out
  }

  // Pure: true when the kaiki is anchored at the mountain's face — near
  // enough; the god knows his own, even through the rock
  function boatAtTemple (state) {
    return SD.hasBoat(state) &&
      Math.abs(state.boat.x - SD.config.world.mountain.faceX) < 500
  }

  // Pure: every tribute item within the god's reach — in the net, or in the
  // kaiki's hold if she's anchored at the temple jetty
  function reachableTribute (state) {
    var items = SD.splitTribute(state.player.bag).tribute.map(function (t) { return { type: t, from: 'bag' } })
    if (boatAtTemple(state)) {
      var hold = SD.splitTribute(state.boat.hold).tribute
      for (var i = 0; i < hold.length; i++) {
        items.push({ type: hold[i], from: 'hold' })
      }
    }
    return items
  }

  // Pure: total offering points within reach
  function carriedPoints (state) {
    return SD.offeringPoints(reachableTribute(state).map(function (it) { return it.type }))
  }

  // Pure: current effect line for a track at the player's rank
  function effectLine (state, key) {
    var cfg = SD.config.training[key]
    if (key === 'apnea') {
      return 'Breath: <b>' + SD.maxBreath(state).toFixed(1) + ' s</b> → <b>+' + cfg.per + ' s</b>'
    }
    if (key === 'stroke') {
      return 'Speed: <b>' + Math.round(SD.maxSpeed(state)) + '</b> → <b>+' + cfg.per + '</b>'
    }
    var panicGone = state.training.discipline >= cfg.max
    return 'Recovery: <b>' + SD.recoveryRate(state).toFixed(1) + '/s</b> → <b>+' + cfg.per + '</b>' +
      (panicGone ? ' · panic <b>mastered</b>' : ' · panic −' + Math.round((1 - SD.panicScale(state)) * 100) + '%')
  }

  // Side effect: rebuilds the temple cards from current state
  function rebuild (state) {
    var carried = carriedPoints(state)
    moneyEl.textContent = '🐟 ' + carried
    statsEl.innerHTML =
      '<span>Level ' + SD.level(state) + '</span>' +
      '<span>Fitness ' + Math.round(SD.fitness(state) * 100) + '%</span>' +
      '<span>Tribute carried: ' + carried + (boatAtTemple(state) ? ' (net + hold)' : '') + '</span>'

    var html = ''
    for (var key in SD.config.training) {
      var cfg = SD.config.training[key]
      var rank = state.training[key]
      var maxed = rank >= cfg.max
      var cost = maxed ? 0 : SD.offeringCost(key, rank)
      html += '<div class="shop-card' + (maxed ? ' maxed' : '') + '">' +
        '<div class="card-icon">' + cfg.icon + '</div>' +
        '<div class="card-body">' +
        '<h3>' + cfg.name + ' <span class="tier-pips">' + pips(rank, cfg.max) + '</span></h3>' +
        '<div class="card-flavor">' + cfg.desc + '</div>' +
        '<div class="card-effect">' + effectLine(state, key) + '</div>' +
        (maxed
          ? '<button class="btn" disabled>Peak form</button>'
          : '<button class="btn" data-train="' + key + '"' + (carried < cost ? ' disabled' : '') + '>' +
            'Offer ' + cost + ' 🐟</button>') +
        '</div></div>'
    }
    cardsEl.innerHTML = html

    if (state.upgrades.kamaki < 1 && carried === 0) {
      cardsEl.innerHTML += '<p class="temple-hint">The priests eye your empty net. ' +
        '«The god takes fish, not coin. The chandlery sells a kamaki — or a knife will pry an octopus.»</p>'
    }
  }

  // Side effect: consumes tribute (smallest offerings first) from the net,
  // then the hold. Returns true if the cost was met.
  function consumeTribute (state, cost) {
    var items = reachableTribute(state)
    items.sort(function (a, b) { return SD.offeringOf(a.type) - SD.offeringOf(b.type) })
    var chosen = []
    var sum = 0
    for (var i = 0; i < items.length && sum < cost; i++) {
      chosen.push(items[i])
      sum += SD.offeringOf(items[i].type)
    }
    if (sum < cost) return false
    for (var c = 0; c < chosen.length; c++) {
      var list = chosen[c].from === 'bag' ? state.player.bag : state.boat.hold
      list.splice(list.indexOf(chosen[c].type), 1)
    }
    return true
  }

  // Side effect: offers tribute for one rank of training
  function train (state, key) {
    var cfg = SD.config.training[key]
    if (!cfg) return
    var rank = state.training[key]
    if (rank >= cfg.max) return
    var cost = SD.offeringCost(key, rank)
    if (!consumeTribute(state, cost)) {
      SD.audio.denied()
      return
    }
    state.training[key] += 1
    SD.audio.offering()
    SD.hud.toast(cfg.name + ' — rank ' + state.training[key] + ' · the god accepts')
    if (key === 'discipline' && state.training.discipline >= cfg.max) {
      SD.hud.toast('🧘 Panic mastered — your breath is your own now', 'big')
    }
    SD.saveGame(state)
    rebuild(state)
  }

  // Side effect: opens the temple (only meaningful at the temple jetty)
  function open (state) {
    state.mode = 'temple'
    rebuild(state)
    templeEl.classList.remove('hidden')
  }

  // Side effect: closes the temple, back to the water
  function close (state) {
    state.mode = 'playing'
    templeEl.classList.add('hidden')
  }

  return { init: init, open: open, close: close, rebuild: rebuild }
})()
