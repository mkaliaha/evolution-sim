import type { World } from './world';
import type { Creature, Vector2 } from '../entities/creature';
import type { Food } from '../entities/food';
import type { Corpse } from '../entities/corpse';
import { CONFIG } from './config';
import { magnitude, clampVelocity } from '../utils/math';

// Update all creature behaviors
export function updateCreatureBehaviors(world: World, deltaTime: number, currentTime: number): void {
	for (const creature of world.creatures) {
		if (!creature.isAlive) continue;

		// Apply temperature damage
		const tempDamage = world.getTemperatureDamage(creature);
		if (tempDamage > 0) {
			creature.takeDamage(tempDamage * deltaTime);
			if (!creature.isAlive) continue;
		}

		// Determine behavior based on state
		const nearbyFood = world.getFoodNear(
			creature.position.x,
			creature.position.y,
			creature.visionRange
		);
		const nearbyCreatures = world.getCreaturesNear(
			creature.position.x,
			creature.position.y,
			creature.visionRange
		);
		// Corpses for scavenging (carnivores and omnivores)
		const nearbyCorpses = (creature.isCarnivore || creature.isOmnivore)
			? world.getCorpsesNear(creature.position.x, creature.position.y, creature.visionRange)
			: [];

		// Check for nearby threats (carnivores that can hunt this creature)
		const nearestThreat = findNearestThreat(creature, nearbyCreatures);
		if (nearestThreat && creature.distanceTo(nearestThreat) < creature.visionRange * 0.8) {
			// Camouflage check - can the threat see us?
			const detectionChance = 1 - creature.traits.camouflage * 0.7;
			if (Math.random() < detectionChance) {
				creature.state = 'fleeing';
				creature.fleeFrom(nearestThreat.position, deltaTime);
			} else {
				// Stay still, try to hide
				creature.velocity.x *= 0.9;
				creature.velocity.y *= 0.9;
			}
		}
		// Hungry? Seek food
		// Real ecosystem behavior based on ecological research:
		// Herbivores: graze constantly (85% threshold) - continuous foraging, specialized
		// Omnivores: forage frequently (70% threshold) - generalists need to stay fed
		// Carnivores: size-based threshold (smaller = hunt more often, larger = feast-and-famine)
		//   - Small carnivores (size 0.3): ~50% threshold - high metabolism, frequent hunting
		//   - Large carnivores (size 1.0): ~25% threshold - efficient, can fast longer
		else if (creature.energyPercent < (creature.isHerbivore ? CONFIG.HERBIVORE_HUNGER_THRESHOLD : creature.isCarnivore ? (CONFIG.CARNIVORE_HUNGER_THRESHOLD_BASE - creature.traits.size * CONFIG.CARNIVORE_HUNGER_SIZE_MODIFIER) : CONFIG.OMNIVORE_HUNGER_THRESHOLD)) {
			if (creature.isOmnivore) {
				// OMNIVORE: Opportunistic feeder (like bears, raccoons, pigs)
				// Priority: plants > corpses (scavenging) > vulnerable prey
				const food = findNearestFood(creature, nearbyFood);
				const corpse = findNearestCorpse(creature, nearbyCorpses);
				const vulnerablePrey = findVulnerablePrey(creature, nearbyCreatures);

				if (food) {
					// Plants are safest - always prefer them
					const foodDist = creature.distanceTo(food);
					const corpseDist = corpse ? creature.distanceTo(corpse) : Infinity;

					// Prefer plants unless corpse is much closer
					if (corpseDist < foodDist * 0.5 && corpse) {
						creature.state = 'seeking_food';
						creature.seekTarget(corpse.position, deltaTime);
					} else {
						creature.state = 'seeking_food';
						creature.seekTarget(food.position, deltaTime);
					}
				} else if (corpse) {
					// No plants but corpse available - scavenge (safer than hunting)
					creature.state = 'seeking_food';
					creature.seekTarget(corpse.position, deltaTime);
				} else if (vulnerablePrey) {
					// No plants or corpses, but easy prey available
					creature.state = 'hunting';
					creature.seekTarget(vulnerablePrey.position, deltaTime);
				} else {
					// Nothing nearby - explore for food
					creature.state = 'seeking_food';
					exploreForFood(creature, deltaTime);
				}
			} else if (creature.isCarnivore) {
				// CARNIVORE: Hunter and scavenger
				// Priority: corpses (safe) > pack hunting > solo hunting
				const corpse = findNearestCorpse(creature, nearbyCorpses);

				if (corpse) {
					// Scavenging is safer than hunting - prefer it
					creature.state = 'seeking_food';
					creature.seekTarget(corpse.position, deltaTime);
				} else {
					// No corpses - must hunt
					// Social carnivores: check if pack mates are already hunting something
					let prey = findPackTarget(creature, nearbyCreatures);

					// If no pack target, find own prey
					if (!prey) {
						prey = findPrey(creature, nearbyCreatures);
					}

					if (prey) {
						creature.state = 'hunting';
						creature.huntTarget(prey.position, deltaTime);
					} else {
						// No prey - explore to find hunting grounds or corpses
						creature.state = 'hunting';
						exploreForFood(creature, deltaTime);
					}
				}
			} else {
				// HERBIVORE: Continuous grazer
				const food = findNearestFood(creature, nearbyFood);
				if (food) {
					creature.state = 'seeking_food';
					creature.seekTarget(food.position, deltaTime);
				} else {
					// No food nearby - explore more actively
					creature.state = 'seeking_food';
					exploreForFood(creature, deltaTime);
				}
			}
		}
		// Ready to reproduce?
		else if (creature.canReproduce(currentTime)) {
			// Check population density - crowded areas have reduced reproduction
			const reproductionChance = creature.getReproductionChance(nearbyCreatures.length);
			const canReproduceHere = Math.random() < reproductionChance;

			if (!canReproduceHere) {
				// Too crowded - wander to find less dense area
				creature.state = 'wandering';
				creature.wander(deltaTime);
			} else if (creature.prefersAsexual()) {
				// Asexual reproduction
				const offspring = creature.reproduceAsexual(currentTime, world.mutationRate);
				if (offspring) {
					world.addCreature(offspring);
				}
			} else {
				// Seek mate
				const mate = findMate(creature, nearbyCreatures, currentTime);
				if (mate && creature.distanceTo(mate) < creature.size + mate.size + 5) {
					// Close enough to mate - sexual reproduction produces multiple offspring
					const offspring = creature.reproduceSexual(mate, currentTime, world.mutationRate);
					for (const child of offspring) {
						world.addCreature(child);
					}
				} else if (mate) {
					creature.state = 'seeking_mate';
					creature.seekTarget(mate.position, deltaTime);
				} else {
					// No mate found, maybe reproduce asexually anyway
					if (Math.random() < 0.1) {
						const offspring = creature.reproduceAsexual(currentTime, world.mutationRate);
						if (offspring) {
							world.addCreature(offspring);
						}
					}
					creature.state = 'wandering';
					creature.wander(deltaTime);
				}
			}
		}
		// Proactively seek mate when nearly ready to reproduce
		// This helps sparse populations (like big carnivores) find partners
		else if (creature.shouldSeekMate(currentTime)) {
			const potentialMate = findPotentialMate(creature, nearbyCreatures, currentTime);
			if (potentialMate) {
				creature.state = 'seeking_mate';
				creature.seekTarget(potentialMate.position, deltaTime);
			} else {
				// No mate nearby - explore to find one
				// Move faster and more purposefully than normal wandering
				creature.state = 'seeking_mate';
				exploreForMate(creature, deltaTime);
			}
		}
		// Social behavior - tend towards group
		else if (creature.traits.socialBehavior > 0.6) {
			const groupCenter = findGroupCenter(creature, nearbyCreatures);
			if (groupCenter) {
				creature.seekTarget(groupCenter, deltaTime);
			} else {
				creature.state = 'wandering';
				creature.wander(deltaTime);
			}
		}
		// Default: wander
		else {
			creature.state = 'wandering';
			creature.wander(deltaTime);
		}

		// Update creature
		creature.update(deltaTime, currentTime);
	}
}

