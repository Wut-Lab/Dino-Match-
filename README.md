# 🦕 Dino-Match

A bubbly, cartoony dinosaur matching game for little kids.

A picture of a dinosaur shows up on the left, and 6–8 dinosaurs wander around the meadow on the right. Tap the dino that matches the picture and it does a happy hop and walks off screen. Then a new dino shows up in the picture. Keep going until every dino has gone home. Each finished game adds one to the **Games won** counter on the main menu.

## Features

- 8 chubby cartoon dinos, each in its own colour: T-Rex, Triceratops, Stegosaurus, Brontosaurus, Pterodactyl, Ankylosaurus, Parasaurolophus and Spinosaurus. The art is public domain (CC0) from Openclipart; see [`art/README.md`](art/README.md)
- Waddling dinos, a hovering Pterodactyl, sparkles and confetti
- The dino's name is read aloud ("Find the T-Rex!") for kids who can't read yet. Tap the picture card to hear it again
- Built to be gentle: a wrong tap gets a little wiggle, with no penalty. After 2 misses, or 9 seconds without finding the dino, a star appears over it as a hint
- Works with mouse and touch, in landscape and portrait (phones, tablets, desktops)
- Progress is saved in the browser (`localStorage`)
- A sound on/off toggle, and the setting is remembered
- Full screen with an optional **Dad Lock**: a grown-up PIN is needed to leave full screen. Browsers always allow leaving full screen (Esc, swipes), so if that happens while locked, a lock screen covers the game until the PIN is entered. Kids can only tap "Back to full screen". Forgot the PIN? Answer a grown-up multiplication question to reset it. Not available on iPhone, where Safari doesn't support full screen for web pages
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
js/scenes.js      Locations/backgrounds (currently: Sunny Meadow)
js/storage.js     Save data (games won, dinos found, settings)
js/sound.js       Synth sound effects and spoken prompts
js/game.js        Core gameplay loop: wandering, tapping, hints
js/dadlock.js     Full screen button, Dad Lock PIN keypad and lock screen
js/main.js        App shell: menu, screen switching, win screen
assets/           Favicon
art/source/       Original Openclipart SVGs (CC0)
tools/build-art.py  Recolours/remixes art/source into js/dino-art.js
```

## Extending it

- **New dino:** put the SVG in `art/source/`, add an entry to `DINOS` in `tools/build-art.py` (colours to swap, parts to add or remove), run `python3 tools/build-art.py`, then add the same `id` and a `name` to `js/dinos.js`. Set `flies: true` for a flier.
- **Recolour a dino:** change its `colors` in `tools/build-art.py` and rebuild.
- **New location:** add an entry to `LOCATIONS` in `js/scenes.js` and give it CSS under `.scene-<id>`.
- **Unlocks & collectibles:** `js/storage.js` already tracks `gamesCompleted` and `dinosFound`. Add new fields to `defaults()` and existing saves will pick them up automatically.
- **Tuning:** constants at the top of `js/game.js` control round size, hint timing and walking speed.

## Roadmap ideas

- Unlockable dinos and locations (beach, volcano, snowy mountains)
- Collectible stickers or eggs
- Colour variants (find the *blue* T-Rex)
- Difficulty levels for older kids
