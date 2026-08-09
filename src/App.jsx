import React, { useState, useMemo } from 'react';
import './App.css';
import LandingPage from './pages/LandingPage';
import LoginSignup from './pages/LoginSignup';
import Dashboard from './pages/Dashboard';
import DailyCheckin from './pages/DailyCheckin';
import CheckinLoading from './pages/CheckinLoading';
import CheckinResult from './pages/CheckinResult';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import RewardsPage from './pages/RewardsPage';
import ProgressPage from './pages/ProgressPage';
import heroBg from './assets/hero_bg.png';
import { useUser } from './context/UserContext';

function App() {
  const [currentScreen, setCurrentScreen] = useState('landing');
  const [wellnessResult, setWellnessResult] = useState(null);
  const [checkinContext, setCheckinContext] = useState({ text: '', emotion: null });
  const { user, logout, refreshPoints } = useUser();

  const handleLogout = () => {
    logout();
    setCurrentScreen('landing');
  };

  // Generate particles once
  const particles = useMemo(() =>
    Array.from({ length: 22 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 10}s`,
      duration: `${7 + Math.random() * 9}s`,
      size: `${2 + Math.random() * 5}px`,
    })), []);

  // Generate leaves once
  const leaves = useMemo(() =>
    Array.from({ length: 14 }).map((_, i) => ({
      id: i,
      delay: `${i * 1.6 + Math.random() * 2}s`,
      duration: `${11 + Math.random() * 7}s`,
      scale: 0.35 + Math.random() * 0.5,
      type: Math.floor(Math.random() * 3) + 1,
      color: ['#e65100', '#ff8f00', '#ffb74d', '#ff7043', '#bf360c', '#f4511e'][Math.floor(Math.random() * 6)],
    })), []);

  // Generate grass blades once
  const grassBlades = useMemo(() =>
    Array.from({ length: 45 }).map((_, i) => ({
      id: i,
      left: `${i * 2.25}%`,
      height: `${20 + Math.random() * 28}px`,
      delay: `${Math.random() * 3}s`,
      duration: `${2.5 + Math.random() * 2.5}s`,
    })), []);

  // Screens that use the nature background
  const useNatureBg = ['landing', 'auth'].includes(currentScreen);

  return (
    <div className="app-root">
      {/* ═══════════════════════════════════════════════════════════
          AMBIENT ANIMATED BACKGROUND — shared across Landing & Auth
          Hidden on Dashboard and Check-in screens (own backgrounds)
         ═══════════════════════════════════════════════════════════ */}
      {useNatureBg && (
        <div className={`ambient-bg ${currentScreen === 'auth' ? 'auth-dimmed' : ''}`}>

          {/* 1. Base 4K Landscape Photo */}
          <div className="bg-photo" style={{ backgroundImage: `url(${heroBg})` }} />

          {/* 2. Warm vignette at bottom for grounding */}
          <div className="bg-vignette" />

          {/* 3. Volumetric Sunlight Rays */}
          <div className="sun-rays" />
          <div className="sun-rays sun-rays-2" />

          {/* 4. Drifting Clouds */}
          <div className="cloud cloud-a" />
          <div className="cloud cloud-b" />
          <div className="cloud cloud-c" />

          {/* 5. Flying Birds */}
          <div className="birds-container">
            <svg className="bird-svg bird-1" viewBox="0 0 24 12"><path d="M0,6 Q6,0 12,6 Q18,0 24,6" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" fill="none"/></svg>
            <svg className="bird-svg bird-2" viewBox="0 0 24 12"><path d="M0,6 Q6,0 12,6 Q18,0 24,6" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" fill="none"/></svg>
            <svg className="bird-svg bird-3" viewBox="0 0 24 12"><path d="M0,6 Q6,0 12,6 Q18,0 24,6" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" fill="none"/></svg>
          </div>

          {/* 6. Floating Light Particles (firefly-like) */}
          <div className="particles-container">
            {particles.map((p) => (
              <span
                key={p.id}
                className="particle"
                style={{
                  left: p.left,
                  animationDelay: p.delay,
                  animationDuration: p.duration,
                  width: p.size,
                  height: p.size,
                }}
              />
            ))}
          </div>

          {/* 7. Falling Autumn Leaves */}
          <div className="leaves-container">
            {leaves.map((l) => (
              <span
                key={l.id}
                className={`leaf leaf-path-${l.type}`}
                style={{
                  animationDelay: l.delay,
                  animationDuration: l.duration,
                }}
              >
                <svg viewBox="0 0 24 24" width={20 * l.scale} height={20 * l.scale}>
                  <path
                    d="M17,8C8,10 5.9,16.17 3.82,20.24C3.69,20.5 3.82,20.82 4.1,20.9C7.86,22 14,20 16,16C18,12 18,8 17,8Z"
                    fill={l.color}
                    opacity="0.85"
                  />
                </svg>
              </span>
            ))}
          </div>

          {/* 8. Swaying Grass */}
          <div className="grass-container">
            {grassBlades.map((g) => (
              <span
                key={g.id}
                className="grass-blade"
                style={{
                  left: g.left,
                  height: g.height,
                  animationDelay: g.delay,
                  animationDuration: g.duration,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* ═══ Screen Router ═══ */}
      <div className="screen-layer">
        {currentScreen === 'landing' && (
          <LandingPage
            onBegin={() => setCurrentScreen('auth')}
            onAdminAccess={() => setCurrentScreen('admin-login')}
          />
        )}
        {currentScreen === 'auth' && (
          <LoginSignup
            onLoginSuccess={() => setCurrentScreen('dashboard')}
            onBackToLanding={() => setCurrentScreen('landing')}
          />
        )}
        {currentScreen === 'dashboard' && (
          <Dashboard
            onLogout={handleLogout}
            onStartCheckin={() => setCurrentScreen('checkin')}
            onOpenRewards={() => setCurrentScreen('rewards')}
            onOpenProgress={() => setCurrentScreen('progress')}
          />
        )}
        {currentScreen === 'progress' && (
          <ProgressPage
            onBack={() => setCurrentScreen('dashboard')}
            onLogout={handleLogout}
          />
        )}
        {currentScreen === 'rewards' && (
          <RewardsPage
            onBack={() => setCurrentScreen('dashboard')}
            onLogout={handleLogout}
          />
        )}
        {currentScreen === 'checkin' && (
          <DailyCheckin
            onSubmit={({ result, text, emotion }) => {
              setWellnessResult(result);
              setCheckinContext({ text: text || '', emotion: emotion || null });
              setCurrentScreen('checkin-loading');
            }}
            onBack={() => setCurrentScreen('dashboard')}
          />
        )}
        {currentScreen === 'checkin-loading' && (
          <CheckinLoading
            onComplete={() => setCurrentScreen('checkin-result')}
          />
        )}
        {currentScreen === 'checkin-result' && (
          <CheckinResult
            wellnessResult={wellnessResult}
            checkinContext={checkinContext}
            onReturnToDashboard={() => {
              refreshPoints();
              setCurrentScreen('dashboard');
            }}
          />
        )}
        {currentScreen === 'admin-login' && (
          <AdminLogin
            onAdminLoginSuccess={() => setCurrentScreen('admin')}
            onBack={() => setCurrentScreen('landing')}
          />
        )}
        {currentScreen === 'admin' && (
          <AdminDashboard
            onBack={() => setCurrentScreen('landing')}
            onLogout={handleLogout}
          />
        )}
      </div>
    </div>
  );
}

export default App;
