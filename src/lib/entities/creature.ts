import { CONFIG } from '../simulation/config';
import {
	type Traits,
	generateRandomTraits,
	mutateTraits,
	mutateTraitsWithStress,
	crossoverTraits,
	getTraitColor,
	getCreatureSize,
	getCreatureSpeed,
	getVisionRange,
	getEnergyDrain,
	getMaxLifespan,
	prefersAsexual,
	getReproductionThreshold,
	getAttackDamage,
	getMaxOffspringCount
} from './genetics';
import { speciesRegistry } from './species';
import { magnitude, distance, clampVelocity } from '../utils/math';

export interface Vector2 {
	x: number;
	y: number;
}

let nextCreatureId = 0;

export class Creature {
	readonly id: number;
	position: Vector2;
	velocity: Vector2;
	traits: Traits;
	energy: number;
	age: number; // in seconds
	generation: number;
	lastReproduction: number; // timestamp

	// Cached computed values (updated when traits change)
	private _color: string;
	private _size: number;
	private _speed: number;
	private _visionRange: number;
	private _energyDrain: number;
	private _maxLifespan: number;
	private _attackDamage: number;

	// State
	isAlive: boolean = true;
	target: Vector2 | null = null;
	state: 'wandering' | 'seeking_food' | 'seeking_mate' | 'hunting' | 'fleeing' = 'wandering';

	// Hunger stress: accumulates when energy is low, used for stress-based mutation
	// 0 = never hungry, 1 = constantly starving
	hungerStress: number = 0;

	// Species (assigned by world when creature is added)
	speciesId: number | null = null;

	constructor(
		x: number,
		y: number,
		traits?: Traits,
		generation: number = 0
	) {
		this.id = nextCreatureId++;
		this.position = { x, y };
		this.velocity = { x: 0, y: 0 };
		this.traits = traits ?? generateRandomTraits();
		this.energy = CONFIG.CREATURE_BASE_ENERGY;
		this.age = 0;
		this.generation = generation;
		this.lastReproduction = 0;

		// Cache computed values
		this._color = getTraitColor(this.traits);
		this._size = getCreatureSize(this.traits);
		this._speed = getCreatureSpeed(this.traits);
		this._visionRange = getVisionRange(this.traits);
		this._energyDrain = getEnergyDrain(this.traits);
		this._maxLifespan = getMaxLifespan(this.traits);
		this._attackDamage = getAttackDamage(this.traits);

		// Random initial direction
		const angle = Math.random() * Math.PI * 2;
		this.velocity = {
			x: Math.cos(angle) * this._speed * 0.5,
			y: Math.sin(angle) * this._speed * 0.5
		};
	}

	// Getters for cached values
	get color(): string {
		return this._color;
	}
	get size(): number {
		return this._size;
	}
	get speed(): number {
		return this._speed;
	}
	get visionRange(): number {
		return this._visionRange;
	}
	get energyDrain(): number {
		return this._energyDrain;
	}
	get maxLifespan(): number {
		return this._maxLifespan;
	}
	get attackDamage(): number {
		return this._attackDamage;
	}

	get maxEnergy(): number {
		return CONFIG.CREATURE_MAX_ENERGY * (0.7 + this.traits.size * 0.6);
	}

	get energyPercent(): number {
		return this.energy / this.maxEnergy;
	}

	get isHerbivore(): boolean {
		return this.traits.dietPreference < 0.35;
	}

	get isCarnivore(): boolean {
		return this.traits.dietPreference > 0.65;
	}

	get isOmnivore(): boolean {
		return !this.isHerbivore && !this.isCarnivore;
	}

