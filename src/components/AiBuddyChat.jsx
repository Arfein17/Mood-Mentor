import React, { useState, useRef, useEffect } from 'react';
import './AiBuddyChat.css';
import { Bot, Send, X } from 'lucide-react';

const AiBuddyChat = ({ emotion, checkinText }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const initialised = useRef(false);

  // Opening greeting
  useEffect(() => {
    if (!initialised.current) {
      initialised.current = true;
      const mentionText = checkinText ? " I've reviewed your check-in." : "";
      const greet = `Hi! I'm your AI Buddy. I noticed you're feeling ${emotion || 'okay'}.${mentionText} How can I help you today? I can suggest music, games, hangout plans, or just chat!`;
      
      setTimeout(() => {
        setMessages([{ role: 'model', content: greet }]);
      }, 400);
    }
  }, [emotion, checkinText]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    
    const newMessages = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setTyping(true);
    
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          userEmotion: emotion
        })
      });
      if (!res.ok) throw new Error('Failed to fetch chat');
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'model', content: data.reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'model', content: 'Oops! I lost connection to my brain. Please try again later.' }]);
    } finally {
      setTyping(false);
    }
  };

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <div className="buddy-container">
      <div className="buddy-card">
        {/* Header */}
        <div className="buddy-header">
          <div className="buddy-header-avatar">
            <Bot size={20} />
          </div>
          <div className="buddy-header-info">
            <span className="buddy-header-name">AI Buddy</span>
            <span className="buddy-header-sub">Mode Mentor · Superpower</span>
          </div>
        </div>

        {/* Messages */}
        <div className="buddy-messages">
          {messages.map((m, i) => (
            <div key={i} className={`buddy-msg buddy-msg-${m.role}`}>
              {m.role === 'model' && (
                <div className="buddy-msg-avatar"><Bot size={16} /></div>
              )}
              <div className="buddy-msg-bubble">{m.content}</div>
            </div>
          ))}
          {typing && (
            <div className="buddy-msg buddy-msg-model">
              <div className="buddy-msg-avatar"><Bot size={16} /></div>
              <div className="buddy-msg-bubble buddy-typing">
                <span /><span /><span />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="buddy-input-row">
          <textarea
            ref={inputRef}
            className="buddy-input"
            placeholder="Ask me anything..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKey}
            rows={1}
          />
          <button
            className="buddy-send-btn"
            onClick={send}
            disabled={!input.trim()}
            aria-label="Send"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AiBuddyChat;
