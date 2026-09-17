import React, { useState, useEffect } from 'react';
import { ArrowLeft, Upload, Check, Lock, Bell, Shield, User as UserIcon } from 'lucide-react';
import { fetchWithAuth } from '../api/client';
import { useUser } from '../context/UserContext';
import './Profile.css';

const presetAvatars = {
  'memo_3': new URL('../assets/avatars/memo_3.png', import.meta.url).href,
  'memo_8': new URL('../assets/avatars/memo_8.png', import.meta.url).href,
  'memo_10': new URL('../assets/avatars/memo_10.png', import.meta.url).href,
  'memo_17': new URL('../assets/avatars/memo_17.png', import.meta.url).href,
  'memo_24': new URL('../assets/avatars/memo_24.png', import.meta.url).href,
  'memo_34': new URL('../assets/avatars/memo_34.png', import.meta.url).href,
};

export default function ProfilePage({ onBack }) {
  const { user, points } = useUser();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [reminders, setReminders] = useState(true);
  const [consent, setConsent] = useState(true);
  const [avatarType, setAvatarType] = useState('preset');
  const [avatarValue, setAvatarValue] = useState('memo_3');
  const [photoFile, setPhotoFile] = useState(null);
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [message, setMessage] = useState('');
  const [passMessage, setPassMessage] = useState('');

  useEffect(() => {
    fetchWithAuth(`/api/profile/${user.id}`)
      .then(res => res.json())
      .then(data => {
        setProfile(data);
        setDisplayName(data.display_name || '');
        setEmail(data.email || '');
        setDepartment(data.department || '');
        setReminders(data.reminders_enabled !== false);
        setConsent(data.consent_to_aggregate !== false);
        if (data.avatar_type) setAvatarType(data.avatar_type);
        if (data.avatar_value) setAvatarValue(data.avatar_value);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [user.id]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setMessage('Saving...');
    
    const form = new FormData();
    form.append('display_name', displayName);
    form.append('email', email);
    form.append('department', department);
    form.append('avatar_type', avatarType);
    if (avatarType === 'preset') {
      form.append('avatar_value', avatarValue);
    }
    form.append('reminders_enabled', reminders);
    form.append('consent_to_aggregate', consent);
    
    if (avatarType === 'photo' && photoFile) {
      form.append('avatar', photoFile);
    }

    try {
      // Do NOT set Content-Type manually — browser must set it with multipart boundary
      const res = await fetchWithAuth(`/api/profile/${user.id}`, {
        method: 'PUT',
        body: form
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server error ${res.status}`);
      }
      const updated = await res.json();
      setProfile(updated);
      setMessage('Profile updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Error updating profile: ' + err.message);
    }
  };

  const handleSavePassword = async (e) => {
    e.preventDefault();
    setPassMessage('');
    if (!currentPassword) return setPassMessage('Please enter your current password');
    if (!newPassword) return setPassMessage('Please enter a new password');
    if (newPassword.length < 6) return setPassMessage('New password must be at least 6 characters');
    if (newPassword !== confirmPassword) {
      return setPassMessage('New passwords do not match');
    }
    try {
      const res = await fetchWithAuth(`/api/profile/${user.id}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server error ${res.status}`);
      }
      setPassMessage('Password changed successfully! ✓');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPassMessage(''), 4000);
    } catch (err) {
      setPassMessage(err.message);
    }
  };

  if (loading) return <div className="profile-page"><div className="loading">Loading profile...</div></div>;

  return (
    <div className="profile-page fade-in">
      <div className="profile-content">
        <header className="profile-header">
          <button className="back-btn" onClick={onBack}>
            <ArrowLeft size={24} />
          </button>
          <h1>My Profile</h1>
        </header>

        <div className="profile-grid">
          
          <div className="profile-column">
            <form className="profile-card" onSubmit={handleSaveProfile}>
              <h3>Personal Details</h3>
              
              <div className="form-group">
                <label>Avatar Preference</label>
                <div className="avatar-type-toggle">
                  <button 
                    type="button" 
                    className={avatarType === 'preset' ? 'active' : ''} 
                    onClick={() => setAvatarType('preset')}
                  >
                    Preset
                  </button>
                  <button 
                    type="button" 
                    className={avatarType === 'photo' ? 'active' : ''} 
                    onClick={() => setAvatarType('photo')}
                  >
                    Upload Photo
                  </button>
                </div>
                
                {avatarType === 'preset' ? (
                  <div className="avatar-grid">
                    {Object.entries(presetAvatars).map(([filename, src]) => (
                      <div 
                        key={filename} 
                        className={`avatar-option ${avatarValue === filename ? 'selected' : ''}`}
                        onClick={() => setAvatarValue(filename)}
                      >
                        <img src={src} alt="avatar option" />
                        {avatarValue === filename && <div className="avatar-check"><Check size={16}/></div>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="photo-upload-area">
                    {photoFile ? (
                      <div className="photo-preview">
                        <img src={URL.createObjectURL(photoFile)} alt="Preview" />
                        <button type="button" onClick={() => setPhotoFile(null)}>Remove</button>
                      </div>
                    ) : profile?.avatar_type === 'photo' && profile?.avatar_value ? (
                      <div className="photo-preview">
                        <img src={profile.avatar_value} alt="Current" />
                        <div className="file-input-wrapper">
                          <button type="button" className="btn-secondary">Change Photo</button>
                          <input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files[0])} />
                        </div>
                      </div>
                    ) : (
                      <div className="file-input-wrapper empty-upload">
                        <Upload size={32} />
                        <p>Click to select an image</p>
                        <input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files[0])} />
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Display Name</label>
                <input 
                  type="text" 
                  value={displayName} 
                  onChange={e => setDisplayName(e.target.value)} 
                  placeholder="e.g. Wellness Warrior"
                />
                <small>Used only in the UI for you.</small>
              </div>

              <div className="form-group">
                <label>Email Address</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  placeholder="e.g. name@company.com"
                />
                <small>Used for password recovery and notifications from your mentor.</small>
              </div>

              <div className="form-group">
                <label>Department / Role</label>
                <input 
                  type="text" 
                  value={department} 
                  onChange={e => setDepartment(e.target.value)} 
                />
              </div>

              <button type="submit" className="btn-primary">Save Profile</button>
              {message && <p className="status-msg">{message}</p>}
            </form>

            <div className="profile-card stats-card">
              <h3>Quick Stats</h3>
              <div className="stats-grid">
                <div className="stat-box">
                  <span className="stat-val">{points}</span>
                  <span className="stat-label">Mode Points</span>
                </div>
                <div className="stat-box">
                  <span className="stat-val">{profile?.badges || 0}</span>
                  <span className="stat-label">Badges Earned</span>
                </div>
                <div className="stat-box">
                  <span className="stat-val">{profile?.streak || 0}</span>
                  <span className="stat-label">Day Streak</span>
                </div>
              </div>
            </div>
          </div>

          <div className="profile-column">
            <form className="profile-card" onSubmit={handleSavePassword}>
              <h3><Lock size={20}/> Security</h3>
              <div className="form-group">
                <label>Current Password</label>
                <input 
                  type="password" 
                  value={currentPassword} 
                  onChange={e => setCurrentPassword(e.target.value)} 
                  required
                />
              </div>
              <div className="form-group">
                <label>New Password</label>
                <input 
                  type="password" 
                  value={newPassword} 
                  onChange={e => setNewPassword(e.target.value)} 
                  required
                />
              </div>
              <div className="form-group">
                <label>Confirm New Password</label>
                <input 
                  type="password" 
                  value={confirmPassword} 
                  onChange={e => setConfirmPassword(e.target.value)} 
                  required
                />
              </div>
              <button type="submit" className="btn-secondary">Change Password</button>
              {passMessage && <p className="status-msg">{passMessage}</p>}
            </form>

            <div className="profile-card settings-card">
              <h3><Bell size={20}/> Preferences</h3>
              <label className="toggle-row">
                <span>Daily Check-in Reminders</span>
                <input 
                  type="checkbox" 
                  checked={reminders} 
                  onChange={e => setReminders(e.target.checked)}
                />
              </label>

              <h3 className="mt-4"><Shield size={20}/> Privacy</h3>
              <p className="privacy-desc">
                When enabled, your anonymized mood scores contribute to the 
                overall department and organization health metrics. No personal 
                information is ever exposed to admins.
              </p>
              <label className="toggle-row">
                <span>Include my data in insights</span>
                <input 
                  type="checkbox" 
                  checked={consent} 
                  onChange={e => setConsent(e.target.checked)}
                />
              </label>
              
              <button className="btn-primary mt-4" onClick={handleSaveProfile}>Save Settings</button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
