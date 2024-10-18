import { CARD_SUIT_COLOR, CARD_SUIT_TO_COLOR, CardSuit, CardSuitColor, CardValue } from "./common";

export class Card {
    private _suit: CardSuit;
    private _value: CardValue;
    private _faceUp: boolean;

    constructor(suit: CardSuit, value: CardValue, isFaceUp = false) {
        this._faceUp = isFaceUp;
        this._suit = suit;
        this._value = value;
    }

    get suit(): CardSuit {
        return this._suit;
    }

    get value(): CardValue {
        return this._value;
    }

    get isFaceUp(): boolean {
        return this._faceUp;
    }

    get color(): CardSuitColor {
        return CARD_SUIT_TO_COLOR[this._suit];
    }

    public flip(): void {
        this._faceUp = !this._faceUp;
    }
}