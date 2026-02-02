<script lang="ts">
	import { CONFIG, resetConfigToDefaults, type ConfigKey } from '../simulation/config';

	interface Props {
		onClose?: () => void;
	}

	let { onClose }: Props = $props();

	let expandedCategory = $state<string | null>('population');

	// Config categories for UI organization
	const CONFIG_CATEGORIES = {
		world: {
			label: '🌍 World',
			fields: [
				{ key: 'WORLD_WIDTH', label: 'Width (px)', min: 800, max: 3200, step: 100 },
				{ key: 'WORLD_HEIGHT', label: 'Height (px)', min: 450, max: 1800, step: 50 }
			]
		},
		population: {
			label: 'Population',
			fields: [
				{ key: 'INITIAL_CREATURE_COUNT', label: 'Initial Creatures', min: 10, max: 500, step: 10 },
				{ key: 'MAX_CREATURES', label: 'Max Creatures', min: 100, max: 2000, step: 50 },
				{ key: 'INITIAL_FOOD_COUNT', label: 'Initial Food', min: 100, max: 2000, step: 50 },
				{ key: 'MAX_FOOD', label: 'Max Food', min: 500, max: 5000, step: 100 }
			]
		},
		creature: {
			label: 'Creature Stats',
			fields: [
				{ key: 'CREATURE_BASE_SPEED', label: 'Base Speed', min: 50, max: 200, step: 10 },
				{ key: 'CREATURE_MIN_SIZE', label: 'Min Size (px)', min: 1, max: 10, step: 1 },
				{ key: 'CREATURE_MAX_SIZE', label: 'Max Size (px)', min: 15, max: 60, step: 1 },
				{ key: 'CREATURE_BASE_ENERGY', label: 'Base Energy', min: 50, max: 200, step: 10 },
				{ key: 'CREATURE_MAX_ENERGY', label: 'Max Energy', min: 100, max: 300, step: 10 },
				{ key: 'CREATURE_ENERGY_DRAIN_BASE', label: 'Energy Drain/s', min: 0.5, max: 5, step: 0.1 },
				{ key: 'CREATURE_VISION_BASE', label: 'Vision Base', min: 40, max: 150, step: 10 },
				{ key: 'CREATURE_VISION_MAX', label: 'Vision Max', min: 100, max: 400, step: 20 }
			]
		},
		food: {
			label: 'Food',
			fields: [
				{ key: 'FOOD_SIZE', label: 'Food Size', min: 2, max: 15, step: 1 },
				{ key: 'FOOD_ENERGY', label: 'Food Energy', min: 10, max: 100, step: 5 },
				{ key: 'FOOD_SPAWN_RATE', label: 'Spawn Rate/s', min: 5, max: 50, step: 1 }
			]
		},
		reproduction: {
			label: 'Reproduction',
			fields: [
				{
					key: 'REPRODUCTION_ENERGY_THRESHOLD',
					label: 'Energy Threshold',
					min: 0.5,
					max: 0.95,
					step: 0.05,
					percent: true
				},
				{
					key: 'REPRODUCTION_ENERGY_COST',
					label: 'Energy Cost',
					min: 0.1,
					max: 0.6,
					step: 0.05,
					percent: true
				},
				{ key: 'REPRODUCTION_COOLDOWN', label: 'Cooldown (sec)', min: 1, max: 30, step: 1 },
				{ key: 'OFFSPRING_MAX_SMALL', label: 'Small Max Offspring', min: 1, max: 8, step: 1 },
				{ key: 'OFFSPRING_MAX_MEDIUM', label: 'Medium Max Offspring', min: 1, max: 4, step: 1 },
				{ key: 'OFFSPRING_MAX_LARGE', label: 'Large Max Offspring', min: 1, max: 3, step: 1 },
				{
					key: 'ASEXUAL_SIZE_THRESHOLD',
					label: 'Asexual Size Limit',
					min: 0.2,
					max: 0.8,
					step: 0.05,
					percent: true
				}
			]
		},
		mutation: {
			label: 'Mutation',
			fields: [
				{
					key: 'MUTATION_RATE',
					label: 'Mutation Rate',
					min: 0.0001,
					max: 0.01,
					step: 0.0001,
					percent: true,
					precision: 4
				},
				{
					key: 'MUTATION_LARGE_CHANCE',
					label: 'Large Mutation Chance',
					min: 0.001,
					max: 0.05,
					step: 0.001,
					percent: true,
					precision: 3
				},
				{
					key: 'MUTATION_LARGE_AMOUNT',
					label: 'Large Mutation Size',
					min: 0.005,
					max: 0.05,
					step: 0.005,
					percent: true,
					precision: 3
				}
			]
		},
		migration: {
			label: 'Migration',
			fields: [
				{
					key: 'MIGRATION_BASE_RATE',
					label: 'Immigration Rate/s',
					min: 0,
					max: 0.1,
					step: 0.005
				},
				{
					key: 'MIGRATION_FOOD_THRESHOLD',
					label: 'Food Threshold',
					min: 0.3,
					max: 1,
					step: 0.05,
					percent: true
				},
				{
					key: 'MIGRATION_POP_THRESHOLD',
					label: 'Pop Threshold',
					min: 0.1,
					max: 0.8,
					step: 0.05,
					percent: true
				},
				{ key: 'MIGRATION_GROUP_SIZE_MAX', label: 'Max Group Size', min: 1, max: 6, step: 1 },
				{
					key: 'EMIGRATION_ENERGY_THRESHOLD',
					label: 'Emigration Energy',
					min: 0.1,
					max: 0.6,
					step: 0.05,
					percent: true
				},
				{
					key: 'EMIGRATION_BASE_CHANCE',
					label: 'Emigration Chance/s',
					min: 0,
					max: 0.1,
					step: 0.005
				}
			]
		},
		herbivoreBalance: {
			label: '🌿 Herbivore Balance',
			fields: [
				{ key: 'HERBIVORE_LIFESPAN_MULT', label: 'Lifespan Mult', min: 0.5, max: 2, step: 0.1 },
				{ key: 'HERBIVORE_REPRO_COOLDOWN_MULT', label: 'Repro Cooldown Mult', min: 0.5, max: 3, step: 0.1 },
				{
					key: 'HERBIVORE_REPRO_THRESHOLD_OFFSET',
					label: 'Repro Threshold Offset',
					min: -0.2,
					max: 0.2,
					step: 0.02
				},
				{ key: 'HERBIVORE_OFFSPRING_BONUS', label: 'Offspring Bonus', min: 0, max: 3, step: 1 },
				{
					key: 'HERBIVORE_PLANT_EFFICIENCY',
					label: 'Plant Efficiency',
					min: 0.5,
					max: 1.5,
					step: 0.05
				},
				{
					key: 'HERBIVORE_SIZE_PLANT_BONUS',
					label: 'Size→Plant Bonus',
					min: 0,
					max: 1,
					step: 0.05
				},
				{
					key: 'HERBIVORE_SPEED_SIZE_PENALTY',
					label: 'Size→Speed Penalty',
					min: 0,
					max: 1.5,
					step: 0.1
				},
				{
					key: 'HERBIVORE_BIG_ENERGY_PENALTY',
					label: 'Big Energy Penalty',
					min: 0,
					max: 2,
					step: 0.1
				},
				{
					key: 'HERBIVORE_HUNGER_THRESHOLD',
					label: 'Hunger Threshold',
					min: 0.5,
					max: 0.95,
					step: 0.05,
					percent: true
				}
			]
		},
		carnivoreBalance: {
			label: '🥩 Carnivore Balance',
			fields: [
				{ key: 'CARNIVORE_LIFESPAN_MULT', label: 'Lifespan Mult', min: 0.5, max: 3, step: 0.1 },
				{ key: 'CARNIVORE_REPRO_COOLDOWN_MULT', label: 'Repro Cooldown Mult', min: 1, max: 5, step: 0.25 },
				{
					key: 'CARNIVORE_REPRO_THRESHOLD_OFFSET',
					label: 'Repro Threshold Offset',
					min: -0.1,
					max: 0.3,
					step: 0.02
				},
				{ key: 'CARNIVORE_OFFSPRING_BONUS', label: 'Offspring Bonus', min: 0, max: 4, step: 1 },
				{
					key: 'CARNIVORE_MEAT_EFFICIENCY',
					label: 'Meat Efficiency',
					min: 0.1,
					max: 0.6,
					step: 0.05,
					percent: true
				},
				{
					key: 'CARNIVORE_SPEED_SIZE_PENALTY',
					label: 'Size→Speed Penalty',
					min: 0,
					max: 1,
					step: 0.1
				},
				{
					key: 'CARNIVORE_HUNGER_THRESHOLD_BASE',
					label: 'Hunger Base',
					min: 0.3,
					max: 0.8,
					step: 0.05,
					percent: true
				},
				{
					key: 'CARNIVORE_HUNGER_SIZE_MODIFIER',
					label: 'Size→Hunger Mod',
					min: 0,
					max: 0.5,
					step: 0.05
				}
			]
		},
		omnivoreBalance: {
			label: '🍽️ Omnivore Balance',
			fields: [
				{ key: 'OMNIVORE_LIFESPAN_MULT', label: 'Lifespan Mult', min: 0.5, max: 2, step: 0.1 },
				{ key: 'OMNIVORE_REPRO_COOLDOWN_MULT', label: 'Repro Cooldown Mult', min: 1, max: 4, step: 0.25 },
				{
					key: 'OMNIVORE_REPRO_THRESHOLD_OFFSET',
					label: 'Repro Threshold Offset',
					min: -0.1,
					max: 0.2,
					step: 0.02
				},
				{
					key: 'OMNIVORE_PLANT_EFFICIENCY',
					label: 'Plant Efficiency',
					min: 0.2,
					max: 0.8,
					step: 0.05,
					percent: true
				},
				{
					key: 'OMNIVORE_PLANT_SIZE_PENALTY',
					label: 'Size→Plant Penalty',
					min: 0,
					max: 0.4,
					step: 0.05
				},
				{
					key: 'OMNIVORE_PLANT_EFFICIENCY_MIN',
					label: 'Min Plant Efficiency',
					min: 0.2,
					max: 0.6,
					step: 0.05,
					percent: true
				},
				{
					key: 'OMNIVORE_MEAT_EFFICIENCY',
					label: 'Meat Efficiency',
					min: 0.05,
					max: 0.35,
					step: 0.05,
					percent: true
				},
				{
					key: 'OMNIVORE_SPEED_SIZE_PENALTY',
					label: 'Size→Speed Penalty',
					min: 0,
					max: 0.6,
					step: 0.05
				},
				{
					key: 'OMNIVORE_ENERGY_DRAIN_MULT',
					label: 'Energy Drain Mult',
					min: 1,
					max: 2,
					step: 0.1
				},
				{
					key: 'OMNIVORE_BIG_ENERGY_PENALTY',
					label: 'Big Energy Penalty',
					min: 0,
					max: 3,
					step: 0.1
				},
				{
					key: 'OMNIVORE_HUNGER_THRESHOLD',
					label: 'Hunger Threshold',
					min: 0.4,
					max: 0.9,
					step: 0.05,
					percent: true
				},
				{
					key: 'OMNIVORE_HUNT_VULNERABILITY_MIN',
					label: 'Hunt Vulnerability Min',
					min: 1,
					max: 4,
					step: 1
				}
			]
		}
	} as const;

	type FieldDef = {
		key: string;
		label: string;
		min: number;
		max: number;
		step: number;
		percent?: boolean;
		precision?: number;
	};

	function toggleCategory(category: string) {
		expandedCategory = expandedCategory === category ? null : category;
	}

	// Create reactive local copy of CONFIG for two-way binding
	let localConfig = $state({ ...CONFIG });

	function updateConfig(key: ConfigKey, value: number) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(localConfig as any)[key] = value;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(CONFIG as any)[key] = value;
	}

	function formatValue(value: number, field: FieldDef): string {
		if (field.percent) {
			return (value * 100).toFixed(field.precision ?? 1) + '%';
		}
		if (Number.isInteger(value)) {
			return value.toString();
		}
		return value.toFixed(field.precision ?? 2);
	}

	function handleReset() {
		resetConfigToDefaults();
		// Sync local state with reset CONFIG
		localConfig = { ...CONFIG };
	}
