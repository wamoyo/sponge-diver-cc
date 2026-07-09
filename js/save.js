// Σφουγγαράς — Sponge Diver
// localStorage persistence. What survives between sessions: money, XP,
// training, gear, the boat and her hold, lifetime stats, story flags, mute.
// Old v1 saves migrate: breath tiers become apnea ranks, conditioning
// becomes XP, and veterans find their kaiki already tied up at the dock.

var SD = window.SD || {}
window.SD = SD

SD.SAVE_KEY = 'spongeDiverSaveV2'
SD.LEGACY_KEY = 'spongeDiverSaveV1'

// Side effect: writes the persistent slice of state to localStorage
SD.saveGame = function (state) {
  var data = {
    drachmae: state.drachmae,
    xp: state.xp,
    training: state.training,
    upgrades: state.upgrades,
    relics: state.relics,
    slain: state.slain,
    bottlesRead: state.bottlesRead,
    worldFlags: SD.worldFlags,
    tridentClaimed: state.tridentClaimed,
    stats: state.stats,
    muted: state.muted,
    boat: { x: state.boat.x, hold: state.boat.hold }
  }
  try {
    localStorage.setItem(SD.SAVE_KEY, JSON.stringify(data))
  } catch (e) { /* private mode etc — play on without saving */ }
}

// Pure: converts a v1 save blob into the v2 shape
function migrateV1 (old) {
  var up = old.upgrades || {}
  return {
    drachmae: old.drachmae || 0,
    // old passive conditioning becomes experience in the new sense
    xp: Math.round((old.conditioning || 0) * 60),
    training: {
      apnea: Math.min(12, (up.breath || 0) * 3), // lungs bought → lungs trained
      stroke: 0,
      discipline: 0
    },
    upgrades: {
      fins: Math.min(6, up.fins || 0),
      stone: Math.min(4, up.stone || 0),
      light: Math.min(5, up.light || 0),
      net: Math.min(6, up.bag || 0),
      knife: Math.min(4, up.knife || 0),
      charm: Math.min(3, up.charm || 0),
      favor: up.favor || 0,
      boat: 1 // the old game always had a boat — she's yours, tied at the dock
    },
    tridentClaimed: !!old.tridentClaimed,
    bottleRead: false,
    stats: old.stats || {},
    muted: !!old.muted,
    boat: { x: SD.config.world.boatStartX, hold: [] }
  }
}

// Side effect: reads localStorage. Returns saved data object or null.
SD.loadGame = function () {
  try {
    var raw = localStorage.getItem(SD.SAVE_KEY)
    if (raw) return JSON.parse(raw)
    var legacy = localStorage.getItem(SD.LEGACY_KEY)
    if (legacy) return migrateV1(JSON.parse(legacy))
    return null
  } catch (e) {
    return null
  }
}

// Side effect: mutates state with saved data (if any). Missing fields keep defaults.
SD.applySave = function (state, data) {
  if (!data) return
  if (typeof data.drachmae === 'number') state.drachmae = data.drachmae
  if (typeof data.xp === 'number') state.xp = data.xp
  if (data.training) {
    for (var tr in state.training) {
      if (typeof data.training[tr] === 'number') state.training[tr] = data.training[tr]
    }
  }
  if (data.upgrades) {
    for (var k in state.upgrades) {
      if (typeof data.upgrades[k] === 'number') state.upgrades[k] = data.upgrades[k]
    }
  }
  if (data.relics) {
    for (var r in state.relics) {
      if (typeof data.relics[r] === 'boolean') state.relics[r] = data.relics[r]
    }
  }
  if (data.tridentClaimed) state.tridentClaimed = true
  if (data.bottlesRead) state.bottlesRead = data.bottlesRead
  if (data.bottleRead) state.bottlesRead[0] = true // the old single-bottle saves
  if (data.slain) {
    for (var sl in state.slain) {
      if (typeof data.slain[sl] === 'boolean') state.slain[sl] = data.slain[sl]
    }
  }
  if (data.worldFlags) {
    for (var wf in SD.worldFlags) {
      if (typeof data.worldFlags[wf] === 'boolean') SD.worldFlags[wf] = data.worldFlags[wf]
    }
  }
  // grandfather clause: gear already owned counts as found
  if (state.upgrades.fins > 0) state.relics.fins = true
  if (state.upgrades.light > 0) state.relics.sight = true
  if (state.upgrades.kamaki > 0) state.relics.hunt = true
  if (data.stats) {
    for (var s in state.stats) {
      if (typeof data.stats[s] === 'number') state.stats[s] = data.stats[s]
    }
  }
  if (data.muted) state.muted = true
  if (data.boat) {
    if (typeof data.boat.x === 'number') state.boat.x = data.boat.x
    if (data.boat.hold && data.boat.hold.length) state.boat.hold = data.boat.hold
  }
}

// Side effect: wipes the save from localStorage (both eras)
SD.resetSave = function () {
  try {
    localStorage.removeItem(SD.SAVE_KEY)
    localStorage.removeItem(SD.LEGACY_KEY)
  } catch (e) { /* nothing to do */ }
}
