// Σφουγγαράς — Sponge Diver
// The boat shop. Builds upgrade cards from the catalog in config.js
// and handles purchases. All side effects on the DOM + state.

var SD = window.SD || {}
window.SD = SD

SD.shop = (function () {

  var shopEl = null
  var cardsEl = null
  var moneyEl = null

  // Side effect: wires up shop DOM. Call once on boot with the game state.
  function init (state) {
    shopEl = document.getElementById('shop')
    cardsEl = document.getElementById('shop-cards')
    moneyEl = document.getElementById('shop-money')
    document.getElementById('shop-close').addEventListener('click', function () {
      close(state)
    })
    cardsEl.addEventListener('click', function (ev) {
      var btn = ev.target.closest('button[data-upgrade]')
      if (btn) buy(state, btn.getAttribute('data-upgrade'))
    })
  }

  // Pure: tier pips like ●●○ for a catalog entry at the player's tier
  function pips (entry, tier) {
    var out = ''
    for (var i = 0; i < entry.tiers.length; i++) {
      out += i < tier ? '●' : '○'
    }
    return out
  }

  // Side effect: rebuilds all shop cards from current state
  function rebuild (state) {
    moneyEl.textContent = SD.fmtDr(state.drachmae)
    var html = ''
    var catalog = SD.config.upgrades
    for (var i = 0; i < catalog.length; i++) {
      var u = catalog[i]
      var tier = state.upgrades[u.id]
      var maxed = tier >= u.tiers.length
      var cost = maxed ? 0 : u.tiers[tier]
      var effect = maxed
        ? u.what + ': <b>' + u.levels[tier] + '</b>'
        : u.what + ': <b>' + u.levels[tier] + '</b> → <b>' + u.levels[tier + 1] + '</b>'
      html += '<div class="shop-card' + (maxed ? ' maxed' : '') + '">' +
        '<div class="card-icon">' + u.icon + '</div>' +
        '<div class="card-body">' +
        '<h3>' + u.name + ' <span class="tier-pips">' + pips(u, tier) + '</span></h3>' +
        '<div class="card-flavor">' + u.flavor + '</div>' +
        '<div class="card-effect">' + effect + '</div>' +
        (maxed
          ? '<button class="btn" disabled>Fully equipped</button>'
          : '<button class="btn" data-upgrade="' + u.id + '"' + (state.drachmae < cost ? ' disabled' : '') + '>' +
            SD.fmtDr(cost) + '</button>') +
        '</div></div>'
    }
    cardsEl.innerHTML = html
  }

  // Side effect: attempts a purchase, updates state + save + cards
  function buy (state, id) {
    var entry = null
    var catalog = SD.config.upgrades
    for (var i = 0; i < catalog.length; i++) {
      if (catalog[i].id === id) entry = catalog[i]
    }
    if (!entry) return
    var tier = state.upgrades[id]
    if (tier >= entry.tiers.length) return
    var cost = entry.tiers[tier]
    if (state.drachmae < cost) {
      SD.audio.denied()
      return
    }
    state.drachmae -= cost
    state.upgrades[id] += 1
    SD.audio.buy()
    if (id === 'boat' && state.upgrades.boat === 1) {
      state.boat.x = SD.config.world.boatStartX
      SD.hud.toast('⛵ The kaiki is yours — she waits off the jetty', 'big')
    } else {
      SD.hud.toast(entry.name + ' — ' + entry.levels[state.upgrades[id]])
    }
    SD.saveGame(state)
    rebuild(state)
  }

  // Side effect: opens the shop (only meaningful at the surface)
  function open (state) {
    state.mode = 'shop'
    rebuild(state)
    shopEl.classList.remove('hidden')
  }

  // Side effect: closes the shop, back to diving
  function close (state) {
    state.mode = 'playing'
    shopEl.classList.add('hidden')
  }

  return { init: init, open: open, close: close, rebuild: rebuild }
})()
