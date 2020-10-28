export const STATE = {
  NONE: 0, BLACK: 1, WHITE: 2,
  BLACK_WON: 3, WHITE_WON: 4, TIE: 5,
};

export const ALPHABET = 'ABCDEFGH';
export const COLOR = {
  black: STATE.BLACK,
  white: STATE.WHITE,
}
export const PASS = 'pass';

export const MSG_TYPE = {
  COORD: 1, // Either "black hole" or disc placement
  COLOR: 2, // Color selection
  ERR: 3, // Could not parse message
  SYNC: 4, // Sync game state
  AUTH_TOK: 5, // Auth token for reconnection
};

export const LOGLEVEL = { I: 0, W: 1, E: 2 };

export const CHAN_TYPE = { CMD: 0, WS: 1 };

