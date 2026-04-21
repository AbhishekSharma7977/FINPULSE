import React, { useState } from 'react';
import { signInWithGoogle, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, auth, db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Zap, ShieldCheck, BarChart3, Mail, Lock, User as UserIcon, ArrowRight, AlertCircle, Sparkles, TrendingUp, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const FEATURES = [
  { icon: BarChart3, title: 'AI-Powered Analytics', desc: 'Smart insights from Gemini AI' },
  { icon: ShieldCheck, title: 'Bank-grade Security', desc: 'Firebase-backed encryption' },
  { icon: TrendingUp, title: 'Real-time Tracking', desc: 'Live financial dashboard' },
];

export default function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (isSignUp) {
        const { user } = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(user, { displayName: name });
        await setDoc(doc(db, 'users', user.uid), { uid: user.uid, email: user.email, name, balance: 0, currency: 'USD', createdAt: new Date().toISOString() });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      const msgs: Record<string, string> = {
        'auth/user-not-found': 'No account found with this email.',
        'auth/wrong-password': 'Incorrect password. Please try again.',
        'auth/email-already-in-use': 'An account with this email already exists.',
        'auth/weak-password': 'Password must be at least 6 characters.',
        'auth/invalid-email': 'Please enter a valid email address.',
      };
      setError(msgs[err.code] || err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError('Google sign-in failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen animated-bg flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between p-12 w-[520px] flex-shrink-0 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.2) 0%, rgba(168,85,247,0.1) 100%)', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
        
        {/* BG effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #6366f1, transparent)' }} />
          <div className="absolute bottom-0 right-0 w-60 h-60 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #a855f7, transparent)' }} />
        </div>

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center glow-blue"
              style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
              <Zap className="text-white w-6 h-6" />
            </div>
            <div>
              <span className="font-bold text-2xl text-white tracking-tight">FinPulse</span>
              <span className="block text-[10px] text-indigo-400 font-medium uppercase tracking-widest">AI Dashboard</span>
            </div>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <h1 className="text-5xl font-black text-white leading-tight mb-4">
              Smart Finance,<br />
              <span className="gradient-text">Simplified.</span>
            </h1>
            <p className="text-slate-400 text-lg leading-relaxed">
              Take control of your money with AI-powered insights and real-time financial tracking.
            </p>
          </motion.div>
        </div>

        {/* Features */}
        <div className="relative z-10 space-y-4">
          {FEATURES.map((f, i) => (
            <motion.div key={f.title} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.1 }}
              className="flex items-center gap-4 p-4 rounded-2xl"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(99,102,241,0.2)' }}>
                <f.icon size={18} className="text-indigo-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">{f.title}</p>
                <p className="text-xs text-slate-500">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Right panel - Auth form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
              <Zap className="text-white w-5 h-5" />
            </div>
            <span className="font-bold text-xl text-white">FinPulse</span>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-white mb-1">
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </h2>
            <p className="text-slate-500">
              {isSignUp ? 'Start your financial journey today' : 'Sign in to your dashboard'}
            </p>
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="mb-5 p-4 rounded-2xl flex items-start gap-3 text-sm badge-danger">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleEmailAuth} className="space-y-4 mb-5">
            {/* Name field for signup */}
            <AnimatePresence>
              {isSignUp && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Full Name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                    <input type="text" required value={name} onChange={e => setName(e.target.value)}
                      placeholder="John Doe" className="w-full pl-11 pr-4 py-4 rounded-xl text-sm dark-input" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="name@example.com" className="w-full pl-11 pr-4 py-4 rounded-xl text-sm dark-input" />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                <input type={showPassword ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" className="w-full pl-11 pr-12 py-4 rounded-xl text-sm dark-input" />
                <button type="button" onClick={() => setShowPassword(p => !p)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 btn-primary disabled:opacity-70">
              {loading 
                ? <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                : <><span>{isSignUp ? 'Create Account' : 'Sign In'}</span><ArrowRight size={16} /></>
              }
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
            <span className="text-xs text-slate-600 font-bold uppercase tracking-widest">or</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
          </div>

          {/* Google */}
          <button onClick={handleGoogle} disabled={googleLoading}
            className="w-full py-4 px-6 rounded-xl flex items-center justify-center gap-3 font-semibold text-sm transition-all disabled:opacity-70 hover:border-indigo-500/30 hover:bg-indigo-500/5"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0' }}>
            {googleLoading 
              ? <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              : <><img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />Continue with Google</>
            }
          </button>

          {/* Toggle */}
          <div className="mt-6 text-center">
            <button onClick={() => { setIsSignUp(p => !p); setError(null); }}
              className="text-sm font-semibold transition-colors" style={{ color: '#818cf8' }}
              onMouseEnter={e => e.currentTarget.style.color = '#a5b4fc'}
              onMouseLeave={e => e.currentTarget.style.color = '#818cf8'}>
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Create one"}
            </button>
          </div>

          <p className="text-center text-[10px] text-slate-600 mt-6">
            By continuing, you agree to our{' '}
            <a href="#" className="text-indigo-500 hover:text-indigo-400">Terms</a> &{' '}
            <a href="#" className="text-indigo-500 hover:text-indigo-400">Privacy Policy</a>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
