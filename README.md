# Helene's Treasure Chest: Volume 2 — The Grand Journey

A free, relaxing jewel-matching game from Peter's Arcade, and the sequel to
[Helene's Treasure Chest](https://ploug76.github.io/helenes-treasure-chest/) (Volume 1 is unchanged).

**Play:** https://ploug76.github.io/helenes-treasure-chest-vol-2/

## What's new in Volume 2
- **The Grand Journey:** a painted story map through six lands (Rose Garden, Seashell Cove, Apple Orchard, Snowy Village,
  Moonlit Lagoon, Golden Palace). Each land has 4 stops (fill the chest, or collect the jewels shown) and a friendly
  **challenge chest** (Rosie, Shelly, Pippin, Flurry, Luna and King Goldie) that you open with sparkles. Its favourite jewel counts double.
- **New painted art:** jewels with very different shapes (heart, circle, square, diamond, triangle, pearl), six world
  backgrounds, the map, the chests and Helene herself on the title screen and cover.
- **Specials and boosters:** Line Gems, Burst Gems and Treasure Stars, plus 🔨 Hammer, 🔀 Shuffle and 🌈 Rainbow Star boosters.
- **Original calm score:** one WebAudio tune per land, plus title, chest, Rush and finale tunes, and sparkly sound effects.
- **Gentle by design:** big text and buttons, no timers outside Treasure Rush, no game over (out of moves = 5 free moves),
  hints after a short pause, and Helene cheers you on.
- **Light on older phones:** about 0.2 MB first load, world art loads only when you reach it, 30 fps cap, Battery saver
  on by default (fewer sparkles, still background), and everything pauses when the app is hidden.

## Controls
- **Touch:** swipe a jewel, or tap one and then its neighbour. No on-screen D-pad.
- **Keyboard:** arrows move the gold box, Enter/Space picks, H hint, P pause, M sound.
- **Game controller** (Gamepad API, USB or Bluetooth, computer or phone): stick/D-pad moves the gold box, A picks then swaps,
  B lets go/back, X hint, Start pause, Select sound. Menus are D-pad navigable. A toast shows connect/disconnect.

## Build
`./build.sh` turns `src.html` into `index.html` (version stamp, service-worker bump, shared leaderboard).
Art comes from `tools/build_art.py` and the covers from `tools/cover.py`. All art was generated for this game.
