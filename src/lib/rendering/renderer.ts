import { CONFIG } from '../simulation/config';
import type { World } from '../simulation/world';
import type { Creature } from '../entities/creature';
import type { Food } from '../entities/food';
import type { Corpse } from '../entities/corpse';
import { magnitude, distance } from '../utils/math';

export class Renderer {
	private canvas: HTMLCanvasElement;
	private ctx: CanvasRenderingContext2D;
	private width: number;
	private height: number;

	// Camera state
	private cameraX: number = 0; // World coordinates of camera center
	private cameraY: number = 0;
	private zoom: number = 1; // 1 = fit world to screen, >1 = zoomed in
	private minZoom: number = 0.5;
	private maxZoom: number = 4;

	// Computed transform values
	private scale: number = 1;
	private offsetX: number = 0;
	private offsetY: number = 0;

	// Rendering options
	showVision: boolean = false;
	showEnergy: boolean = true;
	showTemperatureZones: boolean = true;

	constructor(canvas: HTMLCanvasElement) {
		this.canvas = canvas;
		const ctx = canvas.getContext('2d');
		if (!ctx) throw new Error('Failed to get 2D context');
		this.ctx = ctx;

		this.width = canvas.width;
		this.height = canvas.height;

		// Initialize camera to center of world
		this.cameraX = CONFIG.WORLD_WIDTH / 2;
		this.cameraY = CONFIG.WORLD_HEIGHT / 2;

		this.updateTransform();
	}

	// Calculate transform based on camera position and zoom
	private updateTransform(): void {
		// Base scale to fit world in viewport
		const baseScaleX = this.width / CONFIG.WORLD_WIDTH;
		const baseScaleY = this.height / CONFIG.WORLD_HEIGHT;
		const baseScale = Math.min(baseScaleX, baseScaleY);

		// Apply zoom
		this.scale = baseScale * this.zoom;

		// Calculate offset to center camera position in viewport
		this.offsetX = this.width / 2 - this.cameraX * this.scale;
		this.offsetY = this.height / 2 - this.cameraY * this.scale;
	}

	// Update canvas size
	resize(width: number, height: number): void {
		this.canvas.width = width;
		this.canvas.height = height;
		this.width = width;
		this.height = height;
		this.updateTransform();
	}

	// Pan camera by delta in screen pixels
	pan(deltaX: number, deltaY: number): void {
		this.cameraX -= deltaX / this.scale;
		this.cameraY -= deltaY / this.scale;
		this.updateTransform();
	}

