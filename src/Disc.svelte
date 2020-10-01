<script>
  import { swapTrn, STATE } from './utils';

  export let color;
</script>

<style>
  .root {
    display: block;
    position: relative;
    width: 3em;
    height: 3em;
    background: green;
    cursor: pointer;
  }
  .disc {
    width: 2em;
    height: 2em;
    position: absolute;
    border-radius: 1em;
    top: 0.5em;
    left: 0.5em;
    box-sizing: border-box;
  }
  .w {
    background: white;
  }
  .b {
    background: black;
  }
</style>

<div class="root" on:click>
  {#if color === STATE.BLACK}
    <div class="disc b" transition:swapTrn />
  {/if}

  {#if color === STATE.WHITE}
    <div class="disc w" transition:swapTrn />
  {/if}
</div>

