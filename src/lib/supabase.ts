import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  (import.meta as any).env?.VITE_SUPABASE_URL ||
  (import.meta as any).env?.NEXT_PUBLIC_SUPABASE_URL ||
  'https://fzmoaxywccqcetxgedze.supabase.co';

const supabaseKey =
  (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY ||
  (import.meta as any).env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_cylRmOIRLivxFKpf8m4z6g_TPM0YqLT';

export const supabase = createClient(supabaseUrl, supabaseKey);
