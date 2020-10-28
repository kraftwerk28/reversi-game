import {
  STATE, MSG_TYPE, LOGLEVEL, CHAN_TYPE,
  xy2i, i2xy, getBlackHoleIndex,
  directions, sleep,
} from '../common';

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
    this.allowedMoves = this.getPossibleMoves();
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
    this.move = this.oppositeColor();
    this.allowedMoves = this.getPossibleMoves();
    this.checkWinner();
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
      this.sync();
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
    const [chan1, chan2] = this.channels;

    const blMsg = await chan1.recv();
    this.processMessage(blMsg);
    chan2.send(blMsg);

    const whMsg = await chan2.recv();
    this.processMessage(whMsg);
    chan1.send(whMsg);
  }

  async run() {
    // const [c1, c2] = this.randomColors();
    const [chan1, chan2] = this.channels;
    for (const chan of this.channels) {
      chan.send({ type: MSG_TYPE.COORD, payload: i2xy(this.blackHole) });
    }
    chan1.send({ type: MSG_TYPE.COLOR, payload: STATE.BLACK });
    chan2.send({ type: MSG_TYPE.COLOR, payload: STATE.WHITE });
    this.sync();

    while ([STATE.BLACK, STATE.WHITE].includes(this.move)) {
      await this.step();
      if (this.botDelay) {
        await sleep(this.botDelay);
      }
    }
  }

  log(data, level = LOGLEVEL.I) {
    if (level === LOGLEVEL.I) {
      console.info('INFO > ' + data.toString());
    } else if (level === LOGLEVEL.E) {
      console.error('ERROR > ' + data.toString());
    } else if (level === LOGLEVEL.W) {
      console.warn('WARN > ' + data.toString());
    }
  }
}
