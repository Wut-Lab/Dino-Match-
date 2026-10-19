/*
 * Dino Stamps: postage stamps with a dino's silhouette on them. Now and then
 * a small one is stuck on something in the scenery: a tree, a rock, the sun, a
 * hut... (in a round, see STAMP_CHANCE in game.js, and less often on the main
 * menu, see MENU_STAMP_CHANCE in main.js). Tapping it makes it pop up big, then
 * fly away, and adds it to the Dino Stamps collection. Each stamp has a fun
 * fact, shown and read aloud when it's tapped in the collection.
 *
 * White perforated edges, a black frame, a grey (or coloured) middle, a ¢ in the corner and
 * "Post" along the bottom. The silhouette is made from the dino's own art
 * (js/dino-art.js), so any dino can have a stamp.
 */
(function (DM) {
  'use strict';

  // To add a stamp: give it an id, the dino it shows, and its fun fact.
  // `colors` is optional: [light middle, dark edge, silhouette] (grey if left out).
  // `art` is optional: a silhouette drawn just for the stamp (see SIDE_ART below);
  // without it, the dino's game art is used.
  const STAMPS = [
    { id: 'pterodactyl', dino: 'pterodactyl', fact: 'Birds are related to dinosaurs!' },
    {
      id: 'ankylosaurus', dino: 'ankylosaurus', colors: ['#e4f7a6', '#9ccb2e', '#33461a'], art: 'ankylosaurus',
      fact: 'Dinosaur fossils have been found on all seven continents.',
    },
  ];
  STAMPS.forEach((s) => { s.fullName = `${DM.dinoById(s.dino).name} Stamp`; });

  // Side-on silhouettes for dinos whose game art faces forward (which makes a
  // blobby silhouette). Only the outline matters: it's filled with one colour.
  const SIDE_ART = {
    // Low armoured dome, stubby legs, small head on the right, club tail on the left.
    ankylosaurus: {
      viewBox: '0 0 200 110',
      svg: '<path d="M40 74 C40 40 70 25 100 25 C132 25 158 40 160 74Z"/>' +
        // bumps along the back
        '<circle cx="62" cy="40" r="7"/><circle cx="80" cy="30" r="7"/><circle cx="100" cy="26" r="7"/>' +
        '<circle cx="120" cy="30" r="7"/><circle cx="138" cy="40" r="7"/>' +
        // spikes sticking out of the shell's edge
        '<path d="M36 62 L22 70 L40 72Z M46 70 L36 84 L56 76Z M154 70 L164 84 L146 76Z"/>' +
        // belly and legs
        '<rect x="52" y="62" width="100" height="18" rx="8"/>' +
        '<rect x="56" y="70" width="15" height="28" rx="5"/><rect x="80" y="70" width="13" height="25" rx="5"/>' +
        '<rect x="112" y="70" width="13" height="25" rx="5"/><rect x="132" y="70" width="15" height="28" rx="5"/>' +
        // neck, head, and little horns at the back of the head
        '<path d="M148 50 Q164 52 170 60 L162 76 Q152 74 146 70Z"/>' +
        '<ellipse cx="176" cy="66" rx="16" ry="11"/><path d="M164 58 L160 46 L172 56Z"/>' +
        // tail and its bony club
        '<path d="M46 54 Q28 56 16 60 L16 66 Q30 68 48 72Z"/><ellipse cx="13" cy="63" rx="11" ry="9"/>',
    },
  };

  DM.STAMPS = STAMPS;
  DM.stampById = (id) => STAMPS.find((s) => s.id === id);

  // Stamp is drawn in a 100x124 box.
  const W = 100, H = 124;
  const HOLE = 3.4; // perforation hole radius

  // The white paper outline: a rectangle with half-circle bites all round.
  const PAPER = (() => {
    const f = (n) => n.toFixed(2);
    const edge = (x0, y0, x1, y1) => {
      const len = Math.hypot(x1 - x0, y1 - y0);
      const n = Math.round(len / 10); // holes along this edge
      const ux = (x1 - x0) / len, uy = (y1 - y0) / len;
      let d = '';
      for (let i = 1; i < n; i++) {
        const c = (len * i) / n; // hole centre along the edge
        d += `L${f(x0 + ux * (c - HOLE))} ${f(y0 + uy * (c - HOLE))}` +
          `A${HOLE} ${HOLE} 0 0 0 ${f(x0 + ux * (c + HOLE))} ${f(y0 + uy * (c + HOLE))}`;
      }
      return d + `L${x1} ${y1}`;
    };
    return `M0 0${edge(0, 0, W, 0)}${edge(W, 0, W, H)}${edge(W, H, 0, H)}${edge(0, H, 0, 0)}Z`;
  })();

  const GREY = ['#c3c8cd', '#8f969d', '#3d434a']; // default: light, dark, silhouette

  let uid = 0;

  DM.stampSVG = (dino, colors = GREY, art = DM.DINO_ART[dino.id]) => {
    const [light, dark, ink] = colors;
    const n = ++uid;
    // Picture area inside the black frame.
    const fx = 11, fy = 11, fw = W - 22, fh = H - 22;
    const pad = dino.flies ? 4 : 6;
    const picH = fh * 0.78; // room for "Post" underneath
    const text = 'font-family="Fredoka, sans-serif" font-weight="700" fill="#22272c" stroke="#fff" stroke-opacity=".55" stroke-width="2" paint-order="stroke"';
    return `<svg class="stamp-svg stamp-${dino.id}" viewBox="-3 -3 ${W + 6} ${H + 6}" aria-hidden="true">` +
      `<defs><radialGradient id="sg${n}" cx="50%" cy="42%" r="70%">` +
      `<stop offset="0" stop-color="${light}"/><stop offset="1" stop-color="${dark}"/></radialGradient>` +
      // solid silhouette: the art's shape filled with one flat colour
      `<filter id="ss${n}"><feFlood flood-color="${ink}"/><feComposite in2="SourceAlpha" operator="in"/></filter>` +
      `<filter id="sd${n}" x="-10%" y="-10%" width="125%" height="125%"><feDropShadow dx="0.8" dy="1.6" stdDeviation="1.2" flood-opacity=".25"/></filter>` +
      `<clipPath id="sk${n}"><rect x="${fx}" y="${fy}" width="${fw}" height="${fh}" rx="3"/></clipPath></defs>` +
      // paper with a soft shadow so the white edge shows on light backgrounds
      `<path d="${PAPER}" fill="#fff" stroke="#d2d2d2" stroke-width="0.7" filter="url(#sd${n})"/>` +
      // coloured picture with a pale "sun" behind the dino
      `<g clip-path="url(#sk${n})"><rect x="${fx}" y="${fy}" width="${fw}" height="${fh}" fill="url(#sg${n})"/>` +
      `<circle cx="${W / 2}" cy="${fy + fh * 0.44}" r="${fw * 0.36}" fill="#fff" fill-opacity=".28"/>` +
      `<path d="M${fx} ${fy + fh * 0.84} Q${W * 0.3} ${fy + fh * 0.76} ${W / 2} ${fy + fh * 0.84} T${fx + fw} ${fy + fh * 0.84} V${fy + fh} H${fx}Z" fill="#000" fill-opacity=".12"/>` +
      `<svg x="${fx + pad}" y="${fy + pad}" width="${fw - pad * 2}" height="${picH - pad}" viewBox="${art.viewBox}" preserveAspectRatio="xMidYMid meet" overflow="visible">` +
      `<g filter="url(#ss${n})">${art.svg}</g></svg>` +
      `<text x="${fx + fw - 5}" y="${fy + 15}" text-anchor="end" font-size="14" ${text}>¢</text>` +
      `<text x="${W / 2}" y="${fy + fh - 7}" text-anchor="middle" font-size="13" letter-spacing="0.5" ${text}>Post</text></g>` +
      // black frame
      `<rect x="${fx}" y="${fy}" width="${fw}" height="${fh}" rx="3" fill="none" stroke="#000" stroke-width="3.5"/>` +
      `</svg>`;
  };

  DM.stampArt = (stamp) => DM.stampSVG(DM.dinoById(stamp.dino), stamp.colors, SIDE_ART[stamp.art]);

  // ---- A small stamp stuck on something in the scene ----

  const rand = (a, b) => a + Math.random() * (b - a);
  const inside = (x, y, r) => x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;

  /**
   * Stick a random stamp on one of `anchors` (elements in the scene).
   * opts:
   *   layer        element the stamp goes in (positioned, covers the scene)
   *   size         stamp width in px
   *   avoid        rects (screen coords) to keep clear of, e.g. menu buttons
   *   zFor(anchor) z-index for a stamp on that anchor (so things in front stay in front)
   *   isFound(id), onCaught(stamp): collection checks, as in the game
   *   canTap()     optional: return false to ignore taps (e.g. paused)
   *   bannerClass  optional extra class for the "collected!" banner
   * Returns the stamp element, or null if there was nowhere good to put it.
   */
  function stick(anchors, opts) {
    const layer = opts.layer;
    const lr = layer.getBoundingClientRect();
    const S = opts.size, H = S * 130 / 106;
    const avoid = opts.avoid || [];
    // Try random spots on random anchors until one is on screen and clear.
    let spot = null;
    for (let i = 0; i < 40 && !spot && anchors.length; i++) {
      const a = anchors[Math.floor(Math.random() * anchors.length)];
      const r = a.getBoundingClientRect();
      if (r.width < S * 0.6 || r.height < H * 0.4) continue;
      const fx = rand(0.3, 0.7), fy = rand(0.25, 0.55);
      const x = r.left + r.width * fx, y = r.top + r.height * fy;
      const ok = x - S / 2 > lr.left + 4 && x + S / 2 < lr.right - 4 && y - H / 2 > lr.top + 4 && y + H / 2 < lr.bottom - 4 &&
        !avoid.some((v) => inside(x, y, { left: v.left - S, right: v.right + S, top: v.top - H, bottom: v.bottom + H }));
      if (ok) spot = { a, fx, fy };
    }
    if (!spot) return null;

    const stamp = STAMPS[Math.floor(Math.random() * STAMPS.length)];
    const isNew = !opts.isFound(stamp.id);
    const el = document.createElement('div');
    el.className = 'stuck-stamp' + (isNew ? ' star-glow' : '');
    el.style.width = `${S}px`;
    el.style.zIndex = opts.zFor ? opts.zFor(spot.a) : 0;
    el.style.setProperty('--star', '#fff3a0');
    el.style.setProperty('--tilt', `${rand(-16, 16).toFixed(0)}deg`);
    el.setAttribute('role', 'button');
    el.setAttribute('aria-label', stamp.fullName);
    el.innerHTML = DM.stampArt(stamp) + (isNew ? '<div class="gold-sparkles"><i></i><i></i><i></i><i></i></div>' : '');

    // Keep it on its anchor if the screen is resized (trees move then).
    const position = () => {
      if (!el.isConnected) return window.removeEventListener('resize', position);
      const l = layer.getBoundingClientRect(), r = spot.a.getBoundingClientRect();
      el.style.left = `${r.left + r.width * spot.fx - l.left}px`;
      el.style.top = `${r.top + r.height * spot.fy - l.top}px`;
    };
    window.addEventListener('resize', position);

    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (opts.canTap && !opts.canTap()) return;
      el.remove();
      popOff(el, stamp, isNew, opts);
      opts.onCaught(stamp);
    });
    layer.appendChild(el);
    position();
    return el;
  }

  // A caught stamp grows big where everyone can see it, then flies away.
  function popOff(small, stamp, isNew, opts) {
    const layer = opts.layer;
    const W = layer.clientWidth, Hh = layer.clientHeight;
    const big = Math.min(Math.max(opts.size * 3, 110), W * 0.4, Hh * 0.45 * 106 / 130);
    const bigH = big * 130 / 106;
    const x0 = parseFloat(small.style.left), y0 = parseFloat(small.style.top);
    // Keep the big stamp (and its bubble underneath) on screen.
    const x = Math.min(Math.max(x0, big * 0.6), W - big * 0.6);
    const y = Math.min(Math.max(y0, bigH * 0.6), Hh - bigH * 0.6 - 50);
    const fly = document.createElement('div');
    fly.className = 'stamp-fly';
    fly.style.left = `${x}px`;
    fly.style.top = `${y}px`;
    fly.style.width = `${big}px`;
    fly.style.setProperty('--dino-w', `${big}px`);
    fly.style.setProperty('--from', (opts.size / big).toFixed(3));
    fly.style.setProperty('--dx', `${(x0 - x).toFixed(1)}px`);
    fly.style.setProperty('--dy', `${(y0 - y).toFixed(1)}px`);
    fly.style.setProperty('--tilt', small.style.getPropertyValue('--tilt'));
    fly.innerHTML = `<div class="stamp-fly-art">${DM.stampArt(stamp)}</div>`;
    layer.appendChild(fly);
    setTimeout(() => fly.remove(), 2600);
    DM.celebrate(layer, fly, isNew, stamp.fullName, opts.bannerClass);
  }

  DM.StuckStamp = { stick };
})(window.DinoMatch = window.DinoMatch || {});
