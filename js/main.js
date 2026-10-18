/*
 * App shell: screens, main menu, win screen and the saved "games won" count.
 */
(function (DM) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const save = DM.Save.load();
  DM.Sound.setEnabled(save.soundOn);

  // Unlock audio on the first touch anywhere (browser autoplay rules).
  document.addEventListener('pointerdown', () => DM.Sound.unlock(), { capture: true });

  // ---- Logo: one bouncy, colourful span per letter ----
  const LOGO_COLORS = ['#7ed957', '#ffc23d', '#ff7aa8', '#6ec6ff', '#b18cff', '#ff7663'];
  const logo = $('logo');
  logo.innerHTML = [...logo.textContent]
    .map((ch, i) => `<span style="--i:${i};--c:${LOGO_COLORS[i % LOGO_COLORS.length]}">${ch}</span>`)
    .join('');

  // ---- Scenes ----
  DM.buildScene($('menu-scene'));

  // ---- Menu parade of dinos walking along the bottom ----
  function buildParade() {
    const parade = $('parade');
    const picks = DM.DINOS.slice().sort(() => Math.random() - 0.5).slice(0, 5);
    parade.innerHTML = picks.map((d, i) => {
      const dur = 16 + Math.random() * 8;
      return `<div class="parader walking${d.flies ? ' flier' : ''}" style="--d:${dur.toFixed(1)}s;--delay:${(-(i / picks.length) * dur).toFixed(1)}s;--b:${(i % 2) * 6}%;--blink-delay:${-i}s">${DM.dinoSVG(d)}</div>`;
    }).join('');
  }
  buildParade();

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
    onWin: handleWin,
  });

  function startGame() {
    hideWin();
    show('screen-game');
    // Wait a frame so the field has its real size before placing dinos.
    requestAnimationFrame(() => game.start());
  }

  function goMenu() {
    game.stop();
    hideWin();
    show('screen-menu');
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

  const soundBtn = $('btn-sound');
  function renderSound() {
    soundBtn.textContent = save.soundOn ? '🔊' : '🔇';
    soundBtn.setAttribute('aria-pressed', String(save.soundOn));
    soundBtn.setAttribute('aria-label', save.soundOn ? 'Sound on' : 'Sound off');
  }
  renderSound();
  soundBtn.addEventListener('click', () => {
    save.soundOn = !save.soundOn;
    DM.Sound.setEnabled(save.soundOn);
    DM.Save.write(save);
    renderSound();
    DM.Sound.play('tap');
  });

  DM.DadLock.init(save);
  DM.Collections.init(save);

  // Expose for debugging / future features.
  DM.app = { game, save, startGame, goMenu };
})(window.DinoMatch = window.DinoMatch || {});
