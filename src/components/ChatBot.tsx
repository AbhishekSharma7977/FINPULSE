import { useState, useEffect, useRef, useCallback } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import {
  BrainCircuit, Send, RefreshCw, MessageSquare, Plus,
  Clock, Bot, User, Zap, TrendingUp, AlertCircle,
  Lightbulb, Shield, X, Trash2
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface Session {
  id: string;
  title: string;
  createdAt: number;
  messages: Message[];
}

// ─── localStorage helpers ─────────────────────────────────────────────────────
const STORAGE_KEY = 'finpulse_chat_sessions';

function loadSessions(): Session[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveSessions(sessions: Session[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

// ─── Suggestion chips ─────────────────────────────────────────────────────────
const SUGGESTIONS = [
  { icon: TrendingUp,  text: 'Analyze my spending patterns', color: '#6366f1' },
  { icon: AlertCircle, text: 'Where am I overspending?',     color: '#f59e0b' },
  { icon: Lightbulb,   text: 'Give me savings tips',         color: '#10b981' },
  { icon: Shield,      text: "How's my financial health?",   color: '#a855f7' },
];

// ─── Typing dots ──────────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          className="w-2 h-2 rounded-full bg-indigo-400"
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </div>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────────
function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user';
  const lines = msg.content
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/#{1,3}\s/g, '')
    .trim()
    .split('\n')
    .filter(l => l.trim());

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* Avatar */}
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-1"
        style={{
          background: isUser
            ? 'linear-gradient(135deg, #6366f1, #a855f7)'
            : 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(168,85,247,0.15))',
          border: isUser ? 'none' : '1px solid rgba(99,102,241,0.3)',
        }}
      >
        {isUser
          ? <User size={14} className="text-white" />
          : <Bot size={14} className="text-indigo-300" />}
      </div>

      {/* Bubble */}
      <div
        className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${isUser ? 'rounded-tr-md' : 'rounded-tl-md'}`}
        style={{
          background: isUser
            ? 'linear-gradient(135deg, #6366f1, #4f46e5)'
            : 'rgba(17,24,39,0.85)',
          border: isUser ? 'none' : '1px solid rgba(255,255,255,0.07)',
          color: isUser ? '#fff' : '#e2e8f0',
          boxShadow: isUser ? '0 4px 20px rgba(99,102,241,0.3)' : 'none',
        }}
      >
        {lines.map((line, i) => (
          <p key={i} className={`${i > 0 ? 'mt-1.5' : ''}`} style={{ fontSize: '0.82rem' }}>
            {line}
          </p>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ChatBot() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [showSidebar, setShowSidebar] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const user = auth.currentUser;

  // ── Scroll to bottom ────────────────────────────────────────────────────────
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // ── Load sessions from localStorage ────────────────────────────────────────
  useEffect(() => {
    const saved = loadSessions();
    setSessions(saved);
    if (saved.length > 0) setActiveSessionId(saved[0].id);
  }, []);

  // ── Active messages ─────────────────────────────────────────────────────────
  const activeMessages = sessions.find(s => s.id === activeSessionId)?.messages || [];

  useEffect(() => { scrollToBottom(); }, [activeMessages, loading]);

  // ── Fetch live financial context from Firebase ──────────────────────────────
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'transactions'),
      where('uid', '==', user.uid),
      orderBy('date', 'desc')
    );
    const unsub1 = onSnapshot(q, snap => {
      setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, () => {});

    const wq = query(collection(db, 'wallets'), where('uid', '==', user.uid));
    const unsub2 = onSnapshot(wq, snap => {
      const total = snap.docs.reduce((s, d) => s + ((d.data() as any).balance || 0), 0);
      setWalletBalance(total);
    }, () => {});

    return () => { unsub1(); unsub2(); };
  }, [user]);

  // ── Create session ──────────────────────────────────────────────────────────
  const createSession = (firstMsg?: string): Session => {
    const newSession: Session = {
      id: `session_${Date.now()}`,
      title: firstMsg ? firstMsg.slice(0, 45) + (firstMsg.length > 45 ? '…' : '') : 'New Conversation',
      createdAt: Date.now(),
      messages: [],
    };
    return newSession;
  };

  // ── Send message ────────────────────────────────────────────────────────────
  const sendMessage = async (text?: string) => {
    const prompt = (text || input).trim();
    if (!prompt || loading) return;

    setInput('');
    setApiError(null);

    // Get or create session
    let currentSessionId = activeSessionId;
    let updatedSessions = [...sessions];

    if (!currentSessionId || !updatedSessions.find(s => s.id === currentSessionId)) {
      const newSess = createSession(prompt);
      currentSessionId = newSess.id;
      updatedSessions = [newSess, ...updatedSessions];
      setActiveSessionId(currentSessionId);
    }

    // Add user message immediately
    const userMsg: Message = {
      id: `msg_${Date.now()}_u`,
      role: 'user',
      content: prompt,
      timestamp: Date.now(),
    };

    updatedSessions = updatedSessions.map(s =>
      s.id === currentSessionId
        ? { ...s, messages: [...s.messages, userMsg], title: s.messages.length === 0 ? prompt.slice(0, 45) : s.title }
        : s
    );
    setSessions(updatedSessions);
    saveSessions(updatedSessions);
    setLoading(true);

    try {
      const currentSession = updatedSessions.find(s => s.id === currentSessionId);
      const history = (currentSession?.messages || [])
        .slice(-7, -1)
        .map(m => ({ role: m.role, content: m.content }));

      // Works on both localhost (Express) and Vercel (serverless function)
      const apiBase = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
        ? 'https://finpulse-zbdj.vercel.app'
        : '';
      const response = await fetch(`${apiBase}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          transactions,
          walletBalance,
          userName: user?.displayName || user?.email?.split('@')[0] || 'User',
          history,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || data.error || 'API request failed');
      }

      // Add AI reply
      const aiMsg: Message = {
        id: `msg_${Date.now()}_a`,
        role: 'assistant',
        content: data.reply,
        timestamp: Date.now(),
      };

      const finalSessions = updatedSessions.map(s =>
        s.id === currentSessionId
          ? { ...s, messages: [...s.messages, aiMsg] }
          : s
      );
      setSessions(finalSessions);
      saveSessions(finalSessions);
    } catch (err: any) {
      console.error('Chat error:', err);
      setApiError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Delete session ──────────────────────────────────────────────────────────
  const deleteSession = (id: string) => {
    const updated = sessions.filter(s => s.id !== id);
    setSessions(updated);
    saveSessions(updated);
    if (activeSessionId === id) {
      setActiveSessionId(updated[0]?.id || null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div
      className="flex rounded-2xl overflow-hidden"
      style={{
        height: 'calc(100vh - 96px)',
        border: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(10,15,30,0.85)',
      }}
    >
      {/* ── Session Sidebar ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {showSidebar && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 256, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.28 }}
            className="flex flex-col flex-shrink-0 overflow-hidden"
            style={{ borderRight: '1px solid rgba(255,255,255,0.05)', background: 'rgba(8,12,24,0.98)' }}
          >
            {/* Header */}
            <div className="p-4 flex items-center justify-between flex-shrink-0"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}>
                  <MessageSquare size={12} className="text-white" />
                </div>
                <span className="text-sm font-bold text-white">Chat History</span>
              </div>
              <button
                onClick={() => { const s = createSession(); setSessions(p => { const n=[s,...p]; saveSessions(n); return n; }); setActiveSessionId(s.id); }}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-indigo-400 hover:text-white transition-colors"
                style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)' }}
                title="New Chat"
              >
                <Plus size={14} />
              </button>
            </div>

            {/* Sessions */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {sessions.length === 0 ? (
                <div className="text-center py-10 px-4">
                  <MessageSquare size={24} className="mx-auto text-slate-700 mb-2" />
                  <p className="text-xs text-slate-600">No conversations yet</p>
                </div>
              ) : (
                sessions.map(session => (
                  <div key={session.id} className="group relative">
                    <button
                      onClick={() => setActiveSessionId(session.id)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl transition-all pr-8 ${
                        activeSessionId === session.id
                          ? 'bg-indigo-500/15 border border-indigo-500/25'
                          : 'hover:bg-white/[0.03] border border-transparent'
                      }`}
                    >
                      <p className={`text-xs font-semibold truncate ${
                        activeSessionId === session.id ? 'text-indigo-300' : 'text-slate-400'
                      }`}>
                        {session.title}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Clock size={9} className="text-slate-700" />
                        <span className="text-[10px] text-slate-700">
                          {new Date(session.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </button>
                    <button
                      onClick={() => deleteSession(session.id)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md opacity-0 group-hover:opacity-100 text-slate-600 hover:text-rose-400 transition-all"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Live context badge */}
            <div className="p-3 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="px-3 py-2.5 rounded-xl"
                style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.12)' }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <Zap size={10} className="text-emerald-400" />
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Live Context</span>
                </div>
                <p className="text-[10px] text-slate-600 leading-relaxed">
                  AI sees {transactions.length} transactions & wallet data in real-time.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main chat area ────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top bar */}
        <div className="px-5 py-4 flex items-center justify-between flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowSidebar(v => !v)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/[0.04] transition-all">
              <MessageSquare size={16} />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(168,85,247,0.15))', border: '1px solid rgba(99,102,241,0.3)' }}>
                <BrainCircuit size={16} className="text-indigo-300" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">FinPulse AI</p>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] text-emerald-400 font-medium">GPT-OSS · Live Data</span>
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={() => { const s = createSession(); setSessions(p => { const n=[s,...p]; saveSessions(n); return n; }); setActiveSessionId(s.id); setApiError(null); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-400 hover:text-white hover:bg-indigo-500/10 transition-all border border-transparent hover:border-indigo-500/20">
            <Plus size={13} />
            New Chat
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-6 space-y-4">

          {/* Empty / welcome */}
          {activeMessages.length === 0 && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center h-full text-center pb-8"
            >
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 relative"
                style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.18), rgba(168,85,247,0.12))', border: '1px solid rgba(99,102,241,0.28)' }}>
                <BrainCircuit size={28} className="text-indigo-300" />
                <motion.div className="absolute inset-0 rounded-2xl"
                  style={{ border: '1px solid rgba(99,102,241,0.35)' }}
                  animate={{ scale: [1, 1.18, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 2.5, repeat: Infinity }} />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">FinPulse AI Chatbot</h2>
              <p className="text-slate-500 text-sm max-w-sm leading-relaxed mb-8">
                Your personal financial advisor with live access to your transactions and wallet data.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-md">
                {SUGGESTIONS.map(({ icon: Icon, text, color }) => (
                  <button key={text} onClick={() => sendMessage(text)}
                    className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
                    style={{ background: 'rgba(17,24,39,0.7)', border: `1px solid ${color}22` }}>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: `${color}18` }}>
                      <Icon size={13} style={{ color }} />
                    </div>
                    <span className="text-xs font-semibold text-slate-300">{text}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Error banner */}
          <AnimatePresence>
            {apiError && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex items-start gap-3 p-4 rounded-xl"
                style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)' }}>
                <AlertCircle size={15} className="text-rose-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-bold text-rose-400 mb-0.5">Error</p>
                  <p className="text-xs text-slate-400">{apiError}</p>
                </div>
                <button onClick={() => setApiError(null)}>
                  <X size={14} className="text-slate-600 hover:text-slate-300" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Chat messages */}
          {activeMessages.map(msg => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}

          {/* Typing indicator */}
          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-1"
                style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(168,85,247,0.15))', border: '1px solid rgba(99,102,241,0.3)' }}>
                <Bot size={14} className="text-indigo-300" />
              </div>
              <div className="rounded-2xl rounded-tl-md"
                style={{ background: 'rgba(17,24,39,0.85)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <TypingDots />
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-5 pb-5 pt-3 flex-shrink-0"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>

          {/* Quick chips (after first message) */}
          {activeMessages.length > 0 && (
            <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
              {SUGGESTIONS.slice(0, 3).map(({ text }) => (
                <button key={text} onClick={() => sendMessage(text)} disabled={loading}
                  className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium text-slate-400 hover:text-slate-200 transition-all disabled:opacity-40"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  {text}
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your finances… (Enter to send)"
                rows={1}
                className="w-full px-4 py-3 rounded-xl text-sm resize-none dark-input leading-relaxed"
                style={{ maxHeight: '120px', overflowY: 'hidden' }}
                onInput={e => {
                  const el = e.currentTarget;
                  el.style.height = 'auto';
                  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
                }}
                disabled={loading}
              />
            </div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                boxShadow: input.trim() && !loading ? '0 4px 18px rgba(99,102,241,0.4)' : 'none',
              }}
            >
              {loading
                ? <RefreshCw size={16} className="text-white animate-spin" />
                : <Send size={16} className="text-white" />}
            </motion.button>
          </div>
          <p className="text-center text-[10px] text-slate-700 mt-2">
            FinPulse AI · GPT-OSS via OpenRouter · Your data stays private
          </p>
        </div>
      </div>
    </div>
  );
}
