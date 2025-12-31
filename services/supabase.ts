
import { createClient } from '@supabase/supabase-js';

// URL do seu projeto Supabase
const SUPABASE_URL = 'https://sjiiufdzandfdvhyunuw.supabase.co'; 

// COLE ABAIXO A CHAVE 'anon public' (A PRIMEIRA DA LISTA NO SEU PRINT)
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqaWl1ZmR6YW5kZmR2aHl1bnV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNzg0ODgsImV4cCI6MjA4Mjc1NDQ4OH0.gLfaNFf8lP5DQjgpJTWorLhs1iZjflA46UdfoQdNW2s';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
