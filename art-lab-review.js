// Σφουγγαράς — The Art Lab: the Review Layer
// Loads AFTER art-lab.js and never touches it. Three jobs:
//   1. Add the tiles art-lab.js doesn't have yet (the town, the story decor,
//      the effects, and the game's DOM UI — welcome screen, buttons, HUD).
//   2. Describe every tile — what it is, where it lives, what animates.
//   3. Let the curator SCORE each piece 1–11 with a note. Scores persist in
//      localStorage and, when art-server.py is running, land instantly in
//      art-scores.json in the repo — where Claude reads them and goes back
//      to improve the low-scoring art.

/* global LAB, tile, makeState, drawCurrent, drawBubbles, drawHarvestRing,
   drawLoot, drawGiantWreck, drawQuarry, drawHermes, drawCarcass, drawBones,
   drawTorch, lootSketch */

// ---------- the missing tiles: the village hub ----------

// Side effect: two town postcards — SD.town.render at two eras
function buildTownTiles () {
  // Pure-ish: a minimal state the town renderer can lean on
  function townState (grown) {
    return {
      time: 0,
      townFolk: grown
        ? { jeweler: true, taverna: true, antiquarian: true, silversmith: true, dyemaker: true }
        : {},
      player: { bag: [] },
      boat: { x: -9999, hold: [] }
    }
  }
  function townTile (title, grown) {
    tile('sec-town', title, 640, 380, 1, function (ctx, t, dt) {
      var s = this.s || (this.s = townState(grown))
      s.time = t
      var z = 640 / 1600
      ctx.setTransform(this.dpr * z, 0, 0, this.dpr * z, 0, 0)
      SD.town.render(s, ctx, { w: 640 / z, h: 380 / z })
    })
  }
  townTile('the village, fully grown — top-down hub', true)
  townTile('the village on day one — empty lots', false)
}

// ---------- the missing tiles: story decor + effects ----------

// Side effect: everything drawn in the world that had no tile yet
function buildStoryTiles () {
  tile('sec-world', 'the ANEMONE — breached & enterable', 460, 250, 0.6, function (ctx, t, dt) {
    drawGiantWreck(ctx, { x: 0, y: 120, scale: 1 }, t)
  })
  tile('sec-world', 'the ANEMONE — fallen in her grave', 380, 280, 0.55, function (ctx, t, dt) {
    drawGiantWreck(ctx, { x: 0, y: 210, scale: 1, fallen: true }, t)
  })
  tile('sec-world', 'quarry marble & the carved giants', 340, 200, 0.8, function (ctx, t, dt) {
    drawQuarry(ctx, this.d || (this.d = {
      blocks: [
        { x: -120, y: 92, w: 80, h: 38, tilt: -0.08 },
        { x: -30, y: 96, w: 54, h: 26, tilt: 0.1 },
        { x: 130, y: 95, w: 66, h: 30, tilt: 0.04 }
      ],
      giants: [{ x: 55, y: 96, h: 150, tilt: -0.12 }]
    }))
  })
  tile('sec-world', 'the statue of Hermes', 200, 180, 1.4, function (ctx, t, dt) {
    drawHermes(ctx, { x: 0, y: 62 }, t)
  })
  tile('sec-world', 'the grouper carcass', 210, 130, 1.7, function (ctx, t, dt) {
    drawCarcass(ctx, { x: 0, y: 30 }, t)
  })
  tile('sec-world', 'a diver who never surfaced', 190, 120, 1.9, function (ctx, t, dt) {
    drawBones(ctx, -16, 22, t)
  })
  tile('sec-world', 'a cave torch', 160, 170, 1.5, function (ctx, t, dt) {
    drawTorch(ctx, 0, -34, t, 0, 0.4)
  })
  tile('sec-world', 'an ocean current lane', 360, 150, 1.0, function (ctx, t, dt) {
    drawCurrent(ctx, this.c || (this.c = { x: -165, y: -48, w: 330, h: 96, force: 90, phase: 0.6 }), t)
  })
  tile('sec-world', 'breathing bubbles', 170, 200, 1.4, function (ctx, t, dt) {
    var list = this.list || (this.list = [])
    this.acc = (this.acc || 0) + dt * 3
    while (this.acc > 1) {
      this.acc -= 1
      list.push({ x: -10 + Math.random() * 20, y: 70, vy: -(40 + Math.random() * 30), r: 1.2 + Math.random() * 2.6, life: 3 })
    }
    for (var i = list.length - 1; i >= 0; i--) {
      var b = list[i]
      b.y += b.vy * dt
      b.x += Math.sin(b.y * 0.05) * 12 * dt
      b.life -= dt
      if (b.life <= 0 || b.y < -70) list.splice(i, 1)
    }
    drawBubbles(ctx, list)
  })
  tile('sec-world', 'the harvest ring', 170, 150, 1.6, function (ctx, t, dt) {
    var item = this.item || (this.item = { type: 'sponge', x: 0, y: 8, phase: 0.4, progress: 0 })
    item.progress = (t % 1.8) / 1.8
    drawLoot(ctx, item, t)
    drawHarvestRing(ctx, { harvestTarget: item })
  })
}

