import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, Image, Keyboard, Camera, Plus, Check, Loader2, Sparkles } from 'lucide-react';
import VoiceButton from '../components/VoiceButton';
import QRScanner from '../components/QRScanner';
import { Toast, useToast } from '../components/Toast';
import { CATEGORIES, PAYMENT_MODES } from '../data/categories';
import { createTransaction } from '../data/schema';
import { api } from '../services/api';
import { parseScreenshot } from '../services/screenshotParser';

const TABS = [
  { id: 'voice', label: 'Voice', icon: Mic },
  { id: 'screenshot', label: 'Screenshot', icon: Image },
  { id: 'manual', label: 'Manual', icon: Keyboard },
];

function qrHash(str) {
  // djb2 hash — collision-resistant fingerprint of the full QR string
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    hash |= 0; // keep as 32-bit int
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export default function AddExpense() {
  const navigate = useNavigate();
  const { toast, show, dismiss } = useToast();
  const [activeTab, setActiveTab] = useState('voice');
  const [form, setForm] = useState({
    amount: '',
    category: 'food',
    subcategory: 'cash',
    description: '',
    date: new Date().toISOString().slice(0, 16),
    friendName: '',
    source: 'manual',
    qrId: null,
  });
  const [aiFields, setAiFields] = useState(new Set());
  const [showQR, setShowQR] = useState(false);
  const [saving, setSaving] = useState(false);

  // Screenshot state
  const [imgPreview, setImgPreview] = useState(null);
  const [imgBase64, setImgBase64] = useState(null);
  const [imgMime, setImgMime] = useState('image/jpeg');
  const [parsing, setParsing] = useState(false);
  const [importItems, setImportItems] = useState([]);
  const [checked, setChecked] = useState([]);
  const fileRef = useRef(null);

  // QR modal state
  const [qrModal, setQrModal] = useState(null);
  const [qrLabel, setQrLabel] = useState('');
  const [qrCat, setQrCat] = useState('food');
  const [qrSaving, setQrSaving] = useState(false);

  const setField = (key, value, fromAI = false) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (fromAI) {
      setAiFields((prev) => new Set([...prev, key]));
    } else {
      setAiFields((prev) => {
        const s = new Set(prev);
        s.delete(key);
        return s;
      });
    }
  };

  // ─── Voice ──────────────────────────────────────────────────────────────────

  const handleVoiceResult = ({ raw, parsed, error }) => {
    if (error || !parsed) {
      // Fall back: put the raw transcript into description and let user fill the rest
      if (raw) setField('description', raw, false);
      setActiveTab('manual');
      if (error) show(error, 'error');
      return;
    }

    const newAI = new Set();
    const update = {};

    if (parsed.amount) {
      update.amount = String(parsed.amount);
      newAI.add('amount');
    }
    if (parsed.category) {
      update.category = parsed.category;
      newAI.add('category');
    }
    if (parsed.subcategory) {
      update.subcategory = parsed.subcategory;
      newAI.add('subcategory');
    }
    if (parsed.description) {
      update.description = parsed.description;
      newAI.add('description');
    }
    if (parsed.friendName) {
      update.friendName = parsed.friendName;
      newAI.add('friendName');
    }
    update.source = 'voice';

    setForm((f) => ({ ...f, ...update }));
    setAiFields(newAI);
    setActiveTab('manual');
  };

  // ─── QR Scan ─────────────────────────────────────────────────────────────────

  const handleQRScan = async (decoded) => {
    setShowQR(false);
    const hash = qrHash(decoded);
    console.log('[AddExpense] QR scan hash:', hash);

    try {
      const tag = await api.get(`/qr-tags/${hash}`);
      if (tag) {
        await api.post('/qr-tags', { hash, label: tag.label, categoryId: tag.categoryId });
        setForm((f) => ({
          ...f,
          category: tag.categoryId,
          description: tag.label,
          source: 'qr',
          qrId: tag.id,
        }));
        setAiFields(new Set(['category', 'description']));
        show(`Recognised: ${tag.label} (scanned ${tag.timesScanned + 1}×)`, 'success');
        setActiveTab('manual');
      } else {
        // New QR: ask user to name it
        setQrModal({ hash, decoded });
        setQrLabel('');
        setQrCat('food');
      }
    } catch (err) {
      console.error('[AddExpense] QR lookup error:', err);
      show('QR lookup failed — please try again', 'error');
    }
  };

  const handleSaveQRTag = async () => {
    if (!qrLabel.trim() || !qrModal) return;
    setQrSaving(true);
    try {
      const saved = await api.post('/qr-tags', {
        hash: qrModal.hash,
        label: qrLabel.trim(),
        categoryId: qrCat,
      });
      setForm((f) => ({
        ...f,
        category: qrCat,
        description: qrLabel.trim(),
        source: 'qr',
        qrId: saved.id,
      }));
      setAiFields(new Set(['category', 'description']));
      setQrModal(null);
      setActiveTab('manual');
    } catch (err) {
      console.error('[AddExpense] saveQRTag error:', err);
      show('Failed to save QR tag — please try again', 'error');
    } finally {
      setQrSaving(false);
    }
  };

  // ─── Screenshot ──────────────────────────────────────────────────────────────

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImgMime(file.type || 'image/jpeg');
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      setImgPreview(dataUrl);
      setImgBase64(dataUrl.split(',')[1]);
    };
    reader.readAsDataURL(file);
    setImportItems([]);
    setChecked([]);
  };

  const handleParseScreenshot = async () => {
    if (!imgBase64) return;
    setParsing(true);
    try {
      const items = await parseScreenshot(imgBase64, imgMime);
      if (items.length === 0) {
        show('No transactions found in image — try a clearer screenshot', 'info');
      } else {
        setImportItems(items);
        // Auto-select only debits (expenses), not credits
        setChecked(items.map((item, i) => (item.type !== 'credit' ? i : null)).filter((x) => x !== null));
      }
    } catch (err) {
      console.error('[AddExpense] screenshot parse error:', err);
      show(err.message || 'AI parsing failed — try again', 'error');
    } finally {
      setParsing(false);
    }
  };

  const handleImportSelected = async () => {
    if (checked.length === 0) return;
    setSaving(true);
    try {
      const toImport = checked.map((i) => importItems[i]);
      const txs = toImport.map((item) =>
        createTransaction({
          amount: item.amount,
          category: item.categoryGuess || 'other',
          subcategory: 'phonepe',
          description: item.merchant || 'Screenshot import',
          date: new Date().toISOString(),
          source: 'screenshot',
        })
      );
      await api.post('/transactions', txs);
      show(`Imported ${txs.length} transaction${txs.length > 1 ? 's' : ''}`, 'success');
      setTimeout(() => navigate('/transactions'), 900);
    } catch (err) {
      console.error('[AddExpense] import error:', err);
      show('Failed to save transactions — please try again', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ─── Manual Save ─────────────────────────────────────────────────────────────

  const handleSave = async () => {
    const amt = parseFloat(form.amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      show('Enter a valid amount greater than zero', 'error');
      return;
    }
    if (!form.description.trim()) {
      show('Enter a description', 'error');
      return;
    }

    setSaving(true);
    try {
      const isFriend = form.category === 'friend_gave';
      const tx = createTransaction({
        amount: amt,
        category: form.category,
        subcategory: form.subcategory,
        description: form.description.trim(),
        date: new Date(form.date).toISOString(),
        friendName: isFriend ? (form.friendName.trim() || null) : null,
        type: isFriend ? 'friend_gave' : 'expense',
        source: form.source || 'manual',
        qrId: form.qrId || null,
      });
      await api.post('/transactions', tx);
      show('Saved!', 'success');
      setTimeout(() => navigate('/'), 800);
    } catch (err) {
      console.error('[AddExpense] saveTransaction error:', err);
      show(err.message || 'Failed to save — please try again', 'error');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = (field) =>
    `w-full border rounded-btn px-4 py-3 text-[13px] bg-[#F8F7F2] text-[#1F2937] focus:outline-none transition-all ${
      aiFields.has(field) ? 'ai-filled' : 'border-[#E2E8F0] focus:border-[#D4AF37]'
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
        <h1 className="text-white text-[24px] font-bold tracking-tight relative z-10">Add Expense</h1>
        <p className="text-[#8BAD5C] text-[13px] mt-1 relative z-10">Voice, screenshot, or manual</p>
      </div>

      <div className="px-4 mt-4">
        {/* Segmented Control Tabs */}
        <div
          className="flex bg-white rounded-card p-1 mb-5 gap-1"
          style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}
        >
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-[10px] text-[13px] font-semibold transition-all duration-200 ${
                activeTab === id
                  ? 'bg-[#556B2F] text-white shadow-sm'
                  : 'text-[#94A3B8] hover:text-[#556B2F]'
              }`}
            >
              <Icon size={14} strokeWidth={activeTab === id ? 2.5 : 1.8} />
              {label}
            </button>
          ))}
        </div>

        {/* Voice Tab */}
        {activeTab === 'voice' && (
          <div className="space-y-3">
            <div
              className="bg-white rounded-card p-6 mb-0"
              style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
            >
              <p className="text-[13px] text-[#4B5563] text-center mb-6 leading-relaxed">
                Speak naturally —{' '}
                <span className="font-semibold text-[#556B2F]">"spent 80 on canteen"</span>
              </p>
              <div className="flex justify-center mb-5">
                <VoiceButton
                  onResult={handleVoiceResult}
                  onError={(msg) => show(msg, 'error')}
                />
              </div>
              <p className="text-[11.5px] text-[#94A3B8] text-center leading-relaxed">
                Try: "gave 200 to Rahul cash" · "50 auto PhonePe"
              </p>
            </div>

            {/* QR Scan — dedicated feature card */}
            <div
              className="bg-white rounded-card p-4"
              style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#EDF2E4] flex items-center justify-center">
                    <Camera size={18} className="text-[#556B2F]" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-[#1F2937]">Scan QR code</p>
                    <p className="text-[11px] text-[#94A3B8] mt-0.5">Auto-fill from saved tags</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowQR(true)}
                  className="px-4 py-2 bg-[#556B2F] text-white text-[12px] font-semibold rounded-pill active:scale-95 transition-transform"
                >
                  Scan
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Screenshot Tab */}
        {activeTab === 'screenshot' && (
          <div className="bg-white rounded-card p-4 mb-4" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            {!imgPreview ? (
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-[#E2E8F0] rounded-xl p-10 flex flex-col items-center gap-3 cursor-pointer hover:border-[#D4AF37] transition-colors"
              >
                <div className="w-14 h-14 bg-[#EDF2E4] rounded-2xl flex items-center justify-center">
                  <Image size={26} className="text-[#556B2F]" />
                </div>
                <div className="text-center">
                  <p className="text-[13px] font-semibold text-[#4B5563]">Tap to select a screenshot</p>
                  <p className="text-[11.5px] text-[#94A3B8] mt-0.5">FamPay or PhonePe transaction history</p>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            ) : (
              <div>
                <div className="flex items-start gap-3 mb-4">
                  <img
                    src={imgPreview}
                    className="w-20 h-20 object-cover rounded-xl border border-[#E2E8F0]"
                    alt="preview"
                  />
                  <div className="flex-1">
                    <p className="text-[13px] font-semibold text-[#1F2937] mb-2">Screenshot selected</p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleParseScreenshot}
                        disabled={parsing}
                        className="flex items-center gap-1.5 bg-[#556B2F] text-white px-3 py-2 rounded-btn text-[12px] font-semibold disabled:opacity-60 active:scale-95 transition-transform"
                      >
                        {parsing ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Sparkles size={12} />
                        )}
                        {parsing ? 'Reading…' : 'Read with AI'}
                      </button>
                      <button
                        onClick={() => {
                          setImgPreview(null);
                          setImgBase64(null);
                          setImportItems([]);
                          setChecked([]);
                        }}
                        className="border border-[#E2E8F0] text-[#94A3B8] px-3 py-2 rounded-btn text-[12px] font-medium"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                </div>

                {importItems.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-2">
                      Found {importItems.length} transaction{importItems.length > 1 ? 's' : ''}
                    </p>
                    <div className="space-y-2 mb-4">
                      {importItems.map((item, i) => (
                        <div key={i} className="flex items-center gap-2 p-3 bg-[#F8F7F2] rounded-xl border border-[#EAECF0]">
                          <input
                            type="checkbox"
                            checked={checked.includes(i)}
                            onChange={() =>
                              setChecked((prev) =>
                                prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]
                              )
                            }
                            className="w-4 h-4 accent-[#556B2F]"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold text-[#1F2937] truncate">
                              {item.merchant}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span
                                className={`text-[12px] font-mono-nums font-bold ${
                                  item.type === 'credit' ? 'text-[#22C55E]' : 'text-[#EF4444]'
                                }`}
                              >
                                {item.type === 'credit' ? '+' : '−'}₹{item.amount}
                              </span>
                              {item.date && (
                                <span className="text-[11px] text-[#94A3B8]">{item.date}</span>
                              )}
                            </div>
                          </div>
                          <select
                            value={item.categoryGuess || 'other'}
                            onChange={(e) => {
                              const copy = [...importItems];
                              copy[i] = { ...copy[i], categoryGuess: e.target.value };
                              setImportItems(copy);
                            }}
                            className="text-[11px] border border-[#E2E8F0] rounded-btn px-2 py-1 bg-white"
                          >
                            {CATEGORIES.filter((c) => c.id !== 'friend_gave').map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={handleImportSelected}
                      disabled={checked.length === 0 || saving}
                      className="w-full bg-[#556B2F] text-white py-3.5 rounded-btn font-semibold text-[13px] disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                    >
                      {saving ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Check size={16} />
                      )}
                      Import {checked.length} selected
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Manual Form */}
        {activeTab === 'manual' && (
          <div className="bg-white rounded-card p-4 mb-4" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            {aiFields.size > 0 && (
              <div className="flex items-center gap-2.5 bg-[#F0FDF4] border border-[#A7F3D0] rounded-xl p-3 mb-5">
                <div className="w-2 h-2 bg-[#22C55E] rounded-full flex-shrink-0" />
                <p className="text-[12px] text-[#166534] font-semibold">
                  AI-filled fields highlighted — review before saving
                </p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider block mb-2">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={form.amount}
                  onChange={(e) => setField('amount', e.target.value)}
                  className={inputClass('amount')}
                  style={{ fontSize: 22, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}
                  inputMode="numeric"
                  min="0"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider block mb-2">
                  Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Canteen lunch"
                  value={form.description}
                  onChange={(e) => setField('description', e.target.value)}
                  className={inputClass('description')}
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider block mb-2">
                  Category
                </label>
                <select
                  value={form.category}
                  onChange={(e) => setField('category', e.target.value)}
                  className={inputClass('category')}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              {form.category === 'friend_gave' && (
                <div>
                  <label className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider block mb-2">
                    Friend's name
                  </label>
                  <input
                    type="text"
                    placeholder="Rahul, Priya…"
                    value={form.friendName}
                    onChange={(e) => setField('friendName', e.target.value)}
                    className={inputClass('friendName')}
                  />
                </div>
              )}

              <div>
                <label className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider block mb-2">
                  Payment mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_MODES.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setField('subcategory', m.id)}
                      className={`py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-150 border ${
                        form.subcategory === m.id
                          ? 'border-[#556B2F] bg-[#EDF2E4] text-[#3D4A20] shadow-sm'
                          : 'border-[#EAECF0] text-[#4B5563] hover:border-[#C8D6B0]'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider block mb-2">
                  Date &amp; time
                </label>
                <input
                  type="datetime-local"
                  value={form.date}
                  onChange={(e) => setField('date', e.target.value)}
                  className={inputClass('date')}
                />
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving || !form.amount || !form.description}
              className="mt-6 w-full bg-[#556B2F] text-white py-4 rounded-btn font-bold text-[14px] disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-sm"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} strokeWidth={2.5} />}
              Save expense
            </button>
          </div>
        )}
      </div>

      {/* QR Scanner Modal */}
      {showQR && <QRScanner onScan={handleQRScan} onClose={() => setShowQR(false)} />}

      {/* QR Name Modal */}
      {qrModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center">
          <div className="bg-white w-full max-w-md rounded-t-[20px] p-6 pb-8 sheet-enter">
            <div className="w-10 h-1 bg-[#E2E8F0] rounded-full mx-auto mb-5" />
            <h3 className="text-[16px] font-bold text-[#1F2937] mb-1">Name this QR code</h3>
            <p className="text-[11px] text-[#94A3B8] mb-4 font-mono-nums truncate">
              {qrModal.decoded.slice(0, 50)}
            </p>
            <input
              type="text"
              placeholder="e.g. College canteen"
              value={qrLabel}
              onChange={(e) => setQrLabel(e.target.value)}
              className="w-full border border-[#E2E8F0] rounded-btn px-4 py-3 text-[13px] mb-3 focus:outline-none focus:border-[#D4AF37] bg-[#F8F7F2]"
              autoFocus
            />
            <select
              value={qrCat}
              onChange={(e) => setQrCat(e.target.value)}
              className="w-full border border-[#E2E8F0] rounded-btn px-4 py-3 text-[13px] mb-4 bg-[#F8F7F2]"
            >
              {CATEGORIES.filter((c) => c.id !== 'friend_gave').map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
            <div className="flex gap-3">
              <button
                onClick={() => setQrModal(null)}
                className="flex-1 border border-[#E2E8F0] text-[#4B5563] py-3 rounded-btn text-[13px] font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveQRTag}
                disabled={!qrLabel.trim() || qrSaving}
                className="flex-1 bg-[#556B2F] text-white py-3 rounded-btn text-[13px] font-bold disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
              >
                {qrSaving && <Loader2 size={14} className="animate-spin" />}
                Save &amp; continue
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onDismiss={dismiss} />}
    </div>
  );
}
