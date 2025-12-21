import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://wkunyvomogeazjwtenck.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrdW55dm9tb2dlYXpqd3RlbmNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MDIwMDgsImV4cCI6MjA4MTA3ODAwOH0.iY8BjqhUn8rvOwul9a0625LQ_TGmauth5Ltml5mTcR0'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testDelete() {
    // 1. Fetch a notification
    const { data: notifs, error: fetchError } = await supabase
        .from('notifications')
        .select('id, title')
        .limit(1)

    if (fetchError) {
        console.error('Fetch Error:', fetchError)
        return
    }

    if (notifs.length === 0) {
        console.log('No notifications to delete.')
        return
    }

    const id = notifs[0].id
    console.log(`Attempting to delete notification: ${notifs[0].title} (${id})`)

    // 2. Attempt delete (using anon key, which should fail if RLS is working, 
    // but here I want to see if I can delete it with service role or if I need to mock auth)
    // Actually, I'll just check if the delete query itself is valid.

    const { error: deleteError } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id)

    if (deleteError) {
        console.error('Delete Error:', deleteError)
    } else {
        console.log('Delete successful (or at least no error returned).')
    }
}

testDelete()
