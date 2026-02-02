import { CONFIG } from './config';
import { Creature, type Vector2 } from '../entities/creature';
import { Food, spawnRandomFood } from '../entities/food';
import { Corpse, createCorpse } from '../entities/corpse';
import {
	generateRandomTraits,
	generateHerbivoreTraits,
	generateCarnivoreTraits,
	generateOmnivoreTraits
} from '../entities/genetics';
import { speciesRegistry } from '../entities/species';
import { distance } from '../utils/math';

// Spatial hash grid for efficient collision detection
// Uses Map-based storage so it can handle dynamic world size changes
class SpatialHash<T extends { position: Vector2; id: number }> {
	private cellSize: number;
	private grid: Map<string, T[]> = new Map();

	constructor(cellSize: number) {
		this.cellSize = cellSize;
	}

	private getKey(x: number, y: number): string {
		const col = Math.floor(x / this.cellSize);
		const row = Math.floor(y / this.cellSize);
		return `${col},${row}`;
	}

	clear(): void {
		this.grid.clear();
	}

	insert(entity: T): void {
		const key = this.getKey(entity.position.x, entity.position.y);
		const cell = this.grid.get(key);
		if (cell) {
			cell.push(entity);
		} else {
			this.grid.set(key, [entity]);
		}
	}

	// Get entities in same cell and neighboring cells
	// No fixed bounds - works with dynamic world sizes
	getNearby(x: number, y: number, radius: number = 0): T[] {
		const nearby: T[] = [];
		const cellRadius = Math.ceil(radius / this.cellSize) + 1;

		const centerCol = Math.floor(x / this.cellSize);
		const centerRow = Math.floor(y / this.cellSize);

		for (let dc = -cellRadius; dc <= cellRadius; dc++) {
			for (let dr = -cellRadius; dr <= cellRadius; dr++) {
				const col = centerCol + dc;
				const row = centerRow + dr;
				// Skip negative cells (outside world bounds)
				if (col < 0 || row < 0) continue;

				const cell = this.grid.get(`${col},${row}`);
				if (cell) {
					nearby.push(...cell);
				}
			}
		}

		return nearby;
	}
}

// Temperature zone
export interface TemperatureZone {
	x: number;
	y: number;
	radius: number;
	temperature: number; // delta from global temperature
	createdAt: number; // simulation time when created
	isRandom: boolean; // whether this was randomly spawned (subject to decay)
}

// World state
export class World {
	creatures: Creature[] = [];
	food: Food[] = [];
	corpses: Corpse[] = [];

	// Spatial hashes for efficient queries
	private creatureHash: SpatialHash<Creature>;
	private foodHash: SpatialHash<Food>;
	private corpseHash: SpatialHash<Corpse>;

	// Environment settings
	globalTemperature: number = CONFIG.TEMPERATURE_DEFAULT;
	temperatureZones: TemperatureZone[] = [];
	foodAbundance: number = 1; // multiplier
	mutationRate: number = CONFIG.MUTATION_RATE;
	randomZonesEnabled: boolean = false; // whether random temperature zones spawn

	// Spawning
	private foodSpawnAccumulator: number = 0;
	private zoneSpawnAccumulator: number = 0;
	private migrationAccumulator: number = 0;

	// Simulation time
	simulationTime: number = 0;

	// Stats
	totalBirths: number = 0;
	totalDeaths: number = 0;
	generationMax: number = 0;

	constructor() {
		this.creatureHash = new SpatialHash(CONFIG.SPATIAL_CELL_SIZE);
		this.foodHash = new SpatialHash(CONFIG.SPATIAL_CELL_SIZE);
		this.corpseHash = new SpatialHash(CONFIG.SPATIAL_CELL_SIZE);
	}

