/*
 * Locations (backgrounds). Each round picks one at random.
 *
 * A location has:
 *   id, name, emoji   shown in the round-start banner
 *   horizon           fraction of the field that is sky; dinos walk below it
 *   build()           returns the background markup (goes in .scene-<id>)
 *   trees (optional)  pine trees placed among the dinos, which can walk
 *                     behind them (see Game.layoutTrees)
 *   fog (optional)    fog banks that roll across the field now and then
 */
(function (DM) {
  'use strict';

  // Seeded random so decorations stay put between renders.
  function seeded(seed) {
    return () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
  }

  // A cartoon pine in the same chunky, outlined style as the dinos.
  // Drawn in a 100x170 box with the bottom of the trunk at y=164.
  function pineSVG(cls = '') {
    const tier = (d, shade) =>
      `<path d="${d}" fill="var(--pine, #3fae5f)" stroke="#000" stroke-width="3.5" stroke-linejoin="round"/>` +
      `<path d="${shade}" fill="#000" fill-opacity=".18"/>`;
    return `<svg class="pine ${cls}" viewBox="0 0 100 170" aria-hidden="true">` +
      `<rect x="41" y="122" width="18" height="42" rx="5" fill="#9a6232" stroke="#000" stroke-width="3.5"/>` +
      `<rect x="50" y="124" width="7" height="38" fill="#000" fill-opacity=".18"/>` +
      tier('M50 58 C60 78 84 106 95 128 Q72 141 50 134 Q28 141 5 128 C16 106 40 78 50 58Z',
        'M50 58 C60 78 84 106 95 128 Q72 141 50 134Z') +
      tier('M50 30 C58 46 76 70 85 91 Q67 101 50 95 Q33 101 15 91 C24 70 42 46 50 30Z',
        'M50 30 C58 46 76 70 85 91 Q67 101 50 95Z') +
      tier('M50 6 C56 20 70 40 77 55 Q63 63 50 58 Q37 63 23 55 C30 40 44 20 50 6Z',
        'M50 6 C56 20 70 40 77 55 Q63 63 50 58Z') +
      `<path d="M36 50 Q42 36 48 24" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="4" stroke-linecap="round"/>` +
      `</svg>`;
  }
  DM.pineSVG = pineSVG;

  const LOCATIONS = [
    {
      id: 'meadow',
      name: 'Sunny Meadow',
      emoji: '🌼',
      horizon: 0.32,
      build() {
        const r = seeded(7);
        const petals = ['#ff7aa8', '#ffd23f', '#ffffff', '#b18cff'];
        let flowers = '';
        for (let i = 0; i < 18; i++) {
          flowers += `<span class="flower" style="left:${(r() * 96 + 2).toFixed(1)}%;top:${(r() * 88 + 6).toFixed(1)}%;--petal:${petals[i % petals.length]}"></span>`;
        }
        return `
          <div class="sun"></div>
          <div class="cloud c1"></div><div class="cloud c2"></div><div class="cloud c3"></div>
          <div class="hill h1"></div><div class="hill h2"></div>
          <div class="grass">${flowers}</div>`;
      },
    },
    {
      id: 'forest',
      name: 'Pine Forest',
      emoji: '🌲',
      horizon: 0.3,
      trees: { backSpacing: 0.8, maxHidden: 0.2, maxMid: 4 }, // see Game.makeTrees
      build() {
        const r = seeded(11);
        // A crowded line of far-away pines along the horizon.
        let far = '';
        for (let i = 0; i < 26; i++) {
          const h = 30 + r() * 30;
          far += `<div class="far-pine" style="left:${(i * 4 - 3 + r() * 2.5).toFixed(1)}%;height:${h.toFixed(1)}%;--d:${(0.85 + r() * 0.3).toFixed(2)}">${pineSVG()}</div>`;
        }
        let shrooms = '';
        for (let i = 0; i < 7; i++) {
          shrooms += `<span class="shroom" style="left:${(r() * 92 + 4).toFixed(1)}%;top:${(r() * 80 + 12).toFixed(1)}%"></span>`;
        }
        return `
          <div class="cloud c1"></div><div class="cloud c2"></div>
          <div class="hill h1"></div><div class="hill h2"></div>
          <div class="far-pines">${far}</div>
          <div class="grass">${shrooms}</div>`;
      },
    },
    {
      id: 'volcano',
      name: 'Volcano Valley',
      emoji: '🌋',
      horizon: 0.34,
      fog: { first: [5, 9], every: [12, 22], duration: [9, 12] }, // seconds
      build() {
        const r = seeded(5);
        let rocks = '';
        for (let i = 0; i < 9; i++) {
          rocks += `<span class="rock" style="left:${(r() * 94 + 2).toFixed(1)}%;top:${(r() * 84 + 8).toFixed(1)}%;--s:${(0.7 + r() * 0.8).toFixed(2)}"></span>`;
        }
        let cracks = '';
        for (let i = 0; i < 5; i++) {
          cracks += `<span class="crack" style="left:${(r() * 80 + 5).toFixed(1)}%;top:${(r() * 75 + 15).toFixed(1)}%;--a:${(r() * 50 - 25).toFixed(0)}deg"></span>`;
        }
        return `
          <svg class="volcano" viewBox="0 0 200 100" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 100 L72 20 Q100 6 128 20 L200 100Z" fill="#7a4b5e" stroke="#000" stroke-width="2.5" stroke-linejoin="round"/>
            <path d="M100 100 L128 20 L200 100Z" fill="#000" fill-opacity=".18"/>
            <path d="M80 16 Q100 6 120 16 Q100 24 80 16Z" fill="#ffb02e" stroke="#000" stroke-width="2"/>
            <path d="M92 20 Q88 40 94 58 Q98 70 92 86" fill="none" stroke="#ff7a1a" stroke-width="5" stroke-linecap="round"/>
            <path d="M110 20 Q116 36 112 50" fill="none" stroke="#ff7a1a" stroke-width="4" stroke-linecap="round"/>
          </svg>
          <div class="smoke s1"></div><div class="smoke s2"></div><div class="smoke s3"></div>
          <div class="hill h1"></div><div class="hill h2"></div>
          <div class="grass">${cracks}${rocks}</div>`;
      },
    },
  ];

  DM.LOCATIONS = LOCATIONS;
  DM.locationById = (id) => LOCATIONS.find((l) => l.id === id) || LOCATIONS[0];
  DM.buildScene = (el, id = 'meadow') => {
    const loc = DM.locationById(id);
    el.className = `scene scene-${loc.id}`;
    el.innerHTML = loc.build();
    return loc;
  };
})(window.DinoMatch = window.DinoMatch || {});
