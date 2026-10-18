/*
 * Dino roster. The drawings live in js/dino-art.js, which is generated from
 * the Openclipart (CC0) originals in art/source/ by tools/build-art.py.
 *
 * To add a dino: add it to DINOS in tools/build-art.py, rebuild, then add an
 * entry here with the same id.
 */
(function (DM) {
  'use strict';

  // `credit` is shown on the Credits screen. All art is CC0 from Openclipart.
  const OC = 'https://openclipart.org/detail/';
  const DINOS = [
    { id: 'trex', name: 'T-Rex', credit: { artist: 'StudioFibonacci', url: OC + '23513' } },
    { id: 'triceratops', name: 'Triceratops', credit: { artist: 'StudioFibonacci', url: OC + '23511' } },
    { id: 'stegosaurus', name: 'Stegosaurus', credit: { artist: 'AreYouPrepared', url: OC + '356643', note: 'remix of the Ankylosaurus' } },
    { id: 'brontosaurus', name: 'Brontosaurus', credit: { artist: 'StudioFibonacci', url: OC + '23508' } },
    { id: 'pterodactyl', name: 'Pterodactyl', flies: true, scale: 1.3, credit: { artist: 'StudioFibonacci', url: OC + '28420' } },
    { id: 'ankylosaurus', name: 'Ankylosaurus', credit: { artist: 'AreYouPrepared', url: OC + '356643' } },
    { id: 'parasaurolophus', name: 'Parasaurolophus', credit: { artist: 'StudioFibonacci', url: OC + '23513', note: 'remix of the T-Rex' } },
    { id: 'spinosaurus', name: 'Spinosaurus', credit: { artist: 'AreYouPrepared', url: OC + '356257' } },
    { id: 'velociraptor', name: 'Velociraptor', credit: { artist: 'AreYouPrepared', url: OC + '355256' } },
    { id: 'allosaurus', name: 'Allosaurus', credit: { artist: 'AreYouPrepared', url: OC + '355256', note: 'remix of the Velociraptor' } },
    { id: 'dilophosaurus', name: 'Dilophosaurus', credit: { artist: 'StudioFibonacci', url: OC + '23513', note: 'remix of the T-Rex' } },
    { id: 'pachycephalosaurus', name: 'Pachycephalosaurus', credit: { artist: 'StudioFibonacci', url: OC + '23513', note: 'remix of the T-Rex' } },
    { id: 'archaeopteryx', name: 'Archaeopteryx', flies: true, scale: 1.3, credit: { artist: 'StudioFibonacci', url: OC + '28420', note: 'remix of the Pterodactyl' } },
  ];

  DM.DINOS = DINOS;
  DM.dinoById = (id) => DINOS.find((d) => d.id === id);

  // Every dino is fitted into the same square box, feet on the bottom edge.
  // `scale` lets very wide dinos (like the Pterodactyl) spill past the box;
  // pass { fit: true } to keep them inside it (e.g. on the picture card).
  DM.dinoSVG = (dino, opts = {}) => {
    const art = DM.DINO_ART[dino.id];
    const size = 200 * (opts.fit ? 1 : dino.scale || 1);
    const x = (200 - size) / 2;
    return `<svg class="dino-svg dino-${dino.id}" viewBox="0 0 200 200" aria-hidden="true">` +
      `<g class="dino-pose"><svg x="${x}" y="${200 - size}" width="${size}" height="${size}" viewBox="${art.viewBox}" preserveAspectRatio="xMidYMax meet" overflow="visible">` +
      `${art.svg}</svg></g></svg>`;
  };
})(window.DinoMatch = window.DinoMatch || {});
