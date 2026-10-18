# 🦕 Dino-Match

A bubbly, cartoony dinosaur matching game for little kids.

A picture of a dinosaur shows up on the left, and 6–8 dinosaurs wander around the meadow on the right. Tap the dino that matches the picture and it does a happy hop and walks off screen. Then a new dino shows up in the picture. Keep going until every dino has gone home. Each finished game adds one to the **Games won** counter on the main menu.

## Features

- 8 hand-drawn SVG dinos: T-Rex, Triceratops, Stegosaurus, Brontosaurus, Pterodactyl, Ankylosaurus, Parasaurolophus and Spinosaurus
- Walk cycles, blinking eyes, a flapping Pterodactyl, sparkles and confetti
- The dino's name is read aloud ("Find the T-Rex!") for kids who can't read yet. Tap the picture card to hear it again
- Built to be gentle: a wrong tap gets a little wiggle, with no penalty. After 2 misses, or 9 seconds without finding the dino, a star appears over it as a hint
- Works with mouse and touch, in landscape and portrait (phones, tablets, desktops)
- Progress is saved in the browser (`localStorage`)
- A sound on/off toggle, and the setting is remembered
- No build step, no dependencies, no image or audio files

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
js/dinos.js       Dino roster: names, colours and SVG drawings
js/scenes.js      Locations/backgrounds (currently: Sunny Meadow)
js/storage.js     Save data (games won, dinos found, settings)
js/sound.js       Synth sound effects and spoken prompts
js/game.js        Core gameplay loop: wandering, tapping, hints
js/main.js        App shell: menu, screen switching, win screen
assets/           Favicon
```

## Extending it

- **New dino:** add an entry to `DINOS` in `js/dinos.js`. Give it an `id`, a `name`, `colors` and a `draw()` that returns SVG for a 200×160 view box, facing right. Shapes with class `leg-a`/`leg-b` swing when it walks. Set `flies: true` with `wing-l`/`wing-r` shapes for a flier.
- **New location:** add an entry to `LOCATIONS` in `js/scenes.js` and give it CSS under `.scene-<id>`.
- **Unlocks & collectibles:** `js/storage.js` already tracks `gamesCompleted` and `dinosFound`. Add new fields to `defaults()` and existing saves will pick them up automatically.
- **Tuning:** constants at the top of `js/game.js` control round size, hint timing and walking speed.

## Roadmap ideas

- Unlockable dinos and locations (beach, volcano, snowy mountains)
- Collectible stickers or eggs
- Colour variants (find the *blue* T-Rex)
- Difficulty levels for older kids
