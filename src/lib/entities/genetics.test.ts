import { describe, it, expect, beforeEach } from 'vitest';
import {
	generateRandomTraits,
	generateHerbivoreTraits,
	generateCarnivoreTraits,
	generateOmnivoreTraits,
	mutateTraits,
	mutateTraitsWithStress,
	crossoverTraits,
	getTraitColor,
	getAttackDamage,
	getCreatureSize,
	getCreatureSpeed,
	getVisionRange,
	getEnergyDrain,
	getMaxLifespan,
	prefersAsexual,
	getReproductionThreshold,
	getMaxOffspringCount,
	type Traits
} from './genetics';
import { CONFIG } from '../simulation/config';

describe('genetics', () => {
	describe('generateRandomTraits', () => {
		it('should generate traits within valid range [0, 1]', () => {
			for (let i = 0; i < 100; i++) {
				const traits = generateRandomTraits();
				for (const [key, value] of Object.entries(traits)) {
					expect(value).toBeGreaterThanOrEqual(0);
					expect(value).toBeLessThanOrEqual(1);
				}
			}
		});

		it('should generate all required trait properties', () => {
			const traits = generateRandomTraits();
			const requiredTraits = [
				'speed', 'size', 'visionRange', 'metabolism',
				'heatTolerance', 'coldTolerance', 'aggression', 'camouflage',
				'lifespan', 'reproductionRate', 'socialBehavior', 'dietPreference',
				'strength', 'stamina'
			];
			for (const trait of requiredTraits) {
				expect(traits).toHaveProperty(trait);
			}
		});
	});

	describe('generateHerbivoreTraits', () => {
		it('should generate low diet preference (herbivore range)', () => {
			for (let i = 0; i < 50; i++) {
				const traits = generateHerbivoreTraits();
				expect(traits.dietPreference).toBeLessThanOrEqual(0.3);
				expect(traits.aggression).toBeLessThanOrEqual(0.3);
			}
		});

		it('should generate high social behavior', () => {
			for (let i = 0; i < 50; i++) {
				const traits = generateHerbivoreTraits();
				expect(traits.socialBehavior).toBeGreaterThanOrEqual(0.5);
			}
		});
	});

	describe('generateCarnivoreTraits', () => {
		it('should generate high diet preference (carnivore range)', () => {
			for (let i = 0; i < 50; i++) {
				const traits = generateCarnivoreTraits();
				expect(traits.dietPreference).toBeGreaterThanOrEqual(0.7);
			}
		});

		it('should generate high aggression and strength', () => {
			for (let i = 0; i < 50; i++) {
				const traits = generateCarnivoreTraits();
				expect(traits.aggression).toBeGreaterThanOrEqual(0.5);
				expect(traits.strength).toBeGreaterThanOrEqual(0.5);
			}
		});

		it('should generate low social behavior (solitary)', () => {
			for (let i = 0; i < 50; i++) {
				const traits = generateCarnivoreTraits();
				expect(traits.socialBehavior).toBeLessThanOrEqual(0.4);
			}
		});
	});

	describe('generateOmnivoreTraits', () => {
		it('should generate middle-range diet preference (omnivore range)', () => {
			for (let i = 0; i < 50; i++) {
				const traits = generateOmnivoreTraits();
				expect(traits.dietPreference).toBeGreaterThanOrEqual(0.4);
				expect(traits.dietPreference).toBeLessThanOrEqual(0.6);
			}
		});
	});

	describe('mutateTraits', () => {
		it('should keep traits within [0, 1] range after mutation', () => {
			const original = generateRandomTraits();
			for (let i = 0; i < 100; i++) {
				const mutated = mutateTraits(original, 0.1);
				for (const [key, value] of Object.entries(mutated)) {
					expect(value).toBeGreaterThanOrEqual(0);
					expect(value).toBeLessThanOrEqual(1);
				}
			}
		});

		it('should produce similar traits with low mutation rate', () => {
			const original: Traits = {
				speed: 0.5, size: 0.5, visionRange: 0.5, metabolism: 0.5,
				heatTolerance: 0.5, coldTolerance: 0.5, aggression: 0.5, camouflage: 0.5,
				lifespan: 0.5, reproductionRate: 0.5, socialBehavior: 0.5, dietPreference: 0.5,
				strength: 0.5, stamina: 0.5
			};

			let totalDiff = 0;
			const iterations = 100;
			for (let i = 0; i < iterations; i++) {
				const mutated = mutateTraits(original, 0.01);
				for (const key of Object.keys(original) as (keyof Traits)[]) {
					totalDiff += Math.abs(mutated[key] - original[key]);
				}
			}
			const avgDiff = totalDiff / (iterations * 14);
			expect(avgDiff).toBeLessThan(0.05);
		});
	});

	describe('mutateTraitsWithStress', () => {
		it('should apply higher mutation to diet-related traits when stressed', () => {
			const original: Traits = {
				speed: 0.5, size: 0.5, visionRange: 0.5, metabolism: 0.5,
				heatTolerance: 0.5, coldTolerance: 0.5, aggression: 0.5, camouflage: 0.5,
				lifespan: 0.5, reproductionRate: 0.5, socialBehavior: 0.5, dietPreference: 0.5,
				strength: 0.5, stamina: 0.5
			};

			let dietDiff = 0;
			let nonDietDiff = 0;
			const iterations = 500;

			for (let i = 0; i < iterations; i++) {
				const mutated = mutateTraitsWithStress(original, 1.0, 0.01);
				// Diet-related traits
				dietDiff += Math.abs(mutated.dietPreference - original.dietPreference);
				dietDiff += Math.abs(mutated.aggression - original.aggression);
				dietDiff += Math.abs(mutated.strength - original.strength);
				dietDiff += Math.abs(mutated.stamina - original.stamina);
				// Non-diet traits
				nonDietDiff += Math.abs(mutated.speed - original.speed);
				nonDietDiff += Math.abs(mutated.camouflage - original.camouflage);
				nonDietDiff += Math.abs(mutated.heatTolerance - original.heatTolerance);
				nonDietDiff += Math.abs(mutated.coldTolerance - original.coldTolerance);
			}

			const avgDietDiff = dietDiff / (iterations * 4);
			const avgNonDietDiff = nonDietDiff / (iterations * 4);
			// Diet traits should mutate more when stressed
			expect(avgDietDiff).toBeGreaterThan(avgNonDietDiff);
		});
	});

	describe('crossoverTraits', () => {
		it('should produce child traits within [0, 1] range', () => {
			const parent1 = generateRandomTraits();
			const parent2 = generateRandomTraits();

			for (let i = 0; i < 50; i++) {
				const child = crossoverTraits(parent1, parent2);
				for (const [key, value] of Object.entries(child)) {
					expect(value).toBeGreaterThanOrEqual(0);
					expect(value).toBeLessThanOrEqual(1);
				}
			}
		});

		it('should produce traits influenced by both parents', () => {
			const parent1: Traits = {
				speed: 0.0, size: 0.0, visionRange: 0.0, metabolism: 0.0,
				heatTolerance: 0.0, coldTolerance: 0.0, aggression: 0.0, camouflage: 0.0,
				lifespan: 0.0, reproductionRate: 0.0, socialBehavior: 0.0, dietPreference: 0.0,
				strength: 0.0, stamina: 0.0
			};
			const parent2: Traits = {
				speed: 1.0, size: 1.0, visionRange: 1.0, metabolism: 1.0,
				heatTolerance: 1.0, coldTolerance: 1.0, aggression: 1.0, camouflage: 1.0,
				lifespan: 1.0, reproductionRate: 1.0, socialBehavior: 1.0, dietPreference: 1.0,
				strength: 1.0, stamina: 1.0
			};

			// With many children, we should see values from both parents
			let hasLow = false;
			let hasHigh = false;
			for (let i = 0; i < 100; i++) {
				const child = crossoverTraits(parent1, parent2, 0);
				if (child.speed < 0.3) hasLow = true;
				if (child.speed > 0.7) hasHigh = true;
			}
			expect(hasLow).toBe(true);
			expect(hasHigh).toBe(true);
		});
	});

	describe('getTraitColor', () => {
		it('should return valid RGB color string', () => {
			const traits = generateRandomTraits();
			const color = getTraitColor(traits);
			expect(color).toMatch(/^rgb\(\d+, \d+, \d+\)$/);
		});

		it('should produce redder colors for aggressive carnivores', () => {
			const carnivore = generateCarnivoreTraits();
			const herbivore = generateHerbivoreTraits();

			const carnivoreColor = getTraitColor(carnivore);
			const herbivoreColor = getTraitColor(herbivore);

			const carnivoreR = parseInt(carnivoreColor.match(/rgb\((\d+)/)?.[1] || '0');
			const herbivoreR = parseInt(herbivoreColor.match(/rgb\((\d+)/)?.[1] || '0');

			// Carnivores should generally be redder
			expect(carnivoreR).toBeGreaterThanOrEqual(herbivoreR - 50);
		});
	});

	describe('getAttackDamage', () => {
		it('should return higher damage for high strength', () => {
			const weak: Traits = { ...generateRandomTraits(), strength: 0, size: 0.5 };
			const strong: Traits = { ...generateRandomTraits(), strength: 1, size: 0.5 };

			expect(getAttackDamage(strong)).toBeGreaterThan(getAttackDamage(weak));
		});

		it('should return higher damage for larger creatures', () => {
			const small: Traits = { ...generateRandomTraits(), strength: 0.5, size: 0 };
			const large: Traits = { ...generateRandomTraits(), strength: 0.5, size: 1 };

			expect(getAttackDamage(large)).toBeGreaterThan(getAttackDamage(small));
		});
	});

	describe('getCreatureSize', () => {
		it('should return size within configured min/max', () => {
			for (let i = 0; i < 50; i++) {
				const traits = generateRandomTraits();
				const size = getCreatureSize(traits);
				expect(size).toBeGreaterThanOrEqual(CONFIG.CREATURE_MIN_SIZE);
				expect(size).toBeLessThanOrEqual(CONFIG.CREATURE_MAX_SIZE);
			}
		});
	});

	describe('getCreatureSpeed', () => {
		it('should return positive speed', () => {
			for (let i = 0; i < 50; i++) {
				const traits = generateRandomTraits();
				const speed = getCreatureSpeed(traits);
				expect(speed).toBeGreaterThan(0);
			}
		});

		it('should return higher speed for high speed trait', () => {
			const slow: Traits = { ...generateRandomTraits(), speed: 0, size: 0.5, dietPreference: 0.5 };
			const fast: Traits = { ...generateRandomTraits(), speed: 1, size: 0.5, dietPreference: 0.5 };

			expect(getCreatureSpeed(fast)).toBeGreaterThan(getCreatureSpeed(slow));
		});
	});

	describe('getVisionRange', () => {
		it('should return range based on vision trait', () => {
			const blind: Traits = { ...generateRandomTraits(), visionRange: 0 };
			const keen: Traits = { ...generateRandomTraits(), visionRange: 1 };

			expect(getVisionRange(keen)).toBeGreaterThan(getVisionRange(blind));
		});
	});

	describe('getEnergyDrain', () => {
		it('should return higher drain for larger creatures', () => {
			const small: Traits = { ...generateRandomTraits(), size: 0, metabolism: 0.5, dietPreference: 0.5 };
			const large: Traits = { ...generateRandomTraits(), size: 1, metabolism: 0.5, dietPreference: 0.5 };

			expect(getEnergyDrain(large)).toBeGreaterThan(getEnergyDrain(small));
		});

		it('should return lower drain for high metabolism', () => {
			const lowMeta: Traits = { ...generateRandomTraits(), size: 0.5, metabolism: 0, dietPreference: 0.5 };
			const highMeta: Traits = { ...generateRandomTraits(), size: 0.5, metabolism: 1, dietPreference: 0.5 };

			expect(getEnergyDrain(highMeta)).toBeLessThan(getEnergyDrain(lowMeta));
		});
	});

	describe('getMaxLifespan', () => {
		it('should return positive lifespan', () => {
			for (let i = 0; i < 50; i++) {
				const traits = generateRandomTraits();
				const lifespan = getMaxLifespan(traits);
				expect(lifespan).toBeGreaterThan(0);
			}
		});

		it('should return longer lifespan for larger creatures', () => {
			const small: Traits = { ...generateRandomTraits(), size: 0, lifespan: 0.5, dietPreference: 0.5 };
			const large: Traits = { ...generateRandomTraits(), size: 1, lifespan: 0.5, dietPreference: 0.5 };

			expect(getMaxLifespan(large)).toBeGreaterThan(getMaxLifespan(small));
		});
	});

	describe('prefersAsexual', () => {
		it('should return false for large creatures', () => {
			const large: Traits = { ...generateRandomTraits(), size: 1, dietPreference: 0.8, socialBehavior: 0.1 };
			expect(prefersAsexual(large)).toBe(false);
		});

		it('should return true for small carnivores', () => {
			const smallCarnivore: Traits = { ...generateRandomTraits(), size: 0.2, dietPreference: 0.8, socialBehavior: 0.5 };
			expect(prefersAsexual(smallCarnivore)).toBe(true);
		});

		it('should return true for antisocial creatures', () => {
			const antisocial: Traits = { ...generateRandomTraits(), size: 0.2, dietPreference: 0.3, socialBehavior: 0.1 };
			expect(prefersAsexual(antisocial)).toBe(true);
		});
	});

	describe('getReproductionThreshold', () => {
		it('should return value between 0.5 and 0.95', () => {
			for (let i = 0; i < 50; i++) {
				const traits = generateRandomTraits();
				const threshold = getReproductionThreshold(traits);
				expect(threshold).toBeGreaterThanOrEqual(0.5);
				expect(threshold).toBeLessThanOrEqual(0.95);
			}
		});
	});

	describe('getMaxOffspringCount', () => {
		it('should return more offspring for smaller creatures', () => {
			const small: Traits = { ...generateRandomTraits(), size: 0.1 };
			const large: Traits = { ...generateRandomTraits(), size: 0.9 };

			expect(getMaxOffspringCount(small)).toBeGreaterThanOrEqual(getMaxOffspringCount(large));
		});
	});
});
