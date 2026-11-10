import Phaser from "phaser";
import { H, W } from "./sim/pong";
import { PlayScene } from "./scenes/PlayScene";
import { StartScene } from "./scenes/StartScene";

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game-container",
  width: W,
  height: H,
  backgroundColor: "#000000",
  banner: false,
  pixelArt: true,
  scene: [StartScene, PlayScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  audio: { noAudio: true },
};
