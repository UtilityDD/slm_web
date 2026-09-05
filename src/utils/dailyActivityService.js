import { supabase } from '../supabaseClient';
import { requestManager } from './requestManager';

export const ANNUAL_CYCLE = {
    start: '2026-03-07',
    end: '2027-03-07',
    cycleStartEpoch: new Date('2026-03-07T00:00:00+05:30').getTime(),
    minActiveDaysToQualify: 30,
};

/**
 * Fetch daily activity records for a user between two dates (inclusive).
 * @param {string} userId
 * @param {string} [startDate] - YYYY-MM-DD
 * @param {string} [endDate] - YYYY-MM-DD
 */
export async function fetchUserDailyActivity(userId, startDate, endDate) {
    if (!userId) return [];
    let query = supabase
        .from('daily_user_activity')
        .select('*')
        .eq('user_id', userId)
        .order('activity_date', { ascending: false });

    if (startDate) query = query.gte('activity_date', startDate);
    if (endDate) query = query.lte('activity_date', endDate);

    const { data, error } = await query;
    if (error) {
        console.warn('[dailyActivityService] fetchUserDailyActivity error:', error.message);
        return [];
    }
    return data || [];
}

/**
 * Map a raw row from get_annual_grand_trophy RPC to the canonical player shape.
 * Ensures all numeric fields are JS numbers and adds rank.
 */
function mapRpcAnnualRow(row, idx) {
    return {
        user_id:               row.user_id,
        full_name:             row.full_name || 'Lineman',
        district:              row.district || null,
        avatar_url:            row.avatar_url || null,
        training_level:        Number(row.training_level) || 0,
        slm_id:                row.slm_id || null,
        created_at:            row.created_at || null,
        lifetime_score:        Number(row.lifetime_score) || 0,
        reading_points:        Number(row.reading_points) || 0,
        active_days:           Number(row.active_days) || 0,
        eligible_days:         Number(row.eligible_days) || 1,
        total_quizzes:         Number(row.total_quizzes) || 0,
        hourly_quizzes:        Number(row.hourly_quizzes) || 0,
        reading_lessons:       Number(row.reading_lessons) || 0,
        life_skills:           Number(row.life_skills) || 0,
        points_earned:         Number(row.points_earned) || 0,
        penalties_incurred:    Number(row.penalties_incurred) || 0,
        net_points:            Number(row.net_points) || 0,
        consistency_rate:      Number(row.consistency_rate) || 0,
        consistency_pct:       Number(row.consistency_pct) || 0,
        yearly_score:          Number(row.yearly_score) || 0,
        is_qualified:          Boolean(row.is_qualified),
        days_needed_to_qualify: Number(row.days_needed_to_qualify) || 0,
        rank:                  idx + 1,
    };
}

/**
 * Fetch Annual Grand Trophy leaderboard for March 7th prize cycle.
 * Option A (Consistency Multiplier Model):
 *   Yearly Score = Net Points * (1 + Active Days / Eligible Days)
 *
 * Primary path: get_annual_grand_trophy RPC — one aggregated row per user (~100 rows).
 * Fallback:     client-side aggregation from daily_user_activity rows (used if RPC is
 *               not yet deployed or returns an error).
 *
 * @param {boolean} [forceRefresh=false]
 */