</script>

<div class="flex flex-col gap-2 rounded-lg bg-gray-800 p-4">
	<div class="flex items-center justify-between">
		<h2 class="text-lg font-semibold text-white">Settings</h2>
		{#if onClose}
			<button
				onclick={onClose}
				class="text-gray-400 transition hover:text-white"
				aria-label="Close settings"
			>
				<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M6 18L18 6M6 6l12 12"
					/>
				</svg>
			</button>
		{/if}
	</div>

	<p class="text-xs text-gray-500">Changes apply on next reset</p>

	<button
		onclick={handleReset}
		class="rounded bg-gray-600 px-3 py-1.5 text-sm text-white transition hover:bg-gray-700"
	>
		Reset to Defaults
	</button>

	<hr class="border-gray-700" />

	<!-- Categories -->
	<div class="flex max-h-[60vh] flex-col gap-1 overflow-y-auto">
		{#each Object.entries(CONFIG_CATEGORIES) as [categoryKey, category]}
			<div class="rounded bg-gray-750">
				<!-- Category Header -->
				<button
					onclick={() => toggleCategory(categoryKey)}
					class="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm font-medium text-gray-200 transition hover:bg-gray-700"
				>
					<span>{category.label}</span>
					<svg
						class="h-4 w-4 transform transition-transform {expandedCategory === categoryKey
							? 'rotate-180'
							: ''}"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M19 9l-7 7-7-7"
						/>
					</svg>
				</button>

				<!-- Category Fields -->
				{#if expandedCategory === categoryKey}
					<div class="flex flex-col gap-2 px-2 pb-2">
						{#each category.fields as field}
							{@const key = field.key as ConfigKey}
							<div class="flex flex-col gap-0.5">
								<div class="flex justify-between text-xs text-gray-400">
									<span>{field.label}</span>
									<span class="font-mono">{formatValue(localConfig[key] as number, field)}</span>
								</div>
								<input
									type="range"
									min={field.min}
									max={field.max}
									step={field.step}
									value={localConfig[key] as number}
									aria-label={field.label}
									oninput={(e) => updateConfig(key, parseFloat(e.currentTarget.value))}
									class="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-gray-600 accent-blue-500"
								/>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/each}
	</div>
</div>
