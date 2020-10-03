export const STATE = {
  NONE: 0, BLACK: 1, WHITE: 2,
  BLACK_WON: 3, WHITE_WON: 4, TIE: 5,
};

export const MESSAGE_TYPE = {
  COORD: 1,
  COLOR: 2,
};

export const CHANNEL_TYPE = { CMD: 0, WS: 1 };

export const i2xy = (i) => [i % 8, (i / 8) | 0];
export const xy2i = (x, y) => y * 8 + x;
const directions = [
  [1, 0], [1, 1], [0, 1], [-1, 1],
  [-1, 0], [-1, -1], [0, -1], [1, -1],
];

export function getPossibleMoves(gameState) {
  const { move, board } = gameState;
  const allowedMoves = new Map();
  let otherColor = move === STATE.BLACK ? STATE.WHITE : STATE.BLACK;
  board
    .map((cl, idx) => [cl, idx])
    .filter(([cl]) => cl === move)
    .forEach(([_, i]) => {
      const [x, y] = i2xy(i);

      directions.forEach(([dx, dy]) => {
        let rowToFlip = [];
        for (
          let _x = x + dx, _y = y + dy;
          _x >= 0 && _x < 8 && _y >= 0 && y < 8;
          _x += dx, _y += dy
        ) {
          const idx = xy2i(_x, _y);
          const c = board[idx];
          if (c === otherColor) {
            rowToFlip.push(idx);
          } else if (c === STATE.NONE) {
            if (rowToFlip.length) {
              allowedMoves.set(
                idx,
                rowToFlip.concat(allowedMoves.get(idx) || [])
              );
            }
            break;
          } else {
            break;
          }
        }
      });
    });
  return allowedMoves;
}

export function initGame() {
  const f = Array(64).fill(STATE.NONE);
  f[xy2i(3, 3)] = f[xy2i(4, 4)] = STATE.WHITE;
  f[xy2i(4, 3)] = f[xy2i(3, 4)] = STATE.BLACK;
  const state = { move: STATE.BLACK, board: f, pass: false };
  state.possibleMoves = getPossibleMoves(state);
  return state;
}

export function countDiscs(board) {
  let black = 0;
  let white = 0;
  for (let i = 0; i < board.length; i++) {
    if (board[i] === STATE.BLACK) black++;
    if (board[i] === STATE.WHITE) white++;
  }
  return { black, white };
}

export function choseWinner(board) {
  const { black, white } = countDiscs(board);
  let result = '';
  if (black > white) {
    result = 'Mr Black won';
  } else if (black < white) {
    result = 'Mr White won';
  } else {
    result = 'Tie, friendship won';
  }
  alert(`Black: ${black}\nWhite: ${white}\n${result}`);
}

export function deserializeMsg(type, raw) {
  if (type === CHANNEL_TYPE.CMD) {
  }
}
