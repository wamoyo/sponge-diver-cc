// Σφουγγαράς — Sponge Diver
// DOM HUD: breath bar, depth, money, bag pips, toasts, band captions,
// the sell tally, and the blackout overlay. All side effects on the DOM.

var SD = window.SD || {}
window.SD = SD

SD.hud = (function () {

  var el = {}
  var lastBand = null
  var captionTimer = null
  var tallyTimer = null
  var bagDrawn = { size: -1, filled: -1 }

  // Side effect: caches element references. Call once on boot.
  function init () {
    var ids = ['hud', 'breath-fill', 'hud-depth', 'hud-money', 'bag-pips', 'caption',
      'toasts', 'surface-hint', 'vignette', 'flash', 'tally', 'blackout', 'blackout-line', 'touch-shop']
    for (var i = 0; i < ids.length; i++) {
      el[ids[i]] = document.getElementById(ids[i])
    }
  }

  // Side effect: syncs the per-frame HUD numbers to the DOM
  function sync (state) {
    var p = state.player
    var maxBreath = SD.maxBreath(state)
    var ratio = SD.clamp(p.breath / maxBreath, 0, 1)

    el['breath-fill'].style.width = (ratio * 100).toFixed(1) + '%'
    el['breath-fill'].className = ratio < 0.28 ? 'low' : ''
    el['hud-depth'].textContent = Math.round(SD.depthM(p.y)) + ' m'
    el['hud-money'].textContent = SD.fmtDr(state.drachmae)

    var size = SD.bagSize(state)
    if (bagDrawn.size !== size || bagDrawn.filled !== p.bag.length) {
      bagDrawn.size = size
      bagDrawn.filled = p.bag.length
      var pips = ''
      for (var i = 0; i < size; i++) {
        pips += '<span class="pip' + (i < p.bag.length ? ' full' : '') + '"></span>'
      }
      el['bag-pips'].innerHTML = pips
    }

    var surfaced = p.y < SD.config.pxPerM * 0.4
    el['surface-hint'].classList.toggle('hidden', !(surfaced && state.mode === 'playing'))
    el['touch-shop'].classList.toggle('hidden', !(surfaced && state.mode === 'playing'))

    var low = ratio < 0.28 && !surfaced
    el.vignette.style.opacity = low ? (1 - ratio / 0.28).toFixed(2) : '0'
    el.flash.style.opacity = state.effects.flash > 0 ? (state.effects.flash * 0.8).toFixed(2) : '0'
  }

  // Side effect: shows a temporary toast message
  function toast (text, cls) {
    var div = document.createElement('div')
    div.className = 'toast' + (cls ? ' ' + cls : '')
    div.textContent = text
    el.toasts.appendChild(div)
    var life = cls === 'big' ? 6000 : 2600
    setTimeout(function () { div.classList.add('out') }, life)
    setTimeout(function () { div.remove() }, life + 600)
    while (el.toasts.children.length > 6) el.toasts.firstChild.remove()
  }

  // Side effect: shows the depth-band caption when the diver enters a new band
  function updateBand (state) {
    var band = SD.bandAt(SD.depthM(state.player.y))
    if (band === lastBand) return
    var descending = !lastBand || band.maxM > lastBand.maxM
    lastBand = band
    if (!descending || band.maxM <= 3) return
    el.caption.textContent = '— ' + band.name + ' —'
    el.caption.classList.add('show')
    clearTimeout(captionTimer)
    captionTimer = setTimeout(function () { el.caption.classList.remove('show') }, 2400)
  }

  // Side effect: shows the sold-catch tally panel
  function tally (groups, total, conditioned) {
    var html = '<h3>Catch Sold</h3>'
    for (var type in groups) {
      var g = groups[type]
      html += '<div class="tally-line"><span>' + g.name + (g.count > 1 ? ' × ' + g.count : '') +
        '</span><span>' + SD.fmtDr(g.value) + '</span></div>'
    }
    html += '<div class="tally-total"><span>Total</span><span>' + SD.fmtDr(total) + '</span></div>'
    if (conditioned) html += '<div class="tally-note">Your lungs grow stronger. +' + SD.config.conditioningPerDive + ' s breath</div>'
    el.tally.innerHTML = html
    el.tally.classList.remove('hidden')
    clearTimeout(tallyTimer)
    tallyTimer = setTimeout(function () { el.tally.classList.add('hidden') }, 4200)
  }

  // Side effect: shows the blackout overlay with a line fitting the loss
  function showBlackout (state, kept) {
    var line
    if (state.upgrades.favor > 0 && kept.length) {
      line = 'Everything goes dark... but Poseidon holds your net closed.'
    } else if (kept.indexOf('trident') !== -1) {
      line = 'Everything goes dark. The sea takes your catch — but your hands will not give up the trident.'
    } else if (state.player.bag.length || kept.length) {
      line = 'The sea keeps your catch. The crew hauls you up, coughing.'
    } else {
      line = 'Everything goes dark. The crew hauls you up, coughing.'
    }
    el['blackout-line'].textContent = line
    el.blackout.classList.remove('hidden')
    requestAnimationFrame(function () { el.blackout.classList.add('dark') })
  }

  // Side effect: hides the blackout overlay
  function hideBlackout () {
    el.blackout.classList.remove('dark')
    setTimeout(function () { el.blackout.classList.add('hidden') }, 700)
  }

  // Side effect: shows/hides the main HUD block
  function setVisible (visible) {
    el.hud.classList.toggle('hidden', !visible)
  }

  return {
    init: init,
    sync: sync,
    toast: toast,
    updateBand: updateBand,
    tally: tally,
    showBlackout: showBlackout,
    hideBlackout: hideBlackout,
    setVisible: setVisible
  }
})()