// Handle collisions
export function handleCollisions(world: World): void {
	world.updateSpatialHashes();

	// Creature-Food collisions
	for (const creature of world.creatures) {
		if (!creature.isAlive) continue;
		if (creature.isCarnivore) continue; // Carnivores don't eat plants

		const nearbyFood = world.getFoodNear(creature.position.x, creature.position.y, creature.size + 10);
		for (const food of nearbyFood) {
			if (food.isConsumed) continue;
			if (food.isCollidingWith(creature.position, creature.size)) {
				// Bigger creatures take bigger bites
				let energy = food.consume(creature.size);

				// HERBIVORE SIZE ADVANTAGE for plant eating
				// Real ecosystems: largest animals are herbivores (elephants, whales, bison)
				// Big herbivores have larger digestive systems to process plant matter
				// They extract MORE energy from the same plants
				if (creature.isHerbivore) {
					// size 0.3 = 90% efficiency, size 0.7 = 110%, size 1.0 = 125%
					const sizeBonus = CONFIG.HERBIVORE_PLANT_EFFICIENCY + creature.traits.size * CONFIG.HERBIVORE_SIZE_PLANT_BONUS;
					energy *= sizeBonus;
				}

				// Generalist penalty: omnivores are MUCH less efficient at digesting plants
				// Herbivores have specialized digestive systems (100% efficiency)
				// Omnivores have generalist systems - poor plant digestion
				if (creature.isOmnivore) {
					// Base 55% efficiency, gets worse with size (down to 40%)
					const omnivorePenalty = CONFIG.OMNIVORE_PLANT_EFFICIENCY - creature.traits.size * CONFIG.OMNIVORE_PLANT_SIZE_PENALTY;
					energy *= Math.max(CONFIG.OMNIVORE_PLANT_EFFICIENCY_MIN, omnivorePenalty);
				}

				// Food competition: when many herbivores nearby, food is contested
				// This represents competition for grazing area
				const nearbyHerbivores = world.getCreaturesNear(
					creature.position.x,
					creature.position.y,
					50
				).filter((c) => c.isAlive && !c.isCarnivore && c.id !== creature.id);

				// Competition penalty: each nearby creature reduces food efficiency
				// Herbivores: low penalty (herding is natural, they share grazing areas)
				// Omnivores: slightly higher penalty (generalists lose to specialists)
				const competitionPenalty = creature.isOmnivore ? 0.10 : 0.06;
				const efficiencyLoss = nearbyHerbivores.length * competitionPenalty;
				const foodEfficiency = Math.max(0.3, 1.0 - efficiencyLoss);
				energy *= foodEfficiency;

				creature.eat(energy);
				break; // Only eat one food per frame
			}
		}
	}

	// Creature-Corpse collisions (scavenging)
	for (const creature of world.creatures) {
		if (!creature.isAlive) continue;
		if (!creature.isCarnivore && !creature.isOmnivore) continue; // Only meat-eaters scavenge

		const nearbyCorpses = world.getCorpsesNear(creature.position.x, creature.position.y, creature.size + 10);
		for (const corpse of nearbyCorpses) {
			if (corpse.isConsumed) continue;
			if (corpse.isCollidingWith(creature.position, creature.size)) {
				// Scavenge from the corpse
				let energy = corpse.consume(creature.size);

				// Carnivores are more efficient at extracting meat (specialized digestive system)
				// Omnivores get less from scavenging (generalist penalty)
				const extractionRate = creature.isCarnivore
					? CONFIG.CARNIVORE_MEAT_EFFICIENCY * 1.2 // 20% bonus for scavenging (no chase energy wasted)
					: CONFIG.OMNIVORE_MEAT_EFFICIENCY * 1.0; // No bonus - omnivores are generalists, not specialists
				energy *= extractionRate;

				creature.eat(energy);
				break; // Only eat one corpse per frame
			}
		}
	}

	// Creature-Creature collisions (hunting/attacking)
	for (const creature of world.creatures) {
		if (!creature.isAlive) continue;
		if (!creature.isCarnivore && !creature.isOmnivore) continue;
		// Lower aggression threshold - carnivores hunt for food, not just aggression
		if (creature.traits.aggression < 0.15) continue;

		const nearbyCreatures = world.getCreaturesNear(
			creature.position.x,
			creature.position.y,
			creature.size + 20
		);

		for (const other of nearbyCreatures) {
			if (other.id === creature.id) continue;
			if (!other.isAlive) continue;
			if (!creature.canHunt(other)) continue;

			const dx = other.position.x - creature.position.x;
			const dy = other.position.y - creature.position.y;
			const distance = Math.sqrt(dx * dx + dy * dy);

			if (distance < creature.size + other.size) {
				// Check for herding protection - prey with nearby allies are harder to hunt
				const preyAllies = countNearbyAllies(other, nearbyCreatures);

				// Check for pack hunting bonus - carnivores hunting together are more effective
				// Nerfed: requires high social stat, smaller bonuses, capped pack size
				const packHunters = countPackHunters(creature, other, nearbyCreatures);
				const packBonus = 1 + packHunters * 0.15; // +15% damage per pack member (was 25%)

				// Herd protection is still effective against packs (pack coordination helps less)
				const effectiveHerdProtection = Math.max(0, preyAllies * 0.15 - packHunters * 0.05); // Reduced pack counter (was 0.1)
				const herdProtection = Math.min(effectiveHerdProtection, 0.6); // Up to 60% damage reduction

				// SIZE PENALTY FOR LARGE PREDATORS
				// Real ecosystems: largest predators are mid-sized (lions, wolves, orcas)
				// Being too big makes you slow and clumsy - can't catch prey effectively
				// Optimal hunter size is around 0.4-0.6, big hunters (>0.7) are penalized
				const hunterSizeTrait = creature.traits.size;
				let sizeEfficiency = 1.0;
				if (hunterSizeTrait > 0.6) {
					// Large predators are clumsy hunters
					// size 0.6 = 100%, size 0.8 = 70%, size 1.0 = 40%
					sizeEfficiency = 1.0 - (hunterSizeTrait - 0.6) * 1.5;
				}

				// OMNIVORE HUNTING PENALTY
				// Omnivores are opportunistic, not specialized hunters
				// They deal less damage (like bears vs wolves)
				const omnivorePenalty = creature.isOmnivore ? 0.75 : 1.0; // 75% damage

				// Attack! Use strength-based damage (with pack bonus, reduced by herd protection and size)
				const baseDamage = creature.attackDamage * packBonus * sizeEfficiency * omnivorePenalty;
				const damage = baseDamage * (1 - herdProtection);
				const preyEnergyBefore = other.energy;
				const preySize = other.size;
				other.takeDamage(damage);

				// Prey fights back! Counter-attack based on prey's strength
				// Pack hunting reduces counter-attack effectiveness
				// Larger hunters have advantage over smaller prey (intimidation, tougher)
				if (other.traits.strength > 0.3) {
					const counterReduction = 1 / (1 + packHunters * 0.2);
					// Size advantage: bigger predator vs smaller prey = less counter damage
					// This makes hunting small prey safer (realistic - wolf vs rabbit)
					const sizeRatio = other.traits.size / Math.max(0.3, creature.traits.size);
					const sizeAdvantage = Math.min(1.0, sizeRatio); // 0-1, lower = predator bigger
					// Carnivore stamina reduces damage taken (experienced hunters)
					const hunterResilience = creature.isCarnivore ? (1 - creature.traits.stamina * 0.3) : 1.0;
					// Omnivores are less skilled hunters - take more counter damage
					const omnivoreVulnerability = creature.isOmnivore ? 1.25 : 1.0;
					const counterDamage = other.attackDamage * 0.15 * other.traits.strength * counterReduction * sizeAdvantage * hunterResilience * omnivoreVulnerability;
					creature.takeDamage(counterDamage);

					// If prey has allies nearby, they help defend (scaled by size too)
					if (preyAllies > 0) {
						const allyDefenseDamage = preyAllies * 1.5 * other.traits.socialBehavior * counterReduction * sizeAdvantage * hunterResilience * omnivoreVulnerability;
						creature.takeDamage(allyDefenseDamage);
					}
				}

				// If attacker died from counter-attack, stop
				if (!creature.isAlive) break;

				// Energy gain based on prey's energy and size
				// Real ecosystems: ~10% energy transfer between trophic levels
				// We use higher values since metabolism/activity are modeled separately
				// NOTE: Energy gain does NOT scale with hunter size - big hunters don't get more meat
				// from the same prey. This prevents giant carnivores from being viable.
				let energyGain: number;
				if (!other.isAlive) {
					// Kill: get portion of prey's ACTUAL energy only - no free energy!
					// This ensures cannibalism always results in net energy loss for the population
					// (thermodynamically correct - you can't sustain on eating each other)
					// Pack sharing is costly - solo hunting can be more efficient for small prey
					const shareRatio = 1 / (1 + packHunters * 0.7);
					// Carnivores: specialized digestive system for meat (35%)
					// Omnivores: very inefficient at meat (15%) - must rely on plants
					const extractionRate = creature.isCarnivore ? CONFIG.CARNIVORE_MEAT_EFFICIENCY : CONFIG.OMNIVORE_MEAT_EFFICIENCY;
					// Large predators are LESS efficient at eating (wasted energy chasing)
					const huntingEfficiency = sizeEfficiency;
					energyGain = preyEnergyBefore * extractionRate * shareRatio * huntingEfficiency;
				} else {
					// Wound: moderate energy gain from the hit (blood/flesh)
					energyGain = damage * 0.25;
				}
				creature.eat(energyGain);
				break;
			}
		}
	}
}

