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

// The sky remembers where you are: bronze over home water, marble light
// over the quarry, bruised bone over the graveyard, ash by the volcano,
// and rose — of course — over Aphrodite's lagoon. Sampled by the camera's
// place in the world, blended on the way between. (Poseidon's storm lays
// its own gray on top in drawBackground.)
var skyTopStops = [
  { at: 0, rgb: [242, 207, 155] },
  { at: 17200, rgb: [242, 207, 155] },
  { at: 18500, rgb: [236, 223, 202] },
  { at: 20600, rgb: [204, 184, 158] },
  { at: 23200, rgb: [204, 184, 158] },
  { at: 25500, rgb: [214, 176, 140] },
  { at: 27600, rgb: [242, 207, 155] },
  { at: 34800, rgb: [242, 207, 155] },
  { at: 37300, rgb: [246, 192, 178] },
  { at: 38550, rgb: [248, 176, 168] },
  { at: 39650, rgb: [242, 207, 155] }
]
var skyBotStops = [
  { at: 0, rgb: [191, 224, 218] },
  { at: 17200, rgb: [191, 224, 218] },
  { at: 18500, rgb: [214, 226, 218] },
  { at: 20600, rgb: [184, 198, 194] },
  { at: 23200, rgb: [184, 198, 194] },
  { at: 25500, rgb: [204, 194, 176] },
  { at: 27600, rgb: [191, 224, 218] },
  { at: 34800, rgb: [191, 224, 218] },
  { at: 37300, rgb: [234, 206, 202] },
  { at: 38550, rgb: [242, 198, 196] },
  { at: 39650, rgb: [191, 224, 218] }
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

// Side effect: paints sky + sea background in screen space. The sky's
// colors are sampled by where in the world the camera stands.
function drawBackground (ctx, view, cam) {
  var wlY = -cam.y // waterline in screen px
  var camCX = cam.x + view.w * 0.5
  var storm = SD.stormAt(camCX) // the god's weather over this stretch
  if (wlY > 0) {
    var sky = ctx.createLinearGradient(0, 0, 0, wlY)
    sky.addColorStop(0, SD.sampleStops(skyTopStops, camCX))
    sky.addColorStop(1, SD.sampleStops(skyBotStops, camCX))
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, view.w, Math.min(wlY, view.h))
    if (storm > 0) { // the bronze light goes out of the sky
      ctx.fillStyle = 'rgba(52, 58, 70, ' + (0.45 * storm).toFixed(3) + ')'
      ctx.fillRect(0, 0, view.w, Math.min(wlY, view.h))
    }
  }
  if (wlY < view.h) {
    var botM = Math.max(0, (cam.y + view.h) / SD.config.pxPerM)
    var seaTop = Math.max(wlY, 0)
    var sea = ctx.createLinearGradient(0, seaTop, 0, view.h)
    sea.addColorStop(0, SD.sampleStops(seaStops, Math.max(0, (cam.y + seaTop) / SD.config.pxPerM)))
    sea.addColorStop(1, SD.sampleStops(seaStops, botM))
    ctx.fillStyle = sea
    ctx.fillRect(0, seaTop, view.w, view.h - seaTop)
    if (storm > 0 && cam.y < 700) { // the upper water bruises under the storm
      ctx.fillStyle = 'rgba(18, 28, 42, ' + (0.16 * storm).toFixed(3) + ')'
      ctx.fillRect(0, seaTop, view.w, view.h - seaTop)
    }
  }
}

// Side effect: sun and clouds (world space, each at its own distance —
// the sun barely moves, the clouds keep half your pace). The horizon's
// islands and landmarks live in the backdrop set below.
function drawSkyline (ctx, t, cam, wv) {
  if (cam.y > 140) return // the sky is long gone off the top of the screen
  var W = SD.config.world.widthPx
  var camCX = cam.x + wv.w / 2
  ctx.save()
  // sun, pinned to the far sky
  var sunX = plaxX(W * 0.6, 0.08, camCX)
  ctx.fillStyle = 'rgba(255, 238, 200, 0.9)'
  ctx.beginPath()
  ctx.arc(sunX, -210, 46, 0, SD.TAU)
  ctx.fill()
  ctx.fillStyle = 'rgba(255, 238, 200, 0.25)'
  ctx.beginPath()
  ctx.arc(sunX, -210, 78, 0, SD.TAU)
  ctx.fill()
  // clouds, sliding at half the world
  ctx.fillStyle = 'rgba(255, 252, 244, 0.75)'
  for (var i = 0; i < 24; i++) {
    var cx = ((i * 1780 + t * 7 + cam.x * 0.5) % (W + 1000)) - 500
    var cy = -240 - (i % 3) * 22
    ctx.beginPath()
    ctx.ellipse(cx, cy, 70, 15, 0, 0, SD.TAU)
    ctx.ellipse(cx + 45, cy - 8, 45, 12, 0, 0, SD.TAU)
    ctx.fill()
  }
  // gulls working the coast — small flocks wheeling over their own water,
  // wings beating out of step so the sky never looks stamped
  ctx.strokeStyle = 'rgba(250, 248, 240, 0.85)'
  ctx.lineWidth = 1.7
  ctx.lineCap = 'round'
  var flocks = [430, 2600, 9300, 15600, 22300, 37900]
  for (var gf = 0; gf < flocks.length; gf++) {
    var ax = flocks[gf]
    if (ax < cam.x - 700 || ax > cam.x + wv.w + 700) continue
    for (var gu = 0; gu < 3; gu++) {
      var ga = t * (0.16 + gu * 0.035) + gu * 2.1 + gf * 1.3
      var gx = ax + Math.cos(ga) * (170 + gu * 55)
      var gy = -62 - gu * 22 - Math.sin(ga * 1.7) * 26
      var flap = Math.sin(t * (6.5 + gu) + gu * 1.7 + gf) * 3.6
      ctx.beginPath()
      ctx.moveTo(gx - 7, gy - flap)
      ctx.quadraticCurveTo(gx - 2.5, gy + flap * 0.5, gx, gy)
      ctx.quadraticCurveTo(gx + 2.5, gy + flap * 0.5, gx + 7, gy - flap)
      ctx.stroke()
    }
  }
  ctx.restore()
}

// ---------- Parallax backdrops ----------
// The far world above the horizon: each stretch of sea gets its own
// landmark on the skyline, and every layer slides at its own fraction of
// the camera, in both axes — near things pass, far things linger. Below
// the waterline the sea stays clean; only the real seafloor lives there.

// Pure: where a distant thing anchored at wx appears for this camera —
// it slides toward the camera center by (1 - f) of the distance, so it
// clings to its home stretch of sea while scrolling slower than the world
function plaxX (wx, f, camCX) {
  return wx + (camCX - wx) * (1 - f)
}

// Side effect: a green headland over the sponge beds — olive terraces,
// cypress spires, and a whitewashed chapel keeping watch
function skHeadland (ctx, t) {
  ctx.fillStyle = 'rgba(122, 138, 116, 0.5)'
  ctx.beginPath()
  ctx.moveTo(-260, 0)
  ctx.quadraticCurveTo(-150, -96, -20, -62)
  ctx.quadraticCurveTo(100, -84, 250, 0)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = 'rgba(186, 200, 172, 0.3)' // olive terraces
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(-190, -40)
  ctx.quadraticCurveTo(-90, -66, 30, -46)
  ctx.moveTo(-150, -20)
  ctx.quadraticCurveTo(-30, -40, 120, -30)
  ctx.stroke()
  ctx.fillStyle = 'rgba(52, 80, 60, 0.6)' // cypress spires
  var cyp = [[-150, -72], [-98, -84], [44, -60], [116, -52]]
  for (var i = 0; i < cyp.length; i++) {
    ctx.beginPath()
    ctx.moveTo(cyp[i][0] - 5, cyp[i][1])
    ctx.lineTo(cyp[i][0], cyp[i][1] - 26)
    ctx.lineTo(cyp[i][0] + 5, cyp[i][1])
    ctx.closePath()
    ctx.fill()
  }
  ctx.fillStyle = 'rgba(246, 240, 226, 0.8)' // the chapel
  ctx.fillRect(-38, -78, 16, 11)
  ctx.beginPath()
  ctx.arc(-30, -78, 8, Math.PI, 0)
  ctx.fill()
}

// Side effect: two fishing kaikis on the horizon, lateen sails full
function skSails (ctx, t) {
  for (var i = 0; i < 2; i++) {
    var bx = i * 120 - 60
    var by = Math.sin(t * 1.1 + i * 2.4) * 2
    ctx.fillStyle = 'rgba(58, 52, 44, 0.55)'
    ctx.beginPath() // the hull, hull-down in the haze
    ctx.moveTo(bx - 20, by)
    ctx.quadraticCurveTo(bx, by + 6, bx + 22, by - 1)
    ctx.lineTo(bx + 18, by - 4)
    ctx.lineTo(bx - 17, by - 4)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = 'rgba(240, 234, 214, 0.7)' // the lateen wing
    ctx.beginPath()
    ctx.moveTo(bx - 2, by - 5)
    ctx.quadraticCurveTo(bx + 2 + i * 3, by - 30, bx + 16, by - 34)
    ctx.quadraticCurveTo(bx + 10, by - 18, bx + 14, by - 5)
    ctx.closePath()
    ctx.fill()
  }
}

// Side effect: a low green isle for the meadows — a shepherd's hut and
// his flock of white dots on the slope
function skShepherdIsle (ctx, t) {
  ctx.fillStyle = 'rgba(128, 146, 112, 0.45)'
  ctx.beginPath()
  ctx.moveTo(-210, 0)
  ctx.quadraticCurveTo(-60, -66, 60, -54)
  ctx.quadraticCurveTo(150, -46, 210, 0)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = 'rgba(150, 128, 96, 0.7)' // the hut
  ctx.fillRect(-16, -58, 14, 9)
  ctx.beginPath()
  ctx.moveTo(-19, -58)
  ctx.lineTo(-9, -66)
  ctx.lineTo(1, -58)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = 'rgba(244, 240, 230, 0.7)' // the flock
  var sheep = [[-70, -46], [-52, -50], [-30, -42], [40, -40], [66, -32]]
  for (var i = 0; i < sheep.length; i++) {
    ctx.beginPath()
    ctx.ellipse(sheep[i][0], sheep[i][1], 4, 2.4, 0, 0, SD.TAU)
    ctx.fill()
  }
  ctx.fillStyle = 'rgba(52, 80, 60, 0.55)' // one cypress by the door
  ctx.beginPath()
  ctx.moveTo(8, -58)
  ctx.lineTo(12, -80)
  ctx.lineTo(16, -58)
  ctx.closePath()
  ctx.fill()
}

// Side effect: the twin-peaked island out past the kelp, a sail beneath it
function skKelpIsle (ctx, t) {
  ctx.fillStyle = 'rgba(90, 110, 105, 0.45)'
  ctx.beginPath()
  ctx.moveTo(-340, 0)
  ctx.quadraticCurveTo(-170, -150, 0, -66)
  ctx.quadraticCurveTo(170, -122, 340, 0)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = 'rgba(240, 234, 214, 0.6)' // a sail working the strait
  ctx.beginPath()
  ctx.moveTo(-40, -3)
  ctx.lineTo(-40, -20 + Math.sin(t * 1.3) * 1.5)
  ctx.lineTo(-30, -4)
  ctx.closePath()
  ctx.fill()
}

// Side effect: bare skerries off the pearl banks, gulls riding the wind
function skSkerries (ctx, t) {
  ctx.fillStyle = 'rgba(102, 108, 104, 0.5)'
  var rocks = [[-130, 34, 20], [10, 52, 30], [140, 28, 16]]
  for (var i = 0; i < rocks.length; i++) {
    ctx.beginPath()
    ctx.moveTo(rocks[i][0] - rocks[i][1], 0)
    ctx.quadraticCurveTo(rocks[i][0] - 6, -rocks[i][2], rocks[i][0] + rocks[i][1] * 0.7, 0)
    ctx.closePath()
    ctx.fill()
  }
  ctx.strokeStyle = 'rgba(250, 248, 240, 0.7)' // the gulls
  ctx.lineWidth = 1.6
  for (var g = 0; g < 3; g++) {
    var gx = Math.sin(t * 0.4 + g * 2.2) * 110
    var gy = -56 - g * 16 + Math.sin(t * 0.9 + g) * 6
    var flap = Math.sin(t * 6 + g * 1.7) * 3
    ctx.beginPath()
    ctx.moveTo(gx - 6, gy - flap * 0.6)
    ctx.quadraticCurveTo(gx, gy + flap, gx + 6, gy - flap * 0.6)
    ctx.stroke()
  }
}

// Side effect: pale quarried cliffs on the horizon — stepped marble
// benches and the old timber hoist against the sky
function skMarbleCliffs (ctx, t) {
  ctx.fillStyle = 'rgba(206, 200, 186, 0.55)'
  ctx.beginPath()
  ctx.moveTo(-240, 0)
  ctx.lineTo(-220, -58)
  ctx.lineTo(-140, -58)
  ctx.lineTo(-128, -92)
  ctx.lineTo(-30, -92)
  ctx.lineTo(-18, -120)
  ctx.lineTo(90, -120)
  ctx.lineTo(104, -70)
  ctx.lineTo(190, -70)
  ctx.lineTo(210, 0)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = 'rgba(150, 142, 126, 0.4)' // saw seams in the benches
  ctx.lineWidth = 1.6
  ctx.beginPath()
  ctx.moveTo(-200, -58)
  ctx.lineTo(-140, -58)
  ctx.moveTo(-100, -92)
  ctx.lineTo(-30, -92)
  ctx.moveTo(0, -120)
  ctx.lineTo(70, -120)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(74, 58, 38, 0.65)' // the hoist
  ctx.lineWidth = 2.6
  ctx.beginPath()
  ctx.moveTo(30, -120)
  ctx.lineTo(30, -152)
  ctx.moveTo(30, -152)
  ctx.lineTo(64, -144)
  ctx.moveTo(64, -144)
  ctx.lineTo(64, -128)
  ctx.stroke()
}

// Side effect: the dead fleet hull-down on the graveyard's horizon —
// listing masts, a hanging yard, slow birds
function skDeadFleet (ctx, t) {
  ctx.fillStyle = 'rgba(52, 56, 60, 0.55)'
  var hulls = [[-150, 44, 12, 0.3], [0, 60, 16, -0.2], [150, 40, 10, 0.5]]
  for (var i = 0; i < hulls.length; i++) {
    var h = hulls[i]
    ctx.beginPath() // the hump of a dead hull
    ctx.moveTo(h[0] - h[1], 0)
    ctx.quadraticCurveTo(h[0], -h[2] * 1.6, h[0] + h[1], 0)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = 'rgba(52, 56, 60, 0.6)'
    ctx.lineWidth = 2.4
    ctx.beginPath() // its listing mast
    ctx.moveTo(h[0], -h[2])
    ctx.lineTo(h[0] + h[3] * 40, -h[2] - 42)
    ctx.stroke()
  }
  ctx.beginPath() // the hanging yard on the middle wreck
  ctx.lineWidth = 1.6
  ctx.moveTo(-8, -44)
  ctx.lineTo(16, -30)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(60, 62, 64, 0.7)' // carrion birds, patient
  ctx.lineWidth = 1.3
  for (var b = 0; b < 2; b++) {
    var bx = Math.sin(t * 0.3 + b * 2.8) * 90
    var by = -78 - b * 14
    var flap = Math.sin(t * 4.5 + b * 2) * 2.4
    ctx.beginPath()
    ctx.moveTo(bx - 5, by - flap * 0.5)
    ctx.quadraticCurveTo(bx, by + flap, bx + 5, by - flap * 0.5)
    ctx.stroke()
  }
}

// Side effect: THE VOLCANO — Hephaestus' chimney on the horizon, throat
// aglow, shearing its ash plume east on the wind
function skVolcano (ctx, t) {
  ctx.fillStyle = 'rgba(110, 96, 92, 0.6)'
  ctx.beginPath() // the cone
  ctx.moveTo(-320, 0)
  ctx.lineTo(-46, -218)
  ctx.lineTo(-14, -204) // the notched crater lip
  ctx.lineTo(16, -216)
  ctx.lineTo(320, 0)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = 'rgba(70, 60, 58, 0.5)' // its shadowed east face
  ctx.beginPath()
  ctx.moveTo(16, -216)
  ctx.lineTo(320, 0)
  ctx.lineTo(120, 0)
  ctx.lineTo(-4, -206)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = 'rgba(255, 120, 50, ' + (0.2 + Math.sin(t * 1.7) * 0.08).toFixed(2) + ')'
  ctx.lineWidth = 2 // old lava scars down the flank
  ctx.beginPath()
  ctx.moveTo(-18, -200)
  ctx.quadraticCurveTo(-40, -150, -34, -96)
  ctx.moveTo(2, -198)
  ctx.quadraticCurveTo(24, -140, 46, -110)
  ctx.stroke()
  var glow = 0.3 + Math.sin(t * 1.7) * 0.12 // the throat, breathing
  ctx.fillStyle = 'rgba(255, 120, 50, ' + glow.toFixed(2) + ')'
  ctx.beginPath()
  ctx.ellipse(-15, -207, 26, 7, 0, 0, SD.TAU)
  ctx.fill()
  ctx.fillStyle = 'rgba(118, 108, 104, 0.4)' // the plume, shearing east
  for (var p = 0; p < 5; p++) {
    var rise = p * 24 + ((t * 8 + p * 13) % 24)
    ctx.beginPath()
    ctx.arc(-14 + p * 6 + rise * 0.9, -224 - rise, 15 + p * 8 + rise * 0.2, 0, SD.TAU)
    ctx.fill()
  }
}

// Side effect: thunderheads towering over Poseidon's plain, lightning
// walking around inside them
function skThunderheads (ctx, t) {
  ctx.fillStyle = 'rgba(66, 72, 84, 0.68)'
  ctx.beginPath()
  ctx.ellipse(-90, -90, 110, 44, 0, 0, SD.TAU)
  ctx.ellipse(60, -110, 130, 52, 0, 0, SD.TAU)
  ctx.ellipse(-10, -170, 150, 56, 0, 0, SD.TAU)
  ctx.fill()
  ctx.fillStyle = 'rgba(52, 56, 68, 0.7)' // the flat anvil top
  ctx.beginPath()
  ctx.ellipse(0, -212, 190, 30, 0, 0, SD.TAU)
  ctx.fill()
  ctx.fillStyle = 'rgba(178, 184, 198, 0.3)' // rim light where the sun still argues
  ctx.beginPath()
  ctx.ellipse(-40, -232, 120, 14, 0, 0, SD.TAU)
  ctx.fill()
  if (Math.sin(t * 2.3) > 0.955) { // lightning walking the cloud
    ctx.strokeStyle = 'rgba(240, 242, 255, 0.85)'
    ctx.lineWidth = 2.2
    ctx.beginPath()
    ctx.moveTo(20, -150)
    ctx.lineTo(-4, -104)
    ctx.lineTo(14, -92)
    ctx.lineTo(-12, -34)
    ctx.stroke()
  }
}

// Side effect: a pod of dolphins arcing along the eastern rise, straight
// off the pottery — each shows only the crown of its leap
function skDolphins (ctx, t) {
  ctx.fillStyle = 'rgba(50, 74, 88, 0.8)'
  for (var i = 0; i < 3; i++) {
    var k = ((t * 0.34 + i * 0.37) % 1)
    if (k < 0.12 || k > 0.88) continue // underwater between leaps
    var dx = -150 + k * 300
    var dyv = -Math.sin(k * Math.PI) * 34
    var ang = Math.cos(k * Math.PI) * -0.9
    ctx.save()
    ctx.translate(dx, dyv)
    ctx.rotate(ang)
    ctx.beginPath() // the leaping back
    ctx.moveTo(-13, 0)
    ctx.quadraticCurveTo(0, -9, 13, -1)
    ctx.quadraticCurveTo(3, -2.5, -9, 1.5)
    ctx.closePath()
    ctx.fill()
    ctx.beginPath() // dorsal fin
    ctx.moveTo(-1, -5)
    ctx.lineTo(2, -10)
    ctx.lineTo(4, -4.5)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }
}

// Side effect: APHRODITE'S TEMPLE — a white tholos on a blushing headland,
// gold at its crown, doves turning above it
function skAphroditeTemple (ctx, t) {
  ctx.fillStyle = 'rgba(178, 140, 138, 0.5)' // her headland
  ctx.beginPath()
  ctx.moveTo(-300, 0)
  ctx.quadraticCurveTo(-160, -110, 0, -96)
  ctx.quadraticCurveTo(170, -106, 300, 0)
  ctx.closePath()
  ctx.fill()
  var by = -100
  ctx.fillStyle = 'rgba(248, 240, 232, 0.9)'
  ctx.fillRect(-50, by, 100, 8) // the stylobate
  for (var c = -3; c <= 3; c++) { // the ring of columns
    ctx.fillRect(c * 14 - 2.4, by - 30, 4.8, 30)
  }
  ctx.fillRect(-48, by - 37, 96, 7) // entablature
  ctx.beginPath() // the shallow dome
  ctx.moveTo(-46, by - 37)
  ctx.quadraticCurveTo(0, by - 76, 46, by - 37)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = 'rgba(196, 174, 168, 0.45)' // dome shading
  ctx.beginPath()
  ctx.moveTo(8, by - 68)
  ctx.quadraticCurveTo(34, by - 58, 46, by - 37)
  ctx.lineTo(20, by - 37)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = 'rgba(212, 175, 55, 0.85)' // her golden finial
  ctx.beginPath()
  ctx.arc(0, by - 74, 3.4, 0, SD.TAU)
  ctx.fill()
  ctx.strokeStyle = 'rgba(252, 248, 242, 0.75)' // the doves
  ctx.lineWidth = 1.6
  for (var d = 0; d < 3; d++) {
    var da = t * 0.7 + d * 2.1
    var dx = Math.cos(da) * (58 + d * 14)
    var dyv = by - 92 + Math.sin(da * 1.3) * 12
    var flap = Math.sin(t * 7 + d) * 3
    ctx.beginPath()
    ctx.moveTo(dx - 5, dyv - flap * 0.5)
    ctx.quadraticCurveTo(dx, dyv + flap, dx + 5, dyv - flap * 0.5)
    ctx.stroke()
  }
}

// the horizon, west to east — each landmark anchored to its home stretch
var SKY_SET = [
  { x: 1500, f: 0.3, draw: skHeadland },
  { x: 4600, f: 0.42, draw: skSails },
  { x: 7700, f: 0.3, draw: skShepherdIsle },
  { x: 11400, f: 0.26, draw: skKelpIsle },
  { x: 15500, f: 0.36, draw: skSkerries },
  { x: 18500, f: 0.3, draw: skMarbleCliffs },
  { x: 22000, f: 0.3, draw: skDeadFleet },
  { x: 25500, f: 0.24, draw: skVolcano },
  { x: 30600, f: 0.28, draw: skThunderheads },
  { x: 36000, f: 0.5, draw: skDolphins },
  { x: 38550, f: 0.3, draw: skAphroditeTemple }
]

