import { CONFIG, TRAIT_RANGES, type TraitName } from '../simulation/config';

// ============================================
// CONTINUOUS DIET SCALING HELPERS
// ============================================
// These functions provide smooth interpolation of diet-related traits
// based on dietPreference (0 = pure herbivore, 0.5 = omnivore, 1 = pure carnivore)
// This allows "mostly meat-eating omnivores" or "hyperspecialized predators"

/**
 * Interpolate between three values based on diet preference
 * @param dietPreference 0-1 scale (0=herbivore, 0.5=omnivore, 1=carnivore)
 * @param herbValue value at dietPreference=0
 * @param omniValue value at dietPreference=0.5
 * @param carnValue value at dietPreference=1
 */
function interpolateDietValue(
	dietPreference: number,
	herbValue: number,
	omniValue: number,
	carnValue: number
): number {
	if (dietPreference <= 0.5) {
		// Interpolate between herbivore and omnivore
		const t = dietPreference / 0.5; // 0 to 1
		return herbValue + (omniValue - herbValue) * t;
	} else {
		// Interpolate between omnivore and carnivore
		const t = (dietPreference - 0.5) / 0.5; // 0 to 1
		return omniValue + (carnValue - omniValue) * t;
	}
}

/**
 * Get continuous plant eating efficiency based on diet preference
 * Herbivores (0): 100% + size bonus
 * Omnivores (0.5): ~45%
 * Carnivores (1): 0% (can't eat plants)
 */
export function getPlantEfficiency(dietPreference: number, sizeNormalized: number): number {
	// Base efficiency scales from 100% at herb to 0% at carn
	const baseEfficiency = interpolateDietValue(
		dietPreference,
		CONFIG.HERBIVORE_PLANT_EFFICIENCY, // 1.0
		CONFIG.OMNIVORE_PLANT_EFFICIENCY, // 0.45
		0 // carnivores can't eat plants
	);

	// Size bonus for herbivores (scales down as diet shifts to carnivore)
	// Pure herbivores get full bonus, omnivores get half, carnivores get none
	const sizeBonusFactor = interpolateDietValue(dietPreference, 1.0, 0.5, 0);
	const sizeBonus = sizeNormalized * CONFIG.HERBIVORE_SIZE_PLANT_BONUS * sizeBonusFactor;

	// Size penalty for omnivores (peaks at 0.5 diet, zero at extremes)
	// This represents the "jack of all trades" inefficiency
	const omnivoreness = 1 - Math.abs(dietPreference - 0.5) * 2; // 0 at extremes, 1 at 0.5
	const sizePenalty = sizeNormalized * CONFIG.OMNIVORE_PLANT_SIZE_PENALTY * omnivoreness;

	const efficiency = baseEfficiency + sizeBonus - sizePenalty;
	return Math.max(0, Math.min(1.5, efficiency)); // Clamp to reasonable range
}

/**
 * Get continuous meat eating efficiency based on diet preference
 * Herbivores (0): 0% (can't eat meat)
 * Omnivores (0.5): ~15%
 * Carnivores (1): ~35%
 */
export function getMeatEfficiency(dietPreference: number): number {
	return interpolateDietValue(
		dietPreference,
		0, // herbivores can't eat meat
		CONFIG.OMNIVORE_MEAT_EFFICIENCY, // 0.15
		CONFIG.CARNIVORE_MEAT_EFFICIENCY // 0.35
	);
}

/**
 * Get continuous speed size penalty based on diet preference
 * Herbivores (0): high penalty (0.8) - big grazers are slow
 * Omnivores (0.5): moderate penalty (0.3)
 * Carnivores (1): no penalty (0.0) - big cats are still fast
 */
export function getSpeedSizePenalty(dietPreference: number): number {
	return interpolateDietValue(
		dietPreference,
		CONFIG.HERBIVORE_SPEED_SIZE_PENALTY,
		CONFIG.OMNIVORE_SPEED_SIZE_PENALTY,
		CONFIG.CARNIVORE_SPEED_SIZE_PENALTY
	);
}

