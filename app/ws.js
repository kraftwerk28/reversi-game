import { MSG_TYPE } from '../common';

const WS_URL = 'ws://localhost:8080';

class WS {
  constructor() {
    const ws = new WebSocket(WS_URL);
    ws.addEventListener('message', (ev) => {
      this._acceptMessage(ev.data);
    });
    this._ws = ws;
    this._awaitMessageQueue = [];
  }

  recv() {
    return new Promise((resolve) => {
      this._awaitMessageQueue.push(resolve);
    })
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
      if (!(type in MSG_TYPE)) {
        throw new Error();
      }
      return { type, payload };
    } catch {
      return { type: MSG_TYPE.ERR };
    }
  }

  _encode(type, payload) {
    return JSON.stringify([type, payload]);
  }
}

export function onPlaceDisc(callback) {
  onPlaceDiscCallback = callback;
}

export function connect() {
  return new WS();
}
