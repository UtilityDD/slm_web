import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Manual .env parsing
const envPath = path.resolve('d:/Dipankar/MyCodes/AndroidProjects/slm_web', '.env');
const envData = fs.readFileSync(envPath, 'utf8');
const env = {};
envData.split('\n').forEach(line => {
    const [key, ...value] = line.split('=');
    if (key && value) env[key.trim()] = value.join('=').trim();
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkUser() {
    console.log("Searching for Subrata Sarkar...");
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .ilike('full_name', '%Subrata Sarkar%');

    if (error) {
        console.error("Error fetching user:", error);
        return;
    }

    if (data && data.length > 0) {
        console.log("User found:");
        data.forEach(u => {
             console.log(JSON.stringify({
                 id: u.id,
                 full_name: u.full_name,
                 points: u.points,
                 reading_points: u.reading_points,
                 quiz_points: u.quiz_points,
                 training_level: u.training_level,
                 completed_lessons: u.completed_lessons
             }, null, 2));
        });
    } else {
        console.log("User not found.");
    }
}

checkUser();
