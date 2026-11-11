import Phaser from "phaser";
import backUrl from "../../assets/end/back.png";
import loseUrl from "../../assets/end/lose.png";
import plus50Url from "../../assets/end/plus50.png";
import winUrl from "../../assets/end/win.png";
import { setHelpVisible } from "../help";
import { onScreenTap } from "../input/touchControls";

/** Purple crayon behind the win screen. */
export const WIN_BG = 0x7b3fa0;
/** Orange behind the loss screen. */
export const LOSS_BG = 0xffa312;

export interface EndData {
  /** The side that reached the winning score. */
  winner: "left" | "right";
  twoPlayer: boolean;
}

/** Against the CPU you play the left paddle; in two-player mode somebody always won. */
export const isLoss = ({ winner, twoPlayer }: EndData): boolean => !twoPlayer && winner === "right";

// Where each piece sat in the traced drawing (pixels of the cropped photo), so the
// lettering keeps the drawing's layout.
const WIN_ART = { word: { x: 25, y: 20 }, plus50: { x: 25, y: 290 }, w: 760, h: 490 };
const LOSE_ART = { w: 775, h: 440 };
const BACK_ART_H = 78;

/** Height of the "back" bar on both end screens, as a share of the screen. */
const BACK_BAR = 0.15;
/** Taps that land this soon after the screen appears are still meant for the game. */
const TAP_GRACE_MS = 600;

export class EndScene extends Phaser.Scene {
  constructor() {
    super("EndScene");
  }

  preload(): void {
    this.load.image("end-win", winUrl);
    this.load.image("end-plus50", plus50Url);
    this.load.image("end-lose", loseUrl);
    this.load.image("end-back", backUrl);
  }

  create(data: EndData): void {
    const lost = isLoss(data);
    const bg = lost ? LOSS_BG : WIN_BG;
    setHelpVisible(this.game, false);
    this.cameras.main.setBackgroundColor(bg);
    document.body.style.background = `#${bg.toString(16).padStart(6, "0")}`;

    if (lost) this.drawLoss();
    else this.drawWin();
    this.drawBackBar();

    const keyboard = this.input.keyboard!;
    keyboard.addCapture("SPACE,ENTER,ESC");
    keyboard.once("keydown-SPACE", () => this.toTitle());
    keyboard.once("keydown-ENTER", () => this.toTitle());
    keyboard.once("keydown-ESC", () => this.toTitle());
    // A tap anywhere reads as Space, once the grace period has passed.
    this.time.delayedCall(TAP_GRACE_MS, () => onScreenTap(this, () => this.toTitle()));
  }

  private drawWin(): void {
    const { width, height } = this.scale;
    const barTop = height * (1 - BACK_BAR);
    const scale = Math.min((width * 0.85) / WIN_ART.w, (barTop * 0.85) / WIN_ART.h);
    const left = (width - WIN_ART.w * scale) / 2;
    const top = (barTop - WIN_ART.h * scale) / 2;
    const place = (key: string, at: { x: number; y: number }) =>
      this.add
        .image(left + (at.x - WIN_ART.word.x) * scale, top + (at.y - WIN_ART.word.y) * scale, key)
        .setOrigin(0)
        .setScale(scale);
    place("end-win", WIN_ART.word);
    // The +50 is only a picture for now; it isn't added to anything.
    place("end-plus50", WIN_ART.plus50);
  }

  private drawLoss(): void {
    const { width, height } = this.scale;
    const barTop = height * (1 - BACK_BAR);
    const scale = Math.min((width * 0.85) / LOSE_ART.w, (barTop * 0.8) / LOSE_ART.h);
    this.add.image(width / 2, barTop / 2, "end-lose").setScale(scale);
  }

  /** The "back" bar along the bottom: white, with a marker line on top. Goes to the title. */
  private drawBackBar(): void {
    const { width, height } = this.scale;
    const barTop = height * (1 - BACK_BAR);
    const barH = height - barTop;
    this.add
      .graphics()
      .fillStyle(0xffffff)
      .fillRect(0, barTop, width, barH)
      .lineStyle(5, 0x1a1a1a)
      .lineBetween(0, barTop, width, barTop);
    this.add
      .image(width / 2, barTop + barH / 2, "end-back")
      .setScale(Math.min(1, (barH * 0.7) / BACK_ART_H));
    this.add
      .zone(0, barTop, width, barH)
      .setOrigin(0)
      .setInteractive({ useHandCursor: true })
      .once("pointerdown", () => this.toTitle());
  }

  private toTitle(): void {
    if (!this.scene.isActive()) return;
    this.scene.start("StartScene");
  }
}
