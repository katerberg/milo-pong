/**
 * The floating touch stick from Dot-Man: put a finger down anywhere and drag to steer.
 * Plain logic with no Phaser or DOM, in CSS pixels, so Vitest can cover it.
 */
export type StickDirection = "up" | "down" | "left" | "right";
export type StickPoint = { x: number; y: number };

/** How far the finger must move before the stick points anywhere. */
export const TOUCH_STICK_DEADZONE = 10;
/** The ring's radius. Past it, the ring is dragged along behind the finger. */
export const TOUCH_STICK_RADIUS = 32;

export function stickDirection(
  origin: StickPoint,
  finger: StickPoint,
  deadzone = TOUCH_STICK_DEADZONE,
): StickDirection | null {
  const dx = finger.x - origin.x;
  const dy = finger.y - origin.y;
  if (Math.hypot(dx, dy) < deadzone) return null;
  if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? "left" : "right";
  return dy < 0 ? "up" : "down";
}

/** Drags the origin along so the finger never sits past the ring; reversing then stays quick. */
export function followStickOrigin(
  origin: StickPoint,
  finger: StickPoint,
  radius = TOUCH_STICK_RADIUS,
): StickPoint {
  const dx = finger.x - origin.x;
  const dy = finger.y - origin.y;
  const distance = Math.hypot(dx, dy);
  if (distance <= radius) return origin;
  const pull = (distance - radius) / distance;
  return { x: origin.x + dx * pull, y: origin.y + dy * pull };
}

type Stick = {
  touchId: number;
  origin: StickPoint;
  finger: StickPoint;
  direction: StickDirection | null;
  /** Whether the finger ever left the deadzone; a touch that never does is a tap. */
  moved: boolean;
};

/**
 * Tracks one finger as the stick. A finger lifted without leaving the deadzone is a tap,
 * and so is any other finger put down while the stick is held.
 */
export class TouchStick {
  private stick: Stick | null = null;

  /** Returns true if this touch is a tap (a second finger while the stick is held). */
  start(touchId: number, at: StickPoint): boolean {
    if (this.stick !== null) return true;
    this.stick = { touchId, origin: at, finger: at, direction: null, moved: false };
    return false;
  }

  /** Returns the new direction when the stick turns to point somewhere else, else undefined. */
  move(touchId: number, at: StickPoint): StickDirection | null | undefined {
    const stick = this.stick;
    if (stick === null || stick.touchId !== touchId) return undefined;
    stick.finger = at;
    stick.origin = followStickOrigin(stick.origin, at);
    const direction = stickDirection(stick.origin, at);
    if (direction !== null) stick.moved = true;
    if (direction === stick.direction) return undefined;
    stick.direction = direction;
    return direction;
  }

  /** Returns true if lifting this finger is a tap. */
  end(touchId: number): boolean {
    const stick = this.stick;
    if (stick === null || stick.touchId !== touchId) return false;
    this.stick = null;
    return !stick.moved;
  }

  get direction(): StickDirection | null {
    return this.stick?.direction ?? null;
  }

  /** Where to draw the ring and the knob, or null when no finger is down. */
  get view(): { origin: StickPoint; finger: StickPoint } | null {
    return this.stick && { origin: this.stick.origin, finger: this.stick.finger };
  }
}
