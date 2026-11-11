import Phaser from "phaser";
import { H, PW, W } from "../sim/pong";

/** Hand-drawn look for the paddles and net. Purely visual: the sim's hit boxes are unchanged. */

const INK = 0x000000;
const PAPER = 0xffffff;
const LINE = 0.8; // marker thickness, in field pixels

export const NET_KEY = "sketch-net";
export const SLIME = 0x66f04a;

/** How far the art extends past the hit box on each side (outline is centred on the box edge). */
export const PAD = 2;

/** The cannon drawn on the front of a paddle: a block, then a narrower barrel (field pixels). */
const CANNON_BASE = { w: 2, h: 6 };
const CANNON_BARREL = { w: 2, h: 3 };
/** How far the cannon sticks out in front of the paddle. */
export const CANNON_LEN = CANNON_BASE.w + CANNON_BARREL.w;

/** Small deterministic PRNG so the sketch looks the same every run. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Pt = { x: number; y: number };

/** A rectangle with wobbly, slightly rounded corners and sides that bow a little. */
function wobblyRect(x: number, y: number, w: number, h: number, rnd: () => number): Pt[] {
  const j = () => (rnd() - 0.5) * 0.7;
  const corners: Pt[] = [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + h },
    { x, y: y + h },
  ];
  const pts: Pt[] = [];
  for (let i = 0; i < 4; i++) {
    const a = corners[i];
    const b = corners[(i + 1) % 4];
    const n = Math.max(2, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / 4));
    const bow = (rnd() - 0.5) * 0.9;
    const nx = -(b.y - a.y) / Math.hypot(b.x - a.x, b.y - a.y);
    const ny = (b.x - a.x) / Math.hypot(b.x - a.x, b.y - a.y);
    for (let k = 0; k < n; k++) {
      const t = k / n;
      const arc = Math.sin(Math.PI * t) * bow;
      pts.push({
        x: a.x + (b.x - a.x) * t + nx * arc + j(),
        y: a.y + (b.y - a.y) * t + ny * arc + j(),
      });
    }
  }
  return pts;
}

function strokeLoop(g: Phaser.GameObjects.Graphics, pts: Pt[]): void {
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (const p of pts.slice(1)) g.lineTo(p.x, p.y);
  g.closePath();
}

/** Width of a baked paddle texture in field pixels, with or without the cannon. */
export const paddleTextureWidth = (cannon: boolean): number =>
  PW + PAD * 2 + (cannon ? CANNON_LEN : 0);

/**
 * Bakes (once) and returns the texture for a left-hand paddle of height h, at the camera zoom so
 * it stays crisp. Slimed paddles are filled green; with a cannon, it sticks out to the right.
 * Same seed per height, so a paddle keeps its wobble.
 */
export function paddleTexture(
  scene: Phaser.Scene,
  zoom: number,
  h: number,
  slime: boolean,
  cannon = false,
): string {
  const key = `sketch-paddle-${h}${slime ? "-slime" : ""}${cannon ? "-cannon" : ""}`;
  if (scene.textures.exists(key)) return key;
  const paddle = scene.make.graphics({}, false);
  paddle.setScale(zoom);
  const rnd = mulberry32(7 + h);
  const loop = wobblyRect(PAD, PAD, PW, h, rnd);
  const shapes: { loop: Pt[]; fill: number }[] = [];
  if (cannon) {
    const midY = PAD + h / 2;
    const baseX = PAD + PW;
    const base = wobblyRect(baseX, midY - CANNON_BASE.h / 2, CANNON_BASE.w, CANNON_BASE.h, rnd);
    const barrelX = baseX + CANNON_BASE.w;
    const barrel = wobblyRect(
      barrelX,
      midY - CANNON_BARREL.h / 2,
      CANNON_BARREL.w,
      CANNON_BARREL.h,
      rnd,
    );
    shapes.push({ loop: barrel, fill: PAPER }, { loop: base, fill: PAPER });
  }
  shapes.push({ loop, fill: slime ? SLIME : PAPER });
  for (const shape of shapes) {
    paddle.fillStyle(shape.fill);
    strokeLoop(paddle, shape.loop);
    paddle.fillPath();
    paddle.lineStyle(LINE, INK, 1);
    strokeLoop(paddle, shape.loop);
    paddle.strokePath();
  }
  paddle.generateTexture(key, paddleTextureWidth(cannon) * zoom, (h + PAD * 2) * zoom);
  paddle.destroy();
  return key;
}

/** Bakes the net texture once at the camera zoom so it stays crisp. */
export function makeSketchTextures(scene: Phaser.Scene, zoom: number): void {
  if (scene.textures.exists(NET_KEY)) return;
  const rnd = mulberry32(7);

  // Net: a column of hand-drawn dashes, each a little different.
  const net = scene.make.graphics({}, false);
  net.setScale(zoom);
  const cx = PAD + 1;
  net.lineStyle(LINE + 0.4, PAPER, 1);
  for (let y = 0; y < H; y += 9) {
    const len = 4 + rnd() * 1.5;
    const y0 = y + rnd() * 1.5;
    const tilt = (rnd() - 0.5) * 1.2;
    net.beginPath();
    net.moveTo(cx + tilt, y0);
    net.lineTo(cx - tilt + (rnd() - 0.5) * 0.4, y0 + len);
    net.strokePath();
  }
  net.generateTexture(NET_KEY, (PAD * 2 + 2) * zoom, H * zoom);
  net.destroy();
}

export const NET_X = W / 2 - 1 - PAD;
