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

const ALPHABET = 'ABCDEFGH';
const COLORS = ['white', 'black'];
const PASS = 'pass';
// Validators
const isValidAB = (ab) =>
  typeof ab === 'string' &&
  ab.length === 2 &&
  ALPHABET.includes(ab[0].toUpperCase()) &&
  !isNaN(parseInt(ab[1]));
const isValidColor = (color) => COLORS.includes(color.toLowerCase());
const xy2ab = (x, y) => ALPHABET[x] + (y + 1).toString();
const i2ab = (i) => xy2ab(i % 8, (i / 8) | 0);

/**
 * @typedef {{ type: MSG_TYPE, payload: any }} Message
 */

const MSG_TYPE = {
  COORD: 1, // Either "black hole" or disc placement
  COLOR: 2, // Color selection
  ERR: 3, // Could not parse message
  SYNC: 4, // Sync game state
  AUTH_TOK: 5, // Auth token for reconnection
};

const CHAN_TYPE = { CMD: 0, WS: 1 };

/** @type {WsServer} */
let wsServer;

/** Waitgroup counters for queueing connections */
let connQueueIndex = 0;
let connQueueHead = connQueueIndex;

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

  send(type, payload) {
    const raw = this._encode(type, payload);

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
        return { type, payload };
      } catch {
        return { type: MSG_TYPE.ERR };
      }
    } else if (this.type === CHAN_TYPE.CMD) {
      if (isValidAB(raw)) {
        return { type: MSG_TYPE.COORD, payload: ab2xy(raw) };
      } else if (isValidColor(raw)) {
        return { type: MSG_TYPE.COLOR, payload: raw };
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

function parseArgs() {
  return yargs.array('bot').help().argv;
}

async function main() {
  console.log(parseArgs());
  // TODO: Run bots or websockets in respect to args.

  const app = fastify__default['default']();
  app.register(fastifyStatic__default['default'], { root: path__default['default'].resolve(__dirname, 'public/') });
  const port = process.env.PORT || 8080;
  app.listen(port, () => {
    console.log(`http://127.0.0.1:${port}`);
  });

  const chan1 = new MsgChan(CHAN_TYPE.WS, { server: app.server });
  const chan2 = new MsgChan(CHAN_TYPE.WS, { server: app.server });
  console.info('Waiting for connections.');
  await Promise.all([chan1.waitConnected(), chan2.waitConnected()]);
  console.info('Channels connected');

  while (true) {
    const msg = await chan1.recv();
    console.info(msg);
    chan2.send(msg.type, msg.payload);
  }
}

main();
//# sourceMappingURL=index.js.map
