import Phaser from "phaser";
import backUrl from "../../assets/credits/back.png";
import creditsUrl from "../../assets/credits/credits.png";
import emmaColorUrl from "../../assets/credits/emma-color.png";
import emmaUrl from "../../assets/credits/emma.png";
import { extendBackBar } from "../backBarSides";
import { setHelpVisible } from "../help";

// Size of the traced lettering (pixels of the cropped photo). The handwritten "Emma" is a
// separate piece so it can be swapped for the coloured one.
// The lettering itself is 751 x 534.
const EMMA = { x: 530, y: 432 };
// The coloured "Emma" drawing, in the same pixels. It's wider than the handwritten word so its
// pencil lines stay visible, so it hangs a little past the lettering's right edge.
const EMMA_COLOR = { x: 530, y: 425, w: 300 };
const EMMA_COLOR_PNG_W = 800;
/** Everything the lettering can cover, so nothing moves when "Emma" changes. */
const ART = { w: EMMA_COLOR.x + EMMA_COLOR.w, h: 552 };
/** How long the handwritten "Emma" shows before the coloured one replaces it. */
export const EMMA_SWAP_MS = 2000;
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
    this.load.image("credits-emma", emmaUrl);
    this.load.image("credits-emma-color", emmaColorUrl);
  }

  create(): void {
    setHelpVisible(this.game, false);
    this.cameras.main.setBackgroundColor(0x000000);
    document.body.style.background = "#000";

    const { width, height } = this.scale;
    const barTop = height * (1 - BACK_BAR);
    const barH = height - barTop;
    const scale = Math.min((width * 0.85) / ART.w, (barTop * 0.85) / ART.h);
    const left = (width - ART.w * scale) / 2;
    const top = (barTop - ART.h * scale) / 2;
    const place = (key: string, x: number, y: number, s = scale) =>
      this.add
        .image(left + x * scale, top + y * scale, key)
        .setOrigin(0)
        .setScale(s);
    place("credits-text", 0, 0);
    const emma = place("credits-emma", EMMA.x, EMMA.y);
    this.time.delayedCall(EMMA_SWAP_MS, () => {
      emma.destroy();
      place(
        "credits-emma-color",
        EMMA_COLOR.x,
        EMMA_COLOR.y,
        (EMMA_COLOR.w / EMMA_COLOR_PNG_W) * scale,
      );
    });

    this.add.graphics().lineStyle(5, 0xffffff).lineBetween(0, barTop, width, barTop);
    this.add
      .image(width / 2, barTop + barH / 2, "credits-back")
      .setScale(Math.min(1, (barH * 0.7) / BACK_ART_H));
    this.add
      .zone(0, barTop, width, barH)
      .setOrigin(0)
      .setInteractive({ useHandCursor: true })
      .once("pointerdown", () => this.toTitle());
    extendBackBar(this, {
      barShare: BACK_BAR,
      fill: "#000000",
      line: "#ffffff",
      onClick: () => this.toTitle(),
    });

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
