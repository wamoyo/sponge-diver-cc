// Σφουγγαράς — Sponge Diver
// Touch controls: a floating virtual joystick. Touch anywhere on the water
// and drag — the drag vector is the swim vector (analog, so a long drag
// down engages the skandalopetra just like holding ↓).

var SD = window.SD || {}
window.SD = SD

SD.touch = (function () {

  var RADIUS = 55        // px of drag for full speed
  var active = false
  var touchId = null
  var anchorX = 0
  var anchorY = 0
  var vecX = 0
  var vecY = 0
  var baseEl = null
  var knobEl = null

  // Pure: true when the device reports a coarse pointer (finger)
  function isTouchDevice () {
    return window.matchMedia && window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window
  }

  // Side effect: positions the joystick DOM at the anchor + knob offset
  function place () {
    baseEl.style.left = (anchorX - 55) + 'px'
    baseEl.style.top = (anchorY - 55) + 'px'
    knobEl.style.left = (anchorX + vecX * RADIUS - 24) + 'px'
    knobEl.style.top = (anchorY + vecY * RADIUS - 24) + 'px'
  }

  // Side effect: updates the drag vector from a touch point
  function drag (x, y) {
    var dx = x - anchorX
    var dy = y - anchorY
    var d = Math.sqrt(dx * dx + dy * dy)
    var m = d > RADIUS ? RADIUS / d : 1
    vecX = dx * m / RADIUS
    vecY = dy * m / RADIUS
    place()
  }

  // Side effect: finds our tracked touch in a TouchList, or null
  function findTouch (list) {
    for (var i = 0; i < list.length; i++) {
      if (list[i].identifier === touchId) return list[i]
    }
    return null
  }

  // Side effect: binds touch listeners to the canvas + shows joystick DOM
  function init (canvas) {
    baseEl = document.getElementById('joy-base')
    knobEl = document.getElementById('joy-knob')

    canvas.addEventListener('touchstart', function (ev) {
      ev.preventDefault()
      if (active) return
      var t = ev.changedTouches[0]
      active = true
      touchId = t.identifier
      anchorX = t.clientX
      anchorY = t.clientY
      vecX = 0
      vecY = 0
      baseEl.classList.remove('hidden')
      knobEl.classList.remove('hidden')
      place()
    }, { passive: false })

    canvas.addEventListener('touchmove', function (ev) {
      ev.preventDefault()
      var t = findTouch(ev.changedTouches)
      if (t) drag(t.clientX, t.clientY)
    }, { passive: false })

    var end = function (ev) {
      ev.preventDefault()
      if (!findTouch(ev.changedTouches)) return
      active = false
      touchId = null
      vecX = 0
      vecY = 0
      baseEl.classList.add('hidden')
      knobEl.classList.add('hidden')
    }
    canvas.addEventListener('touchend', end, { passive: false })
    canvas.addEventListener('touchcancel', end, { passive: false })
  }

  // Pure: current swim vector, each axis in -1..1 (0,0 when idle)
  function vector () {
    return { x: vecX, y: vecY, active: active }
  }

  return { init: init, vector: vector, isTouchDevice: isTouchDevice }
})()
