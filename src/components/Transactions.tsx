import React, { useState, useEffect } from 'react';
import { auth, db, handleFirestoreError, OperationType, Timestamp, serverTimestamp, formatDate } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { 
  ArrowUpRight, ArrowDownRight, Plus, Search, Trash2, X, RefreshCw,
  Filter, Tag, FileText, TrendingUp, TrendingDown, DollarSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const CATEGORIES = ['Food', 'Shopping', 'Rent', 'Entertainment', 'Salary', 'Investment', 'Health', 'Travel', 'Other'];

const CATEGORY_COLORS: Record<string, string> = {
  'Food': '#f59e0b', 'Shopping': '#ec4899', 'Rent': '#a855f7',
  'Entertainment': '#6366f1', 'Salary': '#10b981', 'Investment': '#06b6d4',
  'Health': '#f43f5e', 'Travel': '#f97316', 'Other': '#64748b'
};

export default function Transactions() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form state
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('expense');
  const [category, setCategory] = useState('Food');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    const q = query(collection(db, 'transactions'), where('uid', '==', user.uid), orderBy('date', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, err => handleFirestoreError(err, OperationType.LIST, 'transactions'));
    return () => unsub();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user || !amount) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'transactions'), {
        uid: user.uid, amount: parseFloat(amount), type, category,
        description, date: serverTimestamp()
      });
      setShowAddModal(false);
      setAmount(''); setDescription(''); setCategory('Food'); setType('expense');
      showToast('Transaction added!');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'transactions');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleteId(id);
    try {
      await deleteDoc(doc(db, 'transactions', id));
      showToast('Transaction deleted.');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'transactions');
    } finally {
      setDeleteId(null);
    }
  };

  const filtered = transactions.filter(tx => {
    const matchType = filter === 'all' || tx.type === filter;
    const matchCat = categoryFilter === 'all' || tx.category === categoryFilter;
    const matchSearch = !searchTerm || 
      tx.description?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      tx.category?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchType && matchCat && matchSearch;
  });

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);

  return (
    <div className="space-y-6 pb-8">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl text-sm font-semibold text-emerald-300 shadow-2xl"
            style={{ background: '#0d1528', border: '1px solid rgba(16,185,129,0.3)' }}>
            ✓ {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Transactions</h1>
          <p className="text-slate-500 text-sm mt-1">{transactions.length} total transactions</p>
        </div>
        <button onClick={() => setShowAddModal(true)}
          className="btn-primary flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold">
          <Plus size={16} /> Add Transaction
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Income', value: totalIncome, icon: TrendingUp, color: '#10b981' },
          { label: 'Total Expenses', value: totalExpense, icon: TrendingDown, color: '#f43f5e' },
          { label: 'Net Balance', value: totalIncome - totalExpense, icon: DollarSign, color: '#6366f1' },
        ].map(stat => (
          <div key={stat.label} className="p-4 rounded-2xl" style={{ background: 'rgba(17,24,39,0.6)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2 mb-2">
              <stat.icon size={14} style={{ color: stat.color }} />
              <span className="text-xs text-slate-500 font-medium">{stat.label}</span>
            </div>
            <p className="text-xl font-bold" style={{ color: stat.color }}>
              ${stat.value.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="p-5 rounded-2xl space-y-4" style={{ background: 'rgba(17,24,39,0.6)', border: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(24px)' }}>
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
            <input type="text" placeholder="Search transactions..." value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl text-sm dark-input" />
          </div>
          
          {/* Type filter */}
          <div className="flex items-center gap-2">
            {[{val:'all',label:'All'},{val:'income',label:'Income'},{val:'expense',label:'Expense'}].map(f => (
              <button key={f.val} onClick={() => setFilter(f.val)}
                className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  filter === f.val 
                    ? f.val === 'income' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : f.val === 'expense' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                    : 'btn-primary text-white border-none'
                    : 'btn-ghost'
                }`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Category filter chips */}
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${categoryFilter === 'all' ? 'bg-indigo-600 text-white' : 'bg-white/[0.04] text-slate-500 border border-white/[0.06] hover:text-slate-300'}`}>
            All Categories
          </button>
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setCategoryFilter(cat === categoryFilter ? 'all' : cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                categoryFilter === cat ? 'text-white' : 'bg-white/[0.04] text-slate-500 border border-white/[0.06] hover:text-slate-300'
              }`}
              style={categoryFilter === cat ? { background: CATEGORY_COLORS[cat] || '#6366f1' } : {}}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions Table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(17,24,39,0.6)', border: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(24px)' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                {['Transaction', 'Category', 'Date', 'Amount', ''].map((h, i) => (
                  <th key={i} className={`py-4 px-5 text-left text-[10px] font-bold text-slate-600 uppercase tracking-widest ${i === 3 ? 'text-right' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="py-12 text-center">
                  <div className="flex justify-center"><div className="animate-spin h-7 w-7 rounded-full border-2 border-indigo-500 border-t-transparent" /></div>
                </td></tr>
              ) : filtered.length > 0 ? (
                <AnimatePresence>
                  {filtered.map((tx, i) => (
                    <motion.tr
                      key={tx.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className="group table-row-hover border-b border-white/[0.02]"
                    >
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: tx.type === 'income' ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)' }}>
                            {tx.type === 'income' 
                              ? <ArrowUpRight size={15} style={{ color: '#10b981' }} /> 
                              : <ArrowDownRight size={15} style={{ color: '#f43f5e' }} />}
                          </div>
                          <span className="text-sm font-semibold text-slate-200">{tx.description || 'No description'}</span>
                        </div>
                      </td>
                      <td className="py-4 px-5">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-semibold"
                          style={{ background: `${CATEGORY_COLORS[tx.category] || '#64748b'}20`, color: CATEGORY_COLORS[tx.category] || '#94a3b8' }}>
                          {tx.category}
                        </span>
                      </td>
                      <td className="py-4 px-5">
                        <span className="text-xs text-slate-500 font-medium">{formatDate(tx.date)}</span>
                      </td>
                      <td className="py-4 px-5 text-right">
                        <span className={`text-sm font-bold ${tx.type === 'income' ? 'text-emerald-400' : 'text-slate-300'}`}>
                          {tx.type === 'income' ? '+' : '-'}${(tx.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="py-4 px-5">
                        <button onClick={() => handleDelete(tx.id)}
                          disabled={deleteId === tx.id}
                          className="p-2 rounded-lg text-slate-700 hover:text-rose-400 hover:bg-rose-500/10 transition-all opacity-0 group-hover:opacity-100">
                          {deleteId === tx.id ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              ) : (
                <tr><td colSpan={5} className="py-16 text-center">
                  <FileText size={40} className="mx-auto text-slate-800 mb-3" />
                  <p className="text-slate-600 text-sm">No transactions found</p>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)} className="absolute inset-0 modal-overlay" />
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
                <button onClick={() => setShowAddModal(false)} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.08] transition-all">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleAdd} className="p-6 space-y-5">
                <div className="grid grid-cols-2 gap-3">
                  {['income', 'expense'].map(t => (
                    <button key={t} type="button" onClick={() => setType(t)}
                      className={`py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                        type === t 
                          ? t === 'income' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                          : 'bg-white/[0.04] text-slate-500 border border-white/[0.06]'
                      }`}>
                      {t === 'income' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Amount</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">$</span>
                    <input type="number" required min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)}
                      placeholder="0.00" className="w-full pl-10 pr-4 py-4 rounded-xl text-xl font-bold dark-input" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Category</label>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map(cat => (
                      <button key={cat} type="button" onClick={() => setCategory(cat)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          category === cat ? 'text-white' : 'bg-white/[0.04] text-slate-500 border border-white/[0.06]'
                        }`}
                        style={category === cat ? { background: CATEGORY_COLORS[cat] || '#6366f1' } : {}}>
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Description</label>
                  <input type="text" value={description} onChange={e => setDescription(e.target.value)}
                    placeholder="What was this for?" className="w-full px-4 py-3 rounded-xl text-sm dark-input" />
                </div>
                <button type="submit" disabled={submitting || !amount}
                  className="w-full py-4 rounded-xl font-bold text-sm btn-primary disabled:opacity-50 flex items-center justify-center gap-2">
                  {submitting ? <><RefreshCw size={16} className="animate-spin" /> Saving...</> : <><Plus size={16} /> Save Transaction</>}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
