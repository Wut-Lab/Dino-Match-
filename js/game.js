/*
 * Core gameplay: dinos wander around the field, the card shows which one to
 * find, and a correct tap sends that dino walking off screen.
 */
(function (DM) {
  'use strict';

  const rand = (a, b) => a + Math.random() * (b - a);
  const randInt = (a, b) => Math.floor(rand(a, b + 1));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const MIN_DINOS = 6;
  const MAX_DINOS = 8;
  const HINT_DELAY_MS = 9000; // show a hint if the player is stuck this long
  const MISSES_BEFORE_HINT = 2;
  const CHEER_TIME = 0.65; // seconds the found dino celebrates before leaving
  const EXIT_SPEED = 2.8; // dino-widths per second when walking off screen

  class Actor {
    constructor(dino, game) {
      this.dino = dino;
      this.x = 0;
      this.y = 0;
      this.tx = 0;
      this.ty = 0;
      this.speed = rand(0.35, 0.6); // dino-widths per second
      this.wait = rand(0.2, 1.5);
      this.moving = false;
      this.facing = Math.random() < 0.5 ? 1 : -1;
      this.leaving = false;
      this.cheer = 0;
      this.gone = false;

      const el = document.createElement('div');
      el.className = 'actor' + (dino.flies ? ' flier' : '');
      el.style.setProperty('--blink-delay', `${-rand(0, 4).toFixed(2)}s`);
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', dino.name);
      el.innerHTML =
        `<div class="actor-shadow"></div>` +
        `<div class="actor-body"><div class="actor-flip">${DM.dinoSVG(dino)}</div></div>`;
      el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        game.tap(this);
      });
      this.el = el;
      this.body = el.querySelector('.actor-body');
    }

    react(name) {
      this.body.classList.remove('hop', 'shake', 'cheer');
      void this.body.offsetWidth; // restart the CSS animation
      this.body.classList.add(name);
    }

    leave(b, size) {
      this.leaving = true;
      this.moving = false;
      this.cheer = CHEER_TIME;
      this.el.classList.remove('hint');
      this.el.classList.add('leaving');
      this.react('cheer');
      this.exitX = this.x < b.W / 2 ? -size.w * 1.2 : b.W + size.w * 1.2;
    }

    update(dt, b, size) {
      if (this.leaving) {
        if (this.cheer > 0) {
          this.cheer -= dt;
          if (this.cheer <= 0) {
            this.tx = this.exitX;
            this.ty = this.y;
            this.moving = true;
          }
        }
      } else if (!this.moving) {
        this.wait -= dt;
        if (this.wait <= 0) {
          this.tx = rand(b.minX, b.maxX);
          this.ty = rand(b.minY, b.maxY);
          this.moving = true;
        }
      }

      if (this.moving) {
        const dx = this.tx - this.x;
        const dy = this.ty - this.y;
        const d = Math.hypot(dx, dy);
        const step = (this.leaving ? EXIT_SPEED : this.speed) * size.w * dt;
        if (d <= step) {
          this.x = this.tx;
          this.y = this.ty;
          if (this.leaving) {
            this.gone = true;
          } else {
            this.moving = false;
            this.wait = rand(0.6, 2.6);
          }
        } else {
          this.x += (dx / d) * step;
          this.y += (dy / d) * step;
          if (Math.abs(dx) > 1) this.facing = dx > 0 ? 1 : -1;
        }
      }
    }

    render(size) {
      this.el.style.transform = `translate3d(${(this.x - size.w / 2).toFixed(1)}px, ${(this.y - size.h).toFixed(1)}px, 0)`;
      this.el.style.zIndex = 10 + Math.round(this.y);
      this.el.classList.toggle('walking', this.moving);
      this.el.classList.toggle('face-left', this.facing < 0);
    }
  }

  class Game {
    /**
     * @param {object} opts
     *   field, card, pic, label, nameEl, progress: DOM elements
     *   onWin(roundSize): called once every dino has been found
     */
    constructor(opts) {
      Object.assign(this, opts);
      this.actors = [];
      this.running = false;
      this.raf = 0;
      this.timers = [];
      this.size = { w: 100, h: 80 };
      this.bounds = {};
      this.location = DM.LOCATIONS[0];
      this.loop = this.loop.bind(this);
      window.addEventListener('resize', () => this.running && this.measure());
      this.card.addEventListener('pointerdown', () => this.target && this.announce());
    }

    measure() {
      const W = this.field.clientWidth;
      const H = this.field.clientHeight;
      const w = clamp(Math.min(W / 4.2, H / 2.6), 64, 200);
      const h = w * 0.8;
      this.size = { w, h };
      this.field.style.setProperty('--dino-w', `${w}px`);
      const minY = Math.min(H * this.location.horizon + h * 0.55, H - 6);
      this.bounds = { W, H, minX: w * 0.5, maxX: Math.max(w * 0.5, W - w * 0.5), minY, maxY: H - 6 };
      const b = this.bounds;
      for (const a of this.actors) {
        if (a.leaving) continue;
        a.x = clamp(a.x, b.minX, b.maxX);
        a.y = clamp(a.y, b.minY, b.maxY);
        a.tx = clamp(a.tx, b.minX, b.maxX);
        a.ty = clamp(a.ty, b.minY, b.maxY);
      }
    }

    start() {
      this.stop();
      this.measure();
      const count = randInt(MIN_DINOS, Math.min(MAX_DINOS, DM.DINOS.length));
      this.actors = shuffle(DM.DINOS).slice(0, count).map((d) => new Actor(d, this));
      this.placeActors();
      for (const a of this.actors) {
        a.render(this.size);
        this.field.appendChild(a.el);
      }
      this.total = count;
      this.found = 0;
      this.target = null;
      this.renderProgress();
      this.setCard(null, 'Get ready!');
      this.running = true;
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.loop);
      this.later(() => this.nextTarget(), 600);
    }

    stop() {
      this.running = false;
      cancelAnimationFrame(this.raf);
      this.timers.forEach(clearTimeout);
      this.timers = [];
      this.actors.forEach((a) => a.el.remove());
      this.actors = [];
      this.target = null;
    }

    later(fn, ms) {
      this.timers.push(setTimeout(fn, ms));
    }

    // Spread dinos out so they don't start stacked on each other.
    placeActors() {
      const b = this.bounds;
      const minD = this.size.w * 0.8;
      const placed = [];
      for (const a of this.actors) {
        let best = null;
        let bestD = -1;
        for (let i = 0; i < 40; i++) {
          const p = { x: rand(b.minX, b.maxX), y: rand(b.minY, b.maxY) };
          const d = Math.min(Infinity, ...placed.map((q) => Math.hypot(q.x - p.x, (q.y - p.y) * 1.6)));
          if (d > bestD) { best = p; bestD = d; }
          if (d >= minD) break;
        }
        a.x = a.tx = best.x;
        a.y = a.ty = best.y;
        placed.push(best);
      }
    }

    loop(now) {
      if (!this.running) return;
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;

      for (const a of this.actors) a.update(dt, this.bounds, this.size);
      this.separate();
      for (const a of this.actors) a.render(this.size);

      const gone = this.actors.filter((a) => a.gone);
      if (gone.length) {
        gone.forEach((a) => a.el.remove());
        this.actors = this.actors.filter((a) => !a.gone);
        if (this.actors.length === 0) {
          this.finish();
          return;
        }
        if (!this.actors.some((a) => a.leaving)) this.nextTarget();
      }

      if (this.target && now > this.hintAt) this.target.el.classList.add('hint');
      this.raf = requestAnimationFrame(this.loop);
    }

    // Gently push overlapping dinos apart so each one stays easy to tap.
    separate() {
      const minD = this.size.w * 0.8;
      const list = this.actors.filter((a) => !a.leaving);
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const p = list[i], q = list[j];
          const dx = q.x - p.x;
          const dy = (q.y - p.y) * 1.6;
          const d = Math.hypot(dx, dy) || 0.01;
          if (d < minD) {
            const push = (minD - d) * 0.08;
            const ux = dx / d, uy = dy / d / 1.6;
            p.x -= ux * push; p.y -= uy * push;
            q.x += ux * push; q.y += uy * push;
          }
        }
      }
      const b = this.bounds;
      for (const a of list) {
        a.x = clamp(a.x, b.minX, b.maxX);
        a.y = clamp(a.y, b.minY, b.maxY);
      }
    }

    nextTarget() {
      const left = this.actors.filter((a) => !a.leaving);
      if (!left.length) return;
      this.target = left[Math.floor(Math.random() * left.length)];
      this.misses = 0;
      this.hintAt = performance.now() + HINT_DELAY_MS;
      this.setCard(this.target.dino, 'Find me!');
      this.announce();
    }

    announce() {
      DM.Sound.speak(`Find the ${this.target.dino.name}!`);
    }

    setCard(dino, label) {
      this.card.classList.remove('pop-in', 'wiggle', 'yay');
      void this.card.offsetWidth;
      this.label.textContent = label;
      if (dino) {
        this.pic.innerHTML = DM.dinoSVG(dino);
        this.nameEl.textContent = dino.name;
        this.card.classList.add('pop-in');
      } else {
        this.pic.innerHTML = '<div class="card-placeholder">?</div>';
        this.nameEl.textContent = ' ';
      }
    }

    tap(actor) {
      if (!this.running || actor.leaving) return;

      if (!this.target) {
        actor.react('hop');
        DM.Sound.play('hop');
        return;
      }

      if (actor === this.target) {
        this.target = null;
        this.found++;
        actor.leave(this.bounds, this.size);
        this.burst(actor);
        this.renderProgress();
        DM.Sound.play('correct');
        this.card.classList.remove('pop-in', 'wiggle');
        void this.card.offsetWidth;
        this.card.classList.add('yay');
        this.label.textContent = 'You found me!';
      } else {
        actor.react('shake');
        DM.Sound.play('wrong');
        this.card.classList.remove('pop-in', 'wiggle');
        void this.card.offsetWidth;
        this.card.classList.add('wiggle');
        if (++this.misses >= MISSES_BEFORE_HINT) this.target.el.classList.add('hint');
      }
    }

    burst(actor) {
      const el = document.createElement('div');
      el.className = 'burst';
      el.style.left = `${actor.x}px`;
      el.style.top = `${actor.y - this.size.h * 0.6}px`;
      const n = 10;
      for (let i = 0; i < n; i++) {
        const ang = (i / n) * Math.PI * 2;
        const dist = this.size.w * rand(0.55, 0.85);
        const s = document.createElement('span');
        s.textContent = i % 2 ? '★' : '✦';
        s.style.setProperty('--dx', `${Math.cos(ang) * dist}px`);
        s.style.setProperty('--dy', `${Math.sin(ang) * dist}px`);
        s.style.color = ['#ffd23f', '#ff7aa8', '#6ec6ff', '#b18cff'][i % 4];
        el.appendChild(s);
      }
      this.field.appendChild(el);
      this.later(() => el.remove(), 900);
    }

    renderProgress() {
      let html = '';
      for (let i = 0; i < this.total; i++) {
        html += `<span class="pip${i < this.found ? ' on' : ''}${i === this.found - 1 ? ' fresh' : ''}"></span>`;
      }
      this.progress.innerHTML = html;
      this.progress.setAttribute('aria-label', `${this.found} of ${this.total} dinos found`);
    }

    finish() {
      this.running = false;
      cancelAnimationFrame(this.raf);
      this.onWin(this.total);
    }
  }

  DM.Game = Game;
})(window.DinoMatch = window.DinoMatch || {});
