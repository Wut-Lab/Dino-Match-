/*
 * Main menu background: a few random dinos casually hopping around the meadow
 * behind the menu (fliers glide about in the sky instead). A fresh random herd
 * is picked every time the menu opens.
 *
 * Positions are in % of the menu screen, so it all scales with the window.
 */
(function (DM) {
  'use strict';

  const COUNT = 6;
  const HORIZON = 34;                 // % from the top where the grass starts (meadow scene)
  const GROUND = [HORIZON + 6, 90];   // where hoppers' feet can be
  const SKY = [10, 30];               // where fliers can be
  const X = [6, 94];
  const HOP_MS = 450;                 // matches the menu-hop animation

  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, [a, b]) => Math.min(b, Math.max(a, v));

  let box = null;
  let herd = [];

  // Further away (higher up) means smaller and behind the nearer dinos.
  function place(m) {
    const depth = m.dino.flies ? 0.8 : 0.6 + 0.4 * (m.y - GROUND[0]) / (GROUND[1] - GROUND[0]);
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

  function start(container) {
    stop();
    box = container;
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

  function stop() {
    herd.forEach((m) => clearTimeout(m.timer));
    herd = [];
    if (box) box.innerHTML = '';
  }

  DM.MenuDinos = { start, stop };
})(window.DinoMatch = window.DinoMatch || {});
