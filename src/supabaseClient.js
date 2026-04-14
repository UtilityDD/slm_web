import { createClient } from '@supabase/supabase-js'

// ⚠️ REPLACE THESE WITH YOUR ACTUAL SUPABASE PROJECT CREDENTIALS
// You can find these in your Supabase Dashboard -> Project Settings -> API
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim()
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
        'Missing Supabase env vars. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local, then restart the Vite dev server.'
    )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        detectSessionInUrl: false,
        persistSession: true
    }
})
