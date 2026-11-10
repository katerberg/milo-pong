# Pong

A tiny, 1-bit, keyboard-controlled take on the 1972 Atari Pong. It's one file and has no dependencies. Open `index.html` in a browser.

## Controls
- **Space**: start or restart
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
