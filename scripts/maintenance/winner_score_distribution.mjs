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
const uid = '5804649c-ebbe-44b4-ae56-70013cf41d87';
const { data } = await sb
    .from('quiz_attempts')
    .select('score,penalty,quiz_id,created_at')
    .eq('user_id', uid)
    .gte('created_at', '2026-05-01')
    .lt('created_at', '2026-06-01');

const hist = {};
let maxNet = 0;
let minNet = 999;
let over50 = 0;
let perfect50 = 0;
const byDay = {};
for (const r of data || []) {
    const net = (r.score || 0) - (r.penalty || 0);
    hist[net] = (hist[net] || 0) + 1;
    maxNet = Math.max(maxNet, net);
    minNet = Math.min(minNet, net);
    if (net > 50) over50++;
    if (net === 50) perfect50++;
    const d = r.created_at.slice(0, 10);
    byDay[d] = (byDay[d] || 0) + 1;
}
const days = Object.keys(byDay).length;
console.log(JSON.stringify({
    attempts: data.length,
    netMin: minNet,
    netMax: maxNet,
    perfect50Hours: perfect50,
    over50Net: over50,
    activeDays: days,
    avgAttemptsPerDay: Number((data.length / days).toFixed(1)),
    topNetBuckets: Object.entries(hist)
        .sort((a, b) => Number(b[0]) - Number(a[0]))
        .slice(0, 12)
        .map(([k, v]) => ({ net: Number(k), count: v })),
    nonMayHourlyIds: (data || []).filter((r) => !r.quiz_id.startsWith('hourly-challenge-2026-05-')).length,
}, null, 2));
