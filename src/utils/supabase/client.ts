import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || (import.meta as any).env?.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY || (import.meta as any).env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl) {
  throw new Error('Missing environment variable VITE_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL');
}
if (!supabaseKey) {
  throw new Error('Missing environment variable VITE_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
}

export const createClient = () => createSupabaseClient(supabaseUrl, supabaseKey);
export const supabase = createSupabaseClient(supabaseUrl, supabaseKey);
