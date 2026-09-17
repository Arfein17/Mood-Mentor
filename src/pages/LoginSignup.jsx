import React, { useState, useEffect } from 'react';
import './LoginSignup.css';
import GlassCard from '../components/GlassCard';
import Button from '../components/Button';
import {
  User,
  Lock,
  Mail,
  Briefcase,
  GraduationCap,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  KeyRound
} from 'lucide-react';
import { loginUser, signupUser, forgotPassword, resetPassword } from '../api/client';
import { useUser } from '../context/UserContext';

const LoginSignup = ({ onLoginSuccess, onBackToLanding }) => {
  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'signup' | 'forgot' | 'reset'
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Login / Signup Form states
  const [employeeId, setEmployeeId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [department, setDepartment] = useState('');
  const [role, setRole] = useState(''); // Optional: 'Student' | 'Employee' | ''

  // Forgot Password / Reset Password states
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const { login } = useUser();

  // Check if URL has a reset_token query parameter on mount
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('reset_token') || params.get('token');
      if (token) {
        setResetToken(token);
        setActiveTab('reset');
        setError('');
        setSuccessMessage('');
        // Clean URL without reloading page
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch (_) {}
  }, []);

  const toggleTab = (tab) => {
    setActiveTab(tab);
    setError('');
    setSuccessMessage('');
    setPassword('');
    setConfirmPassword('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!employeeId.trim()) {
      setError('Please enter your Employee ID or email.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await loginUser(employeeId.trim(), password);
      login(res.user.id, res.user.role, res.token);
      onLoginSuccess();
    } catch (err) {
      setError(err.message || 'Failed to login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!employeeId.trim()) {
      setError('Please enter an Employee ID or Student ID.');
      return;
    }
    if (email && email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        setError('Please enter a valid email address.');
        return;
      }
    }
    if (!password) {
      setError('Please enter a password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!department.trim()) {
      setError('Department is required to create an account.');
      return;
    }

    setIsLoading(true);
    try {
      await signupUser(
        employeeId.trim(),
        department.trim(),
        role,
        password,
        email.trim() || null
      );
      // Redirect to login tab
      setActiveTab('login');
      setSuccessMessage('Account created successfully! Please log in with your credentials.');
      setEmployeeId('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setDepartment('');
      setRole('');
    } catch (err) {
      setError(err.message || 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!forgotIdentifier.trim()) {
      setError('Please enter your Employee ID or registered email.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await forgotPassword(forgotIdentifier.trim());
      setSuccessMessage(res.message || 'If an account exists, a reset link has been sent to your email.');
    } catch (err) {
      setError(err.message || 'Failed to send reset link.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!resetToken.trim()) {
      setError('Reset token is missing. Please click the link in your email.');
      return;
    }
    if (!newPassword) {
      setError('Please enter a new password.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await resetPassword(resetToken.trim(), newPassword);
      setSuccessMessage(res.message || 'Password successfully reset! You can now log in.');
      setNewPassword('');
      setConfirmNewPassword('');
      setResetToken('');
      setTimeout(() => {
        setActiveTab('login');
      }, 2500);
    } catch (err) {
      setError(err.message || 'Failed to reset password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      {/* Back link */}
      <button className="back-link-btn" onClick={onBackToLanding}>
        ← Back to Welcome Screen
      </button>

      <GlassCard className="auth-card" hoverEffect={false}>
        {/* Tab Headers — only show for login and signup views */}
        {(activeTab === 'login' || activeTab === 'signup') && (
          <div className="auth-tabs">
            <button 
              type="button" 
              className={`auth-tab-btn ${activeTab === 'login' ? 'active' : ''}`}
              onClick={() => toggleTab('login')}
            >
              Login
            </button>
            <button 
              type="button" 
              className={`auth-tab-btn ${activeTab === 'signup' ? 'active' : ''}`}
              onClick={() => toggleTab('signup')}
            >
              Create Account
            </button>
            <div className={`tab-indicator ${activeTab}`} />
          </div>
        )}

        {/* Forgot Header */}
        {activeTab === 'forgot' && (
          <div style={{ marginBottom: '24px', textAlign: 'left' }}>
            <button
              type="button"
              className="switch-tab-link"
              onClick={() => toggleTab('login')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '12px', fontSize: '0.9rem' }}
            >
              <ArrowLeft size={16} /> Back to Login
            </button>
            <h2 style={{ margin: '0 0 6px', fontSize: '1.4rem', color: '#fff', fontWeight: 700 }}>
              Forgot Password 🔐
            </h2>
            <p style={{ margin: 0, fontSize: '0.88rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
              Enter your Employee ID or registered email address. We'll send a password recovery link to your inbox.
            </p>
          </div>
        )}

        {/* Reset Password Header */}
        {activeTab === 'reset' && (
          <div style={{ marginBottom: '24px', textAlign: 'left' }}>
            <button
              type="button"
              className="switch-tab-link"
              onClick={() => toggleTab('login')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '12px', fontSize: '0.9rem' }}
            >
              <ArrowLeft size={16} /> Back to Login
            </button>
            <h2 style={{ margin: '0 0 6px', fontSize: '1.4rem', color: '#fff', fontWeight: 700 }}>
              Reset Your Password ✨
            </h2>
            <p style={{ margin: 0, fontSize: '0.88rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
              Enter a new secure password for your Mode Mentor account.
            </p>
          </div>
        )}

        {/* Success Message banner */}
        {successMessage && (
          <div className="auth-success-banner" role="status">
            <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Error Message banner */}
        {error && (
          <div className="auth-error-banner">
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* ── 1. LOGIN FORM ────────────────────────────────────────── */}
        {activeTab === 'login' && (
          <form className="auth-form" onSubmit={handleLogin}>
            <div className="input-group">
              <label htmlFor="login-id">Employee ID or Email</label>
              <div className="input-wrapper">
                <User size={18} className="input-icon" />
                <input
                  id="login-id"
                  type="text"
                  placeholder="e.g. EM102 or yourname@gmail.com"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="login-password">Password</label>
              <div className="input-wrapper">
                <Lock size={18} className="input-icon" />
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="auth-action-row">
              <button 
                type="button" 
                className="forgot-pass-link"
                onClick={() => toggleTab('forgot')}
              >
                Forgot Password?
              </button>
            </div>

            <Button type="submit" glow className="auth-submit-btn" disabled={isLoading}>
              {isLoading ? 'Logging in...' : 'Login'}
            </Button>

            <p className="auth-switch-prompt">
              Don't have an account?{' '}
              <button type="button" className="switch-tab-link" onClick={() => toggleTab('signup')}>
                Switch to Sign Up
              </button>
            </p>
          </form>
        )}

        {/* ── 2. SIGNUP FORM ───────────────────────────────────────── */}
        {activeTab === 'signup' && (
          <form className="auth-form" onSubmit={handleSignUp}>
            <div className="input-group">
              <label htmlFor="signup-id">Employee ID / Student ID <span className="required-star">*</span></label>
              <div className="input-wrapper">
                <User size={18} className="input-icon" />
                <input
                  id="signup-id"
                  type="text"
                  placeholder="Enter ID (e.g. EM102)"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="signup-email">
                Email Address <span className="optional-label">(Recommended for Password Recovery)</span>
              </label>
              <div className="input-wrapper">
                <Mail size={18} className="input-icon" />
                <input
                  id="signup-email"
                  type="email"
                  placeholder="e.g. yourname@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="form-row-2">
              <div className="input-group">
                <label htmlFor="signup-password">Password <span className="required-star">*</span></label>
                <div className="input-wrapper">
                  <Lock size={18} className="input-icon" />
                  <input
                    id="signup-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="signup-confirm-password">Confirm Password <span className="required-star">*</span></label>
                <div className="input-wrapper">
                  <Lock size={18} className="input-icon" />
                  <input
                    id="signup-confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label="Toggle confirm password visibility"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="signup-dept">Department <span className="required-star">*</span></label>
              <div className="input-wrapper">
                <Briefcase size={18} className="input-icon" />
                <input
                  id="signup-dept"
                  type="text"
                  placeholder="Engineering, Design, HR, Academic, etc."
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="signup-role">Role <span className="optional-label">(Optional)</span></label>
              <div className="input-wrapper">
                <GraduationCap size={18} className="input-icon" />
                <select
                  id="signup-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="role-select"
                >
                  <option value="">Select Role (Optional)</option>
                  <option value="Student">Student</option>
                  <option value="Employee">Employee</option>
                </select>
              </div>
            </div>

            <Button type="submit" glow className="auth-submit-btn" disabled={isLoading}>
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </Button>

            <p className="auth-switch-prompt">
              Already have an account?{' '}
              <button type="button" className="switch-tab-link" onClick={() => toggleTab('login')}>
                Switch to Login
              </button>
            </p>
          </form>
        )}

        {/* ── 3. FORGOT PASSWORD FORM ──────────────────────────────── */}
        {activeTab === 'forgot' && (
          <form className="auth-form" onSubmit={handleForgotPassword}>
            <div className="input-group">
              <label htmlFor="forgot-id">Employee ID or Registered Email</label>
              <div className="input-wrapper">
                <Mail size={18} className="input-icon" />
                <input
                  id="forgot-id"
                  type="text"
                  placeholder="e.g. EM102 or moodmentor01@gmail.com"
                  value={forgotIdentifier}
                  onChange={(e) => setForgotIdentifier(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            </div>

            <Button type="submit" glow className="auth-submit-btn" disabled={isLoading}>
              {isLoading ? 'Sending Reset Link...' : 'Send Recovery Email'}
            </Button>

            <p className="auth-switch-prompt">
              Remember your password?{' '}
              <button type="button" className="switch-tab-link" onClick={() => toggleTab('login')}>
                Back to Login
              </button>
            </p>
          </form>
        )}

        {/* ── 4. RESET PASSWORD FORM ───────────────────────────────── */}
        {activeTab === 'reset' && (
          <form className="auth-form" onSubmit={handleResetPassword}>
            <div className="input-group">
              <label htmlFor="reset-new-password">New Password</label>
              <div className="input-wrapper">
                <KeyRound size={18} className="input-icon" />
                <input
                  id="reset-new-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  autoFocus
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="reset-confirm-password">Confirm New Password</label>
              <div className="input-wrapper">
                <KeyRound size={18} className="input-icon" />
                <input
                  id="reset-confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Repeat new password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label="Toggle confirm password visibility"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <Button type="submit" glow className="auth-submit-btn" disabled={isLoading}>
              {isLoading ? 'Updating Password...' : 'Save New Password'}
            </Button>

            <p className="auth-switch-prompt">
              <button type="button" className="switch-tab-link" onClick={() => toggleTab('login')}>
                Cancel and Back to Login
              </button>
            </p>
          </form>
        )}
      </GlassCard>
    </div>
  );
};

export default LoginSignup;
