import assert from 'assert';
import cp from 'child_process';
import readline from 'readline';
import { Server as WsServer } from 'ws';

import {
  xy2ab, isValidAB, isValidColor, ab2xy,
  PASS, CHAN_TYPE, MSG_TYPE, COLOR,
} from '../common';

/**
 * @typedef {{ type: MSG_TYPE, payload: any }} Message
 */

/** @type {WsServer} */
let wsServer;

/** Waitgroup counters for queueing connections */
let connQueueIndex = 0;
let connQueueHead = connQueueIndex;

export async function createChan(...args) {
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
      console.info(`Launching command line bot: "${params.cmd}".`);
      assert.ok(params.cmd, 'Command must be present');

      const proc = cp.exec(params.cmd);

      proc.on('close', (code) => {
        console.info(`Bot terminated with exit code ${code}.`);
      });

      const rl = readline.createInterface({
        input: proc.stdout,
        output: proc.stdin,
        terminal: false,
      });
      // const rl = readline.createInterface(proc.stdout);
      rl.on('line', processMessage);

      this._connected = true;
      this.proc = proc;

    } else if (type === CHAN_TYPE.WS) {
      console.info(`Opening websocket.`);
      if (!wsServer) {
        assert.ok(params.server, 'Server must be specified');
        wsServer = new WsServer({ server: params.server });
      }

      const wgIndex = connQueueIndex++;
      const onConnect = (conn) => {
        if (wgIndex !== connQueueHead) {
          return;
        }
        setImmediate(() => { connQueueHead++ });
        this.conn = conn;
        conn.on('message', processMessage);
        this._waitConnectedResolves.forEach((resolve) => { resolve(this) });
        this._connected = true;
        this._waitConnectedResolves.clear();
        wsServer.off('connection', onConnect);
      };
      wsServer.on('connection', onConnect);
    }
  }

  _acceptMessage(raw) {
    if (this.type === CHAN_TYPE.CMD) {
      console.info(`bot > ${raw}`);
    }
    const parsed = this._decode(raw);
    console.info(`Message > type: ${parsed.type}; payload: ${parsed.payload}.`);

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

    if (this.type === CHAN_TYPE.CMD) {
      this.proc.stdin.write(raw + '\n');
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
          const [x, y] = payload;
          return xy2ab(x, y);
        case MSG_TYPE.COLOR:
          return payload === COLOR.black ? 'black' : 'white';
        default:
          return;
      }
    }
  }
}
