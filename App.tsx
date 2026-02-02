
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
    events: ['The Grand Swamp Square is bustling with activity.'],
  });
  const [eventLog, setEventLog] = useState<SimEvent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [hoveredAgent, setHoveredAgent] = useState<Agent | null>(null);
  const [parentInput, setParentInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const selectedAgent = agents.find(a => a.id === selectedAgentId);

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

  useEffect(() => {
    const taskInterval = setInterval(async () => {
      const activeCount = agents.filter(a => a.target !== null).length;
      if (activeCount < 10 && !isProcessing) {
        const idle = agents.filter(a => !a.target);
        const aToTask = idle[Math.floor(Math.random() * idle.length)];
        if (aToTask) {
          const dests = buildings.filter(b => b.type !== 'house' || b.id === aToTask.houseId);
          const randomDest = dests[Math.floor(Math.random() * dests.length)];
          const reaction = await generateAgentReaction(aToTask, worldState, buildings, `Task: Head to ${randomDest.name}`);
          
          if (reaction) {
            setAgents(prev => prev.map(a => a.id === aToTask.id ? {
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
    }, 5000);
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
    <div className="flex h-screen bg-[#050505] text-[#e0e0e0] font-mono overflow-hidden">
      
      {/* Village Roster */}
      <div className="w-[300px] bg-[#0c0c0c] border-r border-white/10 flex flex-col overflow-hidden shadow-2xl z-20">
        <div className="p-6 border-b border-white/10 bg-black/40">
           <h2 className="text-[12px] font-black text-yellow-500 uppercase tracking-tighter mb-1">Villager Roster</h2>
           <div className="text-[9px] text-gray-500 tracking-widest">{agents.length} HUMAN-LIKE FROGGIES</div>
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-2">
          {agents.map(a => (
            <button
              key={a.id}
              onClick={() => setSelectedAgentId(a.id)}
              className={`w-full flex items-center gap-4 p-4 rounded-lg transition-all border-2 ${selectedAgentId === a.id ? 'bg-yellow-500/10 border-yellow-500/50 shadow-[0_0_15px_rgba(255,215,0,0.1)]' : 'bg-white/5 border-transparent hover:border-white/20'}`}
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-inner border border-white/10" style={{backgroundColor: a.color}}>
                {a.emotionalState}
              </div>
              <div className="text-left">
                <div className="text-[10px] font-black uppercase text-white tracking-tighter">{a.name}</div>
                <div className="text-[8px] text-gray-500 font-bold uppercase tracking-widest truncate w-32">{a.destinationName}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col relative">
        <div className="h-24 bg-[#0f0f0f] border-b border-white/10 flex items-center justify-between px-10 z-10">
           <div>
             <h1 className="text-2xl font-black text-yellow-500 tracking-tighter shadow-yellow-900">MADFROGGY METROPOLIS</h1>
             <p className="text-[9px] text-gray-600 uppercase tracking-[0.3em] font-black">AI Swarm Engine v4.0</p>
           </div>
           <div className="flex items-center gap-8">
              <div className="flex flex-col items-center gap-1">
                 <div className="text-green-500 text-lg font-black tracking-widest bg-black px-5 py-2 rounded-lg border border-white/5">{formatTime(worldState.time)}</div>
                 <span className="text-[8px] text-gray-700 font-black uppercase">Clock Synced</span>
              </div>
              <div className="flex items-center gap-4 bg-blue-500/5 px-6 py-3 rounded-lg border border-blue-500/20">
                 <span className="text-3xl drop-shadow-lg">{worldState.weather === 'sunny' ? '☀️' : '🌧️'}</span>
                 <div className="flex flex-col">
                   <span className="text-[10px] text-blue-400 font-black uppercase tracking-tighter">{worldState.weather}</span>
                   <span className="text-[7px] text-blue-900 uppercase font-black">Atmosphere</span>
                 </div>
              </div>
           </div>
        </div>

        <div className="flex-1 relative overflow-hidden">
           <GameEngine 
             agents={agents} 
             buildings={buildings} 
             worldState={worldState}
             onAgentClick={(a) => setSelectedAgentId(a.id)}
             onAgentHover={setHoveredAgent}
             onUpdateAgents={setAgents}
             focusedAgentId={selectedAgentId}
           />

           {hoveredAgent && (
             <div className="absolute top-8 left-8 p-6 bg-black/90 border-2 border-yellow-500/40 backdrop-blur-lg z-30 pointer-events-none rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-300">
                <div className="flex items-center gap-4 mb-4">
                   <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-4xl bg-white/5 border border-white/10 shadow-lg">{hoveredAgent.emotionalState}</div>
                   <div>
                     <span className="text-[14px] font-black uppercase text-yellow-500 block leading-none">{hoveredAgent.name}</span>
                     <span className="text-[8px] text-gray-500 uppercase font-black tracking-widest">Village Resident</span>
                   </div>
                </div>
                <div className="space-y-3">
                   <div className="text-[10px] italic text-blue-100 bg-blue-500/10 p-3 rounded-lg border border-blue-500/20 leading-relaxed">"{hoveredAgent.currentThought}"</div>
                   <div className="flex justify-between items-center text-[8px] font-bold text-gray-400 uppercase">
                      <span>Destination</span>
                      <span className="text-green-500">{hoveredAgent.destinationName}</span>
                   </div>
                </div>
             </div>
           )}

           {isProcessing && (
             <div className="absolute inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50">
                <div className="bg-black border-4 border-red-500/50 p-12 shadow-[0_0_80px_rgba(255,0,0,0.2)] rounded-3xl text-center">
                   <div className="w-20 h-20 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-8"></div>
                   <p className="text-[12px] font-black text-red-500 animate-pulse tracking-[0.6em] uppercase">Constructing Reality Matrices</p>
                </div>
             </div>
           )}
        </div>
      </div>

      <div className="w-[340px] bg-[#0c0c0c] border-l border-white/10 p-6 flex flex-col gap-6 z-20">
         {selectedAgent ? (
           <div className="flex flex-col h-full animate-in slide-in-from-right-10 duration-500">
              <h2 className="text-[12px] font-black text-blue-400 uppercase border-b-2 border-blue-500/30 pb-3 mb-6">Cognitive Interface</h2>
              <div className="flex-1 space-y-8 overflow-y-auto no-scrollbar pr-2">
                 <div className="bg-blue-500/5 p-5 border-2 border-blue-500/20 rounded-2xl shadow-inner">
                    <h3 className="text-[9px] text-blue-500 mb-3 font-black uppercase tracking-widest">Stream of Consciousness</h3>
                    <p className="text-[11px] text-blue-100 leading-relaxed italic font-medium">"{selectedAgent.currentThought}"</p>
                    <div className="mt-4 pt-4 border-t border-white/5">
                       <p className="text-[8px] text-gray-500 uppercase mb-1">Logical Rationale</p>
                       <p className="text-[9px] text-gray-400 leading-tight">{selectedAgent.reasoning}</p>
                    </div>
                 </div>
                 <div className="bg-white/5 p-6 rounded-2xl border border-white/10 shadow-lg">
                    <h3 className="text-[9px] text-gray-400 mb-4 font-black uppercase tracking-widest">Attribute Matrix</h3>
                    <div className="space-y-4">
                       {Object.entries(selectedAgent.skills).map(([s, v]) => (
                         <div key={s}>
                           <div className="flex justify-between text-[8px] mb-2 font-black uppercase">
                              <span className="text-gray-500">{s}</span>
                              <span className="text-blue-400">{v}/10</span>
                           </div>
                           <div className="h-2 bg-black rounded-full overflow-hidden border border-white/5">
                             <div className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" style={{width: `${(v as any) * 10}%`}}></div>
                           </div>
                         </div>
                       ))}
                    </div>
                 </div>
                 <div className="space-y-3">
                    <h3 className="text-[9px] text-gray-600 font-black uppercase tracking-widest">Active Waypoint</h3>
                    <div className="text-[11px] bg-green-500/10 p-4 rounded-xl border-2 border-green-500/20 text-green-400 font-bold uppercase shadow-inner">
                       {selectedAgent.destinationName}
                    </div>
                 </div>
              </div>
              <div className="mt-auto pt-6 border-t border-white/10">
                 <button onClick={() => setSelectedAgentId(null)} className="w-full bg-red-500/10 border-2 border-red-500/30 text-red-500 text-[10px] py-4 uppercase font-black rounded-xl hover:bg-red-500/20 transition-all shadow-lg active:scale-95">Disengage Focus</button>
              </div>
           </div>
         ) : (
           <div className="flex flex-col h-full animate-in fade-in duration-700">
              <h2 className="text-[12px] font-black text-red-500 uppercase border-b-2 border-red-500/30 pb-3 mb-6">Simulation Hub</h2>
              <div className="flex-1 bg-black/60 p-5 rounded-2xl overflow-y-auto no-scrollbar space-y-4 border-2 border-white/5 shadow-inner">
                 <div className="text-[9px] text-green-500 font-black flex items-center gap-3"><div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div> LIVE FEED ACTIVE</div>
                 <div className="space-y-3">
                   {eventLog.slice(0, 15).map((l, i) => (
                     <div key={i} className="text-[10px] border-l-2 border-white/20 pl-4 py-2 leading-relaxed text-gray-400 bg-white/5 rounded-r-lg">
                        {l.description}
                     </div>
                   ))}
                 </div>
              </div>
              <div className="mt-8 pt-8 border-t border-white/10">
                 <h3 className="text-[9px] text-gray-600 mb-3 font-black uppercase tracking-widest">Divine Command Input</h3>
                 <input 
                   type="text" value={parentInput} onChange={(e) => setParentInput(e.target.value)}
                   onKeyDown={(e) => e.key === 'Enter' && (triggerGlobalEvent(parentInput), setParentInput(''))}
                   placeholder="Alter the environment..."
                   className="w-full bg-black border-2 border-white/10 p-4 text-[11px] rounded-xl focus:border-yellow-500/50 transition-all outline-none font-bold text-yellow-500 shadow-lg"
                 />
                 <p className="text-[7px] text-gray-700 mt-3 text-center uppercase font-black">Reality warping protocols standing by</p>
              </div>
           </div>
         )}
      </div>
    </div>
  );
};

export default App;
