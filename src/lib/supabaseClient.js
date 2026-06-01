// ════════════════════════════════════════════════════════════════════
// SUPABASE CLIENT
// ════════════════════════════════════════════════════════════════════
// Cliente único de Supabase para la app. Vite + React (NO Next.js).
//
// Variables esperadas en .env.local:
//   VITE_SUPABASE_URL
//   VITE_SUPABASE_PUBLISHABLE_KEY
//
// NO usar el service role key acá — esto se ejecuta en el cliente.
// ════════════════════════════════════════════════════════════════════

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey);
