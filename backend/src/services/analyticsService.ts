import { supabase } from '../db/supabase.js';

export class AnalyticsService {
  static async getDashboardStats(userId: string) {
    const now = new Date();

    // Week boundaries: Monday 00:00
    const dayOfWeek = now.getDay();
    const diffToMon = (dayOfWeek + 6) % 7;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - diffToMon);
    weekStart.setHours(0, 0, 0, 0);

    // Month boundaries
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Fetch all transactions for this user from month start
    const { data, error } = await supabase
      .from('transactions')
      .select('type, amount, subcategory, friend_name, date')
      .eq('user_id', userId)
      .gte('date', monthStart.toISOString());

    if (error) throw new Error(error.message);

    let spentThisWeek = 0;
    let cashThisMonth = 0;
    let onlineThisMonth = 0;
    const friendBalances: Record<string, number> = {};

    for (const row of data || []) {
      const rowDate = new Date(row.date);
      const amount = parseFloat(row.amount);

      if (row.type === 'expense') {
        if (rowDate >= weekStart) spentThisWeek += amount;
        if (row.subcategory === 'cash') cashThisMonth += amount;
        if (['fampay', 'phonepe', 'online'].includes(row.subcategory)) onlineThisMonth += amount;
      }

      if (row.friend_name) {
        if (row.type === 'friend_received') {
          friendBalances[row.friend_name] = (friendBalances[row.friend_name] || 0) + amount;
        }
        if (row.type === 'friend_gave') {
          friendBalances[row.friend_name] = (friendBalances[row.friend_name] || 0) - amount;
        }
        if (row.type === 'settlement') {
          friendBalances[row.friend_name] = (friendBalances[row.friend_name] || 0) + amount;
        }
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

  static async getMonthlyTrends(userId: string) {
    const now = new Date();
    // Go back 6 months
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const { data, error } = await supabase
      .from('transactions')
      .select('amount, date, type')
      .eq('user_id', userId)
      .eq('type', 'expense')
      .gte('date', sixMonthsAgo.toISOString());

    if (error) throw new Error(error.message);

    const monthlyMap: Record<string, number> = {};
    // Pre-populate last 6 months
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyMap[monthStr] = 0;
    }

    for (const row of data || []) {
      const d = new Date(row.date);
      const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyMap[monthStr] !== undefined) {
        monthlyMap[monthStr] += parseFloat(row.amount);
      }
    }

    return Object.entries(monthlyMap)
      .map(([month, total]) => ({ month, total }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  static async getCategoryBreakdown(userId: string, month: string) {
    const startDate = `${month}-01T00:00:00.000Z`;
    const [year, m] = month.split('-').map(Number);
    const lastDay = new Date(year, m, 0).getDate();
    const endDate = `${month}-${String(lastDay).padStart(2, '0')}T23:59:59.999Z`;

    const { data, error } = await supabase
      .from('transactions')
      .select('amount, category')
      .eq('user_id', userId)
      .eq('type', 'expense')
      .gte('date', startDate)
      .lte('date', endDate);

    if (error) throw new Error(error.message);

    const categoryMap: Record<string, number> = {};
    let total = 0;

    for (const row of data || []) {
      const amt = parseFloat(row.amount);
      const cat = row.category || 'other';
      categoryMap[cat] = (categoryMap[cat] || 0) + amt;
      total += amt;
    }

    return {
      total,
      breakdown: Object.entries(categoryMap).map(([category, amount]) => ({
        category,
        amount,
        percentage: total > 0 ? Math.round((amount / total) * 100) : 0,
      })),
    };
  }

  static async getLendingSummary(userId: string) {
    const { data, error } = await supabase
      .from('transactions')
      .select('type, amount, friend_name')
      .eq('user_id', userId)
      .not('friend_name', 'is', null);

    if (error) throw new Error(error.message);

    const friendBalances: Record<string, number> = {};

    for (const row of data || []) {
      const name = row.friend_name as string;
      const amount = parseFloat(row.amount);
      if (!friendBalances[name]) friendBalances[name] = 0;

      if (row.type === 'friend_received') {
        friendBalances[name] += amount; // they owe you
      } else if (row.type === 'friend_gave') {
        friendBalances[name] -= amount; // you owe them
      } else if (row.type === 'settlement') {
        friendBalances[name] += amount; // settlement closes debt
      }
    }

    const friends = Object.entries(friendBalances).map(([friendName, balance]) => ({
      friendName,
      balance: Math.round(balance),
    }));

    const totalOwed = friends.filter(f => f.balance > 0).reduce((s, f) => s + f.balance, 0);
    const totalOwing = friends.filter(f => f.balance < 0).reduce((s, f) => s + Math.abs(f.balance), 0);

    return { friends, totalOwed, totalOwing };
  }
}
