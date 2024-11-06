import * as Phaser from 'phaser';
import { ASSET_KEYS, CARD_HEIGHT, CARD_WIDTH, SCENE_KEYS } from './common';
import { Solitaire } from '../lib/solitaire';
import { FoundationPile } from '../lib/foundationPile';
import { Card } from '../lib/card';

const DEBUG = false;
const SCALE = 1.5;
const CARD_BACK_FRAME = 52;
const SUIT_FRAMES = {
    HEART: 26,
    DIAMOND: 13,
    SPADE: 39,
    CLUB: 0
};

const FOUNDATION_PILE_X_POSITIONS = [360, 425, 490, 555];
const FOUNDATION_PILE_Y_POSITION = 5;
const DISCARD_PILE_X_POSITION = 85;
const DISCARD_PILE_Y_POSITION = 5;
const DRAW_PILE_X_POSITION = 5;
const DRAW_PILE_Y_POSITION = 5;
const TABLEAU_PILE_X_POSITION = 40;
const TABLEAU_PILE_Y_POSITION = 92;

type ZoneType = keyof typeof ZONE_TYPE;
const ZONE_TYPE = {
    FOUNDATION: 'FOUNDATION',
    TABLEAU: 'TABLEAU'
} as const;

export class GameScene extends Phaser.Scene {
    private drawPileCards!: Phaser.GameObjects.Image[];
    private discardPileCards!: Phaser.GameObjects.Image[];
    private foundationPilesCards!: Phaser.GameObjects.Image[][];
    private tableauContainers!: Phaser.GameObjects.Container[];
    private solitaire!: Solitaire;
    private backFrameOption:number = 4;
    
    constructor() {
        super({ key: SCENE_KEYS.GAME });
    }
    
    public create(): void {
        this.cameras.main.fadeIn(1000);

        this.solitaire = new Solitaire();
        this.solitaire.newGame();

        this.createDrawPile();
        this.createDiscardPile();
        this.createFoundationPiles();
        this.createTableauPiles();
        
        this.createDragEvents();
        this.createDropZones();
    }
    
    private createDrawPile(): void {
        this.drawCardLocationBox(DRAW_PILE_X_POSITION, DRAW_PILE_Y_POSITION);
        this.drawPileCards = [];
        
        for (let i = 0; i < 3; i++) {
            this.drawPileCards.push(this.createCard(DRAW_PILE_X_POSITION + i * 5, DRAW_PILE_Y_POSITION, false));
        }
        
        const drawZone = this.add.zone(0, 0, CARD_WIDTH * SCALE + 20, CARD_HEIGHT * SCALE + 12).setOrigin(0).setInteractive();
        drawZone.on(Phaser.Input.Events.POINTER_DOWN, () => {
            if (this.solitaire.drawPile.length === 0 && this.solitaire.discardPile.length === 0) {
                return;
            }

            if (this.solitaire.drawPile.length === 0) {
                this.solitaire.shuffleDiscardPile();
                this.discardPileCards.forEach((card) => card.setVisible(false));
                this.showCardsInDrawPile();
                return;
            }

            this.solitaire.drawCard();
            this.showCardsInDrawPile();

            this.discardPileCards[0].setFrame(this.discardPileCards[1].frame).setVisible(this.discardPileCards[1].visible);
            const card = this.solitaire.discardPile[this.solitaire.discardPile.length - 1];
            this.discardPileCards[1].setFrame(this.getCardFrame(card)).setVisible(true);
        });
        
        if (DEBUG) {
            this.add.rectangle(drawZone.x, drawZone.y, drawZone.width, drawZone.height, 0xff0000, 0.5).setOrigin(0);
        }
    }
    
    private createDiscardPile(): void {
        this.drawCardLocationBox(DISCARD_PILE_X_POSITION, DISCARD_PILE_Y_POSITION);
        this.discardPileCards = [];
        
        const bottomCard = this.createCard(DISCARD_PILE_X_POSITION, DISCARD_PILE_Y_POSITION, true).setVisible(false);
        const topCard = this.createCard(DISCARD_PILE_X_POSITION, DISCARD_PILE_Y_POSITION, true).setVisible(false);
        this.discardPileCards.push(bottomCard, topCard);
    }
    
