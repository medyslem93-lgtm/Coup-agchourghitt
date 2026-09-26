import postgres from 'postgres';

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
      connect_timeout: 4,
      idle_timeout: 20,
      max_lifetime: 60 * 10,
      connection: { statement_timeout: '5000' },
    });
  }
  return sqlClient;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });

  try {
    const sql = getSql();
    if (!sql) throw new Error('postgres_credentials_missing');

    const matches = await sql`
      select id,tournament_id,team_a_id,team_b_id,status,match_date,match_time,
             score_a,score_b,minute,stream_enabled,stream_status,stream_type,
             stream_url,updated_at
      from public.matches
      order by updated_at desc nulls last
      limit 60
    `;

    const active = Array.from(matches).filter(row => row.status === 'مباشر' || row.stream_status === 'live');
    const ids = active.map(row => row.id).filter(Boolean);

    let events = [];
    let clocks = [];
    if (ids.length) {
      events = Array.from(await sql`
        select * from public.match_events
        where match_id = any(${ids}::uuid[])
        order by created_at asc
        limit 300
      `);
      clocks = Array.from(await sql`
        select match_id,elapsed_seconds,anchor_at,running
        from public.match_live_clocks
        where match_id = any(${ids}::uuid[])
      `);
    }

    const matchRows = Array.from(matches);
    const clockByMatch = new Map(clocks.map(row => [row.match_id, row]));
    for (const match of matchRows) {
      const clock = clockByMatch.get(match.id);
      if (clock) {
        Object.assign(match, {
          clock_elapsed_seconds: clock.elapsed_seconds,
          clock_anchor_at: clock.anchor_at,
          clock_running: clock.running,
        });
      }
    }

    res.setHeader('Cache-Control', 'public, max-age=0');
    res.setHeader('Vercel-CDN-Cache-Control', 'public, s-maxage=3, stale-while-revalidate=6');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('X-Data-Source', 'supabase-postgres');
    return res.status(200).json({ matches: matchRows, events, activeMatchIds: ids });
  } catch (error) {
    res.setHeader('Cache-Control', 'no-store');
    console.error('Live match state unavailable', error?.message || error);
    return res.status(503).json({ error: 'live_state_unavailable' });
  }
}
