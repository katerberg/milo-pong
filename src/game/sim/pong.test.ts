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
  PW,
  PH,
  segmentOf,
  SERVE_DELAY,
  step,
  MAX_UPGRADES,
  STRENGTH_BOOST_STEP,
  CPU_SLIME_HOLD,
  SHOT_SIZE,
  paddleHeight,
  SIZE_UP_PX,
  SPEED_BOOST_STEP,
  UPGRADES,
  TOP_GAP,
  VY,
  W,
  WIN,
  winner,
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
      crossedNet: false,
      stuck: null,
    };
    const events = step(s, idle, rng);
    expect(events).toContain("paddle");
    expect(s.ball.vx).toBeGreaterThan(0);
  });

  it("the first side to 5 points wins and ends the game", () => {
    expect(WIN).toBe(5);
    const rng = seeded(11);
    const s = createState(rng);
    newGame(s, false);
    s.left.score = WIN - 1;
    expect(winner(s)).toBeNull();
    s.ball = {
      x: W - 1,
      y: 10,
      vx: 3,
      vy: 0,
      live: true,
      upgrade: null,
      crossedNet: true,
      stuck: null,
    };
    s.right.y = H - PH;
    step(s, idle, rng);
    expect(s.left.score).toBe(WIN);
    expect(winner(s)).toBe("left");
    expect(s.phase).toBe("over");
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
    // Bounded rather than played to the end: a never-missing player with the wrong mix of
    // upgrades can rally forever against a CPU that also returns everything.
    for (let i = 0; i < 200_000 && s.phase === "play"; i++) {
      const target = s.ball.y - PH / 2 + (rng() - 0.5) * 12;
      s.left.y = clampPaddle(target);
      // Let go of a slimed ball straight away.
      step(s, { ...idle, leftRelease: true }, rng);
    }
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

  it("only rolls on the first crossing of the net", () => {
    const s = rally();
    aim(s, net - 1, 2);
    expect(step(s, idle, never)).not.toContain("transform");
    aim(s, net + 1, -2);
    expect(step(s, idle, always)).not.toContain("transform");
    expect(s.ball.upgrade).toBeNull();
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

describe("more upgrades", () => {
  it("picks which upgrade the ball becomes at random", () => {
    const s = rally();
    aim(s, net - 1, 2);
    const rolls = [0, 0.5];
    step(s, idle, () => rolls.shift() ?? 0.99);
    expect(s.ball.upgrade).toBe(UPGRADES[Math.floor(0.5 * UPGRADES.length)]);
  });

  it("speed boost makes the paddle move a third faster per boost", () => {
    const s = rally();
    s.ball.live = false;
    s.serveTimer = 1000;
    s.left.upgrades = ["speedBoost"];
    s.left.y = 60;
    step(s, { left: 1, right: 0 }, never);
    expect(s.left.y - 60).toBeCloseTo(P_SPEED * (1 + SPEED_BOOST_STEP));
  });

  it("size up makes the paddle longer, and the extra length returns the ball", () => {
    const s = rally();
    s.left.upgrades = ["sizeUp", "sizeUp"];
    expect(paddleHeight(s.left)).toBe(PH + 2 * SIZE_UP_PX);
    s.left.y = 40;
    // Below where a normal paddle ends, but within the grown one.
    aim(s, s.left.x + PW + 1, -2);
    s.ball.y = 40 + PH + 1;
    expect(step(s, idle, never)).toContain("paddle");
    expect(s.ball.vx).toBeGreaterThan(0);
  });

  describe("slime", () => {
    function caught(): PongState {
      const s = rally();
      s.left.upgrades = ["slime"];
      s.left.y = 40;
      aim(s, s.left.x + PW + 1, -2);
      s.ball.y = 45;
      expect(step(s, idle, never)).toContain("stick");
      return s;
    }

    it("catches the ball and carries it with the paddle", () => {
      const s = caught();
      expect(s.ball.stuck).not.toBeNull();
      step(s, { left: 1, right: 0 }, never);
      step(s, { left: 1, right: 0 }, never);
      expect(s.ball.y).toBeCloseTo(45 + 2 * P_SPEED);
      expect(s.ball.vx).toBe(0);
    });

    it("lets go when the player presses release", () => {
      const s = caught();
      step(s, idle, never);
      expect(s.ball.stuck).not.toBeNull();
      expect(step(s, { ...idle, leftRelease: true }, never)).toContain("paddle");
      expect(s.ball.stuck).toBeNull();
      expect(s.ball.vx).toBeGreaterThan(0);
    });

    it("the CPU lets go on its own after a moment", () => {
      const s = rally(false);
      s.right.upgrades = ["slime"];
      s.right.y = 40;
      aim(s, s.right.x - BS - 1, 2);
      s.ball.y = 45;
      expect(step(s, idle, never)).toContain("stick");
      for (let i = 0; i < CPU_SLIME_HOLD - 1; i++) step(s, idle, never);
      expect(s.ball.stuck).not.toBeNull();
      step(s, idle, never);
      expect(s.ball.stuck).toBeNull();
      expect(s.ball.vx).toBeLessThan(0);
    });
  });

  describe("turn", () => {
    it("does nothing without the upgrade", () => {
      const s = rally();
      step(s, { ...idle, leftTurn: 1 }, never);
      expect(s.left.tilt).toBe(0);
    });

    it("tilts 45 degrees per press, at most one step each way", () => {
      const s = rally();
      s.left.upgrades = ["turn"];
      step(s, { ...idle, leftTurn: 1 }, never);
      expect(s.left.tilt).toBe(1);
      step(s, { ...idle, leftTurn: 1 }, never);
      expect(s.left.tilt).toBe(1);
      step(s, { ...idle, leftTurn: -1 }, never);
      step(s, { ...idle, leftTurn: -1 }, never);
      expect(s.left.tilt).toBe(-1);
    });

    it("sends the ball off at 45 degrees in the direction of the tilt", () => {
      for (const tilt of [-1, 1] as const) {
        const s = rally();
        s.left.upgrades = ["turn"];
        s.left.tilt = tilt;
        s.left.y = 60;
        aim(s, s.left.x + PW + 6, -2);
        s.ball.y = 60 + PH / 2 - BS / 2;
        for (let i = 0; i < 5 && s.ball.vx < 0; i++) step(s, idle, never);
        expect(s.ball.vx).toBeGreaterThan(0);
        expect(s.ball.vy).toBeCloseTo(tilt * s.ball.vx);
      }
    });

    it("bounces off the slanted face, not the upright one", () => {
      const s = rally();
      s.left.upgrades = ["turn"];
      s.left.tilt = 1; // top leans toward the court
      s.left.y = 60;
      aim(s, s.left.x + PW + 8, -2);
      s.ball.y = 60; // level with the paddle's upper end
      for (let i = 0; i < 10 && s.ball.vx < 0; i++) step(s, idle, never);
      expect(s.ball.vx).toBeGreaterThan(0);
      expect(s.ball.x).toBeGreaterThan(s.left.x + PW);
    });
  });

  describe("cannon", () => {
    function armed(): PongState {
      const s = rally();
      s.left.upgrades = ["sizeUp", "cannon"];
      s.left.y = 60;
      s.right.y = 10; // out of the shot's path
      aim(s, net, 1);
      return s;
    }

    it("fires a straight shot and uses up the upgrade", () => {
      const s = armed();
      expect(step(s, { ...idle, leftFire: true }, never)).toContain("fire");
      expect(s.left.upgrades).toEqual(["sizeUp"]);
      expect(s.shots).toHaveLength(1);
      const shot = s.shots[0];
      expect(shot.vx).toBeGreaterThan(0);
      expect(shot.y + SHOT_SIZE / 2).toBeCloseTo(s.left.y + paddleHeight(s.left) / 2);
      const y = shot.y;
      step(s, idle, never);
      expect(s.shots[0].y).toBe(y);
    });

    it("does nothing without the upgrade", () => {
      const s = rally();
      expect(step(s, { ...idle, leftFire: true }, never)).not.toContain("fire");
      expect(s.shots).toHaveLength(0);
    });

    it("scores a point when the shot gets past the other paddle", () => {
      const s = armed();
      step(s, { ...idle, leftFire: true }, never);
      const events: string[] = [];
      for (let i = 0; i < 200 && s.shots.length > 0; i++) {
        s.ball.live = false; // keep the main ball out of the way
        s.serveTimer = 99;
        events.push(...step(s, idle, never));
      }
      expect(s.shots).toHaveLength(0);
      expect(events).toContain("score");
      expect(s.left.score).toBe(1);
    });

    it("dissolves on the other paddle without bouncing back", () => {
      const s = armed();
      s.right.y = s.left.y;
      step(s, { ...idle, leftFire: true }, never);
      const events: string[] = [];
      for (let i = 0; i < 200 && s.shots.length > 0; i++) {
        s.ball.live = false;
        s.serveTimer = 99;
        events.push(...step(s, idle, never));
      }
      expect(events).toContain("dissolve");
      expect(events).not.toContain("score");
      expect(s.left.score).toBe(0);
    });

    it("lets go of a slimed ball instead of firing", () => {
      const s = rally();
      s.left.upgrades = ["slime", "cannon"];
      s.left.y = 40;
      aim(s, s.left.x + PW + 1, -2);
      s.ball.y = 45;
      step(s, idle, never);
      const events = step(s, { ...idle, leftRelease: true, leftFire: true }, never);
      expect(events).toContain("paddle");
      expect(events).not.toContain("fire");
      expect(s.left.upgrades).toContain("cannon");
    });

    it("the CPU fires while the ball heads back to the player", () => {
      const s = rally(false);
      s.right.upgrades = ["cannon"];
      aim(s, W / 2, -2);
      expect(step(s, idle, always)).toContain("fire");
      expect(s.right.upgrades).toEqual([]);
      expect(s.shots[0].vx).toBeLessThan(0);
    });
  });
});

describe("miss streak", () => {
  const pastRight = (s: PongState) => {
    s.ball.live = true;
    aim(s, W - 1, 2);
    step(s, { left: 0, right: 0 }, never);
  };
  const pastLeft = (s: PongState) => {
    s.ball.live = true;
    aim(s, -BS, -2);
    step(s, { left: 0, right: 0 }, never);
  };

  it("loses all upgrades after 3 misses in a row", () => {
    const s = rally();
    s.right.upgrades = ["slime", "sizeUp"];
    pastRight(s);
    pastRight(s);
    expect(s.right.upgrades).toHaveLength(2);
    pastRight(s);
    expect(s.right.upgrades).toEqual([]);
  });

  it("resets the streak when the other side misses", () => {
    const s = rally();
    s.right.upgrades = ["slime"];
    pastRight(s);
    pastRight(s);
    pastLeft(s);
    pastRight(s);
    expect(s.right.upgrades).toEqual(["slime"]);
  });
});
