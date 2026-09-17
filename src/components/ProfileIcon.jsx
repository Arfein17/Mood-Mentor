import React, { useState, useEffect } from 'react';
import { User, LogOut } from 'lucide-react';
import { fetchWithAuth } from '../api/client';
import { useUser } from '../context/UserContext';
import './ProfileIcon.css';

// Import all preset avatars
const presetAvatars = {
  'memo_3': new URL('../assets/avatars/memo_3.png', import.meta.url).href,
  'memo_8': new URL('../assets/avatars/memo_8.png', import.meta.url).href,
  'memo_10': new URL('../assets/avatars/memo_10.png', import.meta.url).href,
  'memo_17': new URL('../assets/avatars/memo_17.png', import.meta.url).href,
  'memo_24': new URL('../assets/avatars/memo_24.png', import.meta.url).href,
  'memo_34': new URL('../assets/avatars/memo_34.png', import.meta.url).href,
};

export default function ProfileIcon({ onOpenProfile }) {
  const { user, logout } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    let mounted = true;
    if (user && user.id) {
      fetchWithAuth(`/api/profile/${user.id}`)
        .then(res => res.json())
        .then(data => {
          if (mounted) setProfile(data);
        })
        .catch(err => console.error("Failed to fetch profile", err));
    }
    return () => { mounted = false; };
  }, [user]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.profile-dropdown-container')) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  const getAvatarSrc = () => {
    if (!profile) return null;
    if (profile.avatar_type === 'preset') {
      return presetAvatars[profile.avatar_value];
    }
    if (profile.avatar_type === 'photo') {
      // Backend should serve the photo at the correct path, but Vite proxy is on /api. 
      // We also mounted /avatars statically.
      return profile.avatar_value; 
    }
    return null;
  };

  const avatarSrc = getAvatarSrc();

  return (
    <div className="profile-dropdown-container">
      <button 
        className="profile-icon-btn" 
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Profile"
      >
        {avatarSrc ? (
          <img src={avatarSrc} alt="Profile" className="profile-avatar-img" />
        ) : (
          <User size={24} color="#fff" />
        )}
      </button>

      {isOpen && (
        <div className="profile-dropdown-menu">
          <div className="profile-dropdown-header">
            <strong>{profile?.display_name || user.employee_or_student_id}</strong>
            <span className="profile-role">{profile?.department || user.role}</span>
          </div>
          <hr />
          <button 
            className="dropdown-item"
            onClick={() => {
              setIsOpen(false);
              onOpenProfile();
            }}
          >
            <User size={16} />
            <span>View Profile</span>
          </button>
          <button 
            className="dropdown-item text-danger"
            onClick={() => {
              setIsOpen(false);
              logout();
            }}
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      )}
    </div>
  );
}