    private createFoundationPiles(): void {
        this.foundationPilesCards = [];
        
        let index = 0;
        FOUNDATION_PILE_X_POSITIONS.forEach(x => {
            this.drawCardLocationBox(x, FOUNDATION_PILE_Y_POSITION);
            const bottomCard = this.createCard(x, FOUNDATION_PILE_Y_POSITION, true, undefined, undefined, index).setVisible(false);
            const topCard = this.createCard(x, FOUNDATION_PILE_Y_POSITION, true, undefined, undefined, index).setVisible(false);
            this.foundationPilesCards[index] = [bottomCard, topCard];
            index++;
        });
    }
    
    private createTableauPiles(): void {
        this.tableauContainers = [];

        this.solitaire.tableauPiles.forEach((pile, pileIndex) => {
            const x = TABLEAU_PILE_X_POSITION + pileIndex * 85;
            const tableauContainer = this.add.container(x, TABLEAU_PILE_Y_POSITION, []);
            this.tableauContainers.push(tableauContainer);

            pile.forEach((card, cardIndex) => {
                const cardGameObject = this.createCard(0, cardIndex * 20, false, cardIndex, pileIndex);
                tableauContainer.add(cardGameObject);
                if (card.isFaceUp) {
                    this.input.setDraggable(cardGameObject);
                    cardGameObject.setFrame(this.getCardFrame(card));
                }
            });
        });
    }
    
    private drawCardLocationBox(x: number, y: number): void {
        this.add.rectangle(x, y, 56, 78).setOrigin(0).setStrokeStyle(2, 0x000000, 0.5);
    }
    
    private createCard(
        x: number,
        y:number,
        draggable: boolean,
        cardIndex?: number,
        pileIndex?: number,
        foundationPileIndex?: number
    ): Phaser.GameObjects.Image {
        return this.add.image(x,y,ASSET_KEYS.CARDS, CARD_BACK_FRAME + this.backFrameOption).setOrigin(0).setScale(SCALE).setInteractive({
            draggable
        }).setData({
            x,
            y,
            cardIndex,
            pileIndex,
            foundationPileIndex
        });
    }
    
    private createDragEvents(): void {
        this.createDragStartEventListener();
        this.createDragEventListener();
        this.createDragEndEventListener();
        this.createDropEventListener();
    }
    
    private createDragStartEventListener(): void {
        this.input.on(Phaser.Input.Events.DRAG_START, (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.Image) => {
            gameObject.setData({x: gameObject.x, y: gameObject.y}); // ??
            
            const tableauPileIndex = gameObject.getData('pileIndex') as number | undefined;
            if(tableauPileIndex !== undefined) {
                this.tableauContainers[tableauPileIndex].setDepth(2);
            } else {
                gameObject.setDepth(2);
            }
            
            gameObject.setAlpha(0.8);
        });
    }
    
    private createDragEventListener(): void {
        this.input.on(Phaser.Input.Events.DRAG, (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.Image, dragX: number, dragY: number) => {
            gameObject.setPosition(dragX, dragY);
            
            const tableauPileIndex = gameObject.getData('pileIndex') as number | undefined;
            const cardIndex = gameObject.getData('cardIndex') as number;
            if(tableauPileIndex !== undefined) {
                const numberOfCardsToMove = this.getNumberOfCardsToMoveAsPartOfStack(tableauPileIndex, cardIndex);
                
                for (let i = 1; i <= numberOfCardsToMove; i++) {
                    this.tableauContainers[tableauPileIndex]
                    .getAt<Phaser.GameObjects.Image>(cardIndex + i)
                    .setPosition(dragX, dragY + 20 * i);
                }
            }
        });
    }
    
    private createDragEndEventListener(): void {
        this.input.on(Phaser.Input.Events.DRAG_END, (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.Image) => {
            const tableauPileIndex = gameObject.getData('pileIndex') as number | undefined;
            if(tableauPileIndex !== undefined) {
                this.tableauContainers[tableauPileIndex].setDepth(0);
            } else {
                gameObject.setDepth(0);
            }
            
            if (gameObject.active) {
                gameObject.setAlpha(1);
                gameObject.setPosition(gameObject.getData('x') as number,gameObject.getData('y') as number);
                
                const cardIndex = gameObject.getData('cardIndex') as number;
                if(tableauPileIndex !== undefined) {
                    const numberOfCardsToMove = this.getNumberOfCardsToMoveAsPartOfStack(tableauPileIndex, cardIndex);
                    
                    for (let i = 1; i <= numberOfCardsToMove; i++) {
                        const cardToMove = this.tableauContainers[tableauPileIndex].getAt<Phaser.GameObjects.Image>(cardIndex + i);
                        cardToMove.setPosition(cardToMove.getData('x') as number, cardToMove.getData('y') as number);
                    }
                }
            }
        });
    }
    
