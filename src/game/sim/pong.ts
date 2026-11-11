export const W = 200;
export const H = 150;
export const PW = 3;
export const PH = 16;
export const BS = 6;
export const TOP_GAP = 6;
export const WIN = 5;
export const P_SPEED = 2.5;
// The CPU starts out slow and sloppy, then sharpens up as you score against it.
export const AI_SPEED_MIN = 1.0;
export const AI_SPEED_MAX = 1.6;
// Fully sharp by the time the player is one point from winning.
export const AI_LEARN_POINTS = WIN - 1;
export const SPEEDS = [1.5, 2.0, 2.6] as const;
export const VY = [-3, -2, -1, 0, 0, 1, 2, 3] as const;
export const SERVE_DELAY = 60;
/** Chance an ordinary ball turns into an upgrade ball the first time it crosses the net in a rally. */
export const UPGRADE_CHANCE = 0.5;
/** Most upgrades a side can hold. Once full, scoring with an upgrade ball is a normal point. */
export const MAX_UPGRADES = 3;
/** Each strength boost a paddle holds makes its hits this much faster (stacks additively). */
export const STRENGTH_BOOST_STEP = 1 / 3;
/** Each speed boost a paddle holds makes the paddle itself move this much faster (stacks). */
export const SPEED_BOOST_STEP = 1 / 3;
/** Each size up makes the paddle this many field pixels longer (stacks). */
export const SIZE_UP_PX = 3;
/** Frames the CPU holds a slimed ball before letting go. */
export const CPU_SLIME_HOLD = 30;
/** How far a turn upgrade tilts the paddle, per key press, in radians. */
export const TILT_ANGLE = Math.PI / 4;
/** Size of a cannon shot, in field pixels. */
export const SHOT_SIZE = 4;
/** How fast a cannon shot flies (field pixels per frame). */
export const SHOT_SPEED = SPEEDS[2];
/** Chance per frame that a CPU holding a cannon fires while the ball heads away from it. */
export const CPU_FIRE_CHANCE = 1 / 90;

export type Dir = -1 | 0 | 1;
export type Phase = "attract" | "play" | "over";
export type SimEvent =
  "paddle" | "wall" | "score" | "transform" | "upgrade" | "stick" | "fire" | "dissolve";
export const UPGRADES = [
  "strengthBoost",
  "speedBoost",
  "sizeUp",
  "slime",
  "turn",
  "cannon",
] as const;
export type Upgrade = (typeof UPGRADES)[number];
export type Side = "left" | "right";
export type Rng = () => number;

export interface Paddle {
  x: number;
  y: number;
  score: number;
  /** Upgrades held, at most MAX_UPGRADES; they stack. */
  upgrades: Upgrade[];
  /** With the turn upgrade: -1 tilted anticlockwise, 0 upright, 1 tilted clockwise. */
  tilt: Dir;
}

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  live: boolean;
  /** Scoring with an upgrade ball grants this upgrade instead of a point. */
  upgrade: Upgrade | null;
  /** Whether the ball has already crossed the net (and rolled for a transform) this rally. */
  crossedNet: boolean;
  /** Set while the ball is stuck to a slimed paddle. */
  stuck: { side: Side; offset: number; cpuTimer: number } | null;
}

/** A cannon shot: flies straight across, scores if it gets past, dissolves on a paddle. */
export interface Shot {
  x: number;
  y: number;
  vx: number;
  /** Who fired it. */
  side: Side;
}

export interface PongState {
  left: Paddle;
  right: Paddle;
  ball: Ball;
  shots: Shot[];
  hits: number;
  serveDir: -1 | 1;
  serveTimer: number;
  phase: Phase;
  twoPlayer: boolean;
  aiAim: number;
}

export interface PongInput {
  left: Dir;
  right: Dir;
  /** One-frame presses: tilt the paddle (turn upgrade). */
  leftTurn?: Dir;
  rightTurn?: Dir;
  /** One-frame presses: let go of a slimed ball. */
  leftRelease?: boolean;
  rightRelease?: boolean;
  /** One-frame presses: fire the cannon (ignored while the ball is stuck to that paddle). */
  leftFire?: boolean;
  rightFire?: boolean;
}

const midY = (H - PH) / 2;

export const clampPaddle = (y: number, h = PH): number => Math.max(TOP_GAP, Math.min(H - h, y));

export const upgradeCount = (paddle: Paddle, upgrade: Upgrade): number =>
  paddle.upgrades.filter((u) => u === upgrade).length;

