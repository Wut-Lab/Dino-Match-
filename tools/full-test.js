/*
 * Full regression test for Dino-Match: plays the game in a real (hidden)
 * browser and checks the menu, Credits, Collections, a full round, all three
 * locations, golden dinos, Dino-Stars, the Sound menu, Dad Lock, old saves and
 * phone/tablet screen sizes. Takes about 2 minutes.
 *
 * Needs Node and Playwright (with Chromium). Run from the repo folder:
 *   node tools/full-test.js [screenshot-folder]
 * (if Playwright is installed globally: NODE_PATH=$(npm root -g) node tools/full-test.js)
 *
 * Prints PASS/FAIL per check and saves screenshots to look over by eye.
 */
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = path.join(__dirname, '..');
const OUT = process.argv[2] || path.join(os.tmpdir(), 'dino-match-test');
fs.mkdirSync(OUT, { recursive: true });
const PORT = 8765;
const URL = `http://localhost:${PORT}/`;

// A tiny web server for the game's files.
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
});
const results = [];
const check = (name, ok, info = '') => { results.push({ name, ok: !!ok, info }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? '  (' + info + ')' : ''}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function newPage(browser, viewport = { width: 1100, height: 700 }, initSave) {
  const ctx = await browser.newContext({ viewport, hasTouch: false });
  if (initSave !== undefined) {
    await ctx.addInitScript((s) => { if (!sessionStorage.seeded) { sessionStorage.seeded = 1; localStorage.clear(); if (s) localStorage.setItem('dino-match:save', s); } }, initSave);
  }
  const page = await ctx.newPage();
  page.errors = [];
  page.on('pageerror', (e) => page.errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') page.errors.push(m.text()); });
  await page.goto(URL);
  await page.waitForTimeout(300);
  return page;
}
const visible = (p, sel) => p.evaluate((s) => { const e = document.querySelector(s); return !!e && !e.classList.contains('hidden') && getComputedStyle(e).display !== 'none' && e.getClientRects().length > 0; }, sel);
const save = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('dino-match:save') || 'null'));
const tapEl = (p, handle) => p.evaluate((el) => el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true })), handle);

// Tap the current target dino; waits for a target first.
async function tapTarget(p) {
  await p.waitForFunction(() => DinoMatch.app.game.target, null, { timeout: 15000 });
  await p.evaluate(() => DinoMatch.app.game.target.el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true })));
}
async function playRound(p) {
  for (let i = 0; i < 8; i++) await tapTarget(p);
  await p.waitForSelector('#win:not(.hidden)', { timeout: 20000 });
}