/**
 * Get continuous lifespan multiplier based on diet preference
 * Herbivores (0): shorter (0.9x)
 * Omnivores (0.5): baseline (1.0x)
 * Carnivores (1): longer (1.5x)
 */
export function getLifespanMultiplier(dietPreference: number): number {
	return interpolateDietValue(
		dietPreference,
		CONFIG.HERBIVORE_LIFESPAN_MULT,
		CONFIG.OMNIVORE_LIFESPAN_MULT,
		CONFIG.CARNIVORE_LIFESPAN_MULT
	);
}

/**
 * Get continuous reproduction threshold offset based on diet preference
 * Herbivores (0): can breed at lower energy (-0.1)
 * Omnivores (0.5): slight offset (+0.05)
 * Carnivores (1): need more energy (+0.1)
 */
export function getReproThresholdOffset(dietPreference: number): number {
	return interpolateDietValue(
		dietPreference,
		CONFIG.HERBIVORE_REPRO_THRESHOLD_OFFSET,
		CONFIG.OMNIVORE_REPRO_THRESHOLD_OFFSET,
		CONFIG.CARNIVORE_REPRO_THRESHOLD_OFFSET
	);
}

/**
 * Get continuous reproduction cooldown multiplier based on diet preference
 * Herbivores (0): faster breeding (1.0x)
 * Omnivores (0.5): slower (2.5x)
 * Carnivores (1): slowest (2.5x)
 */
export function getReproCooldownMultiplier(dietPreference: number): number {
	return interpolateDietValue(
		dietPreference,
		CONFIG.HERBIVORE_REPRO_COOLDOWN_MULT,
		CONFIG.OMNIVORE_REPRO_COOLDOWN_MULT,
		CONFIG.CARNIVORE_REPRO_COOLDOWN_MULT
	);
}

/**
 * Get continuous energy drain multiplier based on diet preference
 * This is the "generalist penalty" that peaks at omnivore (0.5)
 * Specialists (pure herb or pure carn) are more efficient
 */
export function getEnergyDrainMultiplier(dietPreference: number, sizeNormalized: number): number {
	// Base multiplier: herbivores and carnivores are efficient, omnivores are not
	// Using a parabola that peaks at 0.5
	const omnivoreness = 1 - Math.abs(dietPreference - 0.5) * 2; // 0 at extremes, 1 at 0.5
	const baseMultiplier = 1 + (CONFIG.OMNIVORE_ENERGY_DRAIN_MULT - 1) * omnivoreness;

	// Big creature penalty - also scales with omnivoreness
	// Big omnivores are extremely inefficient, big specialists less so
	let sizePenalty = 1.0;

	// Herbivore big penalty (for size > 0.5)
	if (dietPreference < 0.5 && sizeNormalized > 0.5) {
		const herbFactor = 1 - dietPreference * 2; // 1 at diet=0, 0 at diet=0.5
		sizePenalty += (sizeNormalized - 0.5) * CONFIG.HERBIVORE_BIG_ENERGY_PENALTY * herbFactor;
	}

	// Omnivore big penalty (for size > 0.4, peaks at diet=0.5)
	if (sizeNormalized > 0.4) {
		const omniPenalty = (sizeNormalized - 0.4) * CONFIG.OMNIVORE_BIG_ENERGY_PENALTY * omnivoreness;
		sizePenalty += omniPenalty;
	}

	return baseMultiplier * sizePenalty;
}

/**
 * Get continuous hunger threshold based on diet preference
 * Herbivores (0): graze constantly (85%)
 * Omnivores (0.5): moderate (75%)
 * Carnivores (1): feast-and-famine, size dependent
 */
