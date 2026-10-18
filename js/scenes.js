/*
 * Locations (backgrounds). Only the meadow exists for now; new locations can
 * add their own CSS class and decorations here.
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

  const LOCATIONS = [
    {
      id: 'meadow',
      name: 'Sunny Meadow',
      horizon: 0.32, // fraction of the field that is sky; dinos walk below this
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
  ];

  DM.LOCATIONS = LOCATIONS;
  DM.buildScene = (el, id = 'meadow') => {
    const loc = LOCATIONS.find((l) => l.id === id) || LOCATIONS[0];
    el.className = `scene scene-${loc.id}`;
    el.innerHTML = loc.build();
    return loc;
  };
})(window.DinoMatch = window.DinoMatch || {});