// Count nearby allies for herding protection (prey)
// Only same-species creatures count as allies, scaled by social behavior
function countNearbyAllies(creature: Creature, nearbyCreatures: Creature[]): number {
	// Antisocial creatures don't benefit from herd protection
	if (creature.traits.socialBehavior < 0.2) return 0;

	let allies = 0;
	for (const other of nearbyCreatures) {
		if (other.id === creature.id) continue;
		if (!other.isAlive) continue;

		// Must be same species to count as ally
		const isSameSpecies =
			creature.speciesId !== null &&
			other.speciesId !== null &&
			creature.speciesId === other.speciesId;

		if (!isSameSpecies) continue;

		// Both must be somewhat social to cooperate in defense
		if (other.traits.socialBehavior < 0.2) continue;

		const dist = creature.distanceTo(other);
		// Only count as ally if close enough (within 50 pixels)
		if (dist < 50) {
			// Social creatures provide better protection
			// socialBehavior 0.2 = 0.5 ally value, 1.0 = 1.5 ally value
			const socialBonus = 0.5 + other.traits.socialBehavior;
			allies += socialBonus;
		}
	}

	// Creature's own social stat affects how well they benefit from the herd
	// socialBehavior 0.2 = 50% effectiveness, 1.0 = 100% effectiveness
	const ownSocialMultiplier = 0.3 + creature.traits.socialBehavior * 0.7;
	return allies * ownSocialMultiplier;
}

