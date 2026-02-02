# Evolution Simulator

A real-time evolution simulation built with Svelte 5 and TypeScript. Watch creatures evolve, adapt, and form species as they compete for resources in a dynamic environment.

## Features

- **Emergent Evolution**: All creatures start as herbivores - carnivores and omnivores emerge naturally through stress-based mutation and natural selection
- **Genetic System**: 14 traits including speed, size, diet preference, aggression, temperature tolerance, and more
- **Species Formation**: Creatures automatically cluster into species based on genetic similarity
- **Sexual & Asexual Reproduction**: Creatures choose reproduction strategies based on their traits
- **Dynamic Environment**: Adjustable temperature, food abundance, and random temperature zones
- **Real-time Visualization**: Canvas-based rendering with pan/zoom navigation
- **Detailed Statistics**: Track population, species diversity, and trait evolution over time

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Building

```bash
npm run build
npm run preview
```

## Controls

- **Mouse Drag**: Pan the camera
- **Scroll Wheel**: Zoom in/out (pointer-centric)
- **Click Creature**: Inspect individual creature traits and stats

## Simulation Mechanics

### Diet Types

- **Herbivores** (green): Eat plants, efficient metabolism, social behavior
- **Carnivores** (red): Hunt other creatures, solitary, higher energy from meat
- **Omnivores** (yellow): Flexible diet, adaptable but less specialized

### Evolution Drivers

1. **Stress-Based Mutation**: Hungry creatures produce offspring with 5x mutation rate on diet-related traits
2. **Natural Selection**: Traits that improve survival and reproduction spread through the population
3. **Competition**: Overcrowding triggers behavioral changes and emigration
4. **Temperature Zones**: Hot and cold regions favor different temperature tolerance traits

### Configuration

Adjust simulation parameters through the control panel:

- **Speed**: Simulation time multiplier
- **Temperature**: Global environment temperature
- **Food Abundance**: Rate of food spawning
- **Mutation Rate**: Base probability of trait mutation
- **Random Temperature Zones**: Toggle dynamic hot/cold zones

## Project Structure

```
src/
├── lib/
│   ├── components/       # Svelte UI components
│   │   ├── ControlPanel.svelte
│   │   ├── CreatureInspector.svelte
│   │   ├── SettingsPanel.svelte
│   │   ├── SimulationCanvas.svelte
│   │   └── StatsPanel.svelte
│   ├── entities/         # Core data models
│   │   ├── creature.ts   # Creature class and behavior
│   │   ├── food.ts       # Food spawning
│   │   ├── genetics.ts   # Trait system and mutation
│   │   └── species.ts    # Species classification
│   ├── rendering/        # Canvas rendering
│   │   └── renderer.ts
│   └── simulation/       # Simulation logic
│       ├── config.ts     # Configuration constants
│       ├── engine.ts     # Main simulation loop
│       ├── physics.ts    # Collision and behavior
│       └── world.ts      # World state management
└── routes/
    └── +page.svelte      # Main page
```

## Testing

Run unit tests:

```bash
npm run test:unit
```

Run all tests:

```bash
npm test
```

## Tech Stack

- [Svelte 5](https://svelte.dev/) - UI framework with runes
- [SvelteKit](https://kit.svelte.dev/) - Application framework
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Vitest](https://vitest.dev/) - Unit testing
- [Playwright](https://playwright.dev/) - E2E testing

## License

MIT
