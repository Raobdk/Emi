import React, { useState, useEffect, useRef } from 'react';
import { aiAPI } from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const AIAssistant = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'assistant',
      content: "👋 Hello! I'm your **EMI Business Assistant**.\n\nI can help you with:\n• 📊 Profit & earnings analysis\n• ⚠️ Overdue payment strategies\n• 👥 Customer insights\n• 💰 Investment overview\n• 📋 EMI plan guidance\n\nWhat would you like to know about your business?",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [predictions, setPredictions] = useState(null);
  const [insights, setInsights] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [predRes, insRes] = await Promise.all([
          aiAPI.getPredictions(),
          aiAPI.getInsights()
        ]);
        setPredictions(predRes.data.predictions);
        setInsights(insRes.data.insights || []);
      } catch {}
    };
    loadInitialData();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text) => {
    const userMsg = text || input.trim();
    if (!userMsg) return;

    setInput('');
    const userMessage = { id: Date.now(), role: 'user', content: userMsg, timestamp: new Date() };
    const loadingMessage = { id: Date.now() + 1, role: 'assistant', content: null, loading: true, timestamp: new Date() };

    setMessages(prev => [...prev, userMessage, loadingMessage]);
    setLoading(true);

    try {
      const { data } = await aiAPI.chat(userMsg);
      setMessages(prev => prev.map(m =>
        m.loading ? { ...m, content: data.response, loading: false } : m
      ));
    } catch {
      setMessages(prev => prev.map(m =>
        m.loading ? { ...m, content: '❌ Failed to get response. Please try again.', loading: false } : m
      ));
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    { icon: '📊', text: 'Show me profit analysis' },
    { icon: '⚠️', text: 'What about overdue payments?' },
    { icon: '💰', text: 'Give me investment summary' },
    { icon: '📋', text: 'Monthly business summary' },
    { icon: '👥', text: 'How can I grow customers?' },
    { icon: '💡', text: 'Suggest profit strategies' },
  ];

  const formatMessage = (content) => {
    if (!content) return '';
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br/>');
  };

  return (
    <div className="animate-fadeIn" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, height: 'calc(100vh - 130px)' }}>
      {/* Chat Area */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 }}>
          {/* Chat Header */}
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, boxShadow: '0 4px 14px rgba(99,102,241,0.4)' }}>
              🤖
            </div>
            <div>
              <p style={{ fontWeight: 700, fontSize: 16 }}>AI Business Assistant</p>
              <p style={{ fontSize: 12, color: 'var(--success)' }}>● Online · Powered by EMI Intelligence</p>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {messages.map(msg => (
              <div key={msg.id} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: 10 }}>
                {msg.role === 'assistant' && (
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                    🤖
                  </div>
                )}
                <div style={{
                  maxWidth: '75%',
                  padding: '12px 16px',
                  borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  background: msg.role === 'user'
                    ? 'linear-gradient(135deg, var(--accent), var(--accent-dark))'
                    : 'var(--bg-tertiary)',
                  color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
                  fontSize: 14,
                  lineHeight: 1.6,
                  border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none',
                  boxShadow: 'var(--shadow-sm)'
                }}>
                  {msg.loading ? (
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      {[0, 0.2, 0.4].map((delay, i) => (
                        <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', animation: `pulse 1.4s ease-in-out ${delay}s infinite` }} />
                      ))}
                    </div>
                  ) : (
                    <div dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }} />
                  )}
                  <p style={{ fontSize: 10, color: msg.role === 'user' ? 'rgba(255,255,255,0.6)' : 'var(--text-muted)', marginTop: 6 }}>
                    {msg.timestamp.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {msg.role === 'user' && (
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                    👤
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts */}
          <div style={{ padding: '12px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {quickPrompts.map(p => (
              <button key={p.text} onClick={() => sendMessage(p.text)} disabled={loading}
                style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 99, padding: '5px 12px', fontSize: 12, cursor: 'pointer', color: 'var(--text-secondary)', transition: 'var(--transition)', display: 'flex', alignItems: 'center', gap: 4 }}
                onMouseOver={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.color = 'var(--accent)'; }}
                onMouseOut={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.color = 'var(--text-secondary)'; }}
              >
                {p.icon} {p.text}
              </button>
            ))}
          </div>

          {/* Input */}
          <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: 12 }}>
            <input
              className="form-control"
              placeholder="Ask anything about your EMI business..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              disabled={loading}
              style={{ flex: 1 }}
            />
            <button
              className="btn btn-primary"
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              style={{ padding: '11px 20px', flexShrink: 0 }}
            >
              {loading ? '⏳' : '🚀 Send'}
            </button>
          </div>
        </div>
      </div>

      {/* Sidebar: Predictions & Insights */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto' }}>
        {/* AI Predictions */}
        {predictions && (
          <div className="card">
            <h3 className="card-title mb-4">🔮 AI Predictions</h3>

            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Expected Monthly Revenue</p>
              <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--success)' }}>PKR {predictions.expectedMonthlyRevenue?.toLocaleString()}</p>
            </div>

            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>At-Risk Amount</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--danger)' }}>PKR {predictions.atRiskAmount?.toLocaleString()}</p>
            </div>

            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Recovery Probability</p>
              <div style={{ background: 'var(--bg-tertiary)', borderRadius: 99, height: 8, overflow: 'hidden' }}>
                <div style={{ width: `${predictions.recoveryProbability}%`, height: '100%', background: `linear-gradient(90deg, var(--danger), var(--success))`, borderRadius: 99 }} />
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{predictions.recoveryProbability}%</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {predictions.insights?.map((insight, i) => (
                <div key={i} style={{
                  padding: 12,
                  borderRadius: 'var(--radius-sm)',
                  background: insight.type === 'warning' ? 'var(--warning-bg)' : insight.type === 'success' ? 'var(--success-bg)' : 'var(--info-bg)',
                  border: `1px solid ${insight.type === 'warning' ? 'var(--warning)' : insight.type === 'success' ? 'var(--success)' : 'var(--info)'}30`,
                  fontSize: 12
                }}>
                  <p style={{ color: insight.type === 'warning' ? 'var(--warning)' : insight.type === 'success' ? 'var(--success)' : 'var(--info)' }}>
                    {insight.message}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Business Insights */}
        {insights.length > 0 && (
          <div className="card">
            <h3 className="card-title mb-4">💡 Business Insights</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {insights.map((ins, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 22 }}>{ins.icon}</span>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 18, color: ins.trend === 'up' ? 'var(--success)' : 'var(--danger)' }}>
                      {ins.value} {ins.trend === 'up' ? '↑' : '↓'}
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{ins.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tips */}
        <div className="card">
          <h3 className="card-title mb-4">💬 Quick Tips</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              ['🎯', 'Try 12-month plans for max 40% interest'],
              ['📱', 'Call overdue customers in the morning'],
              ['💰', 'Offer early payment discounts'],
              ['📊', 'Review monthly reports every Friday'],
              ['🤝', 'Referrals = best new customers'],
            ].map(([icon, tip]) => (
              <div key={tip} style={{ display: 'flex', gap: 8, fontSize: 12, color: 'var(--text-secondary)', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <span>{icon}</span> {tip}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;
