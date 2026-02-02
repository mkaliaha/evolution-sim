import { describe, it, expect, beforeEach } from 'vitest';
import { World } from './world';
import { CONFIG } from './config';
import { Creature } from '../entities/creature';
import { generateHerbivoreTraits } from '../entities/genetics';

describe('World', () => {
	let world: World;

	beforeEach(() => {
		world = new World();
	});

	describe('constructor', () => {
		it('should create empty world', () => {
			expect(world.creatures).toEqual([]);
			expect(world.food).toEqual([]);
			expect(world.temperatureZones).toEqual([]);
		});

		it('should have default settings', () => {
			expect(world.foodAbundance).toBe(1);
			expect(world.globalTemperature).toBe(20);
			expect(world.randomZonesEnabled).toBe(false);
		});
	});

	describe('initialize', () => {
		it('should spawn creatures', () => {
			world.initialize(50);
			expect(world.creatures.length).toBe(50);
		});

		it('should spawn food', () => {
			world.initialize(10);
			expect(world.food.length).toBe(CONFIG.INITIAL_FOOD_COUNT);
		});

		it('should spawn herbivores only', () => {
			world.initialize(100);
			for (const creature of world.creatures) {
				expect(creature.isHerbivore).toBe(true);
			}
		});

		it('should assign species to creatures', () => {
			world.initialize(20);
			for (const creature of world.creatures) {
				expect(creature.speciesId).not.toBeNull();
			}
		});

		it('should use default creature count if not specified', () => {
			world.initialize();
			expect(world.creatures.length).toBe(CONFIG.INITIAL_CREATURE_COUNT);
		});

		it('should reset counters', () => {
			world.totalBirths = 100;
			world.totalDeaths = 50;
			world.generationMax = 10;

			world.initialize(10);

			expect(world.totalBirths).toBe(0);
			expect(world.totalDeaths).toBe(0);
			expect(world.generationMax).toBe(0);
		});
	});

	describe('addCreature', () => {
		it('should add creature to world', () => {
			world.initialize(0);
			const creature = new Creature(100, 100, generateHerbivoreTraits());
			world.addCreature(creature);

			expect(world.creatures).toContain(creature);
		});

		it('should increment totalBirths', () => {
			world.initialize(0);
			const initialBirths = world.totalBirths;
			const creature = new Creature(100, 100);
			world.addCreature(creature);

			expect(world.totalBirths).toBe(initialBirths + 1);
		});

		it('should update generationMax if creature has higher generation', () => {
			world.initialize(0);
			const creature = new Creature(100, 100, undefined, 5);
			world.addCreature(creature);

			expect(world.generationMax).toBe(5);
		});

		it('should assign species to new creature', () => {
			world.initialize(0);
			const creature = new Creature(100, 100);
			world.addCreature(creature);

			expect(creature.speciesId).not.toBeNull();
		});

		it('should not exceed MAX_CREATURES', () => {
			world.initialize(CONFIG.MAX_CREATURES);
			const creature = new Creature(100, 100);
			world.addCreature(creature);

			expect(world.creatures.length).toBe(CONFIG.MAX_CREATURES);
		});
	});

	describe('getTemperatureAt', () => {
		it('should return global temperature when no zones exist', () => {
			world.globalTemperature = 25;
			const temp = world.getTemperatureAt(100, 100);
			expect(temp).toBe(25);
		});

		it('should be affected by temperature zones', () => {
			world.globalTemperature = 20;
			world.addTemperatureZone(100, 100, 50, 30); // Hot zone

			const tempAtCenter = world.getTemperatureAt(100, 100);
			expect(tempAtCenter).toBeGreaterThan(20);
		});

		it('should have less effect further from zone center', () => {
			world.globalTemperature = 20;
			world.addTemperatureZone(100, 100, 50, 30);

			const tempAtCenter = world.getTemperatureAt(100, 100);
			const tempAtEdge = world.getTemperatureAt(140, 100);

			expect(tempAtCenter).toBeGreaterThan(tempAtEdge);
		});
	});

	describe('temperature zones', () => {
		it('should add temperature zone', () => {
			world.addTemperatureZone(100, 100, 50, 25);
			expect(world.temperatureZones.length).toBe(1);
		});

		it('should clear temperature zones', () => {
			world.addTemperatureZone(100, 100, 50, 25);
			world.addTemperatureZone(200, 200, 50, -10);
			world.clearTemperatureZones();

			expect(world.temperatureZones.length).toBe(0);
		});
	});

	describe('cleanup', () => {
		it('should remove dead creatures', () => {
			world.initialize(10);
			world.creatures[0].isAlive = false;
			world.creatures[1].isAlive = false;

			world.cleanup();

			expect(world.creatures.length).toBe(8);
			for (const creature of world.creatures) {
				expect(creature.isAlive).toBe(true);
			}
		});

		it('should remove consumed food', () => {
			world.initialize(0);

			// Manually add food
			world.food = [
				{ position: { x: 100, y: 100 }, size: 5, energy: 30, isConsumed: false },
				{ position: { x: 200, y: 200 }, size: 5, energy: 30, isConsumed: true },
				{ position: { x: 300, y: 300 }, size: 5, energy: 30, isConsumed: false }
			] as any;

			world.cleanup();

			expect(world.food.length).toBe(2);
		});

		it('should increment totalDeaths', () => {
			world.initialize(10);
			world.creatures[0].isAlive = false;
			world.creatures[1].isAlive = false;

			const initialDeaths = world.totalDeaths;
			world.cleanup();

			expect(world.totalDeaths).toBe(initialDeaths + 2);
		});
	});

	describe('getStats', () => {
		it('should return population count', () => {
			world.initialize(50);
			const stats = world.getStats();

			expect(stats.population).toBe(50);
		});

		it('should return food count', () => {
			world.initialize(10);
			const stats = world.getStats();

			expect(stats.foodCount).toBe(CONFIG.INITIAL_FOOD_COUNT);
		});

		it('should calculate average traits', () => {
			world.initialize(100);
			const stats = world.getStats();

			expect(stats.avgTraits).toBeDefined();
			expect(stats.avgTraits.speed).toBeGreaterThanOrEqual(0);
			expect(stats.avgTraits.speed).toBeLessThanOrEqual(1);
		});

		it('should return diet distribution', () => {
			world.initialize(100);
			const stats = world.getStats();

			// Most should be herbivores (initialized as herbivores with slight variation)
			expect(stats.dietDistribution.herbivores).toBeGreaterThan(0);
			// Some might drift into omnivore range due to random variation
			// but carnivores should be extremely rare or 0
			expect(stats.dietDistribution.carnivores).toBeLessThanOrEqual(2);
		});
	});

	describe('spawnFood', () => {
		it('should spawn food over time', () => {
			world.initialize(0);
			const initialFood = world.food.length;

			// Simulate time passing
			world.spawnFood(10); // 10 seconds

			expect(world.food.length).toBeGreaterThan(initialFood);
		});

		it('should respect food limit when spawning', () => {
			world.initialize(0);
			// Spawn lots of food over many iterations
			for (let i = 0; i < 50; i++) {
				world.spawnFood(10);
			}

			// Should be capped at MAX_FOOD
			expect(world.food.length).toBeLessThanOrEqual(CONFIG.MAX_FOOD);
		});

		it('should scale with food abundance', () => {
			world.initialize(0);
			world.food = []; // Clear

			world.foodAbundance = 0.5;
			world.spawnFood(10);
			const lowAbundance = world.food.length;

			world.food = [];
			world.foodAbundance = 2;
			world.spawnFood(10);
			const highAbundance = world.food.length;

			expect(highAbundance).toBeGreaterThan(lowAbundance);
		});
	});

	describe('setRandomZonesEnabled', () => {
		it('should enable random zones', () => {
			world.setRandomZonesEnabled(true);
			expect(world.randomZonesEnabled).toBe(true);
		});

		it('should disable and remove random zones', () => {
			world.setRandomZonesEnabled(true);
			// Simulate spawning a random zone
			world.temperatureZones.push({
				x: 100, y: 100, radius: 50, temperature: 30,
				createdAt: 0, isRandom: true
			});
			world.temperatureZones.push({
				x: 200, y: 200, radius: 50, temperature: 20,
				createdAt: 0, isRandom: false // Manual zone
			});

			world.setRandomZonesEnabled(false);

			expect(world.randomZonesEnabled).toBe(false);
			expect(world.temperatureZones.length).toBe(1);
			expect(world.temperatureZones[0].isRandom).toBe(false);
		});
	});

	describe('getCreaturesNear', () => {
		beforeEach(() => {
			world.initialize(0);
		});

		it('should return creatures within radius', () => {
			const c1 = new Creature(100, 100);
			const c2 = new Creature(110, 110); // Close
			const c3 = new Creature(500, 500); // Far

			world.creatures = [c1, c2, c3];
			world.updateSpatialHashes();

			const nearby = world.getCreaturesNear(100, 100, 50);

			expect(nearby).toContain(c1);
			expect(nearby).toContain(c2);
			expect(nearby).not.toContain(c3);
		});

		it('should only return alive creatures', () => {
			const c1 = new Creature(100, 100);
			const c2 = new Creature(110, 110);
			c2.isAlive = false;

			world.creatures = [c1, c2];
			world.updateSpatialHashes();

			const nearby = world.getCreaturesNear(100, 100, 50);

			expect(nearby).toContain(c1);
			expect(nearby).not.toContain(c2);
		});
	});

	describe('getFoodNear', () => {
		beforeEach(() => {
			world.initialize(0);
		});

		it('should return food within radius', () => {
			world.food = [
				{ id: 1, position: { x: 110, y: 110 }, size: 5, energy: 30, isConsumed: false },
				{ id: 2, position: { x: 500, y: 500 }, size: 5, energy: 30, isConsumed: false }
			] as any;
			world.updateSpatialHashes();

			const nearby = world.getFoodNear(100, 100, 50);

			expect(nearby.length).toBe(1);
			expect(nearby[0].position.x).toBe(110);
		});

		it('should not return consumed food', () => {
			world.food = [
				{ id: 1, position: { x: 110, y: 110 }, size: 5, energy: 30, isConsumed: true }
			] as any;
			world.updateSpatialHashes();

			const nearby = world.getFoodNear(100, 100, 50);

			expect(nearby.length).toBe(0);
		});
	});
});
