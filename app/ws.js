import { xy2i } from '../common/utils';
let ws;
let onPlaceDiscCallback = () => { };

try {
  ws = new WebSocket('ws://localhost:8080');
  ws.addEventListener('message', (ev) => {
    const raw = ev.data.toString().toLowerCase();
    const x = 'abcdefgh'.indexOf(raw[0]);
    const y = +raw[1] - 1;
    onPlaceDiscCallback(xy2i(x, y));
  });
} catch { }

export function onPlaceDisc(callback) {
  onPlaceDiscCallback = callback;
}