// Side effect: draws every horizon landmark near enough to matter, at its
// parallax position. Skipped once the waterline is well off the top.
function drawSkyBackdrops (ctx, cam, wv, t) {
  if (cam.y > 140) return
  var camCX = cam.x + wv.w / 2
  // vertical parallax about the camera's true at-surface rest (which the
  // sky-top clamp sets) — never letting the horizon sag into the sea
  var surfBase = Math.max(SD.config.world.skyTopPx, -wv.h * 0.44)
  var dy = SD.clamp((cam.y - surfBase) * 0.3, -80, 14)
  for (var i = 0; i < SKY_SET.length; i++) {
    var s = SKY_SET[i]
    var a = 1 - SD.smoothstep(2800, 5600, Math.abs(camCX - s.x))
    if (a <= 0.02) continue
    ctx.save()
    ctx.translate(plaxX(s.x, s.f, camCX), dy)
    ctx.globalAlpha = a
    s.draw(ctx, t)
    ctx.restore()
  }
}

// Side effect: the home village on the left beach — whitewashed houses with
// tiled roofs, an olive tree, sponges drying on a line, the jetty market,
// a gull keeping watch. Somewhere worth swimming home to.
function drawVillage (ctx, t) {
  ctx.save()

  // sand above the waterline, with a wet darker hem where the sea touches it
  ctx.fillStyle = '#e8d5a3'
  ctx.beginPath()
  ctx.moveTo(0, 4)
  for (var x = 0; x <= 560; x += 20) {
    ctx.lineTo(x, Math.min(SD.floorYAt(x), 4))
  }
  ctx.lineTo(560, 4)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = 'rgba(178, 152, 106, 0.55)'
  ctx.beginPath()
  ctx.moveTo(190, 4)
  for (var wx = 190; wx <= 320; wx += 12) {
    ctx.lineTo(wx, Math.min(SD.floorYAt(wx), 4) - 1)
  }
  ctx.lineTo(320, 4)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = 'rgba(255, 252, 240, 0.7)' // a few shells on the sand
  ctx.beginPath()
  ctx.arc(150, -6, 1.6, 0, SD.TAU)
  ctx.arc(215, -1, 1.3, 0, SD.TAU)
  ctx.arc(96, -16, 1.4, 0, SD.TAU)
  ctx.fill()

  // whitewashed houses: tiled roofs, arched doors, shuttered windows,
  // one shaded wall so the sun means something
  function house (hx, hy, w, h) {
    ctx.fillStyle = '#f2ead6'
    ctx.fillRect(hx, hy - h, w, h)
    ctx.fillStyle = 'rgba(142, 126, 100, 0.35)' // the shaded side
    ctx.fillRect(hx + w - w * 0.22, hy - h, w * 0.22, h)
    ctx.fillStyle = TERRA // roof
    ctx.beginPath()
    ctx.moveTo(hx - 6, hy - h)
    ctx.lineTo(hx + w / 2, hy - h - w * 0.35)
    ctx.lineTo(hx + w + 6, hy - h)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = 'rgba(122, 58, 30, 0.6)' // tile courses
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.moveTo(hx - 1, hy - h - w * 0.09)
    ctx.lineTo(hx + w + 1, hy - h - w * 0.09)
    ctx.moveTo(hx + 4, hy - h - w * 0.2)
    ctx.lineTo(hx + w - 4, hy - h - w * 0.2)
    ctx.stroke()
    ctx.fillStyle = '#3a5a74' // arched door, painted sea-blue
    ctx.beginPath()
    ctx.moveTo(hx + w * 0.36, hy)
    ctx.lineTo(hx + w * 0.36, hy - h * 0.5)
    ctx.arc(hx + w * 0.48, hy - h * 0.5, w * 0.12, Math.PI, 0)
    ctx.lineTo(hx + w * 0.6, hy)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#3a5a74' // a small shuttered window
    ctx.fillRect(hx + w * 0.72, hy - h * 0.72, w * 0.14, h * 0.26)
    ctx.strokeStyle = '#f2ead6'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(hx + w * 0.79, hy - h * 0.72)
    ctx.lineTo(hx + w * 0.79, hy - h * 0.46)
    ctx.stroke()
  }
  house(28, SD.floorYAt(55) - 2, 64, 46)
  house(112, SD.floorYAt(135) - 2, 54, 38)
  house(188, SD.floorYAt(210) - 2, 46, 34)

  // the olive tree, gnarled and silver-green
  var ox = 262
  var oy = SD.floorYAt(262) - 1
  ctx.strokeStyle = '#6b4a2c'
  ctx.lineWidth = 4
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(ox, oy)
  ctx.quadraticCurveTo(ox - 3, oy - 14, ox + 4, oy - 24)
  ctx.moveTo(ox + 1, oy - 15)
  ctx.quadraticCurveTo(ox + 8, oy - 20, ox + 12, oy - 27)
  ctx.stroke()
  ctx.fillStyle = '#7a8f66'
  ctx.beginPath()
  ctx.arc(ox + 2, oy - 30, 10, 0, SD.TAU)
  ctx.arc(ox + 13, oy - 27, 8, 0, SD.TAU)
  ctx.arc(ox - 7, oy - 25, 7, 0, SD.TAU)
  ctx.fill()
  ctx.fillStyle = 'rgba(214, 226, 198, 0.5)'
  ctx.beginPath()
  ctx.arc(ox - 1, oy - 33, 4, 0, SD.TAU)
  ctx.fill()

  // sponges drying on a line between two posts — the trade made visible
  ctx.strokeStyle = '#6b4a2c'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(120, SD.floorYAt(120) - 2)
  ctx.lineTo(120, SD.floorYAt(120) - 26)
  ctx.moveTo(180, SD.floorYAt(180) - 2)
  ctx.lineTo(180, SD.floorYAt(180) - 28)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(58, 42, 24, 0.8)'
  ctx.lineWidth = 1.4
  ctx.beginPath()
  ctx.moveTo(120, SD.floorYAt(120) - 25)
  ctx.quadraticCurveTo(150, SD.floorYAt(150) - 19, 180, SD.floorYAt(180) - 27)
  ctx.stroke()
  ctx.fillStyle = '#c99a5e'
  for (var sp = 0; sp < 4; sp++) {
    var sx = 128 + sp * 14
    var sy = SD.floorYAt(sx) - 22 + Math.sin(sp * 2.2) * 1.5 + Math.sin(t * 1.8 + sp) * 0.8
    ctx.beginPath()
    ctx.arc(sx, sy, 4.2, 0, SD.TAU)
    ctx.arc(sx + 3, sy + 2, 3.2, 0, SD.TAU)
    ctx.fill()
  }

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
  ctx.strokeStyle = 'rgba(43, 29, 22, 0.5)' // plank seams
  ctx.lineWidth = 1
  for (var pk = 270; pk < 580; pk += 24) {
    ctx.beginPath()
    ctx.moveTo(pk, -18)
    ctx.lineTo(pk, -10)
    ctx.stroke()
  }

  // sponge market stall on the jetty
  ctx.fillStyle = '#8a5a33'
  ctx.fillRect(430, -52, 5, 34)
  ctx.fillRect(530, -52, 5, 34)
  for (var a = 0; a < 5; a++) {
    ctx.fillStyle = a % 2 === 0 ? '#e3d3ae' : TERRA
    ctx.fillRect(420 + a * 25, -60, 25, 10)
  }
  ctx.fillStyle = '#b9834f' // sponges piled for sale
  ctx.beginPath()
  ctx.arc(455, -24, 7, 0, SD.TAU)
  ctx.arc(468, -22, 8, 0, SD.TAU)
  ctx.arc(480, -25, 6, 0, SD.TAU)
  ctx.fill()
  ctx.fillStyle = TERRA // an amphora
  ctx.beginPath()
  ctx.ellipse(510, -27, 6, 10, 0, 0, SD.TAU)
  ctx.fill()

  // the gull on the last post, judging your catch
  var gx = 560
  var gy = -18
  ctx.fillStyle = '#f4f0e6'
  ctx.beginPath()
  ctx.ellipse(gx, gy - 7, 6, 4.2, -0.15, 0, SD.TAU)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(gx + 5, gy - 11, 2.8, 0, SD.TAU)
  ctx.fill()
  ctx.fillStyle = '#a8b0b8' // folded wing
  ctx.beginPath()
  ctx.ellipse(gx - 1.5, gy - 7.5, 4, 2.4, -0.2, 0, SD.TAU)
  ctx.fill()
  ctx.fillStyle = '#d99a2b' // beak
  ctx.beginPath()
  ctx.moveTo(gx + 7.5, gy - 11.5)
  ctx.lineTo(gx + 11, gy - 10.5)
  ctx.lineTo(gx + 7.5, gy - 9.8)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#241a12'
  ctx.beginPath()
  ctx.arc(gx + 5.5, gy - 12, 0.7, 0, SD.TAU)
  ctx.fill()

  ctx.restore()
}

