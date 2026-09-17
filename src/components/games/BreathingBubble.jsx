import React, { useState, useEffect } from 'react';
import './Games.css';

export default function BreathingBubble({ onComplete }) {
  const [phase, setPhase] = useState('Inhale...');
  const [secondsLeft, setSecondsLeft] = useState(4);
  const [cycleCount, setCycleCount] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setPhase((currentPhase) => {
            if (currentPhase === 'Inhale...') return 'Hold...';
            if (currentPhase === 'Hold...') return 'Exhale...';
            
            // Exhale finished
            setCycleCount(c => {
              const newCount = c + 1;
              if (newCount >= 3) {
                // Completed 3 cycles
                setTimeout(() => onComplete && onComplete(), 500);
              }
              return newCount;
            });
            return 'Inhale...';
          });
          return 4; // 4 seconds per phase
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [onComplete]);

  let bubbleClass = 'breathing-bubble';
  if (phase === 'Inhale...') bubbleClass += ' inhale';
  if (phase === 'Exhale...') bubbleClass += ' exhale';
  if (phase === 'Hold...') bubbleClass += ' hold';

  return (
    <div className="game-container breathing-game">
      <div className="game-header">
        <h3>Breathing Bubble</h3>
        <p>Follow the bubble to calm your mind.</p>
      </div>
      <div className="breathing-area">
        <div className={bubbleClass}></div>
        <div className="breathing-text">
          <h2>{phase}</h2>
          <p>{secondsLeft}</p>
        </div>
      </div>
      <div className="cycle-count">Cycle: {Math.min(cycleCount + 1, 3)} / 3</div>
    </div>
  );
}
