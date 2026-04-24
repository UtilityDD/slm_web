const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://wkunyvomogeazjwtenck.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrdW55dm9tb2dlYXpqd3RlbmNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MDIwMDgsImV4cCI6MjA4MTA3ODAwOH0.iY8BjqhUn8rvOwul9a0625LQ_TGmauth5Ltml5mTcR0'; 

const supabase = createClient(supabaseUrl, supabaseKey);

async function runGlobalAudit() {
    console.log('--- GLOBAL USER DATA AUDIT STARTING ---\n');

    try {
        const { data: users, error } = await supabase
            .from('profiles')
            .select('id, full_name, slm_id, points, reading_points, quiz_points, total_penalties, training_level, completed_lessons')
            .order('points', { ascending: false });

        if (error) throw error;

        console.log(`Found ${users.length} users. Analyzing for discrepancies...\n`);

        const issues = [];

        for (const user of users) {
            const userIssues = [];
            const lessons = Array.isArray(user.completed_lessons) ? user.completed_lessons.filter(Boolean) : [];
            
            // 1. Math Check: points = reading + quiz (assuming penalties are handled separately or subtracted)
            // Note: In some versions, points is the raw sum.
            const expectedSum = (user.reading_points || 0) + (user.quiz_points || 0);
            if (user.points !== expectedSum) {
                userIssues.push(`Sum Mismatch: Points(${user.points}) != Reading(${user.reading_points}) + Quiz(${user.quiz_points}). Diff: ${expectedSum - user.points}`);
            }

            // 2. Reading Points vs Lessons: each lesson = 20 pts
            const expectedReading = lessons.length * 20;
            if (user.reading_points !== expectedReading) {
                userIssues.push(`Reading Mismatch: Pts(${user.reading_points}) vs Lessons(${lessons.length} * 20 = ${expectedReading})`);
            }

            // 3. Level Consistency (simplified check)
            // If level 1, they should have at least 1 lesson. If level 0, should be 0.
            if (user.training_level > 0 && lessons.length === 0) {
                userIssues.push(`Level Ghosting: Level ${user.training_level} but 0 completed lessons.`);
            }

            if (userIssues.length > 0) {
                issues.push({
                    name: user.full_name,
                    id: user.slm_id || user.id.substring(0, 8),
                    problems: userIssues
                });
            }
        }

        if (issues.length === 0) {
            console.log('✅ CLEAN! All users have consistent data structures.');
        } else {
            console.log(`❌ FOUND ISSUES IN ${issues.length} USERS:\n`);
            issues.forEach(i => {
                console.log(`User: ${i.name} [${i.id}]`);
                i.problems.forEach(p => console.log(`  - ${p}`));
                console.log('');
            });
        }

    } catch (err) {
        console.error('Audit Error:', err.message);
    }
}

runGlobalAudit();
