(() => {
  'use strict';

  const cfg = window.AGCH_CONFIG || {};
  const factory = window.supabase?.createClient;
  if (!factory || !cfg.supabaseUrl || !cfg.supabaseKey) return;

  const db = factory(cfg.supabaseUrl, cfg.supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'x-client-info': 'aghchorguit-media-ui-fix' } },
  });

  let timer = 0;
  let activeMatchId = '';
  let matchData = null;

  const esc = (value = '') => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const matchIdFromHash = () => location.hash.match(/^#\/?match\/([0-9a-f-]{36})(?:\/|$)/i)?.[1] || '';

  function injectStyles() {
    if (document.getElementById('aghMediaUiFixCss')) return;
    const style = document.createElement('style');
    style.id = 'aghMediaUiFixCss';
    style.textContent = `
      .match-recap-gallery{align-items:start!important}
      .match-recap-media.is-video{width:min(100%,430px)!important;max-width:430px!important;margin:10px auto!important;justify-self:center!important}
      .match-recap-media.is-video video{display:block;width:100%!important;max-height:300px!important;object-fit:cover;border-radius:16px}
      .match-recap-media.is-video .recap-video-event-layer{display:none!important}
      .match-recap-media.is-video .recap-media-scorebug{display:none!important}
      .match-recap-media.is-video .agh-media-compact-score{top:7px!important;left:7px!important;right:7px!important}
      .match-recap-media.is-video .agh-media-goal-pop{top:45px!important;min-width:0!important;width:auto!important;max-width:210px!important;padding:7px 10px!important;border-radius:12px!important;text-align:start!important;left:auto!important;right:8px!important;transform:translateY(-8px) scale(.96)!important}
      .match-recap-media.is-video.agh-score-side-b .agh-media-goal-pop{right:auto!important;left:8px!important}
      .match-recap-media.is-video .agh-media-goal-pop.is-visible{transform:translateY(0) scale(1)!important}
      .match-recap-media.is-video .agh-media-goal-pop strong{font-size:13px!important;line-height:1.2!important}
      .match-recap-media.is-video .agh-media-goal-pop span{font-size:10px!important;margin-top:1px!important}
      .match-recap-media.is-video .agh-media-goal-pop small{font-size:8px!important;margin-top:1px!important}
      .agh-team-goal-summary{display:grid!important;grid-template-columns:1fr 1fr!important;gap:8px!important}
      .agh-team-goal-summary .agh-team-goal{display:flex;align-items:center;justify-content:space-between;gap:8px;min-width:0}
      .agh-team-goal-summary .agh-team-goal span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;color:var(--muted)}
      .agh-team-goal-summary .agh-team-goal strong{font-size:25px!important}
      @media(max-width:560px){
        .match-recap-media.is-video{width:min(88vw,340px)!important;max-width:340px!important}
        .match-recap-media.is-video video{max-height:230px!important}
        .match-recap-media.is-video .agh-media-compact-score .agh-ms-team{max-width:42%!important;padding:3px 5px!important}
        .match-recap-media.is-video .agh-media-compact-score .agh-ms-team img{width:17px!important;height:17px!important}
        .match-recap-media.is-video .agh-media-compact-score .agh-ms-count{min-width:18px!important;height:18px!important;font-size:10px!important}
        .match-recap-media.is-video .agh-media-goal-pop{top:39px!important;max-width:175px!important;padding:6px 8px!important}
        .match-recap-media.is-video .agh-media-goal-pop strong{font-size:12px!important}
        .match-recap-media.is-video .agh-media-download{right:6px!important;bottom:38px!important;padding:5px 7px!important;font-size:8px!important}
      }
    `;
    document.head.appendChild(style);
  }

  async function loadMatch(matchId) {
    const { data, error } = await db.from('matches')
      .select('id,team_a_id,team_b_id,score_a,score_b,team_a:teams!matches_team_a_id_fkey(id,name),team_b:teams!matches_team_b_id_fkey(id,name)')
      .eq('id', matchId).single();
    if (error) throw error;
    return data;
  }

  function markScoringSide() {
    document.querySelectorAll('#appMain .match-recap-media.is-video').forEach((figure) => {
      const scoring = figure.querySelector('.agh-ms-team.is-scoring')?.dataset.aghSide || '';
      figure.classList.toggle('agh-score-side-a', scoring === 'a');
      figure.classList.toggle('agh-score-side-b', scoring === 'b');
    });
  }

  function fixGoalSummary(match) {
    if (!match) return;
    const cards = [...document.querySelectorAll('#appMain .event-summary-card')];
    const goalCard = cards.find(card => (card.querySelector('span')?.textContent || '').trim() === 'الأهداف');
    if (!goalCard) return;
    if (goalCard.classList.contains('agh-team-goal-summary')) return;
    const aName = match.team_a?.name || 'الفريق الأول';
    const bName = match.team_b?.name || 'الفريق الثاني';
    goalCard.classList.add('agh-team-goal-summary');
    goalCard.innerHTML = `<div class="agh-team-goal"><span>${esc(aName)}</span><strong>${Number(match.score_a || 0)}</strong></div><div class="agh-team-goal"><span>${esc(bName)}</span><strong>${Number(match.score_b || 0)}</strong></div>`;
  }

  function fixRecapLabels(match) {
    if (!match) return;
    const home = document.querySelector('#appMain .match-recap-scoreboard .recap-home b');
    const away = document.querySelector('#appMain .match-recap-scoreboard .recap-away b');
    if (home) home.textContent = match.team_a?.name || home.textContent;
    if (away) away.textContent = match.team_b?.name || away.textContent;
  }

  async function apply(force = false) {
    const matchId = matchIdFromHash();
    if (!matchId) { activeMatchId = ''; matchData = null; return; }
    try {
      if (force || activeMatchId !== matchId || !matchData) {
        matchData = await loadMatch(matchId);
        activeMatchId = matchId;
      }
      if (matchIdFromHash() !== matchId) return;
      injectStyles();
      fixRecapLabels(matchData);
      fixGoalSummary(matchData);
      markScoringSide();
    } catch (error) {
      console.error('Match media UI fix failed', error);
    }
  }

  function schedule(force = false) {
    clearTimeout(timer);
    timer = setTimeout(() => apply(force), 180);
  }

  window.addEventListener('hashchange', () => schedule(true));
  document.addEventListener('DOMContentLoaded', () => schedule(true), { once: true });
  const root = document.getElementById('appMain');
  if (root) new MutationObserver(() => schedule(false)).observe(root, { childList: true, subtree: true });
  schedule(true);
})();
