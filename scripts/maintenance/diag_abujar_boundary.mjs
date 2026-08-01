/**
 * READ-ONLY: Abujar July/Aug boundary + penalty/UI mismatch numbers.
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

function toIst(iso) {
    return new Date(iso).toLocaleString('en-IN', { timeZone: TZ, hour12: false });
}

function istYm(iso) {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: TZ,
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
    const { data: p, error } = await sb
        .from('profiles')
        .select('id, full_name, points, total_penalties')
        .ilike('full_name', '%Abujar Rahaman%')
        .single();
    if (error) throw error;

    let all = [];
    let from = 0;
    while (true) {
        const { data, error: e } = await sb
            .from('quiz_attempts')
            .select('quiz_id, score, penalty, created_at')
            .eq('user_id', p.id)
            .like('quiz_id', 'hourly-challenge-2026-07%')
            .order('created_at', { ascending: true })
            .range(from, from + 999);
        if (e) throw e;
        all = all.concat(data || []);
        if (!data || data.length < 1000) break;
        from += 1000;
    }

    // Also Aug hourly by quiz id
    from = 0;
    let aug = [];
    while (true) {
        const { data, error: e } = await sb
            .from('quiz_attempts')
            .select('quiz_id, score, penalty, created_at')
            .eq('user_id', p.id)
            .like('quiz_id', 'hourly-challenge-2026-08%')
            .order('created_at', { ascending: true })
            .range(from, from + 999);
        if (e) throw e;
        aug = aug.concat(data || []);
        if (!data || data.length < 1000) break;
        from += 1000;
    }

    const julyGross = all.reduce((s, r) => s + (r.score || 0), 0);
    const julyPen = all.reduce((s, r) => s + (r.penalty || 0), 0);
    const julyNet = julyGross - julyPen;

    const { data: mv } = await sb
        .from('monthly_leaderboard_view')
        .select('*')
        .eq('user_id', p.id)
        .eq('year_num', 2026)
        .eq('month_num', 7)
        .maybeSingle();

    console.log('Profile', p.full_name, p.id);
    console.log({
        july_hourly_count: all.length,
        july_hourly_gross_like_today_UI: julyGross,
        july_hourly_penalties: julyPen,
        july_hourly_net: julyNet,
        monthly_view_july_points: mv?.points,
        monthly_view_july_penalties: mv?.total_penalties,
        gap_gross_minus_monthly: julyGross - Number(mv?.points || 0),
        gap_almost_equals_penalties: Math.abs(julyGross - Number(mv?.points || 0) - julyPen) < 100,
    });

    // Rows where created IST month != quiz_id month OR != UTC month
    const mismatches = [];
    for (const r of [...all, ...aug]) {
        const d = new Date(r.created_at);
        const utcY = d.getUTCFullYear();
        const utcM = d.getUTCMonth() + 1;
        const ist = istYm(r.created_at);
        const m = r.quiz_id.match(/^hourly-challenge-(\d{4})-(\d{2})-/);
        const qY = m ? Number(m[1]) : null;
        const qM = m ? Number(m[2]) : null;
        if (utcY !== ist.y || utcM !== ist.m || qY !== ist.y || qM !== ist.m || utcY !== qY || utcM !== qM) {
            mismatches.push({
                quiz_id: r.quiz_id,
                score: r.score,
                penalty: r.penalty,
                net: (r.score || 0) - (r.penalty || 0),
                created_ist: toIst(r.created_at),
                utc_month: `${utcY}-${String(utcM).padStart(2, '0')}`,
                ist_month: `${ist.y}-${String(ist.m).padStart(2, '0')}`,
                quiz_month: `${qY}-${String(qM).padStart(2, '0')}`,
            });
        }
    }
    console.log('\nTimezone/month mismatches (hourly Jul+Aug quiz ids):', mismatches.length);
    console.table(mismatches);

    // What would monthly board show if it used IST vs UTC
    let allAround = [];
    from = 0;
    while (true) {
        const { data, error: e } = await sb
            .from('quiz_attempts')
            .select('quiz_id, score, penalty, created_at')
            .eq('user_id', p.id)
            .gte('created_at', '2026-06-30T00:00:00Z')
            .lt('created_at', '2026-08-02T00:00:00Z')
            .range(from, from + 999);
        if (e) throw e;
        allAround = allAround.concat(data || []);
        if (!data || data.length < 1000) break;
        from += 1000;
    }

    function sumBucket(pred) {
        let g = 0;
        let pe = 0;
        let c = 0;
        for (const r of allAround) {
            if (!pred(r)) continue;
            g += r.score || 0;
            pe += r.penalty || 0;
            c += 1;
        }
        return { count: c, gross: g, penalty: pe, net: g - pe };
    }

    const utcJuly = sumBucket((r) => {
        const d = new Date(r.created_at);
        return d.getUTCFullYear() === 2026 && d.getUTCMonth() + 1 === 7;
    });
    const istJuly = sumBucket((r) => {
        const { y, m } = istYm(r.created_at);
        return y === 2026 && m === 7;
    });
    const utcAug = sumBucket((r) => {
        const d = new Date(r.created_at);
        return d.getUTCFullYear() === 2026 && d.getUTCMonth() + 1 === 8;
    });
    const istAug = sumBucket((r) => {
        const { y, m } = istYm(r.created_at);
        return y === 2026 && m === 8;
    });

    console.log('\nAll attempt types around boundary:');
    console.log({ utcJuly, istJuly, utcAug, istAug, viewJuly: mv?.points, viewJulyPen: mv?.total_penalties });

    // Lifetime net vs profile
    let lifeG = 0;
    let lifeP = 0;
    from = 0;
    while (true) {
        const { data, error: e } = await sb
            .from('quiz_attempts')
            .select('score, penalty')
            .eq('user_id', p.id)
            .range(from, from + 999);
        if (e) throw e;
        for (const r of data || []) {
            lifeG += r.score || 0;
            lifeP += r.penalty || 0;
        }
        if (!data || data.length < 1000) break;
        from += 1000;
    }
    console.log('\nLifetime vs profile:', {
        profile_points: p.points,
        profile_total_penalties: p.total_penalties,
        attempts_gross: lifeG,
        attempts_penalty_sum: lifeP,
        attempts_net: lifeG - lifeP,
        profile_minus_net: p.points - (lifeG - lifeP),
    });
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