    private createDropEventListener(): void {
        this.input.on(Phaser.Input.Events.DROP, (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.Image, dropZone: Phaser.GameObjects.Zone) => {
            const zoneType = dropZone.getData('zoneType') as ZoneType;
            if (zoneType == ZONE_TYPE.FOUNDATION) {
                this.handleMoveCardToFoundation(gameObject);
                return;
            }
            
            const tableauIndex = dropZone.getData('tableauIndex') as number;
            this.handleMoveCardToTableau(gameObject, tableauIndex);
        });
    }
    
    private getNumberOfCardsToMoveAsPartOfStack(tableauPileIndex: number, cardIndex: number): number {
        if (tableauPileIndex !== undefined) {
            const lastCardIndex = this.tableauContainers[tableauPileIndex].length - 1;
            return lastCardIndex - cardIndex;
        }
        
        return 0;
    }
    
    private createDropZones(): void {
        let zone = this.add
        .zone(350, 0, 270, 85)
        .setOrigin(0)
        .setRectangleDropZone(270, 85)
        .setData({
            zoneType: ZONE_TYPE.FOUNDATION
        })
        .setDepth(-1);
        
        if (DEBUG) {
            this.add.rectangle(zone.x, zone.y, zone.width, zone.height, 0xff0000, 0.2).setOrigin(0);
        }
        
        for (let i = 0; i < 7; i++) {
            zone = this.add
            .zone(30 + i * 85, 92, 75.5, 585)
            .setOrigin(0)
            .setRectangleDropZone(75.5, 585)
            .setData({
                zoneType: ZONE_TYPE.TABLEAU,
                tableauIndex: i
            })
            .setDepth(-1);
            
            if (DEBUG) {
                this.add.rectangle(zone.x, zone.y, zone.width, zone.height, 0xff0000, 0.5).setOrigin(0);
            }
        }
    }
    
    private handleMoveCardToFoundation(gameObject: Phaser.GameObjects.Image): void {
        let isValidMove = false;
        let isCardFromDiscardPile = false;
        
        const tableauPileIndex = gameObject.getData('pileIndex') as number | undefined;
        if (tableauPileIndex === undefined) {
            isValidMove = this.solitaire.playDiscardPileCardToFoundation();
            isCardFromDiscardPile = true;
        } else {
            isValidMove = this.solitaire.moveTableauCardToFoundation(tableauPileIndex as number);
        }
        
        if (!isValidMove) {
            return;
        }
        
        if (isCardFromDiscardPile) {
            this.updateCardGameObjectsInDiscardPile();
        } else {
            this.handleRevealingNewTableauCards(tableauPileIndex as number);
            this.tableauContainers[tableauPileIndex as number].setDepth(0);
            gameObject.destroy();
        }
        
        this.updateFoundationPiles();
    }
    
