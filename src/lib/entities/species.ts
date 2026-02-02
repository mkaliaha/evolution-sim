import type { Traits } from './genetics';

// Unique species names generated from trait combinations
const PREFIXES = [
	'Aero', 'Aqua', 'Brio', 'Chromo', 'Deco', 'Echo', 'Ferro', 'Gyro',
	'Helio', 'Ignis', 'Juno', 'Krypto', 'Luna', 'Magna', 'Necto', 'Omni',
	'Proto', 'Quasi', 'Rubi', 'Stella', 'Terra', 'Ultra', 'Velo', 'Xeno', 'Zephyr'
];

const ROOTS = [
	'poda', 'derm', 'vora', 'morph', 'genic', 'trix', 'saurus', 'dont',
	'phage', 'zoon', 'cyte', 'blast', 'plax', 'carpa', 'thrix', 'nema',
	'ptera', 'lepis', 'branchia', 'cera', 'opus', 'mys', 'lith', 'stoma'
];

const SUFFIXES = [
	'us', 'is', 'um', 'ia', 'or', 'ax', 'ex', 'ix', 'ox', 'a', 'i', 'ae', 'ensis', 'oides'
];

let nextSpeciesId = 1;

export interface Species {
	id: number;
	name: string;
	prototypeTraits: Traits; // The "average" traits that define this species
	population: number;
	totalBirths: number;
	totalDeaths: number;
	generation: number; // Highest generation in this species
	createdAt: number; // Simulation time when species emerged
	color: string; // Representative color
}

// Generate a unique species name based on traits
function generateSpeciesName(traits: Traits): string {
	// Use trait values to deterministically pick name parts
	const prefixIndex = Math.floor((traits.speed + traits.visionRange) * PREFIXES.length / 2) % PREFIXES.length;
	const rootIndex = Math.floor((traits.dietPreference + traits.aggression) * ROOTS.length / 2) % ROOTS.length;
	const suffixIndex = Math.floor((traits.size + traits.metabolism) * SUFFIXES.length / 2) % SUFFIXES.length;

	return PREFIXES[prefixIndex] + ROOTS[rootIndex] + SUFFIXES[suffixIndex];
}

// Calculate genetic distance between two trait sets
export function geneticDistance(traits1: Traits, traits2: Traits): number {
	const traitKeys = Object.keys(traits1) as (keyof Traits)[];
	let sumSquared = 0;

	for (const key of traitKeys) {
		const diff = traits1[key] - traits2[key];
		sumSquared += diff * diff;
	}

	// Normalize by number of traits
	return Math.sqrt(sumSquared / traitKeys.length);
}

// Threshold for considering two creatures the same species
// Lower = more strict species boundaries, more speciation
export const SPECIES_THRESHOLD = 0.15;

// Species registry
export class SpeciesRegistry {
	private species: Map<number, Species> = new Map();
	private creatureSpecies: Map<number, number> = new Map(); // creatureId -> speciesId

	// Find the best matching species for a creature's traits
	findMatchingSpecies(traits: Traits): Species | null {
		let bestMatch: Species | null = null;
		let bestDistance = Infinity;

		for (const species of this.species.values()) {
			if (species.population === 0) continue; // Skip extinct species

			const distance = geneticDistance(traits, species.prototypeTraits);
			if (distance < SPECIES_THRESHOLD && distance < bestDistance) {
				bestDistance = distance;
				bestMatch = species;
			}
		}

		return bestMatch;
	}

	// Create a new species
	createSpecies(traits: Traits, createdAt: number): Species {
		const id = nextSpeciesId++;
		const name = generateSpeciesName(traits);

		// Calculate representative color
		const r = Math.floor(((traits.aggression + traits.dietPreference + traits.strength) / 3) * 200 + 55);
		const g = Math.floor(((traits.metabolism + traits.camouflage) / 2) * 200 + 55);
		const b = Math.floor(((traits.coldTolerance + traits.socialBehavior) / 2) * 200 + 55);

		const species: Species = {
			id,
			name,
			prototypeTraits: { ...traits },
			population: 0,
			totalBirths: 0,
			totalDeaths: 0,
			generation: 0,
			createdAt,
			color: `rgb(${r}, ${g}, ${b})`
		};

		this.species.set(id, species);
		return species;
	}

	// Assign a creature to a species (finds existing or creates new)
	assignSpecies(creatureId: number, traits: Traits, generation: number, currentTime: number): Species {
		// Try to find an existing matching species
		let species = this.findMatchingSpecies(traits);

		// If no match, create a new species
		if (!species) {
			species = this.createSpecies(traits, currentTime);
		}

		// Update species stats
		species.population++;
		species.totalBirths++;
		if (generation > species.generation) {
			species.generation = generation;
		}

		// Update prototype traits (running average)
		const weight = 1 / species.population;
		const traitKeys = Object.keys(traits) as (keyof Traits)[];
		for (const key of traitKeys) {
			species.prototypeTraits[key] =
				species.prototypeTraits[key] * (1 - weight) + traits[key] * weight;
		}

		// Track creature -> species mapping
		this.creatureSpecies.set(creatureId, species.id);

		return species;
	}

	// Get species for a creature
	getCreatureSpecies(creatureId: number): Species | undefined {
		const speciesId = this.creatureSpecies.get(creatureId);
		if (speciesId === undefined) return undefined;
		return this.species.get(speciesId);
	}

	// Check if two creatures are the same species
	areSameSpecies(creatureId1: number, creatureId2: number): boolean {
		const species1 = this.creatureSpecies.get(creatureId1);
		const species2 = this.creatureSpecies.get(creatureId2);
		return species1 !== undefined && species1 === species2;
	}

	// Record a creature's death
	recordDeath(creatureId: number): void {
		const speciesId = this.creatureSpecies.get(creatureId);
		if (speciesId === undefined) return;

		const species = this.species.get(speciesId);
		if (species) {
			species.population--;
			species.totalDeaths++;
		}

		this.creatureSpecies.delete(creatureId);
	}

	// Get all active species (population > 0)
	getActiveSpecies(): Species[] {
		return Array.from(this.species.values()).filter(s => s.population > 0);
	}

	// Get all species (including extinct)
	getAllSpecies(): Species[] {
		return Array.from(this.species.values());
	}

	// Get species statistics
	getStats() {
		const active = this.getActiveSpecies();

		return {
			totalSpecies: this.species.size,
			activeSpecies: active.length,
			extinctSpecies: this.species.size - active.length,
			largestSpecies: active.reduce((max, s) => s.population > max.population ? s : max, active[0] || null),
			speciesList: active.sort((a, b) => b.population - a.population)
		};
	}

	// Reset the registry
	reset(): void {
		this.species.clear();
		this.creatureSpecies.clear();
		nextSpeciesId = 1;
	}
}

// Global species registry
export const speciesRegistry = new SpeciesRegistry();
