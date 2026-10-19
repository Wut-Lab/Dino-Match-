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

  const MIN_DINOS = 8; // dinos per round, picked at random from the whole roster
  const MAX_DINOS = 8;
  const HINT_DELAY_MS = 9000; // show a hint if the player is stuck this long
  const MISSES_BEFORE_HINT = 2;
  const CHEER_TIME = 0.65; // seconds the found dino celebrates before leaving
  const EXIT_SPEED = 2.8; // dino-widths per second when walking off screen
  const GOLDEN_CHANCE = 0.33; // chance a round has one golden dino in it

  class Actor {
    // gold: null (normal), 'glow' (golden, not collected yet) or 'plain'
    // (golden, already in the collection: no glow).
    constructor(dino, game, gold = null) {
      this.dino = dino;
      this.game = game;
      this.gold = gold;
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
      el.className = 'actor' + (dino.flies ? ' flier' : '') + (gold ? ' golden' : '') + (gold === 'glow' ? ' gold-glow' : '');
      el.style.setProperty('--blink-delay', `${-rand(0, 4).toFixed(2)}s`);
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', gold ? `Golden ${dino.name}` : dino.name);
      el.innerHTML =
        `<div class="actor-shadow"></div>` +
        `<div class="actor-body"><div class="actor-flip">${DM.dinoSVG(dino, { gold: !!gold })}</div>` +
        (gold === 'glow' ? '<div class="gold-sparkles"><i></i><i></i><i></i><i></i></div>' : '') +
        `</div>`;
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

    // A speech bubble ("WOW!") that rides along with the dino.
    say(text) {
      const b = document.createElement('div');
      b.className = 'say';
      b.textContent = text;
      this.el.appendChild(b);
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

    // Try a few random spots and head for the one with the most elbow room,
    // so dinos spread out instead of piling up (easier to tap). Spots hidden
    // behind trees are skipped: dinos may walk behind a tree but not stop there.
    pickTarget(b, others) {
      let best = -1;
      for (let i = 0, tries = 0; i < 8 && tries < 40; tries++) {
        const x = rand(b.minX, b.maxX);
        const y = rand(b.minY, b.maxY);
        if (this.game.hidden(x, y)) continue;
        i++;
        let room = Infinity;
        for (const o of others) {
          if (o === this || o.leaving) continue;
          room = Math.min(room, Math.hypot(o.x - x, (o.y - y) * 1.6), Math.hypot(o.tx - x, (o.ty - y) * 1.6));
        }
        if (room > best) { best = room; this.tx = x; this.ty = y; }
      }
    }

    update(dt, b, size, others) {
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
        // Nudged behind a tree while resting? Move on right away.
        if (this.game.hidden(this.x, this.y)) this.wait = 0;
        this.wait -= dt;
        if (this.wait <= 0) {
          this.pickTarget(b, others);
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
     *   isGoldFound(id): is this golden dino already in the collection?
     *   onGoldFound(dino): a golden dino was found for the first time
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
      this.trees = [];
      this.goldenChance = GOLDEN_CHANCE;
      this.loop = this.loop.bind(this);
      window.addEventListener('resize', () => this.running && this.measure());
      this.card.addEventListener('pointerdown', () => this.target && this.announce());
    }

    measure() {
      const W = this.field.clientWidth;
      const H = this.field.clientHeight;
      const w = clamp(Math.min(W / 4.4, H / 3), 64, 190);
      const h = w;
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
      this.layoutTrees();
    }

    // Pick a location for this round (never the same one twice in a row).
    chooseLocation() {
      const options = DM.LOCATIONS.filter((l) => l !== this.location);
      this.location = options[Math.floor(Math.random() * options.length)] || DM.LOCATIONS[0];
      DM.buildScene(this.scene, this.location.id);
    }

    // ---- Trees (forest) ----

    // Two kinds of trees:
    //  - a dense back row along the far edge of the walking area, where no dino
    //    can get behind them (looks like a forest, hides nobody);
    //  - a few trees out among the dinos, which they can walk behind. These are
    //    capped so hiding spots cover at most `cfg.maxHidden` of the floor.
    makeTrees() {
      this.trees = [];
      const cfg = this.location.trees;
      if (!cfg) return;
      const b = this.bounds;
      const w = this.size.w;
      const add = (fx, fy, scale, i) => {
        const el = document.createElement('div');
        el.className = 'prop tree';
        el.innerHTML = `<div class="prop-shadow"></div>${DM.pineSVG()}`;
        el.style.setProperty('--pine', ['#3fae5f', '#37a05a', '#4bb867'][i % 3]);
        this.field.appendChild(el);
        this.trees.push({ el, fx, fy, scale });
      };

      const back = Math.max(3, Math.round(b.W / (w * cfg.backSpacing)));
      for (let i = 0; i < back; i++) {
        add((i + 0.5 + rand(-0.3, 0.3)) / back, rand(-0.12, 0), rand(0.75, 1), i);
      }

      // Hiding area of one tree ~ its width x 75% of its height (see hidden()).
      const avgScale = 0.95;
      const perTree = (w * 1.05 * avgScale) * (w * 1.05 * avgScale * 1.7 * 0.75);
      const floor = (b.maxX - b.minX + w) * (b.maxY - b.minY);
      const mid = clamp(Math.floor((floor * cfg.maxHidden) / perTree), 1, cfg.maxMid);
      for (let i = 0; i < mid; i++) {
        add((i + 0.5 + rand(-0.2, 0.2)) / mid, i % 2 ? rand(0.6, 1) : rand(0.3, 0.6), rand(0.85, 1.05), i + 1);
      }
      this.layoutTrees();
    }

    layoutTrees() {
      const b = this.bounds;
      for (const t of this.trees) {
        t.w = this.size.w * 1.05 * t.scale;
        t.h = t.w * 1.7;
        t.x = t.fx * b.W;
        t.y = b.minY + t.fy * (b.maxY - b.minY);
        t.el.style.width = `${t.w}px`;
        t.el.style.transform = `translate3d(${(t.x - t.w / 2).toFixed(1)}px, ${(t.y - t.h).toFixed(1)}px, 0)`;
        t.el.style.zIndex = 10 + Math.round(t.y);
      }
    }

    // Would a dino standing with its feet at (x, y) be mostly hidden by a tree?
    hidden(x, y) {
      for (const t of this.trees) {
        if (y < t.y + 2 && y > t.y - t.h * 0.75 && Math.abs(x - t.x) < t.w * 0.5) return true;
      }
      return false;
    }

    // ---- Fog (volcano) ----

    scheduleFog(first) {
      const f = this.location.fog;
      if (!f) return;
      const [lo, hi] = first ? f.first : f.every;
      this.later(() => {
        if (!this.running) return;
        this.rollFog();
        this.scheduleFog(false);
      }, rand(lo, hi) * 1000);
    }

    rollFog() {
      const { W, H } = this.bounds;
      const f = this.location.fog;
      const el = document.createElement('div');
      el.className = 'fog';
      const width = W * 1.6;
      const height = H * rand(0.45, 0.6);
      el.style.width = `${width}px`;
      el.style.height = `${height}px`;
      el.style.top = `${rand(H * this.location.horizon * 0.8, H - height)}px`;
      el.style.setProperty('--from', `${-width}px`);
      el.style.setProperty('--to', `${W}px`);
      el.style.animationDuration = `${rand(f.duration[0], f.duration[1]).toFixed(1)}s`;
      let puffs = '';
      for (let i = 0; i < 14; i++) {
        puffs += `<span style="left:${rand(0, 80).toFixed(1)}%;top:${rand(0, 55).toFixed(1)}%;` +
          `width:${rand(22, 40).toFixed(1)}%;height:${rand(45, 75).toFixed(1)}%;opacity:${rand(0.55, 0.9).toFixed(2)}"></span>`;
      }
      el.innerHTML = puffs;
      el.addEventListener('animationend', () => el.remove());
      this.field.appendChild(el);
    }

    goldBanner(text) {
      const el = document.createElement('div');
      el.className = 'loc-banner gold-banner';
      el.textContent = text;
      el.addEventListener('animationend', () => el.remove());
      this.field.appendChild(el);
    }

    // ---- Round-start banner ----

    showBanner() {
      const el = document.createElement('div');
      el.className = 'loc-banner';
      el.textContent = `${this.location.emoji} ${this.location.name}`;
      el.addEventListener('animationend', () => el.remove());
      this.field.appendChild(el);
    }

    start() {
      this.stop();
      this.chooseLocation();
      this.measure();
      this.makeTrees();
      const count = randInt(MIN_DINOS, Math.min(MAX_DINOS, DM.DINOS.length));
      const picks = shuffle(DM.DINOS).slice(0, count);
      // Now and then one dino in the round is golden. If it's already in the
      // collection it still shows up golden, just without the glow.
      const goldIdx = Math.random() < this.goldenChance ? Math.floor(Math.random() * count) : -1;
      this.actors = picks.map((d, i) => {
        if (i !== goldIdx) return new Actor(d, this);
        return new Actor(d, this, this.isGoldFound(d.id) ? 'plain' : 'glow');
      });
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
      this.showBanner();
      this.scheduleFog(true);
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
      this.field.querySelectorAll('.prop, .fog, .loc-banner').forEach((el) => el.remove());
      this.trees = [];
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
          if (this.hidden(p.x, p.y) && i < 39) continue;
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

      for (const a of this.actors) a.update(dt, this.bounds, this.size, this.actors);
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
      this.setCard(this.target.dino, 'Find me!', this.target.gold);
      this.announce();
    }

    announce() {
      const t = this.target;
      DM.Sound.speak(`Find the ${t.gold ? 'golden ' : ''}${t.dino.name}!`);
    }

    setCard(dino, label, gold = null) {
      this.card.classList.remove('pop-in', 'wiggle', 'yay', 'golden', 'gold-glow');
      void this.card.offsetWidth;
      this.label.textContent = label;
      if (dino) {
        this.pic.innerHTML = DM.dinoSVG(dino, { fit: true, gold: !!gold });
        this.nameEl.textContent = gold ? `Golden ${dino.name}` : dino.name;
        if (gold) this.card.classList.add('golden');
        if (gold === 'glow') this.card.classList.add('gold-glow');
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
        if (actor.gold === 'glow') {
          // First time finding this golden dino: add it to the collection.
          actor.say('NEW!');
          this.onGoldFound(actor.dino);
          this.goldBanner(`🌟 Golden ${actor.dino.name} collected!`);
          this.later(() => DM.Sound.play('golden'), 250);
          DM.Sound.speak(`Wow! You found a golden ${actor.dino.name}!`);
        } else if (actor.gold === 'plain') {
          actor.say('WOW!');
          this.later(() => DM.Sound.play('golden'), 250);
          DM.Sound.speak('Wow!');
        }
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
