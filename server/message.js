import { Server as WsServer } from 'ws';
import cp from 'child_process';
import assert from 'assert';
import { CHAN_TYPE, i2ab, MSG_TYPE } from '../common/utils';

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

    if (type === CHAN_TYPE.CMD) {
      assert.ok(params.cmd, 'Command must be present');
      const proc = cp.exec(params.cmd);
      proc.stdout.on('data', chunk => {
        this.acceptMessage(chunk);
      });
      this._connected = true;
      this.proc = proc;

    } else if (type === CHAN_TYPE.WS) {
      if (!wsServer) {
        assert.ok(params.server, 'Server must be defined');
        wsServer = new WsServer({ server: params.server });
      }

      const wgIndex = connQueueIndex++;
      const onConnect = (conn) => {
        if (wgIndex !== connQueueHead) {
          return;
        }
        setImmediate(() => { connQueueHead++ });
        this.conn = conn;
        this._waitConnectedResolves.forEach((resolve) => { resolve(this) });
        this._connected = true;
        this._waitConnectedResolves.clear();
        wsServer.off('connection', onConnect);
      };
      wsServer.on('connection', onConnect);
    }
  }

  acceptMessage(raw) {
    if (this._awaitMessageQueue.length) {
      const resolve = this._awaitMessageQueue.shift();
      resolve(raw);
    } else {
      this._subscribers.forEach((callback) => {
        callback(raw)
      });
    }
  }

  onmessage(callback) {
    this._subscribers.add(callback);
  }

  getMessage() {
    return new Promise((resolve) => {
      this._awaitMessageQueue.push(resolve);
    });
  }

  send(message) {
    if (this.type === CHAN_TYPE.CMD) {
      this.proc.stdin.write(message);
    } else if (this.type === CHAN_TYPE.WS) {
      this.conn.send(message);
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

    } else if (this.type === CHAN_TYPE.CMD) {

    }
  }

  _encode(type, payload) {
    if (this.type === CHAN_TYPE.WS) {

    } else if (this.type === CHAN_TYPE.CMD) {
      switch(type) {
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
