import { useState, useEffect, useCallback } from 'react';
import { Search, SlidersHorizontal, X, Loader2 } from 'lucide-react';
import TransactionRow from '../components/TransactionRow';
import { getTransactions } from '../services/storage';
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
      const txs = await getTransactions();
      setTransactions(txs);
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
    <div className="min-h-screen bg-[#F8F7F2] pb-28">
      {/* Header */}
      <div className="bg-[#556B2F] px-4 pt-12 pb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white text-xl font-bold">Transactions</h1>
            <p className="text-[#B8C37E] text-sm mt-1">{loading ? '…' : `${filtered.length} records`}</p>
          </div>
          {!loading && filtered.filter((t) => t.type === 'expense').length > 0 && (
            <div className="text-right">
              <p className="text-[#B8C37E] text-xs">Total shown</p>
              <p className="text-white font-mono-nums font-bold text-lg">
                ₹{total.toLocaleString('en-IN')}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 mt-4">
        {/* Search + filter bar */}
        <div className="flex gap-2 mb-4">
          <div className="flex-1 flex items-center gap-2 bg-white border border-[#E2E8F0] rounded-btn px-3 py-2.5">
            <Search size={16} className="text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Search transactions…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 text-sm outline-none text-[#1F2937] bg-transparent"
            />
            {search && (
              <button onClick={() => setSearch('')}>
                <X size={14} className="text-[#94A3B8]" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-2.5 rounded-btn border text-sm font-medium transition-colors ${
              hasFilters || showFilters
                ? 'bg-[#556B2F] text-white border-[#556B2F]'
                : 'bg-white text-[#4B5563] border-[#E2E8F0]'
            }`}
          >
            <SlidersHorizontal size={15} />
            {hasFilters ? 'Filtered' : 'Filter'}
          </button>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="bg-white rounded-card border border-[#E2E8F0] p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-[#1F2937]">Filters</p>
              {hasFilters && (
                <button onClick={clearFilters} className="text-xs text-red-500 font-medium">
                  Clear all
                </button>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-xs text-[#94A3B8] font-medium mb-1.5">Type</p>
                <div className="flex flex-wrap gap-2">
                  {['all', 'expense', 'friend_gave', 'friend_received', 'settlement'].map((t) => (
                    <button
                      key={t}
                      onClick={() => setFilterType(t)}
                      className={`px-3 py-1.5 rounded-pill text-xs font-medium border transition-colors ${
                        filterType === t
                          ? 'bg-[#556B2F] text-white border-[#556B2F]'
                          : 'bg-[#F8F7F2] text-[#4B5563] border-[#E2E8F0]'
                      }`}
                    >
                      {t === 'all' ? 'All' : t.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs text-[#94A3B8] font-medium mb-1.5">Category</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setFilterCat('all')}
                    className={`px-3 py-1.5 rounded-pill text-xs font-medium border transition-colors ${
                      filterCat === 'all'
                        ? 'bg-[#556B2F] text-white border-[#556B2F]'
                        : 'bg-[#F8F7F2] text-[#4B5563] border-[#E2E8F0]'
                    }`}
                  >
                    All
                  </button>
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setFilterCat(c.id)}
                      className={`px-3 py-1.5 rounded-pill text-xs font-medium border transition-colors ${
                        filterCat === c.id
                          ? 'bg-[#556B2F] text-white border-[#556B2F]'
                          : 'bg-[#F8F7F2] text-[#4B5563] border-[#E2E8F0]'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs text-[#94A3B8] font-medium mb-1.5">Payment mode</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setFilterMode('all')}
                    className={`px-3 py-1.5 rounded-pill text-xs font-medium border transition-colors ${
                      filterMode === 'all'
                        ? 'bg-[#556B2F] text-white border-[#556B2F]'
                        : 'bg-[#F8F7F2] text-[#4B5563] border-[#E2E8F0]'
                    }`}
                  >
                    All
                  </button>
                  {PAYMENT_MODES.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setFilterMode(m.id)}
                      className={`px-3 py-1.5 rounded-pill text-xs font-medium border transition-colors ${
                        filterMode === m.id
                          ? 'bg-[#556B2F] text-white border-[#556B2F]'
                          : 'bg-[#F8F7F2] text-[#4B5563] border-[#E2E8F0]'
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
        <div className="bg-white rounded-card border border-[#E2E8F0] overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 size={20} className="animate-spin text-[#94A3B8]" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-[#94A3B8]">No transactions found</p>
              {(search || hasFilters) && (
                <button
                  onClick={() => { setSearch(''); clearFilters(); }}
                  className="mt-2 text-xs text-[#556B2F] font-medium"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-[#E2E8F0]">
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
