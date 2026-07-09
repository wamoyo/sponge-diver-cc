// Σφουγγαράς — Sponge Diver
// All canvas drawing: painterly water, two shores, a flesh-and-blood diver
// whose body shows his training, and Poseidon over his hoard in the vault.
// Side effects: draws to the canvas context. Never mutates game state
// (except render-only smoothing fields prefixed with an underscore).

var SD = window.SD || {}
window.SD = SD

var INK = '#2b1d16'
var TERRA = '#b0603a'
var MARBLE = '#cfc9bd'
var GOLD = '#d4af37'
var WOOD = '#4a3320'

var seaStops = [
  { at: 0, rgb: [111, 183, 189] },
  { at: 12, rgb: [63, 143, 163] },
  { at: 30, rgb: [35, 100, 139] },
  { at: 55, rgb: [20, 69, 111] },
  { at: 80, rgb: [11, 44, 80] },
  { at: 100, rgb: [7, 28, 56] },
  { at: 132, rgb: [4, 15, 35] }
]

var darkCanvas = null
var darkCtx = null

// Pure: darkness alpha for a depth in meters
function darkAlpha (m) {
  var d = SD.config.darkness
  return d.maxAlpha * SD.smoothstep(d.startM, d.fullM, m)
}

// Pure: skin tones for a 0..1 fitness — the sea browns you, the training carves you
function skinTones (fit) {
  return {
    skin: SD.lerpColor([240, 208, 176], [185, 123, 74], fit),
    deep: SD.lerpColor([214, 178, 144], [150, 95, 55], fit)
  }
}

// Side effect: paints sky + sea background in screen space
function drawBackground (ctx, view, cam) {
  var wlY = -cam.y // waterline in screen px
  if (wlY > 0) {
    var sky = ctx.createLinearGradient(0, 0, 0, wlY)
    sky.addColorStop(0, '#f2cf9b')
    sky.addColorStop(1, '#bfe0da')
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, view.w, Math.min(wlY, view.h))
  }
  if (wlY < view.h) {
    var botM = Math.max(0, (cam.y + view.h) / SD.config.pxPerM)
    var seaTop = Math.max(wlY, 0)
    var sea = ctx.createLinearGradient(0, seaTop, 0, view.h)
    sea.addColorStop(0, SD.sampleStops(seaStops, Math.max(0, (cam.y + seaTop) / SD.config.pxPerM)))
    sea.addColorStop(1, SD.sampleStops(seaStops, botM))
    ctx.fillStyle = sea
    ctx.fillRect(0, seaTop, view.w, view.h - seaTop)
  }
}

// Side effect: sun, clouds, a distant island on the horizon (world space)
function drawSkyline (ctx, t) {
  var W = SD.config.world.widthPx
  ctx.save()
  // sun
  ctx.fillStyle = 'rgba(255, 238, 200, 0.9)'
  ctx.beginPath()
  ctx.arc(W * 0.6, -210, 46, 0, SD.TAU)
  ctx.fill()
  ctx.fillStyle = 'rgba(255, 238, 200, 0.25)'
  ctx.beginPath()
  ctx.arc(W * 0.6, -210, 78, 0, SD.TAU)
  ctx.fill()
  // clouds
  ctx.fillStyle = 'rgba(255, 252, 244, 0.75)'
  for (var i = 0; i < 24; i++) {
    var cx = ((i * 1780 + t * 7) % (W + 1000)) - 500
    var cy = -240 - (i % 3) * 22
    ctx.beginPath()
    ctx.ellipse(cx, cy, 70, 15, 0, 0, SD.TAU)
    ctx.ellipse(cx + 45, cy - 8, 45, 12, 0, 0, SD.TAU)
    ctx.fill()
  }
  // island out at sea, over the kelp
  ctx.fillStyle = 'rgba(90, 110, 105, 0.45)'
  ctx.beginPath()
  ctx.moveTo(W * 0.5, 0)
  ctx.quadraticCurveTo(W * 0.54, -80, W * 0.585, 0)
  ctx.fill()
  ctx.restore()
}

// Side effect: the home village on the left beach — houses, jetty, market
function drawVillage (ctx, t) {
  ctx.save()

  // sand above the waterline
  ctx.fillStyle = '#e8d5a3'
  ctx.beginPath()
  ctx.moveTo(0, 4)
  for (var x = 0; x <= 560; x += 20) {
    ctx.lineTo(x, Math.min(SD.floorYAt(x), 4))
  }
  ctx.lineTo(560, 4)
  ctx.closePath()
  ctx.fill()

  // whitewashed houses with terracotta roofs
  function house (hx, hy, w, h) {
    ctx.fillStyle = '#f2ead6'
    ctx.fillRect(hx, hy - h, w, h)
    ctx.fillStyle = TERRA
    ctx.beginPath()
    ctx.moveTo(hx - 5, hy - h)
    ctx.lineTo(hx + w / 2, hy - h - w * 0.34)
    ctx.lineTo(hx + w + 5, hy - h)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#3a4a58'
    ctx.fillRect(hx + w * 0.38, hy - h * 0.55, w * 0.24, h * 0.55) // door
  }
  house(30, SD.floorYAt(55) - 2, 62, 44)
  house(112, SD.floorYAt(135) - 2, 54, 38)
  house(186, SD.floorYAt(208) - 2, 46, 34)

  // the jetty: posts + planking out over the shallows
  ctx.strokeStyle = WOOD
  ctx.lineWidth = 6
  for (var px = 300; px <= 560; px += 52) {
    ctx.beginPath()
    ctx.moveTo(px, -12)
    ctx.lineTo(px, SD.floorYAt(px) - 2)
    ctx.stroke()
  }
  ctx.fillStyle = '#6b4a2c'
  ctx.fillRect(250, -18, 330, 8)

  // sponge market stall on the jetty
  ctx.fillStyle = '#8a5a33'
  ctx.fillRect(430, -52, 5, 34)
  ctx.fillRect(530, -52, 5, 34)
  for (var a = 0; a < 5; a++) {
    ctx.fillStyle = a % 2 === 0 ? '#e3d3ae' : TERRA
    ctx.fillRect(420 + a * 25, -60, 25, 10)
  }
  // sponges piled for sale + an amphora
  ctx.fillStyle = '#b9834f'
  ctx.beginPath()
  ctx.arc(455, -24, 7, 0, SD.TAU)
  ctx.arc(468, -22, 8, 0, SD.TAU)
  ctx.arc(480, -25, 6, 0, SD.TAU)
  ctx.fill()
  ctx.fillStyle = TERRA
  ctx.beginPath()
  ctx.ellipse(510, -27, 6, 10, 0, 0, SD.TAU)
  ctx.fill()

  ctx.restore()
}

// Side effect: the Temple Mountain — a headland of rock above the water,
// hollow below: the passage shade, the rising shaft, and the air-pocket
// chamber with its own waterline, braziers, and the sanctum on a dry ledge
function drawMountain (ctx, t) {
  var mt = SD.config.world.mountain
  var W = SD.config.world.widthPx
  ctx.save()

  // the massif above the waterline
  ctx.fillStyle = '#5c5a4e'
  ctx.beginPath()
  ctx.moveTo(mt.faceX - 20, 8)
  ctx.quadraticCurveTo(mt.faceX + 300, -240, mt.faceX + 700, -280)
  ctx.quadraticCurveTo(41400, -360, 41800, -180)
  ctx.lineTo(W, -120)
  ctx.lineTo(W, 8)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = 'rgba(120, 118, 100, 0.5)' // sunlit crags
  ctx.beginPath()
  ctx.moveTo(mt.faceX + 240, -120)
  ctx.quadraticCurveTo(mt.faceX + 480, -250, mt.faceX + 760, -240)
  ctx.lineTo(mt.faceX + 700, -110)
  ctx.closePath()
  ctx.fill()
  // a few hardy trees on the crown
  ctx.fillStyle = 'rgba(60, 92, 60, 0.85)'
  for (var tr = 0; tr < 4; tr++) {
    var tx = mt.faceX + 500 + tr * 320
    var ty = -240 - Math.sin(tx * 0.01) * 60
    ctx.beginPath()
    ctx.ellipse(tx, ty, 26, 14, 0, 0, SD.TAU)
    ctx.fill()
  }

  // dim the drowned halls — the passage and chamber live in mountain-shadow
  ctx.fillStyle = 'rgba(6, 12, 20, 0.42)'
  ctx.fillRect(mt.faceX, 8, W - mt.faceX, 46 * 32)

  // the pocket: air above its own waterline
  var air = ctx.createLinearGradient(0, mt.pocketCeilY, 0, mt.pocketSurfaceY)
  air.addColorStop(0, '#1a140e')
  air.addColorStop(1, '#3a2c1c')
  ctx.fillStyle = air
  ctx.fillRect(mt.pocketX1, mt.pocketCeilY, mt.pocketX2 - mt.pocketX1, mt.pocketSurfaceY - mt.pocketCeilY)

  // the pocket waterline, lapping in the dark
  ctx.strokeStyle = 'rgba(190, 225, 235, 0.5)'
  ctx.lineWidth = 2
  ctx.beginPath()
  for (var wx = mt.pocketX1; wx <= mt.pocketX2; wx += 12) {
    var wy = mt.pocketSurfaceY + Math.sin(wx * 0.03 + t * 1.8) * 1.8
    if (wx === mt.pocketX1) ctx.moveTo(wx, wy)
    else ctx.lineTo(wx, wy)
  }
  ctx.stroke()

  // the sanctum on the dry ledge, lit by braziers
  var lx = mt.ledgeX
  var ly = mt.ledgeY
  drawShrine(ctx, { x: lx + 60, y: ly + 6 })
  for (var b = -1; b <= 1; b += 2) {
    var bx = lx + 60 + b * 95
    var glow = 0.5 + Math.sin(t * 6 + b) * 0.14
    ctx.fillStyle = '#6b5030' // the brazier bowl
    ctx.fillRect(bx - 4, ly - 16, 8, 18)
    ctx.beginPath()
    ctx.ellipse(bx, ly - 18, 8, 3.4, 0, 0, SD.TAU)
    ctx.fill()
    var fg = ctx.createRadialGradient(bx, ly - 24, 2, bx, ly - 24, 90)
    fg.addColorStop(0, 'rgba(255, 190, 90, ' + glow + ')')
    fg.addColorStop(1, 'rgba(255, 190, 90, 0)')
    ctx.fillStyle = fg
    ctx.beginPath()
    ctx.arc(bx, ly - 24, 90, 0, SD.TAU)
    ctx.fill()
    ctx.fillStyle = 'rgba(255, 220, 130, 0.9)' // the flame itself
    ctx.beginPath()
    ctx.ellipse(bx, ly - 24 - Math.sin(t * 9 + b) * 2, 4, 7 + Math.sin(t * 7 + b) * 2, 0, 0, SD.TAU)
    ctx.fill()
  }

  // a faint holy shimmer down the shaft, so the way up can be found
  var sg = ctx.createLinearGradient(0, mt.pocketSurfaceY, 0, 30 * 32)
  sg.addColorStop(0, 'rgba(255, 214, 130, 0.16)')
  sg.addColorStop(1, 'rgba(255, 214, 130, 0)')
  ctx.fillStyle = sg
  ctx.fillRect(mt.shaftX1 + 30, mt.pocketSurfaceY, mt.shaftX2 - mt.shaftX1 - 60, 30 * 32 - mt.pocketSurfaceY)

  ctx.restore()
}

// Side effect: the sunken quarry's cut stone — blocks and half-carved giants
function drawQuarry (ctx, decor) {
  var i
  ctx.save()
  for (i = 0; i < decor.blocks.length; i++) {
    var b = decor.blocks[i]
    ctx.save()
    ctx.translate(b.x, b.y)
    ctx.rotate(b.tilt)
    ctx.fillStyle = MARBLE
    ctx.fillRect(-b.w / 2, -b.h, b.w, b.h)
    ctx.strokeStyle = 'rgba(43, 29, 22, 0.3)'
    ctx.lineWidth = 1.5
    ctx.strokeRect(-b.w / 2, -b.h, b.w, b.h)
    ctx.restore()
  }
  for (i = 0; i < decor.giants.length; i++) {
    var g = decor.giants[i]
    ctx.save()
    ctx.translate(g.x, g.y)
    ctx.rotate(g.tilt)
    ctx.fillStyle = '#c6c0b2'
    ctx.fillRect(-24, -g.h * 0.55, 48, g.h * 0.55) // the rough-hewn body, still in the stone
    ctx.beginPath()                                 // the finished head, staring up the slope
    ctx.arc(0, -g.h * 0.55 - 26, 26, 0, SD.TAU)
    ctx.fill()
    ctx.fillStyle = 'rgba(43, 29, 22, 0.35)'
    ctx.beginPath()                                 // its calm carved eye
    ctx.arc(-8, -g.h * 0.55 - 30, 3, 0, SD.TAU)
    ctx.fill()
    ctx.strokeStyle = 'rgba(43, 29, 22, 0.3)'
    ctx.lineWidth = 2
    ctx.beginPath()                                 // chisel marks
    ctx.moveTo(-18, -g.h * 0.2)
    ctx.lineTo(14, -g.h * 0.26)
    ctx.moveTo(-16, -g.h * 0.38)
    ctx.lineTo(16, -g.h * 0.42)
    ctx.stroke()
    ctx.restore()
  }
  ctx.restore()
}

