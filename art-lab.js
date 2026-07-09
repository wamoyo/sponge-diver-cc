// Σφουγγαράς — The Art Lab
// A live workbench for every sprite in the game. Each tile owns a canvas and
// calls the REAL draw functions from js/render.js against mock entities, so
// what you fix in render.js is fixed everywhere. Space freezes time.

/* global drawDiver, drawPoseidon, drawKarcharias, drawKraken, drawKetos,
   drawFauna, drawUrchin, drawJelly, drawEel, drawShark, drawSquid, drawLoot,
   drawBoat, drawKelp, drawGrass, drawFan, drawSeahorse, drawSeal, drawManta,
   drawColumn, drawWreck, drawShrine, drawHoard, drawVent, drawRock */

var LAB = { tiles: [], paused: false, deep: false, time: 0 }

// Pure: a complete mock game state the render code can lean on
function makeState () {
  return {
    mode: 'playing',
    time: 0,
    xp: 0,
    drachmae: 0,
    devMode: false,
    tridentClaimed: false,
    training: { apnea: 0, stroke: 0, discipline: 0 },
    upgrades: { fins: 0, stone: 0, light: 0, net: 0, knife: 0, kamaki: 0, charm: 0, boat: 1, sail: 0, favor: 0 },
    relics: { hide: false, feast: false, feastPending: false },
    stats: { dives: 0, blackouts: 0, earned: 0, deepest: 0, items: 0 },
    player: {
      x: 0, y: 0, vx: 80, vy: 0, facing: 1,
      breath: 30, bag: [], invuln: 0, entangled: 0,
      knifeFlash: 0, spearCd: 0, spearFlash: 0,
      swimPhase: 0, diveMaxM: 0, wasUnder: true, holdingStone: false, aboard: false
    },
    boat: { x: 0, hold: [] },
    harvestTarget: null,
    effects: { shake: 0, flash: 0, bubbles: [] }
  }
}

// the one diver state all diver tiles share — the control panel drives it
var diverState = makeState()

// Side effect: registers one animated tile in a section grid
function tile (sectionId, title, w, h, zoom, draw, buttons) {
  var card = document.createElement('div')
  card.className = 'tile'
  var canvas = document.createElement('canvas')
  var dpr = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = w * dpr
  canvas.height = h * dpr
  canvas.style.width = w + 'px'
  canvas.style.height = h + 'px'
  card.appendChild(canvas)
  var cap = document.createElement('div')
  cap.className = 'cap'
  cap.appendChild(document.createTextNode(title))
  card.appendChild(cap)
  var entry = { canvas: canvas, ctx: canvas.getContext('2d'), w: w, h: h, dpr: dpr, zoom: zoom, draw: draw }
  if (buttons) {
    var first = true
    buttons.forEach(function (b) {
      var btn = document.createElement('button')
      btn.textContent = b.label
      if (first) { btn.classList.add('on'); first = false }
      btn.addEventListener('click', function () {
        cap.querySelectorAll('button').forEach(function (o) { o.classList.remove('on') })
        btn.classList.add('on')
        b.set(entry)
      })
      cap.appendChild(btn)
    })
    buttons[0].set(entry)
  }
  document.getElementById(sectionId).appendChild(card)
  LAB.tiles.push(entry)
  return entry
}

// Side effect: paints a tile's watery backdrop
function paintBg (ctx, w, h) {
  var g = ctx.createLinearGradient(0, 0, 0, h)
  if (LAB.deep) {
    g.addColorStop(0, '#0b2c50')
    g.addColorStop(1, '#040f23')
  } else {
    g.addColorStop(0, '#3f8fa3')
    g.addColorStop(1, '#1d5a80')
  }
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
}

// ---------- Scenes: true slices of the real world ----------

// the one generated sea every scene reads from
var LAB_WORLD = null

