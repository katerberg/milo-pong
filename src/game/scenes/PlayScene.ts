import Phaser from "phaser";
import ballCannonUrl from "../../assets/play/ball-cannon.png";
import ballSizeUrl from "../../assets/play/ball-size.png";
import ballSlimeUrl from "../../assets/play/ball-slime.png";
import ballSpeedUrl from "../../assets/play/ball-speed.png";
import ballStrengthUrl from "../../assets/play/ball-strength.png";
import ballTurnUrl from "../../assets/play/ball-turn.png";
import ballUrl from "../../assets/play/ball.png";
import { sfx } from "../audio/beep";
import { startingUpgradesFromUrl } from "../sim/debugFlags";
import type { EndData } from "./EndScene";
import {
  makeSketchTextures,
  NET_KEY,
  NET_X,
  PAD,
  paddleTexture,
  paddleTextureWidth,
} from "./sketch";
import {
  BS,
  createState,
  newGame,
  paddleHeight,
  PW,
  SHOT_SIZE,
  step,
  TILT_ANGLE,
  upgradeCount,
  W,
  winner,
  H,
  MAX_UPGRADES,
  type Dir,
  type Paddle,
  type PongState,
  type Upgrade,
} from "../sim/pong";

/** Hand-drawn ball art for each upgrade the ball can turn into. */
const UPGRADE_BALLS: Record<Upgrade, { key: string; url: string }> = {
  strengthBoost: { key: "ball-strength", url: ballStrengthUrl },
  speedBoost: { key: "ball-speed", url: ballSpeedUrl },
  sizeUp: { key: "ball-size", url: ballSizeUrl },
  slime: { key: "ball-slime", url: ballSlimeUrl },
  turn: { key: "ball-turn", url: ballTurnUrl },
  cannon: { key: "ball-cannon", url: ballCannonUrl },
};

const STEP_MS = 1000 / 60;
/** Pause on the final score before switching to the win or loss screen. */
const END_DELAY_MS = 1200;

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

/**
 * One-shot presses, queued from keydown events so quick taps between frames aren't lost.
 * The action key (Space / Enter) lets go of a slimed ball, or else fires the cannon.
 */
type Presses = { leftTurn: number; rightTurn: number; leftAction: boolean; rightAction: boolean };
const noPresses = (): Presses => ({
  leftTurn: 0,
  rightTurn: 0,
  leftAction: false,
  rightAction: false,
});

/** Size of each held-upgrade marker under a score, in field pixels. */
const BADGE = 7;
const BADGE_GAP = 1;

export class PlayScene extends Phaser.Scene {
  private state!: PongState;
  private gfx!: Phaser.GameObjects.Graphics;
  private ball!: Phaser.GameObjects.Image;
  private paddles!: { left: Phaser.GameObjects.Image; right: Phaser.GameObjects.Image };
  private shots: Phaser.GameObjects.Image[] = [];
  private badges!: { left: Phaser.GameObjects.Image[]; right: Phaser.GameObjects.Image[] };
  private keys!: Keys;
  private presses = noPresses();
  private acc = 0;
  private ending = false;
  private readonly rng = () => Math.random();
  /** Debug: upgrades to start each game with, from `?upgrades=` / `?cpuUpgrades=`. */
  private readonly startUpgrades = startingUpgradesFromUrl(location.search);

  constructor() {
    super("PlayScene");
  }

  preload(): void {
    this.load.image("ball", ballUrl);
    for (const { key, url } of Object.values(UPGRADE_BALLS)) this.load.image(key, url);
  }