	// Update creature state
	update(deltaTime: number, currentTime: number): void {
		if (!this.isAlive) return;

		// Age
		this.age += deltaTime;

		// Energy drain - diet type affects metabolism efficiency
		// Herbivores: specialized digestive system, most efficient at rest
		// Carnivores: efficient at rest, burst metabolism for hunting
		// Omnivores: generalist system, jack of all trades = slightly inefficient
		let metabolismEfficiency: number;
		if (this.isHerbivore) {
			metabolismEfficiency = 0.8; // Best at rest (specialized grazer)
		} else if (this.isCarnivore) {
			metabolismEfficiency = 0.85; // Good at rest (feast-and-famine adapted)
		} else {
			metabolismEfficiency = 1.0; // Omnivore: average/baseline (generalist penalty)
		}
		this.energy -= this._energyDrain * deltaTime * metabolismEfficiency;

		// Movement energy cost - specialized diets are more efficient at their niche
		const speedRatio = magnitude(this.velocity) / this._speed;
		let movementCost: number;
		if (this.isCarnivore) {
			movementCost = 0.3; // Efficient pursuit (evolved for hunting)
		} else if (this.isHerbivore) {
			movementCost = 0.35; // Efficient grazing movement
		} else {
			movementCost = 0.4; // Omnivore: average (not specialized)
		}
		this.energy -= speedRatio * deltaTime * movementCost;

		// Active hunting is energy-intensive (sprinting, chasing)
		// Failed hunts are costly - this balances carnivore success rate
		if (this.state === 'hunting' && (this.isCarnivore || this.isOmnivore)) {
			const huntingCost = this.isCarnivore ? 0.8 : 0.5; // Carnivores sprint harder
			this.energy -= deltaTime * huntingCost;
		}

		// Track hunger stress for stress-based mutation
		// Accumulates when energy is below 50%, decays when well-fed
		if (this.energyPercent < 0.5) {
			// Hungry: increase stress (faster increase when very hungry)
			const stressIncrease = (0.5 - this.energyPercent) * 2 * deltaTime * 0.1;
			this.hungerStress = Math.min(1, this.hungerStress + stressIncrease);
		} else if (this.energyPercent > 0.7) {
			// Well-fed: slowly decrease stress
			this.hungerStress = Math.max(0, this.hungerStress - deltaTime * 0.02);
		}

		// Check death conditions
		if (this.energy <= 0 || this.age >= this._maxLifespan) {
			this.die();
			return;
		}

		// Update position
		this.position.x += this.velocity.x * deltaTime;
		this.position.y += this.velocity.y * deltaTime;

		// Bounce off walls
		if (this.position.x < this._size) {
			this.position.x = this._size;
			this.velocity.x *= -1;
		} else if (this.position.x > CONFIG.WORLD_WIDTH - this._size) {
			this.position.x = CONFIG.WORLD_WIDTH - this._size;
			this.velocity.x *= -1;
		}

		if (this.position.y < this._size) {
			this.position.y = this._size;
			this.velocity.y *= -1;
		} else if (this.position.y > CONFIG.WORLD_HEIGHT - this._size) {
			this.position.y = CONFIG.WORLD_HEIGHT - this._size;
			this.velocity.y *= -1;
		}
	}

	// Move towards a target
	seekTarget(target: Vector2, deltaTime: number): void {
		const dx = target.x - this.position.x;
		const dy = target.y - this.position.y;
		const dist = distance(this.position.x, this.position.y, target.x, target.y);

		if (dist > 1) {
			const dirX = dx / dist;
			const dirY = dy / dist;

			// Accelerate towards target
			const acceleration = this._speed * 2;
			this.velocity.x += dirX * acceleration * deltaTime;
			this.velocity.y += dirY * acceleration * deltaTime;

			// Clamp to max speed
			const clamped = clampVelocity(this.velocity, this._speed);
			this.velocity.x = clamped.x;
			this.velocity.y = clamped.y;
		}
	}

	// Hunt target with speed boost (for carnivores)
	huntTarget(target: Vector2, deltaTime: number): void {
		const dx = target.x - this.position.x;
		const dy = target.y - this.position.y;
		const dist = distance(this.position.x, this.position.y, target.x, target.y);

		if (dist > 1) {
			const dirX = dx / dist;
			const dirY = dy / dist;

			// Faster acceleration when hunting
			const acceleration = this._speed * 3;
			this.velocity.x += dirX * acceleration * deltaTime;
			this.velocity.y += dirY * acceleration * deltaTime;

			// Hunting speed boost: base 1.3x + up to 0.4x from stamina
			// This lets skilled hunters catch fleeing prey (which gets 1.2x boost)
			const huntSpeedMultiplier = 1.3 + this.traits.stamina * 0.4;
			const huntSpeed = this._speed * huntSpeedMultiplier;
			const clamped = clampVelocity(this.velocity, huntSpeed);
			this.velocity.x = clamped.x;
			this.velocity.y = clamped.y;
		}
	}

	// Wander randomly
	wander(deltaTime: number): void {
		// Random direction changes
		if (Math.random() < 0.02) {
			const angle = Math.random() * Math.PI * 2;
			const wanderSpeed = this._speed * 0.4;
			this.velocity.x += Math.cos(angle) * wanderSpeed * 0.3;
			this.velocity.y += Math.sin(angle) * wanderSpeed * 0.3;
		}

		// Clamp speed for wandering (slower than seeking)
		const maxWanderSpeed = this._speed * 0.5;
		const clamped = clampVelocity(this.velocity, maxWanderSpeed);
		this.velocity.x = clamped.x;
		this.velocity.y = clamped.y;

		// Slow down slightly
		this.velocity.x *= 0.99;
		this.velocity.y *= 0.99;
	}