// Find vulnerable prey for omnivores (opportunistic hunting)
// Omnivores target easy prey: weak, slow, isolated, small
function findVulnerablePrey(hunter: Creature, creatures: Creature[]): Creature | null {
	let best: Creature | null = null;
	let bestScore = -Infinity;

	for (const other of creatures) {
		if (other.id === hunter.id) continue;
		if (!other.isAlive) continue;
		if (!hunter.canHunt(other)) continue;
		// Omnivores don't hunt other omnivores or carnivores - too risky
		if (other.isOmnivore || other.isCarnivore) continue;

		// Camouflage check
		const detectionChance = 1 - other.traits.camouflage * 0.5;
		if (Math.random() > detectionChance) continue;

		// Count prey's allies (herd protection)
		const allyCount = countNearbyAllies(other, creatures);

		// Vulnerability score - omnivores target VERY EASY prey only
		// They're opportunistic, not skilled hunters - need multiple advantages
		const distance = hunter.distanceTo(other);
		const isWeak = other.energyPercent < 0.3; // Very low energy = vulnerable (stricter)
		const isSlow = other.traits.speed < 0.35; // Slow = easy to catch (stricter)
		const isSmall = other.size < hunter.size * 0.6; // Much smaller = safer to attack (stricter)
		const isIsolated = allyCount === 0; // No herd protection

		// Must meet at least 3 vulnerability criteria to be worth hunting (was 2)
		// This makes omnivore hunting much more situational
		const vulnerabilityCount = (isWeak ? 1 : 0) + (isSlow ? 1 : 0) + (isSmall ? 1 : 0) + (isIsolated ? 1 : 0);
		if (vulnerabilityCount < CONFIG.OMNIVORE_HUNT_VULNERABILITY_MIN) continue; // Not vulnerable enough - omnivores are picky

		// Score based on vulnerability and distance
		let score =
			(isWeak ? 30 : 0) +
			(isSlow ? 20 : 0) +
			(isSmall ? 15 : 0) +
			(isIsolated ? 25 : 0) +
			(1 - distance / hunter.visionRange) * 20 -
			allyCount * 20; // Heavy penalty for herds

		if (score > bestScore) {
			bestScore = score;
			best = other;
		}
	}

	return best;
}

