import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://wkunyvomogeazjwtenck.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrdW55dm9tb2dlYXpqd3RlbmNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MDIwMDgsImV4cCI6MjA4MTA3ODAwOH0.iY8BjqhUn8rvOwul9a0625LQ_TGmauth5Ltml5mTcR0'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testDeleteWithAuth() {
    // 1. Log in
    const { data: authData, error: loginError } = await supabase.auth.signInWithPassword({
        email: 'utility.dipankar@gmail.com',
        password: '123456'
    })

    if (loginError) {
        console.error('Login Error:', loginError)
        return
    }

    console.log('Logged in as:', authData.user.email)

    // 2. Fetch notifications
    const { data: notifs, error: fetchError } = await supabase
        .from('notifications')
        .select('*')
        .limit(1)

    if (fetchError) {
        console.error('Fetch Error:', fetchError)
        return
    }

    if (!notifs || notifs.length === 0) {
        console.log('No notifications found. Sending one first...')
        const { data: newNotif, error: sendError } = await supabase
            .from('notifications')
            .insert([{ title: 'Test Delete', message: 'Testing deletion', type: 'info', admin_id: authData.user.id }])
            .select()

        if (sendError) {
            console.error('Send Error:', sendError)
            return
        }
        console.log('Sent test notification:', newNotif[0].id)
        notifs.push(newNotif[0])
    }

    const id = notifs[0].id
    console.log(`Attempting to delete notification: ${notifs[0].title} (${id})`)

    // 3. Delete
    const { error: deleteError, count } = await supabase
        .from('notifications')
        .delete({ count: 'exact' })
        .eq('id', id)

    if (deleteError) {
        console.error('Delete Error:', deleteError)
    } else {
        console.log('Delete result count:', count)
        if (count === 0) {
            console.warn('DELETE SUCCESSFUL BUT 0 ROWS AFFECTED. RLS ISSUE!')
        } else {
            console.log('SUCCESSFULLY DELETED FROM DATABASE.')
        }
    }
}

testDeleteWithAuth()
