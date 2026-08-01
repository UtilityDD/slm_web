/**
 * READ-ONLY: Compare Abujar (or named user) monthly leaderboard vs raw quiz_attempts.
 * Usage: node scripts/maintenance/diag_abujar_monthly_vs_hourly.mjs [name] [YYYY-MM]
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const TZ = 'Asia/Kolkata';

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

function monthParts(arg) {
    if (arg && /^\d{4}-\d{2}$/.test(arg)) {
        const [y, m] = arg.split('-').map(Number);
        return { y, m };
    }
    const now = new Date();
    return { y: now.getFullYear(), m: now.getMonth() + 1 };
}

function boundsIso(y, m) {
    // IST calendar month as UTC ISO bounds (IST midnight = UTC previous day 18:30)
    const start = new Date(`${y}-${String(m).padStart(2, '0')}-01T00:00:00+05:30`).toISOString();
    const endM = m === 12 ? 1 : m + 1;
    const endY = m === 12 ? y + 1 : y;
    const end = new Date(`${endY}-${String(endM).padStart(2, '0')}-01T00:00:00+05:30`).toISOString();
    return { start, end };
}

function quizKind(quizId) {
    if (!quizId) return 'other';
    if (quizId.startsWith('hourly-challenge-')) return 'hourly';
    if (quizId.startsWith('lesson_bonus')) return 'lesson_bonus';
    if (quizId.startsWith('training') || quizId.includes('training')) return 'training';
    return 'other';
}

function parseHourlySlot(quizId) {
    const m = quizId?.match(/^hourly-challenge-(\d{4})-(\d{2})-(\d{2})-(\d{1,2})$/);
    return m ? { y: +m[1], mo: +m[2], d: +m[3], h: +m[4] } : null;
}

function toIst(iso) {
    return new Date(iso).toLocaleString('en-IN', { timeZone: TZ, hour12: false });
}

async function fetchAllAttempts(sb, userId, start, end) {
    let all = [];
    let from = 0;
    while (true) {
        const { data, error } = await sb
            .from('quiz_attempts')
            .select('id, quiz_id, score, penalty, created_at, completed_at')
            .eq('user_id', userId)
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

async function main() {
    const nameQuery = process.argv[2] || 'Abujar';
    const { y, m } = monthParts(process.argv[3]);
    const { start, end } = boundsIso(y, m);
    const monthLabel = `${y}-${String(m).padStart(2, '0')}`;

    const env = loadEnv(path.join(root, '.env.local'));
    const key = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY;
    if (!env.VITE_SUPABASE_URL || !key) {
        console.error('Missing Supabase URL/key in .env.local');
        process.exit(1);
    }
    const sb = createClient(env.VITE_SUPABASE_URL, key);

    const { data: profiles, error: pErr } = await sb
        .from('profiles')
        .select('id, full_name, slm_id, district, points, quiz_points, reading_points, total_penalties, created_at')
        .ilike('full_name', `%${nameQuery}%`);
    if (pErr) throw pErr;
    if (!profiles?.length) {
        console.log(`No profile matching "${nameQuery}"`);
        return;
    }

    console.log(`\n=== Diagnostic month ${monthLabel} (IST bounds ${start} .. ${end}) ===\n`);
    console.table(
        profiles.map((p) => ({
            name: p.full_name,
            slm_id: p.slm_id,
            district: p.district,
            points: p.points,
            quiz_points: p.quiz_points,
            reading_points: p.reading_points,
            total_penalties: p.total_penalties,
            joined: p.created_at,
        }))
    );

    for (const p of profiles) {
        console.log(`\n######## ${p.full_name} (${p.slm_id || p.id}) ########`);

        const { data: mv, error: mvErr } = await sb
            .from('monthly_leaderboard_view')
            .select('*')
            .eq('user_id', p.id)
            .eq('year_num', y)
            .eq('month_num', m)
            .maybeSingle();
        if (mvErr) throw mvErr;

        console.log('\n--- monthly_leaderboard_view row ---');
        console.log(
            mv
                ? {
                      points: mv.points,
                      quiz_points: mv.quiz_points,
                      reading_points: mv.reading_points,
                      total_penalties: mv.total_penalties,
                      month_num: mv.month_num,
                      year_num: mv.year_num,
                  }
                : 'NO ROW for this calendar month in view'
        );

        // Also fetch adjacent months in case of timezone bucketing
        const { data: nearby } = await sb
            .from('monthly_leaderboard_view')
            .select('year_num, month_num, points, quiz_points, reading_points, total_penalties')
            .eq('user_id', p.id)
            .order('year_num', { ascending: false })
            .order('month_num', { ascending: false })
            .limit(6);
        console.log('\n--- nearby monthly_leaderboard_view rows ---');
        console.table(nearby || []);

        const attempts = await fetchAllAttempts(sb, p.id, start, end);
        const byKind = {};
        let gross = 0;
        let pen = 0;
        let net = 0;
        const hourly = [];
        const nonHourly = [];
        const zeroNetHourly = [];
        const highPenalty = [];

        for (const a of attempts) {
            const kind = quizKind(a.quiz_id);
            const s = Number(a.score) || 0;
            const pe = Number(a.penalty) || 0;
            const n = s - pe;
            gross += s;
            pen += pe;
            net += n;
            if (!byKind[kind]) byKind[kind] = { count: 0, gross: 0, penalty: 0, net: 0 };
            byKind[kind].count += 1;
            byKind[kind].gross += s;
            byKind[kind].penalty += pe;
            byKind[kind].net += n;

            const row = {
                quiz_id: a.quiz_id,
                score: s,
                penalty: pe,
                net: n,
                created_ist: toIst(a.created_at),
                created_at: a.created_at,
            };
            if (kind === 'hourly') {
                hourly.push(row);
                if (n <= 0 && (s > 0 || pe > 0)) zeroNetHourly.push(row);
                if (pe > 0) highPenalty.push(row);
            } else {
                nonHourly.push(row);
            }
        }

        console.log('\n--- Raw attempts in IST month window ---');
        console.log({
            attempt_count: attempts.length,
            gross_score_sum: gross,
            penalty_sum: pen,
            net_sum: net,
            view_points: mv?.points ?? null,
            view_minus_raw_net: (mv?.points ?? null) != null ? Number(mv.points) - net : null,
            raw_net_minus_view: (mv?.points ?? null) != null ? net - Number(mv.points) : null,
        });
        console.log('\n--- By quiz kind ---');
        console.table(byKind);

        // Recreate view bucketing using EXTRACT from created_at in JS (local DB uses server TZ)
        // Compare UTC month extract vs IST month from quiz_id / IST wall
        let utcBucketNet = 0;
        let istCreatedBucketNet = 0;
        let hourlyQuizIdMonthNet = 0;
        let hourlyCreatedUtcMonthNet = 0;
        const mismatchedHourly = [];

        for (const a of attempts) {
            const s = Number(a.score) || 0;
            const pe = Number(a.penalty) || 0;
            const n = s - pe;
            const d = new Date(a.created_at);
            if (d.getUTCFullYear() === y && d.getUTCMonth() + 1 === m) utcBucketNet += n;

            const istParts = new Intl.DateTimeFormat('en-CA', {
                timeZone: TZ,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
            }).formatToParts(d);
            const iy = Number(istParts.find((x) => x.type === 'year').value);
            const im = Number(istParts.find((x) => x.type === 'month').value);
            if (iy === y && im === m) istCreatedBucketNet += n;

            if (a.quiz_id?.startsWith('hourly-challenge-')) {
                const slot = parseHourlySlot(a.quiz_id);
                if (slot && slot.y === y && slot.mo === m) hourlyQuizIdMonthNet += n;
                if (d.getUTCFullYear() === y && d.getUTCMonth() + 1 === m) hourlyCreatedUtcMonthNet += n;
                if (slot && (slot.y !== y || slot.mo !== m)) {
                    mismatchedHourly.push({
                        quiz_id: a.quiz_id,
                        slot_month: `${slot.y}-${String(slot.mo).padStart(2, '0')}`,
                        created_ist: toIst(a.created_at),
                        score: s,
                        penalty: pe,
                        net: n,
                    });
                }
            }
        }

        // Also: attempts whose quiz_id is THIS month hourly but created_at outside IST window
        let from = 0;
        let hourlyByQuizId = [];
        while (true) {
            const prefix = `hourly-challenge-${y}-${String(m).padStart(2, '0')}-`;
            const { data, error } = await sb
                .from('quiz_attempts')
                .select('quiz_id, score, penalty, created_at')
                .eq('user_id', p.id)
                .like('quiz_id', `${prefix}%`)
                .order('created_at', { ascending: true })
                .range(from, from + 999);
            if (error) throw error;
            hourlyByQuizId = hourlyByQuizId.concat(data || []);
            if (!data || data.length < 1000) break;
            from += 1000;
        }

        let hourlyByQuizIdGross = 0;
        let hourlyByQuizIdPen = 0;
        let hourlyByQuizIdNet = 0;
        const outsideCreatedWindow = [];
        for (const a of hourlyByQuizId) {
            const s = Number(a.score) || 0;
            const pe = Number(a.penalty) || 0;
            hourlyByQuizIdGross += s;
            hourlyByQuizIdPen += pe;
            hourlyByQuizIdNet += s - pe;
            if (a.created_at < start || a.created_at >= end) {
                outsideCreatedWindow.push({
                    quiz_id: a.quiz_id,
                    created_ist: toIst(a.created_at),
                    score: s,
                    penalty: pe,
                    net: s - pe,
                });
            }
        }

        console.log('\n--- Bucketing comparison ---');
        console.log({
            view_points: mv?.points ?? null,
            raw_net_in_IST_created_window: net,
            net_if_UTC_created_month: utcBucketNet,
            net_if_IST_created_month: istCreatedBucketNet,
            hourly_net_by_quiz_id_month: hourlyByQuizIdNet,
            hourly_gross_by_quiz_id_month: hourlyByQuizIdGross,
            hourly_penalty_by_quiz_id_month: hourlyByQuizIdPen,
            hourly_count_by_quiz_id_month: hourlyByQuizId.length,
            outside_created_window_count: outsideCreatedWindow.length,
        });

        if (outsideCreatedWindow.length) {
            console.log('\n--- Hourly slots for this month but created_at outside IST month window ---');
            console.table(outsideCreatedWindow.slice(0, 40));
        }
        if (mismatchedHourly.length) {
            console.log('\n--- Hourly rows inside created window whose quiz_id month != target ---');
            console.table(mismatchedHourly.slice(0, 40));
        }

        console.log('\n--- Penalties on hourly (this IST created window) ---');
        console.log({
            hourly_attempts: hourly.length,
            hourly_with_penalty: highPenalty.length,
            hourly_penalty_sum: highPenalty.reduce((a, r) => a + r.penalty, 0),
            hourly_gross: hourly.reduce((a, r) => a + r.score, 0),
            hourly_net: hourly.reduce((a, r) => a + r.net, 0),
        });
        if (highPenalty.length) {
            console.log('Sample penalty rows (up to 25):');
            console.table(highPenalty.slice(0, 25));
        }

        if (nonHourly.length) {
            console.log('\n--- Non-hourly attempts in IST created window ---');
            console.table(
                nonHourly.map((r) => ({
                    kind: quizKind(r.quiz_id),
                    quiz_id: r.quiz_id,
                    score: r.score,
                    penalty: r.penalty,
                    net: r.net,
                    created_ist: r.created_ist,
                }))
            );
        }

        // UI-style "today/hourly shows actual" often means gross score without penalty
        const hourlyGrossInWindow = hourly.reduce((a, r) => a + r.score, 0);
        const hourlyNetInWindow = hourly.reduce((a, r) => a + r.net, 0);
        console.log('\n--- Likely UI mismatch explanation candidates ---');
        console.log({
            'A_hourly_gross_score_sum (what players often add up)': hourlyGrossInWindow,
            'B_hourly_net_after_penalty': hourlyNetInWindow,
            'C_monthly_view_points': mv?.points ?? null,
            'D_A_minus_C (gross vs monthly)': mv ? hourlyGrossInWindow - Number(mv.points) : null,
            'E_B_minus_C (hourly net vs monthly)': mv ? hourlyNetInWindow - Number(mv.points) : null,
            'F_all_kinds_net_minus_view': mv ? net - Number(mv.points) : null,
            'G_hourly_by_quiz_id_net_minus_view': mv ? hourlyByQuizIdNet - Number(mv.points) : null,
        });
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
