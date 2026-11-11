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

The game rules live in `src/game/sim/pong.ts`. That file doesn't use Phaser and is covered by Vitest tests. `src/game/scenes/PlayScene.ts` reads the keyboard and draws the game.

## Controls

- **Start** button, **Space** or **Enter**: start from the title screen
- **Play again** button, **Space** or **Enter**: play again from the win/loss screen · **Esc**: back to the title
- **W / S** or **↑ / ↓**: move your (left) paddle
- **1**: play against the CPU · **2**: two players (left uses W/S, right uses ↑/↓)

## Rules (as in the original, except the winning score)

- First to **5** wins. The game then shows a win screen (blue) or a loss screen (red) with the final score. In two-player mode it says which side won.
- Each paddle has **8 segments**. The middle two send the ball back flat, and the outer ones send it back at steeper angles.
- The ball **speeds up** after 4 and after 12 returns. Its speed resets when someone scores.
- After a point, the ball is served from the centre toward the player who missed.
- Paddles **can't reach the very top** of the screen. This copies the quirk in the original hardware.
- The game uses square-wave blips: one for a paddle hit, a lower one for a wall bounce and a long tone for a point.

## Upgrades

Each side can hold up to **3** upgrades, and they stack. There is one so far.

- **Strength boost:** the first time a ball crosses the net in a rally, it has a 50% chance of turning into an upgrade ball, which has a teal cut-out. An upgrade ball stays that way until someone scores.
  - Scoring with an upgrade ball gives the scorer another upgrade instead of a point, until they hold 3. After that, scoring with an upgrade ball counts as a normal point.
  - Scoring with an ordinary ball is always a normal point.
  - Each strength boost held makes that side's hits a third faster: 1.33× with one, 1.67× with two and 2× with three. When the other side hits the ball back, it travels at their own speed.
  - Small upgrade balls under each score show how many upgrades that side holds. Upgrades reset when a new game starts.

The ball art comes from a hand drawing and lives in `src/assets/play`.

## CPU

The original arcade game was two-player only. The CPU here is a simple tracker from that era. It follows the ball only once the ball is coming toward it and past its reaction line, always moves more slowly than you can, and aims a little off-centre each rally. It starts a game slow and sloppy, so a first point is within reach, then gets quicker, reacts sooner and aims better with each point you win (fully sharp at 4). It can be beaten with steep, fast shots and with shots along the top edge.

## Deploy

On each push to `main`, a GitHub Action builds the game and deploys `dist` to the `public` branch. To serve it, set GitHub Pages (Settings → Pages) to deploy from the `public` branch, `/ (root)`.
