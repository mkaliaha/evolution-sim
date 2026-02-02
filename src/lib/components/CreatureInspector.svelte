<script lang="ts">
	import type { Creature } from '../entities/creature';
	import { speciesRegistry } from '../entities/species';
	import { formatTrait, getDietLabelWithEmoji, getStateLabel } from '../utils/format';

	interface Props {
		creature: Creature | null;
		onClose: () => void;
	}

	let { creature, onClose }: Props = $props();

	// Get species info for the current creature
	let speciesInfo = $derived(creature ? speciesRegistry.getCreatureSpecies(creature.id) : null);
</script>

{#if creature}
	<div class="flex flex-col gap-3 rounded-lg bg-gray-800 p-4">
		<div class="flex items-center justify-between">
			<h2 class="text-lg font-semibold text-white">Creature #{creature.id}</h2>
			<button
				onclick={onClose}
				class="rounded px-2 py-1 text-gray-400 transition hover:bg-gray-700 hover:text-white"
			>
				✕
			</button>
		</div>

		<!-- Visual -->
		<div class="flex items-center gap-4">
			<div
				class="rounded-full"
				style="background-color: {creature.color}; width: {creature.size * 3}px; height: {creature.size * 3}px"
			></div>
			<div>
				{#if speciesInfo}
					<div class="text-lg font-medium" style="color: {speciesInfo.color}">
						{speciesInfo.name}
					</div>
				{/if}
				<div class="text-sm text-white">{getDietLabelWithEmoji(creature.traits.dietPreference)}</div>
				<div class="text-xs text-gray-400">Generation {creature.generation}</div>
			</div>
		</div>

		<!-- Status -->
		<div class="grid grid-cols-2 gap-2 text-sm">
			<div class="rounded bg-gray-700 p-2">
				<div class="text-gray-400">State</div>
				<div class="text-white">{getStateLabel(creature.state)}</div>
			</div>
			<div class="rounded bg-gray-700 p-2">
				<div class="text-gray-400">Age</div>
				<div class="text-white">{creature.age.toFixed(1)}s / {creature.maxLifespan.toFixed(0)}s</div>
			</div>
		</div>

		<!-- Energy bar -->
		<div class="flex flex-col gap-1">
			<div class="flex justify-between text-sm">
				<span class="text-gray-400">Energy</span>
				<span class="text-white">{creature.energy.toFixed(0)} / {creature.maxEnergy.toFixed(0)}</span>
			</div>
			<div class="h-3 overflow-hidden rounded bg-gray-700">
				<div
					class="h-full transition-all"
					class:bg-green-500={creature.energyPercent > 0.5}
					class:bg-yellow-500={creature.energyPercent <= 0.5 && creature.energyPercent > 0.25}
					class:bg-red-500={creature.energyPercent <= 0.25}
					style="width: {creature.energyPercent * 100}%"
				></div>
			</div>
		</div>

		<!-- Traits -->
		<div class="flex flex-col gap-1">
			<div class="text-sm font-medium text-gray-300">Traits</div>
			<div class="grid grid-cols-2 gap-1 text-xs">
				<div class="flex justify-between rounded bg-gray-700 px-2 py-1">
					<span class="text-gray-400">Speed</span>
					<span class="text-white">{formatTrait(creature.traits.speed)}</span>
				</div>
				<div class="flex justify-between rounded bg-gray-700 px-2 py-1">
					<span class="text-gray-400">Size</span>
					<span class="text-white">{formatTrait(creature.traits.size)}</span>
				</div>
				<div class="flex justify-between rounded bg-gray-700 px-2 py-1">
					<span class="text-gray-400">Vision</span>
					<span class="text-white">{formatTrait(creature.traits.visionRange)}</span>
				</div>
				<div class="flex justify-between rounded bg-gray-700 px-2 py-1">
					<span class="text-gray-400">Metabolism</span>
					<span class="text-white">{formatTrait(creature.traits.metabolism)}</span>
				</div>
				<div class="flex justify-between rounded bg-gray-700 px-2 py-1">
					<span class="text-gray-400">Heat Tol.</span>
					<span class="text-orange-400">{formatTrait(creature.traits.heatTolerance)}</span>
				</div>
				<div class="flex justify-between rounded bg-gray-700 px-2 py-1">
					<span class="text-gray-400">Cold Tol.</span>
					<span class="text-blue-400">{formatTrait(creature.traits.coldTolerance)}</span>
				</div>
				<div class="flex justify-between rounded bg-gray-700 px-2 py-1">
					<span class="text-gray-400">Aggression</span>
					<span class="text-red-400">{formatTrait(creature.traits.aggression)}</span>
				</div>
				<div class="flex justify-between rounded bg-gray-700 px-2 py-1">
					<span class="text-gray-400">Camouflage</span>
					<span class="text-white">{formatTrait(creature.traits.camouflage)}</span>
				</div>
				<div class="flex justify-between rounded bg-gray-700 px-2 py-1">
					<span class="text-gray-400">Lifespan</span>
					<span class="text-white">{formatTrait(creature.traits.lifespan)}</span>
				</div>
				<div class="flex justify-between rounded bg-gray-700 px-2 py-1">
					<span class="text-gray-400">Repro Rate</span>
					<span class="text-white">{formatTrait(creature.traits.reproductionRate)}</span>
				</div>
				<div class="flex justify-between rounded bg-gray-700 px-2 py-1">
					<span class="text-gray-400">Social</span>
					<span class="text-white">{formatTrait(creature.traits.socialBehavior)}</span>
				</div>
				<div class="flex justify-between rounded bg-gray-700 px-2 py-1">
					<span class="text-gray-400">Diet</span>
					<span class="text-white">{formatTrait(creature.traits.dietPreference)}</span>
				</div>
				<div class="flex justify-between rounded bg-gray-700 px-2 py-1">
					<span class="text-gray-400">Strength</span>
					<span class="text-red-400">{formatTrait(creature.traits.strength)}</span>
				</div>
				<div class="flex justify-between rounded bg-gray-700 px-2 py-1">
					<span class="text-gray-400">Stamina</span>
					<span class="text-yellow-400">{formatTrait(creature.traits.stamina)}</span>
				</div>
			</div>
		</div>
	</div>
{/if}