// Count nearby pack hunters for pack hunting bonus (carnivores)
// Pack hunting requires HIGH social behavior (>0.6) - truly pack-oriented creatures
function countPackHunters(hunter: Creature, target: Creature, nearbyCreatures: Creature[]): number {
	// The hunter itself must be social enough to coordinate
	if (hunter.traits.socialBehavior < 0.6) return 0;

	let packMembers = 0;
	for (const other of nearbyCreatures) {
		if (other.id === hunter.id) continue;
		if (!other.isAlive) continue;
		if (!other.isCarnivore && !other.isOmnivore) continue;

		// Pack members need HIGH social behavior (>0.6) to coordinate hunts
		// This is stricter than before (was 0.4)
		const isSocialCarnivore = other.traits.socialBehavior > 0.6;
		const isNearTarget = other.distanceTo(target) < 50; // Tighter range (was 60)
		const isNearHunter = other.distanceTo(hunter) < 60; // Tighter range (was 80)

		if (isSocialCarnivore && isNearTarget && isNearHunter) {
			packMembers++;
		}
	}
	// Cap pack size at 3 (more realistic, prevents overwhelming packs)
	return Math.min(packMembers, 3);
}

// Find prey that pack members are already hunting
function findPackTarget(hunter: Creature, nearbyCreatures: Creature[]): Creature | null {
	// Only highly social hunters (>0.6) join packs - matches countPackHunters threshold
	if (hunter.traits.socialBehavior < 0.6) return null;

	for (const other of nearbyCreatures) {
		if (other.id === hunter.id) continue;
		if (!other.isAlive) continue;
		if (!other.isCarnivore && !other.isOmnivore) continue;
		if (other.state !== 'hunting') continue;

		// Is this a pack mate? Both must be highly social
		const dietDiff = Math.abs(hunter.traits.dietPreference - other.traits.dietPreference);
		const isSimilar = dietDiff < 0.3 && other.traits.socialBehavior > 0.6; // Increased from 0.4
		if (!isSimilar) continue;

		// Find what they're hunting (closest prey to them)
		for (const potential of nearbyCreatures) {
			if (potential.isCarnivore) continue;
			if (!potential.isAlive) continue;
			if (!hunter.canHunt(potential)) continue;

			const distToPackMate = other.distanceTo(potential);
			if (distToPackMate < 100) {
				// This is likely what the pack mate is hunting
				return potential;
			}
		}
	}
	return null;
}

