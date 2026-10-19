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
  const STAR_CHANCE = 0.33; // chance a Dino-Star floats across the sky in a round
  const STAR_DELAY = [4, 14]; // seconds into the round before it shows up
  const STAR_CROSS_TIME = 11; // seconds to float from one side to the other

  // A speech bubble ("WOW!") that rides along with a dino or star.
  function say(el, text) {
    const b = document.createElement('div');
    b.className = 'say';
    b.textContent = text;
    el.appendChild(b);
  }

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

  // A Dino-Star bobbing across the sky on a wavy path. glow: true if it isn't
  // in the collection yet. Once tapped it spins, then zooms up and away.
  class FlyingStar {
    constructor(star, game, glow) {
      this.star = star;
      this.game = game;
      this.glow = glow;
      this.caught = false;
      this.gone = false;
      this.t = 0;
      const b = game.bounds;
      this.s = game.size.w * 0.75;
      this.dir = Math.random() < 0.5 ? 1 : -1;
      this.x = this.dir > 0 ? -this.s : b.W + this.s;
      this.vx = (this.dir * (b.W + this.s * 2)) / STAR_CROSS_TIME;
      // A random height in the sky, wobbling up and down around it.
      const top = this.s * 0.6;
      this.baseY = rand(top, Math.max(top, b.H * game.location.horizon - this.s * 0.1));
      this.amp = this.s * 0.28;
      this.period = rand(2.4, 3.4);
      this.phase = rand(0, Math.PI * 2);
      this.y = this.baseY;

      const el = document.createElement('div');
      el.className = 'dstar' + (glow ? ' star-glow' : '');
      el.style.width = `${this.s}px`;
      el.style.setProperty('--star', star.color);
      el.style.setProperty('--blink-delay', `${-rand(0, 4).toFixed(2)}s`);
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', star.fullName);
      el.innerHTML = `<div class="dstar-body"><div class="dstar-spin">${DM.starSVG(star)}</div></div>` +
        (glow ? '<div class="gold-sparkles"><i></i><i></i><i></i><i></i></div>' : '');
      el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        game.tapStar(this);
      });
      this.el = el;
      this.body = el.querySelector('.dstar-body');
    }

    catch() {
      this.caught = true;
      this.caughtT = 0;
      this.el.classList.add('caught');
    }

    update(dt) {
      this.t += dt;
      if (this.caught) {
        // Spin in place for a moment, then zoom up and off the top.
        this.caughtT += dt;
        if (this.caughtT > 0.9) this.y -= this.s * 6 * (this.caughtT - 0.9) * dt * 4;
        if (this.y < -this.s * 2) this.gone = true;
        return;
      }
      this.x += this.vx * dt;
      this.y = Math.max(this.s * 0.5, this.baseY + this.amp * Math.sin(this.phase + (this.t * Math.PI * 2) / this.period));
      const W = this.game.bounds.W;
      if (this.x < -this.s * 1.5 || this.x > W + this.s * 1.5) this.gone = true;
    }

    render() {
      this.el.style.transform = `translate3d(${(this.x - this.s / 2).toFixed(1)}px, ${(this.y - this.s / 2).toFixed(1)}px, 0)`;
      if (!this.caught) this.body.style.transform = `rotate(${(12 * Math.sin(this.phase + (this.t * Math.PI * 2) / this.period * 0.7)).toFixed(1)}deg)`;
    }
  }

  class Game {
    /**
     * @param {object} opts
     *   field, card, pic, label, nameEl, progress: DOM elements
     *   onWin(roundSize): called once every dino has been found
     *   isGoldFound(id): is this golden dino already in the collection?
     *   onGoldFound(dino): a golden dino was found for the first time
     *   isStarFound(id): is this Dino-Star already in the collection?
     *   onStarCaught(star): a Dino-Star was tapped (new or not)
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
      this.starChance = STAR_CHANCE;
      this.star = null;
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
      if (Math.random() < this.starChance) this.later(() => this.launchStar(), rand(STAR_DELAY[0], STAR_DELAY[1]) * 1000);
    }

    // ---- Dino-Stars ----

    launchStar() {
      if (!this.running || this.star) return;
      const star = DM.STARS[Math.floor(Math.random() * DM.STARS.length)];
      this.star = new FlyingStar(star, this, !this.isStarFound(star.id));
      this.star.render();
      this.field.appendChild(this.star.el);
    }

    tapStar(fs) {
      if (!this.running || this.paused || fs.caught) return;
      fs.catch();
      this.burst(fs.x, fs.y);
      this.onStarCaught(fs.star);
      this.treasure(fs.el, fs.glow, fs.star.fullName);
    }

    // Shared "you found something special" moment for golden dinos and
    // Dino-Stars: NEW! the first time (plus a banner), WOW! after that.
    treasure(el, isNew, name) {
      say(el, isNew ? 'NEW!' : 'WOW!');
      this.later(() => DM.Sound.play('golden'), 250);
      if (isNew) {
        this.goldBanner(`🌟 ${name} collected!`);
        DM.Sound.speak(`Wow! You found ${/^[aeiou]/i.test(name) ? 'an' : 'a'} ${name}!`);
      } else {
        DM.Sound.speak('Wow!');
      }
    }

    // Freeze the round (used while the All Sounds menu is open).
    pause() {
      if (!this.running || this.paused) return;
      this.paused = true;
      this.pausedAt = performance.now();
      cancelAnimationFrame(this.raf);
      this.field.classList.add('paused');
    }

    resume() {
      if (!this.paused) return;
      this.paused = false;
      this.field.classList.remove('paused');
      if (!this.running) return;
      const now = performance.now();
      this.hintAt += now - this.pausedAt; // don't count paused time towards the hint
      this.last = now;
      this.raf = requestAnimationFrame(this.loop);
    }

    stop() {
      this.paused = false;
      this.field.classList.remove('paused');
      this.running = false;
      cancelAnimationFrame(this.raf);
      this.timers.forEach(clearTimeout);
      this.timers = [];
      this.actors.forEach((a) => a.el.remove());
      this.actors = [];
      this.target = null;
      this.star = null;
      this.field.querySelectorAll('.prop, .fog, .loc-banner, .dstar').forEach((el) => el.remove());
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
      if (this.star) {
        this.star.update(dt);
        this.star.render();
        if (this.star.gone) { this.star.el.remove(); this.star = null; }
      }

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
      if (!this.running || this.paused || actor.leaving) return;

      if (!this.target) {
        actor.react('hop');
        DM.Sound.play('hop');
        return;
      }

      if (actor === this.target) {
        this.target = null;
        this.found++;
        actor.leave(this.bounds, this.size);
        this.burst(actor.x, actor.y - this.size.h * 0.6);
        this.renderProgress();
        DM.Sound.play('correct');
        this.card.classList.remove('pop-in', 'wiggle');
        void this.card.offsetWidth;
        this.card.classList.add('yay');
        this.label.textContent = 'You found me!';
        if (actor.gold) {
          // First time finding this golden dino: add it to the collection.
          if (actor.gold === 'glow') this.onGoldFound(actor.dino);
          this.treasure(actor.el, actor.gold === 'glow', `Golden ${actor.dino.name}`);
        }
      } else {
        actor.react('shake');
        DM.Sound.play('miss');
        this.card.classList.remove('pop-in', 'wiggle');
        void this.card.offsetWidth;
        this.card.classList.add('wiggle');
        if (++this.misses >= MISSES_BEFORE_HINT) this.target.el.classList.add('hint');
      }
    }

    burst(x, y) {
      const el = document.createElement('div');
      el.className = 'burst';
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
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
