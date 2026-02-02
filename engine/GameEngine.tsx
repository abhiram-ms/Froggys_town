
import React, { useRef, useEffect, useState } from 'react';
import { Agent, Building, WorldState, Point, AnimationState, TreeType } from '../types';
import { TOWN_MAP, DECORATIONS, WORLD_WIDTH, WORLD_HEIGHT } from '../constants';

interface GameEngineProps {
  agents: Agent[];
  buildings: Building[];
  worldState: WorldState;
  onAgentClick: (agent: Agent) => void;
  onAgentHover: (agent: Agent | null) => void;
  onUpdateAgents: (updater: (prev: Agent[]) => Agent[]) => void;
  focusedAgentId: string | null;
}

const GameEngine: React.FC<GameEngineProps> = ({ 
  agents, 
  buildings, 
  worldState, 
  onAgentClick, 
  onAgentHover,
  onUpdateAgents,
  focusedAgentId
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 800 });
  const frameRef = useRef(0);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const tick = (time: number) => {
      frameRef.current = Math.floor(time / 16); 
      onUpdateAgents(prevAgents => {
        let hasChanged = false;
        const nextAgents = prevAgents.map(agent => {
          if (!agent.target) {
            const idleCycle = Math.floor((frameRef.current + parseInt(agent.id.split('-')[1] || '0') * 50) / 100) % 5;
            const states: AnimationState[] = ['breathing', 'scanning', 'checking_watch', 'idle', 'gesturing'];
            if (agent.animationState !== states[idleCycle]) {
              hasChanged = true;
              return { ...agent, animationState: states[idleCycle] };
            }
            return agent;
          };

          const dx = agent.target.x - agent.position.x;
          const dy = agent.target.y - agent.position.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 5) { 
            hasChanged = true;
            return { ...agent, position: agent.target, target: null, animationState: 'idle' };
          }
          const speed = 2.5; 
          const vx = (dx / dist) * speed;
          const vy = (dy / dist) * speed;
          hasChanged = true;
          return {
            ...agent,
            animationState: 'walking' as AnimationState,
            position: { x: agent.position.x + vx, y: agent.position.y + vy }
          };
        });
        return hasChanged ? nextAgents : prevAgents;
      });
      requestAnimationFrame(tick);
    };
    const animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [onUpdateAgents]);

  const drawLabel = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string = 'white', bgColor: string = 'rgba(0,0,0,0.7)') => {
    ctx.font = 'bold 11px "Courier New", monospace';
    const padding = 6;
    const width = ctx.measureText(text).width;
    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.roundRect(x - width/2 - padding, y - 22, width + padding*2, 18, 4);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.fillText(text, x, y - 10);
  };

  const drawAsset = (ctx: CanvasRenderingContext2D, t: any, frame: number) => {
    const sway = Math.sin(frame * 0.02 + (t.x * 0.1)) * 4;
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath(); ctx.ellipse(0, 5, 15, 4, 0, 0, Math.PI * 2); ctx.fill();

    if (t.type.startsWith('flower')) {
      const colors = { flower_red: '#ff3d00', flower_blue: '#2979ff', flower_yellow: '#ffd600' };
      ctx.fillStyle = '#1b5e20'; ctx.fillRect(-1, -4, 2, 4);
      ctx.fillStyle = (colors as any)[t.type]; ctx.beginPath(); ctx.arc(sway*0.2, -6, 4, 0, 7); ctx.fill();
    } else {
      ctx.fillStyle = '#1b5e20'; ctx.beginPath(); ctx.moveTo(sway, -20); ctx.lineTo(-15, 0); ctx.lineTo(15, 0); ctx.fill();
    }
    drawLabel(ctx, t.name || t.type, 0, 10, '#a5d6a7');
    ctx.restore();
  };

  const drawBuilding = (ctx: CanvasRenderingContext2D, b: Building, isFocusedHome: boolean) => {
    ctx.save();
    ctx.translate(b.position.x, b.position.y);

    if (isFocusedHome) {
      ctx.strokeStyle = '#ffeb3b'; ctx.lineWidth = 4;
      ctx.setLineDash([8, 4]); ctx.strokeRect(-10, -10, b.size.w+20, b.size.h+20);
      ctx.setLineDash([]);
    }

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(10, 10, b.size.w, b.size.h);

    if (b.type === 'fountain') {
      ctx.fillStyle = '#40c4ff'; ctx.beginPath(); ctx.arc(b.size.w/2, b.size.h/2, b.size.w/2, 0, Math.PI*2); ctx.fill();
      const spray = Math.sin(frameRef.current * 0.2) * 8;
      ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(b.size.w/2, b.size.h/2 - 20, 5 + spray/3, 0, 7); ctx.fill();
    } else {
      ctx.fillStyle = b.type === 'house' ? '#5d4037' : '#37474f';
      ctx.fillRect(0, 0, b.size.w, b.size.h);
      ctx.fillStyle = b.type === 'house' ? '#3e2723' : '#263238';
      ctx.beginPath(); ctx.moveTo(-15, 0); ctx.lineTo(b.size.w/2, -35); ctx.lineTo(b.size.w+15, 0); ctx.fill();
      ctx.fillStyle = (frameRef.current % 100 < 50) ? '#fff176' : '#9e9d24';
      ctx.fillRect(b.size.w*0.2, b.size.h*0.3, b.size.w*0.2, b.size.h*0.2);
    }

    drawLabel(ctx, b.name, b.size.w/2, -45, isFocusedHome ? '#ffeb3b' : 'white');
    ctx.restore();
  };

  const drawHumanAgent = (ctx: CanvasRenderingContext2D, a: Agent, frame: number) => {
    ctx.save();
    ctx.translate(a.position.x, a.position.y);
    const S = 0.7;
    
    const bob = (a.animationState === 'walking') ? Math.abs(Math.sin(frame * 0.5)) * 10 : Math.sin(frame * 0.08) * 3;
    const stride = (a.animationState === 'walking') ? Math.sin(frame * 0.5) * 15 : 0;
    const armWave = (a.animationState === 'gesturing') ? Math.sin(frame * 0.2) * 20 : 0;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(0, 12*S, 18*S, 6*S, 0, 0, Math.PI*2); ctx.fill();

    // Body
    ctx.fillStyle = a.color;
    ctx.fillRect(-10*S, (0-bob)*S, 6*S, (15+stride)*S); 
    ctx.fillRect(4*S, (0-bob)*S, 6*S, (15-stride)*S);  
    ctx.fillStyle = a.traits.shirtStyle === 'suit' ? '#212121' : a.color;
    ctx.fillRect(-12*S, (-25-bob)*S, 24*S, 25*S);
    ctx.fillStyle = a.color;
    ctx.fillRect(-18*S, (-22-bob-armWave)*S, 5*S, 18*S); 
    ctx.fillRect(13*S, (-22-bob+armWave)*S, 5*S, 18*S);  
    ctx.beginPath(); ctx.ellipse(0, (-38-bob)*S, 16*S, 14*S, 0, 0, 7); ctx.fill();

    // Eyes
    ctx.fillStyle = 'white'; 
    ctx.beginPath(); ctx.arc(-7*S, (-40-bob)*S, 6*S, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(7*S, (-40-bob)*S, 6*S, 0, 7); ctx.fill();
    ctx.fillStyle = 'black';
    ctx.fillRect(-8*S, (-41-bob)*S, 3*S, 3*S);
    ctx.fillRect(6*S, (-41-bob)*S, 3*S, 3*S);

    if (a.traits.accessory === 'hat') {
      ctx.fillStyle = '#d32f2f'; ctx.fillRect(-18*S, (-52-bob)*S, 36*S, 6*S);
      ctx.fillRect(-10*S, (-65-bob)*S, 20*S, 15*S);
    } else if (a.traits.accessory === 'shades') {
      ctx.fillStyle = 'rgba(0,0,0,0.9)'; ctx.fillRect(-14*S, (-45-bob)*S, 28*S, 6*S);
    }

    drawLabel(ctx, a.name, 0, -70, a.color);
    ctx.restore();
  };

  const render = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fixed Static Scale to fit WORLD_WIDTH/HEIGHT into dimensions.width/height
    const scale = Math.min(dimensions.width / WORLD_WIDTH, dimensions.height / WORLD_HEIGHT);
    const offsetX = (dimensions.width - WORLD_WIDTH * scale) / 2;
    const offsetY = (dimensions.height - WORLD_HEIGHT * scale) / 2;

    ctx.clearRect(0,0,dimensions.width, dimensions.height);
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    // Background
    ctx.fillStyle = '#1b2e1b'; ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    
    // Roads
    TOWN_MAP.paths.forEach(p => { 
        ctx.fillStyle = '#4e342e'; ctx.fillRect(p.x, p.y, p.w, p.h);
        ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 2;
        ctx.strokeRect(p.x, p.y, p.w, p.h);
    });

    // Square
    const plaza = buildings.find(b => b.type === 'square');
    if (plaza) {
       ctx.fillStyle = '#37474f'; ctx.fillRect(plaza.position.x, plaza.position.y, plaza.size.w, plaza.size.h);
       ctx.strokeStyle = '#607d8b'; ctx.lineWidth = 1;
       for(let x=0; x<plaza.size.w; x+=50) {
         ctx.beginPath(); ctx.moveTo(plaza.position.x + x, plaza.position.y); ctx.lineTo(plaza.position.x + x, plaza.position.y + plaza.size.h); ctx.stroke();
       }
       for(let y=0; y<plaza.size.h; y+=50) {
         ctx.beginPath(); ctx.moveTo(plaza.position.x, plaza.position.y + y); ctx.lineTo(plaza.position.x + plaza.size.w, plaza.position.y + y); ctx.stroke();
       }
    }

    // River
    const path = DECORATIONS.riverPath;
    ctx.beginPath(); ctx.moveTo(path[0].x, path[0].y);
    for(let i = 1; i < path.length; i++) {
        const p = path[i] as any;
        ctx.bezierCurveTo(p.cp1x, p.cp1y, p.cp2x, p.cp2y, p.x, p.y);
    }
    ctx.strokeStyle = '#0d47a1'; ctx.lineWidth = DECORATIONS.riverWidth; ctx.stroke();

    // Scene Depth Sorting - Agents forced to front
    const scene = [
      ...buildings.map(b => ({ ...b, sortY: b.position.y + b.size.h, renderType: 'building' })),
      ...agents.map(a => ({ ...a, sortY: a.position.y + 100, renderType: 'agent' })), // Significant offset to stay in front
      ...TOWN_MAP.trees.map(t => ({ ...t, sortY: t.y, renderType: 'asset' }))
    ].sort((a,b) => a.sortY - b.sortY);

    scene.forEach(obj => {
      if (obj.renderType === 'agent') drawHumanAgent(ctx, obj as Agent, frameRef.current);
      else if (obj.renderType === 'asset') drawAsset(ctx, obj, frameRef.current);
      else {
        const isHome = focusedAgentId ? (obj as Building).id === agents.find(ag => ag.id === focusedAgentId)?.houseId : false;
        drawBuilding(ctx, obj as Building, isHome);
      }
    });

    ctx.restore();
  };

  useEffect(() => {
    const animId = requestAnimationFrame(function loop() {
        render();
        requestAnimationFrame(loop);
    });
    return () => cancelAnimationFrame(animId);
  }, [agents, buildings, worldState, dimensions, focusedAgentId]);

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden bg-black flex items-center justify-center">
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        onMouseMove={(e) => {
          const rect = canvasRef.current?.getBoundingClientRect();
          if (!rect) return;
          const scale = Math.min(dimensions.width / WORLD_WIDTH, dimensions.height / WORLD_HEIGHT);
          const offsetX = (dimensions.width - WORLD_WIDTH * scale) / 2;
          const offsetY = (dimensions.height - WORLD_HEIGHT * scale) / 2;
          const wx = (e.clientX - rect.left - offsetX) / scale;
          const wy = (e.clientY - rect.top - offsetY) / scale;
          const h = agents.find(a => Math.sqrt(Math.pow(wx - a.position.x, 2) + Math.pow(wy - a.position.y, 2)) < 50);
          onAgentHover(h || null);
        }}
        onClick={(e) => {
          const rect = canvasRef.current?.getBoundingClientRect();
          if (!rect) return;
          const scale = Math.min(dimensions.width / WORLD_WIDTH, dimensions.height / WORLD_HEIGHT);
          const offsetX = (dimensions.width - WORLD_WIDTH * scale) / 2;
          const offsetY = (dimensions.height - WORLD_HEIGHT * scale) / 2;
          const wx = (e.clientX - rect.left - offsetX) / scale;
          const wy = (e.clientY - rect.top - offsetY) / scale;
          const c = agents.find(a => Math.sqrt(Math.pow(wx - a.position.x, 2) + Math.pow(wy - a.position.y, 2)) < 50);
          if (c) onAgentClick(c);
        }}
        className="block"
      />
    </div>
  );
};

export default GameEngine;
