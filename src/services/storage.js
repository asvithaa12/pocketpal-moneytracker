/**
 * storage.js — Supabase-backed data layer.
 * Supabase is the single source of truth for transactions and qr_tags.
 * localStorage is used only for the weekly summary text cache.
 */

import { supabase } from './supabaseClient';

// ─── Transactions ────────────────────────────────────────────────────────────

/**
 * Fetch all transactions ordered by date descending.
 * Returns [] on error.
 */
export async function getTransactions() {
  console.log('[storage] getTransactions');
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .order('date', { ascending: false });

  if (error) {
    console.error('[storage] getTransactions error:', error.message);
    return [];
  }
  return data.map(dbRowToTx);
}

/**
 * Save a single transaction to Supabase.
 * Returns the saved transaction (with server-assigned id) or throws.
 */
export async function saveTransaction(tx) {
  const row = txToDbRow(tx);
  console.log('[storage] saveTransaction', row);
  if (!supabase) throw new Error('Supabase not configured');

  const { data, error } = await supabase
    .from('transactions')
    .insert(row)
    .select()
    .single();

  if (error) {
    console.error('[storage] saveTransaction error:', error.message);
    throw error;
  }
  console.log('[storage] saveTransaction success:', data.id);
  return dbRowToTx(data);
}

/**
 * Save multiple transactions (batch insert).
 */
export async function saveTransactions(txList) {
  const rows = txList.map(txToDbRow);
  console.log('[storage] saveTransactions batch:', rows.length);
  if (!supabase) throw new Error('Supabase not configured');

  const { data, error } = await supabase
    .from('transactions')
    .insert(rows)
    .select();

  if (error) {
    console.error('[storage] saveTransactions error:', error.message);
    throw error;
  }
  return data.map(dbRowToTx);
}

/**
 * Delete a transaction by id.
 */
export async function deleteTransaction(id) {
  console.log('[storage] deleteTransaction', id);
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.from('transactions').delete().eq('id', id);
  if (error) {
    console.error('[storage] deleteTransaction error:', error.message);
    throw error;
  }
}

/**
 * Delete all transactions.
 */
export async function clearTransactions() {
  console.log('[storage] clearTransactions');
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase
    .from('transactions')
    .delete()
    .not('id', 'is', null);
  if (error) {
    console.error('[storage] clearTransactions error:', error.message);
    throw error;
  }
}

// ─── QR Tags ─────────────────────────────────────────────────────────────────

/**
 * Look up a QR tag by hash. Returns the tag object or null.
 */
export async function getQRTag(hash) {
  console.log('[storage] getQRTag', hash);
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('qr_tags')
    .select('*')
    .eq('hash', hash)
    .maybeSingle();

  if (error) {
    console.error('[storage] getQRTag error:', error.message);
    return null;
  }
  if (!data) {
    console.log('[storage] getQRTag not found:', hash);
    return null;
  }
  return dbRowToQRTag(data);
}

/**
 * Fetch all QR tags (for settings page) as an object keyed by hash.
 */
export async function getQRTags() {
  console.log('[storage] getQRTags');
  if (!supabase) return {};
  const { data, error } = await supabase
    .from('qr_tags')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[storage] getQRTags error:', error.message);
    return {};
  }
  return Object.fromEntries(data.map((row) => [row.hash, dbRowToQRTag(row)]));
}

/**
 * Save a new QR tag. Returns the saved tag.
 */
export async function saveQRTag(hash, tag) {
  console.log('[storage] saveQRTag', hash, tag);
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase
    .from('qr_tags')
    .insert({
      hash,
      label: tag.label,
      category_id: tag.categoryId,
      times_scanned: 1,
    })
    .select()
    .single();

  if (error) {
    console.error('[storage] saveQRTag error:', error.message);
    throw error;
  }
  console.log('[storage] saveQRTag success:', data.id);
  return dbRowToQRTag(data);
}

/**
 * Increment the times_scanned counter for a QR tag.
 */
export async function incrementQRTagScan(hash) {
  console.log('[storage] incrementQRTagScan', hash);
  if (!supabase) return;

  const { data: existing, error: fetchErr } = await supabase
    .from('qr_tags')
    .select('id, times_scanned')
    .eq('hash', hash)
    .maybeSingle();

  if (fetchErr || !existing) {
    console.error('[storage] incrementQRTagScan fetch error:', fetchErr?.message);
    return;
  }

  const { error } = await supabase
    .from('qr_tags')
    .update({ times_scanned: existing.times_scanned + 1 })
    .eq('hash', hash);

  if (error) {
    console.error('[storage] incrementQRTagScan update error:', error.message);
  }
}

/**
 * Update a QR tag label / category (for settings page).
 */
export async function updateQRTag(hash, updates) {
  console.log('[storage] updateQRTag', hash, updates);
  if (!supabase) throw new Error('Supabase not configured');
  const row = {};
  if (updates.label !== undefined) row.label = updates.label;
  if (updates.categoryId !== undefined) row.category_id = updates.categoryId;

  const { error } = await supabase.from('qr_tags').update(row).eq('hash', hash);
  if (error) {
    console.error('[storage] updateQRTag error:', error.message);
    throw error;
  }
}

/**
 * Delete a QR tag by hash.
 */
export async function deleteQRTag(hash) {
  console.log('[storage] deleteQRTag', hash);
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.from('qr_tags').delete().eq('hash', hash);
  if (error) {
    console.error('[storage] deleteQRTag error:', error.message);
    throw error;
  }
}

