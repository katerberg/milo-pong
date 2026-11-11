import "@fontsource/gochi-hand";
import Phaser from "phaser";
import { gameConfig } from "./game/config";
import { START_FONT } from "./game/scenes/StartScene";
import "./styles.css";

// Wait for the handwriting font so the Start label is measured with the right glyphs.
void document.fonts
  .load(`40px ${START_FONT}`)
  .catch(() => undefined)
  .then(() => new Phaser.Game(gameConfig));