// ---------- the missing tiles: the game's DOM UI ----------
// Real markup, styled by the REAL style.css inside a shadow root, so what
// scores well here is exactly what the player sees.

var UI_SAMPLES = [
  {
    title: 'the welcome panel (title screen)',
    desc: 'The first thing anyone sees: pottery panel, meander crown, the big red letters, Dive In. On phones it rises as a bottom sheet.',
    zoom: 0.62,
    html: '<div class="panel title-panel meander-top" style="width:600px">' +
      '<p class="title-eyebrow">Kalymnos, Ancient Greece — more or less</p>' +
      '<h1>ΣΦΟΥΓΓΑΡΑΣ</h1><p class="title-sub">The Sponge Diver</p>' +
      '<div class="panel-scroll"><p class="title-blurb">Wade out from the village, gather sponges off the rocks, and sell them at the dock. <em>The sea keeps its secrets. Go find them.</em></p>' +
      '<div class="controls-grid"><span><b>WASD / Arrows</b></span><span>swim</span><span><b>Esc</b></span><span>pause</span></div></div>' +
      '<div class="panel-foot"><button class="btn btn-big">Dive In</button></div></div>'
  },
  {
    title: 'the pottery buttons',
    desc: 'The button family: terracotta primary, quiet cream secondary, the disabled gray, the big call-to-action, and the round × that closes every menu.',
    zoom: 1,
    html: '<button class="btn">Offer 3 🐟</button>' +
      '<button class="btn btn-quiet">Mute</button>' +
      '<button class="btn" disabled>Not for sale — yet</button>' +
      '<button class="btn btn-big">Dive In</button>' +
      '<button class="panel-x" style="position:static">×</button>'
  },
  {
    title: 'the HUD — breath, level, purse, net bag',
    desc: 'Top-left of every dive: the breath bar (turns red under 28%), level + XP, depth and drachmae, and the net-bag pips that fill as you gather.',
    zoom: 1,
    html: '<div id="hud" style="position:static;display:flex;flex-direction:column;gap:10px;pointer-events:auto">' +
      '<div class="hud-panel meander-top"><div class="breath-row"><span class="hud-label">Breath</span>' +
      '<div class="breath-bar"><div id="breath-fill" style="width:64%"></div></div></div>' +
      '<div class="xp-row"><span class="hud-label" id="hud-level">Lv 7</span><div class="xp-bar"><div id="xp-fill" style="width:40%"></div></div></div>' +
      '<div class="hud-stats"><span>23 m</span><span id="hud-money">₯ 1,240</span></div></div>' +
      '<div class="hud-panel bag-panel meander-top"><span class="hud-label">Net Bag <em id="bag-weight">4/7 wt</em></span>' +
      '<div id="bag-pips"><span class="pip full"></span><span class="pip full"></span><span class="pip full"></span><span class="pip full"></span><span class="pip"></span><span class="pip"></span><span class="pip"></span></div>' +
      '<span class="hud-hold">⛵ Hold 11/24 wt</span></div></div>'
  },
  {
    title: 'the touch pills',
    desc: 'The floating controls: pause and mute ride the top-right corner; the context pills (chandlery, temple, forge, boat, Delphinus) surface at the bottom when they apply.',
    zoom: 1,
    html: '<button class="touch-btn" style="position:static;width:46px;height:46px;font-weight:bold">II</button>' +
      '<button class="touch-btn" style="position:static;width:46px;height:46px">🔊</button>' +
      '<button class="touch-btn" style="position:static;padding:12px 26px">🏺 Chandlery</button>' +
      '<button class="touch-btn" style="position:static;padding:12px 26px">⛵ Board</button>' +
      '<button class="touch-btn" style="position:static;width:46px;height:46px">🐬</button>'
  },
  {
    title: 'toasts — the running commentary',
    desc: 'Every pickup, sting and triumph slides in at the top right: plain cream for news, clay-red for warnings, gold for the big moments.',
    zoom: 1,
    html: '<div id="toasts" style="position:static;align-items:center">' +
      '<div class="toast">+ Fino Sponge (1 wt)</div>' +
      '<div class="toast warn">Moray bite!  −8 s</div>' +
      '<div class="toast big">🔱 THE TRIDENT OF POSEIDON — your spear now strikes as three</div></div>'
  },
  {
    title: 'the region caption',
    desc: 'The place-name pill that fades in as you cross into each named water — ink glass, cream border, readable over bright sky and black deep alike.',
    zoom: 1,
    html: '<div id="caption" class="show" style="position:static;transform:none;opacity:1">— The Kelp Forest —</div>'
  },
  {
    title: 'the sell tally',
    desc: 'The receipt that drops when the dock hands (or the kaiki’s hold) sell your catch: line items, the ruled total, the experience note.',
    zoom: 1,
    html: '<div id="tally" class="meander-top" style="position:static;transform:none">' +
      '<h3>Catch Sold at the Dock</h3>' +
      '<div class="tally-line"><span>Sponge × 4</span><span>₯ 32</span></div>' +
      '<div class="tally-line"><span>Murex Snail</span><span>₯ 35</span></div>' +
      '<div class="tally-line"><span>Amphora</span><span>₯ 90</span></div>' +
      '<div class="tally-total"><span>Total</span><span>₯ 157</span></div>' +
      '<div class="tally-note">+41 experience</div></div>'
  },
  {
    title: 'a chandlery card',
    desc: 'One card of the shop grid: icon, tier pips, the flavor line, the effect it buys, and the price button (gray until you can afford it).',
    zoom: 1,
    html: '<div class="shop-card" style="width:300px">' +
      '<div class="card-icon">🫒</div><div class="card-body">' +
      '<h3>Olive-Oil Goggles <span class="tier-pips">●●○○○</span></h3>' +
      '<div class="card-flavor">Lens tech of the ancients. Extra virgin, obviously.</div>' +
      '<div class="card-effect">Clear sight &amp; light below: <b>clear</b> → <b>keen</b></div>' +
      '<button class="btn">₯ 170</button></div></div>'
  },
  {
    title: 'the parchment (a message in a bottle)',
    desc: 'Nikandros’ letters unroll on aged paper with an inner vignette — the game’s only prose moments.',
    zoom: 0.8,
    html: '<div class="panel parchment-panel" style="width:430px">' +
      '<p class="parchment-eyebrow">A message, sealed with wax</p>' +
      '<div class="panel-scroll"><p class="parchment-text">«The columns of fire throw a man upward like a cork from a jar. Go down BETWEEN the fires, take the black glass, and ride a column home laughing.»</p>' +
      '<p class="parchment-sign">— Νίκανδρος</p></div>' +
      '<div class="panel-foot"><button class="btn">Fold it away</button></div></div>'
  },
  {
    title: 'the town parley box',
    desc: 'The village dialog: keeper name and trade, their greeting, and the deal buttons. Appears when you talk (E) in the top-down village.',
    zoom: 1,
    html: '<div id="town-dialog" class="meander-top" style="position:static;transform:none;left:auto;bottom:auto">' +
      '<h3>Thalassia <span class="town-trade">— The Jeweler’s Stall</span></h3>' +
      '<p>«Pearls want light, diver. Bring them to me — the dock hands would weigh them like turnips.»</p>' +
      '<div class="town-actions"><button class="btn">Sell 3 pieces — ₯ 264</button>' +
      '<button class="btn btn-quiet">Leave</button></div></div>'
  }
]

