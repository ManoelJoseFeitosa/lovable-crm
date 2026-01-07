import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// External backend connection (for technical test / external project usage)
// Prefer configuring these via environment variables in production.
const FALLBACK_URL = 'https://lbfywrpkwkqwyhhuubur.supabase.co';
const FALLBACK_PUBLISHABLE_KEY = 'sb_publishable_YZbxGT8RnhbXDaABxc3iuw_hNaZUThV';

const EXTERNAL_SUPABASE_URL = import.meta.env.VITE_EXTERNAL_SUPABASE_URL ?? FALLBACK_URL;
const EXTERNAL_SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_EXTERNAL_SUPABASE_PUBLISHABLE_KEY ?? FALLBACK_PUBLISHABLE_KEY;

export const supabase = createClient<Database>(EXTERNAL_SUPABASE_URL, EXTERNAL_SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
