import { createClient } from '@supabase/supabase-js'

// Garante que o objeto env exista
const env = (import.meta as any).env || {}

// Usa as variáveis de ambiente OU as chaves reais fornecidas como fallback
const supabaseUrl = env.VITE_SUPABASE_URL || 'https://sjiiufdzandfdvhyunuw.supabase.co'
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqaWl1ZmR6YW5kZmR2aHl1bnV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNzg0ODgsImV4cCI6MjA4Mjc1NDQ4OH0.gLfaNFf8lP5DQjgpJTWorLhs1iZjflA46UdfoQdNW2s'

if (supabaseUrl.includes('placeholder') || supabaseUrl.includes('seu-projeto')) {
    console.error("⚠️ ATENÇÃO: As chaves do Supabase não foram detectadas corretamente.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: localStorage
  }
})