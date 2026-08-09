import React from 'react';
import './GlassCard.css';

const GlassCard = ({ children, className = '', hoverEffect = true, onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`glass-card ${hoverEffect ? 'hover-effect' : ''} ${className}`}
      style={onClick ? { cursor: 'pointer' } : {}}
    >
      {children}
    </div>
  );
};

export default GlassCard;
