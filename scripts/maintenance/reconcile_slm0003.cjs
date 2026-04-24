const { createClient } = require('@supabase/supabase-js');

// Use service role key if available for administrative tasks, 
// otherwise we use the anon key but it might be restricted by RLS.
// Since I don't have the service key, I will use the anon key and hope the user can run it.
const supabaseUrl = 'https://wkunyvomogeazjwtenck.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrdW55dm9tb2dlYXpqd3RlbmNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MDIwMDgsImV4cCI6MjA4MTA3ODAwOH0.iY8BjqhUn8rvOwul9a0625LQ_TGmauth5Ltml5mTcR0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function reconcile() {
    const userId = '7eb18b11-c871-4001-bda4-5b9a08e7f059'; // SLM-0003
    
    console.log('Fetching profile for SLM-0003...');
    const { data: profile } = await supabase.from('profiles').select('completed_lessons').eq('id', userId).single();
    
    if (!profile || !profile.completed_lessons) {
        console.error('Profile not found or no lessons completed.');
        return;
    }

    const lessons = profile.completed_lessons;
    console.log(`User has completed ${lessons.length} lessons.`);

    for (const lessonId of lessons) {
        const bonusId = `lesson_bonus_${lessonId}`;
        
        // Check if attempt exists
        const { data: existing } = await supabase
            .from('quiz_attempts')
            .select('id')
            .eq('user_id', userId)
            .eq('quiz_id', bonusId)
            .single();

        if (!existing) {
            console.log(`Backfilling lesson ${lessonId}...`);
            const { error } = await supabase
                .from('quiz_attempts')
                .insert({
                    user_id: userId,
                    quiz_id: bonusId,
                    score: 20,
                    penalty: 0,
                    created_at: new Date().toISOString()
                });
            
            if (error) console.error(`Failed to backfill ${lessonId}:`, error.message);
            else console.log(`Successfully backfilled ${lessonId}`);
        } else {
            console.log(`Lesson ${lessonId} already has a record.`);
        }
    }
    
    console.log('\nReconciliation complete for SLM-0003.');
}

reconcile();
