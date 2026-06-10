import { supabase } from '../db/supabase.js';
import { FriendBalance } from '../types/index.js';

export class FriendService {
  static async getAllBalances(userId: string): Promise<FriendBalance[]> {
    const { data: txs, error } = await supabase
      .from('transactions')
      .select('type, amount, friend_name')
      .eq('user_id', userId)
      .not('friend_name', 'is', null);

    if (error) throw new Error(error.message);

    const friendsMap: Record<string, { lent: number; borrowed: number; repayments: number }> = {};

    for (const tx of txs) {
      const name = tx.friend_name;
      if (!name) continue;

      if (!friendsMap[name]) {
        friendsMap[name] = { lent: 0, borrowed: 0, repayments: 0 };
      }

      const amount = parseFloat(tx.amount);
      if (tx.type === 'friend_received') {
        friendsMap[name].lent += amount; // consistent with existing storage.js math: +amount
      } else if (tx.type === 'friend_gave') {
        friendsMap[name].borrowed += amount; // consistent with existing storage.js math: -amount
      } else if (tx.type === 'settlement') {
        friendsMap[name].repayments += amount; // consistent with existing storage.js math: +amount
      }
    }

    return Object.entries(friendsMap).map(([name, stats]) => {
      // balance = lent - borrowed + repayments
      const balance = stats.lent - stats.borrowed + stats.repayments;
      return {
        name,
        balance,
        lent: stats.lent,
        borrowed: stats.borrowed,
        repayments: stats.repayments,
        pending_balance: balance,
      };
    });
  }

  static async getFriendHistory(userId: string, friendName: string) {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('friend_name', friendName)
      .order('date', { ascending: false });

    if (error) throw new Error(error.message);

    // Compute balance
    let balance = 0;
    for (const tx of data) {
      const amount = parseFloat(tx.amount);
      if (tx.type === 'friend_received') balance += amount;
      else if (tx.type === 'friend_gave') balance -= amount;
      else if (tx.type === 'settlement') balance += amount;
    }

    return {
      name: friendName,
      balance,
      transactions: data,
    };
  }

  static async settleFriend(userId: string, friendName: string, amount: number, subcategory: string) {
    // Record a settlement transaction
    const { data, error } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        type: 'settlement',
        amount,
        category: 'friend_gave', // consistent with friend category
        subcategory,
        description: `Settled with ${friendName}`,
        friend_name: friendName,
        source: 'manual',
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }
}
