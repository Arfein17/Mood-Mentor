import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Sparkles, Send, Loader2 } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { fetchWithAuth } from '../api/client';
import './BuddyWidget.css';

const BuddyWidget = () => {
  const { user } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState('');
  
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
          if (data.messages) {
            setMessages(data.messages);
          }
        })
        .catch(err => console.error('Failed to load buddy history', err));
    }
  }, [user]);

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
            
            {messages.map((m, i) => (
              <div key={i} className={`buddy-message ${m.role}`}>
                <div className="buddy-message-bubble">
                  {m.content}
                </div>
              </div>
            ))}
            
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
