import React, { useState, useEffect } from 'react';
import './ProgressPage.css';
import Navbar from '../components/Navbar';
import Button from '../components/Button';
import { useUser } from '../context/UserContext';
import { fetchWithAuth } from '../api/client';
import { LineChart, Calendar, Award, MessageSquare, StickyNote, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const ProgressPage = ({ onBack, onLogout }) => {
  const { user } = useUser();
  const [checkins, setCheckins] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [adminNotes, setAdminNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        if (!user || !user.id) return;
        
        setError(null);
        setLoading(true);

        // Fetch user checkins
        const checkinsRes = await fetchWithAuth(`/api/checkin/progress/${user.id}`);
        if (!checkinsRes.ok) {
           throw new Error('Failed to fetch checkins');
        }
        const checkinsData = await checkinsRes.json();
        
        if (!Array.isArray(checkinsData)) {
            throw new Error('Invalid checkins data format');
        }

        if (isMounted) setCheckins(checkinsData);

        // Map data to last 7 days (ensure stable Date string comparison)
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          
          // Use YYYY-MM-DD for stable comparison
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          const targetDateString = `${yyyy}-${mm}-${dd}`;
          
          const labelDateStr = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
          
          const checkinForDate = checkinsData.find(c => {
             if (!c.created_at) return false;
             // Extract YYYY-MM-DD from ISO string
             const cDateStr = c.created_at.substring(0, 10);
             return cDateStr === targetDateString;
          });
          
          last7Days.push({
            date: labelDateStr,
            score: checkinForDate?.EmotionResult?.wellness_score || 0
          });
        }
        if (isMounted) setChartData(last7Days);

        // Fetch admin suggestions
        const suggRes = await fetchWithAuth(`/api/admin/suggestions?userId=${user.id}`);
        if (suggRes.ok) {
            const suggData = await suggRes.json();
            if (isMounted && Array.isArray(suggData)) setSuggestions(suggData);
        }

        // Fetch admin notes
        const notesRes = await fetchWithAuth(`/api/admin/admin-notes/${user.id}`);
        if (notesRes.ok) {
          const notesData = await notesRes.json();
          if (isMounted && Array.isArray(notesData)) setAdminNotes(notesData);
        }
      } catch (err) {
        console.error('Failed to load progress data:', err);
        if (isMounted) setError(err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => { isMounted = false; };
  }, [user]);

  const avgWellness = checkins.length > 0 
    ? Math.round(checkins.reduce((sum, c) => sum + (c.EmotionResult?.wellness_score || 0), 0) / checkins.length)
    : 0;

  return (
    <div className="progress-page">
      <Navbar onLogout={onLogout} showLogout={true} />
      
      <div className="progress-content">
        <header className="progress-header">
          <h1>Your Wellness Journey</h1>
          <p>Track your emotional trends and view personalized suggestions.</p>
        </header>

        {loading ? (
          <div className="progress-loading">Loading your data...</div>
        ) : error ? (
          <div className="progress-card error-card" style={{ textAlign: 'center', padding: '3rem' }}>
            <h3 style={{ color: '#ef5350', justifyContent: 'center' }}>
              <AlertCircle size={24} style={{ marginRight: '8px' }} />
              Couldn't load your progress right now
            </h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{error}</p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </div>
        ) : (
          <div className="progress-grid">
            
            {/* Stats Overview */}
            <div className="progress-card stats-card">
              <h3><LineChart size={20} /> Overview</h3>
              <div className="stats-row">
                <div className="stat-box">
                  <span className="stat-value">{checkins.length}</span>
                  <span className="stat-label">Total Check-ins</span>
                </div>
                <div className="stat-box">
                  <span className="stat-value">{avgWellness}</span>
                  <span className="stat-label">Avg Wellness Score</span>
                </div>
                <div className="stat-box">
                  <span className="stat-value">{user.points || 0}</span>
                  <span className="stat-label">Reward Points</span>
                </div>
              </div>
            </div>

            {/* Timeline Bar Chart */}
            <div className="progress-card chart-card">
              <h3><Calendar size={20} /> Wellness Timeline (Last 7 Days)</h3>
              {checkins.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                  <p>No check-ins yet — your progress will appear here once you start.</p>
                </div>
              ) : null}
              <div className="chart-container" style={{ height: '300px', marginTop: '20px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 12 }} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 12 }} domain={[0, 100]} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      labelStyle={{ color: '#0f172a', fontWeight: 'bold' }}
                    />
                    <Bar dataKey="score" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Admin Notes */}
            <div className="progress-card suggestions-card">
              <h3><StickyNote size={20} /> Mentor Notes</h3>
              {adminNotes.length === 0 ? (
                <p className="no-data">No mentor notes available yet.</p>
              ) : (
                <div className="suggestions-list">
                  {adminNotes.map(note => (
                    <div key={note.id} className="suggestion-item">
                      <div className="suggestion-bubble" style={{ background: '#fef3c7', color: '#92400e', borderLeftColor: '#f59e0b' }}>
                        {note.note_text}
                      </div>
                      <div className="suggestion-date">{new Date(note.created_at).toLocaleDateString()}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Admin Suggestions */}
            <div className="progress-card suggestions-card">
              <h3><MessageSquare size={20} /> System Suggestions</h3>
              {suggestions.length === 0 ? (
                <p className="no-data">No system suggestions yet.</p>
              ) : (
                <div className="suggestions-list">
                  {suggestions.map(s => (
                    <div key={s.id} className="suggestion-item">
                      <div className="suggestion-bubble">{s.message}</div>
                      <div className="suggestion-date">{new Date(s.created_at).toLocaleDateString()}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        <div className="progress-actions">
          <Button onClick={onBack} className="back-btn">Back to Dashboard</Button>
        </div>
      </div>
    </div>
  );
};

export default ProgressPage;
