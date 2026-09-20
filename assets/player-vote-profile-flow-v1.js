(() => {
  'use strict';
  if (window.__aghPlayerVoteProfileFlowV1) return;
  window.__aghPlayerVoteProfileFlowV1 = true;

  function hasVoted() {
    const root = document.getElementById('aghPlayerTournamentVote');
    return !!root?.querySelector('.agh-pot-thanks');
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
      if (tries++ < 8) setTimeout(pick, 40);
    };
    setTimeout(pick, 20);
    return true;
  }

  document.addEventListener('click', (event) => {
    const card = event.target.closest?.('[data-pot-profile-card]');
    if (!card) return;
    if (event.target.closest('[data-pot-profile]')) return;
    if (hasVoted()) return;
    const id = card.dataset.potProfileCard;
    if (!id) return;
    if (openVoteFor(id)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  document.addEventListener('keydown', (event) => {
    if (!['Enter', ' '].includes(event.key)) return;
    const card = event.target.closest?.('[data-pot-profile-card]');
    if (!card || hasVoted()) return;
    const id = card.dataset.potProfileCard;
    if (id && openVoteFor(id)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);
})();