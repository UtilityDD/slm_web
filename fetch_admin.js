import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://wkunyvomogeazjwtenck.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrdW55dm9tb2dlYXpqd3RlbmNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MDIwMDgsImV4cCI6MjA4MTA3ODAwOH0.iY8BjqhUn8rvOwul9a0625LQ_TGmauth5Ltml5mTcR0'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function getAdmin() {
    const { data, error } = await supabase
        .from('profiles')
        .select('email')
        .eq('role', 'admin')
        .limit(1)

    if (error) {
        console.error('Error:', error)
    } else {
        console.log('Admin Email:', data[0]?.email)
    }
}

getAdmin()
