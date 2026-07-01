import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const env = Object.fromEntries(
    fs
        .readFileSync(path.join(root, '.env.local'), 'utf8')
        .split('\n')
        .filter((l) => l.includes('='))
        .map((l) => {
            const i = l.indexOf('=');
            return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
        })
);
const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY);
const userId = process.argv[2] || '5804649c-ebbe-44b4-ae56-70013cf41d87';

const { data: profile } = await sb
    .from('profiles')
    .select('full_name, slm_id, points, quiz_points, reading_points, total_penalties, training_level, created_at')
    .eq('id', userId)
    .single();

const { data: lv } = await sb.from('leaderboard_view').select('score, reading_points').eq('user_id', userId).maybeSingle();

// Paginate all attempts
let all = [];
let from = 0;
const page = 1000;
while (true) {
    const { data, error } = await sb
        .from('quiz_attempts')
        .select('quiz_id, score, penalty')
        .eq('user_id', userId)
        .range(from, from + page - 1);
    if (error) throw error;
    if (!data?.length) break;
    all = all.concat(data);
    if (data.length < page) break;
    from += page;
}

let gross = 0;
let pen = 0;
let hourlyGross = 0;
let hourlyPen = 0;
let lessonGross = 0;
let otherGross = 0;
let otherPen = 0;

for (const r of all) {
    const s = Number(r.score) || 0;
    const p = Number(r.penalty) || 0;
    gross += s;
    pen += p;
    const qid = r.quiz_id || '';
    if (qid.startsWith('hourly-challenge')) {
        hourlyGross += s;
        hourlyPen += p;
    } else if (qid.startsWith('lesson_bonus')) {
        lessonGross += s;
    } else {
        otherGross += s;
        otherPen += p;
    }
}

const netFromAttempts = gross - pen;
const name = profile?.full_name || userId;

console.log(JSON.stringify(
    {
        user: { name, slm_id: profile?.slm_id, id: userId },
        profile: {
            points: profile?.points,
            quiz_points: profile?.quiz_points,
            reading_points: profile?.reading_points,
            total_penalties: profile?.total_penalties,
        },
        leaderboard_view: lv,
        attempt_rows: all.length,
        sums_from_quiz_attempts: {
            gross_score: gross,
            sum_penalty: pen,
            net_score_minus_penalty: netFromAttempts,
            hourly: { gross: hourlyGross, penalty: hourlyPen, net: hourlyGross - hourlyPen },
            lesson_bonus: { gross: lessonGross, penalty: 0 },
            other_quizzes: { gross: otherGross, penalty: otherPen, net: otherGross - otherPen },
        },
        drift: {
            profile_points_vs_net_attempts: (profile?.points ?? 0) - netFromAttempts,
            profile_penalties_vs_sum_penalty: (profile?.total_penalties ?? 0) - pen,
            profile_points_vs_gross_minus_profile_penalties: (profile?.points ?? 0) - (gross - (profile?.total_penalties ?? 0)),
        },
        explanation: {
            lifetime_points_formula: 'profiles.points should equal SUM(score) - SUM(penalty) across all quiz_attempts',
            total_penalties_formula: 'profiles.total_penalties should equal SUM(penalty)',
            penalty_reduces_score_by: pen,
        },
    },
    null,
    2
));
