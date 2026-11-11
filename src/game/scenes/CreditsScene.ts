import Phaser from "phaser";
import backUrl from "../../assets/credits/back.png";
import creditsUrl from "../../assets/credits/credits.png";
import { setHelpVisible } from "../help";

// Size of the traced lettering (pixels of the cropped photo).
const CREDITS_ART = { w: 751, h: 534 };
const BACK_ART_H = 136;

/** Height of the "back" bar along the bottom, as a share of the screen. */
const BACK_BAR = 0.15;

/** Black page with the hand-written credits in white and a back bar along the bottom. */
export class CreditsScene extends Phaser.Scene {
  constructor() {
    super("CreditsScene");
  }

  preload(): void {
    this.load.image("credits-text", creditsUrl);
    this.load.image("credits-back", backUrl);
  }

  create(): void {
    setHelpVisible(this.game, false);
    this.cameras.main.setBackgroundColor(0x000000);
    document.body.style.background = "#000";

    const { width, height } = this.scale;
    const barTop = height * (1 - BACK_BAR);
    const barH = height - barTop;
    const scale = Math.min((width * 0.85) / CREDITS_ART.w, (barTop * 0.85) / CREDITS_ART.h);
    this.add.image(width / 2, barTop / 2, "credits-text").setScale(scale);

    this.add.graphics().lineStyle(5, 0xffffff).lineBetween(0, barTop, width, barTop);
    this.add
      .image(width / 2, barTop + barH / 2, "credits-back")
      .setScale(Math.min(1, (barH * 0.7) / BACK_ART_H));
    this.add
      .zone(0, barTop, width, barH)
      .setOrigin(0)
      .setInteractive({ useHandCursor: true })
      .once("pointerdown", () => this.toTitle());

    const keyboard = this.input.keyboard!;
    keyboard.addCapture("ESC,BACKSPACE");
    keyboard.once("keydown-ESC", () => this.toTitle());
    keyboard.once("keydown-BACKSPACE", () => this.toTitle());
  }

  private toTitle(): void {
    if (!this.scene.isActive()) return;
    this.scene.start("StartScene");
  }
}
