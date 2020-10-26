<script>
  import { onMount } from 'svelte';

  import Field from './Field.svelte';
  import { connect } from './ws';
  import { processMessage, setMyColor } from './controllers';

  onMount(async () => {
    const ws = await connect();
    console.info('Websocket Connected');
    const playerColor = await ws.recv();
    setMyColor(playerColor.payload);

    while (true) {
      const message = await ws.recv();
      processMessage(message);
    }
  });
</script>

<svelte:options immutable={true} />
<Field />
