<script>
  import Disc from './Disc.svelte';
  import GameResults from './GameResults.svelte';
  import Marker, { onMouseMove, onMouseLeave } from './Marker.svelte';
  import { STATE } from '../common/utils';
  import { gameState } from './game';
  import { setDisc } from './controllers';

  let fieldNode;
  let fieldBounds;
  function setBounds() {
    fieldBounds = fieldNode?.getBoundingClientRect();
  }

  $: setBounds(), fieldNode;
  $: iswhite = $gameState.move === STATE.WHITE;
  $: remainingDiscs = 64 - $gameState.board.filter((c) => c > 0).length;
  $: isGameEnded = [STATE.TIE, STATE.BLACK_WON, STATE.WHITE_WON].includes(
    $gameState.move
  );
</script>

<style>
  .field-container {
    position: relative;
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
    transition: filter 2s;
  }
  .game-status span {
    transition: transform 0.2s;
    font-size: 3em;
    display: inline-block;
  }
  .iswhite {
    transform: scaleX(-1);
  }
  .blurred {
    filter: blur(8px);
  }
</style>

<svelte:window on:resize={setBounds} />

<div class="field-container">
  <div class="game-status">
    <span>&#x1F31A</span>
    <span class:iswhite>&#x1F448</span>
    <span>&#x1F31D</span>
    <span>&nbsp;</span>
    <span>&#x26AA</span>
    <span>x{remainingDiscs}</span>
  </div>
  <div
    class="field-root"
    class:blurred={isGameEnded}
    bind:this={fieldNode}
    on:mousemove={(e) => onMouseMove(e, fieldBounds)}
    on:mouseleave={onMouseLeave}>
    {#each $gameState.board as item, i}
      <Disc on:click={() => setDisc(i)} color={item} />
    {/each}
    <Marker {fieldBounds} />
  </div>
  <GameResults />
</div>