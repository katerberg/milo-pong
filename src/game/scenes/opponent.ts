/** The traced "cpu/plyr" box, in its own pixels. */
export const OPPONENT_ART = { w: 1000, h: 585 };
/** The drawn slash between "cpu" and "plyr" (art pixels). Taps left of it pick the CPU. */
const SLASH = { top: { x: 478, y: 58 }, bottom: { x: 402, y: 410 } };

export type Opponent = "cpu" | "plyr";

/** Which side of the slash an art-space point falls on. */
export function opponentAt(x: number, y: number): Opponent {
  const { top, bottom } = SLASH;
  const slashX = top.x + ((y - top.y) / (bottom.y - top.y)) * (bottom.x - top.x);
  return x < slashX ? "cpu" : "plyr";
}
