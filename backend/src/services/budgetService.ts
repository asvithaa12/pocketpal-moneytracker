import { supabase } from '../db/supabase.js';
import { Budget } from '../types/index.js';

export class BudgetService {
  static async getByMonth(userId: string, month: string): Promise<Budget | null> {
    const { data, error } = await supabase
      .from('budgets')
      .select('*')
      .eq('user_id', userId)
      .eq('month', month)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data as Budget | null;
  }

  static async upsert(userId: string, budgetData: { month: string; total_budget: number; category_limits?: Record<string, number> }): Promise<Budget> {
    const existing = await this.getByMonth(userId, budgetData.month);

    if (existing) {
      const { data, error } = await supabase
        .from('budgets')
        .update({
          total_budget: budgetData.total_budget,
          category_limits: budgetData.category_limits ?? existing.category_limits,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as Budget;
    } else {
      const { data, error } = await supabase
        .from('budgets')
        .insert({
          user_id: userId,
          month: budgetData.month,
          total_budget: budgetData.total_budget,
          category_limits: budgetData.category_limits ?? {},
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as Budget;
    }
  }

  static async getBudgetProgress(userId: string, month: string) {
    const budget = await this.getByMonth(userId, month);
    
    // Fetch all transactions for this month of type 'expense'
    const startDate = `${month}-01T00:00:00.000Z`;
    const [year, m] = month.split('-').map(Number);
    const lastDay = new Date(year, m, 0).getDate();
    const endDate = `${month}-${String(lastDay).padStart(2, '0')}T23:59:59.999Z`;

    const { data: txs, error } = await supabase
      .from('transactions')
      .select('amount, category')
      .eq('user_id', userId)
      .eq('type', 'expense')
      .gte('date', startDate)
      .lte('date', endDate);

    if (error) throw new Error(error.message);

    const actualSpending: Record<string, number> = {};
    let totalSpent = 0;

    for (const tx of txs || []) {
      const amt = parseFloat(tx.amount);
      const cat = tx.category || 'other';
      actualSpending[cat] = (actualSpending[cat] || 0) + amt;
      totalSpent += amt;
    }

    return {
      month,
      budget: budget ? {
        total_budget: budget.total_budget,
        category_limits: budget.category_limits,
      } : {
        total_budget: 0,
        category_limits: {},
      },
      actual: {
        total_spent: totalSpent,
        category_spending: actualSpending,
      },
    };
  }
}
