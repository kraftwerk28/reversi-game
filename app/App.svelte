<script>
  import { onMount } from 'svelte';

  import Field from './Field.svelte';
  import { connect } from './ws';
  onMount(() => {
    connect();
  });
</script>

<svelte:options immutable={true} />
<Field />
