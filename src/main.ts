import * as Phaser from 'phaser';
import { PreloadScene } from './scenes/preload-scene';
import { TitleScene } from './scenes/title-scene';
import { GameScene } from './scenes/game-scene';

const gameConfig: Phaser.Types.Core.GameConfig = {
    type: Phaser.WEBGL,
    pixelArt: true,
    scale: {
        parent: 'game-container',
        width: 640,
        height: 480,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        mode: Phaser.Scale.FIT,
    },
    backgroundColor: '#387f3c',
    scene: [PreloadScene, TitleScene, GameScene],
};

window.onload = () => {
    new Phaser.Game(gameConfig);
};
