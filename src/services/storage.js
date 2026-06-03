const TRANSACTIONS_KEY = 'pp_transactions';
const QRTAGS_KEY = 'pp_qrtags';
const LAST_SUMMARY_KEY = 'pp_last_summary_date';

// ── Transactions ─────────────────────────────────────────────────────────────

export function getTransactions() {
  try {
    const raw = localStorage.getItem(TRANSACTIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveTransaction(tx) {
  try {
    const list = getTransactions();
    list.unshift(tx);
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

export function saveTransactions(txList) {
  try {
    const existing = getTransactions();
    const combined = [...txList, ...existing];
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(combined));
    return true;
  } catch {
    return false;
  }
}

export function deleteTransaction(id) {
  try {
    const list = getTransactions().filter(t => t.id !== id);
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

export function clearTransactions() {
  try {
    localStorage.removeItem(TRANSACTIONS_KEY);
    return true;
  } catch {
    return false;
  }
}

// ── QR Tags ───────────────────────────────────────────────────────────────────

export function getQRTags() {
  try {
    const raw = localStorage.getItem(QRTAGS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveQRTag(hash, tag) {
  try {
    const tags = getQRTags();
    tags[hash] = tag;
    localStorage.setItem(QRTAGS_KEY, JSON.stringify(tags));
    return true;
  } catch {
    return false;
  }
}

export function incrementQRTagScan(hash) {
  try {
    const tags = getQRTags();
    if (tags[hash]) {
      tags[hash].timesScanned = (tags[hash].timesScanned || 0) + 1;
      localStorage.setItem(QRTAGS_KEY, JSON.stringify(tags));
    }
  } catch {
    // ignore
  }
}

export function deleteQRTag(hash) {
  try {
    const tags = getQRTags();
    delete tags[hash];
    localStorage.setItem(QRTAGS_KEY, JSON.stringify(tags));
    return true;
  } catch {
    return false;
  }
}

export function clearQRTags() {
  try {
    localStorage.removeItem(QRTAGS_KEY);
    return true;
  } catch {
    return false;
  }
}

// ── Weekly Summary ────────────────────────────────────────────────────────────

export function getLastSummaryDate() {
  try {
    return localStorage.getItem(LAST_SUMMARY_KEY) || null;
  } catch {
    return null;
  }
}

export function setLastSummaryDate(dateStr) {
  try {
    localStorage.setItem(LAST_SUMMARY_KEY, dateStr);
  } catch {
    // ignore
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getUniqueFriendNames() {
  const txs = getTransactions();
  const names = new Set();
  for (const tx of txs) {
    if (tx.friendName) names.add(tx.friendName);
  }
  return Array.from(names);
}

export function getFriendBalance(name) {
  const txs = getTransactions().filter(t => t.friendName === name);
  let balance = 0;
  for (const tx of txs) {
    if (tx.type === 'friend_received') balance += tx.amount;
    else if (tx.type === 'friend_gave') balance -= tx.amount;
    else if (tx.type === 'settlement') {
      // settlements self-correct the balance
    }
  }
  return balance;
}

export function getWeekRange() {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = (day === 0 ? -6 : 1 - day);
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { start: monday, end: sunday };
}

export function isSummaryGeneratedThisWeek() {
  const lastDate = getLastSummaryDate();
  if (!lastDate) return false;
  const last = new Date(lastDate);
  const { start } = getWeekRange();
  return last >= start;
}
