import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { fetchPoints } from '../api/client';

const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('mode_mentor_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [points, setPoints] = useState(0);

  const refreshPoints = useCallback(async () => {
    if (user && user.id) {
      try {
        const data = await fetchPoints(user.id);
        setPoints(data.points || data.totalPoints || 0);
      } catch (err) {
        console.error('Failed to fetch points in context', err);
      }
    }
  }, [user]);

  useEffect(() => {
    refreshPoints();
  }, [refreshPoints]);

  const login = (userId, role = 'employee', token = '') => {
    const newUser = { id: userId, role };
    setUser(newUser);
    localStorage.setItem('mode_mentor_user', JSON.stringify(newUser));
    if (token) {
        localStorage.setItem('mode_mentor_token', token);
    }
  };

  const logout = () => {
    setUser(null);
    setPoints(0);
    localStorage.removeItem('mode_mentor_user');
    localStorage.removeItem('mode_mentor_token');
  };

  return (
    <UserContext.Provider value={{ user, login, logout, points, setPoints, refreshPoints }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);
