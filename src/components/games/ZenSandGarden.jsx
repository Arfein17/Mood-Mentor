import React, { useRef, useEffect, useState, useCallback } from 'react';
import './Games.css';
import { Sparkles, Trash2, CheckCircle, Waves, CircleDot } from 'lucide-react';

export default function ZenSandGarden({ onComplete }) {
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef(null);
  const [rakeType, setRakeType] = useState('triple'); // 'single', 'triple', 'stone'
  const [hasRaked, setHasRaked] = useState(false);
  const [rakeSeconds, setRakeSeconds] = useState(0);
  const [sessionCompleted, setSessionCompleted] = useState(false);

  // Initialize canvas with fine textured sand background
  const initSandCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Base sand gradient
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#dfcfb1');
    grad.addColorStop(0.5, '#d6c4a3');
    grad.addColorStop(1, '#cbb896');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Subtle natural sand grain texture
    const grainCount = Math.floor((width * height) / 250);
    for (let i = 0; i < grainCount; i++) {
      const gx = Math.random() * width;
      const gy = Math.random() * height;
      const shade = Math.random() > 0.5 ? 'rgba(255,255,255,0.18)' : 'rgba(120,100,70,0.12)';
      ctx.fillStyle = shade;
      ctx.fillRect(gx, gy, 1.5, 1.5);
    }
  }, []);

  // Set canvas size on mount and handle resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      initSandCanvas();
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [initSandCanvas]);

  // Track raking duration for calm engagement
  useEffect(() => {
    let timer;
    if (hasRaked && !sessionCompleted) {
      timer = setInterval(() => {
        setRakeSeconds(s => s + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [hasRaked, sessionCompleted]);

  // Helper to get coordinates relative to canvas
  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if (e.touches && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const drawStone = (x, y) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Draw shadow
    ctx.beginPath();
    ctx.ellipse(x + 5, y + 6, 22, 16, Math.PI / 6, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(70, 55, 35, 0.4)';
    ctx.fill();

    // Draw stone body
    ctx.beginPath();
    ctx.ellipse(x, y, 20, 14, Math.PI / 6, 0, Math.PI * 2);
    const stoneGrad = ctx.createRadialGradient(x - 4, y - 4, 3, x, y, 20);
    stoneGrad.addColorStop(0, '#5f6368');
    stoneGrad.addColorStop(0.7, '#3c4043');
    stoneGrad.addColorStop(1, '#202124');
    ctx.fillStyle = stoneGrad;
    ctx.fill();

    // Stone highlight
    ctx.beginPath();
    ctx.ellipse(x - 5, y - 4, 10, 6, Math.PI / 6, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.fill();

    setHasRaked(true);
  };

  const drawRakeLine = (p1, p2) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 2) return;

    // Normal unit vector for parallel prongs
    const nx = -dy / dist;
    const ny = dx / dist;

    // Define prong offsets based on selected rake
    const prongOffsets = rakeType === 'triple' ? [-10, 0, 10] : [-16, -8, 0, 8, 16];

    prongOffsets.forEach(offset => {
      const ox = nx * offset;
      const oy = ny * offset;

      // 1. Groove shadow (depressed sand)
      ctx.beginPath();
      ctx.moveTo(p1.x + ox, p1.y + oy);
      ctx.lineTo(p2.x + ox, p2.y + oy);
      ctx.strokeStyle = 'rgba(92, 75, 50, 0.45)';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();

      // 2. Ridge highlight (sand ridge catching light)
      ctx.beginPath();
      ctx.moveTo(p1.x + ox + nx * 1.5, p1.y + oy + ny * 1.5);
      ctx.lineTo(p2.x + ox + nx * 1.5, p2.y + oy + ny * 1.5);
      ctx.strokeStyle = 'rgba(255, 248, 230, 0.45)';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.stroke();
    });
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const coords = getCoordinates(e);

    if (rakeType === 'stone') {
      drawStone(coords.x, coords.y);
      return;
    }

    isDrawingRef.current = true;
    lastPointRef.current = coords;
    setHasRaked(true);
  };

  const draw = (e) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    const coords = getCoordinates(e);
    if (lastPointRef.current) {
      drawRakeLine(lastPointRef.current, coords);
    }
    lastPointRef.current = coords;
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
    lastPointRef.current = null;
  };

  const smoothSand = () => {
    initSandCanvas();
  };

  const handleFinishSession = () => {
    if (sessionCompleted) return;
    setSessionCompleted(true);
    if (onComplete) {
      onComplete();
    }
  };

  return (
    <div className="game-container zen-sand-game">
      <div className="game-header">
        <h3>Zen Sand Garden</h3>
        <p>Rake peaceful wave patterns into the sand. Pure relaxation, zero pressure.</p>
        
        <div className="sand-toolbar">
          <div className="rake-selector">
            <button
              className={`rake-btn ${rakeType === 'triple' ? 'active' : ''}`}
              onClick={() => setRakeType('triple')}
              title="Triple Wave Rake"
            >
              <Waves size={16} /> Triple Rake
            </button>
            <button
              className={`rake-btn ${rakeType === 'wide' ? 'active' : ''}`}
              onClick={() => setRakeType('wide')}
              title="Wide 5-Prong Rake"
            >
              <Waves size={16} style={{ transform: 'scaleX(1.3)' }} /> Wide Rake
            </button>
            <button
              className={`rake-btn ${rakeType === 'stone' ? 'active' : ''}`}
              onClick={() => setRakeType('stone')}
              title="Place Zen Pebble"
            >
              <CircleDot size={16} /> Place Stone
            </button>
          </div>

          <div className="sand-actions">
            <button className="smooth-sand-btn" onClick={smoothSand} title="Smooth Sand">
              <Trash2 size={15} /> Smooth Sand
            </button>
            
            <button 
              className={`finish-session-btn ${sessionCompleted ? 'completed' : ''}`}
              onClick={handleFinishSession}
            >
              {sessionCompleted ? (
                <>
                  <CheckCircle size={15} /> Peace Restored
                </>
              ) : (
                <>
                  <Sparkles size={15} /> I'm Done (Collect Points)
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="sand-canvas-wrapper">
        <canvas
          ref={canvasRef}
          className="sand-canvas"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        <div className="sand-canvas-hint">
          {rakeType === 'stone' ? 'Click anywhere in the sand to place a zen stone' : 'Drag mouse or finger to rake flowing ripples into the sand'}
        </div>
      </div>

      {sessionCompleted && (
        <div className="zen-completed-pill">
          <Sparkles size={16} /> Mind centered. +5 Mode Points awarded for your mindful break.
        </div>
      )}
    </div>
  );
}
