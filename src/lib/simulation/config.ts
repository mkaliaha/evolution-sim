// Simulation configuration constants
// CONFIG is mutable at runtime - UI can modify these values

// Default values (immutable reference)
const DEFAULT_CONFIG = {
	// World
	WORLD_WIDTH: 2400,
	WORLD_HEIGHT: 1350,
	SPATIAL_CELL_SIZE: 50, // Grid cell size for spatial hashing

	// Population
	INITIAL_CREATURE_COUNT: 300, // More creatures for viable sexual reproduction
	MAX_CREATURES: 1500,
	// Food - scarce enough to create competition and boom-bust cycles
	INITIAL_FOOD_COUNT: 1200,
	MAX_FOOD: 2000,

	// Creature defaults
	CREATURE_BASE_SPEED: 100, // pixels per second
	CREATURE_BASE_SIZE: 10,
	CREATURE_MAX_SIZE: 32, // larger max for more visible size difference
	CREATURE_MIN_SIZE: 3, // smaller min for tiny creatures
	CREATURE_BASE_ENERGY: 100,
	CREATURE_MAX_ENERGY: 150,
	CREATURE_ENERGY_DRAIN_BASE: 2, // per second
	CREATURE_VISION_BASE: 80,
	CREATURE_VISION_MAX: 200,

	// Food
	FOOD_SIZE: 5,
	FOOD_ENERGY: 30,
	FOOD_SPAWN_RATE: 25, // per second base rate - lower to create food competition

	// Predators
	PREDATOR_BASE_SPEED: 120,
	PREDATOR_SIZE: 15,
	PREDATOR_VISION: 150,
	PREDATOR_DAMAGE: 50,

	// Reproduction
	REPRODUCTION_ENERGY_THRESHOLD: 0.8, // 80% of max energy
	REPRODUCTION_ENERGY_COST: 0.35, // 35% of current energy (lower cost = more frequent breeding)
	REPRODUCTION_COOLDOWN: 4, // seconds (simulation time)

	// Sexual reproduction offspring limits (smaller creatures = more offspring)
	OFFSPRING_MAX_SMALL: 6, // max offspring for smallest creatures (size < 0.3)
	OFFSPRING_MAX_MEDIUM: 4, // max offspring for medium creatures (size 0.3-0.6)
	OFFSPRING_MAX_LARGE: 2, // max offspring for largest creatures (size > 0.6)

	// Size threshold for asexual reproduction (larger creatures cannot reproduce asexually)
	ASEXUAL_SIZE_THRESHOLD: 0.5, // creatures with size > 0.5 cannot reproduce asexually

	// Mutation - very fine steps for gradual evolution (~1000 steps across full range)
	MUTATION_RATE: 0.001, // 0.1% deviation per trait (1000 steps to cross full range)
	MUTATION_LARGE_CHANCE: 0.005, // 0.5% chance of large mutation
	MUTATION_LARGE_AMOUNT: 0.01, // 1% deviation for large mutations

	// Environment
	TEMPERATURE_MIN: -20,
	TEMPERATURE_MAX: 50,
	TEMPERATURE_DEFAULT: 20,
	TEMPERATURE_DAMAGE_RATE: 10, // damage per second when outside tolerance

	// Random temperature zones
	TEMP_ZONE_SPAWN_RATE: 0.1, // zones per second when enabled
	TEMP_ZONE_MAX: 10, // maximum random zones at once
	TEMP_ZONE_LIFETIME: 30, // seconds before zone decays
	TEMP_ZONE_MIN_RADIUS: 60,
	TEMP_ZONE_MAX_RADIUS: 150,

	// Migration (immigration from other biomes) - kept low to prevent population spikes
	MIGRATION_ENABLED: true, // set to false to test if ecosystem can sustain itself
	MIGRATION_BASE_RATE: 0.01, // base migrations per second (1 every ~100 seconds)
	MIGRATION_FOOD_THRESHOLD: 0.8, // food abundance must be above this (stricter)
	MIGRATION_POP_THRESHOLD: 0.3, // population must be below this % of max (stricter)
	MIGRATION_GROUP_SIZE_MIN: 1,
	MIGRATION_GROUP_SIZE_MAX: 2, // smaller groups

	// Emigration (leaving to other biomes when struggling)
	EMIGRATION_EDGE_DISTANCE: 30, // how close to edge to consider leaving
	EMIGRATION_ENERGY_THRESHOLD: 0.35, // energy below this = might leave
	EMIGRATION_CROWDING_THRESHOLD: 8, // nearby creatures to feel "crowded"
	EMIGRATION_BASE_CHANCE: 0.02, // base chance per second when conditions met

	// ============================================
	// DIET-TYPE BALANCE TUNING (per-type multipliers)
	// ============================================

	// --- HERBIVORE BALANCE ---
	// Lifespan multiplier (1.0 = base, <1 = shorter, >1 = longer)
	HERBIVORE_LIFESPAN_MULT: 0.9,
	// Reproduction cooldown multiplier (1.0 = base, >1 = slower breeding)
	// Extremely low value = explosive breeding - herbivores breed like rabbits
	HERBIVORE_REPRO_COOLDOWN_MULT: 0.15,
	// Reproduction energy threshold offset (-0.3 = can breed at 50% energy)
	// Very low threshold = breed constantly whenever they have any food
	HERBIVORE_REPRO_THRESHOLD_OFFSET: -0.3,
	// Bonus offspring for herbivore pairs (very high = population explosions)
	HERBIVORE_OFFSPRING_BONUS: 4,
	// Plant food efficiency (1.0 = 100%)
	HERBIVORE_PLANT_EFFICIENCY: 1.0,
	// Size bonus for plant digestion (big herbivores extract more from plants)
	HERBIVORE_SIZE_PLANT_BONUS: 0.4, // size * this added to efficiency
	// Speed: size penalty factor (higher = more speed loss when big)
	HERBIVORE_SPEED_SIZE_PENALTY: 0.8, // speed = 1.3 - size * this
	// Energy drain: big herbivore penalty multiplier (for size > 0.5)
	HERBIVORE_BIG_ENERGY_PENALTY: 1.0, // up to 1 + (size-0.5) * this
	// Hunger threshold (seek food below this energy %)
	HERBIVORE_HUNGER_THRESHOLD: 0.85,
	// Size-based reproduction modifier thresholds (lower = faster breeding)
	HERBIVORE_TINY_REPRO_MULT: 0.1, // size < 0.3 - tiny herbivores breed explosively fast
	HERBIVORE_SMALL_REPRO_MULT: 0.2, // size 0.3-0.5 - small herbivores still breed very fast
	HERBIVORE_LARGE_REPRO_MULT: 0.5, // size > 0.5 - even large herbivores breed quickly

	// --- CARNIVORE BALANCE ---
	// Lifespan multiplier
	CARNIVORE_LIFESPAN_MULT: 1.5,
	// Reproduction cooldown multiplier
	CARNIVORE_REPRO_COOLDOWN_MULT: 2.5,
	// Reproduction energy threshold offset
	CARNIVORE_REPRO_THRESHOLD_OFFSET: 0.1,
	// Bonus offspring for carnivore pairs (compensates for sparse population)
	CARNIVORE_OFFSPRING_BONUS: 2,
	// Meat extraction efficiency (portion of prey energy gained)
	CARNIVORE_MEAT_EFFICIENCY: 0.35,
	// Speed: size penalty factor (0 = no penalty for big carnivores)
	CARNIVORE_SPEED_SIZE_PENALTY: 0.0,
	// Hunger threshold base (modified by size)
	CARNIVORE_HUNGER_THRESHOLD_BASE: 0.60,
	// Hunger threshold size modifier (bigger = less hungry threshold)
	CARNIVORE_HUNGER_SIZE_MODIFIER: 0.35,

	// --- OMNIVORE BALANCE ---
	// Lifespan multiplier
	OMNIVORE_LIFESPAN_MULT: 1.0,
	// Reproduction cooldown multiplier
	OMNIVORE_REPRO_COOLDOWN_MULT: 2.5,
	// Reproduction energy threshold offset
	OMNIVORE_REPRO_THRESHOLD_OFFSET: 0.05,
	// Plant food efficiency (generalist penalty - worse than herbivores)
	OMNIVORE_PLANT_EFFICIENCY: 0.45,
	// Plant efficiency size penalty (bigger = much worse at plants)
	OMNIVORE_PLANT_SIZE_PENALTY: 0.25, // efficiency - size * this
	// Minimum plant efficiency
	OMNIVORE_PLANT_EFFICIENCY_MIN: 0.30,
	// Meat extraction efficiency
	OMNIVORE_MEAT_EFFICIENCY: 0.15,
	// Speed: size penalty factor
	OMNIVORE_SPEED_SIZE_PENALTY: 0.3,
	// Energy drain multiplier (generalist metabolism tax - significant)
	OMNIVORE_ENERGY_DRAIN_MULT: 1.5,
	// Energy drain: big omnivore penalty multiplier (for size > 0.4)
	// Big generalists are very inefficient - jack of all trades, master of none
	OMNIVORE_BIG_ENERGY_PENALTY: 1.5, // up to ENERGY_DRAIN_MULT * (1 + (size-0.4) * this)
	// Hunger threshold
	OMNIVORE_HUNGER_THRESHOLD: 0.75,
	// Vulnerability criteria needed to hunt (higher = pickier)
	OMNIVORE_HUNT_VULNERABILITY_MIN: 3,

	// Rendering
	TARGET_FPS: 60,
	SHOW_DEBUG: false
} as const;