export function getHungerThreshold(dietPreference: number, sizeNormalized: number): number {
	// Carnivore threshold is size-dependent
	const carnThreshold =
		CONFIG.CARNIVORE_HUNGER_THRESHOLD_BASE - sizeNormalized * CONFIG.CARNIVORE_HUNGER_SIZE_MODIFIER;

	return interpolateDietValue(
		dietPreference,
		CONFIG.HERBIVORE_HUNGER_THRESHOLD,
		CONFIG.OMNIVORE_HUNGER_THRESHOLD,
		carnThreshold
	);
}

/**
 * Get continuous metabolism efficiency at rest
 * Herbivores (0): 0.8 (specialized grazer)
 * Omnivores (0.5): 1.0 (generalist penalty)
 * Carnivores (1): 0.85 (feast-and-famine adapted)
 */
export function getRestMetabolismEfficiency(dietPreference: number): number {
	return interpolateDietValue(dietPreference, 0.8, 1.0, 0.85);
}

/**
 * Get continuous movement cost efficiency
 * Herbivores (0): 0.35 (efficient grazing)
 * Omnivores (0.5): 0.4 (generalist)
 * Carnivores (1): 0.3 (efficient pursuit)
 */
export function getMovementCost(dietPreference: number): number {
	return interpolateDietValue(dietPreference, 0.35, 0.4, 0.3);
}

/**
 * Get continuous hunting cost when in hunting state
 * Herbivores don't hunt, omnivores hunt lightly, carnivores sprint hard
 */
export function getHuntingCost(dietPreference: number): number {
	// Only applies for diet > 0.35 (omnivore/carnivore territory)
	if (dietPreference < 0.35) return 0;

	// Scale from 0.5 at omnivore to 0.8 at pure carnivore
	const huntingDiet = (dietPreference - 0.35) / 0.65; // 0 at 0.35, 1 at 1.0
	return 0.5 + huntingDiet * 0.3;
}

// ============================================
// END CONTINUOUS DIET SCALING HELPERS
// ============================================

// Complete set of creature traits
export interface Traits {
	speed: number; // Movement speed multiplier
	size: number; // Body size multiplier
	visionRange: number; // Detection radius multiplier
	metabolism: number; // Energy efficiency (higher = less drain)
	heatTolerance: number; // Survival in hot temperatures
	coldTolerance: number; // Survival in cold temperatures
	aggression: number; // Tendency to hunt others
	camouflage: number; // Harder to detect
	lifespan: number; // Maximum age multiplier
	reproductionRate: number; // Lower threshold for reproduction
	socialBehavior: number; // Herding tendency
	dietPreference: number; // 0=herbivore, 0.5=omnivore, 1=carnivore
	strength: number; // Attack damage (important for carnivores)
	stamina: number; // Sustained activity for chasing/fleeing
}

// Clamp value between 0 and 1
function clamp01(value: number): number {
	return Math.max(0, Math.min(1, value));
}

// Generate random trait value within range
function randomTrait(traitName: TraitName): number {
	const range = TRAIT_RANGES[traitName];
	return range.min + Math.random() * (range.max - range.min);
}

// Generate completely random traits
export function generateRandomTraits(): Traits {
	return {
		speed: randomTrait('speed'),
		size: randomTrait('size'),
		visionRange: randomTrait('visionRange'),
		metabolism: randomTrait('metabolism'),
		heatTolerance: randomTrait('heatTolerance'),
		coldTolerance: randomTrait('coldTolerance'),
		aggression: randomTrait('aggression'),
		camouflage: randomTrait('camouflage'),
		lifespan: randomTrait('lifespan'),
		reproductionRate: randomTrait('reproductionRate'),
		socialBehavior: randomTrait('socialBehavior'),
		dietPreference: randomTrait('dietPreference'),
		strength: randomTrait('strength'),
		stamina: randomTrait('stamina')
	};
}

// Generate traits biased towards herbivore (for initial population diversity)
export function generateHerbivoreTraits(): Traits {
	const traits = generateRandomTraits();
	// Herbivore-specific biases
	traits.dietPreference = Math.random() * 0.3; // 0-0.3 (strong herbivore)
	traits.aggression = Math.random() * 0.3; // Low aggression
	traits.socialBehavior = 0.5 + Math.random() * 0.5; // High social (herding)
	traits.camouflage = 0.3 + Math.random() * 0.5; // Moderate to high camouflage
	return traits;
}