// Side effect: a gorgonian fan swaying on the bright bottoms
function drawFan (ctx, f, t) {
  ctx.save()
  ctx.translate(f.x, f.y)
  ctx.rotate(Math.sin(t * 0.8 + f.phase) * 0.06)
  ctx.strokeStyle = f.pink ? 'rgba(226, 130, 150, 0.85)' : 'rgba(196, 90, 70, 0.85)'
  ctx.lineWidth = 2
  for (var i = -3; i <= 3; i++) {
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.quadraticCurveTo(i * f.h * 0.12, -f.h * 0.6, i * f.h * 0.22, -f.h)
    ctx.stroke()
  }
  ctx.beginPath()
  ctx.arc(0, -f.h * 0.55, f.h * 0.55, Math.PI * 1.15, Math.PI * 1.85)
  ctx.stroke()
  ctx.restore()
}

// Side effect: a seahorse holding its patch of meadow
function drawSeahorse (ctx, s, t) {
  ctx.save()
  ctx.translate(s.x, s.y + Math.sin(t * 1.4 + s.phase) * 4)
  ctx.scale(s.dir, 1)
  ctx.strokeStyle = '#d8b060'
  ctx.lineWidth = 3
  ctx.lineCap = 'round'
  ctx.beginPath() // curled body
  ctx.moveTo(0, -8)
  ctx.quadraticCurveTo(5, -2, 2, 4)
  ctx.quadraticCurveTo(-1, 8, 2, 10)
  ctx.stroke()
  ctx.beginPath() // head + snout
  ctx.moveTo(0, -8)
  ctx.quadraticCurveTo(-1, -12, 5, -12)
  ctx.stroke()
  ctx.fillStyle = '#241a12'
  ctx.beginPath()
  ctx.arc(1, -10, 0.9, 0, SD.TAU)
  ctx.fill()
  ctx.restore()
}

// Side effect: a volcanic vent — dark chimney, shimmering column of rise
function drawVent (ctx, v, t) {
  ctx.save()
  // the chimney
  ctx.fillStyle = '#1c1712'
  ctx.beginPath()
  ctx.moveTo(v.x - 26, v.y + 4)
  ctx.lineTo(v.x - 9, v.y - 34)
  ctx.lineTo(v.x + 9, v.y - 34)
  ctx.lineTo(v.x + 26, v.y + 4)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = 'rgba(255, 140, 60, ' + (0.25 + Math.sin(t * 5 + v.phase) * 0.12) + ')'
  ctx.beginPath()
  ctx.ellipse(v.x, v.y - 34, 7, 3, 0, 0, SD.TAU)
  ctx.fill()
  // the rising water, sketched in bubbles
  ctx.strokeStyle = 'rgba(230, 245, 250, 0.35)'
  ctx.lineWidth = 1.4
  ctx.beginPath()
  for (var i = 0; i < 7; i++) {
    var frac = ((t * 90 + i * 80 + v.phase * 60) % 540)
    var by = v.y - 36 - frac
    var bx = v.x + Math.sin(by * 0.03 + i) * (8 + frac * 0.05)
    var br = 2 + (i % 3)
    ctx.moveTo(bx + br, by)
    ctx.arc(bx, by, br, 0, SD.TAU)
  }
  ctx.stroke()
  ctx.restore()
}

// Side effect: the diver's kaiki — drawn wherever she's anchored, with her cargo
function drawBoat (ctx, state, t) {
  if (!SD.hasBoat(state)) return
  var x = state.boat.x
  var y = -3 + Math.sin(t * 1.1) * 2.5
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(Math.sin(t * 0.9) * 0.02)
  // hull
  ctx.fillStyle = '#3a2c20'
  ctx.beginPath()
  ctx.moveTo(-70, -6)
  ctx.quadraticCurveTo(-78, -20, -62, -24)
  ctx.lineTo(64, -24)
  ctx.quadraticCurveTo(84, -20, 72, -4)
  ctx.quadraticCurveTo(0, 16, -70, -6)
  ctx.fill()
  // terracotta rail stripe + bow eye, for luck
  ctx.strokeStyle = TERRA
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(-60, -20)
  ctx.lineTo(62, -20)
  ctx.stroke()
  ctx.fillStyle = '#f3e7c9'
  ctx.beginPath()
  ctx.arc(66, -14, 3, 0, SD.TAU)
  ctx.fill()
  // mast, furled sail
  ctx.strokeStyle = '#3a2c20'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(4, -24)
  ctx.lineTo(4, -92)
  ctx.stroke()
  ctx.fillStyle = '#e7dbbd'
  ctx.beginPath()
  ctx.moveTo(6, -90)
  ctx.quadraticCurveTo(40, -70, 8, -34)
  ctx.closePath()
  ctx.fill()
  // pennant
  ctx.fillStyle = TERRA
  ctx.beginPath()
  ctx.moveTo(4, -92)
  ctx.lineTo(22, -87)
  ctx.lineTo(4, -82)
  ctx.closePath()
  ctx.fill()
  // the catch heaped in the hold
  var wt = SD.holdWeight(state)
  if (wt > 0) {
    var heap = Math.min(1, wt / SD.holdCapacity(state))
    ctx.fillStyle = '#b9834f'
    for (var i = 0; i < Math.ceil(heap * 6); i++) {
      ctx.beginPath()
      ctx.arc(-40 + i * 12, -26 - (i % 2) * 5 - heap * 4, 6, 0, SD.TAU)
      ctx.fill()
    }
    ctx.fillStyle = TERRA
    ctx.beginPath()
    ctx.ellipse(-48, -30 - heap * 4, 4, 7, -0.2, 0, SD.TAU)
    ctx.fill()
  }
  // the diver at the tiller when aboard
  if (state.player.aboard) drawSailor(ctx, state, t)
  ctx.restore()
}

// Side effect: the diver standing on deck, hand on the tiller
function drawSailor (ctx, state, t) {
  var c = skinTones(SD.fitness(state))
  var f = state.player.facing
  ctx.save()
  ctx.translate(24 * f >= 0 ? 24 : -24, -24)
  ctx.scale(f, 1)
  ctx.strokeStyle = c.skin
  ctx.fillStyle = c.skin
  ctx.lineCap = 'round'
  ctx.lineWidth = 5
  ctx.beginPath() // legs
  ctx.moveTo(0, -14)
  ctx.lineTo(-3, 0)
  ctx.moveTo(0, -14)
  ctx.lineTo(4, 0)
  ctx.stroke()
  ctx.beginPath() // torso
  ctx.ellipse(0, -20, 5.5, 9, 0, 0, SD.TAU)
  ctx.fill()
  ctx.fillStyle = TERRA // perizoma
  ctx.beginPath()
  ctx.ellipse(0, -13, 5, 4, 0, 0, SD.TAU)
  ctx.fill()
  ctx.strokeStyle = c.skin
  ctx.lineWidth = 4
  ctx.beginPath() // arm back to the tiller
  ctx.moveTo(2, -24)
  ctx.lineTo(-9, -18)
  ctx.stroke()
  ctx.fillStyle = c.skin
  ctx.beginPath() // head
  ctx.arc(1, -33, 5.5, 0, SD.TAU)
  ctx.fill()
  ctx.fillStyle = '#241a12'
  ctx.beginPath() // hair
  ctx.arc(0, -35.5, 4.6, Math.PI * 0.95, Math.PI * 2.05)
  ctx.fill()
  ctx.restore()
}

