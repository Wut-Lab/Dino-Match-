/*
 * Dino roster. The drawings live in js/dino-art.js, which is generated from
 * the Openclipart (CC0) originals in art/source/ by tools/build-art.py.
 *
 * To add a dino: add it to DINOS in tools/build-art.py, rebuild, then add an
 * entry here with the same id.
 */
(function (DM) {
  'use strict';

  const DINOS = [
    { id: 'trex', name: 'T-Rex' },
    { id: 'triceratops', name: 'Triceratops' },
    { id: 'stegosaurus', name: 'Stegosaurus' },
    { id: 'brontosaurus', name: 'Brontosaurus' },
    { id: 'pterodactyl', name: 'Pterodactyl', flies: true, scale: 1.3 },
    { id: 'ankylosaurus', name: 'Ankylosaurus' },
    { id: 'parasaurolophus', name: 'Parasaurolophus' },
    { id: 'spinosaurus', name: 'Spinosaurus' },
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
      `<g class="dino-pose"><svg x="${x}" y="${200 - size}" width="${size}" height="${size}" viewBox="${art.viewBox}" preserveAspectRatio="xMidYMax meet">` +
      `${art.svg}</svg></g></svg>`;
  };
})(window.DinoMatch = window.DinoMatch || {});