	// Initialize world with starting population
	// All creatures start as similar herbivores - diet diversity emerges through evolution
	initialize(creatureCount: number = CONFIG.INITIAL_CREATURE_COUNT): void {
		this.creatures = [];
		this.food = [];
		this.corpses = [];
		this.totalBirths = 0;
		this.totalDeaths = 0;
		this.generationMax = 0;
		this.simulationTime = 0;

		// Reset species registry
		speciesRegistry.reset();

		// Spawn all creatures as small herbivores
		// Size diversity, diet diversity (carnivores/omnivores) all evolve naturally through:
		// 1. Stress-based mutation (hungry creatures get 5x diet mutation)
		// 2. Competition pressure (overcrowding pushes some toward hunting)
		// 3. Natural selection (different niches become viable)
		for (let i = 0; i < creatureCount; i++) {
			const x = CONFIG.CREATURE_BASE_SIZE + Math.random() * (CONFIG.WORLD_WIDTH - CONFIG.CREATURE_BASE_SIZE * 2);
			const y = CONFIG.CREATURE_BASE_SIZE + Math.random() * (CONFIG.WORLD_HEIGHT - CONFIG.CREATURE_BASE_SIZE * 2);

			// Generate herbivore base traits with some variation
			const traits = generateHerbivoreTraits();

			// Add slight random variation to all traits (founder effect)
			// This gives evolution something to work with
			for (const key of Object.keys(traits) as (keyof typeof traits)[]) {
				traits[key] = Math.max(0, Math.min(1, traits[key] + (Math.random() - 0.5) * 0.15));
			}
			// Ensure initial creatures remain herbivores (diet diversity evolves later)
			traits.dietPreference = Math.min(traits.dietPreference, 0.34);
			// Ensure initial creatures are small (size diversity evolves later)
			// Range: 0.05 to 0.25 (very small to small)
			traits.size = 0.05 + Math.random() * 0.2;

			const creature = new Creature(x, y, traits);

			// Assign species immediately
			const species = speciesRegistry.assignSpecies(
				creature.id,
				creature.traits,
				creature.generation,
				this.simulationTime
			);
			creature.speciesId = species.id;
			this.creatures.push(creature);
		}

		// Spawn initial food
		for (let i = 0; i < CONFIG.INITIAL_FOOD_COUNT; i++) {
			this.food.push(spawnRandomFood());
		}
	}

	// Update spatial hashes
	updateSpatialHashes(): void {
		this.creatureHash.clear();
		this.foodHash.clear();
		this.corpseHash.clear();

		for (const creature of this.creatures) {
			if (creature.isAlive) {
				this.creatureHash.insert(creature);
			}
		}

		for (const food of this.food) {
			if (!food.isConsumed) {
				this.foodHash.insert(food);
			}
		}

		for (const corpse of this.corpses) {
			if (!corpse.isConsumed) {
				this.corpseHash.insert(corpse);
			}
		}
	}

	// Get creatures near a point
	getCreaturesNear(x: number, y: number, radius: number): Creature[] {
		return this.creatureHash.getNearby(x, y, radius).filter((c) => c.isAlive);
	}

	// Get corpses near a point
	getCorpsesNear(x: number, y: number, radius: number): Corpse[] {
		return this.corpseHash.getNearby(x, y, radius).filter((c) => !c.isConsumed);
	}

	// Get food near a point
	getFoodNear(x: number, y: number, radius: number): Food[] {
		return this.foodHash.getNearby(x, y, radius).filter((f) => !f.isConsumed);
	}

	// Get temperature at a point
	getTemperatureAt(x: number, y: number): number {
		let temp = this.globalTemperature;

		for (const zone of this.temperatureZones) {
			const dist = distance(x, y, zone.x, zone.y);

			if (dist < zone.radius) {
				// Linear falloff
				const influence = 1 - dist / zone.radius;
				temp += zone.temperature * influence;
			}
		}

		return temp;
	}

	// Check temperature damage for a creature
	getTemperatureDamage(creature: Creature): number {
		const temp = this.getTemperatureAt(creature.position.x, creature.position.y);

		// Hot damage
		if (temp > 30) {
			const excess = temp - 30;
			const tolerance = creature.traits.heatTolerance;
			const damage = Math.max(0, excess * (1 - tolerance) * 0.5);
			return damage;
		}

		// Cold damage
		if (temp < 10) {
			const deficit = 10 - temp;
			const tolerance = creature.traits.coldTolerance;
			const damage = Math.max(0, deficit * (1 - tolerance) * 0.5);
			return damage;
		}

		return 0;
	}

