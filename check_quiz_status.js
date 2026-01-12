
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wkunyvomogeazjwtenck.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrdW55dm9tb2dlYXpqd3RlbmNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MDIwMDgsImV4cCI6MjA4MTA3ODAwOH0.iY8BjqhUn8rvOwul9a0625LQ_TGmauth5Ltml5mTcR0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function finalSync() {
    console.log("Checking for any matches on 9474935042 or SLM-0030...");

    // 1. Search for phone
    const { data: phoneMatch } = await supabase
        .from('profiles')
        .select('full_name, phone, slm_id')
        .filter('phone', 'ilike', '%9474935042%');

    // 2. Search for SLM
    const { data: slmMatch } = await supabase
        .from('profiles')
        .select('full_name, phone, slm_id')
        .eq('slm_id', 'SLM-0030');

    console.log("\n--- Phone Search Results ---");
    if (phoneMatch && phoneMatch.length > 0) {
        phoneMatch.forEach(p => console.log(`- ${p.full_name} | Phone: ${p.phone} | SLM: ${p.slm_id}`));
    } else {
        console.log("No profile found with phone 9474935042.");
    }

    console.log("\n--- SLM ID Search Results ---");
    if (slmMatch && slmMatch.length > 0) {
        slmMatch.forEach(p => console.log(`- ${p.full_name} | Phone: ${p.phone} | SLM: ${p.slm_id}`));
    } else {
        console.log("No profile found with SLM ID SLM-0030.");
    }
}

finalSync();
