import Phaser from "phaser";
import opponentUrl from "../../assets/mode/opponent.png";
import { setHelpVisible } from "../help";
import { OPPONENT_ART as ART, opponentAt, type Opponent } from "./opponent";

/** The paper the drawing is on. */
export const PAPER_BG = 0xf2f0ea;

/** Taps that land this soon after the screen appears were meant for the Start button. */
const TAP_GRACE_MS = 250;

/** The screen after Start: the whole drawn green box, split by its slash into cpu and plyr. */
export class ModeScene extends Phaser.Scene {
  private chosen = false;

  constructor() {
    super("ModeScene");
  }

  preload(): void {
    this.load.image("mode-opponent", opponentUrl);
  }

  create(): void {
    this.chosen = false;
    setHelpVisible(this.game, false);
    this.cameras.main.setBackgroundColor(PAPER_BG);
    document.body.style.background = `#${PAPER_BG.toString(16)}`;

    const { width, height } = this.scale;
    const scale = Math.min((width * 0.96) / ART.w, (height * 0.96) / ART.h);
    const left = (width - ART.w * scale) / 2;
    const top = (height - ART.h * scale) / 2;
    this.add.image(left, top, "mode-opponent").setOrigin(0).setScale(scale);

    // The whole screen is the button: whichever side of the slash is tapped.
    const zone = this.add.zone(0, 0, width, height).setOrigin(0);
    this.time.delayedCall(TAP_GRACE_MS, () => {
      zone.setInteractive({ useHandCursor: true });
      zone.on("pointerdown", (pointer: Phaser.Input.Pointer) =>
        this.play(opponentAt((pointer.x - left) / scale, (pointer.y - top) / scale)),
      );
    });

    const keyboard = this.input.keyboard!;
    keyboard.addCapture("ESC");
    keyboard.once("keydown-ONE", () => this.play("cpu"));
    keyboard.once("keydown-C", () => this.play("cpu"));
    keyboard.once("keydown-TWO", () => this.play("plyr"));
    keyboard.once("keydown-P", () => this.play("plyr"));
    keyboard.once("keydown-ESC", () => this.scene.start("StartScene"));
  }

  private play(opponent: Opponent): void {
    if (this.chosen || !this.scene.isActive()) return;
    this.chosen = true;
    setHelpVisible(this.game, true);
    this.scene.start("PlayScene", { start: true, twoPlayer: opponent === "plyr" });
  }
}
