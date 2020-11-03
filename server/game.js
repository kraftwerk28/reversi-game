import {
  STATE, MSG_TYPE, LOGLEVEL, CHAN_TYPE,
  xy2i, i2xy, getBlackHoleIndex,
  directions, sleep,
} from '../common';
import log from './logger';

export class GameState {
  constructor(args, channels) {
    this.channels = channels;
    this.botDelay = args.delay;

    const board = Array(64).fill(STATE.NONE);
    board[xy2i([3, 3])] = board[xy2i([4, 4])] = STATE.WHITE;
    board[xy2i([4, 3])] = board[xy2i([3, 4])] = STATE.BLACK;

    this.board = board;
    this.move = STATE.BLACK;
    this.pass = false;
    this.blackHole = getBlackHoleIndex();
  }

  getPossibleMoves() {
    const allowedMoves = {};
    let otherColor = this.oppositeColor();

    this.board
      .map((cl, idx) => [cl, idx])
      .filter(([cl, _]) => cl === this.move)
      .forEach(([_, i]) => {
        const [x, y] = i2xy(i);

        directions.forEach(([dx, dy]) => {
          let rowToFlip = [];
          for (
            let _x = x + dx, _y = y + dy;
            _x >= 0 && _x < 8 && _y >= 0 && y < 8;
            _x += dx, _y += dy
          ) {
            const idx = xy2i([_x, _y]);
            const c = this.board[idx];
            if (c === otherColor) {
              rowToFlip.push(idx);
            } else if (c === STATE.NONE) {
              if (rowToFlip.length && idx !== this.blackHole) {
                allowedMoves[idx] = rowToFlip.concat(allowedMoves[idx] || [])
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

  placeDisc(tileIndex) {
    const rowToFlip = this.allowedMoves[tileIndex];
    if (!rowToFlip) {
      return;
    }
    this.board[tileIndex] = this.move;
    for (const i of rowToFlip) {
      this.board[i] = this.move;
    }
  }

  checkWinner() {
    if (this.board.every((c) => c !== STATE.NONE)) {

      // Count black discs
      const nBlack = this.board.reduce(
        (acc, c) => acc + (c === STATE.BLACK ? 1 : 0),
        0
      );

      if (nBlack >= 32) {
        this.move = STATE.WHITE_WON;
      } else {
        this.move = STATE.BLACK_WON;
      }
    } else if (Object.keys(this.allowedMoves).length === 0) {
      if (this.pass) {
        this.move = STATE.TIE;
      } else {
        this.move = this.oppositeColor();
        this.pass = true;
      }
    }
  }

  oppositeColor(move = this.move) {
    if (move === STATE.BLACK) {
      return STATE.WHITE;
    } else if (move === STATE.WHITE) {
      return STATE.BLACK;
    } else {
      throw new Error('Invalid move supplied.');
    }
  }

  randomColors() {
    if (Math.random() < 0.5) {
      return [STATE.BLACK, STATE.WHITE];
    } else {
      return [STATE.WHITE, STATE.BLACK];
    }
  }

  processMessage({ type, payload }) {
    if (type === MSG_TYPE.COORD) {
      const tileIndex = xy2i(payload);
      this.placeDisc(tileIndex);
    }
  }

  sync() {
    const snapshot = {
      board: this.board,
      allowedMoves: this.allowedMoves,
      move: this.move,
      blackHole: this.blackHole,
    };
    this.channels
      .filter(chan => chan.type === CHAN_TYPE.WS)
      .forEach((chan) => {
        chan.send({ type: MSG_TYPE.SYNC, payload: snapshot });
      });
  }

  async step() {
    const opposColor = this.oppositeColor();
    if (!Object.keys(this.allowedMoves).length) {
      if (this.pass) {
        this.checkWinner();
        return;
      }
      this.move = opposColor;
      this.pass = true;
      this.allowedMoves = this.getPossibleMoves();
      this.sync();
      this.step();
      return;
    }

    const [curChan, otherChan] = [
      this.boundChans[this.move],
      this.boundChans[opposColor],
    ];

    const msg = await curChan.recv();
    // Only suitable for CMD bots
    otherChan.send(msg);

    this.processMessage(msg);
    this.checkWinner();
    this.move = opposColor;
    this.allowedMoves = this.getPossibleMoves();
    this.sync();
  }

  async run() {
    for (const chan of this.channels) {
      chan.send({ type: MSG_TYPE.COORD, payload: i2xy(this.blackHole) });
    }

    const [chan1, chan2] = this.channels;
    if (Math.random() < 0.5) {
      this.boundChans = { [STATE.BLACK]: chan1, [STATE.WHITE]: chan2 };
      chan1.send({ type: MSG_TYPE.COLOR, payload: STATE.BLACK });
      chan2.send({ type: MSG_TYPE.COLOR, payload: STATE.WHITE });
    } else {
      this.boundChans = { [STATE.BLACK]: chan2, [STATE.WHITE]: chan1 };
      chan1.send({ type: MSG_TYPE.COLOR, payload: STATE.WHITE });
      chan2.send({ type: MSG_TYPE.COLOR, payload: STATE.BLACK });
    }

    this.allowedMoves = this.getPossibleMoves();
    this.sync();

    while ([STATE.BLACK, STATE.WHITE].includes(this.move)) {
      await this.step();
      if (this.botDelay) {
        await sleep(this.botDelay);
      }
    }
  }

  report() {
    let nBlack = 0;
    let nWhite = 0;
    for (const tile of this.board) {
      if (tile === STATE.BLACK) {
        nBlack++;
      } else if (tile === STATE.WHITE) {
        nWhite++;
      }
    }
    log.i(`white: ${nWhite} | black: ${nBlack}`);
    if (nWhite > nBlack) {
      log.i('Black won');
    } else {
      log.i('White won');
    }
  }
}
