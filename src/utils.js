import { linear } from 'svelte/easing';

// Disc flip animation
export const swapTrn = (_, { duration = 300 }) => ({
  duration,
  easing: linear,
  css: (t, u) => {
    return `
      transform: rotateX(${t * 0.5}turn)
                 scale(${(t >= 0.5 ? u : t) * 2 + 1});
      visibility: ${t >= 0.5 ? 'visible' : 'hidden'};
    `;
  },
});

export const ALLOW_BORDER = '3px solid rgba(0 255 0 / 0.8)';
export const DENY_BORDER = '3px solid rgba(255 0 0 / 0.8)';

export const i2xy = (i) => [i % 8, (i / 8) | 0];
export const xy2i = (x, y) => y * 8 + x;
const directions = [
  [1, 0], [1, 1], [0, 1], [-1, 1],
  [-1, 0], [-1, -1], [0, -1], [1, -1],
];

export function getPossibleMoves(gameState) {
  const { board, move } = gameState;
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
  const f = Array(64).fill(0);
  f[xy2i(3, 3)] = f[xy2i(4, 4)] = 2;
  f[xy2i(4, 3)] = f[xy2i(3, 4)] = 1;
  return { move: STATE.BLACK, board: f };
}

export const STATE = {
  NONE: 0, BLACK: 1, WHITE: 2,
  BLACK_WON: 3, WHITE_WON: 4, TIE: 5,
};
