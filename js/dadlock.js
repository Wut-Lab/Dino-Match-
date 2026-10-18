/*
 * Full screen + "Dad Lock".
 *
 * Browsers always let people leave full screen (Esc, swipe gestures, the tab
 * switcher), so a page can't truly trap anyone there. What the Dad Lock does:
 *   - the game's own exit button asks for a grown-up PIN,
 *   - if full screen is left any other way, a lock screen covers the game
 *     until a grown-up enters the PIN (kids can only go back to full screen),
 *   - on browsers that support it (desktop Chrome/Edge), Esc must be held down,
 *   - the lock is remembered across page reloads.
 */
(function (DM) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const root = document.documentElement;
  const PIN_LENGTH = 4;
  const MAX_TRIES = 3;      // wrong PINs before a cool-down
  const COOLDOWN_MS = 10000;

  const fsElement = () => document.fullscreenElement || document.webkitFullscreenElement;
  const fsSupported = !!(root.requestFullscreen || root.webkitRequestFullscreen) &&
    (document.fullscreenEnabled || document.webkitFullscreenEnabled);

  let save = null;
  let pad = null; // current keypad session: { mode, entry, onDone, ... }
  let wrong = 0;
  let coolUntil = 0;

  // ---- Full screen ----

  function enterFullscreen() {
    const req = root.requestFullscreen || root.webkitRequestFullscreen;
    try {
      return Promise.resolve(req.call(root, { navigationUI: 'hide' })).then(() => {
        if (save.dadLock && navigator.keyboard && navigator.keyboard.lock) {
          navigator.keyboard.lock(['Escape']).catch(() => {});
        }
      });
    } catch (e) {
      return Promise.reject(e);
    }
  }

  function exitFullscreen() {
    if (navigator.keyboard && navigator.keyboard.unlock) navigator.keyboard.unlock();
    if (!fsElement()) return;
    (document.exitFullscreen || document.webkitExitFullscreen).call(document);
  }

  // ---- PIN storage (hashed when the browser allows it) ----

  async function hashPin(pin) {
    if (window.crypto && crypto.subtle) {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('dino-match:' + pin));
      return 'h:' + [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
    }
    return 'p:' + pin;
  }

  async function pinMatches(pin) {
    if (!save.pinHash) return false;
    if (save.pinHash.startsWith('p:')) return save.pinHash === 'p:' + pin;
    return save.pinHash === await hashPin(pin);
  }

  // ---- Lock state ----

  function setLocked(on) {
    save.dadLock = on;
    DM.Save.write(save);
    document.body.classList.toggle('dad-locked', on);
    renderButton();
  }

  function lockAndEnter() {
    setLocked(true);
    enterFullscreen().catch(() => setLocked(false));
  }

  function unlock() {
    setLocked(false);
    exitFullscreen();
    closePad();
    hideLockScreen();
  }

  // ---- Fullscreen button ----

  const ICON_ENTER = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>';
  const ICON_EXIT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>';

  function renderButton() {
    const btn = $('btn-fullscreen');
    const full = !!fsElement();
    if (save.dadLock) {
      btn.innerHTML = '🔒';
      btn.setAttribute('aria-label', 'Dad Lock is on. Grown-ups: tap to unlock');
    } else {
      btn.innerHTML = full ? ICON_EXIT : ICON_ENTER;
      btn.setAttribute('aria-label', full ? 'Leave full screen' : 'Full screen');
    }
  }

  function onButton() {
    if (save.dadLock) {
      openPad('unlock', { onDone: unlock });
    } else if (fsElement()) {
      exitFullscreen();
    } else {
      $('fs-menu').classList.remove('hidden');
    }
  }

  // ---- Lock screen (shown if full screen is left while locked) ----

  function showLockScreen() {
    openPad('unlock', { onDone: unlock, lockScreen: true });
  }

  function hideLockScreen() {
    $('pad').classList.remove('lock-screen');
  }

  function onFullscreenChange() {
    renderButton();
    if (fsElement()) {
      if (pad && pad.lockScreen) closePad();
    } else if (save.dadLock) {
      showLockScreen();
    }
  }

  // ---- Keypad ----

  function openPad(mode, opts = {}) {
    pad = { mode, entry: '', first: null, ...opts };
    if (mode === 'forgot') {
      pad.a = 6 + Math.floor(Math.random() * 4);
      pad.b = 6 + Math.floor(Math.random() * 4);
    }
    $('pad').classList.remove('hidden');
    $('pad').classList.toggle('lock-screen', !!pad.lockScreen);
    renderPad();
  }

  function closePad() {
    pad = null;
    $('pad').classList.add('hidden');
    $('pad').classList.remove('lock-screen');
  }

  function renderPad(message) {
    const titles = {
      set: 'Set a grown-up PIN',
      unlock: 'Grown-ups only',
      forgot: 'Grown-up question',
    };
    const prompts = {
      set: pad.first ? 'Type the same PIN again.' : `Choose a ${PIN_LENGTH}-digit PIN. You'll need it to leave full screen.`,
      unlock: pad.lockScreen ? 'Enter the PIN to unlock, or go back to full screen.' : 'Enter the PIN to turn off Dad Lock.',
      forgot: `What is ${pad.a} × ${pad.b}? Answering turns Dad Lock off and clears the PIN.`,
    };
    $('pad-title').textContent = titles[pad.mode];
    $('pad-msg').textContent = message || prompts[pad.mode];
    $('pad-msg').classList.toggle('pad-error', !!message);

    const dots = $('pad-dots');
    if (pad.mode === 'forgot') {
      dots.innerHTML = `<span class="pad-answer">${pad.entry || '?'}</span>`;
    } else {
      dots.innerHTML = Array.from({ length: PIN_LENGTH }, (_, i) => `<i class="${i < pad.entry.length ? 'on' : ''}"></i>`).join('');
    }
    $('pad-resume').hidden = !pad.lockScreen;
    $('pad-cancel').hidden = !!pad.lockScreen;
    $('pad-forgot').hidden = pad.mode !== 'unlock' || !save.pinHash;
  }

  function press(key) {
    if (!pad) return;
    if (Date.now() < coolUntil) {
      renderPad(`Too many tries. Wait ${Math.ceil((coolUntil - Date.now()) / 1000)} seconds.`);
      return;
    }
    const max = pad.mode === 'forgot' ? 3 : PIN_LENGTH;
    if (key === 'back') pad.entry = pad.entry.slice(0, -1);
    else if (key === 'ok') return submit();
    else if (pad.entry.length < max) pad.entry += key;
    renderPad();
    if (pad.mode !== 'forgot' && pad.entry.length === PIN_LENGTH) submit();
  }

  function fail(message) {
    pad.entry = '';
    if (++wrong >= MAX_TRIES) {
      wrong = 0;
      coolUntil = Date.now() + COOLDOWN_MS;
      message = `Too many tries. Wait ${COOLDOWN_MS / 1000} seconds.`;
    }
    $('pad').querySelector('.pad-card').classList.remove('wiggle');
    void $('pad').offsetWidth;
    $('pad').querySelector('.pad-card').classList.add('wiggle');
    DM.Sound.play('wrong');
    renderPad(message);
  }

  function submit() {
    const p = pad;
    if (p.mode === 'set') {
      if (p.entry.length < PIN_LENGTH) return renderPad(`The PIN needs ${PIN_LENGTH} digits.`);
      if (!p.first) {
        p.first = p.entry;
        p.entry = '';
        return renderPad();
      }
      if (p.entry !== p.first) {
        p.first = null;
        p.entry = '';
        return renderPad("Those didn't match. Let's start again.");
      }
      const pin = p.entry;
      closePad();
      // Must run inside the tap that finished the PIN, or the browser blocks full screen.
      lockAndEnter();
      hashPin(pin).then((h) => { save.pinHash = h; DM.Save.write(save); });
      return;
    }

    if (p.mode === 'forgot') {
      if (Number(p.entry) === p.a * p.b) {
        save.pinHash = null;
        unlock();
      } else {
        fail('Not quite. Try again.');
      }
      return;
    }

    // unlock
    if (p.entry.length < PIN_LENGTH) return;
    const entry = p.entry;
    pinMatches(entry).then((ok) => {
      if (pad !== p) return;
      if (ok) { wrong = 0; p.onDone(); } else fail('Wrong PIN. Try again.');
    });
  }

  function buildKeys() {
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'back', '0', 'ok'];
    const labels = { back: '⌫', ok: '✓' };
    const aria = { back: 'Delete', ok: 'Enter' };
    $('pad-keys').innerHTML = keys.map((k) =>
      `<button class="pad-key${labels[k] ? ' pad-key-fn' : ''}" data-key="${k}"${aria[k] ? ` aria-label="${aria[k]}"` : ''}>${labels[k] || k}</button>`).join('');
    $('pad-keys').addEventListener('click', (e) => {
      const b = e.target.closest('.pad-key');
      if (b) { DM.Sound.play('tap'); press(b.dataset.key); }
    });
    document.addEventListener('keydown', (e) => {
      if (!pad) return;
      if (/^[0-9]$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') press('back');
      else if (e.key === 'Enter') press('ok');
    });
  }

  // ---- Setup ----

  DM.DadLock = {
    init(saveData) {
      save = saveData;
      if (!fsSupported) {
        // e.g. iPhone Safari: no full screen for web pages, so no lock either.
        $('btn-fullscreen').hidden = true;
        if (save.dadLock) setLocked(false);
        return;
      }
      buildKeys();
      document.body.classList.toggle('dad-locked', !!save.dadLock);
      renderButton();

      $('btn-fullscreen').addEventListener('click', () => { DM.Sound.play('tap'); onButton(); });
      $('fs-plain').addEventListener('click', () => {
        $('fs-menu').classList.add('hidden');
        enterFullscreen().catch(() => {});
      });
      $('fs-locked').addEventListener('click', () => {
        $('fs-menu').classList.add('hidden');
        if (save.pinHash) lockAndEnter();
        else openPad('set');
      });
      $('fs-cancel').addEventListener('click', () => $('fs-menu').classList.add('hidden'));
      $('pad-cancel').addEventListener('click', closePad);
      $('pad-resume').addEventListener('click', () => enterFullscreen().catch(() => {}));
      $('pad-forgot').addEventListener('click', () => openPad('forgot', { onDone: unlock, lockScreen: pad && pad.lockScreen }));

      document.addEventListener('fullscreenchange', onFullscreenChange);
      document.addEventListener('webkitfullscreenchange', onFullscreenChange);

      // Locked when the page loaded (e.g. after a reload): start on the lock screen.
      if (save.dadLock && !fsElement()) showLockScreen();
    },
  };
})(window.DinoMatch = window.DinoMatch || {});
