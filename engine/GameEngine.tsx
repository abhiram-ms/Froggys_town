
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
  const cam = useRef({ 
    x: WORLD_WIDTH / 2 - 400, 
    y: WORLD_HEIGHT / 2 - 300, 
    zoom: 0.85, 
    isDragging: false, 
    lastMouseX: 0, 
    lastMouseY: 0,
    velX: 0,
    velY: 0
  });

  const frameRef = useRef(0);
  const [dimensions, setDimensions] = useState({ width: 1920, height: 1080 });

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
      frameRef.current = Math.floor(time / 16); // 60fps target
      onUpdateAgents(prevAgents => {
        let hasChanged = false;
        const nextAgents = prevAgents.map(agent => {
          if (!agent.target) {
            const idleCycle = Math.floor((frameRef.current + parseInt(agent.id.split('-')[1] || '0') * 50) / 120) % 5;
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
          const speed = 3.5; 
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

  const drawLabel = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string = 'white', bgColor: string = 'rgba(0,0,0,0.6)') => {
    ctx.font = 'bold 12px "Courier New", monospace';
    const padding = 6;
    const width = ctx.measureText(text).width;
    ctx.fillStyle = bgColor;
    ctx.fillRect(x - width/2 - padding, y - 24, width + padding*2, 20);
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.fillText(text, x, y - 10);
  };

  const drawAsset = (ctx: CanvasRenderingContext2D, t: any, frame: number) => {
    const treeOffset = (t.x * 0.1 + t.y * 0.1);
    const sway = Math.sin(frame * 0.01 + treeOffset) * 6;
    ctx.save();
    ctx.translate(t.x, t.y);

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath(); ctx.ellipse(0, 10, 20, 6, 0, 0, Math.PI * 2); ctx.fill();

    if (t.type.startsWith('flower')) {
      const colors = { flower_red: '#ff5555', flower_blue: '#5555ff', flower_yellow: '#ffff55' };
      ctx.fillStyle = '#2e7d32'; ctx.fillRect(-1, -5, 2, 5);
      ctx.fillStyle = (colors as any)[t.type]; ctx.beginPath(); ctx.arc(sway*0.2, -6, 4, 0, 7); ctx.fill();
    } else if (t.type === 'banyan') {
      ctx.fillStyle = '#4e342e'; ctx.fillRect(-12, -5, 24, 30);
      const leafColors = ['#1b5e20', '#2e7d32', '#388e3c'];
      for (let i = 0; i < 30; i++) {
        ctx.fillStyle = leafColors[i % 3];
        const px = Math.cos(i*1.1)*50 + sway*(0.2+i/30);
        const py = Math.sin(i*1.1)*30 - 45;
        ctx.fillRect(px - 12, py - 10, 24, 20);
      }
    } else if (t.type === 'coconut') {
      ctx.fillStyle = '#6d4c41'; ctx.fillRect(-5, -60, 10, 60);
      ctx.strokeStyle = '#1b5e20'; ctx.lineWidth = 4;
      for (let i = 0; i < 6; i++) {
        const angle = (i/6)*Math.PI*2;
        ctx.beginPath(); ctx.moveTo(0, -60);
        ctx.quadraticCurveTo(Math.cos(angle)*50 + sway, -60+Math.sin(angle)*20, Math.cos(angle)*80 + sway, -40+Math.sin(angle)*30);
        ctx.stroke();
      }
    } else {
      ctx.fillStyle = '#0a210f'; ctx.beginPath(); ctx.moveTo(sway, -80); ctx.lineTo(-40, 0); ctx.lineTo(40, 0); ctx.fill();
    }
    
    // Label
    if (cam.current.zoom > 1.2) drawLabel(ctx, t.name || t.type, 0, 10, '#81c784');
    ctx.restore();
  };

  const drawBuilding = (ctx: CanvasRenderingContext2D, b: Building, isFocusedHome: boolean) => {
    ctx.save();
    ctx.translate(b.position.x, b.position.y);

    // Highlight
    if (isFocusedHome) {
      ctx.strokeStyle = '#ffff00'; ctx.lineWidth = 6;
      ctx.setLineDash([10, 5]); ctx.strokeRect(-10, -10, b.size.w+20, b.size.h+20);
      ctx.setLineDash([]);
    }

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(10, 10, b.size.w, b.size.h);

    // Structure
    if (b.type === 'fountain') {
      const fGrad = ctx.createRadialGradient(b.size.w/2, b.size.h/2, 0, b.size.w/2, b.size.h/2, b.size.w/2);
      fGrad.addColorStop(0, '#00b0ff'); fGrad.addColorStop(1, '#455a64');
      ctx.fillStyle = fGrad; ctx.beginPath(); ctx.arc(b.size.w/2, b.size.h/2, b.size.w/2, 0, Math.PI*2); ctx.fill();
      // Animated Water Spout
      const spray = Math.sin(frameRef.current * 0.1) * 10;
      ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(b.size.w/2, b.size.h/2 - 20, 5 + spray/4, 0, 7); ctx.fill();
    } else {
      ctx.fillStyle = b.type === 'house' ? '#5d4037' : '#37474f';
      ctx.fillRect(0, 0, b.size.w, b.size.h);
      // Roof
      ctx.fillStyle = b.type === 'house' ? '#3e2723' : '#263238';
      ctx.beginPath(); ctx.moveTo(-15, 0); ctx.lineTo(b.size.w/2, -40); ctx.lineTo(b.size.w+15, 0); ctx.fill();
      // Windows
      ctx.fillStyle = (frameRef.current % 120 < 60) ? '#fff59d' : '#827717';
      ctx.fillRect(b.size.w*0.2, b.size.h*0.3, b.size.w*0.2, b.size.h*0.2);
      ctx.fillRect(b.size.w*0.6, b.size.h*0.3, b.size.w*0.2, b.size.h*0.2);
    }

    drawLabel(ctx, b.name, b.size.w/2, -50, isFocusedHome ? '#ffff00' : 'white');
    ctx.restore();
  };

  const drawHumanFrog = (ctx: CanvasRenderingContext2D, a: Agent, frame: number) => {
    ctx.save();
    ctx.translate(a.position.x, a.position.y);
    const S = 0.75;
    
    const bob = (a.animationState === 'walking') ? Math.abs(Math.sin(frame * 0.6)) * 10 : Math.sin(frame * 0.1) * 3;
    const legWiggle = (a.animationState === 'walking') ? Math.sin(frame * 0.6) * 15 : 0;
    const armWiggle = (a.animationState === 'gesturing') ? Math.sin(frame * 0.2) * 20 : 0;

    // Body Components
    // Legs
    ctx.fillStyle = a.color;
    ctx.fillRect(-10*S, (0-bob)*S, 6*S, (15+legWiggle)*S); // L Leg
    ctx.fillRect(4*S, (0-bob)*S, 6*S, (15-legWiggle)*S);  // R Leg

    // Torso
    ctx.fillStyle = a.traits.shirtStyle === 'suit' ? '#333' : a.color;
    ctx.fillRect(-12*S, (-25-bob)*S, 24*S, 25*S);
    
    // Arms
    ctx.fillStyle = a.color;
    ctx.fillRect(-18*S, (-22-bob-armWiggle)*S, 6*S, 18*S); // L Arm
    ctx.fillRect(12*S, (-22-bob+armWiggle)*S, 6*S, 18*S);  // R Arm

    // Head
    ctx.fillStyle = a.color;
    ctx.beginPath(); ctx.ellipse(0, (-35-bob)*S, 16*S, 14*S, 0, 0, 7); ctx.fill();

    // Eyes (Detailed)
    const eyeX = a.animationState === 'scanning' ? Math.sin(frame*0.05)*4 : 0;
    ctx.fillStyle = 'white'; 
    ctx.beginPath(); ctx.arc(-7*S, (-38-bob)*S, 6*S, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(7*S, (-38-bob)*S, 6*S, 0, 7); ctx.fill();
    ctx.fillStyle = 'black';
    ctx.fillRect((-8 + eyeX)*S, (-39-bob)*S, 3*S, 3*S);
    ctx.fillRect((6 + eyeX)*S, (-39-bob)*S, 3*S, 3*S);

    // Accessories
    if (a.traits.accessory === 'hat') {
      ctx.fillStyle = '#ff3d00'; ctx.fillRect(-18*S, (-52-bob)*S, 36*S, 6*S);
      ctx.fillRect(-10*S, (-65-bob)*S, 20*S, 15*S);
    } else if (a.traits.accessory === 'shades') {
      ctx.fillStyle = 'black'; ctx.fillRect(-14*S, (-42-bob)*S, 28*S, 6*S);
    }

    drawLabel(ctx, a.name, 0, -60, a.color);
    ctx.restore();
  };

  const render = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Smooth Follow
    const targetAgent = agents.find(a => a.id === focusedAgentId);
    if (targetAgent && !cam.current.isDragging) {
       const tx = targetAgent.position.x - (dimensions.width / 2) / cam.current.zoom;
       const ty = targetAgent.position.y - (dimensions.height / 2) / cam.current.zoom;
       cam.current.x += (tx - cam.current.x) * 0.08;
       cam.current.y += (ty - cam.current.y) * 0.08;
    }

    // Velocity Friction
    if (!cam.current.isDragging) {
       cam.current.x += cam.current.velX;
       cam.current.y += cam.current.velY;
       cam.current.velX *= 0.94;
       cam.current.velY *= 0.94;
    }

    ctx.clearRect(0,0,dimensions.width, dimensions.height);
    ctx.save();
    ctx.scale(cam.current.zoom, cam.current.zoom);
    ctx.translate(-cam.current.x, -cam.current.y);

    // Ground
    ctx.fillStyle = '#1b3022'; ctx.fillRect(-1000, -1000, WORLD_WIDTH+2000, WORLD_HEIGHT+2000);
    
    // Paths
    TOWN_MAP.paths.forEach(p => { 
        ctx.fillStyle = '#4e342e'; ctx.fillRect(p.x, p.y, p.w, p.h);
        ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 2;
        ctx.strokeRect(p.x, p.y, p.w, p.h);
    });

    // Square Tilework
    const square = buildings.find(b => b.type === 'square');
    if (square) {
       ctx.fillStyle = '#37474f'; ctx.fillRect(square.position.x, square.position.y, square.size.w, square.size.h);
       ctx.strokeStyle = '#546e7a'; ctx.lineWidth = 1;
       for(let x=0; x<square.size.w; x+=40) {
         ctx.beginPath(); ctx.moveTo(square.position.x + x, square.position.y); ctx.lineTo(square.position.x + x, square.position.y + square.size.h); ctx.stroke();
       }
       for(let y=0; y<square.size.h; y+=40) {
         ctx.beginPath(); ctx.moveTo(square.position.x, square.position.y + y); ctx.lineTo(square.position.x + square.size.w, square.position.y + y); ctx.stroke();
       }
    }

    // Water/River
    const path = DECORATIONS.riverPath;
    const rGrad = ctx.createLinearGradient(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    rGrad.addColorStop(0, '#0a1a1c'); rGrad.addColorStop(0.5, '#12353a');
    ctx.beginPath(); ctx.moveTo(path[0].x, path[0].y);
    for(let i = 1; i < path.length; i++) {
        const p = path[i] as any;
        ctx.bezierCurveTo(p.cp1x, p.cp1y, p.cp2x, p.cp2y, p.x, p.y);
    }
    ctx.strokeStyle = rGrad; ctx.lineWidth = DECORATIONS.riverWidth; ctx.stroke();
    // Ripples
    ctx.strokeStyle = 'rgba(255,255,255,0.03)'; ctx.lineWidth = 4;
    ctx.setLineDash([40, 100]); ctx.lineDashOffset = -frameRef.current; ctx.stroke(); ctx.setLineDash([]);

    // Objects Depth Sorting
    const sortedEntities = [
      ...buildings.map(b => ({ ...b, sortY: b.position.y + b.size.h })),
      ...agents.map(a => ({ ...a, sortY: a.position.y, type: 'agent' })),
      ...TOWN_MAP.trees.map(t => ({ ...t, sortY: t.y, type: 'asset' }))
    ].sort((a,b) => a.sortY - b.sortY);

    sortedEntities.forEach(e => {
      if ((e as any).type === 'agent') drawHumanFrog(ctx, e as Agent, frameRef.current);
      else if ((e as any).type === 'asset') drawAsset(ctx, e, frameRef.current);
      else {
        const isFocusHome = targetAgent ? (e as Building).id === targetAgent.houseId : false;
        drawBuilding(ctx, e as Building, isFocusHome);
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

  const handleMouseDown = (e: React.MouseEvent) => {
    cam.current.isDragging = true;
    cam.current.lastMouseX = e.clientX;
    cam.current.lastMouseY = e.clientY;
    cam.current.velX = 0; cam.current.velY = 0;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (cam.current.isDragging) {
        const dx = (e.clientX - cam.current.lastMouseX) / cam.current.zoom;
        const dy = (e.clientY - cam.current.lastMouseY) / cam.current.zoom;
        cam.current.x -= dx;
        cam.current.y -= dy;
        cam.current.velX = -dx * 0.15;
        cam.current.velY = -dy * 0.15;
        cam.current.lastMouseX = e.clientX;
        cam.current.lastMouseY = e.clientY;
    } else {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const wx = (e.clientX - rect.left) / cam.current.zoom + cam.current.x;
        const wy = (e.clientY - rect.top) / cam.current.zoom + cam.current.y;
        const h = agents.find(a => Math.sqrt(Math.pow(wx - a.position.x, 2) + Math.pow(wy - a.position.y, 2)) < 50);
        onAgentHover(h || null);
    }
  };

  const handleMouseUp = () => { cam.current.isDragging = false; };
  const handleWheel = (e: React.WheelEvent) => {
    const delta = e.deltaY * -0.0012;
    cam.current.zoom = Math.min(Math.max(cam.current.zoom + delta, 0.4), 3.0);
  };

  const handleClick = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const wx = (e.clientX - rect.left) / cam.current.zoom + cam.current.x;
    const wy = (e.clientY - rect.top) / cam.current.zoom + cam.current.y;
    const c = agents.find(a => Math.sqrt(Math.pow(wx - a.position.x, 2) + Math.pow(wy - a.position.y, 2)) < 50);
    if (c) onAgentClick(c);
  };

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden bg-black">
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onClick={handleClick}
        className="block cursor-grab active:cursor-grabbing"
      />
    </div>
  );
};

export default GameEngine;