// Make creature explore more actively when seeking food but none nearby
// Instead of random wandering, move purposefully in a direction
function exploreForFood(creature: Creature, deltaTime: number): void {
	exploreWithBias(creature, 0.7, 0.005, 0.3);
}

// Generic exploration function used by both food and mate seeking
function exploreWithBias(
	creature: Creature,
	speedMultiplier: number,
	directionChangeChance: number,
	centerBias: number
): void {
	const exploreSpeed = creature.speed * speedMultiplier;

	// Less frequent direction changes - commit to a direction
	if (Math.random() < directionChangeChance) {
		// Pick a new exploration direction
		// Bias towards center if near edges (more food/mates typically in center)
		const centerX = CONFIG.WORLD_WIDTH / 2;
		const centerY = CONFIG.WORLD_HEIGHT / 2;
		const toCenter = {
			x: centerX - creature.position.x,
			y: centerY - creature.position.y
		};
		const distToCenter = magnitude(toCenter);

		// Normalize
		if (distToCenter > 1) {
			toCenter.x /= distToCenter;
			toCenter.y /= distToCenter;
		}

		// Mix random direction with bias towards center
		const randomAngle = Math.random() * Math.PI * 2;
		const randomDir = {
			x: Math.cos(randomAngle),
			y: Math.sin(randomAngle)
		};

		creature.velocity.x = (toCenter.x * centerBias + randomDir.x * (1 - centerBias)) * exploreSpeed;
		creature.velocity.y = (toCenter.y * centerBias + randomDir.y * (1 - centerBias)) * exploreSpeed;
	}

	// Maintain exploration speed
	const currentSpeed = magnitude(creature.velocity);
	if (currentSpeed < exploreSpeed * 0.5) {
		// Too slow, pick a direction
		const angle = Math.random() * Math.PI * 2;
		creature.velocity.x = Math.cos(angle) * exploreSpeed;
		creature.velocity.y = Math.sin(angle) * exploreSpeed;
	} else if (currentSpeed > exploreSpeed) {
		// Too fast, slow down
		const clamped = clampVelocity(creature.velocity, exploreSpeed);
		creature.velocity.x = clamped.x;
		creature.velocity.y = clamped.y;
	}
}

