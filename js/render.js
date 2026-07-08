// Σφουγγαράς — Sponge Diver
// All canvas drawing. Entities are drawn as Greek black-figure pottery
// silhouettes over painterly water that darkens with depth.
// Side effects: draws to the canvas context. Never mutates game state
// (except render-only smoothing fields prefixed with an underscore).

var SD = window.SD || {}
window.SD = SD

var INK = '#2b1d16'
var TERRA = '#b0603a'
var MARBLE = '#cfc9bd'
var GOLD = '#d4af37'

var seaStops = [
  { at: 0, rgb: [111, 183, 189] },
  { at: 12, rgb: [63, 143, 163] },
  { at: 30, rgb: [35, 100, 139] },
  { at: 55, rgb: [20, 69, 111] },
  { at: 80, rgb: [11, 44, 80] },
  { at: 100, rgb: [7, 28, 56] },
  { at: 125, rgb: [4, 15, 35] }
]

var darkCanvas = null
var darkCtx = null

// Pure: darkness alpha for a depth in meters
function darkAlpha (m) {
  var d = SD.config.darkness
  return d.maxAlpha * SD.smoothstep(d.startM, d.fullM, m)
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
    var topM = Math.max(0, cam.y / SD.config.pxPerM)
    var botM = Math.max(0, (cam.y + view.h) / SD.config.pxPerM)
    var seaTop = Math.max(wlY, 0)
    var sea = ctx.createLinearGradient(0, seaTop, 0, view.h)
    sea.addColorStop(0, SD.sampleStops(seaStops, Math.max(0, (cam.y + seaTop) / SD.config.pxPerM)))
    sea.addColorStop(1, SD.sampleStops(seaStops, botM))
    ctx.fillStyle = sea
    ctx.fillRect(0, seaTop, view.w, view.h - seaTop)
  }
}

