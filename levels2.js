/* Lanternfall - Glimmer Deep, Drowned Chapel, Ember Spire, secret trial.
   Door spawn rule: l/r doors need floor under the bottom door row; u doors need a platform under the door. */
(function () {
  'use strict';
  const LF = window.LF, Room = LF.Room, L = LF.Rooms.list;

  // gate the Thicket exit to Glimmer Deep behind the Root sigil + a safe landing for the return trip
  (function (r) { r.b(43, 3, 1, 3, 'G'); r.gateNeed = 1; r.p(42, 6, 1); })(L.thicket);

  // optional secret: the Burrow grows a climb up to the Trial of Embers
  (function (r) { r.p(1, 8, 3).p(5, 5, 3).p(9, 3, 5).door('u', 'u', 10, 12, 'trial', 'l'); })(L.burrow);

  /* ============================== GLIMMER DEEP ============================== */
  Room('g_descent', 'Crystal Descent', 'glim', 24, 28, 8, 3, 1, 2, 'glimmer').f(26);
  (function (r) {
    r.ambience = { drip: .6, wind: .08, drone: .15 };
    r.door('l', 'l', 2, 4, 'thicket', 'g').door('r', 'r', 23, 25, 'g_cavern', 'l');
    r.b(1, 5, 7, 1).p(12, 5, 4).p(10, 8, 4).p(3, 11, 4).p(12, 14, 4).p(5, 17, 4).p(13, 20, 4).p(6, 23, 3);
    r.b(16, 2, 7, 4).hole(17, 3, 5, 2).s(16, 4, 'F');                // secret nook behind an illusion wall
    r.sp(11, 25, 2);
    r.e('lore', 3, 4, { id: 'descent' }).e('chest', 19, 4, { give: 'embers:80' }).e('moth', 20, 3, { id: 'g1' });
    r.e('bat', 13, 15).e('bat', 11, 9).e('bat', 6, 18).e('wisp', 18, 12).e('wisp', 8, 20);
    r.em(11, 7, 2).em(4, 10, 2).em(13, 13, 2).em(6, 16, 2).em(14, 19, 2).em(17, 24, 3);
  })(L.g_descent);

  Room('g_cavern', 'Glimmer Cavern', 'glim', 44, 16, 9, 4, 2, 1, 'glimmer').f(14);
  (function (r) {
    r.ambience = { drip: .5, drone: .2 };
    r.door('l', 'l', 11, 13, 'g_descent', 'r').door('r', 'r', 11, 13, 'g_lake', 'l').door('u', 'u', 20, 22, 'g_altar', 'l');
    r.p(12, 11, 4).p(18, 8, 4).p(14, 5, 4).p(19, 2, 6);
    r.e('shrine', 3, 13).e('lore', 6, 13, { id: 'cavern' }).e('npc', 9, 13, { id: 'marrow' });
    r.e('beetle', 25, 13).e('beetle', 32, 13).e('bat', 19, 9).e('wisp', 28, 8).e('wisp', 36, 6);
    r.em(13, 10, 3).em(19, 7, 3).em(15, 4, 3).em(20, 1, 2).em(26, 13, 4).em(34, 13, 3);
    r.e('chest', 40, 13, { give: 'embers:50' });
  })(L.g_cavern);

  Room('g_altar', 'Altar of Embers', 'glim', 22, 14, 11, 3, 1, 1, 'glimmer').f(11);
  (function (r) {
    r.ambience = { drip: .3, drone: .3 };
    r.door('l', 'l', 8, 10, 'g_cavern', 'u');
    r.p(15, 8, 3).p(18, 5, 3);
    r.e('lore', 4, 10, { id: 'altar' }).e('altar', 11, 10, { give: 'abil:dash' }).e('moth', 19, 4, { id: 'g2' });
    r.em(15, 7, 3).em(7, 10, 2).em(14, 10, 2);
  })(L.g_altar);

  Room('g_lake', 'Mirror Lake', 'glim', 52, 16, 11, 4, 3, 1, 'glimmer').f(14, 0, 10).f(14, 41, 51);
  (function (r) {
    r.ambience = { drip: .4, wind: .1, drone: .2 };
    r.door('l', 'l', 11, 13, 'g_cavern', 'r').door('r', 'r', 11, 13, 'g_prism', 'l');
    r.sp(11, 14, 30);
    r.p(13, 11, 3).b(19, 10, 3, 1, 'c').b(25, 9, 3, 1, 'c').b(31, 10, 3, 1, 'c').p(37, 11, 3);
    r.p(22, 4, 3).p(26, 3, 3);                                      // high ledges (double jump from the islands)
    r.b(46, 1, 2, 10).b(46, 11, 2, 3, 'D');                         // dash-crack barrier before the Weaver
    r.e('shrine', 3, 13).e('lore', 7, 13, { id: 'lake' }).e('beetle', 8, 13);
    r.e('wisp', 28, 6).e('wisp', 35, 5).e('wisp', 17, 7).e('husk', 43, 13);
    r.e('frag', 27, 2).e('moth', 26, 7, { id: 'g3' });
    r.em(14, 10, 2).em(20, 9, 2).em(32, 9, 2).em(38, 10, 2).em(23, 3, 2).em(5, 13, 3).em(49, 13, 2);
  })(L.g_lake);

  Room('g_prism', "Weaver's Hall", 'glim', 30, 14, 14, 4, 2, 1, 'boss').f(12);
  (function (r) {
    r.ambience = { drip: .2, drone: .3 };
    r.door('l', 'l', 9, 11, 'g_lake', 'r').door('r', 'r', 9, 11, 'd_entry', 'l').b(29, 9, 1, 3, 'g');
    r.p(5, 9, 4).p(12, 7, 4).p(21, 9, 4);
    r.e('shrine', 3, 11).e('boss', 22, 11, { id: 'prism' });
  })(L.g_prism);

  /* ============================== DROWNED CHAPEL ============================== */
  Room('d_entry', 'Sunken Narthex', 'drown', 40, 14, 16, 4, 2, 1, 'drowned').f(12);
  (function (r) {
    r.ambience = { drip: .5, water: .35, drone: .15 };
    r.door('l', 'l', 9, 11, 'g_prism', 'r').door('r', 'r', 9, 11, 'd_nave', 'l');
    r.water(8, 9, 24, 3).p(12, 7, 3).p(22, 6, 3).p(28, 8, 3);
    r.e('shrine', 3, 11).e('npc', 5, 11, { id: 'vesper' }).e('lore', 7, 11, { id: 'entry' });
    r.e('jelly', 14, 9).e('jelly', 24, 8).e('husk', 35, 11).e('moth', 23, 4, { id: 'd1' });
    r.em(12, 6, 3).em(22, 5, 3).em(28, 7, 3).em(34, 11, 3);
  })(L.d_entry);

  Room('d_nave', 'Flooded Nave', 'drown', 46, 18, 18, 4, 3, 1, 'drowned').f(16);
  (function (r) {
    r.ambience = { drip: .6, water: .5, drone: .2 };
    r.door('l', 'l', 13, 15, 'd_entry', 'r').door('r', 'r', 13, 15, 'd_glide', 'l').b(45, 13, 1, 3, 'g');
    r.water(1, 12, 44, 4).sp(18, 15, 3);
    r.p(6, 10, 4).p(13, 8, 4).p(20, 7, 4).p(27, 8, 4).p(34, 9, 6).p(38, 6, 3).p(41, 3, 3);
    r.e('lore', 8, 9, { id: 'nave' }).e('lever', 36, 8, { id: 'nave' }).e('frag', 42, 2).e('moth', 23, 5, { id: 'd2' });
    r.e('jelly', 10, 12).e('jelly', 24, 12).e('jelly', 32, 12).e('wisp', 16, 5).e('wisp', 30, 4);
    r.e('shrine', 14, 7).em(6, 9, 3).em(13, 7, 3).em(20, 6, 3).em(27, 7, 3).em(35, 8, 4);
  })(L.d_nave);

  Room('d_glide', 'Moth-kin Shrine', 'drown', 30, 14, 21, 4, 2, 1, 'drowned').f(12);
  (function (r) {
    r.ambience = { drip: .4, water: .15, drone: .35 };
    r.door('l', 'l', 9, 11, 'd_nave', 'r').door('r', 'r', 9, 11, 'd_chasm', 'l');
    r.p(8, 8, 3).p(22, 8, 3);
    r.e('lore', 6, 11, { id: 'glide' }).e('altar', 15, 11, { give: 'abil:glide' }).e('moth', 24, 6, { id: 'd3' });
    r.em(9, 7, 2).em(23, 7, 2).em(11, 11, 2).em(18, 11, 2);
  })(L.d_glide);

  Room('d_chasm', 'The Long Fall', 'drown', 58, 22, 23, 4, 3, 1, 'drowned').f(8, 0, 7).f(14, 50, 57);
  (function (r) {
    r.ambience = { drip: .3, wind: .3, drone: .25 };
    r.door('l', 'l', 5, 7, 'd_glide', 'r').door('r', 'r', 11, 13, 'd_tide', 'l');
    r.sp(8, 20, 42).b(22, 14, 4, 7).b(36, 14, 4, 7);
    r.e('shrine', 4, 7).e('lore', 6, 7, { id: 'chasm' });
    r.e('wisp', 15, 12).e('wisp', 30, 10).e('wisp', 44, 11);
    r.e('shrine', 52, 13).em(23, 12, 2).em(37, 12, 2).em(14, 6, 2);
  })(L.d_chasm);

  Room('d_tide', 'The Drowned Bell', 'drown', 30, 14, 26, 4, 2, 1, 'boss').f(12);
  (function (r) {
    r.ambience = { drip: .3, water: .3, drone: .4 };
    r.door('l', 'l', 9, 11, 'd_chasm', 'r').door('r', 'r', 9, 11, 's_foot', 'l').b(29, 9, 1, 3, 'g');
    r.p(5, 9, 4).p(13, 7, 4).p(21, 9, 4);
    r.e('shrine', 3, 11).e('lore', 7, 11, { id: 'tide' }).e('boss', 22, 11, { id: 'tide' });
  })(L.d_tide);

  /* ============================== EMBER SPIRE ============================== */
  Room('s_foot', 'Spire Foot', 'spire', 34, 14, 28, 4, 2, 1, 'spire').f(12);
  (function (r) {
    r.ambience = { wind: .25, crack: .5, drone: .2 };
    r.door('l', 'l', 9, 11, 'd_tide', 'r').door('r', 'r', 9, 11, 's_climb', 'l');
    r.b(22, 1, 1, 7).b(22, 8, 1, 4, 'G'); r.gateNeed = 3;
    r.e('shrine', 3, 11).e('lore', 14, 11, { id: 'foot' }).e('husk', 10, 11).e('beetle', 17, 11);
    r.e('bat', 26, 2).e('bat', 30, 3).e('husk', 28, 11).em(8, 11, 3).em(25, 11, 4);
  })(L.s_foot);

  Room('s_climb', 'The Long Climb', 'spire', 26, 44, 30, 1, 1, 3, 'spire').f(42);
  (function (r) {
    r.ambience = { wind: .35, crack: .4, drone: .25 };
    r.door('l', 'l', 39, 41, 's_foot', 'r').door('u', 'u', 9, 12, 's_summit', 'l');
    r.p(3, 39, 4).p(9, 36, 4).b(14, 33, 4, 1, 'c').p(19, 30, 4).p(14, 27, 4).p(8, 24, 4).p(3, 21, 4).p(8, 18, 4);
    r.p(16, 13, 4).p(20, 10, 4).b(14, 7, 4, 1, 'c').p(8, 4, 6).p(2, 13, 3);
    r.sp(11, 35, 2).sp(16, 26, 1).sp(10, 3, 1);
    r.s(12, 42, 'j');
    r.e('shrine', 2, 41).e('lore', 6, 41, { id: 'climb' }).e('shrine', 4, 20);
    r.e('bat', 5, 40).e('bat', 17, 28).e('bat', 10, 19).e('wisp', 12, 32).e('wisp', 12, 14).e('wisp', 18, 20).e('husk', 18, 41);
    r.e('frag', 3, 12).e('moth', 4, 10, { id: 's1' });
    r.em(4, 38, 2).em(10, 35, 2).em(20, 29, 2).em(9, 23, 2).em(17, 12, 2).em(21, 9, 2).em(9, 3, 3);
  })(L.s_climb);

  Room('s_summit', 'Summit of the Fallen Lantern', 'spire', 32, 14, 30, 0, 2, 1, 'boss').f(12);
  (function (r) {
    r.ambience = { wind: .4, crack: .3, drone: .4 };
    r.door('l', 'l', 9, 11, 's_climb', 'u');
    r.p(6, 9, 4).p(14, 7, 4).p(22, 9, 4);
    r.e('shrine', 3, 11).e('lore', 7, 11, { id: 'summit' }).e('boss', 24, 11, { id: 'warden' }).e('lamp', 28, 11);
  })(L.s_summit);

  /* ============================== TRIAL OF EMBERS (optional) ============================== */
  Room('trial', 'Trial of Embers', 'spire', 28, 12, 0, 1, 1, 1, 'boss').f(10);
  (function (r) {
    r.ambience = { wind: .15, crack: .3, drone: .3 };
    r.door('l', 'l', 7, 9, 'burrow', 'u');
    r.p(6, 7, 4).p(18, 7, 4);
    r.e('trial', 13, 9);
  })(L.trial);
})();
