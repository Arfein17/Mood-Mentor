import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Sparkles, Send, Loader2 } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { fetchWithAuth } from '../api/client';
import './BuddyWidget.css';

const GREETING_TEMPLATES = {
  Happy: [
    "I see you're feeling Happy! 🌟 That's wonderful. Want to find some upbeat music to keep the vibe going?",
    "You're in a great mood! 😊 How can I help you savor this energy?",
    "Love to see you Happy! Got any fun plans or want a quick game recommendation?",
    "Your positivity is shining! ☀️ Anything I can do to make your day even better?"
  ],
  Calm: [
    "You're feeling Calm. 🌿 That's a great space to be in. Would you like some chill lo-fi to maintain focus?",
    "It's peaceful right now. 😌 If you want a slow, untimed activity, Memory Match or Zen Sand Garden are perfect.",
    "A calm mind is a powerful mind! Want to try a short mindfulness exercise to deepen it?",
    "You seem grounded today. 🍵 Can I assist you with any tasks or suggest some ambient music?"
  ],
  Stressed: [
    "I notice you're feeling Stressed. 🌪️ It's okay to take a moment. Have you tried the Breathing Bubble game?",
    "Stress can be overwhelming. Take a deep breath. 💨 Want to try the Bubble Pop game for a minute? It might help release some tension.",
    "You're running hot right now. ♨️ Let's slow down. Can I find you some calming acoustic music?",
    "I see the stress. 🛑 Don't forget to step away from the screen for a bit. Want to try a quick focus reset?"
  ],
  Anxious: [
    "I see you're feeling Anxious. 🦋 Breathe with me: in for 4, hold for 4, out for 4. Want to try the Breathing Bubble?",
    "Anxiety can be tough. 🫂 Try naming 3 things you can see right now. Or let's enjoy the peaceful Zen Sand Garden.",
    "Your nerves are heightened. Let's find some calming ambient music to help ground you.",
    "It's okay to feel anxious. 🌊 Try to take it one step at a time. Do you want to try a quick mindfulness prompt?"
  ],
  Frustrated: [
    "You're Frustrated. 😤 That's valid. Want to try the Bubble Pop game for a minute? It might help release some of that tension.",
    "I can tell things are frustrating right now. 💢 Want something calming, or something upbeat to shake it off?",
    "Frustration is a heavy energy. 🌋 Try a quick physical reset, or pop some bubbles in the mini-games section!",
    "It's aggravating, I know. 🛑 Step back for a moment. Want me to suggest some energetic music to blow off steam?"
  ],
  Sad: [
    "I'm sorry you're feeling Sad. 💙 Remember, Mode Mentor can connect you with a wellness advisor if you want to talk to someone.",
    "It's okay to feel down. 🌧️ Want me to find some uplifting acoustic playlists to keep you company?",
    "I'm here for you. 🫂 Even a small step helps. Do you want a motivational quote or a gentle distraction like Memory Match?",
    "Take all the time you need. 🛋️ If you need extra support, connecting with a mentor is always an option here."
  ],
  uncertain: [
    "Hey there! I'm your wellness buddy. How can I support you today?",
    "Hi! Not sure how you're feeling? That's totally okay. I'm here if you want to chat.",
    "Hello! Do you want a game recommendation or some music to set the mood?",
    "I'm here for you! Want to try a mini-game or just talk?"
  ]
};

const BuddyWidget = ({ emotion, wellnessScore }) => {
  const { user } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState('');
  const [hasGreeted, setHasGreeted] = useState(false);
  
  const messagesEndRef = useRef(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Fetch history on load if user exists
  useEffect(() => {
    if (user && user.id) {
      fetchWithAuth(`/api/buddy/history/${user.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.messages && data.messages.length > 0) {
            setMessages(data.messages);
            setHasGreeted(true); // Don't greet if history exists
          }
        })
        .catch(err => console.error('Failed to load buddy history', err));
    }
  }, [user]);

  // Proactive greeting when opened first time
  useEffect(() => {
    if (isOpen && !hasGreeted && messages.length === 0) {
      setHasGreeted(true);
      const eClass = emotion && GREETING_TEMPLATES[emotion] ? emotion : 'uncertain';
      const templates = GREETING_TEMPLATES[eClass];
      const randomGreeting = templates[Math.floor(Math.random() * templates.length)];
      setMessages([{ role: 'model', content: randomGreeting }]);
    }
  }, [isOpen, hasGreeted, messages.length, emotion]);

  const handleSend = async () => {
    if (!inputText.trim()) return;
    
    const newMsg = { role: 'user', content: inputText.trim() };
    const historyToPass = [...messages];
    
    setMessages(prev => [...prev, newMsg]);
    setInputText('');
    setIsTyping(true);
    setError('');
    
    try {
      const res = await fetchWithAuth('/api/buddy/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user ? user.id : 'GUEST_USER',
          message: newMsg.content,
          conversationHistory: historyToPass
        })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Server error');
      }
      
      setMessages(prev => [...prev, { role: 'model', content: data.reply }]);
    } catch (err) {
      console.error(err);
      setError("I'm having trouble connecting right now, try again in a moment");
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      <button 
        className={`buddy-fab ${isOpen ? 'hidden' : ''}`}
        onClick={() => setIsOpen(true)}
        aria-label="Open AI Buddy"
      >
        <Sparkles size={24} color="#fff" />
      </button>

      {isOpen && (
        <div className="buddy-panel">
          <div className="buddy-header">
            <div className="buddy-header-title">
              <Sparkles size={20} color="#60a5fa" />
              <span>Wellness Buddy</span>
            </div>
            <button className="buddy-close" onClick={() => setIsOpen(false)}>
              <X size={20} />
            </button>
          </div>
          
          <div className="buddy-messages">
            {messages.length === 0 && (
              <div className="buddy-empty">
                <MessageCircle size={40} color="#9ca3af" />
                <p>Hi! I'm your wellness buddy. Ask me for music suggestions, relaxation tips, or just chat!</p>
              </div>
            )}
            
            {messages.map((m, i) => {
              // Very simple markdown link parser: [text](url)
              const renderContent = (text) => {
                if (m.role === 'user') return text;
                const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
                const parts = [];
                let lastIndex = 0;
                let match;
                while ((match = linkRegex.exec(text)) !== null) {
                  parts.push(text.substring(lastIndex, match.index));
                  parts.push(
                    <a key={lastIndex} href={match[2]} target="_blank" rel="noopener noreferrer" style={{color: '#60a5fa', textDecoration: 'underline'}}>
                      {match[1]}
                    </a>
                  );
                  lastIndex = linkRegex.lastIndex;
                }
                parts.push(text.substring(lastIndex));
                return parts;
              };

              return (
                <div key={i} className={`buddy-message ${m.role}`}>
                  <div className="buddy-message-bubble">
                    {renderContent(m.content)}
                  </div>
                </div>
              );
            })}
            
            {isTyping && (
              <div className="buddy-message model typing">
                <div className="buddy-message-bubble">
                  <span className="dot"></span>
                  <span className="dot"></span>
                  <span className="dot"></span>
                </div>
              </div>
            )}
            
            {error && (
              <div className="buddy-error">
                {error}
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
          
          <div className="buddy-input-area">
            <input 
              type="text" 
              placeholder="Type a message..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />
            <button className="buddy-send" onClick={handleSend} disabled={!inputText.trim() || isTyping}>
              {isTyping ? <Loader2 className="spinner" size={20} /> : <Send size={20} />}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default BuddyWidget;
