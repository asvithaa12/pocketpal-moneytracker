import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';
import { TrendingDown, Wallet, Wifi, Users, Sparkles, ChevronDown, Loader2, RefreshCw, ArrowRight, Receipt } from 'lucide-react';
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
    <div className="min-h-screen bg-[#F5F4EF] pb-28 page-enter">
      {/* Premium header */}
      <div
        className="px-5 pt-14 pb-10 relative overflow-hidden"
        style={{ background: 'linear-gradient(150deg, #4A5E28 0%, #556B2F 50%, #3D4A20 100%)' }}
      >
        <div className="absolute top-0 right-0 w-52 h-52 rounded-full opacity-[0.06]"
          style={{ background: '#D4AF37', transform: 'translate(30%, -30%)' }} />
        <div className="absolute bottom-0 left-0 w-36 h-36 rounded-full opacity-[0.05]"
          style={{ background: '#fff', transform: 'translate(-30%, 30%)' }} />
        <p className="text-[#7A9B52] text-[13px] font-medium mb-1 relative z-10">Good {getGreeting()}</p>
        <h1 className="text-white text-[26px] font-bold tracking-tight relative z-10">PocketPal</h1>
        <p className="text-[#8BAD5C] text-[13px] mt-1 relative z-10">Your money, your way</p>
      </div>

      <div className="px-4 -mt-5">
        {/* Stat Cards */}
        <div className="grid grid-cols-2 gap-3 mb-5">
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
            bg="#EDF2E4"
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
        <div className="bg-white rounded-card mb-5 overflow-hidden" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <div className="flex items-center justify-between px-4 py-4">
            <h2 className="text-[14px] font-bold text-[#1F2937] tracking-tight">Recent transactions</h2>
            <button
              onClick={() => navigate('/transactions')}
              className="flex items-center gap-1 text-[12px] text-[#556B2F] font-semibold hover:opacity-70 transition-opacity"
            >
              See all <ArrowRight size={12} />
            </button>
          </div>
          <div className="divide-y divide-[#F2F4F7]">
            {loadingTxs ? (
              <div className="flex justify-center py-10">
                <Loader2 size={22} className="animate-spin text-[#C8D6B0]" />
              </div>
            ) : recent.length === 0 ? (
              <div className="px-4 py-10 flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-[#F0F2EC] flex items-center justify-center">
                  <Receipt size={24} className="text-[#A0B070]" />
                </div>
                <div className="text-center">
                  <p className="text-[13px] font-semibold text-[#1F2937]">No transactions yet</p>
                  <p className="text-[12px] text-[#94A3B8] mt-0.5">Start tracking your spending</p>
                </div>
                <button
                  onClick={() => navigate('/add')}
                  className="mt-1 px-5 py-2 bg-[#556B2F] text-white text-[12px] font-semibold rounded-pill active:scale-95 transition-transform"
                >
                  Add your first expense
                </button>
              </div>
            ) : (
              recent.map((tx) => <TransactionRow key={tx.id} tx={tx} />)
            )}
          </div>
        </div>

        {/* Charts */}
        <div className="bg-white rounded-card mb-5 p-4" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[14px] font-bold text-[#1F2937] tracking-tight">Spending breakdown</h2>
            <div className="relative">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="appearance-none text-[11.5px] border border-[#EAECF0] rounded-btn px-3 py-1.5 pr-7 bg-[#F8F7F2] text-[#4B5563] font-medium focus:outline-none focus:border-[#D4AF37]"
              >
                {monthOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={11} className="absolute right-2 top-2.5 text-[#94A3B8] pointer-events-none" />
            </div>
          </div>

          {loadingTxs ? (
            <div className="flex justify-center py-10">
              <Loader2 size={22} className="animate-spin text-[#C8D6B0]" />
            </div>
          ) : pieData.length === 0 ? (
            <div className="py-10 flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-2xl bg-[#F0F2EC] flex items-center justify-center">
                <TrendingDown size={20} className="text-[#A0B070]" />
              </div>
              <p className="text-[12.5px] text-[#94A3B8] font-medium">No expenses this month</p>
            </div>
          ) : (
            <>
              <p className="text-[11px] text-[#94A3B8] font-semibold uppercase tracking-wider mb-2">By category</p>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} innerRadius={36} dataKey="value" nameKey="name">
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v) => [`₹${v.toLocaleString('en-IN')}`, '']}
                    contentStyle={{ borderRadius: 10, border: '1px solid #F0F2F5', fontSize: 12 }}
                  />
                  <Legend formatter={(v) => <span style={{ fontSize: 11, color: '#4B5563' }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>

              <p className="text-[11px] text-[#94A3B8] font-semibold uppercase tracking-wider mb-2 mt-4">By payment mode</p>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={barData} barSize={30}>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip
                    formatter={(v) => [`₹${v.toLocaleString('en-IN')}`, 'Amount']}
                    contentStyle={{ borderRadius: 10, border: '1px solid #F0F2F5', fontSize: 12 }}
                  />
                  <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
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
        <div className="bg-white rounded-card mb-5 overflow-hidden" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <div className="px-4 pt-4 pb-3 border-b border-[#F2F4F7] flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#F5F3FF] flex items-center justify-center">
              <Sparkles size={14} className="text-[#8B5CF6]" />
            </div>
            <h2 className="text-[14px] font-bold text-[#1F2937] tracking-tight">AI weekly roast</h2>
          </div>

          {summary ? (
            <div className="p-4 bg-gradient-to-br from-[#F9F7FF] to-[#F5F3FF]">
              <div className="space-y-3">
                {summary.map((line, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5"
                      style={{ background: '#EDE9FE', color: '#7C3AED' }}
                    >
                      {i + 1}
                    </span>
                    <p className="text-[13px] text-[#4C1D95] leading-relaxed">{line}</p>
                  </div>
                ))}
              </div>
              <button
                onClick={() => {
                  setSummary(null);
                  localStorage.removeItem('pp_summary_text');
                  setLastSummaryDate('');
                }}
                className="mt-4 flex items-center gap-1.5 text-[11.5px] text-[#7C3AED] font-semibold opacity-70 hover:opacity-100 transition-opacity"
              >
                <RefreshCw size={12} /> Regenerate
              </button>
            </div>
          ) : (
            <div className="p-4">
              {weekExpenses.length === 0 ? (
                <div className="py-4 flex flex-col items-center gap-2 text-center">
                  <div className="w-10 h-10 rounded-xl bg-[#F5F3FF] flex items-center justify-center">
                    <Sparkles size={18} className="text-[#C4B5FD]" />
                  </div>
                  <p className="text-[12.5px] text-[#94A3B8] font-medium">Add some expenses this week first</p>
                </div>
              ) : (
                <>
                  <p className="text-[12px] text-[#94A3B8] mb-3 leading-relaxed">
                    Get a funny AI summary of your{' '}
                    <span className="font-semibold text-[#7C3AED]">{weekExpenses.length} expense{weekExpenses.length > 1 ? 's' : ''}</span>{' '}
                    this week
                  </p>
                  {summaryError && (
                    <p className="text-[11.5px] text-red-500 mb-2 font-medium">{summaryError}</p>
                  )}
                  <button
                    onClick={handleGenerateSummary}
                    disabled={generatingSummary || alreadyGenerated}
                    className="flex items-center gap-2 bg-[#5B21B6] text-white px-4 py-2.5 rounded-pill text-[13px] font-semibold disabled:opacity-50 transition-all active:scale-95 shadow-sm"
                  >
                    {generatingSummary ? (
                      <><Loader2 size={14} className="animate-spin" /> Generating…</>
                    ) : (
                      <><Sparkles size={14} /> Generate roast</>
                    )}
                  </button>
                  {alreadyGenerated && !summaryError && (
                    <p className="text-[11px] text-[#94A3B8] mt-2">Already generated this week</p>
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
