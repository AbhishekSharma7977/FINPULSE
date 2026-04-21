import React, { useState, useEffect } from 'react';
import { auth, db, handleFirestoreError, OperationType, Timestamp } from '../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { 
  Plus, CreditCard, Trash2, ShieldCheck, Lock, Eye, EyeOff, Zap,
  X, RefreshCw, CheckCircle, Wifi, Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const CARD_GRADIENTS: Record<string, { from: string; to: string; accent: string }> = {
  'Visa': { from: '#1a237e', to: '#283593', accent: '#5c6bc0' },
  'Mastercard': { from: '#b71c1c', to: '#c62828', accent: '#ef9a9a' },
  'Amex': { from: '#006064', to: '#00838f', accent: '#4dd0e1' },
};

function CardVisual({ card, showNumber, onToggle, onDelete }: any) {
  const grad = CARD_GRADIENTS[card.type] || CARD_GRADIENTS['Visa'];
  const maskedNum = showNumber 
    ? (card.cardNumber || '').replace(/(\d{4})/g, '$1 ').trim()
    : `•••• •••• •••• ${(card.cardNumber || '').slice(-4)}`;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ y: -8, rotateX: 3 }}
      className="relative h-52 rounded-3xl overflow-hidden cursor-default group"
      style={{ perspective: '1000px' }}
    >
      <div className="absolute inset-0 rounded-3xl"
        style={{ background: `linear-gradient(135deg, ${grad.from} 0%, ${grad.to} 100%)` }} />
      
      {/* Holographic shimmer overlay */}
      <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-30 transition-opacity duration-500"
        style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 40%, rgba(255,255,255,0.1) 100%)' }} />

      {/* Background pattern */}
      <div className="absolute right-0 bottom-0 w-48 h-48 rounded-full opacity-10"
        style={{ background: grad.accent, transform: 'translate(30%, 30%)' }} />
      <div className="absolute left-0 top-0 w-32 h-32 rounded-full opacity-5"
        style={{ background: grad.accent, transform: 'translate(-30%, -30%)' }} />

      <div className="relative z-10 p-6 h-full flex flex-col justify-between">
        {/* Top row */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <Zap size={18} className="text-white" />
            </div>
            <div>
              <span className="text-white font-bold text-sm">FinPulse</span>
              <p className="text-white/40 text-[10px] font-medium">{card.type}</p>
            </div>
          </div>
          <div className="flex gap-1">
            <button onClick={onToggle}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all backdrop-blur-sm">
              {showNumber ? <EyeOff size={14} className="text-white" /> : <Eye size={14} className="text-white" />}
            </button>
            <button onClick={onDelete}
              className="p-2 bg-white/10 hover:bg-red-500/40 rounded-xl transition-all backdrop-blur-sm">
              <Trash2 size={14} className="text-white" />
            </button>
          </div>
        </div>

        {/* Chip + Wifi */}
        <div className="flex items-center gap-2">
          <div className="w-10 h-7 rounded-md" style={{ background: 'linear-gradient(135deg, #ffd700, #b8860b)' }} />
          <Wifi size={14} className="text-white/40" />
        </div>

        {/* Card number */}
        <div>
          <p className="text-white font-mono text-lg tracking-[0.15em] font-bold mb-3">{maskedNum}</p>
          <div className="flex justify-between items-end">
            <div>
              <p className="text-white/40 text-[9px] uppercase tracking-widest mb-0.5">Card Holder</p>
              <p className="text-white font-bold text-sm uppercase tracking-wide">{card.cardHolder || 'CARD HOLDER'}</p>
            </div>
            <div className="text-right">
              <p className="text-white/40 text-[9px] uppercase tracking-widest mb-0.5">Expires</p>
              <p className="text-white font-bold text-sm">{card.expiry || 'MM/YY'}</p>
            </div>
            {/* Card brand logo */}
            {card.type === 'Mastercard' && (
              <div className="flex -space-x-2">
                <div className="w-8 h-8 rounded-full bg-red-500 opacity-90" />
                <div className="w-8 h-8 rounded-full bg-amber-500 opacity-80" />
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function Cards() {
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showNumbers, setShowNumbers] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<string | null>(null);

  // Form
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [expiry, setExpiry] = useState('');
  const [type, setType] = useState('Visa');
  const [submitting, setSubmitting] = useState(false);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    const q = query(collection(db, 'cards'), where('uid', '==', user.uid));
    const unsub = onSnapshot(q, snap => {
      setCards(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, err => handleFirestoreError(err, OperationType.LIST, 'cards'));
    return () => unsub();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user || cardNumber.length < 16 || !cardHolder) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'cards'), { uid: user.uid, cardNumber, cardHolder: cardHolder.toUpperCase(), expiry, type, createdAt: Timestamp.now() });
      setShowAddModal(false);
      setCardNumber(''); setCardHolder(''); setExpiry(''); setType('Visa');
      showToast('Card added securely!');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'cards');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this card?')) return;
    try {
      await deleteDoc(doc(db, 'cards', id));
      showToast('Card removed.');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'cards');
    }
  };

  const formatCardInput = (val: string) => {
    return val.replace(/\D/g, '').slice(0, 16);
  };

  const formatExpiryInput = (val: string) => {
    let v = val.replace(/\D/g, '');
    if (v.length > 2) v = v.slice(0, 2) + '/' + v.slice(2, 4);
    return v;
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold text-emerald-300 shadow-2xl"
            style={{ background: '#0d1528', border: '1px solid rgba(16,185,129,0.3)' }}>
            <CheckCircle size={14} /> {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">My Cards</h1>
          <p className="text-slate-500 text-sm mt-1">Manage your payment methods securely</p>
        </div>
        <button onClick={() => setShowAddModal(true)}
          className="btn-primary flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold">
          <Plus size={16} /> Add New Card
        </button>
      </div>

      {/* Cards grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2].map(i => <div key={i} className="h-52 rounded-3xl shimmer" />)}
        </div>
      ) : cards.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {cards.map(card => (
              <CardVisual
                key={card.id}
                card={card}
                showNumber={!!showNumbers[card.id]}
                onToggle={() => setShowNumbers(prev => ({ ...prev, [card.id]: !prev[card.id] }))}
                onDelete={() => handleDelete(card.id)}
              />
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="text-center py-16 rounded-2xl" style={{ border: '1px dashed rgba(255,255,255,0.08)' }}>
          <CreditCard size={48} className="mx-auto text-slate-700 mb-3" />
          <p className="text-slate-600 font-medium">No cards saved yet. Add one to get started!</p>
        </div>
      )}

      {/* Security banner */}
      <div className="flex flex-col md:flex-row items-center gap-5 p-6 rounded-2xl"
        style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}>
        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.2)' }}>
          <ShieldCheck size={24} className="text-indigo-400" />
        </div>
        <div className="flex-1 text-center md:text-left">
          <h3 className="font-bold text-slate-200 mb-1">Secure Card Storage</h3>
          <p className="text-sm text-slate-500">Card details are encrypted with bank-grade security. We never store your CVV or PIN.</p>
        </div>
        <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm px-4 py-2 rounded-xl"
          style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
          <Lock size={14} /> PCI-DSS Compliant
        </div>
      </div>

      {/* Add Card Modal */}
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
              {/* Card type preview */}
              <div className="h-36 relative overflow-hidden"
                style={{ background: `linear-gradient(135deg, ${CARD_GRADIENTS[type]?.from || '#1a237e'} 0%, ${CARD_GRADIENTS[type]?.to || '#283593'} 100%)` }}>
                <div className="absolute right-0 bottom-0 w-40 h-40 rounded-full opacity-10"
                  style={{ background: CARD_GRADIENTS[type]?.accent || '#5c6bc0', transform: 'translate(30%, 30%)' }} />
                <div className="p-6 h-full flex flex-col justify-between relative z-10">
                  <div className="flex justify-between">
                    <span className="text-white font-bold">FinPulse · {type}</span>
                    <button onClick={() => setShowAddModal(false)} className="p-1 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-all">
                      <X size={16} />
                    </button>
                  </div>
                  <p className="text-white/70 font-mono text-base tracking-widest">
                    {cardNumber ? cardNumber.replace(/(\d{4})/g, '$1 ').trim() || '•••• •••• •••• ••••' : '•••• •••• •••• ••••'}
                  </p>
                </div>
              </div>

              <form onSubmit={handleAdd} className="p-6 space-y-5">
                {/* Card type */}
                <div className="flex gap-2">
                  {['Visa', 'Mastercard', 'Amex'].map(t => (
                    <button key={t} type="button" onClick={() => setType(t)}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                        type === t ? 'text-white border border-indigo-500/50' : 'btn-ghost'
                      }`}
                      style={type === t ? { background: 'rgba(99,102,241,0.2)' } : {}}>
                      {t}
                    </button>
                  ))}
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Card Number</label>
                  <input type="text" required maxLength={19} value={cardNumber} 
                    onChange={e => setCardNumber(formatCardInput(e.target.value))}
                    placeholder="0000 0000 0000 0000"
                    className="w-full px-4 py-3 rounded-xl text-base font-mono tracking-widest dark-input" />
                  <div className="flex justify-end mt-1">
                    <span className="text-[10px] text-slate-600">{cardNumber.length}/16 digits</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Card Holder Name</label>
                  <input type="text" required value={cardHolder} onChange={e => setCardHolder(e.target.value.toUpperCase())}
                    placeholder="FULL NAME"
                    className="w-full px-4 py-3 rounded-xl text-sm font-bold uppercase tracking-wide dark-input" />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Expiry Date</label>
                  <input type="text" required maxLength={5} value={expiry}
                    onChange={e => setExpiry(formatExpiryInput(e.target.value))}
                    placeholder="MM/YY"
                    className="w-full px-4 py-3 rounded-xl text-sm font-bold dark-input" />
                </div>

                <button type="submit" disabled={submitting || cardNumber.length < 16 || !cardHolder || expiry.length < 5}
                  className="w-full py-4 rounded-xl font-bold text-sm btn-primary disabled:opacity-50 flex items-center justify-center gap-2">
                  {submitting ? <><RefreshCw size={16} className="animate-spin" /> Saving...</> : <><ShieldCheck size={16} /> Save Card Securely</>}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
