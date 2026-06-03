import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
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
  const [showSettle, setShowSettle] = useState(false);

  const load = () => {
    const all = getTransactions();
    const mine = all
      .filter(t => t.friendName === friendName)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    setTransactions(mine);
    setBalance(getFriendBalance(friendName));
  };

  useEffect(() => { load(); }, [friendName]);

  const handleSettle = () => {
    const type = balance > 0 ? 'friend_gave' : 'friend_received';
    const tx = createTransaction({
      type,
      amount: Math.abs(balance),
      category: 'friend_gave',
      subcategory: 'cash',
      description: `Settled on ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`,
      friendName,
      source: 'manual',
    });
    saveTransaction(tx);
    load();
    setShowSettle(false);
    show('Settled!', 'success');
  };

  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  }

  const TypeBadge = ({ type }) => {
    const isGave = type === 'friend_gave';
    const isSettlement = type === 'settlement';
    if (isSettlement) return (
      <span className="text-xs bg-[#F1F5F9] text-[#94A3B8] px-2 py-0.5 rounded-pill font-medium">Settled</span>
    );
    return (
      <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-pill font-medium ${
        isGave ? 'bg-red-50 text-[#EF4444]' : 'bg-green-50 text-[#22C55E]'
      }`}>
        {isGave ? <ArrowUpRight size={10} /> : <ArrowDownLeft size={10} />}
        {isGave ? 'Gave' : 'Received'}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#F8F7F2] pb-28">
      {/* Header */}
      <div className="bg-[#556B2F] px-4 pt-12 pb-6">
        <button onClick={() => navigate('/friends')} className="flex items-center gap-1.5 text-[#8B9D6D] text-sm mb-3">
          <ArrowLeft size={16} />
          Back
        </button>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[#3D4A20] flex items-center justify-center text-white font-bold text-lg">
            {friendName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
          </div>
          <div>
            <h1 className="text-white text-xl font-bold">{friendName}</h1>
            <p className={`text-sm font-semibold mt-0.5 ${
              balance === 0 ? 'text-[#8B9D6D]' : balance > 0 ? 'text-[#8B9D6D]' : 'text-yellow-300'
            }`}>
              {balance === 0
                ? 'All settled'
                : balance > 0
                ? `Owes you ₹${balance.toLocaleString('en-IN')}`
                : `You owe ₹${Math.abs(balance).toLocaleString('en-IN')}`
              }
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 mt-4">
        {/* Settle button */}
        {balance !== 0 && (
          <button
            onClick={() => setShowSettle(true)}
            className="w-full flex items-center justify-center gap-2 bg-white border-2 border-[#556B2F] text-[#556B2F] py-3 rounded-card font-semibold text-sm mb-4 hover:bg-[#F8F7F2] transition-colors"
          >
            <CheckCircle size={16} />
            Mark as settled (₹{Math.abs(balance).toLocaleString('en-IN')})
          </button>
        )}

        {/* Transaction list */}
        <div className="bg-white rounded-card border border-[#E2E8F0] overflow-hidden">
          {transactions.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-[#94A3B8]">No transactions with {friendName}</p>
            </div>
          ) : (
            <div className="divide-y divide-[#E2E8F0]">
              {transactions.map(tx => {
                const mode = getPaymentModeById(tx.subcategory);
                const isGave = tx.type === 'friend_gave';
                const isSettlement = tx.type === 'settlement';
                return (
                  <div key={tx.id} className="px-4 py-3.5 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <TypeBadge type={tx.type} />
                        <span className="text-xs text-[#94A3B8]">{formatDate(tx.date)}</span>
                      </div>
                      <p className="text-sm text-[#334155] mt-1 truncate">{tx.description}</p>
                      <span
                        className="text-xs px-1.5 py-0.5 rounded-full font-medium mt-1 inline-block"
                        style={{ backgroundColor: mode.color + '20', color: mode.color }}
                      >
                        {mode.label}
                      </span>
                    </div>
                    <span
                      className="font-mono-nums font-bold text-sm flex-shrink-0"
                      style={{
                        color: isSettlement ? '#94A3B8' : isGave ? '#EF4444' : '#22C55E'
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
          <div className="bg-white rounded-card p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-base font-bold text-[#0F172A] mb-2">Mark as settled?</h3>
            <p className="text-sm text-[#334155] mb-4">
              This will record a settlement of <strong>₹{Math.abs(balance).toLocaleString('en-IN')}</strong> and zero the balance with {friendName}. History is preserved.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSettle(false)}
                className="flex-1 border border-[#E2E8F0] text-[#4B5563] py-3 rounded-btn text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSettle}
                className="flex-1 bg-[#556B2F] text-white py-3 rounded-btn text-sm font-semibold"
              >
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
