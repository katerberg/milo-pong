import { describe, expect, it } from "vitest";
import { opponentAt } from "./opponent";

describe("opponentAt", () => {
  it("picks the CPU left of the slash and a player right of it", () => {
    expect(opponentAt(200, 200)).toBe("cpu");
    expect(opponentAt(750, 300)).toBe("plyr");
  });

  it("follows the slash's lean", () => {
    // Near the top the slash is further right than near the bottom.
    expect(opponentAt(460, 70)).toBe("cpu");
    expect(opponentAt(460, 400)).toBe("plyr");
  });
});
