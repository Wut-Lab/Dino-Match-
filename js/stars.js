/*
 * Dino-Stars: 13 coloured stars with a T-Rex face in the middle. Now and then
 * one floats across the sky during a round (see STAR_CHANCE in game.js), and
 * tapping it adds it to the Dino-Stars collection.
 *
 * Drawn in code, in the same chunky black-outlined style as the dinos.
 */
(function (DM) {
  'use strict';

  // `rainbow: true` fills the star with a rainbow instead of one colour.
  const STARS = [
    { id: 'red', name: 'Red', color: '#ff5a5a' },
    { id: 'orange', name: 'Orange', color: '#ff9a3d' },
    { id: 'yellow', name: 'Yellow', color: '#ffd23f' },
    { id: 'lime', name: 'Lime', color: '#c4ea4a' },
    { id: 'green', name: 'Green', color: '#3dbb5c' },
    { id: 'teal', name: 'Teal', color: '#2ec4b6' },
    { id: 'sky', name: 'Sky Blue', color: '#6ec6ff' },
    { id: 'blue', name: 'Blue', color: '#4a7dff' },
    { id: 'purple', name: 'Purple', color: '#a070ff' },
    { id: 'pink', name: 'Pink', color: '#ff7ac0' },
    { id: 'brown', name: 'Brown', color: '#b0743f' },
    { id: 'silver', name: 'Silver', color: '#d3dae3' },
    { id: 'rainbow', name: 'Rainbow', color: '#ff7ac0', rainbow: true },
  ];
  STARS.forEach((s) => { s.fullName = `${s.name} Dino-Star`; });

  DM.STARS = STARS;
  DM.starById = (id) => STARS.find((s) => s.id === id);

  // A chubby five-point star with rounded tips, in a 100x100 box.
  const CX = 50, CY = 53, R_OUT = 48, R_IN = 25;
  const STAR_PATH = (() => {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? R_IN : R_OUT;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      pts.push([CX + r * Math.cos(a), CY + r * Math.sin(a)]);
    }
    // Round each corner: stop short of it, then curve through it.
    const lerp = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
    const f = (n) => n.toFixed(1);
    let d = '';
    pts.forEach((p, i) => {
      const prev = pts[(i + 9) % 10];
      const next = pts[(i + 1) % 10];
      const k = i % 2 ? 0.12 : 0.22; // tips rounder than the dips
      const a = lerp(p, prev, k), b = lerp(p, next, k);
      d += `${i ? 'L' : 'M'}${f(a[0])} ${f(a[1])}Q${f(p[0])} ${f(p[1])} ${f(b[0])} ${f(b[1])}`;
    });
    return d + 'Z';
  })();

  // Front-on cartoon T-Rex face (same green as the T-Rex), centred on the star.
  const S = 'stroke="#000" stroke-width="2.6" stroke-linejoin="round"';
  const FACE =
    `<path d="M50 37 C62 37 70 44 71 54 C72 65 63 72 50 72 C37 72 28 65 29 54 C30 44 38 37 50 37Z" fill="#6fd34f" ${S}/>` +
    `<path d="M50 37 C62 37 70 44 71 54 C72 65 63 72 50 72Z" fill="#000" fill-opacity=".14"/>` +
    // cheeks, nostrils, big toothy grin
    `<ellipse cx="33.5" cy="57" rx="3.4" ry="2.3" fill="#ff6f9f" fill-opacity=".8"/>` +
    `<ellipse cx="66.5" cy="57" rx="3.4" ry="2.3" fill="#ff6f9f" fill-opacity=".8"/>` +
    `<path d="M45 56.5 q1.5 -1.4 3 0 M52 56.5 q1.5 -1.4 3 0" fill="none" stroke="#000" stroke-width="1.6" stroke-linecap="round"/>` +
    `<path d="M35 62 Q50 66 65 62 Q50 75 35 62Z" fill="#7a1f2e" ${S}/>` +
    `<path d="M37.4 62.4 L39.5 66.6 L41.6 62.4Z M42.4 63.1 L44.5 66.1 L46.6 63.1Z M53.4 63.1 L55.5 66.1 L57.6 63.1Z M58.4 62.4 L60.5 66.6 L62.6 62.4Z" fill="#fff" stroke="#000" stroke-width="1.2" stroke-linejoin="round"/>` +
    // eyes (class "eye" so they blink like the dinos') under bold brow ridges
    `<g class="eye"><circle cx="41" cy="49" r="4.4" fill="#fff" ${S}/><circle cx="41.8" cy="49.6" r="2.3" fill="#000"/><circle cx="42.6" cy="48.6" r="0.8" fill="#fff"/></g>` +
    `<g class="eye"><circle cx="59" cy="49" r="4.4" fill="#fff" ${S}/><circle cx="58.2" cy="49.6" r="2.3" fill="#000"/><circle cx="59" cy="48.6" r="0.8" fill="#fff"/></g>` +
    `<path d="M36 43 Q41 39.5 46 42.5 M64 43 Q59 39.5 54 42.5" fill="none" stroke="#000" stroke-width="2.6" stroke-linecap="round"/>`;

  const RAINBOW = ['#ff5a5a', '#ff9a3d', '#ffd23f', '#6fd34f', '#6ec6ff', '#a070ff'];
  let uid = 0;

  DM.starSVG = (star) => {
    const n = ++uid;
    let defs = `<clipPath id="sc${n}"><rect x="${CX}" y="0" width="50" height="100"/></clipPath>`;
    let fill = star.color;
    if (star.rainbow) {
      defs += `<linearGradient id="sr${n}" x1="0" y1="0" x2="0" y2="1">` +
        RAINBOW.map((c, i) => `<stop offset="${(i / (RAINBOW.length - 1)).toFixed(2)}" stop-color="${c}"/>`).join('') +
        `</linearGradient>`;
      fill = `url(#sr${n})`;
    }
    return `<svg class="star-svg star-${star.id}" viewBox="0 0 100 100" aria-hidden="true"><defs>${defs}</defs>` +
      `<path d="${STAR_PATH}" fill="${fill}" stroke="#000" stroke-width="4" stroke-linejoin="round"/>` +
      `<path d="${STAR_PATH}" fill="#000" fill-opacity=".16" clip-path="url(#sc${n})"/>` +
      `<path d="M48.5 17 Q46 24 43 30" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="3.5" stroke-linecap="round"/>` +
      FACE + `</svg>`;
  };
})(window.DinoMatch = window.DinoMatch || {});
