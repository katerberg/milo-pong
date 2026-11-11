import { MAX_UPGRADES, UPGRADES, type StartingUpgrades, type Upgrade } from "./pong";

/** Short names accepted in the URL alongside the full upgrade ids. */
const ALIASES: Record<string, Upgrade> = {
  strength: "strengthBoost",
  speed: "speedBoost",
  size: "sizeUp",
};

/** Parses a comma-separated list like "slime,size,size" into upgrades, skipping unknown names. */
export function parseUpgradeList(value: string | null): Upgrade[] {
  if (!value) return [];
  const byLowerId = new Map(UPGRADES.map((u) => [u.toLowerCase(), u]));
  return value
    .split(",")
    .map((name) => name.trim().toLowerCase())
    .map((name) => ALIASES[name] ?? byLowerId.get(name))
    .filter((u): u is Upgrade => u !== undefined)
    .slice(0, MAX_UPGRADES);
}

/**
 * Debug flags: `?upgrades=slime,turn` starts every game with those upgrades for the left
 * player, and `?cpuUpgrades=...` does the same for the right side (CPU or player two).
 */
export function startingUpgradesFromUrl(search: string): StartingUpgrades {
  const params = new URLSearchParams(search);
  return {
    left: parseUpgradeList(params.get("upgrades")),
    right: parseUpgradeList(params.get("cpuUpgrades")),
  };
}
