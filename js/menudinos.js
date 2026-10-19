/*
 * Main menu background: a random location with a few dino huts, and a few
 * random dinos casually hopping around (fliers glide about in the sky
 * instead). All of it is picked afresh every time the menu opens.
 *
 * Tapping a dino makes it hop with the happy sound and shoot a star up from
 * its head; tapping a hut gives it a little shake and a soft rustle.
 *
 * Positions are in % of the menu screen, so it all scales with the window.
 */
(function (DM) {
  'use strict';

  const COUNT = 6;
  const HUTS = 4;                     // two each side, clear of the menu buttons
  let GROUND = [40, 90];              // where hoppers' feet can be (set from the location's horizon)
  const SKY = [10, 30];               // where fliers can be
  const X = [6, 94];
  const HOP_MS = 450;                 // matches the menu-hop animation

  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, [a, b]) => Math.min(b, Math.max(a, v));

  let box = null;
  let herd = [];

  // Further away (higher up) means smaller and behind the nearer dinos.
  const depthAt = (y) => 0.6 + 0.4 * (y - GROUND[0]) / (GROUND[1] - GROUND[0]);
  function place(m) {
    const depth = m.dino.flies ? 0.8 : depthAt(m.y);
    m.el.style.left = `${m.x}%`;
    m.el.style.top = `${m.y}%`;
    m.el.style.setProperty('--depth', depth.toFixed(3));
    m.el.style.zIndex = Math.round(m.y);
  }

  function face(m, dx) {
    if (Math.abs(dx) > 0.5) m.el.classList.toggle('face-left', dx < 0);
  }

  // A hopper does a little run of 1-3 hops in one direction, then rests.
  function hopRun(m) {
    let hops = 1 + Math.floor(Math.random() * 3);
    let dx = rand(3, 7) * (Math.random() < 0.5 ? -1 : 1);
    if (m.x + dx * hops < X[0] || m.x + dx * hops > X[1]) dx = -dx; // turn around at the edges
    const dy = rand(-2.5, 2.5);
    face(m, dx);
    const hop = () => {
      m.x = clamp(m.x + dx, X);
      m.y = clamp(m.y + dy, GROUND);
      place(m);
      m.body.classList.remove('menu-hop');
      void m.body.offsetWidth;
      m.body.classList.add('menu-hop');
      hops -= 1;
      m.timer = setTimeout(hops > 0 ? hop : () => hopRun(m), hops > 0 ? HOP_MS + 60 : rand(1500, 5000));
    };
    hop();
  }

  // A flier glides to a new spot in the sky, then hovers for a bit.
  function glide(m) {
    const nx = clamp(m.x + rand(10, 30) * (Math.random() < 0.5 ? -1 : 1), X);
    face(m, nx - m.x);
    m.x = nx;
    m.y = rand(SKY[0], SKY[1]);
    place(m);
    m.timer = setTimeout(() => glide(m), rand(4000, 7000));
  }

  // Huts go at the sides (the buttons fill the middle): on each side one
  // further back and one nearer, each design used at least once.
  function buildHuts(locationId) {
    const designs = DM.hutSVGs(locationId);
    const kinds = Array.from({ length: HUTS }, (_, i) => designs[i % designs.length]).sort(() => Math.random() - 0.5);
    const mid = (GROUND[0] + GROUND[1]) / 2;
    const spots = [];
    for (const [x0, x1] of [[11, 27], [73, 89]]) {
      const far = rand(x0, x1);
      const near = far < (x0 + x1) / 2 ? rand(far + 7, x1) : rand(x0, far - 7); // don't stack them
      spots.push([far, rand(GROUND[0] + 2, mid - 6)], [near, rand(mid + 8, GROUND[1] - 2)]);
    }
    spots.forEach(([x, y], i) => {
      const el = document.createElement('div');
      el.className = 'menu-hut';
      el.innerHTML = `<div class="hut-body">${kinds[i]}</div>`;
      el.style.left = `${x}%`;
      el.style.top = `${y}%`;
      el.style.setProperty('--depth', depthAt(y).toFixed(3));
      el.style.zIndex = Math.round(y);
      if (Math.random() < 0.5) el.classList.add('flip');
      box.appendChild(el);
    });
  }

  function start(container, location) {
    stop();
    if (box !== container) container.addEventListener('pointerdown', onTap);
    box = container;
    GROUND = [location.horizon * 100 + 6, 90];
    buildHuts(location.id);
    const picks = DM.DINOS.slice().sort(() => Math.random() - 0.5).slice(0, COUNT);
    herd = picks.map((dino, i) => {
      const el = document.createElement('div');
      el.className = 'menu-dino' + (dino.flies ? ' flier' : '');
      el.style.setProperty('--blink-delay', `${-i * 0.7}s`);
      el.innerHTML = `<div class="menu-dino-body"><div class="actor-flip">${DM.dinoSVG(dino)}</div></div>`;
      box.appendChild(el);
      // Spread them out: each starts in its own slice of the width.
      const slice = (X[1] - X[0]) / COUNT;
      const m = {
        dino, el, body: el.firstChild,
        x: X[0] + slice * (i + rand(0.2, 0.8)),
        y: dino.flies ? rand(SKY[0], SKY[1]) : rand(GROUND[0], GROUND[1]),
      };
      face(m, Math.random() - 0.5);
      place(m);
      // Start moving at different times so they don't hop in step.
      m.timer = setTimeout(() => (dino.flies ? glide : hopRun)(m), rand(300, 3500));
      return m;
    });
  }

  // ---- Tapping ----
  const STAR = '<svg viewBox="-12 -12 24 24" aria-hidden="true"><path d="M0 -10 L2.9 -3.6 L9.5 -3.1 L4.5 1.3 L5.9 8.1 L0 4.6 L-5.9 8.1 L-4.5 1.3 L-9.5 -3.1 L-2.9 -3.6Z" fill="#ffd23f" stroke="#000" stroke-width="1.6" stroke-linejoin="round"/><path d="M-2 -4 L0 -8" stroke="#fff" stroke-opacity=".7" stroke-width="1.6" stroke-linecap="round"/></svg>';

  function shootStar(m) {
    const b = box.getBoundingClientRect();
    const r = m.el.querySelector('.dino-svg').getBoundingClientRect();
    const star = document.createElement('div');
    star.className = 'menu-star';
    star.innerHTML = STAR;
    star.style.left = `${r.left + r.width / 2 - b.left}px`;
    star.style.top = `${r.top + r.height * 0.1 - b.top}px`;
    star.style.setProperty('--size', `${Math.max(28, r.width * 0.32)}px`);
    star.style.setProperty('--drift', `${rand(-30, 30).toFixed(0)}px`);
    star.addEventListener('animationend', () => star.remove());
    box.appendChild(star);
  }

  function bounce(el, cls) {
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
  }

  function onTap(e) {
    const dinoEl = e.target.closest('.menu-dino');
    const hutEl = e.target.closest('.menu-hut');
    if (dinoEl) {
      const m = herd.find((h) => h.el === dinoEl);
      if (!m) return;
      bounce(m.body, 'menu-hop');
      DM.Sound.play('correct');
      shootStar(m);
    } else if (hutEl) {
      bounce(hutEl.firstChild, 'hut-shake');
      DM.Sound.play('rustle');
    }
  }

  function stop() {
    herd.forEach((m) => clearTimeout(m.timer));
    herd = [];
    if (box) box.innerHTML = '';
  }

  DM.MenuDinos = { start, stop };
})(window.DinoMatch = window.DinoMatch || {});
