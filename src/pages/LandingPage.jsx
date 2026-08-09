import React, { useState } from 'react';
import './LandingPage.css';
import Button from '../components/Button';
import { ShieldCheck } from 'lucide-react';

const LandingPage = ({ onBegin, onAdminAccess }) => {
  const [isExiting, setIsExiting] = useState(false);

  const handleBeginClick = () => {
    setIsExiting(true);
    setTimeout(() => onBegin(), 1000);
  };

  return (
    <div className={`landing-screen ${isExiting ? 'exit-transition' : ''}`}>
      <div className="landing-card">
        <h1 className="landing-title">Mode Mentor</h1>
        <p className="landing-subtitle">Empowering Wellness • Inspiring Productivity</p>
        <div className="landing-cta">
          <Button onClick={handleBeginClick} glow className="begin-btn">
            Let's Begin
          </Button>
        </div>
        {onAdminAccess && (
          <button className="admin-access-link" onClick={onAdminAccess}>
            <ShieldCheck size={14} /> Admin Access
          </button>
        )}
      </div>
    </div>
  );
};

export default LandingPage;
