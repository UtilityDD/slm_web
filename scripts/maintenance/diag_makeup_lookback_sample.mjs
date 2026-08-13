import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
    countRecentMissedHours,
    buildMakeupSession,
    estimateHourlyPacksFromScore,
} from '../../src/utils/hourlyMakeup.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const env = Object.fromEntries(
    fs.readFileSync(path.join(root, '.env.local'), 'utf8')
        .split('\n')
        .filter((l) => l.includes('='))
        .map((l) => {
            const i = l.indexOf('=');
            return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
        })
);
const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY);

function parse(q) {
    const m = String(q).match(/hourly-challenge-(\d{4})-(\d{2})-(\d{2})-(\d{1,2})$/);
    return m ? { day: `${m[1]}-${m[2]}-${m[3]}`, h: +m[4] } : null;
}

const names = ['Pankaj Pal', 'Soharab Hossain', 'Abujar Rahaman', 'Tamal Sar'];

for (const name of names) {
    const { data: profs } = await sb.from('profiles').select('id, full_name').ilike('full_name', name).limit(1);
    const p = profs?.[0];
    if (!p) {
        console.log('skip', name);
        continue;
    }
    const { data: rows } = await sb
        .from('quiz_attempts')
        .select('quiz_id, score, penalty, created_at')
        .eq('user_id', p.id)
        .or('quiz_id.like.hourly-challenge-2026-08-09%,quiz_id.like.hourly-challenge-2026-08-10%')
        .order('created_at', { ascending: true });

    console.log(`\n=== ${p.full_name} Aug 9-10 ===`);
    const byDay = new Map();
    const sorted = [...(rows || [])].sort((a, b) => {
        const pa = parse(a.quiz_id);
        const pb = parse(b.quiz_id);
        if (!pa || !pb) return 0;
        if (pa.day !== pb.day) return pa.day.localeCompare(pb.day);
        return pa.h - pb.h;
    });
    for (const r of sorted) {
        const s = parse(r.quiz_id);
        if (!s) continue;
        const played = byDay.get(s.day) || new Set();
        const miss = countRecentMissedHours(s.h, played);
        const exp = buildMakeupSession(miss);
        const est = estimateHourlyPacksFromScore(r.score);
        const bad = est > exp.packs || Number(r.score) > exp.pointsReward;
        console.log(
            `${r.quiz_id.slice(-11)} score=${r.score} est=${est} expect=${exp.packs}/${exp.pointsReward} before=[${[...played].sort((a, b) => a - b).join(' ')}] ${bad ? 'FLAG' : 'ok'}`
        );
        played.add(s.h);
        byDay.set(s.day, played);
    }
}
