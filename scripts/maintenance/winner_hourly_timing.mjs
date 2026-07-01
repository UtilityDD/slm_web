/**
 * Hour-of-day / day patterns for a user's hourly-challenge attempts.
 * Usage: node scripts/maintenance/winner_hourly_timing.mjs [YYYY-MM] [user_id]
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..', '..');

function loadEnv(filePath) {
    if (!fs.existsSync(filePath)) return {};
    const env = {};
    for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
        const t = line.trim();
        if (!t || t.startsWith('#')) continue;
        const i = t.indexOf('=');
        if (i < 1) continue;
        const key = t.slice(0, i).trim();
        let val = t.slice(i + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
        }
        env[key] = val;
    }
    return env;
}

function parseTargetMonth(arg) {
    const now = new Date();
    if (arg && /^\d{4}-\d{1,2}$/.test(arg)) {
        const [y, m] = arg.split('-').map(Number);
        return { year: y, month: m };
    }
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

function parseQuizHour(quizId) {
    // hourly-challenge-2026-05-01-14
    const m = quizId?.match(/^hourly-challenge-(\d{4})-(\d{2})-(\d{2})-(\d{1,2})$/);
    if (!m) return null;
    return {
        year: Number(m[1]),
        month: Number(m[2]),
        day: Number(m[3]),
        hourSlot: Number(m[4]),
    };
}

function hourLabel(h) {
    return `${String(h).padStart(2, '0')}:00`;
}

async function main() {
    const env = loadEnv(path.join(root, '.env.local'));
    const url = env.VITE_SUPABASE_URL;
    const key = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY;
    if (!url || !key) {
        console.error('Missing Supabase credentials in .env.local');
        process.exit(1);
    }

    const target = parseTargetMonth(process.argv[2]);
    const userId = process.argv[3] || '5804649c-ebbe-44b4-ae56-70013cf41d87';
    const { year, month } = target;
    const startIso = new Date(Date.UTC(year, month - 1, 1)).toISOString();
    const endIso = new Date(Date.UTC(year, month, 1)).toISOString();

    const supabase = createClient(url, key);

    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, slm_id')
        .eq('id', userId)
        .single();

    const { data: attempts, error } = await supabase
        .from('quiz_attempts')
        .select('quiz_id, score, penalty, created_at')
        .eq('user_id', userId)
        .like('quiz_id', 'hourly-challenge-%')
        .gte('created_at', startIso)
        .lt('created_at', endIso)
        .order('created_at', { ascending: true });

    if (error) {
        console.error(error.message);
        process.exit(1);
    }

    const rows = attempts || [];
    const byDay = {};
    const byHourSlot = Array.from({ length: 24 }, () => 0);
    const byHourPlayedUtc = Array.from({ length: 24 }, () => 0);
    const byHourPlayedIst = Array.from({ length: 24 }, () => 0);
    const slotVsPlayedHour = [];
    let mismatchSlot = 0;

    for (const r of rows) {
        const slot = parseQuizHour(r.quiz_id);
        const playedUtc = new Date(r.created_at);
        const utcH = playedUtc.getUTCHours();
        const istH = (utcH + 5 + 24) % 24; // IST = UTC+5:30 approximated to +5 for hour bucket (close enough for pattern)

        byHourPlayedUtc[utcH]++;
        byHourPlayedIst[istH]++;

        if (slot) {
            byHourSlot[slot.hourSlot]++;
            if (slot.hourSlot !== utcH) mismatchSlot++;
            slotVsPlayedHour.push({
                quiz_id: r.quiz_id,
                slotHour: slot.hourSlot,
                playedUtc: r.created_at,
                playedUtcHour: utcH,
                playedIstHour: istH,
                deltaHours: utcH - slot.hourSlot,
            });
        }

        const dayKey = r.created_at.slice(0, 10);
        if (!byDay[dayKey]) byDay[dayKey] = { count: 0, hours: new Set(), slots: [] };
        byDay[dayKey].count++;
        byDay[dayKey].hours.add(utcH);
        if (slot) byDay[dayKey].slots.push(slot.hourSlot);
    }

    const dayStats = Object.entries(byDay)
        .map(([date, v]) => ({
            date,
            attempts: v.count,
            distinctUtcHoursPlayed: v.hours.size,
            distinctSlotsClaimed: new Set(v.slots).size,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

    const avgPerDay = dayStats.length
        ? (rows.length / dayStats.length).toFixed(1)
        : 0;
    const avgDistinctHours = dayStats.length
        ? (dayStats.reduce((s, d) => s + d.distinctUtcHoursPlayed, 0) / dayStats.length).toFixed(1)
        : 0;

    console.log(`\n=== Hourly play timing: ${profile?.full_name || userId} ===`);
    console.log(`Period: ${year}-${String(month).padStart(2, '0')} (UTC month filter on created_at)`);
    console.log(`SLM ID: ${profile?.slm_id || '—'}`);
    console.log(`Total hourly attempts: ${rows.length}`);
    console.log(`Active calendar days: ${dayStats.length}`);
    console.log(`Avg attempts / day: ${avgPerDay}`);
    console.log(`Avg distinct UTC hours played / day: ${avgDistinctHours}`);
    console.log(
        `Quiz slot hour vs actual UTC hour mismatch rows: ${mismatchSlot} / ${rows.length} (client uses local clock for slot id)\n`
    );

    console.log('--- Plays by QUIZ SLOT hour (from quiz_id, usually device LOCAL hour) ---');
    const maxSlot = Math.max(...byHourSlot, 1);
    for (let h = 0; h < 24; h++) {
        const n = byHourSlot[h];
        const bar = '█'.repeat(Math.round((n / maxSlot) * 40));
        console.log(`${hourLabel(h)}  ${String(n).padStart(4)}  ${bar}`);
    }

    console.log('\n--- Plays by actual SUBMIT time (UTC hour) ---');
    const maxUtc = Math.max(...byHourPlayedUtc, 1);
    for (let h = 0; h < 24; h++) {
        const n = byHourPlayedUtc[h];
        const bar = '█'.repeat(Math.round((n / maxUtc) * 40));
        console.log(`${hourLabel(h)}  ${String(n).padStart(4)}  ${bar}`);
    }

    console.log('\n--- Plays by actual SUBMIT time (IST ≈ UTC+5:30, hour bucket) ---');
    const maxIst = Math.max(...byHourPlayedIst, 1);
    for (let h = 0; h < 24; h++) {
        const n = byHourPlayedIst[h];
        const bar = '█'.repeat(Math.round((n / maxIst) * 40));
        console.log(`${hourLabel(h)}  ${String(n).padStart(4)}  ${bar}`);
    }

    console.log('\n--- Per day: attempts & distinct hours (UTC) ---');
    console.log('Date         | Plays | Distinct UTC hours | Distinct quiz slots');
    console.log('-------------|-------|--------------------|--------------------');
    for (const d of dayStats) {
        console.log(
            `${d.date} | ${String(d.attempts).padStart(5)} | ${String(d.distinctUtcHoursPlayed).padStart(18)} | ${String(d.distinctSlotsClaimed).padStart(19)}`
        );
    }

    const minDay = dayStats.reduce((a, b) => (a.attempts < b.attempts ? a : b), dayStats[0]);
    const maxDay = dayStats.reduce((a, b) => (a.attempts > b.attempts ? a : b), dayStats[0]);
    console.log(`\nQuietest day: ${minDay?.date} (${minDay?.attempts} plays, ${minDay?.distinctUtcHoursPlayed} UTC hours)`);
    console.log(`Busiest day:  ${maxDay?.date} (${maxDay?.attempts} plays, ${maxDay?.distinctUtcHoursPlayed} UTC hours)`);

    // Sample: first hour of day with many plays
    const busyDay = maxDay?.date;
    if (busyDay && byDay[busyDay]) {
        const times = rows
            .filter((r) => r.created_at.startsWith(busyDay))
            .map((r) => {
                const slot = parseQuizHour(r.quiz_id);
                const t = new Date(r.created_at);
                return {
                    slot: slot ? hourLabel(slot.hourSlot) : '?',
                    utc: t.toISOString().slice(11, 19),
                    ist: new Date(t.getTime() + 5.5 * 3600000).toISOString().slice(11, 19),
                };
            });
        console.log(`\n--- Sample timestamps on busiest day (${busyDay}), first 25 plays ---`);
        console.log('quiz_slot  | submit_UTC | submit_IST(approx)');
        times.slice(0, 25).forEach((t) => {
            console.log(`${t.slot.padEnd(9)} | ${t.utc} | ${t.ist}`);
        });
    }

    const outPath = path.join(root, 'scratch', `hourly_timing_${userId.slice(0, 8)}_${year}-${month}.json`);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(
        outPath,
        JSON.stringify(
            {
                user: profile,
                period: { year, month, startIso, endIso },
                summary: {
                    total: rows.length,
                    activeDays: dayStats.length,
                    avgPerDay,
                    avgDistinctUtcHoursPerDay: avgDistinctHours,
                    mismatchSlotVsUtcHour: mismatchSlot,
                },
                byQuizSlotHour: byHourSlot,
                bySubmitUtcHour: byHourPlayedUtc,
                bySubmitIstHour: byHourPlayedIst,
                byDay: dayStats,
            },
            null,
            2
        )
    );
    console.log(`\nFull JSON: ${outPath}\n`);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
