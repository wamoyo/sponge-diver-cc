// Σφουγγαράς — Sponge Diver
// Tiny WebAudio synth. Everything here is a side effect on the audio context.
// The context is created lazily on the first user gesture (browser rule).

var SD = window.SD || {}
window.SD = SD

SD.audio = (function () {

  var ctx = null
  var muted = false
  var heartbeatTimer = 0

  // Side effect: creates/resumes the AudioContext. Call from a user gesture.
  function init () {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext
      if (AC) ctx = new AC()
    }
    if (ctx && ctx.state === 'suspended') ctx.resume()
  }

  // Side effect: toggles mute. Returns the new muted flag.
  function setMuted (m) {
    muted = m
    return muted
  }

  // Side effect: schedules one enveloped oscillator note
  function tone (freq, dur, type, gain, delay, slideTo) {
    if (!ctx || muted) return
    var t0 = ctx.currentTime + (delay || 0)
    var osc = ctx.createOscillator()
    var g = ctx.createGain()
    osc.type = type || 'sine'
    osc.frequency.setValueAtTime(freq, t0)
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur)
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.exponentialRampToValueAtTime(gain || 0.08, t0 + 0.012)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    osc.connect(g)
    g.connect(ctx.destination)
    osc.start(t0)
    osc.stop(t0 + dur + 0.05)
  }

  // Side effect: short burst of filtered noise (splashes, stings)
  function noise (dur, gain, delay, filterFreq) {
    if (!ctx || muted) return
    var t0 = ctx.currentTime + (delay || 0)
    var len = Math.floor(ctx.sampleRate * dur)
    var buf = ctx.createBuffer(1, len, ctx.sampleRate)
    var data = buf.getChannelData(0)
    for (var i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / len)
    }
    var src = ctx.createBufferSource()
    src.buffer = buf
    var filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = filterFreq || 900
    var g = ctx.createGain()
    g.gain.value = gain || 0.15
    src.connect(filter)
    filter.connect(g)
    g.connect(ctx.destination)
    src.start(t0)
  }

  var pentatonic = [523, 587, 659, 784, 880] // C major pentatonic, lyre-ish

  // Side effect: pluck for picking up loot
  function pickup () {
    var f = SD.pick(pentatonic)
    tone(f, 0.22, 'triangle', 0.09)
    tone(f * 2, 0.16, 'sine', 0.04, 0.02)
  }

  // Side effect: coin arpeggio for selling the catch
  function coins () {
    tone(659, 0.14, 'triangle', 0.08)
    tone(784, 0.14, 'triangle', 0.08, 0.08)
    tone(988, 0.2, 'triangle', 0.09, 0.16)
    tone(1319, 0.26, 'sine', 0.06, 0.24)
  }

  // Side effect: cha-ching for buying gear
  function buy () {
    tone(880, 0.1, 'square', 0.045)
    tone(1175, 0.22, 'triangle', 0.08, 0.07)
  }

  // Side effect: dull buzz for a purchase you can't afford
  function denied () {
    tone(140, 0.2, 'sawtooth', 0.05)
  }

  // Side effect: thump + noise for stings and bites
  function sting () {
    tone(110, 0.25, 'sine', 0.14, 0, 55)
    noise(0.12, 0.12, 0, 700)
  }

  // Side effect: splash for crossing the waterline
  function splash () {
    noise(0.3, 0.14, 0, 1400)
  }

  // Side effect: descending tone for blacking out
  function blackout () {
    tone(330, 1.4, 'sine', 0.1, 0, 60)
    noise(0.5, 0.06, 0.15, 500)
  }

  // Side effect: small fanfare for legendary finds
  function fanfare () {
    var notes = [523, 659, 784, 1047]
    for (var i = 0; i < notes.length; i++) {
      tone(notes[i], 0.3, 'triangle', 0.09, i * 0.11)
    }
    tone(1319, 0.7, 'sine', 0.07, 0.48)
  }

  // Side effect: paces a double-thump heartbeat while breath is low.
  // Call every frame with dt and breath ratio 0..1.
  function heartbeat (dt, ratio) {
    if (!ctx || muted || ratio > 0.28) return
    heartbeatTimer -= dt
    if (heartbeatTimer <= 0) {
      var period = SD.lerp(0.45, 1.05, ratio / 0.28) // faster as breath runs out
      heartbeatTimer = period
      tone(58, 0.14, 'sine', 0.16)
      tone(52, 0.12, 'sine', 0.12, 0.16)
    }
  }

  return {
    init: init,
    setMuted: setMuted,
    pickup: pickup,
    coins: coins,
    buy: buy,
    denied: denied,
    sting: sting,
    splash: splash,
    blackout: blackout,
    fanfare: fanfare,
    heartbeat: heartbeat
  }
})()
