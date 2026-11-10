import Phaser from "phaser";
import { H, W } from "../sim/pong";

export const TITLE_BG = 0x2458bf;
const WHITE = 0xffffff;
const BLACK = 0x000000;

// "ping" on a 9-row grid: rows 0-1 are empty, 2-6 the x-height, 7-8 descenders.
// The i's dot is the ball, bouncing one row above the grid so the paddles clear the letters.
const TITLE: string[][] = [
  ["", "", "11110", "10001", "10001", "10001", "11110", "10000", "10000"],
  ["", "", "1", "1", "1", "1", "1", "", ""],
  ["", "", "11110", "10001", "10001", "10001", "10001", "", ""],
  ["", "", "01111", "10001", "10001", "10001", "01111", "00001", "01110"],
];
const CELL = 7;
const I_INDEX = 1;

const SMALL: Record<string, string[]> = {
  S: ["111", "100", "111", "001", "111"],
  T: ["111", "010", "010", "010", "010"],
  A: ["111", "101", "111", "101", "101"],
  R: ["111", "101", "110", "101", "101"],
};
const SMALL_PX = 2;

const DOT_ROW = -1;
const PADDLE_W = 4;
const PADDLE_H = CELL * 2;
const RALLY_HALF = 36;
const BALL_SPEED = 0.07; // px per ms

const glyphWidth = (rows: string[]) => Math.max(...rows.map((r) => r.length));

export class StartScene extends Phaser.Scene {
  private gfx!: Phaser.GameObjects.Graphics;
  private dotX = 0;
  private dotY = 0;
  private elapsed = 0;

  constructor() {
    super("StartScene");
  }

  create(): void {
    this.cameras.main.setBackgroundColor(TITLE_BG);
    this.elapsed = 0;
    this.gfx = this.add.graphics();
    this.drawTitle(this.add.graphics());
    this.drawStartButton();

    const keyboard = this.input.keyboard!;
    keyboard.addCapture("SPACE,ENTER");
    keyboard.once("keydown-SPACE", () => this.startGame());
    keyboard.once("keydown-ENTER", () => this.startGame());
  }

  update(_time: number, delta: number): void {
    this.elapsed += Math.min(delta, 250);
    const span = RALLY_HALF * 2;
    const travelled = (this.elapsed * BALL_SPEED) % (span * 2);
    const offset = travelled < span ? travelled : span * 2 - travelled;
    const ballX = Math.round(this.dotX - RALLY_HALF + offset);

    const g = this.gfx;
    g.clear();
    g.fillStyle(WHITE);
    const paddleY = this.dotY + CELL / 2 - PADDLE_H / 2;
    g.fillRect(this.dotX - RALLY_HALF - PADDLE_W, paddleY, PADDLE_W, PADDLE_H);
    g.fillRect(this.dotX + RALLY_HALF + CELL, paddleY, PADDLE_W, PADDLE_H);
    g.fillRect(ballX, this.dotY, CELL, CELL);
  }

  private drawTitle(g: Phaser.GameObjects.Graphics): void {
    const cols = TITLE.reduce((sum, glyph) => sum + glyphWidth(glyph), 0) + TITLE.length - 1;
    const left = Math.round((W - cols * CELL) / 2);
    const rows = TITLE[0].length - DOT_ROW;
    const top = Math.round((H - rows * CELL) / 2) - DOT_ROW * CELL + 6;
    g.fillStyle(WHITE);
    let x = left;
    TITLE.forEach((glyph, index) => {
      glyph.forEach((row, r) => {
        [...row].forEach((bit, c) => {
          if (bit === "1") g.fillRect(x + c * CELL, top + r * CELL, CELL, CELL);
        });
      });
      if (index === I_INDEX) {
        this.dotX = x;
        this.dotY = top + DOT_ROW * CELL;
      }
      x += (glyphWidth(glyph) + 1) * CELL;
    });
  }

  private drawStartButton(): void {
    const label = "START";
    const textW = (label.length * 4 - 1) * SMALL_PX;
    const textH = 5 * SMALL_PX;
    const pad = 4;
    const bw = textW + pad * 2;
    const bh = textH + pad * 2;
    const bx = W - 6 - bw;
    const by = 6;

    const g = this.add.graphics();
    g.fillStyle(WHITE);
    g.fillRect(bx, by, bw, bh);
    g.fillStyle(BLACK);
    [...label].forEach((ch, i) => {
      SMALL[ch].forEach((row, r) => {
        [...row].forEach((bit, c) => {
          if (bit === "1") {
            g.fillRect(
              bx + pad + (i * 4 + c) * SMALL_PX,
              by + pad + r * SMALL_PX,
              SMALL_PX,
              SMALL_PX,
            );
          }
        });
      });
    });

    this.add
      .zone(bx, by, bw, bh)
      .setOrigin(0)
      .setInteractive({ useHandCursor: true })
      .once("pointerdown", () => this.startGame());
  }

  private startGame(): void {
    this.scene.start("PlayScene", { start: true });
  }
}
