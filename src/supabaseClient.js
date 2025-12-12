import { createClient } from '@supabase/supabase-js'

// ⚠️ REPLACE THESE WITH YOUR ACTUAL SUPABASE PROJECT CREDENTIALS
// You can find these in your Supabase Dashboard -> Project Settings -> API
const supabaseUrl = 'https://wkunyvomogeazjwtenck.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrdW55dm9tb2dlYXpqd3RlbmNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MDIwMDgsImV4cCI6MjA4MTA3ODAwOH0.iY8BjqhUn8rvOwul9a0625LQ_TGmauth5Ltml5mTcR0'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
