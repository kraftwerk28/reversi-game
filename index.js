'use strict';

var fastify = require('fastify');
var fastifyStatic = require('fastify-static');
var path = require('path');
var yargs = require('yargs');
var ws = require('ws');
var cp = require('child_process');
var assert = require('assert');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var fastify__default = /*#__PURE__*/_interopDefaultLegacy(fastify);
var fastifyStatic__default = /*#__PURE__*/_interopDefaultLegacy(fastifyStatic);
var path__default = /*#__PURE__*/_interopDefaultLegacy(path);
var cp__default = /*#__PURE__*/_interopDefaultLegacy(cp);
var assert__default = /*#__PURE__*/_interopDefaultLegacy(assert);

const STATE = {
  NONE: 0, BLACK: 1, WHITE: 2,
  BLACK_WON: 3, WHITE_WON: 4, TIE: 5,
};
const COLOR$1 = {
  black: STATE.BLACK,
  white: STATE.WHITE,
};
const PASS = 'pass';

const MSG_TYPE = {
  COORD: 1, // Either "black hole" or disc placement
  COLOR: 2, // Color selection
  ERR: 3, // Could not parse message
  SYNC: 4, // Sync game state
  AUTH_TOK: 5, // Auth token for reconnection
};

const CHAN_TYPE = { CMD: 0, WS: 1 };

// Validators
const isValidAB = (ab) =>
  typeof ab === 'string' &&
  ab.length === 2 &&
  ALPHABET.includes(ab[0].toUpperCase()) &&
  !isNaN(parseInt(ab[1]));
const isValidColor = (color) => color in COLOR$1;

// Coordinate conversion
const i2xy = (i) => [i % 8, (i / 8) | 0];
const xy2i = (x, y) => y * 8 + x;
const xy2ab = (x, y) => ALPHABET[x] + (y + 1).toString();
const i2ab = (i) => xy2ab(i % 8, (i / 8) | 0);

// Possible moves check algorithm
const directions = [
  [1, 0], [1, 1], [0, 1], [-1, 1],
  [-1, 0], [-1, -1], [0, -1], [1, -1],
];

