const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wkunyvomogeazjwtenck.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrdW55dm9tb2dlYXpqd3RlbmNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MDIwMDgsImV4cCI6MjA4MTA3ODAwOH0.iY8BjqhUn8rvOwul9a0625LQ_TGmauth5Ltml5mTcR0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkUser() {
    const userId = '7eb18b11-c871-4001-bda4-5b9a08e7f059'; // SLM-0003 Subrata Sarkar
    
    console.log('--- PROFILE DATA ---');
    const { data: profile, error: pError } = await supabase
        .from('profiles')
        .select('full_name, completed_lessons, reading_points, points')
        .eq('id', userId)
        .single();
        
    if (pError) console.error(pError);
    else console.log(JSON.stringify(profile, null, 2));

    console.log('\n--- LESSON BONUS ATTEMPTS ---');
    const { data: attempts, error: aError } = await supabase
        .from('quiz_attempts')
        .select('quiz_id, score, created_at')
        .eq('user_id', userId)
        .like('quiz_id', 'lesson_bonus_%');

    if (aError) console.error(aError);
    else {
        console.log(`Found ${attempts.length} bonus records.`);
        console.table(attempts);
    }
}

checkUser();