// Side effect: the Temple Mountain — SOLID terrain, carved. One rock mass
// from the seafloor to the sky, its underside traced by ceilingPoints: a
// low passage east from the cliff face, then a giant cavern dome holding
// trapped air over the natural plateau where the temple stands.
function drawMountain (ctx, t) {
  var mt = SD.config.world.mountain
  var W = SD.config.world.widthPx
  var x

  ctx.save()

  // — the solid body: crown silhouette above, carved ceiling below —
  ctx.fillStyle = '#1d3349'
  ctx.beginPath()
  ctx.moveTo(mt.faceX, SD.ceilingYAt(mt.faceX + 1))
  // up the cliff face and over the peaks
  ctx.lineTo(mt.faceX, -40)
  ctx.quadraticCurveTo(mt.faceX + 260, -250, mt.faceX + 640, -290)
  ctx.quadraticCurveTo(41100, -380, 41500, -300)
  ctx.quadraticCurveTo(41800, -240, W, -150)
  ctx.lineTo(W, SD.ceilingYAt(W - 1))
  // back along the carved underside, east to west
  for (x = W - 20; x >= mt.faceX; x -= 36) {
    ctx.lineTo(x, SD.ceilingYAt(x + 1))
  }
  ctx.closePath()
  ctx.fill()

  // the dry crown above the waterline, sunlit
  ctx.fillStyle = '#5c5a4e'
  ctx.beginPath()
  ctx.moveTo(mt.faceX, 6)
  ctx.lineTo(mt.faceX, -40)
  ctx.quadraticCurveTo(mt.faceX + 260, -250, mt.faceX + 640, -290)
  ctx.quadraticCurveTo(41100, -380, 41500, -300)
  ctx.quadraticCurveTo(41800, -240, W, -150)
  ctx.lineTo(W, 6)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = 'rgba(120, 118, 100, 0.5)' // sunlit crags
  ctx.beginPath()
  ctx.moveTo(mt.faceX + 240, -140)
  ctx.quadraticCurveTo(mt.faceX + 520, -280, mt.faceX + 820, -270)
  ctx.lineTo(mt.faceX + 740, -120)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = 'rgba(60, 92, 60, 0.85)' // hardy trees on the ridge
  for (var tr = 0; tr < 4; tr++) {
    var tx = mt.faceX + 460 + tr * 360
    var ty = -260 - Math.sin(tx * 0.01) * 60
    ctx.beginPath()
    ctx.ellipse(tx, ty, 26, 14, 0, 0, SD.TAU)
    ctx.fill()
  }

  // — the carved ceiling wears a pale crust, like the floor wears sand —
  ctx.strokeStyle = 'rgba(150, 182, 196, 0.22)'
  ctx.lineWidth = 3
  ctx.lineCap = 'round'
  ctx.beginPath()
  for (x = mt.faceX + 8; x <= W - 20; x += 36) {
    var cy = SD.ceilingYAt(x)
    if (x === mt.faceX + 8) ctx.moveTo(x, cy)
    else ctx.lineTo(x, cy)
  }
  ctx.stroke()
  // stalactites, deterministic so they never dance
  ctx.fillStyle = '#16293c'
  for (x = mt.faceX + 60; x < W - 80; x += 130) {
    var h = Math.abs(Math.sin(x * 0.617)) * 26 + 8
    var cy2 = SD.ceilingYAt(x)
    ctx.beginPath()
    ctx.moveTo(x - 9, cy2 - 1)
    ctx.lineTo(x, cy2 + h)
    ctx.lineTo(x + 9, cy2 - 1)
    ctx.closePath()
    ctx.fill()
  }

  // — the drowned halls live in mountain-shadow —
  ctx.fillStyle = 'rgba(6, 12, 20, 0.35)'
  ctx.fillRect(mt.faceX, 8, W - mt.faceX, 42 * 32)

  // — the air pocket: warm dark air between the dome and its waterline —
  var air = ctx.createLinearGradient(0, 30, 0, mt.pocketSurfaceY)
  air.addColorStop(0, '#181009')
  air.addColorStop(1, '#3a2c1c')
  ctx.fillStyle = air
  ctx.beginPath()
  ctx.moveTo(mt.pocketX1, mt.pocketSurfaceY)
  for (x = mt.pocketX1; x <= mt.pocketX2; x += 30) {
    ctx.lineTo(x, Math.min(SD.ceilingYAt(x) + 2, mt.pocketSurfaceY))
  }
  ctx.lineTo(mt.pocketX2, mt.pocketSurfaceY)
  ctx.closePath()
  ctx.fill()

  // the cavern waterline, lapping in the dark
  ctx.strokeStyle = 'rgba(190, 225, 235, 0.5)'
  ctx.lineWidth = 2
  ctx.beginPath()
  for (var wx = mt.pocketX1; wx <= mt.pocketX2; wx += 12) {
    var wy = mt.pocketSurfaceY + Math.sin(wx * 0.03 + t * 1.8) * 1.8
    if (wx === mt.pocketX1) ctx.moveTo(wx, wy)
    else ctx.lineTo(wx, wy)
  }
  ctx.stroke()

  // — the sanctum on the plateau, lit by braziers —
  var lx = mt.ledgeX
  var ly = SD.floorYAt(mt.ledgeX) + 2
  drawShrine(ctx, { x: lx, y: ly })
  for (var b = -1; b <= 1; b += 2) {
    var bx = lx + b * 100
    var by = SD.floorYAt(bx) + 1
    var glow = 0.5 + Math.sin(t * 6 + b) * 0.14
    ctx.fillStyle = '#6b5030' // the brazier bowl
    ctx.fillRect(bx - 4, by - 18, 8, 18)
    ctx.beginPath()
    ctx.ellipse(bx, by - 20, 8, 3.4, 0, 0, SD.TAU)
    ctx.fill()
    var fg = ctx.createRadialGradient(bx, by - 26, 2, bx, by - 26, 95)
    fg.addColorStop(0, 'rgba(255, 190, 90, ' + glow + ')')
    fg.addColorStop(1, 'rgba(255, 190, 90, 0)')
    ctx.fillStyle = fg
    ctx.beginPath()
    ctx.arc(bx, by - 26, 95, 0, SD.TAU)
    ctx.fill()
    ctx.fillStyle = 'rgba(255, 220, 130, 0.9)' // the flame itself
    ctx.beginPath()
    ctx.ellipse(bx, by - 26 - Math.sin(t * 9 + b) * 2, 4, 7 + Math.sin(t * 7 + b) * 2, 0, 0, SD.TAU)
    ctx.fill()
  }
  // a soft godly presence filling the dome above the temple
  var gg = ctx.createRadialGradient(lx, 120, 20, lx, 120, 340)
  gg.addColorStop(0, 'rgba(255, 214, 130, 0.1)')
  gg.addColorStop(1, 'rgba(255, 214, 130, 0)')
  ctx.fillStyle = gg
  ctx.beginPath()
  ctx.arc(lx, 120, 340, 0, SD.TAU)
  ctx.fill()

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

// Side effect: a Mediterranean monk seal — the plump, whiskered friend of
// every Greek fisherman's stories. One fat torpedo of a body, a pale belly,
// big wet eyes, hind flippers sculling. s.tilt (set by the cruise update)
// noses it up and down its lap.
function drawSeal (ctx, s, t) {
  var scull = Math.sin(t * 3.1 + s.phase)
  ctx.save()
  ctx.translate(s.x, s.y + Math.sin(t * 1.1 + s.phase) * 3)
  ctx.scale(s.dir, 1)
  ctx.rotate((s.tilt || 0) + Math.sin(t * 1.6 + s.phase) * 0.045)

  // hind flippers first, sculling behind the body
  ctx.fillStyle = '#453f37'
  ctx.beginPath() // upper paddle
  ctx.moveTo(-32, -2)
  ctx.quadraticCurveTo(-45, -8 + scull * 4, -52, -4 + scull * 5.5)
  ctx.quadraticCurveTo(-44, 1 + scull * 2, -32, 2)
  ctx.closePath()
  ctx.fill()
  ctx.beginPath() // lower paddle, countering
  ctx.moveTo(-32, 0)
  ctx.quadraticCurveTo(-44, 7 - scull * 3, -51, 9 - scull * 4.5)
  ctx.quadraticCurveTo(-43, 4 - scull, -32, 3)
  ctx.closePath()
  ctx.fill()

  // the body: one well-fed torpedo, nose to tail
  ctx.fillStyle = '#57524a'
  ctx.beginPath()
  ctx.moveTo(36, -1)
  ctx.quadraticCurveTo(31, -9, 20, -10.5)   // the round crown
  ctx.quadraticCurveTo(4, -14, -12, -10.5)  // the fat back
  ctx.quadraticCurveTo(-27, -7, -34, -1)    // taper to the tail
  ctx.quadraticCurveTo(-27, 5, -10, 10)     // underside forward
  ctx.quadraticCurveTo(8, 13, 24, 7)        // the full belly
  ctx.quadraticCurveTo(33, 3.5, 36, -1)     // chin up to the nose
  ctx.closePath()
  ctx.fill()

  // the pale belly patch every monk seal wears
  ctx.fillStyle = 'rgba(214, 202, 176, 0.8)'
  ctx.beginPath()
  ctx.ellipse(3, 7.2, 17, 4.2, -0.06, 0, SD.TAU)
  ctx.fill()
  // wet fur catching the light along the back
  ctx.strokeStyle = 'rgba(190, 205, 210, 0.28)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(26, -7.5)
  ctx.quadraticCurveTo(6, -12.5, -14, -9)
  ctx.stroke()
  // the neck fold of a diver who never misses a meal
  ctx.strokeStyle = 'rgba(40, 34, 28, 0.3)'
  ctx.lineWidth = 1.4
  ctx.beginPath()
  ctx.arc(20, -1, 9, -1.15, 1.05)
  ctx.stroke()

  // fore flipper, pressed to the flank mid-stroke
  ctx.fillStyle = '#453f37'
  ctx.beginPath()
  ctx.moveTo(11, 5)
  ctx.quadraticCurveTo(4, 10 + scull, -2, 14 + scull * 1.6)
  ctx.quadraticCurveTo(4, 12.5, 11, 8)
  ctx.closePath()
  ctx.fill()

  // the face: pale muzzle, big wet eye, whiskers
  ctx.fillStyle = 'rgba(200, 190, 168, 0.35)'
  ctx.beginPath()
  ctx.ellipse(30.5, -0.5, 5.5, 4, -0.2, 0, SD.TAU)
  ctx.fill()
  ctx.fillStyle = '#17110c'
  ctx.beginPath() // the eye that begs fish off every boat
  ctx.arc(25, -4.2, 2.3, 0, SD.TAU)
  ctx.fill()
  ctx.fillStyle = 'rgba(255, 252, 240, 0.8)'
  ctx.beginPath()
  ctx.arc(25.8, -5, 0.75, 0, SD.TAU)
  ctx.fill()
  ctx.fillStyle = '#241a12'
  ctx.beginPath() // nose
  ctx.ellipse(35, -2.6, 1.7, 1.2, -0.35, 0, SD.TAU)
  ctx.fill()
  ctx.strokeStyle = 'rgba(232, 226, 206, 0.5)'
  ctx.lineWidth = 0.8
  ctx.beginPath() // whiskers
  ctx.moveTo(32, -0.6)
  ctx.quadraticCurveTo(27, 0.2, 22.5, -0.6)
  ctx.moveTo(32.5, 0.6)
  ctx.quadraticCurveTo(27.5, 2.4, 23, 2.2)
  ctx.moveTo(32, 1.8)
  ctx.quadraticCurveTo(28, 4.4, 24, 4.8)
  ctx.stroke()

  ctx.restore()
}

// Side effect: a manta ray soaring on slow wingbeats. The wings are drawn
// parametrically off the flap so they thin to a blade edge-on mid-beat:
// far wing shadowed behind the body, near wing crossing in front.
// m.tilt (set by the cruise update) banks it gently along its lap.
function drawManta (ctx, m, t) {
  var flap = Math.sin(t * 1.5 + m.phase)
  var farFlap = Math.sin(t * 1.5 + m.phase - 0.55)
  ctx.save()
  ctx.translate(m.x, m.y + Math.cos(t * 1.5 + m.phase) * 5) // rises on the downstroke
  ctx.scale(m.dir, 1)
  ctx.rotate((m.tilt || 0) + Math.sin(t * 0.7 + m.phase) * 0.03)

  // Side effect: one wing — a triangle whose lift comes entirely from f,
  // so at f = 0 it flattens to the blade you'd truly see edge-on
  function wing (f, fill) {
    ctx.fillStyle = fill
    ctx.beginPath()
    ctx.moveTo(22, -1.5)
    ctx.quadraticCurveTo(8, -2 - 20 * f, -8, -2.5 - 36 * f) // leading edge out to the tip
    ctx.quadraticCurveTo(-15, -1 - 15 * f, -19, 0)          // trailing edge back home
    ctx.closePath()
    ctx.fill()
  }

  wing(farFlap * 0.8, '#243745') // the far wing, in shadow, beating a touch behind

  // the tail whip, streaming aft
  var sway = Math.sin(t * 1.5 + m.phase - 1.2) * 4
  ctx.strokeStyle = '#243745'
  ctx.lineWidth = 1.8
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(-30, -0.5)
  ctx.quadraticCurveTo(-48, -1.5 + sway * 0.6, -66, 1.5 + sway)
  ctx.stroke()

  // the body: a flattened lens with a blunt, open mouth
  ctx.fillStyle = '#31485a'
  ctx.beginPath()
  ctx.moveTo(34, -5)                     // brow over the mouth
  ctx.quadraticCurveTo(14, -8.5, -6, -6) // the smooth back
  ctx.quadraticCurveTo(-22, -4, -31, -1) // taper to the tail root
  ctx.quadraticCurveTo(-20, 3.5, -2, 5)  // underside
  ctx.quadraticCurveTo(20, 6.2, 33, 2.4) // belly to the jaw
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#101b24'
  ctx.beginPath() // the mouth, open for the plankton it strains all day
  ctx.moveTo(34, -4.6)
  ctx.lineTo(36.5, -2.6)
  ctx.lineTo(36, 0.8)
  ctx.lineTo(33, 2.2)
  ctx.closePath()
  ctx.fill()
  // cephalic fins, curled forward like horns
  ctx.strokeStyle = '#243745'
  ctx.lineWidth = 2.4
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(33.5, -4.4)
  ctx.quadraticCurveTo(40, -6, 43, -3)
  ctx.moveTo(33.5, 2)
  ctx.quadraticCurveTo(40, 3.2, 42.5, 0.8)
  ctx.stroke()

  // pale belly band + the shoulder patch mantas are known by
  ctx.fillStyle = 'rgba(201, 214, 216, 0.8)'
  ctx.beginPath()
  ctx.ellipse(6, 3.6, 21, 2.3, 0.04, 0, SD.TAU)
  ctx.fill()
  ctx.fillStyle = 'rgba(190, 205, 210, 0.4)'
  ctx.beginPath()
  ctx.moveTo(21, -5.8)
  ctx.lineTo(11.5, -7.4)
  ctx.lineTo(17, -4.4)
  ctx.closePath()
  ctx.fill()
  // gill slits under the head
  ctx.strokeStyle = 'rgba(16, 27, 36, 0.55)'
  ctx.lineWidth = 1.2
  for (var g = 0; g < 4; g++) {
    ctx.beginPath()
    ctx.arc(22 - g * 3.6, 2.4, 2.6, 0.6, 1.7)
    ctx.stroke()
  }
  // the eye at the mouth's corner
  ctx.fillStyle = '#0e161e'
  ctx.beginPath()
  ctx.arc(30.5, -3, 1.5, 0, SD.TAU)
  ctx.fill()
  ctx.fillStyle = 'rgba(230, 240, 240, 0.7)'
  ctx.beginPath()
  ctx.arc(31, -3.4, 0.5, 0, SD.TAU)
  ctx.fill()

  wing(flap, '#31485a') // the near wing crosses the body last
  // wet sheen down the near wing's leading edge
  ctx.strokeStyle = 'rgba(160, 195, 205, 0.3)'
  ctx.lineWidth = 1.6
  ctx.beginPath()
  ctx.moveTo(21, -2)
  ctx.quadraticCurveTo(8, -2.4 - 20 * flap, -7.5, -3 - 35 * flap)
  ctx.stroke()

  ctx.restore()
}

// Side effect: a volcanic vent — a tall basalt chimney split by ember
// cracks, breathing a shimmering column of heat and bubbles. Hephaestus
// is very much at work down here.
function drawVent (ctx, v, t) {
  var pulse = 0.5 + Math.sin(t * 5 + v.phase) * 0.5
  ctx.save()

  // the warm pool of light it throws on the floor
  var pool = ctx.createRadialGradient(v.x, v.y - 20, 6, v.x, v.y - 20, 110)
  pool.addColorStop(0, 'rgba(255, 130, 50, ' + (0.16 + pulse * 0.08) + ')')
  pool.addColorStop(1, 'rgba(255, 130, 50, 0)')
  ctx.fillStyle = pool
  ctx.beginPath()
  ctx.arc(v.x, v.y - 20, 110, 0, SD.TAU)
  ctx.fill()

  // the chimney, tall and knuckled
  ctx.fillStyle = '#1c1712'
  ctx.beginPath()
  ctx.moveTo(v.x - 38, v.y + 4)
  ctx.lineTo(v.x - 22, v.y - 26)
  ctx.lineTo(v.x - 13, v.y - 48)
  ctx.lineTo(v.x - 8, v.y - 56)
  ctx.lineTo(v.x + 8, v.y - 56)
  ctx.lineTo(v.x + 16, v.y - 42)
  ctx.lineTo(v.x + 24, v.y - 20)
  ctx.lineTo(v.x + 38, v.y + 4)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = 'rgba(80, 66, 52, 0.5)' // a lit facet up its shoulder
  ctx.beginPath()
  ctx.moveTo(v.x - 22, v.y - 26)
  ctx.lineTo(v.x - 13, v.y - 48)
  ctx.lineTo(v.x - 6, v.y - 30)
  ctx.lineTo(v.x - 14, v.y - 4)
  ctx.closePath()
  ctx.fill()
  // ember cracks, breathing
  ctx.strokeStyle = 'rgba(255, 120, 40, ' + (0.4 + pulse * 0.35) + ')'
  ctx.lineWidth = 1.8
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(v.x - 4, v.y - 50)
  ctx.lineTo(v.x - 8, v.y - 34)
  ctx.lineTo(v.x - 2, v.y - 22)
  ctx.moveTo(v.x + 8, v.y - 40)
  ctx.lineTo(v.x + 12, v.y - 26)
  ctx.stroke()
  // the throat, glowing
  ctx.fillStyle = 'rgba(255, 160, 70, ' + (0.5 + pulse * 0.3) + ')'
  ctx.beginPath()
  ctx.ellipse(v.x, v.y - 56, 8, 3.4, 0, 0, SD.TAU)
  ctx.fill()

  // the rising CONE: it widens all the way to ~8 m below the surface —
  // bubbles spread with it, and faint cone-edges betray its reach
  var topY = SD.config.ventTopM * SD.config.pxPerM
  var span = v.y - 58 - topY
  ctx.strokeStyle = 'rgba(230, 245, 250, 0.3)'
  ctx.lineWidth = 1.4
  ctx.beginPath()
  for (var i = 0; i < 14; i++) {
    var frac = ((t * 130 + i * span / 14 + v.phase * 60) % span)
    var by = v.y - 58 - frac
    var rise = frac / span
    var bx = v.x + Math.sin(by * 0.025 + i * 1.7) * (10 + rise * 150)
    var br = 2 + (i % 3)
    ctx.moveTo(bx + br, by)
    ctx.arc(bx, by, br, 0, SD.TAU)
  }
  ctx.stroke()
  // the edges of the lift, whispered
  ctx.strokeStyle = 'rgba(255, 190, 120, 0.07)'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(v.x - 30, v.y - 40)
  ctx.quadraticCurveTo(v.x - 60 - Math.sin(t * 1.2 + v.phase) * 10, v.y - span * 0.55, v.x - 190, topY)
  ctx.moveTo(v.x + 30, v.y - 40)
  ctx.quadraticCurveTo(v.x + 60 + Math.sin(t * 1.4 + v.phase) * 10, v.y - span * 0.55, v.x + 190, topY)
  ctx.stroke()
  // the heat-shimmer core
  ctx.strokeStyle = 'rgba(255, 190, 120, 0.12)'
  ctx.lineWidth = 7
  ctx.beginPath()
  ctx.moveTo(v.x - 4, v.y - 58)
  ctx.quadraticCurveTo(v.x + Math.sin(t * 2 + v.phase) * 16, v.y - span * 0.5, v.x + Math.sin(t * 1.3) * 30, topY + 60)
  ctx.stroke()
  ctx.restore()
}

// Side effect: the diver's kaiki — and she grows with you. Bigger hold
// tiers stretch the hull and dress her stern; the Sails of Boreas unfurl
// from a furled rag to a crowned purple wing with a gold meander.
function drawBoat (ctx, state, t) {
  if (!SD.hasBoat(state)) return
  var tier = state.upgrades.boat
  var sail = state.upgrades.sail
  var L = 1 + (tier - 1) * 0.17 // the hull stretches with the hold
  var x = state.boat.x
  var storm = SD.stormAt(x) // in the god's waters she pitches like a cork
  var y = -3 + Math.sin(t * (1.1 + storm)) * 2.5 * (1 + storm * 2.2)
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(Math.sin(t * (0.9 + storm * 0.8)) * (0.02 + storm * 0.055))

  // hull
  ctx.fillStyle = '#3a2c20'
  ctx.beginPath()
  ctx.moveTo(-70 * L, -6)
  ctx.quadraticCurveTo(-78 * L, -20, -62 * L, -24)
  ctx.lineTo(64 * L, -24)
  ctx.quadraticCurveTo(84 * L, -20, 72 * L, -4)
  ctx.quadraticCurveTo(0, 16, -70 * L, -6)
  ctx.fill()
  // planking seam
  ctx.strokeStyle = 'rgba(20, 14, 10, 0.6)'
  ctx.lineWidth = 1.4
  ctx.beginPath()
  ctx.moveTo(-58 * L, -12)
  ctx.quadraticCurveTo(0, 2, 62 * L, -11)
  ctx.stroke()
  // rail stripe: terracotta, then gold when she's a proper ship
  ctx.strokeStyle = tier >= 3 ? GOLD : TERRA
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(-60 * L, -20)
  ctx.lineTo(62 * L, -20)
  ctx.stroke()
  // the stern curl (aphlaston) once she's tier 2+
  if (tier >= 2) {
    ctx.strokeStyle = '#3a2c20'
    ctx.lineWidth = 5
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(-66 * L, -22)
    ctx.quadraticCurveTo(-78 * L, -34, -72 * L, -46)
    ctx.stroke()
    ctx.strokeStyle = tier >= 3 ? GOLD : TERRA
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(-67 * L, -26)
    ctx.quadraticCurveTo(-75 * L, -34, -71 * L, -43)
    ctx.stroke()
  }
  // railing posts on the big hulls
  if (tier >= 2) {
    ctx.strokeStyle = '#5a4430'
    ctx.lineWidth = 2
    ctx.beginPath()
    for (var rp = -44; rp <= 52; rp += 24) {
      ctx.moveTo(rp * L, -24)
      ctx.lineTo(rp * L, -31)
    }
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(-46 * L, -31)
    ctx.lineTo(54 * L, -31)
    ctx.stroke()
  }
  // the painted bow eye, always watching for luck
  ctx.fillStyle = '#f3e7c9'
  ctx.beginPath()
  ctx.arc(66 * L, -14, 3.2, 0, SD.TAU)
  ctx.fill()
  ctx.fillStyle = '#1a2c3c'
  ctx.beginPath()
  ctx.arc(67 * L, -14, 1.4, 0, SD.TAU)
  ctx.fill()

  // mast + rigging
  ctx.strokeStyle = '#3a2c20'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(4, -24)
  ctx.lineTo(4, -92 - sail * 8)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(90, 70, 48, 0.8)'
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.moveTo(4, -90 - sail * 8)
  ctx.lineTo(58 * L, -22)
  ctx.moveTo(4, -90 - sail * 8)
  ctx.lineTo(-54 * L, -22)
  ctx.stroke()

  if (sail === 0) {
    // furled workaday rag
    ctx.fillStyle = '#e7dbbd'
    ctx.beginPath()
    ctx.moveTo(6, -90)
    ctx.quadraticCurveTo(40, -70, 8, -34)
    ctx.closePath()
    ctx.fill()
  } else {
    // the Sails of Boreas, unfurled and drawing
    var belly = 8 + sail * 6 + Math.sin(t * 1.4) * 2
    ctx.fillStyle = sail >= 2 ? '#5a3a74' : '#f0e8d2'
    ctx.beginPath()
    ctx.moveTo(6, -88 - sail * 8)
    ctx.quadraticCurveTo(46 + belly, -60 - sail * 4, 40 + belly * 0.5, -30)
    ctx.lineTo(8, -30)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = sail >= 2 ? GOLD : TERRA // the trim band
    ctx.lineWidth = sail >= 2 ? 3 : 2
    ctx.beginPath()
    ctx.moveTo(7, -86 - sail * 8)
    ctx.quadraticCurveTo(45 + belly, -58 - sail * 4, 39 + belly * 0.5, -32)
    ctx.stroke()
    if (sail >= 2) { // the meander of a wind-blessed ship
      ctx.strokeStyle = 'rgba(243, 231, 201, 0.75)'
      ctx.lineWidth = 1.2
      ctx.beginPath()
      for (var mq = 0; mq < 4; mq++) {
        var mx = 14 + mq * 8
        var my = -46 - mq * 9
        ctx.moveTo(mx, my)
        ctx.lineTo(mx + 5, my - 2)
        ctx.lineTo(mx + 3, my - 6)
      }
      ctx.stroke()
    }
  }
  // pennant, longer with finer sails
  ctx.fillStyle = sail >= 2 ? '#5a3a74' : TERRA
  ctx.beginPath()
  ctx.moveTo(4, -92 - sail * 8)
  ctx.lineTo(24 + sail * 8, -87 - sail * 8 + Math.sin(t * 3) * 2)
  ctx.lineTo(4, -82 - sail * 8)
  ctx.closePath()
  ctx.fill()

  // the catch heaped in the hold
  var wt = SD.holdWeight(state)
  if (wt > 0) {
    var heap = Math.min(1, wt / SD.holdCapacity(state))
    ctx.fillStyle = '#b9834f'
    for (var i = 0; i < Math.ceil(heap * (4 + tier * 2)); i++) {
      ctx.beginPath()
      ctx.arc(-46 * L + i * 11, -26 - (i % 2) * 5 - heap * 4, 6, 0, SD.TAU)
      ctx.fill()
    }
    ctx.fillStyle = TERRA
    ctx.beginPath()
    ctx.ellipse(-52 * L, -30 - heap * 4, 4, 7, -0.2, 0, SD.TAU)
    ctx.fill()
  }
  // the diver at the tiller when aboard
  if (state.player.aboard) drawSailor(ctx, state, t)
  ctx.restore()
}

// Side effect: the diver standing braced on deck — one hand on the tiller,
// the other shading his eyes toward the horizon
function drawSailor (ctx, state, t) {
  var c = skinTones(SD.fitness(state))
  var f = state.player.facing
  var sway = Math.sin(t * 1.1) * 1.2
  ctx.save()
  ctx.translate(f >= 0 ? 24 : -24, -24)
  ctx.scale(f, 1)
  ctx.rotate(sway * 0.02)
  ctx.lineCap = 'round'

  ctx.strokeStyle = c.skin
  ctx.lineWidth = 4.6
  ctx.beginPath() // legs braced apart, sailor-wide
  ctx.moveTo(0, -13)
  ctx.lineTo(-6, 0)
  ctx.moveTo(0, -13)
  ctx.lineTo(6.5, -1)
  ctx.stroke()
  ctx.fillStyle = '#4a3320'
  ctx.beginPath() // feet planted on the planks
  ctx.ellipse(-7, 0.5, 3, 1.4, 0, 0, SD.TAU)
  ctx.ellipse(7.5, -0.5, 3, 1.4, 0, 0, SD.TAU)
  ctx.fill()

  ctx.fillStyle = c.skin
  ctx.beginPath() // torso, chest to the wind
  ctx.ellipse(0.5, -20, 5.2, 8.6, -0.06, 0, SD.TAU)
  ctx.fill()
  if (state.relics.hide) { // the wetsuit sails too
    ctx.fillStyle = 'rgba(56, 70, 82, 0.5)'
    ctx.beginPath()
    ctx.ellipse(0.5, -20, 4.9, 7.4, -0.06, 0, SD.TAU)
    ctx.fill()
  }
  ctx.fillStyle = TERRA // perizoma
  ctx.beginPath()
  ctx.ellipse(0, -12.5, 4.8, 3.6, 0, 0, SD.TAU)
  ctx.fill()

  ctx.strokeStyle = c.skin
  ctx.lineWidth = 3.8
  ctx.beginPath() // aft arm down to the tiller
  ctx.moveTo(-2, -24)
  ctx.quadraticCurveTo(-8, -20, -12, -14)
  ctx.stroke()
  ctx.strokeStyle = '#4a3320' // the tiller itself
  ctx.lineWidth = 2.4
  ctx.beginPath()
  ctx.moveTo(-12, -14)
  ctx.lineTo(-17, -6)
  ctx.stroke()
  ctx.strokeStyle = c.skin
  ctx.lineWidth = 3.8
  ctx.beginPath() // fore arm up, shading his eyes
  ctx.moveTo(3, -25)
  ctx.quadraticCurveTo(8, -28, 9.5, -31.5)
  ctx.stroke()

  ctx.fillStyle = c.skin
  ctx.beginPath() // head, chin up, watching the water
  ctx.arc(2.5, -33, 5.4, 0, SD.TAU)
  ctx.fill()
  ctx.fillStyle = c.deep
  ctx.beginPath() // profile nose
  ctx.moveTo(7.5, -34.5)
  ctx.lineTo(9.4, -33)
  ctx.lineTo(7.3, -32)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#241a12'
  ctx.beginPath() // curls
  ctx.arc(1.5, -35.5, 4.8, Math.PI * 0.9, Math.PI * 2.05)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(-2, -32.5, 2, 0, SD.TAU)
  ctx.fill()
  ctx.strokeStyle = TERRA // headband
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(2.5, -33, 5.5, -Math.PI * 0.95, -Math.PI * 0.2)
  ctx.stroke()

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
    // the god's storm swells the sea as you go east — chop rides the swell
    var storm = SD.stormAt(x)
    var y = Math.sin(x * 0.02 + t * 1.6) * 2.4 * (1 + storm * 3.2) +
            Math.sin(x * 0.043 + t * 3.1) * 5 * storm
    if (x === x0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.stroke()
  ctx.restore()
}

// Side effect: Poseidon's standing storm — rain slanting into the swell,
// and now and then the sky splits. World space, sky only; the village end
// of the sea never sees a drop.
function drawStorm (ctx, t, cam, view) {
  if (cam.y > 60) return // no sky on screen
  var x0 = cam.x - 40
  var x1 = cam.x + view.w + 40
  // the storm is a bump over the Plain — sample both edges AND the peak,
  // or a camera straddling its rim would skip rain that's plainly in view
  var peak = SD.clamp(30600, x0, x1)
  if (Math.max(SD.stormAt(x0), SD.stormAt(peak), SD.stormAt(x1)) < 0.35) return
  ctx.save()
  ctx.strokeStyle = 'rgba(208, 222, 234, 0.5)'
  ctx.lineWidth = 1.3
  ctx.beginPath()
  for (var i = 0; i < 110; i++) {
    var sx = x0 + ((i * 199.3 + t * 300) % (x1 - x0 + 80)) - 40
    var storm = SD.stormAt(sx)
    if (storm < 0.35) continue
    if ((i % 10) / 10 > storm) continue // the rain thins at the storm's edge
    var sy = -252 + ((i * 83.7) % 240)
    ctx.moveTo(sx, sy)
    ctx.lineTo(sx - 7, sy + 26)
  }
  ctx.stroke()
  var flash = Math.pow(Math.max(0, Math.sin(t * 0.61) * Math.sin(t * 1.93)), 22)
  if (flash > 0.08) {
    // the flash lights only the god's stretch of sky — the calm rims stay calm
    var fx0 = Math.max(x0, 27400)
    var fx1 = Math.min(x1, 34200)
    ctx.fillStyle = 'rgba(240, 246, 255, ' + (flash * 0.45).toFixed(3) + ')'
    if (fx1 > fx0) ctx.fillRect(fx0, -300, fx1 - fx0, 320)
  }
  if (flash > 0.5) {
    var bx = 30600 + Math.sin(t * 0.41) * 2100 // the bolts walk the Plain, not the camera
    ctx.strokeStyle = 'rgba(250, 252, 255, 0.9)'
    ctx.lineWidth = 2.6
    ctx.beginPath()
    ctx.moveTo(bx, -290)
    ctx.lineTo(bx - 40, -200)
    ctx.lineTo(bx + 25, -130)
    ctx.lineTo(bx - 30, -55)
    ctx.lineTo(bx + 10, -4)
    ctx.stroke()
  }
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

// Side effect: seafloor fill following floorDepthAt — a dark body of ground
// under a sunlit crust of sand, dressed with pebbles and shell-specks
function drawFloor (ctx, cam, view) {
  var bottom = cam.y + view.h + 100
  ctx.save()
  // sample on a fixed WORLD grid, like the pebbles below — a camera-anchored
  // grid re-cuts the polyline every frame, which makes steep walls (the Blue
  // Hole, the Kelp Well) visibly warp as the camera moves
  var step = 24
  var x0 = Math.floor((cam.x - 60) / step) * step
  var x1 = cam.x + view.w + 60
  var x

  // the ground body
  ctx.fillStyle = '#183045'
  ctx.beginPath()
  ctx.moveTo(x0, bottom)
  for (x = x0; x <= x1; x += step) {
    ctx.lineTo(x, SD.floorYAt(x))
  }
  ctx.lineTo(x1, bottom)
  ctx.closePath()
  ctx.fill()

  // the sand crust: a bright lip over a softer warm band
  ctx.lineCap = 'round'
  ctx.strokeStyle = 'rgba(214, 190, 140, 0.12)'
  ctx.lineWidth = 13
  ctx.beginPath()
  for (x = x0; x <= x1; x += step) {
    var fy2 = SD.floorYAt(x) + 6
    if (x === x0) ctx.moveTo(x, fy2)
    else ctx.lineTo(x, fy2)
  }
  ctx.stroke()
  ctx.strokeStyle = 'rgba(228, 206, 158, 0.3)'
  ctx.lineWidth = 3.5
  ctx.beginPath()
  for (x = x0; x <= x1; x += step) {
    var fy = SD.floorYAt(x)
    if (x === x0) ctx.moveTo(x, fy)
    else ctx.lineTo(x, fy)
  }
  ctx.stroke()

  // pebbles + shell specks, deterministic per column so they never shimmer
  ctx.fillStyle = 'rgba(226, 208, 168, 0.28)'
  var startCol = Math.floor(x0 / 56) * 56
  for (x = startCol; x <= x1; x += 56) {
    var h = Math.abs(Math.sin(x * 0.7317))
    if (h < 0.25) continue
    var px = x + (h * 40 - 20)
    var py = SD.floorYAt(px) + 4 + h * 7
    ctx.beginPath()
    ctx.ellipse(px, py, 2.6 + h * 2, 1.4 + h, 0, 0, SD.TAU)
    ctx.fill()
  }
  ctx.restore()
}

// Side effect: one boulder — an irregular faceted stone, lit from the
// upper left, seated in its own contact shadow. The shape is deterministic
// per rock (derived from its position) and cached on the rock itself.
function drawRock (ctx, r) {
  if (r.hidden) return // collision-only bones (the Anemone's hull, etc.)
  if (!r._pts) {
    var seed = Math.abs(Math.sin(r.x * 12.9898 + r.y * 78.233)) * 43758.5453
    var n = 9
    r._pts = []
    for (var i = 0; i < n; i++) {
      var a = (i / n) * SD.TAU
      var jag = 0.82 + (Math.sin(seed + i * 2.7) * 0.5 + 0.5) * 0.22
      r._pts.push({
        x: Math.cos(a) * r.r * jag,
        y: Math.sin(a) * r.r * 0.82 * jag
      })
    }
  }
  var p = r._pts
  ctx.save()
  ctx.translate(r.x, r.y)

  // the stone itself
  ctx.fillStyle = '#22384d'
  ctx.beginPath()
  ctx.moveTo(p[0].x, p[0].y)
  for (var v = 1; v < p.length; v++) ctx.lineTo(p[v].x, p[v].y)
  ctx.closePath()
  ctx.fill()

  // the lit crown: the upper vertices, pulled toward the light
  ctx.fillStyle = 'rgba(126, 158, 172, 0.2)'
  ctx.beginPath()
  var started = false
  for (var u = 0; u < p.length; u++) {
    if (p[u].y > r.r * 0.05) continue
    var lx = p[u].x * 0.92 - r.r * 0.05
    var ly = p[u].y * 0.9 - r.r * 0.06
    if (!started) { ctx.moveTo(lx, ly); started = true } else ctx.lineTo(lx, ly)
  }
  ctx.closePath()
  ctx.fill()

  // the shaded underside + contact shadow at its seat
  ctx.fillStyle = 'rgba(8, 16, 28, 0.32)'
  ctx.beginPath()
  ctx.ellipse(r.r * 0.08, r.r * 0.62, r.r * 0.78, r.r * 0.26, 0.05, 0, SD.TAU)
  ctx.fill()

  // one crack across the face of the larger stones
  if (r.r > 55) {
    ctx.strokeStyle = 'rgba(10, 20, 32, 0.4)'
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.moveTo(p[1].x * 0.55, p[1].y * 0.55)
    ctx.lineTo(p[1].x * 0.2 + r.r * 0.1, p[1].y * 0.1 + r.r * 0.12)
    ctx.lineTo(p[1].x * 0.05 - r.r * 0.12, r.r * 0.4)
    ctx.stroke()
  }
  ctx.restore()
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

// Side effect: the old shipwreck, half swallowed by the sand — dark bones
// with a pale rim of light along the hull where the water remembers the sun
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
  // rim light along the gunwale
  ctx.strokeStyle = 'rgba(168, 190, 200, 0.28)'
  ctx.lineWidth = 2.4
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(-112, -4)
  ctx.quadraticCurveTo(-88, -55, 0, -61)
  ctx.quadraticCurveTo(90, -55, 118, -10)
  ctx.stroke()
  // ribs, with gaps where the planking rotted away
  ctx.strokeStyle = '#31251b'
  ctx.lineWidth = 5
  for (var i = 0; i < 4; i++) {
    ctx.beginPath()
    ctx.moveTo(-60 + i * 42, -46)
    ctx.lineTo(-64 + i * 42, -4)
    ctx.stroke()
  }
  ctx.strokeStyle = 'rgba(168, 190, 200, 0.16)'
  ctx.lineWidth = 1.4
  for (var rl = 0; rl < 4; rl++) {
    ctx.beginPath()
    ctx.moveTo(-58 + rl * 42, -46)
    ctx.lineTo(-62 + rl * 42, -6)
    ctx.stroke()
  }
  // the leaning mast, a stay-rope still clinging to the bow
  ctx.strokeStyle = '#31251b'
  ctx.lineWidth = 6
  ctx.beginPath()
  ctx.moveTo(10, -60)
  ctx.lineTo(52, -128)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(120, 104, 80, 0.5)'
  ctx.lineWidth = 1.3
  ctx.beginPath()
  ctx.moveTo(52, -126)
  ctx.quadraticCurveTo(-20, -92, -96, -12)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(168, 190, 200, 0.25)'
  ctx.lineWidth = 1.6
  ctx.beginPath()
  ctx.moveTo(12, -60)
  ctx.lineTo(50, -124)
  ctx.stroke()
  ctx.restore()
}

// Side effect: the Anemone — a giant merchant wreck you can swim inside.
// Her upper planking is torn open amidships; ribs, cargo and the dark of
// the hold show through the breach. Timber, not stone.
function drawGiantWreck (ctx, w, t) {
  var x = w.x
  var y = w.y
  if (w.fallen) {
    // stern-first in the crevasse she opened — the bow points at the sun
    ctx.save()
    ctx.translate(x, y - 40)
    ctx.rotate(-1.02)
    ctx.scale((w.scale || 1) * 0.96, (w.scale || 1) * 0.96)
    drawGiantWreckHull(ctx, t)
    ctx.restore()
    return
  }
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(w.scale || 1, w.scale || 1)
  drawGiantWreckHull(ctx, t)
  ctx.restore()
}

// Side effect: the Anemone's hull in local space (shared by both poses)
function drawGiantWreckHull (ctx, t) {

  // the dark of the hold, showing through the breach
  ctx.fillStyle = '#100c08'
  ctx.beginPath()
  ctx.moveTo(-250, -10)
  ctx.quadraticCurveTo(-230, -120, -110, -148)
  ctx.lineTo(210, -142)
  ctx.quadraticCurveTo(280, -110, 300, -16)
  ctx.quadraticCurveTo(20, 8, -250, -10)
  ctx.closePath()
  ctx.fill()

  // the hull itself: keel sweep from ram bow to high curled stern
  ctx.fillStyle = '#2e2318'
  ctx.beginPath()
  ctx.moveTo(-330, -6)               // the ram at the bow
  ctx.quadraticCurveTo(-300, -30, -258, -34)
  ctx.lineTo(-250, -8)
  ctx.quadraticCurveTo(-40, 22, 290, -12) // the keel line along the sand
  ctx.lineTo(300, -40)
  ctx.quadraticCurveTo(320, -90, 296, -150) // stern rising
  ctx.quadraticCurveTo(322, -160, 330, -196) // the aphlaston curl
  ctx.quadraticCurveTo(300, -186, 286, -160)
  ctx.lineTo(268, -120)
  ctx.quadraticCurveTo(240, -136, 214, -140) // aft gunwale
  ctx.lineTo(150, -136)
  // — the breach: torn planks amidships —
  ctx.lineTo(138, -112)
  ctx.lineTo(112, -128)
  ctx.lineTo(84, -96)
  ctx.lineTo(52, -122)
  ctx.lineTo(30, -92)
  ctx.lineTo(-2, -118)
  ctx.lineTo(-30, -96)
  ctx.lineTo(-44, -124)
  // fore gunwale up to the bow
  ctx.lineTo(-110, -140)
  ctx.quadraticCurveTo(-210, -124, -252, -70)
  ctx.lineTo(-258, -34)
  ctx.lineTo(-330, -6)
  ctx.closePath()
  ctx.fill()

  // ribs standing in the open hold
  ctx.strokeStyle = '#241a10'
  ctx.lineWidth = 7
  ctx.lineCap = 'round'
  for (var rb = 0; rb < 4; rb++) {
    var rx = -20 + rb * 44
    ctx.beginPath()
    ctx.moveTo(rx, -6 + rb * 2)
    ctx.quadraticCurveTo(rx - 6, -60, rx - 2, -96 - (rb % 2) * 16)
    ctx.stroke()
  }
  // rim light along her surviving lines
  ctx.strokeStyle = 'rgba(168, 190, 200, 0.3)'
  ctx.lineWidth = 2.4
  ctx.beginPath()
  ctx.moveTo(-252, -68)
  ctx.quadraticCurveTo(-210, -122, -112, -138)
  ctx.moveTo(152, -134)
  ctx.quadraticCurveTo(240, -134, 268, -118)
  ctx.moveTo(298, -150)
  ctx.quadraticCurveTo(320, -160, 328, -192)
  ctx.stroke()
  // planking seams down the hull flank
  ctx.strokeStyle = 'rgba(10, 8, 6, 0.55)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(-244, -28)
  ctx.quadraticCurveTo(0, 0, 282, -30)
  ctx.moveTo(-236, -52)
  ctx.quadraticCurveTo(-40, -24, 274, -62)
  ctx.stroke()

  // the fallen mainmast, leaning out of the breach
  ctx.strokeStyle = '#241a10'
  ctx.lineWidth = 9
  ctx.beginPath()
  ctx.moveTo(40, -80)
  ctx.lineTo(-118, -226)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(168, 190, 200, 0.2)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(38, -82)
  ctx.lineTo(-116, -224)
  ctx.stroke()
  // a rag of sail still hanging off it
  ctx.fillStyle = 'rgba(196, 186, 160, 0.28)'
  ctx.beginPath()
  ctx.moveTo(-40, -152)
  ctx.quadraticCurveTo(-14, -132 + Math.sin(t * 1.4) * 5, -46, -104)
  ctx.quadraticCurveTo(-62, -130, -40, -152)
  ctx.closePath()
  ctx.fill()

  // spilled cargo shadows inside the hold
  ctx.fillStyle = 'rgba(74, 48, 26, 0.85)'
  ctx.beginPath()
  ctx.ellipse(-90, -14, 26, 12, -0.1, 0, SD.TAU)
  ctx.ellipse(120, -12, 30, 13, 0.1, 0, SD.TAU)
  ctx.fill()
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

  // volcanic glass from Hephaestus' shelf — black, sharp, faintly warm
  obsidian: function (ctx, t) {
    var glow = 0.2 + Math.sin(t * 3.2) * 0.1
    ctx.fillStyle = '#141017'
    ctx.beginPath() // a knapped, faceted shard
    ctx.moveTo(-9, 8)
    ctx.lineTo(-11, -2)
    ctx.lineTo(-3, -11)
    ctx.lineTo(7, -7)
    ctx.lineTo(11, 3)
    ctx.lineTo(2, 10)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = 'rgba(126, 200, 227, 0.6)' // glassy edge light
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.moveTo(-3, -11)
    ctx.lineTo(-6, 2)
    ctx.lineTo(2, 10)
    ctx.moveTo(-3, -11)
    ctx.lineTo(4, -1)
    ctx.stroke()
    ctx.fillStyle = 'rgba(255, 140, 60, ' + glow + ')' // the vent's warmth remembered
    ctx.beginPath()
    ctx.arc(2, 2, 3, 0, SD.TAU)
    ctx.fill()
  },

  // the Fin of Karcharias — a trophy taller than your torso
  sharkFin: function (ctx, t) {
    ctx.fillStyle = '#66727e'
    ctx.beginPath()
    ctx.moveTo(-12, 12)
    ctx.quadraticCurveTo(-8, -10, 4, -14)
    ctx.quadraticCurveTo(4, -2, 12, 12)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#e8e4da'
    ctx.beginPath()
    ctx.moveTo(-9, 12)
    ctx.quadraticCurveTo(-4, 0, 2, -6)
    ctx.quadraticCurveTo(1, 4, 8, 12)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = 'rgba(200, 60, 50, 0.7)' // the old harpoon nicks
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.moveTo(-2, -8)
    ctx.lineTo(2, -4)
    ctx.moveTo(1, -11)
    ctx.lineTo(5, -8)
    ctx.stroke()
  },

  // the Kraken's beak — black, hooked, and heavier than it looks
  krakenBeak: function (ctx, t) {
    ctx.fillStyle = '#241626'
    ctx.beginPath() // upper mandible, hooked like a parrot's grudge
    ctx.moveTo(-10, -2)
    ctx.quadraticCurveTo(-2, -14, 9, -8)
    ctx.quadraticCurveTo(13, -5, 9, 1)
    ctx.quadraticCurveTo(3, -6, -6, -2)
    ctx.closePath()
    ctx.fill()
    ctx.beginPath() // lower
    ctx.moveTo(-9, 2)
    ctx.quadraticCurveTo(0, 12, 8, 5)
    ctx.quadraticCurveTo(2, 6, -5, 2)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = 'rgba(190, 120, 210, 0.55)' // that oil-slick sheen
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.moveTo(-6, -5)
    ctx.quadraticCurveTo(1, -10, 8, -6)
    ctx.stroke()
  },

  // the Horn of the Ketos — a spiraled lance of the old sea
  ketosHorn: function (ctx, t) {
    var glow = 0.18 + Math.sin(t * 2) * 0.08
    var grad = ctx.createRadialGradient(0, 0, 3, 0, 0, 30)
    grad.addColorStop(0, 'rgba(126, 228, 255, ' + glow + ')')
    grad.addColorStop(1, 'rgba(126, 228, 255, 0)')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(0, 0, 30, 0, SD.TAU)
    ctx.fill()
    ctx.save()
    ctx.rotate(-0.6)
    ctx.fillStyle = '#3a6a74'
    ctx.beginPath() // the tapering lance
    ctx.moveTo(-14, 6)
    ctx.lineTo(15, -1)
    ctx.lineTo(-13, -7)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = '#c9a227' // the spiral ridges
    ctx.lineWidth = 1.3
    for (var s = 0; s < 4; s++) {
      ctx.beginPath()
      ctx.moveTo(-12 + s * 7, 5 - s * 1.4)
      ctx.quadraticCurveTo(-9 + s * 7, 0, -12 + s * 7, -5 + s * 1.4)
      ctx.stroke()
    }
    ctx.restore()
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

// Side effect: THE KRAKEN — lord of its grotto: a hooded, leaning mantle,
// heavy tapering arms studded with suckers, and one lamp of an eye
function drawKraken (ctx, f, t) {
  ctx.save()
  ctx.translate(f.x, f.y)
  if (f.hurtT > 0) ctx.globalAlpha = 0.65
  var breathe = Math.sin(t * 1.2 + f.phase) * 3

  // arms first: thick at the crown, whip-thin at the tips
  ctx.lineCap = 'round'
  for (var i = 0; i < 8; i++) {
    var a = -0.85 + i * 0.34
    var wl = 95 + Math.sin(t * 1.6 + i * 1.7) * 20
    var grab = f.mode === 'grab' && (i === 3 || i === 5) ? 34 : 0
    var midX = Math.cos(a) * (wl * 0.55)
    var midY = 26 + Math.sin(t * 2 + i) * 10
    var tipX = Math.cos(a) * wl
    var tipY = 44 + Math.sin(t * 1.3 + i * 2) * 16 - grab
    // heavy root segment
    ctx.strokeStyle = '#5a2a4e'
    ctx.lineWidth = 13 - i * 0.5
    ctx.beginPath()
    ctx.moveTo(Math.cos(a) * 14, 10)
    ctx.quadraticCurveTo(Math.cos(a) * 30, 22, midX, midY)
    ctx.stroke()
    // tapering whip
    ctx.lineWidth = 5.5 - i * 0.3
    ctx.beginPath()
    ctx.moveTo(midX, midY)
    ctx.quadraticCurveTo((midX + tipX) / 2, midY + 14, tipX, tipY)
    ctx.stroke()
    // the curled tip
    ctx.lineWidth = 2.6
    ctx.beginPath()
    ctx.arc(tipX, tipY, 5, a, a + Math.PI * 1.2)
    ctx.stroke()
    // suckers down the inner root
    ctx.fillStyle = 'rgba(230, 190, 215, 0.55)'
    for (var sk = 1; sk <= 3; sk++) {
      var sf = sk / 3.5
      ctx.beginPath()
      ctx.arc(SD.lerp(Math.cos(a) * 14, midX, sf), SD.lerp(10, midY, sf) + 3, 1.7, 0, SD.TAU)
      ctx.fill()
    }
  }

  // the mantle: broad, hooded, leaning toward you
  ctx.fillStyle = '#6e3860'
  ctx.beginPath()
  ctx.moveTo(-38 - breathe, 6)
  ctx.quadraticCurveTo(-46 - breathe, -34, -18, -50)
  ctx.quadraticCurveTo(6, -62, 26, -46)
  ctx.quadraticCurveTo(44 + breathe, -30, 36 + breathe, 2)
  ctx.quadraticCurveTo(20, 18, 0, 16)
  ctx.quadraticCurveTo(-22, 18, -38 - breathe, 6)
  ctx.closePath()
  ctx.fill()
  // mottled hide
  ctx.fillStyle = 'rgba(90, 42, 78, 0.7)'
  ctx.beginPath()
  ctx.arc(-18, -28, 6, 0, SD.TAU)
  ctx.arc(4, -44, 4.5, 0, SD.TAU)
  ctx.arc(-30, -6, 4, 0, SD.TAU)
  ctx.arc(22, -22, 5, 0, SD.TAU)
  ctx.fill()
  // the scowling hood over the eye
  ctx.fillStyle = '#54284a'
  ctx.beginPath()
  ctx.moveTo(2, -26)
  ctx.quadraticCurveTo(22, -34, 38, -22)
  ctx.quadraticCurveTo(24, -22, 6, -18)
  ctx.closePath()
  ctx.fill()
  // the great lamp of an eye, tracking you
  ctx.fillStyle = '#e8c86a'
  ctx.beginPath()
  ctx.ellipse(20, -12, 11, 9.5, -0.15, 0, SD.TAU)
  ctx.fill()
  ctx.fillStyle = '#180c20'
  ctx.beginPath()
  ctx.ellipse(23, -12, 4, 7.5, 0, 0, SD.TAU)
  ctx.fill()
  ctx.fillStyle = 'rgba(255, 245, 220, 0.7)'
  ctx.beginPath()
  ctx.arc(17, -16, 2, 0, SD.TAU)
  ctx.fill()

  ctx.restore()
  drawBossHp(ctx, f, f.y - 84)
}

// Side effect: KETOS — the roaming leviathan: one unbroken serpent body
// undulating behind a horned, long-jawed head. Pottery monsters, done right.
function drawKetos (ctx, f, t) {
  var dir = f.vx >= 0 ? 1 : -1
  ctx.save()
  if (f.hurtT > 0) ctx.globalAlpha = 0.65

  // the body: a single thick undulating spine, nose to tail
  var segs = 16
  var px = []
  var py = []
  for (var s = 0; s <= segs; s++) {
    px.push(f.x - dir * s * 17)
    py.push(f.y + Math.sin(f.phase * 2.2 - s * 0.55) * (10 + s * 1.1))
  }
  ctx.strokeStyle = '#22424e'
  ctx.lineCap = 'round'
  for (var seg = 0; seg < segs; seg++) {
    ctx.lineWidth = 34 - seg * 1.9 // thick behind the skull, whip at the tail
    ctx.beginPath()
    ctx.moveTo(px[seg], py[seg])
    ctx.lineTo(px[seg + 1], py[seg + 1])
    ctx.stroke()
  }
  // the pale keel along the belly
  ctx.strokeStyle = 'rgba(140, 176, 178, 0.4)'
  ctx.lineWidth = 6
  ctx.beginPath()
  ctx.moveTo(px[1], py[1] + 10)
  for (var k = 2; k < segs - 2; k++) {
    ctx.lineTo(px[k], py[k] + (12 - k * 0.5))
  }
  ctx.stroke()
  // dorsal ridge fins down the whole back
  ctx.fillStyle = '#16303a'
  for (var d = 1; d < segs - 3; d += 2) {
    var fh = 16 - d * 0.7
    ctx.beginPath()
    ctx.moveTo(px[d], py[d] - (15 - d * 0.8))
    ctx.lineTo(px[d] - dir * 7, py[d] - (15 - d * 0.8) - fh)
    ctx.lineTo(px[d] - dir * 13, py[d] - (13 - d * 0.8))
    ctx.closePath()
    ctx.fill()
  }
  // tail flukes
  ctx.fillStyle = '#1c3944'
  ctx.beginPath()
  ctx.moveTo(px[segs], py[segs])
  ctx.lineTo(px[segs] - dir * 20, py[segs] - 16)
  ctx.lineTo(px[segs] - dir * 12, py[segs])
  ctx.lineTo(px[segs] - dir * 20, py[segs] + 16)
  ctx.closePath()
  ctx.fill()

  // the head, long-jawed and horned
  ctx.save()
  ctx.translate(f.x, f.y)
  ctx.scale(dir, 1)
  ctx.rotate(Math.sin(f.phase * 2.2) * 0.08)
  ctx.fillStyle = '#2a5260'
  ctx.beginPath() // skull + long snout
  ctx.moveTo(58, 2)
  ctx.quadraticCurveTo(46, -10, 26, -16)
  ctx.quadraticCurveTo(2, -22, -14, -14)
  ctx.quadraticCurveTo(-22, 0, -12, 14)
  ctx.quadraticCurveTo(8, 22, 32, 16)
  ctx.quadraticCurveTo(48, 12, 58, 2)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#22424e'
  ctx.beginPath() // the underjaw, slightly open
  ctx.moveTo(54, 8)
  ctx.quadraticCurveTo(38, 20, 16, 20)
  ctx.quadraticCurveTo(34, 24, 50, 15)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = '#e8e4d6' // the teeth
  ctx.lineWidth = 1.8
  ctx.beginPath()
  for (var th = 0; th < 6; th++) {
    ctx.moveTo(28 + th * 4.6, 14 - th * 0.7)
    ctx.lineTo(30 + th * 4.6, 19 - th * 0.7)
  }
  ctx.stroke()
  ctx.strokeStyle = '#16303a' // the swept horns
  ctx.lineWidth = 4.5
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(6, -18)
  ctx.quadraticCurveTo(-6, -34, -22, -38)
  ctx.moveTo(18, -15)
  ctx.quadraticCurveTo(10, -28, -2, -33)
  ctx.stroke()
  ctx.fillStyle = '#c9a227' // the lamp of an eye
  ctx.beginPath()
  ctx.arc(30, -7, 6, 0, SD.TAU)
  ctx.fill()
  ctx.fillStyle = '#0e0a08'
  ctx.beginPath()
  ctx.ellipse(32, -7, 2, 4, 0, 0, SD.TAU)
  ctx.fill()
  ctx.restore()

  ctx.restore()
  drawBossHp(ctx, f, f.y - 70)
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

// Side effect: the sponge diver, rebuilt as ONE body — a streamlined
// freediver in true side profile. The torso, hips and glutes are a single
// silhouette; the far arm and far leg sit in shadow so the figure reads
// with depth. He swims like what he owns: bare feet mean a true frog-kick
// breaststroke, fins mean the hip-driven flutter, and god-tier fins mean
// a monofin and the dolphin undulation. Fitness broadens the shoulders,
// narrows the waist, thickens the legs and browns the skin. Karcharias'
// hide is worn as a second skin.
function drawDiver (ctx, state, t) {
  var p = state.player
  if (p.invuln > 0 && Math.floor(t * 12) % 2 === 0) return // hurt blink

  var fit = SD.fitness(state)
  var c = skinTones(fit)
  // the wetsuit recolors the body; head and hands stay bare skin
  var body = state.relics.hide
    ? { skin: '#4e5e6c', deep: '#37444f' }
    : c
  var speed = SD.dist(0, 0, p.vx, p.vy)
  var targetA = speed > 36 ? Math.atan2(p.vy, p.vx) : (p.facing === 1 ? 0 : Math.PI)
  if (p._ang === undefined) p._ang = targetA
  var da = Math.atan2(Math.sin(targetA - p._ang), Math.cos(targetA - p._ang))
  p._ang += da * Math.min(1, 7 * (t - (p._angT || t)) + 0.12)
  p._angT = t

  // body metrics from fitness
  var sh = 6.4 + fit * 2.6        // half-depth at the shoulders
  var wa = 5.4 - fit * 1.2        // half-depth at the pelvis
  var thigh = 5.4 + fit * 2.6
  var calf = 3.8 + fit * 1.1
  var armUp = 3.5 + fit * 1.5
  var armLo = 2.8 + fit * 0.6
  var defA = Math.max(0, (fit - 0.25) / 0.75) * 0.38

  // the stroke he owns: bare feet frog-kick, fins flutter, monofin dolphin
  // (dev mode explores in god-tier gear — the G key comes with a monofin)
  var finTier = state.devMode ? 6 : state.upgrades.fins
  var strokeMode = finTier === 0 ? 'breast' : finTier >= 6 ? 'dolphin' : 'flutter'
  var amp = speed > 25 ? 1 : 0.35
  var kick = Math.sin(p.swimPhase * 2.4) * amp
  var stone = p.holdingStone
  var striking = p.spearFlash > 0

  // Pure: frog-kick fold 0..1 at a point cc in the stroke cycle —
  // knees gather, whip straight, then the long glide
  function tuckAt (cc) {
    var v = cc < 0.34 ? SD.smoothstep(0.06, 0.34, cc)
      : cc < 0.52 ? 1 - SD.smoothstep(0.34, 0.52, cc)
        : 0
    return v * amp
  }
  var c01 = (p.swimPhase * 0.085) % 1 // one full breaststroke cycle
  var tuck = strokeMode === 'breast' && !stone ? tuckAt(c01) : 0
  var tuckFar = strokeMode === 'breast' && !stone ? tuckAt((c01 + 0.975) % 1) : 0
  // breaststroke arms: pull to the chest while the legs gather,
  // reach forward again as the legs whip back
  var pull = 0
  if (strokeMode === 'breast' && !stone && !striking) {
    pull = (c01 < 0.18 ? SD.smoothstep(0, 0.18, c01)
      : c01 < 0.34 ? 1
        : c01 < 0.6 ? 1 - SD.smoothstep(0.34, 0.6, c01)
          : 0) * amp
  }
  var dip = Math.sin(pull * Math.PI) * 3 // the pull arcs downward, hauling water
  // dolphin kick: the knees lead and the ankles lag, one wave down the body
  var kneeK = Math.sin(p.swimPhase * 1.4) * 0.9 * amp
  var ankK = Math.sin(p.swimPhase * 1.4 - 0.8) * 1.6 * amp

  ctx.save()
  ctx.translate(p.x, p.y)
  ctx.rotate(p._ang)
  if (Math.cos(p._ang) < 0) ctx.scale(1, -1) // keep the back up when swimming left
  if (strokeMode === 'dolphin') ctx.rotate(Math.sin(p.swimPhase * 1.4 + 0.5) * 0.05 * amp) // the whole body rides the wave

  ctx.lineCap = 'round'

  // Side effect: one leg from the hip — long, nearly straight, hip-driven,
  // ankle whipping, toes pointed (or finned). kA lets the ankle lag the
  // knee (the dolphin wave); in monofin mode the blade is drawn once,
  // after both legs, so here the feet stay bare.
  function leg (k, tone, shadeAlpha, kA) {
    var ka = kA === undefined ? k : kA
    var wMul = strokeMode === 'dolphin' ? 1.2 : 1 // legs pressed together read wider
    var kneeY = 2.6 + k * 4
    var ankleY = 3.2 + ka * 9.5
    ctx.globalAlpha = shadeAlpha
    ctx.strokeStyle = tone.skin
    ctx.lineWidth = thigh * wMul
    ctx.beginPath()
    ctx.moveTo(-14, 1)
    ctx.quadraticCurveTo(-21, 1.6 + k * 2.2, -27.5, kneeY)
    ctx.stroke()
    ctx.lineWidth = calf * wMul
    ctx.beginPath()
    ctx.moveTo(-27, kneeY)
    ctx.quadraticCurveTo(-34, kneeY + (ankleY - kneeY) * 0.6, -40.5, ankleY)
    ctx.stroke()
    if (state.upgrades.fins > 0 && strokeMode !== 'dolphin') {
      var fl = 11 + state.upgrades.fins * 2.6
      ctx.fillStyle = state.upgrades.fins >= 4 ? '#0e7a6e' : '#1a4f5e'
      ctx.beginPath() // the blade, trailing the ankle
      ctx.moveTo(-39.5, ankleY)
      ctx.quadraticCurveTo(-42 - fl * 0.4, ankleY - 3 + ka * 1.2, -41 - fl, ankleY - 0.6 + ka * 2.4)
      ctx.lineTo(-40.5 - fl * 0.85, ankleY + 1.2 + ka * 2)
      ctx.quadraticCurveTo(-42 - fl * 0.3, ankleY + 3, -39.5, ankleY + 1.8)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#241a12' // foot pocket
      ctx.beginPath()
      ctx.ellipse(-41, ankleY + 0.4, 3.4, 2.3, ka * 0.12, 0, SD.TAU)
      ctx.fill()
    } else {
      ctx.fillStyle = tone.skin // pointed bare foot, streamlined
      ctx.beginPath()
      ctx.moveTo(-39.5, ankleY - 2)
      ctx.quadraticCurveTo(-45.5, ankleY - 1 + ka * 1.6, -48, ankleY + 0.6 + ka * 2)
      ctx.quadraticCurveTo(-44.5, ankleY + 2.4, -39.5, ankleY + 2.2)
      ctx.closePath()
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  // Side effect: one leg folded for the frog kick — the knee gathers toward
  // the belly, the heel toward the seat, then the whole leg whips straight
  // into the glide. lift staggers the pair so they read in depth. At tk = 0
  // this IS the straight glide leg, bare foot pointed.
  function frogLeg (tk, lift, tone) {
    var kneeX = SD.lerp(-27.5, -19.5, tk)
    var kneeY = SD.lerp(2.6, 6.5 + lift, tk)
    var ankX = SD.lerp(-40.5, -24.5, tk)
    var ankY = SD.lerp(3.2, 10.5 + lift, tk)
    ctx.strokeStyle = tone.skin
    ctx.lineWidth = thigh
    ctx.beginPath()
    ctx.moveTo(-14, 1)
    ctx.quadraticCurveTo(SD.lerp(-21, -16.5, tk), SD.lerp(1.6, 4.5, tk), kneeX, kneeY)
    ctx.stroke()
    ctx.lineWidth = calf
    ctx.beginPath()
    ctx.moveTo(kneeX + 0.5, kneeY)
    ctx.quadraticCurveTo((kneeX + ankX) / 2 - tk * 2, (kneeY + ankY) / 2 + tk * 2.5, ankX, ankY)
    ctx.stroke()
    // the bare foot, trailing off the shin
    var ux = ankX - kneeX
    var uy = ankY - kneeY
    var ul = Math.max(Math.sqrt(ux * ux + uy * uy), 0.001)
    ux /= ul
    uy /= ul
    ctx.fillStyle = tone.skin
    ctx.beginPath()
    ctx.moveTo(ankX + uy * 2, ankY - ux * 2)
    ctx.quadraticCurveTo(ankX + ux * 5, ankY + uy * 5 + 1, ankX + ux * 8, ankY + uy * 8 + 1.4)
    ctx.lineTo(ankX - uy * 1.8, ankY + ux * 1.8)
    ctx.closePath()
    ctx.fill()
  }

  // --- the FAR side first, in shadow: arm, then leg ---
  ctx.strokeStyle = body.deep
  ctx.lineWidth = armUp - 0.4
  if (stone) {
    ctx.beginPath() // far arm reaching to the stone
    ctx.moveTo(13, 0)
    ctx.quadraticCurveTo(21, 2.6, 28.5, 4.6)
    ctx.stroke()
  } else if (!striking && strokeMode === 'breast') {
    var fhx = SD.lerp(31.5, 13, pull) // far arm working its own pull, in shadow
    var fhy = SD.lerp(6.4, 10.5, pull) + dip
    ctx.beginPath()
    ctx.moveTo(13, 0.5)
    ctx.quadraticCurveTo(SD.lerp(20.5, 16.5, pull), SD.lerp(4.6, 8, pull) + dip * 0.5, fhx, fhy)
    ctx.stroke()
    ctx.fillStyle = body.deep
    ctx.beginPath()
    ctx.ellipse(fhx + 0.6, fhy + 0.2, 1.9, 1.4, 0.2, 0, SD.TAU)
    ctx.fill()
  } else if (!striking) {
    ctx.beginPath() // far arm gliding along the flank
    ctx.moveTo(13, -0.5)
    ctx.quadraticCurveTo(2, 5.4, -9.5, 7)
    ctx.stroke()
    ctx.fillStyle = body.deep
    ctx.beginPath()
    ctx.ellipse(-10.5, 7.2, 2.1, 1.6, 0.3, 0, SD.TAU)
    ctx.fill()
  } else {
    ctx.beginPath() // far arm braced back during the strike
    ctx.moveTo(13, -0.5)
    ctx.quadraticCurveTo(3, 4.6, -6.5, 5.4)
    ctx.stroke()
  }
  if (strokeMode === 'breast') frogLeg(tuckFar, -0.9, { skin: body.deep })
  else if (strokeMode === 'dolphin') leg(kneeK + 0.12, { skin: body.deep }, 1, ankK + 0.12)
  else leg(-kick, { skin: body.deep }, 1)

  // --- the net bag, slung at the small of the back ---
  var wt = SD.bagWeight(p.bag)
  if (wt > 0) {
    var br = 4.2 + Math.min(10, wt) * 0.75
    var bagY = 6.5 + br * 0.5
    ctx.fillStyle = 'rgba(52, 38, 22, 0.92)'
    ctx.beginPath()
    ctx.ellipse(-19, bagY, br, br * 0.72, 0.35, 0, SD.TAU)
    ctx.fill()
    ctx.strokeStyle = 'rgba(58, 42, 24, 0.9)' // its draw-cord up to the hip
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.moveTo(-14, 3)
    ctx.lineTo(-17.5, bagY - br * 0.5)
    ctx.stroke()
    ctx.strokeStyle = 'rgba(210, 190, 150, 0.38)'
    ctx.lineWidth = 0.9
    for (var n = -1; n <= 1; n++) {
      ctx.beginPath()
      ctx.moveTo(-19 - br * 0.62, bagY - 1 + n * 2.4)
      ctx.quadraticCurveTo(-19, bagY + 2 + n * 2, -19 + br * 0.62, bagY - 1 + n * 2.4)
      ctx.stroke()
    }
  }

  // the slung kamaki (golden trident, once claimed) rides the back
  if ((state.upgrades.kamaki > 0 || state.tridentClaimed) && !striking) {
    ctx.strokeStyle = state.tridentClaimed ? '#8a6d1c' : '#6b4a26'
    ctx.lineWidth = state.tridentClaimed ? 2.6 : 2
    ctx.beginPath()
    ctx.moveTo(-26, -2)
    ctx.lineTo(18, -9.5)
    ctx.stroke()
    ctx.strokeStyle = state.tridentClaimed ? GOLD : '#c9c2b4'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(18, -9.5)
    ctx.lineTo(22.5, -11)
    ctx.moveTo(18, -9.5)
    ctx.lineTo(23, -9.3)
    ctx.moveTo(18, -9.5)
    ctx.lineTo(22, -7.8)
    ctx.stroke()
  }

  // --- the body: torso, hips and glutes as ONE silhouette ---
  ctx.fillStyle = body.skin
  ctx.beginPath()
  ctx.moveTo(16.5, -sh + 0.6)                                  // trapezius
  ctx.quadraticCurveTo(4, -sh - 1.4, -7, -wa - 2.2)            // the long back
  ctx.bezierCurveTo(-14.5, -wa - 1.4, -20.5, -wa * 0.25 - 1, -19.5, 2.4) // hip + glute
  ctx.quadraticCurveTo(-18.6, wa + 1.8, -11.5, wa + 1.9)       // under the pelvis
  var belly = fit < 0.4 ? (0.4 - fit) * 5 : 0
  ctx.quadraticCurveTo(0, wa + 2.6 + belly, 9, sh * 0.62 + 1.6) // the belly line
  ctx.quadraticCurveTo(15.5, sh * 0.5, 17.6, 1.6)              // chest into the shoulder
  ctx.quadraticCurveTo(19.4, -1.4, 18.2, -3.8)                 // the neck
  ctx.quadraticCurveTo(17.8, -sh + 0.2, 16.5, -sh + 0.6)
  ctx.closePath()
  ctx.fill()

  // musculature, earned: lat line, pec edge, abs
  if (defA > 0.05) {
    ctx.strokeStyle = body.deep
    ctx.globalAlpha = defA
    ctx.lineWidth = 1.1
    ctx.beginPath() // the lat sweep
    ctx.moveTo(12, -sh * 0.55)
    ctx.quadraticCurveTo(-2, -wa * 0.4, -12, -wa * 0.5)
    ctx.stroke()
    ctx.beginPath() // pec
    ctx.moveTo(14.5, 1)
    ctx.quadraticCurveTo(11.5, 3.4, 8.5, sh * 0.5 + 1)
    ctx.stroke()
    if (fit > 0.5) {
      for (var ai = 0; ai < 3; ai++) {
        ctx.beginPath()
        ctx.moveTo(4.5 - ai * 3.6, wa * 0.2)
        ctx.lineTo(4.2 - ai * 3.6, wa * 0.8 + 1)
        ctx.stroke()
      }
    }
    ctx.globalAlpha = 1
  } else if (belly > 0) {
    ctx.fillStyle = body.deep
    ctx.globalAlpha = 0.2
    ctx.beginPath()
    ctx.ellipse(-1, wa * 0.6 + 1, 6.5, 2.6, 0.08, 0, SD.TAU)
    ctx.fill()
    ctx.globalAlpha = 1
  }
  // the wetsuit ends at the neck — a seam where hide meets skin
  if (state.relics.hide) {
    ctx.strokeStyle = 'rgba(228, 236, 240, 0.45)'
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.moveTo(18.4, -4.2)
    ctx.quadraticCurveTo(19.2, -1, 17.8, 1.8)
    ctx.stroke()
  }

  // --- the near leg, full tone ---
  if (strokeMode === 'breast') {
    frogLeg(tuck, 0.9, body)
  } else if (strokeMode === 'dolphin') {
    leg(kneeK, body, 1, ankK)
    // THE MONOFIN: god-tier fins are one great blade off both heels
    var mAnkY = 3.2 + ankK * 9.5
    var bend = Math.cos(p.swimPhase * 1.4 - 0.8) * -6.5 * amp // flexing against its own travel
    ctx.fillStyle = '#0e7a6e'
    ctx.beginPath()
    ctx.moveTo(-39.5, mAnkY - 2.8)
    ctx.quadraticCurveTo(-52, mAnkY - 8 + bend * 0.5, -64, mAnkY - 9.5 + bend)
    ctx.quadraticCurveTo(-69, mAnkY + bend * 1.15, -64, mAnkY + 9.5 + bend)
    ctx.quadraticCurveTo(-52, mAnkY + 8 + bend * 0.5, -39.5, mAnkY + 2.8)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.6)' // the god-tier trim line
    ctx.lineWidth = 1.1
    ctx.beginPath()
    ctx.moveTo(-41.5, mAnkY - 2.2)
    ctx.quadraticCurveTo(-53, mAnkY - 6.5 + bend * 0.5, -63, mAnkY - 8 + bend)
    ctx.stroke()
    ctx.fillStyle = '#241a12' // one shared foot pocket
    ctx.beginPath()
    ctx.ellipse(-40.5, mAnkY, 3.8, 2.8, ankK * 0.1, 0, SD.TAU)
    ctx.fill()
  } else {
    leg(kick, body, 1)
  }

  // --- the perizoma, wrapped over the hips (over the suit, as divers did) ---
  ctx.strokeStyle = TERRA
  ctx.lineWidth = 6
  ctx.beginPath()
  ctx.moveTo(-9, -wa - 0.6)
  ctx.quadraticCurveTo(-12.2, 0.4, -9.8, wa + 1.2)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(243, 231, 201, 0.3)' // a fold catching light
  ctx.lineWidth = 1.3
  ctx.beginPath()
  ctx.moveTo(-10.2, -wa + 0.8)
  ctx.quadraticCurveTo(-11.8, 0.6, -10.4, wa - 0.4)
  ctx.stroke()
  ctx.fillStyle = '#c47048' // the knot at the small of the back
  ctx.beginPath()
  ctx.arc(-13.2, -wa - 0.8, 1.8, 0, SD.TAU)
  ctx.fill()
  var flut = Math.sin(p.swimPhase * 2.4 + 1.1) * 2.6
  ctx.strokeStyle = TERRA // one short tail streaming aft
  ctx.lineWidth = 2.2
  ctx.beginPath()
  ctx.moveTo(-13.2, -wa - 0.8)
  ctx.quadraticCurveTo(-18, -wa - 1.4 + flut * 0.6, -22.5, -wa - 0.6 + flut)
  ctx.stroke()

  // --- the near arm: steady, no flapping ---
  var handX
  var handY
  if (stone) {
    handX = 31
    handY = 5.5
    ctx.strokeStyle = body.skin
    ctx.lineWidth = armUp
    ctx.beginPath()
    ctx.moveTo(15, 1.5)
    ctx.quadraticCurveTo(23, 3.6, handX, handY)
    ctx.stroke()
    var sr = 3.6 + state.upgrades.stone * 1.1 // bigger tiers ride bigger stones
    ctx.fillStyle = '#7e8790' // the skandalopetra itself
    ctx.beginPath()
    ctx.ellipse(34.5, 6.4, sr + 1.8, sr, 0.35, 0, SD.TAU)
    ctx.fill()
    ctx.fillStyle = 'rgba(40, 48, 56, 0.4)' // its shaded under-face
    ctx.beginPath()
    ctx.ellipse(35.5, 7.6, sr * 0.6, sr * 0.4, 0.35, 0, SD.TAU)
    ctx.fill()
  } else if (striking) {
    handX = 36
    handY = 1.5
    ctx.strokeStyle = body.skin
    ctx.lineWidth = armUp
    ctx.beginPath()
    ctx.moveTo(15, 0.5)
    ctx.quadraticCurveTo(26, 1.2, handX, handY)
    ctx.stroke()
  } else {
    // at pull = 0 this is the calm level reach; the breaststroke
    // hauls the same arm down to the chest and back out again
    handX = SD.lerp(33, 13.5, pull)
    handY = SD.lerp(5.2, 9.5, pull) + dip
    var elbX = SD.lerp(24.5, 19, pull)
    var elbY = SD.lerp(4.8, 8, pull) + dip * 0.7
    ctx.strokeStyle = body.skin
    ctx.lineWidth = armUp
    ctx.beginPath() // upper arm
    ctx.moveTo(15, 1.5)
    ctx.quadraticCurveTo(SD.lerp(20.5, 17.5, pull), SD.lerp(3.8, 6.5, pull) + dip * 0.4, elbX, elbY)
    ctx.stroke()
    ctx.lineWidth = armLo
    ctx.beginPath() // forearm, reaching calm and level (or hauling water)
    ctx.moveTo(elbX - 0.5, elbY)
    ctx.quadraticCurveTo(SD.lerp(29, 16, pull), SD.lerp(5.4, 9.2, pull) + dip, handX, handY)
    ctx.stroke()
  }
  ctx.fillStyle = c.skin // the hand is always bare
  ctx.beginPath()
  ctx.ellipse(handX + 0.8, handY, 2.3, 1.7, 0.2, 0, SD.TAU)
  ctx.fill()

  // the knife, out when cutting
  var harvesting = state.harvestTarget && state.harvestTarget.progress > 0
  var knifeOut = state.upgrades.knife > 0 && (p.knifeFlash > 0 || harvesting) && !striking && !stone
  if (knifeOut) {
    ctx.fillStyle = '#5a3a1c'
    ctx.fillRect(handX - 0.5, handY - 1.3, 3.8, 2.6)
    ctx.fillStyle = '#e8d49a'
    ctx.beginPath()
    ctx.moveTo(handX + 3.2, handY - 1.5)
    ctx.lineTo(handX + 11.5, handY)
    ctx.lineTo(handX + 3.2, handY + 1.5)
    ctx.closePath()
    ctx.fill()
  }
  // the kamaki, driven forward on a strike — golden once the Trident is yours
  if (striking) {
    var ext = 26 + (0.35 - p.spearFlash) * 40
    ctx.strokeStyle = state.tridentClaimed ? '#8a6d1c' : '#6b4a26'
    ctx.lineWidth = state.tridentClaimed ? 3 : 2.4
    ctx.beginPath()
    ctx.moveTo(handX - 12, handY + 1.6)
    ctx.lineTo(handX + ext, handY)
    ctx.stroke()
    ctx.strokeStyle = state.tridentClaimed ? GOLD : '#e8e2d4'
    ctx.lineWidth = 1.8
    ctx.beginPath()
    ctx.moveTo(handX + ext, handY)
    ctx.lineTo(handX + ext + 7, handY - 3)
    ctx.moveTo(handX + ext, handY)
    ctx.lineTo(handX + ext + 8.5, handY)
    ctx.moveTo(handX + ext, handY)
    ctx.lineTo(handX + ext + 7, handY + 3)
    ctx.stroke()
    if (state.tridentClaimed) {
      ctx.strokeStyle = 'rgba(126, 228, 255, ' + (p.spearFlash * 1.6).toFixed(2) + ')'
      ctx.lineWidth = 5
      ctx.beginPath()
      ctx.moveTo(handX, handY)
      ctx.lineTo(handX + ext + 6, handY)
      ctx.stroke()
    }
  }

  // --- the head: a clean profile, bare of wreaths ---
  ctx.fillStyle = c.skin
  ctx.beginPath()
  ctx.arc(26.5, -4.5, 6.2, 0, SD.TAU) // the skull
  ctx.fill()
  ctx.beginPath() // brow, nose, lips, chin, jaw — one face
  ctx.moveTo(31.4, -7.4)
  ctx.quadraticCurveTo(32.6, -5.8, 32.4, -4.6)
  ctx.lineTo(34.3, -2.9)   // the nose
  ctx.lineTo(31.9, -2.2)
  ctx.lineTo(32.3, -1.1)   // lips
  ctx.lineTo(31.3, -0.6)
  ctx.quadraticCurveTo(31.6, 1, 29.6, 1.6) // chin
  ctx.quadraticCurveTo(26, 2.6, 22.5, 1.2) // jaw back to the neck
  ctx.lineTo(21, -2)
  ctx.closePath()
  ctx.fill()
  if (fit > 0.4) { // a jawline you could moor a boat to
    ctx.strokeStyle = c.deep
    ctx.globalAlpha = 0.3
    ctx.lineWidth = 1.1
    ctx.beginPath()
    ctx.moveTo(23.5, 1.4)
    ctx.quadraticCurveTo(27.5, 2.2, 29.8, 0.8)
    ctx.stroke()
    ctx.globalAlpha = 1
  }

  // short dark curls, cropped like a working diver's
  ctx.fillStyle = '#241a12'
  ctx.beginPath() // a tight working crop, hugging the skull
  ctx.arc(26.3, -5.2, 6.4, Math.PI * 0.82, Math.PI * 1.88)
  ctx.quadraticCurveTo(31, -9.2, 31.2, -7)
  ctx.quadraticCurveTo(27.5, -7.8, 24.5, -5.6)
  ctx.closePath()
  ctx.fill()
  ctx.beginPath()
  ctx.arc(21.6, -4.6, 1.9, 0, SD.TAU)  // nape curl
  ctx.arc(24.2, -9.6, 1.7, 0, SD.TAU)  // crown curls
  ctx.arc(28.2, -9.6, 1.5, 0, SD.TAU)
  ctx.fill()

  if (state.upgrades.light > 0) {
    // olive-oil goggles: one bronze-rimmed lens, a slim strap into the hair
    ctx.strokeStyle = '#241a12'
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.moveTo(22, -6.4)
    ctx.quadraticCurveTo(26, -7.6, 29.2, -6.6)
    ctx.stroke()
    ctx.fillStyle = 'rgba(154, 212, 232, 0.78)'
    ctx.beginPath()
    ctx.ellipse(30.3, -4.7, 2.3, 1.9, 0.1, 0, SD.TAU)
    ctx.fill()
    ctx.strokeStyle = '#8f7135'
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
    ctx.beginPath()
    ctx.arc(29.6, -5.3, 0.65, 0, SD.TAU)
    ctx.fill()
  } else {
    // the bare eye, forward and hunting
    ctx.fillStyle = '#241a12'
    ctx.beginPath()
    ctx.ellipse(30, -4.7, 1.15, 0.85, 0.1, 0, SD.TAU)
    ctx.fill()
    ctx.strokeStyle = '#241a12' // brow
    ctx.lineWidth = 0.9
    ctx.beginPath()
    ctx.moveTo(28.6, -6.4)
    ctx.lineTo(31.4, -5.9)
    ctx.stroke()
  }

  ctx.restore()
}

// ---------- Delphinus' Gift: the dolphin and the orca ----------

// Side effect: the player in Delphinus' shape. Same motion language as the
// diver — velocity-aligned, back kept up — but the tail is a MAMMAL's, and
// in a breach the whole body somersaults through the open air (p.flipA).
function drawMarineForm (ctx, state, t) {
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
  if (Math.cos(p._ang) < 0) ctx.scale(1, -1) // back stays up heading west
  if (p.breachT > 0) ctx.rotate(p.flipA)     // the somersault rides on top

  var beat = Math.sin(p.swimPhase * 2.1) * (speed > 25 ? 1 : 0.3)
  if (p.form === 'orca') drawOrcaBody(ctx, beat)
  else drawDolphinBody(ctx, beat)

  // the net bag still rides along — no hands, but the strap holds
  var wt = SD.bagWeight(p.bag)
  if (wt > 0) {
    var br = 3.6 + Math.min(10, wt) * 0.6
    ctx.fillStyle = 'rgba(52, 38, 22, 0.92)'
    ctx.beginPath()
    ctx.ellipse(-16, 9 + br * 0.4, br, br * 0.7, 0.3, 0, SD.TAU)
    ctx.fill()
    ctx.strokeStyle = 'rgba(58, 42, 24, 0.9)'
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.moveTo(-10, 5)
    ctx.lineTo(-15, 8 + br * 0.2)
    ctx.stroke()
  }
  ctx.restore()
}

// Side effect: the dolphin — a sleek spindle with a bottlenose, a falcate
// dorsal, and a fluke that beats UP AND DOWN, the mammal's stroke
function drawDolphinBody (ctx, beat) {
  ctx.save()
  // the fluke first, behind the body — twin lobes on a flexing stock
  ctx.fillStyle = '#4a5a66'
  ctx.save()
  ctx.translate(-36, beat * 6)
  ctx.rotate(beat * 0.3)
  ctx.beginPath()
  ctx.moveTo(2, 0)
  ctx.quadraticCurveTo(-8, -11, -16, -8)   // upper lobe
  ctx.quadraticCurveTo(-8, -2, -14, 0)     // the notch
  ctx.quadraticCurveTo(-8, 2, -16, 8)      // lower lobe
  ctx.quadraticCurveTo(-6, 11, 2, 2)
  ctx.closePath()
  ctx.fill()
  ctx.restore()

  // the body: one smooth spindle, nose to tail stock
  ctx.fillStyle = '#5f7280'
  ctx.beginPath()
  ctx.moveTo(38, 0.5)                           // the nose tip
  ctx.quadraticCurveTo(31, -3.5, 21, -5.5)      // the melon
  ctx.quadraticCurveTo(4, -8.5, -12, -6.5)      // the back
  ctx.quadraticCurveTo(-26, -4.5, -35, -1.5)    // to the tail stock
  ctx.lineTo(-35, 1.8)
  ctx.quadraticCurveTo(-20, 6.5, -2, 8)         // the belly
  ctx.quadraticCurveTo(18, 7.5, 30, 4)          // chest to chin
  ctx.quadraticCurveTo(36, 2.6, 38, 0.5)        // under the beak
  ctx.closePath()
  ctx.fill()
  // the falcate dorsal, swept back
  ctx.beginPath()
  ctx.moveTo(-1, -7)
  ctx.quadraticCurveTo(-7, -17, -14, -7.5)
  ctx.closePath()
  ctx.fill()
  // the pale belly
  ctx.fillStyle = 'rgba(211, 220, 225, 0.9)'
  ctx.beginPath()
  ctx.ellipse(3, 4.6, 25, 3.4, 0.03, 0, SD.TAU)
  ctx.fill()
  // pectoral flipper
  ctx.fillStyle = '#4a5a66'
  ctx.beginPath()
  ctx.moveTo(12, 4.5)
  ctx.quadraticCurveTo(6, 13, 0, 12)
  ctx.quadraticCurveTo(6, 7, 10, 3.5)
  ctx.closePath()
  ctx.fill()
  // the beak crease + the easy smile
  ctx.strokeStyle = 'rgba(40, 52, 60, 0.6)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(36, 1.6)
  ctx.quadraticCurveTo(28, 3.8, 22, 3.4)
  ctx.stroke()
  // eye + blowhole
  ctx.fillStyle = '#1a2228'
  ctx.beginPath()
  ctx.arc(24.5, -1, 1.4, 0, SD.TAU)
  ctx.fill()
  ctx.strokeStyle = '#1a2228'
  ctx.lineWidth = 1.4
  ctx.beginPath()
  ctx.moveTo(9, -7.2)
  ctx.lineTo(11.5, -7.4)
  ctx.stroke()
  ctx.restore()
}

// Side effect: THE ORCA — blunt-headed, black over white, the tall dorsal
// and the saddle patch. Half again the dolphin's size, and looks it.
function drawOrcaBody (ctx, beat) {
  ctx.save()
  // fluke behind, broad and heavy
  ctx.fillStyle = '#0d1116'
  ctx.save()
  ctx.translate(-46, beat * 7)
  ctx.rotate(beat * 0.28)
  ctx.beginPath()
  ctx.moveTo(3, 0)
  ctx.quadraticCurveTo(-9, -14, -20, -10)
  ctx.quadraticCurveTo(-10, -2, -18, 0)
  ctx.quadraticCurveTo(-10, 2, -20, 10)
  ctx.quadraticCurveTo(-8, 14, 3, 2)
  ctx.closePath()
  ctx.fill()
  ctx.restore()

  // the body: blunt nose, thick through the chest
  ctx.fillStyle = '#161c22'
  ctx.beginPath()
  ctx.moveTo(44, 1)                             // the blunt nose
  ctx.quadraticCurveTo(40, -6, 28, -9)          // brow
  ctx.quadraticCurveTo(4, -13, -16, -9.5)       // the long back
  ctx.quadraticCurveTo(-34, -6, -45, -2)        // tail stock
  ctx.lineTo(-45, 2.5)
  ctx.quadraticCurveTo(-26, 8.5, -4, 11.5)      // the belly
  ctx.quadraticCurveTo(22, 11.5, 37, 7)         // chest
  ctx.quadraticCurveTo(43, 4.5, 44, 1)
  ctx.closePath()
  ctx.fill()
  // THE dorsal — tall, proud, unmistakable
  ctx.beginPath()
  ctx.moveTo(-2, -10.5)
  ctx.quadraticCurveTo(-7, -34, -17, -11)
  ctx.closePath()
  ctx.fill()
  // the white: chin and belly...
  ctx.fillStyle = '#e8eef1'
  ctx.beginPath()
  ctx.moveTo(40, 3.5)
  ctx.quadraticCurveTo(20, 10.5, -2, 9.5)
  ctx.quadraticCurveTo(12, 5.5, 30, 2.5)
  ctx.quadraticCurveTo(37, 1.8, 40, 3.5)
  ctx.closePath()
  ctx.fill()
  // ...the flank blaze sweeping up behind the belly...
  ctx.beginPath()
  ctx.ellipse(-13, 4.5, 8, 3, -0.5, 0, SD.TAU)
  ctx.fill()
  // ...and the eye patch
  ctx.beginPath()
  ctx.ellipse(27, -5.5, 6.5, 2.6, -0.18, 0, SD.TAU)
  ctx.fill()
  // the gray saddle behind the dorsal
  ctx.fillStyle = '#8d99a2'
  ctx.beginPath()
  ctx.ellipse(-17, -6.5, 7, 2.8, -0.35, 0, SD.TAU)
  ctx.fill()
  // pectoral paddle, big and round
  ctx.fillStyle = '#0d1116'
  ctx.beginPath()
  ctx.ellipse(13, 12, 8.5, 4.5, 0.85 + beat * 0.1, 0, SD.TAU)
  ctx.fill()
  // the eye, low at the front of the patch
  ctx.fillStyle = '#0a0d10'
  ctx.beginPath()
  ctx.arc(31.5, -3.2, 1.5, 0, SD.TAU)
  ctx.fill()
  ctx.restore()
}

// Side effect: spent skandalopetra tumbling down, then fading into the sand
function drawDroppedStones (ctx, list) {
  if (!list) return // art-lab mocks carry no stone ledger
  for (var i = 0; i < list.length; i++) {
    var s = list[i]
    ctx.save()
    ctx.globalAlpha = s.settled ? Math.max(0, s.life / 4) * 0.9 : 0.95
    ctx.translate(s.x, s.y)
    ctx.rotate(s.spin)
    ctx.fillStyle = '#7e8790'
    ctx.beginPath()
    ctx.ellipse(0, 0, s.r + 1.6, s.r, 0.3, 0, SD.TAU)
    ctx.fill()
    ctx.fillStyle = 'rgba(40, 48, 56, 0.45)'
    ctx.beginPath()
    ctx.ellipse(1.2, 1.2, s.r * 0.6, s.r * 0.42, 0.3, 0, SD.TAU)
    ctx.fill()
    ctx.restore()
  }
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

// ---------- The Caves of Hephaestus ----------

// Side effect: the cut-out itself — the water-filled void of the Caves of
// Hephaestus, carved out of the ground body under the vents shelf. Main
// terrain above you (the slab's crusted underside, hung with stalactites)
// and main terrain below you (a sand-crusted cave floor). Sampled on the
// same fixed world grid as drawFloor so the steep faces never warp.
function drawHephVoid (ctx, cam, wv, t) {
  var hz = SD.config.world.hephCaves
  var step = 24
  var x0 = Math.max(hz.x1, Math.floor((cam.x - 60) / step) * step)
  var x1 = Math.min(hz.x2, cam.x + wv.w + 60)
  if (x1 - x0 < step) return
  var x

  // Pure: the void's top edge — the slab's underside, or the shaft wall
  // where the mouth pierces it
  function topAt (tx) { return Math.max(SD.caveRoofYAt(tx), SD.floorYAt(tx)) }

  ctx.save()
  // the water inside the cut, darker with depth like the open sea
  var water = ctx.createLinearGradient(0, 84 * 32, 0, 108 * 32)
  water.addColorStop(0, '#0a294b')
  water.addColorStop(1, '#061933')
  ctx.fillStyle = water
  ctx.beginPath()
  ctx.moveTo(x0, topAt(x0))
  for (x = x0 + step; x <= x1; x += step) ctx.lineTo(x, topAt(x))
  ctx.lineTo(x1, topAt(x1))
  ctx.lineTo(x1, SD.caveFloorYAt(x1))
  for (x = x1; x >= x0; x -= step) ctx.lineTo(x, SD.caveFloorYAt(x))
  ctx.lineTo(x0, SD.caveFloorYAt(x0))
  ctx.closePath()
  ctx.fill()

  // the cave floor wears the same sand crust as the world above
  ctx.lineCap = 'round'
  ctx.strokeStyle = 'rgba(214, 190, 140, 0.12)'
  ctx.lineWidth = 13
  ctx.beginPath()
  for (x = x0; x <= x1; x += step) {
    var fy2 = SD.caveFloorYAt(x) + 6
    if (x === x0) ctx.moveTo(x, fy2)
    else ctx.lineTo(x, fy2)
  }
  ctx.stroke()
  ctx.strokeStyle = 'rgba(228, 206, 158, 0.3)'
  ctx.lineWidth = 3.5
  ctx.beginPath()
  for (x = x0; x <= x1; x += step) {
    var fy = SD.caveFloorYAt(x)
    if (x === x0) ctx.moveTo(x, fy)
    else ctx.lineTo(x, fy)
  }
  ctx.stroke()

  // the slab's underside wears the mountain's pale crust...
  ctx.strokeStyle = 'rgba(150, 182, 196, 0.22)'
  ctx.lineWidth = 3
  ctx.beginPath()
  for (x = x0; x <= x1; x += step) {
    var cy = topAt(x)
    if (x === x0) ctx.moveTo(x, cy)
    else ctx.lineTo(x, cy)
  }
  ctx.stroke()
  // ...and stalactites, deterministic so they never dance — only where the
  // roof really is the slab, not the pierced shaft wall
  ctx.fillStyle = '#101c2a'
  for (x = Math.floor(x0 / 110) * 110; x < x1; x += 110) {
    if (x < hz.x1 + 40) continue
    if (SD.caveRoofYAt(x) < SD.floorYAt(x)) continue
    var h = Math.abs(Math.sin(x * 0.713)) * 18 + 6
    var cy2 = SD.caveRoofYAt(x)
    ctx.beginPath()
    ctx.moveTo(x - 7, cy2 - 1)
    ctx.lineTo(x, cy2 + h)
    ctx.lineTo(x + 7, cy2 - 1)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
}

// Side effect: one pocket of trapped air in a cave dome. Air obeys the
// rock: it fills EVERY curve of the carved roof above the spill line —
// the fill hugs the dome and tapers to nothing exactly where the roof
// dips to the waterline, which laps dead flat from wall to wall.
function drawAirPocket (ctx, pk, t) {
  var x
  ctx.save()
  // the air body: the carved roof above, the trapped waterline below
  var air = ctx.createLinearGradient(0, pk.topY, 0, pk.surfaceY)
  air.addColorStop(0, '#0a0d10')
  air.addColorStop(1, '#2b333a')
  ctx.fillStyle = air
  ctx.beginPath()
  ctx.moveTo(pk.x1, pk.surfaceY)
  for (x = pk.x1; x <= pk.x2; x += 10) {
    ctx.lineTo(x, Math.min(SD.caveRoofYAt(x) + 2, pk.surfaceY))
  }
  ctx.lineTo(pk.x2, pk.surfaceY)
  ctx.closePath()
  ctx.fill()
  // the waterline, silver in the gloom — only where there is air above it
  ctx.strokeStyle = 'rgba(190, 225, 235, 0.45)'
  ctx.lineWidth = 2
  ctx.beginPath()
  var pen = false
  for (x = pk.x1; x <= pk.x2; x += 12) {
    if (SD.caveRoofYAt(x) < pk.surfaceY - 5) {
      var wy = pk.surfaceY + Math.sin(x * 0.05 + t * 2.1) * 1.4
      if (!pen) { ctx.moveTo(x, wy); pen = true } else ctx.lineTo(x, wy)
    } else {
      pen = false
    }
  }
  ctx.stroke()
  // stray bubbles clinging to the rock of the dome — proof the air is real
  ctx.strokeStyle = 'rgba(230, 245, 250, 0.35)'
  ctx.lineWidth = 1.2
  ctx.beginPath()
  for (var b = 0; b < 4; b++) {
    var bx = pk.x1 + 30 + ((b * 73 + 40) % Math.max(pk.x2 - pk.x1 - 60, 1))
    var roofY = SD.caveRoofYAt(bx)
    if (roofY > pk.surfaceY - 10) continue // no head-room at the taper
    var by = roofY + 6 + Math.sin(t * 1.6 + b * 2.1) * 1.5
    ctx.moveTo(bx + 2 + (b % 2), by)
    ctx.arc(bx, by, 2 + (b % 2), 0, SD.TAU)
  }
  ctx.stroke()
  // the smith's wall torches, burning in the trapped air
  for (var ti = 0; ti < pk.torches.length; ti++) {
    drawTorch(ctx, pk.torches[ti].x, pk.torches[ti].y, t, ti * 3 + (pk.crownX % 7), pk.torches[ti].x < pk.crownX ? 1 : -1)
  }
  ctx.restore()
}

// Side effect: a wall torch socketed into a dome's rock, leaning into the
// air pocket — the flame burns above the waterline, as fire must
function drawTorch (ctx, tx, ty, t, i, lean) {
  var flick = 0.6 + Math.sin(t * 8 + i * 2.7) * 0.25 + Math.sin(t * 13.1 + i * 1.3) * 0.15
  var hx = tx + lean * 7
  var hy = ty + 15
  ctx.save()
  // warm light spilling through the pocket
  var g = ctx.createRadialGradient(hx, hy - 4, 3, hx, hy - 4, 85)
  g.addColorStop(0, 'rgba(255, 175, 85, ' + (0.32 + flick * 0.14).toFixed(2) + ')')
  g.addColorStop(1, 'rgba(255, 175, 85, 0)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(hx, hy - 4, 85, 0, SD.TAU)
  ctx.fill()
  // the bronze bracket, pinned into the rock
  ctx.strokeStyle = '#6b5030'
  ctx.lineWidth = 3
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(tx, ty + 1)
  ctx.lineTo(hx, hy)
  ctx.stroke()
  // the wrapped head
  ctx.fillStyle = '#3a2c20'
  ctx.beginPath()
  ctx.ellipse(hx, hy, 3.4, 4.6, lean * 0.3, 0, SD.TAU)
  ctx.fill()
  // the flame, always upward
  ctx.fillStyle = 'rgba(255, 210, 120, ' + (0.72 + flick * 0.2).toFixed(2) + ')'
  ctx.beginPath()
  ctx.ellipse(hx, hy - 8 - flick * 2, 3, 6 + flick * 2.5, 0, 0, SD.TAU)
  ctx.fill()
  ctx.fillStyle = 'rgba(255, 240, 180, 0.85)'
  ctx.beginPath()
  ctx.ellipse(hx, hy - 6, 1.4, 2.6, 0, 0, SD.TAU)
  ctx.fill()
  ctx.restore()
}

// Side effect: the smith's workplace on the dry ledge — a stone hearth with
// a live fire, the anvil on its stump, a quench pot, and finished work
// leaning on the wall. fx is the ledge crown x; each prop seats itself.
function drawForgeSet (ctx, fx, t) {
  var flick = 0.55 + Math.sin(t * 7.3) * 0.28 + Math.sin(t * 11.7) * 0.17
  var hx = fx - 56
  var hy = SD.caveFloorYAt(hx)
  var ax = fx + 22
  var ay = SD.caveFloorYAt(ax)
  ctx.save()

  // firelight pooling over the whole ledge
  var pool = ctx.createRadialGradient(hx, hy - 30, 8, hx, hy - 30, 240)
  pool.addColorStop(0, 'rgba(255, 160, 70, ' + (0.22 + flick * 0.1).toFixed(2) + ')')
  pool.addColorStop(1, 'rgba(255, 160, 70, 0)')
  ctx.fillStyle = pool
  ctx.beginPath()
  ctx.arc(hx, hy - 30, 240, 0, SD.TAU)
  ctx.fill()

  // the hearth: stacked stone around an ember bed
  ctx.fillStyle = '#242028'
  ctx.beginPath()
  ctx.moveTo(hx - 26, hy)
  ctx.lineTo(hx - 20, hy - 16)
  ctx.lineTo(hx - 8, hy - 22)
  ctx.lineTo(hx + 10, hy - 21)
  ctx.lineTo(hx + 20, hy - 14)
  ctx.lineTo(hx + 26, hy)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = 'rgba(255, 120, 40, ' + (0.55 + flick * 0.3).toFixed(2) + ')' // embers
  ctx.beginPath()
  ctx.ellipse(hx, hy - 20, 12, 4, 0, 0, SD.TAU)
  ctx.fill()
  ctx.fillStyle = 'rgba(255, 210, 120, ' + (0.75 + flick * 0.2).toFixed(2) + ')' // the flame
  ctx.beginPath()
  ctx.ellipse(hx, hy - 27 - flick * 3, 5, 8 + flick * 3, 0, 0, SD.TAU)
  ctx.fill()

  // the anvil on its stump, horn toward the fire
  ctx.fillStyle = '#3a2c20'
  ctx.fillRect(ax - 7, ay - 14, 14, 14)
  ctx.fillStyle = '#2c313a'
  ctx.fillRect(ax - 16, ay - 24, 32, 10)
  ctx.beginPath()
  ctx.moveTo(ax - 16, ay - 24)
  ctx.quadraticCurveTo(ax - 30, ay - 24, ax - 32, ay - 18)
  ctx.quadraticCurveTo(ax - 24, ay - 16, ax - 16, ay - 15)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = 'rgba(160, 190, 210, 0.5)' // the worn face, catching fire-light
  ctx.fillRect(ax - 14, ay - 24, 28, 2)

  // embers riding the heat off the hearth, dying as they climb
  for (var e = 0; e < 5; e++) {
    var rise = (t * 26 + e * 23) % 64
    var ea = (1 - rise / 64) * (0.35 + flick * 0.25)
    ctx.fillStyle = 'rgba(255, 170, 80, ' + ea.toFixed(2) + ')'
    ctx.beginPath()
    ctx.arc(hx + Math.sin(rise * 0.14 + e * 1.7) * 5, hy - 26 - rise, 1.2 + (e % 2) * 0.6, 0, SD.TAU)
    ctx.fill()
  }

  // quench pot + a finished spear leaning on the wall
  ctx.fillStyle = '#4a3320'
  ctx.beginPath()
  ctx.ellipse(fx + 52, SD.caveFloorYAt(fx + 52) - 7, 8, 7, 0, 0, SD.TAU)
  ctx.fill()
  ctx.strokeStyle = 'rgba(220, 235, 240, 0.18)' // steam still curling off it
  ctx.lineWidth = 2.2
  ctx.beginPath()
  ctx.moveTo(fx + 50, SD.caveFloorYAt(fx + 52) - 14)
  ctx.quadraticCurveTo(fx + 47 + Math.sin(t * 1.3) * 3, SD.caveFloorYAt(fx + 52) - 24, fx + 51, SD.caveFloorYAt(fx + 52) - 33)
  ctx.moveTo(fx + 55, SD.caveFloorYAt(fx + 52) - 13)
  ctx.quadraticCurveTo(fx + 58 + Math.sin(t * 1.7 + 2) * 3, SD.caveFloorYAt(fx + 52) - 22, fx + 55, SD.caveFloorYAt(fx + 52) - 29)
  ctx.stroke()
  ctx.strokeStyle = '#8a6d1c'
  ctx.lineWidth = 2.4
  ctx.beginPath()
  ctx.moveTo(fx + 68, SD.caveFloorYAt(fx + 68) - 2)
  ctx.lineTo(fx + 58, SD.caveFloorYAt(fx + 58) - 44)
  ctx.stroke()
  ctx.restore()
}

// Side effect: HEPHAESTUS at his anvil — soot-dark curls and a great beard
// under the workman's pilos, an exomis knotted off the hammer shoulder, a
// scarred leather apron over it, forearms like mooring posts. The sound leg
// is braced into the strike; the lame one rests turned on its block, ringed
// by the golden brace he forged for himself. The whole west side of him is
// rimmed in his own firelight. He raises the hammer on a slow cycle and
// brings it down in sparks. Peaceful: the smith fights nobody. He works.
function drawHephaestus (ctx, g, t) {
  var cycle = (t + (g.phase || 0)) % 2.6
  var lift = cycle < 1.3 ? SD.smoothstep(0, 1, cycle / 1.3)
    : cycle < 1.45 ? 1 - SD.smoothstep(0, 1, (cycle - 1.3) / 0.15)
      : 0
  var falling = cycle >= 1.3 && cycle < 1.55
  var struck = cycle >= 1.45 && cycle < 1.8
  var breathe = Math.sin(t * 1.1) * 1.2
  var emberGlow = 0.6 + Math.sin(t * 9) * 0.2

  ctx.save()
  ctx.translate(g.x, g.y)
  ctx.scale(-1, 1) // he faces west, toward anvil and hearth

  var skin = '#a86e46' // forge-tanned, soot in the creases
  var deep = '#7c4e30'
  var cloth = '#9c8c74' // undyed wool, long past white
  var leather = '#46331f'
  ctx.lineCap = 'round'

  // grounded: a contact shadow under the working stance
  ctx.fillStyle = 'rgba(4, 8, 14, 0.3)'
  ctx.beginPath()
  ctx.ellipse(-2, -0.5, 26, 4, 0, 0, SD.TAU)
  ctx.fill()

  // the block under his lame foot, its top edge catching the fire
  ctx.fillStyle = '#33302c'
  ctx.fillRect(-24, -9, 17, 9)
  ctx.fillStyle = 'rgba(255, 160, 70, 0.22)'
  ctx.fillRect(-24, -9, 17, 1.6)

  // — legs: the lame one first, turned on its block, wearing the golden
  //   shin-brace the smith made for himself —
  ctx.strokeStyle = deep
  ctx.lineWidth = 7
  ctx.beginPath()
  ctx.moveTo(-5, -30)
  ctx.quadraticCurveTo(-14, -24, -15.5, -16)
  ctx.quadraticCurveTo(-16, -12.5, -16.5, -10)
  ctx.stroke()
  ctx.fillStyle = deep
  ctx.beginPath() // the turned foot, heel up on the block
  ctx.ellipse(-17.5, -10.2, 5.2, 2.2, -0.35, 0, SD.TAU)
  ctx.fill()
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.8)' // the golden brace
  ctx.lineWidth = 1.6
  ctx.beginPath()
  ctx.moveTo(-13.2, -16.5)
  ctx.lineTo(-14.4, -11)
  ctx.stroke()

  ctx.strokeStyle = skin // the sound leg, planted into the blow
  ctx.lineWidth = 9.5
  ctx.beginPath()
  ctx.moveTo(0, -30)
  ctx.lineTo(9, -15)
  ctx.lineTo(10, -1.5)
  ctx.stroke()
  ctx.fillStyle = skin
  ctx.beginPath()
  ctx.ellipse(12.5, -1.2, 6, 2.4, 0, 0, SD.TAU)
  ctx.fill()

  // — the far arm first: elbow bent, tongs pinning the work to the anvil —
  ctx.strokeStyle = deep
  ctx.lineWidth = 7.5
  ctx.beginPath() // upper arm
  ctx.moveTo(7, -53)
  ctx.quadraticCurveTo(17, -48, 21, -42)
  ctx.stroke()
  ctx.lineWidth = 6
  ctx.beginPath() // forearm to the grip
  ctx.moveTo(21, -42)
  ctx.quadraticCurveTo(26, -37, 28.5, -32)
  ctx.stroke()
  ctx.strokeStyle = '#2c313a' // the tongs, jaws just apart on the billet
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(28.5, -32.5)
  ctx.lineTo(36.5, -28.8)
  ctx.moveTo(28.5, -30.8)
  ctx.lineTo(36.5, -26)
  ctx.stroke()
  // the billet: white-hot in the instant after the strike, cooling orange
  var heat = struck ? 1 - (cycle - 1.45) / 0.5 : 0
  ctx.fillStyle = 'rgba(255, ' + Math.round(150 + heat * 90) + ', ' +
    Math.round(60 + heat * 140) + ', ' + (0.7 + emberGlow * 0.2).toFixed(2) + ')'
  ctx.beginPath()
  ctx.ellipse(40, -26.5, 5.5, 2.1, 0.12, 0, SD.TAU)
  ctx.fill()

  // — the torso: a smith's wedge, leaning into the work —
  ctx.fillStyle = skin
  ctx.beginPath()
  ctx.moveTo(-15, -30)
  ctx.quadraticCurveTo(-20 - breathe, -46, -11, -57) // the broad back
  ctx.lineTo(12, -59)                                // the yoke of the shoulders
  ctx.quadraticCurveTo(21 + breathe, -51, 18, -34)   // chest, toward the fire
  ctx.quadraticCurveTo(1, -25, -15, -30)             // the waist
  ctx.closePath()
  ctx.fill()

  // the exomis, knotted off the hammer shoulder — the chest stays bare
  ctx.fillStyle = cloth
  ctx.beginPath()
  ctx.moveTo(-13, -57)
  ctx.quadraticCurveTo(-18 - breathe * 0.6, -45, -14.5, -30)
  ctx.quadraticCurveTo(0, -23.5, 16, -32)
  ctx.lineTo(9, -42)
  ctx.quadraticCurveTo(0, -52, -5, -58)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = 'rgba(30, 22, 14, 0.35)' // folds, and old soot
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.moveTo(-8, -50)
  ctx.quadraticCurveTo(-6, -40, -8, -32)
  ctx.moveTo(2, -44)
  ctx.quadraticCurveTo(4, -37, 2, -30)
  ctx.stroke()

  // the leather apron over it, scarred by a life of sparks
  ctx.fillStyle = leather
  ctx.beginPath()
  ctx.moveTo(-9, -34)
  ctx.lineTo(13, -35)
  ctx.lineTo(16, -14)
  ctx.quadraticCurveTo(2, -8, -11, -13)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = 'rgba(255, 160, 70, 0.16)' // fire-sheen down its edge
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(13.6, -33)
  ctx.lineTo(15.8, -16)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(20, 12, 6, 0.6)' // spark scars
  ctx.lineWidth = 1.1
  ctx.beginPath()
  ctx.moveTo(-2, -26)
  ctx.lineTo(1, -23)
  ctx.moveTo(7, -20)
  ctx.lineTo(9, -17)
  ctx.stroke()

  // — the head: heavy brow bent to the work —
  ctx.fillStyle = skin
  ctx.beginPath()
  ctx.arc(9, -67, 8, 0, SD.TAU)
  ctx.fill()
  ctx.beginPath() // brow + nose, running down into the beard
  ctx.moveTo(15.5, -72)
  ctx.quadraticCurveTo(17.6, -70.5, 17.2, -68.6)
  ctx.lineTo(19.8, -66.2)
  ctx.lineTo(16.6, -64.8)
  ctx.lineTo(16.8, -62.5)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#f3e0c8' // the eye, fixed down on the billet
  ctx.beginPath()
  ctx.arc(14.4, -67.6, 2, 0, SD.TAU)
  ctx.fill()
  ctx.fillStyle = '#241a12'
  ctx.beginPath()
  ctx.arc(15.1, -67, 1, 0, SD.TAU)
  ctx.fill()
  ctx.strokeStyle = '#241a12' // the heavy brow
  ctx.lineWidth = 1.8
  ctx.beginPath()
  ctx.moveTo(11.8, -70.8)
  ctx.lineTo(16.8, -70)
  ctx.stroke()

  // the great beard, warm at its fire edge
  ctx.fillStyle = '#2a1c12'
  ctx.beginPath()
  ctx.moveTo(16.5, -63.5)
  ctx.quadraticCurveTo(19, -56, 13, -48)
  ctx.quadraticCurveTo(6, -43.5, 0, -47)
  ctx.quadraticCurveTo(-3.5, -52, -1, -59)
  ctx.quadraticCurveTo(2, -63, 6, -62.5)
  ctx.quadraticCurveTo(11, -62, 16.5, -63.5)
  ctx.closePath()
  ctx.fill()
  ctx.beginPath() // its curls
  ctx.arc(4, -47.5, 3, 0, SD.TAU)
  ctx.arc(10, -48.5, 3.2, 0, SD.TAU)
  ctx.fill()
  ctx.strokeStyle = 'rgba(255, 150, 60, 0.28)' // the forge in his beard
  ctx.lineWidth = 1.4
  ctx.beginPath()
  ctx.moveTo(16.6, -61)
  ctx.quadraticCurveTo(17.8, -54, 13.5, -49)
  ctx.stroke()

  // curls at the nape, escaping the cap
  ctx.fillStyle = '#241a12'
  ctx.beginPath()
  ctx.arc(2, -70, 4.2, 0, SD.TAU)
  ctx.arc(5.5, -73, 3.6, 0, SD.TAU)
  ctx.fill()

  // the pilos, the workman's felt cone
  ctx.fillStyle = '#b3a486'
  ctx.beginPath()
  ctx.moveTo(0.5, -72.5)
  ctx.quadraticCurveTo(2, -84, 8.5, -84.5)
  ctx.quadraticCurveTo(15, -83.5, 15.8, -72.8)
  ctx.quadraticCurveTo(8, -76.5, 0.5, -72.5)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = 'rgba(60, 48, 32, 0.3)' // its shaded back
  ctx.beginPath()
  ctx.moveTo(0.5, -72.5)
  ctx.quadraticCurveTo(2, -84, 8.5, -84.5)
  ctx.quadraticCurveTo(5, -80, 3.8, -74)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = 'rgba(255, 160, 70, 0.3)' // fire edge on the felt
  ctx.lineWidth = 1.3
  ctx.beginPath()
  ctx.moveTo(15.4, -73.6)
  ctx.quadraticCurveTo(14.6, -81, 9, -84)
  ctx.stroke()

  // the fire finds every edge of him it can reach
  ctx.strokeStyle = 'rgba(255, 165, 75, 0.35)'
  ctx.lineWidth = 1.6
  ctx.beginPath()
  ctx.moveTo(18.5, -36)
  ctx.quadraticCurveTo(21 + breathe, -50, 12.5, -58.5) // chest into the shoulder
  ctx.moveTo(11.5, -14)
  ctx.lineTo(12.2, -3)                                 // the braced shin
  ctx.stroke()

  // — the hammer arm: a real shoulder, a real elbow, a slow raise
  //   and a hard fall —
  var elbX = SD.lerp(13, -8, lift)
  var elbY = SD.lerp(-46, -70, lift)
  var handX = SD.lerp(27, -15, lift)
  var handY = SD.lerp(-37, -84, lift) - Math.sin(lift * Math.PI) * 6
  ctx.fillStyle = skin
  ctx.beginPath() // the deltoid
  ctx.ellipse(3, -55, 7.5, 6.5, -0.2, 0, SD.TAU)
  ctx.fill()
  ctx.strokeStyle = skin
  ctx.lineWidth = 8.5
  ctx.beginPath() // upper arm
  ctx.moveTo(3, -55)
  ctx.quadraticCurveTo((3 + elbX) / 2 + 3, (-55 + elbY) / 2, elbX, elbY)
  ctx.stroke()
  ctx.lineWidth = 7
  ctx.beginPath() // forearm
  ctx.moveTo(elbX, elbY)
  ctx.lineTo(handX, handY)
  ctx.stroke()

  // the fall leaves a streak of firelight behind the hammer's head
  if (falling) {
    ctx.strokeStyle = 'rgba(255, 210, 130, 0.3)'
    ctx.lineWidth = 7
    ctx.beginPath()
    ctx.moveTo(-12, -90)
    ctx.quadraticCurveTo(28, -80, 34, -38)
    ctx.stroke()
  }

  // the hammer itself
  var hang = SD.lerp(-0.5, -2.6, lift)
  var hdx = Math.cos(hang)
  var hdy = Math.sin(hang)
  ctx.strokeStyle = '#4a3320'
  ctx.lineWidth = 3.4
  ctx.beginPath()
  ctx.moveTo(handX, handY)
  ctx.lineTo(handX + hdx * 20, handY + hdy * 20)
  ctx.stroke()
  ctx.save()
  ctx.translate(handX + hdx * 22, handY + hdy * 22)
  ctx.rotate(hang)
  ctx.fillStyle = '#2c313a'
  ctx.fillRect(-4, -9.5, 8, 19)
  ctx.fillStyle = 'rgba(190, 215, 230, 0.5)' // the polished striking face
  ctx.fillRect(2.6, -9.5, 1.4, 19)
  ctx.restore()

  // sparks off the anvil at the strike, and the flash of the blow
  if (struck) {
    var fade = 1 - (cycle - 1.45) / 0.35
    var flash = ctx.createRadialGradient(39, -27, 2, 39, -27, 26)
    flash.addColorStop(0, 'rgba(255, 230, 150, ' + (fade * 0.5).toFixed(2) + ')')
    flash.addColorStop(1, 'rgba(255, 230, 150, 0)')
    ctx.fillStyle = flash
    ctx.beginPath()
    ctx.arc(39, -27, 26, 0, SD.TAU)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255, 200, 90, ' + (fade * 0.95).toFixed(2) + ')'
    ctx.lineWidth = 1.7
    ctx.beginPath()
    for (var s = 0; s < 8; s++) {
      var sa = -0.25 - s * 0.35
      var sr = 9 + (1 - fade) * 30 + (s % 3) * 6
      ctx.moveTo(38, -28)
      ctx.lineTo(38 + Math.cos(sa) * sr, -28 + Math.sin(sa) * sr)
    }
    ctx.stroke()
  }

  ctx.restore()
}

// Side effect: the caves' interior dressing — shadow pooled in each chamber,
// then the forge set and the smith himself on the dry ledge. Drawn after
// the rocks so the shadow sits on the stone.
function drawHephCaves (ctx, heph, t) {
  for (var c = 0; c < heph.chambers.length; c++) {
    var ch = heph.chambers[c]
    var grad = ctx.createRadialGradient(ch.x, ch.y, ch.r * 0.25, ch.x, ch.y, ch.r * 1.1)
    grad.addColorStop(0, 'rgba(3, 8, 14, 0.5)')
    grad.addColorStop(1, 'rgba(3, 8, 14, 0)')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(ch.x, ch.y, ch.r * 1.1, 0, SD.TAU)
    ctx.fill()
  }
  drawForgeSet(ctx, heph.forge.x, t)
  if (!heph._god) {
    var gx = heph.forge.x + 48
    heph._god = { x: gx, y: SD.caveFloorYAt(gx), phase: 0.4 }
  }
  drawHephaestus(ctx, heph._god, t)
}

// ---------- Murk + darkness ----------

// Side effect: the water itself swallows detail past the clarity radius —
// a soft ring of sea-colored haze centered on the diver. Bare eyes see an
// arm's length; goggles buy you the sea. Ink takes it all away again.
// Screen-space: world distances arrive multiplied by the camera zoom.
function drawMurk (ctx, state, view, cam, zoom) {
  var p = state.player
  // surfaced water is clear enough — including a cave pocket's little sky
  if (p.y < SD.surfaceYAt(p.x, p.y) + SD.config.pxPerM * 0.6 && !(state.inkT > 0)) return

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
  if (topA < 0.03 && botA < 0.03) return // a 3% veil isn't worth a full-screen pass

  // the veil is soft gradients only, so it renders at HALF resolution and
  // scales up invisibly — a quarter of the pixels to fill, punch and blit
  var RS = 0.5
  var dw = Math.ceil(view.w * RS)
  var dh = Math.ceil(view.h * RS)
  if (!darkCanvas) {
    darkCanvas = document.createElement('canvas')
    darkCtx = darkCanvas.getContext('2d')
  }
  if (darkCanvas.width !== dw || darkCanvas.height !== dh) {
    darkCanvas.width = dw
    darkCanvas.height = dh
  }

  var dc = darkCtx
  dc.globalCompositeOperation = 'source-over'
  dc.clearRect(0, 0, dw, dh)
  var grad = dc.createLinearGradient(0, 0, 0, dh)
  grad.addColorStop(0, 'rgba(3, 10, 24, ' + topA + ')')
  grad.addColorStop(1, 'rgba(3, 10, 24, ' + botA + ')')
  dc.fillStyle = grad
  dc.fillRect(0, 0, dw, dh)

  dc.globalCompositeOperation = 'destination-out'

  // Side effect on dc: punches a soft hole of light
  function punch (wx, wy, wr, strength) {
    var sx = (wx - cam.x) * zoom * RS
    var sy = (wy - cam.y) * zoom * RS
    var r = wr * zoom * RS
    if (sx < -r || sx > dw + r || sy < -r || sy > dh + r) return
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
  // the braziers of the mountain sanctum, and a breath of light at the throat
  var mt = SD.config.world.mountain
  punch(mt.ledgeX, SD.floorYAt(mt.ledgeX) - 40, 280, 0.85)
  punch(mt.pocketX1 - 100, 22 * 32, 170, 0.4)
  // the vents burn through the dark
  var vents = state.world.dangers.vents
  for (var vI = 0; vI < vents.length; vI++) {
    punch(vents[vI].x, vents[vI].y - 40, 230, 0.78)
  }
  // the caves of Hephaestus: torchlight in every air dome; the forge burns
  var pks = SD.config.world.airPockets
  for (var pkI = 0; pkI < pks.length; pkI++) {
    punch((pks[pkI].x1 + pks[pkI].x2) / 2, pks[pkI].surfaceY - 24, 150, 0.45)
    var tcs = pks[pkI].torches
    for (var tcI = 0; tcI < tcs.length; tcI++) {
      punch(tcs[tcI].x, tcs[tcI].y + 14, 130, 0.7)
    }
  }
  var heph = state.world.decor.heph
  if (heph) {
    punch(heph.forge.x - 56, heph.forge.y - 30, 330, 0.9)
    punch(heph.forge.x + 48, heph.forge.y - 55, 160, 0.6)
  }
  // the boss cast carries its own terrible presence
  var fauna = state.world.fauna
  for (var bI = 0; bI < fauna.length; bI++) {
    if (fauna[bI].boss && !fauna[bI].taken) {
      punch(fauna[bI].x, fauna[bI].y, 220, 0.72)
    }
  }
  // the Anemone's bones catch what light there is
  var gwk = state.world.decor.giantWreck
  if (gwk) punch(gwk.x, gwk.y - 160, 520, 0.5)

  ctx.drawImage(darkCanvas, 0, 0, view.w, view.h)
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

  drawSkyline(ctx, t, cam, wv)
  drawSkyBackdrops(ctx, cam, wv, t)
  drawGodrays(ctx, t, cam, wv)
  drawFloor(ctx, cam, wv)
  if (cam.x < 1700) drawVillage(ctx, t) // the beach ends well before this

  var i
  var decor = w.decor
  for (i = 0; i < decor.columns.length; i++) {
    var col = decor.columns[i]
    if (col.x < cam.x - 260 || col.x > cam.x + wv.w + 260) continue
    drawColumn(ctx, col)
  }
  for (i = 0; i < decor.wrecks.length; i++) {
    var wr = decor.wrecks[i]
    if (wr.x < cam.x - 300 || wr.x > cam.x + wv.w + 300) continue
    drawWreck(ctx, wr)
  }
  if (decor.giantWreck && decor.giantWreck.x > cam.x - 500 && decor.giantWreck.x < cam.x + wv.w + 500) {
    drawGiantWreck(ctx, decor.giantWreck, t)
  }
  var qz = SD.config.world.quarry
  if (cam.x + wv.w > qz.x1 - 300 && cam.x < qz.x2 + 300) drawQuarry(ctx, decor)
  for (i = 0; i < decor.fans.length; i++) {
    var fan = decor.fans[i]
    if (fan.x < cam.x - 80 || fan.x > cam.x + wv.w + 80) continue
    drawFan(ctx, fan, t)
  }
  var vlt = SD.config.world.vaultX
  if (cam.x + wv.w > vlt - 560 && cam.x < vlt + 560) {
    drawHoard(ctx, decor.hoard, t)
    drawShrine(ctx, decor.shrine)
  }
  for (i = 0; i < w.dangers.vents.length; i++) {
    var vent = w.dangers.vents[i]
    if (vent.x < cam.x - 120 || vent.x > cam.x + wv.w + 120) continue
    drawVent(ctx, vent, t)
  }

  // the Caves of Hephaestus: the cut-out under the vents shelf, then its
  // trapped air laid against the slab's underside
  var hephOnScreen = decor.heph && cam.x + wv.w > 24300 && cam.x < 27100
  if (hephOnScreen) {
    drawHephVoid(ctx, cam, wv, t)
    var pks = SD.config.world.airPockets
    for (i = 0; i < pks.length; i++) {
      if (pks[i].topY > cam.y + wv.h + 60 || pks[i].surfaceY < cam.y - 60) continue
      drawAirPocket(ctx, pks[i], t)
    }
  }

  for (i = 0; i < w.rocks.length; i++) {
    var r = w.rocks[i]
    if (r.x + r.r < cam.x - 60 || r.x - r.r > cam.x + wv.w + 60) continue
    if (r.y + r.r < cam.y - 60 || r.y - r.r > cam.y + wv.h + 60) continue
    drawRock(ctx, r)
  }
  if (decor.cave) drawCave(ctx, decor.cave)
  if (hephOnScreen) drawHephCaves(ctx, decor.heph, t)

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

  for (i = 0; i < decor.mantas.length; i++) {
    var mr = decor.mantas[i]
    if (mr.x < cam.x - 160 || mr.x > cam.x + wv.w + 160) continue
    drawManta(ctx, mr, t)
  }
  for (i = 0; i < w.fishSchools.length; i++) {
    var fs = w.fishSchools[i]
    if (fs.x < cam.x - 140 || fs.x > cam.x + wv.w + 140) continue
    if (fs.y < cam.y - 120 || fs.y > cam.y + wv.h + 120) continue
    drawFishSchool(ctx, fs, t)
  }
  for (i = 0; i < w.fauna.length; i++) {
    var fa = w.fauna[i]
    if (fa.x < cam.x - 80 || fa.x > cam.x + wv.w + 80) continue
    drawFauna(ctx, fa, t)
  }
  for (i = 0; i < decor.seals.length; i++) {
    var seal = decor.seals[i]
    if (seal.x < cam.x - 120 || seal.x > cam.x + wv.w + 120) continue
    drawSeal(ctx, seal, t)
  }
  // dangers only bite on screen — the far ones can wait their turn
  var dgs = w.dangers
  for (i = 0; i < dgs.urchins.length; i++) {
    var ur = dgs.urchins[i]
    if (ur.x < cam.x - 40 || ur.x > cam.x + wv.w + 40 || ur.y < cam.y - 40 || ur.y > cam.y + wv.h + 40) continue
    drawUrchin(ctx, ur)
  }
  for (i = 0; i < dgs.eels.length; i++) {
    var el = dgs.eels[i]
    if (el.homeX < cam.x - 300 || el.homeX > cam.x + wv.w + 300 || el.homeY < cam.y - 300 || el.homeY > cam.y + wv.h + 300) continue
    drawEel(ctx, el, t)
  }
  for (i = 0; i < dgs.jellies.length; i++) {
    var jl = dgs.jellies[i]
    if (jl.x < cam.x - 90 || jl.x > cam.x + wv.w + 90 || jl.y < cam.y - 90 || jl.y > cam.y + wv.h + 90) continue
    drawJelly(ctx, jl, t)
  }
  for (i = 0; i < dgs.squids.length; i++) {
    var sq = dgs.squids[i]
    if (sq.x < cam.x - 90 || sq.x > cam.x + wv.w + 90 || sq.y < cam.y - 90 || sq.y > cam.y + wv.h + 90) continue
    drawSquid(ctx, sq, t)
  }
  for (i = 0; i < dgs.sharks.length; i++) {
    var sk = dgs.sharks[i]
    if (sk.x < cam.x - 110 || sk.x > cam.x + wv.w + 110 || sk.y < cam.y - 110 || sk.y > cam.y + wv.h + 110) continue
    drawShark(ctx, sk, t)
  }
  var pgod = dgs.poseidon
  if (pgod && pgod.x > cam.x - 340 && pgod.x < cam.x + wv.w + 340 &&
    pgod.y > cam.y - 340 && pgod.y < cam.y + wv.h + 340) {
    drawPoseidon(ctx, pgod, t)
  }

  for (i = 0; i < decor.seahorses.length; i++) {
    var sh = decor.seahorses[i]
    if (sh.x < cam.x - 60 || sh.x > cam.x + wv.w + 60) continue
    drawSeahorse(ctx, sh, t)
  }

  if (cam.x + wv.w > SD.config.world.mountain.faceX - 600) drawMountain(ctx, t)
  drawStoryDecor(ctx, decor, cam, wv, t)
  if (state.buddy && !state.buddy.aboard && state.mode !== 'gameover') drawBuddy(ctx, state, t)
  if (state.mode !== 'blackout' && !state.player.aboard) {
    if (state.player.form) drawMarineForm(ctx, state, t)
    else drawDiver(ctx, state, t)
  }
  drawDroppedStones(ctx, state.effects.droppedStones)
  drawBubbles(ctx, state.effects.bubbles)
  drawWaterline(ctx, t, cam, wv)
  drawBoat(ctx, state, t)
  if (state.buddy && state.buddy.aboard && state.mode !== 'gameover') drawBuddy(ctx, state, t) // he sits on deck, over the hull
  drawStorm(ctx, t, cam, wv)

  ctx.restore()
  ctx.restore()

  drawMurk(ctx, state, view, cam, z)
  drawDarkness(ctx, state, view, cam, z)
}

// ---------- The story layer: relic sketches, bones, and the buddy ----------
// (appended as registrations so parallel work on the sketch table merges clean)

// the Captain's Strongbox — iron-bound, heavier than guilt
lootSketch.strongbox = function (ctx, t) {
  ctx.fillStyle = '#3a2a16'
  ctx.fillRect(-14, -8, 28, 18)
  ctx.fillStyle = '#503a20'
  ctx.beginPath()
  ctx.moveTo(-14, -8)
  ctx.quadraticCurveTo(0, -17, 14, -8)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = '#6e7a84' // iron straps
  ctx.lineWidth = 2.4
  ctx.beginPath()
  ctx.moveTo(-8, -14)
  ctx.lineTo(-8, 10)
  ctx.moveTo(8, -14)
  ctx.lineTo(8, 10)
  ctx.stroke()
  ctx.fillStyle = '#8a959e' // the lock plate
  ctx.fillRect(-2.6, -2, 5.2, 6)
  ctx.fillStyle = '#241a12'
  ctx.beginPath()
  ctx.arc(0, 0.6, 1.1, 0, SD.TAU)
  ctx.fill()
}

// the Great Pearl — a moon in an open shell
lootSketch.greatPearl = function (ctx, t) {
  var glow = 0.3 + Math.sin(t * 1.8) * 0.12
  var grad = ctx.createRadialGradient(0, -4, 3, 0, -4, 40)
  grad.addColorStop(0, 'rgba(240, 244, 255, ' + glow + ')')
  grad.addColorStop(1, 'rgba(240, 244, 255, 0)')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(0, -4, 40, 0, SD.TAU)
  ctx.fill()
  ctx.fillStyle = '#7d8a94' // the shell, agape
  ctx.beginPath()
  ctx.arc(0, 4, 16, Math.PI, 0)
  ctx.closePath()
  ctx.fill()
  ctx.beginPath()
  ctx.arc(0, -2, 16, Math.PI * 1.08, -Math.PI * 0.08)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#f2f2ec' // the pearl itself
  ctx.beginPath()
  ctx.arc(0, -2, 8.5, 0, SD.TAU)
  ctx.fill()
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
  ctx.beginPath()
  ctx.arc(-2.8, -4.6, 2.4, 0, SD.TAU)
  ctx.fill()
  ctx.fillStyle = 'rgba(190, 205, 230, 0.5)'
  ctx.beginPath()
  ctx.arc(2.6, 0.4, 2.6, 0, SD.TAU)
  ctx.fill()
}

// the kelp-choked opening at the Well's floor
lootSketch.blockage = function (ctx, t) {
  ctx.fillStyle = 'rgba(6, 14, 22, 0.85)' // the dark behind it
  ctx.beginPath()
  ctx.ellipse(4, 0, 13, 17, 0.2, 0, SD.TAU)
  ctx.fill()
  ctx.strokeStyle = 'rgba(30, 110, 72, 0.95)'
  ctx.lineWidth = 3
  ctx.lineCap = 'round'
  for (var i = -2; i <= 2; i++) {
    var sway = Math.sin(t * 1.2 + i) * 2.5
    ctx.beginPath()
    ctx.moveTo(i * 4, 16)
    ctx.quadraticCurveTo(i * 4 + sway, 0, i * 3 + sway * 1.5, -16)
    ctx.stroke()
  }
}

// the sealed marble slab in the quarry
lootSketch.slab = function (ctx, t) {
  ctx.fillStyle = '#cfc9bd'
  ctx.save()
  ctx.rotate(0.06)
  ctx.fillRect(-13, -18, 26, 36)
  ctx.strokeStyle = 'rgba(43, 29, 22, 0.4)'
  ctx.lineWidth = 1.5
  ctx.strokeRect(-13, -18, 26, 36)
  ctx.beginPath() // the mason's mark
  ctx.moveTo(-6, -6)
  ctx.lineTo(0, -12)
  ctx.lineTo(6, -6)
  ctx.moveTo(0, -12)
  ctx.lineTo(0, 8)
  ctx.stroke()
  ctx.restore()
}

// the Bronze Fins of Hermes, at the statue's feet
lootSketch.hermesFins = function (ctx, t) {
  var glow = 0.22 + Math.sin(t * 2.2) * 0.1
  var grad = ctx.createRadialGradient(0, 0, 3, 0, 0, 30)
  grad.addColorStop(0, 'rgba(255, 224, 130, ' + glow + ')')
  grad.addColorStop(1, 'rgba(255, 224, 130, 0)')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(0, 0, 30, 0, SD.TAU)
  ctx.fill()
  ctx.fillStyle = '#8f7135'
  for (var s = -1; s <= 1; s += 2) {
    ctx.beginPath() // two bronze blades, crossed
    ctx.moveTo(s * 2, 6)
    ctx.quadraticCurveTo(s * 8, 2 - s * 2, s * 16, -6 + s * 2)
    ctx.lineTo(s * 13, -8 + s * 2)
    ctx.quadraticCurveTo(s * 6, -2, s * 1, 4)
    ctx.closePath()
    ctx.fill()
  }
  ctx.fillStyle = '#c9a227'
  ctx.beginPath()
  ctx.arc(0, 5, 2.2, 0, SD.TAU)
  ctx.fill()
}

// the pearl-trader's kit — a satchel with the goggles still bright
lootSketch.pearlKit = function (ctx, t) {
  ctx.fillStyle = '#5a4630'
  ctx.beginPath()
  ctx.moveTo(-12, 8)
  ctx.quadraticCurveTo(-13, -6, -4, -8)
  ctx.lineTo(8, -8)
  ctx.quadraticCurveTo(13, -4, 12, 8)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = '#3a2c1c'
  ctx.lineWidth = 1.6
  ctx.beginPath()
  ctx.moveTo(-12, -1)
  ctx.lineTo(12, -1)
  ctx.stroke()
  ctx.fillStyle = 'rgba(154, 212, 232, 0.85)' // the lens, catching light
  ctx.beginPath()
  ctx.ellipse(1, -11, 4, 3, 0.1, 0, SD.TAU)
  ctx.fill()
  ctx.strokeStyle = '#8f7135'
  ctx.lineWidth = 1.2
  ctx.stroke()
}

// the old kamaki, standing in what it last struck
lootSketch.grouperKamaki = function (ctx, t) {
  ctx.strokeStyle = '#6b4a26'
  ctx.lineWidth = 2.6
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(-8, 14)
  ctx.lineTo(10, -14)
  ctx.stroke()
  ctx.strokeStyle = '#c9c2b4'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(10, -14)
  ctx.lineTo(14, -18)
  ctx.moveTo(10, -14)
  ctx.lineTo(15, -14.5)
  ctx.moveTo(10, -14)
  ctx.lineTo(13.5, -10.5)
  ctx.stroke()
}

// Side effect: old bones on the sand — a diver who never surfaced
function drawBones (ctx, x, y, t) {
  ctx.save()
  ctx.translate(x, y)
  ctx.fillStyle = '#ded6c2'
  ctx.beginPath() // the skull, half in the sand
  ctx.arc(0, -5, 5.2, Math.PI * 0.95, Math.PI * 2.25)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#1c140e'
  ctx.beginPath() // the socket that watches you
  ctx.arc(1.8, -6, 1.5, 0, SD.TAU)
  ctx.fill()
  ctx.strokeStyle = '#ded6c2' // ribs breaking the sand
  ctx.lineWidth = 1.8
  ctx.lineCap = 'round'
  ctx.beginPath()
  for (var r = 0; r < 3; r++) {
    ctx.moveTo(9 + r * 6, 0)
    ctx.quadraticCurveTo(11 + r * 6, -7 + r, 14 + r * 6, -6 + r)
  }
  ctx.moveTo(30, 0)
  ctx.lineTo(37, -3) // one reaching arm bone
  ctx.stroke()
  ctx.restore()
}

// Side effect: the barnacled Statue of Hermes in its alcove
function drawHermes (ctx, s, t) {
  ctx.save()
  ctx.translate(s.x, s.y)
  ctx.fillStyle = '#b9b2a2'
  ctx.fillRect(-16, -8, 32, 8) // the plinth
  ctx.fillStyle = '#c6c0b0'
  ctx.beginPath() // robed figure, arm extended in the old gesture of giving
  ctx.moveTo(-8, -8)
  ctx.lineTo(-6, -46)
  ctx.quadraticCurveTo(0, -52, 6, -46)
  ctx.lineTo(8, -8)
  ctx.closePath()
  ctx.fill()
  ctx.beginPath() // the offered arm
  ctx.moveTo(4, -40)
  ctx.quadraticCurveTo(14, -38, 19, -33)
  ctx.lineTo(17, -29)
  ctx.quadraticCurveTo(11, -34, 3, -35)
  ctx.closePath()
  ctx.fill()
  ctx.beginPath() // the head, with the winged cap
  ctx.arc(0, -52, 6, 0, SD.TAU)
  ctx.fill()
  ctx.fillStyle = '#a8a294'
  ctx.beginPath()
  ctx.ellipse(-6.5, -55, 3.6, 1.6, -0.5, 0, SD.TAU)
  ctx.ellipse(6.5, -55, 3.6, 1.6, 0.5, 0, SD.TAU)
  ctx.fill()
  ctx.fillStyle = 'rgba(95, 122, 95, 0.55)' // the sea's slow beard
  ctx.beginPath()
  ctx.arc(-4, -30, 3, 0, SD.TAU)
  ctx.arc(5, -16, 2.4, 0, SD.TAU)
  ctx.arc(2, -44, 2, 0, SD.TAU)
  ctx.fill()
  ctx.restore()
}

// Side effect: the great grouper's carcass in the meadows, picked clean
function drawCarcass (ctx, c, t) {
  ctx.save()
  ctx.translate(c.x, c.y)
  ctx.strokeStyle = '#d6cec0'
  ctx.lineWidth = 2.4
  ctx.lineCap = 'round'
  ctx.beginPath() // the spine
  ctx.moveTo(-26, -8)
  ctx.quadraticCurveTo(0, -14, 24, -9)
  ctx.stroke()
  for (var r = 0; r < 5; r++) { // the ribs
    ctx.beginPath()
    ctx.moveTo(-18 + r * 9, -10)
    ctx.quadraticCurveTo(-20 + r * 9, -2, -16 + r * 9, 0)
    ctx.stroke()
  }
  ctx.fillStyle = '#d6cec0' // the great skull
  ctx.beginPath()
  ctx.moveTo(24, -9)
  ctx.quadraticCurveTo(36, -12, 40, -4)
  ctx.quadraticCurveTo(34, 2, 25, 0)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#1c140e'
  ctx.beginPath()
  ctx.arc(32, -6, 1.8, 0, SD.TAU)
  ctx.fill()
  ctx.restore()
}

// Side effect: the story's set dressing, culled to the camera
function drawStoryDecor (ctx, decor, cam, wv, t) {
  function near (x, pad) {
    return x > cam.x - pad && x < cam.x + wv.w + pad
  }
  if (decor.hermes && near(decor.hermes.x, 120)) drawHermes(ctx, decor.hermes, t)
  if (decor.carcass && near(decor.carcass.x, 120)) drawCarcass(ctx, decor.carcass, t)
  if (decor.pearlKit && near(decor.pearlKit.x, 100)) drawBones(ctx, decor.pearlKit.x - 20, decor.pearlKit.y - 4, t)
  if (decor.nikandros && near(decor.nikandros.x, 100)) drawBones(ctx, decor.nikandros.x, decor.nikandros.y - 4, t)
  if (decor.skeletons) {
    for (var i = 0; i < decor.skeletons.length; i++) {
      if (near(decor.skeletons[i].x, 100)) drawBones(ctx, decor.skeletons[i].x, decor.skeletons[i].y - 4, t)
    }
  }
}

// Side effect: Yiannis, your safety buddy — always above, always just left,
// with a snorkel and a rescue line coiled at his hip. The first rule, kept.
function drawBuddy (ctx, state, t) {
  var b = state.buddy
  var p = state.player
  var c = skinTones(0.55)
  var dir = p.x >= b.x ? 1 : -1
  if (b.aboard) {
    drawBuddySeated(ctx, b, c, state.player.facing || 1)
    return
  }
  ctx.save()
  ctx.translate(b.x, b.y)
  ctx.scale(dir, 1)
  // on the surface he lolls; on a rescue dive he pitches down and means it
  ctx.rotate(Math.sin(b.phase * 0.8) * 0.06 + (b.diving ? 0.62 : 0.12))
  ctx.lineCap = 'round'

  var kick = Math.sin(b.phase * 2) * 0.7
  ctx.strokeStyle = c.deep // far leg
  ctx.lineWidth = 4.2
  ctx.beginPath()
  ctx.moveTo(-10, 1)
  ctx.quadraticCurveTo(-18, 1 - kick * 3, -26, 2 - kick * 6)
  ctx.stroke()
  ctx.strokeStyle = c.skin // near leg
  ctx.beginPath()
  ctx.moveTo(-10, 1)
  ctx.quadraticCurveTo(-18, 1 + kick * 3, -26, 2 + kick * 6)
  ctx.stroke()

  ctx.fillStyle = c.skin // torso
  ctx.beginPath()
  ctx.moveTo(-11, -4)
  ctx.quadraticCurveTo(0, -7, 11, -5.5)
  ctx.quadraticCurveTo(13.5, 0, 11, 4.5)
  ctx.quadraticCurveTo(0, 6.5, -11, 4.5)
  ctx.quadraticCurveTo(-13, 0, -11, -4)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = '#3a5a74' // his blue perizoma — so you never mistake him
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.moveTo(-7.5, -4.5)
  ctx.quadraticCurveTo(-10, 0, -8, 5)
  ctx.stroke()
  ctx.strokeStyle = '#8a6d4a' // the rescue line, coiled at his hip
  ctx.lineWidth = 1.4
  ctx.beginPath()
  ctx.arc(-4, 4, 3.4, 0, SD.TAU)
  ctx.arc(-4, 4, 1.8, 0, SD.TAU)
  ctx.stroke()

  ctx.strokeStyle = c.skin // arms folded forward, watching
  ctx.lineWidth = 3.6
  ctx.beginPath()
  ctx.moveTo(9, 0)
  ctx.quadraticCurveTo(15, 3, 20, 3.6)
  ctx.stroke()

  ctx.fillStyle = c.skin // head, looking DOWN at you
  ctx.beginPath()
  ctx.arc(16, -3, 5.2, 0, SD.TAU)
  ctx.fill()
  ctx.fillStyle = '#241a12' // short hair
  ctx.beginPath()
  ctx.arc(15, -5.5, 4.6, Math.PI * 0.85, Math.PI * 1.95)
  ctx.fill()
  ctx.strokeStyle = '#c9c2b4' // the snorkel — he never leaves the surface watch
  ctx.lineWidth = 1.8
  ctx.beginPath()
  ctx.moveTo(13, -6)
  ctx.quadraticCurveTo(11, -11, 13.5, -14)
  ctx.stroke()
  ctx.fillStyle = '#241a12' // his eye, on you
  ctx.beginPath()
  ctx.arc(18.6, -2.4, 1, 0, SD.TAU)
  ctx.fill()
  ctx.restore()
}

// Side effect on ctx: Yiannis riding the kaiki — perched on the gunwale,
// coil beside him, facing wherever the helmsman faces
function drawBuddySeated (ctx, b, c, facing) {
  ctx.save()
  ctx.translate(b.x, b.y)
  ctx.scale(facing, 1)
  ctx.lineCap = 'round'

  ctx.strokeStyle = c.deep // far leg, bent over the side
  ctx.lineWidth = 4.2
  ctx.beginPath()
  ctx.moveTo(0, -2)
  ctx.quadraticCurveTo(7, -1, 8.5, 3)
  ctx.quadraticCurveTo(9, 7, 8, 10)
  ctx.stroke()
  ctx.strokeStyle = c.skin // near leg
  ctx.beginPath()
  ctx.moveTo(0, -2)
  ctx.quadraticCurveTo(6, 0, 7, 4)
  ctx.quadraticCurveTo(7.2, 8, 6, 11)
  ctx.stroke()

  ctx.fillStyle = c.skin // torso, upright, a man at ease
  ctx.beginPath()
  ctx.moveTo(-4.5, -15)
  ctx.quadraticCurveTo(0, -16.5, 4.5, -15)
  ctx.quadraticCurveTo(6, -8, 4.5, -1)
  ctx.quadraticCurveTo(0, 1, -4.5, -1)
  ctx.quadraticCurveTo(-6, -8, -4.5, -15)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = '#3a5a74' // the blue perizoma
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.moveTo(-4.5, -3)
  ctx.quadraticCurveTo(0, -1.5, 4.5, -3)
  ctx.stroke()

  ctx.strokeStyle = c.skin // near arm resting on the knee
  ctx.lineWidth = 3.6
  ctx.beginPath()
  ctx.moveTo(2.5, -12)
  ctx.quadraticCurveTo(7.5, -8, 7, -2)
  ctx.stroke()

  ctx.fillStyle = c.skin // head, watching the water anyway
  ctx.beginPath()
  ctx.arc(1.5, -20, 5.2, 0, SD.TAU)
  ctx.fill()
  ctx.fillStyle = '#241a12' // short hair
  ctx.beginPath()
  ctx.arc(0.5, -22.5, 4.6, Math.PI * 0.85, Math.PI * 1.95)
  ctx.fill()
  ctx.fillStyle = '#241a12' // his eye, still on the sea
  ctx.beginPath()
  ctx.arc(4.2, -19.6, 1, 0, SD.TAU)
  ctx.fill()

  ctx.strokeStyle = '#8a6d4a' // the rescue coil on the deck beside him
  ctx.lineWidth = 1.4
  ctx.beginPath()
  ctx.arc(-8, 1, 3.4, 0, SD.TAU)
  ctx.arc(-8, 1, 1.8, 0, SD.TAU)
  ctx.stroke()
  ctx.restore()
}