// Side effect: builds the UI section — fetches the game's real stylesheet
// and renders each sample inside a shadow root so the lab's own styles
// and the game's never touch
function buildUiTiles (done) {
  fetch('style.css').then(function (r) { return r.text() }).then(function (css) {
    for (var i = 0; i < UI_SAMPLES.length; i++) {
      uiTile(UI_SAMPLES[i], css)
    }
    done()
  }).catch(function () {
    var note = document.createElement('p')
    note.className = 'ui-fetch-note'
    note.textContent = 'The UI samples need the stylesheet over http — run `python3 art-server.py` and open the lab from localhost.'
    document.getElementById('sec-ui').appendChild(note)
    done()
  })
}

// Side effect: one DOM-sample tile with the game CSS scoped into a shadow root
function uiTile (sample, css) {
  var card = document.createElement('div')
  card.className = 'tile ui-tile'
  var host = document.createElement('div')
  host.className = 'ui-sample'
  card.appendChild(host)
  var cap = document.createElement('div')
  cap.className = 'cap'
  cap.appendChild(document.createTextNode(sample.title))
  card.appendChild(cap)
  document.getElementById('sec-ui').appendChild(card)

  var root = host.attachShadow({ mode: 'open' })
  var style = document.createElement('style')
  // the game defines its palette on :root, which doesn't exist inside a
  // shadow root — remap it to :host so every var() resolves
  style.textContent = css.replace(/:root\b/g, ':host') +
    '\n.stage { padding: 18px 20px; display: flex; flex-wrap: wrap; gap: 10px;' +
    ' align-items: flex-start; justify-content: center; color: var(--ink);' +
    ' zoom: ' + (sample.zoom || 1) + '; }' +
    '\n.stage .panel { animation: none; max-height: none; }' +
    '\n.stage #caption { pointer-events: auto; max-width: 100%; }' +
    '\n.stage .toast { max-width: 100%; }'
  root.appendChild(style)
  var stage = document.createElement('div')
  stage.className = 'stage'
  stage.innerHTML = sample.html
  root.appendChild(stage)
}

