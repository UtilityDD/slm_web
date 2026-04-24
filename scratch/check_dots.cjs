const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wkunyvomogeazjwtenck.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrdW55dm9tb2dlYXpqd3RlbmNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MDIwMDgsImV4cCI6MjA4MTA3ODAwOH0.iY8BjqhUn8rvOwul9a0625LQ_TGmauth5Ltml5mTcR0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkNumericAttempts() {
    const userId = '7eb18b11-c871-4001-bda4-5b9a08e7f059'; // SLM-0003
    console.log(`Searching for numeric patterns in quiz_attempts for SLM-0003...`);
    
    const { data: attempts, error } = await supabase
        .from('quiz_attempts')
        .select('quiz_id, score, created_at')
        .eq('user_id', userId);

    if (error) {
        console.error('Error:', error);
        return;
    }

    // Filter for anything that looks like a lesson ID (e.g., contains a dot)
    const lessonLike = attempts.filter(a => a.quiz_id.includes('.'));
    console.log(`Found ${lessonLike.length} dots in quiz IDs.`);
    console.log('Sample matching IDs:', lessonLike.map(a => a.quiz_id));
}

checkNumericAttempts();
