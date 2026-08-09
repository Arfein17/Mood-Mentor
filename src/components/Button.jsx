import React, { useState } from 'react';
import './Button.css';

const Button = ({ children, onClick, className = '', type = 'button', disabled = false, glow = false }) => {
  const [ripples, setRipples] = useState([]);

  const handleClick = (e) => {
    if (disabled) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const newRipple = {
      x,
      y,
      id: Date.now() + Math.random(),
    };
    
    setRipples((prev) => [...prev, newRipple]);
    
    // Clear ripple after animation
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
    }, 600);
    
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <button
      type={type}
      disabled={disabled}
      className={`premium-btn ${glow ? 'glow-btn' : ''} ${className}`}
      onClick={handleClick}
    >
      <span className="btn-content">{children}</span>
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="ripple-span"
          style={{ left: ripple.x, top: ripple.y }}
        />
      ))}
    </button>
  );
};

export default Button;
