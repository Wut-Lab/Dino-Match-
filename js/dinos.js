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
    { id: 'velociraptor', name: 'Velociraptor', scale: 0.84, credit: { artist: 'AreYouPrepared', url: OC + '355256' } },
    { id: 'allosaurus', name: 'Allosaurus', credit: { artist: 'AreYouPrepared', url: OC + '355256', note: 'remix of the Velociraptor' } },
    { id: 'dilophosaurus', name: 'Dilophosaurus', credit: { artist: 'StudioFibonacci', url: OC + '23513', note: 'remix of the T-Rex' } },
    { id: 'pachycephalosaurus', name: 'Pachycephalosaurus', credit: { artist: 'StudioFibonacci', url: OC + '23513', note: 'remix of the T-Rex' } },
    { id: 'archaeopteryx', name: 'Archaeopteryx', flies: true, scale: 1.3, credit: { artist: 'StudioFibonacci', url: OC + '28420', note: 'remix of the Pterodactyl' } },
  ];

  DM.DINOS = DINOS;
  DM.dinoById = (id) => DINOS.find((d) => d.id === id);

  // ---- Golden versions ----
  // Made on the fly from the normal art: every colour becomes a shade of gold
  // with the same lightness, so markings and shading survive. Black outlines,
  // white eyes/teeth/toes and the pink cheeks are left alone.
  const KEEP = /^#(000|000000|fff|ffffff|ff6f9f)$/i;
  const RAMP = [[0, [110, 64, 0]], [0.45, [205, 140, 10]], [0.72, [255, 200, 40]], [1, [255, 240, 160]]];
  function goldHex(hex) {
    if (KEEP.test(hex)) return hex;
    let h = hex.slice(1);
    if (h.length === 3) h = h.replace(/./g, (c) => c + c);
    const n = parseInt(h, 16);
    const lum = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
    const t = 0.18 + 0.66 * lum; // keep pale dinos from washing out
    let i = 1;
    while (i < RAMP.length - 1 && t > RAMP[i][0]) i++;
    const [t0, c0] = RAMP[i - 1], [t1, c1] = RAMP[i];
    const f = Math.min(1, Math.max(0, (t - t0) / (t1 - t0)));
    return '#' + c0.map((v, k) => Math.round(v + (c1[k] - v) * f).toString(16).padStart(2, '0')).join('');
  }
  // Shine for golden dinos: a soft highlight plus a glint that sweeps across
  // every few seconds. Both are clipped to the dino's shape with a mask made
  // from a white copy of its art (see .shine-mask in style.css).
  let shineId = 0;
  function shine(viewBox, svg) {
    const [x, y, w, h] = viewBox.split(/[ ,]+/).map(Number);
    const n = ++shineId;
    return `<defs>` +
      `<mask id="gm${n}" maskUnits="userSpaceOnUse" x="${x - w}" y="${y - h}" width="${w * 3}" height="${h * 3}"><g class="shine-mask">${svg}</g></mask>` +
      `<linearGradient id="gs${n}" gradientUnits="userSpaceOnUse" x1="${x}" y1="${y}" x2="${x + w}" y2="${y + h}">` +
      `<stop offset="0.38" stop-color="#fff" stop-opacity="0"/><stop offset="0.48" stop-color="#fff" stop-opacity="0.85"/>` +
      `<stop offset="0.52" stop-color="#fffbe0" stop-opacity="0.85"/><stop offset="0.62" stop-color="#fff" stop-opacity="0"/></linearGradient>` +
      `<radialGradient id="gh${n}" cx="32%" cy="24%" r="55%"><stop offset="0" stop-color="#fff" stop-opacity="0.45"/>` +
      `<stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>` +
      `<g mask="url(#gm${n})" class="shine">` +
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#gh${n})"/>` +
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#gs${n})">` +
      `<animateTransform attributeName="transform" type="translate" values="${-w * 1.2} 0;${w * 1.2} 0;${w * 1.2} 0" keyTimes="0;0.45;1" dur="3.2s" begin="${-(Math.random() * 3).toFixed(2)}s" repeatCount="indefinite"/>` +
      `</rect></g>`;
  }

  const goldCache = {};
  const goldArt = (id) => goldCache[id] || (goldCache[id] =
    DM.DINO_ART[id].svg.replace(/#[0-9a-f]{6}\b|#[0-9a-f]{3}\b/gi, goldHex));

  // Every dino is fitted into the same square box, feet on the bottom edge.
  // `scale` lets very wide dinos (like the Pterodactyl) spill past the box;
  // pass { fit: true } to keep them inside it (e.g. on the picture card),
  // and { gold: true } for the golden version.
  DM.dinoSVG = (dino, opts = {}) => {
    const art = DM.DINO_ART[dino.id];
    const size = 200 * (opts.fit ? 1 : dino.scale || 1);
    const x = (200 - size) / 2;
    return `<svg class="dino-svg dino-${dino.id}" viewBox="0 0 200 200" aria-hidden="true">` +
      `<g class="dino-pose"><svg x="${x}" y="${200 - size}" width="${size}" height="${size}" viewBox="${art.viewBox}" preserveAspectRatio="xMidYMax meet" overflow="visible">` +
      (opts.gold ? goldArt(dino.id) + shine(art.viewBox, art.svg) : art.svg) + `</svg></g></svg>`;
  };
})(window.DinoMatch = window.DinoMatch || {});
