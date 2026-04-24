const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://wkunyvomogeazjwtenck.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrdW55dm9tb2dlYXpqd3RlbmNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MDIwMDgsImV4cCI6MjA4MTA3ODAwOH0.iY8BjqhUn8rvOwul9a0625LQ_TGmauth5Ltml5mTcR0'; 

const supabase = createClient(supabaseUrl, supabaseKey);

async function find() {
    const { data, error } = await supabase.from('profiles').select('id, full_name, slm_id, completed_lessons');
    if (error) { console.error(error); return; }

    data.forEach(u => {
        const lessons = Array.isArray(u.completed_lessons) ? u.completed_lessons : [];
        if (lessons.some(l => l.toUpperCase().includes('DEBUG') || l.toUpperCase().includes('TEST'))) {
            console.log(`Found debug data in: ${u.full_name} [${u.slm_id || u.id}]`);
            console.log(`Lessons:`, lessons);
        }
    });
}

find();
