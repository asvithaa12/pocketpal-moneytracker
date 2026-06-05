import { useState, useEffect, useCallback } from 'react';
import { Trash2, Edit3, Check, X, Database, AlertTriangle, Loader2, QrCode, Info, Package } from 'lucide-react';
import {
  getQRTags, updateQRTag, deleteQRTag, clearTransactions, clearQRTags, saveTransactions
} from '../services/storage';
import { createTransaction } from '../data/schema';
import { CATEGORIES, getCategoryById } from '../data/categories';
import { Toast, useToast } from '../components/Toast';

function generateDemoData() {
  const now = new Date();
  const daysAgo = (n) => new Date(now - n * 86400000).toISOString();

  return [
    createTransaction({ amount: 70,  category: 'food',          subcategory: 'cash',    description: 'Canteen lunch',        date: daysAgo(0),  source: 'demo' }),
    createTransaction({ amount: 85,  category: 'food',          subcategory: 'cash',    description: 'Canteen breakfast',    date: daysAgo(1),  source: 'demo' }),
    createTransaction({ amount: 60,  category: 'food',          subcategory: 'cash',    description: 'Evening snack',        date: daysAgo(2),  source: 'demo' }),
    createTransaction({ amount: 90,  category: 'food',          subcategory: 'fampay',  description: 'Canteen dinner',       date: daysAgo(3),  source: 'demo' }),
    createTransaction({ amount: 75,  category: 'food',          subcategory: 'fampay',  description: 'FamPay canteen',       date: daysAgo(5),  source: 'demo' }),
    createTransaction({ amount: 45,  category: 'transport',     subcategory: 'cash',    description: 'Auto to college',      date: daysAgo(1),  source: 'demo' }),
    createTransaction({ amount: 70,  category: 'transport',     subcategory: 'cash',    description: 'Return auto',          date: daysAgo(4),  source: 'demo' }),
    createTransaction({ amount: 120, category: 'education',     subcategory: 'cash',    description: 'Chemistry notes',      date: daysAgo(6),  source: 'demo' }),
    createTransaction({ amount: 200, category: 'education',     subcategory: 'cash',    description: 'Textbook photocopy',   date: daysAgo(8),  source: 'demo' }),
    createTransaction({ amount: 199, category: 'entertainment', subcategory: 'phonepe', description: 'Jio recharge',         date: daysAgo(10), source: 'demo' }),
    createTransaction({ amount: 180, category: 'food',          subcategory: 'online',  description: 'Swiggy biryani',       date: daysAgo(7),  source: 'demo' }),
    createTransaction({ amount: 200, category: 'friend_gave',   subcategory: 'cash',    description: 'Gave to Rahul',        date: daysAgo(3),  friendName: 'Rahul', type: 'friend_gave',     source: 'demo' }),
    createTransaction({ amount: 120, category: 'friend_gave',   subcategory: 'cash',    description: 'Received from Priya', date: daysAgo(5),  friendName: 'Priya', type: 'friend_received', source: 'demo' }),
    createTransaction({ amount: 85,  category: 'health',        subcategory: 'cash',    description: 'Pharmacy medicines',   date: daysAgo(9),  source: 'demo' }),
    createTransaction({ amount: 50,  category: 'education',     subcategory: 'cash',    description: 'Pens and notebook',    date: daysAgo(11), source: 'demo' }),
  ];
}