// Generate traits biased towards carnivore (for initial population diversity)
export function generateCarnivoreTraits(): Traits {
	const traits = generateRandomTraits();
	// Carnivore-specific biases
	traits.dietPreference = 0.7 + Math.random() * 0.3; // 0.7-1.0 (strong carnivore)
	traits.aggression = 0.5 + Math.random() * 0.5; // High aggression
	traits.strength = 0.5 + Math.random() * 0.5; // High strength
	traits.stamina = 0.5 + Math.random() * 0.5; // High stamina for chasing
	traits.speed = 0.5 + Math.random() * 0.5; // Fast for hunting
	traits.visionRange = 0.5 + Math.random() * 0.5; // Good vision to spot prey
	traits.socialBehavior = Math.random() * 0.4; // More solitary
	return traits;
}

// Generate traits biased towards omnivore (for initial population diversity)
// Omnivores are generalists - balanced stats, high adaptability
export function generateOmnivoreTraits(): Traits {
	const traits = generateRandomTraits();
	// Omnivore-specific biases - jack of all trades
	traits.dietPreference = 0.4 + Math.random() * 0.2; // 0.4-0.6 (core omnivore range)
	traits.aggression = 0.3 + Math.random() * 0.3; // Moderate aggression
	traits.strength = 0.35 + Math.random() * 0.3; // Decent strength
	traits.metabolism = 0.5 + Math.random() * 0.3; // Good metabolism (efficient)
	traits.stamina = 0.4 + Math.random() * 0.3; // Decent stamina
	traits.visionRange = 0.4 + Math.random() * 0.3; // Good vision
	traits.socialBehavior = 0.3 + Math.random() * 0.4; // Varies - can be social or solo
	traits.reproductionRate = 0.5 + Math.random() * 0.3; // Good reproduction
	return traits;
}

// Apply mutation to a single trait
function mutateTrait(value: number, mutationRate: number = CONFIG.MUTATION_RATE): number {
	// Check for large mutation
	if (Math.random() < CONFIG.MUTATION_LARGE_CHANCE) {
		const direction = Math.random() < 0.5 ? -1 : 1;
		return clamp01(value + direction * CONFIG.MUTATION_LARGE_AMOUNT * Math.random());
	}

	// Normal small mutation
	const deviation = (Math.random() - 0.5) * 2 * mutationRate;
	return clamp01(value + deviation);
}

// Mutate all traits
export function mutateTraits(traits: Traits, mutationRate?: number): Traits {
	return {
		speed: mutateTrait(traits.speed, mutationRate),
		size: mutateTrait(traits.size, mutationRate),
		visionRange: mutateTrait(traits.visionRange, mutationRate),
		metabolism: mutateTrait(traits.metabolism, mutationRate),
		heatTolerance: mutateTrait(traits.heatTolerance, mutationRate),
		coldTolerance: mutateTrait(traits.coldTolerance, mutationRate),
		aggression: mutateTrait(traits.aggression, mutationRate),
		camouflage: mutateTrait(traits.camouflage, mutationRate),
		lifespan: mutateTrait(traits.lifespan, mutationRate),
		reproductionRate: mutateTrait(traits.reproductionRate, mutationRate),
		socialBehavior: mutateTrait(traits.socialBehavior, mutationRate),
		dietPreference: mutateTrait(traits.dietPreference, mutationRate),
		strength: mutateTrait(traits.strength, mutationRate),
		stamina: mutateTrait(traits.stamina, mutationRate)
	};
}