// Side effect: one scene tile — a full SD.render of the actual world at a
// fixed camera, with a posed diver for scale where it helps
function scene (title, camX, camY, zoom, poseDiver) {
  var w = 620
  var h = 350
  var entry = tile('sec-scenes', title, w, h, 1, function (ctx, t, dt) {
    var s = this.state
    if (!s) {
      s = this.state = makeState()
      s.devMode = true // clear water for judging the art
      s.world = LAB_WORLD
      s.cam = { x: camX, y: camY }
      if (poseDiver) {
        s.player.x = camX + (w / zoom) / 2
        s.player.y = camY + (h / zoom) / 2
      } else {
        // park him above the waterline mid-scene and don't draw him —
        // the murk stays off and the postcard stays clean
        s.player.x = camX + (w / zoom) / 2
        s.player.y = -60
        s.mode = 'blackout'
      }
    }
    s.time = t
    s.player.swimPhase += dt * 5
    s.player.vx = 60
    // SD.render expects an untransformed ctx — undo the tile's centering
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    SD.render(s, ctx, { w: w, h: h }, zoom)
  })
  return entry
}

// Side effect: builds a postcard of every region
function buildScenes () {
  LAB_WORLD = SD.genWorld(makeState())
  scene('the village & dock', -30, -190, 0.85, false)
  scene('the sponge grounds', 1300, -100, 0.55, true)
  scene("the divers' cave", 2830, 260, 0.72, false)
  scene('the seagrass meadows', 7200, -80, 0.55, true)
  scene('the kelp forest', 10100, -70, 0.5, true)
  scene('the kelp well', 11430, 380, 0.55, false)
  scene('the pearl banks', 15200, 700, 0.5, true)
  scene('the sunken quarry', 17600, 1280, 0.55, false)
  scene('the graveyard of ships', 20500, 1850, 0.55, false)
  scene('the wreck of the ANEMONE (swim inside!)', 20560, 1520, 0.34, true)
  scene("hephaestus' vents", 25100, 2080, 0.5, false)
  scene("poseidon's plain — the hoard", 30100, 3850, 0.55, false)
  scene("the kraken's grotto", 33750, 2760, 0.6, false)
  scene('aphrodite’s lagoon & the blue hole', 37850, -50, 0.5, true)
  scene('the temple mountain', 39560, -330, 0.42, false)
  scene('the cavern passage (carved terrain)', 39980, 340, 0.62, true)
  scene('the temple of the deep (the great cavern)', 40900, -30, 0.5, false)
}

// ---------- The Diver ----------

// Side effect: builds the control panel that drives every diver tile
function buildDiverControls () {
  var root = document.getElementById('diver-controls')

  function slider (label, min, max, step, get, set) {
    var wrap = document.createElement('label')
    var val = document.createElement('b')
    val.textContent = get()
    var input = document.createElement('input')
    input.type = 'range'
    input.min = min
    input.max = max
    input.step = step
    input.value = get()
    input.addEventListener('input', function () {
      set(parseFloat(input.value))
      val.textContent = input.value
    })
    wrap.appendChild(document.createTextNode(label + ' '))
    wrap.appendChild(input)
    wrap.appendChild(val)
    root.appendChild(wrap)
  }

  function toggle (label, set) {
    var wrap = document.createElement('label')
    var input = document.createElement('input')
    input.type = 'checkbox'
    input.addEventListener('change', function () { set(input.checked) })
    wrap.appendChild(input)
    wrap.appendChild(document.createTextNode(' ' + label))
    root.appendChild(wrap)
  }

  // fitness is derived — the lab drives it through training ranks
  slider('Fitness', 0, 1, 0.05,
    function () { return 0 },
    function (v) {
      diverState.training.apnea = Math.round(v * 12)
      diverState.training.stroke = Math.round(v * 12)
      diverState.training.discipline = Math.round(v * 12)
      diverState.stats.dives = Math.round(v * 120)
      diverState.xp = Math.round(v * 24000)
    })
  slider('Fins', 0, 6, 1,
    function () { return diverState.upgrades.fins },
    function (v) { diverState.upgrades.fins = v })
  slider('Goggles', 0, 5, 1,
    function () { return diverState.upgrades.light },
    function (v) { diverState.upgrades.light = v })
  slider('Knife', 0, 4, 1,
    function () { return diverState.upgrades.knife },
    function (v) { diverState.upgrades.knife = v })
  slider('Kamaki', 0, 3, 1,
    function () { return diverState.upgrades.kamaki },
    function (v) { diverState.upgrades.kamaki = v })
  slider('Bag load', 0, 14, 1,
    function () { return diverState.player.bag.length },
    function (v) {
      diverState.player.bag = []
      for (var i = 0; i < v; i++) diverState.player.bag.push('sponge')
    })
  toggle('Wetsuit (Karcharias)', function (on) { diverState.relics.hide = on })
  toggle('Trident', function (on) { diverState.tridentClaimed = on })
}

