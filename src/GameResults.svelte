<script>
  import { STATE, initGame } from './utils';
  export let gameState;
  export let onGameRestart;
  $: isGameEnded = [STATE.TIE, STATE.BLACK_WON, STATE.WHITE_WON].includes(
    gameState.move
  );
  let winText;
  $: {
    if (gameState.move === STATE.TIE) {
      winText = 'Tie!';
    } else {
      const face = gameState.move === STATE.WHITE_WON ? '🌝' : '🌚';
      winText = `${face} won!`;
    }
  }
</script>

<style>
  .root {
    position: absolute;
    top: 0;
    right: 0;
    left: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }
  .root h1 {
    font-size: 3em;
    color: white;
    text-shadow: black 0px 0px 5px;
  }
</style>

{#if isGameEnded}
  <div class="root" on:click={onGameRestart}>
    <h1>{winText}</h1>
  </div>
{/if}
