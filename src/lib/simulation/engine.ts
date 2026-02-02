import { CONFIG } from './config';
import { World } from './world';
import { updateCreatureBehaviors, handleCollisions } from './physics';

export type SimulationState = 'stopped' | 'running' | 'paused';

export interface SimulationCallbacks {
	onUpdate?: (world: World, deltaTime: number) => void;
	onRender?: (world: World) => void;
	onStatsUpdate?: (stats: ReturnType<World['getStats']>) => void;
}

export class SimulationEngine {
	world: World;
	state: SimulationState = 'stopped';
	speed: number = 1; // Time multiplier
	private animationFrameId: number | null = null;
	private lastTime: number = 0;
	private statsInterval: number | null = null;
	private callbacks: SimulationCallbacks = {};

	constructor() {
		this.world = new World();
	}

	// Initialize and start simulation
	start(callbacks?: SimulationCallbacks): void {
		if (this.state === 'running') return;

		this.callbacks = callbacks ?? {};
		this.world.initialize();
		this.state = 'running';
		this.lastTime = performance.now();

		// Start game loop
		this.loop();

		// Start stats updates
		this.statsInterval = window.setInterval(() => {
			if (this.callbacks.onStatsUpdate) {
				this.callbacks.onStatsUpdate(this.world.getStats());
			}
		}, 500);
	}

	// Pause simulation
	pause(): void {
		if (this.state !== 'running') return;
		this.state = 'paused';

		if (this.animationFrameId !== null) {
			cancelAnimationFrame(this.animationFrameId);
			this.animationFrameId = null;
		}
	}

	// Resume simulation
	resume(): void {
		if (this.state !== 'paused') return;
		this.state = 'running';
		this.lastTime = performance.now();
		this.loop();
	}

	// Stop and reset simulation
	stop(): void {
		this.state = 'stopped';

		if (this.animationFrameId !== null) {
			cancelAnimationFrame(this.animationFrameId);
			this.animationFrameId = null;
		}

		if (this.statsInterval !== null) {
			clearInterval(this.statsInterval);
			this.statsInterval = null;
		}

		this.world = new World();
	}

	// Reset with current settings
	reset(): void {
		const wasRunning = this.state === 'running';
		this.stop();

		this.world = new World();
		this.world.globalTemperature = CONFIG.TEMPERATURE_DEFAULT;

		if (wasRunning) {
			this.start(this.callbacks);
		}
	}

	// Main game loop
	private loop = (): void => {
		if (this.state !== 'running') return;

		const currentTime = performance.now();
		let deltaTime = (currentTime - this.lastTime) / 1000; // Convert to seconds
		this.lastTime = currentTime;

		// Cap delta time to prevent huge jumps
		deltaTime = Math.min(deltaTime, 0.1);

		// Apply speed multiplier
		deltaTime *= this.speed;

		// Update simulation
		this.update(deltaTime);

		// Render
		if (this.callbacks.onRender) {
			this.callbacks.onRender(this.world);
		}

		// Schedule next frame
		this.animationFrameId = requestAnimationFrame(this.loop);
	};

	// Update simulation state
	private update(deltaTime: number): void {
		// Update simulation time
		this.world.updateTime(deltaTime);

		// Spawn food
		this.world.spawnFood(deltaTime);

		// Spawn migrants from other biomes (when conditions are favorable)
		this.world.spawnMigrants(deltaTime);

		// Process emigration (struggling creatures near edges may leave)
		this.world.processEmigration(deltaTime);

		// Spawn and decay random temperature zones
		this.world.spawnRandomZones(deltaTime);
		this.world.decayTemperatureZones();

		// Update creature behaviors and movement (use simulation time, not wall clock)
		updateCreatureBehaviors(this.world, deltaTime, this.world.simulationTime);

		// Handle collisions
		handleCollisions(this.world);

		// Cleanup dead entities
		this.world.cleanup();

		// Callback
		if (this.callbacks.onUpdate) {
			this.callbacks.onUpdate(this.world, deltaTime);
		}
	}

	// Environment controls
	setTemperature(temp: number): void {
		this.world.globalTemperature = Math.max(
			CONFIG.TEMPERATURE_MIN,
			Math.min(CONFIG.TEMPERATURE_MAX, temp)
		);
	}

	setFoodAbundance(multiplier: number): void {
		this.world.foodAbundance = Math.max(0, Math.min(3, multiplier));
	}

	setMutationRate(rate: number): void {
		this.world.mutationRate = Math.max(0, Math.min(0.3, rate));
	}

	setSpeed(speed: number): void {
		this.speed = Math.max(0.1, Math.min(10, speed));
	}

	addHeatZone(x: number, y: number, radius: number = 100): void {
		this.world.addTemperatureZone(x, y, radius, 30); // +30 degrees
	}

	addColdZone(x: number, y: number, radius: number = 100): void {
		this.world.addTemperatureZone(x, y, radius, -30); // -30 degrees
	}

	clearTemperatureZones(): void {
		this.world.clearTemperatureZones();
	}

	setRandomZonesEnabled(enabled: boolean): void {
		this.world.setRandomZonesEnabled(enabled);
	}

	getRandomZonesEnabled(): boolean {
		return this.world.randomZonesEnabled;
	}

	// Get current stats
	getStats(): ReturnType<World['getStats']> {
		return this.world.getStats();
	}
}

// Singleton instance
let engineInstance: SimulationEngine | null = null;

export function getEngine(): SimulationEngine {
	if (!engineInstance) {
		engineInstance = new SimulationEngine();
	}
	return engineInstance;
}

export function createEngine(): SimulationEngine {
	return new SimulationEngine();
}
