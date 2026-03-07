
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wkunyvomogeazjwtenck.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrdW55dm9tb2dlYXpqd3RlbmNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MDIwMDgsImV4cCI6MjA4MTA3ODAwOH0.iY8BjqhUn8rvOwul9a0625LQ_TGmauth5Ltml5mTcR0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const USER_ID = '741bce40-09f3-4f95-a7c6-ac7c43071671';

async function testLessonBonus() {
    console.log(`Checking existing lesson bonuses for: ${USER_ID} (SLM-0030)`);

    // 1. Check existing attempts
    const { data: attempts, error } = await supabase
        .from('quiz_attempts')
        .select('*')
        .eq('user_id', USER_ID)
        .like('quiz_id', 'lesson_bonus%')
        .order('completed_at', { ascending: false });

    console.log("Existing Lesson Bonuses:");
    if (attempts) {
        attempts.forEach(a => console.log(`- ${a.quiz_id}: ${a.score}`));
    } else {
        console.log("None");
    }

    // 2. We can't really "simulate" an insert easily without auth, but we can check if the data exists.
    // The user claimed reading score is not updating.
    // If the user completes a NEW lesson, e.g. "lesson_bonus_9.9", it should insert.

    // Key Check: Does the RPC logic correctly sum these?
    // RPC Logic:
    // SELECT COALESCE(SUM(score), 0) INTO v_lesson_sum FROM quiz_attempts WHERE user_id = v_user_id AND quiz_id LIKE 'lesson_bonus%';

    // Ideally, this should work.
    // Is it possible the `quiz_id` being sent is NOT 'lesson_bonus_X.Y' but something else?
    // Code says: `lesson_bonus_${lessonId}` where lessonId is like '1.1'.

    // Let's verify the profile breakdown again.
    const { data: profile } = await supabase
        .from('profiles')
        .select('points, quiz_points, reading_points, total_penalties')
        .eq('id', USER_ID)
        .single();

    console.log("\nProfile Scores:");
    console.log(profile);
}

testLessonBonus();
