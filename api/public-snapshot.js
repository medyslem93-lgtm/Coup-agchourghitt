import postgres from 'postgres';

const SUPABASE = (process.env.SUPABASE_URL || 'https://pncjlbsflsgshmzgiiqu.supabase.co').replace(/\/+$/, '');
const API_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_fnl_v042_IqkcFPpP5oVLA_F_CrpRZX';

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
function getSql() {
  if (!DATABASE_URL) return null;
  if (!sqlClient) {
    sqlClient = postgres(DATABASE_URL, {
      max: 1,
      prepare: false,
      ssl: 'require',
      connect_timeout: 8,
      idle_timeout: 20,
      max_lifetime: 60 * 10,
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
  assignments: 'referee_assignments?select=id,referee_id,tournament_id,match_id,role,category,name,photo_url',
  clocks: 'match_live_clocks?select=match_id,elapsed_seconds,anchor_at,running',
};

async function readFromPostgres() {
  const sql = getSql();
  if (!sql) throw new Error('postgres_credentials_missing');

  const [
    tournaments,
    teams,
    players,
    matches,
    events,
    lineups,
    lineupPlayers,
    matchStats,
    standings,
    playerStats,
    news,
    awards,
    media,
    settings,
    referees,
    assignments,
    clocks,
  ] = await Promise.all([
    sql`select * from public.tournaments order by sort_order asc nulls last`,
    sql`select * from public.teams order by name asc`,
    sql`select * from public.players order by name asc`,
    sql`select * from public.matches order by match_date desc nulls last`,
    sql`select * from public.match_events order by created_at asc`,
    sql`select * from public.match_lineups`,
    sql`select * from public.match_lineup_players`,
    sql`select * from public.match_stats`,
    sql`select * from public.tournament_standings`,
    sql`select * from public.player_tournament_stats`,
    sql`select * from public.news order by featured desc nulls last, sort_order asc nulls last, publish_date desc nulls last`,
    sql`select * from public.awards`,
    sql`select * from public.media_assets where entity_type = 'match' order by created_at asc`,
    sql`select * from public.site_settings where id = 'main' limit 1`,
    sql`select * from public.referees order by name asc`,
    sql`select id, referee_id, tournament_id, match_id, role, category, name, photo_url from public.referee_assignments`,
    sql`select match_id, elapsed_seconds, anchor_at, running from public.match_live_clocks`,
  ]);

  const payload = {
    tournaments: Array.from(tournaments),
    teams: Array.from(teams),
    players: Array.from(players),
    matches: Array.from(matches),
    events: Array.from(events),
    lineups: Array.from(lineups),
    lineupPlayers: Array.from(lineupPlayers),
    matchStats: Array.from(matchStats),
    standings: Array.from(standings),
    playerStats: Array.from(playerStats),
    news: Array.from(news),
    awards: Array.from(awards),
    media: Array.from(media),
    settings: Array.from(settings)[0] || {},
    referees: Array.from(referees),
    assignments: Array.from(assignments),
  };

  const clockByMatch = new Map(Array.from(clocks).map(row => [row.match_id, row]));
  for (const match of payload.matches) {
    const clock = clockByMatch.get(match.id);
    if (clock) {
      Object.assign(match, {
        clock_elapsed_seconds: clock.elapsed_seconds,
        clock_anchor_at: clock.anchor_at,
        clock_running: clock.running,
      });
    }
  }

  return payload;
}

async function readRest(path) {
  const response = await fetch(`${SUPABASE}/rest/v1/${path}`, {
    headers: {
      apikey: API_KEY,
      Authorization: `Bearer ${API_KEY}`,
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`supabase_rest_${response.status}`);
  return response.json();
}

async function readFromRest() {
  const entries = await Promise.all(Object.entries(restPaths).map(async ([key, path]) => [key, await readRest(path)]));
  const payload = Object.fromEntries(entries);
  payload.settings = Array.isArray(payload.settings) ? payload.settings[0] || {} : payload.settings || {};
  const clockByMatch = new Map((payload.clocks || []).map(row => [row.match_id, row]));
  for (const match of payload.matches || []) {
    const clock = clockByMatch.get(match.id);
    if (clock) {
      Object.assign(match, {
        clock_elapsed_seconds: clock.elapsed_seconds,
        clock_anchor_at: clock.anchor_at,
        clock_running: clock.running,
      });
    }
  }
  delete payload.clocks;
  return payload;
}

function validPayload(payload) {
  return payload &&
    Array.isArray(payload.tournaments) &&
    Array.isArray(payload.teams) &&
    Array.isArray(payload.players) &&
    Array.isArray(payload.matches) &&
    Array.isArray(payload.events);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });

  let payload;
  let source = 'supabase-postgres';
  try {
    payload = await readFromPostgres();
  } catch (postgresError) {
    console.error('Direct Supabase Postgres read failed:', postgresError?.message || postgresError);
    source = 'supabase-rest';
    try {
      payload = await readFromRest();
    } catch (restError) {
      console.error('Supabase REST read failed:', restError?.message || restError);
      res.setHeader('Cache-Control', 'no-store');
      return res.status(503).json({ error: 'supabase_unavailable' });
    }
  }

  if (!validPayload(payload)) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(503).json({ error: 'invalid_supabase_payload' });
  }

  res.setHeader('Cache-Control', 'public, max-age=0');
  res.setHeader('Vercel-CDN-Cache-Control', 'public, s-maxage=15, stale-while-revalidate=60');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Data-Source', source);
  return res.status(200).json(payload);
}
