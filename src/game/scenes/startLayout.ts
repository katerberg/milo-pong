// Positions of the hand-drawn pieces, in pixels of the scanned drawing (1210 x 920).
// Generated alongside the PNGs in src/assets/start.
export const DRAWING = { w: 1210, h: 920 };

const DOT = { w: 98, h: 131 };
// The taller of the two drawn paddles, shrunk slightly so it clears the letters below.
const PADDLE_SCALE = 0.85;
const PADDLE = { w: 127 * PADDLE_SCALE, h: 195 * PADDLE_SCALE, scale: PADDLE_SCALE };
// The ball rallies along a straight line just above the i, clear of the p and n.
const RALLY_Y = 282;
const DOT_CENTER_X = 457;
const PADDLE_GAP = 100; // from the dot's centre to each paddle's inner edge
const PADDLE_Y = RALLY_Y + DOT.h / 2 - PADDLE.h / 2;

export const PIECES = {
  word: { x: 187, y: 391 },
  dot: { x: DOT_CENTER_X - DOT.w / 2, y: RALLY_Y, ...DOT },
  paddleLeft: { x: DOT_CENTER_X - PADDLE_GAP - PADDLE.w, y: PADDLE_Y, ...PADDLE },
  paddleRight: { x: DOT_CENTER_X + PADDLE_GAP, y: PADDLE_Y, ...PADDLE },
  button: { x: 805, y: 95, w: 332, h: 232 },
  // The same drawn box, smaller, in the top-left corner.
  creditsButton: { x: 40, y: 30, w: 332 * 0.6, h: 232 * 0.6, scale: 0.6 },
} as const;
