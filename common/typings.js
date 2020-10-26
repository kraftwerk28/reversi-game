/**
 * This is a draft and isn't actually used in code
 */

// Model:
type Color = 'black' | 'white';
type Disc = { x: number, y: number, Color };

interface GameState {
	state: 'white' | 'black' | 'white-won' | 'black-won' | 'tie',
	board: Disc[];
	
	// Computable:
	whiteRemaining: number; // 64 - white discs on board
	blackRemaining: number; // 64 - black discs on board
}

// Controllers:
function onDiscPlaced(x, y): GameState;
function onSurrender(): GameState;
