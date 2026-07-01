/**
 * Debug Hall of Fame champion vs new-player boards per month.
 * Usage: node scripts/maintenance/preview_hall_of_fame_boards.mjs
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const env = Object.fromEntries(
    fs.readFileSync(path.join(root, '.env.local'), 'utf8').split('\n').filter((l) => l.includes('=')).map((l) => {
        const i = l.indexOf('=');
        return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
    })
);
const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY);

const NEW_PLAYER_DAYS = 90;

function getNewPlayerCutoff(year, month) {
    const end = new Date(year, month, 0, 23, 59, 59);
    const cutoff = new Date(end);
    cutoff.setDate(cutoff.getDate() - NEW_PLAYER_DAYS);
    return cutoff;
}

function isNewPlayer(joinedAt, year, month) {
    if (!joinedAt) return false;
    return new Date(joinedAt) >= getNewPlayerCutoff(year, month);
}

function mapPoints(row, year, month) {
    const base = Number(row.points) || 0;
    const viewReading = Number(row.reading_points) || 0;
    const profileReading = Number(row.profiles?.reading_points) || 0;
    const join = row.profiles?.created_at ? new Date(row.profiles.created_at).getTime() : 0;
    const startOfMonth = new Date(year, month - 1, 1).getTime();
    const gap = join >= startOfMonth ? Math.max(0, profileReading - viewReading) : 0;
    return base + gap;
}

const { data: monthlyRows, error } = await sb
    .from('monthly_leaderboard_view')
    .select('user_id, full_name, points, reading_points, month_num, year_num, profiles(created_at, reading_points)')
    .or('year_num.gt.2026,and(year_num.eq.2026,month_num.gte.3)')
    .order('year_num', { ascending: false })
    .order('month_num', { ascending: false })
    .order('points', { ascending: false });

if (error) throw error;

const userIds = [...new Set((monthlyRows || []).map((r) => r.user_id))];
const { data: profiles } = await sb
    .from('profiles')
    .select('id, created_at, full_name')
    .in('id', userIds);
const profileById = Object.fromEntries((profiles || []).map((p) => [p.id, p]));

const byMonth = {};
for (const row of monthlyRows || []) {
    const key = `${row.year_num}-${row.month_num}`;
    if (!byMonth[key]) byMonth[key] = [];
    const prof = profileById[row.user_id];
    const enriched = {
        ...row,
        profiles: {
            ...(row.profiles || {}),
            created_at: row.profiles?.created_at || prof?.created_at || null,
        },
    };
    byMonth[key].push(enriched);
}

const now = new Date();
const currentKey = `${now.getFullYear()}-${now.getMonth() + 1}`;

for (const key of Object.keys(byMonth).filter((k) => k !== currentKey).sort().reverse()) {
    const [y, m] = key.split('-').map(Number);
    const sorted = byMonth[key]
        .map((r) => ({
            ...r,
            displayPoints: mapPoints(r, y, m),
            joined_at: r.profiles?.created_at || null,
        }))
        .sort((a, b) => b.displayPoints - a.displayPoints);

    const champion = sorted.slice(0, 3);
    const championIds = new Set(champion.map((p) => p.user_id));
    const cutoff = getNewPlayerCutoff(y, m);
    const newTop = sorted
        .filter((p) => isNewPlayer(p.joined_at, y, m) && !championIds.has(p.user_id))
        .slice(0, 3);

    console.log(`\n=== ${key} (cutoff ${cutoff.toISOString().slice(0, 10)}) ===`);
    console.log('Champion:', champion.map((p) => `${p.full_name} ${p.displayPoints} joined=${p.joined_at?.slice(0, 10) || '?'}`).join(' | '));
    console.log('New:     ', newTop.map((p) => `${p.full_name} ${p.displayPoints} joined=${p.joined_at?.slice(0, 10) || '?'}`).join(' | '));
    const same = champion.length === newTop.length && champion.every((c, i) => c.user_id === newTop[i]?.user_id);
    console.log('Same top 3?', same);
}
