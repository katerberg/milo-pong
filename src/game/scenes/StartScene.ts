import Phaser from "phaser";
import buttonUrl from "../../assets/start/button.png";
import dotUrl from "../../assets/start/dot.png";
import paddleLeftUrl from "../../assets/start/paddle-left.png";
import paddleRightUrl from "../../assets/start/paddle-right.png";
import wordUrl from "../../assets/start/word.png";
import { setHelpVisible } from "../help";
import { DRAWING, PIECES } from "./startLayout";

export const TITLE_BG = 0x2458bf;
export const START_FONT = '"Gochi Hand", cursive';

// The ball eases in and out of the i's dot position while rallying between the paddles.
const RALLY_MS = 1400;

export class StartScene extends Phaser.Scene {
  private ball!: Phaser.GameObjects.Image;
  private scaleToCanvas = 1;
  private offsetX = 0;
  private offsetY = 0;
  private elapsed = 0;

  constructor() {
    super("StartScene");
  }

  preload(): void {
    this.load.image("title-word", wordUrl);
    this.load.image("title-dot", dotUrl);
    this.load.image("title-paddle-left", paddleLeftUrl);
    this.load.image("title-paddle-right", paddleRightUrl);
    this.load.image("title-button", buttonUrl);
  }

  create(): void {
    setHelpVisible(this.game, false);
    this.cameras.main.setBackgroundColor(TITLE_BG);
    const { width, height } = this.scale;
    this.scaleToCanvas = Math.min(width / DRAWING.w, height / DRAWING.h);
    this.offsetX = (width - DRAWING.w * this.scaleToCanvas) / 2;
    this.offsetY = (height - DRAWING.h * this.scaleToCanvas) / 2;
    this.elapsed = 0;

    this.place("title-word", PIECES.word);
    this.place("title-paddle-left", PIECES.paddleLeft);
    this.place("title-paddle-right", PIECES.paddleRight);
    this.ball = this.place("title-dot", PIECES.dot);
    this.addStartButton();

    const keyboard = this.input.keyboard!;
    keyboard.addCapture("SPACE,ENTER");
    keyboard.once("keydown-SPACE", () => this.startGame());
    keyboard.once("keydown-ENTER", () => this.startGame());
  }

  update(_time: number, delta: number): void {
    this.elapsed += Math.min(delta, 250);
    const { dot, paddleLeft, paddleRight } = PIECES;
    const leftX = paddleLeft.x + paddleLeft.w - 12;
    const rightX = paddleRight.x + 12 - dot.w;
    const leftY = paddleLeft.y + paddleLeft.h / 2 - dot.h / 2;
    const rightY = paddleRight.y + paddleRight.h / 2 - dot.h / 2;

    // Phase 0..1 goes left paddle -> right paddle, 1..2 comes back.
    const phase = (this.elapsed / RALLY_MS) % 2;
    const t = phase < 1 ? phase : 2 - phase;
    const x = leftX + (rightX - leftX) * t;
    const toward = x < dot.x ? (dot.x - x) / (dot.x - leftX) : (x - dot.x) / (rightX - dot.x);
    const sideY = x < dot.x ? leftY : rightY;
    const y = dot.y - (dot.y - sideY) * toward * toward;
    this.ball.setPosition(this.toCanvasX(x), this.toCanvasY(y));
  }

  private place(key: string, at: { x: number; y: number }): Phaser.GameObjects.Image {
    return this.add
      .image(this.toCanvasX(at.x), this.toCanvasY(at.y), key)
      .setOrigin(0)
      .setScale(this.scaleToCanvas);
  }

  private addStartButton(): void {
    const { button } = PIECES;
    const image = this.place("title-button", button);
    const centerX = this.toCanvasX(button.x + button.w / 2);
    const centerY = this.toCanvasY(button.y + button.h / 2);
    const label = this.add
      .text(centerX, centerY, "Start", {
        fontFamily: START_FONT,
        fontSize: `${Math.round(110 * this.scaleToCanvas)}px`,
        color: "#000000",
        // Phaser under-measures this font's ascent; padding keeps the glyph tops unclipped.
        padding: { x: 12, y: 24 },
      })
      .setOrigin(0.5)
      .setAngle(-4);
    label.setInteractive({ useHandCursor: true });
    image.setInteractive({ useHandCursor: true, pixelPerfect: true });
    label.once("pointerdown", () => this.startGame());
    image.once("pointerdown", () => this.startGame());
  }

  private toCanvasX(x: number): number {
    return this.offsetX + x * this.scaleToCanvas;
  }

  private toCanvasY(y: number): number {
    return this.offsetY + y * this.scaleToCanvas;
  }

  private startGame(): void {
    if (!this.scene.isActive()) return;
    setHelpVisible(this.game, true);
    this.scene.start("PlayScene", { start: true });
  }
}
