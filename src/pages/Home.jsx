import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';
import { TrendingDown, Wallet, Wifi, Users, Sparkles, ChevronDown, Loader2, RefreshCw } from 'lucide-react';
import StatCard from '../components/StatCard';
import TransactionRow from '../components/TransactionRow';
import {
  getTransactions,
  getDashboardStats,
  getWeekRange,
  isSummaryGeneratedThisWeek,
  setLastSummaryDate,
} from '../services/storage';
import { generateWeeklySummary } from '../services/weeklySummary';
import { getCategoryById } from '../data/categories';

function getMonthOptions() {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    options.push({
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
    });
  }
  return options;
}

function isInMonth(dateStr, monthStr) {
  const [year, month] = monthStr.split('-').map(Number);
  const d = new Date(dateStr);
  return d.getFullYear() === year && d.getMonth() + 1 === month;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

export default function Home() {
  const navigate = useNavigate();
  const location = useLocation();
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState({
    spentThisWeek: 0,
    cashThisMonth: 0,
    onlineThisMonth: 0,
    friendsOweYou: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingTxs, setLoadingTxs] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(getMonthOptions()[0].value);
  const [summary, setSummary] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('pp_summary_text') || 'null');
    } catch {
      return null;
    }
  });
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState('');
  const monthOptions = getMonthOptions();

  const loadData = useCallback(async () => {
    console.log('[Home] loadData');
    setLoadingStats(true);
    setLoadingTxs(true);
    try {
      const [txs, s] = await Promise.all([getTransactions(), getDashboardStats()]);
      setTransactions(txs);
      setStats(s);
    } catch (err) {
      console.error('[Home] loadData error:', err);
    } finally {
      setLoadingStats(false);
      setLoadingTxs(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, location.key]);

  // Chart data — derived from full transactions list for selected month
  const monthExpenses = transactions.filter(
    (t) => t.type === 'expense' && isInMonth(t.date, selectedMonth)
  );

  const catTotals = {};
  for (const tx of monthExpenses) {
    catTotals[tx.category] = (catTotals[tx.category] || 0) + tx.amount;
  }
  const pieData = Object.entries(catTotals)
    .map(([id, value]) => ({ name: getCategoryById(id).label, value, color: getCategoryById(id).color }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);

  const barData = [
    { name: 'Cash', amount: monthExpenses.filter((t) => t.subcategory === 'cash').reduce((s, t) => s + t.amount, 0), fill: '#556B2F' },
    { name: 'FamPay', amount: monthExpenses.filter((t) => t.subcategory === 'fampay').reduce((s, t) => s + t.amount, 0), fill: '#D4AF37' },
    { name: 'PhonePe', amount: monthExpenses.filter((t) => t.subcategory === 'phonepe').reduce((s, t) => s + t.amount, 0), fill: '#3B82F6' },
    { name: 'Online', amount: monthExpenses.filter((t) => t.subcategory === 'online').reduce((s, t) => s + t.amount, 0), fill: '#8B5CF6' },
  ];

  // Weekly expenses for AI summary
  const { start: weekStart, end: weekEnd } = getWeekRange();
  const weekExpenses = transactions.filter(
    (t) => t.type === 'expense' && new Date(t.date) >= weekStart && new Date(t.date) <= weekEnd
  );

  const handleGenerateSummary = async () => {
    setGeneratingSummary(true);
    setSummaryError('');
    try {
      const result = await generateWeeklySummary(weekExpenses);
      if (result.length > 0) {
        setSummary(result);
        localStorage.setItem('pp_summary_text', JSON.stringify(result));
        setLastSummaryDate(new Date().toISOString());
      } else {
        setSummaryError('Could not generate — try again later');
      }
    } catch {
      setSummaryError('Could not generate — try again later');
    } finally {
      setGeneratingSummary(false);
    }
  };

  const alreadyGenerated = isSummaryGeneratedThisWeek();
  const recent = transactions.slice(0, 5);

  return (
    <div className="min-h-screen bg-[#F8F7F2] pb-24">
      {/* Header */}
      <div className="bg-[#556B2F] px-4 pt-12 pb-8">
        <p className="text-[#8B9D6D] text-sm mb-1">Good {getGreeting()}</p>
        <h1 className="text-white text-2xl font-bold">PocketPal</h1>
        <p className="text-[#B8C37E] text-sm mt-1">Your money, your way</p>
      </div>

      <div className="px-4 -mt-4">
        {/* Stat Cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <StatCard
            label="Spent this week"
            value={loadingStats ? '…' : `₹${stats.spentThisWeek.toLocaleString('en-IN')}`}
            icon={TrendingDown}
            color="#EF4444"
            bg="#FEF2F2"
          />
          <StatCard
            label="Cash this month"
            value={loadingStats ? '…' : `₹${stats.cashThisMonth.toLocaleString('en-IN')}`}
            icon={Wallet}
            color="#556B2F"
            bg="#F8F7F2"
          />
          <StatCard
            label="Online / UPI"
            value={loadingStats ? '…' : `₹${stats.onlineThisMonth.toLocaleString('en-IN')}`}
            sub="this month"
            icon={Wifi}
            color="#3B82F6"
            bg="#EFF6FF"
          />
          <StatCard
            label="Friends owe you"
            value={loadingStats ? '…' : `₹${stats.friendsOweYou.toLocaleString('en-IN')}`}
            icon={Users}
            color="#22C55E"
            bg="#F0FDF4"
          />
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-card border border-[#E2E8F0] mb-6 overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <h2 className="text-sm font-semibold text-[#1F2937]">Recent transactions</h2>
            <button
              onClick={() => navigate('/transactions')}
              className="text-xs text-[#556B2F] font-medium"
            >
              See all
            </button>
          </div>
          <div className="divide-y divide-[#E2E8F0]">
            {loadingTxs ? (
              <div className="flex justify-center py-8">
                <Loader2 size={20} className="animate-spin text-[#94A3B8]" />
              </div>
            ) : recent.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-[#94A3B8]">No transactions yet</p>
                <button
                  onClick={() => navigate('/add')}
                  className="mt-2 text-sm text-[#556B2F] font-medium"
                >
                  Add your first expense →
                </button>
              </div>
            ) : (
              recent.map((tx) => <TransactionRow key={tx.id} tx={tx} />)
            )}
          </div>
        </div>

        {/* Charts */}
        <div className="bg-white rounded-card border border-[#E2E8F0] mb-6 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[#1F2937]">Spending breakdown</h2>
            <div className="relative">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="appearance-none text-xs border border-[#E2E8F0] rounded-btn px-3 py-1.5 pr-7 bg-[#F8F7F2] text-[#1F2937] focus:outline-none focus:border-[#D4AF37]"
              >
                {monthOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-2 top-2 text-[#94A3B8] pointer-events-none" />
            </div>
          </div>

          {loadingTxs ? (
            <div className="flex justify-center py-8">
              <Loader2 size={20} className="animate-spin text-[#94A3B8]" />
            </div>
          ) : pieData.length === 0 ? (
            <p className="text-center text-sm text-[#94A3B8] py-6">No expenses for this month</p>
          ) : (
            <>
              <p className="text-xs text-[#94A3B8] font-medium mb-2">By category</p>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" nameKey="name">
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [`₹${v.toLocaleString('en-IN')}`, '']} />
                  <Legend formatter={(v) => <span style={{ fontSize: 11 }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>

              <p className="text-xs text-[#94A3B8] font-medium mb-2 mt-4">By payment mode</p>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={barData} barSize={32}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip formatter={(v) => [`₹${v.toLocaleString('en-IN')}`, 'Amount']} />
                  <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                    {barData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </>
          )}
        </div>

        {/* AI Weekly Summary */}
        <div className="bg-white rounded-card border border-[#E2E8F0] mb-6 overflow-hidden">
          <div className="px-4 pt-4 pb-3 border-b border-[#E2E8F0] flex items-center gap-2">
            <Sparkles size={16} className="text-[#8B5CF6]" />
            <h2 className="text-sm font-semibold text-[#1F2937]">AI weekly roast</h2>
          </div>

          {summary ? (
            <div className="p-4 bg-[#F5F3FF]">
              {summary.map((line, i) => (
                <div key={i} className="flex items-start gap-2 mb-2 last:mb-0">
                  <span className="text-[#8B5CF6] font-bold text-sm flex-shrink-0">{i + 1}.</span>
                  <p className="text-sm text-[#5B21B6] leading-relaxed">{line}</p>
                </div>
              ))}
              <button
                onClick={() => {
                  setSummary(null);
                  localStorage.removeItem('pp_summary_text');
                  setLastSummaryDate('');
                }}
                className="mt-3 text-xs text-[#8B5CF6] flex items-center gap-1"
              >
                <RefreshCw size={12} /> Regenerate
              </button>
            </div>
          ) : (
            <div className="p-4">
              {weekExpenses.length === 0 ? (
                <p className="text-sm text-[#94A3B8] text-center py-2">
                  Add some expenses this week first
                </p>
              ) : (
                <>
                  <p className="text-xs text-[#94A3B8] mb-3">
                    Get a funny AI summary of your {weekExpenses.length} expense
                    {weekExpenses.length > 1 ? 's' : ''} this week
                  </p>
                  {summaryError && (
                    <p className="text-xs text-red-500 mb-2">{summaryError}</p>
                  )}
                  <button
                    onClick={handleGenerateSummary}
                    disabled={generatingSummary || alreadyGenerated}
                    className="flex items-center gap-2 bg-[#5B21B6] text-white px-4 py-2 rounded-btn text-sm font-medium disabled:opacity-50 transition-opacity"
                  >
                    {generatingSummary ? (
                      <>
                        <Loader2 size={14} className="animate-spin" /> Generating…
                      </>
                    ) : (
                      <>
                        <Sparkles size={14} /> Generate summary
                      </>
                    )}
                  </button>
                  {alreadyGenerated && !summaryError && (
                    <p className="text-xs text-[#94A3B8] mt-2">Already generated this week</p>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
