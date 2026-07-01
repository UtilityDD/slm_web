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

const { data: tsMatch } = await sb
    .from('reading_habit_completions')
    .select('user_id, lesson_id, completed_at, source')
    .eq('completed_at', '2025-12-23T12:47:42.427133+00:00')
    .limit(5);
console.log('rows at exact ts', tsMatch);

const { data: rpc } = await sb.rpc('get_latest_reading_habit_at', { p_user_id: uid });
console.log('rpc for uid', rpc);

const { data: rpcNull } = await sb.rpc('get_latest_reading_habit_at', { p_user_id: null });
console.log('rpc null uid', rpcNull);

const { count: total } = await sb
    .from('reading_habit_completions')
    .select('*', { count: 'exact', head: true });
console.log('table total rows', total);

const { data: appRows } = await sb
    .from('reading_habit_completions')
    .select('user_id, lesson_id, completed_at, source')
    .eq('source', 'app')
    .order('completed_at', { ascending: false })
    .limit(10);
console.log('recent app rows', appRows);
