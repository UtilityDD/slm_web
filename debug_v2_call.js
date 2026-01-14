
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wkunyvomogeazjwtenck.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrdW55dm9tb2dlYXpqd3RlbmNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MDIwMDgsImV4cCI6MjA4MTA3ODAwOH0.iY8BjqhUn8rvOwul9a0625LQ_TGmauth5Ltml5mTcR0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const TEST_USER_ID = '741bce40-09f3-4f95-a7c6-ac7c43071671'; // Using a known ID from your data

async function testRpc() {
    console.log("Testing submit_quiz_result_v2...");

    // We need to be authenticated for the RPC to work (it gets auth.uid())
    // Since we don't have the user's password, we cannot sign in as them.
    // However, the RPC expects auth.uid().
    // WITHOUT a session, auth.uid() is null, and the function RAISES 'Not authenticated'.
    // That would return a 500 or 400 error.

    // BUT, the initial error user reported "Could not choose function" was 400.
    // The current error is 400.

    // If I call it as Anon, I expect "Not authenticated" (which is a successful invocation of the function logic, just hitting a guard clause).
    // If I get "Function not found" or "Argument types...", that's a different error.

    const { data, error } = await supabase.rpc('submit_quiz_result_v2', {
        p_quiz_id: 'debug-test-quiz',
        p_score: 100,
        p_penalty: 0
    });

    if (error) {
        console.error("RPC Error:", error);
    } else {
        console.log("RPC Success:", data);
    }
}

testRpc();
