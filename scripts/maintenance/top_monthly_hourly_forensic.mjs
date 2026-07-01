/**
 * Flag hourly quiz timing inconsistencies for current-month top leaderboard users.
 * Usage: node scripts/maintenance/top_monthly_hourly_forensic.mjs [topN]
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const TZ = 'Asia/Kolkata';

function loadEnv(filePath) {
    if (!fs.existsSync(filePath)) return {};
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

function parseQuizSlot(quizId) {
    const m = quizId?.match(/^hourly-challenge-(\d{4})-(\d{2})-(\d{2})-(\d{1,2})$/);
    if (!m) return null;
    return {
        date: `${m[1]}-${m[2]}-${m[3]}`,
        hourSlot: Number(m[4]),
    };
}

function istParts(iso) {
    const d = new Date(iso);
    const date = d.toLocaleString('en-CA', { timeZone: TZ }).slice(0, 10);
    const hour = Number(d.toLocaleString('en-GB', { timeZone: TZ, hour: 'numeric', hour12: false }));
    return { date, hour, ms: d.getTime(), label: d.toLocaleString('en-IN', { timeZone: TZ, hour12: true }) };
}

function analyzeAttempts(attempts) {
    const rows = (attempts || []).slice().sort((a, b) => a.created_at.localeCompare(b.created_at));
    const flags = [];
    const suspicious = [];

    for (const r of rows) {
        const slot = parseQuizSlot(r.quiz_id);
        const submit = istParts(r.created_at);
        const net = (r.score || 0) - (r.penalty || 0);

        if (!slot) {
            flags.push('bad_quiz_id');
            suspicious.push({ ...r, net, reason: 'bad quiz_id', submit: submit.label, slot: r.quiz_id });
            continue;
        }

        const delta = submit.hour - slot.hourSlot;
        const sameDay = slot.date === submit.date;
        let reasons = [];

        if (!sameDay) reasons.push('wrong_day');
        if (Math.abs(delta) > 1) reasons.push(`hour_delta_${delta}`);
        if (slot.date > submit.date || (sameDay && slot.hourSlot > submit.hour + 1)) reasons.push('future_slot');
        if (Math.abs(delta) === 1 && delta < 0) reasons.push('early_slot');

        if (reasons.length) {
            suspicious.push({
                quiz_id: r.quiz_id,
                score: r.score,
                penalty: r.penalty,
                net,
                submit_ist: submit.label,
                slot: `${slot.date} H${String(slot.hourSlot).padStart(2, '0')}`,
                delta_h: delta,
                reasons: reasons.join(', '),
            });
            for (const reason of reasons) flags.push(reason);
        }
    }

    // Burst: 3+ distinct slots within 30 minutes
    for (let i = 0; i < rows.length; i++) {
        const windowStart = istParts(rows[i].created_at).ms;
        const inWindow = [];
        for (let j = i; j < rows.length; j++) {
            const t = istParts(rows[j].created_at).ms;
            if (t - windowStart > 30 * 60 * 1000) break;
            const slot = parseQuizSlot(rows[j].quiz_id);
            if (slot) inWindow.push({ slot: `${slot.date}-${slot.hourSlot}`, quiz_id: rows[j].quiz_id, submit: rows[j].created_at });
        }
        const distinct = new Set(inWindow.map((x) => x.slot));
        if (distinct.size >= 3) {
            flags.push('burst_3_slots_30min');
            suspicious.push({
                type: 'burst',
                from: istParts(rows[i].created_at).label,
                distinct_slots: distinct.size,
                minutes: 30,
                slots: [...distinct].join(', '),
            });
            break;
        }
    }

    return {
        total: rows.length,
        suspiciousCount: suspicious.length,
        flags: [...new Set(flags)],
        suspicious,
        rows,
    };
}

async function main() {
    const topN = Number(process.argv[2] || 15);
    const env = loadEnv(path.join(root, '.env.local'));
    const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY);

    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const monthStart = new Date(y, m - 1, 1).toISOString();
    const monthEnd = new Date(y, m, 1).toISOString();

    console.log(`\n=== Top monthly hourly forensic ===`);
    console.log(`Month: ${y}-${String(m).padStart(2, '0')} | Top ${topN} on champion board\n`);

    const { data: monthly, error: mErr } = await sb
        .from('monthly_leaderboard_view')
        .select('user_id, full_name, points, profiles(slm_id, district)')
        .eq('year_num', y)
        .eq('month_num', m)
        .order('points', { ascending: false })
        .limit(topN);

    if (mErr) {
        console.error(mErr.message);
        process.exit(1);
    }

    const userIds = monthly.map((r) => r.user_id);
    const { data: attempts, error: aErr } = await sb
        .from('quiz_attempts')
        .select('user_id, quiz_id, score, penalty, created_at')
        .in('user_id', userIds)
        .like('quiz_id', 'hourly-challenge-%')
        .gte('created_at', monthStart)
        .lt('created_at', monthEnd)
        .order('created_at', { ascending: true });

    if (aErr) {
        console.error(aErr.message);
        process.exit(1);
    }

    const byUser = {};
    for (const a of attempts || []) {
        if (!byUser[a.user_id]) byUser[a.user_id] = [];
        byUser[a.user_id].push(a);
    }

    const summary = [];
    const flaggedDetails = [];

    for (const row of monthly) {
        const uid = row.user_id;
        const analysis = analyzeAttempts(byUser[uid] || []);
        const rank = summary.length + 1;
        const entry = {
            rank,
            name: row.full_name,
            slm_id: row.profiles?.slm_id || '—',
            monthly_pts: row.points,
            hourly_attempts: analysis.total,
            suspicious_rows: analysis.suspiciousCount,
            flags: analysis.flags.join('; ') || '—',
            status: analysis.flags.length ? '🚨 REVIEW' : '✓ OK',
        };
        summary.push(entry);
        if (analysis.flags.length) {
            flaggedDetails.push({ ...entry, user_id: uid, suspicious: analysis.suspicious, all: analysis.rows });
        }
    }

    console.log('--- All top players (summary) ---');
    console.table(summary);

    const flagged = summary.filter((s) => s.status.includes('REVIEW'));
    console.log(`\nFlagged: ${flagged.length} / ${summary.length}\n`);

    if (flaggedDetails.length === 0) {
        console.log('No timing inconsistencies detected among top players this month.');
        return;
    }

    for (const f of flaggedDetails) {
        console.log(`\n${'='.repeat(72)}`);
        console.log(`#${f.rank} ${f.name} (${f.slm_id}) — ${f.monthly_pts} pts | ${f.hourly_attempts} hourly attempts`);
        console.log(`Flags: ${f.flags}`);
        console.log('Suspicious rows / bursts:');
        console.table(f.suspicious.filter((s) => s.type === 'burst' || s.quiz_id));
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
