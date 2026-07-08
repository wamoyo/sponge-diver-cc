// Σφουγγαράς — Sponge Diver
// Boot, input, and the game loop. Owns the single state object.

var SD = window.SD || {}
window.SD = SD

// error collector — handy when poking at the prototype headlessly
window.__gameErrors = []
window.addEventListener('error', function (ev) {
  window.__gameErrors.push(String(ev.message))
})

// Pure: a fresh game state with default progress
function newState () {
  return {
    mode: 'title',
    time: 0,
    drachmae: 0,
    upgrades: { breath: 0, fins: 0, stone: 0, light: 0, bag: 0, knife: 0, charm: 0, favor: 0 },
    conditioning: 0,
    tridentClaimed: false,
    stats: { dives: 0, blackouts: 0, earned: 0, deepest: 0 },
    muted: false,
    player: null,
    world: null,
    cam: { x: 0, y: 0 },
    harvestTarget: null,
    blackoutT: 0,
    blackoutKept: [],
    bagFullAt: 0,
    effects: { shake: 0, flash: 0, bubbles: [] }
  }
}

// Side effect: adds a burst of bubbles at a point (stings, splashes)
SD.burstBubbles = function (state, x, y, n) {
  for (var i = 0; i < n; i++) {
    state.effects.bubbles.push({
      x: x + SD.randRange(-8, 8),
      y: y + SD.randRange(-8, 8),
      vy: SD.randRange(-90, -40),
      r: SD.randRange(1.5, 4),
      life: SD.randRange(1.5, 3.5)
    })
  }
}

// Side effect: spawns breathing bubbles + advances/expires all bubbles
function updateBubbles (state, dt) {
  var p = state.player
  var under = p.y > SD.config.pxPerM * 0.4
  if (under && state.mode === 'playing') {
    state.bubbleAcc = (state.bubbleAcc || 0) + dt * (1.6 + SD.dist(0, 0, p.vx, p.vy) * 0.012)
    while (state.bubbleAcc > 1) {
      state.bubbleAcc -= 1
      state.effects.bubbles.push({
        x: p.x + p.facing * 16,
        y: p.y - 4,
        vy: SD.randRange(-70, -40),
        r: SD.randRange(1.2, 3),
        life: 5
      })
    }
  }
  var list = state.effects.bubbles
  for (var i = list.length - 1; i >= 0; i--) {
    var b = list[i]
    b.y += b.vy * dt
    b.x += Math.sin(b.y * 0.05) * 12 * dt
    b.life -= dt
    if (b.life <= 0 || b.y < 2) list.splice(i, 1)
  }
  if (list.length > 220) list.splice(0, list.length - 220)
}

// Side effect: eases the camera toward the diver, clamped to the world
function updateCamera (state, view, dt) {
  var cfg = SD.config.world
  var p = state.player
  var worldBottom = cfg.trench.depthM * SD.config.pxPerM + 150
  var tx = p.x - view.w / 2
  var ty = p.y - view.h * 0.44

  if (view.w >= cfg.widthPx) tx = (cfg.widthPx - view.w) / 2
  else tx = SD.clamp(tx, -60, cfg.widthPx - view.w + 60)
  ty = SD.clamp(ty, cfg.skyTopPx, Math.max(cfg.skyTopPx, worldBottom - view.h))

  var ease = 1 - Math.exp(-7 * dt)
  state.cam.x += (tx - state.cam.x) * ease
  state.cam.y += (ty - state.cam.y) * ease
}

// Side effect: drifts the ambient fish schools along their lanes
function updateFish (state, dt) {
  var schools = state.world.fishSchools
  for (var i = 0; i < schools.length; i++) {
    var s = schools[i]
    s.x += s.dir * s.speed * dt
    if (s.x < 280) { s.x = 280; s.dir = 1 }
    if (s.x > SD.config.world.widthPx - 280) { s.x = SD.config.world.widthPx - 280; s.dir = -1 }
  }
}

// ---------- Boot ----------

var canvas = document.getElementById('sea')
var ctx = canvas.getContext('2d')
var view = { w: 0, h: 0 }
var keys = { left: false, right: false, up: false, down: false }
var state = newState()

// Pure-ish (reads keys + touch): merged analog input vector for this frame
function readInput () {
  var t = SD.touch.vector()
  if (t.active) return { x: t.x, y: t.y }
  return {
    x: (keys.right ? 1 : 0) - (keys.left ? 1 : 0),
    y: (keys.down ? 1 : 0) - (keys.up ? 1 : 0)
  }
}

// Side effect: sizes the canvas to the window, devicePixelRatio-aware
// (capped at 2 — phone GPUs don't need 3x for flat-color shapes)
function resize () {
  var dpr = Math.min(window.devicePixelRatio || 1, 2)
  view.w = window.innerWidth
  view.h = window.innerHeight
  canvas.width = Math.round(view.w * dpr)
  canvas.height = Math.round(view.h * dpr)
  canvas.style.width = view.w + 'px'
  canvas.style.height = view.h + 'px'
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
}

// Side effect: leaves the title screen and starts play
function startGame () {
  SD.audio.init()
  SD.audio.setMuted(state.muted)
  document.getElementById('title').classList.add('hidden')
  SD.hud.setVisible(true)
  state.mode = 'playing'
}