  create(data: { start?: boolean; twoPlayer?: boolean } = {}): void {
    this.state = createState(this.rng);
    this.acc = 0;
    this.ending = false;
    if (data.start) newGame(this.state, data.twoPlayer ?? false, this.startUpgrades);
    this.cameras.main.setZoom(ZOOM).centerOn(W / 2, H / 2);
    makeSketchTextures(this, ZOOM);
    this.add
      .image(NET_X, 0, NET_KEY)
      .setOrigin(0)
      .setScale(1 / ZOOM);
    this.gfx = this.add.graphics();
    // Centre origin so a turned paddle rotates about its middle.
    const paddle = () =>
      this.add
        .image(0, 0, paddleTexture(this, ZOOM, paddleHeight(this.state.left), false))
        .setScale(1 / ZOOM);
    this.paddles = { left: paddle(), right: paddle().setFlipX(true) };
    this.shots = [];
    this.ball = this.add.image(0, 0, "ball").setOrigin(0).setDisplaySize(BS, BS);
    // A row of MAX_UPGRADES markers centred under each score, filled left to right.
    const row = (centerX: number) =>
      Array.from({ length: MAX_UPGRADES }, (_, i) =>
        this.add
          .image(centerX + (i - (MAX_UPGRADES - 1) / 2) * (BADGE + BADGE_GAP), 26, "ball")
          .setOrigin(0.5, 0)
          .setDisplaySize(BADGE, BADGE),
      );
    this.badges = { left: row(W / 2 - 24), right: row(W / 2 + 24) };
    const keyboard = this.input.keyboard!;
    this.keys = keyboard.addKeys({ w: "W", s: "S", up: "UP", down: "DOWN" }) as Keys;
    keyboard.addCapture("UP,DOWN,LEFT,RIGHT,SPACE,ENTER");
    // Solo, the arrows work for the left paddle too. Two players: left has W/S, A/D and Space;
    // right has the arrows and Enter.
    const p = this.presses;
    const solo = () => !this.state.twoPlayer;
    keyboard.on("keydown-A", () => (p.leftTurn -= 1));
    keyboard.on("keydown-D", () => (p.leftTurn += 1));
    keyboard.on("keydown-LEFT", () => (solo() ? (p.leftTurn -= 1) : (p.rightTurn -= 1)));
    keyboard.on("keydown-RIGHT", () => (solo() ? (p.leftTurn += 1) : (p.rightTurn += 1)));
    keyboard.on("keydown-ENTER", () => (p.rightAction = !solo()));
    keyboard.on("keydown-ONE", () => {
      if (!this.ending) newGame(this.state, false, this.startUpgrades);
    });
    keyboard.on("keydown-TWO", () => {
      if (!this.ending) newGame(this.state, true, this.startUpgrades);
    });
    keyboard.on("keydown-SPACE", () => {
      if (this.state.phase === "attract") newGame(this.state, false, this.startUpgrades);
      else p.leftAction = true;
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
    const k = this.keys;
    const axis = (neg: boolean, pos: boolean): Dir => ((pos ? 1 : 0) - (neg ? 1 : 0)) as Dir;
    const two = this.state.twoPlayer;
    const p = this.presses;
    const input = {
      left: axis(k.w.isDown || (!two && k.up.isDown), k.s.isDown || (!two && k.down.isDown)),
      right: axis(k.up.isDown, k.down.isDown),
      leftTurn: Math.sign(p.leftTurn) as Dir,
      rightTurn: Math.sign(p.rightTurn) as Dir,
      leftRelease: p.leftAction,
      rightRelease: p.rightAction,
      leftFire: p.leftAction,
      rightFire: p.rightAction,
    };
    Object.assign(p, noPresses());
    for (const event of step(this.state, input, this.rng)) sfx[event]();
    if (this.state.phase === "over" && !this.ending) this.endGame();
  }

  private endGame(): void {
    const side = winner(this.state);
    if (side === null) return;
    this.ending = true;
    const result: EndData = { winner: side, twoPlayer: this.state.twoPlayer };
    this.time.delayedCall(END_DELAY_MS, () => this.scene.start("EndScene", result));
  }

  private draw(): void {
    const g = this.gfx;
    const { left, right, ball, phase } = this.state;
    g.clear();
    g.fillStyle(0xffffff);
    this.number(left.score, W / 2 - 30, 6);
    this.number(right.score, W / 2 + 18, 6);
    this.drawPaddle(this.paddles.left, left);
    this.drawPaddle(this.paddles.right, right);
    this.ball
      .setVisible(phase === "play" && ball.live)
      .setTexture(ball.upgrade === null ? "ball" : UPGRADE_BALLS[ball.upgrade].key)
      .setDisplaySize(BS, BS)
      .setPosition(ball.x, ball.y);
    this.drawShots();
    this.drawBadges(this.badges.left, left);
    this.drawBadges(this.badges.right, right);
  }

  /** Cannon shots use the plain ball art, drawn smaller; images are pooled. */
  private drawShots(): void {
    const { shots, phase } = this.state;
    while (this.shots.length < shots.length) {
      this.shots.push(
        this.add.image(0, 0, "ball").setOrigin(0).setDisplaySize(SHOT_SIZE, SHOT_SIZE),
      );
    }
    this.shots.forEach((image, i) => {
      const shot = shots[i];
      image.setVisible(phase === "play" && shot !== undefined);
      if (shot) image.setPosition(shot.x, shot.y);
    });
  }

  private drawPaddle(image: Phaser.GameObjects.Image, paddle: Paddle): void {
    const h = paddleHeight(paddle);
    const slime = upgradeCount(paddle, "slime") > 0;
    const cannon = upgradeCount(paddle, "cannon") > 0;
    // Rotate about the paddle's middle, not the middle of paddle-plus-cannon.
    const originX = (PAD + PW / 2) / paddleTextureWidth(cannon);
    image
      .setTexture(paddleTexture(this, ZOOM, h, slime, cannon))
      .setOrigin(image.flipX ? 1 - originX : originX, 0.5)
      .setPosition(paddle.x + PW / 2, Math.round(paddle.y) + h / 2)
      .setRotation(paddle.tilt * TILT_ANGLE);
  }

  private drawBadges(badges: Phaser.GameObjects.Image[], paddle: Paddle): void {
    badges.forEach((badge, i) => {
      const upgrade = paddle.upgrades[i];
      badge.setVisible(upgrade !== undefined);
      if (upgrade) badge.setTexture(UPGRADE_BALLS[upgrade].key).setDisplaySize(BADGE, BADGE);
    });
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
