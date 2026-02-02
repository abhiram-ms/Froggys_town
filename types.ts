
export enum Emotion {
  HAPPY = '😃',
  SAD = '😢',
  ANGRY = '😡',
  PANIC = '😱',
  NEUTRAL = '😐',
  THINKING = '🤔',
  SURPRISED = '😲'
}

export type AnimationState = 'idle' | 'walking' | 'working' | 'scanning' | 'breathing' | 'checking_watch';
export type Point = { x: number; y: number };
export type TreeType = 'pine' | 'banyan' | 'willow' | 'sakura' | 'coconut' | 'mango' | 'jackfruit' | 'bush' | 'grass';

export interface Agent {
  id: string;
  name: string;
  backstory: string;
  personality: string;
  emotionalState: Emotion;
  animationState: AnimationState;
  currentThought: string;
  reasoning: string;
  position: Point;
  target: Point | null;
  destinationName: string;
  skills: Record<string, number>;
  memories: string[];
  color: string;
  houseId: number;
  // Unique Madfroggy Traits
  traits: {
    eyeType: 'slit' | 'dot' | 'lightning' | 'laser';
    mouthType: 'smile' | 'mask' | 'cigar' | 'tentacles' | 'teeth';
    accessory: 'shades' | 'chain' | 'halo' | 'none';
    shirtStyle: 'plain' | 'striped' | 'logo' | 'jersey';
    shirtText?: string;
  };
}

export interface Building {
  id: number;
  name: string;
  type: 'house' | 'shop' | 'park' | 'office' | 'square' | 'water';
  position: Point;
  size: { w: number; h: number };
  state: 'normal' | 'burning' | 'festive' | 'damaged';
  ownerId?: string;
}

export interface WorldState {
  time: number; // 0 to 2400
  day: number;
  weather: 'sunny' | 'rainy' | 'stormy' | 'snowy';
  events: string[];
}

export interface SimEvent {
  type: 'ENVIRONMENT_CHANGE' | 'AGENT_TASK' | 'AGENT_INTERACTION';
  description: string;
  timestamp: number;
}
