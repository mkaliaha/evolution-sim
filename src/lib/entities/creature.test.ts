import { describe, it, expect, beforeEach } from 'vitest';
import { Creature } from './creature';
import { generateHerbivoreTraits, generateCarnivoreTraits, generateOmnivoreTraits, type Traits } from './genetics';
import { CONFIG } from '../simulation/config';

describe('Creature', () => {
	describe('constructor', () => {
		it('should create creature with valid initial state', () => {
			const creature = new Creature(100, 200);

			expect(creature.position.x).toBe(100);
			expect(creature.position.y).toBe(200);
			expect(creature.isAlive).toBe(true);
			expect(creature.energy).toBe(CONFIG.CREATURE_BASE_ENERGY);
			expect(creature.age).toBe(0);
			expect(creature.generation).toBe(0);
		});

		it('should accept custom traits', () => {
			const traits = generateHerbivoreTraits();
			const creature = new Creature(0, 0, traits);

			expect(creature.traits).toBe(traits);
			expect(creature.isHerbivore).toBe(true);
		});

		it('should accept custom generation', () => {
			const creature = new Creature(0, 0, undefined, 5);
			expect(creature.generation).toBe(5);
		});

		it('should have initial velocity', () => {
			const creature = new Creature(0, 0);
			const speed = Math.sqrt(creature.velocity.x ** 2 + creature.velocity.y ** 2);
			expect(speed).toBeGreaterThan(0);
		});
	});

	describe('diet classification', () => {
		it('should classify herbivore correctly (dietPreference < 0.35)', () => {
			const traits = generateHerbivoreTraits();
			traits.dietPreference = 0.2;
			const creature = new Creature(0, 0, traits);

			expect(creature.isHerbivore).toBe(true);
			expect(creature.isCarnivore).toBe(false);
			expect(creature.isOmnivore).toBe(false);
		});

		it('should classify carnivore correctly (dietPreference > 0.65)', () => {
			const traits = generateCarnivoreTraits();
			traits.dietPreference = 0.8;
			const creature = new Creature(0, 0, traits);

			expect(creature.isHerbivore).toBe(false);
			expect(creature.isCarnivore).toBe(true);
			expect(creature.isOmnivore).toBe(false);
		});

		it('should classify omnivore correctly (0.35 <= dietPreference <= 0.65)', () => {
			const traits = generateOmnivoreTraits();
			traits.dietPreference = 0.5;
			const creature = new Creature(0, 0, traits);

			expect(creature.isHerbivore).toBe(false);
			expect(creature.isCarnivore).toBe(false);
			expect(creature.isOmnivore).toBe(true);
		});
	});

	describe('energy management', () => {
		it('should have maxEnergy based on size', () => {
			const smallTraits: Traits = { ...generateHerbivoreTraits(), size: 0 };
			const largeTraits: Traits = { ...generateHerbivoreTraits(), size: 1 };

			const small = new Creature(0, 0, smallTraits);
			const large = new Creature(0, 0, largeTraits);

			expect(large.maxEnergy).toBeGreaterThan(small.maxEnergy);
		});

		it('should calculate energyPercent correctly', () => {
			const creature = new Creature(0, 0);
			creature.energy = creature.maxEnergy;
			expect(creature.energyPercent).toBeCloseTo(1, 5);

			creature.energy = creature.maxEnergy / 2;
			expect(creature.energyPercent).toBeCloseTo(0.5, 5);

			creature.energy = 0;
			expect(creature.energyPercent).toBe(0);
		});
	});

	describe('update', () => {
		it('should increase age over time', () => {
			const creature = new Creature(0, 0);
			creature.update(1, 0);
			expect(creature.age).toBe(1);

			creature.update(0.5, 1);
			expect(creature.age).toBe(1.5);
		});

		it('should drain energy over time', () => {
			const creature = new Creature(0, 0);
			const initialEnergy = creature.energy;
			creature.update(1, 0);
			expect(creature.energy).toBeLessThan(initialEnergy);
		});

		it('should not update if dead', () => {
			const creature = new Creature(0, 0);
			creature.isAlive = false;
			const age = creature.age;
			creature.update(1, 0);
			expect(creature.age).toBe(age);
		});

		it('should accumulate hunger stress when energy is low', () => {
			const creature = new Creature(0, 0);
			creature.energy = creature.maxEnergy * 0.3; // Low energy
			creature.hungerStress = 0;

			creature.update(1, 0);

			expect(creature.hungerStress).toBeGreaterThan(0);
		});

		it('should die when energy reaches 0', () => {
			const creature = new Creature(0, 0);
			creature.energy = 1; // Very low
			// Update multiple times to drain energy
			for (let i = 0; i < 100 && creature.isAlive; i++) {
				creature.update(0.1, i * 0.1);
			}
			expect(creature.isAlive).toBe(false);
		});

		it('should die when exceeding max lifespan', () => {
			const creature = new Creature(0, 0);
			creature.age = creature.maxLifespan + 1;
			creature.energy = 1000; // Plenty of energy
			creature.update(0.1, 0);
			expect(creature.isAlive).toBe(false);
		});
	});

	describe('eat', () => {
		it('should increase energy when eating', () => {
			const creature = new Creature(0, 0);
			creature.energy = 50;
			creature.eat(30);

			expect(creature.energy).toBe(80);
		});

		it('should cap energy at maxEnergy', () => {
			const creature = new Creature(0, 0);
			creature.energy = creature.maxEnergy - 10;
			creature.eat(100);

			expect(creature.energy).toBe(creature.maxEnergy);
		});

		it('should allow eating at any energy level', () => {
			const creature = new Creature(0, 0);
			creature.energy = creature.maxEnergy;
			const initialEnergy = creature.energy;
			creature.eat(50);

			// Should still be at max (capped)
			expect(creature.energy).toBe(initialEnergy);
		});
	});

	describe('movement', () => {
		it('should move position based on velocity during update', () => {
			const creature = new Creature(100, 100);
			creature.velocity = { x: 10, y: 5 };
			creature.update(1, 0);

			expect(creature.position.x).toBeCloseTo(110, 0);
			expect(creature.position.y).toBeCloseTo(105, 0);
		});

		it('should stay within world bounds during update', () => {
			const creature = new Creature(CONFIG.WORLD_WIDTH - 5, CONFIG.WORLD_HEIGHT - 5);
			creature.velocity = { x: 100, y: 100 };
			creature.update(1, 0);

			expect(creature.position.x).toBeLessThanOrEqual(CONFIG.WORLD_WIDTH - creature.size);
			expect(creature.position.y).toBeLessThanOrEqual(CONFIG.WORLD_HEIGHT - creature.size);
		});

		it('should not go below minimum bounds during update', () => {
			const creature = new Creature(5, 5);
			creature.velocity = { x: -100, y: -100 };
			creature.update(1, 0);

			expect(creature.position.x).toBeGreaterThanOrEqual(creature.size);
			expect(creature.position.y).toBeGreaterThanOrEqual(creature.size);
		});
	});

	describe('seekTarget', () => {
		it('should accelerate towards target', () => {
			const creature = new Creature(0, 0);
			creature.velocity = { x: 0, y: 0 };
			creature.seekTarget({ x: 100, y: 0 }, 1);

			expect(creature.velocity.x).toBeGreaterThan(0);
		});
	});

	describe('distanceTo', () => {
		it('should calculate correct distance', () => {
			const c1 = new Creature(0, 0);
			const c2 = new Creature(3, 4);

			expect(c1.distanceTo(c2)).toBe(5);
		});
	});

	describe('canSee', () => {
		it('should return true for points within vision range', () => {
			const creature = new Creature(100, 100);
			const nearbyPoint = { x: 110, y: 110 };

			// Should be visible if within vision range
			const distance = Math.sqrt((110 - 100) ** 2 + (110 - 100) ** 2);
			if (distance <= creature.visionRange) {
				expect(creature.canSee(nearbyPoint)).toBe(true);
			}
		});

		it('should return false for points outside vision range', () => {
			const creature = new Creature(100, 100);
			const farPoint = { x: 10000, y: 10000 };

			expect(creature.canSee(farPoint)).toBe(false);
		});
	});

	describe('reproduction', () => {
		it('canReproduce should return false when energy is too low', () => {
			const creature = new Creature(0, 0);
			creature.energy = creature.maxEnergy * 0.3; // Below threshold
			creature.lastReproduction = 0;

			expect(creature.canReproduce(100)).toBe(false); // 100 seconds (simulation time)
		});

		it('canReproduce should return false during cooldown', () => {
			const creature = new Creature(0, 0);
			creature.energy = creature.maxEnergy; // Full energy
			creature.lastReproduction = 10; // Last reproduced at 10 seconds

			expect(creature.canReproduce(10.5)).toBe(false); // Only 0.5 seconds passed (cooldown is 5s)
		});

		it('canReproduce should return true when conditions are met', () => {
			const creature = new Creature(0, 0);
			creature.energy = creature.maxEnergy;
			creature.lastReproduction = 0;

			// After enough time has passed (cooldown is 5 seconds)
			expect(creature.canReproduce(100)).toBe(true);
		});

		it('reproduceAsexual should create offspring with similar traits', () => {
			const parent = new Creature(100, 100);
			parent.energy = parent.maxEnergy;
			parent.lastReproduction = 0;

			const offspring = parent.reproduceAsexual(100); // 100 seconds simulation time

			expect(offspring).not.toBeNull();
			if (offspring) {
				expect(offspring.generation).toBe(parent.generation + 1);
				expect(offspring.isAlive).toBe(true);
			}
		});

		it('reproduceAsexual should cost parent energy', () => {
			const parent = new Creature(100, 100);
			parent.energy = parent.maxEnergy;
			parent.lastReproduction = 0;

			const initialEnergy = parent.energy;
			parent.reproduceAsexual(100); // 100 seconds simulation time

			expect(parent.energy).toBeLessThan(initialEnergy);
		});

		it('isCompatibleMate should return false for dead creatures', () => {
			const c1 = new Creature(0, 0, generateHerbivoreTraits());
			const c2 = new Creature(10, 10, generateHerbivoreTraits());
			c2.isAlive = false;

			expect(c1.isCompatibleMate(c2)).toBe(false);
		});

		it('isCompatibleMate should return false for self', () => {
			const creature = new Creature(0, 0);
			expect(creature.isCompatibleMate(creature)).toBe(false);
		});

		it('isCompatibleMate should prefer same diet type', () => {
			const herb1 = new Creature(0, 0, generateHerbivoreTraits());
			const herb2 = new Creature(10, 10, generateHerbivoreTraits());
			const carn = new Creature(20, 20, generateCarnivoreTraits());

			// Same diet should be compatible
			expect(herb1.isCompatibleMate(herb2)).toBe(true);
			// Different diet may or may not be compatible depending on distance
		});
	});

	describe('combat', () => {
		it('takeDamage should reduce energy', () => {
			const creature = new Creature(0, 0);
			creature.energy = 100;
			creature.takeDamage(30);

			expect(creature.energy).toBe(70);
		});

		it('takeDamage should kill creature when energy reaches 0', () => {
			const creature = new Creature(0, 0);
			creature.energy = 20;
			creature.takeDamage(30);

			expect(creature.isAlive).toBe(false);
		});
	});

	describe('getReproductionReadiness', () => {
		it('should return 0 for dead creatures', () => {
			const creature = new Creature(0, 0);
			creature.isAlive = false;

			expect(creature.getReproductionReadiness(1000)).toBe(0);
		});

		it('should return value between 0 and 1', () => {
			const creature = new Creature(0, 0);
			creature.energy = creature.maxEnergy * 0.5;
			creature.lastReproduction = 0;

			const readiness = creature.getReproductionReadiness(5000);
			expect(readiness).toBeGreaterThanOrEqual(0);
			expect(readiness).toBeLessThanOrEqual(1);
		});
	});

	describe('shouldSeekMate', () => {
		it('should return false for dead creatures', () => {
			const creature = new Creature(0, 0);
			creature.isAlive = false;

			expect(creature.shouldSeekMate(1000)).toBe(false);
		});

		it('should return false for creatures that prefer asexual reproduction', () => {
			const traits = generateCarnivoreTraits();
			traits.size = 0.1; // Small carnivore prefers asexual
			const creature = new Creature(0, 0, traits);

			expect(creature.shouldSeekMate(1000)).toBe(false);
		});
	});
});
