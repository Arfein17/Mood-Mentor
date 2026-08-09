import React, { useEffect, useState } from 'react';
import './AdminDashboard.css';
import GlassCard from '../components/GlassCard';
import Navbar from '../components/Navbar';
import { fetchAdminAnalytics, fetchAdminAlerts, fetchAdminTrends } from '../api/client';
import { ArrowLeft, ShieldCheck, Activity, AlertTriangle, TrendingUp, Users, PieChart, BarChart3, LineChart } from 'lucide-react';
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
  const [alerts, setAlerts] = useState(null);
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const [analyticsData, alertsData, trendsData] = await Promise.all([
          fetchAdminAnalytics(),
          fetchAdminAlerts(),
          fetchAdminTrends()
        ]);
        setAnalytics(analyticsData);
        setAlerts(alertsData.alerts);
        setTrends(trendsData);
      } catch (err) {
        setError('Failed to load admin data: ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

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

  return (
    <div className="admin-page">
      <Navbar showLogout={true} onLogout={onLogout} />

      <div className="admin-scroll">
        <div className="admin-inner">
          <button className="admin-back-btn" onClick={onBack}>
            <ArrowLeft size={18} />
            <span>Back</span>
          </button>

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
            <p className="admin-subtitle" style={{marginBottom: '1rem'}}>Send a suggestion that will appear in all users' Progress boxes.</p>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const msg = e.target.elements.suggestion.value;
              if (!msg) return;
              try {
                const res = await fetch('http://localhost:3001/api/admin/suggestions', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ message: msg })
                });
                if (res.ok) {
                  alert('Suggestion broadcasted successfully!');
                  e.target.reset();
                } else {
                  throw new Error('Failed to broadcast');
                }
              } catch (err) {
                alert('Error: ' + err.message);
              }
            }} style={{ display: 'flex', gap: '1rem' }}>
              <input name="suggestion" placeholder="E.g., Take a 5-minute break today!" style={{ flex: 1, padding: '0.8rem', borderRadius: '8px', border: 'none', background: 'rgba(255,255,255,0.1)', color: 'white' }} />
              <button type="submit" style={{ padding: '0.8rem 1.5rem', borderRadius: '8px', border: 'none', background: 'var(--primary)', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}>Broadcast</button>
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

              {/* Alerts */}
              <GlassCard className="admin-card">
                <h3 className="admin-card-title">
                  <AlertTriangle size={18} style={{ color: '#f06292' }} />
                  Department Predictive Alerts
                </h3>
                {alerts && alerts.length > 0 ? (
                  <ul className="alert-list">
                    {alerts.map((alert, idx) => (
                      <li key={idx} className="alert-item">
                        <span className="alert-dept">{alert.department}:</span> 
                        <span className="alert-msg">{alert.alert}</span>
                        <span className="alert-score">Avg Score: {Math.round(alert.avgScore)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="no-alerts">✅ No active departmental alerts. Wellness is stable across all departments.</p>
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