// Helper functions
function findNearestFood(creature: Creature, foods: Food[]): Food | null {
	let nearest: Food | null = null;
	let nearestDist = Infinity;

	for (const food of foods) {
		if (food.isConsumed) continue;
		const dist = creature.distanceTo(food);
		if (dist < nearestDist) {
			nearestDist = dist;
			nearest = food;
		}
	}

	return nearest;
}

// Find nearest corpse for scavenging
function findNearestCorpse(creature: Creature, corpses: Corpse[]): Corpse | null {
	let nearest: Corpse | null = null;
	let nearestDist = Infinity;

	for (const corpse of corpses) {
		if (corpse.isConsumed) continue;
		const dist = creature.distanceTo(corpse);
		if (dist < nearestDist) {
			nearestDist = dist;
			nearest = corpse;
		}
	}

	return nearest;
}

// Find the nearest creature that poses a threat
function findNearestThreat(creature: Creature, nearbyCreatures: Creature[]): Creature | null {
	// Herbivores and small creatures should fear carnivores
	if (creature.isCarnivore && creature.traits.strength > 0.7) {
		// Strong carnivores don't fear much
		return null;
	}

	let nearest: Creature | null = null;
	let nearestDist = Infinity;

	for (const other of nearbyCreatures) {
		if (other.id === creature.id) continue;
		if (!other.isAlive) continue;

		// Is this other creature a threat?
		const isThreat =
			other.isCarnivore &&
			other.traits.aggression > 0.4 &&
			other.canHunt(creature);

		if (!isThreat) continue;

		const dist = creature.distanceTo(other);
		if (dist < nearestDist) {
			nearestDist = dist;
			nearest = other;
		}
	}

	return nearest;
}

function findPrey(hunter: Creature, creatures: Creature[]): Creature | null {
	let best: Creature | null = null;
	let bestScore = -Infinity;

	// Count pack mates to adjust hunting strategy (only for highly social hunters)
	const packMates = countPackMatesNearby(hunter, creatures);
	const hasPackSupport = packMates > 0 && hunter.traits.socialBehavior > 0.6;

	for (const other of creatures) {
		if (other.id === hunter.id) continue;
		if (!other.isAlive) continue;
		if (!hunter.canHunt(other)) continue;

		// Camouflage check - can we see the prey?
		const detectionChance = 1 - other.traits.camouflage * 0.6;
		if (Math.random() > detectionChance) continue;

		// DANGER CHECK: Avoid prey that's too dangerous (big + strong)
		// Real predators avoid fights they might lose
		// But hungry predators take more risks (desperate hunting)
		const sizeRatio = other.size / hunter.size;
		const dangerScore = sizeRatio * 0.5 + other.traits.strength * 0.5;
		// Base threshold + hunger bonus (starving hunters are braver)
		const hungerBonus = (1 - hunter.energyPercent) * 0.5; // Up to +0.5 when starving
		const dangerThreshold = (hasPackSupport ? 0.9 : 0.7) + hungerBonus;
		if (dangerScore > dangerThreshold) continue; // Too dangerous, skip entirely

		// Count how many allies the prey has nearby (herding protection)
		const allyCount = countNearbyAllies(other, creatures);

		const distance = hunter.distanceTo(other);

		// Base score: prefer close, smaller, weak, slow targets
		// Predators should strongly prefer easy prey
		// Optimal prey size is 30-70% of hunter size (smaller = safer)
		const optimalSizeScore = sizeRatio < 0.3
			? sizeRatio * 40 // Very small prey: less valuable
			: sizeRatio > 0.7
				? (1.0 - sizeRatio) * 60 // Large prey: much harder, avoid
				: 25 - sizeRatio * 10; // Sweet spot, smaller is better

		let score =
			(1 - distance / hunter.visionRange) * 40 +
			optimalSizeScore +
			(1 - other.traits.camouflage) * 15 +
			(1 - other.traits.speed) * 15 + // Prefer slow prey more
			(1 - other.traits.strength) * 25; // Strongly avoid strong prey

		// Herd penalty - but reduced if we have pack support
		if (hasPackSupport) {
			// Pack hunters are less deterred by herds
			score -= allyCount * 5;
			// Bonus for larger prey that pack can take down together
			score += other.size * 5;
		} else {
			// Solo hunters avoid herds heavily
			score -= allyCount * 15;
		}

		if (score > bestScore) {
			bestScore = score;
			best = other;
		}
	}

	return best;
}

