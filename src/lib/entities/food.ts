import { CONFIG } from '../simulation/config';
import type { Vector2 } from './creature';
import { distance } from '../utils/math';

let nextFoodId = 0;

// Food size categories with different energy values
export type FoodSize = 'small' | 'medium' | 'large';

const FOOD_SIZE_DATA = {
	small: { energy: 15, visualSize: 4, weight: 0.6 },    // Common small plants (60%)
	medium: { energy: 40, visualSize: 8, weight: 0.35 },  // Standard plants (35%)
	large: { energy: 120, visualSize: 20, weight: 0.05 }  // Rare large plants/bushes (5%)
};

export class Food {
	readonly id: number;
	position: Vector2;
	maxEnergy: number;      // Starting energy of this food
	energy: number;         // Current energy (can be partially consumed)
	size: number;           // Visual size
	foodSize: FoodSize;     // Size category
	isConsumed: boolean = false;

	constructor(x: number, y: number, foodSize?: FoodSize) {
		this.id = nextFoodId++;
		this.position = { x, y };
		this.foodSize = foodSize ?? getRandomFoodSize();
		const sizeData = FOOD_SIZE_DATA[this.foodSize];
		this.maxEnergy = sizeData.energy;
		this.energy = sizeData.energy;
		this.size = sizeData.visualSize;
	}

	// Consume food based on creature size relative to food size
	// Bigger creatures take bigger bites, but large plants resist small creatures
	// Returns energy consumed
	consume(creatureSize: number = 1): number {
		if (this.isConsumed || this.energy <= 0) return 0;

		// Normalize creature size (0 = smallest, 1 = largest)
		const normalizedCreatureSize = (creatureSize - CONFIG.CREATURE_MIN_SIZE) /
			(CONFIG.CREATURE_MAX_SIZE - CONFIG.CREATURE_MIN_SIZE);

		// Base bite size scales with creature size (5-25 energy per bite)
		const baseBiteSize = 5 + normalizedCreatureSize * 20;

		// Food size penalty: larger foods are harder for small creatures to consume
		// Small creatures struggle with large plants (penalty up to 80%)
		// Large creatures can easily eat any plant
		const foodSizeMultiplier = this.getFoodSizeMultiplier(normalizedCreatureSize);

		const biteSize = baseBiteSize * foodSizeMultiplier;
		const consumed = Math.min(this.energy, biteSize);
		this.energy -= consumed;

		if (this.energy <= 0) {
			this.isConsumed = true;
		}

		return consumed;
	}

	// Calculate consumption efficiency based on creature size vs food size
	private getFoodSizeMultiplier(normalizedCreatureSize: number): number {
		const sizeData = FOOD_SIZE_DATA[this.foodSize];
		const foodVisualSize = sizeData.visualSize;

		// Small foods: no penalty for anyone
		if (this.foodSize === 'small') return 1;

		// Medium foods: slight penalty for very small creatures
		if (this.foodSize === 'medium') {
			return 0.5 + normalizedCreatureSize * 0.5; // 50%-100%
		}

		// Large foods: significant penalty for small creatures
		// Small creature (size 0): 20% efficiency
		// Medium creature (size 0.5): 60% efficiency
		// Large creature (size 1): 100% efficiency
		return 0.2 + normalizedCreatureSize * 0.8;
	}

	// Check collision with a creature
	isCollidingWith(creaturePos: Vector2, creatureSize: number): boolean {
		const dist = distance(this.position.x, this.position.y, creaturePos.x, creaturePos.y);
		return dist < this.size + creatureSize;
	}
}

// Get random food size based on weights
function getRandomFoodSize(): FoodSize {
	const roll = Math.random();
	if (roll < FOOD_SIZE_DATA.small.weight) return 'small';
	if (roll < FOOD_SIZE_DATA.small.weight + FOOD_SIZE_DATA.medium.weight) return 'medium';
	return 'large';
}

// Spawn food at random position
export function spawnRandomFood(): Food {
	const padding = 10;
	const x = padding + Math.random() * (CONFIG.WORLD_WIDTH - padding * 2);
	const y = padding + Math.random() * (CONFIG.WORLD_HEIGHT - padding * 2);
	return new Food(x, y);
}