	// Zoom at a specific screen position (pointer-centric zoom)
	zoomAt(screenX: number, screenY: number, zoomDelta: number): void {
		// Get world position under mouse BEFORE zoom
		const [worldXBefore, worldYBefore] = this.toWorld(screenX, screenY);

		// Apply zoom
		const oldZoom = this.zoom;
		this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom * (1 + zoomDelta)));

		if (this.zoom === oldZoom) return;

		// Update transform with new zoom
		this.updateTransform();

		// Get world position under mouse AFTER zoom
		const [worldXAfter, worldYAfter] = this.toWorld(screenX, screenY);

		// Adjust camera to keep the original world position under the mouse
		this.cameraX += worldXBefore - worldXAfter;
		this.cameraY += worldYBefore - worldYAfter;

		// Update transform again with adjusted camera
		this.updateTransform();
	}

	// Reset camera to fit world
	resetCamera(): void {
		this.cameraX = CONFIG.WORLD_WIDTH / 2;
		this.cameraY = CONFIG.WORLD_HEIGHT / 2;
		this.zoom = 1;
		this.updateTransform();
	}

	// Get current zoom level
	getZoom(): number {
		return this.zoom;
	}

	// Convert canvas coordinates to world coordinates
	toWorld(canvasX: number, canvasY: number): [number, number] {
		return [
			(canvasX - this.offsetX) / this.scale,
			(canvasY - this.offsetY) / this.scale
		];
	}

	// Main render function
	render(world: World): void {
		const ctx = this.ctx;

		// Clear canvas
		ctx.fillStyle = '#1a1a2e';
		ctx.fillRect(0, 0, this.width, this.height);

		// Draw world boundary
		ctx.save();
		ctx.translate(this.offsetX, this.offsetY);
		ctx.scale(this.scale, this.scale);

		// World background
		ctx.fillStyle = '#16213e';
		ctx.fillRect(0, 0, CONFIG.WORLD_WIDTH, CONFIG.WORLD_HEIGHT);

		// Temperature zones
		if (this.showTemperatureZones) {
			this.renderTemperatureZones(world);
		}

		// Grid (subtle)
		this.renderGrid();

		// Food
		this.renderFood(world.food);

		// Corpses (behind creatures, slightly faded)
		this.renderCorpses(world.corpses, world.simulationTime);

		// Creatures
		this.renderCreatures(world.creatures);

		ctx.restore();
	}

	private renderGrid(): void {
		const ctx = this.ctx;
		ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
		ctx.lineWidth = 1 / this.scale;

		const gridSize = 50;
		for (let x = 0; x <= CONFIG.WORLD_WIDTH; x += gridSize) {
			ctx.beginPath();
			ctx.moveTo(x, 0);
			ctx.lineTo(x, CONFIG.WORLD_HEIGHT);
			ctx.stroke();
		}
		for (let y = 0; y <= CONFIG.WORLD_HEIGHT; y += gridSize) {
			ctx.beginPath();
			ctx.moveTo(0, y);
			ctx.lineTo(CONFIG.WORLD_WIDTH, y);
			ctx.stroke();
		}
	}

	private renderTemperatureZones(world: World): void {
		const ctx = this.ctx;

		for (const zone of world.temperatureZones) {
			const gradient = ctx.createRadialGradient(
				zone.x,
				zone.y,
				0,
				zone.x,
				zone.y,
				zone.radius
			);

			if (zone.temperature > 0) {
				// Hot zone - red
				gradient.addColorStop(0, 'rgba(255, 100, 50, 0.4)');
				gradient.addColorStop(1, 'rgba(255, 100, 50, 0)');
			} else {
				// Cold zone - blue
				gradient.addColorStop(0, 'rgba(50, 150, 255, 0.4)');
				gradient.addColorStop(1, 'rgba(50, 150, 255, 0)');
			}

			ctx.fillStyle = gradient;
			ctx.beginPath();
			ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2);
			ctx.fill();
		}
	}

	private renderFood(foods: Food[]): void {
		const ctx = this.ctx;

		for (const food of foods) {
			if (food.isConsumed) continue;

			// Food glow
			const gradient = ctx.createRadialGradient(
				food.position.x,
				food.position.y,
				0,
				food.position.x,
				food.position.y,
				food.size * 2
			);
			gradient.addColorStop(0, 'rgba(100, 255, 100, 0.3)');
			gradient.addColorStop(1, 'rgba(100, 255, 100, 0)');
			ctx.fillStyle = gradient;
			ctx.beginPath();
			ctx.arc(food.position.x, food.position.y, food.size * 2, 0, Math.PI * 2);
			ctx.fill();

			// Food body
			ctx.fillStyle = '#4ade80';
			ctx.beginPath();
			ctx.arc(food.position.x, food.position.y, food.size, 0, Math.PI * 2);
			ctx.fill();
		}
	}

	private renderCorpses(corpses: Corpse[], currentTime: number): void {
		const ctx = this.ctx;

		for (const corpse of corpses) {
			if (corpse.isConsumed) continue;

			// Fade based on decay progress
			const decay = corpse.getDecayProgress(currentTime);
			const alpha = 0.8 - decay * 0.6; // Fade from 0.8 to 0.2

			// Corpse glow (darker, reddish)
			const gradient = ctx.createRadialGradient(
				corpse.position.x,
				corpse.position.y,
				0,
				corpse.position.x,
				corpse.position.y,
				corpse.size * 1.5
			);
			gradient.addColorStop(0, `rgba(139, 69, 69, ${alpha * 0.4})`);
			gradient.addColorStop(1, 'rgba(139, 69, 69, 0)');
			ctx.fillStyle = gradient;
			ctx.beginPath();
			ctx.arc(corpse.position.x, corpse.position.y, corpse.size * 1.5, 0, Math.PI * 2);
			ctx.fill();

			// Corpse body (brownish-red, gets darker as it decays)
			const red = Math.floor(139 - decay * 50);
			const green = Math.floor(69 - decay * 30);
			const blue = Math.floor(69 - decay * 30);
			ctx.fillStyle = `rgba(${red}, ${green}, ${blue}, ${alpha})`;
			ctx.beginPath();
			ctx.arc(corpse.position.x, corpse.position.y, corpse.size, 0, Math.PI * 2);
			ctx.fill();

			// X mark to indicate it's a corpse
			ctx.strokeStyle = `rgba(0, 0, 0, ${alpha * 0.5})`;
			ctx.lineWidth = 1;
			const xSize = corpse.size * 0.5;
			ctx.beginPath();
			ctx.moveTo(corpse.position.x - xSize, corpse.position.y - xSize);
			ctx.lineTo(corpse.position.x + xSize, corpse.position.y + xSize);
			ctx.moveTo(corpse.position.x + xSize, corpse.position.y - xSize);
			ctx.lineTo(corpse.position.x - xSize, corpse.position.y + xSize);
			ctx.stroke();
		}
	}

	private renderCreatures(creatures: Creature[]): void {
		const ctx = this.ctx;

		for (const creature of creatures) {
			if (!creature.isAlive) continue;

			const x = creature.position.x;
			const y = creature.position.y;
			const size = creature.size;
			const isCarnivore = creature.isCarnivore;

			// Vision range (optional)
			if (this.showVision) {
				ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
				ctx.lineWidth = 1 / this.scale;
				ctx.beginPath();
				ctx.arc(x, y, creature.visionRange, 0, Math.PI * 2);
				ctx.stroke();
			}

			// Body glow based on energy
			if (creature.energyPercent > 0.5) {
				const glowSize = size * 1.5;
				const gradient = ctx.createRadialGradient(x, y, size * 0.5, x, y, glowSize);
				gradient.addColorStop(0, creature.color.replace('rgb', 'rgba').replace(')', ', 0.3)'));
				gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
				ctx.fillStyle = gradient;
				ctx.beginPath();
				ctx.arc(x, y, glowSize, 0, Math.PI * 2);
				ctx.fill();
			}

			// Main body - triangle for carnivores, circle for others
			ctx.fillStyle = creature.color;

			if (isCarnivore) {
				// Draw triangle for carnivores (pointing in movement direction)
				const speed = magnitude(creature.velocity);
				let angle = 0;
				if (speed > 1) {
					angle = Math.atan2(creature.velocity.y, creature.velocity.x);
				}

				ctx.save();
				ctx.translate(x, y);
				ctx.rotate(angle);

				ctx.beginPath();
				ctx.moveTo(size, 0);
				ctx.lineTo(-size * 0.7, -size * 0.7);
				ctx.lineTo(-size * 0.7, size * 0.7);
				ctx.closePath();
				ctx.fill();

				ctx.restore();
			} else {
				// Draw circle for herbivores/omnivores
				ctx.beginPath();
				ctx.arc(x, y, size, 0, Math.PI * 2);
				ctx.fill();

				// Direction indicator for non-carnivores
				const speed = magnitude(creature.velocity);
				if (speed > 1) {
					const dirX = creature.velocity.x / speed;
					const dirY = creature.velocity.y / speed;
					ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
					ctx.lineWidth = 2 / this.scale;
					ctx.beginPath();
					ctx.moveTo(x, y);
					ctx.lineTo(x + dirX * size * 1.5, y + dirY * size * 1.5);
					ctx.stroke();
				}
			}

			// Energy bar (optional)
			if (this.showEnergy) {
				const barWidth = size * 2;
				const barHeight = 3 / this.scale;
				const barX = x - barWidth / 2;
				const barY = y - size - 6 / this.scale;

				// Background
				ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
				ctx.fillRect(barX, barY, barWidth, barHeight);

				// Energy fill - red tint for carnivores
				const energyWidth = barWidth * Math.max(0, creature.energyPercent);
				let energyColor: string;
				if (isCarnivore) {
					energyColor =
						creature.energyPercent > 0.5
							? '#ef4444'
							: creature.energyPercent > 0.25
								? '#f97316'
								: '#7f1d1d';
				} else {
					energyColor =
						creature.energyPercent > 0.5
							? '#4ade80'
							: creature.energyPercent > 0.25
								? '#fbbf24'
								: '#ef4444';
				}
				ctx.fillStyle = energyColor;
				ctx.fillRect(barX, barY, energyWidth, barHeight);
			}
		}
	}

	// Get creature at canvas position
	getCreatureAt(world: World, canvasX: number, canvasY: number): Creature | null {
		const [worldX, worldY] = this.toWorld(canvasX, canvasY);

		for (const creature of world.creatures) {
			if (!creature.isAlive) continue;

			const dist = distance(worldX, worldY, creature.position.x, creature.position.y);

			if (dist <= creature.size) {
				return creature;
			}
		}

		return null;
	}
}
