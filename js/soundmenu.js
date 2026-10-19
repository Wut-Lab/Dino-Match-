/*
 * All Sounds menu: opened by the "Sound" button at the top right. Each kind
 * of sound (see js/sound.js) gets a volume slider and a speaker button that
 * mutes it. Settings are saved as save.volume and save.mute.
 */
(function (DM) {
  'use strict';

  const $ = (id) => document.getElementById(id);

  const KINDS = [
    { id: 'voice', label: 'Voice' },
    { id: 'music', label: 'Background Music' },
    { id: 'sfx', label: 'Sound Effects' },
  ];

  DM.SoundMenu = {
    init(save, { onOpen, onClose }) {
      const menu = $('sound-menu');
      const rows = $('sound-rows');
      const S = DM.Sound;

      KINDS.forEach(({ id }) => {
        S.levels[id] = save.volume[id];
        S.muted[id] = save.mute[id];
      });

      rows.innerHTML = KINDS.map(({ id, label }) =>
        `<div class="sound-row" data-kind="${id}">` +
        `<button class="icon-btn mute-btn" data-kind="${id}"></button>` +
        `<label for="vol-${id}">${label}</label>` +
        `<input type="range" id="vol-${id}" data-kind="${id}" min="0" max="100" step="5">` +
        `</div>`).join('');

      const silent = (id) => !S.level(id);

      function render() {
        KINDS.forEach(({ id, label }) => {
          const row = rows.querySelector(`.sound-row[data-kind="${id}"]`);
          const btn = row.querySelector('.mute-btn');
          btn.textContent = silent(id) ? '🔇' : '🔊';
          btn.setAttribute('aria-pressed', String(S.muted[id]));
          btn.setAttribute('aria-label', `Mute ${label}`);
          row.querySelector('input').value = Math.round(S.levels[id] * 100);
          row.classList.toggle('muted', S.muted[id]);
        });
        $('sound-icon').textContent = KINDS.every(({ id }) => silent(id)) ? '🔇' : '🔊';
      }

      function store() {
        KINDS.forEach(({ id }) => {
          save.volume[id] = S.levels[id];
          save.mute[id] = S.muted[id];
        });
        DM.Save.write(save);
        render();
      }

      // A little sample so you can hear the new level.
      function preview(id) {
        if (id === 'voice') S.speak('Roar! Hello!');
        if (id === 'sfx') S.play('correct');
      }

      rows.addEventListener('click', (e) => {
        const btn = e.target.closest('.mute-btn');
        if (!btn) return;
        const id = btn.dataset.kind;
        S.setMuted(id, !S.muted[id]);
        store();
        if (!S.muted[id]) preview(id);
      });
      rows.addEventListener('input', (e) => {
        const id = e.target.dataset.kind;
        if (S.muted[id]) S.setMuted(id, false); // moving a slider turns that sound back on
        S.setLevel(id, e.target.value / 100);
        render();
      });
      rows.addEventListener('change', (e) => {
        store();
        preview(e.target.dataset.kind);
      });

      let open = false;
      function show(on) {
        if (on === open) return;
        open = on;
        menu.classList.toggle('hidden', !on);
        document.body.classList.toggle('sound-open', on);
        if (on) {
          onOpen();
          $('sound-done').focus();
        } else {
          onClose();
        }
      }

      $('btn-sound').addEventListener('click', () => { S.play('tap'); show(true); });
      $('sound-done').addEventListener('click', () => { S.play('tap'); show(false); });
      menu.addEventListener('click', (e) => { if (e.target === menu) show(false); });
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') show(false); });

      render();
    },
  };
})(window.DinoMatch = window.DinoMatch || {});
