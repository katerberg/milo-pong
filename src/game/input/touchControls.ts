import Phaser from "phaser";
import { TouchFollow, type Tilt } from "./touchFollow";

/**
 * Finger-follow touch: a finger put down anywhere on the page (the margins around the canvas
 * too) steers the paddle toward its height. A quick tap reads as Space; a sideways swipe tilts.
 * Touches are read from the window because Phaser never sees ones that start off the canvas.
 *
 * Returns a reader for the finger's height in field pixels (0 at the top of the canvas,
 * `fieldHeight` at the bottom), or null when no finger is steering.
 */
export function createTouchFollow(
  scene: Phaser.Scene,
  fieldHeight: number,
  handlers: { onTap: () => void; onTilt: (tilt: Tilt) => void },
): () => number | null {
  const follow = new TouchFollow();
  const point = (touch: Touch) => ({ x: touch.clientX, y: touch.clientY });

  const onStart = (event: TouchEvent): void => {
    for (const touch of Array.from(event.changedTouches)) {
      if (follow.start(touch.identifier, point(touch), event.timeStamp)) handlers.onTap();
    }
  };
  const onMove = (event: TouchEvent): void => {
    for (const touch of Array.from(event.changedTouches)) {
      const tilt = follow.move(touch.identifier, point(touch));
      if (tilt !== undefined) handlers.onTilt(tilt);
    }
  };
  const onEnd = (event: TouchEvent): void => {
    for (const touch of Array.from(event.changedTouches)) {
      if (follow.end(touch.identifier, event.timeStamp)) handlers.onTap();
    }
  };
  const onCancel = (event: TouchEvent): void => {
    for (const touch of Array.from(event.changedTouches)) follow.cancel(touch.identifier);
  };

  window.addEventListener("touchstart", onStart, { passive: true });
  window.addEventListener("touchmove", onMove, { passive: true });
  window.addEventListener("touchend", onEnd, { passive: true });
  window.addEventListener("touchcancel", onCancel, { passive: true });
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    window.removeEventListener("touchstart", onStart);
    window.removeEventListener("touchmove", onMove);
    window.removeEventListener("touchend", onEnd);
    window.removeEventListener("touchcancel", onCancel);
  });

  return () => {
    // Touch event timestamps share performance.now()'s clock.
    const y = follow.target(performance.now());
    if (y === null) return null;
    const rect = scene.game.canvas.getBoundingClientRect();
    return rect.height > 0 ? ((y - rect.top) / rect.height) * fieldHeight : null;
  };
}

/**
 * Calls `onTap` when a finger lands anywhere that isn't a button: on empty canvas through
 * Phaser, or on the margins around the canvas through the DOM.
 */
export function onScreenTap(scene: Phaser.Scene, onTap: () => void): void {
  const onPointerDown = (
    pointer: Phaser.Input.Pointer,
    over: Phaser.GameObjects.GameObject[],
  ): void => {
    if (pointer.wasTouch && over.length === 0) onTap();
  };
  const onMarginTouch = (event: TouchEvent): void => {
    if (event.target !== scene.game.canvas) onTap();
  };
  scene.input.on(Phaser.Input.Events.POINTER_DOWN, onPointerDown);
  window.addEventListener("touchstart", onMarginTouch, { passive: true });
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    scene.input.off(Phaser.Input.Events.POINTER_DOWN, onPointerDown);
    window.removeEventListener("touchstart", onMarginTouch);
  });
}

/**
 * True on phones and tablets: no hover and a coarse pointer, the same test the page uses to
 * show the touch help. Two-player mode needs a keyboard, so these skip the opponent screen.
 */
export function isTouchOnly(): boolean {
  return window.matchMedia("(hover: none) and (pointer: coarse)").matches;
}