	// Flee from a threat
	fleeFrom(threat: Vector2, deltaTime: number): void {
		const dx = this.position.x - threat.x;
		const dy = this.position.y - threat.y;
		const dist = distance(threat.x, threat.y, this.position.x, this.position.y);

		if (dist > 0) {
			const dirX = dx / dist;
			const dirY = dy / dist;

			// Accelerate away from threat (faster than normal seek)
			const acceleration = this._speed * 3;
			this.velocity.x += dirX * acceleration * deltaTime;
			this.velocity.y += dirY * acceleration * deltaTime;

			// Allow slightly faster than normal when fleeing
			const fleeSpeed = this._speed * 1.2;
			const clamped = clampVelocity(this.velocity, fleeSpeed);
			this.velocity.x = clamped.x;
			this.velocity.y = clamped.y;
		}
	}

	// Consume food
	eat(foodEnergy: number): void {
		this.energy = Math.min(this.maxEnergy, this.energy + foodEnergy);
	}

	// Take damage
	takeDamage(amount: number): void {
		this.energy -= amount;
		if (this.energy <= 0) {
			this.die();
		}
	}

	// Get the reproduction cooldown for this creature
	private getReproductionCooldown(): number {
		// Diet-based cooldown multiplier (configurable)
		let cooldownMultiplier: number = CONFIG.HERBIVORE_REPRO_COOLDOWN_MULT;
		if (this.isCarnivore) {
			cooldownMultiplier = CONFIG.CARNIVORE_REPRO_COOLDOWN_MULT;
		} else if (this.isOmnivore) {
			cooldownMultiplier = CONFIG.OMNIVORE_REPRO_COOLDOWN_MULT;
		}

		// Size affects reproduction speed (r/K selection)
		const sizeModifier = 0.5 + this.traits.size;

		// Herbivore size affects reproduction (configurable r/K selection)
		const herbivoreReproModifier = this.isHerbivore
			? this.traits.size < 0.3
				? CONFIG.HERBIVORE_TINY_REPRO_MULT
				: this.traits.size < 0.5
					? CONFIG.HERBIVORE_SMALL_REPRO_MULT
					: CONFIG.HERBIVORE_LARGE_REPRO_MULT
			: 1.0;

		return CONFIG.REPRODUCTION_COOLDOWN * cooldownMultiplier * sizeModifier * herbivoreReproModifier;
	}

	// Check if can reproduce (basic check without density)
	canReproduce(currentTime: number): boolean {
		if (!this.isAlive) return false;
		const threshold = getReproductionThreshold(this.traits);
		const cooldown = this.getReproductionCooldown();
		const cooldownPassed = currentTime - this.lastReproduction > cooldown;
		return this.energyPercent >= threshold && cooldownPassed;
	}

	// Get reproduction readiness (0-1, where 1 = ready to reproduce)
	// Used for proactive mate-seeking behavior
	getReproductionReadiness(currentTime: number): number {
		if (!this.isAlive) return 0;

		// Check cooldown progress (0-1)
		const cooldown = this.getReproductionCooldown();
		const timeSinceLastRepro = currentTime - this.lastReproduction;
		const cooldownProgress = Math.min(1, timeSinceLastRepro / cooldown);

		// Check energy progress towards threshold
		const threshold = getReproductionThreshold(this.traits);
		const energyProgress = Math.min(1, this.energyPercent / threshold);

		// Return minimum of both (need both to be ready)
		return Math.min(cooldownProgress, energyProgress);
	}

	// Check if should actively seek a mate (nearly ready to reproduce)
	shouldSeekMate(currentTime: number): boolean {
		if (!this.isAlive) return false;
		if (this.prefersAsexual()) return false;

		const readiness = this.getReproductionReadiness(currentTime);
		// Start seeking mate when 70% ready
		return readiness >= 0.7;
	}

	// Check if can reproduce considering local population density
	// Returns probability of reproduction (0-1) based on crowding
	getReproductionChance(nearbyCount: number): number {
		// Base chance is 1.0 (will reproduce)
		// Reduce chance based on local crowding
		// Omnivores are less affected by crowding (adaptable)
		const crowdingThreshold = this.isOmnivore ? 8 : 5;
		const crowdingPenalty = this.isOmnivore ? 0.1 : 0.15;

		if (nearbyCount <= crowdingThreshold) {
			return 1.0; // No crowding penalty
		}

		// Reduce reproduction chance with more neighbors
		const excessNeighbors = nearbyCount - crowdingThreshold;
		const chance = Math.max(0.1, 1.0 - excessNeighbors * crowdingPenalty);
		return chance;
	}

