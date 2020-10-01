<script>
  import Disc from './Disc.svelte';
  import {
    initGame,
    getPossibleMoves,
    STATE,
    xy2i,
    ALLOW_BORDER,
    DENY_BORDER,
  } from './utils';

  let state = initGame();
  $: possibleMoves = getPossibleMoves(state);

  function setDisc(i) {
    const rowToFlip = possibleMoves.get(i);
    if (!rowToFlip) {
      return;
    }
    state.board[i] = state.move;
    for (const i of rowToFlip) {
      state.board[i] = state.move;
    }

    state.move = state.move === STATE.BLACK ? STATE.WHITE : STATE.BLACK;
    state.board = state.board.slice();
  }

  let fieldNode;
  $: fieldBounds = fieldNode?.getBoundingClientRect();
  const markerState = { color: 0 };
  let markerStyle = '';
  $: iswhite = state.move === STATE.WHITE;
  $: {
    if (fieldBounds) {
      const { x, y, color } = markerState;
      markerStyle = `
        left: ${(x / 8) * (fieldBounds.width - 14) + x * 2}px;
        top: ${(y / 8) * (fieldBounds.height - 14) + y * 2}px;
        border: ${
          color === 0 ? 'transparent' : color === 1 ? DENY_BORDER : ALLOW_BORDER
        };
      `;
    }
  }

  function onMouseMove(evt) {
    const { left, top, width, height } = fieldBounds;
    const { clientX, clientY } = evt;
    const [x, y] = [
      (((clientX - left) / width) * 8) | 0,
      (((clientY - top) / height) * 8) | 0,
    ];
    markerState.color = possibleMoves.has(xy2i(x, y)) ? 2 : 1;
    if (x === markerState.x && y === markerState.y) {
      return;
    }
    markerState.x = x;
    markerState.y = y;
  }
  function onMouseLeave() {
    markerState.color = 0;
  }
</script>

<style>
  .field-container {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .field-root {
    position: relative;
    display: grid;
    grid-template-columns: repeat(8, auto);
    justify-content: center;
    grid-gap: 2px;
  }
  .marker {
    width: 3em;
    height: 3em;
    position: absolute;
    box-sizing: border-box;
    transition: left 0.2s, top 0.2s, border-color 0.2s;
    pointer-events: none;
  }
  .iswhite {
    transform: scaleX(-1);
  }
  .game-status span {
    transition: transform 0.2s;
    font-size: 3em;
    display: inline-block;
  }
</style>

<div class="field-container">
  <div class="game-status">
    <span>&#x1F31A</span>
    <span class:iswhite>&#x1F448</span>
    <span>&#x1F31D</span>
    <span>&nbsp;</span>
    <span>&#x26AA</span>
    <span>x{64 - state.board.filter((c) => c > 0).length}</span>
  </div>
  <div
    class="field-root"
    bind:this={fieldNode}
    on:mousemove={onMouseMove}
    on:mouseleave={onMouseLeave}>
    {#each state.board as item, i}
      <Disc on:click={() => setDisc(i)} color={item} />
    {/each}
    <div class="marker" style={markerStyle} />
  </div>
</div>
