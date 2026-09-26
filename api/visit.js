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
  if (!sqlClient) sqlClient = postgres(DATABASE_URL, {
    max: 1,
    prepare: false,
    ssl: 'require',
    connect_timeout: 3,
    idle_timeout: 15,
    max_lifetime: 60 * 10,
    connection: { statement_timeout: '2500' },
  });
  return sqlClient;
}

const clean = (value, max) => typeof value === 'string' ? value.slice(0, max) : null;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  res.setHeader('Cache-Control', 'no-store');
  try {
    const sql = getSql();
    if (!sql) return res.status(204).end();
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const visitorId = clean(body.visitor_id, 128);
    const sessionId = clean(body.session_id, 128);
    const path = clean(body.path, 500) || '/';
    const referrerHost = clean(body.referrer_host, 255);
    if (!visitorId || !sessionId) return res.status(204).end();
    await sql`
      insert into public.site_visits (visitor_id, session_id, path, referrer_host)
      values (${visitorId}, ${sessionId}, ${path}, ${referrerHost})
    `;
  } catch (_) {
    // Analytics must never affect the visitor experience.
  }
  return res.status(204).end();
}
