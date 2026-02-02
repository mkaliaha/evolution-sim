import { describe, it, expect } from 'vitest';
import { magnitude, distance, distanceVec, normalize, clampVelocity } from './math';

describe('math utilities', () => {
	describe('magnitude', () => {
		it('should calculate magnitude of a vector', () => {
			expect(magnitude({ x: 3, y: 4 })).toBe(5);
			expect(magnitude({ x: 0, y: 0 })).toBe(0);
			expect(magnitude({ x: 1, y: 0 })).toBe(1);
			expect(magnitude({ x: 0, y: 1 })).toBe(1);
		});

		it('should handle negative values', () => {
			expect(magnitude({ x: -3, y: -4 })).toBe(5);
			expect(magnitude({ x: -3, y: 4 })).toBe(5);
		});
	});

	describe('distance', () => {
		it('should calculate distance between two points', () => {
			expect(distance(0, 0, 3, 4)).toBe(5);
			expect(distance(0, 0, 0, 0)).toBe(0);
			expect(distance(1, 1, 4, 5)).toBe(5);
		});

		it('should be commutative', () => {
			expect(distance(0, 0, 3, 4)).toBe(distance(3, 4, 0, 0));
			expect(distance(10, 20, 30, 40)).toBe(distance(30, 40, 10, 20));
		});

		it('should handle negative coordinates', () => {
			expect(distance(-3, -4, 0, 0)).toBe(5);
			expect(distance(-1, -1, 2, 3)).toBe(5);
		});
	});

	describe('distanceVec', () => {
		it('should calculate distance between two Vector2 points', () => {
			expect(distanceVec({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
			expect(distanceVec({ x: 0, y: 0 }, { x: 0, y: 0 })).toBe(0);
		});

		it('should match distance function', () => {
			const x1 = 10, y1 = 20, x2 = 30, y2 = 40;
			expect(distanceVec({ x: x1, y: y1 }, { x: x2, y: y2 })).toBe(distance(x1, y1, x2, y2));
		});
	});

	describe('normalize', () => {
		it('should normalize a vector to unit length', () => {
			const result = normalize({ x: 3, y: 4 });
			expect(result.x).toBeCloseTo(0.6);
			expect(result.y).toBeCloseTo(0.8);
			expect(magnitude(result)).toBeCloseTo(1);
		});

		it('should handle zero vector', () => {
			const result = normalize({ x: 0, y: 0 });
			expect(result.x).toBe(0);
			expect(result.y).toBe(0);
		});

		it('should normalize vectors of any magnitude', () => {
			const result1 = normalize({ x: 100, y: 0 });
			expect(result1.x).toBeCloseTo(1);
			expect(result1.y).toBeCloseTo(0);

			const result2 = normalize({ x: 0, y: -50 });
			expect(result2.x).toBeCloseTo(0);
			expect(result2.y).toBeCloseTo(-1);
		});
	});

	describe('clampVelocity', () => {
		it('should not modify velocity below max speed', () => {
			const result = clampVelocity({ x: 3, y: 4 }, 10);
			expect(result.x).toBe(3);
			expect(result.y).toBe(4);
		});

		it('should clamp velocity to max speed', () => {
			const result = clampVelocity({ x: 6, y: 8 }, 5);
			expect(magnitude(result)).toBeCloseTo(5);
			// Direction should be preserved
			expect(result.x / result.y).toBeCloseTo(6 / 8);
		});

		it('should handle velocity exactly at max speed', () => {
			const result = clampVelocity({ x: 3, y: 4 }, 5);
			expect(result.x).toBe(3);
			expect(result.y).toBe(4);
		});

		it('should preserve direction when clamping', () => {
			const original = { x: 100, y: 0 };
			const result = clampVelocity(original, 10);
			expect(result.x).toBeCloseTo(10);
			expect(result.y).toBeCloseTo(0);
		});
	});
});
