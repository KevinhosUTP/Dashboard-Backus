import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL  as string;
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    '[supabaseClient] Faltan variables de entorno VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY.\n' +
    'Crea un archivo .env en la raíz del proyecto (ver .env.example).'
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);