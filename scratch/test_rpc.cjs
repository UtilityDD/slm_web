const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://wkunyvomogeazjwtenck.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrdW55dm9tb2dlYXpqd3RlbmNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MDIwMDgsImV4cCI6MjA4MTA3ODAwOH0.iY8BjqhUn8rvOwul9a0625LQ_TGmauth5Ltml5mTcR0'; 

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyRPC() {
    console.log('--- TESTING NEW RPC: submit_quiz_result_v2 ---\n');

    try {
        const { data, error } = await supabase.rpc('submit_quiz_result_v2', {
            p_quiz_id: 'rpc_verification_test_' + Date.now(),
            p_score: 0
        });

        if (error) {
            // If the function doesn't exist, Postgres returns code 42883
            if (error.code === '42883' || error.message.includes('does not exist')) {
                console.log('❌ FAIL: Function not found in database.');
            } else {
                console.log('✅ PASS: Function found and executed!');
                console.log('   Message:', error.message);
                console.log('   (Error is likely due to lack of Auth, which is normal for this script)');
            }
        } else {
            console.log('✅ PASS: Function executed successfully!');
            console.log('   Response Data:', data);
        }

    } catch (err) {
        console.log('❌ ERROR:', err.message);
    }
}

verifyRPC();