// Side effect: the diver tiles — swim, stone drop, spear strike, harvest
function buildDiverTiles () {
  tile('sec-diver', 'swimming', 300, 170, 2.4, function (ctx, t, dt) {
    var p = diverState.player
    p.swimPhase += dt * 6
    p.vx = 80
    p.holdingStone = false
    p.spearFlash = 0
    diverState.harvestTarget = null
    drawDiver(ctx, diverState, t)
  })
  tile('sec-diver', 'the skandalopetra drop', 300, 170, 2.4, function (ctx, t, dt) {
    var p = diverState.player
    p.swimPhase += dt * 4
    p.vx = 0.01
    p.holdingStone = true
    p.spearFlash = 0
    drawDiver(ctx, diverState, t)
    p.holdingStone = false
  })
  tile('sec-diver', 'kamaki strike (loops)', 300, 170, 2.4, function (ctx, t, dt) {
    var p = diverState.player
    p.swimPhase += dt * 6
    p.vx = 80
    p.spearFlash = Math.max(0, 0.35 - (t % 1.3))
    drawDiver(ctx, diverState, t)
    p.spearFlash = 0
  })
  tile('sec-diver', 'harvesting (knife out)', 300, 170, 2.4, function (ctx, t, dt) {
    var p = diverState.player
    p.swimPhase += dt * 5
    p.vx = 30
    diverState.harvestTarget = { progress: 0.5 }
    drawDiver(ctx, diverState, t)
    diverState.harvestTarget = null
  })
}

// ---------- Poseidon ----------

function buildPoseidon () {
  // Pure: a fresh god for one tile
  function god (awake) {
    return {
      x: 0, y: -14, homeX: 0, homeY: 0, facing: -1,
      awake: awake, mode: 'idle', modeT: 0, thrust: 0,
      stabAngle: Math.PI * 0.86, phase: 1.3
    }
  }
  tile('sec-poseidon', 'asleep over the hoard', 250, 260, 1.35, function (ctx, t, dt) {
    var h = this.god || (this.god = god(false))
    h.phase += dt
    drawPoseidon(ctx, h, t)
  })
  tile('sec-poseidon', 'awake', 250, 260, 1.35, function (ctx, t, dt) {
    var h = this.god || (this.god = god(true))
    h.phase += dt
    drawPoseidon(ctx, h, t)
  })
  tile('sec-poseidon', 'windup', 250, 260, 1.35, function (ctx, t, dt) {
    var h = this.god || (this.god = god(true))
    h.phase += dt
    h.mode = 'windup'
    h.thrust = -22 + Math.sin(t * 3) * 4
    drawPoseidon(ctx, h, t)
  })
  tile('sec-poseidon', 'THE THRUST (loops)', 290, 260, 1.35, function (ctx, t, dt) {
    var h = this.god || (this.god = god(true))
    h.phase += dt
    var cycle = t % 1.6
    if (cycle < 0.5) { h.mode = 'windup'; h.thrust = -22 * (cycle / 0.5) }
    else if (cycle < 0.75) { h.mode = 'thrust'; h.thrust = 130 * ((cycle - 0.5) / 0.25) }
    else { h.mode = 'recover'; h.thrust = 130 * Math.exp(-(cycle - 0.75) * 6) }
    drawPoseidon(ctx, h, t)
  })
}

