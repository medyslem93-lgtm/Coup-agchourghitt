(() => {
  'use strict';
  if (window.__aghAdminLiveRefreshV1) return;
  window.__aghAdminLiveRefreshV1 = true;
  const cfg = window.AGCH_CONFIG || {};
  if (!window.supabase?.createClient || !cfg.supabaseUrl || !cfg.supabaseKey) return;
  const db = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const route = () => decodeURIComponent(location.hash || '').replace(/^#\/?/, '').split(/[/?]/)[0] || 'home';
  let timer = 0;
  function refresh(kind) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      window.dispatchEvent(new CustomEvent('agh:admin-update', { detail: { kind } }));
      if (kind === 'lineup' && route() === 'team-of-week') window.dispatchEvent(new HashChangeEvent('hashchange'));
      if (kind === 'vote' && ['tournament', 'tournaments'].includes(route())) window.dispatchEvent(new HashChangeEvent('hashchange'));
    }, 180);
  }
  try {
    db.channel('agh-admin-public-refresh-v1')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'weekly_lineup_rounds' }, () => refresh('lineup'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'weekly_lineup_official_players' }, () => refresh('lineup'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'player_tournament_polls' }, () => refresh('vote'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'player_tournament_candidates' }, () => refresh('vote'))
      .subscribe();
  } catch (_) {}
})();