import { Server as WsServer } from 'ws';
import cp from 'child_process';
import assert from 'assert';
import { CHANNEL_TYPE } from '../common/utils';

/** @type {WsServer} */
let wsServer;

/** Waitgroup counters for queueing connections */
let waitgroupIndex = 0;
let waitgroupHead = 0;

export class MsgChan {
  constructor(type, params) {
    this.type = type;
    this._connected = false;
    this._subscribers = new Set();
    this._waitResolves = new Set();

    if (type === CHANNEL_TYPE.CMD) {
      assert.ok(params.cmd, 'Command must be present');
      const proc = cp.exec(params.cmd);
      proc.stdout.on('data', chunk => {
        this.acceptMessage(chunk);
      });
      this._connected = true;
      this.proc = proc;

    } else if (type === CHANNEL_TYPE.WS) {
      if (!wsServer) {
        assert.ok(params.server, 'Server must be defined');
        wsServer = new WsServer({ server: params.server });
      }

      const wgIndex = waitgroupIndex++;
      const onConnect = (conn) => {
        if (wgIndex !== waitgroupHead) {
          return;
        }
        setImmediate(() => { waitgroupHead++ });
        this.conn = conn;
        this._waitResolves.forEach((resolve) => { resolve(this) });
        this._connected = true;
        this._waitResolves.clear();
        wsServer.off('connection', onConnect);
      };
      wsServer.on('connection', onConnect);
    }
  }

  acceptMessage(raw) {
    this._subscribers.forEach((cb) => {
      cb(raw);
    });
  }

  onmessage(callback) {
    this._subscribers.add(callback);
  }

  send(message) {
    if (this.type === CHANNEL_TYPE.CMD) {
      this.proc.stdin.write(message);
    } else if (this.type === CHANNEL_TYPE.WS) {
      this.conn.send(message);
    }
  }

  waitConnected() {
    if (this._connected) {
      return this;
    }
    return new Promise((resolve) => {
      this._waitResolves.add(resolve);
    });
  }
}
