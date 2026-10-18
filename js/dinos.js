/*
 * Dino roster. Every dino is drawn as inline SVG (viewBox 200x160, facing right)
 * so there are no image files to load and colours are easy to tweak.
 *
 * To add a dino: push a new entry into DINOS with an id, name, colours and a
 * draw() function. Anything with class "leg-a"/"leg-b" swings while walking,
 * and "wing-l"/"wing-r" flap for fliers.
 */
(function (DM) {
  'use strict';

  const OUT = '#3d2c4e';
  const S = `stroke="${OUT}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"`;
  const S3 = `stroke="${OUT}" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"`;

  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    const ch = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
    const r = ch(n >> 16), g = ch((n >> 8) & 255), b = ch(n & 255);
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  }

  const eye = (x, y, r = 8) =>
    `<g class="eye"><circle cx="${x}" cy="${y}" r="${r}" fill="#fff" ${S3}/>` +
    `<circle cx="${x + 1.5}" cy="${y + 1}" r="${r * 0.55}" fill="${OUT}"/>` +
    `<circle cx="${x + 3}" cy="${y - 2}" r="${r * 0.22}" fill="#fff"/></g>`;
  const cheek = (x, y) => `<ellipse cx="${x}" cy="${y}" rx="6.5" ry="4" fill="#ff6f9f" opacity=".5"/>`;
  const line = (d) => `<path d="${d}" fill="none" ${S3}/>`;
  const leg = (x, y, w, h, fill, cls) =>
    `<rect class="leg ${cls}" x="${x}" y="${y}" width="${w}" height="${h}" rx="${w / 2.2}" fill="${fill}" ${S}/>`;
  const arm = (d, fill) =>
    `<path d="${d}" fill="none" stroke="${OUT}" stroke-width="11" stroke-linecap="round"/>` +
    `<path d="${d}" fill="none" stroke="${fill}" stroke-width="4.5" stroke-linecap="round"/>`;
  const spots = (pts, fill) => pts.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`).join('');

  const DINOS = [
    {
      id: 'trex',
      name: 'T-Rex',
      colors: { body: '#7ed957', belly: '#e2f8c4', spots: '#5bbf3c' },
      draw: (c) => `
        ${leg(68, 112, 22, 36, shade(c.body, 0.82), 'leg-b')}
        ${leg(104, 112, 24, 36, c.body, 'leg-a')}
        <path d="M60 90 C34 88 16 76 6 58 C10 90 36 116 72 122 Z" fill="${c.body}" ${S}/>
        <ellipse cx="96" cy="98" rx="46" ry="34" fill="${c.body}" ${S}/>
        <ellipse cx="106" cy="110" rx="26" ry="17" fill="${c.belly}"/>
        ${spots([[76, 80, 6], [92, 71, 4.5], [64, 96, 4]], c.spots)}
        ${arm('M134 104 Q146 106 148 116', c.body)}
        <rect x="112" y="28" width="76" height="54" rx="27" fill="${c.body}" ${S}/>
        ${line('M146 66 Q164 78 184 64')}
        <circle cx="178" cy="42" r="2.5" fill="${OUT}"/>
        ${eye(148, 48, 9)}
        ${cheek(160, 64)}`,
    },
    {
      id: 'triceratops',
      name: 'Triceratops',
      colors: { body: '#ffc23d', belly: '#ffeac0', frill: '#ff7f50', horn: '#fff6e2' },
      draw: (c) => `
        ${leg(54, 108, 22, 34, shade(c.body, 0.82), 'leg-a')}
        ${leg(118, 108, 22, 34, shade(c.body, 0.82), 'leg-b')}
        ${leg(68, 110, 22, 34, c.body, 'leg-b')}
        ${leg(132, 110, 22, 34, c.body, 'leg-a')}
        <path d="M44 92 C26 94 12 102 4 114 C20 116 36 114 52 112 Z" fill="${c.body}" ${S}/>
        <ellipse cx="88" cy="98" rx="52" ry="32" fill="${c.body}" ${S}/>
        <ellipse cx="88" cy="112" rx="34" ry="12" fill="${c.belly}"/>
        <circle cx="136" cy="76" r="34" fill="${c.frill}" ${S}/>
        ${spots([[112, 60, 4.5], [124, 48, 4.5], [140, 44, 4.5], [156, 50, 4.5]], c.belly)}
        <path d="M150 80 L156 46 L166 78 Z" fill="${c.horn}" ${S3}/>
        <path d="M168 82 L182 52 L184 86 Z" fill="${c.horn}" ${S3}/>
        <ellipse cx="162" cy="98" rx="30" ry="24" fill="${c.body}" ${S}/>
        <path d="M184 90 L197 76 L192 99 Z" fill="${c.horn}" ${S3}/>
        ${eye(160, 92, 8)}
        ${cheek(172, 106)}
        ${line('M166 110 Q178 116 188 106')}`,
    },
    {
      id: 'stegosaurus',
      name: 'Stegosaurus',
      colors: { body: '#b18cff', belly: '#e8dcff', plate: '#ff8fc7' },
      draw: (c) => {
        const plates = [[50, 16], [70, 24], [92, 28], [114, 24], [134, 16]].map(([x, h]) => {
          const base = 100 - 30 * Math.sqrt(1 - ((x - 92) / 54) ** 2) + 10;
          return `<path d="M${x - 11} ${base} Q${x - 6} ${base - h} ${x} ${base - h - 5} Q${x + 6} ${base - h} ${x + 11} ${base} Z" fill="${c.plate}" ${S3}/>`;
        }).join('');
        return `
        ${leg(52, 108, 22, 34, shade(c.body, 0.82), 'leg-a')}
        ${leg(114, 108, 22, 34, shade(c.body, 0.82), 'leg-b')}
        ${leg(66, 110, 22, 34, c.body, 'leg-b')}
        ${leg(128, 110, 22, 34, c.body, 'leg-a')}
        <path d="M14 76 L0 66 L20 80 Z" fill="${c.plate}" ${S3}/>
        <path d="M24 88 L10 84 L28 94 Z" fill="${c.plate}" ${S3}/>
        <path d="M46 94 C28 90 14 80 6 66 C10 94 28 110 52 112 Z" fill="${c.body}" ${S}/>
        ${plates}
        <ellipse cx="92" cy="100" rx="54" ry="30" fill="${c.body}" ${S}/>
        <ellipse cx="96" cy="114" rx="36" ry="11" fill="${c.belly}"/>
        <ellipse cx="160" cy="108" rx="24" ry="17" fill="${c.body}" ${S}/>
        ${eye(162, 102, 7.5)}
        ${cheek(172, 114)}
        ${line('M166 118 Q176 122 182 114')}`;
      },
    },
    {
      id: 'brontosaurus',
      name: 'Brontosaurus',
      colors: { body: '#6ec6ff', belly: '#d6f0ff', spots: '#46a8ec' },
      draw: (c) => `
        ${leg(54, 108, 20, 40, shade(c.body, 0.82), 'leg-a')}
        ${leg(112, 108, 20, 40, shade(c.body, 0.82), 'leg-b')}
        ${leg(68, 110, 20, 38, c.body, 'leg-b')}
        ${leg(126, 110, 20, 38, c.body, 'leg-a')}
        <path d="M50 96 C22 96 6 110 2 128 C24 116 40 112 56 114 Z" fill="${c.body}" ${S}/>
        <path d="M116 82 C132 66 140 42 150 28 L172 34 C162 54 152 84 136 108 Z" fill="${c.body}" ${S}/>
        <ellipse cx="90" cy="98" rx="50" ry="30" fill="${c.body}" ${S}/>
        <ellipse cx="92" cy="112" rx="32" ry="12" fill="${c.belly}"/>
        ${spots([[72, 82, 6], [92, 76, 5], [110, 84, 4.5], [60, 96, 4]], c.spots)}
        <ellipse cx="168" cy="30" rx="22" ry="15" fill="${c.body}" ${S}/>
        ${eye(168, 25, 7)}
        ${cheek(180, 35)}
        ${line('M174 38 Q182 40 188 33')}`,
    },
    {
      id: 'pterodactyl',
      name: 'Pterodactyl',
      flies: true,
      colors: { body: '#4fd6c4', wing: '#2fb5a5', belly: '#cbf6ef', crest: '#ff8a5b', beak: '#ffd166' },
      draw: (c) => `
        <path class="wing wing-l" d="M90 80 C70 50 40 38 12 40 C24 56 26 70 22 84 C40 78 60 86 84 100 Z" fill="${c.wing}" ${S}/>
        <path class="wing wing-r" d="M110 80 C130 50 160 38 188 40 C176 56 174 70 178 84 C160 78 140 86 116 100 Z" fill="${c.wing}" ${S}/>
        ${leg(86, 112, 11, 18, c.beak, 'leg-a')}
        ${leg(103, 112, 11, 18, c.beak, 'leg-b')}
        <ellipse cx="100" cy="92" rx="22" ry="28" fill="${c.body}" ${S}/>
        <ellipse cx="100" cy="100" rx="13" ry="17" fill="${c.belly}"/>
        <path d="M98 50 L70 34 L94 62 Z" fill="${c.crest}" ${S3}/>
        <path d="M116 52 L150 62 L116 68 Z" fill="${c.beak}" ${S3}/>
        <ellipse cx="106" cy="57" rx="18" ry="15" fill="${c.body}" ${S}/>
        ${eye(108, 53, 7)}
        ${cheek(116, 64)}`,
    },
    {
      id: 'ankylosaurus',
      name: 'Ankylosaurus',
      colors: { body: '#d9a56e', armor: '#a8713c', belly: '#f6dfb8' },
      draw: (c) => `
        ${leg(46, 108, 22, 32, shade(c.body, 0.82), 'leg-a')}
        ${leg(114, 108, 22, 32, shade(c.body, 0.82), 'leg-b')}
        ${leg(60, 110, 22, 30, c.body, 'leg-b')}
        ${leg(128, 110, 22, 30, c.body, 'leg-a')}
        <path d="M44 106 C32 104 24 102 16 100 L16 114 C26 116 34 116 46 118 Z" fill="${c.body}" ${S}/>
        <ellipse cx="15" cy="107" rx="13" ry="11" fill="${c.armor}" ${S}/>
        <path d="M28 122 C28 62 150 54 162 122 Z" fill="${c.body}" ${S}/>
        ${[[48, 92, 7], [70, 79, 7], [95, 74, 7], [120, 78, 7], [142, 92, 7]].map(([x, y, r]) =>
          `<circle cx="${x}" cy="${y}" r="${r}" fill="${c.armor}" ${S3}/>`).join('')}
        ${[[60, 106, 6], [84, 96, 6], [108, 96, 6], [132, 108, 6]].map(([x, y, r]) =>
          `<circle cx="${x}" cy="${y}" r="${r}" fill="${c.armor}" ${S3}/>`).join('')}
        <ellipse cx="164" cy="110" rx="22" ry="16" fill="${c.body}" ${S}/>
        ${eye(166, 104, 7)}
        ${cheek(176, 116)}
        ${line('M170 120 Q178 124 184 118')}`,
    },
    {
      id: 'parasaurolophus',
      name: 'Parasaurolophus',
      colors: { body: '#ff8fb1', belly: '#ffdbe6', crest: '#c45fa0' },
      draw: (c) => `
        ${leg(68, 110, 22, 38, shade(c.body, 0.82), 'leg-b')}
        ${leg(98, 112, 24, 36, c.body, 'leg-a')}
        <path d="M54 96 C30 94 12 84 4 72 C8 100 30 116 60 118 Z" fill="${c.body}" ${S}/>
        <path d="M110 82 C122 68 130 58 138 50 L160 60 C150 72 138 90 126 108 Z" fill="${c.body}" ${S}/>
        <ellipse cx="90" cy="100" rx="44" ry="32" fill="${c.body}" ${S}/>
        <ellipse cx="98" cy="112" rx="26" ry="16" fill="${c.belly}"/>
        ${arm('M126 102 Q136 104 138 114', c.body)}
        <path d="M146 44 C126 32 104 22 86 22 C80 24 80 32 88 34 C104 36 124 46 144 58 Z" fill="${c.crest}" ${S}/>
        <ellipse cx="178" cy="58" rx="13" ry="9" fill="${shade(c.body, 0.9)}" ${S}/>
        <ellipse cx="158" cy="52" rx="22" ry="16" fill="${c.body}" ${S}/>
        ${eye(156, 46, 7)}
        ${cheek(166, 58)}`,
    },
    {
      id: 'spinosaurus',
      name: 'Spinosaurus',
      colors: { body: '#ff7663', belly: '#ffd8cf', sail: '#ffcf4d' },
      draw: (c) => `
        ${leg(70, 112, 22, 36, shade(c.body, 0.82), 'leg-b')}
        ${leg(102, 114, 24, 34, c.body, 'leg-a')}
        <path d="M48 92 C52 30 122 22 134 86 Z" fill="${c.sail}" ${S}/>
        ${['M66 82 L64 50', 'M84 78 L84 38', 'M102 78 L104 38', 'M118 82 L122 56'].map((d) =>
          `<path d="${d}" stroke="${shade(c.sail, 0.8)}" stroke-width="4" stroke-linecap="round"/>`).join('')}
        <path d="M54 96 C28 92 12 82 2 70 C8 100 30 116 60 118 Z" fill="${c.body}" ${S}/>
        <ellipse cx="92" cy="102" rx="46" ry="30" fill="${c.body}" ${S}/>
        <ellipse cx="100" cy="114" rx="28" ry="14" fill="${c.belly}"/>
        ${arm('M128 106 Q140 108 142 118', c.body)}
        <rect x="118" y="62" width="78" height="32" rx="16" fill="${c.body}" ${S}/>
        ${line('M142 84 Q166 92 190 82')}
        <circle cx="186" cy="70" r="2.5" fill="${OUT}"/>
        ${eye(144, 70, 8)}
        ${cheek(156, 84)}`,
    },
  ];

  DM.DINOS = DINOS;
  DM.dinoById = (id) => DINOS.find((d) => d.id === id);
  DM.dinoSVG = (dino) =>
    `<svg class="dino-svg dino-${dino.id}" viewBox="0 0 200 160" aria-hidden="true">${dino.draw(dino.colors)}</svg>`;
})(window.DinoMatch = window.DinoMatch || {});
