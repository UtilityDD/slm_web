
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wkunyvomogeazjwtenck.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrdW55dm9tb2dlYXpqd3RlbmNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MDIwMDgsImV4cCI6MjA4MTA3ODAwOH0.iY8BjqhUn8rvOwul9a0625LQ_TGmauth5Ltml5mTcR0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const USER_ID = '741bce40-09f3-4f95-a7c6-ac7c43071671';

async function checkStatus() {
    console.log(`Checking status for user: ${USER_ID} (SLM-0030)`);

    // 1. Check Profile Score
    const { data: profile } = await supabase
        .from('profiles')
        .select('points, quiz_points, reading_points, total_penalties')
        .eq('id', USER_ID)
        .single();

    console.log("\n--- Profile ---");
    console.log(profile);

    // 2. Check Recent Quiz Attempts
    const { data: attempts, error } = await supabase
        .from('quiz_attempts')
        .select('*')
        .eq('user_id', USER_ID)
        .order('completed_at', { ascending: false });

    console.log("\n--- All Attempts ---");
    if (attempts && attempts.length > 0) {
        attempts.forEach(a => {
            console.log(`[${a.completed_at}] Quiz: ${a.quiz_id} | Score: ${a.score} | Penalty: ${a.penalty}`);
        });
    } else {
        console.log("No attempts found.");
    }
}

checkStatus();
