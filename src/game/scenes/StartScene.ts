import Phaser from "phaser";
import buttonUrl from "../../assets/start/button.png";
import dotUrl from "../../assets/start/dot.png";
import paddleUrl from "../../assets/start/paddle.png";
import wordUrl from "../../assets/start/word.png";
import { setHelpVisible } from "../help";
import { onScreenTap } from "../input/touchControls";
import { DRAWING, PIECES } from "./startLayout";

export const TITLE_BG = 0x2458bf;
export const START_FONT = '"Gochi Hand", cursive';

// Time for the ball to cross from one paddle to the other, passing over the i.
const RALLY_MS = 900;

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
    this.load.image("title-paddle", paddleUrl);
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
    // One paddle drawing, mirrored, so both sides match.
    this.place("title-paddle", PIECES.paddleLeft, PIECES.paddleLeft.scale).setFlipX(true);
    this.place("title-paddle", PIECES.paddleRight, PIECES.paddleRight.scale);
    this.ball = this.place("title-dot", PIECES.dot);
    this.addStartButton();
    this.addCreditsButton();

    const keyboard = this.input.keyboard!;
    keyboard.addCapture("SPACE,ENTER");
    keyboard.once("keydown-SPACE", () => this.startGame());
    keyboard.once("keydown-ENTER", () => this.startGame());
    keyboard.once("keydown-C", () => this.showCredits());
    // A tap anywhere off the Credits box reads as Space.
    onScreenTap(this, () => this.startGame());
  }

  update(_time: number, delta: number): void {
    this.elapsed += Math.min(delta, 250);
    const { dot, paddleLeft, paddleRight } = PIECES;
    // The paddle art has transparent padding around its outline; meet the outline, not the box.
    const leftX = paddleLeft.x + paddleLeft.w - 12 * paddleLeft.scale;
    const rightX = paddleRight.x + 12 * paddleRight.scale - dot.w;
    const phase = (this.elapsed / RALLY_MS) % 2;
    const t = phase < 1 ? phase : 2 - phase;
    this.ball.setPosition(this.toCanvasX(leftX + (rightX - leftX) * t), this.toCanvasY(dot.y));
  }

  private place(key: string, at: { x: number; y: number }, scale = 1): Phaser.GameObjects.Image {
    return this.add
      .image(this.toCanvasX(at.x), this.toCanvasY(at.y), key)
      .setOrigin(0)
      .setScale(this.scaleToCanvas * scale);
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

  /** Smaller copy of the Start box in the top-left corner that opens the credits page. */
  private addCreditsButton(): void {
    const { creditsButton: box } = PIECES;
    const image = this.place("title-button", box, box.scale).setFlipX(true);
    const label = this.add
      .text(this.toCanvasX(box.x + box.w / 2), this.toCanvasY(box.y + box.h / 2), "Credits", {
        fontFamily: START_FONT,
        fontSize: `${Math.round(46 * this.scaleToCanvas)}px`,
        color: "#000000",
        padding: { x: 8, y: 16 },
      })
      .setOrigin(0.5)
      .setAngle(4);
    label.setInteractive({ useHandCursor: true });
    image.setInteractive({ useHandCursor: true, pixelPerfect: true });
    label.once("pointerdown", () => this.showCredits());
    image.once("pointerdown", () => this.showCredits());
  }

  private showCredits(): void {
    if (!this.scene.isActive()) return;
    this.scene.start("CreditsScene");
  }

  private toCanvasX(x: number): number {
    return this.offsetX + x * this.scaleToCanvas;
  }

  private toCanvasY(y: number): number {
    return this.offsetY + y * this.scaleToCanvas;
  }

  private startGame(): void {
    if (!this.scene.isActive()) return;
    this.scene.start("ModeScene");
  }
}
