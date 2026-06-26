/**
 * Registered-user count for the public landing page.
 * Tries server API first (service role on Vercel), then RPC, then direct client count.
 */
export async function fetchRegisteredUserCount(supabase) {
  try {
    const res = await fetch('/api/landing-stats', { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      if (typeof json.count === 'number' && json.count >= 0) {
        return json.count;
      }
    }
  } catch {
    // Local dev or API unavailable — fall through
  }

  const { data, error } = await supabase.rpc('get_registered_linemen_count');
  if (!error && typeof data === 'number' && data >= 0) {
    return data;
  }

  const { count, error: countError } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true });

  if (countError) throw countError;
  return count ?? 0;
}
