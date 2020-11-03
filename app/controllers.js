import { MSG_TYPE, i2xy } from '../common';
import { connect } from './ws';
import { gameState } from './state';

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
