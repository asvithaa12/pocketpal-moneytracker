-- Add user_id to existing tables (nullable for backward compat)
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE qr_tags     ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Budgets table
CREATE TABLE IF NOT EXISTS budgets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  month           TEXT NOT NULL,          -- 'YYYY-MM'
  total_budget    NUMERIC(12,2) NOT NULL DEFAULT 0,
  category_limits JSONB NOT NULL DEFAULT '{}',  -- { "food": 2000, "transport": 500, ... }
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, month)
);

ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_budgets" ON budgets USING (auth.uid() = user_id);

-- Tighten transactions RLS (authenticated users see only their own rows)
DROP POLICY IF EXISTS "select_all_transactions" ON transactions;
DROP POLICY IF EXISTS "insert_all_transactions" ON transactions;
DROP POLICY IF EXISTS "update_all_transactions" ON transactions;
DROP POLICY IF EXISTS "delete_all_transactions" ON transactions;

CREATE POLICY "auth_select_transactions" ON transactions FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "auth_insert_transactions" ON transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "auth_update_transactions" ON transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "auth_delete_transactions" ON transactions FOR DELETE USING (auth.uid() = user_id);

-- Same for qr_tags
DROP POLICY IF EXISTS "select_all_qr_tags" ON qr_tags;
DROP POLICY IF EXISTS "insert_all_qr_tags" ON qr_tags;
DROP POLICY IF EXISTS "update_all_qr_tags" ON qr_tags;
DROP POLICY IF EXISTS "delete_all_qr_tags" ON qr_tags;

CREATE POLICY "auth_select_qr_tags" ON qr_tags FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "auth_insert_qr_tags" ON qr_tags FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "auth_update_qr_tags" ON qr_tags FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "auth_delete_qr_tags" ON qr_tags FOR DELETE USING (auth.uid() = user_id);

-- Index for user-scoped queries
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_qr_tags_user_id ON qr_tags(user_id);