// Mutate traits with stress-based enhancement for diet-related traits
// hungerStress: 0-1, how hungry the parent was (higher = more diet mutation)
export function mutateTraitsWithStress(traits: Traits, hungerStress: number, mutationRate?: number): Traits {
	// Base mutation rate
	const baseRate = mutationRate ?? CONFIG.MUTATION_RATE;

	// Diet-related traits get boosted mutation when stressed
	// This simulates epigenetic/stress-induced adaptation pressure
	const dietMutationBoost = 1 + hungerStress * 4; // Up to 5x mutation for diet traits when starving
	const dietRate = baseRate * dietMutationBoost;

	return {
		speed: mutateTrait(traits.speed, baseRate),
		size: mutateTrait(traits.size, baseRate),
		visionRange: mutateTrait(traits.visionRange, baseRate),
		metabolism: mutateTrait(traits.metabolism, baseRate * (1 + hungerStress)), // Slightly boosted
		heatTolerance: mutateTrait(traits.heatTolerance, baseRate),
		coldTolerance: mutateTrait(traits.coldTolerance, baseRate),
		aggression: mutateTrait(traits.aggression, dietRate), // Aggression linked to hunting
		camouflage: mutateTrait(traits.camouflage, baseRate),
		lifespan: mutateTrait(traits.lifespan, baseRate),
		reproductionRate: mutateTrait(traits.reproductionRate, baseRate),
		socialBehavior: mutateTrait(traits.socialBehavior, baseRate),
		dietPreference: mutateTrait(traits.dietPreference, dietRate), // Main diet trait - heavily boosted
		strength: mutateTrait(traits.strength, dietRate), // Strength for hunting
		stamina: mutateTrait(traits.stamina, dietRate) // Stamina for hunting/foraging
	};
}

// Crossover two parent traits for sexual reproduction
export function crossoverTraits(parent1: Traits, parent2: Traits, mutationRate?: number): Traits {
	const child: Traits = {
		speed: 0,
		size: 0,
		visionRange: 0,
		metabolism: 0,
		heatTolerance: 0,
		coldTolerance: 0,
		aggression: 0,
		camouflage: 0,
		lifespan: 0,
		reproductionRate: 0,
		socialBehavior: 0,
		dietPreference: 0,
		strength: 0,
		stamina: 0
	};

	// For each trait, randomly pick from parent or blend
	const traitNames = Object.keys(child) as (keyof Traits)[];
	for (const trait of traitNames) {
		const blendChance = Math.random();
		if (blendChance < 0.4) {
			// Take from parent 1
			child[trait] = parent1[trait];
		} else if (blendChance < 0.8) {
			// Take from parent 2
			child[trait] = parent2[trait];
		} else {
			// Blend both parents
			child[trait] = (parent1[trait] + parent2[trait]) / 2;
		}
	}

	// Apply mutations
	return mutateTraits(child, mutationRate);
}

// Calculate trait-based color for visual diversity
export function getTraitColor(traits: Traits): string {
	// Map traits to RGB
	// Red: aggression + diet preference + strength (carnivores/aggressive are redder)
	// Green: metabolism + camouflage (efficient/hidden are greener)
	// Blue: cold tolerance + social behavior (cold-adapted/social are bluer)
	const r = Math.floor(((traits.aggression + traits.dietPreference + traits.strength) / 3) * 200 + 55);
	const g = Math.floor(((traits.metabolism + traits.camouflage) / 2) * 200 + 55);
	const b = Math.floor(((traits.coldTolerance + traits.socialBehavior) / 2) * 200 + 55);

	return `rgb(${r}, ${g}, ${b})`;
}

// Get attack damage based on strength and size
export function getAttackDamage(traits: Traits): number {
	// Strength is main factor, size adds bonus
	const baseDamage = 15;
	return baseDamage + traits.strength * 35 + traits.size * 10;
}

// Get size in pixels based on size trait
export function getCreatureSize(traits: Traits): number {
	return (
		CONFIG.CREATURE_MIN_SIZE +
		traits.size * (CONFIG.CREATURE_MAX_SIZE - CONFIG.CREATURE_MIN_SIZE)
	);
}

