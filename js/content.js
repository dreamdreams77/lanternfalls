/* Lanternfall - content: charms, shop, lore, dialogue, tips, ending */
(function () {
  'use strict';
  const LF = window.LF;

  LF.CHARMS = {
    quick: { name: 'Quick Flame', icon: 'quick', desc: 'Strike faster.' },
    swift: { name: 'Swift Wick', icon: 'swift', desc: 'Run 13% faster.' },
    might: { name: 'Heart of Embers', icon: 'might', desc: '+1 strike damage.' },
    glow: { name: 'Glowmoss', icon: 'glow', desc: 'Your lantern shines farther.' },
    dust: { name: 'Moth Dust', icon: 'dust', desc: 'Embers drift to you.' },
    thorn: { name: 'Thornheart', icon: 'thorn', desc: 'Being hurt bursts nearby foes.' },
    spark: { name: 'Ember Spark', icon: 'spark', desc: '+50% embers from foes.' },
    echo: { name: 'Echo Flame', icon: 'echo', desc: 'Strikes loose a short ember bolt.' },
    ward: { name: 'Moth Ward', icon: 'ward', desc: 'Longer safety after being hurt.' },
    siphon: { name: 'Flame Siphon', icon: 'siphon', desc: 'Fill the Flare gauge 50% faster.' },
    frost: { name: 'Frostbite', icon: 'frost', desc: 'Your strikes chill foes, slowing them.' },
    phoenix: { name: 'Phoenix Ash', icon: 'phoenix', desc: 'Once per shrine, survive a fatal blow.' }
  };

  // Pip's shop. type: charm | slot | dmg | light | flask
  LF.SHOP = [
    { id: 'swift', type: 'charm', cost: 60 },
    { id: 'dust', type: 'charm', cost: 70 },
    { id: 'glow', type: 'charm', cost: 80 },
    { id: 'spark', type: 'charm', cost: 90 },
    { id: 'thorn', type: 'charm', cost: 110 },
    { id: 'might', type: 'charm', cost: 140 },
    { id: 'siphon', type: 'charm', cost: 130 },
    { id: 'echo', type: 'charm', cost: 160 },
    { id: 'phoenix', type: 'charm', cost: 240 },
    { id: 'slot', type: 'slot', name: 'Charm Slot', icon: 'lock', desc: 'Carry one more charm.', cost: 220, max: 2 },
    { id: 'fcost', type: 'up', key: 'fcost', name: 'Bright Core', icon: 'flare', desc: 'Flare needs less gauge.', costs: [150, 300] },
    { id: 'fgain', type: 'up', key: 'fgain', name: 'Wick Tinder', icon: 'siphon', desc: 'Fill the Flare gauge faster.', costs: [130, 260] },
    { id: 'dmg', type: 'dmg', name: 'Whetted Wick', icon: 'dmg', desc: 'Permanent +1 strike damage.', costs: [150, 320] },
    { id: 'light', type: 'light', name: 'Brighter Lantern', icon: 'light', desc: 'Permanent wider light.', costs: [90, 190] },
    { id: 'flask', type: 'flask', name: 'Oil Flask', icon: 'lantern', desc: 'Kindling costs fewer embers.', costs: [120, 240] }
  ];

  LF.LORE = {
    glade: ['Lantern Glade', 'Every night a lantern was hung here. Tonight, none. The meadow remembers the light.'],
    stump: ['Stump Ledger', 'Pip owes the moss 14 embers. The moss does not accept IOUs.'],
    burrow: ['Burrow Wall', 'Scratched: "If you found the chest, you found the secret. If you found the secret, tell no one."'],
    bridge: ['Rootbridge Marker', 'Roots grow where the old road fell. The thorns grew after the lanterns failed.'],
    thicket: ['Thicket Warning', 'Beyond the Bower, the Thornmother grieves. Her grief has teeth.'],
    descent: ['Descent Etching', 'The Glimmer Deep drinks the light we send down. In return it gives us crystals.'],
    cavern: ['Cavern Etching', 'Dash through cracked stone. The old ones forged a lantern that could burst through anything.'],
    altar: ['Altar Inscription', 'A wick that burns fast burns bright. Take the Dash, bearer.'],
    lake: ['Lakeside Note', 'The Prism Weaver spins light into webs. Break the webs, break the weaver.'],
    prism: ['Prism Hall', 'Light has seven faces. The Weaver kept only the sharp ones.'],
    entry: ['Chapel Door', 'The Chapel sank on the night the bell stopped ringing. The bell still rings, below.'],
    nave: ['Nave Pew', 'Prayers pooled here until they were water. Pull the lever; the old bars still obey.'],
    glide: ['Glide Shrine', 'Moth-kin gave us their wings once. Hold jump in the air and remember how to fall slowly.'],
    chasm: ['Chasm Edge', 'Jump high, then glide. Spikes do not forgive hesitation.'],
    tide: ['Bell Tower', 'The Drowned Bell tolls for those who still carry a light. Silence it.'],
    foot: ['Spire Gate', 'Three sigils: Root, Prism, Tide. The Warden asks for all of them.'],
    climb: ['Climb Graffiti', 'You are not alone on the climb. Others reached this ledge. None returned for the sign.'],
    summit: ['Summit Stone', 'Here the Great Lantern fell. Relight it, or let the dark finish its sentence.']
  };

  // Dialogue: functions returning {who, lines, act}. act: 'shop' | give hooks handled in game.
  LF.DIALOG = {
    wick(G) {
      const s = G.save, f = s.flags, m = s.moths.length;
      if (!f.wick_met) { f.wick_met = 1; return { who: 'Wick', lines: ['Oh! A flame that walks! I am Wick, keeper of this glade.', 'The Great Lantern fell from the Ember Spire, little ember. The Hollow grew thorns and shadows.', 'Strike with X. Dash with C once you find the way. Light shrines to remember where you are.', 'Hold DOWN while standing still to kindle your wounds with embers.', 'Bring me moths, the glowing kind. They are shy, but I reward the patient.'] }; }
      if (m >= 3 && !f.wick_dust) { f.wick_dust = 1; return { who: 'Wick', lines: ['Three moths! They sing about you, you know.', 'Take this. Moth Dust: embers will drift to you.'], give: 'charm:dust' }; }
      if (m >= 8 && !f.wick_slot) { f.wick_slot = 1; return { who: 'Wick', lines: ['Eight moths... they would follow you into the Spire.', 'Here, a hollow in my staff. A new charm slot, for you.'], give: 'slot' }; }
      if (f.boss_warden) return { who: 'Wick', lines: ['The glade is warm again. Look at the lanterns!', 'Whatever you do next, ember, you have already been enough.'] };
      if (f.boss_tide) return { who: 'Wick', lines: ['The Spire gate is open to you. Climb well.'] };
      if (f.boss_thorn) return { who: 'Wick', lines: ['The Thornmother is quiet. That is something.', 'Beyond the Thicket gate lies the Glimmer Deep. Dark, but kind to travelers.'] };
      return { who: 'Wick', lines: [m < 3 ? 'Moths hide in nooks and high places. Look up. Look behind walls.' : 'More moths, more moths. I always want more moths.', 'The Thornmother waits past the Thicket. You will need the double jump from the altar there.'] };
    },
    pip(G) {
      const f = G.save.flags;
      if (!f.pip_met) { f.pip_met = 1; return { who: 'Pip', lines: ['Customer! Real, breathing, ember-carrying customer!', 'Pip sells charms, sharpening, and cheerful lies. Mostly the first two.'], act: 'shop' }; }
      return { who: 'Pip', lines: [f.boss_warden ? 'Hero of the Hollow shops here! I will put that on the sign.' : 'Spend, spend, spend! The embers are not getting any warmer in your pocket.'], act: 'shop' };
    },
    marrow(G) {
      const f = G.save.flags;
      if (!f.marrow_met) { f.marrow_met = 1; return { who: 'Marrow', lines: ['Mm. A visitor. I am Marrow, a mushroom of few words.', 'Cracked orange stone breaks when you dash into it. Glass-blue crystals make fine hiding places.', 'The Weaver lives past the lake. It does not like being watched.'] }; }
      return { who: 'Marrow', lines: ['Mm. Illusions in the walls. Walk into suspicious corners.', f.boss_prism ? 'The Weaver is gone. The Chapel below should be reachable now.' : 'Find the dash. Then the cracked stone will yield.'] };
    },
    vesper(G) {
      const f = G.save.flags;
      if (!f.vesper_met) { f.vesper_met = 1; return { who: 'Vesper', lines: ['You can hear me? How rare. I rang the Bell, once.', 'It rings by itself now, calling the light below, where the water keeps it.', 'Pull the lever in the Nave. Then find the moth-kin shrine for wings.'] }; }
      return { who: 'Vesper', lines: [f.boss_tide ? 'The bell is silent. Thank you. I can rest now.' : 'The Bell Tower is past the chasm. Glide, do not fall.'] };
    }
  };

  LF.TIPS = {
    move: ['A / D or arrows to move. SPACE to jump (hold to jump higher).', 'Use the left and right buttons to move. JUMP to leap.'],
    attack: ['X (or J) to strike. Hold UP or DOWN for vertical strikes.', 'Tap HIT to strike. Hold UP or DOWN for vertical strikes.'],
    interact: ['Press UP or E to interact.', 'Tap ACT to interact.'],
    dash: ['C or SHIFT to dash. Dash breaks orange-cracked stone.', 'Tap DASH. Dash breaks orange-cracked stone.'],
    dbl: ['Press jump again in the air to double jump.', 'Tap JUMP again in the air to double jump.'],
    glide: ['Hold JUMP while falling to glide.', 'Hold JUMP while falling to glide.'],
    heal: ['Hold DOWN while standing still to kindle a heart (costs embers).', 'Hold the down button while standing still to kindle a heart.'],
    wall: ['This wall looks cracked. Strike it a few times.', 'This wall looks cracked. Strike it a few times.'],
    pogo: ['Strike DOWN in the air to bounce off enemies and spikes.', 'Strike DOWN in the air to bounce off enemies.']
  };

  LF.ENDING = [
    'The Great Lantern ignites. Light climbs the Spire, crosses the Glimmer Deep,\nthe Drowned Chapel, the Thicket, the glade.',
    'Somewhere, Wick laughs. Pip adds a line to the sign. Marrow says nothing,\nwhich is, for a mushroom, a speech.',
    'You are the flame that walked. The Hollow remembers.',
    'LANTERNFALL\n\nA game made of light and procedural pixels.\nThank you for carrying the flame.'
  ];

  LF.BOSS_NAMES = { snowking: 'The Frost King', thorn: 'The Thornmother', prism: 'The Prism Weaver', tide: 'The Drowned Bell', warden: 'The Hollow Warden' };
  LF.ABIL_INFO = {
    dbl: ['Moth Wings', 'Jump again in mid-air.', 'dbl'],
    dash: ['Ember Dash', 'Burst forward. Breaks cracked orange stone.', 'dash'],
    glide: ['Dusk Glide', 'Hold jump while falling to glide.', 'glide']
  };

  /* Bestiary: [name, flavour]. Unlocks on first defeat. */
  LF.BEAST = {
    slime: ['Mossling', 'Soft, damp and optimistic. It follows the warm patches of the floor.'],
    beetle: ['Lantern Beetle', 'Armoured shell, stubborn mind. It stops to think, then does not.'],
    mothfoe: ['Hollow Moth', 'A moth that forgot the lantern and kept the hunger.'],
    bat: ['Dusk Bat', 'Hangs until the light passes beneath. Then it remembers it has teeth.'],
    thorn: ['Thornling', 'A bramble that learned to throw its own barbs.'],
    wisp: ['Pale Wisp', 'A lost spark that wants company. Its company hurts.'],
    jelly: ['Drift Jelly', 'Drowned light with a slow temper. It bobs along the ceiling currents.'],
    snowman: ['Frostling', 'A snowman that learned to throw. The hat is for show; the aim is not.'],
    husk: ['Chapel Husk', 'Once a pilgrim. It winds up its swing, so wait for it.']
  };
  LF.ELITE = {
    gilded: ['Gilded', '#ffd27a', 'Tough, but pays in embers.'],
    volatile: ['Volatile', '#ff6f7d', 'Bursts into sparks when it falls.'],
    swift: ['Swift', '#7ad8ff', 'Moves far faster than its kin.'],
    shielded: ['Shielded', '#b0c0ff', 'Blocks strikes from the front. Hit it from behind, or from above or below.']
  };
  /* Bounties auto-claim when complete. test(save) -> [progress, goal] */
  LF.BOUNTIES = [
    { id: 'slime', name: 'Moss Sweeper', desc: 'Defeat 10 Mosslings.', test: s => [s.bestiary.slime || 0, 10], reward: 'embers:80', rtxt: '80 embers' },
    { id: 'elite', name: 'Elite Hunter', desc: 'Defeat 3 elite foes.', test: s => [s.ext.elites, 3], reward: 'charm:ward', rtxt: 'Moth Ward charm' },
    { id: 'chain', name: 'Chain Master', desc: 'Reach a x5 kill chain.', test: s => [s.ext.chain, 5], reward: 'embers:120', rtxt: '120 embers' },
    { id: 'parry', name: 'Mirror Flame', desc: 'Deflect 5 shots back at foes.', test: s => [s.ext.parries, 5], reward: 'charm:echo', rtxt: 'Echo Flame charm' },
    { id: 'guard', name: 'Guard Breaker', desc: 'Defeat 3 Shielded elites.', test: s => [s.ext.guard, 3], reward: 'embers:110', rtxt: '110 embers' },
    { id: 'night', name: 'Night Watch', desc: 'Defeat 5 night wisps in Mossroot.', test: s => [s.ext.night, 5], reward: 'embers:100', rtxt: '100 embers' },
    { id: 'flare', name: 'Flare Dancer', desc: 'Unleash Flare 10 times.', test: s => [s.ext.flares, 10], reward: 'slot', rtxt: '+1 charm slot' },
    { id: 'finish', name: 'Finisher', desc: 'Land 15 finishing blows (every third hit).', test: s => [s.ext.finish, 15], reward: 'embers:150', rtxt: '150 embers' },
    { id: 'beast', name: 'Naturalist', desc: 'Defeat 5 of every kind of foe.', test: s => { const ks = Object.keys(LF.BEAST).filter(k => k !== 'snowman'); return [ks.filter(k => (s.bestiary[k] || 0) >= 5).length, ks.length]; }, reward: 'heart', rtxt: '+1 heart' }
  ];
})();
