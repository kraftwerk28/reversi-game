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
var yargs__default = /*#__PURE__*/_interopDefaultLegacy(yargs);
var cp__default = /*#__PURE__*/_interopDefaultLegacy(cp);
var assert__default = /*#__PURE__*/_interopDefaultLegacy(assert);

const CHANNEL_TYPE = { CMD: 0, WS: 1 };

/** @type {WsServer} */
let wsServer;

/** Waitgroup counters for queueing connections */
let waitgroupIndex = 0;
let waitgroupHead = 0;

class MsgChan {
  constructor(type, params) {
    this.type = type;
    this._connected = false;
    this._subscribers = new Set();
    this._waitResolves = new Set();

    if (type === CHANNEL_TYPE.CMD) {
      assert__default['default'].ok(params.cmd, 'Command must be present');
      const proc = cp__default['default'].exec(params.cmd);
      proc.stdout.on('data', chunk => {
        this.acceptMessage(chunk);
      });
      this._connected = true;
      this.proc = proc;

    } else if (type === CHANNEL_TYPE.WS) {
      if (!wsServer) {
        assert__default['default'].ok(params.server, 'Server must be defined');
        wsServer = new ws.Server({ server: params.server });
      }

      const wgIndex = waitgroupIndex++;
      const onConnect = (conn) => {
        if (wgIndex !== waitgroupHead) {
          return;
        }
        setImmediate(() => { waitgroupHead++; });
        this.conn = conn;
        this._waitResolves.forEach((resolve) => { resolve(this); });
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

function parseArgs() {
  return yargs__default['default']().array('bot').argv;
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

  const chan1 = new MsgChan('ws', { server: app.server });
  const chan2 = new MsgChan('ws', { server: app.server });
  await Promise.all([chan1.waitConnected(), chan2.waitConnected()]);
  console.log('Channels connected');
}

main();
//# sourceMappingURL=index.js.map
