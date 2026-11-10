import { describe, expect, it } from "vitest";
import {
  ballSpeed,
  BS,
  clampPaddle,
  createState,
  H,
  newGame,
  PH,
  segmentOf,
  SERVE_DELAY,
  step,
  TOP_GAP,
  VY,
  W,
  WIN,
  type PongInput,
  type Rng,
} from "./pong";

function seeded(seed: number): Rng {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
}

const idle: PongInput = { left: 0, right: 0 };

describe("pong sim", () => {
  it("keeps paddles below the top gap and above the floor", () => {
    expect(clampPaddle(0)).toBe(TOP_GAP);
    expect(clampPaddle(H)).toBe(H - PH);
  });

  it("speeds the ball up after 4 and 12 hits", () => {
    expect(ballSpeed(3)).toBeLessThan(ballSpeed(4));
    expect(ballSpeed(11)).toBeLessThan(ballSpeed(12));
  });

  it("splits the paddle into 8 segments with flat returns in the middle", () => {
    const paddleY = 50;
    const segs = Array.from({ length: PH }, (_, i) => segmentOf(paddleY + i - BS / 2, paddleY));
    expect(new Set(segs).size).toBe(8);
    expect(VY[segmentOf(paddleY + PH / 2 - BS / 2, paddleY)]).toBe(0);
  });

  it("serves after a delay", () => {
    const rng = seeded(1);
    const s = createState(rng);
    newGame(s, false);
    for (let i = 0; i < SERVE_DELAY - 1; i++) step(s, idle, rng);
    expect(s.ball.live).toBe(false);
    step(s, idle, rng);
    expect(s.ball.live).toBe(true);
  });

  it("returns the ball off a paddle", () => {
    const rng = seeded(2);
    const s = createState(rng);
    newGame(s, true);
    s.ball = { x: s.left.x + 4, y: s.left.y + PH / 2 - BS / 2, vx: -2, vy: 0, live: true };
    const events = step(s, idle, rng);
    expect(events).toContain("paddle");
    expect(s.ball.vx).toBeGreaterThan(0);
  });

  it("CPU wins 11-0 against an idle player and the game ends", () => {
    const rng = seeded(3);
    const s = createState(rng);
    newGame(s, false);
    for (let i = 0; i < 200_000 && s.phase === "play"; i++) step(s, idle, rng);
    expect(s.phase).toBe("over");
    expect(s.right.score).toBe(WIN);
    expect(s.left.score).toBe(0);
  });

  it("CPU misses sometimes against a good player", () => {
    const rng = seeded(4);
    const s = createState(rng);
    newGame(s, false);
    for (let i = 0; i < 1_000_000 && s.phase === "play"; i++) {
      const target = s.ball.y - PH / 2 + (rng() - 0.5) * 12;
      s.left.y = clampPaddle(target);
      step(s, idle, rng);
    }
    expect(s.phase).toBe("over");
    expect(s.left.score).toBeGreaterThan(0);
  });

  it("keeps the ball inside the field vertically", () => {
    const rng = seeded(5);
    const s = createState(rng);
    newGame(s, true);
    for (let i = 0; i < 5000; i++) {
      step(s, idle, rng);
      expect(s.ball.y).toBeGreaterThanOrEqual(0);
      expect(s.ball.y).toBeLessThanOrEqual(H - BS);
      expect(s.ball.x).toBeLessThan(W + 10);
    }
  });
});
