import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split('\n').filter((l) => l.includes('=')).map((l) => {
    const i = l.indexOf('=');
    return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
}));
const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY);

const { data } = await sb
    .from('quiz_attempts')
    .select('user_id, score, quiz_id, profiles(full_name, slm_id)')
    .like('quiz_id', 'lesson_bonus%')
    .gte('created_at', '2026-06-01')
    .lt('created_at', '2026-07-01');

const m = {};
for (const r of data || []) {
    const id = r.user_id;
    if (!m[id]) m[id] = { name: r.profiles?.full_name, slm: r.profiles?.slm_id, score: 0, lessons: new Set() };
    m[id].score += r.score || 0;
    m[id].lessons.add(r.quiz_id);
}
const list = Object.entries(m)
    .map(([id, x]) => ({ user_id: id, name: x.name, slm: x.slm, score: x.score, lessons: x.lessons.size }))
    .sort((a, b) => b.score - a.score);
console.log('June lesson players:', list.length);
console.log(JSON.stringify(list.slice(0, 15), null, 2));
