import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ArrowUpRight, ArrowDownLeft, ChevronRight } from 'lucide-react';
import {
  getTransactions, getFriendBalance, getUniqueFriendNames, saveTransaction
} from '../services/storage';
import { createTransaction } from '../data/schema';
import { PAYMENT_MODES } from '../data/categories';
import VoiceButton from '../components/VoiceButton';
import { Toast, useToast } from '../components/Toast';

function getInitials(name) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function BalanceBadge({ balance }) {
  if (balance === 0) return <span className="text-xs bg-[#F1F5F9] text-[#94A3B8] px-2 py-1 rounded-pill font-medium">Settled</span>;
  if (balance > 0) return <span className="text-sm font-mono-nums font-bold text-[#22C55E]">+₹{Math.abs(balance)}</span>;
  return <span className="text-sm font-mono-nums font-bold text-[#EF4444]">−₹{Math.abs(balance)}</span>;
}

export default function FriendLedger() {
  const navigate = useNavigate();
  const { toast, show, dismiss } = useToast();
  const [friends, setFriends] = useState([]);
  const [sheet, setSheet] = useState(null); // 'gave' | 'received'
  const [form, setForm] = useState({ name: '', amount: '', subcategory: 'cash', note: '' });
  const [nameSuggestions, setNameSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [aiFields, setAiFields] = useState(new Set());

  const reload = () => {
    const names = getUniqueFriendNames();
    setFriends(names);
    setNameSuggestions(names);
  };

  useEffect(() => { reload(); }, []);

  const handleVoice = ({ raw, parsed }) => {
    if (!parsed) { setForm(f => ({ ...f, note: raw })); return; }
    const ai = new Set();
    if (parsed.amount) { setForm(f => ({ ...f, amount: String(parsed.amount) })); ai.add('amount'); }
    if (parsed.friendName) { setForm(f => ({ ...f, name: parsed.friendName })); ai.add('name'); }
    if (parsed.subcategory) { setForm(f => ({ ...f, subcategory: parsed.subcategory })); ai.add('subcategory'); }
    setAiFields(ai);
  };

  const handleSave = () => {
    const amt = parseFloat(form.amount);
    if (!amt || !form.name.trim()) { show('Fill in name and amount', 'error'); return; }
    const type = sheet === 'gave' ? 'friend_gave' : 'friend_received';
    const tx = createTransaction({
      type,
      amount: amt,
      category: 'friend_gave',
      subcategory: form.subcategory,
      description: form.note || (sheet === 'gave' ? `Gave to ${form.name}` : `Received from ${form.name}`),
      friendName: form.name.trim(),
      source: 'manual',
    });
    saveTransaction(tx);
    setSheet(null);
    setForm({ name: '', amount: '', subcategory: 'cash', note: '' });
    setAiFields(new Set());
    reload();
    show('Saved!', 'success');
  };

  const inputClass = (f) =>
    `w-full border rounded-btn px-3 py-3 text-sm bg-[#F8F7F2] text-[#1F2937] focus:outline-none transition-all ${
      aiFields.has(f) ? 'ai-filled' : 'border-[#E2E8F0] focus:border-[#D4AF37]'
    }`;

  const txs = getTransactions();

  return (
    <div className="min-h-screen bg-[#F8F7F2] pb-28">
      {/* Header */}
      <div className="bg-[#556B2F] px-4 pt-12 pb-6">
        <h1 className="text-white text-xl font-bold">Friend Ledger</h1>
        <p className="text-[#86EFAC] text-sm mt-1">Track who owes who</p>
      </div>

      <div className="px-4 mt-4">
        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={() => setSheet('gave')}
            className="flex flex-col items-center gap-2 bg-[#EF4444] text-white py-4 px-3 rounded-card font-semibold text-sm active:scale-95 transition-transform shadow-sm"
          >
            <ArrowUpRight size={22} />
            I gave money
          </button>
          <button
            onClick={() => setSheet('received')}
            className="flex flex-col items-center gap-2 bg-[#D4AF37] text-white py-4 px-3 rounded-card font-semibold text-sm active:scale-95 transition-transform shadow-sm"
          >
            <ArrowDownLeft size={22} />
            I received money
          </button>
        </div>

        {/* Friend list */}
        {friends.length === 0 ? (
          <div className="bg-white rounded-card border border-[#E2E8F0] p-8 text-center">
            <div className="text-4xl mb-3">🤝</div>
            <p className="text-sm font-medium text-[#334155]">No friends yet</p>
            <p className="text-xs text-[#94A3B8] mt-1">Record your first friend transaction above</p>
          </div>
        ) : (
          <div className="bg-white rounded-card border border-[#E2E8F0] overflow-hidden">
            <p className="text-xs text-[#94A3B8] font-semibold uppercase tracking-wide px-4 pt-4 pb-2">Friends</p>
            <div className="divide-y divide-[#E2E8F0]">
              {friends.map(name => {
                const balance = getFriendBalance(name);
                return (
                  <button
                    key={name}
                    onClick={() => navigate(`/friends/${encodeURIComponent(name)}`)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-[#F1F5F9] transition-colors min-h-[60px]"
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
                      style={{
                        backgroundColor: balance > 0 ? '#F8F7F2' : balance < 0 ? '#FEF2F2' : '#F1F5F9',
                        color: balance > 0 ? '#556B2F' : balance < 0 ? '#EF4444' : '#94A3B8',
                      }}
                    >
                      {getInitials(name)}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-semibold text-[#0F172A]">{name}</p>
                      <p className="text-xs text-[#94A3B8] mt-0.5">
                        {balance > 0 ? 'owes you' : balance < 0 ? 'you owe' : 'all settled'}
                      </p>
                    </div>
                    <BalanceBadge balance={balance} />
                    <ChevronRight size={16} className="text-[#94A3B8]" />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Sheet */}
      {sheet && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center" onClick={() => setSheet(null)}>
          <div
            className="bg-white w-full max-w-md rounded-t-2xl p-6 pb-8 sheet-enter"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${sheet === 'gave' ? 'bg-red-100' : 'bg-green-100'}`}>
                {sheet === 'gave'
                  ? <ArrowUpRight size={20} className="text-[#EF4444]" />
                  : <ArrowDownLeft size={20} className="text-[#22C55E]" />}
              </div>
              <div>
                <h3 className="text-base font-bold text-[#0F172A]">
                  {sheet === 'gave' ? 'I gave money' : 'I received money'}
                </h3>
                <p className="text-xs text-[#94A3B8]">Use voice or fill manually</p>
              </div>
            </div>

            <div className="flex justify-center mb-4">
              <VoiceButton onResult={handleVoice} onError={msg => show(msg, 'error')} />
            </div>

            <div className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Friend's name"
                  value={form.name}
                  onChange={e => {
                    setForm(f => ({ ...f, name: e.target.value }));
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  className={inputClass('name')}
                />
                {showSuggestions && nameSuggestions.filter(n =>
                  n.toLowerCase().includes(form.name.toLowerCase()) && n !== form.name
                ).length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-[#E2E8F0] rounded-btn shadow-md z-10 overflow-hidden">
                    {nameSuggestions
                      .filter(n => n.toLowerCase().includes(form.name.toLowerCase()) && n !== form.name)
                      .map(n => (
                        <button
                          key={n}
                          onMouseDown={() => { setForm(f => ({ ...f, name: n })); setShowSuggestions(false); }}
                          className="w-full text-left px-3 py-2.5 text-sm hover:bg-[#F1F5F9] text-[#334155]"
                        >{n}</button>
                      ))
                    }
                  </div>
                )}
              </div>

              <input
                type="number"
                placeholder="Amount (₹)"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                className={`${inputClass('amount')} font-mono-nums`}
                inputMode="numeric"
              />

              <select
                value={form.subcategory}
                onChange={e => setForm(f => ({ ...f, subcategory: e.target.value }))}
                className={inputClass('subcategory')}
              >
                {PAYMENT_MODES.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>

              <input
                type="text"
                placeholder="Note (optional)"
                value={form.note}
                onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                className="w-full border border-[#E2E8F0] rounded-btn px-3 py-3 text-sm bg-[#F1F5F9] text-[#0F172A] focus:outline-none focus:border-[#22C55E]"
              />
            </div>

              <button
                onClick={handleSave}
                disabled={!form.amount || !form.name.trim()}
                className={`mt-4 w-full py-3.5 rounded-btn font-semibold text-sm text-white disabled:opacity-50 ${
                  sheet === 'gave' ? 'bg-[#EF4444]' : 'bg-[#D4AF37]'
                }`}
              >
                Save
              </button>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onDismiss={dismiss} />}
    </div>
  );
}
