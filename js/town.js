// Σφουγγαράς — Sponge Diver
// The village, seen from above — a walkable top-down hub in the old
// Zelda way, drawn in flat vector like the rest of the game. Enter from
// the dock (V); walk with WASD; talk with E. Old Stavros and the chandler
// are always here. Everyone else arrives when you first bring home the
// kind of thing they trade in, and the village visibly grows.
//
// Self-contained on purpose: this file never touches js/render.js.

var SD = window.SD || {}
window.SD = SD

SD.town = (function () {

  // ---------- the map ----------

  var W = 1560              // town world size, px
  var H = 1040
  var SEA_Y = 880           // the water begins here (south edge)
  var JETTY = { x1: 700, x2: 826 } // the planks that lead back to the sea

  // palette — the game's pottery colors, land edition
  var C = {
    sand: '#e2cd9c', sandDim: '#d3bc88', cobble: '#cbb691', seam: '#b5a077',
    wall: '#f4ede0', wallShade: '#ddd2bf', roof: '#b0603a', roofDim: '#8a4527',
    ridge: '#7a3a1f', ink: '#2b1d16', door: '#6b4a2c', doorDark: '#523823',
    olive: '#6d7d4e', oliveDim: '#55643c', trunk: '#6b4a2c',
    sea1: '#2e7f96', sea2: '#1d5a80', foam: 'rgba(255,255,255,0.65)',
    stone: '#9a8f7a', stoneDim: '#7e7362', shadow: 'rgba(43, 29, 22, 0.18)',
    skin: '#c98d5e', hair: '#241a12', peri: '#b0603a'
  }

  // buildings keyed by the townsfolk who keep them (config.townFolk ids).
  // wall = the south face height; the roof takes the rest of the footprint.
  var LOTS = {
    stavros: { x: 150, y: 600, w: 250, h: 180, sign: '🧽' },
    chandler: { x: 170, y: 310, w: 230, h: 170, sign: '⚓' },
    silversmith: { x: 460, y: 140, w: 210, h: 160, sign: '⚒️' },
    taverna: { x: 950, y: 200, w: 270, h: 190, sign: '🍢' },
    antiquarian: { x: 1270, y: 320, w: 210, h: 160, sign: '🏺' },
    jeweler: { x: 1200, y: 560, w: 180, h: 130, sign: '💍' },
    dyemaker: { x: 1010, y: 680, w: 210, h: 150, sign: '🐚' }
  }

  // where each keeper stands: just south of their door
  var POSTS = {
    stavros: { x: 275, y: 810 },
    chandler: { x: 285, y: 510 },
    silversmith: { x: 565, y: 330 },
    taverna: { x: 1085, y: 420 },
    antiquarian: { x: 1375, y: 510 },
    jeweler: { x: 1290, y: 720 },
    dyemaker: { x: 1115, y: 860 }
  }

  var OLIVES = [
    { x: 620, y: 250, r: 46 }, { x: 880, y: 150, r: 52 },
    { x: 90, y: 900, r: 40 }, { x: 1460, y: 660, r: 44 },
    { x: 520, y: 700, r: 38 }
  ]
  var WELL = { x: 780, y: 520, r: 34 }

  var avatar = { x: 763, y: 830, vx: 0, vy: 0, face: 'up', step: 0 }
  var dialogNpc = null      // townFolk entry while a dialog is open
  var arrivedFlash = {}     // id -> time, for a little sparkle on new stalls
  var gameState = null      // stashed by init for the key handler

  // ---------- pure helpers ----------

  // Pure: the config entry for a townsfolk id
  function folk (id) {
    var list = SD.config.townFolk
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i]
    }
    return null
  }

  // Pure: true when this keeper has arrived in the village
  function unlocked (state, id) {
    var f = folk(id)
    return !!(f && (f.always || state.townFolk[id]))
  }

  // Pure: what one item pays in this keeper's hands (fish trade on their
  // tribute worth — the taverna is the only market for catch at all)
  function priceOf (type, premium) {
    var info = SD.carryInfo(type)
    var base = info.value > 0 ? info.value : (info.offering || 0) * 9
    return Math.round(base * (premium || 1))
  }

  // Pure: everything this keeper would buy right now — from the net bag,
  // and from the kaiki's hold if she's tied up at the village dock
  function sellable (state, f) {
    var out = []
    var i
    for (i = 0; i < state.player.bag.length; i++) {
      if (f.buys.indexOf(state.player.bag[i]) >= 0) out.push({ type: state.player.bag[i], from: 'bag' })
    }
    var dock = SD.config.world.dock
    if (SD.hasBoat(state) && Math.abs(state.boat.x - dock.x) < dock.radius + 120) {
      for (i = 0; i < state.boat.hold.length; i++) {
        if (f.buys.indexOf(state.boat.hold[i]) >= 0) out.push({ type: state.boat.hold[i], from: 'hold' })
      }
    }
    return out
  }

  // ---------- arrivals ----------

  // Side effect: anyone whose goods you've brought home moves in. Fires
  // toasts + saves. Called on entering the dock zone and the town itself.
  function checkArrivals (state) {
    var list = SD.config.townFolk
    var anyone = false
    for (var i = 0; i < list.length; i++) {
      var f = list[i]
      if (f.always || state.townFolk[f.id] || !f.unlockOn) continue
      for (var u = 0; u < f.unlockOn.length; u++) {
        if (state.seenLoot[f.unlockOn[u]]) {
          state.townFolk[f.id] = true
          arrivedFlash[f.id] = state.time
          anyone = true
          SD.audio.fanfare()
          SD.hud.toast(f.arrive, 'big')
          break
        }
      }
    }
    if (anyone) SD.saveGame(state)
  }

  // ---------- enter / leave ----------

  // Side effect: switches the game into the town view
  function enter (state) {
    checkArrivals(state)
    state.mode = 'town'
    avatar.x = 763
    avatar.y = 830
    avatar.face = 'up'
    dialogNpc = null
    SD.audio.board()
    SD.hud.toast('The village — walk with WASD, talk with E, the jetty leads back to sea')
  }

  // Side effect: back to the sea, standing at the dock
  function leave (state) {
    closeDialog()
    state.mode = 'playing'
    state.player.x = SD.config.world.dock.x + 40
    state.player.y = -2
    state.player.vx = 0
    state.player.vy = 0
    SD.audio.splash()
  }

  // ---------- dialog ----------

  // Side effect: opens the parley box for a keeper
  function openDialog (state, f) {
    dialogNpc = f
    var el = document.getElementById('town-dialog')
    var goods = sellable(state, f)
    var total = 0
    for (var i = 0; i < goods.length; i++) total += priceOf(goods[i].type, f.premium)
    var html = '<h3>' + f.name + ' <span class="town-trade">— ' + f.trade + '</span></h3>' +
      '<p>' + f.greet + '</p><div class="town-actions">'
    if (f.id === 'chandler') {
      html += '<button class="btn" data-town="shop">Browse the chandlery (B)</button>'
    }
    if (goods.length) {
      html += '<button class="btn" data-town="sell">Sell ' + goods.length +
        (goods.length === 1 ? ' piece' : ' pieces') + ' — ' + SD.fmtDr(total) + '</button>'
    } else if (f.buys.length) {
      html += '<span class="town-note">has coin for: ' + f.buys.map(function (t) { return SD.carryInfo(t).name }).join(', ') + '</span>'
    }
    html += '<button class="btn btn-quiet" data-town="close">Leave</button></div>'
    el.innerHTML = html
    el.classList.remove('hidden')
  }

  // Side effect: hides the parley box
  function closeDialog () {
    dialogNpc = null
    var el = document.getElementById('town-dialog')
    if (el) el.classList.add('hidden')
  }

  // Side effect: hands the keeper everything they'd buy; pays the premium
  function sellTo (state, f) {
    var goods = sellable(state, f)
    if (!goods.length) return
    var total = 0
    var xp = 0
    for (var i = 0; i < goods.length; i++) {
      total += priceOf(goods[i].type, f.premium)
      xp += SD.carryInfo(goods[i].type).xp || 0
      var list = goods[i].from === 'bag' ? state.player.bag : state.boat.hold
      list.splice(list.indexOf(goods[i].type), 1)
    }
    state.drachmae += total
    state.stats.earned += total
    SD.awardXp(state, xp)
    SD.audio.coins()
    SD.hud.toast('💰 ' + f.name + ' pays ' + SD.fmtDr(total), 'big')
    SD.saveGame(state)
    openDialog(state, f) // refresh the box — likely just Leave now
  }

  // ---------- update ----------

  // Pure: the keeper standing near the avatar, if any
  function nearestKeeper (state) {
    var best = null
    var bestD = 64
    for (var id in POSTS) {
      if (!unlocked(state, id)) continue
      var d = SD.dist(POSTS[id].x, POSTS[id].y, avatar.x, avatar.y)
      if (d < bestD) { bestD = d; best = folk(id) }
    }
    return best
  }

  // Side effect on avatar: walk, collide, exit over the jetty
  function update (state, input, dt) {
    if (dialogNpc) return // parley freezes the feet

    var sp = 210
    avatar.vx = input.x * sp
    avatar.vy = input.y * sp
    avatar.x += avatar.vx * dt
    avatar.y += avatar.vy * dt
    if (Math.abs(input.x) > Math.abs(input.y)) {
      if (Math.abs(input.x) > 0.1) avatar.face = input.x > 0 ? 'right' : 'left'
    } else if (Math.abs(input.y) > 0.1) {
      avatar.face = input.y > 0 ? 'down' : 'up'
    }
    if (Math.abs(input.x) + Math.abs(input.y) > 0.1) avatar.step += dt * 9

    // town bounds
    avatar.x = SD.clamp(avatar.x, 30, W - 30)
    avatar.y = SD.clamp(avatar.y, 40, H - 20)

    // the sea is for boats — except the jetty, which is the way home
    if (avatar.y > SEA_Y - 14) {
      if (avatar.x > JETTY.x1 + 8 && avatar.x < JETTY.x2 - 8) {
        if (avatar.y > SEA_Y + 60) { leave(state); return }
      } else {
        avatar.y = SEA_Y - 14
      }
    }

    // buildings are solid (only the ones that exist)
    for (var id in LOTS) {
      if (!unlocked(state, id)) continue
      var b = LOTS[id]
      if (avatar.x > b.x - 12 && avatar.x < b.x + b.w + 12 &&
          avatar.y > b.y - 6 && avatar.y < b.y + b.h + 12) {
        // push out along the shallowest axis
        var dxL = avatar.x - (b.x - 12)
        var dxR = (b.x + b.w + 12) - avatar.x
        var dyT = avatar.y - (b.y - 6)
        var dyB = (b.y + b.h + 12) - avatar.y
        var m = Math.min(dxL, dxR, dyT, dyB)
        if (m === dxL) avatar.x = b.x - 12
        else if (m === dxR) avatar.x = b.x + b.w + 12
        else if (m === dyT) avatar.y = b.y - 6
        else avatar.y = b.y + b.h + 12
      }
    }

    // the well and the olive trunks
    var solids = [{ x: WELL.x, y: WELL.y, r: WELL.r + 10 }]
    for (var o = 0; o < OLIVES.length; o++) solids.push({ x: OLIVES[o].x, y: OLIVES[o].y + 14, r: 14 })
    for (var s = 0; s < solids.length; s++) {
      var d = SD.dist(solids[s].x, solids[s].y, avatar.x, avatar.y)
      if (d < solids[s].r && d > 0.001) {
        avatar.x += (avatar.x - solids[s].x) / d * (solids[s].r - d)
        avatar.y += (avatar.y - solids[s].y) / d * (solids[s].r - d)
      }
    }
  }

  // ---------- keys ----------

  // Side effect: town's own keyboard — E talks, Esc/V steps back to the sea
  function onKey (ev) {
    var state = gameState
    if (!state || state.mode !== 'town') return
    if (ev.code === 'KeyE' || ev.code === 'Enter') {
      ev.preventDefault()
      if (dialogNpc) { closeDialog(); return }
      var f = nearestKeeper(state)
      if (f) openDialog(state, f)
    }
    if (ev.code === 'Escape' || ev.code === 'KeyV') {
      ev.preventDefault()
      if (dialogNpc) closeDialog()
      else leave(state)
    }
  }

  // Side effect: dialog buttons
  function onDialogClick (ev) {
    var state = gameState
    var btn = ev.target.closest('button[data-town]')
    if (!btn || !dialogNpc) return
    var act = btn.getAttribute('data-town')
    if (act === 'close') closeDialog()
    if (act === 'sell') sellTo(state, dialogNpc)
    if (act === 'shop') {
      var wasNpc = dialogNpc
      closeDialog()
      state.shopReturnMode = 'town'
      SD.shop.open(state)
      dialogNpc = null
      void wasNpc
    }
  }

  // Side effect: a tap/click on a keeper opens their parley (touch hands)
  function onCanvasClick (ev) {
    var state = gameState
    if (!state || state.mode !== 'town' || dialogNpc) return
    var cam = camera({ w: window.innerWidth, h: window.innerHeight })
    var wx = ev.clientX + cam.x
    var wy = ev.clientY + cam.y
    for (var id in POSTS) {
      if (!unlocked(state, id)) continue
      if (SD.dist(POSTS[id].x, POSTS[id].y, wx, wy) < 44 &&
          SD.dist(POSTS[id].x, POSTS[id].y, avatar.x, avatar.y) < 90) {
        openDialog(state, folk(id))
        return
      }
    }
  }

  // Side effect: wires listeners once at boot
  function init (state) {
    gameState = state
    window.addEventListener('keydown', onKey)
    var dlg = document.getElementById('town-dialog')
    if (dlg) dlg.addEventListener('click', onDialogClick)
    document.getElementById('sea').addEventListener('click', onCanvasClick)
  }

  // ---------- drawing ----------

  // Pure: camera top-left for this frame's view
  function camera (view) {
    var cx = SD.clamp(avatar.x - view.w / 2, 0, Math.max(0, W - view.w))
    var cy = SD.clamp(avatar.y - view.h / 2, 0, Math.max(0, H - view.h))
    if (view.w >= W) cx = (W - view.w) / 2
    if (view.h >= H) cy = (H - view.h) / 2
    return { x: cx, y: cy }
  }

  // Side effect on ctx: ground, plaza, paths, the shore
  function drawGround (ctx, t) {
    ctx.fillStyle = C.sand
    ctx.fillRect(0, 0, W, SEA_Y)

    // worn cobble plaza around the well
    ctx.fillStyle = C.cobble
    ctx.beginPath()
    ctx.ellipse(780, 545, 300, 200, 0, 0, SD.TAU)
    ctx.fill()
    // flagstone seams
    ctx.strokeStyle = C.seam
    ctx.lineWidth = 1.5
    for (var i = 0; i < 7; i++) {
      ctx.beginPath()
      ctx.ellipse(780, 545, 44 + i * 42, 29 + i * 28, 0, 0, SD.TAU)
      ctx.stroke()
    }

    // paths: plaza to jetty, plaza to each door
    ctx.strokeStyle = C.cobble
    ctx.lineWidth = 42
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(780, 640)
    ctx.lineTo(763, SEA_Y - 10)
    ctx.stroke()

    // scattered pebbles — a fixed scatter, cheap and calm
    ctx.fillStyle = C.sandDim
    for (var p = 0; p < 90; p++) {
      var px = (p * 331.7) % W
      var py = 40 + ((p * 217.3) % (SEA_Y - 90))
      ctx.fillRect(px, py, 3, 2)
    }

    // the sea, with little running waves and the beach hem
    ctx.fillStyle = C.sea1
    ctx.fillRect(0, SEA_Y, W, H - SEA_Y)
    ctx.fillStyle = C.sea2
    ctx.fillRect(0, SEA_Y + 70, W, H - SEA_Y - 70)
    ctx.strokeStyle = C.foam
    ctx.lineWidth = 2
    ctx.beginPath()
    for (var wx = 0; wx <= W; wx += 12) {
      var wy = SEA_Y + 3 + Math.sin(wx * 0.03 + t * 1.8) * 2.5
      if (wx === 0) ctx.moveTo(wx, wy)
      else ctx.lineTo(wx, wy)
    }
    ctx.stroke()

    // the jetty: weathered planks marching into the water
    ctx.fillStyle = C.door
    ctx.fillRect(JETTY.x1, SEA_Y - 26, JETTY.x2 - JETTY.x1, 190)
    ctx.strokeStyle = C.doorDark
    ctx.lineWidth = 2
    for (var j = 0; j < 8; j++) {
      ctx.beginPath()
      ctx.moveTo(JETTY.x1 + 4, SEA_Y - 4 + j * 22)
      ctx.lineTo(JETTY.x2 - 4, SEA_Y - 4 + j * 22)
      ctx.stroke()
    }
    // mooring posts
    ctx.fillStyle = C.doorDark
    ctx.fillRect(JETTY.x1 - 6, SEA_Y + 30, 10, 14)
    ctx.fillRect(JETTY.x2 - 4, SEA_Y + 90, 10, 14)

    // the kaiki tied up, if she's home
    var state = gameState
    if (state && SD.hasBoat(state) &&
        Math.abs(state.boat.x - SD.config.world.dock.x) < SD.config.world.dock.radius + 120) {
      var bob = Math.sin(t * 1.2) * 3
      ctx.save()
      ctx.translate(JETTY.x2 + 90, SEA_Y + 74 + bob)
      ctx.fillStyle = '#3a2c20'
      ctx.beginPath()
      ctx.ellipse(0, 0, 64, 20, -0.06, 0, SD.TAU)
      ctx.fill()
      ctx.fillStyle = C.wallShade
      ctx.beginPath()
      ctx.ellipse(0, -2, 46, 11, -0.06, 0, SD.TAU)
      ctx.fill()
      ctx.strokeStyle = C.doorDark
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.moveTo(6, -4)
      ctx.lineTo(2, -46)
      ctx.stroke()
      ctx.restore()
    }
  }

  // Side effect on ctx: one 3/4-view building — south wall below, roof above
  function drawBuilding (ctx, id, t, state) {
    var b = LOTS[id]
    var wallH = Math.round(b.h * 0.38)
    var roofH = b.h - wallH

    // drop shadow to the south-east
    ctx.fillStyle = C.shadow
    ctx.fillRect(b.x + 10, b.y + 14, b.w, b.h)

    // south wall: whitewash with a door and a small window
    ctx.fillStyle = C.wall
    ctx.fillRect(b.x, b.y + roofH, b.w, wallH)
    ctx.fillStyle = C.wallShade
    ctx.fillRect(b.x, b.y + roofH, b.w, 7)
    var doorW = 34
    var doorX = b.x + b.w / 2 - doorW / 2
    ctx.fillStyle = C.door
    ctx.fillRect(doorX, b.y + roofH + wallH - 52, doorW, 52)
    ctx.fillStyle = C.doorDark
    ctx.fillRect(doorX + 3, b.y + roofH + wallH - 49, doorW - 6, 46)
    ctx.fillStyle = C.wallShade // window
    ctx.fillRect(b.x + 24, b.y + roofH + 18, 26, 20)
    ctx.strokeStyle = C.ink
    ctx.lineWidth = 1.4
    ctx.strokeRect(b.x + 24, b.y + roofH + 18, 26, 20)

    // terracotta roof: courses of half-round tiles, seen from above
    ctx.fillStyle = C.roof
    ctx.fillRect(b.x - 8, b.y, b.w + 16, roofH)
    ctx.fillStyle = C.roofDim
    for (var r = 0; r < roofH; r += 16) {
      ctx.fillRect(b.x - 8, b.y + r, b.w + 16, 4)
    }
    ctx.fillStyle = C.ridge
    ctx.fillRect(b.x - 8, b.y + roofH - 6, b.w + 16, 6)
    // eave shadow onto the wall
    ctx.fillStyle = 'rgba(43,29,22,0.25)'
    ctx.fillRect(b.x - 8, b.y + roofH, b.w + 16, 4)

    // trade banner beside the door
    var f = folk(id)
    ctx.font = '17px serif'
    ctx.textAlign = 'center'
    ctx.fillText(b.sign, doorX - 18, b.y + roofH + wallH - 18)

    // house-specific dressing
    if (id === 'stavros') { // sponges drying on a line
      ctx.strokeStyle = C.ink
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.moveTo(b.x + b.w + 6, b.y + roofH + 12)
      ctx.lineTo(b.x + b.w + 96, b.y + roofH + 24)
      ctx.stroke()
      ctx.fillStyle = '#c8a45c'
      for (var sp = 0; sp < 4; sp++) {
        ctx.beginPath()
        ctx.arc(b.x + b.w + 18 + sp * 22, b.y + roofH + 16 + sp * 2.6, 7, 0, SD.TAU)
        ctx.fill()
      }
    }
    if (id === 'taverna') { // chimney smoke + a pergola of tables
      ctx.fillStyle = C.stone
      ctx.fillRect(b.x + b.w - 44, b.y - 16, 18, 22)
      ctx.fillStyle = 'rgba(230,230,225,0.5)'
      for (var s = 0; s < 3; s++) {
        var sy = (t * 26 + s * 26) % 74
        ctx.beginPath()
        ctx.arc(b.x + b.w - 35 + Math.sin(t * 1.4 + s) * 5, b.y - 20 - sy, 6 + sy * 0.1, 0, SD.TAU)
        ctx.fill()
      }
      ctx.fillStyle = C.door // two little tables out front
      ctx.fillRect(b.x + 24, b.y + b.h + 26, 26, 8)
      ctx.fillRect(b.x + 76, b.y + b.h + 40, 26, 8)
    }
    if (id === 'dyemaker') { // purple cloth on the line
      ctx.strokeStyle = C.ink
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.moveTo(b.x - 6, b.y + roofH + 8)
      ctx.lineTo(b.x - 86, b.y + roofH + 20)
      ctx.stroke()
      ctx.fillStyle = '#6a3c7e'
      ctx.fillRect(b.x - 40, b.y + roofH + 11, 20, 30)
      ctx.fillStyle = '#84549c'
      ctx.fillRect(b.x - 70, b.y + roofH + 15, 18, 24)
    }
    if (id === 'silversmith') { // the little furnace glows
      var glow = 0.5 + Math.sin(t * 5) * 0.2
      ctx.fillStyle = C.stone
      ctx.fillRect(b.x + b.w + 10, b.y + b.h - 34, 30, 34)
      ctx.fillStyle = 'rgba(255,140,50,' + glow.toFixed(2) + ')'
      ctx.fillRect(b.x + b.w + 17, b.y + b.h - 22, 16, 14)
    }
    if (id === 'jeweler') { // an awning stall rather than a grand house
      ctx.fillStyle = '#c9a24b'
      ctx.fillRect(b.x - 4, b.y + roofH - 10, b.w + 8, 10)
    }
    if (state && arrivedFlash[id] && state.time - arrivedFlash[id] < 6) {
      // a newcomer's stall sparkles for a moment
      var tw = (state.time * 6) % SD.TAU
      ctx.fillStyle = 'rgba(255, 230, 140,' + (0.5 + Math.sin(tw) * 0.3).toFixed(2) + ')'
      ctx.font = '20px serif'
      ctx.fillText('✦', b.x + b.w / 2, b.y - 14)
    }
  }

  // Side effect on ctx: an empty lot where a keeper has not yet arrived
  function drawEmptyLot (ctx, id) {
    var b = LOTS[id]
    ctx.strokeStyle = 'rgba(43,29,22,0.14)'
    ctx.lineWidth = 2
    ctx.setLineDash([8, 8])
    ctx.strokeRect(b.x + 14, b.y + 30, b.w - 28, b.h - 44)
    ctx.setLineDash([])
    ctx.fillStyle = C.oliveDim // weeds in the corners
    ctx.fillRect(b.x + 20, b.y + b.h - 26, 4, 12)
    ctx.fillRect(b.x + 30, b.y + b.h - 22, 4, 9)
    ctx.fillRect(b.x + b.w - 30, b.y + 42, 4, 11)
  }

  // Side effect on ctx: an olive tree, canopy over trunk
  function drawOlive (ctx, o, t) {
    ctx.fillStyle = C.shadow
    ctx.beginPath()
    ctx.ellipse(o.x + 8, o.y + 22, o.r * 0.9, o.r * 0.34, 0, 0, SD.TAU)
    ctx.fill()
    ctx.fillStyle = C.trunk
    ctx.fillRect(o.x - 5, o.y + 2, 10, 22)
    var sway = Math.sin(t * 0.8 + o.x) * 2
    ctx.fillStyle = C.oliveDim
    ctx.beginPath()
    ctx.arc(o.x + sway, o.y - 8, o.r, 0, SD.TAU)
    ctx.fill()
    ctx.fillStyle = C.olive
    ctx.beginPath()
    ctx.arc(o.x - o.r * 0.3 + sway, o.y - o.r * 0.45, o.r * 0.55, 0, SD.TAU)
    ctx.arc(o.x + o.r * 0.4 + sway, o.y - o.r * 0.3, o.r * 0.5, 0, SD.TAU)
    ctx.fill()
  }

  // Side effect on ctx: the village well
  function drawWell (ctx) {
    ctx.fillStyle = C.shadow
    ctx.beginPath()
    ctx.ellipse(WELL.x + 6, WELL.y + 10, WELL.r + 8, WELL.r * 0.5, 0, 0, SD.TAU)
    ctx.fill()
    ctx.fillStyle = C.stone
    ctx.beginPath()
    ctx.arc(WELL.x, WELL.y, WELL.r, 0, SD.TAU)
    ctx.fill()
    ctx.fillStyle = C.stoneDim
    ctx.beginPath()
    ctx.arc(WELL.x, WELL.y, WELL.r - 8, 0, SD.TAU)
    ctx.fill()
    ctx.fillStyle = '#173d54'
    ctx.beginPath()
    ctx.arc(WELL.x, WELL.y, WELL.r - 14, 0, SD.TAU)
    ctx.fill()
    ctx.fillStyle = C.trunk // the crossbar posts
    ctx.fillRect(WELL.x - WELL.r - 4, WELL.y - 30, 7, 34)
    ctx.fillRect(WELL.x + WELL.r - 3, WELL.y - 30, 7, 34)
    ctx.fillRect(WELL.x - WELL.r - 6, WELL.y - 34, WELL.r * 2 + 12, 6)
  }

  // Side effect on ctx: one villager, top-down-ish — body, head, prop
  function drawKeeper (ctx, id, t, state) {
    var f = folk(id)
    var p = POSTS[id]
    var bob = Math.sin(t * 2 + p.x) * 1.5
    ctx.save()
    ctx.translate(p.x, p.y + bob)

    ctx.fillStyle = C.shadow
    ctx.beginPath()
    ctx.ellipse(0, 14, 13, 5, 0, 0, SD.TAU)
    ctx.fill()

    // tunic colors tell them apart at a glance
    var tunics = {
      stavros: '#e8e2d2', chandler: '#5e7c94', silversmith: '#8d8d94',
      taverna: '#a8623c', antiquarian: '#4c4258', jeweler: '#c9a24b', dyemaker: '#6a3c7e'
    }
    ctx.fillStyle = tunics[id] || C.peri
    ctx.beginPath()
    ctx.ellipse(0, 4, 11, 13, 0, 0, SD.TAU)
    ctx.fill()
    ctx.fillStyle = C.skin
    ctx.beginPath()
    ctx.arc(0, -12, 8, 0, SD.TAU)
    ctx.fill()
    ctx.fillStyle = id === 'stavros' ? '#ddd6c6' : C.hair
    ctx.beginPath()
    ctx.arc(0, -14.5, 7, Math.PI * 0.9, Math.PI * 2.1)
    ctx.fill()
    if (id === 'stavros') { // the old man's beard
      ctx.fillStyle = '#ddd6c6'
      ctx.beginPath()
      ctx.ellipse(0, -7, 5, 4, 0, 0, SD.TAU)
      ctx.fill()
    }

    // a floating "talk" cue when the diver is close
    if (SD.dist(p.x, p.y, avatar.x, avatar.y) < 64 && !dialogNpc) {
      ctx.fillStyle = 'rgba(243, 231, 201, 0.95)'
      ctx.strokeStyle = C.ink
      ctx.lineWidth = 1.6
      ctx.beginPath()
      ctx.arc(0, -36, 11, 0, SD.TAU)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = C.ink
      ctx.font = 'bold 12px Georgia, serif'
      ctx.textAlign = 'center'
      ctx.fillText('E', 0, -32)
    }
    ctx.restore()

    // nameplate under the near keeper
    if (SD.dist(p.x, p.y, avatar.x, avatar.y) < 64) {
      ctx.fillStyle = 'rgba(43, 29, 22, 0.75)'
      ctx.font = '12px Georgia, serif'
      ctx.textAlign = 'center'
      ctx.fillText(f.name + ' — ' + f.trade, p.x, p.y + 34)
    }
  }

  // Side effect on ctx: the diver walking his own streets
  function drawAvatar (ctx, t) {
    var a = avatar
    ctx.save()
    ctx.translate(a.x, a.y)

    ctx.fillStyle = C.shadow
    ctx.beginPath()
    ctx.ellipse(0, 15, 12, 5, 0, 0, SD.TAU)
    ctx.fill()

    // stepping feet
    var step = Math.sin(a.step * 2)
    ctx.fillStyle = C.skin
    ctx.beginPath()
    ctx.ellipse(-5, 12 + step * 3, 4, 5.5, 0, 0, SD.TAU)
    ctx.ellipse(5, 12 - step * 3, 4, 5.5, 0, 0, SD.TAU)
    ctx.fill()

    // shoulders + the orange perizoma at the waist
    ctx.fillStyle = C.skin
    ctx.beginPath()
    ctx.ellipse(0, 2, 11, 12, 0, 0, SD.TAU)
    ctx.fill()
    ctx.fillStyle = C.peri
    ctx.fillRect(-10, 6, 20, 7)

    // head with hair; the fringe leans the way he walks
    var lean = a.face === 'left' ? -3 : a.face === 'right' ? 3 : 0
    ctx.fillStyle = C.skin
    ctx.beginPath()
    ctx.arc(0, -12, 8.5, 0, SD.TAU)
    ctx.fill()
    ctx.fillStyle = C.hair
    ctx.beginPath()
    if (a.face === 'down') {
      ctx.arc(0, -14, 7.5, Math.PI * 0.95, Math.PI * 2.05)
    } else if (a.face === 'up') {
      ctx.arc(0, -12, 8, 0, SD.TAU) // back of the head — all hair
    } else {
      ctx.arc(lean, -14, 7.5, Math.PI * 0.85, Math.PI * 2.15)
    }
    ctx.fill()
    ctx.restore()
  }

  // Side effect: paints the whole town frame
  function render (state, ctx, view) {
    var t = state.time
    var cam = camera(view)
    ctx.save()
    ctx.fillStyle = C.sand
    ctx.fillRect(0, 0, view.w, view.h)
    ctx.translate(-cam.x, -cam.y)

    drawGround(ctx, t)
    drawWell(ctx)

    // depth-sorted set: buildings, trees, keepers, and the diver himself
    var order = []
    var id
    for (id in LOTS) {
      order.push({ y: LOTS[id].y + LOTS[id].h, kind: unlocked(state, id) ? 'lot' : 'empty', id: id })
    }
    for (var o = 0; o < OLIVES.length; o++) order.push({ y: OLIVES[o].y + 20, kind: 'olive', o: OLIVES[o] })
    for (id in POSTS) {
      if (unlocked(state, id)) order.push({ y: POSTS[id].y + 14, kind: 'keeper', id: id })
    }
    order.push({ y: avatar.y + 14, kind: 'avatar' })
    order.sort(function (a, b) { return a.y - b.y })
    for (var i = 0; i < order.length; i++) {
      var it = order[i]
      if (it.kind === 'lot') drawBuilding(ctx, it.id, t, state)
      else if (it.kind === 'empty') drawEmptyLot(ctx, it.id)
      else if (it.kind === 'olive') drawOlive(ctx, it.o, t)
      else if (it.kind === 'keeper') drawKeeper(ctx, it.id, t, state)
      else drawAvatar(ctx, t)
    }

    // exit hint on the jetty
    ctx.fillStyle = 'rgba(43, 29, 22, 0.6)'
    ctx.font = 'italic 13px Georgia, serif'
    ctx.textAlign = 'center'
    ctx.fillText('— the sea —', (JETTY.x1 + JETTY.x2) / 2, SEA_Y + 130)

    ctx.restore()
  }

  // Side effect: one full town frame — input, update, paint
  function frame (state, input, dt, ctx, view) {
    update(state, input, dt)
    if (state.mode !== 'town') return // leave() may have fired mid-update
    render(state, ctx, view)
  }

  return {
    init: init,
    enter: enter,
    leave: leave,
    frame: frame,
    render: render,
    checkArrivals: checkArrivals
  }
})()
