
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wkunyvomogeazjwtenck.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrdW55dm9tb2dlYXpqd3RlbmNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MDIwMDgsImV4cCI6MjA4MTA3ODAwOH0.iY8BjqhUn8rvOwul9a0625LQ_TGmauth5Ltml5mTcR0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Hourly ID format test
const getSyncedTime = () => new Date(); // Simulating client time
const now = getSyncedTime();
const year = now.getFullYear();
const month = String(now.getMonth() + 1).padStart(2, '0');
const day = String(now.getDate()).padStart(2, '0');
const hour = String(now.getHours()).padStart(2, '0');
const quizId = `hourly-challenge-${year}-${month}-${day}-${hour}`;

console.log(`Testing RPC with ID: ${quizId}`);

async function testRpc() {
    // Note: This call WILL fail with "Not authenticated" (400/500) if run as Anon
    // But we want to see if it fails with "Function not found" or "Bad Request" due to types.

    // If we send types that match, we should get "Not authenticated" inside the function.
    // If we send types that DO NOT match, we might get a different 400.

    const params = {
        p_quiz_id: quizId,
        p_score: 50,
        p_penalty: 0
    };

    console.log("Calling submit_quiz_result_v2 with:", params);

    const { data, error } = await supabase.rpc('submit_quiz_result_v2', params);

    if (error) {
        console.error("RPC Error:", error);
    } else {
        console.log("RPC Success:", data);
    }
}

testRpc();
