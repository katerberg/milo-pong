// Positions of the hand-drawn pieces, in pixels of the scanned drawing (1210 x 920).
// Generated alongside the PNGs in src/assets/start.
export const DRAWING = { w: 1210, h: 920 };

export const PIECES = {
  word: { x: 187, y: 391 },
  dot: { x: 408, y: 332, w: 98, h: 131 },
  paddleLeft: { x: 272, y: 261, w: 88, h: 133 },
  paddleRight: { x: 574, y: 236, w: 127, h: 195 },
  button: { x: 805, y: 95, w: 332, h: 232 },
} as const;
