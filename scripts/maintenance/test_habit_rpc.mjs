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
const uid = 'df1d794f-60db-4ba0-9cf5-f01247374be2';

const { data: logRes, error: logErr } = await sb.rpc('log_reading_habit_completion', {
    p_user_id: uid,
    p_lesson_id: '1.1',
    p_kind: 'review',
});
console.log('log rpc', logRes, logErr);

const { data: latest } = await sb.rpc('get_latest_reading_habit_at', { p_user_id: uid });
console.log('latest after log', latest);

const { count } = await sb
    .from('reading_habit_completions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', uid);
console.log('rows after log', count);