// ---------- Bosses ----------

function buildBosses () {
  tile('sec-bosses', 'KARCHARIAS', 340, 190, 1.15, function (ctx, t, dt) {
    var f = this.f
    f.phase += dt
    drawKarcharias(ctx, f, t)
  }, [
    { label: 'circle', set: function (e) { e.f = { x: 0, y: 20, vx: 1, angle: 0, mode: 'circle', hp: 8, maxHp: 8, phase: 0, hurtT: 0 } } },
    { label: 'charge', set: function (e) { e.f = { x: 0, y: 20, vx: 300, mode: 'charge', hp: 5, maxHp: 8, phase: 0, hurtT: 0 } } },
    { label: 'hurt', set: function (e) { e.f = { x: 0, y: 20, vx: 1, angle: 0, mode: 'circle', hp: 2, maxHp: 8, phase: 0, hurtT: 0.2 } } }
  ])
  tile('sec-bosses', 'THE KRAKEN', 300, 220, 1.15, function (ctx, t, dt) {
    var f = this.f
    f.phase += dt
    drawKraken(ctx, f, t)
  }, [
    { label: 'lurking', set: function (e) { e.f = { x: 0, y: -10, mode: 'lurk', hp: 12, maxHp: 12, phase: 0, hurtT: 0 } } },
    { label: 'grabbing', set: function (e) { e.f = { x: 0, y: -10, mode: 'grab', hp: 8, maxHp: 12, phase: 0, hurtT: 0 } } }
  ])
  tile('sec-bosses', 'KETOS', 420, 170, 1.0, function (ctx, t, dt) {
    var f = this.f
    f.phase += dt
    drawKetos(ctx, f, t)
  }, [
    { label: 'roaming →', set: function (e) { e.f = { x: 60, y: 10, vx: 90, mode: 'roam', hp: 15, maxHp: 15, phase: 0, hurtT: 0 } } },
    { label: '← chasing', set: function (e) { e.f = { x: 60, y: 10, vx: -190, mode: 'chase', hp: 9, maxHp: 15, phase: 0, hurtT: 0 } } }
  ])
}

// ---------- Fauna ----------

function buildFauna () {
  var kinds = ['mullet', 'bream', 'grouper']
  kinds.forEach(function (kind) {
    tile('sec-fauna', SD.config.fauna[kind].name, 190, 120, 2.2, function (ctx, t, dt) {
      var f = this.f || (this.f = { kind: kind, x: 0, y: 0, vx: 40, phase: Math.random() * 6, taken: false, boss: false })
      f.phase += dt
      drawFauna(ctx, f, t)
    })
  })
  tile('sec-fauna', 'a school (decor)', 190, 120, 1.8, function (ctx, t, dt) {
    var s = this.s || (this.s = { x: 0, y: 0, dir: 1, size: 5.5, fish: [{ ox: -20, oy: -8, phase: 1 }, { ox: 6, oy: 4, phase: 2 }, { ox: 22, oy: -6, phase: 3 }, { ox: -4, oy: 12, phase: 4 }, { ox: 14, oy: 14, phase: 5 }] })
    drawFishSchool(ctx, s, t)
  })
  tile('sec-fauna', 'monk seal (decor)', 230, 140, 1.8, function (ctx, t) {
    drawSeal(ctx, this.f, t)
  }, [
    { label: 'cruising', set: function (e) { e.f = { x: 0, y: 0, dir: 1, tilt: 0, phase: 0.7 } } },
    { label: 'diving', set: function (e) { e.f = { x: 0, y: 0, dir: -1, tilt: 0.26, phase: 2.1 } } }
  ])
  tile('sec-fauna', 'manta ray (decor)', 320, 170, 1.6, function (ctx, t) {
    drawManta(ctx, this.f, t)
  }, [
    { label: 'soaring', set: function (e) { e.f = { x: 0, y: 0, dir: 1, tilt: 0, phase: 0.4 } } },
    { label: 'banking', set: function (e) { e.f = { x: 0, y: 0, dir: -1, tilt: -0.12, phase: 3.6 } } }
  ])
}

