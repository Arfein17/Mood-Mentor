import React, { useEffect, useMemo } from 'react';
import './CheckinLoading.css';

const MESSAGES = [
  'Understanding your wellness journey...',
  'Preparing your personal reflection...',
  'Creating a calm space for your insights...',
  'Almost there, breathe deeply...',
];

const CheckinLoading = ({ onComplete }) => {
  // Auto-advance to result after 3.5s
  useEffect(() => {
    const timer = setTimeout(() => onComplete(), 3500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  const leaves = useMemo(() =>
    Array.from({ length: 10 }).map((_, i) => ({
      id: i,
      color: ['#81c784','#a5d6a7','#4db6ac','#80cbc4','#ffb74d','#ff8a65','#b39ddb','#90caf9','#a5d6a7','#81c784'][i],
      delay: `${i * 0.9}s`,
      duration: `${10 + i * 1.2}s`,
    })), []);

  return (
    <div className="loading-page">
      {/* Dark nature bg */}
      <div className="loading-bg" />
      <div className="loading-orb lo-1" />
      <div className="loading-orb lo-2" />

      {/* Floating leaves */}
      {leaves.map((l) => (
        <span key={l.id} className="loading-leaf" style={{ animationDelay: l.delay, animationDuration: l.duration, left: `${10 + l.id * 8.5}%` }}>
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path d="M17,8C8,10 5.9,16.17 3.82,20.24C3.69,20.5 3.82,20.82 4.1,20.9C7.86,22 14,20 16,16C18,12 18,8 17,8Z"
              fill={l.color} opacity="0.6" />
          </svg>
        </span>
      ))}

      <div className="loading-content">
        {/* Breathing circle animation */}
        <div className="breathing-container">
          <div className="breath-ring br-outer" />
          <div className="breath-ring br-middle" />
          <div className="breath-ring br-inner" />
          <div className="breath-core">
            <svg viewBox="0 0 24 24" width="36" height="36">
              <path d="M17,8C8,10 5.9,16.17 3.82,20.24C3.69,20.5 3.82,20.82 4.1,20.9C7.86,22 14,20 16,16C18,12 18,8 17,8Z"
                fill="#81c784" opacity="0.9" />
            </svg>
          </div>
        </div>

        <h2 className="loading-title">Understanding your wellness journey...</h2>
        <p className="loading-sub">Take a deep breath and relax for a moment</p>

        {/* Progress bar */}
        <div className="loading-progress-track">
          <div className="loading-progress-fill" />
        </div>

        {/* Cycling messages */}
        <div className="loading-messages">
          {MESSAGES.map((m, i) => (
            <p key={i} className="loading-msg" style={{ animationDelay: `${i * 0.9}s` }}>
              {m}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CheckinLoading;
