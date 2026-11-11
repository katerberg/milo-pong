# Ping

A tiny, 1-bit, keyboard-controlled take on the 1972 Atari Pong, built with [Phaser](https://phaser.io), TypeScript and Vite.

## Start screen

The title, ball, paddles and button box on the start screen come from a hand drawing. They live as PNGs in `src/assets/start`, and their positions are in `src/game/scenes/startLayout.ts`. The "Start" label uses the Gochi Hand font.

## Development

Requires Node 26 (see `.nvmrc`).

```bash
npm install
npm run dev       # local dev server
npm run verify    # tests, typecheck, lint, format check and build
```

The game rules live in `src/game/sim/pong.ts`. That file doesn't use Phaser and is covered by Vitest tests. `src/game/scenes/PlayScene.ts` reads the keyboard and touch and draws the game. The touch stick lives in `src/game/input`.

## Controls

- **Start** button, **Space** or **Enter**: start from the title screen
- **Space**, **Enter**, **Esc** or the **back** bar: back to the title from the win/loss screen
- **W / S** or **↑ / ↓**: move your (left) paddle
- **A / D** or **← / →**: tilt your paddle (with the turn upgrade)
- **Space**: let go of a ball stuck to your paddle (with the slime upgrade), or else fire your cannon (with the cannon upgrade)
- **1**: play against the CPU · **2**: two players. The left player uses W/S, A/D and Space; the right player uses ↑/↓, ←/→ and Enter.

### Phones and tablets

Touch uses the same scheme as Dot-Man: put a finger down anywhere (the margins around the game count too) and drag. A faint ring shows where the finger landed.

- **Drag up / down**: move your (left) paddle. It keeps moving while you hold the drag.
- **Drag left / right**: tilt your paddle (with the turn upgrade), once per swipe.
- **Tap**: the same as Space. It starts the game from the title screen, lets go of a slimed ball or fires the cannon, and returns to the title from the win/loss screen. A finger that never leaves the stick's deadzone counts as a tap, and so does a second finger put down while you're dragging.

Two-player mode needs a keyboard.

## Rules (as in the original, except the winning score)

- First to **5** wins. The game then shows a win screen or a loss screen (in two-player mode, always the win screen).
- Each paddle has **8 segments**. The middle two send the ball back flat, and the outer ones send it back at steeper angles.
- The ball **speeds up** after 4 and after 12 returns. Its speed resets when someone scores.
- After a point, the ball is served from the centre toward the player who missed.
- Paddles **can't reach the very top** of the screen. This copies the quirk in the original hardware.
- The game uses square-wave blips: one for a paddle hit, a lower one for a wall bounce and a long tone for a point.

## Upgrades

Each time an ordinary ball crosses the net for the first time in a rally, it has a 50% chance of turning into an upgrade ball. The upgrade it carries is picked at random, and the ball's drawing shows which one it is. An upgrade ball stays that way until someone scores.

- Scoring with an upgrade ball gives the scorer that upgrade instead of a point, until they hold **3**. After that, scoring with an upgrade ball counts as a normal point.
- Scoring with an ordinary ball is always a normal point.
- Let the ball get past you **3 times in a row** (without landing one on the other side) and you lose all your upgrades.
- Upgrades stack, and any mix is allowed. Small balls under each score show what each side holds. Upgrades reset when a new game starts.

| Upgrade        | Effect                                                                                                                                                                                                                                                                                         |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Strength boost | Your hits travel a third faster per boost. When the other side hits the ball back, it travels at their own speed.                                                                                                                                                                              |
| Speed boost    | Your paddle moves a third faster per boost.                                                                                                                                                                                                                                                    |
| Size up        | Your paddle grows 6px longer per boost.                                                                                                                                                                                                                                                        |
| Slime          | Your paddle turns green and sticky: the ball stays on it until you press Space. The CPU lets go after half a second. Extra slime has no further effect.                                                                                                                                        |
| Turn           | A / D (or ← / →) tilts your paddle 45° either way, and a tilted paddle sends the ball off at 45°. Extra turns have no further effect. The CPU picks a random tilt each rally.                                                                                                                  |
| Cannon         | A cannon appears on your paddle. Space fires a second ball straight ahead. If it gets past the other paddle, you score a point; if the other paddle touches it, it dissolves. Firing uses up the upgrade and frees its slot. The CPU fires now and then while the ball is heading back to you. |

### Debug: start with upgrades

Add `?upgrades=` to the URL to start every game holding those upgrades, and `?cpuUpgrades=` to do the same for the right side (the CPU or player two). List up to 3 names separated by commas. Use the ids `strengthBoost`, `speedBoost`, `sizeUp`, `slime`, `turn` and `cannon`, or the short names `strength`, `speed` and `size`. Case doesn't matter, and unknown names are ignored. For example:

```
http://localhost:5173/?upgrades=slime,turn&cpuUpgrades=size,size
```

The ball art comes from a hand drawing and lives in `src/assets/play`.

## Win and loss screens

The lettering is traced from hand drawings and lives as PNGs in `src/assets/end`. The win screen is purple with "WIN!" and "+50". The +50 is always shown but doesn't count toward anything yet. The loss screen is orange (`#ffa312`) with "Lose!". Both have a **back** bar along the bottom that returns to the title.

## Credits screen

The **Credits** box in the top-left corner of the title screen (or **C**) opens a black page with the credits in white. The lettering and the **back** word are traced from a hand drawing and live as PNGs in `src/assets/credits`. After 5 seconds, the handwritten "Emma" is replaced by Emma's own coloured drawing of her name, in purple and green. The **back** bar along the bottom, **Esc** or **Backspace** returns to the title.

## CPU

The original arcade game was two-player only. The CPU here is a simple tracker from that era. It follows the ball only once the ball is coming toward it and past its reaction line, always moves more slowly than you can, and aims a little off-centre each rally. It starts a game slow and sloppy, so a first point is within reach, then gets quicker, reacts sooner and aims better with each point you win (fully sharp at 4). It can be beaten with steep, fast shots and with shots along the top edge.

## Deploy

On each push to `main`, a GitHub Action builds the game and deploys `dist` to the `public` branch. To serve it, set GitHub Pages (Settings → Pages) to deploy from the `public` branch, `/ (root)`.
