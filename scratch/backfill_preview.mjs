/**
 * BACKFILL PREVIEW SCRIPT
 * 
 * This script only READS data and shows what would be inserted.
 * Nothing is written to the database here.
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '.env.local');

function loadEnv(filePath) {
    if (!fs.existsSync(filePath)) return {};
    const content = fs.readFileSync(filePath, 'utf8');
    const env = {};
    content.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
            env[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
        }
    });
    return env;
}

const env = loadEnv(envPath);
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function previewBackfill() {
    console.log('=== BACKFILL PREVIEW (READ-ONLY) ===\n');

    // 1. Fetch all profiles with completed_lessons
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, full_name, created_at, completed_lessons, reading_points')
        .not('completed_lessons', 'is', null);

    if (error) { console.error('Error:', error); return; }

    // 2. Fetch existing lesson_bonus entries in quiz_attempts to avoid counting duplicates
    const { data: existing, error: existErr } = await supabase
        .from('quiz_attempts')
        .select('user_id, quiz_id')
        .ilike('quiz_id', 'lesson_bonus_%');

    if (existErr) { console.error('Error:', existErr); return; }

    const existingSet = new Set(existing.map(e => `${e.user_id}::${e.quiz_id}`));

    let totalToInsert = 0;
    let totalAlreadyExist = 0;
    let totalUsers = 0;

    console.log('User                     | Lessons | New Inserts | Already Exist | Join Date');
    console.log('-------------------------|---------|-------------|---------------|----------');

    for (const profile of profiles) {
        let lessons = [];
        try {
            if (typeof profile.completed_lessons === 'string') {
                lessons = JSON.parse(profile.completed_lessons);
            } else if (Array.isArray(profile.completed_lessons)) {
                lessons = profile.completed_lessons;
            }
        } catch { continue; }

        // Filter valid lesson IDs like "1.1", "2.3" etc
        const validLessons = lessons.filter(l => /^\d+\.\d+$/.test(String(l)));
        if (validLessons.length === 0) continue;

        totalUsers++;

        let newCount = 0;
        let existCount = 0;
        for (const lessonId of validLessons) {
            const key = `${profile.id}::lesson_bonus_${lessonId}`;
            if (existingSet.has(key)) {
                existCount++;
            } else {
                newCount++;
                totalToInsert++;
            }
        }
        totalAlreadyExist += existCount;

        const name = (profile.full_name || 'Unknown').substring(0, 24).padEnd(24);
        const joinDate = new Date(profile.created_at).toLocaleDateString('en-IN');
        console.log(`${name} | ${String(validLessons.length).padStart(7)} | ${String(newCount).padStart(11)} | ${String(existCount).padStart(13)} | ${joinDate}`);
    }

    console.log('\n=== SUMMARY ===');
    console.log(`Total users with completed lessons: ${totalUsers}`);
    console.log(`New rows to INSERT:                 ${totalToInsert}`);
    console.log(`Already exist (skipped):            ${totalAlreadyExist}`);
    console.log(`Points to be tracked in monthly LB: ${totalToInsert * 20}`);
    console.log('\nAll inserts use ON CONFLICT DO NOTHING — 100% safe, no data loss.');
}

previewBackfill();
