
-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type        TEXT NOT NULL CHECK (type IN ('expense','friend_gave','friend_received','settlement')),
  amount      NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  category    TEXT NOT NULL DEFAULT 'other',
  subcategory TEXT NOT NULL DEFAULT 'cash',
  description TEXT NOT NULL DEFAULT '',
  date        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  friend_name TEXT,
  source      TEXT NOT NULL DEFAULT 'manual',
  qr_id       UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_all_transactions" ON transactions FOR SELECT TO anon USING (true);
CREATE POLICY "insert_all_transactions" ON transactions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "update_all_transactions" ON transactions FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "delete_all_transactions" ON transactions FOR DELETE TO anon USING (true);

-- QR tags table
CREATE TABLE IF NOT EXISTS qr_tags (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hash          TEXT NOT NULL UNIQUE,
  label         TEXT NOT NULL,
  category_id   TEXT NOT NULL DEFAULT 'other',
  times_scanned INTEGER NOT NULL DEFAULT 1,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE qr_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_all_qr_tags" ON qr_tags FOR SELECT TO anon USING (true);
CREATE POLICY "insert_all_qr_tags" ON qr_tags FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "update_all_qr_tags" ON qr_tags FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "delete_all_qr_tags" ON qr_tags FOR DELETE TO anon USING (true);

-- Add foreign key from transactions to qr_tags
ALTER TABLE transactions
  ADD CONSTRAINT fk_transactions_qr
  FOREIGN KEY (qr_id) REFERENCES qr_tags(id) ON DELETE SET NULL;

-- Index for fast date-range and type queries on transactions
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_subcategory ON transactions(subcategory);
CREATE INDEX IF NOT EXISTS idx_qr_tags_hash ON qr_tags(hash);
