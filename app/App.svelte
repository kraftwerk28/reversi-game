<script>
  import { onMount } from 'svelte';

  import Field from './Field.svelte';
  import { connect } from './ws';
  import { gameState } from './state';
  import { MSG_TYPE } from '../common';

  onMount(async () => {
    try {
      const ws = await connect();
      console.info('Websocket Connected');

      const { payload: blackHole } = await ws.recv();
      const { payload: playerColor } = await ws.recv();
      gameState.syncState({ playerColor, blackHole });
      const { payload: firstSync } = await ws.recv();
      gameState.syncState({ ...firstSync, isLoading: false });

      while (true) {
        const message = await ws.recv();
        if (message.type === MSG_TYPE.SYNC) {
          gameState.syncState(message.payload);
        }
      }
    } catch (err) {
      console.error(err);
      updateState({ isLoading: true });
      console.info('Failed to initialize game.');
    }
  });
</script>

<style>
  :global(:root) {
    --tile-size: 3em;
    --tile-gap: 2px;
  }
</style>

<svelte:head>
  <title>
    Antireversi
  </title>
</svelte:head>
<svelte:options immutable={true} />
{#if !$gameState.isLoading}
  <Field />
{/if}
