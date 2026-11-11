import { describe, expect, it } from "vitest";
import {
  followStickOrigin,
  stickDirection,
  TOUCH_STICK_DEADZONE,
  TOUCH_STICK_RADIUS,
  TouchStick,
} from "./touchStick";

const origin = { x: 100, y: 100 };

describe("stickDirection", () => {
  it("holds no direction inside the deadzone", () => {
    expect(stickDirection(origin, { x: 100 + TOUCH_STICK_DEADZONE - 1, y: 100 })).toBeNull();
  });

  it("picks the dominant axis past the deadzone", () => {
    expect(stickDirection(origin, { x: 80, y: 95 })).toBe("left");
    expect(stickDirection(origin, { x: 120, y: 110 })).toBe("right");
    expect(stickDirection(origin, { x: 95, y: 80 })).toBe("up");
    expect(stickDirection(origin, { x: 105, y: 120 })).toBe("down");
  });

  it("breaks an exact diagonal tie toward the vertical axis", () => {
    expect(stickDirection(origin, { x: 120, y: 120 })).toBe("down");
  });
});

describe("followStickOrigin", () => {
  it("keeps the origin while the finger stays inside the ring", () => {
    expect(followStickOrigin(origin, { x: 100 + TOUCH_STICK_RADIUS, y: 100 })).toBe(origin);
  });

  it("drags the origin so the finger sits on the ring edge", () => {
    const next = followStickOrigin(origin, { x: 100 + TOUCH_STICK_RADIUS + 50, y: 100 });
    expect(next).toEqual({ x: 150, y: 100 });
  });

  it("reverses within a ring plus deadzone of travel after a long drag", () => {
    const dragged = followStickOrigin(origin, { x: 300, y: 100 });
    const back = { x: 300 - TOUCH_STICK_RADIUS - TOUCH_STICK_DEADZONE, y: 100 };
    expect(stickDirection(dragged, back)).toBe("left");
  });
});

describe("TouchStick", () => {
  it("treats a finger lifted without moving as a tap", () => {
    const stick = new TouchStick();
    expect(stick.start(1, origin)).toBe(false);
    expect(stick.move(1, { x: 103, y: 102 })).toBeUndefined();
    expect(stick.end(1)).toBe(true);
    expect(stick.view).toBeNull();
  });

  it("reports direction changes while dragging and is not a tap", () => {
    const stick = new TouchStick();
    stick.start(1, origin);
    expect(stick.move(1, { x: 100, y: 80 })).toBe("up");
    expect(stick.move(1, { x: 100, y: 70 })).toBeUndefined();
    expect(stick.direction).toBe("up");
    expect(stick.move(1, { x: 60, y: 70 })).toBe("left");
    expect(stick.end(1)).toBe(false);
    expect(stick.direction).toBeNull();
  });

  it("is not a tap after dragging back to the start", () => {
    const stick = new TouchStick();
    stick.start(1, origin);
    stick.move(1, { x: 100, y: 120 });
    expect(stick.move(1, origin)).toBeNull();
    expect(stick.end(1)).toBe(false);
  });

  it("treats a second finger as a tap and ignores it otherwise", () => {
    const stick = new TouchStick();
    stick.start(1, origin);
    stick.move(1, { x: 100, y: 130 });
    expect(stick.start(2, { x: 10, y: 10 })).toBe(true);
    expect(stick.move(2, { x: 10, y: 90 })).toBeUndefined();
    expect(stick.end(2)).toBe(false);
    expect(stick.direction).toBe("down");
  });
});
