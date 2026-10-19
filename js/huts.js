/*
 * Dino huts for the main menu: two designs per location, in the same chunky,
 * outlined cartoon style as the dinos. Each is drawn in a 120x110 box with
 * the ground at y=106.
 */
(function (DM) {
  'use strict';

  const K = 'stroke="#000" stroke-width="3.5" stroke-linejoin="round"';
  const SHADE = 'fill="#000" fill-opacity=".18"';
  const shadow = '<ellipse cx="60" cy="106" rx="52" ry="6" fill="#000" fill-opacity=".18"/>';
  const archDoor = (x, w, top, fill) =>
    `<path d="M${x} 106 V${top + w / 2} A${w / 2} ${w / 2} 0 0 1 ${x + w} ${top + w / 2} V106Z" fill="${fill}" ${K}/>`;
  const svg = (inner) => `<svg class="hut-svg" viewBox="0 0 120 110" aria-hidden="true">${shadow}${inner}</svg>`;

  const HUTS = {
    meadow: [
      // Round straw hut with a thatched cone roof
      svg(
        `<path d="M22 106 V64 Q60 72 98 64 V106Z" fill="#f3d9a4" ${K}/>` +
        `<path d="M78 69 Q90 67 98 64 V106 H78Z" ${SHADE}/>` +
        archDoor(48, 24, 76, '#6b4226') +
        `<path d="M8 66 Q34 22 60 6 Q86 22 112 66 Q60 80 8 66Z" fill="#f2c14e" ${K}/>` +
        `<path d="M60 6 Q86 22 112 66 Q92 72 74 74 Q74 34 60 6Z" ${SHADE}/>` +
        `<path d="M30 50 L26 64 M44 34 L38 66 M58 22 L54 70 M72 30 L74 70 M88 44 L92 68" fill="none" stroke="#c9962c" stroke-width="3" stroke-linecap="round"/>` +
        `<path d="M54 10 L60 0 L66 10" fill="#f2c14e" ${K}/>`),
      // Grassy dome covered in flowers, with a round door
      svg(
        `<path d="M12 106 Q12 30 60 30 Q108 30 108 106Z" fill="#6fcf5a" ${K}/>` +
        `<path d="M60 30 Q108 30 108 106 H86 Q90 52 60 30Z" ${SHADE}/>` +
        `<path d="M28 60 Q34 44 48 38" fill="none" stroke="#fff" stroke-opacity=".4" stroke-width="5" stroke-linecap="round"/>` +
        `<circle cx="60" cy="86" r="17" fill="#ffe8a8" ${K}/><circle cx="60" cy="88" r="12" fill="#a0673a" ${K}/>` +
        `<circle cx="66" cy="90" r="2" fill="#ffd23f"/>` +
        `<circle cx="30" cy="80" r="8" fill="#bfe8ff" ${K}/><path d="M22 80 H38 M30 72 V88" stroke="#000" stroke-width="2.5"/>` +
        [[40, 46, '#ff7aa8'], [74, 40, '#ffd23f'], [92, 62, '#fff'], [24, 66, '#b18cff'], [86, 84, '#ff7aa8'], [58, 36, '#fff']]
          .map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="5.5" fill="${c}" stroke="#000" stroke-width="2"/><circle cx="${x}" cy="${y}" r="2" fill="#ffb02e"/>`).join('')),
    ],
    forest: [
      // Log cabin with a mossy roof and a glowing window
      svg(
        `<rect x="18" y="56" width="84" height="50" fill="#b0743a" ${K}/>` +
        `<path d="M18 68 H102 M18 80 H102 M18 92 H102" stroke="#7a4a20" stroke-width="3"/>` +
        `<rect x="80" y="56" width="22" height="50" ${SHADE}/>` +
        [62, 74, 86, 98].map((y) => `<circle cx="18" cy="${y}" r="5" fill="#d9a066" stroke="#000" stroke-width="2.5"/><circle cx="102" cy="${y}" r="5" fill="#d9a066" stroke="#000" stroke-width="2.5"/>`).join('') +
        archDoor(50, 22, 76, '#6b4226') +
        `<rect x="28" y="66" width="16" height="14" rx="2" fill="#ffe58a" ${K}/><path d="M36 66 V80" stroke="#000" stroke-width="2.5"/>` +
        `<rect x="80" y="14" width="12" height="26" fill="#8a8a96" ${K}/>` +
        `<path d="M6 62 L60 16 L114 62Z" fill="#4f9a4a" ${K}/>` +
        `<path d="M60 16 L114 62 H86Z" ${SHADE}/>` +
        `<path d="M22 54 Q30 50 38 54 M60 30 Q66 26 72 30 M80 48 Q88 44 96 48" fill="none" stroke="#7fd06b" stroke-width="4" stroke-linecap="round"/>`),
      // Mushroom house: spotty red cap on a stubby stem
      svg(
        `<path d="M34 106 Q30 74 40 58 H80 Q90 74 86 106Z" fill="#fff3dc" ${K}/>` +
        `<path d="M72 58 H80 Q90 74 86 106 H74 Q78 80 72 58Z" ${SHADE}/>` +
        archDoor(50, 20, 80, '#a0673a') +
        `<circle cx="66" cy="94" r="1.8" fill="#ffd23f"/>` +
        `<circle cx="78" cy="74" r="6" fill="#ffe58a" ${K}/>` +
        `<path d="M6 64 Q8 12 60 10 Q112 12 114 64 Q60 76 6 64Z" fill="#e8453c" ${K}/>` +
        `<path d="M60 10 Q112 12 114 64 Q96 70 82 71 Q90 30 60 10Z" ${SHADE}/>` +
        [[30, 40, 8], [56, 26, 9], [84, 34, 7], [98, 54, 5], [44, 58, 6], [70, 52, 5]]
          .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" stroke="#000" stroke-width="2.5"/>`).join('')),
    ],
    volcano: [
      // Stone hut with a warm glow inside
      svg(
        `<path d="M12 106 Q12 34 60 34 Q108 34 108 106Z" fill="#8f8a9c" ${K}/>` +
        `<path d="M60 34 Q108 34 108 106 H88 Q92 56 60 34Z" ${SHADE}/>` +
        `<path d="M16 84 Q30 78 44 82 M76 82 Q92 78 104 84 M24 60 Q40 54 56 58 Q72 54 92 60 M40 42 Q50 48 60 46 M18 100 H34" fill="none" stroke="#5e5a6b" stroke-width="3" stroke-linecap="round"/>` +
        archDoor(46, 28, 72, '#3a2230') +
        `<path d="M52 106 V88 A8 8 0 0 1 68 88 V106Z" fill="#ff9a3c"/>` +
        `<circle cx="88" cy="70" r="7" fill="#ffb02e" ${K}/>` +
        `<path d="M28 50 Q34 40 44 38" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="5" stroke-linecap="round"/>`),
      // Hide teepee held up by bones
      svg(
        `<path d="M48 22 L36 2 M72 22 L84 2 M60 20 V0" stroke="#000" stroke-width="9" stroke-linecap="round"/>` +
        `<path d="M48 22 L36 2 M72 22 L84 2 M60 20 V0" stroke="#fff6e0" stroke-width="5" stroke-linecap="round"/>` +
        [[36, 2], [84, 2], [60, 0]].map(([x, y]) => `<circle cx="${x - 3}" cy="${y}" r="4" fill="#fff6e0" stroke="#000" stroke-width="2"/><circle cx="${x + 3}" cy="${y}" r="4" fill="#fff6e0" stroke="#000" stroke-width="2"/>`).join('') +
        `<path d="M12 106 L60 18 L108 106Z" fill="#d9a76a" ${K}/>` +
        `<path d="M60 18 L108 106 H82Z" ${SHADE}/>` +
        `<path d="M26 84 L34 76 L42 84 L50 76 L58 84 L66 76 L74 84 L82 76 L90 84 L96 78" fill="none" stroke="#b5463a" stroke-width="4" stroke-linejoin="round"/>` +
        `<path d="M40 56 L46 50 L52 56 M68 56 L74 50 L80 56" fill="none" stroke="#b5463a" stroke-width="3.5" stroke-linejoin="round"/>` +
        `<path d="M46 106 L60 70 L74 106Z" fill="#5a3424" ${K}/>` +
        `<path d="M60 70 L74 106 H66Z" fill="#ff9a3c" fill-opacity=".6"/>`),
    ],
  };

  DM.hutSVGs = (locationId) => HUTS[locationId] || HUTS.meadow;
})(window.DinoMatch = window.DinoMatch || {});
