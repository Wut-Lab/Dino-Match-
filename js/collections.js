/*
 * Collections screen: a pop-up with one tab per collection.
 *
 * The three collections are placeholders for now. To fill one in, give it a
 * real title and make render() return its contents (it receives the save data).
 */
(function (DM) {
  'use strict';

  const $ = (id) => document.getElementById(id);

  const COLLECTIONS = [
    { id: 'c1', title: 'Collection 1', render: () => '<p class="coll-empty">Coming soon!</p>' },
    { id: 'c2', title: 'Collection 2', render: () => '<p class="coll-empty">Coming soon!</p>' },
    { id: 'c3', title: 'Collection 3', render: () => '<p class="coll-empty">Coming soon!</p>' },
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
