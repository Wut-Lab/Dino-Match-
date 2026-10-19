/*
 * Save data lives in localStorage. Bump VERSION and add a migration in load()
 * if the shape ever changes, so players keep their progress.
 */
(function (DM) {
  'use strict';

  const KEY = 'dino-match:save';
  const VERSION = 1;

  const defaults = () => ({
    version: VERSION,
    gamesCompleted: 0,
    dinosFound: 0,
    soundOn: true,
    dadLock: false, // full screen Dad Lock is on
    pinHash: null,  // grown-up PIN (hashed) for the Dad Lock
    golden: {},     // golden dinos collected: { dinoId: true }
  });

  DM.Save = {
    load() {
      try {
        const raw = localStorage.getItem(KEY);
        if (raw) return Object.assign(defaults(), JSON.parse(raw));
      } catch (e) { /* private mode or corrupt data: start fresh */ }
      return defaults();
    },
    write(data) {
      try {
        localStorage.setItem(KEY, JSON.stringify(data));
      } catch (e) { /* storage unavailable: progress lasts for this visit only */ }
    },
  };
})(window.DinoMatch = window.DinoMatch || {});
