import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = Object.fromEntries(
    fs
        .readFileSync('.env.local', 'utf8')
        .split('\n')
        .filter((l) => l.includes('='))
        .map((l) => {
            const i = l.indexOf('=');
            return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
        })
);
const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY);

const { data: prof, error: pErr } = await sb
    .from('profiles')
    .select('id, full_name, slm_id, completed_lessons, training_level')
    .or('full_name.ilike.%jahangir%,slm_id.eq.SLM-0007')
    .limit(5);
if (pErr) {
    console.error(pErr);
    process.exit(1);
}
console.log('profiles', JSON.stringify(prof, null, 2));
if (!prof?.[0]) process.exit(0);
const uid = prof[0].id;

const { data: habit } = await sb
    .from('reading_habit_completions')
    .select('*')
    .eq('user_id', uid)
    .order('completed_at', { ascending: false })
    .limit(15);
console.log('habit rows', JSON.stringify(habit, null, 2));

const { data: latest } = await sb.rpc('get_latest_reading_habit_at', { p_user_id: uid });
console.log('latest_habit_at', latest);

const core = (prof[0].completed_lessons || []).filter((x) => /^\d+\.\d+$/.test(String(x)));
console.log('core_lesson_count', core.length);
console.log('sample lessons', core.slice(0, 5), '...', core.slice(-3));

const { data: bonuses } = await sb
    .from('quiz_attempts')
    .select('quiz_id, score, created_at')
    .eq('user_id', uid)
    .like('quiz_id', 'lesson_bonus%')
    .order('created_at', { ascending: false })
    .limit(5);
console.log('recent bonuses', bonuses);

const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
console.log('48h cutoff', twoDaysAgo);
console.log('within_48h', latest && new Date(latest) > new Date(twoDaysAgo));

const { count } = await sb
    .from('reading_habit_completions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', uid);
console.log('habit_row_count', count);

const { data: bySource } = await sb
    .from('reading_habit_completions')
    .select('lesson_id, completed_at, source')
    .eq('user_id', uid)
    .order('completed_at', { ascending: false })
    .limit(20);
console.log('by_source', JSON.stringify(bySource, null, 2));

// Simulate graduate gate
const CORE = 9;
const DEFAULT = { 1: 10, 2: 10, 3: 10, 4: 10, 5: 10, 6: 11, 7: 10, 8: 10, 9: 10 };
let total = 0;
for (let n = 1; n <= CORE; n++) total += DEFAULT[n];
console.log('expected_core_total', total, 'actual', core.length, 'graduate', core.length >= total);
