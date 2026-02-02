import { CONFIG } from '../simulation/config';
import type { Vector2 } from './creature';
import { distance } from '../utils/math';

let nextCorpseId = 0;

// Corpse decay time in seconds (simulation time)
const CORPSE_DECAY_TIME = 30;

export class Corpse {
	readonly id: number;
	position: Vector2;
	energy: number;        // Remaining energy that can be scavenged
	maxEnergy: number;     // Starting energy
	size: number;          // Visual size (based on creature that died)
	createdAt: number;     // Simulation time when created
	isConsumed: boolean = false;

	constructor(x: number, y: number, energy: number, size: number, createdAt: number) {
		this.id = nextCorpseId++;
		this.position = { x, y };
		this.energy = energy;
		this.maxEnergy = energy;
		this.size = size;
		this.createdAt = createdAt;
	}

	// Check if corpse has decayed
	isDecayed(currentTime: number): boolean {
		return currentTime - this.createdAt > CORPSE_DECAY_TIME;
	}

	// Get decay progress (0 = fresh, 1 = fully decayed)
	getDecayProgress(currentTime: number): number {
		return Math.min(1, (currentTime - this.createdAt) / CORPSE_DECAY_TIME);
	}

	// Consume corpse based on creature size
	// Scavenging is more efficient than hunting (no chase, no fight)
	// Returns energy consumed
	consume(creatureSize: number): number {
		if (this.isConsumed || this.energy <= 0) return 0;

		// Normalize creature size (0 = smallest, 1 = largest)
		const normalizedSize = (creatureSize - CONFIG.CREATURE_MIN_SIZE) /
			(CONFIG.CREATURE_MAX_SIZE - CONFIG.CREATURE_MIN_SIZE);

		// Bite size scales with creature size (8-30 energy per bite)
		// Slightly more efficient than hunting live prey
		const biteSize = 8 + normalizedSize * 22;

		const consumed = Math.min(this.energy, biteSize);
		this.energy -= consumed;

		if (this.energy <= 0) {
			this.isConsumed = true;
		}

		return consumed;
	}

	// Check collision with a creature
	isCollidingWith(creaturePos: Vector2, creatureSize: number): boolean {
		const dist = distance(this.position.x, this.position.y, creaturePos.x, creaturePos.y);
		return dist < this.size + creatureSize;
	}
}

// Create a corpse from a dead creature
export function createCorpse(
	x: number,
	y: number,
	creatureEnergy: number,
	creatureSize: number,
	currentTime: number
): Corpse {
	// Corpse has less energy than the living creature had
	// (some energy lost to death, internal processes stopping, etc.)
	const corpseEnergy = creatureEnergy * 0.6;
	return new Corpse(x, y, corpseEnergy, creatureSize, currentTime);
}
