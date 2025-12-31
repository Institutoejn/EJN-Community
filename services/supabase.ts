
import { createClient } from '@supabase/supabase-js';

// SUBSTITUA ESTES VALORES PELAS SUAS CHAVES DO PAINEL SUPABASE (Project Settings -> API)
// A URL deve ser algo como: https://xxxxxxxxxxxx.supabase.co
// A KEY deve começar com: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

const SUPABASE_URL = 'https://sjiiufdzandfdvhyunuw.supabase.co'; 
const SUPABASE_ANON_KEY = 'SUA_CHAVE_ANON_PUBLICA_AQUI'; // <--- COLE SUA CHAVE 'anon' 'public' AQUI

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
