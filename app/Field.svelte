<script>
  import Disc from './Disc.svelte';
  import GameResults from './GameResults.svelte';
  import Marker, { onMouseMove, onMouseLeave } from './Marker.svelte';
  import { STATE, ALPHABET, xy2i } from '../common';
  import { gameState } from './game';
  import { sendMove } from './controllers';

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

  let interactionDisabled = true;
  $: {
    if ($gameState.isLoading) {
      interactionDisabled = true;
    } else if (
      typeof $gameState.playerColor === 'number' &&
      $gameState.playerColor !== $gameState.move
    ) {
      interactionDisabled = true;
    } else {
      interactionDisabled = false;
    }
  }
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
    grid-gap: var(--tile-gap);
    transition: filter 2s;
    margin: var(--tile-size);
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
  .disabled-overlay {
    cursor: not-allowed;
    position: absolute;
    top: 0;
    right: 0;
    left: 0;
    bottom: 0;
    display: none;
    align-items: center;
    justify-content: center;
  }

  .disabled-overlay.interactionDisabled {
    display: flex;
  }

  .letters {
    position: absolute;
    display: flex;
    flex-direction: row;
    left: calc(var(--tile-size) * -1);
    top: calc(var(--tile-size) * -1);
  }

  .numbers {
    position: absolute;
    display: flex;
    flex-direction: column;
    top: calc(var(--tile-size) * -1);
    left: calc(var(--tile-size) * -1);
  }

  .board-placeholder {
    width: var(--tile-size);
    height: var(--tile-size);
    margin-bottom: var(--tile-gap);
    margin-right: var(--tile-gap);
    line-height: var(--tile-size);
    text-align: center;
    font-weight: bold;
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

    <div class="letters">
      <div class="board-placeholder" />
      {#each ALPHABET as letter}
        <div class="board-placeholder">{letter}</div>
      {/each}
    </div>

    <div class="numbers">
      <div class="board-placeholder" />
      {#each Array(8)
        .fill()
        .map((_, i) => i + 1) as number}
        <div class="board-placeholder">{number}</div>
      {/each}
    </div>

    {#each $gameState.board as item, i}
      <Disc
        blackhole={$gameState.blackHole === i}
        on:click={() => sendMove(i)}
        color={item} />
    {/each}

    <Marker {fieldBounds} />

    <div class="disabled-overlay" class:interactionDisabled>
      {#if $gameState.isLoading}Loading...{/if}
    </div>

  </div>

  <GameResults />
</div>
