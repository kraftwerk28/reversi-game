import { MSG_TYPE } from '../common';

const WS_URL = 'ws://127.0.0.1:8080';

class WS {
  constructor() {
    const ws = new WebSocket(WS_URL);
    this._waitConnectedQueue = [];
    this._connected = false;

    ws.addEventListener('message', (ev) => {
      this._acceptMessage(ev.data);
    });
    ws.addEventListener('open', () => {
      this._waitConnectedQueue.forEach(([resolve, _]) => resolve());
      this._connected = true;
    });
    ws.addEventListener('error', () => {
      this._waitConnectedQueue.forEach(([_, reject]) => reject());
    });
    this._ws = ws;
    this._awaitMessageQueue = [];
  }

  recv() {
    return new Promise((resolve) => {
      this._awaitMessageQueue.push(resolve);
    });
  }

  send(type, payload) {
    this._ws.send(this._encode(type, payload));
  }

  _acceptMessage(raw) {
    const parsed = this._decode(raw);
    if (this._awaitMessageQueue.length) {
      const resolve = this._awaitMessageQueue.shift();
      resolve(parsed);
    }
  }

  _decode(raw) {
    try {
      const [type, payload] = JSON.parse(raw);
      if (Object.values(MSG_TYPE).includes(type)) {
        return { type, payload };
      }
      throw new Error;
    } catch {
      return { type: MSG_TYPE.ERR };
    }
  }

  _encode(type, payload) {
    return JSON.stringify([type, payload]);
  }

  waitConnected() {
    if (this._connected) {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      this._waitConnectedQueue.push([resolve, reject]);
    });
  }
}

let wsInstance;

export async function connect() {
  if (!wsInstance) {
    wsInstance = new WS();
    await wsInstance.waitConnected();
  }
  return wsInstance;
}