	// Spawn food based on abundance setting
	spawnFood(deltaTime: number): void {
		this.foodSpawnAccumulator += deltaTime * CONFIG.FOOD_SPAWN_RATE * this.foodAbundance;

		while (this.foodSpawnAccumulator >= 1 && this.food.length < CONFIG.MAX_FOOD) {
			this.foodSpawnAccumulator -= 1;

			// 30% chance for cluster spawn
			if (Math.random() < 0.3) {
				const centerX = Math.random() * CONFIG.WORLD_WIDTH;
				const centerY = Math.random() * CONFIG.WORLD_HEIGHT;
				const clusterSize = 2 + Math.floor(Math.random() * 4);
				for (let i = 0; i < clusterSize && this.food.length < CONFIG.MAX_FOOD; i++) {
					const angle = Math.random() * Math.PI * 2;
					const dist = Math.random() * 30;
					const x = Math.max(5, Math.min(CONFIG.WORLD_WIDTH - 5, centerX + Math.cos(angle) * dist));
					const y = Math.max(5, Math.min(CONFIG.WORLD_HEIGHT - 5, centerY + Math.sin(angle) * dist));
					this.food.push(new Food(x, y));
				}
			} else {
				this.food.push(spawnRandomFood());
			}
		}
	}

	// Add a creature (from reproduction)
	addCreature(creature: Creature): void {
		if (this.creatures.length < CONFIG.MAX_CREATURES) {
			// Assign species to the new creature
			const species = speciesRegistry.assignSpecies(
				creature.id,
				creature.traits,
				creature.generation,
				this.simulationTime
			);
			creature.speciesId = species.id;

			this.creatures.push(creature);
			this.totalBirths++;
			if (creature.generation > this.generationMax) {
				this.generationMax = creature.generation;
			}
		}
	}

	// Update simulation time
	updateTime(deltaTime: number): void {
		this.simulationTime += deltaTime;
	}

	// Remove dead creatures and consumed food
	// Creates corpses from dead creatures for scavenging
	cleanup(): void {
		// Create corpses from dead creatures (only if they had energy left)
		for (const creature of this.creatures) {
			if (!creature.isAlive && creature.energy > 5) {
				// Don't create corpses if already at max to prevent memory issues
				if (this.corpses.length < 500) {
					const corpse = createCorpse(
						creature.position.x,
						creature.position.y,
						creature.energy,
						creature.size,
						this.simulationTime
					);
					this.corpses.push(corpse);
				}
			}
		}

		const deadCreatures = this.creatures.filter((c) => !c.isAlive).length;
		this.totalDeaths += deadCreatures;

		this.creatures = this.creatures.filter((c) => c.isAlive);
		this.food = this.food.filter((f) => !f.isConsumed);

		// Remove consumed or decayed corpses
		this.corpses = this.corpses.filter(
			(c) => !c.isConsumed && !c.isDecayed(this.simulationTime)
		);
	}

	// Add temperature zone (manual, doesn't decay)
	addTemperatureZone(x: number, y: number, radius: number, temperature: number): void {
		this.temperatureZones.push({
			x,
			y,
			radius,
			temperature,
			createdAt: this.simulationTime,
			isRandom: false
		});
	}

	// Spawn random temperature zones
	spawnRandomZones(deltaTime: number): void {
		if (!this.randomZonesEnabled) return;

		this.zoneSpawnAccumulator += deltaTime * CONFIG.TEMP_ZONE_SPAWN_RATE;

		// Count current random zones
		const randomZoneCount = this.temperatureZones.filter((z) => z.isRandom).length;

		while (this.zoneSpawnAccumulator >= 1 && randomZoneCount < CONFIG.TEMP_ZONE_MAX) {
			this.zoneSpawnAccumulator -= 1;

			// Random position
			const x = CONFIG.TEMP_ZONE_MIN_RADIUS + Math.random() * (CONFIG.WORLD_WIDTH - CONFIG.TEMP_ZONE_MIN_RADIUS * 2);
			const y = CONFIG.TEMP_ZONE_MIN_RADIUS + Math.random() * (CONFIG.WORLD_HEIGHT - CONFIG.TEMP_ZONE_MIN_RADIUS * 2);

			// Random radius
			const radius = CONFIG.TEMP_ZONE_MIN_RADIUS +
				Math.random() * (CONFIG.TEMP_ZONE_MAX_RADIUS - CONFIG.TEMP_ZONE_MIN_RADIUS);

			// Random temperature (50% hot, 50% cold)
			const isHot = Math.random() > 0.5;
			const intensity = 15 + Math.random() * 20; // 15-35 degrees delta
			const temperature = isHot ? intensity : -intensity;

			this.temperatureZones.push({
				x,
				y,
				radius,
				temperature,
				createdAt: this.simulationTime,
				isRandom: true
			});
		}
	}