	// Reproduce asexually
	reproduceAsexual(currentTime: number, mutationRate?: number): Creature | null {
		if (!this.canReproduce(currentTime)) return null;

		// Pay energy cost
		const cost = this.energy * CONFIG.REPRODUCTION_ENERGY_COST;
		this.energy -= cost;
		this.lastReproduction = currentTime;

		// Create offspring with mutated traits
		// Use stress-based mutation if parent has accumulated hunger stress
		const offspringTraits = this.hungerStress > 0.1
			? mutateTraitsWithStress(this.traits, this.hungerStress, mutationRate)
			: mutateTraits(this.traits, mutationRate);

		// Reset parent's hunger stress after reproduction (stress was "passed on")
		this.hungerStress *= 0.5;

		const offset = this._size * 2;
		const angle = Math.random() * Math.PI * 2;

		const offspring = new Creature(
			this.position.x + Math.cos(angle) * offset,
			this.position.y + Math.sin(angle) * offset,
			offspringTraits,
			this.generation + 1
		);
		// Newborns must mature before reproducing (can't reproduce immediately)
		offspring.lastReproduction = currentTime;
		return offspring;
	}

	// Reproduce sexually with another creature
	// Returns array of offspring (smaller creatures produce more offspring)
	reproduceSexual(
		partner: Creature,
		currentTime: number,
		mutationRate?: number
	): Creature[] {
		if (!this.canReproduce(currentTime) || !partner.canReproduce(currentTime)) {
			return [];
		}

		// Determine offspring count based on average size of parents
		// Smaller parents = more offspring (r-strategy), larger = fewer (K-strategy)
		// Herbivores get bonus offspring (configurable r-strategy)
		// Carnivores also get bonus to compensate for sparse population / no asexual reproduction
		const avgSize = (this.traits.size + partner.traits.size) / 2;
		const baseMaxOffspring = getMaxOffspringCount({ ...this.traits, size: avgSize });
		const herbivoreBonus =
			this.isHerbivore && partner.isHerbivore ? CONFIG.HERBIVORE_OFFSPRING_BONUS : 0;
		const carnivoreBonus =
			this.isCarnivore && partner.isCarnivore ? CONFIG.CARNIVORE_OFFSPRING_BONUS : 0;
		const maxOffspring = baseMaxOffspring + herbivoreBonus + carnivoreBonus;
		const offspringCount = Math.floor(Math.random() * maxOffspring) + 1;

		// Both pay energy cost (scaled by number of offspring)
		const baseCost = CONFIG.REPRODUCTION_ENERGY_COST * 0.6;
		const costMultiplier = 1 + (offspringCount - 1) * 0.3; // More offspring = slightly higher cost
		const cost1 = this.energy * baseCost * costMultiplier;
		const cost2 = partner.energy * baseCost * costMultiplier;
		this.energy -= cost1;
		partner.energy -= cost2;
		this.lastReproduction = currentTime;
		partner.lastReproduction = currentTime;

		// Combine both parents' hunger stress for stress-based mutation
		const combinedStress = Math.max(this.hungerStress, partner.hungerStress);

		// Reset both parents' hunger stress
		this.hungerStress *= 0.5;
		partner.hungerStress *= 0.5;

		const midX = (this.position.x + partner.position.x) / 2;
		const midY = (this.position.y + partner.position.y) / 2;
		const nextGeneration = Math.max(this.generation, partner.generation) + 1;

		// Create offspring
		const offspring: Creature[] = [];
		for (let i = 0; i < offspringCount; i++) {
			let offspringTraits;
			if (combinedStress > 0.1) {
				// First crossover, then apply stress-based mutation
				const crossedTraits = crossoverTraits(this.traits, partner.traits, 0);
				offspringTraits = mutateTraitsWithStress(crossedTraits, combinedStress, mutationRate);
			} else {
				offspringTraits = crossoverTraits(this.traits, partner.traits, mutationRate);
			}

			// Spawn offspring in a small radius around the midpoint
			const angle = (Math.PI * 2 * i) / offspringCount + Math.random() * 0.5;
			const offset = this._size * 2;

			const child = new Creature(
				midX + Math.cos(angle) * offset,
				midY + Math.sin(angle) * offset,
				offspringTraits,
				nextGeneration
			);
			// Newborns must mature before reproducing (can't reproduce immediately)
			child.lastReproduction = currentTime;
			offspring.push(child);
		}

		return offspring;
	}

