import type Phaser from "phaser";

/** Switches the page between game chrome (controls line, black) and title chrome (no text, blue). */
export function setHelpVisible(game: Phaser.Game, visible: boolean): void {
  const help = document.getElementById("help");
  if (help) help.hidden = !visible;
  // The start screen bleeds its blue past the canvas; the game itself sits on black.
  document.body.style.background = visible ? "#000" : "#2458bf";
  game.scale.refresh();
}