export async function fetchAnnualGrandTrophy(forceRefresh = false) {
    return requestManager.fetch(
        `annual_grand_trophy_leaderboard_${ANNUAL_CYCLE.start}`,
        async () => {
            // ── Primary: server-side RPC ──────────────────────────────────────────
            try {
                const { data, error } = await supabase.rpc('get_annual_grand_trophy', {
                    p_start:           ANNUAL_CYCLE.start,
                    p_end:             ANNUAL_CYCLE.end,
                    p_cycle_start_ts:  new Date(ANNUAL_CYCLE.cycleStartEpoch).toISOString(),
                    p_min_active_days: ANNUAL_CYCLE.minActiveDaysToQualify,
                });

                if (!error && Array.isArray(data) && data.length > 0) {
                    return data.map(mapRpcAnnualRow);
                }

                if (error) {
                    console.warn('[dailyActivityService] get_annual_grand_trophy RPC unavailable, falling back to client aggregation:', error.message);
                }
            } catch (rpcErr) {
                console.warn('[dailyActivityService] get_annual_grand_trophy RPC error, falling back:', rpcErr);
            }

            // ── Fallback: client-side aggregation (legacy path) ───────────────────
            const pageSize = 1000;
            let offset = 0;
            const rows = [];

            while (true) {
                const { data, error } = await supabase
                    .from('daily_user_activity')
                    .select(`
                        user_id,
                        activity_date,
                        quizzes_played,
                        hourly_quizzes_played,
                        reading_lessons_completed,
                        life_skills_played,
                        points_earned,
                        penalties_incurred,
                        net_points,
                        profiles(id, full_name, avatar_url, district, training_level, slm_id, created_at, role, points, reading_points, reading_points_ledger)
                    `)
                    .gte('activity_date', ANNUAL_CYCLE.start)
                    .lt('activity_date', ANNUAL_CYCLE.end)
                    .range(offset, offset + pageSize - 1);

                if (error) {
                    console.warn('[dailyActivityService] fetchAnnualGrandTrophy fallback error:', error.message);
                    return [];
                }
                if (!data?.length) break;
                rows.push(...data);
                if (data.length < pageSize) break;
                offset += pageSize;
            }

            const now = Date.now();
            const byUser = new Map();

            for (const r of rows || []) {
                const profile = r.profiles;
                if (!profile || profile.role === 'guest') continue;

                if (!byUser.has(r.user_id)) {
                    const createdAt = profile.created_at ? new Date(profile.created_at).getTime() : ANNUAL_CYCLE.cycleStartEpoch;
                    const eligibleStart = Math.max(ANNUAL_CYCLE.cycleStartEpoch, createdAt);
                    const eligibleDays = Math.max(1, Math.ceil((now - eligibleStart) / (1000 * 60 * 60 * 24)));

                    byUser.set(r.user_id, {
                        user_id: r.user_id,
                        full_name: profile.full_name || 'Lineman',
                        district: profile.district || null,
                        avatar_url: profile.avatar_url || null,
                        training_level: profile.training_level || 0,
                        slm_id: profile.slm_id || null,
                        lifetime_score: Number(profile.points) || 0,
                        reading_points: Number(profile.reading_points_ledger ?? profile.reading_points) || 0,
                        created_at: profile.created_at || null,
                        eligible_days: eligibleDays,
                        active_days: 0,
                        total_quizzes: 0,
                        hourly_quizzes: 0,
                        reading_lessons: 0,
                        life_skills: 0,
                        points_earned: 0,
                        penalties_incurred: 0,
                        net_points: 0,
                    });
                }

                const u = byUser.get(r.user_id);
                const isActive = (Number(r.quizzes_played) > 0) || (Number(r.reading_lessons_completed) > 0) || (Number(r.points_earned) > 0);
                if (isActive) {
                    u.active_days += 1;
                }
                u.total_quizzes += Number(r.quizzes_played) || 0;
                u.hourly_quizzes += Number(r.hourly_quizzes_played) || 0;
                u.reading_lessons += Number(r.reading_lessons_completed) || 0;
                u.life_skills += Number(r.life_skills_played) || 0;
                u.points_earned += Number(r.points_earned) || 0;
                u.penalties_incurred += Number(r.penalties_incurred) || 0;
                u.net_points += Number(r.net_points) || 0;
            }

            const results = Array.from(byUser.values()).map((u) => {
                const consistencyRate = Math.min(1.0, u.active_days / u.eligible_days);
                const consistencyPct = Math.round(consistencyRate * 100);
                const yearlyScore = Math.round(u.net_points * (1 + consistencyRate));
                const isQualified = u.active_days >= ANNUAL_CYCLE.minActiveDaysToQualify;

                return {
                    ...u,
                    consistency_rate: consistencyRate,
                    consistency_pct: consistencyPct,
                    yearly_score: yearlyScore,
                    is_qualified: isQualified,
                    days_needed_to_qualify: Math.max(0, ANNUAL_CYCLE.minActiveDaysToQualify - u.active_days),
                };
            });

            results.sort((a, b) => {
                if (a.is_qualified !== b.is_qualified) return a.is_qualified ? -1 : 1;
                return b.yearly_score - a.yearly_score;
            });

            return results.map((player, idx) => ({ ...player, rank: idx + 1 }));
        },
        { ttl: 10, swr: true, forceRefresh }
    );
}


/**
 * Calculate the longest consecutive active days streak from an array of date strings.
 * @param {string[]} dateStrings - Array of 'YYYY-MM-DD'
 */
export function calculateLongestStreak(dateStrings) {
    if (!Array.isArray(dateStrings) || dateStrings.length === 0) return 0;
    const sorted = [...new Set(dateStrings)].sort();

    let maxStreak = 1;
    let currentStreak = 1;

    for (let i = 1; i < sorted.length; i++) {
        const prev = new Date(sorted[i - 1]);
        const curr = new Date(sorted[i]);
        const diffDays = Math.round((curr - prev) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            currentStreak += 1;
            if (currentStreak > maxStreak) maxStreak = currentStreak;
        } else if (diffDays > 1) {
            currentStreak = 1;
        }
    }

    return maxStreak;
}

/**
 * Days elapsed in month for the IST timezone.
 * For current month: days elapsed so far (1..currentDate).
 * For past closed months: total days in that month.
 * For future months: 1.
 *
 * @param {number} year
 * @param {number} month (1-12)
 */
export function getMonthlyElapsedDays(year, month) {
    const nowIst = new Date(Date.now() + 330 * 60 * 1000);
    const curYear = nowIst.getUTCFullYear();
    const curMonth = nowIst.getUTCMonth() + 1;
    const daysInMonth = new Date(year, month, 0).getDate();

    if (year === curYear && month === curMonth) {
        return Math.max(1, nowIst.getUTCDate());
    } else if (year < curYear || (year === curYear && month < curMonth)) {
        return daysInMonth;
    }
    return 1;
}

