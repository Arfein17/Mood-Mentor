import React, { useState, useRef, useCallback } from 'react';
import './DailyCheckin.css';
import Button from '../components/Button';
import { submitCheckin } from '../services/checkinApi';
import {
  ArrowLeft, Camera, X, Smile, Type, Zap, AlertCircle
} from 'lucide-react';
import { useUser } from '../context/UserContext';

// ── Quick emotion tiles ──────────────────────────────────────────────────────

const QUICK_EMOTIONS = [
  { label: 'Happy',      emoji: '😊', color: '#ffb74d' },
  { label: 'Calm',       emoji: '😌', color: '#81c784' },
  { label: 'Stressed',   emoji: '😤', color: '#f06292' },
  { label: 'Anxious',    emoji: '😰', color: '#ff8a65' },
  { label: 'Frustrated', emoji: '😠', color: '#ef5350' },
  { label: 'Sad',        emoji: '😔', color: '#90caf9' },
];

// ── Suggested questions (tapping copies to clipboard / used as hints) ────────

const SUGGESTED_QUESTIONS = [
  'How was your work today?',
  'Are you feeling stressed or motivated?',
  'Did anything make you happy today?',
  'Is there any challenge you\'re facing?',
  'How productive was your day?',
];

const MAX_CHARS = 1000;

// ── Component ────────────────────────────────────────────────────────────────

