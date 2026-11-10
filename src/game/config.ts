import Phaser from "phaser";
import { H, W } from "./sim/pong";
import { PlayScene, ZOOM } from "./scenes/PlayScene";
import { StartScene } from "./scenes/StartScene";

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game-container",
  width: W * ZOOM,
  height: H * ZOOM,
  backgroundColor: "#000000",
  banner: false,
  antialias: true,
  scene: [StartScene, PlayScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  audio: { noAudio: true },
};
