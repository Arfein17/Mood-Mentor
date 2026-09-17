import React, { useState, useEffect } from 'react';
import GlassCard from './GlassCard';
import './games/Games.css';
import { Gamepad2, Wind, MousePointer2, Grid3X3, Grid, Waves, Sparkles, Info } from 'lucide-react';
import BreathingBubble from './games/BreathingBubble';
import BubblePop from './games/BubblePop';
import SlidingPuzzle from './games/SlidingPuzzle';
import MemoryMatch from './games/MemoryMatch';
import ZenSandGarden from './games/ZenSandGarden';
import { fetchWithAuth } from '../api/client';
import { useUser } from '../context/UserContext';

const GAMES = [
  { id: 'breathing', name: 'Breathing Bubble', icon: Wind, desc: 'A calming guided breathing exercise.' },
  { id: 'bubble', name: 'Bubble Pop', icon: MousePointer2, desc: 'Release frustration with popping combos & streaks.' },
  { id: 'sliding', name: 'Sliding Puzzle', icon: Grid3X3, desc: 'Engage focus with a classic sliding number challenge.' },
  { id: 'memory', name: 'Memory Match', icon: Grid, desc: 'Untimed memory puzzle with customizable difficulty.' },
  { id: 'sand', name: 'Zen Sand Garden', icon: Waves, desc: 'Rake flowing wave ripples into warm sand for mindful calm.' }
];

export default function GamesBox() {
  const { user, refreshPoints, refreshUser } = useUser();
  const [activeGame, setActiveGame] = useState(null);
  const [todayGamePoints, setTodayGamePoints] = useState(null);
  const [gameFeedback, setGameFeedback] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchCapStatus = async () => {
      if (!user || !user.id) return;
      try {
        const res = await fetchWithAuth(`/api/points/${user.id}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.todayGamePoints !== undefined) {
            setTodayGamePoints(data.todayGamePoints);
          }
        }
      } catch (err) {
        console.error('Failed to fetch game points status', err);
      }
    };
    fetchCapStatus();
    return () => { isMounted = false; };
  }, [user]);

  const handleGameComplete = async () => {
    if (!user || !user.id) return;
    try {
      const res = await fetchWithAuth(`/api/points/${user.id}/award`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points: 5, reason: 'mini_game_played' })
      });
      if (res.ok) {
        const data = await res.json();
        setTodayGamePoints(data.todayGamePoints ?? 0);
        if (data.capReached || data.pointsAwarded === 0) {
          setGameFeedback({
            type: 'cap',
            message: "You've hit today's game points cap (10/10) — nice session! Points reset tomorrow."
          });
        } else {
          setGameFeedback({
            type: 'success',
            message: `+${data.pointsAwarded} Mode Points! (${data.todayGamePoints}/10 daily game points)`
          });
        }
      }
      if (refreshPoints) refreshPoints();
      else if (refreshUser) refreshUser();
    } catch (err) {
      console.error('Failed to award points', err);
    }
  };

  return (
    <GlassCard className="dashboard-card games-box-card">
      <div className="card-header">
        <div className="icon-wrapper active-icon">
          <Gamepad2 size={24} />
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {todayGamePoints !== null && (
            <span className={`card-badge ${todayGamePoints >= 10 ? 'cap-badge' : 'active-badge'}`}>
              {todayGamePoints >= 10 ? 'Daily Game Cap: 10/10' : `${todayGamePoints}/10 Daily Game Points`}
            </span>
          )}
          <span className="card-badge active-badge">Take a Break</span>
        </div>
      </div>
      <h3 className="card-title">Mini Games</h3>

      {gameFeedback && (
        <div className={`game-feedback-banner ${gameFeedback.type === 'cap' ? 'cap-banner' : 'success-banner'}`}>
          {gameFeedback.type === 'cap' ? <Info size={18} /> : <Sparkles size={18} />}
          <span>{gameFeedback.message}</span>
        </div>
      )}
      
      {!activeGame ? (
        <>
          <p className="card-description">
            Feeling stressed or losing focus? Take a moment for yourself with these lightweight web activities. Earn up to 10 Mode Points per day!
          </p>
          <div className="games-menu-grid">
            {GAMES.map(game => (
              <div key={game.id} className="game-menu-item" onClick={() => setActiveGame(game.id)}>
                <game.icon size={28} className="game-menu-icon" />
                <h4>{game.name}</h4>
                <p>{game.desc}</p>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="active-game-container">
          <button className="back-to-games-btn" onClick={() => setActiveGame(null)}>
            ← Back to Games Menu
          </button>
          
          <div className="game-render-area">
            {activeGame === 'breathing' && <BreathingBubble onComplete={handleGameComplete} />}
            {activeGame === 'bubble' && <BubblePop onComplete={handleGameComplete} />}
            {activeGame === 'sliding' && <SlidingPuzzle onComplete={handleGameComplete} />}
            {activeGame === 'memory' && <MemoryMatch onComplete={handleGameComplete} />}
            {activeGame === 'sand' && <ZenSandGarden onComplete={handleGameComplete} />}
          </div>
        </div>
      )}
    </GlassCard>
  );
}
