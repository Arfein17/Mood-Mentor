import React from 'react';
import './Dashboard.css';
import GlassCard from '../components/GlassCard';
import Button from '../components/Button';
import Navbar from '../components/Navbar';
import { 
  Heart, Award, TrendingUp, BookOpen, Lock, Sparkles
} from 'lucide-react';

const Dashboard = ({ onLogout, onStartCheckin, onOpenRewards, onOpenProgress }) => {
  return (
    <div className="dashboard-page">
      <Navbar onLogout={onLogout} showLogout={true} />

      <main className="dashboard-content">
        <header className="dashboard-header">
          <div className="welcome-message">
            <span className="welcome-tag">Wellness Space</span>
            <h1>Welcome to Mode Mentor</h1>
            <p>Your sanctuary for balancing work, studies, and emotional well-being.</p>
          </div>
        </header>

        {/* Responsive Grid of Cards */}
        <div className="dashboard-grid">
          {/* Card 1: Daily Check-in (Active) */}
          <GlassCard className="dashboard-card active-card" hoverEffect={true}>
            <div className="card-header">
              <div className="icon-wrapper active-icon">
                <Heart size={24} />
              </div>
              <span className="card-badge active-badge">Daily Task</span>
            </div>
            <h3 className="card-title">Daily Check-in</h3>
            <p className="card-description">
              "Share how you're feeling today." Log your mood, reflect on your environment, and track daily emotional patterns.
            </p>
            <Button onClick={onStartCheckin} glow className="card-action-btn">
              Start Check-in
            </Button>
          </GlassCard>

          {/* Card 2: Rewards (Active) */}
          <GlassCard className="dashboard-card active-card" hoverEffect={true}>
            <div className="card-header">
              <div className="icon-wrapper active-icon">
                <Award size={24} />
              </div>
              <span className="card-badge active-badge">Live</span>
            </div>
            <h3 className="card-title">Rewards</h3>
            <p className="card-description">
              Earn relaxation badges, hydration medals, and productivity vouchers as you complete your wellness tasks.
            </p>
            <Button glow className="card-action-btn" onClick={onOpenRewards}>
              View Rewards
            </Button>
          </GlassCard>

          {/* Card 3: Progress (Active) */}
          <GlassCard className="dashboard-card active-card" hoverEffect={true}>
            <div className="card-header">
              <div className="icon-wrapper active-icon">
                <TrendingUp size={24} />
              </div>
              <span className="card-badge active-badge">Live</span>
            </div>
            <h3 className="card-title">Progress</h3>
            <p className="card-description">
              Track your emotional trends, wellness score, and view personal suggestions from the admin team.
            </p>
            <Button glow className="card-action-btn" onClick={onOpenProgress}>
              View Progress
            </Button>
          </GlassCard>

        </div>
      </main>

    </div>
  );
};

export default Dashboard;