// ---------- the descriptions ----------
// Keyed by sectionId|tile title. Anything not listed gets an auto line
// (loot and fauna read their own facts out of config).

var DESC = {
  // — scenes —
  'sec-scenes|the village & dock': 'Home: whitewashed houses, the olive tree, sponges drying on the line, the jetty market, the judging gull. Every dive starts and ends here.',
  'sec-scenes|the sponge beds': 'The rolling first hills of the sea, 3–20 m. Boulders wear common sponges; urchins wear the boulders.',
  'sec-scenes|the divers’ cave': "A boulder dome over a 33 m slot — pale fino sponges inside, and Nikandros' first bottle.",
  "sec-scenes|the divers' cave": "A boulder dome over a 33 m slot — pale fino sponges inside, and Nikandros' first bottle.",
  'sec-scenes|the seagrass meadows': 'Tall posidonia carpet, gorgonian fans, seahorses — and a great grouper carcass with an old kamaki in it.',
  'sec-scenes|the kelp forest': 'Five kilometres of stalks, seafloor to surface, every one bowed and swaying. A boat sails clean over the canopy.',
  'sec-scenes|the kelp well': 'The 80 m throat under the forest: staggered ledges, dark water, laurel at the bottom — and a kelp-choked opening in the east wall.',
  'sec-scenes|the pearl banks': 'Oyster country under drifting jellyfish curtains. The Great Pearl sleeps here in its ring of stingers.',
  'sec-scenes|the sunken quarry': 'A drowned industry: cut blocks, fallen colonnades, and half-carved giants still staring up the slope.',
  'sec-scenes|the graveyard of ships': 'A fleet’s bones at 66–88 m. Reef sharks patrol; Karcharias hunts.',
  'sec-scenes|the wreck of the ANEMONE (swim inside!)': 'The giant merchant wreck, breached amidships — swim into the hold past the ribs while the white shark circles outside.',
  "sec-scenes|hephaestus' vents": 'Seven basalt chimneys throwing cones of lift all the way to ~8 m below the surface. Go down between the fires; ride one home.',
  'sec-scenes|the caves of hephaestus (air pockets!)': 'The lava tube under the vents shelf: torch-lit domes of trapped air, obsidian seams, morays on the doors.',
  'sec-scenes|the forge of hephaestus': 'The smith’s dry ledge in the deepest vault — hearth, anvil, quench pot, and the god at work.',
  "sec-scenes|poseidon's plain — the hoard": 'The flat 135 m arena: gold mounds, the shrine, the trident — and the god who guards them.',
  "sec-scenes|the kraken's grotto": 'A slot in the plain’s east wall under a heavy stone brow. Reach too close and a tentacle takes you.',
  "sec-scenes|poseidon's storm — over the plain": 'The standing storm that marks the god’s water from the surface — dark sky, driven rain, a warning to sailors.',
  'sec-scenes|aphrodite’s lagoon & the blue hole': 'Bright, easy, teeming water — hiding a 65 m turquoise shaft straight down.',
  'sec-scenes|the temple mountain': 'The hollow mountain at the world’s east end — solid rock above, carved passage below.',
  'sec-scenes|the cavern passage (carved terrain)': 'The way in: the cliff face, then a low roof pressing you along as the floor falls away.',
  'sec-scenes|the temple of the deep (the great cavern)': 'The dome of trapped air over the plateau: braziers, the shrine, a waterline lapping in the dark.',

  // — town —
  'sec-town|the village, fully grown — top-down hub': 'The walkable village (V at the dock): plaza and well, jetty home, seven keepers at their doors. Zelda-style flat vector, pottery palette.',
  'sec-town|the village on day one — empty lots': 'The same streets before anyone arrives: dashed empty lots and weeds. Keepers move in when you first land the goods they trade in.',

  // — diver —
  'sec-diver|swimming': 'The working stroke. Bare feet frog-kick; fins flutter from the hip; god-tier fins become a monofin dolphin wave. Fitness broadens the shoulders and browns the skin.',
  'sec-diver|the skandalopetra drop': 'The old way down: gripping the diving stone, arm to the rock, body long — descent speed bought with stillness.',
  'sec-diver|kamaki strike (loops)': 'The spear thrust. Golden (and three-tined) once the Trident is claimed.',
  'sec-diver|harvesting (knife out)': 'The knife comes out while the gather-ring fills; walking away undoes the cut.',
  "sec-diver|the dolphin (Delphinus' Gift, Q)": 'First form of Delphinus’ Gift: faster, thriftier lungs, no hands. The whole body rides one wave.',
  'sec-diver|THE ORCA (tier 2)': 'The second form: the wolf of the sea. Faster still, blubber shrugs off stings.',
  'sec-diver|the breach somersault (loops)': 'Break the surface with speed and the form somersaults — pure joy, plus a tail-kick of exit speed.',
  'sec-diver|yiannis — the surface watch': 'Cousin Yiannis, the safety buddy: snorkel on, rescue line coiled, eye always on you. The first rule, kept.',
  'sec-diver|yiannis — the rescue dive': 'When you black out within his reach, he comes down and hauls you to the light.',
  'sec-diver|yiannis — riding the kaiki': 'Between dives he keeps the deck. He never leaves the watch.',

  // — poseidon —
  'sec-poseidon|asleep over the hoard': 'The Earth-Shaker at rest: crown, white beard, trident held upright, drifting slowly over his gold.',
  'sec-poseidon|awake': 'Eyes lit ice-blue, aura wide and cold — the water trembles.',
  'sec-poseidon|windup': 'The arm draws back. This is your moment to move.',
  'sec-poseidon|THE THRUST (loops)': 'The full attack cycle: windup, the driving thrust with its wake, the slow recover.',

  // — hephaestus —
  'sec-hephaestus|the smith at work (loops)': 'The lame god at his anvil: hammer raised on a slow cycle, sparks on the strike, the exomis knotted off the hammer shoulder.',
  'sec-hephaestus|the forge set, on the real ledge': 'His workplace as it stands in the caves: hearth-fire, anvil on its stump, quench pot, finished spear on the wall.',
  'sec-hephaestus|an air dome (breathe here)': 'A pocket of trapped air against the carved roof — its own silver waterline, its own stray bubbles, torch-lit.',

  // — bosses —
  'sec-bosses|KARCHARIAS': 'The white shark, twice a shark and angrier: circles wide, then charges in a straight line. Harpoon scars, dead black eye.',
  'sec-bosses|THE KRAKEN': 'Lord of its grotto: hooded mantle, eight tapering arms with suckers, one great lamp of an eye that tracks you.',
  'sec-bosses|KETOS': 'The roaming leviathan: one unbroken serpent body behind a horned, long-jawed head. Pottery monsters, done right.',

  // — fauna —
  'sec-fauna|a school (decor)': 'Ambient silver fish, purely decorative — they drift the lanes and shy off rising ground.',
  'sec-fauna|monk seal (decor)': 'The Mediterranean monk seal — plump, whiskered, sculling slow laps of the sunny shallows.',
  'sec-fauna|manta ray (decor)': 'A manta soaring on slow wingbeats, wings thinning to a blade edge-on mid-beat. Banks gently along its lap.',

  // — dangers —
  'sec-dangers|sea urchin': 'Stationary, spiky, everywhere rocks are. Costs seconds of breath to touch.',
  'sec-dangers|jellyfish': 'Slow vertical drifters with a pink glow — they also carry their own light in the dark.',
  'sec-dangers|moray eel': 'Lurks in a rock, lunges at close prey. A good knife (iron+) drives it back.',
  'sec-dangers|reef shark': 'Patrols below 52 m; leans meaner when it chases. A bite knocks loot from your bag.',
  'sec-dangers|abyss shark': 'The trench hunter: bigger, darker, red of eye, and it ranges higher before giving up.',
  'sec-dangers|ink squid': 'Drifts the mid-dark; ink the curious and jets away. The world shrinks to arm’s length.',

  // — world pieces —
  'sec-world|the kaiki, fresh from the yard': 'Tier 1 of the boat: honest hull, furled workaday rag, the painted bow eye watching for luck.',
  'sec-world|hold II + white sail': 'The hull stretches with the hold; the first true sail unfurls; railing posts appear.',
  'sec-world|hold III + Sails of Boreas': 'The proper ship: gold rail, purple wind-blessed sail with the meander, the diver braced at the tiller.',
  'sec-world|kelp stalk': 'One stalk of the forest: a permanent lazy S-bend, sway on top, blades alternating like real fronds.',
  'sec-world|seagrass': 'The humble tuft that carpets the meadows.',
  'sec-world|gorgonian fan': 'Pink and rust sea fans swaying on the bright bottoms.',
  'sec-world|seahorse': 'A seahorse holding its patch of meadow.',
  'sec-world|column': 'Drowned marble — standing, broken, or fallen in the quarry’s colonnade.',
  'sec-world|wreck': 'The common wreck of the graveyard: dark bones, a pale rim of remembered sun along the hull.',
  'sec-world|the shrine': 'Poseidon’s shrine: pedestal, columns, pediment — where the trident stands.',
  'sec-world|hoard mounds': 'The god’s gold, heaped and glinting, goblets on the bigger piles.',
  "sec-world|Hephaestus' vent": 'A basalt chimney split by ember cracks, breathing a shimmering cone of lift that widens to the surface.',
  'sec-world|boulder': 'The workhorse rock: deterministic facets, lit crown, contact shadow. Sponges grow on it; eels live in it.',
  'sec-world|the ANEMONE — breached & enterable': 'The giant merchant hull in profile: ram bow, curled stern, torn planking amidships you can swim through, fallen mast and rag of sail.',
  'sec-world|the ANEMONE — fallen in her grave': 'After the strongbox is taken she slides stern-first into the crevasse she tore open — forever.',
  'sec-world|quarry marble & the carved giants': 'Cut blocks and a half-carved colossus, chisel marks still on the stone, its calm eye staring up the slope.',
  'sec-world|the statue of Hermes': 'The barnacled god in his alcove, arm out in the old gesture of giving — the bronze fins wait at his feet.',
  'sec-world|the grouper carcass': 'The great fish picked clean in the meadows, the old kamaki still standing in what it last struck.',
  'sec-world|a diver who never surfaced': 'Bones on the sand, one socket watching, one arm still reaching. There are four of them out there.',
  'sec-world|a cave torch': 'The smith keeps his caves lit: a bronze bracket in the rock, a wrapped head, a flame that always points up.',
  'sec-world|an ocean current lane': 'A broad lane of moving water, betrayed only by drifting streaks — it shoves you sideways.',
  'sec-world|breathing bubbles': 'The diver’s exhale, wobbling up. Every sting and splash bursts a cloud of them.',
  'sec-world|the harvest ring': 'The gold progress ring that fills while you hover close to loot. Walking away unwinds it.',
  'sec-world|the village (walkable, top-down)': 'The town hub seen in miniature — same renderer as the Village section above.'
}

