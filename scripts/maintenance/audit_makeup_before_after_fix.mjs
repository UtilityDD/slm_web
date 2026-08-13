/**
 * Compare makeup violations under OLD (skip played) vs NEW (break on played) rules,
 * split before/after v1.3.92 ship (2026-08-10 09:47 IST).
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
    HOURLY_MAX_MAKEUP_HOURS,
    buildMakeupSession,
    estimateHourlyPacksFromScore,
} from '../../src/utils/hourlyMakeup.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
/** v1.3.92 commit time Asia/Kolkata → UTC */
const FIX_UTC = new Date('2026-08-10T04:17:27.000Z');

function loadEnv(filePath) {
    const env = {};
    for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
        const t = line.trim();
        if (!t || t.startsWith('#')) continue;
        const i = t.indexOf('=');
        if (i < 1) continue;
        let val = t.slice(i + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
        }
        env[t.slice(0, i).trim()] = val;
    }
    return env;
}

function parseQuizId(q) {
    const m = String(q || '').match(/^hourly-challenge-(\d{4})-(\d{2})-(\d{2})-(\d{1,2})$/);
    return m ? { y: +m[1], mo: +m[2], d: +m[3], h: +m[4], key: `${m[1]}-${m[2]}-${m[3]}` } : null;
}

/** Pre-1.3.92: skip played hours, keep counting older misses (staircase). */
function countMissedOld(currentHour, playedHours) {
    const played = playedHours instanceof Set ? playedHours : new Set(playedHours || []);
    const live = Number(currentHour);
    let missed = 0;
    for (let i = 1; i <= HOURLY_MAX_MAKEUP_HOURS; i += 1) {
        const hour = live - i;
        if (hour < 0) break;
        if (!played.has(hour)) missed += 1;
    }
    return missed;
}

/** Post-1.3.92: stop at first played hour. */
function countMissedNew(currentHour, playedHours) {
    const played = playedHours instanceof Set ? playedHours : new Set(playedHours || []);
    const live = Number(currentHour);
    let missed = 0;
    for (let i = 1; i <= HOURLY_MAX_MAKEUP_HOURS; i += 1) {
        const hour = live - i;
        if (hour < 0) break;
        if (played.has(hour)) break;
        missed += 1;
    }
    return missed;
}

async function fetchMonth(sb, userId, start, end) {
    let from = 0;
    let all = [];
    while (true) {
        const { data, error } = await sb
            .from('quiz_attempts')
            .select('quiz_id, score, penalty, created_at')
            .eq('user_id', userId)
            .like('quiz_id', 'hourly-challenge-%')
            .gte('created_at', start)
            .lt('created_at', end)
            .order('created_at', { ascending: true })
            .range(from, from + 999);
        if (error) throw error;
        all = all.concat(data || []);
        if (!data || data.length < 1000) break;
        from += 1000;
    }
    return all;
}

function analyze(rows) {
    const sorted = [...rows].sort((a, b) => {
        const pa = parseQuizId(a.quiz_id);
        const pb = parseQuizId(b.quiz_id);
        if (!pa || !pb) return String(a.created_at).localeCompare(String(b.created_at));
        if (pa.key !== pb.key) return pa.key.localeCompare(pb.key);
        if (pa.h !== pb.h) return pa.h - pb.h;
        return String(a.created_at).localeCompare(String(b.created_at));
    });

    const playedByDay = new Map();
    const out = { beforeFix: { illegalOld: 0, illegalNew: 0, n: 0 }, afterFix: { illegalOld: 0, illegalNew: 0, n: 0 }, afterSamples: [] };

    for (const r of sorted) {
        const slot = parseQuizId(r.quiz_id);
        if (!slot) continue;
        const when = new Date(r.created_at);
        const bucket = when < FIX_UTC ? out.beforeFix : out.afterFix;
        bucket.n += 1;

        const played = playedByDay.get(slot.key) || new Set();
        const score = Number(r.score) || 0;
        const packsEst = estimateHourlyPacksFromScore(score);
        const oldExp = buildMakeupSession(countMissedOld(slot.h, played));
        const newExp = buildMakeupSession(countMissedNew(slot.h, played));

        const illegalOld = score > oldExp.pointsReward || packsEst > oldExp.packs;
        const illegalNew = score > newExp.pointsReward || packsEst > newExp.packs;
        if (illegalOld) bucket.illegalOld += 1;
        if (illegalNew) bucket.illegalNew += 1;

        if (when >= FIX_UTC && illegalNew) {
            out.afterSamples.push({
                quiz_id: r.quiz_id,
                score,
                packsEst,
                oldMax: oldExp.pointsReward,
                newMax: newExp.pointsReward,
                created_at: r.created_at,
            });
        }

        played.add(slot.h);
        playedByDay.set(slot.key, played);
    }
    return out;
}

const env = loadEnv(path.join(root, '.env.local'));
const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY);

const now = new Date();
const y = now.getFullYear();
const m = now.getMonth() + 1;
const start = new Date(y, m - 1, 1).toISOString();
const end = new Date(y, m, 1).toISOString();

const { data: monthly, error } = await sb
    .from('monthly_leaderboard_view')
    .select('user_id, full_name')
    .eq('year_num', y)
    .eq('month_num', m)
    .order('points', { ascending: false })
    .limit(40);
if (error) throw error;

let before = { n: 0, illegalOld: 0, illegalNew: 0 };
let after = { n: 0, illegalOld: 0, illegalNew: 0 };
const afterSamples = [];

for (const u of monthly || []) {
    const rows = await fetchMonth(sb, u.user_id, start, end);
    if (!rows.length) continue;
    const a = analyze(rows);
    before.n += a.beforeFix.n;
    before.illegalOld += a.beforeFix.illegalOld;
    before.illegalNew += a.beforeFix.illegalNew;
    after.n += a.afterFix.n;
    after.illegalOld += a.afterFix.illegalOld;
    after.illegalNew += a.afterFix.illegalNew;
    for (const s of a.afterSamples) afterSamples.push({ name: u.full_name, ...s });
}

console.log('Fix shipped: v1.3.92 @ 2026-08-10 09:47 IST (lookback: skip→break on played hour)\n');
console.table([
    { when: 'BEFORE fix', attempts: before.n, illegal_under_OLD_rules: before.illegalOld, illegal_under_NEW_rules: before.illegalNew },
    { when: 'AFTER fix', attempts: after.n, illegal_under_OLD_rules: after.illegalOld, illegal_under_NEW_rules: after.illegalNew },
]);

console.log('\nMeaning:');
console.log('- illegal_under_NEW_rules BEFORE fix = old staircase scores still in DB (expected leftovers)');
console.log('- illegal_under_OLD_rules ≈ truly wrong even before the fix');
console.log('- AFTER fix illegal_under_NEW_rules = still happening today (or stale APK)');

if (afterSamples.length) {
    console.log(`\nAfter-fix rows that still look illegal under NEW rules (${afterSamples.length}):`);
    console.table(afterSamples.slice(0, 30));
} else {
    console.log('\nNo after-fix illegal rows under NEW rules. Leftovers are old DB scores only.');
}
