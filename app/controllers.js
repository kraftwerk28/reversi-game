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

export function updateState(partialState) {
  gameState.update((state) => ({ ...state, ...partialState }));
}

const switchMove = (state) =>
  state.move === STATE.BLACK ? STATE.WHITE : STATE.BLACK

const updateBoard = (i) => (state) => {
  const rowToFlip = state.possibleMoves.get(i);
  if (!rowToFlip) {
    return state;
  }
  const board = state.board.slice();
  board[i] = state.move;
  for (const i of rowToFlip) {
    board[i] = state.move;
  }
  state.move = switchMove(state);
  state.board = board;
  state.possibleMoves = getPossibleMoves(state);
  return { ...state };
}

const updateCheckWinner = (state) => {
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
}

export function setDisc(i) {
  gameState.update(updateBoard(i));
  gameState.update(updateCheckWinner)
}

export function sendMove(i) {
  gameState.update((state) => {
    if (state.singleplayer) {
      return updateCheckWinner(updateBoard(i)(state));
    } else {
      connect().then((ws) => {
        ws.send(MSG_TYPE.COORD, i2xy(i));
      });
      return state;
    }
  })
}

export function restartGame() {
  gameState.set(initGame());
}

export function setMyColor(color) {
  updateState({ playerColor: color, isLoading: false });
}

export function setLoading(loading = true) {
  updateState({ isLoading: loading });
}

export function setSPMode() {
  updateState({ singleplayer: true });
}

export function processMessage({ type, payload }) {
  switch (type) {
    case MSG_TYPE.COORD: {
      const [x, y] = payload;
      setDisc(xy2i(x, y));
      break;
    }
    case MSG_TYPE.COLOR:
      setMyColor(payload);
    default:
      break;
  }
}

export function setBlackHole(blackHoleCoord) {
  updateState({ blackHole: xy2i(blackHoleCoord[0], blackHoleCoord[1]) });
}
