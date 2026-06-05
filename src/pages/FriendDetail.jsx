import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, ArrowUpRight, ArrowDownLeft, Loader2 } from 'lucide-react';
import { getTransactions, getFriendBalance, saveTransaction } from '../services/storage';
import { createTransaction } from '../data/schema';
import { PAYMENT_MODES, getPaymentModeById } from '../data/categories';
import { Toast, useToast } from '../components/Toast';

export default function FriendDetail() {
  const { name } = useParams();
  const friendName = decodeURIComponent(name);
  const navigate = useNavigate();
  const { toast, show, dismiss } = useToast();
  const [transactions, setTransactions] = useState([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [settling, setSettling] = useState(false);
  const [showSettle, setShowSettle] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [all, bal] = await Promise.all([
        getTransactions(),
        getFriendBalance(friendName),
      ]);
      const mine = all
        .filter((t) => t.friendName === friendName)
        .sort((a, b) => new Date(b.date) - new Date(a.date));
      setTransactions(mine);
      setBalance(bal);
    } catch (err) {
      console.error('[FriendDetail] load error:', err);
    } finally {
      setLoading(false);
    }
  }, [friendName]);

  useEffect(() => { load(); }, [load]);

  const handleSettle = async () => {
    setSettling(true);
    try {
      const type = balance > 0 ? 'friend_gave' : 'friend_received';
      const tx = createTransaction({
        type,
        amount: Math.abs(balance),
        category: 'friend_gave',
        subcategory: 'cash',
        description: `Settled on ${new Date().toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })}`,
        friendName,
        source: 'manual',
      });
      await saveTransaction(tx);
      await load();
      setShowSettle(false);
      show('Settled!', 'success');
    } catch (err) {
      console.error('[FriendDetail] settle error:', err);
      show(err.message || 'Failed to settle — please try again', 'error');
    } finally {
      setSettling(false);
    }
  };

  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  const TypeBadge = ({ type }) => {
    const isGave = type === 'friend_gave';
    const isSettlement = type === 'settlement';
    if (isSettlement)
      return (
        <span className="text-xs bg-[#F1F5F9] text-[#94A3B8] px-2 py-0.5 rounded-pill font-medium">
          Settled
        </span>
      );
    return (
      <span
        className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-pill font-medium ${
          isGave ? 'bg-red-50 text-[#EF4444]' : 'bg-yellow-50 text-[#D4AF37]'
        }`}
      >
        {isGave ? <ArrowUpRight size={10} /> : <ArrowDownLeft size={10} />}
        {isGave ? 'Gave' : 'Received'}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#F5F4EF] pb-28 page-enter">
      {/* Header */}
      <div
        className="px-5 pt-14 pb-8 relative overflow-hidden"
        style={{ background: 'linear-gradient(150deg, #4A5E28 0%, #556B2F 50%, #3D4A20 100%)' }}
      >
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-[0.06]"
          style={{ background: '#D4AF37', transform: 'translate(30%, -30%)' }} />
        <button
          onClick={() => navigate('/friends')}
          className="flex items-center gap-1.5 text-[#7A9B52] text-[13px] font-medium mb-4 relative z-10"
        >
          <ArrowLeft size={15} />
          Back
        </button>
        <div className="flex items-center gap-3.5 relative z-10">
          <div className="w-13 h-13 rounded-2xl bg-[#3D4A20] flex items-center justify-center text-white font-bold text-[18px]"
            style={{ width: 52, height: 52 }}>
            {friendName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
          </div>
          <div>
            <h1 className="text-white text-[22px] font-bold tracking-tight">{friendName}</h1>
            <p
              className={`text-[13px] font-semibold mt-0.5 ${
                balance === 0 ? 'text-[#7A9B52]' : balance > 0 ? 'text-[#A8C87A]' : 'text-yellow-300'
              }`}
            >
              {balance === 0
                ? 'All settled'
                : balance > 0
                ? `Owes you ₹${balance.toLocaleString('en-IN')}`
                : `You owe ₹${Math.abs(balance).toLocaleString('en-IN')}`}
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 mt-4">
        {/* Settle button */}
        {balance !== 0 && !loading && (
          <button
            onClick={() => setShowSettle(true)}
            className="w-full flex items-center justify-center gap-2 bg-white border-2 border-[#556B2F] text-[#556B2F] py-3.5 rounded-card font-bold text-[13px] mb-4 hover:bg-[#EDF2E4] transition-colors active:scale-[0.98]"
            style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}
          >
            <CheckCircle size={16} strokeWidth={2.5} />
            Mark as settled (₹{Math.abs(balance).toLocaleString('en-IN')})
          </button>
        )}

        {/* Transaction list */}
        <div className="bg-white rounded-card overflow-hidden" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 size={22} className="animate-spin text-[#C8D6B0]" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-12 text-center px-4">
              <div className="w-12 h-12 rounded-2xl bg-[#EDF2E4] flex items-center justify-center mx-auto mb-3">
                <ArrowUpRight size={20} className="text-[#8BAD5C]" />
              </div>
              <p className="text-[13px] font-semibold text-[#1F2937]">No transactions yet</p>
              <p className="text-[12px] text-[#94A3B8] mt-1">with {friendName}</p>
            </div>
          ) : (
            <div className="divide-y divide-[#F2F4F7]">
              {transactions.map((tx) => {
                const mode = getPaymentModeById(tx.subcategory);
                const isGave = tx.type === 'friend_gave';
                const isSettlement = tx.type === 'settlement';
                return (
                  <div key={tx.id} className="px-4 py-4 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <TypeBadge type={tx.type} />
                        <span className="text-[11px] text-[#94A3B8]">{formatDate(tx.date)}</span>
                      </div>
                      <p className="text-[13px] text-[#4B5563] mt-1.5 truncate font-medium">{tx.description}</p>
                      <span
                        className="text-[10.5px] px-1.5 py-0.5 rounded-full font-semibold mt-1.5 inline-block"
                        style={{ backgroundColor: mode.color + '18', color: mode.color }}
                      >
                        {mode.label}
                      </span>
                    </div>
                    <span
                      className="font-mono-nums font-bold text-[14px] flex-shrink-0"
                      style={{
                        color: isSettlement ? '#94A3B8' : isGave ? '#EF4444' : '#D4AF37',
                      }}
                    >
                      {isGave ? '−' : '+'}₹{tx.amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Settle confirm modal */}
      {showSettle && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-card p-6 w-full max-w-sm card-enter" style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div className="w-12 h-12 rounded-2xl bg-[#EDF2E4] flex items-center justify-center mb-4">
              <CheckCircle size={22} className="text-[#556B2F]" />
            </div>
            <h3 className="text-[16px] font-bold text-[#1F2937] mb-2">Mark as settled?</h3>
            <p className="text-[13px] text-[#4B5563] mb-5 leading-relaxed">
              This will record a settlement of{' '}
              <strong>₹{Math.abs(balance).toLocaleString('en-IN')}</strong> and zero the balance
              with {friendName}. History is preserved.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSettle(false)}
                className="flex-1 border border-[#E2E8F0] text-[#4B5563] py-3 rounded-btn text-[13px] font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSettle}
                disabled={settling}
                className="flex-1 bg-[#556B2F] text-white py-3 rounded-btn text-[13px] font-bold disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
              >
                {settling && <Loader2 size={14} className="animate-spin" />}
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onDismiss={dismiss} />}
    </div>
  );
}
