import postgres from 'postgres';

function resolveDatabaseUrl() {
  return process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL_NON_POOLING || process.env.SUPABASE_DB_URL || '';
}

export default async function handler(req, res) {
  const databaseUrl = resolveDatabaseUrl();
  if (!databaseUrl) return res.status(500).json({ ok:false, reason:'missing_database_url' });

  let host = 'unknown';
  try { host = new URL(databaseUrl).hostname; } catch {}

  const sql = postgres(databaseUrl, {
    max: 1,
    prepare: false,
    ssl: 'require',
    connect_timeout: 4,
    idle_timeout: 2,
    max_lifetime: 10,
  });

  const started = Date.now();
  try {
    const result = await Promise.race([
      sql`select 1 as ok`,
      new Promise((_, reject) => setTimeout(() => reject(new Error('query_timeout_7000ms')), 7000)),
    ]);
    return res.status(200).json({ ok:true, host, ms:Date.now()-started, result:Array.from(result) });
  } catch (error) {
    return res.status(503).json({ ok:false, host, ms:Date.now()-started, error:String(error?.message || error) });
  } finally {
    try { await sql.end({ timeout: 1 }); } catch {}
  }
}
