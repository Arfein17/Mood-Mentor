import React, { useState } from 'react';
import './LoginSignup.css';
import GlassCard from '../components/GlassCard';
import Button from '../components/Button';
import { User, Lock, Briefcase, GraduationCap, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { loginUser, signupUser } from '../api/client';
import { useUser } from '../context/UserContext';

const LoginSignup = ({ onLoginSuccess, onBackToLanding }) => {
  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'signup'
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  
  // Form states
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [department, setDepartment] = useState('');
  const [role, setRole] = useState(''); // Optional: 'Student' | 'Employee' | ''

  const { login } = useUser();

  const toggleTab = (tab) => {
    setActiveTab(tab);
    setError('');
    setPassword('');
    setConfirmPassword('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!employeeId.trim()) {
      setError('Please enter your Employee ID or Student ID.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    try {
      const res = await loginUser(employeeId, password);
      login(res.user.id, res.user.role, res.token);
      onLoginSuccess();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');

    if (!employeeId.trim()) {
      setError('Please enter an Employee ID or Student ID.');
      return;
    }
    if (!password) {
      setError('Please enter a password.');
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

    try {
      const res = await signupUser(employeeId, department, role, password);
      login(res.user.id, res.user.role, res.token);
      onLoginSuccess();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="auth-container">
      {/* Back link */}
      <button className="back-link-btn" onClick={onBackToLanding}>
        ← Back to Welcome Screen
      </button>

      <GlassCard className="auth-card" hoverEffect={false}>
        {/* Tab Headers */}
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

        {/* Error Message banner */}
        {error && (
          <div className="auth-error-banner">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {activeTab === 'login' ? (
          /* Login Form */
          <form className="auth-form" onSubmit={handleLogin}>
            <div className="input-group">
              <label htmlFor="login-id">Employee ID / Student ID</label>
              <div className="input-wrapper">
                <User size={18} className="input-icon" />
                <input
                  id="login-id"
                  type="text"
                  placeholder="Enter ID (e.g. EM102 or ST409)"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
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
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="auth-action-row">
              <button 
                type="button" 
                className="forgot-pass-link"
                onClick={() => setError('Password recovery will be integrated in future phases.')}
              >
                Forgot Password?
              </button>
            </div>

            <Button type="submit" glow className="auth-submit-btn">
              Login
            </Button>

            <p className="auth-switch-prompt">
              Don't have an account?{' '}
              <button type="button" className="switch-tab-link" onClick={() => toggleTab('signup')}>
                Switch to Sign Up
              </button>
            </p>
          </form>
        ) : (
          /* Sign Up Form */
          <form className="auth-form" onSubmit={handleSignUp}>
            <div className="input-group">
              <label htmlFor="signup-id">Employee ID / Student ID</label>
              <div className="input-wrapper">
                <User size={18} className="input-icon" />
                <input
                  id="signup-id"
                  type="text"
                  placeholder="Enter ID"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                />
              </div>
            </div>

            <div className="form-row-2">
              <div className="input-group">
                <label htmlFor="signup-password">Password</label>
                <div className="input-wrapper">
                  <Lock size={18} className="input-icon" />
                  <input
                    id="signup-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="signup-confirm-password">Confirm Password</label>
                <div className="input-wrapper">
                  <Lock size={18} className="input-icon" />
                  <input
                    id="signup-confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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

            <Button type="submit" glow className="auth-submit-btn">
              Create Account
            </Button>

            <p className="auth-switch-prompt">
              Already have an account?{' '}
              <button type="button" className="switch-tab-link" onClick={() => toggleTab('login')}>
                Switch to Login
              </button>
            </p>
          </form>
        )}
      </GlassCard>
    </div>
  );
};

export default LoginSignup;
