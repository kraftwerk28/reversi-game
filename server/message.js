import { Server as WsServer } from 'ws';
import cp from 'child_process';
import assert from 'assert';
import { i2ab, isValidAB, isValidColor, PASS } from '../common/utils';
import { CHAN_TYPE, MSG_TYPE } from '../common';

/**
 * @typedef {{ type: MSG_TYPE, payload: any }} Message
 */

/** @type {WsServer} */
let wsServer;

/** Waitgroup counters for queueing connections */
let connQueueIndex = 0;
let connQueueHead = connQueueIndex;

export class MsgChan {
  constructor(type, params) {
    this.type = type;
    this._connected = false;
    this._subscribers = new Set();
    this._waitConnectedResolves = new Set();
    this._awaitMessageQueue = [];

    const processMessage = this._acceptMessage.bind(this);
    if (type === CHAN_TYPE.CMD) {
      assert.ok(params.cmd, 'Command must be present');
      const proc = cp.exec(params.cmd);
      proc.stdout.on('data', processMessage);
      this._connected = true;
      this.proc = proc;

    } else if (type === CHAN_TYPE.WS) {
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
