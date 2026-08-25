/**
 * Slim landing-board snapshot: current-month top 3 + past-month champion names.
 * Avoids fetchMonthly / fetchHallOfFame (unbounded views + quiz_attempts history).
 */

export const LANDING_BOARDS_SELECT = 'user_id, full_name, avatar_url, district, points';
export const HOF_START = { year: 2026, month: 3 };

export function istYearMonth(now = new Date()) {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: 'numeric',
    }).formatToParts(now);
    return {
        year: Number(parts.find((p) => p.type === 'year')?.value),
        month: Number(parts.find((p) => p.type === 'month')?.value),
    };
}

/** Past Hall of Fame months (March 2026 through last completed IST month). */
export function landingHofMonths(now = new Date()) {
    const current = istYearMonth(now);
    const months = [];
    let year = HOF_START.year;
    let month = HOF_START.month;
    while (year < current.year || (year === current.year && month < current.month)) {
        months.push({ year, month });
        month += 1;
        if (month > 12) {
            month = 1;
            year += 1;
        }
    }
    return months;
}

async function fetchMonthTop(supabase, year, month, limit = 3) {
    const { data, error } = await supabase
        .from('monthly_leaderboard_view')
        .select(LANDING_BOARDS_SELECT)
        .eq('year_num', year)
        .eq('month_num', month)
        .order('points', { ascending: false })
        .limit(limit);

    if (error) throw error;
    return data || [];
}

function toChampionBoard(rows) {
    return (rows || []).map((row, index) => ({
        prize_rank: index + 1,
        full_name: row.full_name || null,
        avatar_url: row.avatar_url || null,
        district: row.district || null,
        user_id: row.user_id || null,
        points: Number(row.points) || 0,
    }));
}

export async function fetchLandingBoardsSnapshot(supabase, now = new Date()) {
    const current = istYearMonth(now);
    const pastMonths = landingHofMonths(now);

    const [thisMonthRows, ...pastRows] = await Promise.all([
        fetchMonthTop(supabase, current.year, current.month, 3),
        ...pastMonths.map(({ year, month }) => fetchMonthTop(supabase, year, month, 3)),
    ]);

    const hallOfFameData = pastMonths.map((entry, index) => ({
        year: entry.year,
        month: entry.month,
        boards: {
            main_champion: toChampionBoard(pastRows[index]),
        },
    }));

    return {
        thisMonthTop: thisMonthRows,
        hallOfFameData,
    };
}
