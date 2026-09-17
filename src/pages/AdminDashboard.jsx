import React, { useEffect, useState } from 'react';
import './AdminDashboard.css';
import GlassCard from '../components/GlassCard';
import Navbar from '../components/Navbar';
import { fetchAdminAnalytics, fetchAdminTrends, fetchAdminReflections, broadcastAdminSuggestion, fetchAllMentorPosts, replyToMentorPost } from '../api/client';
import { ShieldCheck, Activity, AlertTriangle, TrendingUp, Users, PieChart, BarChart3, LineChart, MessageSquareQuote, Send, CheckCircle2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

/* Simple SVG bar chart component */
function BarChartViz({ data, label }) {
  if (!data || data.length === 0) return <p style={{ color: 'rgba(255,255,255,0.4)' }}>No data yet.</p>;
  const maxVal = Math.max(...data.map(d => d.value), 1);
  const colors = ['#81c784', '#ffb74d', '#90caf9', '#f06292', '#b39ddb', '#4db6ac', '#ff8a65'];
  
  return (
    <div className="viz-bar-chart">
      {data.map((d, i) => (
        <div key={i} className="viz-bar-row">
          <span className="viz-bar-label">{d.label}</span>
          <div className="viz-bar-track">
            <div
              className="viz-bar-fill"
              style={{
                width: `${(d.value / maxVal) * 100}%`,
                background: colors[i % colors.length],
                transition: 'width 1s ease'
              }}
            />
          </div>
          <span className="viz-bar-value">{Math.round(d.value)}</span>
        </div>
      ))}
    </div>
  );
}

/* Simple SVG donut chart */
function DonutChart({ segments, centerLabel }) {
  if (!segments || segments.length === 0) return null;
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  const colors = ['#81c784', '#ffb74d', '#90caf9', '#f06292', '#b39ddb', '#4db6ac'];
  let cumulative = 0;
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  
  return (
    <div className="viz-donut-wrap">
      <svg viewBox="0 0 100 100" className="viz-donut-svg">
        {segments.map((seg, i) => {
          const pct = seg.value / total;
          const offset = circumference * (1 - cumulative / total);
          const dashLen = circumference * pct;
          cumulative += seg.value;
          return (
            <circle
              key={i}
              cx="50" cy="50" r={radius}
              fill="none"
              stroke={colors[i % colors.length]}
              strokeWidth="12"
              strokeDasharray={`${dashLen} ${circumference - dashLen}`}
              strokeDashoffset={offset}
              transform="rotate(-90 50 50)"
              style={{ transition: 'all 1s ease' }}
            />
          );
        })}
      </svg>
      <div className="viz-donut-center">{centerLabel}</div>
      <div className="viz-donut-legend">
        {segments.map((seg, i) => (
          <div key={i} className="viz-legend-item">
            <span className="viz-legend-dot" style={{ background: colors[i % colors.length] }} />
            <span>{seg.label}: {seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const AdminDashboard = ({ onBack, onLogout }) => {
  const [analytics, setAnalytics] = useState(null);
  const [trends, setTrends] = useState([]);
  const [reflections, setReflections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Broadcast state
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [broadcastDept, setBroadcastDept] = useState('ALL');
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastStatus, setBroadcastStatus] = useState(null);

  // Mentor posts state
  const [mentorPosts, setMentorPosts] = useState([]);
  const [replyTexts, setReplyTexts] = useState({});
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyStatus, setReplyStatus] = useState({});

  useEffect(() => {
    const loadData = async () => {
      try {
        const [analyticsData, trendsData, reflectionsData, mentorPostsData] = await Promise.all([
          fetchAdminAnalytics(),
          fetchAdminTrends(),
          fetchAdminReflections(),
          fetchAllMentorPosts().catch(() => [])
        ]);
        setAnalytics(analyticsData);
        setTrends(trendsData);
        setReflections(reflectionsData);
        setMentorPosts(mentorPostsData || []);
      } catch (err) {
        setError('Failed to load admin data: ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleReply = async (postId) => {
    const msg = replyTexts[postId];
    if (!msg || !msg.trim()) return;
    setReplyingTo(postId);
    try {
      await replyToMentorPost(postId, msg.trim());
      setReplyTexts(prev => ({ ...prev, [postId]: '' }));
      setReplyStatus(prev => ({ ...prev, [postId]: 'success' }));
      // Refresh posts
      const updated = await fetchAllMentorPosts();
      setMentorPosts(updated || []);
      setTimeout(() => setReplyStatus(prev => ({ ...prev, [postId]: '' })), 3000);
    } catch (err) {
      setReplyStatus(prev => ({ ...prev, [postId]: 'error:' + err.message }));
    } finally {
      setReplyingTo(null);
    }
  };

  const handleBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastMsg.trim()) return;
    setBroadcasting(true);
    setBroadcastStatus(null);
    try {
      await broadcastAdminSuggestion(broadcastMsg.trim(), broadcastDept);
      setBroadcastStatus({
        type: 'success',
        text: `Suggestion broadcasted to ${broadcastDept === 'ALL' ? 'all departments' : `the ${broadcastDept} department`}!`
      });
      setBroadcastMsg('');
    } catch (err) {
      setBroadcastStatus({
        type: 'error',
        text: 'Error broadcasting: ' + err.message
      });
    } finally {
      setBroadcasting(false);
    }
  };

  // Prepare chart data from analytics
  const deptScores = analytics?.byDepartment?.map(d => ({
    label: d.department || 'Unknown',
    value: d.averageScore || 0
  })) || [];

  const deptCheckins = analytics?.byDepartment?.map(d => ({
    label: d.department || 'Unknown',
    value: d.count || 0
  })) || [];

  const emotionBreakdown = analytics?.emotionBreakdown || [];

  // Available departments for broadcasting
  const departmentOptions = Array.from(new Set(
    (analytics?.byDepartment || [])
      .map(d => d.department)
      .filter(d => d && d !== 'Unknown')
  ));

  return (
    <div className="admin-page">
      <Navbar showLogout={true} onLogout={onLogout} showBack={true} onBack={onBack} />

      <div className="admin-scroll">
        <div className="admin-inner">

          <div className="admin-header">
            <div className="admin-icon-ring">
              <ShieldCheck size={32} />
            </div>
            <h1 className="admin-title">Admin & Privacy Analytics</h1>
            <p className="admin-subtitle">
              Aggregated, anonymized department-level insights. No individual tracking or PII is ever visible.
            </p>
          </div>

          <GlassCard className="admin-card broadcast-card">
            <h3 className="admin-card-title">
              <AlertTriangle size={18} style={{ color: '#ffb74d' }} />
              Broadcast Wellness Suggestion
            </h3>
            <p className="admin-subtitle" style={{ marginBottom: '1rem' }}>
              Send proactive guidance that appears in users' Progress page "Mentor Notes" section.
            </p>

            {broadcastStatus && (
              <div className={`broadcast-alert-banner ${broadcastStatus.type === 'success' ? 'success' : 'error'}`}>
                {broadcastStatus.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                <span>{broadcastStatus.text}</span>
              </div>
            )}

            <form onSubmit={handleBroadcast} className="broadcast-form">
              <div className="broadcast-fields">
                <input
                  name="suggestion"
                  value={broadcastMsg}
                  onChange={(e) => setBroadcastMsg(e.target.value)}
                  placeholder="E.g., Practice mindful breathing today or join our afternoon stretch!"
                  className="broadcast-input"
                  required
                />
                <select
                  value={broadcastDept}
                  onChange={(e) => setBroadcastDept(e.target.value)}
                  className="broadcast-dept-select"
                  title="Target Department"
                >
                  <option value="ALL">All Departments (Global)</option>
                  {departmentOptions.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={broadcasting || !broadcastMsg.trim()}
                  className="broadcast-submit-btn"
                >
                  <Send size={15} />
                  <span>{broadcasting ? 'Sending...' : 'Broadcast'}</span>
                </button>
              </div>
            </form>
          </GlassCard>

          {error && <div className="admin-error">{error}</div>}
          
          {loading ? (
            <div className="admin-loading">Loading secure analytics...</div>
          ) : (
            <div className="admin-grid">
              
              {/* Top line stats */}
              <GlassCard className="admin-card stats-card">
                <div className="stat-item">
                  <div className="stat-icon"><Users size={24} color="#81c784" /></div>
                  <div className="stat-value">{analytics?.totalCheckins || 0}</div>
                  <div className="stat-label">Total Check-ins</div>
                </div>
                <div className="stat-item">
                  <div className="stat-icon"><Activity size={24} color="#ffb74d" /></div>
                  <div className="stat-value">{Math.round(analytics?.averageWellnessScore || 0)}</div>
                  <div className="stat-label">Avg Wellness Score</div>
                </div>
              </GlassCard>

              {/* Department Wellness Scores — Bar Chart */}
              <GlassCard className="admin-card">
                <h3 className="admin-card-title">
                  <BarChart3 size={18} style={{ color: '#81c784' }} />
                  Department Wellness Scores
                </h3>
                <BarChartViz data={deptScores} label="Avg Score" />
              </GlassCard>

              {/* Department Check-in Volume — Bar Chart */}
              <GlassCard className="admin-card">
                <h3 className="admin-card-title">
                  <TrendingUp size={18} style={{ color: '#90caf9' }} />
                  Check-in Volume by Department
                </h3>
                <BarChartViz data={deptCheckins} label="Count" />
              </GlassCard>

              {/* Emotion Distribution — Donut Chart */}
              {emotionBreakdown.length > 0 && (
                <GlassCard className="admin-card">
                  <h3 className="admin-card-title">
                    <PieChart size={18} style={{ color: '#b39ddb' }} />
                    Overall Emotion Distribution
                  </h3>
                  <DonutChart 
                    segments={emotionBreakdown.map(e => ({ label: e.emotion, value: e.count }))}
                    centerLabel={`${analytics?.totalCheckins || 0} total`}
                  />
                </GlassCard>
              )}

              {/* Emotion Trends Over Time — Stacked Bar Chart */}
              {trends.length > 0 && (
                <GlassCard className="admin-card" style={{ gridColumn: '1 / -1' }}>
                  <h3 className="admin-card-title">
                    <LineChart size={18} style={{ color: '#4db6ac' }} />
                    Emotion Trends Over Time
                  </h3>
                  <div style={{ height: '350px', marginTop: '20px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={trends} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                        <XAxis dataKey="date" tick={{ fill: '#64748b' }} />
                        <YAxis tick={{ fill: '#64748b' }} />
                        <Tooltip
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                          labelStyle={{ color: '#0f172a', fontWeight: 'bold' }}
                        />
                        <Legend />
                        <Bar dataKey="Happy" stackId="a" fill="#ffb74d" />
                        <Bar dataKey="Calm" stackId="a" fill="#81c784" />
                        <Bar dataKey="Sad" stackId="a" fill="#90caf9" />
                        <Bar dataKey="Frustrated" stackId="a" fill="#ef5350" />
                        <Bar dataKey="Anxious" stackId="a" fill="#ff8a65" />
                        <Bar dataKey="Stressed" stackId="a" fill="#f06292" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </GlassCard>
              )}

              {/* User Reflections (Shared by Consent) */}
              <GlassCard className="admin-card reflections-card" style={{ gridColumn: '1 / -1' }}>
                <div className="reflections-header-wrap">
                  <div>
                    <h3 className="admin-card-title">
                      <MessageSquareQuote size={20} style={{ color: '#81c784' }} />
                      User Reflections (Shared by Consent)
                    </h3>
                    <p className="admin-subtitle" style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                      🔒 Only check-ins from users who opted in to share their reflections are displayed. Real IDs and personal identifiers are strictly excluded.
                    </p>
                  </div>
                  <span className="reflections-count-badge">{reflections.length} Shared</span>
                </div>

                {reflections && reflections.length > 0 ? (
                  <div className="reflections-grid">
                    {reflections.map((ref) => {
                      const emotionColorMap = {
                        Happy: '#ffb74d',
                        Calm: '#81c784',
                        Sad: '#90caf9',
                        Frustrated: '#ef5350',
                        Anxious: '#ff8a65',
                        Stressed: '#f06292'
                      };
                      const emotionColor = emotionColorMap[ref.emotion] || '#a0aec0';

                      return (
                        <div key={ref.id} className="reflection-card-item">
                          <div className="reflection-meta">
                            <div className="reflection-author">
                              <span className="reflection-avatar">🌱</span>
                              <span className="reflection-name">{ref.displayName}</span>
                            </div>
                            <div className="reflection-tags">
                              <span
                                className="reflection-emotion-pill"
                                style={{ borderColor: emotionColor, color: emotionColor, background: `${emotionColor}18` }}
                              >
                                {ref.emotion}
                              </span>
                              {ref.wellnessScore !== null && (
                                <span className="reflection-score-pill">
                                  {ref.wellnessScore}/100
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="reflection-quote">"{ref.text}"</p>
                          <div className="reflection-time">
                            {new Date(ref.createdAt).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="no-reflections">
                    🌱 No shared reflections yet. Consenting users' check-in messages will appear here anonymously.
                  </p>
                )}
              </GlassCard>

              {/* Mentor Notes — User Posts Management */}
              <GlassCard className="admin-card mentor-posts-admin-card" style={{ gridColumn: '1 / -1' }}>
                <h3 className="admin-card-title">
                  <MessageSquareQuote size={20} style={{ color: '#a78bfa' }} />
                  Mentor Notes — User Messages
                </h3>
                <p className="admin-subtitle" style={{ marginBottom: '1.25rem', fontSize: '0.88rem' }}>
                  Reply to users' messages. Only you (the admin) can reply — users see your response in their Progress page.
                </p>
                {mentorPosts.length === 0 ? (
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>No user messages yet.</p>
                ) : (
                  <div className="mentor-posts-list">
                    {mentorPosts.map(post => (
                      <div key={post.id} className="mentor-admin-post">
                        <div className="mentor-admin-meta">
                          <span className="mentor-admin-author">
                            {post.Author?.display_name || post.Author?.employee_or_student_id || `User #${post.user_id}`}
                          </span>
                          {post.Author?.department && (
                            <span className="mentor-admin-dept">{post.Author.department}</span>
                          )}
                          <span className="mentor-admin-time">{new Date(post.created_at).toLocaleString()}</span>
                          {(!post.Replies || post.Replies.length === 0) && (
                            <span className="mentor-pending-badge">● Pending reply</span>
                          )}
                        </div>
                        <div className="mentor-admin-message">{post.note_text}</div>

                        {/* Existing replies */}
                        {post.Replies && post.Replies.length > 0 && (
                          <div className="mentor-admin-replies">
                            {post.Replies.map(r => (
                              <div key={r.id} className="mentor-admin-reply-bubble">
                                <span className="mentor-admin-reply-label">Your reply:</span>
                                {r.note_text}
                                <span className="mentor-admin-reply-time">{new Date(r.created_at).toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Reply form */}
                        <div className="mentor-admin-reply-form">
                          <input
                            type="text"
                            className="mentor-admin-reply-input"
                            placeholder="Type your reply..."
                            value={replyTexts[post.id] || ''}
                            onChange={e => setReplyTexts(prev => ({ ...prev, [post.id]: e.target.value }))}
                            onKeyDown={e => { if (e.key === 'Enter') handleReply(post.id); }}
                            disabled={replyingTo === post.id}
                          />
                          <button
                            className="mentor-admin-reply-btn"
                            onClick={() => handleReply(post.id)}
                            disabled={replyingTo === post.id || !replyTexts[post.id]?.trim()}
                          >
                            <Send size={15} />
                            {replyingTo === post.id ? 'Sending...' : 'Reply'}
                          </button>
                        </div>
                        {replyStatus[post.id] === 'success' && <p className="mentor-reply-status success">✓ Reply sent!</p>}
                        {replyStatus[post.id]?.startsWith('error:') && <p className="mentor-reply-status error">{replyStatus[post.id].replace('error:', '')}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </GlassCard>

              {/* Department Breakdown Table */}
              <GlassCard className="admin-card">
                <h3 className="admin-card-title">
                  <Users size={18} style={{ color: '#ffb74d' }} />
                  Detailed Department Breakdown
                </h3>
                {analytics?.byDepartment && analytics.byDepartment.length > 0 ? (
                  <table className="dept-table">
                    <thead>
                      <tr>
                        <th>Department</th>
                        <th>Avg Score</th>
                        <th>Check-ins</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.byDepartment.map((dept, idx) => {
                        const score = Math.round(dept.averageScore);
                        const status = score >= 70 ? '🟢 Healthy' : score >= 45 ? '🟡 Moderate' : '🔴 At Risk';
                        return (
                          <tr key={idx}>
                            <td>{dept.department}</td>
                            <td>{score}</td>
                            <td>{dept.count}</td>
                            <td>{status}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <p>No department data available yet. Encourage employees to check in!</p>
                )}
              </GlassCard>

            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
