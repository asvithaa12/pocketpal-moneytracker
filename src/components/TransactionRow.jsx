import CategoryIcon from './CategoryIcon';
import { getCategoryById, getPaymentModeById } from '../data/categories';

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  if (days === 1) return 'Yesterday';
  if (days < 7) return d.toLocaleDateString('en-IN', { weekday: 'short' });
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
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
      className="w-full flex items-center gap-3.5 px-4 py-3.5 bg-white transition-all duration-150 hover:bg-[#FAFAF7] active:bg-[#F4F3EC] active:scale-[0.99] focus:outline-none text-left"
      aria-label={`Transaction: ${tx.description || cat.label}`}
    >
      <CategoryIcon categoryId={tx.category} size={18} />

      <div className="flex-1 min-w-0">
        <p className="text-[13.5px] font-semibold text-[#1F2937] truncate leading-tight">
          {tx.description || cat.label}
        </p>
        <div className="flex items-center gap-1.5 mt-1">
          <span className="text-[11px] text-[#B0BCCB] font-medium">{formatDate(tx.date)}</span>
          <span className="text-[11px] text-[#CBD5E1]">·</span>
          <span
            className="text-[10.5px] px-1.5 py-0.5 rounded-full font-semibold"
            style={{ backgroundColor: mode.color + '18', color: mode.color }}
          >
            {mode.label}
          </span>
          {isFriendTx && tx.friendName && (
            <>
              <span className="text-[11px] text-[#CBD5E1]">·</span>
              <span className="text-[11px] text-[#94A3B8] truncate max-w-[80px]">{tx.friendName}</span>
            </>
          )}
        </div>
      </div>

      <span
        className="font-mono-nums font-bold text-[14px] flex-shrink-0 tabular-nums"
        style={{
          color: isPositive ? '#D4AF37' : isNegative ? '#EF4444' : '#1F2937',
        }}
      >
        {isPositive ? '+' : '−'}₹{tx.amount.toLocaleString('en-IN')}
      </span>
    </button>
  );
}
