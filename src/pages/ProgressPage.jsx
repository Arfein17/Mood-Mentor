import React, { useState, useEffect } from 'react';
import './ProgressPage.css';
import Navbar from '../components/Navbar';
import Button from '../components/Button';
import { useUser } from '../context/UserContext';
import { fetchWithAuth, submitMentorPost, fetchMyMentorPosts } from '../api/client';
import { LineChart, Calendar, Award, StickyNote, AlertCircle, ArrowLeft, Send, MessageCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const ProgressPage = ({ onBack, onLogout, onOpenProfile }) => {
  const { user, points } = useUser();
  const [checkins, setCheckins] = useState([]);
  const [adminNotes, setAdminNotes] = useState([]);
  const [mentorPosts, setMentorPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chartData, setChartData] = useState([]);

  // Mentor Notes compose state
  const [newMessage, setNewMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [postStatus, setPostStatus] = useState('');

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

        // Map data to last 7 days
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          const targetDateString = `${yyyy}-${mm}-${dd}`;
          const labelDateStr = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
          const checkinForDate = checkinsData.find(c => {
             if (!c.created_at) return false;
             const cDateStr = c.created_at.substring(0, 10);
             return cDateStr === targetDateString;
          });
          last7Days.push({
            date: labelDateStr,
            score: checkinForDate?.EmotionResult?.wellness_score || 0
          });
        }
        if (isMounted) setChartData(last7Days);

        // Fetch admin broadcast notes (non-interactive)
        const notesRes = await fetchWithAuth(`/api/admin/admin-notes/${user.id}`);
        if (notesRes.ok) {
          const notesData = await notesRes.json();
          // Only show broadcast notes (not user posts / admin replies)
          if (isMounted && Array.isArray(notesData)) {
            setAdminNotes(notesData.filter(n => !n.is_user_post && !n.parent_id));
          }
        }

        // Fetch user's own mentor posts with replies
        const postsRes = await fetchWithAuth('/api/admin/mentor-posts/my');
        if (postsRes.ok) {
          const postsData = await postsRes.json();
          if (isMounted && Array.isArray(postsData)) setMentorPosts(postsData);
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

  const handleSubmitPost = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    setSubmitting(true);
    setPostStatus('');
    try {
      await submitMentorPost(newMessage.trim());
      setNewMessage('');
      setPostStatus('success');
      // Refresh posts
      const postsRes = await fetchWithAuth('/api/admin/mentor-posts/my');
      if (postsRes.ok) {
        const postsData = await postsRes.json();
        setMentorPosts(Array.isArray(postsData) ? postsData : []);
      }
    } catch (err) {
      setPostStatus('error:' + err.message);
    } finally {
      setSubmitting(false);
      setTimeout(() => setPostStatus(''), 4000);
    }
  };

  return (
    <div className="progress-page">
      <Navbar onLogout={onLogout} onOpenProfile={onOpenProfile} showLogout={true} />
      
      {/* Back button below navbar */}
      <div className="progress-back-row">
        <button className="progress-back-btn" onClick={onBack}>
          <ArrowLeft size={18} />
          <span>Back to Dashboard</span>
        </button>
      </div>

      <div className="progress-content">
        <header className="progress-header">
          <h1>Your Wellness Journey</h1>
          <p>Track your emotional trends and connect with your mentor.</p>
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
                  {/* Use live points from UserContext, not stale user.points */}
                  <span className="stat-value">{points}</span>
                  <span className="stat-label">Mode Points</span>
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

            {/* Mentor Broadcast Notes (admin-to-all messages) */}
            {adminNotes.length > 0 && (
              <div className="progress-card suggestions-card">
                <h3><Award size={20} /> Announcements from Mentor</h3>
                <div className="suggestions-list">
                  {adminNotes.map(note => (
                    <div key={note.id} className="suggestion-item">
                      <div className="suggestion-bubble" style={{ background: '#fef3c7', color: '#92400e', borderLeft: '3px solid #f59e0b' }}>
                        {note.note_text}
                      </div>
                      <div className="suggestion-date">{new Date(note.created_at).toLocaleDateString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Interactive Mentor Notes */}
            <div className="progress-card mentor-notes-card">
              <h3><StickyNote size={20} /> Mentor Notes</h3>
              <p className="mentor-notes-desc">
                Post a message or question for your mentor. Only the admin can reply.
              </p>

              {/* Compose area */}
              <form onSubmit={handleSubmitPost} className="mentor-compose-form">
                <div className="mentor-compose-row">
                  <textarea
                    className="mentor-compose-input"
                    placeholder="Share how you're feeling, ask a question, or request support..."
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    rows={3}
                    maxLength={500}
                    disabled={submitting}
                  />
                  <button
                    type="submit"
                    className="mentor-send-btn"
                    disabled={submitting || !newMessage.trim()}
                  >
                    {submitting ? '...' : <Send size={18} />}
                  </button>
                </div>
                <div className="mentor-compose-footer">
                  <span className="char-count">{newMessage.length}/500</span>
                  {postStatus === 'success' && <span className="post-status success">✓ Message sent!</span>}
                  {postStatus.startsWith('error:') && <span className="post-status error">⚠ {postStatus.replace('error:', '')}</span>}
                </div>
              </form>

              {/* User's posts and admin replies */}
              <div className="mentor-thread-list">
                {mentorPosts.length === 0 ? (
                  <p className="no-data"><MessageCircle size={16} style={{ marginRight: '6px' }} />No messages yet. Say hello to your mentor!</p>
                ) : (
                  mentorPosts.map(post => (
                    <div key={post.id} className="mentor-thread-item">
                      {/* User's post bubble */}
                      <div className="mentor-post-bubble user-post">
                        <div className="mentor-post-label">You</div>
                        <div className="mentor-post-text">{post.note_text}</div>
                        <div className="mentor-post-time">{new Date(post.created_at).toLocaleString()}</div>
                      </div>
                      {/* Admin replies */}
                      {post.Replies && post.Replies.length > 0 && post.Replies.map(reply => (
                        <div key={reply.id} className="mentor-post-bubble admin-reply">
                          <div className="mentor-post-label mentor-label">🛡 Mentor</div>
                          <div className="mentor-post-text">{reply.note_text}</div>
                          <div className="mentor-post-time">{new Date(reply.created_at).toLocaleString()}</div>
                        </div>
                      ))}
                      {/* Pending reply indicator */}
                      {(!post.Replies || post.Replies.length === 0) && (
                        <div className="mentor-pending-badge">Awaiting mentor reply...</div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};

export default ProgressPage;