// ---------- Dangers ----------

function buildDangers () {
  tile('sec-dangers', 'sea urchin', 150, 120, 2.2, function (ctx, t) {
    drawUrchin(ctx, this.u || (this.u = { x: 0, y: 10, phase: 0.6 }))
  })
  tile('sec-dangers', 'jellyfish', 150, 130, 2.0, function (ctx, t) {
    drawJelly(ctx, { x: 0, y: -6, phase: 0.3 }, t)
  })
  tile('sec-dangers', 'moray eel', 220, 130, 1.7, function (ctx, t) {
    var e = this.e
    drawEel(ctx, e, t)
  }, [
    { label: 'lurking', set: function (en) { en.e = { homeX: 0, homeY: 24, x: 0, y: 24, mode: 'lurk', phase: 0.5 } } },
    { label: 'LUNGE', set: function (en) { en.e = { homeX: -55, homeY: 34, x: 48, y: -18, mode: 'lunge', phase: 0.5 } } }
  ])
  tile('sec-dangers', 'reef shark', 220, 120, 1.7, function (ctx, t) {
    var s = this.s
    s.phase += 0.016
    drawShark(ctx, s, t)
  }, [
    { label: 'patrol', set: function (en) { en.s = { kind: 'reef', x: 0, y: 0, dir: 1, mode: 'patrol', phase: 0 } } },
    { label: 'chase', set: function (en) { en.s = { kind: 'reef', x: 0, y: 0, dir: -1, mode: 'chase', phase: 0 } } }
  ])
  tile('sec-dangers', 'abyss shark', 240, 130, 1.7, function (ctx, t) {
    var s = this.s || (this.s = { kind: 'abyss', x: 0, y: 0, dir: 1, mode: 'chase', phase: 0 })
    s.phase += 0.016
    drawShark(ctx, s, t)
  })
  tile('sec-dangers', 'ink squid', 190, 120, 1.9, function (ctx, t) {
    drawSquid(ctx, { x: 0, y: 0, dir: -1, phase: 0.4 }, t)
  })
}

// ---------- Loot ----------

function buildLoot () {
  for (var type in SD.config.lootTypes) {
    (function (type) {
      var info = SD.config.lootTypes[type]
      var big = type === 'chest' || type === 'trident'
      tile('sec-loot', info.name, big ? 190 : 150, big ? 150 : 120, big ? 1.4 : 2.1, function (ctx, t) {
        drawLoot(ctx, this.item || (this.item = { type: type, x: 0, y: type === 'chest' ? 10 : 0, phase: 0.8, dropped: false }), t)
      })
    })(type)
  }
}

// ---------- World pieces ----------

