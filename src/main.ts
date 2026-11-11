import "@fontsource/gochi-hand";
import Phaser from "phaser";
import { gameConfig } from "./game/config";
import { START_FONT } from "./game/scenes/StartScene";
import "./styles.css";

declare global {
  interface Window {
    __PING_GAME__?: Phaser.Game;
  }
}

// Wait for the handwriting font so the Start label is measured with the right glyphs.
void document.fonts
  .load(`40px ${START_FONT}`)
  .catch(() => undefined)
  .then(() => {
    window.__PING_GAME__ = new Phaser.Game(gameConfig);
  });
