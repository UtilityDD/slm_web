const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wkunyvomogeazjwtenck.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrdW55dm9tb2dlYXpqd3RlbmNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MDIwMDgsImV4cCI6MjA4MTA3ODAwOH0.iY8BjqhUn8rvOwul9a0625LQ_TGmauth5Ltml5mTcR0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkGlobalDiscrepancy() {
    const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, points, reading_points, quiz_points')
        .neq('reading_points', 0)
        .limit(20);
        
    if (error) console.error(error);
    else {
        console.log('Global Points Audit (Sample):');
        data.forEach(u => {
            const sum = (u.reading_points || 0) + (u.quiz_points || 0);
            const diff = (u.points || 0) - sum;
            if (diff !== 0) {
                console.log(`User: ${u.full_name} | Total: ${u.points} | Sum: ${sum} | Diff: ${diff}`);
            }
        });
    }
}

checkGlobalDiscrepancy();