// Pure: an auto-description for loot tiles, read out of config
function lootAutoDesc (name) {
  for (var type in SD.config.lootTypes) {
    var info = SD.config.lootTypes[type]
    if (info.name !== name) continue
    var bits = []
    if (!lootSketch[type]) bits.push('⚠ NO ART YET — the game draws nothing for this')
    if (info.value > 0) bits.push('sells ₯' + info.value)
    if (info.offering) bits.push('tribute worth ' + info.offering + ' 🐟')
    if (info.weight) bits.push(info.weight + ' wt')
    if (info.minM || info.maxM) bits.push(Math.round(info.minM) + '–' + Math.round(info.maxM) + ' m down')
    if (info.regrow) bits.push('regrows in ~' + Math.round(info.regrow / 60 * 10) / 10 + ' min')
    if (info.relic) bits.push('a relic — never enters the bag, never leaves you')
    if (info.heavy) bits.push('HEAVY — needs a big net')
    if (info.event) bits.push('a one-time story find')
    return bits.join(' · ')
  }
  return null
}

// Pure: an auto-description for fauna tiles
function faunaAutoDesc (name) {
  for (var kind in SD.config.fauna) {
    var f = SD.config.fauna[kind]
    if (f.name !== name) continue
    return 'Speared for tribute (' + f.offering + ' 🐟, +' + f.xp + ' xp) · lives ' +
      f.minM + '–' + f.maxM + ' m · cruises, then bolts when you get close'
  }
  return null
}

