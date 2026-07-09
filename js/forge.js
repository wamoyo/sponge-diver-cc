// Σφουγγαράς — Sponge Diver
// The Forge of Hephaestus, on a dry ledge in the deepest cave. The smith
// does not sell — he perfects: bring an item at the chandlery's best tier
// and enough obsidian in the net, and he works it one god-forged step
// further. All side effects on the DOM + state.

var SD = window.SD || {}
window.SD = SD

SD.forge = (function () {

  var forgeEl = null
  var cardsEl = null
  var obsidianEl = null

  // Side effect: wires up forge DOM. Call once on boot with the game state.
  function init (state) {
    forgeEl = document.getElementById('forge')
    cardsEl = document.getElementById('forge-cards')
    obsidianEl = document.getElementById('forge-obsidian')
    document.getElementById('forge-close').addEventListener('click', function () {
      close(state)
    })
    document.getElementById('forge-x').addEventListener('click', function () {
      close(state)
    })
    forgeEl.addEventListener('click', function (ev) {
      if (ev.target === forgeEl) close(state) // a tap on the dark water closes the forge
    })
    cardsEl.addEventListener('click', function (ev) {
      var btn = ev.target.closest('button[data-bless]')
      if (btn) bless(state, btn.getAttribute('data-bless'))
    })
  }

  // Pure: the chandlery catalog entry for an upgrade id
  function catalogEntry (id) {
    var catalog = SD.config.upgrades
    for (var i = 0; i < catalog.length; i++) {
      if (catalog[i].id === id) return catalog[i]
    }
    return null
  }

  // Pure: obsidian shards carried in the diver's net
  function carriedObsidian (state) {
    var n = 0
    for (var i = 0; i < state.player.bag.length; i++) {
      if (state.player.bag[i] === 'obsidian') n++
    }
    return n
  }

  // Side effect: rebuilds the forge cards from current state
  function rebuild (state) {
    var carried = carriedObsidian(state)
    obsidianEl.textContent = '🌋 ' + carried + ' obsidian'
    var html = ''
    for (var id in SD.config.blessings) {
      var b = SD.config.blessings[id]
      var entry = catalogEntry(id)
      var tier = state.upgrades[id]
      var blessed = tier > entry.tiers.length
      var atBest = tier >= entry.tiers.length
      var effect = blessed
        ? entry.what + ': <b>' + entry.levels[tier] + '</b>'
        : atBest
          ? entry.what + ': <b>' + entry.levels[tier] + '</b> → <b>' + entry.levels[tier + 1] + '</b>'
          : 'He waves it away — «the chandlery’s best first, diver»'
      html += '<div class="shop-card' + (blessed ? ' maxed' : '') + '">' +
        '<div class="card-icon">' + entry.icon + '</div>' +
        '<div class="card-body">' +
        '<h3>' + entry.name + (blessed ? ' <span class="tier-pips">god-forged</span>' : '') + '</h3>' +
        '<div class="card-flavor">' + b.line + '</div>' +
        '<div class="card-effect">' + effect + '</div>' +
        (blessed
          ? '<button class="btn" disabled>God-forged</button>'
          : '<button class="btn" data-bless="' + id + '"' + ((!atBest || carried < b.cost) ? ' disabled' : '') + '>' +
            'Offer ' + b.cost + ' obsidian</button>') +
        '</div></div>'
    }
    cardsEl.innerHTML = html
    if (carried === 0) {
      cardsEl.innerHTML += '<p class="temple-hint">The smith nods at the cave walls. ' +
        '«Obsidian. The fire seamed these caves with it — bring it, and bring your best gear.»</p>'
    }
  }

  // Side effect: pays obsidian from the net for one god-forged tier
  function bless (state, id) {
    var b = SD.config.blessings[id]
    var entry = catalogEntry(id)
    if (!b || !entry) return
    if (state.upgrades[id] !== entry.tiers.length) return // below the cap, or already blessed
    if (carriedObsidian(state) < b.cost) {
      SD.audio.denied()
      return
    }
    for (var paid = 0; paid < b.cost; paid++) {
      state.player.bag.splice(state.player.bag.indexOf('obsidian'), 1)
    }
    state.upgrades[id] += 1
    SD.audio.forge()
    SD.hud.toast('🔥 ' + entry.name + ' — ' + entry.levels[state.upgrades[id]] + ', by the hand of Hephaestus', 'big')
    SD.saveGame(state)
    rebuild(state)
  }

  // Side effect: opens the forge (only meaningful at the smith's ledge)
  function open (state) {
    state.mode = 'forge'
    rebuild(state)
    forgeEl.classList.remove('hidden')
  }

  // Side effect: closes the forge, back into the dark water
  function close (state) {
    state.mode = 'playing'
    forgeEl.classList.add('hidden')
  }

  return { init: init, open: open, close: close, rebuild: rebuild }
})()
