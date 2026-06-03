import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';
import { TrendingDown, Wallet, Wifi, Users, Sparkles, ChevronDown, Loader2, RefreshCw } from 'lucide-react';
import StatCard from '../components/StatCard';
import TransactionRow from '../components/TransactionRow';
import {
  getTransactions, getWeekRange, getFriendBalance,
  isSummaryGeneratedThisWeek, setLastSummaryDate
} from '../services/storage';
import { generateWeeklySummary } from '../services/weeklySummary';
import { CATEGORIES, getCategoryById } from '../data/categories';

function getMonthOptions() {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    options.push({
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    });
  }
  return options;
}

function isThisWeek(dateStr) {
  const { start, end } = getWeekRange();
  const d = new Date(dateStr);
  return d >= start && d <= end;
}

function isThisMonth(dateStr) {
  const now = new Date();
  const d = new Date(dateStr);
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

function isInMonth(dateStr, monthStr) {
  const [year, month] = monthStr.split('-').map(Number);
  const d = new Date(dateStr);
  return d.getFullYear() === year && d.getMonth() + 1 === month;
}

export default function Home() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(getMonthOptions()[0].value);
  const [summary, setSummary] = useState(() => {
    try { return JSON.parse(localStorage.getItem('pp_summary_text') || 'null'); } catch { return null; }
  });
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState('');
  const monthOptions = getMonthOptions();

  useEffect(() => {
    setTransactions(getTransactions());
  }, []);

  // Stat card calculations
  const weekExpenses = transactions.filter(t => t.type === 'expense' && isThisWeek(t.date));
  const spentThisWeek = weekExpenses.reduce((s, t) => s + t.amount, 0);

  const cashThisMonth = transactions
    .filter(t => t.type === 'expense' && t.subcategory === 'cash' && isThisMonth(t.date))
    .reduce((s, t) => s + t.amount, 0);

  const onlineThisMonth = transactions
    .filter(t => t.type === 'expense' && ['fampay', 'phonepe', 'online'].includes(t.subcategory) && isThisMonth(t.date))
    .reduce((s, t) => s + t.amount, 0);

  // Friends balance
  const friendNames = [...new Set(transactions.filter(t => t.friendName).map(t => t.friendName))];
  const friendsOweTotal = friendNames.reduce((sum, name) => {
    const b = getFriendBalance(name);
    return sum + (b > 0 ? b : 0);
  }, 0);

  // Chart data
  const monthExpenses = transactions.filter(t => t.type === 'expense' && isInMonth(t.date, selectedMonth));
  const catTotals = {};
  for (const tx of monthExpenses) {
    catTotals[tx.category] = (catTotals[tx.category] || 0) + tx.amount;
  }
  const pieData = Object.entries(catTotals)
    .map(([id, value]) => ({ name: getCategoryById(id).label, value, color: getCategoryById(id).color }))
    .filter(d => d.value > 0)
    .sort((a, b) => b.value - a.value);

  const barData = [
    { name: 'Cash', amount: monthExpenses.filter(t => t.subcategory === 'cash').reduce((s, t) => s + t.amount, 0), fill: '#22C55E' },
    { name: 'FamPay', amount: monthExpenses.filter(t => t.subcategory === 'fampay').reduce((s, t) => s + t.amount, 0), fill: '#F59E0B' },
    { name: 'PhonePe', amount: monthExpenses.filter(t => t.subcategory === 'phonepe').reduce((s, t) => s + t.amount, 0), fill: '#3B82F6' },
    { name: 'Online', amount: monthExpenses.filter(t => t.subcategory === 'online').reduce((s, t) => s + t.amount, 0), fill: '#8B5CF6' },
  ];

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
            value={`₹${spentThisWeek.toLocaleString('en-IN')}`}
            icon={TrendingDown}
            color="#EF4444"
            bg="#FEF2F2"
          />
          <StatCard
            label="Cash this month"
            value={`₹${cashThisMonth.toLocaleString('en-IN')}`}
            icon={Wallet}
            color="#556B2F"
            bg="#F8F7F2"
          />
          <StatCard
            label="Online / UPI"
            value={`₹${onlineThisMonth.toLocaleString('en-IN')}`}
            sub="this month"
            icon={Wifi}
            color="#3B82F6"
            bg="#EFF6FF"
          />
          <StatCard
            label="Friends owe you"
            value={`₹${friendsOweTotal.toLocaleString('en-IN')}`}
            icon={Users}
            color="#22C55E"
            bg="#F0FDF4"
          />
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-card border border-[#E2E8F0] mb-6 overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <h2 className="text-sm font-semibold text-[#0F172A]">Recent transactions</h2>
            <button
              onClick={() => navigate('/transactions')}
              className="text-xs text-[#556B2F] font-medium"
            >
              See all
            </button>
          </div>
          <div className="divide-y divide-[#E2E8F0]">
            {recent.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-[#94A3B8]">No transactions yet</p>
                <button
                  onClick={() => navigate('/add')}
                  className="mt-2 text-sm text-[#14B8A6] font-medium"
                >
                  Add your first expense →
                </button>
              </div>
            ) : (
              recent.map(tx => (
                <TransactionRow key={tx.id} tx={tx} />
              ))
            )}
          </div>
        </div>

        {/* Charts */}
        <div className="bg-white rounded-card border border-[#E2E8F0] mb-6 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[#0F172A]">Spending breakdown</h2>
            <div className="relative">
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="appearance-none text-xs border border-[#E2E8F0] rounded-btn px-3 py-1.5 pr-7 bg-[#F1F5F9] text-[#334155] focus:outline-none focus:border-[#22C55E]"
              >
                {monthOptions.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-2 top-2 text-[#94A3B8] pointer-events-none" />
            </div>
          </div>

          {pieData.length === 0 ? (
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
            <h2 className="text-sm font-semibold text-[#0F172A]">AI weekly roast</h2>
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
                <p className="text-sm text-[#94A3B8] text-center py-2">Add some expenses this week first</p>
              ) : (
                <>
                  <p className="text-xs text-[#94A3B8] mb-3">
                    Get a funny AI summary of your {weekExpenses.length} expense{weekExpenses.length > 1 ? 's' : ''} this week
                  </p>
                  {summaryError && <p className="text-xs text-red-500 mb-2">{summaryError}</p>}
                  <button
                    onClick={handleGenerateSummary}
                    disabled={generatingSummary || alreadyGenerated}
                    className="flex items-center gap-2 bg-[#5B21B6] text-white px-4 py-2 rounded-btn text-sm font-medium disabled:opacity-50 transition-opacity"
                  >
                    {generatingSummary ? (
                      <><Loader2 size={14} className="animate-spin" /> Generating…</>
                    ) : (
                      <><Sparkles size={14} /> Generate summary</>
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

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
