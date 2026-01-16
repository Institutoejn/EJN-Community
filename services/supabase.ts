import { createClient } from '@supabase/supabase-js'

// Fix: Cast import.meta to any to resolve missing type definition for vite/client and env property
const env = (import.meta as any).env

// Fallback to placeholder to prevent "supabaseUrl is required" crash if env vars are missing
const supabaseUrl = env?.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = env?.VITE_SUPABASE_ANON_KEY || 'placeholder-key'

if (supabaseUrl.includes('placeholder') || supabaseUrl.includes('seu-projeto')) {
    console.error("⚠️ ATENÇÃO: As chaves do Supabase não foram configuradas corretamente no .env.local. O login irá falhar com 'Failed to fetch'.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: localStorage
  }
})