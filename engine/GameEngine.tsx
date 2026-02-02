
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
  
  // Advanced Camera State
  const cam = useRef({ 
    x: WORLD_WIDTH / 2 - 400, 
    y: WORLD_HEIGHT / 2 - 300, 
    zoom: 0.8, 
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
    // Fix: Changed removeModifier to removeEventListener to correctly detach the resize listener
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update Simulation Frame
  useEffect(() => {
    const tick = (time: number) => {
      frameRef.current = Math.floor(time / 20);
      onUpdateAgents(prevAgents => {
        let hasChanged = false;
        const nextAgents = prevAgents.map(agent => {
          // Dynamic Idle States
          if (!agent.target) {
            const idleType = Math.floor((frameRef.current + parseInt(agent.id.split('-')[1] || '0') * 100) / 150) % 4;
            const states: AnimationState[] = ['breathing', 'scanning', 'checking_watch', 'idle'];
            if (agent.animationState !== states[idleType]) {
              hasChanged = true;
              return { ...agent, animationState: states[idleType] };
            }
            return agent;
          };

          // Walking Logic
          const dx = agent.target.x - agent.position.x;
          const dy = agent.target.y - agent.position.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 5) { 
            hasChanged = true;
            return { ...agent, position: agent.target, target: null, animationState: 'idle' };
          }
          const speed = 2.0; 
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

  const drawTree = (ctx: CanvasRenderingContext2D, t: { x: number; y: number; type: TreeType }, frame: number) => {
    const treeOffset = (t.x * 0.1 + t.y * 0.1);
    const globalSway = Math.sin(frame * 0.01 + treeOffset) * 4;
    ctx.save();
    ctx.translate(t.x, t.y);

    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath(); ctx.ellipse(0, 10, 25, 6, 0, 0, Math.PI * 2); ctx.fill();

    if (t.type === 'banyan') {
      ctx.fillStyle = '#2d1b10'; ctx.fillRect(-8, -5, 16, 20);
      const leafColors = ['#1a3317', '#254a21', '#2d5a27'];
      for (let i = 0; i < 24; i++) {
          const sway = globalSway * (0.2 + i/24);
          ctx.fillStyle = leafColors[i % 3];
          ctx.fillRect(Math.cos(i)*45 + sway - 10, Math.sin(i)*25 - 35, 20, 16);
      }
    } else if (t.type === 'willow') {
      ctx.fillStyle = '#1a1108'; ctx.fillRect(-3, -5, 6, 25);
      ctx.strokeStyle = '#4c6e3b'; ctx.lineWidth = 1.5;
      for (let i = -40; i <= 40; i += 8) {
        const sSway = Math.sin(frame * 0.01 + Math.abs(i)*0.05 + treeOffset) * 12;
        ctx.beginPath(); ctx.moveTo(i*0.2, -15); ctx.quadraticCurveTo(i*0.4 + sSway*0.3, 10, i + sSway, 45); ctx.stroke();
      }
    } else if (t.type === 'sakura') {
      ctx.fillStyle = '#3d3028'; ctx.fillRect(-4, -5, 8, 18);
      const petals = ['#ffc1e3', '#f8bbd0', '#ffffff'];
      for (let i = 0; i < 20; i++) {
          ctx.fillStyle = petals[i % 3];
          const px = Math.sin(i*1.3)*30 + globalSway;
          const py = Math.cos(i*1.3)*20 - 30;
          ctx.fillRect(px, py, 14, 12);
      }
    } else if (t.type === 'coconut') {
        ctx.fillStyle = '#5d4037'; ctx.fillRect(-4, -45, 8, 45);
        ctx.strokeStyle = '#2e7d32'; ctx.lineWidth = 3;
        for (let i = 0; i < 8; i++) {
            const angle = (i/8)*Math.PI*2;
            ctx.beginPath(); ctx.moveTo(0, -45); 
            ctx.quadraticCurveTo(Math.cos(angle)*40 + globalSway*1.5, -45+Math.sin(angle)*15, Math.cos(angle)*65 + globalSway*1.5, -30+Math.sin(angle)*25);
            ctx.stroke();
        }
    } else {
        ctx.fillStyle = '#0e1f0d'; ctx.beginPath(); ctx.moveTo(globalSway, -60); ctx.lineTo(-30, 0); ctx.lineTo(30, 0); ctx.fill();
    }
    ctx.restore();
  };

  const drawRiver = (ctx: CanvasRenderingContext2D, frame: number) => {
    const path = DECORATIONS.riverPath;
    const grad = ctx.createLinearGradient(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    grad.addColorStop(0, '#0a1a1c'); grad.addColorStop(0.5, '#12353a'); grad.addColorStop(1, '#0a1a1c');
    ctx.save();
    ctx.beginPath(); ctx.moveTo(path[0].x, path[0].y);
    for(let i = 1; i < path.length; i++) {
        const p = path[i] as any;
        ctx.bezierCurveTo(p.cp1x, p.cp1y, p.cp2x, p.cp2y, p.x, p.y);
    }
    ctx.strokeStyle = grad; ctx.lineWidth = DECORATIONS.riverWidth; ctx.stroke();
    
    // Flow Filaments
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 2;
    ctx.setLineDash([30, 120]); ctx.lineDashOffset = -frame * 2;
    ctx.stroke();
    ctx.restore();
  };

  const drawFroggy = (ctx: CanvasRenderingContext2D, a: Agent, frame: number) => {
    ctx.save();
    ctx.translate(a.position.x, a.position.y);
    const S = 0.65;
    
    // Animation Logic
    let bob = 0;
    let eyeShift = 0;
    let armWiggle = 0;
    
    if (a.animationState === 'walking') {
      bob = Math.abs(Math.sin(frame * 1.0)) * 8;
    } else if (a.animationState === 'breathing') {
      bob = Math.sin(frame * 0.1) * 2;
    } else if (a.animationState === 'scanning') {
      eyeShift = Math.sin(frame * 0.1) * 2;
    } else if (a.animationState === 'checking_watch') {
      armWiggle = Math.sin(frame * 0.3) * 5;
    }

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(0, 12*S, 18*S, 6*S, 0, 0, 7); ctx.fill();

    // Body (High Fidelity Pixel Art)
    ctx.fillStyle = a.color; ctx.fillRect(-12*S, (-30-bob)*S, 24*S, 22*S);
    
    // Eyes
    const drawEye = (ox: number) => {
      ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(ox*S, (-32-bob)*S, 7*S, 0, 7); ctx.fill();
      ctx.fillStyle = '#ffde00'; ctx.beginPath(); ctx.arc(ox*S, (-32-bob)*S, 5*S, 0, 7); ctx.fill();
      ctx.fillStyle = 'black'; ctx.fillRect((ox - 1.5 + eyeShift)*S, (-33-bob)*S, 3*S, 3*S);
    };
    drawEye(-7); drawEye(7);

    // Mouth / Mask / Accessories
    if (a.traits.mouthType === 'mask') {
      ctx.fillStyle = '#ff33aa'; ctx.fillRect(-10*S, (-24-bob)*S, 20*S, 8*S);
    } else {
      ctx.strokeStyle = 'black'; ctx.beginPath(); ctx.arc(0, (-20-bob)*S, 6*S, 0.2, Math.PI-0.2); ctx.stroke();
    }

    // Shirt
    ctx.fillStyle = a.traits.shirtStyle === 'striped' ? 'rgba(0,0,0,0.2)' : 'transparent';
    if (a.traits.shirtStyle === 'striped') {
       for(let i=-12; i<12; i+=6) ctx.fillRect(i*S, (-15-bob)*S, 3*S, 15*S);
    }
    
    // Arms/Watch
    ctx.fillStyle = a.color;
    ctx.fillRect((-18)*S, (-15-bob+armWiggle)*S, 6*S, 12*S);
    ctx.fillRect(12*S, (-15-bob)*S, 6*S, 12*S);
    
    ctx.restore();
  };

  const render = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Smooth Tracking Logic
    const targetAgent = agents.find(a => a.id === focusedAgentId);
    if (targetAgent && !cam.current.isDragging) {
       const tx = targetAgent.position.x - (dimensions.width / 2) / cam.current.zoom;
       const ty = targetAgent.position.y - (dimensions.height / 2) / cam.current.zoom;
       cam.current.x += (tx - cam.current.x) * 0.1;
       cam.current.y += (ty - cam.current.y) * 0.1;
    }

    // Velocity Friction for Dragging
    if (!cam.current.isDragging) {
       cam.current.x += cam.current.velX;
       cam.current.y += cam.current.velY;
       cam.current.velX *= 0.92;
       cam.current.velY *= 0.92;
    }

    // Constraints
    cam.current.x = Math.max(-500, Math.min(cam.current.x, WORLD_WIDTH - (dimensions.width/cam.current.zoom) + 500));
    cam.current.y = Math.max(-500, Math.min(cam.current.y, WORLD_HEIGHT - (dimensions.height/cam.current.zoom) + 500));

    ctx.clearRect(0,0,dimensions.width, dimensions.height);
    ctx.save();
    ctx.scale(cam.current.zoom, cam.current.zoom);
    ctx.translate(-cam.current.x, -cam.current.y);

    // Deep Green Grass Texture
    ctx.fillStyle = '#2a4221'; ctx.fillRect(cam.current.x - 200, cam.current.y - 200, WORLD_WIDTH + 400, WORLD_HEIGHT + 400);
    
    drawRiver(ctx, frameRef.current);
    
    TOWN_MAP.paths.forEach(p => { 
        ctx.fillStyle = '#5d4e3b'; ctx.fillRect(p.x, p.y, p.w, p.h);
    });

    buildings.forEach(b => {
      ctx.save(); ctx.translate(b.position.x, b.position.y);
      ctx.fillStyle = b.type === 'house' ? '#4e342e' : '#263238';
      ctx.fillRect(0, 0, b.size.w, b.size.h);
      ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(b.size.w*0.2, b.size.h*0.2, b.size.w*0.3, b.size.h*0.3);
      ctx.restore();
    });

    // Z-Sort and Render
    const sorted = [...agents].sort((a,b) => a.position.y - b.position.y);
    sorted.forEach(a => drawFroggy(ctx, a, frameRef.current));
    
    TOWN_MAP.trees.forEach(t => drawTree(ctx, t, frameRef.current));

    ctx.restore();
  };

  useEffect(() => {
    const animId = requestAnimationFrame(function loop() {
        render();
        requestAnimationFrame(loop);
    });
    return () => cancelAnimationFrame(animId);
  }, [agents, buildings, worldState, dimensions]);

  // Event Handlers for Drag/Zoom
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
        cam.current.velX = -dx * 0.2;
        cam.current.velY = -dy * 0.2;
        cam.current.lastMouseX = e.clientX;
        cam.current.lastMouseY = e.clientY;
    } else {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const wx = (e.clientX - rect.left) / cam.current.zoom + cam.current.x;
        const wy = (e.clientY - rect.top) / cam.current.zoom + cam.current.y;
        const h = agents.find(a => Math.sqrt(Math.pow(wx - a.position.x, 2) + Math.pow(wy - a.position.y, 2)) < 30);
        onAgentHover(h || null);
    }
  };

  const handleMouseUp = () => { cam.current.isDragging = false; };

  const handleWheel = (e: React.WheelEvent) => {
    const delta = e.deltaY * -0.001;
    cam.current.zoom = Math.min(Math.max(cam.current.zoom + delta, 0.4), 2.5);
  };

  const handleClick = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const wx = (e.clientX - rect.left) / cam.current.zoom + cam.current.x;
    const wy = (e.clientY - rect.top) / cam.current.zoom + cam.current.y;
    const c = agents.find(a => Math.sqrt(Math.pow(wx - a.position.x, 2) + Math.pow(wy - a.position.y, 2)) < 30);
    if (c) onAgentClick(c);
  };

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden">
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
