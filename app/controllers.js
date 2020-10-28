import { MSG_TYPE, i2xy } from '../common';
import { connect } from './ws';
import { gameState } from './state';

// export function updateState(partialState) {
//   gameState.update((state) => ({ ...state, ...partialState }));
// }

// const switchMove = (state) =>
//   state.move === STATE.BLACK ? STATE.WHITE : STATE.BLACK

// const updateBoard = (i) => (state) => {
//   const rowToFlip = state.possibleMoves.get(i);
//   if (!rowToFlip) {
//     return state;
//   }
//   const board = state.board.slice();
//   board[i] = state.move;
//   for (const i of rowToFlip) {
//     board[i] = state.move;
//   }
//   state.move = switchMove(state);
//   state.board = board;
//   state.possibleMoves = getPossibleMoves(state);
//   return { ...state };
// }

// const updateCheckWinner = (state) => {
//   const { board, possibleMoves } = state;

//   if (board.every((c) => c !== STATE.NONE)) {
//     // Board is full and there's 
//     const nBlack = board.reduce(
//       (acc, c) => acc + (c === STATE.BLACK ? 1 : 0),
//       0
//     );
//     if (nBlack === 32) {
//       state.move = STATE.TIE;
//     } else if (nBlack > 32) {
//       state.move = STATE.WHITE_WON;
//     } else {
//       state.move = STATE.BLACK_WON;
//     }
//     return { ...state };
//   }

//   if (possibleMoves.size === 0) {
//     if (state.pass) {
//       state.move = STATE.TIE;
//     } else {
//       state.move = switchMove(state);
//       state.pass = true;
//     }
//     return { ...state };
//   }
//   return state;
// }

// export function setDisc(i) {
//   gameState.update(updateBoard(i));
//   gameState.update(updateCheckWinner)
// }

export function sendMove(i) {
  gameState.update((state) => {
    if (!(i in state.allowedMoves)) return state;
    connect().then((ws) => {
      ws.send(MSG_TYPE.COORD, i2xy(i));
    });
    return state;
  });
}

export function restartGame() {
  // TODO: send restart message
}

// export function setMyColor(color) {
//   updateState({ playerColor: color, isLoading: false });
// }

// export function setLoading(loading = true) {
//   updateState({ isLoading: loading });
// }

// export function setSPMode() {
//   updateState({ singleplayer: true });
// }

// export function processMessage({ type, payload }) {
//   switch (type) {
//     case MSG_TYPE.COORD: {
//       setDisc(xy2i(payload));
//       break;
//     }
//     case MSG_TYPE.COLOR:
//       setMyColor(payload);
//     default:
//       break;
//   }
// }

// export function setBlackHole(blackHoleCoord) {
//   updateState({ blackHole: xy2i(blackHoleCoord) });
// }
