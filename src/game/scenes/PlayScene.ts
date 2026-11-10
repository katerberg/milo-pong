import Phaser from "phaser";
import { sfx } from "../audio/beep";
import {
  BS,
  createState,
  newGame,
  PH,
  PW,
  step,
  W,
  H,
  type Dir,
  type PongState,
} from "../sim/pong";

const STEP_MS = 1000 / 60;

const DIGITS = [
  "11111001100110011111",
  "00100010001000100010",
  "11110001111110001111",
  "11110001111100011111",
  "10011001111100010001",
  "11111000111100011111",
  "11111000111110011111",
  "11110001000100010001",
  "11111001111110011111",
  "11111001111100011111",
];

type Keys = Record<"w" | "s" | "up" | "down", Phaser.Input.Keyboard.Key>;

export class PlayScene extends Phaser.Scene {
  private state!: PongState;
  private gfx!: Phaser.GameObjects.Graphics;
  private keys!: Keys;
  private acc = 0;
  private readonly rng = () => Math.random();

  constructor() {
    super("PlayScene");
  }

  create(data: { start?: boolean } = {}): void {
    this.state = createState(this.rng);
    if (data.start) newGame(this.state, false);
    this.gfx = this.add.graphics();
    const keyboard = this.input.keyboard!;
    this.keys = keyboard.addKeys({ w: "W", s: "S", up: "UP", down: "DOWN" }) as Keys;
    keyboard.addCapture("UP,DOWN,SPACE");
    keyboard.on("keydown-ONE", () => newGame(this.state, false));
    keyboard.on("keydown-TWO", () => newGame(this.state, true));
    keyboard.on("keydown-SPACE", () => {
      if (this.state.phase !== "play") newGame(this.state, false);
    });
  }

  update(_time: number, delta: number): void {
    this.acc += Math.min(250, delta);
    while (this.acc >= STEP_MS) {
      this.tick();
      this.acc -= STEP_MS;
    }
    this.draw();
  }

  private tick(): void {
    const { w, s, up, down } = this.keys;
    const axis = (neg: boolean, pos: boolean): Dir => ((pos ? 1 : 0) - (neg ? 1 : 0)) as Dir;
    const two = this.state.twoPlayer;
    const input = {
      left: axis(w.isDown || (!two && up.isDown), s.isDown || (!two && down.isDown)),
      right: axis(up.isDown, down.isDown),
    };
    for (const event of step(this.state, input, this.rng)) sfx[event]();
  }

  private draw(): void {
    const g = this.gfx;
    const { left, right, ball, phase } = this.state;
    g.clear();
    g.fillStyle(0xffffff);
    for (let y = 0; y < H; y += 8) g.fillRect(W / 2 - 1, y, 2, 4);
    this.number(left.score, W / 2 - 30, 6);
    this.number(right.score, W / 2 + 18, 6);
    g.fillRect(left.x, Math.round(left.y), PW, PH);
    g.fillRect(right.x, Math.round(right.y), PW, PH);
    if (phase === "play" && ball.live) g.fillRect(Math.round(ball.x), Math.round(ball.y), BS, BS);
  }

  private number(n: number, x: number, y: number): void {
    if (n >= 10) this.digit(Math.floor(n / 10), x - 15, y);
    this.digit(n % 10, x, y);
  }

  private digit(n: number, x: number, y: number): void {
    const s = 3;
    const glyph = DIGITS[n];
    for (let i = 0; i < 20; i++) {
      if (glyph[i] === "1") this.gfx.fillRect(x + (i % 4) * s, y + Math.floor(i / 4) * s, s, s);
    }
  }
}
