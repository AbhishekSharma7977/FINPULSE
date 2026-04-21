import React, { useState, useEffect } from 'react';
import { auth, db, handleFirestoreError, OperationType, Timestamp, serverTimestamp, formatDate } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { 
  Plus, Search, FileText, Clock, Trash2, X, RefreshCw,
  Download, Mail, CheckCircle2, AlertCircle, DollarSign, User as UserIcon,
  TrendingUp, Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Invoices() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Form
  const [amount, setAmount] = useState('');
  const [clientName, setClientName] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg }); setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    const q = query(collection(db, 'invoices'), where('uid', '==', user.uid), orderBy('dueDate', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setInvoices(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, err => handleFirestoreError(err, OperationType.LIST, 'invoices'));
    return () => unsub();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user || !amount || !clientName || !dueDate) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'invoices'), {
        uid: user.uid, amount: parseFloat(amount), clientName,
        dueDate: Timestamp.fromDate(new Date(dueDate)),
        description, status: 'unpaid', createdAt: serverTimestamp()
      });
      setShowAddModal(false);
      setAmount(''); setClientName(''); setDueDate(''); setDescription('');
      showToast('success', 'Invoice created successfully!');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'invoices');
      showToast('error', 'Failed to create invoice.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (id: string, current: string) => {
    try {
      await updateDoc(doc(db, 'invoices', id), { status: current === 'paid' ? 'unpaid' : 'paid' });
      showToast('success', current === 'paid' ? 'Marked as unpaid.' : 'Marked as paid! 🎉');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'invoices');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'invoices', id));
      showToast('success', 'Invoice deleted.');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'invoices');
    }
  };

  const handleDownload = (inv: any) => {
    const content = `
INVOICE
=======
Client: ${inv.clientName}
Amount: $${inv.amount.toLocaleString()}
Due Date: ${formatDate(inv.dueDate)}
Description: ${inv.description || 'N/A'}
Status: ${inv.status.toUpperCase()}
    `.trim();
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `invoice-${inv.clientName.replace(/\s+/g, '-')}.txt`;
    a.click(); URL.revokeObjectURL(url);
    showToast('success', 'Invoice downloaded!');
  };

  const handleSendEmail = (inv: any) => {
    const subject = encodeURIComponent(`Invoice from FinPulse - $${inv.amount}`);
    const body = encodeURIComponent(`Dear ${inv.clientName},\n\nPlease find your invoice details:\nAmount: $${inv.amount}\nDue Date: ${formatDate(inv.dueDate)}\nDescription: ${inv.description || 'N/A'}\n\nThank you!`);
    window.open(`mailto:?subject=${subject}&body=${body}`);
    showToast('success', 'Email client opened!');
  };

  const filtered = invoices.filter(inv => {
    const matchSearch = !searchTerm || inv.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) || inv.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0);
  const totalUnpaid = invoices.filter(i => i.status === 'unpaid').reduce((s, i) => s + i.amount, 0);

  return (
    <div className="space-y-6 pb-8">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold shadow-2xl ${toast.type === 'success' ? 'text-emerald-300' : 'text-rose-300'}`}
            style={{ background: '#0d1528', border: `1px solid ${toast.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(244,63,94,0.3)'}` }}>
            {toast.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Invoices</h1>
          <p className="text-slate-500 text-sm mt-1">Manage your billing and client payments</p>
        </div>
        <button onClick={() => setShowAddModal(true)}
          className="btn-primary flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold">
          <Plus size={16} /> Create Invoice
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Invoices', value: invoices.length, suffix: '', color: '#6366f1', icon: FileText },
          { label: 'Paid', value: totalPaid, suffix: '$', color: '#10b981', icon: CheckCircle2 },
          { label: 'Outstanding', value: totalUnpaid, suffix: '$', color: '#f59e0b', icon: Clock },
        ].map(stat => (
          <div key={stat.label} className="p-4 rounded-2xl" style={{ background: 'rgba(17,24,39,0.6)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2 mb-2">
              <stat.icon size={14} style={{ color: stat.color }} />
              <span className="text-xs text-slate-500 font-medium">{stat.label}</span>
            </div>
            <p className="text-xl font-bold" style={{ color: stat.color }}>
              {stat.suffix}{typeof stat.value === 'number' && stat.suffix === '$' ? stat.value.toLocaleString('en-US', { minimumFractionDigits: 2 }) : stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="p-5 rounded-2xl flex flex-col sm:flex-row gap-3" style={{ background: 'rgba(17,24,39,0.6)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
          <input type="text" placeholder="Search by client or description..." value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-3 rounded-xl text-sm dark-input" />
        </div>
        <div className="flex items-center gap-2">
          {[{val:'all',label:'All'},{val:'paid',label:'Paid'},{val:'unpaid',label:'Unpaid'}].map(f => (
            <button key={f.val} onClick={() => setStatusFilter(f.val)}
              className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                statusFilter === f.val
                  ? f.val === 'paid' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : f.val === 'unpaid' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  : 'btn-primary text-white border-none'
                  : 'btn-ghost'
              }`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Invoice Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1,2,3].map(i => <div key={i} className="h-52 rounded-2xl shimmer" />)}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <AnimatePresence>
            {filtered.map((inv, i) => (
              <motion.div
                key={inv.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ y: -4 }}
                className="p-5 rounded-2xl relative overflow-hidden group"
                style={{ 
                  background: 'rgba(17,24,39,0.6)', 
                  border: `1px solid ${inv.status === 'paid' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.1)'}`,
                  backdropFilter: 'blur(24px)'
                }}
              >
                {/* Status glow */}
                <div className="absolute top-0 right-0 w-32 h-32 -mr-10 -mt-10 rounded-full pointer-events-none opacity-5"
                  style={{ background: inv.status === 'paid' ? '#10b981' : '#f59e0b' }} />

                <div className="flex items-start justify-between mb-4 relative z-10">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center"
                    style={{ background: inv.status === 'paid' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)' }}>
                    <FileText size={20} style={{ color: inv.status === 'paid' ? '#10b981' : '#f59e0b' }} />
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => toggleStatus(inv.id, inv.status)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        inv.status === 'paid' 
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-emerald-500/20 hover:text-emerald-400 hover:border-emerald-500/30'
                      }`}>
                      {inv.status === 'paid' ? '✓ Paid' : '● Unpaid'}
                    </button>
                    <button onClick={() => handleDelete(inv.id)}
                      className="p-1.5 rounded-lg text-slate-700 hover:text-rose-400 hover:bg-rose-500/10 transition-all opacity-0 group-hover:opacity-100">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div className="relative z-10 mb-4">
                  <h3 className="text-base font-bold text-slate-200 truncate">{inv.clientName}</h3>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{inv.description || 'No description'}</p>
                </div>

                <div className="flex items-end justify-between relative z-10 mb-4 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                  <div>
                    <p className="text-[10px] text-slate-600 font-medium mb-1 uppercase tracking-wider">Due Date</p>
                    <div className="flex items-center gap-1.5">
                      <Clock size={11} className="text-slate-500" />
                      <span className="text-xs font-semibold text-slate-400">{formatDate(inv.dueDate)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-600 font-medium mb-1 uppercase tracking-wider">Amount</p>
                    <p className="text-xl font-black text-white">${(inv.amount || 0).toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex gap-2 relative z-10">
                  <button onClick={() => handleDownload(inv)}
                    className="flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all btn-ghost hover:text-indigo-400 hover:border-indigo-500/30">
                    <Download size={12} /> Download
                  </button>
                  <button onClick={() => handleSendEmail(inv)}
                    className="flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all btn-ghost hover:text-indigo-400 hover:border-indigo-500/30">
                    <Mail size={12} /> Send Email
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="text-center py-20">
          <FileText size={48} className="mx-auto text-slate-800 mb-4" />
          <p className="text-slate-600 font-medium">No invoices found. Create your first one!</p>
        </div>
      )}

      {/* Add Invoice Modal */}
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
                <h2 className="text-xl font-bold text-white">Create Invoice</h2>
                <button onClick={() => setShowAddModal(false)} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.08] transition-all">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleAdd} className="p-6 space-y-5">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Client Name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                    <input type="text" required value={clientName} onChange={e => setClientName(e.target.value)}
                      placeholder="Client name" className="w-full pl-10 pr-4 py-3 rounded-xl text-sm dark-input" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Amount</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">$</span>
                      <input type="number" required min="1" step="0.01" value={amount} onChange={e => setAmount(e.target.value)}
                        placeholder="0.00" className="w-full pl-8 pr-4 py-3 rounded-xl text-sm dark-input" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Due Date</label>
                    <input type="date" required value={dueDate} onChange={e => setDueDate(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl text-sm dark-input" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Description</label>
                  <textarea value={description} onChange={e => setDescription(e.target.value)}
                    placeholder="What is this invoice for?" rows={3}
                    className="w-full px-4 py-3 rounded-xl text-sm dark-input resize-none" />
                </div>
                <button type="submit" disabled={submitting || !amount || !clientName || !dueDate}
                  className="w-full py-4 rounded-xl font-bold text-sm btn-primary disabled:opacity-50 flex items-center justify-center gap-2">
                  {submitting ? <><RefreshCw size={16} className="animate-spin" /> Creating...</> : <><Plus size={16} /> Create Invoice</>}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