/**
 * Calculate user's consistency metrics for a given month.
 * Accounts for mid-month joiners so their consistency rate isn't penalized for days before joining.
 *
 * @param {string|null} createdAt
 * @param {number} elapsedDays
 * @param {number} activeDays
 * @param {number} year
 * @param {number} month (1-12)
 */
export function calculateUserMonthlyConsistency(createdAt, elapsedDays, activeDays, year, month) {
    let eligibleDays = elapsedDays;
    if (createdAt) {
        const createdDate = new Date(createdAt);
        const createdIst = new Date(createdDate.getTime() + 330 * 60 * 1000);
        const joinYear = createdIst.getUTCFullYear();
        const joinMonth = createdIst.getUTCMonth() + 1;
        const joinDay = createdIst.getUTCDate();

        if (joinYear === year && joinMonth === month) {
            eligibleDays = Math.max(1, elapsedDays - joinDay + 1);
        } else if (joinYear > year || (joinYear === year && joinMonth > month)) {
            eligibleDays = 1;
        }
    }

    const safeActiveDays = Math.max(0, activeDays || 0);
    const consistencyRate = Math.min(1.0, safeActiveDays / Math.max(1, eligibleDays));
    const consistencyPct = Math.round(consistencyRate * 100);

    return {
        active_days: safeActiveDays,
        eligible_days: eligibleDays,
        consistency_rate: consistencyRate,
        consistency_pct: consistencyPct,
    };
}

const EMPTY_USER_ACTIVITY = { active_days: 0 };

/**
 * Look up one user's monthly activity from a Map or a JSON-cached plain object.
 * requestManager persists via JSON.stringify, which turns Map into {}.
 */
export function getUserMonthlyActivity(activityByUser, userId) {
    if (!activityByUser || !userId) return EMPTY_USER_ACTIVITY;
    const row = typeof activityByUser.get === 'function'
        ? activityByUser.get(userId)
        : activityByUser[userId];
    return row || EMPTY_USER_ACTIVITY;
}

/**
 * Fetch daily activity for all active users in a given month.
 * Cached via requestManager. Must return a JSON-serializable object (not Map),
 * or a later cache hit crashes monthly leaderboards on `.get()`.
 *
 * @param {number} year
 * @param {number} month (1-12)
 * @param {boolean} [forceRefresh=false]
 * @returns {Promise<Record<string, { active_days: number, activity_dates: string[], total_quizzes: number, hourly_quizzes: number, reading_lessons: number, points_earned: number, penalties_incurred: number, net_points: number }>>}
 */
export async function fetchMonthlyDailyActivityMap(year, month, forceRefresh = false) {
    const daysInMonth = new Date(year, month, 0).getDate();
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
    const cacheKey = `monthly_daily_activity_obj_${year}_${month}`;

    return requestManager.fetch(
        cacheKey,
        async () => {
            const pageSize = 1000;
            let offset = 0;
            const rows = [];

            while (true) {
                const { data, error } = await supabase
                    .from('daily_user_activity')
                    .select('user_id, activity_date, quizzes_played, hourly_quizzes_played, reading_lessons_completed, life_skills_played, points_earned, penalties_incurred, net_points')
                    .gte('activity_date', startDate)
                    .lte('activity_date', endDate)
                    .range(offset, offset + pageSize - 1);

                if (error) {
                    console.warn('[dailyActivityService] fetchMonthlyDailyActivityMap error:', error.message);
                    return {};
                }
                if (!data?.length) break;
                rows.push(...data);
                if (data.length < pageSize) break;
                offset += pageSize;
            }

            const byUser = {};
            for (const r of rows) {
                if (!byUser[r.user_id]) {
                    byUser[r.user_id] = {
                        active_days: 0,
                        total_quizzes: 0,
                        hourly_quizzes: 0,
                        reading_lessons: 0,
                        points_earned: 0,
                        penalties_incurred: 0,
                        net_points: 0,
                        activity_dates: [],
                    };
                }
                const u = byUser[r.user_id];
                const isActive = (Number(r.quizzes_played) > 0) || (Number(r.reading_lessons_completed) > 0) || (Number(r.points_earned) > 0);
                if (isActive) {
                    u.active_days += 1;
                    u.activity_dates.push(r.activity_date);
                }
                u.total_quizzes += Number(r.quizzes_played) || 0;
                u.hourly_quizzes += Number(r.hourly_quizzes_played) || 0;
                u.reading_lessons += Number(r.reading_lessons_completed) || 0;
                u.points_earned += Number(r.points_earned) || 0;
                u.penalties_incurred += Number(r.penalties_incurred) || 0;
                u.net_points += Number(r.net_points) || 0;
            }

            return byUser;
        },
        { ttl: 10, swr: true, forceRefresh }
    );
}
