import { gameState } from './game';
import {
  STATE,
  MSG_TYPE,
  getPossibleMoves,
  initGame,
  i2xy,
  xy2i,
} from '../common';
import { connect } from './ws';

function switchMove(state) {
  return state.move === STATE.BLACK ? STATE.WHITE : STATE.BLACK
}

function checkWinner() {
  gameState.update((state) => {
    const { board, possibleMoves } = state;

    if (board.every((c) => c !== STATE.NONE)) {
      // Board is full and there's 
      const nBlack = board.reduce(
        (acc, c) => acc + (c === STATE.BLACK ? 1 : 0),
        0
      );
      if (nBlack === 32) {
        state.move = STATE.TIE;
      } else if (nBlack > 32) {
        state.move = STATE.BLACK_WON;
      } else {
        state.move = STATE.WHITE_WON;
      }
      return { ...state };
    }

    if (possibleMoves.size === 0) {
      if (state.pass) {
        state.move = STATE.TIE;
      } else {
        state.move = switchMove(state);
        state.pass = true;
      }
      return { ...state };
    }
    return state;
  });
}

export function setDisc(i) {
  gameState.update(s => {
    const rowToFlip = s.possibleMoves.get(i);
    if (!rowToFlip) {
      return s;
    }
    const board = s.board.slice();
    board[i] = s.move;
    for (const i of rowToFlip) {
      board[i] = s.move;
    }
    s.move = switchMove(s);
    s.board = board;
    s.possibleMoves = getPossibleMoves(s);
    return { ...s };
  });
  checkWinner();
}

export function sendMove(i) {
  connect().then((ws) => {
    const [x, y] = i2xy(i);
    ws.send(MSG_TYPE.COORD, { x, y });
  });
}

export function restartGame() {
  gameState.set(initGame());
}

export function setMyColor(color) {
  gameState.update((state) => ({ ...state, playerColor: color }));
}

export function processMessage({ type, payload }) {
  switch (type) {
    case MSG_TYPE.COORD:
      const i = xy2i(payload.x, payload.y);
      setDisc(i);
      break;
    case MSG_TYPE.COLOR:
      setMyColor(payload);
    default:
      break;
  }
}
