import Phaser from "phaser";
import boxUrl from "../../assets/mode/box.png";
import cpuUrl from "../../assets/mode/cpu.png";
import { setHelpVisible } from "../help";
import { START_FONT, TITLE_BG } from "./StartScene";

/** Size of the traced box art (both PNGs are the same box; one keeps its "cpu/plyr" lettering). */
const ART = { w: 520, h: 304 };
/** Where the lettering sits inside the box, as a share of the art, and the drawn box's tilt. */
const LABEL = { x: 0.48, y: 0.4, angle: 2 };
/** Taps that land this soon after the screen appears were meant for the Start button. */
const TAP_GRACE_MS = 250;

/** The screen after Start: two hand-drawn green boxes to pick playing the CPU or a friend. */
export class ModeScene extends Phaser.Scene {
  private chosen = false;

  constructor() {
    super("ModeScene");
  }

  preload(): void {
    this.load.image("mode-cpu", cpuUrl);
    this.load.image("mode-box", boxUrl);
  }

  create(): void {
    this.chosen = false;
    setHelpVisible(this.game, false);
    this.cameras.main.setBackgroundColor(TITLE_BG);

    const { width, height } = this.scale;
    const scale = Math.min((width * 0.75) / ART.w, (height * 0.42) / ART.h);
    // As in the drawing, the second box sits above the cpu one, nudged right.
    const twoPlayer = this.addBox("mode-box", width / 2 + 30, height * 0.27, scale, "plyr/plyr");
    const cpu = this.addBox("mode-cpu", width / 2 - 30, height * 0.73, scale);

    this.time.delayedCall(TAP_GRACE_MS, () => {
      twoPlayer.once("pointerdown", () => this.play(true));
      cpu.once("pointerdown", () => this.play(false));
    });

    const keyboard = this.input.keyboard!;
    keyboard.addCapture("SPACE,ENTER,ESC");
    keyboard.once("keydown-ONE", () => this.play(false));
    keyboard.once("keydown-TWO", () => this.play(true));
    // Space or Enter picks the CPU, so the old one-key start still works.
    keyboard.once("keydown-SPACE", () => this.play(false));
    keyboard.once("keydown-ENTER", () => this.play(false));
    keyboard.once("keydown-ESC", () => this.scene.start("StartScene"));
  }

  /** Places one box (with a typed label if the art has none) and returns its tap target. */
  private addBox(
    key: string,
    x: number,
    y: number,
    scale: number,
    label?: string,
  ): Phaser.GameObjects.Container {
    const box = this.add.container(x, y);
    box.add(this.add.image(0, 0, key).setScale(scale));
    if (label) {
      box.add(
        this.add
          .text((LABEL.x - 0.5) * ART.w * scale, (LABEL.y - 0.5) * ART.h * scale, label, {
            fontFamily: START_FONT,
            fontSize: `${Math.round(ART.h * scale * 0.34)}px`,
            color: "#2b2b2b",
            // Phaser under-measures this font's ascent; padding keeps the glyph tops unclipped.
            padding: { x: 12, y: 24 },
          })
          .setOrigin(0.5)
          .setAngle(LABEL.angle),
      );
    }
    const w = ART.w * scale;
    const h = ART.h * scale;
    box.setSize(w, h).setInteractive({ useHandCursor: true });
    box.on("pointerover", () => box.setScale(1.04));
    box.on("pointerout", () => box.setScale(1));
    return box;
  }

  private play(twoPlayer: boolean): void {
    if (this.chosen || !this.scene.isActive()) return;
    this.chosen = true;
    setHelpVisible(this.game, true);
    this.scene.start("PlayScene", { start: true, twoPlayer });
  }
}