function buildWorld () {
  // the kaiki at each stage of her life
  function boatTile (title, boatTier, sailTier, aboard, hold) {
    tile('sec-world', title, 300, 200, 1.15, function (ctx, t, dt) {
      var s = this.s || (this.s = (function () {
        var st = makeState()
        st.upgrades.boat = boatTier
        st.upgrades.sail = sailTier
        st.boat.hold = hold || []
        st.player.aboard = aboard
        st.player.facing = 1
        return st
      })())
      ctx.translate(0, 62)
      drawBoat(ctx, s, t)
    })
  }
  boatTile('the kaiki, fresh from the yard', 1, 0, false, ['sponge', 'sponge'])
  boatTile('hold II + white sail', 2, 1, false, ['sponge', 'sponge', 'amphora', 'sponge', 'sponge'])
  boatTile('hold III + Sails of Boreas', 3, 2, true, ['sponge', 'amphora', 'sponge', 'sponge', 'amphora', 'sponge', 'sponge'])
  tile('sec-world', 'kelp stalk', 170, 240, 1.0, function (ctx, t) {
    drawKelp(ctx, this.k || (this.k = { x: 0, baseY: 112, h: 210, phase: 1.7, sway: 7 }), t)
  })
  tile('sec-world', 'seagrass', 150, 130, 1.4, function (ctx, t) {
    drawGrass(ctx, { x: -18, y: 55, h: 70, phase: 0.5 }, t)
    drawGrass(ctx, { x: 14, y: 58, h: 88, phase: 2.1 }, t)
  })
  tile('sec-world', 'gorgonian fan', 150, 130, 1.5, function (ctx, t) {
    drawFan(ctx, { x: -22, y: 52, h: 46, phase: 0.4, pink: true }, t)
    drawFan(ctx, { x: 24, y: 55, h: 38, phase: 1.8, pink: false }, t)
  })
  tile('sec-world', 'seahorse', 130, 120, 2.6, function (ctx, t) {
    drawSeahorse(ctx, { x: 0, y: 0, phase: 0.4, dir: 1 }, t)
  })
  tile('sec-world', 'column', 150, 170, 1.1, function (ctx, t) {
    drawColumn(ctx, this.c || (this.c = { x: 0, y: 74, h: 120, tilt: -0.08, broken: true }))
  })
  tile('sec-world', 'wreck', 300, 170, 0.95, function (ctx, t) {
    drawWreck(ctx, { x: 0, y: 55 })
  })
  tile('sec-world', 'the shrine', 210, 190, 1.05, function (ctx, t) {
    drawShrine(ctx, { x: 0, y: 82 })
  })
  tile('sec-world', 'hoard mounds', 240, 130, 1.1, function (ctx, t) {
    drawHoard(ctx, this.h || (this.h = [
      { x: -60, y: 40, w: 55, h: 16, phase: 0.4 },
      { x: 10, y: 44, w: 80, h: 24, phase: 2.2 },
      { x: 75, y: 38, w: 44, h: 13, phase: 4.1 }
    ]), t)
  })
  tile('sec-world', "Hephaestus' vent", 170, 220, 1.0, function (ctx, t) {
    drawVent(ctx, { x: 0, y: 96, phase: 0.7 }, t)
  })
  tile('sec-world', 'boulder', 170, 130, 1.0, function (ctx, t) {
    drawRock(ctx, { x: 0, y: 20, r: 52 })
    drawRock(ctx, { x: 8, y: -26, r: 26 })
  })
}

// ---------- the loop ----------

// Side effect: one lab frame — advance shared time, repaint every tile
var lastMs = 0
function labFrame (nowMs) {
  var dt = Math.min(0.05, (nowMs - lastMs) / 1000 || 0.016)
  lastMs = nowMs
  if (!LAB.paused) LAB.time += dt

  for (var i = 0; i < LAB.tiles.length; i++) {
    var tl = LAB.tiles[i]
    var ctx = tl.ctx
    ctx.setTransform(tl.dpr, 0, 0, tl.dpr, 0, 0)
    paintBg(ctx, tl.w, tl.h)
    ctx.translate(tl.w / 2, tl.h / 2)
    ctx.scale(tl.zoom, tl.zoom)
    tl.draw.call(tl, ctx, LAB.time, LAB.paused ? 0 : dt) // `this` = the tile, so each keeps its own mocks
  }
  requestAnimationFrame(labFrame)
}

// Side effect: boots the lab
function bootLab () {
  buildScenes()
  buildDiverControls()
  buildDiverTiles()
  buildPoseidon()
  buildBosses()
  buildFauna()
  buildDangers()
  buildLoot()
  buildWorld()

  document.getElementById('pause-btn').addEventListener('click', togglePause)
  document.getElementById('dark-btn').addEventListener('click', function () {
    LAB.deep = !LAB.deep
    this.textContent = LAB.deep ? '🌞 Shallow' : '🌑 Deep'
  })
  window.addEventListener('keydown', function (ev) {
    if (ev.code === 'Space') {
      ev.preventDefault()
      togglePause()
    }
  })
  requestAnimationFrame(labFrame)
}

// Side effect: freezes/unfreezes every animation at once
function togglePause () {
  LAB.paused = !LAB.paused
  document.getElementById('pause-btn').textContent = LAB.paused ? '▶ Run' : '⏸ Freeze'
}

bootLab()
