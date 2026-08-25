import { requestManager } from './requestManager';
import { fetchLandingBoardsSnapshot } from './landingBoardsQuery';

const EMPTY = { thisMonthTop: [], hallOfFameData: [] };

async function fetchBoardsFromApi() {
    try {
        const res = await fetch('/api/landing-boards', { cache: 'no-store' });
        if (!res.ok) return null;
        const json = await res.json();
        if (!json || !Array.isArray(json.thisMonthTop) || !Array.isArray(json.hallOfFameData)) {
            return null;
        }
        return {
            thisMonthTop: json.thisMonthTop,
            hallOfFameData: json.hallOfFameData,
        };
    } catch {
        return null;
    }
}

/**
 * Public landing boards. Prefers the Vercel-cached API (one Supabase hit per
 * cache window for all visitors). Local Vite falls back to the slim client query.
 */
export function fetchLandingBoards(supabase) {
    return requestManager.fetch(
        'landing_boards_snapshot_v1',
        async () => {
            const fromApi = await fetchBoardsFromApi();
            if (fromApi) return fromApi;
            try {
                return await fetchLandingBoardsSnapshot(supabase);
            } catch (err) {
                console.warn('[landing-boards] snapshot failed:', err);
                return EMPTY;
            }
        },
        { ttl: 30, swr: true, forceRefresh: false }
    );
}
