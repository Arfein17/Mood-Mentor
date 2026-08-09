import React, { useState } from 'react';
import './AdminLogin.css';
import GlassCard from '../components/GlassCard';
import Button from '../components/Button';
import { ShieldCheck, User, Lock, Eye, EyeOff, AlertCircle, ArrowLeft } from 'lucide-react';
import { adminLogin } from '../api/client';
import { useUser } from '../context/UserContext';

const AdminLogin = ({ onAdminLoginSuccess, onBack }) => {
  const [adminId, setAdminId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useUser();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!adminId.trim()) {
      setError('Please enter your Admin ID.');
      return;
    }
    if (!password) {
      setError('Please enter the admin password.');
      return;
    }

    setLoading(true);
    try {
      const res = await adminLogin(adminId, password);
      login(res.user.id, res.user.role, res.token);
      onAdminLoginSuccess(res.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-page">
      <div className="admin-login-bg" />
      <div className="admin-login-orb al-orb-1" />
      <div className="admin-login-orb al-orb-2" />

      <div className="admin-login-content">
        <button className="admin-login-back" onClick={onBack}>
          <ArrowLeft size={16} /> Return to User Login
        </button>

        <GlassCard className="admin-login-card" hoverEffect={false}>
          <div className="admin-login-header">
            <div className="admin-login-icon-ring">
              <ShieldCheck size={36} />
            </div>
            <h1>Admin Access</h1>
            <p>Restricted area. Only authorized admin personnel can log in.</p>
          </div>

          {error && (
            <div className="admin-login-error">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form className="admin-login-form" onSubmit={handleSubmit}>
            <div className="admin-input-group">
              <label htmlFor="admin-id">Admin ID</label>
              <div className="admin-input-wrapper">
                <User size={18} className="admin-input-icon" />
                <input
                  id="admin-id"
                  type="text"
                  placeholder="Enter admin ID"
                  value={adminId}
                  onChange={(e) => setAdminId(e.target.value)}
                />
              </div>
            </div>

            <div className="admin-input-group">
              <label htmlFor="admin-password">Password</label>
              <div className="admin-input-wrapper">
                <Lock size={18} className="admin-input-icon" />
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="admin-pw-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <Button type="submit" glow className="admin-submit-btn" disabled={loading}>
              {loading ? 'Authenticating...' : 'Login as Admin'}
            </Button>
          </form>

          <p className="admin-login-note">
            🔒 Admin credentials are stored securely in the database. Contact your system administrator for access.
          </p>
        </GlassCard>
      </div>
    </div>
  );
};

export default AdminLogin;
