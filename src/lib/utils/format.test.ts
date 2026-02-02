import { describe, it, expect } from 'vitest';
import {
	formatTrait,
	getDietLabel,
	getDietLabelWithEmoji,
	getStateLabel,
	formatNumber,
	formatTime
} from './format';

describe('format utilities', () => {
	describe('formatTrait', () => {
		it('should format trait value as percentage', () => {
			expect(formatTrait(0)).toBe('0%');
			expect(formatTrait(0.5)).toBe('50%');
			expect(formatTrait(1)).toBe('100%');
		});

		it('should round to nearest integer', () => {
			expect(formatTrait(0.333)).toBe('33%');
			expect(formatTrait(0.666)).toBe('67%');
			expect(formatTrait(0.999)).toBe('100%');
		});
	});

	describe('getDietLabel', () => {
		it('should return Herbivore for low diet preference', () => {
			expect(getDietLabel(0)).toBe('Herbivore');
			expect(getDietLabel(0.2)).toBe('Herbivore');
			expect(getDietLabel(0.34)).toBe('Herbivore');
		});

		it('should return Carnivore for high diet preference', () => {
			expect(getDietLabel(0.66)).toBe('Carnivore');
			expect(getDietLabel(0.8)).toBe('Carnivore');
			expect(getDietLabel(1)).toBe('Carnivore');
		});

		it('should return Omnivore for middle diet preference', () => {
			expect(getDietLabel(0.35)).toBe('Omnivore');
			expect(getDietLabel(0.5)).toBe('Omnivore');
			expect(getDietLabel(0.65)).toBe('Omnivore');
		});
	});

	describe('getDietLabelWithEmoji', () => {
		it('should include emoji with diet label', () => {
			expect(getDietLabelWithEmoji(0.2)).toContain('Herbivore');
			expect(getDietLabelWithEmoji(0.5)).toContain('Omnivore');
			expect(getDietLabelWithEmoji(0.8)).toContain('Carnivore');
		});
	});

	describe('getStateLabel', () => {
		it('should return labeled states', () => {
			expect(getStateLabel('wandering')).toContain('Wandering');
			expect(getStateLabel('seeking_food')).toContain('Seeking Food');
			expect(getStateLabel('seeking_mate')).toContain('Seeking Mate');
			expect(getStateLabel('hunting')).toContain('Hunting');
			expect(getStateLabel('fleeing')).toContain('Fleeing');
		});

		it('should return original state for unknown states', () => {
			expect(getStateLabel('unknown')).toBe('unknown');
			expect(getStateLabel('custom_state')).toBe('custom_state');
		});
	});

	describe('formatNumber', () => {
		it('should format numbers with locale', () => {
			expect(formatNumber(1000)).toBe('1,000');
			expect(formatNumber(1000000)).toBe('1,000,000');
			expect(formatNumber(0)).toBe('0');
		});
	});

	describe('formatTime', () => {
		it('should format seconds', () => {
			expect(formatTime(30)).toBe('30.0s');
			expect(formatTime(0)).toBe('0.0s');
			expect(formatTime(59.9)).toBe('59.9s');
		});

		it('should format minutes and seconds', () => {
			expect(formatTime(60)).toBe('1m 0s');
			expect(formatTime(90)).toBe('1m 30s');
			expect(formatTime(125)).toBe('2m 5s');
		});
	});
});
