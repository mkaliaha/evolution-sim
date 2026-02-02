<script lang="ts">
	import './layout.css';

	let { children } = $props();
</script>

<svelte:head>
	<title>Evolution Simulator</title>
</svelte:head>

<div class="min-h-screen bg-gray-900">
	{@render children()}
</div>