	// Decay old random zones
	decayTemperatureZones(): void {
		this.temperatureZones = this.temperatureZones.filter((zone) => {
			// Keep non-random (manual) zones forever
			if (!zone.isRandom) return true;

			// Remove expired random zones
			const age = this.simulationTime - zone.createdAt;
			return age < CONFIG.TEMP_ZONE_LIFETIME;
		});
	}

	// Clear temperature zones (only manual ones, or all)
	clearTemperatureZones(includeRandom: boolean = true): void {
		if (includeRandom) {
			this.temperatureZones = [];
		} else {
			this.temperatureZones = this.temperatureZones.filter((z) => z.isRandom);
		}
	}

	// Set random zones enabled
	setRandomZonesEnabled(enabled: boolean): void {
		this.randomZonesEnabled = enabled;
		if (!enabled) {
			// Remove existing random zones when disabled
			this.temperatureZones = this.temperatureZones.filter((z) => !z.isRandom);
		}
	}

	// Spawn migrants from other biomes
	// This simulates species arriving from outside the simulated area
	spawnMigrants(deltaTime: number): void {
		// Skip all migration if disabled - test if ecosystem can sustain itself
		if (!CONFIG.MIGRATION_ENABLED) return;

		const alive = this.creatures.filter((c) => c.isAlive);
		const foodRatio = this.food.filter((f) => !f.isConsumed).length / CONFIG.MAX_FOOD;
		const popRatio = alive.length / CONFIG.MAX_CREATURES;

		// Check for near-extinction rescue migration first
		// This prevents total die-off of diet types
		const herbivores = alive.filter((c) => c.isHerbivore).length;
		const carnivores = alive.filter((c) => c.isCarnivore).length;
		const omnivores = alive.filter((c) => c.isOmnivore).length;

		// Rescue migration: only rescue herbivores when critically low
		// Carnivores and omnivores must emerge through evolution - no artificial spawning
		// This ensures diet diversity is truly emergent, not artificially maintained
		const minHerbivores = Math.max(5, Math.floor(alive.length * 0.1)); // At least 10% or 5

		// Only rescue herbivores - they're the foundation of the ecosystem
		// If they die out, the whole simulation collapses
		if (herbivores < minHerbivores && foodRatio > 0.3 && popRatio < 0.8) {
			this.spawnRescueMigrants('herbivore');
		}

		// Regular migration when conditions are favorable
		if (foodRatio < CONFIG.MIGRATION_FOOD_THRESHOLD) return;
		if (popRatio > CONFIG.MIGRATION_POP_THRESHOLD) return;

		// Migration rate scales with food abundance
		const migrationRate = CONFIG.MIGRATION_BASE_RATE * this.foodAbundance;
		this.migrationAccumulator += deltaTime * migrationRate;

		while (this.migrationAccumulator >= 1 && this.creatures.length < CONFIG.MAX_CREATURES) {
			this.migrationAccumulator -= 1;

			// Spawn a small group of migrants (1-4)
			const groupSize = CONFIG.MIGRATION_GROUP_SIZE_MIN +
				Math.floor(Math.random() * (CONFIG.MIGRATION_GROUP_SIZE_MAX - CONFIG.MIGRATION_GROUP_SIZE_MIN + 1));

			// Choose spawn edge (migrants come from outside)
			const edge = Math.floor(Math.random() * 4); // 0=top, 1=right, 2=bottom, 3=left
			let baseX: number, baseY: number;

			switch (edge) {
				case 0: // top
					baseX = Math.random() * CONFIG.WORLD_WIDTH;
					baseY = CONFIG.CREATURE_MAX_SIZE;
					break;
				case 1: // right
					baseX = CONFIG.WORLD_WIDTH - CONFIG.CREATURE_MAX_SIZE;
					baseY = Math.random() * CONFIG.WORLD_HEIGHT;
					break;
				case 2: // bottom
					baseX = Math.random() * CONFIG.WORLD_WIDTH;
					baseY = CONFIG.WORLD_HEIGHT - CONFIG.CREATURE_MAX_SIZE;
					break;
				default: // left
					baseX = CONFIG.CREATURE_MAX_SIZE;
					baseY = Math.random() * CONFIG.WORLD_HEIGHT;
					break;
			}

			// Generate herbivore-like traits for this migrant group
			// Migrants come from similar biomes and are herbivores - carnivores/omnivores evolve locally
			// This ensures diet diversity emerges from evolution, not immigration
			const migrantTraits = generateHerbivoreTraits();

			for (let i = 0; i < groupSize && this.creatures.length < CONFIG.MAX_CREATURES; i++) {
				// Slight position offset for each member
				const offsetX = (Math.random() - 0.5) * 30;
				const offsetY = (Math.random() - 0.5) * 30;
				const x = Math.max(CONFIG.CREATURE_MAX_SIZE, Math.min(CONFIG.WORLD_WIDTH - CONFIG.CREATURE_MAX_SIZE, baseX + offsetX));
				const y = Math.max(CONFIG.CREATURE_MAX_SIZE, Math.min(CONFIG.WORLD_HEIGHT - CONFIG.CREATURE_MAX_SIZE, baseY + offsetY));

				// Slight trait variation within the group
				const individualTraits = { ...migrantTraits };
				for (const key of Object.keys(individualTraits) as (keyof typeof individualTraits)[]) {
					individualTraits[key] = Math.max(0, Math.min(1, individualTraits[key] + (Math.random() - 0.5) * 0.1));
				}

				const creature = new Creature(x, y, individualTraits);

				// Assign species (will likely create a new species)
				const species = speciesRegistry.assignSpecies(
					creature.id,
					creature.traits,
					creature.generation,
					this.simulationTime
				);
				creature.speciesId = species.id;

				this.creatures.push(creature);
				this.totalBirths++;
			}
		}
	}

