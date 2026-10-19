/*
 * Dino stamps: a postage stamp with a dino's silhouette on it. White
 * perforated edges, a black frame and a grey middle. The silhouette is made
 * from the dino's own art (js/dino-art.js), so any dino can have a stamp.
 */
(function (DM) {
  'use strict';

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

  const INK = '#3d434a'; // silhouette colour

  let uid = 0;

  DM.stampSVG = (dino) => {
    const art = DM.DINO_ART[dino.id];
    const n = ++uid;
    // Picture area inside the black frame.
    const fx = 11, fy = 11, fw = W - 22, fh = H - 22;
    const pad = dino.flies ? 4 : 6;
    return `<svg class="stamp-svg stamp-${dino.id}" viewBox="-3 -3 ${W + 6} ${H + 6}" aria-hidden="true">` +
      `<defs><radialGradient id="sg${n}" cx="50%" cy="42%" r="70%">` +
      `<stop offset="0" stop-color="#c3c8cd"/><stop offset="1" stop-color="#8f969d"/></radialGradient>` +
      // solid silhouette: the art's shape filled with one flat colour
      `<filter id="ss${n}"><feFlood flood-color="${INK}"/><feComposite in2="SourceAlpha" operator="in"/></filter>` +
      `<filter id="sd${n}" x="-10%" y="-10%" width="125%" height="125%"><feDropShadow dx="0.8" dy="1.6" stdDeviation="1.2" flood-opacity=".25"/></filter>` +
      `<clipPath id="sk${n}"><rect x="${fx}" y="${fy}" width="${fw}" height="${fh}" rx="3"/></clipPath></defs>` +
      // paper with a soft shadow so the white edge shows on light backgrounds
      `<path d="${PAPER}" fill="#fff" stroke="#d2d2d2" stroke-width="0.7" filter="url(#sd${n})"/>` +
      // grey picture with a pale "sun" behind the dino
      `<g clip-path="url(#sk${n})"><rect x="${fx}" y="${fy}" width="${fw}" height="${fh}" fill="url(#sg${n})"/>` +
      `<circle cx="${W / 2}" cy="${fy + fh * 0.44}" r="${fw * 0.36}" fill="#fff" fill-opacity=".28"/>` +
      `<path d="M${fx} ${fy + fh * 0.84} Q${W * 0.3} ${fy + fh * 0.76} ${W / 2} ${fy + fh * 0.84} T${fx + fw} ${fy + fh * 0.84} V${fy + fh} H${fx}Z" fill="#000" fill-opacity=".12"/>` +
      `<svg x="${fx + pad}" y="${fy + pad}" width="${fw - pad * 2}" height="${fh * 0.9 - pad}" viewBox="${art.viewBox}" preserveAspectRatio="xMidYMid meet" overflow="visible">` +
      `<g filter="url(#ss${n})">${art.svg}</g></svg></g>` +
      // black frame
      `<rect x="${fx}" y="${fy}" width="${fw}" height="${fh}" rx="3" fill="none" stroke="#000" stroke-width="3.5"/>` +
      `</svg>`;
  };
})(window.DinoMatch = window.DinoMatch || {});
