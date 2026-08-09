import React, { useEffect, useState } from 'react';
import './Navbar.css';
import { Compass, LogOut, Award } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { fetchPoints } from '../api/client';

const Navbar = ({ onLogout, showLogout = false }) => {
  const { user, points } = useUser();

  return (
    <nav className="glass-navbar">
      <div className="navbar-brand">
        <Compass className="navbar-icon" />
        <span className="navbar-title">Mode Mentor</span>
      </div>
      <div className="navbar-tagline">
        Empowering Wellness • Inspiring Productivity
      </div>
      {showLogout && (
        <div className="navbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#ffb74d', fontWeight: 'bold', fontSize: '0.95rem' }}>
              <Award size={18} /> {points} MP
            </div>
          )}
          <button onClick={onLogout} className="logout-btn">
            <LogOut size={16} />
            <span>Exit Session</span>
          </button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
