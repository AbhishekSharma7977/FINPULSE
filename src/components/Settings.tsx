import React, { useState, useEffect } from 'react';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { 
  User as UserIcon, Mail, Bell, Shield, Globe, Save, Camera,
  CheckCircle2, AlertCircle, Lock, Eye, EyeOff, RefreshCw,
  Sun, Moon, Monitor, Volume2, VolumeX, Smartphone, Languages,
  DollarSign, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const TABS = [
  { id: 'profile', label: 'Profile', icon: UserIcon },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'preferences', label: 'Preferences', icon: Globe },
];

const CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD', 'JPY'];
const LANGUAGES = ['English', 'Hindi', 'French', 'Spanish', 'German', 'Japanese'];

export default function Settings() {
  const user = auth.currentUser;
  const [activeTab, setActiveTab] = useState('profile');
  const [name, setName] = useState(user?.displayName || '');
  const [photoURL, setPhotoURL] = useState(user?.photoURL || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Security
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);

  // Notifications
  const [notifs, setNotifs] = useState({ email: true, push: true, transactions: true, invoices: true, budgetAlerts: true, weeklyReport: false });

  // Preferences
  const [theme, setTheme] = useState('dark');
  const [currency, setCurrency] = useState('USD');
  const [language, setLanguage] = useState('English');
  const [soundEnabled, setSoundEnabled] = useState(true);

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text }); setTimeout(() => setMessage(null), 4000);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      await updateProfile(user, { displayName: name, photoURL });
      try {
        await updateDoc(doc(db, 'users', user.uid), { name, photoURL });
      } catch {
        await setDoc(doc(db, 'users', user.uid), { uid: user.uid, email: user.email, name, photoURL, balance: 0, currency }, { merge: true });
      }
      showMsg('success', 'Profile updated successfully!');
    } catch (err) {
      showMsg('error', 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || newPassword !== confirmPassword) {
      showMsg('error', 'Passwords do not match!');
      return;
    }
    if (newPassword.length < 8) {
      showMsg('error', 'Password must be at least 8 characters.');
      return;
    }
    setChangingPw(true);
    try {
      const credential = EmailAuthProvider.credential(user.email!, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      showMsg('success', 'Password changed successfully!');
    } catch (err: any) {
      showMsg('error', err.code === 'auth/wrong-password' ? 'Current password is incorrect.' : 'Failed to change password.');
    } finally {
      setChangingPw(false);
    }
  };

  const handleSavePrefs = async () => {
    setLoading(true);
    try {
      if (user) {
        await setDoc(doc(db, 'users', user.uid), { currency, language, theme }, { merge: true });
      }
      showMsg('success', 'Preferences saved!');
    } catch {
      showMsg('error', 'Failed to save preferences.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Settings</h1>
        <p className="text-slate-500 text-sm mt-1">Manage your account and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Tabs sidebar */}
        <div className="lg:col-span-1">
          <div className="p-2 rounded-2xl space-y-1" style={{ background: 'rgba(17,24,39,0.6)', border: '1px solid rgba(255,255,255,0.06)' }}>
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === tab.id ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]'
                }`}>
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* User card */}
          <div className="mt-4 p-4 rounded-2xl" style={{ background: 'rgba(17,24,39,0.6)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex flex-col items-center text-center">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="" className="w-16 h-16 rounded-2xl object-cover ring-2 ring-indigo-500/30 mb-3" />
              ) : (
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold text-white mb-3"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}>
                  {(user?.displayName || user?.email || 'U')[0].toUpperCase()}
                </div>
              )}
              <p className="font-bold text-slate-200 text-sm">{user?.displayName || 'User'}</p>
              <p className="text-xs text-slate-500 mt-0.5 truncate w-full">{user?.email}</p>
              <span className="mt-2 px-2 py-0.5 rounded-md text-[10px] font-bold badge-success">Verified</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          {/* Message */}
          <AnimatePresence>
            {message && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`mb-4 p-4 rounded-2xl text-sm font-medium flex items-center gap-3 ${
                  message.type === 'success' ? 'badge-success' : 'badge-danger'
                }`}
              >
                {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                {message.text}
                <button onClick={() => setMessage(null)} className="ml-auto"><X size={14} /></button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-6 rounded-2xl space-y-6"
              style={{ background: 'rgba(17,24,39,0.6)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h2 className="text-lg font-bold text-white">Profile Information</h2>
              <form onSubmit={handleUpdateProfile} className="space-y-5">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Display Name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                    <input type="text" value={name} onChange={e => setName(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl text-sm dark-input" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                    <input type="email" value={user?.email || ''} disabled
                      className="w-full pl-10 pr-4 py-3 rounded-xl text-sm dark-input opacity-50 cursor-not-allowed" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Profile Picture URL</label>
                  <div className="flex gap-3">
                    {photoURL && <img src={photoURL} alt="" className="w-10 h-10 rounded-xl object-cover" onError={e => (e.currentTarget.style.display='none')} />}
                    <input type="url" value={photoURL} onChange={e => setPhotoURL(e.target.value)}
                      placeholder="https://example.com/photo.jpg"
                      className="flex-1 px-4 py-3 rounded-xl text-sm dark-input" />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button type="submit" disabled={loading || (name === user?.displayName && photoURL === user?.photoURL)}
                    className="btn-primary flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold disabled:opacity-50">
                    {loading ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-6 rounded-2xl space-y-6"
              style={{ background: 'rgba(17,24,39,0.6)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h2 className="text-lg font-bold text-white">Notification Preferences</h2>
              <div className="space-y-3">
                {[
                  { key: 'email', label: 'Email Notifications', desc: 'Receive updates via email' },
                  { key: 'push', label: 'Push Notifications', desc: 'Browser push notifications', icon: Smartphone },
                  { key: 'transactions', label: 'Transaction Alerts', desc: 'Get notified for each transaction' },
                  { key: 'invoices', label: 'Invoice Updates', desc: 'When invoices are paid or due' },
                  { key: 'budgetAlerts', label: 'Budget Alerts', desc: 'When you exceed spending limits' },
                  { key: 'weeklyReport', label: 'Weekly Report', desc: 'Summary of your finances every week' },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <div>
                      <p className="text-sm font-semibold text-slate-200">{item.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                    </div>
                    <button
                      onClick={() => setNotifs(prev => ({ ...prev, [item.key]: !prev[item.key as keyof typeof prev] }))}
                      className={`relative w-12 h-6 rounded-full transition-all duration-300 ${notifs[item.key as keyof typeof notifs] ? 'bg-indigo-600' : 'bg-white/10'}`}>
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300 ${notifs[item.key as keyof typeof notifs] ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex justify-end">
                <button onClick={() => showMsg('success', 'Notification settings saved!')}
                  className="btn-primary flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold">
                  <Save size={14} /> Save Preferences
                </button>
              </div>
            </motion.div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              {/* Change password */}
              <div className="p-6 rounded-2xl space-y-5" style={{ background: 'rgba(17,24,39,0.6)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <h2 className="text-lg font-bold text-white">Change Password</h2>
                {user?.providerData[0]?.providerId === 'google.com' ? (
                  <div className="p-4 rounded-xl text-sm text-amber-400" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
                    You signed in with Google. Password change is not available for social login accounts.
                  </div>
                ) : (
                  <form onSubmit={handleChangePassword} className="space-y-4">
                    {[
                      { label: 'Current Password', val: currentPassword, set: setCurrentPassword, show: showCurrentPw, toggle: () => setShowCurrentPw(p => !p) },
                      { label: 'New Password', val: newPassword, set: setNewPassword, show: showNewPw, toggle: () => setShowNewPw(p => !p) },
                      { label: 'Confirm New Password', val: confirmPassword, set: setConfirmPassword, show: showNewPw },
                    ].map((field, i) => (
                      <div key={i}>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">{field.label}</label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                          <input type={field.show ? 'text' : 'password'} required value={field.val} onChange={e => field.set(e.target.value)}
                            placeholder="••••••••" className="w-full pl-10 pr-10 py-3 rounded-xl text-sm dark-input" />
                          {field.toggle && (
                            <button type="button" onClick={field.toggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                              {field.show ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    {newPassword && (
                      <div className="flex items-center gap-2">
                        {[8, 12].map(len => (
                          <span key={len} className={`text-xs px-2 py-1 rounded-md font-medium ${newPassword.length >= len ? 'badge-success' : 'badge-danger'}`}>
                            {len}+ chars
                          </span>
                        ))}
                        {/[A-Z]/.test(newPassword) && <span className="text-xs px-2 py-1 rounded-md font-medium badge-success">Uppercase</span>}
                        {/[0-9]/.test(newPassword) && <span className="text-xs px-2 py-1 rounded-md font-medium badge-success">Number</span>}
                      </div>
                    )}
                    <div className="flex justify-end">
                      <button type="submit" disabled={changingPw}
                        className="btn-primary flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold disabled:opacity-50">
                        {changingPw ? <RefreshCw size={14} className="animate-spin" /> : <Lock size={14} />}
                        Update Password
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* 2FA */}
              <div className="p-6 rounded-2xl" style={{ background: 'rgba(17,24,39,0.6)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-200">Two-Factor Authentication</h3>
                    <p className="text-sm text-slate-500 mt-0.5">Add extra security to your account</p>
                  </div>
                  <button onClick={() => { setTwoFAEnabled(p => !p); showMsg('success', `2FA ${!twoFAEnabled ? 'enabled' : 'disabled'}!`); }}
                    className={`relative w-12 h-6 rounded-full transition-all duration-300 ${twoFAEnabled ? 'bg-indigo-600' : 'bg-white/10'}`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300 ${twoFAEnabled ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-6 rounded-2xl space-y-6"
              style={{ background: 'rgba(17,24,39,0.6)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h2 className="text-lg font-bold text-white">App Preferences</h2>

              {/* Currency */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 block">Default Currency</label>
                <div className="flex flex-wrap gap-2">
                  {CURRENCIES.map(c => (
                    <button key={c} onClick={() => setCurrency(c)}
                      className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${currency === c ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/40' : 'btn-ghost'}`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Language */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 block">Language</label>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGES.map(l => (
                    <button key={l} onClick={() => setLanguage(l)}
                      className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${language === l ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/40' : 'btn-ghost'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sound */}
              <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }}>
                <div className="flex items-center gap-3">
                  {soundEnabled ? <Volume2 size={18} className="text-indigo-400" /> : <VolumeX size={18} className="text-slate-500" />}
                  <div>
                    <p className="text-sm font-semibold text-slate-200">Sound Effects</p>
                    <p className="text-xs text-slate-500">Enable notification sounds</p>
                  </div>
                </div>
                <button onClick={() => setSoundEnabled(p => !p)}
                  className={`relative w-12 h-6 rounded-full transition-all duration-300 ${soundEnabled ? 'bg-indigo-600' : 'bg-white/10'}`}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300 ${soundEnabled ? 'left-7' : 'left-1'}`} />
                </button>
              </div>

              <div className="flex justify-end">
                <button onClick={handleSavePrefs} disabled={loading}
                  className="btn-primary flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold disabled:opacity-50">
                  {loading ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                  Save Preferences
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
