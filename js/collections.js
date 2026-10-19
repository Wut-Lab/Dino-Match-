/*
 * Collections screen: a pop-up with one tab per collection.
 *
 * Each tab has a title and a render(save) that returns its contents.
 * Dino Stamps can be tapped for a fun fact.
 */
(function (DM) {
  'use strict';

  const $ = (id) => document.getElementById(id);

  // Golden Dinos: one golden version of every dino, collected by finding it in
  // a round (see GOLDEN_CHANCE in game.js). Unfound ones show as silhouettes.
  function renderGolden(save) {
    const found = DM.DINOS.filter((d) => save.golden[d.id]).length;
    const cards = DM.DINOS.map((d) => save.golden[d.id]
      ? `<div class="gold-card found"><div class="gold-pic">${DM.dinoSVG(d, { fit: true, gold: true })}</div><span>${d.name}</span></div>`
      : `<div class="gold-card"><div class="gold-pic mystery">${DM.dinoSVG(d, { fit: true })}</div><span>?</span></div>`).join('');
    return `<div class="gold-coll">` +
      `<p class="gold-count">⭐ ${found} of ${DM.DINOS.length} found</p>` +
      (found ? '' : '<p class="gold-tip">Keep playing! A shiny golden dino sometimes joins the game.</p>') +
      `<p class="coll-total gold-total">Total Golden Dinos Found: <strong>${save.goldCaught}</strong></p>` +
      `<div class="gold-grid">${cards}</div></div>`;
  }

  // Dino-Stars: 13 coloured stars that float across the sky now and then (see
  // STAR_CHANCE in game.js). Unfound ones show as silhouettes.
  function renderStars(save) {
    const found = DM.STARS.filter((s) => save.stars[s.id]).length;
    const cards = DM.STARS.map((s) => save.stars[s.id]
      ? `<div class="gold-card star-card found"><div class="gold-pic">${DM.starSVG(s)}</div><span>${s.name}</span></div>`
      : `<div class="gold-card"><div class="gold-pic mystery">${DM.starSVG(s)}</div><span>?</span></div>`).join('');
    return `<div class="gold-coll">` +
      `<p class="gold-count">🌟 ${found} of ${DM.STARS.length} found</p>` +
      (found ? '' : '<p class="gold-tip">Look up! A Dino-Star sometimes floats across the sky. Tap it to catch it.</p>') +
      `<p class="coll-total stars-total">Total Stars Collected: <strong>${save.starsCaught}</strong></p>` +
      `<div class="gold-grid">${cards}</div></div>`;
  }

  // Dino Stamps: postage stamps that float across the sky now and then (see
  // STAMP_CHANCE in game.js). Tap a found stamp to hear its fun fact.
  function renderStamps(save) {
    const found = DM.STAMPS.filter((s) => save.stamps[s.id]).length;
    const cards = DM.STAMPS.map((s) => save.stamps[s.id]
      ? `<button class="gold-card stamp-card found" data-fact="${s.id}" aria-label="${s.fullName}: fun fact"><div class="gold-pic">${DM.stampArt(s)}</div><span>${s.name}</span></button>`
      : `<div class="gold-card"><div class="gold-pic mystery">${DM.stampArt(s)}</div><span>?</span></div>`).join('');
    return `<div class="gold-coll">` +
      `<p class="gold-count">📮 ${found} of ${DM.STAMPS.length} found</p>` +
      (found ? '' : '<p class="gold-tip">Look up! A Dino Stamp sometimes floats across the sky. Tap it to catch it.</p>') +
      `<p class="coll-total stamps-total">Total Stamps Found: <strong>${save.stampsCaught}</strong></p>` +
      (found ? '<p id="stamp-fact" class="stamp-fact" aria-live="polite">Tap a stamp for a fun fact!</p>' : '') +
      `<div class="gold-grid">${cards}</div></div>`;
  }

  // Tapping a found stamp shows its fun fact and reads it aloud.
  function showFact(card) {
    const stamp = DM.stampById(card.dataset.fact);
    $('coll-panel').querySelectorAll('.stamp-card').forEach((c) => c.classList.toggle('picked', c === card));
    const box = $('stamp-fact');
    box.innerHTML = `<strong>Fun fact:</strong> ${stamp.fact}`;
    box.classList.remove('pop-in');
    void box.offsetWidth;
    box.classList.add('pop-in');
    DM.Sound.speak(stamp.fact);
  }

  const COLLECTIONS = [
    { id: 'golden', title: 'Golden Dinos', render: renderGolden },
    { id: 'stars', title: 'Dino-Stars', render: renderStars },
    { id: 'stamps', title: 'Dino Stamps', render: renderStamps },
  ];

  let save = null;
  let current = 0;

  function selectTab(i, focus) {
    current = i;
    const tabs = $('coll-tabs').querySelectorAll('[role="tab"]');
    tabs.forEach((t, k) => {
      const on = k === i;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
    });
    if (focus) tabs[i].focus();
    const c = COLLECTIONS[i];
    const panel = $('coll-panel');
    panel.setAttribute('aria-labelledby', `coll-tab-${c.id}`);
    panel.innerHTML = c.render(save);
  }

  function show(on) {
    $('collections').classList.toggle('hidden', !on);
    document.body.classList.toggle('panel-open', on);
    if (on) selectTab(current, true);
  }

  DM.Collections = {
    COLLECTIONS,
    init(saveData) {
      save = saveData;
      $('coll-tabs').innerHTML = COLLECTIONS.map((c, i) =>
        `<button role="tab" id="coll-tab-${c.id}" class="coll-tab" aria-controls="coll-panel" data-i="${i}">${c.title}</button>`).join('');

      $('coll-tabs').addEventListener('click', (e) => {
        const t = e.target.closest('[role="tab"]');
        if (t) { DM.Sound.play('tap'); selectTab(Number(t.dataset.i)); }
      });
      $('coll-panel').addEventListener('click', (e) => {
        const card = e.target.closest('[data-fact]');
        if (card) { DM.Sound.play('tap'); showFact(card); }
      });
      // Arrow keys move between tabs (standard tab behaviour).
      $('coll-tabs').addEventListener('keydown', (e) => {
        const n = COLLECTIONS.length;
        const moves = { ArrowRight: 1, ArrowLeft: -1, Home: -current, End: n - 1 - current };
        if (!(e.key in moves)) return;
        e.preventDefault();
        selectTab((current + moves[e.key] + n) % n, true);
      });

      const close = () => { DM.Sound.play('tap'); show(false); };
      $('btn-collections').addEventListener('click', () => { DM.Sound.play('tap'); show(true); });
      $('btn-coll-close').addEventListener('click', close);
      $('btn-coll-back').addEventListener('click', close);
      $('collections').addEventListener('click', (e) => { if (e.target.id === 'collections') show(false); });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !$('collections').classList.contains('hidden')) show(false);
      });
    },
  };
})(window.DinoMatch = window.DinoMatch || {});
