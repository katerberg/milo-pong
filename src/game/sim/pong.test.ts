import { describe, expect, it } from "vitest";
import {
  ballSpeed,
  BS,
  clampPaddle,
  cpuSpeed,
  createState,
  H,
  newGame,
  P_SPEED,
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

  it("CPU beats an idle player easily and the game ends", () => {
    const rng = seeded(3);
    const s = createState(rng);
    newGame(s, false);
    for (let i = 0; i < 200_000 && s.phase === "play"; i++) step(s, idle, rng);
    expect(s.phase).toBe("over");
    expect(s.right.score).toBe(WIN);
    // A parked paddle can still return the odd ball past the clumsy early CPU.
    expect(s.left.score).toBeLessThan(4);
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

  it("CPU starts slower than the player and speeds up as the player scores", () => {
    const s = createState(seeded(6));
    newGame(s, false);
    const start = cpuSpeed(s);
    expect(start).toBeLessThan(P_SPEED);
    s.left.score = 6;
    expect(cpuSpeed(s)).toBeGreaterThan(start);
    expect(cpuSpeed(s)).toBeLessThan(P_SPEED);
  });

  it("a good player scores early against a fresh CPU", () => {
    const rng = seeded(7);
    const s = createState(rng);
    newGame(s, false);
    let points = 0;
    for (let i = 0; i < 200_000 && points < 3; i++) {
      const target = s.ball.y + BS / 2 - PH / 2;
      const diff = target - s.left.y;
      const dir = Math.abs(diff) > 1.5 ? Math.sign(diff) : 0;
      const events = step(s, { left: (s.ball.vx < 0 ? dir : 0) as -1 | 0 | 1, right: 0 }, rng);
      if (events.includes("score")) points++;
    }
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