// Side effect: fills and shows the pause overlay
function openPause () {
  state.mode = 'paused'
  var s = state.stats
  document.getElementById('pause-stats').innerHTML =
    '<span>Dives</span><span>' + s.dives + '</span>' +
    '<span>Deepest</span><span>' + s.deepest + ' m</span>' +
    '<span>Lifetime earned</span><span>' + SD.fmtDr(s.earned) + '</span>' +
    '<span>Blackouts</span><span>' + s.blackouts + '</span>' +
    '<span>Lung conditioning</span><span>+' + state.conditioning.toFixed(1) + ' s</span>' +
    '<span>Trident of Poseidon</span><span>' + (state.tridentClaimed ? 'claimed 🔱' : 'still down there') + '</span>'
  document.getElementById('mute-btn').textContent = state.muted ? 'Unmute' : 'Mute'
  document.getElementById('pause').classList.remove('hidden')
}

// Side effect: hides the pause overlay and resumes
function closePause () {
  state.mode = 'playing'
  document.getElementById('pause').classList.add('hidden')
  resetBtnArmed = false
  document.getElementById('reset-btn').textContent = 'Reset Save'
}

// Side effect: flips mute on the audio engine + save
function toggleMute () {
  state.muted = !state.muted
  SD.audio.setMuted(state.muted)
  SD.saveGame(state)
  document.getElementById('mute-btn').textContent = state.muted ? 'Unmute' : 'Mute'
  SD.hud.toast(state.muted ? 'Muted' : 'Sound on')
}

var resetBtnArmed = false

// ---------- Input ----------

var keyMap = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down'
}

// Side effect: keyboard listeners for movement + mode switches
function bindInput () {
  window.addEventListener('keydown', function (ev) {
    if (keyMap[ev.code]) {
      keys[keyMap[ev.code]] = true
      ev.preventDefault()
    }
    if (ev.code === 'Enter' && state.mode === 'title') startGame()
    if (ev.code === 'KeyM') toggleMute()
    if (ev.code === 'KeyB') {
      var surfaced = state.player.y < SD.config.pxPerM * 0.4
      if (state.mode === 'playing' && surfaced) SD.shop.open(state)
      else if (state.mode === 'shop') SD.shop.close(state)
    }
    if (ev.code === 'Escape') {
      if (state.mode === 'playing') openPause()
      else if (state.mode === 'paused') closePause()
      else if (state.mode === 'shop') SD.shop.close(state)
    }
  })
  window.addEventListener('keyup', function (ev) {
    if (keyMap[ev.code]) {
      keys[keyMap[ev.code]] = false
      ev.preventDefault()
    }
  })
  window.addEventListener('blur', function () {
    keys.left = keys.right = keys.up = keys.down = false
    if (state.mode === 'playing') openPause()
  })

  document.getElementById('start-btn').addEventListener('click', startGame)
  document.getElementById('resume-btn').addEventListener('click', closePause)
  document.getElementById('mute-btn').addEventListener('click', toggleMute)
  document.getElementById('reset-btn').addEventListener('click', function () {
    if (!resetBtnArmed) {
      resetBtnArmed = true
      document.getElementById('reset-btn').textContent = 'Really? Click again'
      return
    }
    SD.resetSave()
    location.reload()
  })
}

// Side effect: enables the touch layer — joystick, on-screen buttons, touch copy
function bindTouch () {
  document.body.classList.add('touch')
  SD.touch.init(canvas)
  document.getElementById('surface-hint').innerHTML = 'At the surface — drag down to dive'
  document.querySelector('.controls-grid').innerHTML =
    '<span><b>Drag anywhere</b></span><span>swim that way</span>' +
    '<span><b>Drag far down</b></span><span>drop with the stone</span>' +
    '<span><b>Hover close</b></span><span>gather loot</span>'

  document.getElementById('touch-shop').addEventListener('click', function () {
    if (state.mode === 'playing') SD.shop.open(state)
  })
  document.getElementById('touch-pause').addEventListener('click', function () {
    if (state.mode === 'playing') openPause()
    else if (state.mode === 'paused') closePause()
  })
}

// ---------- Loop ----------

var lastT = 0

// Side effect: one frame — update by mode, then draw
function frame (nowMs) {
  var dt = Math.min(0.05, (nowMs - lastT) / 1000 || 0.016)
  lastT = nowMs
  state.time += dt

  if (state.mode === 'playing') {
    SD.updatePlayer(state, readInput(), dt)
    if (state.mode === 'playing') SD.updateDangers(state, dt, true)
    SD.hud.updateBand(state)
    SD.audio.heartbeat(dt, state.player.breath / SD.maxBreath(state))
  } else if (state.mode === 'blackout') {
    state.blackoutT += dt
    if (state.blackoutT > 3) SD.finishBlackout(state)
  } else {
    SD.updateDangers(state, dt, false) // idle ambience behind menus
  }

  updateFish(state, dt)
  updateBubbles(state, dt)
  updateCamera(state, view, dt)

  state.effects.shake = Math.max(0, state.effects.shake - dt * 26)
  state.effects.flash = Math.max(0, state.effects.flash - dt * 1.8)

  SD.render(state, ctx, view)
  if (state.mode !== 'title') SD.hud.sync(state)

  requestAnimationFrame(frame)
}

// Side effect: boots the whole game
function boot () {
  SD.applySave(state, SD.loadGame())
  state.player = SD.newPlayer()
  state.player.breath = SD.maxBreath(state)
  state.world = SD.genWorld(state)
  state.cam.x = state.player.x - window.innerWidth / 2
  state.cam.y = SD.config.world.skyTopPx

  SD.hud.init()
  SD.shop.init(state)
  bindInput()
  if (SD.touch.isTouchDevice()) bindTouch()
  resize()
  window.addEventListener('resize', resize)

  if (state.stats.dives > 0) {
    var note = document.getElementById('title-save-note')
    note.textContent = 'Welcome back, sfoungaras — ' + SD.fmtDr(state.drachmae) +
      ' saved, ' + state.stats.dives + ' dives logged.'
    note.classList.remove('hidden')
  }

  requestAnimationFrame(frame)
}

boot()
