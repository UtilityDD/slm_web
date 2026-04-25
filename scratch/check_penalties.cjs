const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually parse .env.local
const envContent = fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) env[match[1].trim()] = match[2].trim();
});

const supabase = createClient(env['VITE_SUPABASE_URL'], env['VITE_SUPABASE_ANON_KEY']);

async function checkPenalties() {
    console.log("--- Checking Recent Quiz Attempts for Penalties ---");
    const { data: attempts } = await supabase
        .from('quiz_attempts')
        .select('user_id, quiz_id, score, penalty, created_at')
        .gt('penalty', 0)
        .order('created_at', { ascending: false })
        .limit(5);
    console.log(attempts);

    console.log("\n--- Checking Profile Total Penalties ---");
    const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, points, quiz_points, total_penalties')
        .order('total_penalties', { ascending: false })
        .limit(5);
    console.log(profiles);
}

checkPenalties();
