
import React, { useState, useEffect, useRef } from 'react';
import { Agent, WorldState, SimEvent, Building, Point } from './types';
import { INITIAL_AGENTS, BUILDINGS, WORLD_WIDTH, WORLD_HEIGHT } from './constants';
import GameEngine from './engine/GameEngine';
import { generateAgentReaction, generateEnvironmentChange } from './services/geminiService';

const App: React.FC = () => {
  const [agents, setAgents] = useState<Agent[]>(INITIAL_AGENTS);
  const [buildings, setBuildings] = useState<Building[]>(BUILDINGS);
  const [worldState, setWorldState] = useState<WorldState>({
    time: 800,
    day: 1,
    weather: 'sunny',
    events: ['Madfroggys are populating the vast new swamp.'],
  });
  const [eventLog, setEventLog] = useState<SimEvent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [hoveredAgent, setHoveredAgent] = useState<Agent | null>(null);
  const [parentInput, setParentInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const selectedAgent = agents.find(a => a.id === selectedAgentId);

  // Simulation Time - 1 real second = 1 sim minute (Balanced)
  useEffect(() => {
    const timer = setInterval(() => {
      setWorldState(prev => {
        let newTime = prev.time + 1;
        let newDay = prev.day;
        if (newTime % 100 >= 60) newTime += 40; 
        if (newTime >= 2400) {
          newTime = 0;
          newDay += 1;
        }
        return { ...prev, time: newTime, day: newDay };
      });
    }, 1000); 
    return () => clearInterval(timer);
  }, []);

  // Task Scheduler - Keeps all 15+ agents busy
  useEffect(() => {
    const taskInterval = setInterval(async () => {
      const busyAgents = agents.filter(a => a.target !== null).length;
      if (busyAgents < 8 && !isProcessing) {
        // Pick an idle agent
        const idleAgents = agents.filter(a => !a.target);
        const agentToTask = idleAgents[Math.floor(Math.random() * idleAgents.length)];
        if (agentToTask) {
          const randomDest = buildings[Math.floor(Math.random() * buildings.length)];
          const reaction = await generateAgentReaction(agentToTask, worldState, buildings, `Routine task: Go to ${randomDest.name}`);
          
          if (reaction) {
            setAgents(prev => prev.map(a => a.id === agentToTask.id ? {
              ...a,
              emotionalState: reaction.emotionalState,
              currentThought: reaction.currentThought,
              destinationName: reaction.destination,
              target: {
                x: randomDest.position.x + randomDest.size.w / 2,
                y: randomDest.position.y + randomDest.size.h / 2
              }
            } : a));
          }
        }
      }
    }, 4000);
    return () => clearInterval(taskInterval);
  }, [agents, buildings, worldState, isProcessing]);

  const triggerGlobalEvent = async (description: string) => {
    setIsProcessing(true);
    const envUpdate = await generateEnvironmentChange(worldState, description);
    if (envUpdate) {
      setWorldState(prev => ({ ...prev, weather: envUpdate.weather, events: [envUpdate.eventLog, ...prev.events].slice(0, 5) }));
      setEventLog(prev => [{ type: 'ENVIRONMENT_CHANGE', description: envUpdate.eventLog, timestamp: Date.now() }, ...prev]);
    }
    setIsProcessing(false);
  };

  const formatTime = (t: number) => {
    const hh = Math.floor(t / 100).toString().padStart(2, '0');
    const mm = (t % 100).toString().padStart(2, '0');
    return `${hh}:${mm}`;
  };

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-[#f0f0f0] font-mono overflow-hidden">
      
      {/* Left Sidebar: Character List */}
      <div className="w-[280px] bg-[#121212] border-r border-gray-800 flex flex-col overflow-hidden shadow-2xl z-20">
        <div className="p-4 border-b border-gray-800">
           <h2 className="text-[10px] font-black text-yellow-500 uppercase tracking-widest mb-2">Population Index</h2>
           <div className="text-[8px] text-gray-500 italic">{agents.length} Active Villagers</div>
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar p-2 space-y-1">
          {agents.map(a => (
            <button
              key={a.id}
              onClick={() => setSelectedAgentId(a.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-md transition-all ${selectedAgentId === a.id ? 'bg-yellow-900/30 border-l-4 border-yellow-500' : 'hover:bg-white/5 border-l-4 border-transparent'}`}
            >
              <span className="text-xl">{a.emotionalState}</span>
              <div className="text-left">
                <div className="text-[9px] font-bold uppercase">{a.name}</div>
                <div className="text-[7px] text-gray-500 truncate w-32">{a.destinationName}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Simulation Area */}
      <div className="flex-1 flex flex-col relative">
        
        {/* Top Dashboard */}
        <div className="h-20 bg-[#161616] border-b border-gray-800 flex items-center justify-between px-8 z-10 shadow-lg">
           <div>
             <h1 className="text-xl font-black text-yellow-500 tracking-tighter">MADFROGGY MEGA SWAMP</h1>
             <p className="text-[8px] text-gray-500 uppercase tracking-widest">Village Core Simulation v3.0</p>
           </div>
           <div className="flex items-center gap-6">
              <div className="bg-black border border-gray-800 rounded-md px-4 py-2 flex flex-col items-center">
                 <span className="text-green-500 text-sm font-bold">{formatTime(worldState.time)}</span>
                 <span className="text-[7px] text-gray-600 uppercase font-black">Local Time</span>
              </div>
              <div className="bg-blue-900/10 border border-blue-900/30 rounded-md px-4 py-2 flex items-center gap-2">
                 <span className="text-xl">{worldState.weather === 'sunny' ? '☀️' : (worldState.weather === 'rainy' ? '🌧️' : '⛈️')}</span>
                 <span className="text-[8px] text-blue-400 font-black uppercase">{worldState.weather}</span>
              </div>
           </div>
        </div>

        {/* Engine Viewport */}
        <div className="flex-1 relative overflow-hidden bg-black">
           <GameEngine 
             agents={agents} 
             buildings={buildings} 
             worldState={worldState}
             onAgentClick={(a) => setSelectedAgentId(a.id)}
             onAgentHover={setHoveredAgent}
             onUpdateAgents={setAgents}
             focusedAgentId={selectedAgentId}
           />

           {/* In-world overlays */}
           {hoveredAgent && (
             <div className="absolute top-6 right-6 p-4 bg-black/80 border border-yellow-500/30 backdrop-blur-md z-30 pointer-events-none rounded shadow-2xl animate-in slide-in-from-top-2">
                <div className="flex items-center gap-3 mb-2">
                   <span className="text-2xl">{hoveredAgent.emotionalState}</span>
                   <span className="text-[10px] font-black uppercase text-yellow-500">{hoveredAgent.name}</span>
                </div>
                <p className="text-[9px] italic text-blue-200">"{hoveredAgent.currentThought}"</p>
             </div>
           )}

           {isProcessing && (
             <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
                <div className="bg-black border-2 border-red-500 p-8 shadow-[0_0_40px_rgba(255,0,0,0.4)]">
                   <p className="text-[10px] font-black text-red-500 animate-pulse tracking-[0.5em] uppercase">Recalibrating Swamp Reality...</p>
                </div>
             </div>
           )}
        </div>
      </div>

      {/* Right Intelligence Panel */}
      <div className="w-[320px] bg-[#121212] border-l border-gray-800 p-4 flex flex-col gap-4 z-20">
         {selectedAgent ? (
           <div className="flex flex-col h-full">
              <h2 className="text-[10px] font-black text-blue-400 uppercase border-b border-gray-800 pb-2 mb-4">Neural Scan</h2>
              <div className="flex-1 space-y-6 overflow-y-auto no-scrollbar">
                 <div className="bg-blue-900/5 p-4 border border-blue-900/20 rounded">
                    <h3 className="text-[8px] text-blue-500 mb-2 font-bold uppercase tracking-widest underline">Thought Process</h3>
                    <p className="text-[10px] text-blue-100 leading-relaxed italic">"{selectedAgent.currentThought}"</p>
                    <p className="text-[7px] text-gray-500 mt-2">REASON: {selectedAgent.reasoning}</p>
                 </div>
                 <div className="bg-white/5 p-4 rounded border border-gray-800">
                    <h3 className="text-[8px] text-gray-400 mb-2 font-bold uppercase tracking-widest">Cognitive Matrix</h3>
                    <div className="space-y-3">
                       {Object.entries(selectedAgent.skills).map(([s, v]) => (
                         <div key={s}>
                           <div className="flex justify-between text-[7px] mb-1">
                              <span className="uppercase">{s}</span>
                              <span>{v}/10</span>
                           </div>
                           {/* Fix: Casting 'v' to any/number to satisfy TypeScript arithmetic requirements on the left-hand side */}
                           <div className="h-1 bg-black rounded overflow-hidden"><div className="h-full bg-blue-600" style={{width: `${(v as any) * 10}%`}}></div></div>
                         </div>
                       ))}
                    </div>
                 </div>
                 <div className="space-y-2">
                    <h3 className="text-[8px] text-gray-500 font-bold uppercase tracking-widest">Active Objectives</h3>
                    <div className="text-[9px] bg-black p-3 rounded border border-green-900/30 text-green-400">
                       PROCEEDING TO: {selectedAgent.destinationName}
                    </div>
                 </div>
              </div>
              <div className="mt-auto pt-4 border-t border-gray-800">
                 <button onClick={() => setSelectedAgentId(null)} className="w-full bg-red-900/20 border border-red-900/40 text-red-500 text-[9px] py-2 uppercase font-black hover:bg-red-900/40 transition-colors">Release Focus</button>
              </div>
           </div>
         ) : (
           <div className="flex flex-col h-full">
              <h2 className="text-[10px] font-black text-red-500 uppercase border-b border-gray-800 pb-2 mb-4">World Engine</h2>
              <div className="flex-1 bg-black/40 p-3 rounded overflow-y-auto no-scrollbar space-y-3 border border-gray-800/50">
                 <div className="text-[8px] text-gray-600 font-black flex items-center gap-2"><div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"></div> SYSTEM FEED</div>
                 {eventLog.slice(0, 10).map((l, i) => (
                   <div key={i} className="text-[9px] border-l-2 border-red-900 pl-2 py-1 leading-tight text-gray-400">
                      {l.description}
                   </div>
                 ))}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-800">
                 <h3 className="text-[8px] text-gray-500 mb-2 font-bold uppercase">Manual Override</h3>
                 <input 
                   type="text" value={parentInput} onChange={(e) => setParentInput(e.target.value)}
                   onKeyDown={(e) => e.key === 'Enter' && (triggerGlobalEvent(parentInput), setParentInput(''))}
                   placeholder="Command reality..."
                   className="w-full bg-black border border-gray-800 p-3 text-[10px] rounded focus:border-red-500 transition-all outline-none"
                 />
              </div>
           </div>
         )}
      </div>
    </div>
  );
};

export default App;
