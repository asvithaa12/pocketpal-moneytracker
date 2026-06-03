import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, Image, Keyboard, Camera, Plus, Check, X, Loader2, Sparkles } from 'lucide-react';
import VoiceButton from '../components/VoiceButton';
import QRScanner from '../components/QRScanner';
import { Toast, useToast } from '../components/Toast';
import { CATEGORIES, PAYMENT_MODES } from '../data/categories';
import { createTransaction } from '../data/schema';
import { saveTransaction, getQRTags, saveQRTag, incrementQRTagScan } from '../services/storage';
import { parseScreenshot } from '../services/screenshotParser';

const TABS = [
  { id: 'voice', label: 'Voice', icon: Mic },
  { id: 'screenshot', label: 'Screenshot', icon: Image },
  { id: 'manual', label: 'Manual', icon: Keyboard },
];

function qrHash(str) {
  return str.slice(0, 20).replace(/\W/g, '_');
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

  const setField = (key, value, fromAI = false) => {
    setForm(f => ({ ...f, [key]: value }));
    if (fromAI) {
      setAiFields(prev => new Set([...prev, key]));
    } else {
      setAiFields(prev => { const s = new Set(prev); s.delete(key); return s; });
    }
  };

  const handleVoiceResult = ({ raw, parsed }) => {
    if (!parsed) {
      setField('description', raw, false);
      setActiveTab('manual');
      return;
    }
    const newAI = new Set();
    if (parsed.amount) { setForm(f => ({ ...f, amount: String(parsed.amount) })); newAI.add('amount'); }
    if (parsed.category) { setForm(f => ({ ...f, category: parsed.category })); newAI.add('category'); }
    if (parsed.subcategory) { setForm(f => ({ ...f, subcategory: parsed.subcategory })); newAI.add('subcategory'); }
    if (parsed.description) { setForm(f => ({ ...f, description: parsed.description })); newAI.add('description'); }
    if (parsed.friendName) { setForm(f => ({ ...f, friendName: parsed.friendName })); newAI.add('friendName'); }
    setAiFields(newAI);
    setForm(f => ({ ...f, source: 'voice' }));
    setActiveTab('manual');
  };

  const handleQRScan = (decoded) => {
    setShowQR(false);
    const hash = qrHash(decoded);
    const tags = getQRTags();
    if (tags[hash]) {
      incrementQRTagScan(hash);
      setForm(f => ({
        ...f,
        category: tags[hash].categoryId,
        description: tags[hash].label,
        source: 'qr',
        qrId: hash,
      }));
      setAiFields(new Set(['category', 'description']));
      show(`Recognised: ${tags[hash].label}`, 'success');
      setActiveTab('manual');
    } else {
      setQrModal({ hash, decoded });
      setQrLabel('');
      setQrCat('food');
    }
  };

  const handleSaveQRTag = () => {
    if (!qrLabel.trim() || !qrModal) return;
    saveQRTag(qrModal.hash, { label: qrLabel, categoryId: qrCat, timesScanned: 1 });
    setForm(f => ({
      ...f,
      category: qrCat,
      description: qrLabel,
      source: 'qr',
      qrId: qrModal.hash,
    }));
    setAiFields(new Set(['category', 'description']));
    setQrModal(null);
    setActiveTab('manual');
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImgMime(file.type || 'image/jpeg');
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      setImgPreview(dataUrl);
      const base64 = dataUrl.split(',')[1];
      setImgBase64(base64);
    };
    reader.readAsDataURL(file);
    setImportItems([]);
  };

  const handleParseScreenshot = async () => {
    if (!imgBase64) return;
    setParsing(true);
    try {
      const items = await parseScreenshot(imgBase64, imgMime);
      if (items.length === 0) {
        show('No transactions found in image', 'info');
      } else {
        setImportItems(items);
        setChecked(items.map((_, i) => i));
      }
    } catch {
      show('AI parsing failed. Try again.', 'error');
    } finally {
      setParsing(false);
    }
  };

  const handleImportSelected = () => {
    const toImport = checked.map(i => importItems[i]);
    const txs = toImport.map(item => createTransaction({
      amount: item.amount || 0,
      category: item.categoryGuess || 'other',
      subcategory: 'phonepe',
      description: item.merchant || 'Screenshot import',
      date: item.date ? new Date(item.date).toISOString() : new Date().toISOString(),
      source: 'screenshot',
    }));
    for (const tx of txs) saveTransaction(tx);
    show(`Imported ${txs.length} transaction${txs.length > 1 ? 's' : ''}`, 'success');
    setTimeout(() => navigate('/transactions'), 1000);
  };

  const handleSave = () => {
    const amt = parseFloat(form.amount);
    if (!amt || amt <= 0) { show('Enter a valid amount', 'error'); return; }
    if (!form.description) { show('Enter a description', 'error'); return; }
    setSaving(true);
    const isFreind = form.category === 'friend_gave';
    const tx = createTransaction({
      amount: amt,
      category: form.category,
      subcategory: form.subcategory,
      description: form.description,
      date: new Date(form.date).toISOString(),
      friendName: isFreind ? (form.friendName || null) : null,
      type: isFreind ? 'friend_gave' : 'expense',
      source: form.source || 'manual',
      qrId: form.qrId || null,
    });
    saveTransaction(tx);
    show('Saved!', 'success');
    setTimeout(() => navigate('/'), 800);
    setSaving(false);
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
        <p className="text-[#86EFAC] text-sm mt-1">Voice, screenshot, or manual</p>
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
              Speak naturally — <span className="font-medium text-[#556B2F]">"spent 80 on canteen"</span>
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
                className="border-2 border-dashed border-[#E2E8F0] rounded-btn p-8 flex flex-col items-center gap-3 cursor-pointer hover:border-[#22C55E] transition-colors"
              >
                <div className="w-12 h-12 bg-[#F8F7F2] rounded-full flex items-center justify-center">
                  <Image size={24} className="text-[#556B2F]" />
                </div>
                <p className="text-sm font-medium text-[#4B5563]">Tap to select a screenshot</p>
                <p className="text-xs text-[#94A3B8]">FamPay or PhonePe transaction history</p>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              </div>
            ) : (
              <div>
                <div className="flex items-start gap-3 mb-4">
                  <img src={imgPreview} className="w-20 h-20 object-cover rounded-btn border border-[#E2E8F0]" alt="preview" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#334155] mb-2">Screenshot selected</p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleParseScreenshot}
                        disabled={parsing}
                        className="flex items-center gap-1.5 bg-[#556B2F] text-white px-3 py-2 rounded-btn text-xs font-medium disabled:opacity-60"
                      >
                        {parsing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                        Read with AI
                      </button>
                      <button
                        onClick={() => { setImgPreview(null); setImgBase64(null); setImportItems([]); }}
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
                      Found {importItems.length} transactions
                    </p>
                    <div className="space-y-2 mb-4">
                      {importItems.map((item, i) => (
                        <div key={i} className="flex items-center gap-2 p-3 bg-[#F1F5F9] rounded-btn">
                          <input
                            type="checkbox"
                            checked={checked.includes(i)}
                            onChange={() => setChecked(prev =>
                              prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]
                            )}
                            className="w-4 h-4 accent-[#556B2F]"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[#0F172A] truncate">{item.merchant}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-xs font-mono-nums font-semibold ${item.type === 'credit' ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                                {item.type === 'credit' ? '+' : '−'}₹{item.amount}
                              </span>
                              {item.date && <span className="text-xs text-[#94A3B8]">{item.date}</span>}
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
                            {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                          </select>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={handleImportSelected}
                      disabled={checked.length === 0}
                      className="w-full bg-[#556B2F] text-white py-3 rounded-btn font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <Check size={16} />
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
                <p className="text-xs text-[#556B2F] font-medium">AI-filled fields highlighted in gold — review before saving</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wide block mb-1.5">Amount (₹)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={form.amount}
                  onChange={e => setField('amount', e.target.value)}
                  className={inputClass('amount')}
                  style={{ fontSize: 20, fontFamily: 'JetBrains Mono, monospace' }}
                  inputMode="numeric"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wide block mb-1.5">Description</label>
                <input
                  type="text"
                  placeholder="e.g. Canteen lunch"
                  value={form.description}
                  onChange={e => setField('description', e.target.value)}
                  className={inputClass('description')}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wide block mb-1.5">Category</label>
                <select
                  value={form.category}
                  onChange={e => setField('category', e.target.value)}
                  className={inputClass('category')}
                >
                  {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>

              {form.category === 'friend_gave' && (
                <div>
                  <label className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wide block mb-1.5">Friend's name</label>
                  <input
                    type="text"
                    placeholder="Rahul, Priya…"
                    value={form.friendName}
                    onChange={e => setField('friendName', e.target.value)}
                    className={inputClass('friendName')}
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wide block mb-1.5">Payment mode</label>
                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_MODES.map(m => (
                    <button
                      key={m.id}
                      onClick={() => setField('subcategory', m.id)}
                      className={`py-2.5 rounded-btn text-sm font-medium transition-colors border ${
                        form.subcategory === m.id
                          ? 'border-[#15803D] bg-[#F0FDF4] text-[#15803D]'
                          : 'border-[#E2E8F0] text-[#334155]'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wide block mb-1.5">Date & time</label>
                <input
                  type="datetime-local"
                  value={form.date}
                  onChange={e => setField('date', e.target.value)}
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
      {showQR && (
        <QRScanner
          onScan={handleQRScan}
          onClose={() => setShowQR(false)}
        />
      )}

      {/* QR Name Modal */}
      {qrModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center">
          <div className="bg-white w-full max-w-md rounded-t-2xl p-6 sheet-enter">
            <h3 className="text-base font-bold text-[#0F172A] mb-1">Name this QR code</h3>
            <p className="text-xs text-[#94A3B8] mb-4 font-mono-nums truncate">{qrModal.decoded.slice(0, 40)}…</p>
            <input
              type="text"
              placeholder="e.g. College canteen"
              value={qrLabel}
              onChange={e => setQrLabel(e.target.value)}
              className="w-full border border-[#E2E8F0] rounded-btn px-3 py-3 text-sm mb-3 focus:outline-none focus:border-[#22C55E]"
              autoFocus
            />
            <select
              value={qrCat}
              onChange={e => setQrCat(e.target.value)}
              className="w-full border border-[#E2E8F0] rounded-btn px-3 py-3 text-sm mb-4 bg-[#F1F5F9]"
            >
              {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            <div className="flex gap-3">
              <button
                onClick={() => setQrModal(null)}
                className="flex-1 border border-[#E2E8F0] text-[#334155] py-3 rounded-btn text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveQRTag}
                disabled={!qrLabel.trim()}
                className="flex-1 bg-[#556B2F] text-white py-3 rounded-btn text-sm font-semibold disabled:opacity-50"
              >
                Save & continue
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onDismiss={dismiss} />}
    </div>
  );
}

