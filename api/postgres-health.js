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
    max_lifetime: 15,
    connection: { statement_timeout: '5000' },
  });

  const tests = [
    ['tournaments', () => sql`select * from public.tournaments order by sort_order asc nulls last`],
    ['teams', () => sql`select * from public.teams order by name asc`],
    ['players', () => sql`select * from public.players order by name asc`],
    ['matches', () => sql`select * from public.matches order by match_date desc nulls last`],
    ['match_events', () => sql`select * from public.match_events order by created_at asc`],
    ['match_lineups', () => sql`select * from public.match_lineups`],
    ['match_lineup_players', () => sql`select * from public.match_lineup_players`],
    ['match_stats', () => sql`select * from public.match_stats`],
    ['tournament_standings', () => sql`select * from public.tournament_standings`],
    ['player_tournament_stats', () => sql`select * from public.player_tournament_stats`],
    ['news', () => sql`select * from public.news order by featured desc nulls last, sort_order asc nulls last, publish_date desc nulls last`],
    ['awards', () => sql`select * from public.awards`],
    ['media_assets', () => sql`select * from public.media_assets where entity_type = 'match' order by created_at asc`],
    ['site_settings', () => sql`select * from public.site_settings where id = 'main' limit 1`],
    ['referees', () => sql`select * from public.referees order by name asc`],
    ['referee_assignments', () => sql`select id, referee_id, tournament_id, match_id, role, category, name, photo_url from public.referee_assignments`],
    ['match_live_clocks', () => sql`select match_id, elapsed_seconds, anchor_at, running from public.match_live_clocks`],
  ];

  const started = Date.now();
  const report = [];
  try {
    for (const [name, run] of tests) {
      const t = Date.now();
      try {
        const rows = await run();
        report.push({ name, ok:true, rows:rows.length, bytes:JSON.stringify(Array.from(rows)).length, ms:Date.now()-t });
      } catch (error) {
        report.push({ name, ok:false, ms:Date.now()-t, error:String(error?.message || error) });
        break;
      }
    }
    const ok = report.length === tests.length && report.every(x => x.ok);
    return res.status(ok ? 200 : 503).json({ ok, host, totalMs:Date.now()-started, report });
  } finally {
    try { await sql.end({ timeout: 1 }); } catch {}
  }
}
