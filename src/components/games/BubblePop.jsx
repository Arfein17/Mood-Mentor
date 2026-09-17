import React, { useState, useEffect, useRef } from 'react';
import './Games.css';
import { Flame, Zap, Sparkles } from 'lucide-react';

export default function BubblePop({ onComplete }) {
  const [bubbles, setBubbles] = useState([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [isPlaying, setIsPlaying] = useState(false);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [comboText, setComboText] = useState(null);
  const [popRipples, setPopRipples] = useState([]);

  const timerRef = useRef(null);
  const spawnRef = useRef(null);
  const comboTimerRef = useRef(null);
  const lastPopTimeRef = useRef(0);

  const startGame = () => {
    setScore(0);
    setTimeLeft(30);
    setBubbles([]);
    setCombo(0);
    setMaxCombo(0);
    setComboText(null);
    setPopRipples([]);
    setIsPlaying(true);

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          clearInterval(spawnRef.current);
          clearTimeout(comboTimerRef.current);
          setIsPlaying(false);
          setTimeout(() => onComplete && onComplete(), 1500);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    spawnRef.current = setInterval(() => {
      setBubbles(prev => {
        if (prev.length > 16) return prev;
        return [...prev, {
          id: Math.random().toString(36).substring(7),
          left: Math.random() * 80 + 10,
          top: Math.random() * 60 + 15,
          size: Math.random() * 26 + 42,
          hue: Math.floor(Math.random() * 60) + 200 // Blue-purple calming range
        }];
      });
    }, 550);
  };

  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      clearInterval(spawnRef.current);
      clearTimeout(comboTimerRef.current);
    };
  }, []);

  const popBubble = (bubble) => {
    if (!isPlaying) return;

    const now = Date.now();
    const timeSinceLast = now - lastPopTimeRef.current;
    lastPopTimeRef.current = now;

    // Trigger pop ripple effect
    const rippleId = Math.random().toString(36).substring(7);
    setPopRipples(prev => [
      ...prev.slice(-6),
      { id: rippleId, left: bubble.left, top: bubble.top, size: bubble.size }
    ]);
    setTimeout(() => {
      setPopRipples(prev => prev.filter(r => r.id !== rippleId));
    }, 450);

    // Remove popped bubble
    setBubbles(prev => prev.filter(b => b.id !== bubble.id));

    // Calculate combo streak (within 1.25s)
    let newCombo = 1;
    if (timeSinceLast < 1250) {
      newCombo = combo + 1;
    }
    setCombo(newCombo);
    setMaxCombo(m => Math.max(m, newCombo));

    // Determine combo badge text
    if (newCombo >= 2) {
      if (newCombo < 4) setComboText(`Streak x${newCombo}!`);
      else if (newCombo < 7) setComboText(`Combo x${newCombo}! 🔥`);
      else if (newCombo < 10) setComboText(`Mega x${newCombo}! ⚡`);
      else setComboText(`UNSTOPPABLE x${newCombo}! ✨`);
    }

    // Reset combo after 1.25s of inactivity
    clearTimeout(comboTimerRef.current);
    comboTimerRef.current = setTimeout(() => {
      setCombo(0);
      setComboText(null);
    }, 1250);

    // Increment score with combo bonus
    const pointsGained = newCombo >= 3 ? 2 : 1;
    setScore(s => s + pointsGained);
  };

  return (
    <div className="game-container bubble-pop-game">
      <div className="game-header">
        <h3>Bubble Pop</h3>
        <p>Pop as many bubbles as you can to release frustration. Chain quick pops for combo streaks!</p>
        <div className="game-stats">
          <span className="stat-pill">Score: {score}</span>
          <span className="stat-pill">Time: {timeLeft}s</span>
          {combo > 1 && (
            <span className="stat-pill combo-badge-stat">
              <Flame size={15} /> Combo: x{combo}
            </span>
          )}
        </div>
      </div>
      
      {!isPlaying && timeLeft === 30 && (
        <button className="game-start-btn" onClick={startGame}>Start Popping</button>
      )}

      {timeLeft === 0 && (
        <div className="game-over">
          <h4>Time's up!</h4>
          <p>You scored <strong>{score}</strong> points with a max combo of <strong>x{maxCombo}</strong>!</p>
          <button className="game-start-btn mt-3" onClick={startGame}>Play Again</button>
        </div>
      )}

      <div className="bubble-area">
        {/* Floating Combo Badge Overlay */}
        {comboText && isPlaying && (
          <div key={combo} className="active-combo-banner">
            {combo >= 7 ? <Zap size={20} /> : <Sparkles size={20} />}
            <span>{comboText}</span>
          </div>
        )}

        {/* Expanding Pop Ripples */}
        {popRipples.map(r => (
          <div
            key={r.id}
            className="pop-ripple"
            style={{
              left: `${r.left}%`,
              top: `${r.top}%`,
              width: `${r.size * 1.5}px`,
              height: `${r.size * 1.5}px`
            }}
          />
        ))}

        {/* Bubbles */}
        {bubbles.map(b => (
          <div 
            key={b.id} 
            className="pop-bubble"
            style={{ 
              left: `${b.left}%`, 
              top: `${b.top}%`, 
              width: `${b.size}px`, 
              height: `${b.size}px`,
              filter: `hue-rotate(${b.hue - 220}deg)`
            }}
            onMouseDown={() => popBubble(b)}
            onTouchStart={(e) => { e.preventDefault(); popBubble(b); }}
          >
            <div className="bubble-shine" />
          </div>
        ))}
      </div>
    </div>
  );
}
