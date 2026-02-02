
import { Point, Building, Emotion, Agent, TreeType } from './types';

export const WORLD_WIDTH = 4000;
export const WORLD_HEIGHT = 3000;

export const DECORATIONS = {
  riverPath: [
    { x: 1000, y: -200 },
    { cp1x: 1200, cp1y: 800, cp2x: 800, cp2y: 1500, x: 1500, y: 2200 },
    { cp1x: 2200, cp1y: 2800, cp2x: 3500, cp2y: 2500, x: 4200, y: 3000 }
  ],
  riverWidth: 160,
  bridges: [
    { x: 1050, y: 600, w: 180, h: 70 },
    { x: 2800, y: 2450, w: 180, h: 70 }
  ],
  stones: [
    { x: 500, y: 500 }, { x: 2200, y: 1100 }, { x: 3500, y: 400 }, { x: 1200, y: 2500 }
  ]
};

export const TOWN_MAP = {
  paths: [
    { x: 200, y: 1400, w: 3600, h: 48 }, // Main Horizontal
    { x: 1800, y: 200, w: 48, h: 2600 }, // Main Vertical
    { x: 400, y: 400, w: 1000, h: 32 },
    { x: 2500, y: 2000, w: 1000, h: 32 },
  ],
  trees: Array.from({length: 120}).map((_, i) => ({
    x: Math.random() * WORLD_WIDTH,
    y: Math.random() * WORLD_HEIGHT,
    type: ['bush', 'grass', 'pine', 'mango', 'coconut', 'banyan', 'sakura', 'willow', 'jackfruit'][i % 9] as TreeType
  }))
};

export const BUILDINGS: Building[] = [
  { id: 0, name: "Arthur's Pad", type: 'house', position: { x: 400, y: 300 }, size: { w: 100, h: 100 }, state: 'normal' },
  { id: 1, name: "Beatrix's Villa", type: 'house', position: { x: 1600, y: 300 }, size: { w: 100, h: 100 }, state: 'normal' },
  { id: 2, name: "The Swamp Square", type: 'square', position: { x: 1800, y: 1400 }, size: { w: 250, h: 250 }, state: 'normal' },
  { id: 3, name: "Fly Market", type: 'shop', position: { x: 2200, y: 1350 }, size: { w: 120, h: 100 }, state: 'normal' },
  { id: 4, name: "Coffee Pond", type: 'shop', position: { x: 1400, y: 1350 }, size: { w: 120, h: 100 }, state: 'normal' },
  { id: 5, name: "Old Willow Park", type: 'park', position: { x: 500, y: 2200 }, size: { w: 400, h: 300 }, state: 'normal' },
  { id: 6, name: "Training Ground", type: 'office', position: { x: 3200, y: 800 }, size: { w: 150, h: 150 }, state: 'normal' },
];

const NAMES = ["Arthur", "Beatrix", "Caleb", "Diana", "Ethan", "Fiona", "George", "Helena", "Ivan", "Julia", "Kevin", "Luna", "Milo", "Nora", "Oscar", "Penny"];
const COLORS = ["#ff5555", "#55ff55", "#5555ff", "#ffff55", "#ff55ff", "#55ffff", "#ffa500", "#ffffff", "#888888", "#444444", "#a0522d", "#00ff00", "#0000ff", "#ff00ff", "#00ffff", "#ffff00"];

export const INITIAL_AGENTS: Agent[] = NAMES.map((name, i) => ({
  id: `agent-${i}`,
  name,
  color: COLORS[i % COLORS.length],
  houseId: i % 2,
  backstory: `A legendary Madfroggy known for ${name.length > 5 ? 'wisdom' : 'agility'}.`,
  personality: i % 3 === 0 ? 'Hyper' : (i % 3 === 1 ? 'Zen' : 'Curious'),
  emotionalState: Emotion.NEUTRAL,
  animationState: 'idle',
  currentThought: 'Exploring the new world.',
  reasoning: 'Everything is so large now.',
  position: { x: 400 + Math.random() * 2000, y: 400 + Math.random() * 1500 },
  target: null,
  destinationName: 'The Swamp',
  skills: { vibe: 10 },
  memories: [],
  traits: {
    eyeType: (['slit', 'dot', 'lightning', 'laser'][i % 4]) as any,
    mouthType: (['smile', 'mask', 'cigar', 'tentacles'][i % 4]) as any,
    accessory: (['shades', 'chain', 'halo', 'none'][i % 4]) as any,
    shirtStyle: (['plain', 'striped', 'logo', 'jersey'][i % 4]) as any,
    shirtText: name.substring(0, 3).toUpperCase()
  }
}));
