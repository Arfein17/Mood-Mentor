import React, { useState, useRef, useEffect } from 'react';
import './CheckinResult.css';
import Button from '../components/Button';
import {
  CheckCircle2, Sparkles, AlertCircle, Signal,
  MessageCircle, Send, X, Bot, Lightbulb,
  Wind, Heart, Coffee, Zap, Moon, Smile, Flame, Leaf
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════
   Emotion meta
   ═══════════════════════════════════════════════════════════ */
const EMOTION_META = {
  Happy:      { emoji: '😊', color: '#ffb74d', glow: 'rgba(255,183,77,0.25)' },
  Calm:       { emoji: '😌', color: '#81c784', glow: 'rgba(129,199,132,0.25)' },
  Stressed:   { emoji: '😤', color: '#f06292', glow: 'rgba(240,98,146,0.25)' },
  Anxious:    { emoji: '😰', color: '#ff8a65', glow: 'rgba(255,138,101,0.25)' },
  Frustrated: { emoji: '😠', color: '#ef5350', glow: 'rgba(239,83,80,0.25)' },
  Sad:        { emoji: '😔', color: '#90caf9', glow: 'rgba(144,202,249,0.25)' },
  uncertain:  { emoji: '🤔', color: '#b0b0b0', glow: 'rgba(176,176,176,0.15)' },
};

const SCORE_LABEL = (s) => {
  if (s >= 75) return { label: 'Flourishing', color: '#81c784' };
  if (s >= 55) return { label: 'Good', color: '#aed581' };
  if (s >= 40) return { label: 'Fair', color: '#ffb74d' };
  if (s >= 25) return { label: 'Needs Care', color: '#ff8a65' };
  return { label: 'Struggling', color: '#f06292' };
};

const SIGNAL_LABEL = (signals) => {
  if (!signals) return 'Text analysis';
  const parts = [];
  if (signals.selfReport) parts.push('Self-report');
  if (signals.text) parts.push('Text');
  if (signals.face) parts.push('Selfie');
  return parts.join(' + ') || 'Analysis';
};

/* ═══════════════════════════════════════════════════════════
   Mood Suggestions — rules-based, personalised by emotion
   ═══════════════════════════════════════════════════════════ */
const SUGGESTIONS = {
  Stressed: [
    { icon: Wind,   color: '#90caf9', title: '5-Minute Box Breathing',      body: 'Inhale 4s → Hold 4s → Exhale 4s → Hold 4s. Repeat 4 times. Activates your parasympathetic nervous system instantly.' },
    { icon: Coffee, color: '#ffb74d', title: 'Micro-Break Protocol',         body: 'Step away from your screen for just 5 minutes. Walk, stretch, or look at something green. Returns 20% focus on average.' },
    { icon: Leaf,   color: '#81c784', title: 'Progressive Muscle Relaxation', body: 'Tense each muscle group for 5 seconds, then release. Start from your toes, move up to your shoulders.' },
    { icon: Moon,   color: '#b39ddb', title: 'Tonight: Wind-Down Ritual',    body: 'Dim lights 1 hour before bed, no screens. Write 3 things you finished today. Reduces cortisol overnight.' },
  ],
  Anxious: [
    { icon: Wind,   color: '#90caf9', title: '4-7-8 Breathing',              body: 'Inhale for 4 counts, hold for 7, exhale slowly for 8. This pattern rapidly calms your nervous system.' },
    { icon: Leaf,   color: '#81c784', title: '5-4-3-2-1 Grounding',          body: 'Name 5 things you see, 4 you can touch, 3 you hear, 2 you smell, 1 you taste. Anchors you to the present.' },
    { icon: Moon,   color: '#b39ddb', title: 'Body Scan Meditation',          body: 'Close your eyes, breathe slowly, and mentally scan from head to toe. 10 minutes significantly reduces anxiety.' },
    { icon: Heart,  color: '#f06292', title: 'Reach Out',                    body: "Anxiety grows in isolation. Send a message to someone you trust — even a short check-in helps shift your mood." },
  ],
  Sad: [
    { icon: Smile,  color: '#ffb74d', title: 'Mood-Lifting Movement',        body: 'Even a 10-minute walk raises serotonin levels. Put on a playlist you love and move — it works within minutes.' },
    { icon: Heart,  color: '#f06292', title: 'Self-Compassion Moment',       body: "Speak to yourself the way you'd speak to a friend going through this. You deserve the same kindness you'd give others." },
    { icon: Zap,    color: '#81c784', title: 'Micro-Accomplishment',         body: 'Do one small, completable task right now. Make your bed, reply to a message. Momentum is everything when energy is low.' },
    { icon: Moon,   color: '#b39ddb', title: 'Connect With a Mentor',        body: 'Mode Mentor can connect you with a wellness advisor. You don\'t have to navigate this alone — support is available.' },
  ],
  Frustrated: [
    { icon: Flame,  color: '#ff8a65', title: 'Physical Release',             body: 'Do 20 jumping jacks or a brisk 3-minute walk. Physical movement metabolises the adrenaline fuelling frustration.' },
    { icon: Wind,   color: '#90caf9', title: 'Cool-Down Breathing',          body: 'Breathe in through your nose for 3 counts, blow out slowly through your mouth for 6. Repeat 6 times.' },
    { icon: Coffee, color: '#ffb74d', title: 'Reframe the Situation',        body: 'Ask: "Will this matter in 5 days?" Then: "What one thing can I control right now?" Focus shifts energy fast.' },
    { icon: Leaf,   color: '#81c784', title: '10-Minute Journal',            body: 'Write exactly what frustrated you — uncensored. Getting it out of your head and onto paper reduces its emotional weight.' },
  ],
  Happy: [
    { icon: Smile,  color: '#ffb74d', title: 'Savour This Moment',          body: 'You\'re doing well — pause and really feel it. Research shows intentionally savouring positive emotions amplifies them.' },
    { icon: Heart,  color: '#f06292', title: 'Spread the Energy',           body: 'Drop a genuine compliment or encouragement to a teammate or friend today. Positive emotion is contagious.' },
    { icon: Zap,    color: '#81c784', title: 'Channel It Into Goals',       body: 'High-positive mood is the best time to tackle challenging work or creative projects. Ride this energy wave!' },
    { icon: Leaf,   color: '#b39ddb', title: 'Gratitude Snapshot',          body: 'Write down 3 specific things that contributed to this feeling. Gratitude journaling strengthens future resilience.' },
  ],
  Calm: [
    { icon: Leaf,   color: '#81c784', title: 'Deepen This State',           body: 'Calm is your power mode. Try 10 minutes of mindful breathing to entrench this state and carry it through your day.' },
    { icon: Zap,    color: '#ffb74d', title: 'Focused Deep Work',           body: 'Calm focus is ideal for complex or creative tasks. Block 90 minutes of uninterrupted work — you\'re in the zone.' },
    { icon: Heart,  color: '#f06292', title: 'Wellbeing Check-In',          body: 'You\'re balanced — a great time to reflect on your longer-term wellness goals and what keeps you grounded.' },
    { icon: Moon,   color: '#b39ddb', title: 'Plan Tomorrow',               body: 'Use this clarity to set tomorrow\'s intentions. Calm planning reduces tomorrow\'s stress before it even starts.' },
  ],
  uncertain: [
    { icon: Leaf,   color: '#81c784', title: 'Take a Moment',               body: 'It\'s okay not to have a clear label for how you feel. Sit quietly for 2 minutes and observe your thoughts without judgment.' },
    { icon: Wind,   color: '#90caf9', title: 'Breathing Reset',             body: 'A simple breathing reset helps any emotional state. Slow inhale for 4, hold for 2, exhale for 6. Three rounds.' },
    { icon: Coffee, color: '#ffb74d', title: 'Journal It Out',              body: 'Write freely for 5 minutes — whatever comes to mind. Unstructured writing often surfaces clarity you couldn\'t find consciously.' },
    { icon: Heart,  color: '#f06292', title: 'Be Gentle With Yourself',    body: "Mixed or unclear feelings are completely normal. You don't need to resolve everything right now — just acknowledge and breathe." },
  ],
};

import BuddyWidget from '../components/BuddyWidget';

/* ═══════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════════
   Text-aware suggestion picker
   Analyses raw text keywords + selected emotion to pick the
   most relevant tip category, rather than using emotion alone.
   ═══════════════════════════════════════════════════════════ */
const TEXT_REFINEMENTS = {
  // Workload / deadline stress
  workload: /(workload|deadline|overtime|too much work|piling up|overwhelming|behind on|behind schedule|so much to do|pressure at work|work pressure)/i,
  // Relationship / interpersonal
  relationship: /(relationship|colleague|manager|boss|team|conflict|argument|fight|toxic|harassment|communication)/i,
  // Academic stress
  academic: /(exam|assignment|study|grade|uni|college|school|lecture|semester|project due)/i,
  // Physical / health
  physical: /(tired|exhausted|sleep|headache|sick|unwell|pain|fatigue|not sleeping)/i,
  // Loneliness / isolation
  isolation: /(lonely|alone|isolated|no one|nobody|disconnected|miss|missing)/i,
  // Achievement / positive
  achievement: /(achieved|completed|finished|proud|did it|got the|success|great day|productive|promotion|well done)/i,
};

function pickSuggestions(emotion, rawText) {
  const base = SUGGESTIONS[emotion] || SUGGESTIONS.uncertain;
  if (!rawText || !rawText.trim()) return base;
  const t = rawText.toLowerCase();

  // Override specific tips based on text content
  const overrides = [];

  if (TEXT_REFINEMENTS.workload.test(t) && (emotion === 'Stressed' || emotion === 'Anxious' || emotion === 'Frustrated')) {
    overrides.push({ icon: Coffee, color: '#ffb74d', title: 'Workload Reset Technique', body: 'List every task weighing on you — then pick just the ONE most important. Work only on that for 25 minutes (Pomodoro). Progress on one thing beats paralysis on everything.' });
    overrides.push({ icon: Wind,   color: '#90caf9', title: 'Deadline Anxiety Breathing', body: 'When deadlines pile up, your brain enters scarcity mode. Break the cycle: close all tabs, breathe for 2 minutes, then open just one task.' });
  }
  if (TEXT_REFINEMENTS.relationship.test(t)) {
    overrides.push({ icon: Heart, color: '#f06292', title: 'Interpersonal Recharge', body: 'After a difficult interaction, give yourself a 10-minute buffer before responding or reacting. Write your thoughts first — it defuses emotional charge before it escalates.' });
  }
  if (TEXT_REFINEMENTS.academic.test(t)) {
    overrides.push({ icon: Zap, color: '#81c784', title: 'Study Pressure Relief', body: 'Break study sessions into 25-minute blocks with 5-minute breaks. Your brain consolidates memory better with rest than marathon sessions.' });
  }
  if (TEXT_REFINEMENTS.physical.test(t)) {
    overrides.push({ icon: Moon, color: '#b39ddb', title: 'Rest & Recovery Priority', body: 'Physical fatigue amplifies emotional distress. Tonight: lights out 30 minutes earlier than usual. Even one extra sleep cycle significantly restores cognitive function.' });
  }
  if (TEXT_REFINEMENTS.isolation.test(t)) {
    overrides.push({ icon: Heart, color: '#90caf9', title: 'Connection as Medicine', body: 'Loneliness activates the same brain regions as physical pain. Reach out to one person today — a message, a call. The initiation is the hardest part, but the relief is immediate.' });
  }
  if (TEXT_REFINEMENTS.achievement.test(t) && (emotion === 'Happy' || emotion === 'Calm')) {
    overrides.push({ icon: Smile, color: '#ffb74d', title: 'Savour Your Win', body: 'You earned this. Research shows deliberately savouring positive moments for 30 seconds cements them as emotional memories, building long-term resilience.' });
  }

  // Merge: put text-derived overrides first, fill remaining slots from base
  const merged = [...overrides];
  for (const s of base) {
    if (merged.length >= 4) break;
    merged.push(s);
  }
  return merged.slice(0, 4);
}

const CheckinResult = ({ wellnessResult, checkinContext, onReturnToDashboard }) => {
  const emotion = wellnessResult ? (wellnessResult.dominantEmotion || wellnessResult.topEmotion) : null;
  const hasResult = !!emotion;
  const meta = emotion ? (EMOTION_META[emotion] || EMOTION_META.uncertain) : null;
  const scoreInfo = hasResult ? SCORE_LABEL(wellnessResult.wellnessScore) : null;
  // Use text + emotion together for smarter suggestions
  const rawText = checkinContext?.text || '';
  const suggestions = hasResult ? pickSuggestions(emotion, rawText) : SUGGESTIONS.uncertain;

  return (
    <div className="result-page">
      <div className="result-bg" />
      <div className="result-orb ro-1" />
      <div className="result-orb ro-2" />

      <div className="result-scroll">
        <div className="result-inner">

          {/* ── Header ── */}
          <div className="result-success-badge">
            <div className="result-check-ring">
              <CheckCircle2 size={40} />
            </div>
            <h1 className="result-title">Wellness Analysis</h1>
            <p className="result-received">Your reflection has been analysed.</p>
          </div>

          {hasResult ? (
            <>
              {/* ── Score Ring + Emotion Badge ── */}
              <div className="result-score-card" style={{ '--em-glow': meta.glow }}>
                <div className="score-ring-wrap">
                  <svg className="score-ring" viewBox="0 0 120 120">
                    {/* Track */}
                    <circle cx="60" cy="60" r="50" fill="none"
                      stroke="rgba(255,255,255,0.07)" strokeWidth="10" />
                    {/* Progress */}
                    <circle
                      cx="60" cy="60" r="50"
                      fill="none"
                      stroke={scoreInfo.color}
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 50}`}
                      strokeDashoffset={`${2 * Math.PI * 50 * (1 - wellnessResult.wellnessScore / 100)}`}
                      transform="rotate(-90 60 60)"
                      style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(0.4,0,0.2,1)', filter: `drop-shadow(0 0 8px ${scoreInfo.color})` }}
                    />
                  </svg>
                  <div className="score-ring-center">
                    <span className="score-number">{wellnessResult.wellnessScore}</span>
                    <span className="score-out-of">/100</span>
                  </div>
                </div>

                <div className="score-right">
                  <div className="score-emotion-badge" style={{ '--em-color': meta.color, '--em-glow': meta.glow }}>
                    <span className="score-emoji">{meta.emoji}</span>
                    <span className="score-emotion-label">{emotion}</span>
                  </div>
                  <div className="score-wellness-label" style={{ color: scoreInfo.color }}>
                    {scoreInfo.label}
                  </div>
                  {wellnessResult.signals && (
                    <div className="score-signal-type">
                      <Signal size={11} />
                      {SIGNAL_LABEL(wellnessResult.signals)}
                    </div>
                  )}
                </div>
              </div>


              {/* ── Personalised Suggestions ── */}
              <div className="result-suggestions">
                <div className="suggestions-heading">
                  <Lightbulb size={16} className="suggestions-icon" />
                  <span>Personalised for {emotion}</span>
                </div>
                <div className="suggestions-grid">
                  {suggestions.map((s, i) => {
                    const Icon = s.icon;
                    return (
                      <div key={i} className="suggestion-card" style={{ '--s-color': s.color, animationDelay: `${i * 0.1}s` }}>
                        <div className="suggestion-icon-ring">
                          <Icon size={18} />
                        </div>
                        <div className="suggestion-body">
                          <div className="suggestion-title">{s.title}</div>
                          <div className="suggestion-text">{s.body}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Disclaimer ── */}
              <div className="result-disclaimer">
                <AlertCircle size={14} />
                <span>{wellnessResult.disclaimer}</span>
              </div>
            </>
          ) : (
            /* Fallback */
            <div className="result-placeholder-card">
              <div className="placeholder-icon-row">
                <Sparkles size={22} className="placeholder-sparkle" />
                <span>AI server was not reachable</span>
              </div>
              <p className="placeholder-detail">
                Start the wellness server (<code>cd server &amp;&amp; node index.js</code>) to see your real emotion analysis.
              </p>
            </div>
          )}

          {/* ── Return Button ── */}
          <div className="result-action-row">
            <Button glow onClick={onReturnToDashboard} className="result-return-btn">
              Return to Dashboard
            </Button>
            <p className="result-note">Keep checking in daily to build your wellness journey 🌿</p>
          </div>

          <BuddyWidget />
        </div>
      </div>
    </div>
  );
};

export default CheckinResult;
