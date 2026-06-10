import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ArrowUpRight, ArrowDownLeft, ChevronRight, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import { createTransaction } from '../data/schema';
import { PAYMENT_MODES } from '../data/categories';
import VoiceButton from '../components/VoiceButton';
import { Toast, useToast } from '../components/Toast';

function getInitials(name) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function BalanceBadge({ balance }) {
  if (balance === 0)
    return (
      <span className="text-xs bg-[#F1F5F9] text-[#94A3B8] px-2 py-1 rounded-pill font-medium">
        Settled
      </span>
    );
  if (balance > 0)
    return (
      <span className="text-sm font-mono-nums font-bold text-[#D4AF37]">
        +₹{Math.abs(balance).toLocaleString('en-IN')}
      </span>
    );
  return (
    <span className="text-sm font-mono-nums font-bold text-[#EF4444]">
      −₹{Math.abs(balance).toLocaleString('en-IN')}
    </span>
  );
}

export default function FriendLedger() {
  const navigate = useNavigate();
  const { toast, show, dismiss } = useToast();
  const [friends, setFriends] = useState([]);
  const [balances, setBalances] = useState({});
  const [loading, setLoading] = useState(true);
  const [sheet, setSheet] = useState(null); // 'gave' | 'received'
  const [form, setForm] = useState({ name: '', amount: '', subcategory: 'cash', note: '' });
  const [nameSuggestions, setNameSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [aiFields, setAiFields] = useState(new Set());
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const stats = await api.get('/analytics/lending');
      if (stats && stats.friends) {
        const names = stats.friends.map(f => f.friendName);
        setFriends(names);
        setNameSuggestions(names);
        
        const bals = {};
        for (const f of stats.friends) {
          bals[f.friendName] = f.balance;
        }
        setBalances(bals);
      } else {
        setFriends([]);
        setNameSuggestions([]);
        setBalances({});
      }
    } catch (err) {
      console.error('[FriendLedger] reload error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const handleVoice = ({ raw, parsed, error }) => {
    if (error || !parsed) {
      if (raw) setForm((f) => ({ ...f, note: raw }));
      if (error) show(error, 'error');
      return;
    }
    const ai = new Set();
    if (parsed.amount) { setForm((f) => ({ ...f, amount: String(parsed.amount) })); ai.add('amount'); }
    if (parsed.friendName) { setForm((f) => ({ ...f, name: parsed.friendName })); ai.add('name'); }
    if (parsed.subcategory) { setForm((f) => ({ ...f, subcategory: parsed.subcategory })); ai.add('subcategory'); }
    setAiFields(ai);
  };

  const handleSave = async () => {
    const amt = parseFloat(form.amount);
    if (!amt || !form.name.trim()) {
      show('Fill in name and amount', 'error');
      return;
    }
    setSaving(true);
    try {
      const type = sheet === 'gave' ? 'friend_gave' : 'friend_received';
      const tx = createTransaction({
        type,
        amount: amt,
        category: 'friend_gave',
        subcategory: form.subcategory,
        description:
          form.note.trim() ||
          (sheet === 'gave' ? `Gave to ${form.name}` : `Received from ${form.name}`),
        friendName: form.name.trim(),
        source: 'manual',
      });
      await api.post('/transactions', tx);
      setSheet(null);
      setForm({ name: '', amount: '', subcategory: 'cash', note: '' });
      setAiFields(new Set());
      await reload();
      show('Saved!', 'success');
    } catch (err) {
      console.error('[FriendLedger] saveTransaction error:', err);
      show(err.message || 'Failed to save — please try again', 'error');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = (f) =>
    `w-full border rounded-btn px-4 py-3 text-[13px] bg-[#F8F7F2] text-[#1F2937] focus:outline-none transition-all ${
      aiFields.has(f) ? 'ai-filled' : 'border-[#E2E8F0] focus:border-[#D4AF37]'
    }`;

  return (
    <div className="min-h-screen bg-[#F5F4EF] pb-28 page-enter">
      {/* Header */}
      <div
        className="px-5 pt-14 pb-8 relative overflow-hidden"
        style={{ background: 'linear-gradient(150deg, #4A5E28 0%, #556B2F 50%, #3D4A20 100%)' }}
      >
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-[0.06]"
          style={{ background: '#D4AF37', transform: 'translate(30%, -30%)' }} />
        <h1 className="text-white text-[24px] font-bold tracking-tight relative z-10">Friend Ledger</h1>
        <p className="text-[#8BAD5C] text-[13px] mt-1 relative z-10">Track who owes who</p>
      </div>

      <div className="px-4 mt-4">
        {/* Summary cards */}
        {!loading && friends.length > 0 && (
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-white rounded-card p-4" style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
              <p className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1">They owe you</p>
              <p className="font-mono-nums text-[20px] font-bold text-[#D4AF37]">
                ₹{Object.values(balances).filter(b => b > 0).reduce((s, b) => s + b, 0).toLocaleString('en-IN')}
              </p>
            </div>
            <div className="bg-white rounded-card p-4" style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
              <p className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1">You owe them</p>
              <p className="font-mono-nums text-[20px] font-bold text-[#EF4444]">
                ₹{Math.abs(Object.values(balances).filter(b => b < 0).reduce((s, b) => s + b, 0)).toLocaleString('en-IN')}
              </p>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <button
            onClick={() => setSheet('gave')}
            className="flex flex-col items-center gap-2 bg-[#EF4444] text-white py-5 px-3 rounded-card font-bold text-[13px] active:scale-95 transition-transform"
            style={{ boxShadow: '0 4px 14px rgba(239,68,68,0.25)' }}
          >
            <ArrowUpRight size={22} strokeWidth={2.5} />
            I gave money
          </button>
          <button
            onClick={() => setSheet('received')}
            className="flex flex-col items-center gap-2 bg-[#D4AF37] text-white py-5 px-3 rounded-card font-bold text-[13px] active:scale-95 transition-transform"
            style={{ boxShadow: '0 4px 14px rgba(212,175,55,0.25)' }}
          >
            <ArrowDownLeft size={22} strokeWidth={2.5} />
            I received money
          </button>
        </div>

        {/* Friend list */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 size={22} className="animate-spin text-[#C8D6B0]" />
          </div>
        ) : friends.length === 0 ? (
          <div className="bg-white rounded-card p-10 text-center" style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
            <div className="w-16 h-16 rounded-2xl bg-[#EDF2E4] flex items-center justify-center mx-auto mb-4">
              <Plus size={28} className="text-[#8BAD5C]" />
            </div>
            <p className="text-[14px] font-bold text-[#1F2937]">No friends yet</p>
            <p className="text-[12px] text-[#94A3B8] mt-1 leading-relaxed">
              Record your first friend transaction using the buttons above
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-card overflow-hidden" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <p className="text-[11px] text-[#94A3B8] font-bold uppercase tracking-wider px-4 pt-4 pb-3">
              {friends.length} friend{friends.length > 1 ? 's' : ''}
            </p>
            <div className="divide-y divide-[#F2F4F7]">
              {friends.map((name) => {
                const balance = balances[name] ?? 0;
                return (
                  <button
                    key={name}
                    onClick={() => navigate(`/friends/${encodeURIComponent(name)}`)}
                    className="w-full flex items-center gap-3.5 px-4 py-4 hover:bg-[#FAFAF7] transition-colors active:bg-[#F4F3EC] min-h-[64px]"
                  >
                    <div
                      className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 text-[13px] font-bold"
                      style={{
                        backgroundColor: balance > 0 ? '#EDF2E4' : balance < 0 ? '#FEF2F2' : '#F1F5F9',
                        color: balance > 0 ? '#556B2F' : balance < 0 ? '#EF4444' : '#94A3B8',
                      }}
                    >
                      {getInitials(name)}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-[13.5px] font-bold text-[#1F2937]">{name}</p>
                      <p className="text-[11px] text-[#94A3B8] mt-0.5">
                        {balance > 0 ? 'owes you' : balance < 0 ? 'you owe' : 'all settled'}
                      </p>
                    </div>
                    <BalanceBadge balance={balance} />
                    <ChevronRight size={15} className="text-[#CBD5E1]" />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Sheet */}
      {sheet && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center"
          onClick={() => setSheet(null)}
        >
          <div
            className="bg-white w-full max-w-md rounded-t-[20px] p-6 pb-8 sheet-enter"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-[#E2E8F0] rounded-full mx-auto mb-5" />
            <div className="flex items-center gap-3 mb-5">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  sheet === 'gave' ? 'bg-red-100' : 'bg-yellow-100'
                }`}
              >
                {sheet === 'gave' ? (
                  <ArrowUpRight size={20} className="text-[#EF4444]" />
                ) : (
                  <ArrowDownLeft size={20} className="text-[#D4AF37]" />
                )}
              </div>
              <div>
                <h3 className="text-[16px] font-bold text-[#1F2937]">
                  {sheet === 'gave' ? 'I gave money' : 'I received money'}
                </h3>
                <p className="text-[11.5px] text-[#94A3B8]">Use voice or fill manually</p>
              </div>
            </div>

            <div className="flex justify-center mb-5">
              <VoiceButton onResult={handleVoice} onError={(msg) => show(msg, 'error')} />
            </div>

            <div className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Friend's name"
                  value={form.name}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, name: e.target.value }));
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  className={inputClass('name')}
                />
                {showSuggestions &&
                  nameSuggestions.filter(
                    (n) => n.toLowerCase().includes(form.name.toLowerCase()) && n !== form.name
                  ).length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-[#E2E8F0] rounded-xl shadow-lg z-10 overflow-hidden mt-1">
                      {nameSuggestions
                        .filter(
                          (n) => n.toLowerCase().includes(form.name.toLowerCase()) && n !== form.name
                        )
                        .map((n) => (
                          <button
                            key={n}
                            onMouseDown={() => {
                              setForm((f) => ({ ...f, name: n }));
                              setShowSuggestions(false);
                            }}
                            className="w-full text-left px-4 py-3 text-[13px] hover:bg-[#F8F7F2] text-[#4B5563] font-medium"
                          >
                            {n}
                          </button>
                        ))}
                    </div>
                  )}
              </div>

              <input
                type="number"
                placeholder="Amount (₹)"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                className={`${inputClass('amount')} font-mono-nums`}
                inputMode="numeric"
                min="0"
              />

              <select
                value={form.subcategory}
                onChange={(e) => setForm((f) => ({ ...f, subcategory: e.target.value }))}
                className={inputClass('subcategory')}
              >
                {PAYMENT_MODES.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>

              <input
                type="text"
                placeholder="Note (optional)"
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                className="w-full border border-[#E2E8F0] rounded-btn px-4 py-3 text-[13px] bg-[#F8F7F2] text-[#1F2937] focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            <button
              onClick={handleSave}
              disabled={saving || !form.amount || !form.name.trim()}
              className={`mt-5 w-full py-4 rounded-btn font-bold text-[14px] text-white disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform ${
                sheet === 'gave' ? 'bg-[#EF4444]' : 'bg-[#D4AF37]'
              }`}
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              Save
            </button>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onDismiss={dismiss} />}
    </div>
  );
}
