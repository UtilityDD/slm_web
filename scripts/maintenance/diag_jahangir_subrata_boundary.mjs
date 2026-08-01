/**
 * READ-ONLY: Why Jahangir / Subrata August scores drop under IST.
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const NAMES = process.argv.slice(2).length
    ? process.argv.slice(2)
    : ['Prahlad Mondal', 'শুভদীপ সাহা'];

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

function toIst(iso) {
    return new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false });
}

function istYm(iso) {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
    }).formatToParts(new Date(iso));
    return {
        y: Number(parts.find((x) => x.type === 'year').value),
        m: Number(parts.find((x) => x.type === 'month').value),
    };
}

async function main() {
    const env = loadEnv(path.join(root, '.env.local'));
    const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY);

    for (const name of NAMES) {
        const { data: profiles, error } = await sb
            .from('profiles')
            .select('id, full_name')
            .ilike('full_name', `%${name}%`);
        if (error) throw error;
        const p = (profiles || []).find((x) => x.full_name === name) || profiles?.[0];
        if (!p) {
            console.log('Not found', name, 'matches:', profiles);
            continue;
        }
        if ((profiles || []).length > 1) {
            console.log('Multiple matches for', name, '— using', p.full_name, profiles.map((x) => x.full_name));
        }

        const { data: jul } = await sb
            .from('monthly_leaderboard_view')
            .select('points, total_penalties')
            .eq('user_id', p.id)
            .eq('year_num', 2026)
            .eq('month_num', 7)
            .maybeSingle();
        const { data: aug } = await sb
            .from('monthly_leaderboard_view')
            .select('points, total_penalties')
            .eq('user_id', p.id)
            .eq('year_num', 2026)
            .eq('month_num', 8)
            .maybeSingle();

        // Boundary window: anything that can differ between UTC and IST August
        const { data: rows, error: aErr } = await sb
            .from('quiz_attempts')
            .select('quiz_id, score, penalty, created_at')
            .eq('user_id', p.id)
            .gte('created_at', '2026-07-31T18:00:00.000Z')
            .lt('created_at', '2026-08-01T06:00:00.000Z')
            .order('created_at', { ascending: true });
        if (aErr) throw aErr;

        const detailed = (rows || []).map((r) => {
            const d = new Date(r.created_at);
            const utcM = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
            const ist = istYm(r.created_at);
            const istM = `${ist.y}-${String(ist.m).padStart(2, '0')}`;
            const net = (r.score || 0) - (r.penalty || 0);
            let effect = 'same both';
            if (utcM === '2026-07' && istM === '2026-08') effect = 'NOW in July board → would MOVE to August under IST';
            if (utcM === '2026-08' && istM === '2026-07') effect = 'NOW in August board → would MOVE to July under IST';
            return {
                quiz_id: r.quiz_id,
                score: r.score,
                penalty: r.penalty,
                net,
                created_ist: toIst(r.created_at),
                utc_month: utcM,
                ist_month: istM,
                effect,
            };
        });

        const moveToAug = detailed.filter((r) => r.effect.includes('MOVE to August'));
        const moveToJul = detailed.filter((r) => r.effect.includes('MOVE to July'));
        const sum = (arr) => arr.reduce((s, r) => s + r.net, 0);

        console.log(`\n======== ${p.full_name} ========`);
        console.log({
            current_July_board: jul?.points ?? 0,
            current_August_board: aug?.points ?? 0,
            august_if_IST: (aug?.points ?? 0) + sum(moveToAug) - sum(moveToJul),
            // For Jahangir/Subrata we expect moveToAug with negative net
            net_moving_July_to_August: sum(moveToAug),
            net_moving_August_to_July: sum(moveToJul),
            august_delta: sum(moveToAug) - sum(moveToJul),
        });
        console.log('Boundary attempts:');
        console.table(detailed);
        if (moveToAug.length) {
            console.log('These are currently counted in JULY. Under IST they enter AUGUST:');
            console.table(moveToAug);
        }
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
