const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://wkunyvomogeazjwtenck.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrdW55dm9tb2dlYXpqd3RlbmNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MDIwMDgsImV4cCI6MjA4MTA3ODAwOH0.iY8BjqhUn8rvOwul9a0625LQ_TGmauth5Ltml5mTcR0'; 

const supabase = createClient(supabaseUrl, supabaseKey);

async function runAudit() {
    console.log('--- REFINED MATH AUDIT ---');
    const { data: users, error } = await supabase.from('profiles').select('*');
    if (error) { console.error(error); return; }

    users.forEach(u => {
        const lessons = Array.isArray(u.completed_lessons) ? u.completed_lessons.filter(Boolean) : [];
        const expectedReading = lessons.length * 20;
        const expectedTotal = (u.reading_points || 0) + (u.quiz_points || 0);
        
        let hasIssue = false;
        let report = `Inconsistency in ${u.full_name} [${u.slm_id || u.id}]:`;
        
        if (u.points !== expectedTotal) {
            report += `\n  - Total Pts mismatch: DB has ${u.points}, but Reading+Quiz = ${expectedTotal}`;
            hasIssue = true;
        }
        
        if (u.reading_points !== expectedReading) {
            report += `\n  - Reading Pts mismatch: DB has ${u.reading_points}, but Lessons Count = ${expectedReading}`;
            hasIssue = true;
        }

        if (hasIssue) console.log(report + '\n');
    });
}

runAudit();
