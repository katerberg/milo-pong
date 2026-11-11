export const W = 200;
export const H = 150;
export const PW = 3;
export const PH = 16;
export const BS = 6;
export const TOP_GAP = 6;
export const WIN = 11;
export const P_SPEED = 2.5;
// The CPU starts out slow and sloppy, then sharpens up as you score against it.
export const AI_SPEED_MIN = 1.0;
export const AI_SPEED_MAX = 1.6;
export const AI_LEARN_POINTS = 6;
export const SPEEDS = [1.5, 2.0, 2.6] as const;
export const VY = [-3, -2, -1, 0, 0, 1, 2, 3] as const;
export const SERVE_DELAY = 60;

export type Dir = -1 | 0 | 1;
export type Phase = "attract" | "play" | "over";
export type SimEvent = "paddle" | "wall" | "score";
export type Rng = () => number;

export interface Paddle {
  x: number;
  y: number;
  score: number;
}

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  live: boolean;
}

export interface PongState {
  left: Paddle;
  right: Paddle;
  ball: Ball;
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
}

const midY = (H - PH) / 2;

export const clampPaddle = (y: number): number => Math.max(TOP_GAP, Math.min(H - PH, y));

function centreBall(ball: Ball): void {
  ball.live = false;
  ball.x = (W - BS) / 2;
  ball.y = (H - BS) / 2;
}

export function createState(rng: Rng): PongState {
  const ball: Ball = { x: 0, y: 0, vx: 0, vy: 0, live: false };
  centreBall(ball);
  return {
    left: { x: 10, y: midY, score: 0 },
    right: { x: W - 10 - PW, y: midY, score: 0 },
    ball,
    hits: 0,
    serveDir: rng() < 0.5 ? -1 : 1,
    serveTimer: 0,
    phase: "attract",
    twoPlayer: false,
    aiAim: 0,
  };
}

export function newGame(state: PongState, twoPlayer: boolean): void {
  state.left.score = 0;
  state.right.score = 0;
  state.left.y = midY;
  state.right.y = midY;
  state.twoPlayer = twoPlayer;
  state.phase = "play";
  state.serveTimer = SERVE_DELAY;
  centreBall(state.ball);
}

export function ballSpeed(hits: number): number {
  if (hits >= 12) return SPEEDS[2];
  if (hits >= 4) return SPEEDS[1];
  return SPEEDS[0];
}

export function segmentOf(ballY: number, paddleY: number): number {
  return Math.max(0, Math.min(7, Math.floor((ballY + BS / 2 - paddleY) / (PH / 8))));
}

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** CPU skill from 0 (fresh game) to 1, rising with each point the player wins. */
export const cpuSkill = (state: PongState): number =>
  Math.min(1, state.left.score / AI_LEARN_POINTS);

export const cpuSpeed = (state: PongState): number =>
  lerp(AI_SPEED_MIN, AI_SPEED_MAX, cpuSkill(state));

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
  state.aiAim = newAim(state, rng);
}

function hitPaddle(state: PongState, paddle: Paddle, dir: -1 | 1, rng: Rng): void {
  const { ball } = state;
  state.hits++;
  ball.vx = ballSpeed(state.hits) * dir;
  ball.vy = VY[segmentOf(ball.y, paddle.y)] * 0.5;
  if (dir < 0) state.aiAim = newAim(state, rng);
}

function moveCpu(state: PongState): void {
  const { ball, right } = state;
  // A slow CPU reacts late: it waits until the ball is well across the net.
  const reactX = W * lerp(0.6, 0.3, cpuSkill(state));
  const tracking = ball.live && ball.vx > 0 && ball.x > reactX;
  const target = tracking ? ball.y + BS / 2 - PH / 2 + state.aiAim : midY;
  const diff = target - right.y;
  if (Math.abs(diff) > 1) {
    right.y = clampPaddle(right.y + Math.sign(diff) * Math.min(cpuSpeed(state), Math.abs(diff)));
  }
}

export function step(state: PongState, input: PongInput, rng: Rng): SimEvent[] {
  const events: SimEvent[] = [];
  const { left, right, ball } = state;

  left.y = clampPaddle(left.y + input.left * P_SPEED);
  if (state.twoPlayer) right.y = clampPaddle(right.y + input.right * P_SPEED);
  else if (state.phase !== "over") moveCpu(state);

  if (state.phase !== "play") return events;
  if (!ball.live) {
    state.serveTimer--;
    if (state.serveTimer <= 0) serve(state, rng);
    return events;
  }

  const prevX = ball.x;
  ball.x += ball.vx;
  ball.y += ball.vy;

  if (ball.y < 0) {
    ball.y = -ball.y;
    ball.vy = -ball.vy;
    events.push("wall");
  } else if (ball.y > H - BS) {
    ball.y = 2 * (H - BS) - ball.y;
    ball.vy = -ball.vy;
    events.push("wall");
  }

  const overlaps = (p: Paddle) => ball.y + BS > p.y && ball.y < p.y + PH;
  if (ball.vx < 0 && prevX >= left.x + PW && ball.x < left.x + PW && overlaps(left)) {
    ball.x = left.x + PW;
    hitPaddle(state, left, 1, rng);
    events.push("paddle");
  } else if (ball.vx > 0 && prevX + BS <= right.x && ball.x + BS > right.x && overlaps(right)) {
    ball.x = right.x - BS;
    hitPaddle(state, right, -1, rng);
    events.push("paddle");
  }

  if (ball.x + BS < 0 || ball.x > W) {
    const leftScored = ball.x > W;
    (leftScored ? left : right).score++;
    state.serveDir = leftScored ? 1 : -1;
    events.push("score");
    centreBall(ball);
    if (left.score >= WIN || right.score >= WIN) state.phase = "over";
    else state.serveTimer = SERVE_DELAY;
  }

  return events;
}
