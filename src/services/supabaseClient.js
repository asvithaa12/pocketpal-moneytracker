import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL ?? '';
const key = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

if (!url || !key) {
  console.warn('[supabase] Missing env vars — VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY not found. Data features will be unavailable.');
}

export const supabase = (url && key) ? createClient(url, key) : null;
