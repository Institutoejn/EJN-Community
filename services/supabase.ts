
import { createClient } from '@supabase/supabase-js';

// URL do seu projeto Supabase
const SUPABASE_URL = 'https://sjiiufdzandfdvhyunuw.supabase.co'; 

// COLE ABAIXO A CHAVE 'anon public' (A PRIMEIRA DA LISTA NO SEU PRINT)
const SUPABASE_ANON_KEY = 'COLE_SUA_CHAVE_ANON_PUBLIC_AQUI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
