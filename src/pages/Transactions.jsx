import { useState, useEffect, useCallback } from 'react';
import { Search, SlidersHorizontal, X, Loader2 } from 'lucide-react';
import TransactionRow from '../components/TransactionRow';
import { api } from '../services/api';
import { CATEGORIES, PAYMENT_MODES } from '../data/categories';

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [filterMode, setFilterMode] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const txs = await api.get('/transactions');
      setTransactions(txs || []);
    } catch (err) {
      console.error('[Transactions] load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = transactions.filter((tx) => {
    if (filterCat !== 'all' && tx.category !== filterCat) return false;
    if (filterMode !== 'all' && tx.subcategory !== filterMode) return false;
    if (filterType !== 'all' && tx.type !== filterType) return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !tx.description?.toLowerCase().includes(q) &&
        !tx.friendName?.toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });

  const hasFilters = filterCat !== 'all' || filterMode !== 'all' || filterType !== 'all';
  const clearFilters = () => { setFilterCat('all'); setFilterMode('all'); setFilterType('all'); };

  const total = filtered
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0);

  return (
    <div className="min-h-screen bg-[#F5F4EF] pb-28 page-enter">
      {/* Header */}
      <div
        className="px-5 pt-14 pb-8 relative overflow-hidden"
        style={{ background: 'linear-gradient(150deg, #4A5E28 0%, #556B2F 50%, #3D4A20 100%)' }}
      >
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-[0.06]"
          style={{ background: '#D4AF37', transform: 'translate(30%, -30%)' }} />
        <div className="flex items-end justify-between relative z-10">
          <div>
            <h1 className="text-white text-[24px] font-bold tracking-tight">Transactions</h1>
            <p className="text-[#8BAD5C] text-[13px] mt-1">
              {loading ? '…' : `${filtered.length} record${filtered.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          {!loading && filtered.filter((t) => t.type === 'expense').length > 0 && (
            <div className="text-right">
              <p className="text-[#8BAD5C] text-[11px] font-medium">Total shown</p>
              <p className="text-white font-mono-nums font-bold text-[20px] leading-tight">
                ₹{total.toLocaleString('en-IN')}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 mt-4">
        {/* Search + filter bar */}
        <div className="flex gap-2 mb-4">
          <div
            className="flex-1 flex items-center gap-2 bg-white rounded-btn px-3 py-2.5"
            style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}
          >
            <Search size={15} className="text-[#B0BCCB]" />
            <input
              type="text"
              placeholder="Search transactions…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 text-[13px] outline-none text-[#1F2937] bg-transparent"
            />
            {search && (
              <button onClick={() => setSearch('')}>
                <X size={14} className="text-[#94A3B8]" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-2.5 rounded-btn text-[13px] font-semibold transition-all active:scale-95 ${
              hasFilters || showFilters
                ? 'bg-[#556B2F] text-white'
                : 'bg-white text-[#4B5563]'
            }`}
            style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}
          >
            <SlidersHorizontal size={14} />
            {hasFilters ? 'Filtered' : 'Filter'}
          </button>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="bg-white rounded-card p-4 mb-4 card-enter" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[13px] font-bold text-[#1F2937]">Filters</p>
              {hasFilters && (
                <button onClick={clearFilters} className="text-[12px] text-red-500 font-semibold">
                  Clear all
                </button>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-[11px] text-[#94A3B8] font-bold uppercase tracking-wider mb-2">Type</p>
                <div className="flex flex-wrap gap-1.5">
                  {['all', 'expense', 'friend_gave', 'friend_received', 'settlement'].map((t) => (
                    <button
                      key={t}
                      onClick={() => setFilterType(t)}
                      className={`px-3 py-1.5 rounded-pill text-[12px] font-semibold transition-all ${
                        filterType === t
                          ? 'bg-[#556B2F] text-white'
                          : 'bg-[#F5F4EF] text-[#4B5563] hover:bg-[#EDF2E4]'
                      }`}
                    >
                      {t === 'all' ? 'All' : t.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[11px] text-[#94A3B8] font-bold uppercase tracking-wider mb-2">Category</p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setFilterCat('all')}
                    className={`px-3 py-1.5 rounded-pill text-[12px] font-semibold transition-all ${
                      filterCat === 'all'
                        ? 'bg-[#556B2F] text-white'
                        : 'bg-[#F5F4EF] text-[#4B5563] hover:bg-[#EDF2E4]'
                    }`}
                  >
                    All
                  </button>
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setFilterCat(c.id)}
                      className={`px-3 py-1.5 rounded-pill text-[12px] font-semibold transition-all ${
                        filterCat === c.id
                          ? 'bg-[#556B2F] text-white'
                          : 'bg-[#F5F4EF] text-[#4B5563] hover:bg-[#EDF2E4]'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[11px] text-[#94A3B8] font-bold uppercase tracking-wider mb-2">Payment mode</p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setFilterMode('all')}
                    className={`px-3 py-1.5 rounded-pill text-[12px] font-semibold transition-all ${
                      filterMode === 'all'
                        ? 'bg-[#556B2F] text-white'
                        : 'bg-[#F5F4EF] text-[#4B5563] hover:bg-[#EDF2E4]'
                    }`}
                  >
                    All
                  </button>
                  {PAYMENT_MODES.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setFilterMode(m.id)}
                      className={`px-3 py-1.5 rounded-pill text-[12px] font-semibold transition-all ${
                        filterMode === m.id
                          ? 'bg-[#556B2F] text-white'
                          : 'bg-[#F5F4EF] text-[#4B5563] hover:bg-[#EDF2E4]'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* List */}
        <div className="bg-white rounded-card overflow-hidden" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          {loading ? (
            <div className="flex justify-center py-14">
              <Loader2 size={22} className="animate-spin text-[#C8D6B0]" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-14 flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-[#EDF2E4] flex items-center justify-center">
                <Search size={22} className="text-[#A0B070]" />
              </div>
              <div className="text-center">
                <p className="text-[13px] font-semibold text-[#1F2937]">No transactions found</p>
                {(search || hasFilters) && (
                  <button
                    onClick={() => { setSearch(''); clearFilters(); }}
                    className="mt-2 text-[12px] text-[#556B2F] font-semibold"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="divide-y divide-[#F2F4F7]">
              {filtered.map((tx) => (
                <TransactionRow key={tx.id} tx={tx} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
