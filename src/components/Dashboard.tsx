import { useState, useEffect, useMemo } from 'react';
import { auth, db, handleFirestoreError, OperationType, formatDate, Timestamp, serverTimestamp } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, limit, addDoc } from 'firebase/firestore';
import { 
  TrendingUp, TrendingDown, DollarSign, ArrowUpRight, ArrowDownRight,
  Plus, X, RefreshCw, Wallet, BarChart3
} from 'lucide-react';
import { 
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import AIAssistant from './AIAssistant';
import React from 'react';

const CATEGORY_COLORS: Record<string, string> = {
  'Food': '#f59e0b', 'Shopping': '#ec4899', 'Rent': '#a855f7',
  'Entertainment': '#6366f1', 'Salary': '#10b981', 'Investment': '#06b6d4',
  'Health': '#f43f5e', 'Travel': '#f97316', 'Other': '#64748b', 'wallet': '#6366f1'
};

const CATEGORIES = ['Food', 'Shopping', 'Rent', 'Entertainment', 'Salary', 'Investment', 'Health', 'Travel', 'Other'];

function StatCard({ icon: Icon, label, value, change, changeType, color, delay }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      whileHover={{ y: -4, scale: 1.01 }}
      className="p-6 rounded-2xl relative overflow-hidden group cursor-default"
      style={{ 
        background: 'rgba(17, 24, 39, 0.6)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        backdropFilter: 'blur(24px)'
      }}
    >
      {/* Glow on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl"
        style={{ background: `radial-gradient(ellipse at 0% 0%, ${color}15 0%, transparent 60%)` }} />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${color}20`, border: `1px solid ${color}30` }}>
            <Icon size={20} style={{ color }} />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>
        </div>
        <h3 className="text-3xl font-bold text-white mb-3">
          ${typeof value === 'number' ? value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
        </h3>
        <div className={`flex items-center gap-1.5 text-sm font-semibold ${changeType === 'up' ? 'text-emerald-400' : 'text-rose-400'}`}>
          {changeType === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          <span>{change}</span>
        </div>
      </div>
    </motion.div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="px-4 py-3 rounded-xl" style={{ background: '#0d1528', border: '1px solid rgba(99,102,241,0.3)', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
        <p className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">{label}</p>
        {payload.map((p: any) => (
          <div key={p.name} className="flex items-center gap-2 text-sm font-semibold">
            <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-slate-300 capitalize">{p.name}:</span>
            <span style={{ color: p.color }}>${p.value?.toLocaleString()}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Form state
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('expense');
  const [category, setCategory] = useState('Food');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // Recent 10 for display
    const q = query(
      collection(db, 'transactions'),
      where('uid', '==', user.uid),
      orderBy('date', 'desc'),
      limit(10)
    );

    // All for charts
    const qAll = query(
      collection(db, 'transactions'),
      where('uid', '==', user.uid),
      orderBy('date', 'desc')
    );

    const unsub1 = onSnapshot(q, (snap) => {
      setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'transactions'));

    const unsub2 = onSnapshot(qAll, (snap) => {
      setAllTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsub1(); unsub2(); };
  }, []);

  // Compute stats from all transactions
  const { totalIncome, totalExpense, balance } = useMemo(() => {
    let inc = 0, exp = 0;
    allTransactions.forEach((tx: any) => {
      if (tx.type === 'income') inc += (tx.amount || 0);
      else exp += (tx.amount || 0);
    });
    return { totalIncome: inc, totalExpense: exp, balance: inc - exp };
  }, [allTransactions]);

  // Last 6 months chart data
  const chartData = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(new Date(), 5 - i);
      return { month: format(d, 'MMM'), start: startOfMonth(d), end: endOfMonth(d), income: 0, expense: 0 };
    });
    allTransactions.forEach((tx: any) => {
      const txDate = tx.date?.toDate ? tx.date.toDate() : new Date(tx.date);
      months.forEach(m => {
        if (txDate >= m.start && txDate <= m.end) {
          if (tx.type === 'income') m.income += (tx.amount || 0);
          else m.expense += (tx.amount || 0);
        }
      });
    });
    return months.map(m => ({ name: m.month, income: Math.round(m.income), expense: Math.round(m.expense) }));
  }, [allTransactions]);

  // Category breakdown
  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    allTransactions.filter((tx: any) => tx.type === 'expense').forEach((tx: any) => {
      const cat = tx.category || 'Other';
      map[cat] = (map[cat] || 0) + (tx.amount || 0);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value).slice(0, 5);
  }, [allTransactions]);

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user || !amount) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'transactions'), {
        uid: user.uid,
        amount: parseFloat(amount),
        type,
        category,
        description,
        date: serverTimestamp()
      });
      setShowAddModal(false);
      setAmount(''); setDescription(''); setCategory('Food'); setType('expense');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'transactions');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-3xl font-bold text-white tracking-tight"
          >
            Welcome back, <span className="gradient-text">{auth.currentUser?.displayName?.split(' ')[0] || 'User'} 👋</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-slate-500 mt-1 text-sm"
          >
            {format(new Date(), 'EEEE, MMMM do yyyy')} · Here's your financial overview
          </motion.p>
        </div>
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          onClick={() => setShowAddModal(true)}
          className="btn-primary flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold"
        >
          <Plus size={16} />
          Add Transaction
        </motion.button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard icon={Wallet} label="Net Balance" value={balance} change="+2.5% from last month" changeType="up" color="#6366f1" delay={0} />
        <StatCard icon={TrendingUp} label="Total Income" value={totalIncome} change="+12% from last month" changeType="up" color="#10b981" delay={0.1} />
        <StatCard icon={TrendingDown} label="Total Expenses" value={totalExpense} change="+8% from last month" changeType="down" color="#f43f5e" delay={0.2} />
      </div>

      {/* Charts + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left column: Charts */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Income vs Expenses Bar Chart */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-6 rounded-2xl"
            style={{ background: 'rgba(17, 24, 39, 0.6)', border: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(24px)' }}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-white">Income vs Expenses</h3>
                <p className="text-xs text-slate-500 mt-0.5">Last 6 months overview</p>
              </div>
              <div className="flex items-center gap-4">
                {[{color:'#6366f1',label:'Income'},{color:'#f43f5e',label:'Expense'}].map(l => (
                  <div key={l.label} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: l.color }} />
                    <span className="text-xs text-slate-500 font-medium">{l.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 11 }} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 11 }} tickFormatter={v => `$${v}`} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Bar dataKey="income" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={24} opacity={0.9} />
                  <Bar dataKey="expense" fill="#f43f5e" radius={[6, 6, 0, 0]} barSize={24} opacity={0.7} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Recent Transactions */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="p-6 rounded-2xl"
            style={{ background: 'rgba(17, 24, 39, 0.6)', border: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(24px)' }}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-white">Recent Transactions</h3>
                <p className="text-xs text-slate-500 mt-0.5">Last {transactions.length} transactions</p>
              </div>
              <button className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors px-3 py-1.5 rounded-lg hover:bg-indigo-500/10">
                View All →
              </button>
            </div>
            
            {loading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-14 rounded-xl shimmer" />)}
              </div>
            ) : transactions.length > 0 ? (
              <div className="space-y-1">
                {transactions.map((tx, i) => (
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-white/[0.03] transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ 
                          background: tx.type === 'income' ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)',
                          border: `1px solid ${tx.type === 'income' ? 'rgba(16,185,129,0.25)' : 'rgba(244,63,94,0.25)'}`
                        }}>
                        {tx.type === 'income' 
                          ? <ArrowUpRight size={16} style={{ color: '#10b981' }} />
                          : <ArrowDownRight size={16} style={{ color: '#f43f5e' }} />
                        }
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-200">{tx.description || tx.category}</p>
                        <p className="text-xs text-slate-500">{formatDate(tx.date)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${tx.type === 'income' ? 'text-emerald-400' : 'text-slate-300'}`}>
                        {tx.type === 'income' ? '+' : '-'}${(tx.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                      <span className="text-[10px] px-2 py-0.5 rounded-md font-medium" 
                        style={{ 
                          background: `${CATEGORY_COLORS[tx.category] || '#64748b'}20`,
                          color: CATEGORY_COLORS[tx.category] || '#94a3b8'
                        }}>
                        {tx.category}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <BarChart3 size={40} className="mx-auto text-slate-700 mb-3" />
                <p className="text-slate-500 text-sm">No transactions yet. Add your first one!</p>
              </div>
            )}
          </motion.div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Spending Pie */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="p-6 rounded-2xl"
            style={{ background: 'rgba(17, 24, 39, 0.6)', border: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(24px)' }}
          >
            <h3 className="text-lg font-bold text-white mb-1">Spending by Category</h3>
            <p className="text-xs text-slate-500 mb-4">Based on your expenses</p>
            
            {categoryData.length > 0 ? (
              <>
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} 
                        paddingAngle={4} dataKey="value" strokeWidth={0}>
                        {categoryData.map((entry, index) => (
                          <Cell key={index} fill={CATEGORY_COLORS[entry.name] || '#64748b'} />
                        ))}
                      </Pie>
                      <Tooltip content={({ active, payload }) => {
                        if (active && payload?.length) {
                          return (
                            <div className="px-3 py-2 rounded-lg" style={{ background: '#0d1528', border: '1px solid rgba(99,102,241,0.3)' }}>
                              <p className="text-sm font-bold" style={{ color: payload[0].payload.fill }}>{payload[0].name}</p>
                              <p className="text-xs text-slate-300">${payload[0].value?.toLocaleString()}</p>
                            </div>
                          );
                        }
                        return null;
                      }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2 mt-2">
                  {categoryData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: CATEGORY_COLORS[item.name] || '#64748b' }} />
                        <span className="text-xs text-slate-400 font-medium">{item.name}</span>
                      </div>
                      <span className="text-xs font-bold text-slate-300">${item.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-[200px] flex items-center justify-center">
                <p className="text-slate-600 text-sm text-center">Add expense transactions<br/>to see breakdown</p>
              </div>
            )}
          </motion.div>

          {/* AI Assistant */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
          >
            <AIAssistant transactions={allTransactions} />
          </motion.div>
        </div>
      </div>

      {/* Add Transaction Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 modal-overlay"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="relative w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
              style={{ background: '#0d1528', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <div className="p-6 border-b border-white/[0.06] flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Add Transaction</h2>
                <button onClick={() => setShowAddModal(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.08] transition-all">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleAddTransaction} className="p-6 space-y-5">
                {/* Type selector */}
                <div className="grid grid-cols-2 gap-3">
                  {['income', 'expense'].map(t => (
                    <button key={t} type="button" onClick={() => setType(t)}
                      className={`py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                        type === t 
                          ? t === 'income' 
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' 
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                          : 'bg-white/[0.04] text-slate-500 border border-white/[0.06] hover:border-white/[0.1]'
                      }`}>
                      {t === 'income' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>

                {/* Amount */}
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Amount</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">$</span>
                    <input type="number" required value={amount} onChange={e => setAmount(e.target.value)}
                      placeholder="0.00" min="0" step="0.01"
                      className="w-full pl-10 pr-4 py-4 rounded-xl text-xl font-bold dark-input" />
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Category</label>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map(cat => (
                      <button key={cat} type="button" onClick={() => setCategory(cat)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          category === cat 
                            ? 'text-white' 
                            : 'bg-white/[0.04] text-slate-500 hover:text-slate-300 border border-white/[0.06]'
                        }`}
                        style={category === cat ? { background: CATEGORY_COLORS[cat] || '#6366f1' } : {}}>
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Description (optional)</label>
                  <input type="text" value={description} onChange={e => setDescription(e.target.value)}
                    placeholder="What was this for?"
                    className="w-full px-4 py-3 rounded-xl text-sm dark-input" />
                </div>

                <button type="submit" disabled={submitting || !amount}
                  className="w-full py-4 rounded-xl font-bold text-sm btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {submitting 
                    ? <><RefreshCw size={16} className="animate-spin" /> Saving...</>
                    : <><Plus size={16} /> Save Transaction</>
                  }
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
