import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, Image, Keyboard, Camera, Plus, Check, Loader2, Sparkles } from 'lucide-react';
import VoiceButton from '../components/VoiceButton';
import QRScanner from '../components/QRScanner';
import { Toast, useToast } from '../components/Toast';
import { CATEGORIES, PAYMENT_MODES } from '../data/categories';
import { createTransaction } from '../data/schema';
import {
  saveTransaction,
  saveTransactions,
  getQRTag,
  saveQRTag,
  incrementQRTagScan,
} from '../services/storage';
import { parseScreenshot } from '../services/screenshotParser';

const TABS = [
  { id: 'voice', label: 'Voice', icon: Mic },
  { id: 'screenshot', label: 'Screenshot', icon: Image },
  { id: 'manual', label: 'Manual', icon: Keyboard },
];

function qrHash(str) {
  // Use first 32 chars, replace non-word chars for a stable, filesystem-safe hash
  return str.slice(0, 32).replace(/\W/g, '_');
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
      const tag = await getQRTag(hash);
      if (tag) {
        await incrementQRTagScan(hash);
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
      const saved = await saveQRTag(qrModal.hash, {
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
      await saveTransactions(txs);
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
      await saveTransaction(tx);
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
    `w-full border rounded-btn px-3 py-3 text-sm bg-[#F8F7F2] text-[#1F2937] focus:outline-none transition-all ${
      aiFields.has(field) ? 'ai-filled' : 'border-[#E2E8F0] focus:border-[#D4AF37]'
    }`;

  return (
    <div className="min-h-screen bg-[#F8F7F2] pb-28">
      {/* Header */}
      <div className="bg-[#556B2F] px-4 pt-12 pb-6">
        <h1 className="text-white text-xl font-bold">Add Expense</h1>
        <p className="text-[#B8C37E] text-sm mt-1">Voice, screenshot, or manual</p>
      </div>

      <div className="px-4 mt-4">
        {/* Tabs */}
        <div className="flex bg-white rounded-card border border-[#E2E8F0] p-1 mb-6 gap-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-btn text-sm font-medium transition-colors ${
                activeTab === id ? 'bg-[#556B2F] text-white' : 'text-[#94A3B8] hover:text-[#4B5563]'
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        {/* Voice Tab */}
        {activeTab === 'voice' && (
          <div className="bg-white rounded-card border border-[#E2E8F0] p-6 mb-4">
            <p className="text-sm text-[#4B5563] text-center mb-6">
              Speak naturally —{' '}
              <span className="font-medium text-[#556B2F]">"spent 80 on canteen"</span>
            </p>
            <div className="flex justify-center mb-4">
              <VoiceButton
                onResult={handleVoiceResult}
                onError={(msg) => show(msg, 'error')}
              />
            </div>
            <p className="text-xs text-[#94A3B8] text-center">
              Also: "gave 200 to Rahul cash" · "50 auto PhonePe"
            </p>

            {/* QR Scan Button */}
            <div className="mt-6 pt-6 border-t border-[#E2E8F0] flex justify-center">
              <button
                onClick={() => setShowQR(true)}
                className="flex items-center gap-2 border border-[#556B2F] text-[#556B2F] px-5 py-2.5 rounded-btn text-sm font-medium hover:bg-[#F8F7F2] transition-colors"
              >
                <Camera size={16} />
                Scan QR code
              </button>
            </div>
          </div>
        )}

        {/* Screenshot Tab */}
        {activeTab === 'screenshot' && (
          <div className="bg-white rounded-card border border-[#E2E8F0] p-4 mb-4">
            {!imgPreview ? (
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-[#E2E8F0] rounded-btn p-8 flex flex-col items-center gap-3 cursor-pointer hover:border-[#D4AF37] transition-colors"
              >
                <div className="w-12 h-12 bg-[#F8F7F2] rounded-full flex items-center justify-center">
                  <Image size={24} className="text-[#556B2F]" />
                </div>
                <p className="text-sm font-medium text-[#4B5563]">Tap to select a screenshot</p>
                <p className="text-xs text-[#94A3B8]">FamPay or PhonePe transaction history</p>
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
                    className="w-20 h-20 object-cover rounded-btn border border-[#E2E8F0]"
                    alt="preview"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#1F2937] mb-2">Screenshot selected</p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleParseScreenshot}
                        disabled={parsing}
                        className="flex items-center gap-1.5 bg-[#556B2F] text-white px-3 py-2 rounded-btn text-xs font-medium disabled:opacity-60"
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
                        className="border border-[#E2E8F0] text-[#94A3B8] px-3 py-2 rounded-btn text-xs"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                </div>

                {importItems.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wide mb-2">
                      Found {importItems.length} transaction{importItems.length > 1 ? 's' : ''}
                    </p>
                    <div className="space-y-2 mb-4">
                      {importItems.map((item, i) => (
                        <div key={i} className="flex items-center gap-2 p-3 bg-[#F8F7F2] rounded-btn border border-[#E2E8F0]">
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
                            <p className="text-sm font-medium text-[#1F2937] truncate">
                              {item.merchant}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span
                                className={`text-xs font-mono-nums font-semibold ${
                                  item.type === 'credit' ? 'text-[#22C55E]' : 'text-[#EF4444]'
                                }`}
                              >
                                {item.type === 'credit' ? '+' : '−'}₹{item.amount}
                              </span>
                              {item.date && (
                                <span className="text-xs text-[#94A3B8]">{item.date}</span>
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
                            className="text-xs border border-[#E2E8F0] rounded-btn px-2 py-1 bg-white"
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
                      className="w-full bg-[#556B2F] text-white py-3 rounded-btn font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
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
          <div className="bg-white rounded-card border border-[#E2E8F0] p-4 mb-4">
            {aiFields.size > 0 && (
              <div className="flex items-center gap-2 bg-[#F8F7F2] border border-[#D4AF37] rounded-btn p-3 mb-4">
                <div className="w-2 h-2 bg-[#D4AF37] rounded-full" />
                <p className="text-xs text-[#556B2F] font-medium">
                  AI-filled fields highlighted in gold — review before saving
                </p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wide block mb-1.5">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={form.amount}
                  onChange={(e) => setField('amount', e.target.value)}
                  className={inputClass('amount')}
                  style={{ fontSize: 20, fontFamily: 'JetBrains Mono, monospace' }}
                  inputMode="numeric"
                  min="0"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wide block mb-1.5">
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
                <label className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wide block mb-1.5">
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
                  <label className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wide block mb-1.5">
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
                <label className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wide block mb-1.5">
                  Payment mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_MODES.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setField('subcategory', m.id)}
                      className={`py-2.5 rounded-btn text-sm font-medium transition-colors border ${
                        form.subcategory === m.id
                          ? 'border-[#556B2F] bg-[#F8F7F2] text-[#556B2F]'
                          : 'border-[#E2E8F0] text-[#4B5563]'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wide block mb-1.5">
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
              className="mt-6 w-full bg-[#556B2F] text-white py-3.5 rounded-btn font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
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
          <div className="bg-white w-full max-w-md rounded-t-2xl p-6 sheet-enter">
            <h3 className="text-base font-bold text-[#1F2937] mb-1">Name this QR code</h3>
            <p className="text-xs text-[#94A3B8] mb-4 font-mono-nums truncate">
              {qrModal.decoded.slice(0, 50)}
            </p>
            <input
              type="text"
              placeholder="e.g. College canteen"
              value={qrLabel}
              onChange={(e) => setQrLabel(e.target.value)}
              className="w-full border border-[#E2E8F0] rounded-btn px-3 py-3 text-sm mb-3 focus:outline-none focus:border-[#D4AF37]"
              autoFocus
            />
            <select
              value={qrCat}
              onChange={(e) => setQrCat(e.target.value)}
              className="w-full border border-[#E2E8F0] rounded-btn px-3 py-3 text-sm mb-4 bg-[#F8F7F2]"
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
                className="flex-1 border border-[#E2E8F0] text-[#4B5563] py-3 rounded-btn text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveQRTag}
                disabled={!qrLabel.trim() || qrSaving}
                className="flex-1 bg-[#556B2F] text-white py-3 rounded-btn text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
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
