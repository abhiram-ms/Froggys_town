
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
    events: ['The town is bustling in a single frame today.'],
  });
  const [eventLog, setEventLog] = useState<SimEvent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [hoveredAgent, setHoveredAgent] = useState<Agent | null>(null);
  const [parentInput, setParentInput] = useState('');
  const [agentChatInput, setAgentChatInput] = useState('');
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

  // Autonomous routine tasks for agents
  useEffect(() => {
    const taskInterval = setInterval(async () => {
      const activeCount = agents.filter(a => a.target !== null).length;
      if (activeCount < 8 && !isProcessing) {
        const idle = agents.filter(a => !a.target);
        const aToTask = idle[Math.floor(Math.random() * idle.length)];
        if (aToTask) {
          const dests = buildings.filter(b => b.type !== 'house' || b.id === aToTask.houseId);
          const randomDest = dests[Math.floor(Math.random() * dests.length)];
          const reaction = await generateAgentReaction(aToTask, worldState, buildings, `Task: Visit ${randomDest.name}`);
          
          if (reaction) {
            setAgents(prev => prev.map(a => a.id === aToTask.id ? {
              ...a,
              emotionalState: reaction.emotionalState,
              currentThought: reaction.currentThought,
              destinationName: reaction.destination,
              target: buildings.find(b => b.name === reaction.destination)?.position ? {
                x: buildings.find(b => b.name === reaction.destination)!.position.x + buildings.find(b => b.name === reaction.destination)!.size.w / 2,
                y: buildings.find(b => b.name === reaction.destination)!.position.y + buildings.find(b => b.name === reaction.destination)!.size.h / 2
              } : {
                x: randomDest.position.x + randomDest.size.w / 2,
                y: randomDest.position.y + randomDest.size.h / 2
              }
            } : a));
          }
        }
      }
    }, 12000);
    return () => clearInterval(taskInterval);
  }, [agents, buildings, worldState, isProcessing]);

  // Broadcast global event to all agents
  const triggerGlobalEvent = async (description: string) => {
    if (!description.trim()) return;
    setIsProcessing(true);
    const envUpdate = await generateEnvironmentChange(worldState, description);
    if (envUpdate) {
      setWorldState(prev => ({ ...prev, weather: envUpdate.weather, events: [envUpdate.eventLog, ...prev.events].slice(0, 5) }));
      setEventLog(prev => [{ type: 'ENVIRONMENT_CHANGE', description: envUpdate.eventLog, timestamp: Date.now() }, ...prev]);
      
      const updatedAgents = await Promise.all(agents.map(async (agent) => {
        const reaction = await generateAgentReaction(agent, worldState, buildings, `Global Event: ${envUpdate.eventLog}`);
        if (reaction) {
          return {
            ...agent,
            emotionalState: reaction.emotionalState,
            currentThought: reaction.currentThought,
            destinationName: reaction.destination,
            target: buildings.find(b => b.name === reaction.destination)?.position ? {
                x: buildings.find(b => b.name === reaction.destination)!.position.x + buildings.find(b => b.name === reaction.destination)!.size.w / 2,
                y: buildings.find(b => b.name === reaction.destination)!.position.y + buildings.find(b => b.name === reaction.destination)!.size.h / 2
              } : agent.target
          };
        }
        return agent;
      }));
      setAgents(updatedAgents);
    }
    setIsProcessing(false);
  };

  const chatWithAgent = async (agentId: string, message: string) => {
    if (!message.trim()) return;
    setIsProcessing(true);
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return;
    const reaction = await generateAgentReaction(agent, worldState, buildings, message);
    if (reaction) {
      setAgents(prev => prev.map(a => a.id === agentId ? {
        ...a,
        emotionalState: reaction.emotionalState,
        currentThought: reaction.currentThought,
        destinationName: reaction.destination,
        target: buildings.find(b => b.name === reaction.destination)?.position ? {
            x: buildings.find(b => b.name === reaction.destination)!.position.x + buildings.find(b => b.name === reaction.destination)!.size.w / 2,
            y: buildings.find(b => b.name === reaction.destination)!.position.y + buildings.find(b => b.name === reaction.destination)!.size.h / 2
          } : a.target
      } : a));
      setEventLog(prev => [{ type: 'AGENT_TASK', description: `Instructed ${agent.name}: ${message}`, timestamp: Date.now() }, ...prev]);
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
      
      {/* Village Roster Sidebar */}
      <div className="w-[280px] bg-[#0c0c0c] border-r border-white/10 flex flex-col overflow-hidden shadow-2xl z-20">
        <div className="p-6 border-b border-white/10 bg-black/40">
           <h2 className="text-[12px] font-black text-yellow-500 uppercase tracking-tighter mb-1">Population</h2>
           <div className="text-[9px] text-gray-500 tracking-widest">{agents.length} AGENTS ONLINE</div>
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-2">
          {agents.map(a => (
            <button
              key={a.id}
              onClick={() => setSelectedAgentId(a.id)}
              className={`w-full flex items-center gap-3 p-4 rounded-xl transition-all border-2 ${selectedAgentId === a.id ? 'bg-yellow-500/10 border-yellow-500/50 shadow-lg' : 'bg-white/5 border-transparent hover:bg-white/10'}`}
            >
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-lg border border-white/10" style={{backgroundColor: a.color}}>
                {a.emotionalState}
              </div>
              <div className="text-left">
                <div className="text-[10px] font-black uppercase text-white tracking-tighter">{a.name}</div>
                <div className="text-[8px] text-gray-500 truncate w-32">{a.destinationName}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col relative">
        {/* Top Header */}
        <div className="h-24 bg-[#0f0f0f] border-b border-white/10 flex items-center justify-between px-10 z-10">
           <div>
             <h1 className="text-2xl font-black text-yellow-500 tracking-tighter">FROGGY TOWN STATIC</h1>
             <p className="text-[9px] text-gray-600 uppercase tracking-[0.3em] font-black">Entire Town Simulation Frame</p>
           </div>
           <div className="flex items-center gap-8">
              <div className="flex flex-col items-center">
                 <div className="text-green-500 text-lg font-black tracking-widest bg-black px-6 py-2 rounded-lg border border-white/5">{formatTime(worldState.time)}</div>
                 <span className="text-[8px] text-gray-700 font-black uppercase mt-1">Clock</span>
              </div>
              <div className="flex items-center gap-4 bg-blue-500/5 px-6 py-3 rounded-xl border border-blue-500/20">
                 <span className="text-3xl">{worldState.weather === 'sunny' ? '☀️' : '🌧️'}</span>
                 <div className="flex flex-col">
                   <span className="text-[10px] text-blue-400 font-black uppercase">{worldState.weather}</span>
                 </div>
              </div>
           </div>
        </div>

        {/* Viewport */}
        <div className="flex-1 relative overflow-hidden bg-black flex items-center justify-center">
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
             <div className="absolute top-8 left-8 p-6 bg-black/95 border-2 border-yellow-500/50 backdrop-blur-xl z-30 pointer-events-none rounded-2xl shadow-2xl max-w-sm animate-in fade-in zoom-in">
                <div className="flex items-center gap-5 mb-4">
                   <div className="w-12 h-12 rounded-xl flex items-center justify-center text-3xl bg-white/5 border border-white/10">{hoveredAgent.emotionalState}</div>
                   <div>
                     <span className="text-[16px] font-black uppercase text-yellow-500 block">{hoveredAgent.name}</span>
                     <span className="text-[9px] text-gray-500 uppercase">Thought Log</span>
                   </div>
                </div>
                <div className="text-[11px] italic text-blue-100 bg-blue-500/10 p-4 rounded-xl border border-blue-500/20 leading-relaxed">
                   "{hoveredAgent.currentThought}"
                </div>
             </div>
           )}

           {isProcessing && (
             <div className="absolute inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 text-center">
                <div>
                   <div className="w-16 h-16 border-4 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin mx-auto mb-4"></div>
                   <p className="text-[12px] font-black text-yellow-500 animate-pulse uppercase">Syncing Reality...</p>
                </div>
             </div>
           )}
        </div>
      </div>

      {/* Control Interface Panel */}
      <div className="w-[360px] bg-[#0c0c0c] border-l border-white/10 flex flex-col z-20 overflow-hidden shadow-2xl">
         
         {/* Agent Instruction Chat (Toggleable) */}
         <div className={`flex flex-col transition-all duration-500 border-b border-white/10 ${selectedAgent ? 'h-[50%]' : 'h-0 overflow-hidden'}`}>
           {selectedAgent && (
             <div className="p-6 h-full flex flex-col space-y-4">
                <div className="flex justify-between items-center border-b border-blue-500/30 pb-3">
                  <h2 className="text-[12px] font-black text-blue-400 uppercase">Task: {selectedAgent.name}</h2>
                  <button onClick={() => setSelectedAgentId(null)} className="text-[10px] text-gray-600 hover:text-white uppercase font-black">Dismiss</button>
                </div>
                <div className="flex-1 overflow-y-auto no-scrollbar space-y-4">
                  <div className="bg-blue-500/5 p-4 border border-blue-500/20 rounded-xl">
                    <p className="text-[11px] text-blue-100 leading-relaxed italic">"{selectedAgent.currentThought}"</p>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-[10px] text-gray-400 font-black uppercase">Speak to Agent</h3>
                    <textarea 
                      value={agentChatInput} onChange={(e) => setAgentChatInput(e.target.value)}
                      placeholder="Instruct the agent..."
                      className="w-full bg-black border-2 border-blue-500/30 p-3 text-[11px] rounded-xl outline-none focus:border-blue-500 text-blue-100 font-bold h-24 resize-none"
                    />
                    <button onClick={() => {chatWithAgent(selectedAgent.id, agentChatInput); setAgentChatInput('');}} className="w-full bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-xl text-[10px] font-black uppercase shadow-lg transition-all active:scale-95">Update Agent</button>
                  </div>
                </div>
             </div>
           )}
         </div>

         {/* Permanent Reality Control Panel */}
         <div className="flex-1 flex flex-col p-6 bg-black/20">
            <h2 className="text-[12px] font-black text-red-500 uppercase border-b border-red-500/30 pb-3 mb-4">Reality Command</h2>
            <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 mb-6 bg-black/40 p-4 rounded-xl border border-white/5">
               <div className="text-[9px] text-green-500 font-black flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div> LOGS
               </div>
               <div className="space-y-2">
                 {eventLog.slice(0, 15).map((l, i) => (
                   <div key={i} className="text-[10px] border-l-2 border-white/10 pl-3 py-1 text-gray-400 leading-tight bg-white/5 rounded-r">
                      {l.description}
                   </div>
                 ))}
               </div>
            </div>

            <div className="pt-4 border-t border-white/10 space-y-3">
               <h3 className="text-[10px] text-gray-500 font-black uppercase tracking-widest text-center">Global Environmental Input</h3>
               <div className="flex flex-col gap-2">
                 <input 
                   type="text" value={parentInput} onChange={(e) => setParentInput(e.target.value)}
                   onKeyDown={(e) => e.key === 'Enter' && (triggerGlobalEvent(parentInput), setParentInput(''))}
                   placeholder="Affect the whole town..."
                   className="w-full bg-black border-2 border-white/10 p-4 text-[12px] rounded-xl focus:border-yellow-500/60 transition-all outline-none font-bold text-yellow-500 text-center shadow-lg"
                 />
                 <button onClick={() => {triggerGlobalEvent(parentInput); setParentInput('');}} className="w-full bg-yellow-600 hover:bg-yellow-500 text-black p-3 rounded-xl text-[10px] font-black uppercase shadow-lg active:scale-95">Broadcast Event</button>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};

export default App;