const DailyCheckin = ({ onSubmit, onBack }) => {
  const [text, setText] = useState('');
  const [selectedEmotion, setSelectedEmotion] = useState(null);
  const [selfieDataUrl, setSelfieDataUrl] = useState(null);
  const [selfieBlob, setSelfieBlob]     = useState(null);
  const [cameraOpen, setCameraOpen]     = useState(false);
  const [cameraError, setCameraError]   = useState('');
  const [submitting, setSubmitting]     = useState(false);
  const [apiError, setApiError]         = useState('');
  const [activeTab, setActiveTab]       = useState('text'); // 'text' | 'quick' | 'selfie'

  const { user } = useUser();

  const videoRef    = useRef(null);
  const streamRef   = useRef(null);
  const fileInputRef = useRef(null);

  // ── Camera helpers ─────────────────────────────────────────────────────────

  const openCamera = useCallback(async () => {
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      setCameraOpen(true);
      // Attach stream after DOM renders
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 100);
    } catch (err) {
      const msg =
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access and try again.'
          : err.name === 'NotFoundError'
          ? 'No camera found on this device.'
          : `Could not open camera: ${err.message}`;
      setCameraError(msg);
    }
  }, []);

  const closeCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraOpen(false);
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width  = videoRef.current.videoWidth  || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setSelfieDataUrl(dataUrl);
    // Convert to blob for upload
    canvas.toBlob(blob => setSelfieBlob(blob), 'image/jpeg', 0.85);
    closeCamera();
  }, [closeCamera]);

  const removeSelfie = () => {
    setSelfieDataUrl(null);
    setSelfieBlob(null);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelfieBlob(file);
    const reader = new FileReader();
    reader.onload = ev => setSelfieDataUrl(ev.target.result);
    reader.readAsDataURL(file);
  };

  // ── Submit ─────────────────────────────────────────────────────────────────

  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const canSubmit = wordCount >= 7 && selectedEmotion !== null;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setApiError('');
    try {
      const result = await submitCheckin({
        employeeId: user ? user.id : 'GUEST_USER',
        text: text.trim(),
        selfieFile: selfieBlob || null,
        quickMood: selectedEmotion?.label || null,
      });
      // Pass result + original inputs to App so CheckinResult can use them for richer suggestions
      onSubmit({ result, text: text.trim(), emotion: selectedEmotion?.label || null });
    } catch (err) {
      console.error('[DailyCheckin] API error:', err.message);
      setApiError(`Could not connect to the wellness server. ${err.message}`);
      setSubmitting(false);
    }
  };

  const charPercent = (text.length / MAX_CHARS) * 100;
  const charColor   = charPercent > 90 ? '#f06292' : charPercent > 70 ? '#ffb74d' : '#81c784';

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="checkin-page">
      {/* Fixed background layers */}
      <div className="checkin-bg" />
      <div className="checkin-bg-orb orb-1" />
      <div className="checkin-bg-orb orb-2" />
      <div className="checkin-bg-orb orb-3" />

      {/* Floating leaves */}
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          className="checkin-leaf"
          style={{
            left: `${10 + i * 12}%`,
            animationDelay: `${i * 1.4}s`,
            animationDuration: `${10 + i * 1.3}s`,
          }}
        />
      ))}

      {/* Camera overlay */}
      {cameraOpen && (
        <div className="camera-overlay">
          <div className="camera-modal">
            <div className="camera-header">
              <span>Take a Selfie</span>
              <button className="camera-close" onClick={closeCamera}><X size={18} /></button>
            </div>
            <video ref={videoRef} className="camera-video" playsInline muted autoPlay />
            <div className="camera-footer">
              <Button glow onClick={capturePhoto} className="capture-btn">
                📸 Capture
              </Button>
            </div>
            <p className="camera-privacy-note">
              📷 Photo is processed locally and never stored permanently.
            </p>
          </div>
        </div>
      )}

      {/* Main scrollable content */}
      <div className="checkin-scroll">
        <div className="checkin-inner">

          {/* Back button */}
          <button className="checkin-back-btn" onClick={onBack}>
            <ArrowLeft size={18} />
            <span>Dashboard</span>
          </button>

          {/* Header */}
          <div className="checkin-header">
            <div className="checkin-icon-ring">
              <Smile size={32} />
            </div>
            <h1 className="checkin-title">Daily Wellness Check-in</h1>
            <p className="checkin-subtitle">
              Take a minute to share how you're feeling today. Your responses help
              create a healthier and more supportive environment.
            </p>
          </div>

          {/* Tab nav */}
          <div className="checkin-tabs">
            <button
              className={`checkin-tab ${activeTab === 'text' ? 'active' : ''}`}
              onClick={() => setActiveTab('text')}
            >
              <Type size={15} /> Describe
            </button>
            <button
              className={`checkin-tab ${activeTab === 'quick' ? 'active' : ''}`}
              onClick={() => setActiveTab('quick')}
            >
              <Zap size={15} /> Quick
            </button>
            <button
              className={`checkin-tab ${activeTab === 'selfie' ? 'active' : ''}`}
              onClick={() => setActiveTab('selfie')}
            >
              <Camera size={15} /> Selfie
            </button>
          </div>

          {/* ── Tab: Text description ── */}
          {activeTab === 'text' && (
            <div className="checkin-panel">
              {/* Suggested questions (read-only hints — do NOT paste into textarea) */}
              <div className="suggested-questions">
                <p className="sq-label">💡 Suggested prompts — answer in your own words:</p>
                <div className="sq-list">
                  {SUGGESTED_QUESTIONS.map((q, i) => (
                    <div key={i} className="sq-item">{q}</div>
                  ))}
                </div>
              </div>

              <div className="textarea-wrap">
                <textarea
                  className="checkin-textarea"
                  placeholder="Tell us about your day…&#10;&#10;How are you feeling? What's on your mind?"
                  value={text}
                  onChange={e => setText(e.target.value.slice(0, MAX_CHARS))}
                  rows={6}
                />
                <div className="char-counter">
                  <div
                    className="char-bar-fill"
                    style={{ width: `${Math.min(charPercent, 100)}%`, background: charColor }}
                  />
                  <span style={{ color: charColor }}>{text.length}/{MAX_CHARS}</span>
                </div>
              </div>
            </div>
          )}

          {/* ── Tab: Quick emotion tiles ── */}
          {activeTab === 'quick' && (
            <div className="checkin-panel">
              <p className="quick-label">How are you feeling right now?</p>
              <div className="emotion-grid">
                {QUICK_EMOTIONS.map(em => (
                  <button
                    key={em.label}
                    className={`emotion-tile ${selectedEmotion?.label === em.label ? 'selected' : ''}`}
                    style={{ '--em-color': em.color }}
                    onClick={() =>
                      setSelectedEmotion(prev =>
                        prev?.label === em.label ? null : em
                      )
                    }
                  >
                    <span className="emotion-emoji">{em.emoji}</span>
                    <span className="emotion-label">{em.label}</span>
                    {selectedEmotion?.label === em.label && (
                      <span className="emotion-check">✓</span>
                    )}
                  </button>
                ))}
              </div>
              {selectedEmotion && (
                <div className="selected-emotion-note">
                  You selected <strong style={{ color: selectedEmotion.color }}>
                    {selectedEmotion.emoji} {selectedEmotion.label}
                  </strong> — this will be the primary signal for your analysis.
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Selfie ── */}
          {activeTab === 'selfie' && (
            <div className="checkin-panel">
              {selfieDataUrl ? (
                <div className="selfie-preview-wrap">
                  <img src={selfieDataUrl} alt="Your selfie" className="selfie-preview" />
                  <button className="selfie-remove-btn" onClick={removeSelfie}>
                    <X size={16} /> Remove
                  </button>
                  <p className="selfie-privacy-note">
                    🔒 Your photo is analysed on-server and immediately discarded — never stored.
                  </p>
                </div>
              ) : (
                <div className="selfie-options">
                  <p className="selfie-label">
                    Optional: share a selfie to add facial expression to your analysis.
                  </p>

                  {cameraError && (
                    <div className="camera-error-banner">
                      <AlertCircle size={15} />
                      <span>{cameraError}</span>
                    </div>
                  )}

                  <div className="selfie-btn-row">
                    <button className="selfie-action-btn" onClick={openCamera}>
                      <Camera size={20} />
                      <span>Open Camera</span>
                    </button>
                    <button className="selfie-action-btn" onClick={() => fileInputRef.current?.click()}>
                      <span style={{ fontSize: '1.3rem' }}>🖼️</span>
                      <span>Upload Photo</span>
                    </button>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleFileUpload}
                  />
                  <p className="selfie-privacy-note">
                    🔒 Your photo is analysed on-server and immediately discarded — never stored.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Summary of what's been filled */}
          <div className="checkin-summary">
            <div className={`summary-chip ${text.trim() ? 'filled' : ''}`}>
              <Type size={12} /> Text {text.trim() ? `(${text.trim().split(/\s+/).filter(Boolean).length} words)` : '— empty'}
            </div>
            <div className={`summary-chip ${selectedEmotion ? 'filled' : ''}`}>
              <Zap size={12} /> {selectedEmotion ? `${selectedEmotion.emoji} ${selectedEmotion.label}` : 'No quick emotion'}
            </div>
            <div className={`summary-chip ${selfieDataUrl ? 'filled' : ''}`}>
              <Camera size={12} /> {selfieDataUrl ? 'Selfie ready' : 'No selfie'}
            </div>
          </div>

          {/* API Error */}
          {apiError && (
            <div className="checkin-api-error">
              <AlertCircle size={16} />
              <span>{apiError}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="checkin-actions">
            <div className="submit-btn-wrapper" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '100%' }}>
              <Button
                glow
                onClick={handleSubmit}
                disabled={!canSubmit || submitting}
                className="submit-btn"
                style={{ width: '100%' }}
              >
                {submitting ? 'Analysing…' : 'Track My Wellness →'}
              </Button>
              {!canSubmit && (
                <span style={{ fontSize: '0.85rem', color: '#ffb74d', textAlign: 'center' }}>
                  Please write at least 7 words ({Math.max(0, 7 - wordCount)} more needed) and select a quick emotion.
                </span>
              )}
            </div>
            <button className="skip-btn" onClick={() => onBack()}>
              Skip for today
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default DailyCheckin;