(async () => {
  await new Promise((r) => server.listen(PORT, r));
  const browser = await chromium.launch();

  // ---------- 1. Main menu ----------
  let p = await newPage(browser, undefined, '');
  check('Menu: shows on load', await visible(p, '#screen-menu'));
  check('Menu: logo letters built', (await p.locator('#logo span').count()) === 'Dino-Match'.length);
  check('Menu: 6 dinos hopping in the background', (await p.locator('#menu-dinos .menu-dino').count()) === 6);
  check('Menu: games won starts at 0', (await p.textContent('#games-count')) === '0');
  await p.screenshot({ path: `${OUT}/01-menu.png` });

  // ---------- 2. Credits ----------
  await p.click('#btn-credits');
  check('Credits: opens', await visible(p, '#credits'));
  const credits = await p.locator('#credits-list li').count();
  check('Credits: 16 dinos listed', credits === 16, `${credits}`);
  const links = await p.$$eval('#credits-list a', (as) => as.every((a) => a.href.startsWith('https://openclipart.org/detail/') && a.target === '_blank'));
  check('Credits: every artist link goes to Openclipart in a new tab', links);
  await p.screenshot({ path: `${OUT}/02-credits.png` });
  await p.click('#btn-credits-close'); check('Credits: ✕ closes', !(await visible(p, '#credits')));
  await p.click('#btn-credits'); await p.click('#btn-credits-back'); check('Credits: Back closes', !(await visible(p, '#credits')));
  await p.click('#btn-credits'); await p.mouse.click(5, 5); check('Credits: tapping outside closes', !(await visible(p, '#credits')));
  await p.click('#btn-credits'); await p.keyboard.press('Escape'); check('Credits: Esc closes', !(await visible(p, '#credits')));

  // ---------- 3. Collections (empty) ----------
  await p.click('#btn-collections');
  check('Collections: opens', await visible(p, '#collections'));
  const tabs = await p.$$eval('#coll-tabs [role=tab]', (ts) => ts.map((t) => t.textContent));
  check('Collections: 3 tabs named right', JSON.stringify(tabs) === JSON.stringify(['Golden Dinos', 'Dino-Stars', 'Collection 3']), tabs.join(', '));
  check('Golden tab: 16 mystery cards + tip', (await p.locator('#coll-panel .gold-pic.mystery').count()) === 16 && (await p.locator('#coll-panel .gold-tip').count()) === 1);
  check('Golden tab: "0 of 16 found"', (await p.textContent('#coll-panel .gold-count')).includes('0 of 16'));
  check('Golden tab: Total Golden Dinos Found 0', (await p.textContent('#coll-panel .gold-total')).includes('0'));
  await p.keyboard.press('ArrowRight');
  check('Arrow key moves to Dino-Stars tab', (await p.getAttribute('#coll-tab-stars', 'aria-selected')) === 'true');
  check('Stars tab: 13 mystery cards + tip', (await p.locator('#coll-panel .gold-pic.mystery .star-svg').count()) === 13 && (await p.locator('#coll-panel .gold-tip').count()) === 1);
  check('Stars tab: Total Stars Collected 0', (await p.textContent('#coll-panel .stars-total')).includes('0'));
  await p.keyboard.press('End');
  check('End key -> Collection 3 shows "Coming soon!"', (await p.getAttribute('#coll-tab-c3', 'aria-selected')) === 'true' && (await p.textContent('#coll-panel')).includes('Coming soon'));
  await p.keyboard.press('ArrowRight');
  check('Arrow key wraps round to Golden Dinos', (await p.getAttribute('#coll-tab-golden', 'aria-selected')) === 'true');
  await p.click('#coll-tab-stars');
  await p.click('#btn-coll-close'); check('Collections: ✕ closes', !(await visible(p, '#collections')));
  await p.click('#btn-collections');
  check('Collections: reopens on the last tab used', (await p.getAttribute('#coll-tab-stars', 'aria-selected')) === 'true');
  await p.click('#btn-coll-back'); check('Collections: Back closes', !(await visible(p, '#collections')));
  await p.click('#btn-collections'); await p.mouse.click(5, 5); check('Collections: tapping outside closes', !(await visible(p, '#collections')));
  await p.click('#btn-collections'); await p.keyboard.press('Escape'); check('Collections: Esc closes', !(await visible(p, '#collections')));

  // ---------- 4. A full round ----------
  await p.evaluate(() => { DinoMatch.app.game.goldenChance = 0; DinoMatch.app.game.starChance = 0; });
  await p.click('#btn-play');
  await p.waitForTimeout(400);
  check('Game: screen shows', await visible(p, '#screen-game'));
  check('Game: 8 dinos on the field', (await p.locator('#field .actor').count()) === 8);
  const ids = await p.evaluate(() => DinoMatch.app.game.actors.map((a) => a.dino.id));
  check('Game: 8 different dinos', new Set(ids).size === 8);
  check('Game: 8 progress pips', (await p.locator('#progress .pip').count()) === 8);
  check('Game: location banner shows', (await p.locator('#field .loc-banner').count()) >= 1);
  await p.waitForFunction(() => DinoMatch.app.game.target, null, { timeout: 5000 });
  const tgt = await p.evaluate(() => ({ name: DinoMatch.app.game.target.dino.name, card: document.getElementById('target-name').textContent }));
  check('Game: picture card names the target', tgt.name === tgt.card, tgt.card);
  // wrong taps -> shake + hint after 2
  const wrong = await p.evaluateHandle(() => DinoMatch.app.game.actors.find((a) => a !== DinoMatch.app.game.target).el);
  await tapEl(p, wrong);
  check('Game: wrong tap shakes the dino and wiggles the card', await p.evaluate((el) => el.querySelector('.actor-body').classList.contains('shake') && document.getElementById('target-card').classList.contains('wiggle'), wrong));
  check('Game: no hint after 1 miss', !(await p.evaluate(() => DinoMatch.app.game.target.el.classList.contains('hint'))));
  await tapEl(p, wrong);
  check('Game: hint star after 2 misses', await p.evaluate(() => DinoMatch.app.game.target.el.classList.contains('hint')));
  // real mouse click on the target
  // Click a spot where the target itself is on top. (A neighbour's see-through
  // box corner can cover part of it; that's a known game bug, tested separately.)
  const box = await p.evaluate(() => { const t = DinoMatch.app.game.target.el; const r = t.getBoundingClientRect();
    for (let fy = 0.6; fy > 0.1; fy -= 0.05) for (let fx = 0.5; fx > 0.1; fx -= 0.05) for (const x of [r.x + r.width * fx, r.x + r.width * (1 - fx)]) { const y = r.y + r.height * fy; const h = document.elementFromPoint(x, y); if (h && h.closest('.actor') === t) return { x, y }; }
    return { x: r.x + r.width / 2, y: r.y + r.height * 0.6 }; });
  const before = await p.evaluate(() => DinoMatch.app.game.found);
  await p.mouse.click(box.x, box.y);
  const after1 = await p.evaluate(() => DinoMatch.app.game.found);
  check('Game: real mouse click on the right dino counts', after1 === before + 1, `found ${after1}`);
  check('Game: 1 pip lit', (await p.locator('#progress .pip.on').count()) === 1);
  await p.screenshot({ path: `${OUT}/03-game.png` });
  for (let i = 1; i < 8; i++) await tapTarget(p);
  await p.waitForSelector('#win:not(.hidden)', { timeout: 20000 });
  check('Game: win screen after 8 dinos', true);
  check('Game: confetti on win', (await p.locator('#confetti i').count()) > 20);
  check('Win: shows games won 1', (await p.textContent('#win-count')) === '1');
  let s = await save(p);
  check('Save: gamesCompleted 1, dinosFound 8', s.gamesCompleted === 1 && s.dinosFound === 8);
  await p.screenshot({ path: `${OUT}/04-win.png` });
  await p.click('#btn-again');
  await p.waitForTimeout(400);
  check('Win: Play again starts a fresh round', (await visible(p, '#screen-game')) && !(await visible(p, '#win')) && (await p.locator('#field .actor').count()) === 8);
  await p.click('#btn-home');
  check('Home button goes to menu', await visible(p, '#screen-menu'));
  check('Menu: games won shows 1', (await p.textContent('#games-count')) === '1');
  check('Home: round stopped and field cleared', await p.evaluate(() => !DinoMatch.app.game.running && !document.querySelector('#field .actor')));

  // ---------- 5. Locations ----------
  const seen = [];
  const shots = {};
  for (let i = 0; i < 9; i++) {
    await p.click('#btn-play');
    await p.waitForTimeout(500);
    const loc = await p.evaluate(() => DinoMatch.app.game.location.id);
    seen.push(loc);
    if (!shots[loc]) { shots[loc] = 1; await p.screenshot({ path: `${OUT}/05-loc-${loc}.png` }); }
    if (loc === 'forest') {
      const trees = await p.locator('#field .tree').count();
      check('Forest: has pine trees', trees > 3, `${trees}`);
      // Watch for 6 s: no dino should stay parked behind a tree.
      const parked = await p.evaluate(async () => {
        const g = DinoMatch.app.game; const since = new Map(); let worst = 0;
        for (let t = 0; t < 120; t++) {
          await new Promise((r) => setTimeout(r, 50));
          for (const a of g.actors) {
            const hid = !a.moving && !a.leaving && g.hidden(a.x, a.y);
            if (hid) { since.set(a, (since.get(a) || 0) + 50); worst = Math.max(worst, since.get(a)); } else since.delete(a);
          }
        }
        return worst;
      });
      check('Forest: no dino rests hidden behind a tree', parked <= 300, `longest ${parked} ms`);
    }
    if (loc === 'volcano' && !shots.fog) {
      const fog = await p.waitForSelector('#field .fog', { timeout: 11000 }).then(() => true).catch(() => false);
      check('Volcano: a fog bank rolls in', fog);
      if (fog) { shots.fog = 1; await p.waitForTimeout(2500); await p.screenshot({ path: `${OUT}/05-loc-volcano-fog.png` }); }
    }
    if (loc !== 'volcano') check(`${loc}: no fog`, (await p.locator('#field .fog').count()) === 0);
    await p.click('#btn-home');
  }
  check('Locations: all 3 appear', ['meadow', 'forest', 'volcano'].every((l) => seen.includes(l)), seen.join(' '));
  check('Locations: never the same twice in a row', seen.every((l, i) => i === 0 || l !== seen[i - 1]));
  check('Home: fog/trees/banners cleared', (await p.locator('#field .tree, #field .fog, #field .loc-banner').count()) === 0);

  // ---------- 6. Golden dinos ----------
  await p.evaluate(() => { DinoMatch.app.game.goldenChance = 1; DinoMatch.app.game.starChance = 0; });
  await p.click('#btn-play');
  await p.waitForTimeout(400);
  const gold = await p.evaluate(() => DinoMatch.app.game.actors.filter((a) => a.gold).map((a) => [a.dino.id, a.gold]));
  check('Golden: exactly one golden dino, glowing', gold.length === 1 && gold[0][1] === 'glow', JSON.stringify(gold));
  check('Golden: has sparkles', (await p.locator('#field .actor.gold-glow .gold-sparkles').count()) === 1);
  // tap dinos until the golden one is the target
  let gotGold = false;
  for (let i = 0; i < 8; i++) {
    await p.waitForFunction(() => DinoMatch.app.game.target, null, { timeout: 15000 });
    const isGold = await p.evaluate(() => !!DinoMatch.app.game.target.gold);
    if (isGold) {
      check('Golden: card says "Golden ..." and glows', await p.evaluate(() => document.getElementById('target-name').textContent.startsWith('Golden ') && document.getElementById('target-card').classList.contains('gold-glow')));
      await tapTarget(p);
      await p.waitForTimeout(300);
      check('Golden: says NEW! and banner "collected!"', (await p.locator('#field .say').textContent()) === 'NEW!' && (await p.locator('#field .gold-banner').textContent()).includes(`Golden`) );
      await p.screenshot({ path: `${OUT}/06-golden-new.png` });
      gotGold = true;
    } else await tapTarget(p);
  }
  await p.waitForSelector('#win:not(.hidden)', { timeout: 20000 });
  s = await save(p);
  check('Golden: saved to collection', gotGold && s.golden[gold[0][0]] === true);
  // same dino again -> plain gold, says WOW!
  await p.click('#btn-again');
  await p.waitForTimeout(400);
  // restart until the collected dino is the golden one again
  await p.evaluate((id) => {
    const g = DinoMatch.app.game;
    for (let i = 0; i < 500; i++) { const a = g.actors.find((x) => x.gold); if (a && a.dino.id === id) return; g.start(); }
  }, gold[0][0]);
  await p.waitForTimeout(300);
  const g2 = await p.evaluate(() => DinoMatch.app.game.actors.filter((a) => a.gold).map((a) => [a.dino.id, a.gold]));
  check('Golden: already-collected dino comes back plain (no glow)', g2.length === 1 && g2[0][0] === gold[0][0] && g2[0][1] === 'plain', JSON.stringify(g2));
  check('Golden: plain one has no sparkles', (await p.locator('#field .actor.gold-glow, #field .gold-sparkles').count()) === 0);
  for (let i = 0; i < 8; i++) {
    await p.waitForFunction(() => DinoMatch.app.game.target, null, { timeout: 15000 });
    const isGold = await p.evaluate(() => !!DinoMatch.app.game.target.gold);
    await tapTarget(p);
    if (isGold) {
      await p.waitForTimeout(200);
      check('Golden: plain one says WOW!, no new banner', (await p.locator('#field .say').textContent()) === 'WOW!' && (await p.locator('#field .gold-banner').count()) === 0);
    }
  }
  await p.waitForSelector('#win:not(.hidden)', { timeout: 20000 });
  await p.click('#btn-menu');
  await p.click('#btn-collections'); await p.click('#coll-tab-golden');
  check('Golden tab: shows 1 found card + "1 of 16"', (await p.locator('#coll-panel .gold-card.found').count()) === 1 && (await p.textContent('#coll-panel .gold-count')).includes('1 of 16'));
  check('Golden tab: tip hidden once one is found', (await p.locator('#coll-panel .gold-tip').count()) === 0);
  check('Golden tab: repeat find adds to Total (now 2)', (await p.textContent('#coll-panel .gold-total')).includes('2') && (await save(p)).goldCaught === 2);
  await p.keyboard.press('Escape');

  // ---------- 7. Dino-Stars ----------
  await p.evaluate(() => { DinoMatch.app.game.goldenChance = 0; DinoMatch.app.game.starChance = 1; });
  await p.click('#btn-play');
  await p.waitForTimeout(300);
  check('Stars: none at the very start (waits a few seconds)', (await p.locator('#field .dstar').count()) === 0);
  const appeared = await p.waitForSelector('#field .dstar', { timeout: 16000 }).then(() => true).catch(() => false);
  check('Stars: one floats in on its own within 14 s', appeared);
  const st = await p.evaluate(() => { const f = DinoMatch.app.game.star; return { id: f.star.id, glow: f.glow, y: f.y, sky: DinoMatch.app.game.bounds.H * DinoMatch.app.game.location.horizon, s: f.s }; });
  check('Stars: new star glows', st.glow && (await p.locator('#field .dstar.star-glow .gold-sparkles').count()) === 1);
  check('Stars: flies in the sky area', st.y <= st.sky + st.s * 0.4, `y ${Math.round(st.y)}, horizon ${Math.round(st.sky)}`);
  const ys = [];
  for (let i = 0; i < 12; i++) { ys.push(await p.evaluate(() => DinoMatch.app.game.star && DinoMatch.app.game.star.y)); await p.waitForTimeout(150); }
  check('Stars: moves in a wavy path (height changes)', Math.max(...ys) - Math.min(...ys) > 5, `range ${Math.round(Math.max(...ys) - Math.min(...ys))} px`);
  // pause with sound menu freezes the star
  await p.click('#btn-sound');
  const x1 = await p.evaluate(() => DinoMatch.app.game.star.x); await p.waitForTimeout(600);
  const x2 = await p.evaluate(() => DinoMatch.app.game.star.x);
  check('Sound menu pauses the star too', x1 === x2);
  await p.click('#sound-done');
  // real click on the star
  const sb = await p.locator('#field .dstar').boundingBox();
  await p.mouse.click(sb.x + sb.width / 2, sb.y + sb.height / 2);
  await p.waitForTimeout(300);
  check('Stars: tap says NEW! + "Dino-Star collected!" banner', (await p.locator('#field .dstar .say').textContent()) === 'NEW!' && (await p.locator('#field .gold-banner').textContent()).includes('Dino-Star collected'));
  await p.screenshot({ path: `${OUT}/07-star-caught.png` });
  s = await save(p);
  check('Stars: saved + counter 1', s.stars[st.id] === true && s.starsCaught === 1);
  const gone = await p.waitForFunction(() => !document.querySelector('#field .dstar'), null, { timeout: 5000 }).then(() => true).catch(() => false);
  check('Stars: zooms away and is removed', gone);
  check('Stars: catching a star does not affect the dino round', await p.evaluate(() => DinoMatch.app.game.running && DinoMatch.app.game.actors.length === 8));
  // same star again -> no glow, WOW!
  await p.evaluate((id) => { const g = DinoMatch.app.game; const R = Math.random; const i = DinoMatch.STARS.findIndex((x) => x.id === id); Math.random = () => (i + 0.5) / 13; g.launchStar(); Math.random = R; }, st.id);
  check('Stars: collected star comes back without glow', await p.evaluate(() => !DinoMatch.app.game.star.glow) && (await p.locator('#field .dstar.star-glow, #field .dstar .gold-sparkles').count()) === 0);
  await p.waitForTimeout(1500);
  const sb2 = await p.locator('#field .dstar').boundingBox();
  await p.mouse.click(sb2.x + sb2.width / 2, sb2.y + sb2.height / 2);
  await p.waitForTimeout(200);
  check('Stars: repeat says WOW!, no banner', (await p.locator('#field .dstar .say').textContent()) === 'WOW!' && (await p.locator('#field .gold-banner').count()) === 0);
  s = await save(p);
  check('Stars: repeat catch adds to Total (now 2), still 1 unique', s.starsCaught === 2 && Object.keys(s.stars).length === 1);
  await p.waitForTimeout(2500);
  // untapped star drifts off the far side
  await p.evaluate(() => DinoMatch.app.game.launchStar());
  const drift = await p.waitForFunction(() => !document.querySelector('#field .dstar'), null, { timeout: 16000 }).then(() => true).catch(() => false);
  check('Stars: an untapped star floats off and is removed (~11 s)', drift);
  // star removed on leaving the round
  await p.evaluate(() => DinoMatch.app.game.launchStar());
  await p.click('#btn-home');
  check('Stars: going home removes a flying star', (await p.locator('#field .dstar').count()) === 0 && (await p.evaluate(() => DinoMatch.app.game.star)) === null);
  await p.click('#btn-collections'); await p.click('#coll-tab-stars');
  check('Stars tab: 1 found card, "Total Stars Collected: 2"', (await p.locator('#coll-panel .star-card.found').count()) === 1 && (await p.textContent('#coll-panel .stars-total')).includes('2'));
  await p.screenshot({ path: `${OUT}/08-stars-tab.png` });
  await p.keyboard.press('Escape');

  // ---------- 8. Sound menu ----------
  await p.evaluate(() => { DinoMatch.app.game.starChance = 0; });
  await p.click('#btn-play'); await p.waitForTimeout(500);
  await p.click('#btn-sound');
  check('Sound menu: opens with 3 rows', (await visible(p, '#sound-menu')) && (await p.locator('#sound-rows .sound-row').count()) === 3);
  const pos1 = await p.evaluate(() => DinoMatch.app.game.actors.map((a) => a.x + ',' + a.y).join('|'));
  await p.waitForTimeout(800);
  const pos2 = await p.evaluate(() => DinoMatch.app.game.actors.map((a) => a.x + ',' + a.y).join('|'));
  check('Sound menu: game is paused (dinos hold still)', pos1 === pos2);
  await p.screenshot({ path: `${OUT}/09-sound-menu.png` });
  await p.click('.mute-btn[data-kind="music"]');
  s = await save(p);
  check('Sound menu: mute Music saves', s.mute.music === true);
  await p.locator('#vol-sfx').fill('40');
  await p.locator('#vol-sfx').dispatchEvent('change');
  s = await save(p);
  check('Sound menu: SFX slider saves 0.4', Math.abs(s.volume.sfx - 0.4) < 0.01, `${s.volume.sfx}`);
  await p.click('.mute-btn[data-kind="voice"]'); await p.click('.mute-btn[data-kind="sfx"]');
  check('Sound menu: all muted -> top button shows 🔇', (await p.textContent('#sound-icon')) === '🔇');
  await p.click('.mute-btn[data-kind="voice"]'); await p.click('.mute-btn[data-kind="sfx"]'); await p.click('.mute-btn[data-kind="music"]');
  await p.keyboard.press('Escape');
  check('Sound menu: Esc closes', !(await visible(p, '#sound-menu')));
  await p.waitForTimeout(300);
  const pos3 = await p.evaluate(() => DinoMatch.app.game.actors.map((a) => a.x + ',' + a.y).join('|'));
  await p.waitForTimeout(1500);
  const pos4 = await p.evaluate(() => DinoMatch.app.game.actors.map((a) => a.x + ',' + a.y).join('|'));
  check('Sound menu: game resumes after closing', pos3 !== pos4);
  await p.click('#btn-sound'); await p.click('#sound-done');
  check('Sound menu: Done closes', !(await visible(p, '#sound-menu')));
  await p.click('#btn-home');

  // ---------- 9. Dad Lock ----------
  const fs = () => p.evaluate(() => !!document.fullscreenElement);
  check('Dad Lock: full screen button visible', await p.isVisible('#btn-fullscreen'));
  await p.click('#btn-fullscreen');
  check('Full screen menu opens', await visible(p, '#fs-menu'));
  await p.click('#fs-cancel'); check('Full screen menu: Cancel closes', !(await visible(p, '#fs-menu')));
  await p.click('#btn-fullscreen'); await p.click('#fs-plain'); await p.waitForTimeout(400);
  check('Just full screen: enters full screen', await fs());
  await p.click('#btn-fullscreen'); await p.waitForTimeout(400);
  check('Just full screen: button leaves it (no PIN)', !(await fs()));
  await p.click('#btn-fullscreen'); await p.click('#fs-locked');
  check('Dad Lock: asks to set a PIN', (await visible(p, '#pad')) && (await p.textContent('#pad-title')) === 'Set a grown-up PIN');
  const typePin = async (pin) => { for (const d of pin) await p.click(`.pad-key[data-key="${d}"]`); };
  await typePin('1234'); await typePin('9999');
  check('Dad Lock: mismatched PINs start again', (await p.textContent('#pad-msg')).includes("didn't match"));
  await typePin('1234'); await typePin('1234'); await p.waitForTimeout(500);
  check('Dad Lock: locked + full screen after matching PIN', (await fs()) && (await p.textContent('#btn-fullscreen')) === '🔒' && (await save(p)).dadLock === true);
  check('Dad Lock: PIN is stored hashed, not plain', ((await save(p)).pinHash || '').startsWith('h:'));
  await p.screenshot({ path: `${OUT}/10-dadlock-on.png` });
  // the game still plays under the lock
  await p.click('#btn-play'); await p.waitForTimeout(500);
  check('Dad Lock: game still playable while locked', (await p.locator('#field .actor').count()) === 8);
  await p.click('#btn-home');
  // leave full screen the "other" way -> lock screen
  await p.evaluate(() => document.exitFullscreen()); await p.waitForTimeout(400);
  check('Dad Lock: leaving full screen shows lock screen', (await visible(p, '#pad')) && (await p.evaluate(() => document.getElementById('pad').classList.contains('lock-screen'))));
  check('Lock screen: has "Back to full screen", no Cancel', (await p.isVisible('#pad-resume')) && !(await p.isVisible('#pad-cancel')));
  await p.screenshot({ path: `${OUT}/11-lock-screen.png` });
  await p.click('#pad-resume'); await p.waitForTimeout(400);
  check('Lock screen: Back to full screen works and hides lock', (await fs()) && !(await visible(p, '#pad')));
  // wrong PIN then right PIN via the button
  await p.click('#btn-fullscreen');
  check('Dad Lock: 🔒 button asks for PIN', (await visible(p, '#pad')) && (await p.textContent('#pad-title')) === 'Grown-ups only');
  await typePin('0000'); await p.waitForTimeout(200);
  check('Dad Lock: wrong PIN is refused', (await p.textContent('#pad-msg')).includes('Wrong PIN') && (await fs()));
  await p.click('#pad-cancel'); check('Keypad: Cancel closes, still locked', !(await visible(p, '#pad')) && (await save(p)).dadLock);
  await p.click('#btn-fullscreen'); await typePin('1234'); await p.waitForTimeout(500);
  check('Dad Lock: right PIN unlocks and leaves full screen', !(await fs()) && !(await save(p)).dadLock && (await p.getAttribute('#btn-fullscreen', 'aria-label')) === 'Full screen');
  // lock again (PIN remembered, no set step) and reload while locked
  await p.click('#btn-fullscreen'); await p.click('#fs-locked'); await p.waitForTimeout(400);
  check('Dad Lock: second time skips PIN setup', (await fs()) && !(await visible(p, '#pad')));
  await p.reload(); await p.waitForTimeout(500);
  check('Dad Lock: after reload starts on the lock screen', (await visible(p, '#pad')) && (await p.evaluate(() => document.getElementById('pad').classList.contains('lock-screen'))));
  // 3 wrong -> cool-down
  for (let i = 0; i < 3; i++) { await typePin('0000'); await p.waitForTimeout(150); }
  check('Dad Lock: 3 wrong PINs -> wait message', (await p.textContent('#pad-msg')).includes('Too many tries'));
  // forgot PIN flow (answers right away, cool-down only affects key presses... wait it out)
  await p.click('#pad-forgot');
  check('Forgot PIN: asks a multiplication question', (await p.textContent('#pad-msg')).includes('×'));
  await p.waitForTimeout(10200);
  const ans = await p.evaluate(() => { const m = document.getElementById('pad-msg').textContent.match(/(\d+) × (\d+)/); return String(m[1] * m[2]); });
  await typePin('11'); await p.click('.pad-key[data-key="ok"]'); await p.waitForTimeout(150);
  check('Forgot PIN: wrong answer refused', (await p.textContent('#pad-msg')).includes('Not quite'));
  await typePin(ans); await p.click('.pad-key[data-key="ok"]'); await p.waitForTimeout(300);
  s = await save(p);
  check('Forgot PIN: right answer unlocks and clears the PIN', !s.dadLock && s.pinHash === null && !(await visible(p, '#pad')));
  check('Dad Lock: everything else in the save survived', s.gamesCompleted === 3 && Object.keys(s.golden).length === 1 && s.starsCaught === 2);
  check('No errors in desktop session', p.errors.length === 0, p.errors.join(' | '));
  await p.context().close();

  // ---------- 10. Old saves ----------
  p = await newPage(browser, undefined, JSON.stringify({ version: 1, gamesCompleted: 7, dinosFound: 40, soundOn: false, golden: { trex: true } }));
  s = await p.evaluate(() => DinoMatch.app.save);
  check('Old save: games won kept', (await p.textContent('#games-count')) === '7');
  check('Old save: sound off -> all three muted', s.mute.voice && s.mute.music && s.mute.sfx && !('soundOn' in s));
  check('Old save: gets empty stars + counter 0', JSON.stringify(s.stars) === '{}' && s.starsCaught === 0);
  check('Old save: golden kept', s.golden.trex === true);
  check('Old save: golden counter starts at 1 (the one already found)', s.goldCaught === 1);
  check('No errors with old save', p.errors.length === 0, p.errors.join(' | '));
  await p.context().close();

  // ---------- 11. Phone sizes ----------
  for (const [name, vp] of [['phone-portrait', { width: 390, height: 844 }], ['phone-landscape', { width: 844, height: 390 }], ['tablet-portrait', { width: 820, height: 1180 }]]) {
    p = await newPage(browser, vp, '');
    await p.screenshot({ path: `${OUT}/12-${name}-menu.png` });
    const noScroll = await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
    check(`${name}: no sideways scrolling`, noScroll);
    const btns = await p.evaluate(() => ['btn-play', 'btn-collections', 'btn-credits', 'btn-sound', 'btn-fullscreen'].every((id) => { const r = document.getElementById(id).getBoundingClientRect(); return r.width > 0 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1 && r.top >= -1; }));
    check(`${name}: menu buttons all on screen`, btns);
    await p.click('#btn-collections'); await p.click('#coll-tab-stars');
    const fits = await p.evaluate(() => { const c = document.querySelector('.coll-card').getBoundingClientRect(); return c.left >= -1 && c.right <= innerWidth + 1; });
    check(`${name}: collections pop-up fits the width`, fits);
    await p.screenshot({ path: `${OUT}/12-${name}-collections.png` });
    await p.keyboard.press('Escape');
    await p.evaluate(() => { DinoMatch.app.game.goldenChance = 1; DinoMatch.app.game.starChance = 0; });
    await p.click('#btn-play'); await p.waitForTimeout(600);
    await p.evaluate(() => DinoMatch.app.game.launchStar()); await p.waitForTimeout(2500);
    const inField = await p.evaluate(() => { const f = document.getElementById('field').getBoundingClientRect(); return DinoMatch.app.game.actors.every((a) => { const r = a.el.getBoundingClientRect(); return r.left >= f.left - 2 && r.right <= f.right + 2 && r.bottom <= f.bottom + 2; }); });
    check(`${name}: all dinos inside the field`, inField);
    await p.screenshot({ path: `${OUT}/12-${name}-game.png` });
    await p.evaluate(() => { DinoMatch.app.game.star && DinoMatch.app.game.star.el.remove(); DinoMatch.app.game.star = null; });
    await playRound(p);
    check(`${name}: full round plays to the win screen`, await visible(p, '#win'));
    await p.screenshot({ path: `${OUT}/12-${name}-win.png` });
    check(`${name}: no errors`, p.errors.length === 0, p.errors.join(' | '));
    await p.context().close();
  }

  await browser.close();
  server.close();
  console.log(`\nScreenshots: ${OUT}`);
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`);
  failed.forEach((f) => console.log('  FAILED: ' + f.name + (f.info ? ' (' + f.info + ')' : '')));
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error('TEST CRASHED:', e); server.close(); process.exit(1); });
