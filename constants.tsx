
import { Point, Building, Emotion, Agent, TreeType } from './types';

export const WORLD_WIDTH = 4000;
export const WORLD_HEIGHT = 3000;

export const DECORATIONS = {
  riverPath: [
    { x: 800, y: -200 },
    { cp1x: 900, cp1y: 800, cp2x: 400, cp2y: 1500, x: 1200, y: 2200 },
    { cp1x: 1800, cp1y: 2800, cp2x: 3500, cp2y: 2500, x: 4200, y: 3000 }
  ],
  riverWidth: 180,
  bridges: [
    { x: 800, y: 800, w: 220, h: 80 },
    { x: 2800, y: 2450, w: 220, h: 80 }
  ]
};

const NAMES = ["Arthur", "Beatrix", "Caleb", "Diana", "Ethan", "Fiona", "George", "Helena", "Ivan", "Julia", "Kevin", "Luna", "Milo", "Nora", "Oscar", "Penny"];
const COLORS = ["#ff5555", "#55ff55", "#5555ff", "#ffff55", "#ff55ff", "#55ffff", "#ffa500", "#ffffff", "#888888", "#444444", "#a0522d", "#00ff00", "#0000ff", "#ff00ff", "#00ffff", "#ffff00"];

export const BUILDINGS: Building[] = [
  // Residential
  ...NAMES.map((name, i) => ({
    id: i,
    name: `${name}'s Residence`,
    type: 'house' as const,
    position: { x: 400 + (i % 4) * 350, y: 300 + Math.floor(i / 4) * 600 },
    size: { w: 120, h: 120 },
    state: 'normal' as const,
    ownerName: name
  })),
  // Town Square & Landmarks
  { id: 100, name: "Grand Fountain", type: 'fountain', position: { x: 2000, y: 1500 }, size: { w: 180, h: 180 }, state: 'normal' },
  { id: 101, name: "The Swamp Square", type: 'square', position: { x: 1850, y: 1350 }, size: { w: 500, h: 500 }, state: 'normal' },
  { id: 102, name: "Neon Fly Market", type: 'shop', position: { x: 1700, y: 1200 }, size: { w: 140, h: 120 }, state: 'normal' },
  { id: 103, name: "Brewing Bug Cafe", type: 'shop', position: { x: 2300, y: 1200 }, size: { w: 140, h: 120 }, state: 'normal' },
  { id: 104, name: "Lilypad Library", type: 'office', position: { x: 1700, y: 1800 }, size: { w: 160, h: 140 }, state: 'normal' },
  { id: 105, name: "Croak & Roll Gym", type: 'office', position: { x: 2300, y: 1800 }, size: { w: 160, h: 140 }, state: 'normal' },
  { id: 106, name: "Ancient Banyan Park", type: 'park', position: { x: 3000, y: 600 }, size: { w: 600, h: 500 }, state: 'normal' },
];

export const TOWN_MAP = {
  paths: [
    { x: 100, y: 1575, w: 3800, h: 60 }, // Main Blvd
    { x: 2075, y: 100, w: 60, h: 2800 }, // Center Avenue
    { x: 1600, y: 1200, w: 1000, h: 40 },
    { x: 1600, y: 1850, w: 1000, h: 40 },
  ],
  trees: [
    ...Array.from({length: 150}).map((_, i) => ({
      x: Math.random() * WORLD_WIDTH,
      y: Math.random() * WORLD_HEIGHT,
      type: ['bush', 'grass', 'pine', 'mango', 'coconut', 'banyan', 'sakura', 'willow', 'jackfruit', 'flower_red', 'flower_blue', 'flower_yellow'][i % 12] as TreeType,
      name: ['Ancient Oak', 'Sturdy Pine', 'Cherry Bloom', 'Coconut Palm', 'Willow Stream', 'Red Orchid', 'Blue Lily', 'Sun Flower'][i % 8]
    }))
  ]
};

export const INITIAL_AGENTS: Agent[] = NAMES.map((name, i) => ({
  id: `agent-${i}`,
  name,
  color: COLORS[i % COLORS.length],
  houseId: i,
  backstory: `The local expert of the swamp, living at the ${name}'s Residence.`,
  personality: i % 3 === 0 ? 'Extroverted' : (i % 3 === 1 ? 'Academic' : 'Crafty'),
  emotionalState: Emotion.NEUTRAL,
  animationState: 'idle',
  currentThought: 'Taking in the morning mist.',
  reasoning: 'The village looks stunning today.',
  position: { x: 2000 + (Math.random() - 0.5) * 400, y: 1500 + (Math.random() - 0.5) * 400 },
  target: null,
  destinationName: 'Central Square',
  skills: { charisma: 8, intelligence: 7 },
  memories: [],
  traits: {
    eyeType: (['slit', 'dot', 'lightning', 'laser'][i % 4]) as any,
    mouthType: (['smile', 'mask', 'cigar', 'teeth'][i % 4]) as any,
    accessory: (['shades', 'chain', 'halo', 'hat'][i % 4]) as any,
    shirtStyle: (['plain', 'striped', 'logo', 'suit'][i % 4]) as any,
    shirtText: name.substring(0, 3).toUpperCase()
  }
}));
