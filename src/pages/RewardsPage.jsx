import React, { useState, useEffect } from 'react';
import './RewardsPage.css';
import GlassCard from '../components/GlassCard';
import Navbar from '../components/Navbar';
import Button from '../components/Button';
import { useUser } from '../context/UserContext';
import { fetchPoints, redeemReward } from '../api/client';
import { ArrowLeft, Award, Gift, Star, Trophy, Sparkles } from 'lucide-react';

const REWARDS = [
  { id: 'extra_break',  name: '15-Min Extra Break',  cost: 50,  emoji: '☕', desc: 'Take a refreshing 15-minute break whenever you need it.' },
  { id: 'free_lunch',   name: 'Free Lunch Voucher',  cost: 100, emoji: '🍕', desc: 'Enjoy a free meal on us — you earned it!' },
  { id: 'wellness_kit', name: 'Wellness Kit',         cost: 150, emoji: '🧘', desc: 'A calming candle, stress ball, and herbal tea set.' },
  { id: 'book_voucher', name: 'Book Store Voucher',   cost: 200, emoji: '📚', desc: 'Pick any book to fuel your mind and soul.' },
  { id: 'movie_ticket', name: 'Movie Night Ticket',   cost: 250, emoji: '🎬', desc: 'A ticket for a fun movie night — bring a friend!' },
  { id: 'half_day',     name: 'Half-Day Friday',      cost: 500, emoji: '🏖️', desc: 'Leave early on Friday — recharge and relax.' },
];

const RewardsPage = ({ onBack, onLogout }) => {
  const { user, points, setPoints } = useUser();
  const [badges, setBadges] = useState([]);
  const [recentAwards, setRecentAwards] = useState([]);
  const [redeeming, setRedeeming] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (user) {
      fetchPoints(user.id).then(data => {
        setPoints(data.totalPoints || data.points || 0);
        setBadges(data.badges || []);
        setRecentAwards(data.recentAwards || []);
      }).catch(console.error);
    }
  }, [user]);

  const handleRedeem = async (reward) => {
    if (points < reward.cost) {
      setMessage(`Not enough points! You need ${reward.cost - points} more MP.`);
      return;
    }
    setRedeeming(reward.id);
    setMessage('');
    try {
      const result = await redeemReward(user.id, reward.id);
      setPoints(result.newTotal);
      setMessage(`🎉 Successfully redeemed "${result.rewardName}"!`);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setRedeeming(null);
    }
  };

  return (
    <div className="rewards-page">
      <Navbar showLogout={true} onLogout={onLogout} />

      <div className="rewards-scroll">
        <div className="rewards-inner">
          <button className="rewards-back-btn" onClick={onBack}>
            <ArrowLeft size={18} />
            <span>Back to Dashboard</span>
          </button>

          <div className="rewards-header">
            <div className="rewards-icon-ring">
              <Award size={32} />
            </div>
            <h1 className="rewards-title">Rewards Catalog</h1>
            <p className="rewards-subtitle">
              Earn Mode Points by completing daily check-ins, challenges, and streaks. Redeem them for real-world perks!
            </p>
          </div>

          {/* Points Balance */}
          <GlassCard className="points-balance-card">
            <div className="points-balance">
              <div className="points-icon"><Star size={28} color="#ffb74d" /></div>
              <div className="points-info">
                <span className="points-amount">{points}</span>
                <span className="points-label">Mode Points</span>
              </div>
            </div>
            {badges.length > 0 && (
              <div className="badge-row">
                <Trophy size={14} />
                {badges.map((b, i) => (
                  <span key={i} className="badge-chip">{b.badge_name}</span>
                ))}
              </div>
            )}
          </GlassCard>

          {/* Message */}
          {message && (
            <div className={`rewards-message ${message.includes('🎉') ? 'success' : 'error'}`}>
              {message}
            </div>
          )}

          {/* Rewards Grid */}
          <div className="rewards-grid">
            {REWARDS.map((reward) => {
              const canAfford = points >= reward.cost;
              return (
                <GlassCard key={reward.id} className={`reward-card ${canAfford ? 'affordable' : 'locked'}`}>
                  <div className="reward-emoji">{reward.emoji}</div>
                  <h3 className="reward-name">{reward.name}</h3>
                  <p className="reward-desc">{reward.desc}</p>
                  <div className="reward-cost">
                    <Star size={14} color="#ffb74d" />
                    <span>{reward.cost} MP</span>
                  </div>
                  <Button
                    glow={canAfford}
                    className="reward-btn"
                    onClick={() => handleRedeem(reward)}
                    disabled={!canAfford || redeeming === reward.id}
                  >
                    {redeeming === reward.id ? 'Redeeming...' : canAfford ? 'Redeem' : `Need ${reward.cost - points} more`}
                  </Button>
                </GlassCard>
              );
            })}
          </div>

          {/* Recent Activity */}
          {recentAwards.length > 0 && (
            <GlassCard className="recent-activity-card">
              <h3 className="activity-title">
                <Sparkles size={16} /> Recent Point Activity
              </h3>
              <ul className="activity-list">
                {recentAwards.slice(0, 5).map((award, i) => (
                  <li key={i} className="activity-item">
                    <span className={`activity-points ${award.points_awarded < 0 ? 'negative' : 'positive'}`}>
                      {award.points_awarded > 0 ? '+' : ''}{award.points_awarded} MP
                    </span>
                    <span className="activity-reason">{award.reason}</span>
                  </li>
                ))}
              </ul>
            </GlassCard>
          )}

        </div>
      </div>
    </div>
  );
};

export default RewardsPage;
