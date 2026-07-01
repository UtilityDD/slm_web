/**
 * Hourly quiz forensic for a user — last N days.
 * Usage: node scripts/maintenance/aritra_hourly_last2days.mjs
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

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
        label: `${m[1]}-${m[2]}-${m[3]} ${String(m[4]).padStart(2, '0')}:00 (slot in quiz_id)`,
    };
}

function fmtIst(iso) {
    const d = new Date(iso);
    return d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true });
}

function fmtUtc(iso) {
    return new Date(iso).toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
}

async function main() {
    const env = loadEnv(path.join(root, '.env.local'));
    const url = env.VITE_SUPABASE_URL;
    const key = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY;
    if (!url || !key) {
        console.error('Missing Supabase credentials in .env.local');
        process.exit(1);
    }

    const sb = createClient(url, key);
    const searchName = process.argv[2] || 'Aritra Banerjee';
    const daysBack = Number(process.argv[3] || 2);

    const { data: profiles, error: pErr } = await sb
        .from('profiles')
        .select('id, full_name, slm_id, district, points, quiz_points')
        .ilike('full_name', `%${searchName.replace(/\s+/g, '%')}%`);

    if (pErr) {
        console.error(pErr.message);
        process.exit(1);
    }

    if (!profiles?.length) {
        console.log(`No profile found for "${searchName}"`);
        process.exit(1);
    }

    const profile = profiles.length === 1 ? profiles[0] : profiles.find((p) => p.full_name?.toLowerCase().includes('aritra')) || profiles[0];
    if (profiles.length > 1) {
        console.log('Multiple matches — using:', profile.full_name, profile.id);
        console.log('All:', profiles.map((p) => `${p.full_name} (${p.id})`).join(', '));
    }

    const since = new Date();
    since.setDate(since.getDate() - daysBack);
    since.setHours(0, 0, 0, 0);

    const { data: attempts, error: aErr } = await sb
        .from('quiz_attempts')
        .select('quiz_id, score, penalty, created_at')
        .eq('user_id', profile.id)
        .like('quiz_id', 'hourly-challenge-%')
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: true });

    if (aErr) {
        console.error(aErr.message);
        process.exit(1);
    }

    const rows = attempts || [];
    console.log('\n=== Hourly quiz forensic ===');
    console.log(`User: ${profile.full_name} | SLM: ${profile.slm_id || '—'} | ID: ${profile.id}`);
    console.log(`Window: last ${daysBack} day(s) from ${since.toISOString().slice(0, 10)}`);
    console.log(`Total hourly attempts: ${rows.length}\n`);

    if (rows.length === 0) {
        console.log('No hourly attempts in window.');
        return;
    }

    const table = [];
    let mismatchCount = 0;
    let futureSlotCount = 0;
    const slotHours = new Set();

    for (const r of rows) {
        const slot = parseQuizSlot(r.quiz_id);
        const created = new Date(r.created_at);
        const net = (r.score || 0) - (r.penalty || 0);
        const submitIst = fmtIst(r.created_at);
        const submitUtc = fmtUtc(r.created_at);

        let slotVsSubmit = '—';
        let flag = '';
        if (slot) {
            slotHours.add(`${slot.date} H${slot.hourSlot}`);
            const submitLocalHour = Number(
                created.toLocaleString('en-GB', { timeZone: 'Asia/Kolkata', hour: 'numeric', hour12: false })
            );
            const submitLocalDate = created.toLocaleString('en-CA', { timeZone: 'Asia/Kolkata' }).slice(0, 10);
            const delta = submitLocalHour - slot.hourSlot;
            slotVsSubmit = `slot H${String(slot.hourSlot).padStart(2, '0')} vs submit IST H${String(submitLocalHour).padStart(2, '0')} (Δ${delta >= 0 ? '+' : ''}${delta}h)`;

            if (slot.date !== submitLocalDate || Math.abs(delta) > 1) {
                mismatchCount++;
                flag = '⚠ MISMATCH';
            }
            if (slot.date > submitLocalDate || (slot.date === submitLocalDate && slot.hourSlot > submitLocalHour + 1)) {
                futureSlotCount++;
                flag = (flag ? flag + ' ' : '') + '⚠ FUTURE SLOT';
            }
        } else {
            flag = '⚠ BAD quiz_id format';
        }

        table.push({
            '#': table.length + 1,
            quiz_slot: slot?.label || r.quiz_id,
            score: r.score ?? 0,
            penalty: r.penalty ?? 0,
            net,
            submitted_ist: submitIst,
            submitted_utc: submitUtc,
            slot_vs_submit: slotVsSubmit,
            flag: flag || 'OK',
        });
    }

    console.log('--- Attempt table ---');
    console.table(table);

    const byDay = {};
    for (const r of rows) {
        const day = r.created_at.slice(0, 10);
        byDay[day] = (byDay[day] || 0) + 1;
    }
    console.log('\n--- Summary ---');
    console.log(`Distinct hour-slots claimed (from quiz_id): ${slotHours.size}`);
    console.log(`Attempts per UTC calendar day (created_at):`, byDay);
    console.log(`Slot vs submit time mismatches (>1h or wrong day): ${mismatchCount}`);
    console.log(`Future-dated slot IDs (suspicious): ${futureSlotCount}`);

    if (slotHours.size > 24 * daysBack) {
        console.log('\n⚠ More distinct slots than physically possible in window — investigate clock manipulation.');
    }
    if (mismatchCount > 0 || futureSlotCount > 0) {
        console.log('\n⚠ Some attempts have quiz_id hour/date that does not align with submit time (IST).');
        console.log('  Server RPC does NOT validate quiz_id against server clock — client chooses slot from synced local time.');
    } else if (rows.length > 0) {
        console.log('\nAll attempts: quiz_id slot aligns with submit time (IST). No obvious clock-skew pattern in this window.');
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
