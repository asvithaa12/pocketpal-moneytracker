import CategoryIcon from './CategoryIcon';
import { getCategoryById, getPaymentModeById } from '../data/categories';

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) {
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  } else if (days === 1) {
    return 'Yesterday';
  } else if (days < 7) {
    return d.toLocaleDateString('en-IN', { weekday: 'short' });
  } else {
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }
}

export default function TransactionRow({ tx, onClick }) {
  const cat = getCategoryById(tx.category);
  const mode = getPaymentModeById(tx.subcategory);

  const isFriendTx = tx.type === 'friend_gave' || tx.type === 'friend_received' || tx.type === 'settlement';
  const isPositive = tx.type === 'friend_received';
  const isNegative = tx.type === 'friend_gave';

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-4 bg-white rounded-card border border-[#E2E8F0] transition-all duration-200 hover:border-[#D4AF37] hover:shadow-sm hover:bg-[#F8F7F2] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#556B2F] focus:ring-opacity-20 text-left min-h-[60px]"
      aria-label={`Transaction: ${tx.description || cat.label}`}
    >
      <CategoryIcon categoryId={tx.category} size={18} />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#1F2937] truncate">
          {tx.description || cat.label}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-xs text-[#94A3B8]">{formatDate(tx.date)}</span>
          <span className="text-xs text-[#94A3B8]">·</span>
          <span
            className="text-xs px-1.5 py-0.5 rounded-full font-medium"
            style={{ backgroundColor: mode.color + '20', color: mode.color }}
          >
            {mode.label}
          </span>
          {isFriendTx && tx.friendName && (
            <>
              <span className="text-xs text-[#94A3B8]">·</span>
              <span className="text-xs text-[#94A3B8] truncate">{tx.friendName}</span>
            </>
          )}
        </div>
      </div>

      <span
        className="font-mono-nums font-semibold text-sm flex-shrink-0"
        style={{
          color: isPositive ? '#D4AF37' : isNegative ? '#EF4444' : '#1F2937'
        }}
      >
        {isPositive ? '+' : isNegative ? '−' : '−'}₹{tx.amount}
      </span>
    </button>
  );
}
