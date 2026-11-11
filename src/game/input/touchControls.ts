import Phaser from "phaser";
import { TOUCH_STICK_RADIUS, TouchStick, type StickDirection } from "./touchStick";

/**
 * Dot-Man's touch scheme: a finger put down anywhere on the page (the margins around the
 * canvas too) becomes a stick, and dragging it steers. A quick tap reads as Space.
 * Touches are read from the window because Phaser never sees ones that start off the canvas.
 */
export function createTouchStick(
  scene: Phaser.Scene,
  handlers: { onTap: () => void; onDirection: (direction: StickDirection | null) => void },
): () => StickDirection | null {
  const stick = new TouchStick();
  const ring = stickElement("touch-stick-ring", TOUCH_STICK_RADIUS * 2);
  const knob = stickElement("touch-stick-knob", TOUCH_STICK_RADIUS);

  const draw = (): void => {
    const view = stick.view;
    ring.hidden = knob.hidden = view === null;
    if (view === null) return;
    place(ring, view.origin);
    place(knob, view.finger);
  };

  const onStart = (event: TouchEvent): void => {
    for (const touch of Array.from(event.changedTouches)) {
      if (stick.start(touch.identifier, { x: touch.clientX, y: touch.clientY })) handlers.onTap();
    }
    draw();
  };
  const onMove = (event: TouchEvent): void => {
    for (const touch of Array.from(event.changedTouches)) {
      const turned = stick.move(touch.identifier, { x: touch.clientX, y: touch.clientY });
      if (turned !== undefined) handlers.onDirection(turned);
    }
    draw();
  };
  const onEnd = (event: TouchEvent): void => {
    for (const touch of Array.from(event.changedTouches)) {
      if (stick.end(touch.identifier)) handlers.onTap();
    }
    draw();
  };
  const onCancel = (event: TouchEvent): void => {
    for (const touch of Array.from(event.changedTouches)) stick.end(touch.identifier);
    draw();
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
    ring.remove();
    knob.remove();
  });

  return () => stick.direction;
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

function stickElement(className: string, size: number): HTMLDivElement {
  const element = document.createElement("div");
  element.className = className;
  element.hidden = true;
  element.style.width = element.style.height = `${size}px`;
  document.body.append(element);
  return element;
}

function place(element: HTMLElement, at: { x: number; y: number }): void {
  element.style.transform = `translate(${at.x}px, ${at.y}px) translate(-50%, -50%)`;
}

/**
 * True on phones and tablets: no hover and a coarse pointer, the same test the page uses to
 * show the touch help. Two-player mode needs a keyboard, so these skip the opponent screen.
 */
export function isTouchOnly(): boolean {
  return window.matchMedia("(hover: none) and (pointer: coarse)").matches;
}
