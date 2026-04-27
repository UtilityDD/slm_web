import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Load credentials
const env = Object.fromEntries(
    fs.readFileSync('.env.local', 'utf8')
        .split('\n')
        .filter(l => l.includes('='))
        .map(l => l.trim().split('='))
);

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function runAudit() {
    console.log('🚀 Starting Comprehensive Global Audit...\n');

    // 1. Fetch All Profiles
    const { data: profiles, error: pError } = await supabase
        .from('profiles')
        .select('id, full_name, points, total_penalties, reading_points, created_at')
        .order('points', { ascending: false });

    if (pError) throw pError;

    // 2. Fetch All-Time Leaderboard View
    const { data: allTimeView } = await supabase.from('leaderboard_view').select('*');
    
    // 3. Fetch Monthly Leaderboard View (Current Month)
    const now = new Date();
    const { data: monthlyView } = await supabase
        .from('monthly_leaderboard_view')
        .select('*')
        .eq('month_num', now.getMonth() + 1)
        .eq('year_num', now.getFullYear());

    // 4. Fetch Raw Totals from History (Ground Truth)
    const { data: historyData } = await supabase
        .from('quiz_attempts')
        .select('user_id, score, penalty');

    const historyTotals = {};
    historyData.forEach(q => {
        if (!historyTotals[q.user_id]) historyTotals[q.user_id] = { score: 0, penalty: 0 };
        historyTotals[q.user_id].score += (q.score || 0);
        historyTotals[q.user_id].penalty += (q.penalty || 0);
    });

    const report = [];

    profiles.forEach(p => {
        const h = historyTotals[p.id] || { score: 0, penalty: 0 };
        const av = allTimeView?.find(v => v.user_id === p.id);
        const mv = monthlyView?.find(v => v.user_id === p.id);

        const calculatedNetScore = (h.score - h.penalty) + (p.reading_points || 0);
        
        // Check for inconsistencies
        const issues = [];
        
        // 1. Database vs History Inconsistency
        if (p.points !== calculatedNetScore) {
            issues.push(`Net Score Mismatch (DB: ${p.points} | Calc: ${calculatedNetScore})`);
        }

        // 2. All-Time Leaderboard vs DB
        if (av && av.score !== p.points) {
            issues.push(`All-Time Leaderboard Mismatch (View: ${av.score} | DB: ${p.points})`);
        }

        // 3. Penalty DB vs Certificate (History) Ground Truth
        if (p.total_penalties !== h.penalty) {
            issues.push(`Penalty Sync Issue (DB: ${p.total_penalties} | History: ${h.penalty})`);
        }

        // 4. Monthly Score Logic Check (If score is higher than all-time)
        if (mv && mv.points > p.points) {
            issues.push(`Monthly Score Impossible (Monthly: ${mv.points} | All-Time DB: ${p.points})`);
        }

        if (issues.length > 0) {
            report.push({
                name: p.full_name,
                db_points: p.points,
                db_penalty: p.total_penalties,
                history_penalty: h.penalty,
                all_time_view: av?.score || 0,
                monthly_view: mv?.points || 0,
                issues: issues
            });
        }
    });

    console.log(`✅ Audit Complete. Found ${report.length} users with inconsistencies.\n`);
    
    if (report.length > 0) {
        console.table(report.map(r => ({
            Name: r.name,
            'DB Net': r.db_points,
            'History Penalty': r.history_penalty,
            'All-Time View': r.all_time_view,
            'Monthly View': r.monthly_view,
            'Major Issue': r.issues[0]
        })));
    } else {
        console.log('🎉 AMAZING! No inconsistencies found across the board.');
    }
}

runAudit();