export const paddleHeight = (paddle: Paddle): number =>
  PH + SIZE_UP_PX * upgradeCount(paddle, "sizeUp");

export const paddleSpeedBoost = (paddle: Paddle): number =>
  1 + SPEED_BOOST_STEP * upgradeCount(paddle, "speedBoost");

/** x of the paddle's centre line at height y, or null when the paddle doesn't reach that far. */
export function paddleLineX(paddle: Paddle, y: number): number | null {
  const h = paddleHeight(paddle);
  const angle = paddle.tilt * TILT_ANGLE;
  const cy = paddle.y + h / 2;
  if (Math.abs(y - cy) > (h / 2) * Math.cos(angle) + BS / 2) return null;
  return paddle.x + PW / 2 - (y - cy) * Math.tan(angle);
}

function centreBall(ball: Ball): void {
  ball.live = false;
  ball.upgrade = null;
  ball.crossedNet = false;
  ball.stuck = null;
  ball.x = (W - BS) / 2;
  ball.y = (H - BS) / 2;
}

export function createState(rng: Rng): PongState {
  const ball: Ball = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    live: false,
    upgrade: null,
    crossedNet: false,
    stuck: null,
  };
  centreBall(ball);
  return {
    left: { x: 10, y: midY, score: 0, upgrades: [], tilt: 0 },
    right: { x: W - 10 - PW, y: midY, score: 0, upgrades: [], tilt: 0 },
    ball,
    shots: [],
    hits: 0,
    serveDir: rng() < 0.5 ? -1 : 1,
    serveTimer: 0,
    phase: "attract",
    twoPlayer: false,
    aiAim: 0,
  };
}

/** Upgrades each side begins a game with (normally none; see the debug flags). */
export type StartingUpgrades = Partial<Record<Side, Upgrade[]>>;

export function newGame(state: PongState, twoPlayer: boolean, start: StartingUpgrades = {}): void {
  state.left.score = 0;
  state.right.score = 0;
  for (const side of ["left", "right"] as const) {
    state[side].upgrades = (start[side] ?? []).slice(0, MAX_UPGRADES);
    state[side].tilt = 0;
  }
  state.left.y = midY;
  state.right.y = midY;
  state.twoPlayer = twoPlayer;
  state.phase = "play";
  state.serveTimer = SERVE_DELAY;
  state.shots = [];
  centreBall(state.ball);
}

/** Which side has reached WIN points, if any. */
export function winner(state: PongState): "left" | "right" | null {
  if (state.left.score >= WIN) return "left";
  if (state.right.score >= WIN) return "right";
  return null;
}

export function ballSpeed(hits: number): number {
  if (hits >= 12) return SPEEDS[2];
  if (hits >= 4) return SPEEDS[1];
  return SPEEDS[0];
}

export function segmentOf(ballY: number, paddleY: number, h = PH): number {
  return Math.max(0, Math.min(7, Math.floor((ballY + BS / 2 - paddleY) / (h / 8))));
}

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** CPU skill from 0 (fresh game) to 1, rising with each point the player wins. */
export const cpuSkill = (state: PongState): number =>
  Math.min(1, state.left.score / AI_LEARN_POINTS);

export const cpuSpeed = (state: PongState): number =>
  lerp(AI_SPEED_MIN, AI_SPEED_MAX, cpuSkill(state)) * paddleSpeedBoost(state.right);

// A clumsy CPU aims anywhere within ±(PH / 2 + 3), so it sometimes whiffs.
const newAim = (state: PongState, rng: Rng): number =>
  (rng() - 0.5) * lerp(PH + 6, PH - 4, cpuSkill(state));

function serve(state: PongState, rng: Rng): void {
  const { ball } = state;
  state.hits = 0;
  ball.x = (W - BS) / 2;
  ball.y = 20 + rng() * (H - 40);
  ball.vx = SPEEDS[0] * state.serveDir;
  ball.vy = VY[1 + Math.floor(rng() * 6)] * 0.5;
  ball.live = true;
  cpuRethink(state, rng);
}

/** The CPU picks a new aim, and a new tilt if it can turn. */
function cpuRethink(state: PongState, rng: Rng): void {
  state.aiAim = newAim(state, rng);
  if (!state.twoPlayer && upgradeCount(state.right, "turn") > 0) {
    state.right.tilt = (Math.floor(rng() * 3) - 1) as Dir;
  }
}

/** Speed multiplier for balls this paddle hits. */
export const strengthBoost = (paddle: Paddle): number =>
  1 + STRENGTH_BOOST_STEP * paddle.upgrades.filter((u) => u === "strengthBoost").length;