// Count nearby carnivore pack mates
function countPackMatesNearby(hunter: Creature, nearbyCreatures: Creature[]): number {
	// Hunter must be social to benefit from pack
	if (hunter.traits.socialBehavior < 0.6) return 0;

	let packMates = 0;
	for (const other of nearbyCreatures) {
		if (other.id === hunter.id) continue;
		if (!other.isAlive) continue;
		if (!other.isCarnivore && !other.isOmnivore) continue;

		// Pack mates must both be highly social (>0.6)
		const dietDiff = Math.abs(hunter.traits.dietPreference - other.traits.dietPreference);
		const isSimilar = dietDiff < 0.3 && other.traits.socialBehavior > 0.6; // Increased from 0.4
		const isNearby = hunter.distanceTo(other) < 80; // Tighter range (was 100)

		if (isSimilar && isNearby) {
			packMates++;
		}
	}
	return Math.min(packMates, 3); // Cap pack size
}

function findMate(creature: Creature, creatures: Creature[], currentTime: number): Creature | null {
	let best: Creature | null = null;
	let bestDist = Infinity;

	for (const other of creatures) {
		if (!creature.isCompatibleMate(other)) continue;
		if (!other.canReproduce(currentTime)) continue;

		const dist = creature.distanceTo(other);
		if (dist < bestDist) {
			bestDist = dist;
			best = other;
		}
	}

	return best;
}

// Find a potential mate for proactive mate-seeking
// Looks for compatible creatures that are also nearly ready to reproduce
function findPotentialMate(creature: Creature, creatures: Creature[], currentTime: number): Creature | null {
	let best: Creature | null = null;
	let bestScore = -Infinity;

	for (const other of creatures) {
		if (!creature.isCompatibleMate(other)) continue;

		// Check if they're also nearly ready (at least 50% ready)
		const otherReadiness = other.getReproductionReadiness(currentTime);
		if (otherReadiness < 0.5) continue;

		const dist = creature.distanceTo(other);

		// Score based on readiness and distance
		// Prefer closer mates that are more ready
		const score = otherReadiness * 100 - dist;

		if (score > bestScore) {
			bestScore = score;
			best = other;
		}
	}

	return best;
}

// Explore to find a mate when none nearby
// Similar to exploreForFood but biased towards areas where same-species might be
function exploreForMate(creature: Creature, deltaTime: number): void {
	// Social creatures go towards center, antisocial towards edges
	const centerBias = creature.traits.socialBehavior * 0.4; // 0-0.4 based on social
	exploreWithBias(creature, 0.6, 0.008, centerBias);
}

function findGroupCenter(creature: Creature, creatures: Creature[]): Vector2 | null {
	let count = 0;
	let sumX = 0;
	let sumY = 0;

	for (const other of creatures) {
		if (other.id === creature.id) continue;
		if (!other.isAlive) continue;

		// Only group with similar creatures (similar diet preference)
		const dietDiff = Math.abs(creature.traits.dietPreference - other.traits.dietPreference);
		if (dietDiff > 0.3) continue;

		sumX += other.position.x;
		sumY += other.position.y;
		count++;
	}

	if (count < 2) return null;

	return {
		x: sumX / count,
		y: sumY / count
	};
}
