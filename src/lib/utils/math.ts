import type { Vector2 } from '../entities/creature';

/**
 * Calculate the magnitude (length) of a vector
 */
export function magnitude(v: Vector2): number {
	return Math.sqrt(v.x ** 2 + v.y ** 2);
}

/**
 * Calculate the distance between two points
 */
export function distance(x1: number, y1: number, x2: number, y2: number): number {
	const dx = x2 - x1;
	const dy = y2 - y1;
	return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate the distance between two Vector2 points
 */
export function distanceVec(a: Vector2, b: Vector2): number {
	const dx = b.x - a.x;
	const dy = b.y - a.y;
	return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Normalize a vector (make it unit length)
 */
export function normalize(v: Vector2): Vector2 {
	const mag = magnitude(v);
	if (mag === 0) return { x: 0, y: 0 };
	return { x: v.x / mag, y: v.y / mag };
}

/**
 * Clamp velocity to a maximum speed
 */
export function clampVelocity(v: Vector2, maxSpeed: number): Vector2 {
	const speed = magnitude(v);
	if (speed <= maxSpeed) return v;
	const scale = maxSpeed / speed;
	return { x: v.x * scale, y: v.y * scale };
}