function hitPaddle(state: PongState, paddle: Paddle, dir: -1 | 1, rng: Rng): void {
  const { ball } = state;
  state.hits++;
  const boost = strengthBoost(paddle);
  ball.vx = ballSpeed(state.hits) * dir * boost;
  // A tilted paddle sends the ball off at 45 degrees; upright, the 8 segments pick the angle.
  ball.vy =
    paddle.tilt !== 0
      ? paddle.tilt * dir * Math.abs(ball.vx)
      : VY[segmentOf(ball.y, paddle.y, paddleHeight(paddle))] * 0.5 * boost;
  if (dir < 0) cpuRethink(state, rng);
}

/** Front face of a paddle (the side the ball bounces off) at the ball's height. */
function faceX(paddle: Paddle, side: Side, ballY: number): number | null {
  const line = paddleLineX(paddle, ballY + BS / 2);
  if (line === null) return null;
  return side === "left" ? line + PW / 2 : line - PW / 2 - BS;
}

/** Ball meets a paddle: bounce it, or catch it on slime. */
function contact(state: PongState, side: Side, face: number, rng: Rng): SimEvent {
  const { ball } = state;
  const paddle = state[side];
  ball.x = face;
  if (upgradeCount(paddle, "slime") > 0) {
    const cpu = side === "right" && !state.twoPlayer;
    ball.stuck = { side, offset: ball.y - paddle.y, cpuTimer: cpu ? CPU_SLIME_HOLD : -1 };
    ball.vx = 0;
    ball.vy = 0;
    return "stick";
  }
  hitPaddle(state, paddle, side === "left" ? 1 : -1, rng);
  return "paddle";
}

/** Carries a slimed ball with its paddle; returns true once it is let go. */
function holdStuckBall(state: PongState, input: PongInput, rng: Rng): boolean {
  const { ball } = state;
  const stuck = ball.stuck!;
  const paddle = state[stuck.side];
  ball.y = Math.max(0, Math.min(H - BS, paddle.y + stuck.offset));
  ball.x = faceX(paddle, stuck.side, ball.y) ?? ball.x;
  const release = stuck.side === "left" ? input.leftRelease : input.rightRelease;
  if (stuck.cpuTimer > 0) stuck.cpuTimer--;
  if (!release && stuck.cpuTimer !== 0) return false;
  ball.stuck = null;
  hitPaddle(state, paddle, stuck.side === "left" ? 1 : -1, rng);
  return true;
}

function turnPaddle(paddle: Paddle, turn: Dir | undefined): void {
  if (!turn || upgradeCount(paddle, "turn") === 0) return;
  paddle.tilt = Math.max(-1, Math.min(1, paddle.tilt + turn)) as Dir;
}

function moveCpu(state: PongState): void {
  const { ball, right } = state;
  // A slow CPU reacts late: it waits until the ball is well across the net.
  const reactX = W * lerp(0.6, 0.3, cpuSkill(state));
  const tracking = ball.live && ball.vx > 0 && ball.x > reactX;
  const h = paddleHeight(right);
  const target = tracking ? ball.y + BS / 2 - h / 2 + state.aiAim : (H - h) / 2;
  const diff = target - right.y;
  if (Math.abs(diff) > 1) {
    right.y = clampPaddle(right.y + Math.sign(diff) * Math.min(cpuSpeed(state), Math.abs(diff)), h);
  }
}

/** Fires a cannon shot straight ahead from the paddle, using up one cannon upgrade. */
function fireCannon(state: PongState, side: Side): boolean {
  const paddle = state[side];
  const i = paddle.upgrades.indexOf("cannon");
  if (i < 0) return false;
  paddle.upgrades.splice(i, 1);
  const dir = side === "left" ? 1 : -1;
  const y = paddle.y + paddleHeight(paddle) / 2 - SHOT_SIZE / 2;
  const x = side === "left" ? paddle.x + PW : paddle.x - SHOT_SIZE;
  state.shots.push({ x, y, vx: SHOT_SPEED * dir, side });
  return true;
}