    private handleMoveCardToTableau(gameObject: Phaser.GameObjects.Image, targetTableauPileIndex: number): void {
        let isValidMove = false;
        let isCardFromDiscardPile = false;
        let isCardFromFoundationPile = false;
        const originalTargetPileSize = this.tableauContainers[targetTableauPileIndex].length;
        
        const tableauPileIndex = gameObject.getData('pileIndex') as number | undefined;
        const foundationPileIndex = gameObject.getData('foundationPileIndex') as number | undefined;
        const tableauCardIndex = gameObject.getData('cardIndex') as number;
        
        if (tableauPileIndex === undefined && foundationPileIndex === undefined) {
            isValidMove = this.solitaire.playDiscardPileCardToTableau(targetTableauPileIndex);
            isCardFromDiscardPile = true;
        } else if(tableauPileIndex === undefined) {
            isValidMove = this.solitaire.moveFoundationCardToTableau(foundationPileIndex as number, targetTableauPileIndex);
            isCardFromFoundationPile = true;
        } else {
            isValidMove = this.solitaire.moveTableauCardsToAnotherTableau(tableauPileIndex, tableauCardIndex, targetTableauPileIndex);
        }
        
        if (!isValidMove) {
            return;
        }
        
        if (isCardFromDiscardPile || isCardFromFoundationPile) {
            const card = this.createCard(0, originalTargetPileSize * 20, true, originalTargetPileSize, targetTableauPileIndex);
            card.setFrame(gameObject.frame);
            this.tableauContainers[targetTableauPileIndex].add(card);

            if (isCardFromDiscardPile) {
                this.updateCardGameObjectsInDiscardPile();
            } else {
                this.updateFoundationPiles();
            }
            return;
        }
        
        const numberOfCardsToMove = this.getNumberOfCardsToMoveAsPartOfStack(tableauPileIndex as number, tableauCardIndex);
        for (let i = 0; i <= numberOfCardsToMove; i++) {
            const cardGameObject = this.tableauContainers[tableauPileIndex as number].getAt<Phaser.GameObjects.Image>(tableauCardIndex);
            this.tableauContainers[tableauPileIndex as number].removeAt(tableauCardIndex);
            this.tableauContainers[targetTableauPileIndex].add(cardGameObject);
            
            const cardIndex = originalTargetPileSize + i;
            cardGameObject.setData({
                x: 0,
                y: cardIndex * 20,
                cardIndex,
                pileIndex: targetTableauPileIndex
            })
        }
        
        this.tableauContainers[tableauPileIndex as number].setDepth(0);
        this.handleRevealingNewTableauCards(tableauPileIndex as number);
    }
    
    private updateCardGameObjectsInDiscardPile(): void {
        this.discardPileCards[1].setFrame(this.discardPileCards[0].frame).setVisible(this.discardPileCards[0].visible);
        const discardPileCard = this.solitaire.discardPile[this.solitaire.discardPile.length-2];
        if (discardPileCard === undefined) {
            this.discardPileCards[0].setVisible(false);
        } else {
            this.discardPileCards[0].setVisible(true).setFrame(this.getCardFrame(discardPileCard));
        }
    }
    
    private handleRevealingNewTableauCards(tableauPileIndex: number): void {
        const flipTableauCard = this.solitaire.flipTopTableauCard(tableauPileIndex);
        if (flipTableauCard) {
            const tableauPile = this.solitaire.tableauPiles[tableauPileIndex];
            const tableauCard = tableauPile[tableauPile.length - 1];
            const cardGameObject = this.tableauContainers[tableauPileIndex].getAt<Phaser.GameObjects.Image>(tableauPile.length - 1);

            cardGameObject.setFrame(this.getCardFrame(tableauCard));
            this.input.setDraggable(cardGameObject);
        }
    }
    
    private updateFoundationPiles(): void {
        this.solitaire.foundationPiles.forEach((pile: FoundationPile, pileIndex: number) => {
            if (pile.value === 0) {
                this.foundationPilesCards[pileIndex][0].setVisible(false);
                return;
            } else if (pile.value === 1) {
                this.foundationPilesCards[pileIndex][0].setVisible(true).setFrame(this.getCardFrame(pile));
                this.foundationPilesCards[pileIndex][1].setVisible(false);
            } else {
                this.foundationPilesCards[pileIndex][0].setVisible(true).setFrame(this.getCardFrame(pile, pile.value - 1));
                this.foundationPilesCards[pileIndex][1].setVisible(true).setFrame(this.getCardFrame(pile));
            }
        })

        this.checkForWinScenario();
    }

    private showCardsInDrawPile(): void {
        const numberOfCardsToShow = Math.min(this.solitaire.drawPile.length, 3);
        this.drawPileCards.forEach((card, cardIndex) => {
            const showCard = cardIndex < numberOfCardsToShow;
            card.setVisible(showCard);
        });
    }

    private getCardFrame(data: Card | FoundationPile, customValue: number | null = null): number {
        return SUIT_FRAMES[data.suit] + (customValue ?? data.value) - 1;
    }

    private checkForWinScenario(): void {
        // Other win scenario: draw and discard pile are empty, and there are no flipped down cards

        let sum = 0;
        this.solitaire.foundationPiles.forEach((pile: FoundationPile, pileIndex: number) => {
            sum += pile.value;
        })

        // if all piles have value === 13, it means the game was won!
        if ((sum / this.solitaire.foundationPiles.length) === 13) {
            this.scene.start(SCENE_KEYS.TITLE);
        }
    }
}
