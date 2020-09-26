<script>
  import Fishka from './Fishka.svelte';

  let color = 'white';
  function swapColor() {
    color = color === 'black' ? 'white' : 'black';
  }
</script>

<Fishka {color} />
<button on:click={swapColor}>Flip</button>
