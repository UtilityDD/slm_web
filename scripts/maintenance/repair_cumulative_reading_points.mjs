/**
 * READ-ONLY by default. Pass --apply to raise profiles.reading_points only.
 *
 * Cumulative reading = first-time core lessons × 20
 *   + extra day-stamped lesson_bonus claims (re-reads)
 *   + life_skill_bonus attempt scores
 *
 * Never decreases reading_points. Never touches points / quiz_points / training_level.
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const APPLY = process.argv.includes('--apply');
const CORE_DAYSTAMP = /^lesson_bonus_\d+\.\d+_\d{4}_\d{2}_\d{2}$/;
const CORE_LEGACY = /^lesson_bonus_\d+\.\d+$/;

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

function lessonIdFromCore(quizId) {
    const s = String(quizId || '');
    if (!s.startsWith('lesson_bonus_')) return null;
    const rest = s.slice('lesson_bonus_'.length);
    const stamped = rest.match(/^(\d+\.\d+)_\d{4}_\d{2}_\d{2}$/);
    if (stamped) return stamped[1];
    if (/^\d+\.\d+$/.test(rest)) return rest;
    return null;
}

function coreLessonIds(completedLessons) {
    const arr = Array.isArray(completedLessons) ? completedLessons : [];
    return [...new Set(arr.filter((id) => typeof id === 'string' && /^\d+\.\d+$/.test(id) && !id.toLowerCase().startsWith('supp_')))];
}

async function fetchAll(sb, table, select, apply) {
    const rows = [];
    let from = 0;
    while (true) {
        let q = sb.from(table).select(select).range(from, from + 999);
        if (apply) q = apply(q);
        const { data, error } = await q;
        if (error) throw error;
        rows.push(...(data || []));
        if (!data || data.length < 1000) break;
        from += 1000;
    }
    return rows;
}

function planForUser(profile, coreAttempts, lifeAttempts) {
    const profileLessons = new Set(coreLessonIds(profile.completed_lessons));
    const byLesson = new Map();
    for (const row of coreAttempts) {
        const lid = lessonIdFromCore(row.quiz_id);
        if (!lid) continue;
        if (!byLesson.has(lid)) byLesson.set(lid, { legacy: 0, stamped: 0, score: 0 });
        const g = byLesson.get(lid);
        g.score += Number(row.score) || 0;
        if (CORE_LEGACY.test(row.quiz_id)) g.legacy += 1;
        else if (CORE_DAYSTAMP.test(row.quiz_id)) g.stamped += 1;
    }

    const uniqueLessons = new Set(profileLessons);
    for (const lid of byLesson.keys()) uniqueLessons.add(lid);

    let extraStamped = 0;
    for (const [lid, g] of byLesson) {
        const hasFirstCredit = profileLessons.has(lid) || g.legacy > 0;
        if (hasFirstCredit) extraStamped += g.stamped;
    }

    const lifeScore = lifeAttempts.reduce((s, r) => s + (Number(r.score) || 0), 0);
    const firstTime = uniqueLessons.size * 20;
    const extra = extraStamped * 20;
    const computed = firstTime + extra + lifeScore;
    const current = Number(profile.reading_points || 0);
    const target = Math.max(current, computed);

    return {
        id: profile.id,
        slm_id: profile.slm_id,
        full_name: profile.full_name,
        points: Number(profile.points || 0),
        current_reading: current,
        first_time_reading: firstTime,
        extra_reread_points: extra,
        life_skill_points: lifeScore,
        computed,
        target_reading: target,
        delta: target - current,
        unique_lessons: uniqueLessons.size,
        extra_stamped_claims: extraStamped,
    };
}

async function main() {
    const env = loadEnv(path.join(root, '.env.local'));
    const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY);

    const profiles = (await fetchAll(
        sb,
        'profiles',
        'id, slm_id, full_name, role, reading_points, points, quiz_points, completed_lessons'
    )).filter((p) => p.role !== 'guest');

    const coreAttempts = await fetchAll(sb, 'quiz_attempts', 'user_id, quiz_id, score', (q) =>
        q.like('quiz_id', 'lesson_bonus%')
    );
    const lifeAttempts = await fetchAll(sb, 'quiz_attempts', 'user_id, quiz_id, score', (q) =>
        q.like('quiz_id', 'life_skill_bonus%')
    );

    const coreByUser = new Map();
    for (const r of coreAttempts) {
        if (!coreByUser.has(r.user_id)) coreByUser.set(r.user_id, []);
        coreByUser.get(r.user_id).push(r);
    }
    const lifeByUser = new Map();
    for (const r of lifeAttempts) {
        if (!lifeByUser.has(r.user_id)) lifeByUser.set(r.user_id, []);
        lifeByUser.get(r.user_id).push(r);
    }

    const plans = profiles.map((p) => planForUser(p, coreByUser.get(p.id) || [], lifeByUser.get(p.id) || []));
    const increases = plans.filter((p) => p.delta > 0).sort((a, b) => b.delta - a.delta);

    console.log(JSON.stringify({
        mode: APPLY ? 'APPLY' : 'PREVIEW',
        users_scanned: plans.length,
        users_to_increase: increases.length,
        total_reading_delta: increases.reduce((s, p) => s + p.delta, 0),
        increases,
    }, null, 2));

    if (!APPLY) return;
    if (increases.length === 0) {
        console.log('Nothing to apply.');
        return;
    }

    const backupDir = path.join(root, 'scripts', 'maintenance', 'backups');
    fs.mkdirSync(backupDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `reading_points_cumulative_${stamp}.json`);
    fs.writeFileSync(backupPath, JSON.stringify({ backed_up_at: new Date().toISOString(), increases }, null, 2));
    console.log('Backup written:', backupPath);

    for (const row of increases) {
        const { error } = await sb
            .from('profiles')
            .update({ reading_points: row.target_reading })
            .eq('id', row.id)
            .eq('reading_points', row.current_reading);
        if (error) {
            console.error('FAILED', row.slm_id, error);
            process.exit(1);
        }
    }

    const ids = increases.map((r) => r.id);
    const { data: verify, error: vErr } = await sb
        .from('profiles')
        .select('id, slm_id, full_name, reading_points, points')
        .in('id', ids);
    if (vErr) throw vErr;
    console.log('Verified after apply:', verify);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
