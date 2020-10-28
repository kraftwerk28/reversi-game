<script context="module">
  import { writable } from 'svelte/store';
  const markerState = writable({ visible: false, pos: [] });

  export function onMouseMove(evt, fieldBounds) {
    const { left, top, width, height } = fieldBounds;
    const { clientX, clientY } = evt;
    const [x, y] = [
      (((clientX - left) / width) * 8) | 0,
      (((clientY - top) / height) * 8) | 0,
    ];
    markerState.update((s) => {
      const [prevX, prevY] = s.pos;
      if (x === prevX && y === prevY && s.visible) {
        return s;
      }
      return { ...s, pos: [x, y], visible: true };
    });
  }

  export function onMouseLeave() {
    markerState.update((s) => ({ ...s, visible: false }));
  }
</script>

<script>
  import { xy2i } from '../common/utils';
  import { gameState } from './state';

  export let fieldBounds;

  let markerStyle = '';
  $: allow = xy2i($markerState.pos) in $gameState.allowedMoves;

  $: {
    if (fieldBounds) {
      const [x, y] = $markerState.pos;
      markerStyle = `
        left: ${(x / 8) * (fieldBounds.width - 14) + x * 2}px;
        top: ${(y / 8) * (fieldBounds.height - 14) + y * 2}px;
      `;
    }
  }
</script>

<style>
  .marker {
    width: 3em;
    height: 3em;
    position: absolute;
    box-sizing: border-box;
    pointer-events: none;
    opacity: 0;
    transition: left 0.2s, top 0.2s, border-color 0.2s, opacity 0.2s;
    border: 2px solid tomato;
  }
  .visible {
    opacity: 1;
  }
  .allow {
    border: 2px solid lime;
  }
</style>

<div
  class="marker"
  class:allow
  class:visible={$markerState.visible}
  style={markerStyle} />
