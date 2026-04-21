import React, { useState, useEffect } from 'react';
import { auth, db, handleFirestoreError, OperationType, Timestamp, serverTimestamp, formatDate } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, addDoc, deleteDoc, doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { 
  Wallet as WalletIcon, Plus, Minus, ArrowUpRight, ArrowDownRight, 
  CreditCard, Landmark, Coins, Send, RefreshCw, X, CheckCircle, 
  TrendingUp, TrendingDown, Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { format, subDays } from 'date-fns';

type ModalType = 'add' | 'transfer' | 'paybills' | null;

const QUICK_AMOUNTS = [50, 100, 200, 500, 1000];

export default function Wallet() {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalType>(null);
  const [amount, setAmount] = useState('');
  const [billTo, setBillTo] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // Fetch balance
    const fetchBalance = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setBalance(userDoc.data().balance || 0);
        } else {
          await setDoc(doc(db, 'users', user.uid), { uid: user.uid, email: user.email, name: user.displayName, balance: 0, currency: 'USD' });
          setBalance(0);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, 'users');
      } finally {
        setLoading(false);
      }
    };
    fetchBalance();

    // Listen to recent transactions
    const q = query(
      collection(db, 'transactions'),
      where('uid', '==', user.uid),
      orderBy('date', 'desc')
    );
    const unsub = onSnapshot(q, snap => {
      setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() })).slice(0, 20));
    });
    return () => unsub();
  }, []);

  // Build area chart data (last 7 days activity)
  const areaData = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dayLabel = format(date, 'EEE');
    const dayStart = new Date(date.setHours(0, 0, 0, 0));
    const dayEnd = new Date(date.setHours(23, 59, 59, 999));
    let amount = 0;
    transactions.forEach((tx: any) => {
      const txDate = tx.date?.toDate ? tx.date.toDate() : new Date(tx.date);
      if (txDate >= dayStart && txDate <= dayEnd) {
        amount += tx.type === 'income' ? tx.amount : -tx.amount;
      }
    });
    return { day: dayLabel, amount: Math.round(amount) };
  });

  const monthlyIncome = transactions.filter((t: any) => t.type === 'income').reduce((s: number, t: any) => s + t.amount, 0);
  const monthlyExpense = transactions.filter((t: any) => t.type === 'expense').reduce((s: number, t: any) => s + t.amount, 0);

  const handleAddMoney = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user || !amount) return;
    setSubmitting(true);
    const num = parseFloat(amount);
    try {
      const newBalance = balance + num;
      await updateDoc(doc(db, 'users', user.uid), { balance: newBalance });
      await addDoc(collection(db, 'transactions'), {
        uid: user.uid, amount: num, type: 'income', category: 'Wallet',
        date: serverTimestamp(), description: note || 'Added to wallet'
      });
      setBalance(newBalance);
      setAmount(''); setNote('');
      setModal(null);
      showToast('success', `$${num.toLocaleString()} added to your wallet!`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'users');
      showToast('error', 'Failed to add money. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user || !amount || !transferTo) return;
    const num = parseFloat(amount);
    if (num > balance) { showToast('error', 'Insufficient balance!'); return; }
    setSubmitting(true);
    try {
      const newBalance = balance - num;
      await updateDoc(doc(db, 'users', user.uid), { balance: newBalance });
      await addDoc(collection(db, 'transactions'), {
        uid: user.uid, amount: num, type: 'expense', category: 'Transfer',
        date: serverTimestamp(), description: `Transfer to ${transferTo}`
      });
      setBalance(newBalance);
      setAmount(''); setTransferTo(''); setNote('');
      setModal(null);
      showToast('success', `$${num.toLocaleString()} transferred successfully!`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'users');
      showToast('error', 'Transfer failed. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayBill = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user || !amount || !billTo) return;
    const num = parseFloat(amount);
    if (num > balance) { showToast('error', 'Insufficient balance!'); return; }
    setSubmitting(true);
    try {
      const newBalance = balance - num;
      await updateDoc(doc(db, 'users', user.uid), { balance: newBalance });
      await addDoc(collection(db, 'transactions'), {
        uid: user.uid, amount: num, type: 'expense', category: 'Bills',
        date: serverTimestamp(), description: `Paid bill: ${billTo}`
      });
      setBalance(newBalance);
      setAmount(''); setBillTo(''); setNote('');
      setModal(null);
      showToast('success', `Bill of $${num.toLocaleString()} paid to ${billTo}!`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'users');
      showToast('error', 'Payment failed. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const modalConfig = {
    add: { title: 'Add Money', onSubmit: handleAddMoney, color: '#10b981', icon: Plus },
    transfer: { title: 'Transfer Money', onSubmit: handleTransfer, color: '#6366f1', icon: Send },
    paybills: { title: 'Pay Bill', onSubmit: handlePayBill, color: '#f59e0b', icon: CreditCard },
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent" />
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-8">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-sm font-semibold ${
              toast.type === 'success' ? 'text-emerald-300' : 'text-rose-300'
            }`}
            style={{ background: '#0d1528', border: `1px solid ${toast.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(244,63,94,0.3)'}` }}
          >
            <CheckCircle size={16} />
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">My Wallet</h1>
          <p className="text-slate-500 text-sm mt-1">Manage your money with ease</p>
        </div>
        <div className="flex items-center gap-2 text-slate-500 text-sm">
          <Landmark size={14} />
          <span>Chase Bank · Connected</span>
          <div className="w-2 h-2 rounded-full bg-emerald-400 pulse-dot" />
        </div>
      </div>

      {/* Main wallet card + area chart */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Big balance card */}
        <div className="lg:col-span-3">
          <div className="p-8 rounded-3xl relative overflow-hidden h-full min-h-[220px] flex flex-col justify-between holo-card shadow-2xl">
            <div className="absolute inset-0 opacity-20 pointer-events-none"
              style={{ background: 'radial-gradient(ellipse at 80% 0%, rgba(99,102,241,0.6) 0%, transparent 60%)' }} />
            <div className="absolute bottom-0 right-0 opacity-10 pointer-events-none">
              <WalletIcon size={160} />
            </div>
            
            <div className="relative z-10 flex justify-between items-start">
              <div>
                <p className="text-white/50 text-xs font-bold uppercase tracking-widest mb-2">Current Balance</p>
                <h2 className="text-5xl font-black text-white tracking-tight">
                  ${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </h2>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-sm">
                <Coins className="text-indigo-300" size={24} />
              </div>
            </div>

            <div className="relative z-10 flex items-center gap-4 mt-6">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border" style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399' }}>
                <ArrowUpRight size={12} /> +${monthlyIncome.toLocaleString()}
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold" style={{ background: 'rgba(244,63,94,0.15)', border: '1px solid rgba(244,63,94,0.3)', color: '#fb7185' }}>
                <ArrowDownRight size={12} /> -${monthlyExpense.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Activity chart */}
        <div className="lg:col-span-2 p-5 rounded-3xl" style={{ background: 'rgba(17,24,39,0.6)', border: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(24px)' }}>
          <div className="flex items-center gap-2 mb-4">
            <Activity size={14} className="text-indigo-400" />
            <h3 className="text-sm font-bold text-slate-300">7-Day Activity</h3>
          </div>
          <div className="h-[150px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={areaData}>
                <defs>
                  <linearGradient id="walletGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 10 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 10 }} tickFormatter={v => `$${v}`} />
                <Tooltip contentStyle={{ background: '#0d1528', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '12px', color: '#f1f5f9' }} />
                <Area type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={2} fill="url(#walletGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Add Money', icon: Plus, type: 'add' as ModalType, color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)' },
          { label: 'Transfer', icon: Send, type: 'transfer' as ModalType, color: '#6366f1', bg: 'rgba(99,102,241,0.1)', border: 'rgba(99,102,241,0.2)' },
          { label: 'Pay Bills', icon: CreditCard, type: 'paybills' as ModalType, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)' },
        ].map((action) => (
          <motion.button key={action.label} whileHover={{ y: -3 }} whileTap={{ scale: 0.97 }}
            onClick={() => { setModal(action.type); setAmount(''); setNote(''); setTransferTo(''); setBillTo(''); }}
            className="flex flex-col items-center gap-3 p-6 rounded-2xl transition-all"
            style={{ background: action.bg, border: `1px solid ${action.border}` }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${action.color}25` }}>
              <action.icon size={22} style={{ color: action.color }} />
            </div>
            <span className="text-sm font-bold" style={{ color: action.color }}>{action.label}</span>
          </motion.button>
        ))}
      </div>

      {/* Recent wallet transactions */}
      <div className="p-6 rounded-2xl" style={{ background: 'rgba(17,24,39,0.6)', border: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(24px)' }}>
        <h3 className="text-lg font-bold text-white mb-4">Transaction History</h3>
        {transactions.length > 0 ? (
          <div className="space-y-1 max-h-72 overflow-y-auto">
            {transactions.map((tx, i) => (
              <div key={tx.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/[0.03] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ background: tx.type === 'income' ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)' }}>
                    {tx.type === 'income' ? <ArrowUpRight size={15} style={{ color: '#10b981' }} /> : <ArrowDownRight size={15} style={{ color: '#f43f5e' }} />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-200">{tx.description || tx.category}</p>
                    <p className="text-xs text-slate-500">{formatDate(tx.date)}</p>
                  </div>
                </div>
                <span className={`text-sm font-bold ${tx.type === 'income' ? 'text-emerald-400' : 'text-slate-300'}`}>
                  {tx.type === 'income' ? '+' : '-'}${(tx.amount || 0).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-600 text-sm text-center py-8">No transactions yet</p>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {modal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setModal(null)} className="absolute inset-0 modal-overlay" />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="relative w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
              style={{ background: '#0d1528', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <div className="p-6 border-b border-white/[0.06] flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">{modalConfig[modal].title}</h2>
                <button onClick={() => setModal(null)} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.08] transition-all">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={modalConfig[modal].onSubmit} className="p-6 space-y-5">
                {/* Recipient field for transfer/bills */}
                {modal === 'transfer' && (
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Recipient Name / Account</label>
                    <input type="text" required value={transferTo} onChange={e => setTransferTo(e.target.value)}
                      placeholder="Enter recipient name" className="w-full px-4 py-3 rounded-xl text-sm dark-input" />
                  </div>
                )}
                {modal === 'paybills' && (
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Bill Name / Payee</label>
                    <input type="text" required value={billTo} onChange={e => setBillTo(e.target.value)}
                      placeholder="e.g. Electricity, Netflix..." className="w-full px-4 py-3 rounded-xl text-sm dark-input" />
                  </div>
                )}

                {/* Amount */}
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Amount</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">$</span>
                    <input type="number" required min="1" step="0.01" value={amount} onChange={e => setAmount(e.target.value)}
                      placeholder="0.00" className="w-full pl-10 pr-4 py-4 rounded-xl text-2xl font-bold dark-input" />
                  </div>
                  {/* Quick amounts */}
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {QUICK_AMOUNTS.map(q => (
                      <button key={q} type="button" onClick={() => setAmount(q.toString())}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${amount === q.toString() ? 'bg-indigo-600 text-white' : 'bg-white/[0.04] text-slate-500 hover:text-slate-300 border border-white/[0.06]'}`}>
                        ${q}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Note */}
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Note (optional)</label>
                  <input type="text" value={note} onChange={e => setNote(e.target.value)}
                    placeholder="Add a note..." className="w-full px-4 py-3 rounded-xl text-sm dark-input" />
                </div>

                {modal !== 'add' && (
                  <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                    <span>Available balance</span>
                    <span className="font-bold text-slate-300">${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}

                <button type="submit" disabled={submitting || !amount}
                  className="w-full py-4 rounded-xl font-bold text-sm btn-primary disabled:opacity-50 flex items-center justify-center gap-2">
                  {submitting ? <RefreshCw size={16} className="animate-spin" /> : (() => { const ModalIcon = modalConfig[modal].icon; return <ModalIcon size={16} />; })()}
                  {submitting ? 'Processing...' : modalConfig[modal].title}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