	// Spawn targeted rescue migrants when a diet type is near extinction
	private spawnRescueMigrants(dietType: 'herbivore' | 'carnivore' | 'omnivore'): void {
		// Spawn 2-4 migrants of the specified type
		const groupSize = 2 + Math.floor(Math.random() * 3);

		// Choose random edge
		const edge = Math.floor(Math.random() * 4);
		let baseX: number, baseY: number;

		switch (edge) {
			case 0:
				baseX = Math.random() * CONFIG.WORLD_WIDTH;
				baseY = CONFIG.CREATURE_MAX_SIZE;
				break;
			case 1:
				baseX = CONFIG.WORLD_WIDTH - CONFIG.CREATURE_MAX_SIZE;
				baseY = Math.random() * CONFIG.WORLD_HEIGHT;
				break;
			case 2:
				baseX = Math.random() * CONFIG.WORLD_WIDTH;
				baseY = CONFIG.WORLD_HEIGHT - CONFIG.CREATURE_MAX_SIZE;
				break;
			default:
				baseX = CONFIG.CREATURE_MAX_SIZE;
				baseY = Math.random() * CONFIG.WORLD_HEIGHT;
				break;
		}

		// Generate traits for the specific diet type
		let traitGenerator: () => ReturnType<typeof generateRandomTraits>;
		switch (dietType) {
			case 'herbivore':
				traitGenerator = generateHerbivoreTraits;
				break;
			case 'carnivore':
				traitGenerator = generateCarnivoreTraits;
				break;
			case 'omnivore':
				traitGenerator = generateOmnivoreTraits;
				break;
		}

		for (let i = 0; i < groupSize && this.creatures.length < CONFIG.MAX_CREATURES; i++) {
			const offsetX = (Math.random() - 0.5) * 30;
			const offsetY = (Math.random() - 0.5) * 30;
			const x = Math.max(CONFIG.CREATURE_MAX_SIZE, Math.min(CONFIG.WORLD_WIDTH - CONFIG.CREATURE_MAX_SIZE, baseX + offsetX));
			const y = Math.max(CONFIG.CREATURE_MAX_SIZE, Math.min(CONFIG.WORLD_HEIGHT - CONFIG.CREATURE_MAX_SIZE, baseY + offsetY));

			const creature = new Creature(x, y, traitGenerator());

			const species = speciesRegistry.assignSpecies(
				creature.id,
				creature.traits,
				creature.generation,
				this.simulationTime
			);
			creature.speciesId = species.id;

			this.creatures.push(creature);
			this.totalBirths++;
		}
	}