export default function Settings() {
  const { toast, show, dismiss } = useToast();
  const [qrTags, setQrTags] = useState({});
  const [loading, setLoading] = useState(true);
  const [editHash, setEditHash] = useState(null);
  const [editLabel, setEditLabel] = useState('');
  const [editCat, setEditCat] = useState('food');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const tags = await getQRTags();
      setQrTags(tags);
    } catch (err) {
      console.error('[Settings] getQRTags error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const handleEditSave = async (hash) => {
    setBusy(true);
    try {
      await updateQRTag(hash, { label: editLabel.trim(), categoryId: editCat });
      setEditHash(null);
      await reload();
      show('QR tag updated', 'success');
    } catch (err) {
      console.error('[Settings] updateQRTag error:', err);
      show('Failed to update QR tag', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (hash) => {
    setBusy(true);
    try {
      await deleteQRTag(hash);
      await reload();
      show('QR tag deleted', 'success');
    } catch (err) {
      console.error('[Settings] deleteQRTag error:', err);
      show('Failed to delete QR tag', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleLoadDemo = async () => {
    setBusy(true);
    try {
      const demo = generateDemoData();
      await saveTransactions(demo);
      show('Loaded 15 demo transactions', 'success');
    } catch (err) {
      console.error('[Settings] loadDemo error:', err);
      show('Failed to load demo data', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleClearAll = async () => {
    setBusy(true);
    try {
      await Promise.all([clearTransactions(), clearQRTags()]);
      localStorage.removeItem('pp_summary_text');
      localStorage.removeItem('pp_last_summary_date');
      setShowClearConfirm(false);
      await reload();
      show('All data cleared', 'success');
    } catch (err) {
      console.error('[Settings] clearAll error:', err);
      show('Failed to clear data — please try again', 'error');
    } finally {
      setBusy(false);
    }
  };

  const qrList = Object.entries(qrTags);

  return (
    <div className="min-h-screen bg-[#F5F4EF] pb-28 page-enter">
      {/* Header */}
      <div
        className="px-5 pt-14 pb-8 relative overflow-hidden"
        style={{ background: 'linear-gradient(150deg, #4A5E28 0%, #556B2F 50%, #3D4A20 100%)' }}
      >
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-[0.06]"
          style={{ background: '#D4AF37', transform: 'translate(30%, -30%)' }} />
        <h1 className="text-white text-[24px] font-bold tracking-tight relative z-10">Settings</h1>
        <p className="text-[#8BAD5C] text-[13px] mt-1 relative z-10">Manage your data</p>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {/* Saved QR Codes */}
        <div className="bg-white rounded-card overflow-hidden" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-[#F2F4F7]">
            <div className="w-8 h-8 rounded-xl bg-[#EDF2E4] flex items-center justify-center">
              <QrCode size={16} className="text-[#556B2F]" />
            </div>
            <div>
              <h2 className="text-[13.5px] font-bold text-[#1F2937]">Saved QR codes</h2>
              <p className="text-[11px] text-[#94A3B8]">
                {loading ? '…' : `${qrList.length} saved`}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 size={18} className="animate-spin text-[#C8D6B0]" />
            </div>
          ) : qrList.length === 0 ? (
            <div className="px-4 py-8 flex flex-col items-center gap-2 text-center">
              <div className="w-10 h-10 rounded-xl bg-[#EDF2E4] flex items-center justify-center">
                <QrCode size={18} className="text-[#A0B070]" />
              </div>
              <p className="text-[12.5px] text-[#94A3B8] font-medium">No QR codes saved yet</p>
              <p className="text-[11px] text-[#B0BCCB]">Scan a QR in the Add tab to create one</p>
            </div>
          ) : (
            <div className="divide-y divide-[#F2F4F7]">
              {qrList.map(([hash, tag]) => {
                const cat = getCategoryById(tag.categoryId);
                if (editHash === hash) {
                  return (
                    <div key={hash} className="px-4 py-4">
                      <input
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        className="w-full border border-[#E2E8F0] rounded-btn px-3 py-2.5 text-[13px] mb-2.5 focus:outline-none focus:border-[#D4AF37] bg-[#F8F7F2]"
                      />
                      <select
                        value={editCat}
                        onChange={(e) => setEditCat(e.target.value)}
                        className="w-full border border-[#E2E8F0] rounded-btn px-3 py-2.5 text-[13px] mb-3 bg-[#F8F7F2]"
                      >
                        {CATEGORIES.filter((c) => c.id !== 'friend_gave').map((c) => (
                          <option key={c.id} value={c.id}>{c.label}</option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditSave(hash)}
                          disabled={busy || !editLabel.trim()}
                          className="flex items-center gap-1.5 bg-[#556B2F] text-white px-3.5 py-2 rounded-btn text-[12px] font-semibold disabled:opacity-50 active:scale-95 transition-transform"
                        >
                          {busy ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Save
                        </button>
                        <button
                          onClick={() => setEditHash(null)}
                          className="flex items-center gap-1.5 border border-[#E2E8F0] text-[#4B5563] px-3.5 py-2 rounded-btn text-[12px] font-medium"
                        >
                          <X size={12} /> Cancel
                        </button>
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={hash} className="flex items-center gap-3.5 px-4 py-3.5">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-sm"
                      style={{ backgroundColor: cat.bg, color: cat.color }}
                    >
                      <QrCode size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-[#1F2937] truncate">{tag.label}</p>
                      <p className="text-[11px] text-[#94A3B8] mt-0.5">
                        {cat.label} · {tag.timesScanned}× scanned
                      </p>
                    </div>
                    <button
                      onClick={() => { setEditHash(hash); setEditLabel(tag.label); setEditCat(tag.categoryId); }}
                      className="p-2 text-[#94A3B8] hover:text-[#556B2F] transition-colors rounded-lg"
                    >
                      <Edit3 size={15} />
                    </button>
                    <button
                      onClick={() => handleDelete(hash)}
                      disabled={busy}
                      className="p-2 text-[#94A3B8] hover:text-red-500 transition-colors disabled:opacity-50 rounded-lg"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Load Demo Data */}
        <div className="bg-white rounded-card p-4" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#EDF2E4] flex items-center justify-center flex-shrink-0 mt-0.5">
              <Package size={16} className="text-[#556B2F]" />
            </div>
            <div className="flex-1">
              <h2 className="text-[13.5px] font-bold text-[#1F2937] mb-0.5">Load demo data</h2>
              <p className="text-[12px] text-[#94A3B8] mb-3 leading-relaxed">
                Adds 15 realistic transactions across all categories for the past 14 days.
              </p>
              <button
                onClick={handleLoadDemo}
                disabled={busy}
                className="flex items-center gap-2 bg-[#EDF2E4] border border-[#C8D6B0] text-[#3D4A20] px-4 py-2.5 rounded-btn text-[13px] font-semibold hover:bg-[#E0EBD2] transition-colors disabled:opacity-50 active:scale-95"
              >
                {busy ? <Loader2 size={15} className="animate-spin" /> : <Database size={15} />}
                Load demo data
              </button>
            </div>
          </div>
        </div>

        {/* Clear all data */}
        <div className="bg-white rounded-card p-4" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Trash2 size={16} className="text-red-500" />
            </div>
            <div className="flex-1">
              <h2 className="text-[13.5px] font-bold text-[#1F2937] mb-0.5">Clear all data</h2>
              <p className="text-[12px] text-[#94A3B8] mb-3 leading-relaxed">
                Permanently deletes all transactions and QR tags. Cannot be undone.
              </p>
              <button
                onClick={() => setShowClearConfirm(true)}
                disabled={busy}
                className="flex items-center gap-2 bg-red-50 border border-red-200 text-[#EF4444] px-4 py-2.5 rounded-btn text-[13px] font-semibold hover:bg-red-100 transition-colors disabled:opacity-50 active:scale-95"
              >
                <Trash2 size={15} />
                Clear all data
              </button>
            </div>
          </div>
        </div>

        {/* About */}
        <div className="bg-white rounded-card p-4" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-xl bg-[#EDF2E4] flex items-center justify-center">
              <Info size={16} className="text-[#556B2F]" />
            </div>
            <h2 className="text-[13.5px] font-bold text-[#1F2937]">About</h2>
          </div>
          <div className="space-y-3">
            {[
              { label: 'App', value: 'PocketPal' },
              { label: 'Version', value: '1.0' },
              { label: 'Storage', value: 'Supabase (cloud)' },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center">
                <span className="text-[12px] text-[#94A3B8] font-medium">{label}</span>
                <span className="text-[12px] font-bold text-[#4B5563]">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Clear confirm dialog */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-card p-6 w-full max-w-sm card-enter" style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 bg-red-50 rounded-2xl flex items-center justify-center">
                <AlertTriangle size={20} className="text-[#EF4444]" />
              </div>
              <h3 className="text-[16px] font-bold text-[#1F2937]">Clear everything?</h3>
            </div>
            <p className="text-[13px] text-[#4B5563] mb-5 leading-relaxed">
              This will permanently delete all transactions and saved QR codes from Supabase. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 border border-[#E2E8F0] text-[#4B5563] py-3 rounded-btn text-[13px] font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleClearAll}
                disabled={busy}
                className="flex-1 bg-[#EF4444] text-white py-3 rounded-btn text-[13px] font-bold disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
              >
                {busy && <Loader2 size={14} className="animate-spin" />}
                Delete all
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onDismiss={dismiss} />}
    </div>
  );
}