// Get movement speed based on speed trait, size, and diet
// Uses continuous diet scaling - size penalty smoothly interpolates based on dietPreference
export function getCreatureSpeed(traits: Traits): number {
	const baseSpeed = CONFIG.CREATURE_BASE_SPEED * (0.5 + traits.speed);

	// Continuous diet-based size penalty
	const sizePenalty = getSpeedSizePenalty(traits.dietPreference);

	// Base speed modifier also scales with diet (herbivores start slower but get less penalty)
	// Pure herbivore: 1.3 base, Pure carnivore: 1.0 base, Omnivore: 1.1 base
	const baseModifier = interpolateDietValue(traits.dietPreference, 1.3, 1.1, 1.0);

	const sizeModifier = baseModifier - traits.size * sizePenalty;

	return baseSpeed * sizeModifier;
}

// Get vision range based on trait
export function getVisionRange(traits: Traits): number {
	return CONFIG.CREATURE_VISION_BASE + traits.visionRange * CONFIG.CREATURE_VISION_MAX;
}

// Get energy drain rate based on size, metabolism, and diet
// Uses continuous diet scaling - generalist penalty peaks at omnivore (0.5)
export function getEnergyDrain(traits: Traits): number {
	// Bigger = MUCH more drain (square-cube law: volume grows faster than surface area)
	// size 0 = 0.3x drain, size 1 = 1.8x drain (6x difference)
	const sizeModifier = 0.3 + traits.size * 1.5;
	// Better metabolism = less drain
	const metabolismModifier = 1.5 - traits.metabolism;

	// Continuous diet modifier - peaks at omnivore, efficient at extremes
	const dietModifier = getEnergyDrainMultiplier(traits.dietPreference, traits.size);

	return CONFIG.CREATURE_ENERGY_DRAIN_BASE * sizeModifier * metabolismModifier * dietModifier;
}

// Get maximum lifespan in seconds
// Uses continuous diet scaling - smoothly interpolates between diet types
export function getMaxLifespan(traits: Traits): number {
	// Base 30-90 seconds based on lifespan trait
	let baseLifespan = 30 + traits.lifespan * 60;

	// Size affects lifespan (larger animals tend to live longer)
	// size 0 = 0.7x lifespan, size 1 = 1.3x lifespan
	const sizeModifier = 0.7 + traits.size * 0.6;
	baseLifespan *= sizeModifier;

	// Continuous diet-based lifespan modifier
	baseLifespan *= getLifespanMultiplier(traits.dietPreference);

	return baseLifespan;
}

// Check if creature prefers asexual reproduction
// Larger creatures cannot reproduce asexually (complexity requires sexual reproduction)
export function prefersAsexual(traits: Traits): boolean {
	// Large creatures cannot reproduce asexually
	if (traits.size > CONFIG.ASEXUAL_SIZE_THRESHOLD) {
		return false;
	}

	// Smaller creatures: carnivores and antisocial creatures prefer asexual
	return traits.dietPreference > 0.6 || traits.socialBehavior < 0.3;
}

// Calculate reproduction threshold
// Uses continuous diet scaling - smoothly interpolates threshold offset
export function getReproductionThreshold(traits: Traits): number {
	// Base threshold from trait
	let threshold = CONFIG.REPRODUCTION_ENERGY_THRESHOLD - traits.reproductionRate * 0.2;

	// Continuous diet-based threshold adjustment
	threshold += getReproThresholdOffset(traits.dietPreference);

	return Math.min(0.95, Math.max(0.5, threshold));
}

// Get maximum offspring count for sexual reproduction based on size
// Smaller creatures can have more offspring (r-strategy)
// Larger creatures have fewer offspring (K-strategy)
export function getMaxOffspringCount(traits: Traits): number {
	if (traits.size < 0.3) {
		return CONFIG.OFFSPRING_MAX_SMALL;
	} else if (traits.size < 0.6) {
		return CONFIG.OFFSPRING_MAX_MEDIUM;
	} else {
		return CONFIG.OFFSPRING_MAX_LARGE;
	}
}
