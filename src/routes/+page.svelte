<script lang="ts">
	import { onMount } from 'svelte';
	import { createEngine } from '$lib/simulation/engine';
	import SimulationCanvas from '$lib/components/SimulationCanvas.svelte';
	import ControlPanel from '$lib/components/ControlPanel.svelte';
	import StatsPanel from '$lib/components/StatsPanel.svelte';
	import CreatureInspector from '$lib/components/CreatureInspector.svelte';
	import SettingsPanel from '$lib/components/SettingsPanel.svelte';
	import type { Creature } from '$lib/entities/creature';
	import type { World } from '$lib/simulation/world';

	const engine = createEngine();

	let stats: ReturnType<World['getStats']> | null = $state(null);
	let selectedCreature: Creature | null = $state(null);
	let showSettings = $state(false);

	onMount(() => {
		// Update stats periodically
		const interval = setInterval(() => {
			if (engine.state === 'running') {
				stats = engine.getStats();

				// Check if selected creature is still alive
				if (selectedCreature && !selectedCreature.isAlive) {
					selectedCreature = null;
				}
			}
		}, 500);

		return () => {
			clearInterval(interval);
			engine.stop();
		};
	});

	function handleCreatureSelect(creature: Creature | null) {
		selectedCreature = creature;
	}

	function clearSelection() {
		selectedCreature = null;
	}
</script>

<div class="flex h-screen flex-col p-4">
	<!-- Header -->
	<header class="mb-4 flex items-center justify-between">
		<h1 class="text-2xl font-bold text-white">Evolution Simulator</h1>
		<div class="text-sm text-gray-400">
			Watch natural selection in action • Control environment to shape evolution
		</div>
	</header>

	<!-- Main content -->
	<div class="flex min-h-0 flex-1 gap-4">
		<!-- Left panel: Controls -->
		<aside class="flex w-64 shrink-0 flex-col gap-4 overflow-y-auto">
			<ControlPanel {engine} />

			<!-- Settings toggle -->
			<button
				onclick={() => (showSettings = !showSettings)}
				class="flex items-center justify-between rounded-lg bg-gray-800 px-4 py-2 text-sm text-gray-300 transition hover:bg-gray-700"
			>
				<span>Advanced Settings</span>
				<svg
					class="h-4 w-4 transform transition-transform {showSettings ? 'rotate-180' : ''}"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
				</svg>
			</button>

			{#if showSettings}
				<SettingsPanel onClose={() => (showSettings = false)} />
			{/if}
		</aside>

		<!-- Center: Simulation canvas -->
		<main class="min-w-0 flex-1">
			<SimulationCanvas {engine} onCreatureSelect={handleCreatureSelect} />
		</main>

		<!-- Right panel: Stats & Inspector -->
		<aside class="flex w-72 shrink-0 flex-col gap-4 overflow-y-auto">
			<StatsPanel {stats} />

			{#if selectedCreature}
				<CreatureInspector creature={selectedCreature} onClose={clearSelection} />
			{/if}
		</aside>
	</div>
</div>
