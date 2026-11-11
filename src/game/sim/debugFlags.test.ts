import { describe, expect, it } from "vitest";
import { parseUpgradeList, startingUpgradesFromUrl } from "./debugFlags";
import { createState, newGame, paddleHeight, PH, SIZE_UP_PX } from "./pong";

describe("debug flags", () => {
  it("reads upgrade ids and short names, ignoring case and unknown names", () => {
    expect(parseUpgradeList("slime, Turn,strength,nope,SPEED")).toEqual([
      "slime",
      "turn",
      "strengthBoost",
    ]);
    expect(parseUpgradeList("sizeUp,size")).toEqual(["sizeUp", "sizeUp"]);
    expect(parseUpgradeList(null)).toEqual([]);
  });

  it("caps each side at the upgrade limit", () => {
    expect(parseUpgradeList("slime,turn,size,speed")).toHaveLength(3);
  });

  it("splits the player's and the CPU's upgrades", () => {
    expect(startingUpgradesFromUrl("?upgrades=slime&cpuUpgrades=size,size")).toEqual({
      left: ["slime"],
      right: ["sizeUp", "sizeUp"],
    });
    expect(startingUpgradesFromUrl("")).toEqual({ left: [], right: [] });
  });

  it("a new game starts with the chosen upgrades in effect", () => {
    const s = createState(() => 0.5);
    newGame(s, false, startingUpgradesFromUrl("?upgrades=size,size"));
    expect(s.left.upgrades).toEqual(["sizeUp", "sizeUp"]);
    expect(paddleHeight(s.left)).toBe(PH + 2 * SIZE_UP_PX);
    expect(s.right.upgrades).toEqual([]);
  });
});