function getPossibleMoves(gameState) {
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

function initGame() {
  const board = Array(64).fill(STATE.NONE);
  board[xy2i(3, 3)] = board[xy2i(4, 4)] = STATE.WHITE;
  board[xy2i(4, 3)] = board[xy2i(3, 4)] = STATE.BLACK;
  const state = {
    move: STATE.BLACK,
    board,
    pass: false,
    playerColor: undefined
  };
  state.possibleMoves = getPossibleMoves(state);
  return state;
}

/**
 * @typedef {{ type: MSG_TYPE, payload: any }} Message
 */

/** @type {WsServer} */
let wsServer;

/** Waitgroup counters for queueing connections */
let connQueueIndex = 0;
let connQueueHead = connQueueIndex;

async function createChan(...args) {
  const chan = new MsgChan(...args);
  await chan.waitConnected();
  return chan;
}

class MsgChan {
  constructor(type, params) {
    this.type = type;
    this._connected = false;
    this._subscribers = new Set();
    this._waitConnectedResolves = new Set();
    this._awaitMessageQueue = [];

    const processMessage = this._acceptMessage.bind(this);
    if (type === CHAN_TYPE.CMD) {
      assert__default['default'].ok(params.cmd, 'Command must be present');
      const proc = cp__default['default'].exec(params.cmd);
      proc.stdout.on('data', processMessage);
      this._connected = true;
      this.proc = proc;

    } else if (type === CHAN_TYPE.WS) {
      if (!wsServer) {
        assert__default['default'].ok(params.server, 'Server must be specified');
        wsServer = new ws.Server({ server: params.server });
      }

      const wgIndex = connQueueIndex++;
      const onConnect = (conn) => {
        if (wgIndex !== connQueueHead) {
          return;
        }
        setImmediate(() => { connQueueHead++; });
        this.conn = conn;
        conn.on('message', processMessage);
        this._waitConnectedResolves.forEach((resolve) => { resolve(this); });
        this._connected = true;
        this._waitConnectedResolves.clear();
        wsServer.off('connection', onConnect);
      };
      wsServer.on('connection', onConnect);
    }
  }

  _acceptMessage(raw) {
    const parsed = this._decode(raw);

    if (this._awaitMessageQueue.length) {
      const resolve = this._awaitMessageQueue.shift();
      resolve(parsed);
    } else {
      this._subscribers.forEach((callback) => {
        callback(parsed);
      });
    }
  }

  onmessage(callback) {
    this._subscribers.add(callback);
  }

  /**
   * @returns {Promise<Message>}
   */
  recv() {
    return new Promise((resolve) => {
      this._awaitMessageQueue.push(resolve);
    });
  }

  send(message) {
    const { type, payload } = message;
    const raw = this._encode(type, payload);
    console.log(raw);

    if (this.type === CHAN_TYPE.CMD) {
      this.proc.stdin.write(raw);
    } else if (this.type === CHAN_TYPE.WS) {
      this.conn.send(raw);
    }
  }

  waitConnected() {
    if (this._connected) {
      return Promise.resolve(this);
    }
    return new Promise((resolve) => {
      this._waitConnectedResolves.add(resolve);
    });
  }

  _decode(raw) {
    if (this.type === CHAN_TYPE.WS) {
      try {
        const [type, payload] = JSON.parse(raw);
        if (Object.values(MSG_TYPE).includes(type)) {
          return { type, payload };
        }
        throw new Error;
      } catch (err) {
        console.error('Failed to parse message:', err);
        return { type: MSG_TYPE.ERR };
      }
    } else if (this.type === CHAN_TYPE.CMD) {
      if (isValidAB(raw)) {
        return { type: MSG_TYPE.COORD, payload: ab2xy(raw) };
      } else if (isValidColor(raw)) {
        return { type: MSG_TYPE.COLOR, payload: COLOR[raw] };
      } else if (raw === PASS) {
        return { type: MSG_TYPE.PASS };
      } else {
        return { type: MSG_TYPE.ERR };
      }
    }
  }

  _encode(type, payload) {
    if (this.type === CHAN_TYPE.WS) {
      return JSON.stringify([type, payload]);
    } else if (this.type === CHAN_TYPE.CMD) {
      switch (type) {
        case MSG_TYPE.COORD:
          return i2ab(payload);
        case MSG_TYPE.COLOR:
          return payload;
        default:
          return;
      }
    }
  }
}

/**
 * Used for (future) move validation
 */
function performMove(gameState, coord) {
  gameState.board[xy2i(coord.x, coord.y)];
}

/**
 * Reducer
 */
function processMessage({ type, payload }, gameState) {
  switch (type) {
    case MSG_TYPE.COORD:
      performMove(gameState, payload);
      return;
    default:
      console.error(`Unknown message type: ${type}; with payload ${payload}`);
      return;
  }
}

function createChannels(args, server) {
  const chans = [];
  for (const cmd of args.bot || []) {
    chans.push(createChan(CHAN_TYPE.CMD, { cmd }));
  }
  while (chans.length < 2) {
    chans.push(createChan(CHAN_TYPE.WS, { server }));
  }
  return Promise.all(chans);
}

function initServer(_args) {
  const app = fastify__default['default']();
  app.register(fastifyStatic__default['default'], { root: path__default['default'].resolve(__dirname, 'public/') });
  const port = process.env.PORT || 8080;
  app.listen(port, () => {
    console.log(`http://127.0.0.1:${port}`);
  });
  return app;
}

async function main() {
  const args = yargs.array('bot').argv;

  const fastifyApp = await initServer();
  const gameState = initGame();
  const [chan1, chan2] = await createChannels(args, fastifyApp.server);
  console.info('Channels connected.');

  // Game process
  chan1.send({ type: MSG_TYPE.COLOR, payload: COLOR$1.black });
  chan2.send({ type: MSG_TYPE.COLOR, payload: COLOR$1.white });

  while (true) {
    const blMsg = await chan1.recv();
    console.info(blMsg);
    processMessage(blMsg, gameState);
    chan1.send(blMsg);
    chan2.send(blMsg);

    const whMsg = await chan2.recv();
    console.info(whMsg);
    processMessage(whMsg, gameState);
    chan1.send(whMsg);
    chan2.send(whMsg);
  }
}

main().catch((error) => {
  console.error(error);
});
//# sourceMappingURL=index.js.map
