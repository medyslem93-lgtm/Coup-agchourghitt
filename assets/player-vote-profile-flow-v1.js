(() => {
  'use strict';
  if (window.__aghPlayerVoteProfileFlowV2) return;
  window.__aghPlayerVoteProfileFlowV2 = true;

  const cfg = window.AGCH_CONFIG || {};
  const db = window.supabase?.createClient && cfg.supabaseUrl && cfg.supabaseKey
    ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } })
    : null;
  const candidateToPlayer = new Map();
  let mappingPromise = null;

  function hasVoted() {
    const root = document.getElementById('aghPlayerTournamentVote');
    return !!root?.querySelector('.agh-pot-thanks');
  }

  async function loadMapping() {
    if (mappingPromise) return mappingPromise;
    if (!db) return candidateToPlayer;
    mappingPromise = db.from('player_tournament_candidates')
      .select('id,player_id')
      .not('player_id', 'is', null)
      .then(({ data }) => {
        for (const row of data || []) if (row.id && row.player_id) candidateToPlayer.set(row.id, row.player_id);
        return candidateToPlayer;
      })
      .catch(() => candidateToPlayer)
      .finally(() => { mappingPromise = null; });
    return mappingPromise;
  }

  async function openPlayer(candidateId) {
    if (!candidateId) return false;
    if (!candidateToPlayer.has(candidateId)) await loadMapping();
    const playerId = candidateToPlayer.get(candidateId);
    if (!playerId) return false;
    location.hash = `#/player/${playerId}`;
    return true;
  }

  function openVoteFor(candidateId) {
    const root = document.getElementById('aghPlayerTournamentVote');
    const open = root?.querySelector('[data-pot-open]');
    if (!open) return false;
    open.click();
    let tries = 0;
    const pick = () => {
      const candidate = document.querySelector(`#aghPotSheet [data-pot-candidate="${CSS.escape(candidateId)}"]`);
      if (candidate) {
        candidate.click();
        candidate.scrollIntoView({ block: 'center', behavior: 'smooth' });
        return;
      }
      if (tries++ < 10) setTimeout(pick, 40);
    };
    setTimeout(pick, 20);
    return true;
  }

  document.addEventListener('click', (event) => {
    const profileButton = event.target.closest?.('[data-pot-profile]');
    const card = event.target.closest?.('[data-pot-profile-card]');
    const candidateId = profileButton?.dataset.potProfile || card?.dataset.potProfileCard;
    if (!candidateId) return;

    if (profileButton || hasVoted()) {
      event.preventDefault();
      event.stopImmediatePropagation();
      openPlayer(candidateId).then((ok) => {
        if (!ok) location.hash = '#/players';
      });
      return;
    }

    if (openVoteFor(candidateId)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  document.addEventListener('keydown', (event) => {
    if (!['Enter', ' '].includes(event.key)) return;
    const card = event.target.closest?.('[data-pot-profile-card]');
    if (!card) return;
    const candidateId = card.dataset.potProfileCard;
    if (!candidateId) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (hasVoted()) openPlayer(candidateId).then(ok => { if (!ok) location.hash = '#/players'; });
    else openVoteFor(candidateId);
  }, true);

  loadMapping();
})();