import { describe, expect, it } from "vitest";
import { TOUCH_HOLD_MS, TOUCH_TAP_SLOP, TOUCH_TILT_SWIPE, TouchFollow } from "./touchFollow";

const origin = { x: 100, y: 100 };

describe("TouchFollow", () => {
  it("treats a quick touch that doesn't move as a tap, and doesn't steer meanwhile", () => {
    const touch = new TouchFollow();
    expect(touch.start(1, origin, 0)).toBe(false);
    touch.move(1, { x: 103, y: 102 });
    expect(touch.target(50)).toBeNull();
    expect(touch.end(1, 100)).toBe(true);
    expect(touch.target(100)).toBeNull();
  });

  it("follows the finger's height once it moves", () => {
    const touch = new TouchFollow();
    touch.start(1, origin, 0);
    touch.move(1, { x: 100, y: 100 + TOUCH_TAP_SLOP });
    expect(touch.target(10)).toBe(100 + TOUCH_TAP_SLOP);
    touch.move(1, { x: 105, y: 40 });
    expect(touch.target(20)).toBe(40);
    expect(touch.end(1, 30)).toBe(false);
  });

  it("follows a finger held still, and lifting it then is not a tap", () => {
    const touch = new TouchFollow();
    touch.start(1, origin, 0);
    expect(touch.target(TOUCH_HOLD_MS)).toBe(100);
    expect(touch.end(1, TOUCH_HOLD_MS)).toBe(false);
  });

  it("tilts on a sideways swipe, once per swipe length", () => {
    const touch = new TouchFollow();
    touch.start(1, origin, 0);
    expect(touch.move(1, { x: 100 - TOUCH_TILT_SWIPE, y: 105 })).toBe("left");
    expect(touch.move(1, { x: 100 - TOUCH_TILT_SWIPE - 5, y: 105 })).toBeUndefined();
    expect(touch.move(1, { x: 100, y: 105 })).toBe("right");
  });

  it("doesn't tilt from sideways drift during long vertical drags", () => {
    const touch = new TouchFollow();
    touch.start(1, origin, 0);
    let tilted = false;
    for (let i = 1; i <= 20; i++) {
      tilted ||= touch.move(1, { x: 100 + i * 3, y: 100 + i * 10 }) !== undefined;
    }
    expect(tilted).toBe(false);
  });

  it("treats a second finger as a tap and ignores it otherwise", () => {
    const touch = new TouchFollow();
    touch.start(1, origin, 0);
    touch.move(1, { x: 100, y: 130 });
    expect(touch.start(2, { x: 10, y: 10 }, 5)).toBe(true);
    expect(touch.move(2, { x: 90, y: 10 })).toBeUndefined();
    expect(touch.end(2, 10)).toBe(false);
    expect(touch.target(10)).toBe(130);
  });

  it("drops a cancelled finger without a tap", () => {
    const touch = new TouchFollow();
    touch.start(1, origin, 0);
    touch.cancel(1);
    expect(touch.target(TOUCH_HOLD_MS)).toBeNull();
    expect(touch.start(2, origin, 0)).toBe(false);
  });

  it("picks up a finger first seen mid-drag and steers with it at once", () => {
    const touch = new TouchFollow();
    expect(touch.move(1, origin)).toBeUndefined();
    expect(touch.target(0)).toBe(100);
    expect(touch.end(1, 0)).toBe(false);
  });
});
