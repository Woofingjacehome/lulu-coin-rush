# Lulu Coin Rush 🪙

A silly endless coin-collecting mini game featuring Lulu, the bearded bird.
Run, jump, and fly through an infinite world — grab every Lulu Coin you can.

- No build step, no dependencies. Plain HTML/CSS/JS, works on any static host.
- All sound effects and background music are synthesized live with WebAudio — zero audio files.
- 18 hand-made animation frames (transparent WebP) in `assets/frames/`.
- English by default, one-click switch to 中文 (remembered per browser).
- Plays great on desktop (keyboard) and mobile (touch buttons).

## Project structure

```
├── index.html          # page shell — loads CSS + JS
├── css/style.css       # all styling & animations
├── js/
│   ├── i18n.js         # EN/中文 strings + language storage
│   ├── audio.js        # WebAudio synth engine (sfx + music)
│   ├── world.js        # deterministic terrain / clouds / coin layout
│   └── game.js         # state, input, physics, collisions, fx, main loop
├── assets/frames/      # 18 character frames (WebP, 384×384)
├── .nojekyll           # tell GitHub Pages to serve files as-is
└── README.md
```

## Play locally

Open `index.html` in a browser — or serve the folder (safer for some browsers):

```bash
npx serve .        # or: python3 -m http.server
```

## Deploy to GitHub Pages

1. Create a new repository (e.g. `lulu-coin-rush`).
2. Upload **the contents of this folder** to the repo root
   (`index.html`, `css/`, `js/`, `assets/`, `README.md`, `.nojekyll`).
3. Repo **Settings → Pages → Source: Deploy from a branch → main / (root)** → Save.
4. Live at `https://<username>.github.io/lulu-coin-rush/`.

> The `.nojekyll` file tells GitHub Pages to serve files as-is (skips Jekyll processing).

### Why the first version failed on GitHub

The very first version embedded all 18 sprites as base64 inside `index.html`,
producing a ~570 KB file with extremely long single lines. GitHub's web viewer
refuses to render files like that ("can't display this file"), and it also
breaks diffs and PR reviews. This version keeps every file small and loads
frames as normal files, so everything previews cleanly on GitHub.

## Controls

| Action | Keys |
|---|---|
| Run | `A` / `D` or `←` / `→` |
| Walk slowly | `Shift` + direction |
| Jump (hold = higher) | `Space` / `↑` / `W`, or tap the scene |
| Fly | `F` |
| Climb / swoop while flying | `↑` / `W` climb, `↓` / `S` swoop down to ground level |
| Shock / LOL / Nap | `1` / `2` / `3` |
| Pause | `P` / `Esc` |

On mobile: hold the RUN buttons to run, JUMP/FLY act instantly, and UP/DOWN
buttons appear automatically while flying.

## Gameplay

- **Lulu Coins** — collect by touching them: ground rows, jump arcs, sky lines,
  and rare big "jackpot" coins (×10). Counter is exact: 1 coin = +1.
- **Streak** — pick up coins in quick succession to build a streak (🔥 badge);
  the pickup pitch rises with every coin in the streak.
- **Swooping** — while flying, hold `↓` to dive down and scoop ground coins,
  `↑` to climb to the sky lines.
- **Magnet 🧲** — pulls nearby coins to you for 8 seconds (blue aura).
- **Star ⭐** — dash mode: super speed, huge pickup radius, rainbow trail.
- **Milestones** — every 50 coins: fanfare + confetti + progress bar reset.
- **Best score & wallet** — saved in your browser (localStorage).
- Idle too long and Lulu takes a nap. Try it.

## Tuning

- Physics: `GRAV`, `JUMP_V`, `MAX_RUN`, `ACC`, `FRICTION` at the top of `js/game.js`.
- Coin density & heights: `genTileItems()` in `js/world.js`.
- Music loop: `MELODY` / `BASS` arrays in `js/audio.js` (MIDI note numbers).
- Text: the `en:` / `zh:` dictionaries in `js/i18n.js`.
