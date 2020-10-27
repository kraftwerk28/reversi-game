<script>
  import { onMount } from 'svelte';

  import Field from './Field.svelte';
  import { connect } from './ws';
  import {
    processMessage,
    setMyColor,
    updateState,
    setBlackHole,
  } from './controllers';

  onMount(async () => {
    try {
      const ws = await connect();
      console.info('Websocket Connected');

      const { payload: blackHole } = await ws.recv();
      const { payload: playerColor } = await ws.recv();
      console.info(blackHole);

      setMyColor(playerColor);
      setBlackHole(blackHole);

      while (true) {
        const message = await ws.recv();
        processMessage(message);
      }
    } catch (err) {
      updateState({ isLoading: false, singleplayer: true });
      console.info('Using singleplayer mode.');
    }
  });
</script>

<style>
  :global(:root) {
    --tile-size: 3em;
    --tile-gap: 2px;
  }
</style>

<svelte:options immutable={true} />
<Field />
