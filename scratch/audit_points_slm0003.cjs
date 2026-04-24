const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wkunyvomogeazjwtenck.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrdW55dm9tb2dlYXpqd3RlbmNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MDIwMDgsImV4cCI6MjA4MTA3ODAwOH0.iY8BjqhUn8rvOwul9a0625LQ_TGmauth5Ltml5mTcR0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkPoints() {
    const userId = '7eb18b11-c871-4001-bda4-5b9a08e7f059'; // SLM-0003
    
    const { data, error } = await supabase
        .from('profiles')
        .select('points, reading_points, quiz_points')
        .eq('id', userId)
        .single();
        
    if (error) console.error(error);
    else {
        console.log('User Points Audit:');
        console.log(`Total Points: ${data.points}`);
        console.log(`Reading Points: ${data.reading_points}`);
        console.log(`Quiz Points: ${data.quiz_points}`);
        console.log(`Sum (R+Q): ${data.reading_points + data.quiz_points}`);
        console.log(`Discrepancy: ${data.points - (data.reading_points + data.quiz_points)}`);
    }
}

checkPoints();
