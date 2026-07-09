// Σφουγγαράς — Sponge Diver
// DOM HUD: breath bar, depth, money, level + XP, weight pips, the hold,
// toasts, band captions, the sell tally, contextual surface hints, the
// parchment, and the blackout overlay. All side effects on the DOM.

var SD = window.SD || {}
window.SD = SD

SD.hud = (function () {

  var el = {}
  var lastBand = null
  var lastHint = ''
  var captionTimer = null
  var tallyTimer = null
  var bagDrawn = { cap: -1, filled: -1 }

  // Side effect: caches element references. Call once on boot.
  function init () {
    var ids = ['hud', 'breath-fill', 'xp-fill', 'hud-level', 'hud-depth', 'hud-money',
      'bag-pips', 'bag-weight', 'hud-hold', 'caption', 'toasts', 'surface-hint',
      'vignette', 'flash', 'tally', 'blackout', 'blackout-line', 'parchment',
      'touch-shop', 'touch-temple', 'touch-boat']
    for (var i = 0; i < ids.length; i++) {
      el[ids[i]] = document.getElementById(ids[i])
    }
  }

  // Pure: the right hint line for where the diver is floating
  function surfaceHintFor (state) {
    var p = state.player
    var cfg = SD.config.world
    if (p.aboard) return 'Sailing the kaiki — <b>A/D</b> sail · <b>S</b> dive off'
    if (Math.abs(p.x - cfg.dock.x) < cfg.dock.radius) {
      return 'The village dock — your catch sells itself · <b>B</b> — chandlery'
    }
    if (Math.abs(p.x - cfg.temple.x) < cfg.temple.radius) {
      return "Poseidon's temple — <b>T</b> — train"
    }
    if (SD.canBoard(state)) return 'Your kaiki — <b>E</b> — climb aboard'
    return 'At the surface — breathe. <b>S / ↓</b> — dive'
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

    var lv = SD.levelFromXp(state.xp)
    el['hud-level'].textContent = 'Lv ' + lv.level + (state.devMode ? ' ⚡DEV' : '')
    el['xp-fill'].style.width = ((lv.into / lv.need) * 100).toFixed(1) + '%'

    var cap = SD.bagCapacity(state)
    var wt = SD.bagWeight(p.bag)
    if (bagDrawn.cap !== cap || bagDrawn.filled !== wt) {
      bagDrawn.cap = cap
      bagDrawn.filled = wt
      var pips = ''
      for (var i = 0; i < cap; i++) {
        pips += '<span class="pip' + (i < wt ? ' full' : '') + '"></span>'
      }
      el['bag-pips'].innerHTML = pips
      el['bag-weight'].textContent = wt + '/' + cap + ' wt'
    }

    if (SD.hasBoat(state)) {
      el['hud-hold'].classList.remove('hidden')
      el['hud-hold'].textContent = '⛵ Hold ' + SD.holdWeight(state) + '/' + SD.holdCapacity(state) + ' wt'
    } else {
      el['hud-hold'].classList.add('hidden')
    }

    var surfaced = p.y < SD.surfaceYAt(p.x) + SD.config.pxPerM * 0.4 || p.aboard
    var showHint = surfaced && state.mode === 'playing'
    el['surface-hint'].classList.toggle('hidden', !showHint)
    if (showHint) {
      var hint = surfaceHintFor(state)
      if (hint !== lastHint) {
        lastHint = hint
        el['surface-hint'].innerHTML = hint
      }
    }

    // touch pills, by zone
    var cfg = SD.config.world
    var inDock = surfaced && Math.abs(p.x - cfg.dock.x) < cfg.dock.radius
    var inTemple = surfaced && Math.abs(p.x - cfg.temple.x) < cfg.temple.radius
    var nearBoat = SD.canBoard(state) || p.aboard
    el['touch-shop'].classList.toggle('hidden', !(inDock && state.mode === 'playing'))
    el['touch-temple'].classList.toggle('hidden', !(inTemple && state.mode === 'playing'))
    el['touch-boat'].classList.toggle('hidden', !(nearBoat && state.mode === 'playing'))
    if (nearBoat) el['touch-boat'].textContent = p.aboard ? '🌊 Dive Off' : '⛵ Board'

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

  // Side effect: shows the place-name caption when the diver enters a new region
  function updateBand (state) {
    var p = state.player
    var region = SD.regionAt(p.x, SD.depthM(p.y))
    if (region === lastBand) return
    var first = lastBand === null
    lastBand = region
    if (first) return // no caption for the spawn point
    el.caption.textContent = '— ' + region + ' —'
    el.caption.classList.add('show')
    clearTimeout(captionTimer)
    captionTimer = setTimeout(function () { el.caption.classList.remove('show') }, 2400)
  }

  // Side effect: shows the sold-catch tally panel (now with experience)
  function tally (groups, total, xp, label) {
    var html = '<h3>' + (label || 'Catch Sold') + '</h3>'
    for (var type in groups) {
      var g = groups[type]
      html += '<div class="tally-line"><span>' + g.name + (g.count > 1 ? ' × ' + g.count : '') +
        '</span><span>' + SD.fmtDr(g.value) + '</span></div>'
    }
    html += '<div class="tally-total"><span>Total</span><span>' + SD.fmtDr(total) + '</span></div>'
    if (xp) html += '<div class="tally-note">+' + xp + ' experience</div>'
    el.tally.innerHTML = html
    el.tally.classList.remove('hidden')
    clearTimeout(tallyTimer)
    tallyTimer = setTimeout(function () { el.tally.classList.add('hidden') }, 4200)
  }

  // Nikandros' six messages, in the order the sea keeps them
  var BOTTLE_TEXTS = [
    '\u00abSo you found my cave \u2014 and my fino beds. Keep them; where I have gone I need no sponges. Listen: cross the deep water, past the kelp, past the dark. Under the far mountain the Earth-Shaker keeps a temple, and he trains the lungs of those who bring him tribute \u2014 fish, diver, not coin. And mind the middle of the crossing. What sleeps down there owns everything that glitters.\u00bb',
    '\u00abThe forest hides a throat of stone \u2014 eighty meters if it is one. Where it bottoms, the east wall is only kelp, and behind the kelp I heard water MOVING. I never had the knife for it. Perhaps you will.\u00bb',
    '\u00abThe great one ahead is called Anemone. Her belly still holds the captain\'s strongbox \u2014 I have seen it through the breach. Mind the white shark. He has kept her forty years, and he considers himself owed.\u00bb',
    '\u00abThe columns of fire throw a man upward like a cork from a jar. Old men say Hephaestus works below, and I believe them. Go down BETWEEN the fires, take the black glass, and ride a column home laughing.\u00bb',
    '\u00abSomething in that hole took my brother whole. If an arm takes you \u2014 STAB. Do not pull away. Stab, and keep stabbing, and it will remember why it fears us.\u00bb',
    '\u00abIf you are reading this, I did not come back up. The trident sang to me and I reached for it. The god is faster than he looks, friend. Take everything \u2014 it is yours now. And light a lamp in the village for Nikandros.\u00bb'
  ]

  // Side effect: unrolls one of Nikandros' messages
  function showParchment (state, idx) {
    state.mode = 'parchment'
    var textEl = document.getElementById('parchment-text')
    if (textEl) textEl.textContent = BOTTLE_TEXTS[idx || 0]
    el.parchment.classList.remove('hidden')
  }

  // Side effect: rolls it back up
  function hideParchment () {
    el.parchment.classList.add('hidden')
  }

  // Side effect: the rescue — your buddy reaches you in the dark
  function showBlackout (state) {
    el['blackout-line'].textContent =
      'The world narrows to a point of light... and a hand closes on your wrist. ' +
      'Yiannis. He kicks for the sun with you under his arm, your catch still knotted to your belt.'
    el.blackout.classList.remove('hidden')
    requestAnimationFrame(function () { el.blackout.classList.add('dark') })
  }

  // Side effect: beyond the buddy's reach, freediving keeps its oldest rule
  function showGameOver (state, depthM) {
    var go = document.getElementById('gameover')
    document.getElementById('gameover-line').textContent =
      'You blacked out at ' + Math.round(depthM) + ' meters \u2014 beyond the ' +
      SD.config.buddyRescueM[state.upgrades.buddy] + ' meters your buddy is trained to reach. ' +
      'No one dives alone and dives long. The village will light a lamp for you, beside the one for Nikandros.'
    go.classList.remove('hidden')
    requestAnimationFrame(function () { go.classList.add('dark') })
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
    showParchment: showParchment,
    hideParchment: hideParchment,
    showBlackout: showBlackout,
    showGameOver: showGameOver,
    hideBlackout: hideBlackout,
    setVisible: setVisible
  }
})()
