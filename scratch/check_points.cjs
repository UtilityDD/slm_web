const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPoints() {
    const { data, error } = await supabase.from('profiles').select('id, full_name, points, reading_points, quiz_points').limit(5);
    console.log(JSON.stringify(data, null, 2));
}
checkPoints();
