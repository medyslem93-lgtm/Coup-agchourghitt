import postgres from 'postgres';

const SUPABASE = (process.env.SUPABASE_URL || 'https://pncjlbsflsgshmzgiiqu.supabase.co').replace(/\/+$/, '');
const API_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_fnl_v042_IqkcFPpP5oVLA_F_CrpRZX';
const EDGE_SNAPSHOT_URL = `${SUPABASE}/functions/v1/public-db-snapshot`;
const CACHE_MS = 5 * 60 * 1000;

function resolveDatabaseUrl() {
  const direct = process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL_NON_POOLING || process.env.SUPABASE_DB_URL;
  if (direct) return direct;
  const host = process.env.POSTGRES_HOST;
  const user = process.env.POSTGRES_USER;
  const password = process.env.POSTGRES_PASSWORD;
  const database = process.env.POSTGRES_DATABASE || 'postgres';
  const port = process.env.POSTGRES_PORT || '5432';
  if (!host || !user || !password) return '';
  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(database)}?sslmode=require`;
}

const DATABASE_URL = resolveDatabaseUrl();
let sqlClient;
let memoryPayload = null;
let memoryAt = 0;

function getSql() {
  if (!DATABASE_URL) return null;
  if (!sqlClient) {
    sqlClient = postgres(DATABASE_URL, {
      max: 1,
      prepare: false,
      ssl: 'require',
      connect_timeout: 4,
      idle_timeout: 20,
      max_lifetime: 60 * 10,
      connection: { statement_timeout: '12000' },
    });
  }
  return sqlClient;
}

const restPaths = {
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
  assignments: 'referee_assignments?select=*',
  refereeMatchStats: 'referee_match_stats?select=*',
  featureFlags: 'site_feature_flags?select=*',
  liveClocks: 'match_live_clocks?select=match_id,elapsed_seconds,anchor_at,running',
};

async function readFromPostgres() {
  const sql = getSql();
  if (!sql) throw new Error('postgres_credentials_missing');

  // One round-trip replaces the old chain of many sequential DB queries.
  const rows = await sql`
    select jsonb_build_object(
      'tournaments', coalesce((select jsonb_agg(to_jsonb(t) order by t.sort_order asc nulls last) from public.tournaments t), '[]'::jsonb),
      'teams', coalesce((select jsonb_agg(to_jsonb(t) order by t.name asc) from public.teams t), '[]'::jsonb),
      'players', coalesce((select jsonb_agg(to_jsonb(p) order by p.name asc) from public.players p), '[]'::jsonb),
      'matches', coalesce((
        select jsonb_agg(
          to_jsonb(m) || jsonb_build_object(
            'clock_elapsed_seconds', c.elapsed_seconds,
            'clock_anchor_at', c.anchor_at,
            'clock_running', c.running
          ) order by m.match_date desc nulls last, m.match_time desc nulls last
        )
        from public.matches m
        left join public.match_live_clocks c on c.match_id = m.id
      ), '[]'::jsonb),
      'events', coalesce((select jsonb_agg(to_jsonb(e) order by e.created_at asc) from public.match_events e), '[]'::jsonb),
      'lineups', coalesce((select jsonb_agg(to_jsonb(l)) from public.match_lineups l), '[]'::jsonb),
      'lineupPlayers', coalesce((select jsonb_agg(to_jsonb(lp)) from public.match_lineup_players lp), '[]'::jsonb),
      'matchStats', coalesce((select jsonb_agg(to_jsonb(ms)) from public.match_stats ms), '[]'::jsonb),
      'standings', coalesce((select jsonb_agg(to_jsonb(s)) from public.tournament_standings s), '[]'::jsonb),
      'playerStats', coalesce((select jsonb_agg(to_jsonb(ps)) from public.player_tournament_stats ps), '[]'::jsonb),
      'news', coalesce((select jsonb_agg(to_jsonb(n) order by n.featured desc nulls last, n.sort_order asc nulls last, n.publish_date desc nulls last) from public.news n), '[]'::jsonb),
      'awards', coalesce((select jsonb_agg(to_jsonb(a)) from public.awards a), '[]'::jsonb),
      'media', coalesce((select jsonb_agg(to_jsonb(ma) order by ma.created_at asc) from public.media_assets ma where ma.entity_type = 'match'), '[]'::jsonb),
      'settings', coalesce((select to_jsonb(ss) from public.site_settings ss where ss.id = 'main' limit 1), '{}'::jsonb),
      'referees', coalesce((select jsonb_agg(to_jsonb(r) order by r.name asc) from public.referees r), '[]'::jsonb),
      'assignments', coalesce((select jsonb_agg(to_jsonb(ra)) from public.referee_assignments ra), '[]'::jsonb),
      'refereeMatchStats', coalesce((select jsonb_agg(to_jsonb(rms)) from public.referee_match_stats rms), '[]'::jsonb),
      'featureFlags', coalesce((select jsonb_agg(to_jsonb(ff)) from public.site_feature_flags ff), '[]'::jsonb),
      'liveClocks', coalesce((select jsonb_agg(to_jsonb(lc)) from public.match_live_clocks lc), '[]'::jsonb)
    ) as payload
  `;
  const payload = rows?.[0]?.payload;
  if (!payload || typeof payload !== 'object') throw new Error('postgres_payload_missing');
  return payload;
}

async function readFromEdgeDirectDb() {
  const response = await fetch(EDGE_SNAPSHOT_URL, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error(`supabase_edge_direct_${response.status}`);
  return response.json();
}

async function readRest(path) {
  const response = await fetch(`${SUPABASE}/rest/v1/${path}`, {
    headers: { apikey: API_KEY, Accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`supabase_rest_${response.status}`);
  return response.json();
}

async function readFromRest() {
  const entries = await Promise.all(Object.entries(restPaths).map(async ([key, path]) => [key, await readRest(path)]));
  const payload = Object.fromEntries(entries);
  payload.settings = Array.isArray(payload.settings) ? payload.settings[0] || {} : payload.settings || {};
  const clockByMatch = new Map((payload.liveClocks || []).map((row) => [row.match_id, row]));
  for (const match of payload.matches || []) {
    const clock = clockByMatch.get(match.id);
    if (clock) Object.assign(match, {
      clock_elapsed_seconds: clock.elapsed_seconds,
      clock_anchor_at: clock.anchor_at,
      clock_running: clock.running,
    });
  }
  return payload;
}

function validPayload(payload) {
  return payload && Array.isArray(payload.tournaments) && Array.isArray(payload.teams) &&
    Array.isArray(payload.players) && Array.isArray(payload.matches) && Array.isArray(payload.events);
}

function normalizeOptionalCollections(payload) {
  if (!payload || typeof payload !== 'object') return payload;
  for (const key of ['lineups','lineupPlayers','matchStats','standings','playerStats','news','awards','media','referees','assignments','refereeMatchStats','featureFlags','liveClocks']) {
    if (!Array.isArray(payload[key])) payload[key] = [];
  }
  if (!payload.settings || typeof payload.settings !== 'object' || Array.isArray(payload.settings)) payload.settings = {};
  return payload;
}

function send(res, payload, source, stale = false) {
  res.setHeader('Cache-Control', stale ? 'public, max-age=15, stale-while-revalidate=300' : 'public, max-age=60, stale-while-revalidate=300');
  res.setHeader('Vercel-CDN-Cache-Control', stale ? 'public, s-maxage=60, stale-while-revalidate=3600' : 'public, s-maxage=300, stale-while-revalidate=3600');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Data-Source', source);
  if (stale) res.setHeader('Warning', '110 - stale snapshot');
  return res.status(200).json(payload);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });

  if (memoryPayload && Date.now() - memoryAt < CACHE_MS) return send(res, memoryPayload, 'memory-cache');

  let payload;
  let source = 'supabase-postgres';
  try {
    payload = await readFromPostgres();
  } catch (postgresError) {
    console.error('Direct Supabase Postgres read failed:', postgresError?.message || postgresError);
    source = 'supabase-edge-direct-postgres';
    try {
      payload = await readFromEdgeDirectDb();
    } catch (edgeError) {
      console.error('Supabase Edge direct DB read failed:', edgeError?.message || edgeError);
      if (memoryPayload) return send(res, memoryPayload, 'memory-stale', true);
      source = 'supabase-rest';
      try {
        payload = await readFromRest();
      } catch (restError) {
        console.error('Supabase REST read failed:', restError?.message || restError);
        res.setHeader('Cache-Control', 'no-store');
        return res.status(503).json({ error: 'supabase_unavailable' });
      }
    }
  }

  payload = normalizeOptionalCollections(payload);
  if (!validPayload(payload)) {
    if (memoryPayload) return send(res, memoryPayload, 'memory-stale', true);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(503).json({ error: 'invalid_supabase_payload' });
  }

  memoryPayload = payload;
  memoryAt = Date.now();
  return send(res, payload, source);
}