// Pure: the description for a tile card
function descFor (secId, title) {
  var d = DESC[secId + '|' + title]
  if (d) return d
  if (secId === 'sec-loot') return lootAutoDesc(title) || 'One of the sea’s takeable things.'
  if (secId === 'sec-fauna') return faunaAutoDesc(title) || 'One of the sea’s creatures.'
  if (secId === 'sec-ui') {
    for (var i = 0; i < UI_SAMPLES.length; i++) {
      if (UI_SAMPLES[i].title === title) return UI_SAMPLES[i].desc
    }
  }
  return 'New art — not yet described. Score away.'
}

// ---------- scoring ----------

var STORE_KEY = 'spongeDiverArtScoresV1'
var scores = {}          // slug -> { score, note }
var saveTimer = null
var serverOk = null      // null unknown, true, false

// Side effect: loads scores — localStorage first, art-scores.json as seed
function loadScores (done) {
  try {
    var raw = localStorage.getItem(STORE_KEY)
    if (raw) {
      scores = JSON.parse(raw).scores || {}
      done()
      return
    }
  } catch (e) { /* fresh start */ }
  fetch('art-scores.json').then(function (r) {
    if (!r.ok) throw new Error('none yet')
    return r.json()
  }).then(function (doc) {
    scores = (doc && doc.scores) || {}
    done()
  }).catch(function () { done() })
}

