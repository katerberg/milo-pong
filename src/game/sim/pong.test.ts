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
  MAX_UPGRADES,
  STRENGTH_BOOST_STEP,
  TOP_GAP,
  VY,
  W,
  WIN,
  type PongInput,
  type PongState,
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
    s.ball = {
      x: s.left.x + 4,
      y: s.left.y + PH / 2 - BS / 2,
      vx: -2,
      vy: 0,
      live: true,
      upgrade: null,
    };
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

const always: Rng = () => 0;
const never: Rng = () => 0.99;

function rally(twoPlayer = true): PongState {
  const s = createState(never);
  newGame(s, twoPlayer);
  s.ball.live = true;
  return s;
}

function aim(s: PongState, x: number, vx: number): void {
  s.ball.x = x;
  s.ball.y = 20;
  s.ball.vx = vx;
  s.ball.vy = 0;
}

const net = (W - BS) / 2;

describe("strength boost upgrade", () => {
  it("can turn the ball into an upgrade ball as it crosses the net", () => {
    const s = rally();
    aim(s, net - 1, 2);
    expect(step(s, idle, always)).toContain("transform");
    expect(s.ball.upgrade).toBe("strengthBoost");
  });

  it("leaves the ball alone on the other half of the 50% roll", () => {
    const s = rally();
    aim(s, net + 1, -2);
    expect(step(s, idle, never)).not.toContain("transform");
    expect(s.ball.upgrade).toBeNull();
  });

  it("does not roll again once the ball has transformed", () => {
    const s = rally();
    s.ball.upgrade = "strengthBoost";
    aim(s, net - 1, 2);
    let rolls = 0;
    const counting: Rng = () => (rolls++, 0);
    expect(step(s, idle, counting)).not.toContain("transform");
    expect(rolls).toBe(0);
  });

  it("does not count a serve from the net as a crossing", () => {
    const s = rally();
    aim(s, net, 2);
    expect(step(s, idle, always)).not.toContain("transform");
  });

  it("gives the scorer the upgrade instead of a point, then serves a regular ball", () => {
    const s = rally();
    s.ball.upgrade = "strengthBoost";
    aim(s, W - 1, 3);
    s.right.y = H - PH;
    const events = step(s, idle, never);
    expect(events).toContain("upgrade");
    expect(events).not.toContain("score");
    expect(s.left.score).toBe(0);
    expect(s.left.upgrades).toEqual(["strengthBoost"]);
    expect(s.ball.upgrade).toBeNull();
  });

  it("gives the opponent the upgrade when they score with the upgrade ball", () => {
    const s = rally();
    s.ball.upgrade = "strengthBoost";
    aim(s, 1 - BS, -3);
    s.left.y = H - PH;
    expect(step(s, idle, never)).toContain("upgrade");
    expect(s.right.upgrades).toEqual(["strengthBoost"]);
    expect(s.right.score).toBe(0);
  });

  it("stacks upgrades instead of points until the scorer holds three", () => {
    const s = rally();
    for (let held = 1; held <= MAX_UPGRADES; held++) {
      s.ball.live = true;
      s.ball.upgrade = "strengthBoost";
      aim(s, W - 1, 3);
      s.right.y = H - PH;
      expect(step(s, idle, never)).toContain("upgrade");
      expect(s.left.upgrades).toHaveLength(held);
      expect(s.left.score).toBe(0);
    }
  });

  it("counts a point for an upgrade ball once the scorer holds three", () => {
    const s = rally();
    s.left.upgrades = ["strengthBoost", "strengthBoost", "strengthBoost"];
    s.ball.upgrade = "strengthBoost";
    aim(s, W - 1, 3);
    s.right.y = H - PH;
    expect(step(s, idle, never)).toContain("score");
    expect(s.left.score).toBe(1);
    expect(s.left.upgrades).toHaveLength(MAX_UPGRADES);
  });

  it("counts a regular ball as a point even while collecting upgrades", () => {
    const s = rally();
    s.left.upgrades = ["strengthBoost"];
    aim(s, W - 1, 3);
    s.right.y = H - PH;
    expect(step(s, idle, never)).toContain("score");
    expect(s.left.score).toBe(1);
    expect(s.left.upgrades).toHaveLength(1);
  });

  it("stacks the strength boost: each one adds a third of the speed", () => {
    for (const held of [1, 2, 3]) {
      const s = rally();
      s.left.upgrades = Array(held).fill("strengthBoost");
      s.left.y = 20;
      s.ball.y = s.left.y + 1;
      s.ball.x = s.left.x + 4;
      s.ball.vx = -2;
      s.ball.vy = 0;
      step(s, idle, never);
      expect(Math.abs(s.ball.vx)).toBeCloseTo(ballSpeed(s.hits) * (1 + STRENGTH_BOOST_STEP * held));
    }
  });

  it("sends the ball back 33% faster off a boosted paddle, and at normal speed off the other", () => {
    const s = rally();
    s.left.upgrades = ["strengthBoost"];
    s.left.y = 20;
    s.right.y = 20;
    s.ball.y = s.left.y + 1;
    s.ball.x = s.left.x + 4;
    s.ball.vx = -2;
    s.ball.vy = 0;
    step(s, idle, never);
    const boosted = Math.abs(s.ball.vx);
    expect(boosted).toBeCloseTo(ballSpeed(s.hits) * (1 + STRENGTH_BOOST_STEP));

    s.ball.x = s.right.x - BS - 1;
    s.ball.y = s.right.y + 1;
    s.ball.vx = 2;
    step(s, idle, never);
    expect(Math.abs(s.ball.vx)).toBeCloseTo(ballSpeed(s.hits));
  });

  it("clears upgrades for a new game", () => {
    const s = rally();
    s.left.upgrades = ["strengthBoost", "strengthBoost"];
    s.right.upgrades = ["strengthBoost"];
    newGame(s, false);
    expect(s.left.upgrades).toEqual([]);
    expect(s.right.upgrades).toEqual([]);
  });
});
