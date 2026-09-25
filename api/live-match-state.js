const SUPABASE = (process.env.SUPABASE_URL || 'https://pncjlbsflsgshmzgiiqu.supabase.co').replace(/\/+$/, '');
const KEY = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_fnl_v042_IqkcFPpP5oVLA_F_CrpRZX';
async function read(path) {
  const response = await fetch(`${SUPABASE}/rest/v1/${path}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(7000),
  });
  if (!response.ok) throw new Error(`database_${response.status}`);
  return response.json();
}
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });
  try {
    // Keep one small shared response for all viewers. Include recently finished
    // matches so that the stream can close without waiting for the full snapshot.
    const matches = await read('matches?select=id,tournament_id,team_a_id,team_b_id,status,match_date,match_time,score_a,score_b,minute,stream_enabled,stream_status,stream_type,stream_url,updated_at&order=updated_at.desc&limit=60');
    const active = matches.filter(row => row.status === 'مباشر' || row.stream_status === 'live');
    const ids = active.map(row => row.id).filter(Boolean);
    const events = ids.length ? await read(`match_events?select=*&match_id=in.(${ids.join(',')})&order=created_at.asc&limit=300`) : [];
    res.setHeader('Cache-Control', 'public, max-age=0');
    res.setHeader('Vercel-CDN-Cache-Control', 'public, s-maxage=3, stale-while-revalidate=6');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(200).json({ matches, events, activeMatchIds: ids });
  } catch (error) {
    res.setHeader('Cache-Control', 'no-store');
    console.error('Live match state unavailable', error);
    return res.status(503).json({ error: 'live_state_unavailable' });
  }
}
