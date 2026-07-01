import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split('\n').filter((l) => l.includes('=')).map((l) => {
    const i = l.indexOf('=');
    return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
}));
const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY);

const { data: profs } = await sb
    .from('profiles')
    .select('id, full_name, slm_id, created_at, reading_points, points')
    .gte('created_at', '2026-04-01T00:00:00')
    .order('created_at');

console.log('90-day joiners:', profs?.length);
for (const p of profs || []) {
    const [{ count: hourly }, { count: lessons }, { data: june }] = await Promise.all([
        sb.from('quiz_attempts').select('*', { count: 'exact', head: true }).eq('user_id', p.id).like('quiz_id', 'hourly-challenge-%').gte('created_at', '2026-06-01'),
        sb.from('quiz_attempts').select('*', { count: 'exact', head: true }).eq('user_id', p.id).like('quiz_id', 'lesson_bonus%').gte('created_at', '2026-06-01'),
        sb.from('monthly_leaderboard_view').select('points, reading_points').eq('user_id', p.id).eq('year_num', 2026).eq('month_num', 6).maybeSingle(),
    ]);
    console.log({
        name: p.full_name,
        slm: p.slm_id,
        joined: p.created_at?.slice(0, 10),
        lifetime: p.points,
        june_pts: june?.points || 0,
        hourly_june: hourly,
        lessons_june: lessons,
    });
}
