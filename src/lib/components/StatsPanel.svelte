<script lang="ts">
	import type { World } from '../simulation/world';
	import { formatTrait } from '../utils/format';

	interface Props {
		stats: ReturnType<World['getStats']> | null;
	}

	let { stats }: Props = $props();
</script>

<div class="flex flex-col gap-4 rounded-lg bg-gray-800 p-4">
	<h2 class="text-lg font-semibold text-white">Population Stats</h2>

	{#if stats}
		<!-- Main stats -->
		<div class="grid grid-cols-2 gap-2 text-sm">
			<div class="rounded bg-gray-700 p-2">
				<div class="text-gray-400">Population</div>
				<div class="text-2xl font-bold text-white">{stats.population}</div>
			</div>
			<div class="rounded bg-gray-700 p-2">
				<div class="text-gray-400">Food</div>
				<div class="text-2xl font-bold text-green-400">{stats.foodCount}</div>
			</div>
			<div class="rounded bg-gray-700 p-2">
				<div class="text-gray-400">Births</div>
				<div class="text-xl font-bold text-blue-400">{stats.totalBirths}</div>
			</div>
			<div class="rounded bg-gray-700 p-2">
				<div class="text-gray-400">Deaths</div>
				<div class="text-xl font-bold text-red-400">{stats.totalDeaths}</div>
			</div>
		</div>

		<!-- Generation -->
		<div class="rounded bg-gray-700 p-2 text-center">
			<div class="text-sm text-gray-400">Max Generation</div>
			<div class="text-xl font-bold text-purple-400">{stats.maxGeneration}</div>
		</div>

		<!-- Diet distribution -->
		<div class="flex flex-col gap-1">
			<div class="text-sm text-gray-400">Diet Distribution</div>
			<div class="flex h-4 overflow-hidden rounded">
				{#if stats.population > 0}
					<div
						class="bg-green-500"
						style="width: {(stats.dietDistribution.herbivores / stats.population) * 100}%"
						title="Herbivores: {stats.dietDistribution.herbivores}"
					></div>
					<div
						class="bg-yellow-500"
						style="width: {(stats.dietDistribution.omnivores / stats.population) * 100}%"
						title="Omnivores: {stats.dietDistribution.omnivores}"
					></div>
					<div
						class="bg-red-500"
						style="width: {(stats.dietDistribution.carnivores / stats.population) * 100}%"
						title="Carnivores: {stats.dietDistribution.carnivores}"
					></div>
				{:else}
					<div class="w-full bg-gray-600"></div>
				{/if}
			</div>
			<div class="flex justify-between text-xs text-gray-500">
				<span>🌿 {stats.dietDistribution.herbivores}</span>
				<span>🍽️ {stats.dietDistribution.omnivores}</span>
				<span>🥩 {stats.dietDistribution.carnivores}</span>
			</div>
		</div>

		<!-- Species -->
		{#if stats.species}
			<div class="flex flex-col gap-1">
				<div class="flex items-center justify-between text-sm">
					<span class="text-gray-400">Species</span>
					<span class="text-xs text-gray-500">
						{stats.species.activeSpecies} active / {stats.species.extinctSpecies} extinct
					</span>
				</div>
				<div class="max-h-32 overflow-y-auto">
					{#each stats.species.speciesList.slice(0, 8) as species}
						<div
							class="flex items-center justify-between rounded px-2 py-1 text-xs"
							style="background-color: {species.color}22"
						>
							<span class="flex items-center gap-1">
								<span
									class="h-2 w-2 rounded-full"
									style="background-color: {species.color}"
								></span>
								<span class="text-white">{species.name}</span>
							</span>
							<span class="text-gray-400">{species.population}</span>
						</div>
					{/each}
					{#if stats.species.speciesList.length > 8}
						<div class="text-center text-xs text-gray-500">
							+{stats.species.speciesList.length - 8} more species
						</div>
					{/if}
				</div>
			</div>
		{/if}

		<!-- Average traits -->
		<div class="flex flex-col gap-1">
			<div class="text-sm text-gray-400">Average Traits</div>
			<div class="grid grid-cols-2 gap-1 text-xs">
				<div class="flex justify-between rounded bg-gray-700 px-2 py-1">
					<span class="text-gray-400">Speed</span>
					<span class="text-white">{formatTrait(stats.avgTraits.speed)}</span>
				</div>
				<div class="flex justify-between rounded bg-gray-700 px-2 py-1">
					<span class="text-gray-400">Size</span>
					<span class="text-white">{formatTrait(stats.avgTraits.size)}</span>
				</div>
				<div class="flex justify-between rounded bg-gray-700 px-2 py-1">
					<span class="text-gray-400">Vision</span>
					<span class="text-white">{formatTrait(stats.avgTraits.visionRange)}</span>
				</div>
				<div class="flex justify-between rounded bg-gray-700 px-2 py-1">
					<span class="text-gray-400">Metabolism</span>
					<span class="text-white">{formatTrait(stats.avgTraits.metabolism)}</span>
				</div>
				<div class="flex justify-between rounded bg-gray-700 px-2 py-1">
					<span class="text-gray-400">Heat Tol.</span>
					<span class="text-orange-400">{formatTrait(stats.avgTraits.heatTolerance)}</span>
				</div>
				<div class="flex justify-between rounded bg-gray-700 px-2 py-1">
					<span class="text-gray-400">Cold Tol.</span>
					<span class="text-blue-400">{formatTrait(stats.avgTraits.coldTolerance)}</span>
				</div>
				<div class="flex justify-between rounded bg-gray-700 px-2 py-1">
					<span class="text-gray-400">Aggression</span>
					<span class="text-red-400">{formatTrait(stats.avgTraits.aggression)}</span>
				</div>
				<div class="flex justify-between rounded bg-gray-700 px-2 py-1">
					<span class="text-gray-400">Camouflage</span>
					<span class="text-white">{formatTrait(stats.avgTraits.camouflage)}</span>
				</div>
				<div class="flex justify-between rounded bg-gray-700 px-2 py-1">
					<span class="text-gray-400">Social</span>
					<span class="text-white">{formatTrait(stats.avgTraits.socialBehavior)}</span>
				</div>
				<div class="flex justify-between rounded bg-gray-700 px-2 py-1">
					<span class="text-gray-400">Repro Rate</span>
					<span class="text-white">{formatTrait(stats.avgTraits.reproductionRate)}</span>
				</div>
				<div class="flex justify-between rounded bg-gray-700 px-2 py-1">
					<span class="text-gray-400">Strength</span>
					<span class="text-red-400">{formatTrait(stats.avgTraits.strength)}</span>
				</div>
				<div class="flex justify-between rounded bg-gray-700 px-2 py-1">
					<span class="text-gray-400">Stamina</span>
					<span class="text-yellow-400">{formatTrait(stats.avgTraits.stamina)}</span>
				</div>
			</div>
		</div>
	{:else}
		<div class="text-center text-gray-500">Loading...</div>
	{/if}
</div>
