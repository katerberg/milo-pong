import Phaser from "phaser";
import ballUpgradeUrl from "../../assets/play/ball-upgrade.png";
import ballUrl from "../../assets/play/ball.png";
import { sfx } from "../audio/beep";
import { makeSketchTextures, NET_KEY, NET_X, PAD, PADDLE_KEY } from "./sketch";
import { BS, createState, newGame, step, W, H, type Dir, type PongState } from "../sim/pong";

const STEP_MS = 1000 / 60;

/** The game renders at ZOOM x the 200 x 150 field so the title art stays smooth. */
export const ZOOM = 4;

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

/** Size of the held-upgrade marker under each score, in field pixels. */
const BADGE = 8;

export class PlayScene extends Phaser.Scene {
  private state!: PongState;
  private gfx!: Phaser.GameObjects.Graphics;
  private ball!: Phaser.GameObjects.Image;
  private paddles!: { left: Phaser.GameObjects.Image; right: Phaser.GameObjects.Image };
  private badges!: { left: Phaser.GameObjects.Image; right: Phaser.GameObjects.Image };
  private keys!: Keys;
  private acc = 0;
  private readonly rng = () => Math.random();

  constructor() {
    super("PlayScene");
  }

  preload(): void {
    this.load.image("ball", ballUrl);
    this.load.image("ball-upgrade", ballUpgradeUrl);
  }

  create(data: { start?: boolean } = {}): void {
    this.state = createState(this.rng);
    if (data.start) newGame(this.state, false);
    this.cameras.main.setZoom(ZOOM).centerOn(W / 2, H / 2);
    makeSketchTextures(this, ZOOM);
    this.add
      .image(NET_X, 0, NET_KEY)
      .setOrigin(0)
      .setScale(1 / ZOOM);
    this.gfx = this.add.graphics();
    const paddle = () =>
      this.add
        .image(0, 0, PADDLE_KEY)
        .setOrigin(0)
        .setScale(1 / ZOOM);
    this.paddles = { left: paddle(), right: paddle().setFlipX(true) };
    this.ball = this.add.image(0, 0, "ball").setOrigin(0).setDisplaySize(BS, BS);
    const badge = (x: number) =>
      this.add.image(x, 26, "ball-upgrade").setOrigin(0.5, 0).setDisplaySize(BADGE, BADGE);
    this.badges = { left: badge(W / 2 - 24), right: badge(W / 2 + 24) };
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
    this.number(left.score, W / 2 - 30, 6);
    this.number(right.score, W / 2 + 18, 6);
    this.paddles.left.setPosition(left.x - PAD, Math.round(left.y) - PAD);
    this.paddles.right.setPosition(right.x - PAD, Math.round(right.y) - PAD);
    this.ball
      .setVisible(phase === "play" && ball.live)
      .setTexture(ball.upgrade === null ? "ball" : "ball-upgrade")
      .setDisplaySize(BS, BS)
      .setPosition(ball.x, ball.y);
    this.badges.left.setVisible(left.upgrade !== null);
    this.badges.right.setVisible(right.upgrade !== null);
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