// Pure: the full score document, ready to persist
function scoreDoc () {
  return { updated: new Date().toISOString(), game: 'Σφουγγαράς — Sponge Diver', scale: '1–11', scores: scores }
}

// Side effect: persists to localStorage now and the repo (debounced)
function saveScores () {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(scoreDoc())) } catch (e) { /* private mode */ }
  clearTimeout(saveTimer)
  saveTimer = setTimeout(postScores, 500)
  updateStatus()
}

// Side effect: POSTs the document to art-server.py, if it's listening
function postScores () {
  fetch('/art-scores', { method: 'POST', body: JSON.stringify(scoreDoc()) })
    .then(function (r) { serverOk = r.ok; updateStatus() })
    .catch(function () { serverOk = false; updateStatus() })
}

// Side effect: refreshes the toolbar chip — progress and where scores live
function updateStatus () {
  var total = document.querySelectorAll('.tile').length
  var n = 0
  var low = 0
  for (var k in scores) {
    if (scores[k].score) {
      n++
      if (scores[k].score <= 5) low++
    }
  }
  var chip = document.getElementById('score-status')
  chip.textContent = '★ ' + n + '/' + total + ' scored' + (low ? ' · ' + low + ' need work' : '')
  var where = document.getElementById('score-where')
  where.textContent = serverOk === true ? '→ art-scores.json ✓'
    : serverOk === false ? '→ browser only (run art-server.py)'
      : ''
}

// Side effect: builds the 1–11 score row + note box under one tile card
function decorateTile (card) {
  if (card.querySelector('.score-row')) return
  var secId = card.parentNode.id
  var cap = card.querySelector('.cap')
  var title = cap ? cap.childNodes[0].nodeValue.trim() : '?'
  var slug = secId + '|' + title
  card.setAttribute('data-slug', slug)

  var desc = document.createElement('div')
  desc.className = 'desc'
  desc.textContent = descFor(secId, title)
  card.appendChild(desc)

  var row = document.createElement('div')
  row.className = 'score-row'
  var label = document.createElement('span')
  label.className = 'score-label'
  label.textContent = 'score'
  row.appendChild(label)
  for (var i = 1; i <= 11; i++) {
    (function (val) {
      var b = document.createElement('button')
      b.textContent = val
      if (val === 11) b.classList.add('eleven')
      if (scores[slug] && scores[slug].score === val) b.classList.add('picked')
      b.addEventListener('click', function () {
        scores[slug] = scores[slug] || {}
        scores[slug].score = val
        scores[slug].section = secId
        row.querySelectorAll('button').forEach(function (o) { o.classList.remove('picked') })
        b.classList.add('picked')
        card.classList.toggle('low-scored', val <= 5)
        saveScores()
      })
      row.appendChild(b)
    })(i)
  }
  card.appendChild(row)

  var note = document.createElement('input')
  note.className = 'note-input'
  note.type = 'text'
  note.placeholder = 'note for Claude — what’s wrong / what’s great?'
  note.value = (scores[slug] && scores[slug].note) || ''
  note.addEventListener('input', function () {
    scores[slug] = scores[slug] || {}
    scores[slug].note = note.value
    scores[slug].section = secId
    saveScores()
  })
  card.appendChild(note)

  if (scores[slug] && scores[slug].score && scores[slug].score <= 5) card.classList.add('low-scored')
}