/**
 * Delete all QR tags.
 */
export async function clearQRTags() {
  console.log('[storage] clearQRTags');
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.from('qr_tags').delete().not('id', 'is', null);
  if (error) {
    console.error('[storage] clearQRTags error:', error.message);
    throw error;
  }
}

// ─── Dashboard statistics ─────────────────────────────────────────────────────

/**
 * Returns dashboard stats: spentThisWeek, cashThisMonth, onlineThisMonth, friendsOweYou
 */
export async function getDashboardStats() {
  console.log('[storage] getDashboardStats');
  if (!supabase) return { spentThisWeek: 0, cashThisMonth: 0, onlineThisMonth: 0, friendsOweYou: 0 };

  const now = new Date();

  // Week boundaries: Monday 00:00
  const dayOfWeek = now.getDay();
  const diffToMon = (dayOfWeek + 6) % 7;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - diffToMon);
  weekStart.setHours(0, 0, 0, 0);

  // Month boundaries
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const { data, error } = await supabase
    .from('transactions')
    .select('type, amount, subcategory, friend_name, date')
    .gte('date', monthStart.toISOString());

  if (error) {
    console.error('[storage] getDashboardStats error:', error.message);
    return { spentThisWeek: 0, cashThisMonth: 0, onlineThisMonth: 0, friendsOweYou: 0 };
  }

  let spentThisWeek = 0;
  let cashThisMonth = 0;
  let onlineThisMonth = 0;
  const friendBalances = {};

  for (const row of data) {
    const rowDate = new Date(row.date);
    const amount = parseFloat(row.amount);

    if (row.type === 'expense') {
      if (rowDate >= weekStart) spentThisWeek += amount;
      if (row.subcategory === 'cash') cashThisMonth += amount;
      if (['fampay', 'phonepe', 'online'].includes(row.subcategory)) onlineThisMonth += amount;
    }

    if (row.type === 'friend_received' && row.friend_name) {
      friendBalances[row.friend_name] = (friendBalances[row.friend_name] || 0) + amount;
    }
    if (row.type === 'friend_gave' && row.friend_name) {
      friendBalances[row.friend_name] = (friendBalances[row.friend_name] || 0) - amount;
    }
    if (row.type === 'settlement' && row.friend_name) {
      friendBalances[row.friend_name] = (friendBalances[row.friend_name] || 0) + amount;
    }
  }

  const friendsOweYou = Object.values(friendBalances)
    .filter((b) => b > 0)
    .reduce((sum, b) => sum + b, 0);

  return {
    spentThisWeek: Math.round(spentThisWeek),
    cashThisMonth: Math.round(cashThisMonth),
    onlineThisMonth: Math.round(onlineThisMonth),
    friendsOweYou: Math.round(friendsOweYou),
  };
}

// ─── Friends ──────────────────────────────────────────────────────────────────

export async function getUniqueFriendNames() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('transactions')
    .select('friend_name')
    .not('friend_name', 'is', null);

  if (error) {
    console.error('[storage] getUniqueFriendNames error:', error.message);
    return [];
  }
  return [...new Set(data.map((r) => r.friend_name).filter(Boolean))];
}

export async function getFriendBalance(name) {
  if (!supabase) return 0;
  const { data, error } = await supabase
    .from('transactions')
    .select('type, amount')
    .eq('friend_name', name);

  if (error) {
    console.error('[storage] getFriendBalance error:', error.message);
    return 0;
  }

  return data.reduce((sum, row) => {
    const amount = parseFloat(row.amount);
    if (row.type === 'friend_received') return sum + amount;
    if (row.type === 'friend_gave') return sum - amount;
    if (row.type === 'settlement') return sum + amount;
    return sum;
  }, 0);
}

// ─── Weekly Summary (localStorage for summary text only) ─────────────────────

const LS_SUMMARY_DATE = 'pp_last_summary_date';

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

export function getLastSummaryDate() {
  return localStorage.getItem(LS_SUMMARY_DATE) || null;
}

export function setLastSummaryDate(dateStr) {
  localStorage.setItem(LS_SUMMARY_DATE, dateStr);
}

export function isSummaryGeneratedThisWeek() {
  const lastDate = getLastSummaryDate();
  if (!lastDate) return false;
  const last = new Date(lastDate);
  const { start } = getWeekRange();
  return last >= start;
}

// ─── Row mappers ──────────────────────────────────────────────────────────────

function txToDbRow(tx) {
  // Never send id — Supabase generates it via gen_random_uuid().
  // Sending a client-generated uuid would cause conflicts on retries.
  return {
    type: tx.type,
    amount: tx.amount,
    category: tx.category,
    subcategory: tx.subcategory,
    description: tx.description,
    date: tx.date,
    friend_name: tx.friendName || null,
    source: tx.source,
    qr_id: tx.qrId || null,
  };
}

function dbRowToTx(row) {
  return {
    id: row.id,
    type: row.type,
    amount: parseFloat(row.amount),
    category: row.category,
    subcategory: row.subcategory,
    description: row.description,
    date: row.date,
    friendName: row.friend_name || null,
    source: row.source,
    qrId: row.qr_id || null,
    createdAt: row.created_at,
  };
}

function dbRowToQRTag(row) {
  return {
    id: row.id,
    hash: row.hash,
    label: row.label,
    categoryId: row.category_id,
    timesScanned: row.times_scanned,
  };
}
