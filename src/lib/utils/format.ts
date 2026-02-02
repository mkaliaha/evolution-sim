/**
 * Format a trait value (0-1) as a percentage string
 */
export function formatTrait(value: number): string {
	return (value * 100).toFixed(0) + '%';
}

/**
 * Get a human-readable label for a diet preference value
 */
export function getDietLabel(diet: number): string {
	if (diet < 0.35) return 'Herbivore';
	if (diet > 0.65) return 'Carnivore';
	return 'Omnivore';
}

/**
 * Get a human-readable label with emoji for a diet preference value
 */
export function getDietLabelWithEmoji(diet: number): string {
	if (diet < 0.35) return '🌿 Herbivore';
	if (diet > 0.65) return '🥩 Carnivore';
	return '🍽️ Omnivore';
}

/**
 * Get a human-readable label for a creature state
 */
export function getStateLabel(state: string): string {
	switch (state) {
		case 'wandering':
			return '😊 Wandering';
		case 'seeking_food':
			return '🔍 Seeking Food';
		case 'seeking_mate':
			return '💕 Seeking Mate';
		case 'hunting':
			return '🎯 Hunting';
		case 'fleeing':
			return '😰 Fleeing';
		default:
			return state;
	}
}

/**
 * Format a number with commas for thousands
 */
export function formatNumber(value: number): string {
	return value.toLocaleString();
}

/**
 * Format seconds as a human-readable time string
 */
export function formatTime(seconds: number): string {
	if (seconds < 60) return `${seconds.toFixed(1)}s`;
	const mins = Math.floor(seconds / 60);
	const secs = seconds % 60;
	return `${mins}m ${secs.toFixed(0)}s`;
}
