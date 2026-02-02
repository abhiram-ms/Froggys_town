
import { Point, Building, Emotion, Agent, TreeType } from './types';

// Logical size for a static, single-frame view
export const WORLD_WIDTH = 1600;
export const WORLD_HEIGHT = 1000;

export const DECORATIONS = {
  riverPath: [
    { x: 400, y: -100 },
    { cp1x: 450, cp1y: 300, cp2x: 200, cp2y: 600, x: 600, y: 800 },
    { cp1x: 800, cp1y: 1000, cp2x: 1200, cp2y: 1100, x: 1700, y: 1100 }
  ],
  riverWidth: 100,
  bridges: [
    { x: 400, y: 350, w: 120, h: 50 }
  ]
};

const NAMES = ["Arthur", "Beatrix", "Caleb", "Diana", "Ethan", "Fiona", "George", "Helena", "Ivan", "Julia", "Kevin", "Luna", "Milo", "Nora", "Oscar", "Penny"];
const COLORS = ["#ff5555", "#55ff55", "#5555ff", "#ffff55", "#ff55ff", "#55ffff", "#ffa500", "#ffffff", "#888888", "#444444", "#a0522d", "#00ff00", "#0000ff", "#ff00ff", "#00ffff", "#ffff00"];

export const BUILDINGS: Building[] = [
  // Residential area - Compact grid
  ...NAMES.map((name, i) => ({
    id: i,
    name: `${name}'s Home`,
    type: 'house' as const,
    position: { 
        x: (i % 4 < 2 ? 50 : 1250) + (i % 2) * 160, 
        y: 50 + Math.floor(i / 4) * 180 
    },
    size: { w: 100, h: 100 },
    state: 'normal' as const,
    ownerName: name
  })),
  // Central Square & Landmarks
  { id: 100, name: "Mystic Fountain", type: 'fountain', position: { x: 750, y: 450 }, size: { w: 100, h: 100 }, state: 'normal' },
  { id: 101, name: "Plaza Central", type: 'square', position: { x: 700, y: 400 }, size: { w: 200, h: 200 }, state: 'normal' },
  { id: 102, name: "Market Hall", type: 'shop', position: { x: 650, y: 200 }, size: { w: 120, h: 100 }, state: 'normal' },
  { id: 103, name: "Froggy Brews", type: 'shop', position: { x: 830, y: 200 }, size: { w: 120, h: 100 }, state: 'normal' },
  { id: 104, name: "Swamp Library", type: 'office', position: { x: 650, y: 700 }, size: { w: 120, h: 100 }, state: 'normal' },
  { id: 105, name: "Gymnastics Lily", type: 'office', position: { x: 830, y: 700 }, size: { w: 120, h: 100 }, state: 'normal' },
];

export const TOWN_MAP = {
  paths: [
    { x: 50, y: 475, w: 1500, h: 50 }, // Main Horizontal
    { x: 775, y: 50, w: 50, h: 900 }, // Main Vertical
  ],
  trees: [
    ...Array.from({length: 60}).map((_, i) => ({
      x: 350 + Math.random() * 900,
      y: 50 + Math.random() * 900,
      type: ['bush', 'grass', 'flower_red', 'flower_blue', 'flower_yellow'][i % 5] as TreeType,
      name: ['Petal Bloom', 'Red Orchid', 'Blue Lily', 'Yellow Sun'][i % 4]
    }))
  ]
};

export const INITIAL_AGENTS: Agent[] = NAMES.map((name, i) => ({
  id: `agent-${i}`,
  name,
  color: COLORS[i % COLORS.length],
  houseId: i,
  backstory: `Town resident living at ${name}'s Home.`,
  personality: 'Unique',
  emotionalState: Emotion.NEUTRAL,
  animationState: 'idle',
  currentThought: 'Enjoying the cozy town layout.',
  reasoning: 'Everything is so accessible now.',
  position: { x: 800 + (Math.random() - 0.5) * 300, y: 500 + (Math.random() - 0.5) * 300 },
  target: null,
  destinationName: 'Plaza Central',
  skills: { social: 7, energy: 8 },
  memories: [],
  traits: {
    eyeType: 'dot',
    mouthType: 'smile',
    accessory: i % 4 === 0 ? 'hat' : (i % 4 === 1 ? 'shades' : 'none'),
    shirtStyle: 'plain',
    shirtText: name.substring(0, 3)
  }
}));
