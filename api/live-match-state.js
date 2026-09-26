import postgres from 'postgres';

const SUPABASE = (process.env.SUPABASE_URL || 'https://pncjlbsflsgshmzgiiqu.supabase.co').replace(/\/+$/, '');
const EDGE_SNAPSHOT_URL = `${SUPABASE}/functions/v1/public-db-snapshot`;

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
const MEMORY_MS = 8 * 1000;
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
      connection: { statement_timeout: '5000' },
    });
  }
  return sqlClient;
}

function send(res, payload, source = 'supabase-postgres') {
  res.setHeader('Cache-Control', 'public, max-age=2, stale-while-revalidate=10');
  res.setHeader('Vercel-CDN-Cache-Control', 'public, s-maxage=8, stale-while-revalidate=20');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Data-Source', source);
  return res.status(200).json(payload);
}

function liveFromSnapshot(snapshot) {
  if (!snapshot || !Array.isArray(snapshot.matches)) throw new Error('edge_snapshot_invalid');
  const matches = [...snapshot.matches]
    .sort((a, b) => (Date.parse(b.updated_at || 0) || 0) - (Date.parse(a.updated_at || 0) || 0))
    .slice(0, 60);
  const activeMatchIds = matches
    .filter(match => match.status === 'مباشر' || match.stream_status === 'live')
    .map(match => match.id);
  const active = new Set(activeMatchIds);
  const events = Array.isArray(snapshot.events)
    ? snapshot.events.filter(event => active.has(event.match_id)).sort((a, b) => (Date.parse(a.created_at || 0) || 0) - (Date.parse(b.created_at || 0) || 0))
    : [];
  return { matches, events, activeMatchIds };
}

async function readFromEdgeDirectDb() {
  const response = await fetch(EDGE_SNAPSHOT_URL, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
    signal: AbortSignal.timeout(9000),
  });
  if (!response.ok) throw new Error(`supabase_edge_direct_${response.status}`);
  return liveFromSnapshot(await response.json());
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });
  if (memoryPayload && Date.now() - memoryAt < MEMORY_MS) return send(res, memoryPayload, 'memory-cache');

  try {
    const sql = getSql();
    if (!sql) throw new Error('postgres_credentials_missing');

    const rows = await sql`
      with recent as (
        select id,tournament_id,team_a_id,team_b_id,status,match_date,match_time,
               score_a,score_b,minute,stream_enabled,stream_status,stream_type,
               stream_url,updated_at
        from public.matches
        order by updated_at desc nulls last
        limit 60
      ), active as (
        select id from recent where status = 'مباشر' or stream_status = 'live'
      )
      select jsonb_build_object(
        'matches', coalesce((
          select jsonb_agg(
            to_jsonb(r) || jsonb_build_object(
              'clock_elapsed_seconds', c.elapsed_seconds,
              'clock_anchor_at', c.anchor_at,
              'clock_running', c.running
            ) order by r.updated_at desc nulls last
          )
          from recent r
          left join public.match_live_clocks c on c.match_id = r.id
        ), '[]'::jsonb),
        'events', coalesce((
          select jsonb_agg(to_jsonb(e) order by e.created_at asc)
          from public.match_events e
          where e.match_id in (select id from active)
        ), '[]'::jsonb),
        'activeMatchIds', coalesce((select jsonb_agg(a.id) from active a), '[]'::jsonb)
      ) as payload
    `;

    const payload = rows?.[0]?.payload;
    if (!payload || !Array.isArray(payload.matches)) throw new Error('live_payload_missing');
    memoryPayload = payload;
    memoryAt = Date.now();
    return send(res, payload);
  } catch (error) {
    console.error('Direct live Postgres unavailable', error?.message || error);
    try {
      const payload = await readFromEdgeDirectDb();
      memoryPayload = payload;
      memoryAt = Date.now();
      return send(res, payload, 'supabase-edge-direct-postgres');
    } catch (edgeError) {
      if (memoryPayload) return send(res, memoryPayload, 'memory-stale');
      res.setHeader('Cache-Control', 'no-store');
      console.error('Live match state unavailable', edgeError?.message || edgeError);
      return res.status(503).json({ error: 'live_state_unavailable' });
    }
  }
}
