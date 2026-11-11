/**
 * Finger-follow touch controls: put a finger down anywhere and the paddle chases its height.
 * Plain logic with no Phaser or DOM, in CSS pixels, so Vitest can cover it.
 */
export type TouchPoint = { x: number; y: number };
export type Tilt = "left" | "right";

/** A finger that stays within this distance of where it landed may still be a tap. */
export const TOUCH_TAP_SLOP = 10;
/** A finger held this long (ms) starts steering even if it hasn't moved; a quicker lift is a tap. */
export const TOUCH_HOLD_MS = 150;
/** Sideways travel that tilts the paddle (with the turn upgrade). */
export const TOUCH_TILT_SWIPE = 24;

type Finger = {
  touchId: number;
  start: TouchPoint;
  at: TouchPoint;
  startTime: number;
  /** Where sideways travel is measured from; moved on each tilt and on vertical drags. */
  anchor: TouchPoint;
  /** Whether the finger ever left the tap slop; a touch that never does may be a tap. */
  moved: boolean;
};

/**
 * Tracks one finger. Its height is where the paddle should go, once it has moved or been held;
 * a quick touch that never moves is a tap, and so is any other finger put down meanwhile.
 * A sideways swipe tilts the paddle.
 */
export class TouchFollow {
  private finger: Finger | null = null;

  /** Returns true if this touch is a tap (a second finger while one is already steering). */
  start(touchId: number, at: TouchPoint, now: number): boolean {
    if (this.finger !== null) return true;
    this.finger = { touchId, start: at, at, startTime: now, anchor: at, moved: false };
    return false;
  }

  /**
   * Returns a tilt when this move finishes a sideways swipe, else undefined. A finger first
   * seen moving (it landed before these controls existed, such as the tap that starts a game)
   * is picked up and steers at once.
   */
  move(touchId: number, at: TouchPoint): Tilt | undefined {
    if (this.finger === null) {
      this.finger = { touchId, start: at, at, startTime: -Infinity, anchor: at, moved: true };
      return undefined;
    }
    const finger = this.finger;
    if (finger.touchId !== touchId) return undefined;
    finger.at = at;
    if (Math.hypot(at.x - finger.start.x, at.y - finger.start.y) >= TOUCH_TAP_SLOP) {
      finger.moved = true;
    }
    const dx = at.x - finger.anchor.x;
    const dy = at.y - finger.anchor.y;
    if (Math.abs(dx) >= TOUCH_TILT_SWIPE && Math.abs(dx) >= Math.abs(dy)) {
      finger.anchor = at;
      return dx < 0 ? "left" : "right";
    }
    // Mostly vertical travel: start measuring sideways travel afresh so drift doesn't add up.
    if (Math.abs(dy) >= TOUCH_TILT_SWIPE && Math.abs(dy) > Math.abs(dx)) finger.anchor = at;
    return undefined;
  }

  /** Returns true if lifting this finger is a tap. */
  end(touchId: number, now: number): boolean {
    const finger = this.finger;
    if (finger === null || finger.touchId !== touchId) return false;
    this.finger = null;
    return !finger.moved && now - finger.startTime < TOUCH_HOLD_MS;
  }

  /** Forgets this finger without counting it as a tap. */
  cancel(touchId: number): void {
    if (this.finger?.touchId === touchId) this.finger = null;
  }

  /** The finger's height to steer toward, or null while there's none or it may still be a tap. */
  target(now: number): number | null {
    const finger = this.finger;
    if (finger === null) return null;
    if (!finger.moved && now - finger.startTime < TOUCH_HOLD_MS) return null;
    return finger.at.y;
  }
}
