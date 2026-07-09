// Σφουγγαράς — Sponge Diver
// Small pure helpers shared by everything.

var SD = window.SD || {}
window.SD = SD

SD.TAU = Math.PI * 2

// Pure: clamp n into [lo, hi]
SD.clamp = function (n, lo, hi) {
  return Math.min(hi, Math.max(lo, n))
}

// Pure: linear interpolation from a to b by t
SD.lerp = function (a, b, t) {
  return a + (b - a) * t
}

// Pure: hermite smoothstep of t across [edge0, edge1], returns 0..1
SD.smoothstep = function (edge0, edge1, t) {
  var x = SD.clamp((t - edge0) / (edge1 - edge0), 0, 1)
  return x * x * (3 - 2 * x)
}

// Pure: distance between two points
SD.dist = function (x1, y1, x2, y2) {
  var dx = x2 - x1
  var dy = y2 - y1
  return Math.sqrt(dx * dx + dy * dy)
}

// Pure-ish (uses Math.random): random float in [lo, hi)
SD.randRange = function (lo, hi) {
  return lo + Math.random() * (hi - lo)
}

// Pure-ish (uses Math.random): random pick from an array
SD.pick = function (arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

// Pure: returns a deterministic random generator (mulberry32) for a seed.
// The same seed always yields the same sea — the world is a place, not a shuffle.
SD.makeRng = function (seed) {
  var s = seed >>> 0
  return function () {
    s = (s + 0x6D2B79F5) >>> 0
    var t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Pure: random float in [lo, hi) from a supplied rng
SD.rngRange = function (rng, lo, hi) {
  return lo + rng() * (hi - lo)
}

// Pure: random pick from an array using a supplied rng
SD.rngPick = function (rng, arr) {
  return arr[Math.floor(rng() * arr.length)]
}

// Pure: format drachmae with the drachma sign, e.g. "₯ 1,240"
SD.fmtDr = function (n) {
  return '₯ ' + Math.round(n).toLocaleString('en-US')
}

// Pure: interpolate between two [r,g,b] colors, returns css string
SD.lerpColor = function (c1, c2, t) {
  var r = Math.round(SD.lerp(c1[0], c2[0], t))
  var g = Math.round(SD.lerp(c1[1], c2[1], t))
  var b = Math.round(SD.lerp(c1[2], c2[2], t))
  return 'rgb(' + r + ',' + g + ',' + b + ')'
}

// Pure: sample a gradient of {at, rgb} stops (sorted by at) at position p
SD.sampleStops = function (stops, p) {
  if (p <= stops[0].at) return SD.lerpColor(stops[0].rgb, stops[0].rgb, 0)
  for (var i = 0; i < stops.length - 1; i++) {
    var a = stops[i]
    var b = stops[i + 1]
    if (p <= b.at) return SD.lerpColor(a.rgb, b.rgb, (p - a.at) / (b.at - a.at))
  }
  var last = stops[stops.length - 1]
  return SD.lerpColor(last.rgb, last.rgb, 0)
}
