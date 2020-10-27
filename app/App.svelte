<script>
  import { onMount } from 'svelte';

  import Field from './Field.svelte';
  import { connect } from './ws';
  import {
    processMessage,
    setMyColor,
    updateState,
  } from './controllers';

  onMount(async () => {
    try {
      const ws = await connect();
      console.info('Websocket Connected');
      const playerColor = await ws.recv();
      console.info(playerColor);
      setMyColor(playerColor.payload);

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

<svelte:options immutable={true} />
<Field />
