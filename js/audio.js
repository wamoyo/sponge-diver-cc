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
    if (ctx.state === 'suspended') ctx.resume()
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
    if (ctx.state === 'suspended') ctx.resume()
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

  // E Phrygian dominant — the "ancient Aegean" scale. Everything melodic
  // in the game is plucked out of this, like a bored lyre player on deck.
  var phrygian = [329.6, 349.2, 415.3, 440, 493.9, 523.3, 587.3, 659.3]

  // Side effect: lyre pluck for picking up loot — two strings, slightly rolled
  function pickup () {
    var i = Math.floor(Math.random() * 5)
    tone(phrygian[i], 0.26, 'triangle', 0.09)
    tone(phrygian[i + 2], 0.22, 'triangle', 0.05, 0.04)
    tone(phrygian[i] * 2, 0.14, 'sine', 0.03, 0.02)
  }

  // Side effect: the kamaki strikes — a whoosh of water and a soft thunk
  function spear () {
    noise(0.09, 0.1, 0, 2600)
    tone(180, 0.08, 'triangle', 0.08, 0.05, 90)
    tone(phrygian[4], 0.18, 'triangle', 0.05, 0.09)
  }

  // Side effect: temple gong + rising lyre — the god accepts the offering
  function offering () {
    tone(110, 1.4, 'sine', 0.12, 0, 108)
    tone(220, 1.1, 'sine', 0.05, 0.02)
    tone(phrygian[0], 0.3, 'triangle', 0.06, 0.35)
    tone(phrygian[3], 0.3, 'triangle', 0.06, 0.5)
    tone(phrygian[5], 0.45, 'triangle', 0.07, 0.65)
  }

  // Side effect: a conch-horn swell over deep rumble — something immense woke up
  function conch () {
    tone(98, 1.6, 'sawtooth', 0.05, 0, 147)
    tone(147, 1.4, 'triangle', 0.09, 0.15, 196)
    noise(1.2, 0.06, 0, 240)
  }

  // Side effect: dry papyrus rustle + a small chime — a message unrolled
  function parchment () {
    noise(0.28, 0.07, 0, 3400)
    noise(0.2, 0.05, 0.18, 2800)
    tone(1047, 0.5, 'sine', 0.045, 0.3)
  }

  // Side effect: bare feet on deck planks
  function board () {
    tone(95, 0.09, 'sine', 0.12, 0, 60)
    noise(0.06, 0.08, 0, 600)
    tone(120, 0.08, 'sine', 0.09, 0.11, 70)
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

  // Side effect: aulos flourish for level-ups and legendary finds — two
  // reedy voices in parallel, the way the double-pipe actually played
  function fanfare () {
    var run = [0, 2, 4, 5, 7]
    for (var i = 0; i < run.length; i++) {
      var f = phrygian[run[i] % phrygian.length] * (run[i] >= phrygian.length ? 2 : 1)
      tone(f, 0.26, 'sawtooth', 0.035, i * 0.1)
      tone(f * 1.335, 0.26, 'sawtooth', 0.028, i * 0.1) // the second pipe, a fourth up
    }
    tone(phrygian[0] * 2, 0.8, 'triangle', 0.07, 0.52)
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
    spear: spear,
    offering: offering,
    conch: conch,
    parchment: parchment,
    board: board,
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
