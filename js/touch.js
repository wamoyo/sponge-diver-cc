// Σφουγγαράς — Sponge Diver
// Pointer controls: a floating virtual joystick that works for finger AND
// mouse. Press anywhere on the water and drag — the drag vector is the swim
// vector (analog, so a long drag down engages the skandalopetra just like
// holding ↓). Release to glide.

var SD = window.SD || {}
window.SD = SD

SD.touch = (function () {

  var RADIUS = 55        // px of drag for full speed
  var active = false
  var pointerId = null
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

  // Side effect: updates the drag vector from a pointer position
  function drag (x, y) {
    var dx = x - anchorX
    var dy = y - anchorY
    var d = Math.sqrt(dx * dx + dy * dy)
    var m = d > RADIUS ? RADIUS / d : 1
    vecX = dx * m / RADIUS
    vecY = dy * m / RADIUS
    place()
  }

  // Side effect: releases the stick
  function release () {
    active = false
    pointerId = null
    vecX = 0
    vecY = 0
    baseEl.classList.add('hidden')
    knobEl.classList.add('hidden')
  }

  // Side effect: binds pointer listeners (mouse + touch alike) to the canvas
  function init (canvas) {
    baseEl = document.getElementById('joy-base')
    knobEl = document.getElementById('joy-knob')

    canvas.addEventListener('pointerdown', function (ev) {
      if (active || (ev.pointerType === 'mouse' && ev.button !== 0)) return
      ev.preventDefault()
      active = true
      pointerId = ev.pointerId
      anchorX = ev.clientX
      anchorY = ev.clientY
      vecX = 0
      vecY = 0
      if (canvas.setPointerCapture) {
        try { canvas.setPointerCapture(ev.pointerId) } catch (e) { /* fine */ }
      }
      baseEl.classList.remove('hidden')
      knobEl.classList.remove('hidden')
      place()
    })

    canvas.addEventListener('pointermove', function (ev) {
      if (!active || ev.pointerId !== pointerId) return
      ev.preventDefault()
      drag(ev.clientX, ev.clientY)
    })

    var end = function (ev) {
      if (!active || ev.pointerId !== pointerId) return
      ev.preventDefault()
      release()
    }
    canvas.addEventListener('pointerup', end)
    canvas.addEventListener('pointercancel', end)
  }

  // Pure: current swim vector, each axis in -1..1 (0,0 when idle)
  function vector () {
    return { x: vecX, y: vecY, active: active }
  }

  return { init: init, vector: vector, isTouchDevice: isTouchDevice }
})()