	// Check if this creature prefers asexual reproduction
	prefersAsexual(): boolean {
		return prefersAsexual(this.traits);
	}

	// Check compatibility for mating - must be same species for sexual reproduction
	isCompatibleMate(other: Creature): boolean {
		if (other.id === this.id) return false;
		if (!other.isAlive) return false;

		// Must be the same species for sexual reproduction
		if (this.speciesId !== null && other.speciesId !== null) {
			return speciesRegistry.areSameSpecies(this.id, other.id);
		}

		// Fallback for creatures without assigned species (shouldn't happen normally)
		// Similar diet preferences mate
		const dietDiff = Math.abs(this.traits.dietPreference - other.traits.dietPreference);
		if (dietDiff > 0.4) return false;

		// Similar social behavior helps
		const socialDiff = Math.abs(this.traits.socialBehavior - other.traits.socialBehavior);
		return socialDiff < 0.5;
	}

	// Can this creature hunt the target?
	// Size thresholds:
	// - Prey too small (<25% of hunter size) isn't worth the energy to chase
	// - Hunter must be at least 80% of target's size (can hunt slightly larger prey)
	// - OR have high aggression (>60%) to overcome size disadvantage
	// - OR have 20% stronger strength than target
	// - Prey that's more than 50% larger is always too big (unless very aggressive)
	// Cannibalism rules:
	// - Carnivores don't normally hunt other carnivores (too dangerous, not worth it)
	// - Exception: when starving (energy < 30%) and much stronger
	canHunt(target: Creature): boolean {
		if (!this.isCarnivore && !this.isOmnivore) return false;
		if (target.id === this.id) return false;

		// Minimum size threshold: prey too small isn't worth chasing
		// The energy spent chasing exceeds the energy gained from eating
		// Exception: when very hungry, will chase smaller prey
		const minWorthwhileSize = this.energyPercent < 0.4 ? 0.15 : 0.25; // 15% if hungry, 25% normally
		if (target.size < this._size * minWorthwhileSize) {
			return false; // Too small, not worth it
		}

		// Carnivore-on-carnivore hunting (cannibalism) is rare
		// Only happens when truly desperate (near death) AND significantly stronger
		// This prevents cannibalism from being a sustainable strategy
		if (target.isCarnivore) {
			const isNearDeath = this.energyPercent < 0.2; // Stricter: 20% instead of 30%
			const isMuchStronger = this.traits.strength > target.traits.strength * 1.5;
			const isMuchBigger = this._size > target.size * 1.5; // Stricter: 50% bigger instead of 30%

			// Must be near death AND (much stronger OR much bigger)
			if (!isNearDeath || (!isMuchStronger && !isMuchBigger)) {
				return false;
			}
		}

		// Omnivores and carnivores can hunt omnivores but it's risky
		// (they fight back and are adaptable)
		if (target.isOmnivore) {
			const isHungry = this.energyPercent < 0.5;
			const isStronger = this.traits.strength > target.traits.strength * 1.2;
			const isBigger = this._size > target.size * 1.1;

			// Must be hungry AND (stronger OR bigger)
			if (!isHungry || (!isStronger && !isBigger)) {
				return false;
			}
		}

		// Absolute size limit: can't hunt prey more than 50% larger
		// (even aggressive hunters need some physical capability)
		if (target.size > this._size * 1.5) {
			return this.traits.aggression > 0.8 && this.traits.strength > 0.7; // Only very aggressive, strong hunters try
		}

		// Size advantage: hunter is at least 80% of target's size
		// This means a size-10 hunter can hunt up to size-12.5 prey
		const sizeAdvantage = this._size > target.size * 0.8;

		// Aggression advantage: highly aggressive hunters ignore size somewhat
		const aggressionAdvantage = this.traits.aggression > 0.6;

		// Strength advantage: significantly stronger can overcome size
		const strengthAdvantage = this.traits.strength > target.traits.strength * 1.2;

		return sizeAdvantage || aggressionAdvantage || strengthAdvantage;
	}

	// Die
	die(): void {
		this.isAlive = false;
		this.energy = 0;
		// Record death in species registry
		speciesRegistry.recordDeath(this.id);
	}

	// Distance to another entity
	distanceTo(other: { position: Vector2 }): number {
		return distance(this.position.x, this.position.y, other.position.x, other.position.y);
	}

	// Check if point is within vision
	canSee(point: Vector2): boolean {
		const dx = point.x - this.position.x;
		const dy = point.y - this.position.y;
		return dx * dx + dy * dy <= this._visionRange * this._visionRange;
	}
}
