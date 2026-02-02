
import { GoogleGenAI, Type } from "@google/genai";
import { Agent, WorldState, Emotion, Building } from '../types';

export const generateAgentReaction = async (
  agent: Agent,
  worldState: WorldState,
  buildings: Building[],
  eventDescription: string
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = 'gemini-3-flash-preview';
  
  const prompt = `
    You are an AI character in Madfroggys Town.
    Character: ${agent.name} (${agent.backstory}). Personality: ${agent.personality}.
    Current Thought: ${agent.currentThought}
    
    World: Time ${worldState.time}, Weather ${worldState.weather}.
    Available Locations: ${buildings.map(b => `${b.name} (${b.type})`).join(', ')}.
    
    New Event: "${eventDescription}"
    
    IMPORTANT: You can visit any building, including the "Coffee Bug" shop, "Fly Store", or "Frog Square".
    Return JSON:
    - emotionalState: One of 😃, 😢, 😡, 😱, 😐, 🤔, 😲
    - currentThought: Short string (max 10 words).
    - reasoning: Brief explanation.
    - destination: Exact name of building to go to.
    - memoryUpdate: Optional new memory.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            emotionalState: { type: Type.STRING },
            currentThought: { type: Type.STRING },
            reasoning: { type: Type.STRING },
            destination: { type: Type.STRING },
            memoryUpdate: { type: Type.STRING }
          },
          required: ["emotionalState", "currentThought", "reasoning", "destination"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini Error:", error);
    return null;
  }
};

export const generateEnvironmentChange = async (
  worldState: WorldState,
  userInput: string
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = 'gemini-3-flash-preview';
  const prompt = `
    You are the "Parent AI" controller of Madfroggys Town.
    User Input: "${userInput}"
    Return JSON:
    - weather: 'sunny', 'rainy', 'stormy', or 'snowy'.
    - buildingUpdates: Array of { buildingId: number, state: 'normal' | 'burning' | 'festive' | 'damaged' }
    - eventLog: Global description string.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            weather: { type: Type.STRING },
            buildingUpdates: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  buildingId: { type: Type.INTEGER },
                  state: { type: Type.STRING }
                }
              }
            },
            eventLog: { type: Type.STRING }
          },
          required: ["weather", "buildingUpdates", "eventLog"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Parent AI Error:", error);
    return null;
  }
};
