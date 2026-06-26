import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');

  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  const key = serviceKey || anonKey;

  if (!url || !key) {
    return res.status(200).json({ count: null });
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const { data: rpcCount, error: rpcError } = await supabase.rpc('get_registered_linemen_count');
    if (!rpcError && typeof rpcCount === 'number' && rpcCount >= 0) {
      return res.status(200).json({ count: rpcCount });
    }

    const { count, error } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true });

    if (error) throw error;
    return res.status(200).json({ count: count ?? 0 });
  } catch (err) {
    console.error('[landing-stats]', err);
    return res.status(200).json({ count: null });
  }
}