// Side effect: sun, clouds, distant island with a tiny temple (world space, above water)
function drawSkyline (ctx, t) {
  ctx.save()
  // sun
  ctx.fillStyle = 'rgba(255, 238, 200, 0.9)'
  ctx.beginPath()
  ctx.arc(2500, -200, 46, 0, SD.TAU)
  ctx.fill()
  ctx.fillStyle = 'rgba(255, 238, 200, 0.25)'
  ctx.beginPath()
  ctx.arc(2500, -200, 78, 0, SD.TAU)
  ctx.fill()
  // clouds
  ctx.fillStyle = 'rgba(255, 252, 244, 0.75)'
  for (var i = 0; i < 3; i++) {
    var cx = ((i * 1300 + t * 7) % 4200) - 300
    var cy = -240 - i * 18
    ctx.beginPath()
    ctx.ellipse(cx, cy, 70, 15, 0, 0, SD.TAU)
    ctx.ellipse(cx + 45, cy - 8, 45, 12, 0, 0, SD.TAU)
    ctx.fill()
  }
  // island + temple on the horizon
  ctx.fillStyle = 'rgba(90, 110, 105, 0.55)'
  ctx.beginPath()
  ctx.moveTo(2850, 0)
  ctx.quadraticCurveTo(3100, -95, 3400, 0)
  ctx.fill()
  ctx.fillStyle = 'rgba(240, 235, 220, 0.7)'
  ctx.fillRect(3080, -92, 48, 4)
  for (var c = 0; c < 5; c++) {
    ctx.fillRect(3084 + c * 10, -88, 3, 14)
  }
  ctx.beginPath()
  ctx.moveTo(3076, -92)
  ctx.lineTo(3104, -104)
  ctx.lineTo(3132, -92)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

// Side effect: the diver's kaiki boat bobbing at anchor
function drawBoat (ctx, t) {
  var x = SD.config.world.boatX
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
  // terracotta rail stripe
  ctx.strokeStyle = TERRA
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(-60, -20)
  ctx.lineTo(62, -20)
  ctx.stroke()
  // mast, boom, furled sail
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
  ctx.restore()
}

// Side effect: waterline with little running waves
function drawWaterline (ctx, t, cam, view) {
  ctx.save()
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)'
  ctx.lineWidth = 2
  ctx.beginPath()
  var x0 = cam.x - 20
  var x1 = cam.x + view.w + 20
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
  for (var i = 0; i < 8; i++) {
    var baseX = i * 520 + 140
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

// Side effect: Poseidon's shrine in the trench — pedestal, columns, pediment
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
  var reach = SD.dist(e.homeX, e.homeY, e.x, e.y)
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

// Side effect: shark silhouette; leans meaner while chasing
function drawShark (ctx, s, t) {
  ctx.save()
  ctx.translate(s.x, s.y)
  ctx.scale(s.dir, 1)
  ctx.rotate(Math.sin(s.phase * 2) * 0.03)
  ctx.fillStyle = s.mode === 'chase' ? '#5d6b7a' : '#4e5a68'
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
  ctx.fillStyle = '#e8e8e8'                        // eye
  ctx.beginPath()
  ctx.arc(20, -3, 2.4, 0, SD.TAU)
  ctx.fill()
  ctx.fillStyle = '#111'
  ctx.beginPath()
  ctx.arc(20.6, -3, 1.2, 0, SD.TAU)
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

// ---------- The diver ----------

// Side effect: the sponge diver as a black-figure silhouette
function drawDiver (ctx, state, t) {
  var p = state.player
  if (p.invuln > 0 && Math.floor(t * 12) % 2 === 0) return // hurt blink

  var speed = SD.dist(0, 0, p.vx, p.vy)
  var targetA = speed > 36 ? Math.atan2(p.vy, p.vx) : (p.facing === 1 ? 0 : Math.PI)
  if (p._ang === undefined) p._ang = targetA
  var da = Math.atan2(Math.sin(targetA - p._ang), Math.cos(targetA - p._ang))
  p._ang += da * Math.min(1, 7 * (t - (p._angT || t)) + 0.12)
  p._angT = t

  ctx.save()
  ctx.translate(p.x, p.y)
  ctx.rotate(p._ang)
  if (Math.cos(p._ang) < 0) ctx.scale(1, -1) // keep the back up when swimming left

  var kick = Math.sin(p.swimPhase * 2.4) * (speed > 25 ? 1 : 0.3)
  ctx.strokeStyle = INK
  ctx.fillStyle = INK
  ctx.lineCap = 'round'

  ctx.lineWidth = 5                       // legs, scissor kick
  ctx.beginPath()
  ctx.moveTo(-10, 0)
  ctx.quadraticCurveTo(-18, kick * 5, -27, kick * 9)
  ctx.moveTo(-10, 0)
  ctx.quadraticCurveTo(-18, -kick * 5, -27, -kick * 9)
  ctx.stroke()

  ctx.beginPath()                         // torso
  ctx.ellipse(0, 0, 15, 7, 0, 0, SD.TAU)
  ctx.fill()

  ctx.lineWidth = 4.5                     // arms
  if (p.holdingStone) {
    ctx.beginPath()
    ctx.moveTo(8, -2)
    ctx.lineTo(24, 2)
    ctx.moveTo(8, 2)
    ctx.lineTo(24, 5)
    ctx.stroke()
    ctx.fillStyle = '#7e8790'             // the skandalopetra itself
    ctx.beginPath()
    ctx.ellipse(28, 4, 7, 5, 0.4, 0, SD.TAU)
    ctx.fill()
    ctx.fillStyle = INK
  } else {
    var reachWobble = Math.sin(p.swimPhase * 2.4 + 1.2) * 3
    ctx.beginPath()
    ctx.moveTo(8, -2)
    ctx.quadraticCurveTo(18, -4, 26, -3 + reachWobble * 0.4)
    ctx.moveTo(8, 2)
    ctx.quadraticCurveTo(16, 6, 24, 5 - reachWobble * 0.4)
    ctx.stroke()
  }

  ctx.beginPath()                         // head
  ctx.arc(19, -2, 6.5, 0, SD.TAU)
  ctx.fill()
  ctx.strokeStyle = TERRA                 // headband
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.arc(19, -2, 6.5, -Math.PI * 0.95, -Math.PI * 0.15)
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

// ---------- Darkness + light ----------

// Side effect: darkens the deep, then erases light around the diver,
// jellyfish, and glowing treasure
function drawDarkness (ctx, state, view, cam) {
  var p = state.player
  var topA = darkAlpha(Math.max(0, cam.y / SD.config.pxPerM))
  var botA = darkAlpha(Math.max(0, (cam.y + view.h) / SD.config.pxPerM))
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
  function punch (wx, wy, r, strength) {
    var sx = wx - cam.x
    var sy = wy - cam.y
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
    if (loot[l].type === 'trident') punch(loot[l].x, loot[l].y, 110, 0.8)
    if (loot[l].type === 'coin') punch(loot[l].x, loot[l].y, 54, 0.6)
  }

  ctx.drawImage(darkCanvas, 0, 0)
}

// ---------- Main render ----------

// Side effect: draws the whole frame
SD.render = function (state, ctx, view) {
  var t = state.time
  var cam = state.cam
  var w = state.world

  drawBackground(ctx, view, cam)

  ctx.save()
  var shakeX = state.effects.shake > 0.2 ? (Math.random() - 0.5) * state.effects.shake * 2 : 0
  var shakeY = state.effects.shake > 0.2 ? (Math.random() - 0.5) * state.effects.shake * 2 : 0
  ctx.translate(-cam.x + shakeX, -cam.y + shakeY)

  drawSkyline(ctx, t)
  drawGodrays(ctx, t, cam, view)
  drawFloor(ctx, cam, view)

  var i
  var decor = w.decor
  for (i = 0; i < decor.columns.length; i++) drawColumn(ctx, decor.columns[i])
  drawWreck(ctx, decor.wreck)
  drawShrine(ctx, decor.shrine)

  for (i = 0; i < w.rocks.length; i++) {
    var r = w.rocks[i]
    if (r.x + r.r < cam.x - 60 || r.x - r.r > cam.x + view.w + 60) continue
    if (r.y + r.r < cam.y - 60 || r.y - r.r > cam.y + view.h + 60) continue
    drawRock(ctx, r)
  }

  for (i = 0; i < decor.grass.length; i++) {
    var g = decor.grass[i]
    if (g.x < cam.x - 80 || g.x > cam.x + view.w + 80) continue
    drawGrass(ctx, g, t)
  }

  for (i = 0; i < w.loot.length; i++) {
    var item = w.loot[i]
    if (item.x < cam.x - 80 || item.x > cam.x + view.w + 80) continue
    if (item.y < cam.y - 80 || item.y > cam.y + view.h + 80) continue
    drawLoot(ctx, item, t)
  }
  drawHarvestRing(ctx, state)

  for (i = 0; i < w.fishSchools.length; i++) drawFishSchool(ctx, w.fishSchools[i], t)
  for (i = 0; i < w.dangers.urchins.length; i++) drawUrchin(ctx, w.dangers.urchins[i])
  for (i = 0; i < w.dangers.eels.length; i++) drawEel(ctx, w.dangers.eels[i], t)
  for (i = 0; i < w.dangers.jellies.length; i++) drawJelly(ctx, w.dangers.jellies[i], t)
  for (i = 0; i < w.dangers.sharks.length; i++) drawShark(ctx, w.dangers.sharks[i], t)

  if (state.mode !== 'blackout') drawDiver(ctx, state, t)
  drawBubbles(ctx, state.effects.bubbles)
  drawWaterline(ctx, t, cam, view)
  drawBoat(ctx, t)

  ctx.restore()

  drawDarkness(ctx, state, view, cam)
}
