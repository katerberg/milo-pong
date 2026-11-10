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
- **Space**: restart after a game ends
- **W / S** or **↑ / ↓**: move your (left) paddle
- **1**: play against the CPU · **2**: two players (left uses W/S, right uses ↑/↓)

## Rules (as in the original)

- First to **11** wins.
- Each paddle has **8 segments**. The middle two send the ball back flat, and the outer ones send it back at steeper angles.
- The ball **speeds up** after 4 and after 12 returns. Its speed resets when someone scores.
- After a point, the ball is served from the centre toward the player who missed.
- Paddles **can't reach the very top** of the screen. This copies the quirk in the original hardware.
- The game uses square-wave blips: one for a paddle hit, a lower one for a wall bounce and a long tone for a point.

## CPU

The original arcade game was two-player only. The CPU here is a simple tracker from that era. It follows the ball only while the ball is coming toward it, moves more slowly than you can, and aims a little off-centre each rally. It can be beaten with steep, fast shots and with shots along the top edge.

## Deploy

On each push to `main`, a GitHub Action builds the game and deploys `dist` to the `public` branch. To serve it, set GitHub Pages (Settings → Pages) to deploy from the `public` branch, `/ (root)`.
