import Phaser from "phaser";
import { setHelpVisible } from "../help";
import { START_FONT, TITLE_BG } from "./StartScene";

/** Background for the loss screen: a dusky red in place of the title blue. */
export const LOSS_BG = 0x8c2a2a;

export interface EndData {
  /** The side that reached the winning score. */
  winner: "left" | "right";
  leftScore: number;
  rightScore: number;
  twoPlayer: boolean;
}

/** Headline for the end screen. Against the CPU you play the left paddle. */
export function endTitle({ winner, twoPlayer }: Pick<EndData, "winner" | "twoPlayer">): string {
  if (twoPlayer) return winner === "left" ? "Left player wins!" : "Right player wins!";
  return winner === "left" ? "You win!" : "You lose!";
}

export class EndScene extends Phaser.Scene {
  private result!: EndData;

  constructor() {
    super("EndScene");
  }

  create(data: EndData): void {
    this.result = data;
    setHelpVisible(this.game, false);
    const lost = !data.twoPlayer && data.winner === "right";
    this.cameras.main.setBackgroundColor(lost ? LOSS_BG : TITLE_BG);
    document.body.style.background = `#${(lost ? LOSS_BG : TITLE_BG).toString(16).padStart(6, "0")}`;

    const { width, height } = this.scale;
    const text = (y: number, label: string, size: number, color = "#ffffff") =>
      this.add
        .text(width / 2, y, label, {
          fontFamily: START_FONT,
          fontSize: `${size}px`,
          color,
          // Phaser under-measures this font's ascent; padding keeps the glyph tops unclipped.
          padding: { x: 12, y: 24 },
        })
        .setOrigin(0.5);

    text(height * 0.27, endTitle(data), 110).setAngle(-3);
    text(height * 0.5, `${data.leftScore} – ${data.rightScore}`, 72);
    this.addButton(width / 2, height * 0.72);
    text(height * 0.92, "Space: play again · Esc: title", 28, "#ffffffcc");

    const keyboard = this.input.keyboard!;
    keyboard.addCapture("SPACE,ENTER,ESC");
    keyboard.once("keydown-SPACE", () => this.playAgain());
    keyboard.once("keydown-ENTER", () => this.playAgain());
    keyboard.once("keydown-ESC", () => this.toTitle());
  }

  private addButton(x: number, y: number): void {
    // The hand-drawn box from the title screen; its texture is loaded by StartScene.
    const image = this.add.image(x, y, "title-button");
    const label = this.add
      .text(x, y, "Play again", {
        fontFamily: START_FONT,
        fontSize: "54px",
        color: "#000000",
        padding: { x: 12, y: 24 },
      })
      .setOrigin(0.5)
      .setAngle(-4);
    // Stretch the box to fit the label; the label's padding is the margin.
    image.setDisplaySize(label.width + 64, label.height * 1.2);
    label.setInteractive({ useHandCursor: true });
    image.setInteractive({ useHandCursor: true, pixelPerfect: true });
    label.once("pointerdown", () => this.playAgain());
    image.once("pointerdown", () => this.playAgain());
  }

  private playAgain(): void {
    if (!this.scene.isActive()) return;
    setHelpVisible(this.game, true);
    this.scene.start("PlayScene", { start: true, twoPlayer: this.result.twoPlayer });
  }

  private toTitle(): void {
    if (!this.scene.isActive()) return;
    this.scene.start("StartScene");
  }
}
