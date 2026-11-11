import Phaser from "phaser";

/**
 * The canvas is letterboxed to keep its aspect ratio, so on a wide window the "back" bar drawn
 * inside it stops short of the screen edges. This adds matching strips of page on each side of the
 * canvas so the bar runs the full width of the screen. Clicking them goes back too.
 */
export function extendBackBar(
  scene: Phaser.Scene,
  opts: { barShare: number; fill: string; line: string; onClick: () => void },
): void {
  const left = document.createElement("div");
  const right = document.createElement("div");
  const strips = [left, right];
  for (const strip of strips) {
    strip.style.cssText = `position:fixed;z-index:5;box-sizing:border-box;background:${opts.fill};border-top:5px solid ${opts.line};cursor:pointer;`;
    strip.addEventListener("pointerdown", opts.onClick, { once: true });
    document.body.appendChild(strip);
  }

  const layout = () => {
    const rect = scene.game.canvas.getBoundingClientRect();
    const barH = rect.height * opts.barShare;
    const top = rect.bottom - barH;
    left.style.cssText += `top:${top}px;height:${barH}px;left:0;width:${Math.max(0, rect.left)}px;`;
    right.style.cssText += `top:${top}px;height:${barH}px;left:${rect.right}px;right:0;`;
  };
  layout();
  window.addEventListener("resize", layout);
  scene.scale.on(Phaser.Scale.Events.RESIZE, layout);

  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    window.removeEventListener("resize", layout);
    scene.scale.off(Phaser.Scale.Events.RESIZE, layout);
    for (const strip of strips) strip.remove();
  });
}