// Mutable runtime config - starts with default values
export const CONFIG: { -readonly [K in keyof typeof DEFAULT_CONFIG]: (typeof DEFAULT_CONFIG)[K] } = {
	...DEFAULT_CONFIG
};

// Reset config to defaults
export function resetConfigToDefaults(): void {
	Object.assign(CONFIG, DEFAULT_CONFIG);
}

// Get default value for a config key
export function getDefaultConfig<K extends keyof typeof DEFAULT_CONFIG>(
	key: K
): (typeof DEFAULT_CONFIG)[K] {
	return DEFAULT_CONFIG[key];
}

export type Config = typeof CONFIG;
export type ConfigKey = keyof Config;

// Trait ranges for initialization
// All ranges expanded to 0.0-1.0 for more gradual evolution
// Defaults set low - creatures start small and evolve larger over time
export const TRAIT_RANGES = {
	speed: { min: 0.0, max: 1.0, default: 0.3 },
	size: { min: 0.0, max: 1.0, default: 0.15 }, // Start very small
	visionRange: { min: 0.0, max: 1.0, default: 0.3 },
	metabolism: { min: 0.0, max: 1.0, default: 0.4 },
	heatTolerance: { min: 0.0, max: 1.0, default: 0.5 },
	coldTolerance: { min: 0.0, max: 1.0, default: 0.5 },
	aggression: { min: 0.0, max: 1.0, default: 0.1 },
	camouflage: { min: 0.0, max: 1.0, default: 0.2 },
	lifespan: { min: 0.0, max: 1.0, default: 0.3 },
	reproductionRate: { min: 0.0, max: 1.0, default: 0.4 },
	socialBehavior: { min: 0.0, max: 1.0, default: 0.2 },
	dietPreference: { min: 0.0, max: 1.0, default: 0.15 }, // Start mostly herbivore
	strength: { min: 0.0, max: 1.0, default: 0.2 },
	stamina: { min: 0.0, max: 1.0, default: 0.3 }
} as const;

export type TraitName = keyof typeof TRAIT_RANGES;
