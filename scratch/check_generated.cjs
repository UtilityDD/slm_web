const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wkunyvomogeazjwtenck.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrdW55dm9tb2dlYXpqd3RlbmNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MDIwMDgsImV4cCI6MjA4MTA3ODAwOH0.iY8BjqhUn8rvOwul9a0625LQ_TGmauth5Ltml5mTcR0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkColumnDefinition() {
    console.log('Checking column definition for reading_points...');
    // We can't check column definitions easily, so we try to update it manually.
    // If it's a generated column, manual update will fail.
    
    const userId = '7eb18b11-c871-4001-bda4-5b9a08e7f059'; // SLM-0003
    const { error } = await supabase
        .from('profiles')
        .update({ reading_points: 320 }) // Set to same value to see if it's allowed
        .eq('id', userId);

    if (error && error.message.includes('generated')) {
        console.log('CONFIRMED: reading_points is a GENERATED column!');
    } else if (error) {
        console.log('Update failed for other reason:', error.message);
    } else {
        console.log('Update succeeded. It is NOT a generated column.');
    }
}

checkColumnDefinition();
