import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Supabase] Las variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY son necesarias para las suscripciones realtime.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

if (supabaseUrl && supabaseAnonKey) {
  console.debug('[Supabase] Cliente inicializado:', { supabaseUrl });
}
