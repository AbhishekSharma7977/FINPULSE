import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Wallet, ArrowLeftRight, FileText, 
  CreditCard, Settings, ChevronLeft, ChevronRight, Zap,
  TrendingUp, Crown, BrainCircuit
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, logout } from '../lib/firebase';

interface SidebarProps {
  isOpen: boolean;
  toggle: () => void;
}

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard', color: '#6366f1' },
  { path: '/wallet', icon: Wallet, label: 'My Wallet', color: '#10b981' },
  { path: '/transactions', icon: ArrowLeftRight, label: 'Transactions', color: '#f59e0b' },
  { path: '/invoices', icon: FileText, label: 'Invoices', color: '#a855f7' },
  { path: '/cards', icon: CreditCard, label: 'Cards', color: '#ec4899' },
  { path: '/chatbot', icon: BrainCircuit, label: 'AI Chatbot', color: '#06b6d4' },
  { path: '/settings', icon: Settings, label: 'Settings', color: '#94a3b8' },
];

export default function Sidebar({ isOpen, toggle }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const user = auth.currentUser;

  return (
    <motion.aside
      initial={false}
      animate={{ width: isOpen ? 260 : 72 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="relative z-30 flex flex-col h-full overflow-hidden"
      style={{ 
        background: 'rgba(10, 15, 30, 0.95)',
        borderRight: '1px solid rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(24px)'
      }}
    >
      {/* Subtle gradient accent */}
      <div className="absolute top-0 left-0 right-0 h-48 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at 50% 0%, rgba(99, 102, 241, 0.15) 0%, transparent 70%)'
      }} />

      {/* Logo */}
      <div className="relative p-5 flex items-center gap-3 overflow-hidden">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 glow-blue"
          style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
          <Zap className="text-white w-5 h-5" />
        </div>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <span className="font-bold text-lg text-white whitespace-nowrap tracking-tight">FinPulse</span>
              <span className="block text-[10px] text-indigo-400 font-medium uppercase tracking-widest -mt-0.5">AI Dashboard</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 mt-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 relative group ${
                isActive ? 'nav-active' : 'hover:bg-white/[0.04] text-slate-400 hover:text-slate-200'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeNav"
                  className="absolute inset-0 rounded-xl"
                  style={{ 
                    background: `linear-gradient(135deg, ${item.color}20 0%, ${item.color}10 100%)`,
                    border: `1px solid ${item.color}40`
                  }}
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <item.icon 
                className="w-5 h-5 flex-shrink-0 relative z-10 transition-colors" 
                style={{ color: isActive ? item.color : undefined }}
              />
              <AnimatePresence>
                {isOpen && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="font-semibold text-sm whitespace-nowrap relative z-10"
                    style={{ color: isActive ? item.color : undefined }}
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>

              {/* Tooltip when collapsed */}
              {!isOpen && (
                <div className="absolute left-full ml-3 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-white/10 z-50 shadow-xl">
                  {item.label}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Toggle button */}
      <button
        onClick={toggle}
        className="absolute -right-3 top-[88px] w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-indigo-400 shadow-lg z-50 transition-all hover:scale-110"
        style={{ background: '#0d1528', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        {isOpen ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
      </button>

      {/* User + Upgrade */}
      <div className="p-3 mt-auto space-y-3">
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-4 rounded-2xl relative overflow-hidden"
            style={{ 
              background: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(168,85,247,0.1) 100%)',
              border: '1px solid rgba(99,102,241,0.2)'
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Crown size={14} className="text-amber-400" />
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Pro Plan</span>
            </div>
            <p className="text-xs text-slate-400 mb-3 leading-relaxed">Unlock AI insights & unlimited transactions.</p>
            <button className="w-full py-2 rounded-lg text-xs font-bold text-white transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}>
              Upgrade Now
            </button>
          </motion.div>
        )}

        {/* User avatar */}
        <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/[0.03] transition-colors cursor-pointer group">
          {user?.photoURL ? (
            <img src={user.photoURL} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0 ring-2 ring-indigo-500/30" />
          ) : (
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}>
              {(user?.displayName || user?.email || 'U')[0].toUpperCase()}
            </div>
          )}
          {isOpen && (
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-200 truncate">{user?.displayName || 'User'}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
          )}
        </div>
      </div>
    </motion.aside>
  );
}
