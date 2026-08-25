import { createClient } from '@supabase/supabase-js';
import { fetchLandingBoardsSnapshot } from '../src/utils/landingBoardsQuery.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return res.status(405).json({ error: 'Method not allowed' });
    }

    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');

    const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    const key = serviceKey || anonKey;

    if (!url || !key) {
        return res.status(200).json({ thisMonthTop: [], hallOfFameData: [] });
    }

    const supabase = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
    });

    try {
        const snapshot = await fetchLandingBoardsSnapshot(supabase);
        return res.status(200).json(snapshot);
    } catch (err) {
        console.error('[landing-boards]', err);
        return res.status(200).json({ thisMonthTop: [], hallOfFameData: [] });
    }
}
