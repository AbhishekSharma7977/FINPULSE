import { useState, useRef, useEffect } from 'react';
import { auth, logout } from '../lib/firebase';
import { Bell, Search, LogOut, User as UserIcon, Menu, X, ChevronDown, Settings, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';

interface NavbarProps {
  toggleSidebar: () => void;
}

const notifications = [
  { id: 1, title: 'Invoice Paid', desc: 'Client Acme Corp paid invoice #1042', time: '2m ago', type: 'success' },
  { id: 2, title: 'Budget Alert', desc: 'You\'ve used 85% of your food budget', time: '1h ago', type: 'warning' },
  { id: 3, title: 'Card Added', desc: 'Visa card ending in 4242 was added', time: '3h ago', type: 'info' },
];

export default function Navbar({ toggleSidebar }: NavbarProps) {
  const user = auth.currentUser;
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [unreadCount, setUnreadCount] = useState(notifications.length);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifications(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-[72px] flex items-center justify-between px-6 flex-shrink-0"
      style={{ 
        background: 'rgba(10, 15, 30, 0.8)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}>
      
      {/* Left */}
      <div className="flex items-center gap-4">
        <button 
          onClick={toggleSidebar}
          className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] transition-all md:hidden"
        >
          <Menu size={20} />
        </button>

        {/* Search */}
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors"
            style={{ color: searchFocused ? '#6366f1' : '#475569' }} />
          <input
            type="text"
            placeholder="Search transactions, invoices..."
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="w-72 pl-10 pr-4 py-2.5 rounded-xl text-sm font-medium transition-all dark-input"
            style={{ 
              outline: 'none',
              boxShadow: searchFocused ? '0 0 0 2px rgba(99,102,241,0.25)' : 'none'
            }}
          />
          {searchFocused && (
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-500 bg-white/5 px-1.5 py-0.5 rounded border border-white/10">⌘K</kbd>
          )}
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <button 
            onClick={() => { setShowNotifications(!showNotifications); if (unreadCount > 0) setUnreadCount(0); }}
            className="relative p-2.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] transition-all"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-500 pulse-dot" />
            )}
          </button>

          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-80 rounded-2xl shadow-2xl overflow-hidden z-50"
                style={{ 
                  background: '#0d1528',
                  border: '1px solid rgba(255,255,255,0.08)',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
                }}
              >
                <div className="p-4 flex items-center justify-between border-b border-white/[0.06]">
                  <h3 className="font-bold text-slate-200 text-sm">Notifications</h3>
                  <button className="text-xs text-indigo-400 hover:text-indigo-300 font-medium">Mark all read</button>
                </div>
                <div className="divide-y divide-white/[0.04]">
                  {notifications.map((n) => (
                    <div key={n.id} className="p-4 hover:bg-white/[0.03] transition-colors cursor-pointer flex gap-3">
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                        n.type === 'success' ? 'bg-emerald-400' : n.type === 'warning' ? 'bg-amber-400' : 'bg-indigo-400'
                      }`} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-200">{n.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{n.desc}</p>
                        <p className="text-[10px] text-slate-600 mt-1 font-medium">{n.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-3 border-t border-white/[0.04]">
                  <button className="w-full text-xs text-slate-500 hover:text-slate-300 font-medium py-1 transition-colors">
                    View all notifications
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-white/[0.08]" />

        {/* Profile */}
        <div ref={profileRef} className="relative">
          <button 
            onClick={() => setShowProfile(!showProfile)}
            className="flex items-center gap-2.5 p-1.5 pr-2.5 rounded-xl hover:bg-white/[0.06] transition-all"
          >
            {user?.photoURL ? (
              <img src={user.photoURL} alt="" className="w-8 h-8 rounded-lg object-cover ring-2 ring-indigo-500/30" />
            ) : (
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}>
                {(user?.displayName || user?.email || 'U')[0].toUpperCase()}
              </div>
            )}
            <div className="hidden sm:block text-left">
              <p className="text-sm font-semibold text-slate-200 leading-none">{user?.displayName?.split(' ')[0] || 'User'}</p>
              <p className="text-[10px] text-slate-500 leading-none mt-0.5 truncate max-w-[100px]">{user?.email}</p>
            </div>
            <ChevronDown size={14} className="text-slate-500 hidden sm:block" />
          </button>

          <AnimatePresence>
            {showProfile && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-56 rounded-2xl shadow-2xl overflow-hidden z-[9999]"
                style={{ 
                  background: '#0d1528',
                  border: '1px solid rgba(255,255,255,0.08)',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
                }}
              >
                <div className="p-4 border-b border-white/[0.06]">
                  <p className="text-sm font-bold text-slate-200">{user?.displayName || 'User'}</p>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">{user?.email}</p>
                </div>
                <div className="p-2">
                  {[
                    { icon: Settings, label: 'Settings', action: () => { navigate('/settings'); setShowProfile(false); } },
                    { icon: HelpCircle, label: 'Help & Support', action: () => {} },
                  ].map((item) => (
                    <button key={item.label} onClick={item.action}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:text-slate-200 hover:bg-white/[0.05] transition-all">
                      <item.icon size={16} />
                      {item.label}
                    </button>
                  ))}
                  <div className="h-px bg-white/[0.06] my-1" />
                  <button onClick={logout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all">
                    <LogOut size={16} />
                    Sign Out
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