// Side effect: decorates every tile on the page
function decorateAll () {
  document.querySelectorAll('.grid .tile').forEach(decorateTile)
  updateStatus()
}

// ---------- toolbar: filter, export, copy ----------

// Side effect: applies the visibility filter to every tile
function applyFilter (mode) {
  document.querySelectorAll('.grid .tile').forEach(function (card) {
    var slug = card.getAttribute('data-slug')
    var s = scores[slug] && scores[slug].score
    var show = mode === 'all' ||
      (mode === 'unscored' && !s) ||
      (mode === 'low' && s && s <= 5) ||
      (mode === 'great' && s && s >= 9)
    card.style.display = show ? '' : 'none'
  })
}

// Pure: a text digest of the scores, worst first — for pasting to Claude
function scoreSummary () {
  var rows = []
  for (var slug in scores) {
    if (scores[slug].score) rows.push({ slug: slug, s: scores[slug].score, note: scores[slug].note || '' })
  }
  rows.sort(function (a, b) { return a.s - b.s })
  var out = 'Art Lab scores (' + rows.length + ' pieces, 1–11):\n'
  for (var i = 0; i < rows.length; i++) {
    out += rows[i].s + '/11 — ' + rows[i].slug.replace('|', ' · ') +
      (rows[i].note ? '  [' + rows[i].note + ']' : '') + '\n'
  }
  return out
}

// Side effect: wires the review toolbar controls
function initToolbar () {
  var bar = document.querySelector('.toolbar')

  var chip = document.createElement('span')
  chip.id = 'score-status'
  chip.className = 'chip'
  bar.insertBefore(chip, bar.firstChild)

  var where = document.createElement('span')
  where.id = 'score-where'
  where.className = 'chip quiet'
  bar.insertBefore(where, bar.firstChild)

  var filter = document.createElement('select')
  filter.id = 'score-filter'
  filter.innerHTML = '<option value="all">show all</option>' +
    '<option value="unscored">unscored</option>' +
    '<option value="low">needs work (≤5)</option>' +
    '<option value="great">the good stuff (9+)</option>'
  filter.addEventListener('change', function () { applyFilter(filter.value) })
  bar.appendChild(filter)

  var exp = document.createElement('button')
  exp.textContent = '⬇ Export'
  exp.title = 'Download art-scores.json (for when the server isn’t running)'
  exp.addEventListener('click', function () {
    var blob = new Blob([JSON.stringify(scoreDoc(), null, 2)], { type: 'application/json' })
    var a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'art-scores.json'
    a.click()
    URL.revokeObjectURL(a.href)
  })
  bar.appendChild(exp)

  var copy = document.createElement('button')
  copy.textContent = '📋 Copy for Claude'
  copy.title = 'Copy a worst-first digest of your scores to paste in chat'
  copy.addEventListener('click', function () {
    navigator.clipboard.writeText(scoreSummary()).then(function () {
      copy.textContent = '📋 Copied!'
      setTimeout(function () { copy.textContent = '📋 Copy for Claude' }, 1400)
    })
  })
  bar.appendChild(copy)
}

// ---------- boot ----------

// art-lab.js binds Space to freeze-all and preventDefaults it — which eats
// the spacebar inside the note boxes. Catch it in the capture phase first:
// typing fields keep their spaces, the sea keeps its hotkey.
window.addEventListener('keydown', function (ev) {
  var el = ev.target
  var typing = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
  if (ev.code === 'Space' && typing) ev.stopPropagation()
}, true)

buildTownTiles()
buildStoryTiles()
loadScores(function () {
  initToolbar()
  buildUiTiles(function () {
    decorateAll()
    postScores() // announce ourselves — also detects whether the server is up
  })
})
