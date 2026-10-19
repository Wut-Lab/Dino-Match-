/*
 * App shell: screens, main menu, win screen and the saved "games won" count.
 */
(function (DM) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const save = DM.Save.load();

  // Menu music: a random tune, which starts on the first touch anywhere
  // (browsers don't allow sound before that).
  DM.Music.start();
  document.addEventListener('pointerdown', () => {
    DM.Sound.unlock();
    DM.Music.refresh();
  }, { capture: true });

  // ---- Logo: one bouncy, colourful span per letter ----
  const LOGO_COLORS = ['#7ed957', '#ffc23d', '#ff7aa8', '#6ec6ff', '#b18cff', '#ff7663'];
  const logo = $('logo');
  logo.innerHTML = [...logo.textContent]
    .map((ch, i) => `<span style="--i:${i};--c:${LOGO_COLORS[i % LOGO_COLORS.length]}">${ch}</span>`)
    .join('');

  // ---- Menu background: a random location, its huts and a random herd of
  // hopping dinos, all picked afresh every time the menu opens ----
  function buildMenu() {
    const loc = DM.LOCATIONS[Math.floor(Math.random() * DM.LOCATIONS.length)];
    DM.buildScene($('menu-scene'), loc.id);
    DM.MenuDinos.start($('menu-dinos'), loc);
  }
  buildMenu();

  // ---- Screens ----
  function show(id) {
    document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === id));
  }

  function renderCount(bump) {
    const el = $('games-count');
    el.textContent = save.gamesCompleted;
    if (bump) {
      el.classList.remove('bump');
      void el.offsetWidth;
      el.classList.add('bump');
    }
  }
  renderCount(false);

  let countChanged = false;

  const game = new DM.Game({
    field: $('field'),
    scene: $('field-scene'),
    card: $('target-card'),
    pic: $('target-pic'),
    label: $('target-label'),
    nameEl: $('target-name'),
    progress: $('progress'),
    isGoldFound: (id) => !!save.golden[id],
    onGoldCaught: (dino) => {
      save.golden[dino.id] = true;
      save.goldCaught += 1;
      DM.Save.write(save);
    },
    isStarFound: (id) => !!save.stars[id],
    onStarCaught: (star) => {
      save.stars[star.id] = true;
      save.starsCaught += 1;
      DM.Save.write(save);
    },
    onWin: handleWin,
  });

  function startGame() {
    hideWin();
    DM.MenuDinos.stop();
    show('screen-game');
    // Wait a frame so the field has its real size before placing dinos.
    requestAnimationFrame(() => game.start());
    DM.Music.start();
  }

  function goMenu() {
    game.stop();
    DM.Music.start();
    hideWin();
    show('screen-menu');
    buildMenu();
    renderCount(countChanged);
    countChanged = false;
  }

  function handleWin(roundSize) {
    save.gamesCompleted += 1;
    save.dinosFound += roundSize;
    DM.Save.write(save);
    countChanged = true;

    $('win-count').textContent = save.gamesCompleted;
    $('win').classList.remove('hidden');
    launchConfetti();
    DM.Music.stop();
    DM.Sound.play('win');
    DM.Sound.speak('Hooray! You found all the dinos!');
  }

  function hideWin() {
    $('win').classList.add('hidden');
    $('confetti').innerHTML = '';
  }

  function launchConfetti() {
    const colors = ['#ff7aa8', '#ffd23f', '#7ed957', '#6ec6ff', '#b18cff', '#ff7663'];
    let html = '';
    for (let i = 0; i < 70; i++) {
      html += `<i style="left:${Math.random() * 100}%;background:${colors[i % colors.length]};` +
        `animation-delay:${(Math.random() * 1.2).toFixed(2)}s;animation-duration:${(2.2 + Math.random() * 1.8).toFixed(2)}s;` +
        `--r:${Math.round(Math.random() * 720 - 360)}deg;--s:${(0.6 + Math.random() * 0.8).toFixed(2)}"></i>`;
    }
    $('confetti').innerHTML = html;
  }

  // ---- Credits ----
  $('credits-list').innerHTML = DM.DINOS.map((d) => {
    const c = d.credit;
    const note = c.note ? ` <span class="credit-note">(${c.note})</span>` : '';
    return `<li><div class="credit-pic">${DM.dinoSVG(d, { fit: true })}</div>` +
      `<div><strong>${d.name}</strong><br>by <a href="${c.url}" target="_blank" rel="noopener">${c.artist}</a>${note}</div></li>`;
  }).join('');

  function showCredits(on) {
    $('credits').classList.toggle('hidden', !on);
    document.body.classList.toggle('panel-open', on);
    if (on) $('btn-credits-close').focus();
  }
  $('credits').addEventListener('click', (e) => { if (e.target.id === 'credits') showCredits(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') showCredits(false); });

  // ---- Buttons ----
  const click = (id, fn) => $(id).addEventListener('click', () => { DM.Sound.play('tap'); fn(); });
  click('btn-play', startGame);
  click('btn-again', startGame);
  click('btn-menu', goMenu);
  click('btn-home', goMenu);
  click('btn-credits', () => showCredits(true));
  click('btn-credits-close', () => showCredits(false));
  click('btn-credits-back', () => showCredits(false));

  // The game holds still while the All Sounds menu is open.
  DM.SoundMenu.init(save, {
    onOpen: () => game.pause(),
    onClose: () => game.resume(),
  });
  DM.DadLock.init(save);
  DM.Collections.init(save);

  // Expose for debugging / future features.
  DM.app = { game, save, startGame, goMenu };
})(window.DinoMatch = window.DinoMatch || {});
