import React, { useState, useEffect, useCallback } from 'react';
import './Games.css';
import { 
  Coffee, Moon, Sun, Wind, Cloud, Star, CloudRain, Zap, 
  Feather, Heart, Smile, Compass, RotateCcw, Trophy, Footprints 
} from 'lucide-react';

const ALL_ICONS = [
  Coffee, Moon, Sun, Wind, Cloud, Star, CloudRain, Zap,
  Feather, Heart, Smile, Compass
];

const DIFFICULTY_CONFIG = {
  easy: { name: 'Easy (3x4)', pairs: 6, cols: 4, maxWidth: '380px' },
  medium: { name: 'Medium (4x4)', pairs: 8, cols: 4, maxWidth: '420px' },
  hard: { name: 'Hard (4x6)', pairs: 12, cols: 6, maxWidth: '540px' }
};

export default function MemoryMatch({ onComplete }) {
  const [difficulty, setDifficulty] = useState('medium');
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [solved, setSolved] = useState([]);
  const [moves, setMoves] = useState(0);

  const initializeGame = useCallback((diffKey = difficulty) => {
    const config = DIFFICULTY_CONFIG[diffKey];
    const selectedIcons = ALL_ICONS.slice(0, config.pairs);
    const cardPairs = [...selectedIcons, ...selectedIcons]
      .sort(() => Math.random() - 0.5)
      .map((Icon, idx) => ({ id: `${diffKey}-${idx}-${Math.random()}`, Icon }));

    setCards(cardPairs);
    setFlipped([]);
    setSolved([]);
    setMoves(0);
  }, [difficulty]);

  useEffect(() => {
    initializeGame(difficulty);
  }, [difficulty, initializeGame]);

  const handleDifficultyChange = (newDiff) => {
    setDifficulty(newDiff);
    initializeGame(newDiff);
  };

  const handleCardClick = (index) => {
    if (flipped.length === 2 || flipped.includes(index) || solved.includes(index)) return;

    const newFlipped = [...flipped, index];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      const [first, second] = newFlipped;
      if (cards[first].Icon === cards[second].Icon) {
        setSolved(prev => {
          const newSolved = [...prev, first, second];
          if (newSolved.length === cards.length) {
            setTimeout(() => onComplete && onComplete(), 1200);
          }
          return newSolved;
        });
        setFlipped([]);
      } else {
        setTimeout(() => setFlipped([]), 900);
      }
    }
  };

  const currentConfig = DIFFICULTY_CONFIG[difficulty];

  return (
    <div className="game-container memory-game">
      <div className="game-header">
        <h3>Memory Match</h3>
        <p>A calm, untimed memory puzzle. Choose your grid size and find all the matching pairs.</p>
        
        <div className="memory-controls">
          <div className="difficulty-toggle">
            {Object.entries(DIFFICULTY_CONFIG).map(([key, cfg]) => (
              <button
                key={key}
                className={`toggle-pill ${difficulty === key ? 'active' : ''}`}
                onClick={() => handleDifficultyChange(key)}
              >
                {cfg.name}
              </button>
            ))}
          </div>

          <button className="puzzle-reset-btn" onClick={() => initializeGame(difficulty)} title="Reset Cards">
            <RotateCcw size={15} /> Reset
          </button>
        </div>

        <div className="game-stats">
          <span className="stat-pill"><Footprints size={15} /> Moves: {moves}</span>
          <span className="stat-pill">Pairs: {solved.length / 2} / {currentConfig.pairs}</span>
        </div>
      </div>

      <div 
        className={`memory-grid memory-grid-${difficulty}`}
        style={{
          gridTemplateColumns: `repeat(${currentConfig.cols}, 1fr)`,
          maxWidth: currentConfig.maxWidth
        }}
      >
        {cards.map((card, index) => {
          const isFlipped = flipped.includes(index) || solved.includes(index);
          const Icon = card.Icon;
          return (
            <div 
              key={card.id} 
              className={`memory-card ${isFlipped ? 'flipped' : ''} ${solved.includes(index) ? 'solved' : ''}`}
              onClick={() => handleCardClick(index)}
            >
              <div className="memory-card-inner">
                <div className="memory-card-front">
                  <span className="card-back-dot" />
                </div>
                <div className="memory-card-back">
                  <Icon size={difficulty === 'hard' ? 24 : 30} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {cards.length > 0 && solved.length === cards.length && (
        <div className="game-over memory-over">
          <div className="win-icon-wrapper">
            <Trophy size={40} className="win-trophy" />
          </div>
          <h4>Peace Restored!</h4>
          <p>Matched all {currentConfig.pairs} pairs in {moves} moves on {currentConfig.name}.</p>
          <button className="game-start-btn mt-3" onClick={() => initializeGame(difficulty)}>
            Play Again
          </button>
        </div>
      )}
    </div>
  );
}
