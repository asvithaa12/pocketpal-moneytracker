import { supabase } from '../db/supabase.js';
import { Transaction } from '../types/index.js';

export class TransactionService {
  static async getAll(userId: string, month?: string, type?: string) {
    let query = supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (month) {
      // month is YYYY-MM
      const startDate = `${month}-01T00:00:00.000Z`;
      // Calculate last day of month
      const [year, m] = month.split('-').map(Number);
      const lastDay = new Date(year, m, 0).getDate();
      const endDate = `${month}-${String(lastDay).padStart(2, '0')}T23:59:59.999Z`;

      query = query.gte('date', startDate).lte('date', endDate);
    }

    if (type) {
      query = query.eq('type', type);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data as Transaction[];
  }

  static async getById(userId: string, id: string) {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) throw new Error(error.message);
    return data as Transaction;
  }

  static async create(userId: string, transactionData: Partial<Transaction> | Partial<Transaction>[]) {
    const dataToInsert = Array.isArray(transactionData)
      ? transactionData.map(t => ({ ...t, user_id: userId }))
      : { ...transactionData, user_id: userId };

    const { data, error } = await supabase
      .from('transactions')
      .insert(dataToInsert)
      .select();

    if (error) throw new Error(error.message);
    return Array.isArray(transactionData) ? data : data[0];
  }

  static async update(userId: string, id: string, transactionData: Partial<Transaction>) {
    const { data, error } = await supabase
      .from('transactions')
      .update(transactionData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as Transaction;
  }

  static async delete(userId: string, id: string) {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw new Error(error.message);
    return true;
  }

  static async clearAll(userId: string) {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('user_id', userId);

    if (error) throw new Error(error.message);
    return true;
  }
}
