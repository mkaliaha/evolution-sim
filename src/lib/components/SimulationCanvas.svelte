<script lang="ts">
	import { onMount } from 'svelte';
	import type { SimulationEngine } from '../simulation/engine';
	import { Renderer } from '../rendering/renderer';
	import type { Creature } from '../entities/creature';

	interface Props {
		engine: SimulationEngine;
		onCreatureSelect?: (creature: Creature | null) => void;
	}

	let { engine, onCreatureSelect }: Props = $props();

	let canvas: HTMLCanvasElement;
	let container: HTMLDivElement;
	let renderer: Renderer | null = $state(null);

	// Pan state
	let isPanning = $state(false);
	let didPan = false; // Track if actual panning occurred (to prevent click after pan)
	let lastMouseX = 0;
	let lastMouseY = 0;
	let zoomLevel = $state(1);

	onMount(() => {
		// Set canvas size to container
		const rect = container.getBoundingClientRect();
		canvas.width = rect.width;
		canvas.height = rect.height;

		renderer = new Renderer(canvas);

		// Start engine with render callback
		engine.start({
			onRender: (world) => {
				renderer?.render(world);
			}
		});

		// Handle resize
		const resizeObserver = new ResizeObserver((entries) => {
			for (const entry of entries) {
				const { width, height } = entry.contentRect;
				canvas.width = width;
				canvas.height = height;
				renderer?.resize(width, height);
			}
		});
		resizeObserver.observe(container);

		return () => {
			resizeObserver.disconnect();
			engine.stop();
		};
	});

	function handleClick(event: MouseEvent) {
		// Don't select if we just finished panning
		if (didPan) {
			didPan = false;
			return;
		}
		if (!renderer || !onCreatureSelect) return;

		const rect = canvas.getBoundingClientRect();
		const x = event.clientX - rect.left;
		const y = event.clientY - rect.top;

		const creature = renderer.getCreatureAt(engine.world, x, y);
		onCreatureSelect(creature);
	}

	function handleContextMenu(event: MouseEvent) {
		event.preventDefault();

		if (!renderer) return;

		const rect = canvas.getBoundingClientRect();
		const x = event.clientX - rect.left;
		const y = event.clientY - rect.top;

		const [worldX, worldY] = renderer.toWorld(x, y);

		// Right-click to add temperature zone
		if (event.shiftKey) {
			engine.addColdZone(worldX, worldY);
		} else {
			engine.addHeatZone(worldX, worldY);
		}
	}

	function handleMouseDown(event: MouseEvent) {
		// Middle mouse button or left + alt for panning
		if (event.button === 1 || (event.button === 0 && event.altKey)) {
			event.preventDefault();
			isPanning = true;
			didPan = false; // Reset - will be set true if actual movement occurs
			lastMouseX = event.clientX;
			lastMouseY = event.clientY;
			canvas.style.cursor = 'grabbing';
		}
	}

	function handleMouseMove(event: MouseEvent) {
		if (!isPanning || !renderer) return;

		const deltaX = event.clientX - lastMouseX;
		const deltaY = event.clientY - lastMouseY;

		// Only pan if there's actual movement
		if (deltaX !== 0 || deltaY !== 0) {
			renderer.pan(deltaX, deltaY);
			didPan = true; // Mark that actual panning occurred
		}

		lastMouseX = event.clientX;
		lastMouseY = event.clientY;
	}

	function handleMouseUp(event: MouseEvent) {
		if (event.button === 1 || event.button === 0) {
			isPanning = false;
			canvas.style.cursor = 'crosshair';
		}
	}

	function handleMouseLeave() {
		isPanning = false;
		canvas.style.cursor = 'crosshair';
	}

	function handleWheel(event: WheelEvent) {
		event.preventDefault();

		if (!renderer) return;

		const rect = canvas.getBoundingClientRect();
		const x = event.clientX - rect.left;
		const y = event.clientY - rect.top;

		// Zoom in/out with scroll - smoother with smaller increments
		// Normalize deltaY for consistent behavior across browsers/devices
		const normalizedDelta = Math.sign(event.deltaY) * Math.min(Math.abs(event.deltaY), 100);
		const zoomDelta = -normalizedDelta * 0.001; // Negative because scroll down = zoom out
		renderer.zoomAt(x, y, zoomDelta);
		zoomLevel = renderer.getZoom();
	}

	function resetCamera() {
		if (!renderer) return;
		renderer.resetCamera();
		zoomLevel = renderer.getZoom();
	}
</script>

<div bind:this={container} class="relative h-full w-full overflow-hidden rounded-lg bg-gray-900">
	<canvas
		bind:this={canvas}
		onclick={handleClick}
		oncontextmenu={handleContextMenu}
		onmousedown={handleMouseDown}
		onmousemove={handleMouseMove}
		onmouseup={handleMouseUp}
		onmouseleave={handleMouseLeave}
		onwheel={handleWheel}
		class="block h-full w-full cursor-crosshair"
	></canvas>

	<!-- Zoom indicator and reset button -->
	<div class="absolute right-2 top-2 flex items-center gap-2">
		<span class="rounded bg-gray-800/80 px-2 py-1 text-xs text-gray-400">
			{Math.round(zoomLevel * 100)}%
		</span>
		{#if zoomLevel !== 1}
			<button
				onclick={resetCamera}
				class="rounded bg-gray-800/80 px-2 py-1 text-xs text-gray-400 transition hover:bg-gray-700 hover:text-white"
			>
				Reset
			</button>
		{/if}
	</div>

	<div class="pointer-events-none absolute bottom-2 left-2 text-xs text-gray-500">
		Click to inspect • Scroll to zoom • Alt+Drag or Middle-click to pan • Right-click for heat zone
	</div>
</div>