	// Handle emigration - struggling creatures near edges may leave
	processEmigration(deltaTime: number): void {
		for (const creature of this.creatures) {
			if (!creature.isAlive) continue;

			// Check if near an edge
			const nearLeft = creature.position.x < CONFIG.EMIGRATION_EDGE_DISTANCE;
			const nearRight = creature.position.x > CONFIG.WORLD_WIDTH - CONFIG.EMIGRATION_EDGE_DISTANCE;
			const nearTop = creature.position.y < CONFIG.EMIGRATION_EDGE_DISTANCE;
			const nearBottom = creature.position.y > CONFIG.WORLD_HEIGHT - CONFIG.EMIGRATION_EDGE_DISTANCE;

			if (!nearLeft && !nearRight && !nearTop && !nearBottom) continue;

			// Only struggling creatures consider leaving
			const isLowEnergy = creature.energyPercent < CONFIG.EMIGRATION_ENERGY_THRESHOLD;
			const isFleeing = creature.state === 'fleeing';
			const isStarving = creature.energyPercent < 0.2;

			// Check local crowding
			const nearby = this.getCreaturesNear(
				creature.position.x,
				creature.position.y,
				creature.visionRange
			);
			const isCrowded = nearby.length > CONFIG.EMIGRATION_CROWDING_THRESHOLD;

			// Carnivores/omnivores: don't emigrate if prey is available nearby
			// They should hunt, not leave when food exists
			if (creature.isCarnivore || creature.isOmnivore) {
				const hasNearbyPrey = nearby.some(
					(other) =>
						other.isAlive &&
						other.id !== creature.id &&
						!other.isCarnivore &&
						creature.canHunt(other)
				);
				if (hasNearbyPrey) continue; // Stay and hunt instead of emigrating
			}

			// Calculate emigration chance based on how bad things are
			let emigrationChance = 0;

			if (isStarving) {
				// Starving creatures very likely to leave if at edge
				emigrationChance = CONFIG.EMIGRATION_BASE_CHANCE * 5;
			} else if (isFleeing) {
				// Fleeing creatures might escape off the map
				emigrationChance = CONFIG.EMIGRATION_BASE_CHANCE * 3;
			} else if (isLowEnergy && isCrowded) {
				// Low energy + crowded = looking for better opportunities
				emigrationChance = CONFIG.EMIGRATION_BASE_CHANCE * 2;
			} else if (isLowEnergy) {
				// Just low energy - small chance
				emigrationChance = CONFIG.EMIGRATION_BASE_CHANCE;
			}

			// Apply per-frame chance
			if (emigrationChance > 0 && Math.random() < emigrationChance * deltaTime) {
				// Creature emigrates - leaves the simulation
				creature.die();
				// Don't count as death (they left, didn't die)
				// We already incremented totalDeaths in die(), so decrement
				this.totalDeaths = Math.max(0, this.totalDeaths - 1);
			}
		}
	}

	// Get population stats
	getStats() {
		const alive = this.creatures.filter((c) => c.isAlive);

		// Average traits
		const avgTraits = {
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

		if (alive.length > 0) {
			for (const creature of alive) {
				for (const key of Object.keys(avgTraits) as (keyof typeof avgTraits)[]) {
					avgTraits[key] += creature.traits[key];
				}
			}
			for (const key of Object.keys(avgTraits) as (keyof typeof avgTraits)[]) {
				avgTraits[key] /= alive.length;
			}
		}

		// Diet distribution
		const herbivores = alive.filter((c) => c.isHerbivore).length;
		const carnivores = alive.filter((c) => c.isCarnivore).length;
		const omnivores = alive.filter((c) => c.isOmnivore).length;

		// Species stats
		const speciesStats = speciesRegistry.getStats();

		return {
			population: alive.length,
			foodCount: this.food.filter((f) => !f.isConsumed).length,
			totalBirths: this.totalBirths,
			totalDeaths: this.totalDeaths,
			maxGeneration: this.generationMax,
			avgTraits,
			dietDistribution: { herbivores, carnivores, omnivores },
			species: speciesStats
		};
	}
}
