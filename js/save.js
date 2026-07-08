// Σφουγγαράς — Sponge Diver
// localStorage persistence. What survives between sessions: money, gear,
// conditioning, lifetime stats, the trident flag, mute.

var SD = window.SD || {}
window.SD = SD

SD.SAVE_KEY = 'spongeDiverSaveV1'

// Side effect: writes the persistent slice of state to localStorage
SD.saveGame = function (state) {
  var data = {
    drachmae: state.drachmae,
    upgrades: state.upgrades,
    conditioning: state.conditioning,
    tridentClaimed: state.tridentClaimed,
    stats: state.stats,
    muted: state.muted
  }
  try {
    localStorage.setItem(SD.SAVE_KEY, JSON.stringify(data))
  } catch (e) { /* private mode etc — play on without saving */ }
}

// Side effect: reads localStorage. Returns saved data object or null.
SD.loadGame = function () {
  try {
    var raw = localStorage.getItem(SD.SAVE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch (e) {
    return null
  }
}

// Side effect: mutates state with saved data (if any). Missing fields keep defaults.
SD.applySave = function (state, data) {
  if (!data) return
  if (typeof data.drachmae === 'number') state.drachmae = data.drachmae
  if (data.upgrades) {
    for (var k in state.upgrades) {
      if (typeof data.upgrades[k] === 'number') state.upgrades[k] = data.upgrades[k]
    }
  }
  if (typeof data.conditioning === 'number') state.conditioning = data.conditioning
  if (data.tridentClaimed) state.tridentClaimed = true
  if (data.stats) {
    for (var s in state.stats) {
      if (typeof data.stats[s] === 'number') state.stats[s] = data.stats[s]
    }
  }
  if (data.muted) state.muted = true
}

// Side effect: wipes the save from localStorage
SD.resetSave = function () {
  try {
    localStorage.removeItem(SD.SAVE_KEY)
  } catch (e) { /* nothing to do */ }
}
