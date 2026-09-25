const SUPABASE = (process.env.SUPABASE_URL || 'https://pncjlbsflsgshmzgiiqu.supabase.co').replace(/\/+$/, '');
const KEY = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_fnl_v042_IqkcFPpP5oVLA_F_CrpRZX';
const paths = {
  tournaments: 'tournaments?select=*&order=sort_order',
  teams: 'teams?select=*&order=name',
  players: 'players?select=*&order=name',
  matches: 'matches?select=*&order=match_date.desc.nullslast',
  events: 'match_events?select=*&order=created_at.asc',
  lineups: 'match_lineups?select=*',
  lineupPlayers: 'match_lineup_players?select=*',
  matchStats: 'match_stats?select=*',
  standings: 'tournament_standings?select=*',
  playerStats: 'player_tournament_stats?select=*',
  news: 'news?select=*&order=featured.desc,sort_order.asc,publish_date.desc',
  awards: 'awards?select=*',
  media: 'media_assets?select=*&entity_type=eq.match&order=created_at.asc',
  settings: 'site_settings?select=*&id=eq.main&limit=1',
  referees: 'referees?select=*&order=name',
  assignments: 'referee_assignments?select=id,referee_id,tournament_id,match_id,role,category,name,photo_url',
};
const core = new Set(['tournaments', 'teams', 'players', 'matches', 'events']);

async function read(path) {
  const response = await fetch(`${SUPABASE}/rest/v1/${path}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(9000),
  });
  if (!response.ok) throw new Error(`database_${response.status}`);
  return response.json();
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });
  try {
    const entries = await Promise.all(Object.entries(paths).map(async ([key, path]) => {
      try { return [key, await read(path)]; }
      catch (error) { if (core.has(key)) throw error; return [key, []]; }
    }));
    const payload = Object.fromEntries(entries);
    payload.settings = Array.isArray(payload.settings) ? payload.settings[0] || {} : {};
    res.setHeader('Cache-Control', 'public, max-age=0');
    res.setHeader('Vercel-CDN-Cache-Control', 'public, s-maxage=20, stale-while-revalidate=90');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(200).json(payload);
  } catch (error) {
    res.setHeader('Cache-Control', 'no-store');
    console.error('Public snapshot unavailable', error);
    return res.status(503).json({ error: 'snapshot_unavailable' });
  }
}
