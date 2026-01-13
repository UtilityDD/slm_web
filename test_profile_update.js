
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wkunyvomogeazjwtenck.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrdW55dm9tb2dlYXpqd3RlbmNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MDIwMDgsImV4cCI6MjA4MTA3ODAwOH0.iY8BjqhUn8rvOwul9a0625LQ_TGmauth5Ltml5mTcR0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const USER_ID = '741bce40-09f3-4f95-a7c6-ac7c43071671';

async function testProfileUpdate() {
    console.log(`Attempting to update profile for: ${USER_ID} (SLM-0030)`);
    console.log("Goal: Simulate adding a completed lesson to 'completed_lessons' column.");

    // NOTE: This usually fails with Anon key because of RLS (Users can only update their OWN profile).
    // And to be "their own", the client must have a session.
    // This script does NOT have a session.

    // However, I can check if RLS is enabled at all.
    // If it *succeeds*, then RLS is OFF (which is bad but explains why it might work for some) OR I'm lucky.
    // If it *fails*, it confirms RLS is blocking.

    // But the APP has a user session. So if the app fails, it's either:
    // 1. RLS Policy is wrong (e.g. `using (true)` but `with check (false)`?)
    // 2. The client code is sending malformed data.

    // Let's try to update.
    const { data, error } = await supabase
        .from('profiles')
        .update({
            // Append a dummy lesson to verify update capability
            // WARNING: This modifies production data. I should be careful.
            // But since the user says it's NOT updating, maybe it won't work.
            // I'll try to set 'training_level' instead, which is less destructive/easier to revert.
        })
        .eq('id', USER_ID)
        .select();

    if (error) {
        console.error("Update Failed:", error);
    } else {
        console.log("Update Success (Unexpected without session):", data);
    }
}

testProfileUpdate();