// Side effect: waterline with little running waves — the open sea ends
// where the mountain begins
function drawWaterline (ctx, t, cam, view) {
  ctx.save()
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)'
  ctx.lineWidth = 2
  ctx.beginPath()
  var x0 = cam.x - 20
  var x1 = Math.min(cam.x + view.w + 20, SD.config.world.mountain.faceX + 10)
  for (var x = x0; x <= x1; x += 14) {
    var y = Math.sin(x * 0.02 + t * 1.6) * 2.4
    if (x === x0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.stroke()
  ctx.restore()
}

// Side effect: soft god rays slanting down near the surface
function drawGodrays (ctx, t, cam, view) {
  if (cam.y > 900) return
  ctx.save()
  ctx.fillStyle = 'rgba(255, 250, 225, 0.05)'
  for (var i = 0; i < 12; i++) {
    var baseX = i * 560 + 140
    var sway = Math.sin(t * 0.25 + i * 1.7) * 60
    ctx.beginPath()
    ctx.moveTo(baseX - 26, 2)
    ctx.lineTo(baseX + 26, 2)
    ctx.lineTo(baseX + 120 + sway, 520)
    ctx.lineTo(baseX + 30 + sway, 520)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
}

// Side effect: seafloor sand fill following floorDepthAt
function drawFloor (ctx, cam, view) {
  var bottom = cam.y + view.h + 100
  ctx.save()
  ctx.fillStyle = '#183045'
  ctx.beginPath()
  var x0 = cam.x - 60
  var x1 = cam.x + view.w + 60
  ctx.moveTo(x0, bottom)
  for (var x = x0; x <= x1; x += 40) {
    ctx.lineTo(x, SD.floorYAt(x))
  }
  ctx.lineTo(x1, bottom)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = 'rgba(214, 190, 140, 0.25)'
  ctx.lineWidth = 3
  ctx.beginPath()
  for (var xs = x0; xs <= x1; xs += 40) {
    var fy = SD.floorYAt(xs)
    if (xs === x0) ctx.moveTo(xs, fy)
    else ctx.lineTo(xs, fy)
  }
  ctx.stroke()
  ctx.restore()
}

// Side effect: one rock blob
function drawRock (ctx, r) {
  ctx.fillStyle = '#22384d'
  ctx.beginPath()
  ctx.ellipse(r.x, r.y, r.r, r.r * 0.82, 0, 0, SD.TAU)
  ctx.fill()
  ctx.fillStyle = 'rgba(120, 150, 165, 0.14)'
  ctx.beginPath()
  ctx.ellipse(r.x - r.r * 0.2, r.y - r.r * 0.35, r.r * 0.55, r.r * 0.3, -0.4, 0, SD.TAU)
  ctx.fill()
}

// Side effect: swaying seagrass tuft
function drawGrass (ctx, g, t) {
  ctx.save()
  ctx.strokeStyle = 'rgba(46, 107, 82, 0.8)'
  ctx.lineWidth = 3
  for (var i = -1; i <= 1; i++) {
    var sway = Math.sin(t * 1.2 + g.phase + i) * 7
    ctx.beginPath()
    ctx.moveTo(g.x + i * 5, g.y + 2)
    ctx.quadraticCurveTo(g.x + i * 5 + sway * 0.4, g.y - g.h * 0.5, g.x + i * 5 + sway, g.y - g.h)
    ctx.stroke()
  }
  ctx.restore()
}

// Side effect: one kelp stalk — rooted in the sand, reaching for the light,
// the tallest breaking the surface. Real kelp is never straight: each stalk
// carries its own lazy S-bend, and the sway rides on top of that.
function drawKelp (ctx, k, t) {
  ctx.save()
  ctx.lineCap = 'round'
  // per-stalk permanent bow, derived from its phase so it never changes
  var bow = (Math.sin(k.phase * 7.3) + Math.sin(k.phase * 3.1)) * 0.5 // -1..1
  var w1 = k.h * 0.11 * bow
  var w2 = -k.h * 0.075 * bow
  var w3 = k.h * 0.05 * bow
  var strands = k.h > 260 ? 2 : 3 // tall forest stalks are leaner per-strand
  for (var i = -1; i <= strands - 2; i++) {
    var sway = Math.sin(t * 0.7 + k.phase + i * 0.8) * k.sway
    var sway2 = Math.sin(t * 1.1 + k.phase + i) * k.sway * 0.6
    var topX = k.x + i * 4 + w3 + sway * 1.4
    var topY = k.baseY - k.h
    ctx.strokeStyle = i === 0 ? 'rgba(24, 92, 60, 0.9)' : 'rgba(30, 110, 72, 0.75)'
    ctx.lineWidth = i === 0 ? 5 : 3.5
    ctx.beginPath()
    ctx.moveTo(k.x + i * 4, k.baseY + 2)
    ctx.bezierCurveTo(
      k.x + i * 4 + w1 + sway2, k.baseY - k.h * 0.36,
      k.x + i * 4 + w2 + sway, k.baseY - k.h * 0.72,
      topX, topY
    )
    ctx.stroke()
    // canopy: the surface-breakers flop over sideways at the waterline
    if (topY < 4) {
      ctx.beginPath()
      ctx.moveTo(topX, Math.max(topY, -4))
      ctx.quadraticCurveTo(topX + 10 + sway, Math.max(topY, -4) - 3, topX + 20 + sway * 1.5, Math.max(topY, -4) + 2)
      ctx.stroke()
    }
    // leaf blades, hanging off the curve of the stalk
    ctx.fillStyle = 'rgba(38, 128, 84, 0.7)'
    var blades = Math.max(3, Math.round(k.h / 60))
    for (var b = 1; b <= blades; b++) {
      var f = b / (blades + 0.4)
      var curveX = k.x + i * 4 + bow * k.h * 0.085 * Math.sin(f * Math.PI) + w3 * f * f + sway * f
      var by = k.baseY - k.h * f
      var side = (b % 2 === 0 ? 1 : -1) // blades alternate sides, like real fronds
      ctx.beginPath()
      ctx.ellipse(curveX + side * 6, by, 8, 2.6, side * (-0.5 + Math.sin(t + b) * 0.25), 0, SD.TAU)
      ctx.fill()
    }
  }
  ctx.restore()
}

// Side effect: the cave's darkened interior — a pocket of shadow in the dome
function drawCave (ctx, cave) {
  var grad = ctx.createRadialGradient(cave.x, cave.y, cave.r * 0.2, cave.x, cave.y, cave.r * 1.15)
  grad.addColorStop(0, 'rgba(4, 12, 22, 0.55)')
  grad.addColorStop(1, 'rgba(4, 12, 22, 0)')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(cave.x, cave.y, cave.r * 1.15, 0, SD.TAU)
  ctx.fill()
}

// Side effect: faint drifting streaks that betray a current lane
function drawCurrent (ctx, c, t) {
  ctx.save()
  ctx.strokeStyle = 'rgba(210, 235, 245, 0.14)'
  ctx.lineWidth = 2
  var n = 7
  for (var i = 0; i < n; i++) {
    var frac = ((t * c.force * 0.35 + i * (c.w / n) + c.phase * 60) % c.w + c.w) % c.w
    var sx = c.x + frac
    var sy = c.y + (i / n) * c.h + Math.sin(t * 2 + i) * 4
    ctx.beginPath()
    ctx.moveTo(sx, sy)
    ctx.lineTo(sx + (c.force > 0 ? 26 : -26), sy)
    ctx.stroke()
  }
  ctx.restore()
}

// Side effect: a marble column, standing or broken
function drawColumn (ctx, col) {
  ctx.save()
  ctx.translate(col.x, col.y)
  ctx.rotate(col.tilt)
  ctx.fillStyle = MARBLE
  ctx.fillRect(-12, -6, 24, 8) // plinth
  ctx.fillRect(-8, -col.h, 16, col.h - 4)
  if (col.broken) {
    ctx.beginPath()
    ctx.moveTo(-8, -col.h)
    ctx.lineTo(-3, -col.h - 9)
    ctx.lineTo(2, -col.h - 3)
    ctx.lineTo(8, -col.h - 11)
    ctx.lineTo(8, -col.h)
    ctx.closePath()
    ctx.fill()
  } else {
    ctx.fillRect(-11, -col.h - 8, 22, 8) // capital
  }
  ctx.strokeStyle = 'rgba(43, 29, 22, 0.25)'
  ctx.lineWidth = 1.5
  for (var f = -4; f <= 4; f += 4) {
    ctx.beginPath()
    ctx.moveTo(f, -8)
    ctx.lineTo(f, -col.h + 4)
    ctx.stroke()
  }
  ctx.restore()
}

// Side effect: the old shipwreck, half swallowed by the sand
function drawWreck (ctx, w) {
  ctx.save()
  ctx.translate(w.x, w.y + 14)
  ctx.rotate(-0.12)
  ctx.fillStyle = '#31251b'
  ctx.beginPath()
  ctx.moveTo(-120, 0)
  ctx.quadraticCurveTo(-90, -58, 0, -64)
  ctx.quadraticCurveTo(95, -58, 125, -8)
  ctx.lineTo(110, 0)
  ctx.quadraticCurveTo(60, -40, 0, -44)
  ctx.quadraticCurveTo(-70, -40, -104, 2)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = '#31251b'
  ctx.lineWidth = 5
  for (var i = 0; i < 4; i++) {
    ctx.beginPath()
    ctx.moveTo(-60 + i * 42, -46)
    ctx.lineTo(-64 + i * 42, -4)
    ctx.stroke()
  }
  ctx.lineWidth = 6
  ctx.beginPath()
  ctx.moveTo(10, -60)
  ctx.lineTo(52, -128)
  ctx.stroke()
  ctx.restore()
}

// Side effect: Poseidon's shrine in the vault — pedestal, columns, pediment
function drawShrine (ctx, s) {
  ctx.save()
  ctx.translate(s.x, s.y)
  ctx.fillStyle = MARBLE
  ctx.fillRect(-70, -8, 140, 10)      // floor slab
  ctx.fillRect(-26, -34, 52, 26)      // pedestal
  ctx.fillRect(-32, -40, 64, 6)       // pedestal top
  ctx.fillRect(-62, -110, 12, 102)    // left column
  ctx.fillRect(50, -110, 12, 102)     // right column
  ctx.fillRect(-70, -118, 140, 9)     // architrave
  ctx.beginPath()                     // pediment
  ctx.moveTo(-74, -118)
  ctx.lineTo(0, -152)
  ctx.lineTo(74, -118)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = 'rgba(43, 29, 22, 0.3)'
  ctx.lineWidth = 1.5
  ctx.strokeRect(-26, -34, 52, 26)
  ctx.restore()
}

// Side effect: heaped gold of the vault hoard — mounds, goblets, a glow
function drawHoard (ctx, mounds, t) {
  ctx.save()
  for (var i = 0; i < mounds.length; i++) {
    var m = mounds[i]
    var glow = 0.16 + Math.sin(t * 1.8 + m.phase) * 0.06
    var grad = ctx.createRadialGradient(m.x, m.y - m.h, 4, m.x, m.y - m.h, m.w)
    grad.addColorStop(0, 'rgba(255, 224, 130, ' + glow + ')')
    grad.addColorStop(1, 'rgba(255, 224, 130, 0)')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(m.x, m.y - m.h, m.w, 0, SD.TAU)
    ctx.fill()

    ctx.fillStyle = GOLD
    ctx.beginPath()
    ctx.ellipse(m.x, m.y - m.h / 2, m.w / 2, m.h, 0, 0, SD.TAU)
    ctx.fill()
    // coin glints
    ctx.fillStyle = '#f3e0a0'
    for (var g = 0; g < 5; g++) {
      var gx = m.x + Math.cos(m.phase + g * 2.1) * m.w * 0.3
      var gy = m.y - m.h / 2 - Math.abs(Math.sin(m.phase + g * 1.3)) * m.h * 0.6
      ctx.beginPath()
      ctx.ellipse(gx, gy, 2.6, 1.4, 0, 0, SD.TAU)
      ctx.fill()
    }
    // a goblet on the bigger piles
    if (m.w > 60) {
      ctx.fillStyle = '#e8c96a'
      ctx.fillRect(m.x + m.w * 0.2, m.y - m.h - 10, 3, 8)
      ctx.beginPath()
      ctx.arc(m.x + m.w * 0.2 + 1.5, m.y - m.h - 11, 4, Math.PI, 0)
      ctx.fill()
    }
  }
  ctx.restore()
}

// ---------- Loot ----------

// Side effect: dispatches to the right loot sketch
function drawLoot (ctx, item, t) {
  var bob = item.dropped ? 0 : Math.sin(t * 1.4 + item.phase) * 1.5
  ctx.save()
  ctx.translate(item.x, item.y + bob)
  var fn = lootSketch[item.type]
  if (fn) fn(ctx, t, item)
  ctx.restore()
}

var lootSketch = {

  // humble beginnings
  sponge: function (ctx) {
    ctx.fillStyle = '#b9834f'
    ctx.beginPath()
    ctx.arc(-6, 2, 8, 0, SD.TAU)
    ctx.arc(5, 0, 9, 0, SD.TAU)
    ctx.arc(0, -5, 8, 0, SD.TAU)
    ctx.fill()
    ctx.fillStyle = 'rgba(70, 45, 25, 0.55)'
    ctx.beginPath()
    ctx.arc(-4, -2, 2, 0, SD.TAU)
    ctx.arc(5, 2, 2.4, 0, SD.TAU)
    ctx.arc(2, -6, 1.7, 0, SD.TAU)
    ctx.fill()
  },

  honeycomb: function (ctx) {
    ctx.fillStyle = '#c9752e'
    ctx.beginPath()
    ctx.arc(0, 0, 12, 0, SD.TAU)
    ctx.arc(-9, 4, 7, 0, SD.TAU)
    ctx.arc(9, 4, 7, 0, SD.TAU)
    ctx.fill()
    ctx.fillStyle = 'rgba(80, 40, 15, 0.6)'
    var holes = [[-5, -4], [3, -6], [7, 2], [-1, 4], [-9, 3]]
    ctx.beginPath()
    for (var i = 0; i < holes.length; i++) {
      ctx.moveTo(holes[i][0] + 2, holes[i][1])
      ctx.arc(holes[i][0], holes[i][1], 2.2, 0, SD.TAU)
    }
    ctx.fill()
  },

  shard: function (ctx) {
    ctx.fillStyle = TERRA
    ctx.beginPath()
    ctx.moveTo(-10, 8)
    ctx.lineTo(-6, -9)
    ctx.lineTo(9, -6)
    ctx.lineTo(11, 6)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = '#f3e7c9'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(-7, 1)
    ctx.lineTo(9, -1)
    ctx.stroke()
  },

  oyster: function (ctx, t) {
    ctx.fillStyle = '#7d8a94'
    ctx.beginPath()
    ctx.arc(0, 2, 11, Math.PI, 0)
    ctx.closePath()
    ctx.fill()
    ctx.beginPath()
    ctx.arc(0, -1, 11, Math.PI * 1.05, -Math.PI * 0.05)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#fdfaf1'
    ctx.beginPath()
    ctx.arc(0, 0, 3.2, 0, SD.TAU)
    ctx.fill()
    ctx.fillStyle = 'rgba(255, 255, 255, ' + (0.4 + Math.sin(t * 3) * 0.3) + ')'
    ctx.beginPath()
    ctx.arc(-1, -1, 1.2, 0, SD.TAU)
    ctx.fill()
  },

  amphora: function (ctx) {
    ctx.fillStyle = TERRA
    ctx.beginPath()
    ctx.ellipse(0, -22, 7, 3, 0, 0, SD.TAU) // lip
    ctx.fill()
    ctx.fillRect(-3.5, -23, 7, 8)           // neck
    ctx.beginPath()                          // body
    ctx.moveTo(-4, -15)
    ctx.bezierCurveTo(-13, -10, -12, 8, 0, 15)
    ctx.bezierCurveTo(12, 8, 13, -10, 4, -15)
    ctx.closePath()
    ctx.fill()
    ctx.fillRect(-4, 14, 8, 4)               // foot
    ctx.strokeStyle = TERRA                   // handles
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.moveTo(-5, -20)
    ctx.quadraticCurveTo(-13, -18, -9, -11)
    ctx.moveTo(5, -20)
    ctx.quadraticCurveTo(13, -18, 9, -11)
    ctx.stroke()
    ctx.strokeStyle = INK                     // figure band
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(-10, -3)
    ctx.lineTo(10, -3)
    ctx.stroke()
  },

  helmet: function (ctx) {
    ctx.fillStyle = '#8f7135'
    ctx.beginPath()                 // dome + cheek guards
    ctx.arc(0, -2, 11, Math.PI, 0)
    ctx.lineTo(11, 10)
    ctx.lineTo(4, 10)
    ctx.lineTo(3, 2)
    ctx.lineTo(-3, 2)
    ctx.lineTo(-4, 10)
    ctx.lineTo(-11, 10)
    ctx.closePath()
    ctx.fill()
    ctx.fillRect(-1.5, -2, 3, 8)    // nose guard
    ctx.strokeStyle = '#a03123'     // crest
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.arc(0, -6, 12, Math.PI * 1.15, Math.PI * 1.85)
    ctx.stroke()
  },

  laurel: function (ctx, t) {
    ctx.save()
    ctx.strokeStyle = GOLD
    ctx.fillStyle = GOLD
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(0, 2, 11, Math.PI * 0.85, Math.PI * 2.15)
    ctx.stroke()
    for (var i = 0; i < 8; i++) {
      var a = Math.PI * 0.9 + i * (Math.PI * 1.2 / 7)
      var lx = Math.cos(a) * 11
      var ly = 2 + Math.sin(a) * 11
      ctx.beginPath()
      ctx.ellipse(lx, ly, 4.5, 1.8, a + Math.PI / 2, 0, SD.TAU)
      ctx.fill()
    }
    ctx.fillStyle = 'rgba(255, 240, 180, ' + (0.35 + Math.sin(t * 2.5) * 0.25) + ')'
    ctx.beginPath()
    ctx.arc(-4, -6, 1.6, 0, SD.TAU)
    ctx.fill()
    ctx.restore()
  },

  statue: function (ctx) {
    ctx.fillStyle = '#d8d2c6'
    ctx.beginPath()                // classical profile, facing left
    ctx.moveTo(-2, -16)
    ctx.quadraticCurveTo(-12, -14, -11, -4) // forehead
    ctx.lineTo(-13, 2)                       // nose, dead straight, very classical
    ctx.lineTo(-9, 3)
    ctx.lineTo(-10, 6)                       // lips
    ctx.lineTo(-8, 7)
    ctx.quadraticCurveTo(-9, 12, -4, 13)     // chin + jaw
    ctx.lineTo(-2, 18)                       // neck
    ctx.lineTo(6, 18)
    ctx.quadraticCurveTo(12, 4, 8, -8)       // back of head
    ctx.quadraticCurveTo(6, -16, -2, -16)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = 'rgba(95, 122, 95, 0.5)' // a little moss
    ctx.beginPath()
    ctx.arc(6, -8, 2.5, 0, SD.TAU)
    ctx.arc(2, 14, 2, 0, SD.TAU)
    ctx.fill()
  },

  trident: function (ctx, t) {
    var glow = 0.28 + Math.sin(t * 2.2) * 0.12
    var grad = ctx.createRadialGradient(0, -6, 4, 0, -6, 52)
    grad.addColorStop(0, 'rgba(255, 224, 130, ' + glow + ')')
    grad.addColorStop(1, 'rgba(255, 224, 130, 0)')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(0, -6, 52, 0, SD.TAU)
    ctx.fill()
    ctx.strokeStyle = GOLD
    ctx.lineWidth = 3.5
    ctx.beginPath()
    ctx.moveTo(0, 28)
    ctx.lineTo(0, -14)      // shaft
    ctx.moveTo(0, -14)
    ctx.lineTo(0, -30)      // middle prong
    ctx.moveTo(-9, -12)
    ctx.quadraticCurveTo(-10, -22, -8, -28) // left prong
    ctx.moveTo(9, -12)
    ctx.quadraticCurveTo(10, -22, 8, -28)   // right prong
    ctx.moveTo(-9, -12)
    ctx.lineTo(9, -12)      // crossbar
    ctx.stroke()
  },

  coin: function (ctx, t) {
    var glow = 0.2 + Math.sin(t * 2.6) * 0.1
    var grad = ctx.createRadialGradient(0, 0, 2, 0, 0, 26)
    grad.addColorStop(0, 'rgba(255, 224, 130, ' + glow + ')')
    grad.addColorStop(1, 'rgba(255, 224, 130, 0)')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(0, 0, 26, 0, SD.TAU)
    ctx.fill()
    ctx.fillStyle = GOLD
    ctx.beginPath()
    ctx.arc(0, 0, 9, 0, SD.TAU)
    ctx.fill()
    ctx.strokeStyle = '#8a6d1c'
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.moveTo(0, 5)
    ctx.lineTo(0, -5)
    ctx.moveTo(-3, -1)
    ctx.lineTo(-3, -5)
    ctx.moveTo(3, -1)
    ctx.lineTo(3, -5)
    ctx.stroke()
  },

  // the great chest of the vault
  chest: function (ctx, t) {
    var pulse = 0.5 + Math.sin(t * 2.4) * 0.5
    var grad = ctx.createRadialGradient(0, -8, 6, 0, -8, 70)
    grad.addColorStop(0, 'rgba(255, 224, 130, ' + (0.2 + pulse * 0.12) + ')')
    grad.addColorStop(1, 'rgba(255, 224, 130, 0)')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(0, -8, 70, 0, SD.TAU)
    ctx.fill()

    ctx.fillStyle = '#5a3416'                 // body
    ctx.fillRect(-24, -10, 48, 26)
    ctx.fillStyle = '#7a4a20'                 // lid
    ctx.beginPath()
    ctx.moveTo(-24, -10)
    ctx.quadraticCurveTo(0, -30, 24, -10)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = GOLD                      // bands
    ctx.fillRect(-24, -2, 48, 4)
    ctx.fillRect(-3, -24, 6, 40)
    ctx.beginPath()                           // lock
    ctx.arc(0, 2, 5, 0, SD.TAU)
    ctx.fill()
    ctx.fillStyle = '#3a2a10'
    ctx.fillRect(-1.5, 1, 3, 5)
    ctx.fillStyle = 'rgba(255, 240, 150, 0.85)' // sparkles
    ctx.beginPath()
    ctx.arc(-15, -26 - pulse * 4, 2, 0, SD.TAU)
    ctx.arc(13, -30 - pulse * 3, 1.5, 0, SD.TAU)
    ctx.arc(0, -34 - pulse * 5, 2.2, 0, SD.TAU)
    ctx.fill()
  },

  // the fine bath sponge of Kalymnos — pale, dense, cave-grown
  fino: function (ctx, t) {
    var shimmer = 0.25 + Math.sin(t * 2.1) * 0.12
    ctx.fillStyle = '#dcc9a0'
    ctx.beginPath()
    ctx.arc(-5, 2, 7, 0, SD.TAU)
    ctx.arc(4, 0, 8, 0, SD.TAU)
    ctx.arc(-1, -5, 7, 0, SD.TAU)
    ctx.arc(6, -6, 5, 0, SD.TAU)
    ctx.fill()
    ctx.fillStyle = 'rgba(120, 96, 60, 0.5)' // fine, tight pores
    ctx.beginPath()
    ctx.arc(-4, -1, 1.2, 0, SD.TAU)
    ctx.arc(1, 3, 1.4, 0, SD.TAU)
    ctx.arc(4, -3, 1.2, 0, SD.TAU)
    ctx.arc(-1, -6, 1, 0, SD.TAU)
    ctx.arc(7, 1, 1.1, 0, SD.TAU)
    ctx.fill()
    ctx.fillStyle = 'rgba(255, 245, 220, ' + shimmer + ')' // the primo sheen
    ctx.beginPath()
    ctx.arc(-2, -4, 2.2, 0, SD.TAU)
    ctx.fill()
  },

  // the murex snail — the purple-dye shell of the ancients
  murex: function (ctx, t) {
    ctx.save()
    ctx.rotate(-0.3)
    ctx.fillStyle = '#7a5a80'
    ctx.beginPath() // spiral body
    ctx.ellipse(0, 0, 9, 6.5, 0.3, 0, SD.TAU)
    ctx.fill()
    ctx.fillStyle = '#93709c'
    ctx.beginPath() // spire
    ctx.moveTo(6, -3)
    ctx.quadraticCurveTo(13, -7, 15, -2)
    ctx.quadraticCurveTo(11, -1, 7, 1)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = '#5c4062' // the famous spikes
    ctx.lineWidth = 1.6
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(-4, -5)
    ctx.lineTo(-6, -9)
    ctx.moveTo(0, -6)
    ctx.lineTo(0, -10)
    ctx.moveTo(4, -5)
    ctx.lineTo(6, -8)
    ctx.moveTo(-7, -2)
    ctx.lineTo(-10, -4)
    ctx.stroke()
    ctx.fillStyle = '#3d2a44' // the aperture, hinting at the purple within
    ctx.beginPath()
    ctx.ellipse(-5, 3, 3.4, 2.2, 0.5, 0, SD.TAU)
    ctx.fill()
    ctx.fillStyle = 'rgba(190, 120, 210, 0.5)'
    ctx.beginPath()
    ctx.ellipse(-5, 3, 1.6, 1, 0.5, 0, SD.TAU)
    ctx.fill()
    ctx.restore()
  },

  // an octopus denned on the rocks — tribute, if your knife is good
  octopus: function (ctx, t) {
    ctx.save()
    var breathe = Math.sin(t * 1.6) * 1.2
    ctx.fillStyle = '#9c5a3c'
    ctx.beginPath() // mantle
    ctx.ellipse(0, -5, 9 + breathe * 0.4, 11, 0, 0, SD.TAU)
    ctx.fill()
    ctx.strokeStyle = '#8a4c30'
    ctx.lineWidth = 3.4
    ctx.lineCap = 'round'
    for (var i = 0; i < 5; i++) { // curling arms
      var a = -0.9 + i * 0.45
      var curl = Math.sin(t * 2 + i * 1.3) * 3
      ctx.beginPath()
      ctx.moveTo(Math.cos(a) * 4, 2)
      ctx.quadraticCurveTo(Math.cos(a) * 12 + curl, 8, Math.cos(a) * 16 + curl, 10 + Math.sin(i * 2.1) * 2)
      ctx.stroke()
    }
    ctx.fillStyle = '#f3e0c8' // wary eyes
    ctx.beginPath()
    ctx.arc(-3.4, -7, 2, 0, SD.TAU)
    ctx.arc(3.4, -7, 2, 0, SD.TAU)
    ctx.fill()
    ctx.fillStyle = '#241a12'
    ctx.beginPath()
    ctx.arc(-3.4, -7, 1, 0, SD.TAU)
    ctx.arc(3.4, -7, 1, 0, SD.TAU)
    ctx.fill()
    ctx.restore()
  },

  // a message bobbing at the surface
  bottle: function (ctx, t) {
    ctx.save()
    ctx.rotate(0.5 + Math.sin(t * 1.3) * 0.12)
    var glint = 0.5 + Math.sin(t * 3) * 0.4
    ctx.fillStyle = 'rgba(168, 214, 205, 0.85)'
    ctx.beginPath()                       // body
    ctx.ellipse(0, 2, 6, 10, 0, 0, SD.TAU)
    ctx.fill()
    ctx.fillRect(-2.5, -14, 5, 8)         // neck
    ctx.fillStyle = '#8a5a33'             // cork
    ctx.fillRect(-2.5, -17, 5, 4)
    ctx.fillStyle = '#f3e7c9'             // the rolled note inside
    ctx.fillRect(-1.5, -4, 3, 10)
    ctx.fillStyle = 'rgba(255, 255, 255, ' + glint + ')'
    ctx.beginPath()
    ctx.arc(-2, -2, 1.3, 0, SD.TAU)
    ctx.fill()
    ctx.restore()
  }
}

// Side effect: gold progress ring around the item being gathered
function drawHarvestRing (ctx, state) {
  var item = state.harvestTarget
  if (!item || !item.progress) return
  ctx.save()
  ctx.translate(item.x, item.y)
  ctx.strokeStyle = 'rgba(243, 231, 201, 0.35)'
  ctx.lineWidth = 3.5
  ctx.beginPath()
  ctx.arc(0, 0, 22, 0, SD.TAU)
  ctx.stroke()
  ctx.strokeStyle = GOLD
  ctx.beginPath()
  ctx.arc(0, 0, 22, -Math.PI / 2, -Math.PI / 2 + SD.TAU * Math.min(item.progress, 1))
  ctx.stroke()
  ctx.restore()
}

// ---------- Dangers ----------

// Side effect: sea urchin
function drawUrchin (ctx, u) {
  ctx.save()
  ctx.translate(u.x, u.y)
  ctx.strokeStyle = '#12100e'
  ctx.lineWidth = 1.8
  ctx.beginPath()
  for (var i = 0; i < 14; i++) {
    var a = u.phase + i * (SD.TAU / 14)
    ctx.moveTo(Math.cos(a) * 4, Math.sin(a) * 4)
    ctx.lineTo(Math.cos(a) * (11 + (i % 3) * 2.5), Math.sin(a) * (11 + (i % 3) * 2.5))
  }
  ctx.stroke()
  ctx.fillStyle = '#12100e'
  ctx.beginPath()
  ctx.arc(0, 0, 7.5, 0, SD.TAU)
  ctx.fill()
  ctx.fillStyle = 'rgba(190, 210, 220, 0.7)'
  ctx.beginPath()
  ctx.arc(-2, -2, 1.1, 0, SD.TAU)
  ctx.fill()
  ctx.restore()
}

// Side effect: jellyfish with glow (also lights the dark — see darkness pass)
function drawJelly (ctx, j, t) {
  ctx.save()
  ctx.translate(j.x, j.y)
  var pulse = Math.sin(t * 2.4 + j.phase)
  var grad = ctx.createRadialGradient(0, 0, 4, 0, 0, 42)
  grad.addColorStop(0, 'rgba(255, 159, 174, ' + (0.32 + pulse * 0.08) + ')')
  grad.addColorStop(1, 'rgba(255, 159, 174, 0)')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(0, 0, 42, 0, SD.TAU)
  ctx.fill()
  ctx.fillStyle = 'rgba(255, 170, 185, 0.85)'
  ctx.beginPath()
  ctx.arc(0, 0, 13 + pulse, Math.PI, 0)
  ctx.quadraticCurveTo(10, 6, 6, 5)
  ctx.quadraticCurveTo(3, 3, 0, 6)
  ctx.quadraticCurveTo(-3, 3, -6, 5)
  ctx.quadraticCurveTo(-10, 6, -13 - pulse, 0)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = 'rgba(229, 107, 134, 0.7)'
  ctx.lineWidth = 1.6
  for (var i = -1; i <= 1; i++) {
    ctx.beginPath()
    ctx.moveTo(i * 6, 5)
    ctx.quadraticCurveTo(i * 6 + Math.sin(t * 3 + j.phase + i) * 5, 15, i * 6 + Math.sin(t * 2 + i) * 7, 25)
    ctx.stroke()
  }
  ctx.restore()
}

// Side effect: moray eel snaking out of its rock
function drawEel (ctx, e, t) {
  var headA = Math.atan2(e.y - e.homeY, e.x - e.homeX)
  var lurkPeek = e.mode === 'lurk' ? Math.sin(t * 1.2 + e.phase) * 4 + 8 : 0
  ctx.save()
  ctx.strokeStyle = '#6f6d3d'
  ctx.lineCap = 'round'
  var segs = 8
  ctx.beginPath()
  for (var i = 0; i <= segs; i++) {
    var f = i / segs
    var px = SD.lerp(e.homeX, e.x, f) + Math.sin(f * 6 + t * 6) * 6 * f
    var py = SD.lerp(e.homeY, e.y, f) + Math.cos(f * 6 + t * 6) * 6 * f
    if (e.mode === 'lurk') {
      px = e.homeX + Math.cos(headA || 0) * lurkPeek * f
      py = e.homeY + Math.sin(headA || 0) * lurkPeek * f
    }
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.lineWidth = 9
  ctx.stroke()
  // head
  var hx = e.mode === 'lurk' ? e.homeX + Math.cos(headA || 0) * lurkPeek : e.x
  var hy = e.mode === 'lurk' ? e.homeY + Math.sin(headA || 0) * lurkPeek : e.y
  ctx.fillStyle = '#6f6d3d'
  ctx.save()
  ctx.translate(hx, hy)
  ctx.rotate(e.mode === 'lunge' ? headA : (headA || -Math.PI / 2))
  var jaw = e.mode === 'lunge' ? 0.5 : 0.12
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(13, -Math.sin(jaw) * 9)
  ctx.lineTo(4, 0)
  ctx.lineTo(13, Math.sin(jaw) * 9)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#e8e4c8'
  ctx.beginPath()
  ctx.arc(1, -3.5, 1.6, 0, SD.TAU)
  ctx.fill()
  ctx.restore()
  ctx.restore()
}

// Side effect: shark silhouette; leans meaner while chasing.
// Abyss sharks are bigger, darker, and red of eye.
function drawShark (ctx, s, t) {
  var abyss = s.kind === 'abyss'
  ctx.save()
  ctx.translate(s.x, s.y)
  ctx.scale(s.dir, 1)
  if (abyss) ctx.scale(1.3, 1.3)
  ctx.rotate(Math.sin(s.phase * 2) * 0.03)
  ctx.fillStyle = abyss
    ? (s.mode === 'chase' ? '#2c3540' : '#222a34')
    : (s.mode === 'chase' ? '#5d6b7a' : '#4e5a68')
  ctx.beginPath()
  ctx.moveTo(30, 0)                                // nose
  ctx.quadraticCurveTo(12, -11, -14, -8)           // back
  ctx.lineTo(-26, -14)                             // upper tail fin
  ctx.quadraticCurveTo(-22, -2, -30, 8)            // lower tail fin
  ctx.lineTo(-16, 5)
  ctx.quadraticCurveTo(6, 10, 30, 0)               // belly
  ctx.closePath()
  ctx.fill()
  ctx.beginPath()                                  // dorsal fin
  ctx.moveTo(-2, -9)
  ctx.lineTo(-8, -20)
  ctx.lineTo(-13, -8)
  ctx.closePath()
  ctx.fill()
  ctx.beginPath()                                  // pectoral fin
  ctx.moveTo(6, 6)
  ctx.lineTo(-2, 16)
  ctx.lineTo(-6, 7)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = 'rgba(20, 26, 34, 0.5)'        // gills
  ctx.lineWidth = 1.6
  for (var g = 0; g < 3; g++) {
    ctx.beginPath()
    ctx.arc(10 - g * 4, 0, 6, -0.7, 0.7)
    ctx.stroke()
  }
  ctx.fillStyle = abyss ? '#d4483a' : '#e8e8e8'    // eye
  ctx.beginPath()
  ctx.arc(20, -3, 2.4, 0, SD.TAU)
  ctx.fill()
  ctx.fillStyle = '#111'
  ctx.beginPath()
  ctx.arc(20.6, -3, 1.2, 0, SD.TAU)
  ctx.fill()
  ctx.restore()
}

// Side effect: ink squid — deep drifter with a bad attitude
function drawSquid (ctx, q, t) {
  ctx.save()
  ctx.translate(q.x, q.y)
  ctx.scale(q.dir, 1)
  ctx.rotate(Math.sin(t * 1.4 + q.phase) * 0.08)
  // mantle
  ctx.fillStyle = '#4a2a5e'
  ctx.beginPath()
  ctx.ellipse(4, 0, 15, 10, 0, 0, SD.TAU)
  ctx.fill()
  ctx.beginPath()                              // mantle point
  ctx.moveTo(14, -6)
  ctx.quadraticCurveTo(26, 0, 14, 6)
  ctx.closePath()
  ctx.fill()
  // tentacles trailing behind
  ctx.strokeStyle = '#3a1e4c'
  ctx.lineWidth = 2.5
  ctx.lineCap = 'round'
  for (var i = -2; i <= 2; i++) {
    var wave = Math.sin(t * 5 + q.phase + i) * 4
    ctx.beginPath()
    ctx.moveTo(-8, i * 2.4)
    ctx.quadraticCurveTo(-18, i * 3 + wave, -27, i * 3.6 + wave * 1.4)
    ctx.stroke()
  }
  // big glassy eye
  ctx.fillStyle = '#e8c86a'
  ctx.beginPath()
  ctx.arc(4, -2, 3.4, 0, SD.TAU)
  ctx.fill()
  ctx.fillStyle = '#1a1026'
  ctx.beginPath()
  ctx.arc(4.8, -2, 1.7, 0, SD.TAU)
  ctx.fill()
  ctx.restore()
}

// Side effect: ambient fish school (harmless, decorative)
function drawFishSchool (ctx, school, t) {
  ctx.save()
  ctx.fillStyle = 'rgba(205, 222, 232, 0.5)'
  for (var i = 0; i < school.fish.length; i++) {
    var f = school.fish[i]
    var fx = school.x + f.ox + Math.sin(t * 2 + f.phase) * 6
    var fy = school.y + f.oy + Math.cos(t * 1.7 + f.phase) * 4
    ctx.save()
    ctx.translate(fx, fy)
    ctx.scale(school.dir, 1)
    ctx.beginPath()
    ctx.ellipse(0, 0, school.size, school.size * 0.4, 0, 0, SD.TAU)
    ctx.moveTo(-school.size, 0)
    ctx.lineTo(-school.size - 3.5, -2.5)
    ctx.lineTo(-school.size - 3.5, 2.5)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }
  ctx.restore()
}

// Side effect: floating hp pips over a wounded boss
function drawBossHp (ctx, f, y) {
  if (f.hp >= f.maxHp) return
  ctx.save()
  for (var i = 0; i < f.maxHp; i++) {
    ctx.fillStyle = i < f.hp ? 'rgba(226, 80, 60, 0.9)' : 'rgba(240, 235, 220, 0.35)'
    ctx.fillRect(f.x - f.maxHp * 4 + i * 8, y, 6, 5)
  }
  ctx.restore()
}

// Side effect: KARCHARIAS — the great white, twice a shark and angrier
function drawKarcharias (ctx, f, t) {
  ctx.save()
  ctx.translate(f.x, f.y)
  var dir = f.mode === 'charge' ? (f.vx >= 0 ? 1 : -1) : (Math.cos((f.angle || 0) + Math.PI / 2) >= 0 ? 1 : -1)
  ctx.scale(dir * 2.3, 2.3)
  if (f.hurtT > 0) ctx.globalAlpha = 0.6
  ctx.rotate(Math.sin(f.phase * 2) * 0.03)
  ctx.fillStyle = f.mode === 'charge' ? '#7a8894' : '#66727e'
  ctx.beginPath()
  ctx.moveTo(30, 0)
  ctx.quadraticCurveTo(12, -11, -14, -8)
  ctx.lineTo(-26, -15)
  ctx.quadraticCurveTo(-22, -2, -30, 8)
  ctx.lineTo(-16, 5)
  ctx.quadraticCurveTo(6, 10, 30, 0)
  ctx.closePath()
  ctx.fill()
  ctx.beginPath() // dorsal
  ctx.moveTo(-2, -9)
  ctx.lineTo(-9, -22)
  ctx.lineTo(-14, -8)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#e8e4da' // the white belly
  ctx.beginPath()
  ctx.moveTo(28, 1)
  ctx.quadraticCurveTo(6, 9, -14, 5)
  ctx.quadraticCurveTo(4, 5, 28, 1)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = 'rgba(200, 60, 50, 0.55)' // old harpoon scars
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.moveTo(2, -7)
  ctx.lineTo(8, -3)
  ctx.moveTo(6, -8)
  ctx.lineTo(11, -4)
  ctx.stroke()
  ctx.fillStyle = '#1a1a1a' // dead black eye
  ctx.beginPath()
  ctx.arc(20, -3, 2.6, 0, SD.TAU)
  ctx.fill()
  // teeth when charging
  if (f.mode === 'charge' || f.mode === 'windup') {
    ctx.strokeStyle = '#f4f0e6'
    ctx.lineWidth = 1.4
    ctx.beginPath()
    for (var th = 0; th < 4; th++) {
      ctx.moveTo(24 + th * 1.6, 1.5)
      ctx.lineTo(25 + th * 1.6, 4)
    }
    ctx.stroke()
  }
  ctx.restore()
  drawBossHp(ctx, f, f.y - 70)
}

// Side effect: THE KRAKEN — lord of its grotto, all arm and appetite
function drawKraken (ctx, f, t) {
  ctx.save()
  ctx.translate(f.x, f.y)
  if (f.hurtT > 0) ctx.globalAlpha = 0.65
  var breathe = Math.sin(t * 1.2 + f.phase) * 3
  // arms first, writhing
  ctx.strokeStyle = '#5a2a4e'
  ctx.lineCap = 'round'
  for (var i = 0; i < 7; i++) {
    var a = -0.65 + i * 0.42
    var wl = 85 + Math.sin(t * 1.6 + i * 1.7) * 18
    var grab = f.mode === 'grab' && i === 3 ? 26 : 0
    ctx.lineWidth = 10 - i * 0.6
    ctx.beginPath()
    ctx.moveTo(Math.cos(a) * 18, 14)
    ctx.quadraticCurveTo(
      Math.cos(a) * (wl * 0.6), 30 + Math.sin(t * 2 + i) * 10,
      Math.cos(a) * wl, 40 + Math.sin(t * 1.3 + i * 2) * 14 - grab
    )
    ctx.stroke()
  }
  // mantle
  ctx.fillStyle = '#6e3860'
  ctx.beginPath()
  ctx.ellipse(0, -8, 34 + breathe, 42, 0, 0, SD.TAU)
  ctx.fill()
  ctx.fillStyle = '#7e4870'
  ctx.beginPath()
  ctx.ellipse(-8, -20, 18, 22, -0.2, 0, SD.TAU)
  ctx.fill()
  // the great eye, tracking you
  ctx.fillStyle = '#e8c86a'
  ctx.beginPath()
  ctx.arc(10, -6, 10, 0, SD.TAU)
  ctx.fill()
  ctx.fillStyle = '#180c20'
  ctx.beginPath()
  ctx.ellipse(12, -6, 4, 6.5, 0, 0, SD.TAU)
  ctx.fill()
  ctx.restore()
  drawBossHp(ctx, f, f.y - 78)
}

// Side effect: KETOS — the roaming leviathan, drawn as a wake of coils
function drawKetos (ctx, f, t) {
  var dir = f.vx >= 0 ? 1 : -1
  ctx.save()
  if (f.hurtT > 0) ctx.globalAlpha = 0.65
  ctx.fillStyle = '#22424e'
  // trailing coils
  for (var s = 1; s <= 4; s++) {
    var sx = f.x - dir * s * 58
    var sy = f.y + Math.sin(f.phase * 2 - s * 1.2) * 22
    ctx.beginPath()
    ctx.ellipse(sx, sy, 30 - s * 4, 20 - s * 2.6, Math.sin(f.phase - s) * 0.2, 0, SD.TAU)
    ctx.fill()
  }
  // head
  ctx.save()
  ctx.translate(f.x, f.y)
  ctx.scale(dir, 1)
  ctx.fillStyle = '#2a5260'
  ctx.beginPath()
  ctx.moveTo(52, 0)
  ctx.quadraticCurveTo(30, -26, -10, -20)
  ctx.quadraticCurveTo(-26, 0, -10, 20)
  ctx.quadraticCurveTo(30, 24, 52, 0)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = '#1a3640' // ridge fins
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(-6, -20)
  ctx.lineTo(2, -34)
  ctx.moveTo(10, -18)
  ctx.lineTo(18, -30)
  ctx.stroke()
  ctx.fillStyle = '#c9a227' // lamp of an eye
  ctx.beginPath()
  ctx.arc(28, -6, 5, 0, SD.TAU)
  ctx.fill()
  ctx.fillStyle = '#0e0a08'
  ctx.beginPath()
  ctx.arc(29.5, -6, 2.2, 0, SD.TAU)
  ctx.fill()
  ctx.strokeStyle = '#e8e4d6' // a mouthful of trouble
  ctx.lineWidth = 1.6
  ctx.beginPath()
  for (var th = 0; th < 5; th++) {
    ctx.moveTo(34 + th * 3.4, 6)
    ctx.lineTo(36 + th * 3.4, 11)
  }
  ctx.stroke()
  ctx.restore()
  ctx.restore()
  drawBossHp(ctx, f, f.y - 64)
}

// Side effect: one catchable fish — mullet, bream, or grouper — or a boss
function drawFauna (ctx, f, t) {
  if (f.taken) return
  if (f.boss) {
    if (f.kind === 'karcharias') drawKarcharias(ctx, f, t)
    else if (f.kind === 'kraken') drawKraken(ctx, f, t)
    else drawKetos(ctx, f, t)
    return
  }
  var cfg = SD.config.fauna[f.kind]
  var dir = f.vx >= 0 ? 1 : -1
  var r = cfg.r
  ctx.save()
  ctx.translate(f.x, f.y)
  ctx.scale(dir, 1)
  ctx.rotate(Math.sin(f.phase * 3) * 0.06)

  var body = f.kind === 'mullet' ? '#b8c4cc' : f.kind === 'bream' ? '#c8b98a' : '#5a4a3a'
  var belly = f.kind === 'grouper' ? '#7a6a55' : '#e4e9ec'
  ctx.fillStyle = body
  ctx.beginPath()
  ctx.ellipse(0, 0, r * 1.5, r * 0.72, 0, 0, SD.TAU)
  ctx.fill()
  ctx.fillStyle = belly
  ctx.beginPath()
  ctx.ellipse(r * 0.1, r * 0.22, r * 1.15, r * 0.4, 0.06, 0, SD.TAU)
  ctx.fill()
  // tail
  ctx.fillStyle = body
  ctx.beginPath()
  ctx.moveTo(-r * 1.4, 0)
  ctx.lineTo(-r * 2, -r * 0.7)
  ctx.lineTo(-r * 2, r * 0.7)
  ctx.closePath()
  ctx.fill()
  // marks: mullet stripes / bream gold brow / grouper blotches
  if (f.kind === 'mullet') {
    ctx.strokeStyle = 'rgba(90, 105, 115, 0.6)'
    ctx.lineWidth = 1.2
    for (var s = -1; s <= 1; s++) {
      ctx.beginPath()
      ctx.moveTo(-r * 1.2, s * r * 0.25)
      ctx.lineTo(r * 1.2, s * r * 0.25)
      ctx.stroke()
    }
  } else if (f.kind === 'bream') {
    ctx.strokeStyle = GOLD
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(r * 0.9, -r * 0.1, r * 0.5, -1.9, -0.6)
    ctx.stroke()
  } else {
    ctx.fillStyle = 'rgba(40, 30, 22, 0.4)'
    for (var g = 0; g < 4; g++) {
      ctx.beginPath()
      ctx.arc(-r + g * r * 0.7, -r * 0.2 + (g % 2) * r * 0.35, r * 0.22, 0, SD.TAU)
      ctx.fill()
    }
  }
  // eye
  ctx.fillStyle = '#fdf8ee'
  ctx.beginPath()
  ctx.arc(r * 0.95, -r * 0.18, r * 0.2, 0, SD.TAU)
  ctx.fill()
  ctx.fillStyle = '#111'
  ctx.beginPath()
  ctx.arc(r * 1.02, -r * 0.18, r * 0.1, 0, SD.TAU)
  ctx.fill()
  ctx.restore()
}

// ---------- Poseidon ----------

// Side effect: the god of the sea, final-boss sized, over his hoard.
// Local space faces +x; h.facing flips him; h.thrust extends the trident.
function drawPoseidon (ctx, h, t) {
  ctx.save()
  ctx.translate(h.x, h.y + Math.sin(h.phase * 1.3) * 4)

  // aura — wider and colder when awake
  var auraR = h.awake ? 150 : 100
  var auraA = h.awake ? 0.32 + Math.sin(t * 3) * 0.08 : 0.14 + Math.sin(t * 1.2) * 0.04
  var aura = ctx.createRadialGradient(0, -20, 10, 0, -20, auraR)
  aura.addColorStop(0, 'rgba(84, 190, 210, ' + auraA + ')')
  aura.addColorStop(1, 'rgba(84, 190, 210, 0)')
  ctx.fillStyle = aura
  ctx.beginPath()
  ctx.arc(0, -20, auraR, 0, SD.TAU)
  ctx.fill()

  ctx.scale(h.facing, 1)

  var skin = '#c99263'
  var skinDeep = '#a06e42'

  // legs, fading into the gloom below
  ctx.strokeStyle = skin
  ctx.lineCap = 'round'
  ctx.lineWidth = 13
  ctx.beginPath()
  ctx.moveTo(-10, 26)
  ctx.lineTo(-17, 62)
  ctx.moveTo(10, 26)
  ctx.lineTo(17, 62)
  ctx.stroke()
  ctx.fillStyle = skinDeep
  ctx.beginPath()
  ctx.ellipse(-17, 66, 10, 4.5, 0, 0, SD.TAU)
  ctx.ellipse(17, 66, 10, 4.5, 0, 0, SD.TAU)
  ctx.fill()

  // deep-sea cloth
  ctx.fillStyle = '#0d4f63'
  ctx.beginPath()
  ctx.moveTo(-26, 8)
  ctx.quadraticCurveTo(0, 36, 26, 8)
  ctx.lineTo(21, 30)
  ctx.quadraticCurveTo(0, 50, -21, 30)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = GOLD
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.moveTo(-24, 12)
  ctx.quadraticCurveTo(0, 34, 24, 12)
  ctx.stroke()

  // torso — a wedge of god-muscle
  ctx.fillStyle = skin
  ctx.beginPath()
  ctx.moveTo(-30, -12)
  ctx.quadraticCurveTo(-33, -38, -17, -46)
  ctx.lineTo(17, -46)
  ctx.quadraticCurveTo(33, -38, 30, -10)
  ctx.lineTo(21, 18)
  ctx.quadraticCurveTo(0, 27, -21, 18)
  ctx.closePath()
  ctx.fill()
  // pec shelf + abs
  ctx.strokeStyle = skinDeep
  ctx.lineWidth = 1.6
  ctx.globalAlpha = 0.5
  ctx.beginPath()
  ctx.moveTo(0, -38)
  ctx.lineTo(0, 12)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(-16, -26)
  ctx.quadraticCurveTo(0, -18, 16, -26)
  ctx.stroke()
  for (var ab = 0; ab < 2; ab++) {
    ctx.beginPath()
    ctx.ellipse(-7, -8 + ab * 10, 6.5, 3.6, 0, 0, SD.TAU)
    ctx.stroke()
    ctx.beginPath()
    ctx.ellipse(7, -8 + ab * 10, 6.5, 3.6, 0, 0, SD.TAU)
    ctx.stroke()
  }
  ctx.globalAlpha = 1

  // shoulders
  ctx.fillStyle = skin
  ctx.beginPath()
  ctx.ellipse(-28, -34, 12, 10, 0, 0, SD.TAU)
  ctx.ellipse(28, -34, 12, 10, 0, 0, SD.TAU)
  ctx.fill()

  // rear arm, braced
  ctx.strokeStyle = skin
  ctx.lineWidth = 11
  ctx.beginPath()
  ctx.moveTo(-26, -30)
  ctx.quadraticCurveTo(-44, -12, -38, 12)
  ctx.stroke()
  ctx.fillStyle = skin
  ctx.beginPath()
  ctx.arc(-38, 15, 7, 0, SD.TAU)
  ctx.fill()

  // neck + head
  ctx.fillStyle = skin
  ctx.fillRect(-9, -60, 18, 16)
  ctx.beginPath()
  ctx.arc(0, -66, 16, 0, SD.TAU)
  ctx.fill()

  // the white beard of ages
  ctx.fillStyle = '#e6ded0'
  ctx.beginPath()
  ctx.moveTo(-14, -60)
  ctx.quadraticCurveTo(-17, -38, -8, -30)
  ctx.quadraticCurveTo(0, -24, 8, -30)
  ctx.quadraticCurveTo(17, -38, 14, -60)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#d6cec0'
  ctx.beginPath()
  ctx.arc(-6, -36, 4.5, 0, SD.TAU)
  ctx.arc(6, -36, 4.5, 0, SD.TAU)
  ctx.arc(0, -31, 5, 0, SD.TAU)
  ctx.fill()

  // hair mane
  ctx.fillStyle = '#ece4d6'
  ctx.beginPath()
  ctx.ellipse(0, -76, 17, 12, 0, 0, SD.TAU)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(-13, -78, 6, 0, SD.TAU)
  ctx.arc(13, -78, 6, 0, SD.TAU)
  ctx.arc(0, -84, 5.5, 0, SD.TAU)
  ctx.fill()

  // golden crown
  ctx.fillStyle = GOLD
  ctx.beginPath()
  ctx.moveTo(-12, -80)
  ctx.lineTo(-9, -93)
  ctx.lineTo(-4, -82)
  ctx.lineTo(0, -97)
  ctx.lineTo(4, -82)
  ctx.lineTo(9, -93)
  ctx.lineTo(12, -80)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#1a7a8c'
  ctx.beginPath()
  ctx.arc(0, -94, 2.6, 0, SD.TAU)
  ctx.fill()

  // eyes — embers when he wakes
  ctx.fillStyle = h.awake ? '#7ee4ff' : '#4a4038'
  ctx.beginPath()
  ctx.arc(-5.5, -66, 2.4, 0, SD.TAU)
  ctx.arc(5.5, -66, 2.4, 0, SD.TAU)
  ctx.fill()
  if (h.awake) {
    var eyeGlow = ctx.createRadialGradient(0, -66, 2, 0, -66, 22)
    eyeGlow.addColorStop(0, 'rgba(126, 228, 255, 0.35)')
    eyeGlow.addColorStop(1, 'rgba(126, 228, 255, 0)')
    ctx.fillStyle = eyeGlow
    ctx.beginPath()
    ctx.arc(0, -66, 22, 0, SD.TAU)
    ctx.fill()
  }
  // brows, permanently displeased
  ctx.strokeStyle = '#c8beac'
  ctx.lineWidth = 2.4
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(-9.5, -71)
  ctx.lineTo(-2.5, -69)
  ctx.moveTo(9.5, -71)
  ctx.lineTo(2.5, -69)
  ctx.stroke()

  // front arm + THE trident
  ctx.strokeStyle = skin
  ctx.lineWidth = 11
  ctx.beginPath()
  ctx.moveTo(26, -30)
  ctx.quadraticCurveTo(40, -12, 36, 6)
  ctx.stroke()

  ctx.restore()

  // trident in world space so it can aim at the diver
  drawPoseidonTrident(ctx, h, t)
}

// Side effect: Poseidon's trident — aimed along stabAngle, extending on thrust
function drawPoseidonTrident (ctx, h, t) {
  var bob = Math.sin(h.phase * 1.3) * 4
  var gripX = h.x + h.facing * 36
  var gripY = h.y + bob + 6
  var angle = h.awake ? h.stabAngle : (h.facing > 0 ? -0.35 : Math.PI + 0.35)
  if (h.mode === 'idle' && !h.awake) angle = -Math.PI / 2 + h.facing * 0.15 // held upright at rest

  var reach = 66 + Math.max(0, h.thrust)
  var back = 26 - Math.min(0, h.thrust) // windup pulls the butt back
  var dx = Math.cos(angle)
  var dy = Math.sin(angle)

  ctx.save()
  // shaft
  ctx.strokeStyle = '#8a6d1c'
  ctx.lineWidth = 5
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(gripX - dx * back, gripY - dy * back)
  ctx.lineTo(gripX + dx * reach, gripY + dy * reach)
  ctx.stroke()
  // thrust wake
  if (h.mode === 'thrust') {
    ctx.strokeStyle = 'rgba(126, 228, 255, 0.35)'
    ctx.lineWidth = 12
    ctx.beginPath()
    ctx.moveTo(gripX, gripY)
    ctx.lineTo(gripX + dx * reach, gripY + dy * reach)
    ctx.stroke()
  }
  // head: crossbar + three prongs
  var hx = gripX + dx * reach
  var hy = gripY + dy * reach
  var px = -dy
  var py = dx
  ctx.strokeStyle = GOLD
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(hx - px * 11, hy - py * 11)
  ctx.lineTo(hx + px * 11, hy + py * 11)
  for (var s = -1; s <= 1; s++) {
    ctx.moveTo(hx + px * 10 * s, hy + py * 10 * s)
    ctx.lineTo(hx + px * 11 * s + dx * 17, hy + py * 11 * s + dy * 17)
  }
  ctx.stroke()
  // fist on the shaft
  ctx.fillStyle = '#c99263'
  ctx.beginPath()
  ctx.arc(gripX, gripY, 7.5, 0, SD.TAU)
  ctx.fill()
  ctx.restore()
}

// ---------- The diver ----------

// Side effect: the sponge diver — flesh, muscle, and training made visible.
// Fitness (0..1) broadens the shoulders, narrows the waist, thickens the
// legs, and browns the skin. Gear is worn, not implied.
function drawDiver (ctx, state, t) {
  var p = state.player
  if (p.invuln > 0 && Math.floor(t * 12) % 2 === 0) return // hurt blink

  var fit = SD.fitness(state)
  var c = skinTones(fit)
  var speed = SD.dist(0, 0, p.vx, p.vy)
  var targetA = speed > 36 ? Math.atan2(p.vy, p.vx) : (p.facing === 1 ? 0 : Math.PI)
  if (p._ang === undefined) p._ang = targetA
  var da = Math.atan2(Math.sin(targetA - p._ang), Math.cos(targetA - p._ang))
  p._ang += da * Math.min(1, 7 * (t - (p._angT || t)) + 0.12)
  p._angT = t

  // body metrics from fitness
  var shoulder = 6.4 + fit * 3.2      // torso half-height at the shoulders
  var waist = 6.0 - fit * 1.9        // torso half-height at the hips
  var thigh = 4.6 + fit * 3.0
  var calf = 3.2 + fit * 1.3
  var armUpper = 3.6 + fit * 2.0
  var armFore = 3.0 + fit * 0.7
  var defA = Math.max(0, (fit - 0.25) / 0.75) * 0.4 // muscle-line opacity

  ctx.save()
  ctx.translate(p.x, p.y)
  ctx.rotate(p._ang)
  if (Math.cos(p._ang) < 0) ctx.scale(1, -1) // keep the back up when swimming left

  var kick = Math.sin(p.swimPhase * 2.4) * (speed > 25 ? 1 : 0.3)
  ctx.lineCap = 'round'

  // --- legs: thigh into calf, scissor kick ---
  function leg (side) {
    var k = kick * side
    ctx.strokeStyle = c.skin
    ctx.lineWidth = thigh
    ctx.beginPath()
    ctx.moveTo(-9, 0)
    ctx.quadraticCurveTo(-15, k * 4, -19.5, k * 5.5)
    ctx.stroke()
    ctx.lineWidth = calf
    ctx.beginPath()
    ctx.moveTo(-19, k * 5.2)
    ctx.quadraticCurveTo(-24, k * 7, -28.5, k * 8.5)
    ctx.stroke()
    // foot or fin
    var fx = -30
    var fy = k * 9
    if (state.upgrades.fins > 0) {
      var fl = 9 + state.upgrades.fins * 2.4
      ctx.fillStyle = state.upgrades.fins >= 5 ? '#0e8a7a' : '#1a4f5e'
      ctx.beginPath()
      ctx.moveTo(fx + 2, fy)
      ctx.quadraticCurveTo(fx - fl * 0.4, fy - 4.5, fx - fl, fy - 1.4)
      ctx.lineTo(fx - fl * 0.85, fy)
      ctx.lineTo(fx - fl, fy + 1.4)
      ctx.quadraticCurveTo(fx - fl * 0.4, fy + 4.5, fx + 2, fy)
      ctx.closePath()
      ctx.fill()
      if (state.upgrades.fins >= 6) { // god-tier: bronze wings of Hermes
        ctx.fillStyle = GOLD
        ctx.beginPath()
        ctx.ellipse(fx - 2, fy - 4, 4, 1.6, -0.5, 0, SD.TAU)
        ctx.fill()
      }
      ctx.fillStyle = '#241a12' // strap
      ctx.beginPath()
      ctx.ellipse(fx + 1.5, fy, 3, 2.4, 0, 0, SD.TAU)
      ctx.fill()
    } else {
      ctx.fillStyle = c.skin
      ctx.beginPath()
      ctx.ellipse(fx - 1, fy, 4, 2.4, k * 0.25, 0, SD.TAU)
      ctx.fill()
    }
    // quad line on trained legs
    if (defA > 0.05) {
      ctx.strokeStyle = c.deep
      ctx.globalAlpha = defA
      ctx.lineWidth = 1.4
      ctx.beginPath()
      ctx.moveTo(-10, side * 1.2)
      ctx.quadraticCurveTo(-14, k * 3 + side, -18, k * 4.6)
      ctx.stroke()
      ctx.globalAlpha = 1
    }
  }
  leg(1)
  leg(-1)

  // the kamaki rides slung across the back until it's needed
  // (the Trident of Poseidon, once claimed, rides there instead)
  if ((state.upgrades.kamaki > 0 || state.tridentClaimed) && !(p.spearFlash > 0)) {
    ctx.strokeStyle = state.tridentClaimed ? '#8a6d1c' : '#6b4a26'
    ctx.lineWidth = state.tridentClaimed ? 2.8 : 2.2
    ctx.beginPath()
    ctx.moveTo(-21, -4)
    ctx.lineTo(17, -11)
    ctx.stroke()
    ctx.strokeStyle = state.tridentClaimed ? GOLD : '#c9c2b4'
    ctx.lineWidth = state.tridentClaimed ? 1.8 : 1.4
    ctx.beginPath()
    ctx.moveTo(17, -11)
    ctx.lineTo(21.5, -12.5)
    ctx.moveTo(17, -11)
    ctx.lineTo(22, -10.8)
    ctx.moveTo(17, -11)
    ctx.lineTo(21, -9.2)
    ctx.stroke()
  }

  // --- torso: V-taper grows with fitness ---
  ctx.fillStyle = c.skin
  ctx.beginPath()
  ctx.moveTo(-11, -waist)
  ctx.bezierCurveTo(-2, -shoulder * 0.9, 5, -shoulder, 9, -shoulder * 0.85)
  ctx.quadraticCurveTo(11.5, 0, 9, shoulder * 0.85)
  ctx.bezierCurveTo(5, shoulder, -2, shoulder * 0.9, -11, waist)
  ctx.quadraticCurveTo(-13.5, 0, -11, -waist)
  ctx.closePath()
  ctx.fill()

  // soft belly when green, cut abs when carved
  if (fit < 0.4) {
    ctx.fillStyle = c.deep
    ctx.globalAlpha = 0.25 * (0.4 - fit) / 0.4
    ctx.beginPath()
    ctx.ellipse(-3, 1.5, 6, 3.4, 0, 0, SD.TAU)
    ctx.fill()
    ctx.globalAlpha = 1
  }
  if (defA > 0.05) {
    ctx.strokeStyle = c.deep
    ctx.globalAlpha = defA
    ctx.lineWidth = 1.2
    ctx.beginPath() // pec line
    ctx.moveTo(7.5, -shoulder * 0.55)
    ctx.quadraticCurveTo(9, 0, 7.5, shoulder * 0.55)
    ctx.stroke()
    if (fit > 0.5) { // abs
      for (var ai = 0; ai < 3; ai++) {
        ctx.beginPath()
        ctx.moveTo(1 - ai * 3.4, -2.6)
        ctx.lineTo(1 - ai * 3.4, 2.6)
        ctx.stroke()
      }
    }
    ctx.globalAlpha = 1
  }

  // Karcharias' hide, worn as a wetsuit across the torso
  if (state.relics.hide) {
    ctx.fillStyle = 'rgba(56, 70, 82, 0.5)'
    ctx.beginPath()
    ctx.ellipse(-1, 0, 10.5, shoulder * 0.78, 0, 0, SD.TAU)
    ctx.fill()
  }

  // terracotta perizoma at the hips
  ctx.fillStyle = TERRA
  ctx.beginPath()
  ctx.ellipse(-10.5, 0, 4.4, waist + 0.8, 0, 0, SD.TAU)
  ctx.fill()
  ctx.fillStyle = 'rgba(243, 231, 201, 0.35)'
  ctx.beginPath()
  ctx.ellipse(-9.5, -1, 2.2, waist * 0.5, 0, 0, SD.TAU)
  ctx.fill()

  // --- the net bag, slung at the lower back, bulging with the catch ---
  var wt = SD.bagWeight(p.bag)
  if (wt > 0) {
    var br = 4.5 + Math.min(10, wt) * 0.8
    ctx.fillStyle = 'rgba(58, 42, 24, 0.9)'
    ctx.beginPath()
    ctx.ellipse(-15, 6 + br * 0.3, br, br * 0.8, 0.5, 0, SD.TAU)
    ctx.fill()
    ctx.strokeStyle = 'rgba(210, 190, 150, 0.4)' // netting
    ctx.lineWidth = 0.9
    for (var n = -1; n <= 1; n++) {
      ctx.beginPath()
      ctx.moveTo(-15 - br * 0.7, 4 + br * 0.3 + n * 2.4)
      ctx.quadraticCurveTo(-15, 8 + br * 0.5 + n * 2, -15 + br * 0.7, 4 + br * 0.3 + n * 2.4)
      ctx.stroke()
    }
  }

  // --- arms ---
  var harvesting = state.harvestTarget && state.harvestTarget.progress > 0
  var knifeOut = state.upgrades.knife > 0 && (p.knifeFlash > 0 || harvesting)
  if (p.holdingStone) {
    ctx.strokeStyle = c.skin
    ctx.lineWidth = armUpper
    ctx.beginPath()
    ctx.moveTo(8, -2)
    ctx.lineTo(24, 2)
    ctx.stroke()
    ctx.lineWidth = armFore
    ctx.beginPath()
    ctx.moveTo(8, 2)
    ctx.lineTo(24, 5)
    ctx.stroke()
    ctx.fillStyle = '#7e8790'             // the skandalopetra itself
    ctx.beginPath()
    ctx.ellipse(28, 4, 7, 5, 0.4, 0, SD.TAU)
    ctx.fill()
  } else {
    var reachWobble = Math.sin(p.swimPhase * 2.4 + 1.2) * 3
    ctx.strokeStyle = c.skin
    ctx.lineWidth = armUpper
    ctx.beginPath()
    ctx.moveTo(8, -2.5)
    ctx.quadraticCurveTo(15, -4.5, 20, -3.5)
    ctx.stroke()
    ctx.lineWidth = armFore
    ctx.beginPath()
    ctx.moveTo(19.5, -3.6)
    ctx.quadraticCurveTo(23, -3.8, 26, -3 + reachWobble * 0.4)
    ctx.stroke()
    ctx.lineWidth = armUpper - 0.6
    ctx.beginPath()
    ctx.moveTo(8, 2.5)
    ctx.quadraticCurveTo(14, 5.5, 19, 5)
    ctx.stroke()
    ctx.lineWidth = armFore
    ctx.beginPath()
    ctx.moveTo(18.5, 5)
    ctx.quadraticCurveTo(22, 5.4, 24, 5 - reachWobble * 0.4)
    ctx.stroke()
    // hands
    ctx.fillStyle = c.skin
    ctx.beginPath()
    ctx.ellipse(26.5, -3 + reachWobble * 0.4, 2.4, 1.8, 0, 0, SD.TAU)
    ctx.ellipse(24.5, 5 - reachWobble * 0.4, 2.4, 1.8, 0, 0, SD.TAU)
    ctx.fill()
    // the knife, out when cutting
    if (knifeOut) {
      var kx = 26.5
      var ky = -3 + reachWobble * 0.4
      ctx.fillStyle = '#5a3a1c'
      ctx.fillRect(kx - 1, ky - 1.4, 4, 2.8)
      ctx.fillStyle = '#e8d49a'
      ctx.beginPath()
      ctx.moveTo(kx + 3, ky - 1.6)
      ctx.lineTo(kx + 12, ky)
      ctx.lineTo(kx + 3, ky + 1.6)
      ctx.closePath()
      ctx.fill()
    }
    // the kamaki, driven forward on a strike — golden, once the Trident is yours
    if (p.spearFlash > 0) {
      var sx = 26.5
      var sy = -3 + reachWobble * 0.4
      var ext = 30 + (0.35 - p.spearFlash) * 40
      ctx.strokeStyle = state.tridentClaimed ? '#8a6d1c' : '#6b4a26'
      ctx.lineWidth = state.tridentClaimed ? 3 : 2.4
      ctx.beginPath()
      ctx.moveTo(sx - 10, sy + 2)
      ctx.lineTo(sx + ext, sy)
      ctx.stroke()
      ctx.strokeStyle = state.tridentClaimed ? GOLD : '#e8e2d4'
      ctx.lineWidth = 1.8
      ctx.beginPath()
      ctx.moveTo(sx + ext, sy)
      ctx.lineTo(sx + ext + 7, sy - 3)
      ctx.moveTo(sx + ext, sy)
      ctx.lineTo(sx + ext + 8.5, sy)
      ctx.moveTo(sx + ext, sy)
      ctx.lineTo(sx + ext + 7, sy + 3)
      ctx.stroke()
      if (state.tridentClaimed) { // the god's own crackle
        ctx.strokeStyle = 'rgba(126, 228, 255, ' + (p.spearFlash * 1.6).toFixed(2) + ')'
        ctx.lineWidth = 5
        ctx.beginPath()
        ctx.moveTo(sx, sy)
        ctx.lineTo(sx + ext + 6, sy)
        ctx.stroke()
      }
    }
  }

  // bicep swell on trained arms
  if (defA > 0.08) {
    ctx.fillStyle = c.deep
    ctx.globalAlpha = defA * 0.6
    ctx.beginPath()
    ctx.ellipse(13, -3.4, 2.6 + fit, 1.6 + fit * 0.5, -0.2, 0, SD.TAU)
    ctx.fill()
    ctx.globalAlpha = 1
  }

  // --- head ---
  ctx.fillStyle = c.skin
  ctx.beginPath()
  ctx.arc(19, -2, 6.5, 0, SD.TAU)
  ctx.fill()
  ctx.beginPath() // nose, in profile
  ctx.moveTo(25, -3.4)
  ctx.lineTo(27.2, -1.6)
  ctx.lineTo(24.8, -0.6)
  ctx.closePath()
  ctx.fill()
  // jaw shadow on the carved
  if (fit > 0.4) {
    ctx.strokeStyle = c.deep
    ctx.globalAlpha = 0.35
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.moveTo(21, 2.6)
    ctx.quadraticCurveTo(23.5, 2.2, 24.6, 0.6)
    ctx.stroke()
    ctx.globalAlpha = 1
  }
  // dark curls
  ctx.fillStyle = '#241a12'
  ctx.beginPath()
  ctx.arc(17.5, -5.5, 5.8, Math.PI * 0.85, Math.PI * 1.98)
  ctx.quadraticCurveTo(23, -8.5, 24, -5.5)
  ctx.quadraticCurveTo(21, -6.8, 19, -5)
  ctx.closePath()
  ctx.fill()
  ctx.beginPath()
  ctx.arc(14.2, -3.5, 2.6, 0, SD.TAU)
  ctx.arc(16.5, -7.6, 2.4, 0, SD.TAU)
  ctx.arc(20.5, -8, 2.2, 0, SD.TAU)
  ctx.fill()

  if (state.upgrades.light > 0) {
    // olive-oil goggles: strap + glass
    ctx.strokeStyle = '#241a12'
    ctx.lineWidth = 1.8
    ctx.beginPath()
    ctx.moveTo(13.5, -3.5)
    ctx.quadraticCurveTo(16, -1.2, 13.8, 0.6)
    ctx.stroke()
    ctx.fillStyle = 'rgba(154, 212, 232, 0.7)'
    ctx.beginPath()
    ctx.ellipse(22.6, -2.4, 3.1, 2.5, 0, 0, SD.TAU)
    ctx.fill()
    ctx.strokeStyle = '#2a323c'
    ctx.lineWidth = 1.2
    ctx.stroke()
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
    ctx.beginPath()
    ctx.arc(21.6, -3.2, 0.8, 0, SD.TAU)
    ctx.fill()
  } else {
    // bare eye
    ctx.fillStyle = '#fdf8ee'
    ctx.beginPath()
    ctx.ellipse(22.3, -2.6, 1.7, 1.3, 0, 0, SD.TAU)
    ctx.fill()
    ctx.fillStyle = '#1c140e'
    ctx.beginPath()
    ctx.arc(22.8, -2.6, 0.8, 0, SD.TAU)
    ctx.fill()
  }

  // terracotta headband, always
  ctx.strokeStyle = TERRA
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.arc(19, -2, 6.6, -Math.PI * 0.95, -Math.PI * 0.15)
  ctx.stroke()

  ctx.restore()
}

// Side effect: rising bubbles
function drawBubbles (ctx, bubbles) {
  ctx.save()
  ctx.strokeStyle = 'rgba(230, 245, 250, 0.55)'
  ctx.lineWidth = 1.4
  ctx.beginPath()
  for (var i = 0; i < bubbles.length; i++) {
    var b = bubbles[i]
    ctx.moveTo(b.x + b.r, b.y)
    ctx.arc(b.x, b.y, b.r, 0, SD.TAU)
  }
  ctx.stroke()
  ctx.restore()
}

// ---------- Murk + darkness ----------

// Side effect: the water itself swallows detail past the clarity radius —
// a soft ring of sea-colored haze centered on the diver. Bare eyes see an
// arm's length; goggles buy you the sea. Ink takes it all away again.
// Screen-space: world distances arrive multiplied by the camera zoom.
function drawMurk (ctx, state, view, cam, zoom) {
  var p = state.player
  if (p.y < SD.config.pxPerM * 0.6 && !(state.inkT > 0)) return // surface water is clear enough

  var clarity = SD.clarityRadius(state)
  if (state.inkT > 0) {
    var inkBlend = Math.min(1, state.inkT / 0.6)
    clarity = SD.lerp(clarity, SD.config.inkClarity, inkBlend)
  }
  var depth = SD.depthM(p.y)
  var col = SD.sampleStops(seaStops, Math.min(depth + 8, 132))
  var rgb = col.slice(4, -1) // "rgb(r,g,b)" → "r,g,b"

  var sx = (p.x - cam.x) * zoom
  var sy = (p.y - cam.y) * zoom
  var inner = Math.max(clarity * 0.72 * zoom, 1)
  var outer = Math.max(clarity * 1.9 * zoom, inner + 1)
  var grad = ctx.createRadialGradient(sx, sy, inner, sx, sy, outer)
  var peak = state.inkT > 0 ? 0.94 : (state.upgrades.light < 1 && !state.devMode ? 0.88 : 0.78)
  grad.addColorStop(0, 'rgba(' + rgb + ', 0)')
  grad.addColorStop(0.55, 'rgba(' + rgb + ', ' + (peak * 0.55).toFixed(2) + ')')
  grad.addColorStop(1, 'rgba(' + rgb + ', ' + peak + ')')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, view.w, view.h)
}

// Side effect: darkens the deep, then erases light around the diver,
// jellyfish, glowing treasure, and the god.
// Screen-space: world distances arrive multiplied by the camera zoom.
function drawDarkness (ctx, state, view, cam, zoom) {
  var p = state.player
  var topA = darkAlpha(Math.max(0, cam.y / SD.config.pxPerM))
  var botA = darkAlpha(Math.max(0, (cam.y + view.h / zoom) / SD.config.pxPerM))
  if (topA < 0.01 && botA < 0.01) return

  if (!darkCanvas) {
    darkCanvas = document.createElement('canvas')
    darkCtx = darkCanvas.getContext('2d')
  }
  if (darkCanvas.width !== view.w || darkCanvas.height !== view.h) {
    darkCanvas.width = view.w
    darkCanvas.height = view.h
  }

  var dc = darkCtx
  dc.globalCompositeOperation = 'source-over'
  dc.clearRect(0, 0, view.w, view.h)
  var grad = dc.createLinearGradient(0, 0, 0, view.h)
  grad.addColorStop(0, 'rgba(3, 10, 24, ' + topA + ')')
  grad.addColorStop(1, 'rgba(3, 10, 24, ' + botA + ')')
  dc.fillStyle = grad
  dc.fillRect(0, 0, view.w, view.h)

  dc.globalCompositeOperation = 'destination-out'

  // Side effect on dc: punches a soft hole of light
  function punch (wx, wy, wr, strength) {
    var sx = (wx - cam.x) * zoom
    var sy = (wy - cam.y) * zoom
    var r = wr * zoom
    if (sx < -r || sx > view.w + r || sy < -r || sy > view.h + r) return
    var g = dc.createRadialGradient(sx, sy, r * 0.15, sx, sy, r)
    g.addColorStop(0, 'rgba(0, 0, 0, ' + strength + ')')
    g.addColorStop(1, 'rgba(0, 0, 0, 0)')
    dc.fillStyle = g
    dc.beginPath()
    dc.arc(sx, sy, r, 0, SD.TAU)
    dc.fill()
  }

  punch(p.x, p.y, SD.lightRadius(state), 1)
  var jellies = state.world.dangers.jellies
  for (var i = 0; i < jellies.length; i++) {
    punch(jellies[i].x, jellies[i].y, 64, 0.55)
  }
  var loot = state.world.loot
  for (var l = 0; l < loot.length; l++) {
    if (loot[l].taken) continue
    if (loot[l].type === 'trident') punch(loot[l].x, loot[l].y, 110, 0.8)
    if (loot[l].type === 'coin') punch(loot[l].x, loot[l].y, 54, 0.6)
    if (loot[l].type === 'chest') punch(loot[l].x, loot[l].y, 90, 0.7)
  }
  var pos = state.world.dangers.poseidon
  if (pos) punch(pos.x, pos.y - 20, pos.awake ? 210 : 150, 0.72)
  var hoard = state.world.decor.hoard
  for (var hM = 0; hM < hoard.length; hM++) {
    punch(hoard[hM].x, hoard[hM].y - hoard[hM].h, 60, 0.4)
  }
  // the braziers of the mountain sanctum, and the glow down its shaft
  var mt = SD.config.world.mountain
  punch(mt.ledgeX + 60, mt.ledgeY - 30, 240, 0.85)
  punch((mt.shaftX1 + mt.shaftX2) / 2, 20 * 32, 130, 0.5)
  // the vents glow faintly from below
  var vents = state.world.dangers.vents
  for (var vI = 0; vI < vents.length; vI++) {
    punch(vents[vI].x, vents[vI].y - 30, 90, 0.5)
  }

  ctx.drawImage(darkCanvas, 0, 0)
}

// ---------- Main render ----------

// Side effect: draws the whole frame. zoom scales the world around the
// camera; the murk and the dark are laid on in screen space afterward.
SD.render = function (state, ctx, view, zoom) {
  var t = state.time
  var cam = state.cam
  var w = state.world
  var z = zoom || 1
  var wv = { w: view.w / z, h: view.h / z } // the world-unit window we can see

  ctx.save()
  ctx.scale(z, z)

  drawBackground(ctx, wv, cam)

  ctx.save()
  var shakeX = state.effects.shake > 0.2 ? (Math.random() - 0.5) * state.effects.shake * 2 : 0
  var shakeY = state.effects.shake > 0.2 ? (Math.random() - 0.5) * state.effects.shake * 2 : 0
  ctx.translate(-cam.x + shakeX, -cam.y + shakeY)

  drawSkyline(ctx, t)
  drawGodrays(ctx, t, cam, wv)
  drawFloor(ctx, cam, wv)
  drawVillage(ctx, t)

  var i
  var decor = w.decor
  for (i = 0; i < decor.columns.length; i++) drawColumn(ctx, decor.columns[i])
  for (i = 0; i < decor.wrecks.length; i++) {
    var wr = decor.wrecks[i]
    if (wr.x < cam.x - 300 || wr.x > cam.x + wv.w + 300) continue
    drawWreck(ctx, wr)
  }
  drawQuarry(ctx, decor)
  for (i = 0; i < decor.fans.length; i++) {
    var fan = decor.fans[i]
    if (fan.x < cam.x - 80 || fan.x > cam.x + wv.w + 80) continue
    drawFan(ctx, fan, t)
  }
  drawHoard(ctx, decor.hoard, t)
  drawShrine(ctx, decor.shrine)
  for (i = 0; i < w.dangers.vents.length; i++) {
    var vent = w.dangers.vents[i]
    if (vent.x < cam.x - 120 || vent.x > cam.x + wv.w + 120) continue
    drawVent(ctx, vent, t)
  }

  for (i = 0; i < w.rocks.length; i++) {
    var r = w.rocks[i]
    if (r.x + r.r < cam.x - 60 || r.x - r.r > cam.x + wv.w + 60) continue
    if (r.y + r.r < cam.y - 60 || r.y - r.r > cam.y + wv.h + 60) continue
    drawRock(ctx, r)
  }
  if (decor.cave) drawCave(ctx, decor.cave)

  for (i = 0; i < decor.grass.length; i++) {
    var g = decor.grass[i]
    if (g.x < cam.x - 80 || g.x > cam.x + wv.w + 80) continue
    drawGrass(ctx, g, t)
  }

  for (i = 0; i < w.kelp.length; i++) {
    var k = w.kelp[i]
    if (k.x < cam.x - 120 || k.x > cam.x + wv.w + 120) continue
    drawKelp(ctx, k, t)
  }

  for (i = 0; i < w.currents.length; i++) {
    var cur = w.currents[i]
    if (cur.x + cur.w < cam.x - 60 || cur.x > cam.x + wv.w + 60) continue
    if (cur.y + cur.h < cam.y - 60 || cur.y > cam.y + wv.h + 60) continue
    drawCurrent(ctx, cur, t)
  }

  for (i = 0; i < w.loot.length; i++) {
    var item = w.loot[i]
    if (item.taken) continue
    if (item.x < cam.x - 80 || item.x > cam.x + wv.w + 80) continue
    if (item.y < cam.y - 80 || item.y > cam.y + wv.h + 80) continue
    drawLoot(ctx, item, t)
  }
  drawHarvestRing(ctx, state)

  for (i = 0; i < w.fishSchools.length; i++) drawFishSchool(ctx, w.fishSchools[i], t)
  for (i = 0; i < w.fauna.length; i++) {
    var fa = w.fauna[i]
    if (fa.x < cam.x - 80 || fa.x > cam.x + wv.w + 80) continue
    drawFauna(ctx, fa, t)
  }
  for (i = 0; i < w.dangers.urchins.length; i++) drawUrchin(ctx, w.dangers.urchins[i])
  for (i = 0; i < w.dangers.eels.length; i++) drawEel(ctx, w.dangers.eels[i], t)
  for (i = 0; i < w.dangers.jellies.length; i++) drawJelly(ctx, w.dangers.jellies[i], t)
  for (i = 0; i < w.dangers.squids.length; i++) drawSquid(ctx, w.dangers.squids[i], t)
  for (i = 0; i < w.dangers.sharks.length; i++) drawShark(ctx, w.dangers.sharks[i], t)
  if (w.dangers.poseidon) drawPoseidon(ctx, w.dangers.poseidon, t)

  for (i = 0; i < decor.seahorses.length; i++) {
    var sh = decor.seahorses[i]
    if (sh.x < cam.x - 60 || sh.x > cam.x + wv.w + 60) continue
    drawSeahorse(ctx, sh, t)
  }

  if (cam.x + wv.w > SD.config.world.mountain.faceX - 600) drawMountain(ctx, t)
  if (state.mode !== 'blackout' && !state.player.aboard) drawDiver(ctx, state, t)
  drawBubbles(ctx, state.effects.bubbles)
  drawWaterline(ctx, t, cam, wv)
  drawBoat(ctx, state, t)

  ctx.restore()
  ctx.restore()

  drawMurk(ctx, state, view, cam, z)
  drawDarkness(ctx, state, view, cam, z)
}
