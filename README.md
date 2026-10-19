# 🦕 Dino-Match

A bubbly, cartoony dinosaur matching game for little kids.

A picture of a dinosaur shows up on the left, and 8 dinosaurs (picked at random each round) wander around the meadow on the right. Tap the dino that matches the picture and it does a happy hop and walks off screen. Then a new dino shows up in the picture. Keep going until every dino has gone home. Each finished game adds one to the **Games won** counter on the main menu.

## Features

- 16 chubby cartoon dinos, each in its own colour: T-Rex, Triceratops, Stegosaurus, Brontosaurus, Pterodactyl, Ankylosaurus, Parasaurolophus, Spinosaurus, Velociraptor, Allosaurus, Dilophosaurus, Pachycephalosaurus, Archaeopteryx, Styracosaurus, Carnotaurus and Therizinosaurus. Each round uses 8 of them at random. The art is public domain (CC0) from Openclipart; see [`art/README.md`](art/README.md)
- Three locations, picked at random each round:
  - **Sunny Meadow**
  - **Pine Forest**: dinos can walk behind the trees, but never stop where they're hidden
  - **Volcano Valley**: now and then a fog bank rolls across, partly hiding the dinos
- Waddling dinos, a hovering Pterodactyl, sparkles and confetti
- The dino's name is read aloud ("Find the T-Rex!") for kids who can't read yet. Tap the picture card to hear it again
- Built to be gentle: a wrong tap gets a little wiggle and a soft "pok-pok", with no penalty. After 2 misses, or 9 seconds without finding the dino, a star appears over it as a hint
- Works with mouse and touch, in landscape and portrait (phones, tablets, desktops)
- Progress is saved in the browser (`localStorage`)
- Background music made in code: 3 cheerful tunes (Dino Stomp, Fern Waltz, Lava Hop), about a minute each and looping. The menu and each game pick one at random. It gets quieter while a dino's name is being spoken. Tunes are written as notes in `js/music.js`
- A **Sound** button (top right, on the menu and in the game) opens an **All Sounds** menu with a volume slider and a mute button for Voice, Background Music and Sound Effects. The game pauses while it's open, and the settings are remembered
- Full screen with an optional **Dad Lock**: a grown-up PIN is needed to leave full screen. Browsers always allow leaving full screen (Esc, swipes), so if that happens while locked, a lock screen covers the game until the PIN is entered. Kids can only tap "Back to full screen". Forgot the PIN? Answer a grown-up multiplication question to reset it. Not available on iPhone, where Safari doesn't support full screen for web pages
- **Golden Dinos**: about 1 round in 3, one dino is a shiny, glowing golden version. Finding it on its turn adds it to the Golden Dinos collection. Once collected it can still turn up golden (shiny but not glowing) and says "WOW!" as it walks off. Golden art is generated from each dino's normal art (`js/dinos.js`), and the chance is `GOLDEN_CHANCE` in `js/game.js`
- **Dino-Stars**: about 1 round in 3, a star with a T-Rex face (in the star's colour) floats across the sky on a wavy path. There are 13, each a different colour (one is a rainbow). Tap it to catch it: the first time it glows and joins the Dino-Stars collection; after that it can still float by (no glow) and says "WOW!" when caught. The tab also shows "Total Stars Collected", which counts every catch, repeats included. The stars are drawn in `js/stars.js`, and the chance is `STAR_CHANCE` in `js/game.js`
- The main menu shows one of the three locations at random, with 4 dino huts in that location's style (two designs per location, drawn in `js/huts.js`) and 6 random dinos hopping around (fliers glide in the sky). It's all picked afresh every time the menu opens (`js/menudinos.js`). Tap a dino and it hops with the happy sound and shoots a star from its head; tap a hut and it shakes with a soft rustle. Playing with the background fades and switches off the menu buttons; tapping a faded button just brings them back
- **Dino Stamps**: about 1 round in 3 (and now and then on the main menu), a small postage stamp with a dino silhouette is stuck on something: a tree, a rock, the sun, the volcano or a hut. Tap it and it pops up big, then flies away and joins the Dino Stamps collection (glowing and "NEW!" the first time, "WOW!" after that). In the collection, tap a found stamp to see and hear its dino fun fact. Stamps and their facts are listed in `js/stamps.js`; the chances are `STAMP_CHANCE` in `js/game.js` and `MENU_STAMP_CHANCE` in `js/main.js`
- A Collections screen on the main menu with three tabs: Golden Dinos, Dino-Stars and Dino Stamps (`js/collections.js`)
- A Credits screen on the main menu naming each dino's artist (credits live next to each dino in `js/dinos.js`)
- No build step to play, no dependencies, no audio files

## Play locally

It's a static site. Open `index.html` in a browser, or serve the folder:

```sh
npx serve .
# or
python3 -m http.server 8080
```

## Publish on GitHub Pages

1. Push this folder to a GitHub repository.
2. In the repo, go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, pick `main` and `/ (root)`, then click **Save**.
4. After a minute the game will be live at `https://<your-username>.github.io/<repo-name>/`.

## Project layout

```
index.html        Screens: main menu, game, win overlay
css/style.css     All styling and animations
js/dinos.js       Dino roster: names and how each drawing is framed
js/dino-art.js    Generated dino drawings (don't edit by hand)
js/stars.js       Dino-Stars: the 13 colours and how a star is drawn
js/stamps.js      Dino Stamps: the stamps, their fun facts, and how a stamp is drawn
js/scenes.js      Locations: Sunny Meadow, Pine Forest, Volcano Valley
js/storage.js     Save data (games won, dinos found, settings)
js/sound.js       Synth sound effects and spoken prompts
js/music.js       Background music tracks, written as notes
js/game.js        Core gameplay loop: wandering, tapping, hints
js/dadlock.js     Full screen button, Dad Lock PIN keypad and lock screen
js/collections.js Collections pop-up and its tabs
js/soundmenu.js   All Sounds menu: volume sliders and mute buttons
js/menudinos.js   Main menu background: random location, huts, dinos hopping around
js/huts.js        Dino hut drawings, two per location
js/main.js        App shell: menu, screen switching, win screen
assets/           Favicon
art/source/       Original Openclipart SVGs (CC0)
tools/build-art.py  Recolours/remixes art/source into js/dino-art.js
tools/full-test.js  Full regression test (plays the game in a hidden browser)
```

## Full test

`tools/full-test.js` plays through everything in a hidden browser (menu, Credits, Collections, a full round, all locations, golden dinos, Dino-Stars, Sound menu, Dad Lock, old saves, phone and tablet sizes) and prints PASS/FAIL for each check. It needs Node and [Playwright](https://playwright.dev) with Chromium:

```sh
npm install --no-save playwright && npx playwright install chromium   # once
node tools/full-test.js                                     # about 2 minutes
```

Screenshots from the run are saved too (the folder is printed at the end) so you can look things over by eye.

## Extending it

- **New dino:** put the SVG in `art/source/`, add an entry to `DINOS` in `tools/build-art.py` (colours to swap, parts to add or remove; `python3 tools/build-art.py --list <file>.svg` shows a file's parts), run `python3 tools/build-art.py`, then add the same `id`, a `name` and a `credit` to `js/dinos.js`. Set `flies: true` for a flier.
- **Recolour a dino:** change its `colors` in `tools/build-art.py` and rebuild.
- **New location:** add an entry to `LOCATIONS` in `js/scenes.js` and give it CSS under `.scene-<id>`. Add `trees` for pines the dinos walk behind, or `fog` for rolling fog banks.
- **Unlocks & collectibles:** `js/storage.js` already tracks `gamesCompleted` and `dinosFound`. Add new fields to `defaults()` and existing saves will pick them up automatically.
- **Tuning:** constants at the top of `js/game.js` control round size, hint timing and walking speed.

## Roadmap ideas

- Unlockable dinos and more locations (beach, snowy mountains)
- Collectible stickers or eggs
- Colour variants (find the *blue* T-Rex)
- Difficulty levels for older kids