/** Moves the cannon shots: a shot dissolves on the other paddle, or scores if it gets past. */
function moveShots(state: PongState, events: SimEvent[]): void {
  state.shots = state.shots.filter((shot) => {
    const prevX = shot.x;
    shot.x += shot.vx;
    const target = shot.side === "left" ? state.right : state.left;
    const line = paddleLineX(target, shot.y + SHOT_SIZE / 2);
    if (line !== null) {
      const face = shot.vx > 0 ? line - PW / 2 - SHOT_SIZE : line + PW / 2;
      const crossed = shot.vx > 0 ? prevX <= face && shot.x > face : prevX >= face && shot.x < face;
      if (crossed) {
        events.push("dissolve");
        return false;
      }
    }
    if (shot.x > W || shot.x + SHOT_SIZE < 0) {
      state[shot.side].score++;
      events.push("score");
      if (winner(state) !== null) state.phase = "over";
      return false;
    }
    return true;
  });
}

/** A CPU holding a cannon now and then fires while the ball is heading back to the player. */
function cpuWantsToFire(state: PongState, rng: Rng): boolean {
  const { ball } = state;
  if (state.twoPlayer || upgradeCount(state.right, "cannon") === 0) return false;
  if (!ball.live || ball.stuck || ball.vx >= 0) return false;
  return rng() < CPU_FIRE_CHANCE;
}

export function step(state: PongState, input: PongInput, rng: Rng): SimEvent[] {
  const events: SimEvent[] = [];
  const { left, right, ball } = state;

  const move = (paddle: Paddle, dir: Dir) =>
    clampPaddle(paddle.y + dir * P_SPEED * paddleSpeedBoost(paddle), paddleHeight(paddle));
  left.y = move(left, input.left);
  turnPaddle(left, input.leftTurn);
  if (state.twoPlayer) {
    right.y = move(right, input.right);
    turnPaddle(right, input.rightTurn);
  } else if (state.phase !== "over") moveCpu(state);

  if (state.phase !== "play") return events;

  // Space (or Enter) lets go of a slimed ball first; otherwise it fires the cannon.
  const leftFire = input.leftFire && ball.stuck?.side !== "left";
  const rightFire = state.twoPlayer
    ? input.rightFire && ball.stuck?.side !== "right"
    : cpuWantsToFire(state, rng);
  if (leftFire && fireCannon(state, "left")) events.push("fire");
  if (rightFire && fireCannon(state, "right")) events.push("fire");
  moveShots(state, events);
  if (state.phase !== "play") return events;

  if (!ball.live) {
    state.serveTimer--;
    if (state.serveTimer <= 0) serve(state, rng);
    return events;
  }
  if (ball.stuck) {
    if (holdStuckBall(state, input, rng)) events.push("paddle");
    return events;
  }

  const prevX = ball.x;
  const prevY = ball.y;
  ball.x += ball.vx;
  ball.y += ball.vy;

  const net = (W - BS) / 2;
  const crossedNet = (prevX < net && ball.x >= net) || (prevX > net && ball.x <= net);
  if (crossedNet && !ball.crossedNet) {
    ball.crossedNet = true;
    if (ball.upgrade === null && rng() < UPGRADE_CHANCE) {
      ball.upgrade = UPGRADES[Math.floor(rng() * UPGRADES.length)];
      events.push("transform");
    }
  }

  if (ball.y < 0) {
    ball.y = -ball.y;
    ball.vy = -ball.vy;
    events.push("wall");
  } else if (ball.y > H - BS) {
    ball.y = 2 * (H - BS) - ball.y;
    ball.vy = -ball.vy;
    events.push("wall");
  }

  // The ball hits a paddle when it passes the paddle's face (which slopes when tilted).
  const leftFace = faceX(left, "left", ball.y);
  const rightFace = faceX(right, "right", ball.y);
  const leftWas = faceX(left, "left", prevY);
  const rightWas = faceX(right, "right", prevY);
  if (ball.vx < 0 && leftFace !== null && prevX >= (leftWas ?? leftFace) && ball.x < leftFace) {
    events.push(contact(state, "left", leftFace, rng));
  } else if (
    ball.vx > 0 &&
    rightFace !== null &&
    prevX <= (rightWas ?? rightFace) &&
    ball.x > rightFace
  ) {
    events.push(contact(state, "right", rightFace, rng));
  }

  if (ball.x + BS < 0 || ball.x > W) {
    const leftScored = ball.x > W;
    const scorer = leftScored ? left : right;
    if (ball.upgrade !== null && scorer.upgrades.length < MAX_UPGRADES) {
      scorer.upgrades.push(ball.upgrade);
      events.push("upgrade");
    } else {
      scorer.score++;
      events.push("score");
    }
    state.serveDir = leftScored ? 1 : -1;
    centreBall(ball);
    if (winner(state) !== null) state.phase = "over";
    else state.serveTimer = SERVE_DELAY;
  }

  return events;
}
