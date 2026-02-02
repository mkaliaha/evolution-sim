<script lang="ts">
	import type { SimulationEngine } from '../simulation/engine';
	import { CONFIG } from '../simulation/config';

	interface Props {
		engine: SimulationEngine;
	}

	let { engine }: Props = $props();

	let temperature = $state(CONFIG.TEMPERATURE_DEFAULT);
	let foodAbundance = $state(1);
	let mutationRate = $state(CONFIG.MUTATION_RATE);
	let speed = $state(1);
	let randomZones = $state(false);

	function updateTemperature() {
		engine.setTemperature(temperature);
	}

	function updateFoodAbundance() {
		engine.setFoodAbundance(foodAbundance);
	}

	function updateMutationRate() {
		engine.setMutationRate(mutationRate);
	}

	function updateSpeed() {
		engine.setSpeed(speed);
	}

	function togglePause() {
		if (engine.state === 'running') {
			engine.pause();
		} else if (engine.state === 'paused') {
			engine.resume();
		}
	}

	function reset() {
		engine.reset();
		// Sync UI state with reset world defaults
		temperature = CONFIG.TEMPERATURE_DEFAULT;
		foodAbundance = 1;
		mutationRate = CONFIG.MUTATION_RATE;
		randomZones = false;
		// Note: speed is preserved on engine, so UI stays in sync
	}

	function clearZones() {
		engine.clearTemperatureZones();
	}

	function toggleRandomZones() {
		randomZones = !randomZones;
		engine.setRandomZonesEnabled(randomZones);
	}
</script>

<div class="flex flex-col gap-4 rounded-lg bg-gray-800 p-4">
	<h2 class="text-lg font-semibold text-white">Environment Controls</h2>

	<!-- Playback controls -->
	<div class="flex gap-2">
		<button
			onclick={togglePause}
			class="flex-1 rounded bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700"
		>
			{engine.state === 'running' ? 'Pause' : 'Resume'}
		</button>
		<button
			onclick={reset}
			class="rounded bg-gray-600 px-4 py-2 text-white transition hover:bg-gray-700"
		>
			Reset
		</button>
	</div>

	<!-- Speed -->
	<div class="flex flex-col gap-1">
		<label for="speed-slider" class="flex justify-between text-sm text-gray-300">
			<span>Speed</span>
			<span>{speed.toFixed(1)}x</span>
		</label>
		<input
			id="speed-slider"
			type="range"
			min="0.1"
			max="10"
			step="0.1"
			bind:value={speed}
			oninput={updateSpeed}
			class="w-full accent-blue-500"
		/>
	</div>

	<hr class="border-gray-700" />

	<!-- Temperature -->
	<div class="flex flex-col gap-1">
		<label for="temp-slider" class="flex justify-between text-sm text-gray-300">
			<span>Temperature</span>
			<span class={temperature > 30 ? 'text-red-400' : temperature < 10 ? 'text-blue-400' : ''}>
				{temperature}°C
			</span>
		</label>
		<input
			id="temp-slider"
			type="range"
			min={CONFIG.TEMPERATURE_MIN}
			max={CONFIG.TEMPERATURE_MAX}
			step="1"
			bind:value={temperature}
			oninput={updateTemperature}
			class="w-full accent-orange-500"
		/>
	</div>

	<!-- Food Abundance -->
	<div class="flex flex-col gap-1">
		<label for="food-slider" class="flex justify-between text-sm text-gray-300">
			<span>Food Abundance</span>
			<span>{Math.round(foodAbundance * 100)}%</span>
		</label>
		<input
			id="food-slider"
			type="range"
			min="0"
			max="3"
			step="0.1"
			bind:value={foodAbundance}
			oninput={updateFoodAbundance}
			class="w-full accent-green-500"
		/>
	</div>

	<hr class="border-gray-700" />

	<!-- Mutation Rate -->
	<div class="flex flex-col gap-1">
		<label for="mutation-slider" class="flex justify-between text-sm text-gray-300">
			<span>Mutation Rate</span>
			<span>{Math.round(mutationRate * 100)}%</span>
		</label>
		<input
			id="mutation-slider"
			type="range"
			min="0"
			max="0.3"
			step="0.01"
			bind:value={mutationRate}
			oninput={updateMutationRate}
			class="w-full accent-purple-500"
		/>
	</div>

	<hr class="border-gray-700" />

	<!-- Temperature zones -->
	<div class="flex flex-col gap-2">
		<label class="flex cursor-pointer items-center justify-between text-sm text-gray-300">
			<span>Random Temp Zones</span>
			<button
				onclick={toggleRandomZones}
				aria-label="Toggle random temperature zones"
				class="relative h-6 w-11 rounded-full transition-colors {randomZones
					? 'bg-orange-500'
					: 'bg-gray-600'}"
			>
				<span
					class="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform {randomZones
						? 'translate-x-5'
						: ''}"
				></span>
			</button>
		</label>
		{#if randomZones}
			<p class="text-xs text-gray-500">Hot and cold zones appear randomly</p>
		{/if}
	</div>

	<button
		onclick={clearZones}
		class="rounded bg-gray-600 px-4 py-2 text-sm text-white transition hover:bg-gray-700"
	>
		Clear Temperature Zones
	</button>
</div>
