<script>
	export let color = 'black';
	const trDur = 300;
	$: swapTrn = (node, { cl }) => ({
		delay: cl === color ? trDur : 0,
		duration: trDur,
		css: (t, u) => `
			transform: rotateX(${t * 0.5}turn) scale(${(t >= 0.5 ? u : t) * 2 + 1});
			visibility: ${t >= 0.5 ? 'visible' : 'hidden'};
		`,
	});
</script>
<style>
	.root {
		display: block;
		position: relative;
		width: 2em;
		height: 2em;
		margin: 20px;
	}
	.fishka {
		width: 2em;
		height: 2em;
		position: absolute;
		border-radius: 1em;
		cursor: pointer;
	}
	.w {
		background: white;
		border: 1px solid black;
	}
	.b {
		background: black;
		border: 1px solid white;
	}
</style>

<div class="root">
	{#if color === 'black'}
		<div class="fishka b" transition:swapTrn />
	{/if}

	{#if color === 'white'}
		<div class="fishka w" transition:swapTrn />
	{/if}
</div>